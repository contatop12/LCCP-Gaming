/**
 * Gera o site estático em dist/. Rode com: npm run build
 *   node --env-file-if-exists=.env scripts/build.ts
 *
 * Entrada: src/pages/**.html (conteúdo de <main> + ajustes de página), src/data, src/styles, src/client,
 * src/assets e public/. Saída: HTML com CSS embutido, imagens com hash em dist/assets e arquivos de rastreamento.
 * Qualquer tag <lcpc-*> ou valor desconhecido derruba o build com a página e o motivo.
 */
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { build as bundle, transform } from 'esbuild';
import { faq } from '../src/data/faq.ts';
import { siteConfig } from '../src/data/site.ts';
import { offerCatalogSchema, personSchema } from '../src/lib/schema.ts';
import { expandTags, requireContext, type PageContext } from './lib/components.ts';
import { BuildError, fail, minifyHtml, parseAttrs } from './lib/html.ts';
import { origin, renderPage, type Assets, type PageData } from './lib/layout.ts';
import { llmsTxt, robotsTxt, sitemapXml } from './lib/site-files.ts';

const started = performance.now();
const DIST = 'dist';
const PAGES = 'src/pages';

const sha1 = (data: string | Buffer) => createHash('sha1').update(data).digest('hex');

/* ---------- Fontes e CSS ---------- */

/** Copia a fonte para dist/assets/fonts com o hash do conteúdo no nome e devolve a URL pública. */
const fontUrls = new Map<string, string>();
function publishFont(path: string): string {
  const known = fontUrls.get(path);
  if (known) return known;
  if (!existsSync(path)) throw new BuildError(`Fonte inexistente: ${path}`);
  const data = readFileSync(path);
  const name = basename(path).replace(/\.woff2$/, `.${sha1(data).slice(0, 8)}.woff2`);
  mkdirSync(join(DIST, 'assets/fonts'), { recursive: true });
  writeFileSync(join(DIST, 'assets/fonts', name), data);
  const url = `/assets/fonts/${name}`;
  fontUrls.set(path, url);
  return url;
}

async function buildCss(): Promise<string> {
  const fontsPath = 'src/styles/fonts.css';
  const fonts = readFileSync(fontsPath, 'utf8').replace(/url\(\s*(['"]?)([^)'"]+\.woff2)\1\s*\)/g, (_all, _quote, file: string) => {
    return `url(${publishFont(resolve(dirname(fontsPath), file))})`;
  });
  const css = `${fonts}\n${readFileSync('src/styles/global.css', 'utf8')}`;
  const { code } = await transform(css, { loader: 'css', minify: true });
  return code.trim();
}

/* ---------- JavaScript do cliente ---------- */

async function buildClient(entry: string): Promise<string> {
  const result = await bundle({
    entryPoints: [entry],
    bundle: true,
    minify: true,
    format: 'iife',
    target: 'es2020',
    write: false,
    legalComments: 'none',
    logLevel: 'warning',
  });
  const code = result.outputFiles[0]!.text.trim();
  if (code.includes('</script')) throw new BuildError(`${entry}: o JavaScript gerado contém "</script" e quebraria o HTML embutido`);
  if (/preventDefault/.test(code)) throw new BuildError(`${entry}: não use preventDefault; o WhatsApp não pode esperar o analytics`);
  return code;
}

/* ---------- Páginas ---------- */

function htmlFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return htmlFiles(full);
    return name.endsWith('.html') ? [full] : [];
  });
}

const PAGE_SETTINGS = new Set(['lcpc:context', 'lcpc:mobile-cta', 'lcpc:faq', 'lcpc:breadcrumb', 'lcpc:schema', 'lcpc:noindex']);

async function buildPage(file: string, assets: Assets): Promise<{ path: string; output: string }> {
  const rel = relative(PAGES, file).split(sep).join('/');
  const where = `src/pages/${rel}`;
  let path: string;
  if (rel === 'index.html') path = '/';
  else if (rel === '404.html') path = '/404/';
  else if (rel.endsWith('/index.html')) path = `/${rel.slice(0, -'index.html'.length)}`;
  else fail(where, 'use <pasta>/index.html (ou 404.html) para que a URL termine em barra');

  const source = readFileSync(file, 'utf8');
  const title = source.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim();
  if (!title) fail(where, 'falta <title>');
  const main = source.match(/<main\b[^>]*>([\s\S]*)<\/main>/)?.[1];
  if (main === undefined) fail(where, 'falta <main>');

  const metas = new Map<string, string>();
  for (const tag of source.matchAll(/<meta\b((?:[^>"']|"[^"]*"|'[^']*')*)>/g)) {
    const attrs = parseAttrs(tag[1]!);
    const name = attrs.get('name');
    if (name) metas.set(name, attrs.get('content') ?? '');
  }
  for (const name of metas.keys()) {
    if (name.startsWith('lcpc:') && !PAGE_SETTINGS.has(name)) fail(where, `ajuste de página desconhecido <meta name="${name}">. Opções: ${[...PAGE_SETTINGS].join(', ')}`);
  }
  const description = metas.get('description');
  if (!description) fail(where, 'falta <meta name="description">');

  const context = requireContext(metas.get('lcpc:context') ?? 'geral', `${where} <meta name="lcpc:context">`);

  const faqSet = metas.get('lcpc:faq');
  if (faqSet && !Object.hasOwn(faq, faqSet)) fail(where, `<meta name="lcpc:faq"> com conjunto desconhecido "${faqSet}". Opções: ${Object.keys(faq).join(', ')}`);

  const crumb = metas.get('lcpc:breadcrumb');
  const extraSchema = metas.get('lcpc:schema');
  const schemaBuilders: Record<string, () => object> = {
    'offer-catalog': () => offerCatalogSchema(origin),
    person: () => personSchema(origin),
  };
  if (extraSchema && !Object.hasOwn(schemaBuilders, extraSchema)) fail(where, `lcpc:schema desconhecido "${extraSchema}". Opções: ${Object.keys(schemaBuilders).join(', ')}`);

  const page: PageContext = { where, headExtras: [], faqSets: new Set(), hasVideo: false };
  const expanded = await expandTags(main, page);

  // O FAQ do JSON-LD (meta lcpc:faq) e o FAQ visível (<lcpc-faq>) precisam ser o mesmo conjunto.
  const rendered = [...page.faqSets];
  if ((faqSet ? [faqSet] : []).join() !== rendered.join()) {
    fail(where, `FAQ visível (${rendered.join(', ') || 'nenhum'}) diferente do FAQ do JSON-LD (${faqSet ?? 'nenhum'}); ajuste <meta name="lcpc:faq"> ou <lcpc-faq set>`);
  }

  const data: PageData = {
    path,
    title,
    description,
    context,
    mobileCtaLabel: metas.get('lcpc:mobile-cta') || undefined,
    faq: faqSet ? faq[faqSet as keyof typeof faq] : undefined,
    breadcrumbs: crumb
      ? [
          { label: 'Início', href: '/' },
          { label: crumb, href: path },
        ]
      : undefined,
    schema: extraSchema ? [schemaBuilders[extraSchema]!()] : [],
    noindex: metas.get('lcpc:noindex') === 'true',
    headExtras: page.headExtras,
    main: expanded,
    hasVideo: page.hasVideo,
  };

  const output = minifyHtml(await renderPage(data, assets));
  // Garantias finais: nada de placeholder nem de caminho do gerador antigo no que vai ao ar.
  const leftover = output.match(/<\/?lcpc-[a-z-]*/)?.[0];
  if (leftover) fail(where, `tag ${leftover}> não foi expandida`);
  if (output.includes('/_astro/')) fail(where, 'caminho /_astro/ no HTML gerado');
  return { path, output: output };
}

/* ---------- Execução ---------- */

try {
  rmSync(DIST, { recursive: true, force: true });
  mkdirSync(DIST, { recursive: true });
  // public/ primeiro: favicon, imagem social, vídeo. O build nunca sobrescreve o que o cliente colocou lá.
  cpSync('public', DIST, { recursive: true });

  const css = await buildCss();
  const [mainScript, videoScript] = await Promise.all([buildClient('src/client/index.ts'), buildClient('src/client/video-entry.ts')]);
  const assets: Assets = {
    css,
    fontPreload: publishFont(resolve('src/assets/fonts/saira-condensed-latin-700-normal.woff2')),
    mainScript,
    videoScript,
  };

  const files = htmlFiles(PAGES).sort();
  if (!files.length) throw new BuildError(`Nenhuma página em ${PAGES}`);
  const built: string[] = [];
  for (const file of files) {
    const { path, output } = await buildPage(file, assets);
    const target = join(DIST, relative(PAGES, file));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, output);
    built.push(path);
  }

  writeFileSync(join(DIST, 'robots.txt'), robotsTxt());
  writeFileSync(join(DIST, 'sitemap.xml'), sitemapXml());
  writeFileSync(join(DIST, 'llms.txt'), llmsTxt());

  const seconds = ((performance.now() - started) / 1000).toFixed(1);
  const mode = siteConfig.indexable ? `produção (${siteConfig.siteUrl})` : 'preview (noindex)';
  console.log(`Build OK em ${seconds}s: ${built.length} páginas, modo ${mode}, analytics ${siteConfig.gtmId ? 'GTM' : siteConfig.ga4Id ? 'GA4' : 'desligado'}.`);
} catch (error) {
  if (error instanceof BuildError) {
    console.error(`\nErro no build: ${error.message}\n`);
    process.exit(1);
  }
  throw error;
}

/**
 * Verificações do build estático. Rode depois do build: npm run verify
 *
 * Confere catálogo contra as marcações do PDF, ofertas proibidas, WhatsApp, links internos,
 * metadados, JSON-LD, NAP e modo de indexação. Sai com código 1 se algo falhar.
 *
 * Modo de indexação: use --production para exigir canônicas e index; o padrão exige preview em noindex.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { catalogItems, categories } from '../src/data/catalog.ts';

const DIST = 'dist';
const PHONE = '5511944700732';
const ADDRESS = 'Rua Maria Pais de Barros, 329, Vila Marari, São Paulo - SP, CEP 04402-140';
const production = process.argv.includes('--production');

const failures = [];
const warnings = [];
let checks = 0;

function check(condition, message) {
  checks += 1;
  if (!condition) failures.push(message);
}

const decode = (text) =>
  text
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&#x27;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');

function htmlFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return name === 'assets' || name === 'media' ? [] : htmlFiles(full);
    return name.endsWith('.html') ? [full] : [];
  });
}

const routeOf = (file) => {
  const rel = relative(DIST, file).split(sep).join('/');
  return rel === '404.html' ? '/404' : `/${rel.replace(/index\.html$/, '')}`;
};

const pages = htmlFiles(DIST).map((file) => {
  const html = readFileSync(file, 'utf8');
  return { file, route: routeOf(file), html };
});

const expectedRoutes = ['/', '/pc-gamer/', '/conserto-de-notebook/', '/conserto-de-computador/', '/servicos/', '/sobre/', '/contato/'];
for (const route of expectedRoutes) {
  check(pages.some((page) => page.route === route), `Rota ausente: ${route}`);
}
/* 0. Sobras do gerador: nenhum placeholder <lcpc-*> nem caminho do Astro pode chegar ao dist */
for (const page of pages) {
  check(!/<\/?lcpc-/i.test(page.html), `${page.route}: tag <lcpc-*> sem expandir`);
  check(!page.html.includes('/_astro/'), `${page.route}: caminho /_astro/ no HTML`);
  check(!/name="lcpc:/.test(page.html), `${page.route}: ajuste de página lcpc: vazou para o HTML`);
}
check(!existsSync(join(DIST, '_astro')), 'dist/_astro não deveria existir');

const commercial = pages.filter((page) => page.route !== '/404');

const attr = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
const tags = (html, name) => html.match(new RegExp(`<${name}\\b[^>]*>`, 'g')) ?? [];
const metaContent = (html, key) =>
  tags(html, 'meta').find((tag) => attr(tag, 'name') === key || attr(tag, 'property') === key);
const stripScripts = (html) => html.replace(/<script\b[\s\S]*?<\/script>/g, ' ');
const visibleText = (html) => decode(stripScripts(html).replace(/<head>[\s\S]*?<\/head>/, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
const jsonLd = (html) =>
  [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((match) => JSON.parse(match[1]));

/* 1. Catálogo x PDF */
const pdf = JSON.parse(readFileSync('materiais/lcpc-gaming/catalogo-extraido.json', 'utf8'));
check(pdf.length === catalogItems.length, `Catálogo tem ${catalogItems.length} itens e o PDF tem ${pdf.length}`);
for (const source of pdf) {
  const item = catalogItems.find((entry) => entry.source === source.source);
  check(Boolean(item), `Item do PDF fora do catálogo: ${source.source}`);
  if (!item) continue;
  check(item.color === source.color, `Cor divergente em "${source.source}": PDF ${source.color}, catálogo ${item.color}`);
  check(item.pdfSection === source.pdfSection, `Seção divergente em "${source.source}"`);
  if (source.color === 'vermelho') check(item.status === 'excluido', `Item vermelho publicado: ${source.source}`);
}

const servicesPage = pages.find((page) => page.route === '/servicos/');
const servicesText = servicesPage ? visibleText(servicesPage.html) : '';
const allText = commercial.map((page) => `${stripScripts(page.html)} ${jsonLd(page.html).map((data) => JSON.stringify(data)).join(' ')}`).join(' ');

for (const item of catalogItems) {
  const label = item.label ?? item.source;
  if (item.status === 'publicado' || item.status === 'publicado-adaptado') {
    check(servicesText.includes(label), `Item publicado não aparece em /servicos/: ${label}`);
    check(categories.some((category) => category.id === item.category), `Item publicado sem categoria: ${label}`);
  } else {
    check(!decode(allText).includes(item.source), `Item ${item.status} aparece no site: ${item.source}`);
  }
}

/* 2. Termos proibidos em texto, metadados e dados estruturados */
const forbidden = [
  [/macbook/i, 'MacBook'],
  [/\bimac\b/i, 'iMac'],
  [/mac\s?os/i, 'macOS'],
  [/\bapple\b/i, 'Apple'],
  [/notebooks? gamers?/i, 'notebook gamer'],
  [/ultrabook/i, 'ultrabook'],
  [/chromebook|chromeos/i, 'Chromebook'],
  [/workstation/i, 'workstation'],
  [/wi-?fi|bluetooth/i, 'Wi-Fi ou Bluetooth'],
  [/placas? de rede|adaptador(es)? de rede|rede doméstica|roteador|repetidor|\bmesh\b/i, 'serviços de rede'],
  [/\bNAS\b|servidor(es)? de arquivos/, 'NAS'],
  [/contratos? de|gestão de chamados|inventário de equipamentos|suporte técnico remoto/i, 'contratos de TI'],
  [/recuperação de acesso|recuperar senha|criptografia/i, 'recuperação de acesso'],
  [/fornecimento de peças|venda de peças|vendemos peças|loja de peças/i, 'venda avulsa de peças'],
  [/nobreak|reciclagem|descarte eletr/i, 'item excluído'],
  [/garantid[oa]s?\b|\bgarantia\b/i, 'promessa de garantia'],
  [/grátis|gratuit[oa]/i, 'oferta gratuita não confirmada'],
  [/\b\d+\s*(horas|dias|anos) de\b|24 ?h\b/i, 'prazo ou tempo de casa não confirmado'],
  [/aggregateRating|openingHours|priceRange|"review"/i, 'dado estruturado não confirmado'],
];
for (const page of commercial) {
  const scan = decode(`${page.html.replaceAll('apple-touch-icon', '')}`);
  for (const [pattern, name] of forbidden) {
    const match = scan.match(pattern);
    check(!match, `${page.route}: termo proibido (${name}): "${match?.[0]}"`);
  }
  check(!/cidade-ademar|zona-sul-sp/.test(page.html), `${page.route}: usa foto com MacBook`);
}
check(!existsSync('src/assets/media/conserto-de-notebook-cidade-ademar.jpg'), 'Foto com MacBook nos assets');

/* 3. WhatsApp */
const expectedMessages = {
  '/conserto-de-notebook/': ['Olá! Vim pelo site da LCPC Gaming e preciso de ajuda com meu notebook. Posso enviar a marca, o modelo e explicar o problema?'],
  '/pc-gamer/': [
    'Olá! Vim pelo site e quero montar um PC gamer. Posso informar meu orçamento, os jogos que quero rodar e se já tenho alguma peça?',
    'Olá! Quero avaliar um upgrade no meu PC gamer. Posso enviar minha configuração atual e explicar o que quero melhorar?',
    'Olá! Vim pelo site da LCPC Gaming e preciso de ajuda com meu PC gamer. Posso enviar a configuração e descrever o problema?',
  ],
  '/servicos/': ['Olá! Vim pelo site da LCPC Gaming e gostaria de conversar sobre um projeto de site, landing page ou identidade visual.'],
};
let whatsappLinks = 0;
for (const page of commercial) {
  const links = tags(page.html, 'a').filter((tag) => /wa\.me/.test(tag));
  check(links.length > 0, `${page.route}: sem link de WhatsApp`);
  const messages = [];
  for (const tag of links) {
    whatsappLinks += 1;
    const url = new URL(decode(attr(tag, 'href') ?? ''));
    check(url.pathname === `/${PHONE}`, `${page.route}: número errado em ${url.href}`);
    const text = url.searchParams.get('text');
    check(Boolean(text), `${page.route}: link sem mensagem`);
    messages.push(text);
    check(tag.includes('data-wa-cta'), `${page.route}: link sem marcação de evento`);
    check(Boolean(attr(tag, 'data-service-category')), `${page.route}: sem service_category`);
    check(Boolean(attr(tag, 'data-cta-location')), `${page.route}: sem cta_location`);
  }
  for (const message of expectedMessages[page.route] ?? []) {
    check(messages.includes(message), `${page.route}: mensagem esperada ausente: ${message}`);
  }
  check(!/\.preventDefault\(/.test(page.html), `${page.route}: evento pode atrasar o WhatsApp`);
  check(/whatsapp_click/.test(page.html), `${page.route}: evento whatsapp_click ausente`);
  check(/page_path/.test(page.html) && /service_category/.test(page.html) && /cta_location/.test(page.html), `${page.route}: parâmetros do evento ausentes`);
}

/* 4. Links internos e âncoras */
const anchorsByRoute = new Map(pages.map((page) => [page.route, new Set([...page.html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]))]));
for (const page of pages) {
  for (const tag of tags(page.html, 'a')) {
    const href = attr(tag, 'href');
    if (!href || /^(https?:|mailto:|tel:)/.test(href)) continue;
    const [path, hash] = decode(href).split('#');
    if (/\.[a-z0-9]+$/i.test(path)) {
      check(existsSync(join(DIST, path)), `${page.route}: arquivo ausente: ${href}`);
      continue;
    }
    const route = path || page.route;
    check(anchorsByRoute.has(route), `${page.route}: link interno quebrado: ${href}`);
    if (hash) check(anchorsByRoute.get(route)?.has(hash), `${page.route}: âncora inexistente: ${href}`);
  }
  for (const tag of [...tags(page.html, 'img'), ...tags(page.html, 'source'), ...tags(page.html, 'video')]) {
    const urls = (attr(tag, 'srcset') ?? '').split(',').map((part) => part.trim().split(' ')[0]);
    urls.push(attr(tag, 'src') ?? '', attr(tag, 'poster') ?? '');
    for (const url of urls.filter((value) => value.startsWith('/'))) {
      check(existsSync(join(DIST, url)), `${page.route}: arquivo ausente: ${url}`);
    }
  }
}

/* 5. Metadados, títulos e imagens */
const titles = new Map();
const descriptions = new Map();
const h1Expected = {
  '/': 'Assistência técnica de computadores e notebooks na Vila Marari',
  '/pc-gamer/': 'Montagem, upgrade e manutenção de PC gamer em São Paulo',
};
for (const page of commercial) {
  const title = decode(page.html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '');
  const description = decode(attr(metaContent(page.html, 'description') ?? '', 'content') ?? '');
  check(Boolean(title) && !titles.has(title), `${page.route}: title ausente ou repetido`);
  check(Boolean(description) && !descriptions.has(description), `${page.route}: description ausente ou repetida`);
  titles.set(title, page.route);
  descriptions.set(description, page.route);
  if (title.length > 65) warnings.push(`${page.route}: title com ${title.length} caracteres`);
  if (description.length > 165 || description.length < 120) warnings.push(`${page.route}: description com ${description.length} caracteres`);

  const h1s = [...page.html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)].map((match) => decode(match[1].replace(/<[^>]+>/g, '').trim()));
  check(h1s.length === 1, `${page.route}: ${h1s.length} H1`);
  if (h1Expected[page.route]) check(h1s[0] === h1Expected[page.route], `${page.route}: H1 diferente do brief: ${h1s[0]}`);

  for (const property of ['og:title', 'og:description', 'og:image', 'og:url', 'twitter:card']) {
    check(Boolean(metaContent(page.html, property)), `${page.route}: sem ${property}`);
  }

  const levels = [...page.html.matchAll(/<h([1-6])\b/g)].map((match) => Number(match[1]));
  levels.forEach((level, index) => {
    if (index > 0) check(level - levels[index - 1] <= 1, `${page.route}: salto de heading H${levels[index - 1]} para H${level}`);
  });

  for (const tag of tags(page.html, 'img')) {
    // Um alt vazio é válido em imagem decorativa, como a logo dentro de um link com aria-label.
    check(/\salt(=|\s|\/?>)/.test(tag), `${page.route}: imagem sem alt: ${attr(tag, 'src')}`);
    check(Boolean(attr(tag, 'width')) && Boolean(attr(tag, 'height')), `${page.route}: imagem sem dimensões: ${attr(tag, 'src')}`);
  }

  check(visibleText(page.html).includes(ADDRESS), `${page.route}: endereço completo ausente`);
  check(page.html.includes('(11) 94470-0732'), `${page.route}: telefone ausente`);
  check(page.html.includes('mailto:contato@lcpcgaming.com'), `${page.route}: e-mail clicável ausente`);
  check(page.html.includes('google.com/maps/dir/'), `${page.route}: "Como chegar" ausente`);

  /* JSON-LD */
  const data = jsonLd(page.html);
  const business = data.find((entry) => entry['@type'] === 'LocalBusiness');
  check(Boolean(business), `${page.route}: sem LocalBusiness`);
  check(business?.telephone === '+5511944700732', `${page.route}: telefone divergente no JSON-LD`);
  check(business?.address?.streetAddress === 'Rua Maria Pais de Barros, 329', `${page.route}: endereço divergente no JSON-LD`);
  const faq = data.find((entry) => entry['@type'] === 'FAQPage');
  if (faq) {
    const text = visibleText(page.html);
    for (const question of faq.mainEntity) {
      check(text.includes(question.name), `${page.route}: pergunta do JSON-LD fora da página: ${question.name}`);
      check(text.includes(question.acceptedAnswer.text), `${page.route}: resposta do JSON-LD fora da página: ${question.name}`);
    }
  }

  /* Indexação */
  const robots = attr(metaContent(page.html, 'robots') ?? '', 'content');
  const canonical = tags(page.html, 'link').find((tag) => attr(tag, 'rel') === 'canonical');
  if (production) {
    check(robots === 'index, follow', `${page.route}: produção sem index`);
    check(Boolean(canonical) && attr(canonical, 'href').endsWith(page.route), `${page.route}: canônica incorreta`);
  } else {
    check(robots === 'noindex, nofollow', `${page.route}: preview indexável`);
    check(!canonical, `${page.route}: preview com canônica`);
  }
}

/* 6. Regras específicas de página */
const home = pages.find((page) => page.route === '/');
check(/<img[^>]*fetchpriority="high"/.test(home?.html ?? ''), 'Home: foto de abertura sem prioridade');
check(!/<video/.test(home?.html ?? ''), 'Home deve ter imagem estática, sem vídeo');
check((home?.html ?? '').includes('Pedir orçamento no WhatsApp'), 'Home: CTA principal ausente');
check((home?.html ?? '').includes('Ver serviços para PC gamer'), 'Home: CTA de PC gamer ausente');

const gamer = pages.find((page) => page.route === '/pc-gamer/');
const video = tags(gamer?.html ?? '', 'video')[0] ?? '';
check(/preload="none"/.test(video), 'Vídeo não carrega sob demanda');
check(/\scontrols/.test(video), 'Vídeo sem controles');
check(!/\sautoplay/.test(video), 'Vídeo com autoplay');
check(Boolean(attr(video, 'poster')), 'Vídeo sem capa');

const firstNav = (home?.html ?? '').match(/<nav class="nav-desktop"[\s\S]*?<a href="([^"]+)"/)?.[1];
check(firstNav === '/pc-gamer/', `Primeiro item do menu é ${firstNav}`);

/* 7. Arquivos de rastreamento */
const robotsTxt = readFileSync(join(DIST, 'robots.txt'), 'utf8');
const sitemap = readFileSync(join(DIST, 'sitemap.xml'), 'utf8');
if (production) {
  check(/Sitemap: https?:\/\//.test(robotsTxt), 'robots.txt sem sitemap em produção');
  check((sitemap.match(/<loc>/g) ?? []).length === expectedRoutes.length, 'Sitemap incompleto');
} else {
  check(!/<loc>/.test(sitemap), 'Sitemap de preview não pode listar URLs');
}

for (const warning of warnings) console.warn(`aviso: ${warning}`);
if (failures.length) {
  console.error(`\n${failures.length} falha(s) em ${checks} verificações:`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(`OK: ${checks} verificações em ${pages.length} páginas e ${whatsappLinks} links de WhatsApp (modo ${production ? 'produção' : 'preview'}).`);

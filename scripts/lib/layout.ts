/**
 * Estrutura comum a todas as páginas: <head>, cabeçalho, migalhas, rodapé, barra do celular, JSON-LD e scripts.
 * As páginas em src/pages só trazem o conteúdo de <main> e os ajustes de página (meta lcpc:*).
 */
import { business, directionsUrl, fullAddress } from '../../src/data/business.ts';
import { categoriesByPriority } from '../../src/data/catalog.ts';
import type { FaqItem } from '../../src/data/faq.ts';
import { logoImage, socialImage, video } from '../../src/data/media.ts';
import { mainNav, siteConfig } from '../../src/data/site.ts';
import { steps } from '../../src/data/steps.ts';
import type { WhatsappContext } from '../../src/data/whatsapp.ts';
import {
  breadcrumbSchema,
  faqSchema,
  howToSchema,
  imageObjectsSchema,
  localBusinessSchema,
  serviceSchema,
  videoSchema,
  webPageSchema,
  webSiteSchema,
} from '../../src/lib/schema.ts';
import { picture, whatsappLink, type PageImage } from './components.ts';
import { esc, parseAttrs } from './html.ts';
import { source } from './images.ts';
import { purgeCss, scriptClasses } from './purge-css.ts';

export interface Crumb {
  label: string;
  href: string;
}

export interface PageData {
  /** Caminho público, com barras nas pontas (ex.: /pc-gamer/). */
  path: string;
  /** HTML já escapado, como escrito na página. */
  title: string;
  description: string;
  context: WhatsappContext;
  mobileCtaLabel?: string;
  faq?: FaqItem[];
  breadcrumbs?: Crumb[];
  noindex: boolean;
  headExtras: string[];
  main: string;
  hasVideo: boolean;
  /** Conjunto de passos mostrado na página (vira HowTo no JSON-LD). */
  howto?: string;
  /** Tipo schema.org da página (WebPage, AboutPage, ContactPage, CollectionPage). */
  pageType: string;
  /** Nome e tipo do serviço, nas páginas comerciais (gera o schema Service). */
  service?: { name: string; type: string; description: string };
  /** Imagem principal da página. */
  primaryImage?: PageImage;
  /** Imagem social gerada no build (caminho público) e seu texto alternativo. */
  og?: { path: string; alt: string };
  /** Fotos reais da página, para os ImageObject. */
  images: PageImage[];
  parts: string[];
  scripts: string[];
  /** Schema extra montado por quem conhece a página (Person, OfferCatalog). */
  extraSchema: object[];
}

export interface Assets {
  css: string;
  /** CSS de cada parte (src/styles/parts/<nome>.css), embutido só nas páginas que a usam. */
  cssParts: Record<string, string>;
  fontPreload: string;
  mainScript: string;
  /** Scripts extras por nome: video, symptoms, map. */
  scripts: Record<string, string>;
}

/** Sem domínio, as URLs absolutas usam o endereço local de preview. */
export const origin = new URL(siteConfig.siteUrl || 'http://localhost:4321');

/** Escapa `<` para que um texto com "</script>" nunca encerre o bloco de JSON-LD. */
const jsonForScript = (data: object) => JSON.stringify(data).replaceAll('<', '\\u003c');

/** Valor de ambiente como literal JS seguro dentro de <script>. */
const lit = (value: string) => JSON.stringify(value).replaceAll('<', '\\u003c');

/**
 * GTM ou GA4, só depois de a página ser de fato aberta: uma página pré-renderizada por Speculation Rules
 * (document.prerendering) espera o prerenderingchange, para não contar visita que não aconteceu.
 */
function analytics(): string {
  const { gtmId, ga4Id } = siteConfig;
  const whenActive = (body: string) =>
    `<script>(function(){function go(){${body}}if(document.prerendering){document.addEventListener('prerenderingchange',go,{once:true});}else{go();}})();</script>`;
  if (gtmId) {
    return whenActive(
      `window.dataLayer=window.dataLayer||[];window.dataLayer.push({'gtm.start':Date.now(),event:'gtm.js'});var gtm=document.createElement('script');gtm.async=true;gtm.src='https://www.googletagmanager.com/gtm.js?id='+encodeURIComponent(${lit(gtmId)});document.head.appendChild(gtm);`,
    );
  }
  if (ga4Id) {
    return whenActive(
      `window.dataLayer=window.dataLayer||[];window.gtag=function(){window.dataLayer.push(arguments);};window.gtag('js',new Date());window.gtag('config',${lit(ga4Id)},{transport_type:'beacon'});var ga=document.createElement('script');ga.async=true;ga.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(${lit(ga4Id)});document.head.appendChild(ga);`,
    );
  }
  return '';
}

/** Navegação instantânea: o navegador pré-renderiza a página de um link interno quando o visitante passa o mouse ou toca nele. */
const SPECULATION_RULES = JSON.stringify({
  prerender: [
    {
      where: { and: [{ href_matches: '/*' }, { not: { href_matches: '/404/' } }, { not: { selector_matches: '[target=_blank]' } }] },
      eagerness: 'moderate',
    },
  ],
});

async function logo(alt: string, eager: boolean): Promise<string> {
  return picture(await source(logoImage.file), alt, [160, 320], '160px', { class: 'logo', eager });
}

function navItems(path: string): string {
  const current = (href: string) => path === href || path.startsWith(href);
  return mainNav.map((item) => `<li><a href="${item.href}"${current(item.href) ? ' aria-current="page"' : ''}>${esc(item.label)}</a></li>`).join('');
}

async function header(page: PageData): Promise<string> {
  const items = navItems(page.path);
  return (
    `<header class="site-header"><div class="site-header__bar"><a class="site-header__logo" href="/" aria-label="LCPC Gaming, página inicial">${await logo('', true)}</a>` +
    `<nav class="nav-desktop" aria-label="Principal"><ul>${items}</ul></nav>` +
    `${whatsappLink({ context: page.context, location: 'header', label: 'Pedir orçamento', class: 'site-header__cta' })}` +
    `<details class="nav-mobile" data-nav-menu><summary><span class="nav-mobile__closed">Menu</span><span class="nav-mobile__open">Fechar</span></summary>` +
    `<nav aria-label="Principal, celular"><ul>${items}</ul></nav></details></div></header>`
  );
}

function breadcrumbs(items: Crumb[]): string {
  const last = items.length - 1;
  const list = items
    .map((item, index) => `<li>${index === last ? `<span aria-current="page">${esc(item.label)}</span>` : `<a href="${item.href}">${esc(item.label)}</a>`}</li>`)
    .join('');
  return `<nav class="breadcrumbs wrap" aria-label="Você está em"><ol>${list}</ol></nav>`;
}

async function footer(): Promise<string> {
  const profile = siteConfig.googleBusinessUrl
    ? `<br><a href="${esc(siteConfig.googleBusinessUrl)}" target="_blank" rel="noopener">Perfil da Empresa no Google</a>`
    : '';
  const links = mainNav.map((item) => `<li><a href="${item.href}">${esc(item.label)}</a></li>`).join('');
  const services = categoriesByPriority('foco')
    .filter((category) => category.id !== 'atendimento')
    .map((category) => `<li><a href="/servicos/#${category.id}">${esc(category.title)}</a></li>`)
    .join('');
  return (
    `<footer class="site-footer"><div class="wrap site-footer__grid"><div>${await logo('LCPC Gaming', false)}<p class="site-footer__slogan">${esc(business.slogan)}</p></div>` +
    `<address class="site-footer__nap"><strong>${esc(business.name)}</strong><br>${esc(fullAddress)}<br>WhatsApp <a href="tel:${business.phone.e164}">${esc(business.phone.display)}</a><br>` +
    `<a href="mailto:${business.email}">${esc(business.email)}</a><br><a href="${esc(directionsUrl)}" target="_blank" rel="noopener">Como chegar</a>${profile}</address>` +
    `<nav aria-label="Rodapé"><ul class="site-footer__nav">${links}</ul></nav>` +
    `<nav aria-label="Serviços"><ul class="site-footer__nav">${services}</ul></nav></div>` +
    `<div class="wrap site-footer__legal"><p>Horários e condições de retirada e entrega: consulte pelo WhatsApp.</p><p>© ${new Date().getFullYear()} ${esc(business.name)}. São Paulo - SP.</p></div></footer>`
  );
}

export interface RenderedPage {
  html: string;
  /** Valor do cabeçalho Link (preload) da página, para o Worker enviar antes do HTML (Early Hints). */
  link: string;
}

export async function renderPage(page: PageData, assets: Assets): Promise<RenderedPage> {
  const canonical = siteConfig.siteUrl ? `${siteConfig.siteUrl}${page.path}` : null;
  const robots = siteConfig.indexable && !page.noindex ? 'index, follow' : 'noindex, nofollow';
  const pageUrl = canonical ?? new URL(page.path, origin).href;
  const ogImage = new URL(page.og?.path ?? socialImage.src, origin).href;
  const ogAlt = page.og?.alt ?? socialImage.alt;

  const structuredData = [
    localBusinessSchema(origin),
    webSiteSchema(origin),
    webPageSchema(origin, {
      path: page.path,
      type: page.pageType,
      name: page.title,
      description: page.description,
      image: page.primaryImage,
      breadcrumb: Boolean(page.breadcrumbs),
      speakable: page.main.includes('class="answer') ? ['h1', '.answer p'] : ['h1'],
    }),
    ...(page.breadcrumbs ? [breadcrumbSchema(page.breadcrumbs, origin, page.path)] : []),
    ...(page.faq?.length ? [faqSchema(page.faq)] : []),
    ...(page.service ? [serviceSchema(origin, { path: page.path, ...page.service })] : []),
    ...(page.hasVideo ? [videoSchema(origin, video)] : []),
    ...(page.howto ? [howToSchema(origin, { path: page.path, name: 'Como funciona o atendimento da LCPC Gaming', steps: steps[page.howto as keyof typeof steps] })] : []),
    ...(page.images.length ? [imageObjectsSchema(origin, page.images)] : []),
    ...page.extraSchema,
  ];


  const scriptList = [assets.mainScript, ...page.scripts.map((name) => assets.scripts[name] ?? '')].filter(Boolean);
  const body =
    `<a class="skip-link" href="#conteudo">Pular para o conteúdo</a>${await header(page)}` +
    `${page.breadcrumbs ? breadcrumbs(page.breadcrumbs) : ''}<main id="conteudo">${page.main}</main>${await footer()}` +
    `<div class="mobile-cta">${whatsappLink({ context: page.context, location: 'barra_celular', label: page.mobileCtaLabel, class: 'btn--block' })}</div>` +
    scriptList.map((js) => `<script>${js}</script>`).join('');

  // Só entra no HTML o CSS que a página usa (classes do HTML final e as que o JavaScript acrescenta).
  const css = purgeCss([assets.css, ...page.parts.map((name) => assets.cssParts[name] ?? '')].join(''), body, scriptClasses(scriptList));

  // Mesmo que o <link rel="preload"> do <head>, mas como cabeçalho HTTP Link: a Cloudflare o transforma em Early Hints.
  const preloads = [
    `<${assets.fontPreload}>; rel=preload; as=font; type="font/woff2"; crossorigin`,
    ...page.headExtras
      .filter((tag) => tag.includes('rel="preload"') && tag.includes('as="image"'))
      .map((tag) => {
        const attrs = parseAttrs(tag.replace(/^<link/, '').replace(/>$/, ''));
        const first = attrs.get('imagesrcset')?.split(',')[0]?.trim().split(' ')[0];
        const params = ['imagesrcset', 'imagesizes', 'media', 'type']
          .filter((name) => attrs.has(name))
          .map((name) => `${name}="${attrs.get(name)!.replaceAll('"', '')}"`);
        return first ? `<${first}>; rel=preload; as=image; fetchpriority=high; ${params.join('; ')}` : '';
      }),
  ]
    .filter(Boolean)
    .join(', ');

  const head = [
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${page.title}</title>`,
    `<meta name="description" content="${page.description}">`,
    `<meta name="robots" content="${robots}">`,
    canonical ? `<link rel="canonical" href="${esc(canonical)}">` : '',
    '<meta name="theme-color" content="#1d2024">',
    '<link rel="icon" type="image/png" sizes="48x48" href="/favicon.png">',
    '<link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png">',
    '<link rel="apple-touch-icon" href="/apple-touch-icon.png">',
    '<link rel="manifest" href="/site.webmanifest">',
    `<link rel="preload" href="${assets.fontPreload}" as="font" type="font/woff2" crossorigin>`,
    `<script type="speculationrules">${SPECULATION_RULES}</script>`,
    '<meta property="og:type" content="website">',
    '<meta property="og:locale" content="pt_BR">',
    '<meta property="og:site_name" content="LCPC Gaming">',
    `<meta property="og:title" content="${page.title}">`,
    `<meta property="og:description" content="${page.description}">`,
    `<meta property="og:url" content="${esc(pageUrl)}">`,
    `<meta property="og:image" content="${esc(ogImage)}">`,
    '<meta property="og:image:type" content="image/jpeg">',
    `<meta property="og:image:width" content="${socialImage.width}">`,
    `<meta property="og:image:height" content="${socialImage.height}">`,
    `<meta property="og:image:alt" content="${esc(ogAlt)}">`,
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${page.title}">`,
    `<meta name="twitter:description" content="${page.description}">`,
    `<meta name="twitter:image" content="${esc(ogImage)}">`,
    `<meta name="twitter:image:alt" content="${esc(ogAlt)}">`,
    ...page.headExtras,
    `<style>${css}</style>`,
    ...structuredData.map((data) => `<script type="application/ld+json">${jsonForScript(data)}</script>`),
    analytics(),
  ].join('');

  return {
    html: `<!doctype html><html lang="pt-BR"><head>${head}</head><body>${body}</body></html>`,
    link: preloads,
  };
}

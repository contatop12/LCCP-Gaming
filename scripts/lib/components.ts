/**
 * Peças compartilhadas: o que as páginas HTML pedem com tags <lcpc-*> e o que o layout repete em todas elas.
 * Qualquer valor desconhecido (contexto, categoria, foto, conjunto de FAQ, tag) derruba o build.
 */
import { business, directionsUrl, mapsEmbedUrl, mapsUrl, neighborhoodNote } from '../../src/data/business.ts';
import { categories, categoriesByPriority, publishedItems, type CatalogCategory } from '../../src/data/catalog.ts';
import { faq } from '../../src/data/faq.ts';
import { images, video, type SiteImage } from '../../src/data/media.ts';
import { siteConfig } from '../../src/data/site.ts';
import { steps } from '../../src/data/steps.ts';
import { symptomSets, type SymptomSetName } from '../../src/data/symptoms.ts';
import { whatsappContexts, whatsappUrl, type WhatsappContext } from '../../src/data/whatsapp.ts';
import { xrayCrop, xrayParts } from '../../src/data/xray.ts';
import { classes, esc, fail, parseAttrs, type Attrs } from './html.ts';
import { placeholderColor, source, srcset, variant, type Source } from './images.ts';

/** Estado de uma página durante a expansão: usado nas mensagens de erro e para levar itens ao <head>. */
export interface PageImage {
  /** Caminho público da maior variante JPEG (ex.: /assets/img/nome-1200.hash.jpg). */
  path: string;
  width: number;
  height: number;
  caption: string;
}

export interface PageContext {
  where: string;
  headExtras: string[];
  faqSets: Set<string>;
  hasVideo: boolean;
  /** Conjunto de passos (src/data/steps.ts) exibido na página, que também sai como HowTo no JSON-LD. */
  howto?: string;
  /** Trechos de CSS (src/styles/parts/<nome>.css) que a página usa, para não embutir o resto. */
  parts: Set<string>;
  /** Scripts extras (src/client/<nome>-entry.ts) que a página usa. */
  scripts: Set<string>;
  /** Fotos reais da página, para o sitemap de imagens e os ImageObject. */
  images: Map<string, PageImage>;
}

/* ---------- Validação ---------- */

export function requireContext(value: string | undefined, where: string): WhatsappContext {
  if (!value || !Object.hasOwn(whatsappContexts, value)) {
    fail(where, `contexto de WhatsApp desconhecido "${value ?? ''}". Opções: ${Object.keys(whatsappContexts).join(', ')}`);
  }
  return value as WhatsappContext;
}

function requireCategory(value: string | undefined, where: string): CatalogCategory {
  const found = categories.find((category) => category.id === value);
  if (!found) fail(where, `categoria do catálogo desconhecida "${value ?? ''}". Opções: ${categories.map((c) => c.id).join(', ')}`);
  return found;
}

function requirePriority(value: string | undefined, where: string): CatalogCategory['priority'] {
  if (value !== 'foco' && value !== 'complementar' && value !== 'digital') {
    fail(where, `prioridade desconhecida "${value ?? ''}". Opções: foco, complementar, digital`);
  }
  return value;
}

function requireImage(name: string | undefined, where: string): SiteImage {
  if (!name || !Object.hasOwn(images, name)) fail(where, `foto desconhecida "${name ?? ''}". Opções: ${Object.keys(images).join(', ')}`);
  return images[name as keyof typeof images];
}

function required(attrs: Attrs, name: string, where: string): string {
  const value = attrs.get(name);
  if (!value) fail(where, `atributo "${name}" obrigatório`);
  return value;
}

const numbers = (value: string | undefined, where: string): number[] => {
  if (!value) fail(where, 'atributo de larguras obrigatório');
  const list = value.split(',').map((part) => Number(part.trim()));
  if (list.some((n) => !Number.isInteger(n) || n <= 0)) fail(where, `larguras inválidas "${value}"`);
  return list;
};

/* ---------- Peças ---------- */

const WHATSAPP_ICON =
  '<svg class="btn__icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path fill="currentColor" d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.46-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.53.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.91-2.2-.25-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.06 2.88 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2-1.42.25-.69.25-1.29.18-1.41-.08-.13-.28-.2-.57-.35m-5.42 7.4h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.88 9.88m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.69 1.45h.01c6.55 0 11.89-5.34 11.89-11.89a11.82 11.82 0 0 0-3.48-8.41z"/></svg>';

export interface WhatsappOptions {
  context: WhatsappContext;
  /** Valor de cta_location no evento whatsapp_click. */
  location: string;
  /** HTML do rótulo, já escapado. */
  label?: string;
  variant?: 'primary' | 'dark' | 'ghost' | 'text';
  class?: string;
}

export function whatsappLink({ context, location, label = 'Pedir orçamento no WhatsApp', variant = 'primary', class: className }: WhatsappOptions): string {
  const { serviceCategory } = whatsappContexts[context];
  const cls = classes(variant === 'text' ? 'text-link' : `btn btn--${variant}`, className);
  const icon = variant === 'text' ? '' : WHATSAPP_ICON;
  return `<a class="${cls}" href="${esc(whatsappUrl(context))}" target="_blank" rel="noopener" data-wa-cta data-service-category="${serviceCategory}" data-cta-location="${esc(location)}">${icon}<span>${label}</span></a>`;
}

export interface PictureOptions {
  class?: string;
  /** Somente para a imagem principal da página. As demais carregam sob demanda. */
  priority?: boolean;
  /** Acima da dobra, mas sem competir com a imagem principal (ex.: logo do cabeçalho). */
  eager?: boolean;
  /** Recorte alternativo para outra faixa de tela. */
  art?: { image: Source; widths: number[]; sizes: string; media: string };
  /** Cor de reserva (hex) do espaço da foto até ela decodificar. */
  placeholder?: string;
  /** Estilo inline extra (ex.: object-position). */
  style?: string;
}

export async function picture(image: Source, alt: string, widths: number[], sizes: string, options: PictureOptions = {}): Promise<string> {
  const { class: className, priority = false, eager = false, art, placeholder, style } = options;
  const [avif, webp, fallback] = await Promise.all([
    srcset(image, widths, 'avif'),
    srcset(image, widths, 'webp'),
    srcset(image, widths, image.format),
  ]);
  const dims = (img: Source) => `width="${img.width}" height="${img.height}"`;
  let artSources = '';
  if (art) {
    const [artAvif, artWebp] = await Promise.all([srcset(art.image, art.widths, 'avif'), srcset(art.image, art.widths, 'webp')]);
    artSources =
      `<source type="image/avif" media="${esc(art.media)}" srcset="${artAvif.attribute}" sizes="${esc(art.sizes)}" ${dims(art.image)}>` +
      `<source type="image/webp" media="${esc(art.media)}" srcset="${artWebp.attribute}" sizes="${esc(art.sizes)}" ${dims(art.image)}>`;
  }
  const inline = [placeholder ? `background-color:${placeholder}` : '', style ?? ''].filter(Boolean).join(';');
  const img =
    `<img${className ? ` class="${esc(className)}"` : ''} src="${fallback.largest}" alt="${esc(alt)}" ${dims(image)}` +
    ` loading="${priority || eager ? 'eager' : 'lazy'}" decoding="${priority ? 'sync' : 'async'}"${priority ? ' fetchpriority="high"' : eager ? '' : ' fetchpriority="low"'}${inline ? ` style="${esc(inline)}"` : ''}>`;
  return (
    `<picture>${artSources}` +
    `<source type="image/avif" srcset="${avif.attribute}" sizes="${esc(sizes)}" ${dims(image)}>` +
    `<source type="image/webp" srcset="${webp.attribute}" sizes="${esc(sizes)}" ${dims(image)}>${img}</picture>`
  );
}

/** Descreve uma foto real (maior variante JPEG, até 1200 px) para o sitemap de imagens e os ImageObject. */
export async function describeImage(image: SiteImage): Promise<PageImage> {
  const src = await source(image.file);
  const width = Math.min(1200, src.width);
  const path = await variant(src, width, src.format);
  return { path, width, height: Math.round((src.height * width) / src.width), caption: image.caption ?? image.alt };
}

/** Registra uma foto real da página. */
async function track(page: PageContext, image: SiteImage, _src: Source): Promise<void> {
  const info = await describeImage(image);
  page.images.set(info.path, info);
}

interface PhotoOptions {
  widths?: number[];
  class?: string;
  priority?: boolean;
  pos?: string;
  /** Nome da transição entre páginas (view-transition-name: morph-<nome>): o mesmo nome nas duas páginas faz a foto se mover de uma para a outra. */
  morph?: string;
  /** Sem legenda (a imagem é um fundo de bloco com texto por cima). */
  bare?: boolean;
}

async function photo(page: PageContext, image: SiteImage, sizes: string, options: PhotoOptions): Promise<string> {
  const src = await source(image.file);
  await track(page, image, src);
  const inner = await picture(src, image.alt, options.widths ?? [480, 800, 1200], sizes, {
    priority: options.priority,
    placeholder: options.priority ? undefined : await placeholderColor(src),
    style: options.pos ? `object-position:${options.pos}` : undefined,
  });
  const caption = image.caption && !options.bare ? `<figcaption>${esc(image.caption)}</figcaption>` : '';
  return `<figure class="${classes('photo', options.class)}">${inner}${caption}</figure>`;
}

/** Bloco de foto real que pode ter texto por cima (bento). Sem texto, mostra a legenda. */
async function tile(page: PageContext, image: SiteImage, sizes: string, options: PhotoOptions, body: string): Promise<string> {
  const src = await source(image.file);
  await track(page, image, src);
  const inner = await picture(src, image.alt, options.widths ?? [480, 800, 1200], sizes, {
    class: 'tile__img',
    priority: options.priority,
    placeholder: options.priority ? undefined : await placeholderColor(src),
    style: options.pos ? `object-position:${options.pos}` : undefined,
  });
  const text = body.trim();
  const caption = !text && !options.bare && image.caption ? `<figcaption class="tile__cap">${esc(image.caption)}</figcaption>` : '';
  const morph = options.morph ? ` style="view-transition-name:morph-${esc(options.morph)}"` : '';
  return `<figure class="${classes('tile tile--photo', text && 'tile--has-text', options.class)}"${morph}>${inner}${text ? `<div class="tile__body">${text}</div>` : ''}${caption}</figure>`;
}

function faqList(set: string, title: string, lead: string | undefined, side: string, where: string): string {
  if (!Object.hasOwn(faq, set)) fail(where, `conjunto de FAQ desconhecido "${set}". Opções: ${Object.keys(faq).join(', ')}`);
  const items = faq[set as keyof typeof faq]
    .map((item) => `<details class="faq__item"><summary><h3>${esc(item.question)}</h3></summary><p>${esc(item.answer)}</p></details>`)
    .join('');
  return (
    `<section class="band" aria-labelledby="faq-titulo"><div class="wrap faq-layout"><div class="faq-layout__head"><h2 id="faq-titulo">${title}</h2>` +
    `${lead ? `<p>${lead}</p>` : ''}${side}</div><div class="faq">${items}</div></div></section>`
  );
}

const external = (href: string) => `href="${esc(href)}" target="_blank" rel="noopener"`;

function addressBlock(context: WhatsappContext, location: string, label: string | undefined): string {
  const { address, phone, email } = business;
  const profile = siteConfig.googleBusinessUrl
    ? `<p><a class="text-link" ${external(siteConfig.googleBusinessUrl)}>Ver o Perfil da Empresa no Google</a></p>`
    : '';
  return (
    `<address class="location__address"><span>${esc(address.street)}</span>` +
    `<span>${esc(address.neighborhood)}, ${esc(address.city)} - ${esc(address.state)}</span><span>CEP ${esc(address.postalCode)}</span></address>` +
    `<dl class="location__contacts"><div><dt>WhatsApp</dt><dd><a href="tel:${phone.e164}">${esc(phone.display)}</a></dd></div>` +
    `<div><dt>E-mail</dt><dd><a href="mailto:${email}">${esc(email)}</a></dd></div>` +
    `<div><dt>Horários, retirada e entrega</dt><dd>Confirme as condições pelo WhatsApp.</dd></div></dl>` +
    `<div class="actions">${whatsappLink({ context, location, label })}<a class="btn btn--ghost" ${external(directionsUrl)}>Como chegar</a></div>${profile}`
  );
}

/** Mapa sob demanda: nenhuma requisição ao Google antes do clique. Sem JavaScript, fica o link para o Maps. */
function mapFacade(page: PageContext): string {
  page.parts.add('map');
  page.scripts.add('map');
  const { address } = business;
  const art =
    '<svg class="map__art" viewBox="0 0 640 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">' +
    '<g fill="none" stroke-width="2"><path class="m-a" d="M-10 310H150L210 250H330L370 210H470L520 160H650"/><path class="m-b" d="M-10 90H120L190 160H260L320 100H450L500 50H650"/>' +
    '<path class="m-a" d="M90 410V300L150 240V150L210 90V-10"/><path class="m-b" d="M420 410V330L470 280V210L530 150V-10"/><path class="m-c" d="M250 410V320L330 240V-10"/></g>' +
    '<g class="m-pad"><circle cx="150" cy="310" r="5"/><circle cx="470" cy="210" r="5"/><circle cx="190" cy="160" r="5"/><circle cx="450" cy="100" r="5"/></g>' +
    '<g class="m-pin"><circle cx="330" cy="200" r="30"/><path d="M330 226 311 196a22 22 0 1 1 38 0z"/><circle cx="330" cy="188" r="8"/></g></svg>';
  return (
    `<div class="map" data-map data-src="${esc(mapsEmbedUrl)}" data-title="Mapa do Google: ${esc(business.name)}, ${esc(address.street)}, ${esc(address.neighborhood)}">${art}` +
    `<div class="map__box"><p class="map__place"><strong>${esc(address.street)}</strong><span>${esc(address.neighborhood)}, ${esc(address.city)} - ${esc(address.state)}</span></p>` +
    `<div class="actions"><button class="btn btn--primary" type="button" data-map-load hidden>Ver o mapa aqui</button><a class="btn btn--ghost" ${external(mapsUrl)}>Abrir no Google Maps</a></div>` +
    `<p class="map__note" data-map-note hidden>O mapa é do Google e só carrega depois do seu clique.</p></div></div>`
  );
}

/** <ul> com os itens publicados de uma categoria. Categoria sem itens publicados derruba o build. */
function itemList(category: CatalogCategory, className: string, where: string, exclude?: string): string {
  const items = publishedItems(category.id).filter((item) => !exclude || !item.includes(exclude));
  if (!items.length) fail(where, `categoria "${category.id}" sem itens publicados`);
  return `<ul class="${esc(className)}">${items.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>`;
}

/** Bloco de uma categoria em /servicos/: título, resumo e todos os itens publicados à vista. */
function serviceTile(category: CatalogCategory, className: string, where: string): string {
  const primary = category.priority === 'foco';
  const cta = category.whatsapp
    ? whatsappLink({
        context: category.whatsapp,
        location: `servicos_${category.id}`,
        label: category.ctaLabel && esc(category.ctaLabel),
        variant: primary ? 'ghost' : 'text',
      })
    : '';
  const related = category.relatedPage ? `<a class="text-link" href="${esc(category.relatedPage.href)}">${esc(category.relatedPage.label)}</a>` : '';
  return (
    `<article id="${category.id}" class="${classes('tile tile--service', primary ? '' : 'tile--secondary', className)}"><div class="tile__body"><h3>${esc(category.title)}</h3><p>${esc(category.summary)}</p>` +
    `${itemList(category, 'chips', where)}<div class="tile__actions">${cta}${related}</div></div></article>`
  );
}

function digitalBlock(category: CatalogCategory, where: string): string {
  const cta = category.whatsapp
    ? whatsappLink({ context: category.whatsapp, location: 'servicos_digital', label: category.ctaLabel && esc(category.ctaLabel), variant: 'text' })
    : '';
  return (
    `<section id="${category.id}" class="band band--ink" aria-labelledby="digital-titulo"><div class="wrap digital-block">` +
    `<div><h2 id="digital-titulo">${esc(category.title)}</h2><p>${esc(category.summary)}</p></div>${itemList(category, 'chips', where)}${cta}</div></section>`
  );
}

/* ---------- Trilhas de circuito ---------- */

const TRACES: Record<string, string> = {
  '1': '<path class="t-a" d="M0 38H260L300 10H640L676 42H980L1020 14H1440"/><path class="t-b" d="M0 50H420L450 30H820L846 52H1440"/><g class="t-pad"><circle cx="300" cy="10" r="4"/><circle cx="1020" cy="14" r="4"/><rect x="842" y="48" width="8" height="8"/></g>',
  '2': '<path class="t-a" d="M0 14H380L420 46H760L800 18H1200L1236 50H1440"/><path class="t-b" d="M0 30H180L206 52H520"/><g class="t-pad"><circle cx="420" cy="46" r="4"/><circle cx="1200" cy="18" r="4"/><rect x="516" y="48" width="8" height="8"/></g>',
  '3': '<path class="t-a" d="M0 46H520L560 18H900L936 46H1440"/><path class="t-b" d="M900 8H1180L1216 36H1440"/><g class="t-pad"><circle cx="560" cy="18" r="4"/><circle cx="936" cy="46" r="4"/><rect x="1176" y="4" width="8" height="8"/></g>',
};

function trace(variant: string, where: string, pulse: boolean): string {
  if (!Object.hasOwn(TRACES, variant)) fail(where, `variante de trilha desconhecida "${variant}". Opções: ${Object.keys(TRACES).join(', ')}`);
  return (
    `<div class="trace${pulse ? ' trace--pulse' : ''}" aria-hidden="true"><svg viewBox="0 0 1440 56" preserveAspectRatio="xMidYMid slice" focusable="false">${TRACES[variant]}` +
    `${pulse ? '<rect class="t-signal" x="0" y="34" width="46" height="4"/>' : ''}</svg></div>`
  );
}

/* ---------- Raio-x do gabinete ---------- */

const XRAY = { width: 1120, height: 570, photoLeft: 310, photoWidth: 500, labelEdge: 292 };

async function xray(page: PageContext): Promise<string> {
  page.parts.add('xray');
  const image = images.hero;
  const src = await source(image.file);
  const scale = XRAY.photoWidth / xrayCrop.width;
  const inner = await picture(src, image.alt, [720, 1080, 1440], '(min-width: 1100px) 62vw, 135vw', { class: 'xray__img', placeholder: await placeholderColor(src) });
  await track(page, image, src);

  const lines: string[] = [];
  const dots: string[] = [];
  const items: string[] = [];
  xrayParts.forEach((part, index) => {
    const n = index + 1;
    const left = part.side === 'l';
    const anchorX = left ? XRAY.labelEdge : XRAY.width - XRAY.labelEdge;
    for (const [ox, oy] of part.points) {
      const cx = ox + 120;
      const cy = oy - 60;
      const px = XRAY.photoLeft + (cx - xrayCrop.x) * scale;
      const py = (cy - xrayCrop.y) * scale;
      const dy = Math.abs(py - part.labelY);
      const kx = left ? Math.max(px - dy, anchorX + 8) : Math.min(px + dy, anchorX - 8);
      lines.push(`<polyline data-i="${n}" points="${anchorX},${part.labelY} ${kx.toFixed(1)},${part.labelY} ${px.toFixed(1)},${py.toFixed(1)}"/>`);
      dots.push(
        `<span class="xray__dot" data-i="${n}" style="left:${(((cx - xrayCrop.x) / xrayCrop.width) * 100).toFixed(2)}%;top:${(((cy - xrayCrop.y) / xrayCrop.height) * 100).toFixed(2)}%"><b>${n}</b></span>`,
      );
    }
    items.push(
      `<li class="xray__item xray__item--${part.side}" data-i="${n}" style="--y:${((part.labelY / XRAY.height) * 100).toFixed(2)}%"><a href="${esc(part.href)}">` +
        `<span class="xray__n" aria-hidden="true">${n}</span><span class="xray__txt"><strong>${esc(part.name)}</strong><span>${esc(part.service)}</span></span></a></li>`,
    );
  });

  return (
    `<figure class="xray"><div class="xray__stage"><div class="xray__photo">${inner}${dots.join('')}</div>` +
    `<svg class="xray__lines" viewBox="0 0 ${XRAY.width} ${XRAY.height}" aria-hidden="true" focusable="false">${lines.join('')}</svg>` +
    `<ol class="xray__list">${items.join('')}</ol></div>` +
    `<figcaption>Gabinete real com iluminação RGB. Cada componente marcado leva ao serviço do catálogo que cuida dele.</figcaption></figure>`
  );
}

/* ---------- Seletor de sintomas ---------- */

function symptoms(setName: string, location: string, where: string, page: PageContext): string {
  if (!Object.hasOwn(symptomSets, setName)) fail(where, `conjunto de sintomas desconhecido "${setName}". Opções: ${Object.keys(symptomSets).join(', ')}`);
  page.parts.add('symptoms');
  page.scripts.add('symptoms');
  const list = symptomSets[setName as SymptomSetName];
  for (const item of list) requireContext(item.context, `${where} (${item.id})`);
  const tabs = list.map((item) => `<li><a href="#${item.id}" data-tab="${item.id}">${esc(item.label)}</a></li>`).join('');
  const bullets = (entries: string[]) => `<ul class="ticks">${entries.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>`;
  const panels = list
    .map(
      (item) =>
        `<article id="${item.id}" class="sx__panel" data-panel><h3>${esc(item.title)}</h3><div class="sx__cols">` +
        `<div><h4>O que é avaliado</h4>${bullets(item.evaluated)}</div><div><h4>O que enviar</h4>${bullets(item.send)}</div></div>` +
        `<p class="sx__links">${item.links.map((l) => `<a class="text-link" href="${esc(l.href)}">${esc(l.label)}</a>`).join('')}</p>` +
        `<div class="sx__cta">${whatsappLink({ context: item.context, location, label: esc(item.ctaLabel) })}</div></article>`,
    )
    .join('');
  return `<div class="sx" data-symptoms><nav class="sx__choices" aria-label="Escolha o que está acontecendo"><ul>${tabs}</ul></nav><div class="sx__screen">${panels}</div></div>`;
}

/* ---------- Tags <lcpc-*> ---------- */

type Renderer = (attrs: Attrs, inner: string, page: PageContext) => string | Promise<string>;

const tags: Record<string, Renderer> = {
  'lcpc-whatsapp': (attrs, inner, page) => {
    const where = `${page.where} <lcpc-whatsapp>`;
    const variant = attrs.get('variant') ?? 'primary';
    if (variant !== 'primary' && variant !== 'dark' && variant !== 'ghost' && variant !== 'text') fail(where, `variant desconhecida "${variant}"`);
    return whatsappLink({
      context: requireContext(attrs.get('context'), where),
      location: required(attrs, 'location', where),
      label: inner.trim() || undefined,
      variant,
      class: attrs.get('class'),
    });
  },

  'lcpc-photo': (attrs, _inner, page) => {
    const where = `${page.where} <lcpc-photo>`;
    return photo(page, requireImage(attrs.get('name'), where), required(attrs, 'sizes', where), {
      widths: attrs.has('widths') ? numbers(attrs.get('widths'), where) : undefined,
      class: attrs.get('class'),
      priority: attrs.has('priority'),
      pos: attrs.get('pos'),
    });
  },

  // Bloco de bento: foto real preenchendo o bloco, com texto por cima (conteúdo da tag) ou legenda.
  'lcpc-tile': (attrs, inner, page) => {
    const where = `${page.where} <lcpc-tile>`;
    return tile(
      page,
      requireImage(attrs.get('name'), where),
      required(attrs, 'sizes', where),
      {
        widths: attrs.has('widths') ? numbers(attrs.get('widths'), where) : undefined,
        class: attrs.get('class'),
        priority: attrs.has('priority'),
        pos: attrs.get('pos'),
        morph: attrs.get('morph'),
        bare: attrs.has('bare'),
      },
      inner,
    );
  },

  // Imagem sem <figure>, com recorte alternativo para celular e preload no <head> (abertura da home).
  'lcpc-picture': async (attrs, _inner, page) => {
    const where = `${page.where} <lcpc-picture>`;
    const image = requireImage(attrs.get('name'), where);
    const sizes = required(attrs, 'sizes', where);
    const widths = numbers(attrs.get('widths'), where);
    const src = await source(image.file);
    await track(page, image, src);
    const preload = attrs.has('preload');
    let art: PictureOptions['art'];
    if (attrs.has('art-name')) {
      const artImage = requireImage(attrs.get('art-name'), where);
      art = {
        image: await source(artImage.file),
        widths: numbers(attrs.get('art-widths'), where),
        sizes: attrs.get('art-sizes') ?? '100vw',
        media: required(attrs, 'art-media', where),
      };
      if (preload) {
        const set = await srcset(art.image, art.widths, 'avif');
        page.headExtras.push(
          `<link rel="preload" as="image" type="image/avif" media="${esc(art.media)}" imagesrcset="${set.attribute}" imagesizes="${esc(art.sizes)}" fetchpriority="high">`,
        );
      }
    }
    if (preload) {
      const set = await srcset(src, widths, 'avif');
      const media = attrs.get('preload-media');
      page.headExtras.push(
        `<link rel="preload" as="image" type="image/avif"${media ? ` media="${esc(media)}"` : ''} imagesrcset="${set.attribute}" imagesizes="${esc(sizes)}" fetchpriority="high">`,
      );
    }
    return picture(src, image.alt, widths, sizes, { priority: attrs.has('priority'), art, class: attrs.get('class') });
  },

  // Dado de src/data/business.ts dentro de um texto corrido (ex.: field="owner.name").
  'lcpc-business': (attrs, _inner, page) => {
    const where = `${page.where} <lcpc-business>`;
    const field = required(attrs, 'field', where);
    const fields: Record<string, string> = {
      name: business.name,
      slogan: business.slogan,
      'owner.name': business.owner.name,
      'owner.role': business.owner.role,
      'phone.display': business.phone.display,
      email: business.email,
      neighborhood: neighborhoodNote,
    };
    if (!Object.hasOwn(fields, field)) fail(where, `campo desconhecido "${field}". Opções: ${Object.keys(fields).join(', ')}`);
    return esc(fields[field]!);
  },

  'lcpc-catalog': (attrs, _inner, page) => {
    const where = `${page.where} <lcpc-catalog>`;
    return itemList(requireCategory(attrs.get('category'), where), attrs.get('class') ?? 'ticks', where, attrs.get('exclude'));
  },

  'lcpc-faq': async (attrs, _inner, page) => {
    const where = `${page.where} <lcpc-faq>`;
    const set = required(attrs, 'set', where);
    page.faqSets.add(set);
    let side = '';
    if (attrs.has('photo')) {
      const image = requireImage(attrs.get('photo'), where);
      side = await tile(page, image, '(min-width: 900px) 32vw, 100vw', { class: 'faq-layout__photo', pos: attrs.get('photo-pos') }, '');
    }
    return faqList(set, attrs.get('title') ?? 'Perguntas frequentes', attrs.get('lead'), side, where);
  },

  // Seção de localização: mapa sob demanda ao lado do endereço.
  'lcpc-location': (attrs, _inner, page) => {
    const where = `${page.where} <lcpc-location>`;
    const id = attrs.get('id') ?? 'localizacao';
    const intro = attrs.get('intro');
    return (
      `<section class="band band--deep" aria-labelledby="${esc(id)}"><div class="wrap loc"><div class="loc__map">${mapFacade(page)}</div>` +
      `<div class="loc__info"><h2 id="${esc(id)}">${required(attrs, 'title', where)}</h2>${intro ? `<p class="loc__intro">${intro}</p>` : ''}` +
      `${addressBlock(requireContext(attrs.get('context'), where), required(attrs, 'location', where), attrs.get('label'))}</div></div></section>`
    );
  },

  'lcpc-cta-band': (attrs, _inner, page) => {
    const where = `${page.where} <lcpc-cta-band>`;
    const context = requireContext(attrs.get('context'), where);
    return (
      `<section class="cta-band"><div class="wrap cta-band__inner"><div><h2>${required(attrs, 'title', where)}</h2><p>${required(attrs, 'text', where)}</p></div>` +
      `${whatsappLink({ context, location: 'faixa_final', label: attrs.get('label'), variant: 'dark' })}</div>${trace('3', where, false)}</section>`
    );
  },

  // Capa leve (imagem AVIF/WebP, carregada sob demanda) e clicável. O <video> só entra na página depois do clique
  // (src/client/video.ts). Sem JavaScript, o <noscript> traz o player nativo com controles e nada baixa antes do play.
  'lcpc-video': async (_attrs, _inner, page) => {
    page.hasVideo = true;
    const src = await source(images.videoGabinete.file);
    const cover = await picture(src, '', [232, 464], 'min(100vw, 240px)', {
      placeholder: await placeholderColor(src),
      style: 'object-position:50% 50%',
    });
    const sources = video.sources.map((item) => `<source src="${esc(item.src)}" type="${esc(item.type)}">`).join('');
    const data = video.sources.map((item) => `${esc(item.src)}|${esc(item.type)}`).join(';');
    return (
      `<figure class="video" data-video data-sources="${data}" data-width="${video.width}" data-height="${video.height}" data-title="${esc(video.title)}"><div class="video__frame">` +
      `<button class="video__facade" type="button" data-video-open hidden aria-label="Assistir ao vídeo: ${esc(video.title)}">${cover}` +
      `<span class="video__play" aria-hidden="true"><svg viewBox="0 0 24 24" width="30" height="30" focusable="false"><path fill="currentColor" d="M7 4.5v15l13-7.5z"/></svg><span>Assistir ao vídeo</span></span></button>` +
      `<noscript><video controls preload="none" playsinline poster="${esc(video.poster)}" width="${video.width}" height="${video.height}" aria-label="${esc(video.title)}">${sources}` +
      `<a href="${esc(video.sources[video.sources.length - 1]!.src)}">Baixar o vídeo em MP4</a></video></noscript></div>` +
      `<figcaption>${esc(video.description)}</figcaption></figure>`
    );
  },

  'lcpc-trace': (attrs, _inner, page) => trace(attrs.get('variant') ?? '1', `${page.where} <lcpc-trace>`, attrs.has('pulse')),

  'lcpc-xray': (_attrs, _inner, page) => xray(page),

  // Passos do atendimento. A mesma lista (src/data/steps.ts) alimenta o HowTo do JSON-LD, então os dois nunca divergem.
  'lcpc-steps': (attrs, _inner, page) => {
    const where = `${page.where} <lcpc-steps>`;
    const set = required(attrs, 'set', where);
    if (!Object.hasOwn(steps, set)) fail(where, `conjunto de passos desconhecido "${set}". Opções: ${Object.keys(steps).join(', ')}`);
    page.howto = set;
    const items = steps[set as keyof typeof steps]
      .map((step) => `<li><strong class="steps__name">${esc(step.name)}</strong><p>${esc(step.text)}</p></li>`)
      .join('');
    return `<ol class="steps steps--cards">${items}</ol>`;
  },

  'lcpc-symptoms': (attrs, _inner, page) => {
    const where = `${page.where} <lcpc-symptoms>`;
    return symptoms(required(attrs, 'set', where), required(attrs, 'location', where), where, page);
  },

  // Bloco de categoria do catálogo em /servicos/ (todos os itens publicados à vista, âncora = id da categoria).
  'lcpc-service': (attrs, _inner, page) => {
    const where = `${page.where} <lcpc-service>`;
    return serviceTile(requireCategory(attrs.get('category'), where), attrs.get('class') ?? '', where);
  },

  'lcpc-digital-block': (attrs, _inner, page) => {
    const where = `${page.where} <lcpc-digital-block>`;
    return digitalBlock(requireCategory(attrs.get('category') ?? 'digital', where), where);
  },

  // Índice de âncoras (#id) para as categorias de uma prioridade, no topo de /servicos/.
  'lcpc-category-links': (attrs, _inner, page) => {
    const list = categoriesByPriority(requirePriority(attrs.get('priority'), `${page.where} <lcpc-category-links>`));
    return `<ul class="${esc(attrs.get('class') ?? 'index-chips')}">${list.map((category) => `<li><a href="#${category.id}">${esc(category.title)}</a></li>`).join('')}</ul>`;
  },

  'lcpc-category-link': (attrs, _inner, page) => {
    const category = requireCategory(attrs.get('category'), `${page.where} <lcpc-category-link>`);
    return `<a href="#${category.id}">${esc(category.title)}</a>`;
  },
};

const TAG = /<(lcpc-[a-z0-9-]+)((?:\s+(?:[^>"']|"[^"]*"|'[^']*')*?)?)\s*(\/)?>/;

/** Troca todas as tags <lcpc-*> do HTML da página pelo HTML final. Tag desconhecida derruba o build. */
export async function expandTags(html: string, page: PageContext): Promise<string> {
  let output = '';
  let rest = html;
  for (;;) {
    const match = TAG.exec(rest);
    if (!match) break;
    const whole = match[0];
    const name = match[1]!;
    const rawAttrs = match[2] ?? '';
    const render = Object.hasOwn(tags, name) ? tags[name] : undefined;
    if (!render) fail(page.where, `tag desconhecida <${name}>. Opções: ${Object.keys(tags).join(', ')}`);
    output += rest.slice(0, match.index);
    rest = rest.slice(match.index + whole.length);
    let inner = '';
    if (!match[3]) {
      const close = rest.indexOf(`</${name}>`);
      if (close === -1) fail(page.where, `<${name}> sem fechamento (use <${name} ... /> ou </${name}>)`);
      // O conteúdo de uma tag também pode ter tags <lcpc-*> (ex.: um botão de WhatsApp dentro de um bloco).
      inner = await expandTags(rest.slice(0, close), page);
      rest = rest.slice(close + name.length + 3);
    }
    output += await render(parseAttrs(rawAttrs), inner, page);
  }
  return output + rest;
}

/**
 * Peças compartilhadas: o que as páginas HTML pedem com tags <lcpc-*> e o que o layout repete em todas elas.
 * Qualquer valor desconhecido (contexto, categoria, foto, conjunto de FAQ, tag) derruba o build.
 */
import { business, directionsUrl } from '../../src/data/business.ts';
import { categories, categoriesByPriority, publishedItems, type CatalogCategory } from '../../src/data/catalog.ts';
import { faq } from '../../src/data/faq.ts';
import { images, video, type SiteImage } from '../../src/data/media.ts';
import { siteConfig } from '../../src/data/site.ts';
import { whatsappContexts, whatsappUrl, type WhatsappContext } from '../../src/data/whatsapp.ts';
import { classes, esc, fail, parseAttrs, type Attrs } from './html.ts';
import { source, srcset, type Source } from './images.ts';

/** Estado de uma página durante a expansão: usado nas mensagens de erro e para levar itens ao <head>. */
export interface PageContext {
  where: string;
  headExtras: string[];
  faqSets: Set<string>;
  hasVideo: boolean;
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
  variant?: 'primary' | 'dark' | 'text';
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
}

export async function picture(image: Source, alt: string, widths: number[], sizes: string, options: PictureOptions = {}): Promise<string> {
  const { class: className, priority = false, eager = false, art } = options;
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
  const img =
    `<img${className ? ` class="${esc(className)}"` : ''} src="${fallback.largest}" srcset="${fallback.attribute}" sizes="${esc(sizes)}" alt="${esc(alt)}" ${dims(image)}` +
    ` loading="${priority || eager ? 'eager' : 'lazy'}" decoding="${priority ? 'sync' : 'async'}"${priority ? ' fetchpriority="high"' : ''}>`;
  return (
    `<picture>${artSources}` +
    `<source type="image/avif" srcset="${avif.attribute}" sizes="${esc(sizes)}" ${dims(image)}>` +
    `<source type="image/webp" srcset="${webp.attribute}" sizes="${esc(sizes)}" ${dims(image)}>${img}</picture>`
  );
}

async function photo(image: SiteImage, sizes: string, options: { widths?: number[]; class?: string; priority?: boolean }): Promise<string> {
  const src = await source(image.file);
  const inner = await picture(src, image.alt, options.widths ?? [480, 800, 1200], sizes, { priority: options.priority });
  const caption = image.caption ? `<figcaption>${esc(image.caption)}</figcaption>` : '';
  return `<figure class="${classes('photo', options.class)}">${inner}${caption}</figure>`;
}

function faqList(set: string, title: string, where: string): string {
  if (!Object.hasOwn(faq, set)) fail(where, `conjunto de FAQ desconhecido "${set}". Opções: ${Object.keys(faq).join(', ')}`);
  const items = faq[set as keyof typeof faq]
    .map((item) => `<details class="faq__item"><summary><h3>${esc(item.question)}</h3></summary><p>${esc(item.answer)}</p></details>`)
    .join('');
  return `<section class="section" aria-labelledby="faq-titulo"><div class="wrap split"><h2 id="faq-titulo" class="split__head">${title}</h2><div class="faq">${items}</div></div></section>`;
}

const external = (href: string) => `href="${esc(href)}" target="_blank" rel="noopener"`;

function locationBlock(context: WhatsappContext, location: string, label: string | undefined): string {
  const { address, phone, email } = business;
  const profile = siteConfig.googleBusinessUrl
    ? `<p><a class="text-link" ${external(siteConfig.googleBusinessUrl)}>Ver o Perfil da Empresa no Google</a></p>`
    : '';
  return (
    `<div class="location"><address class="location__address"><span>${esc(address.street)}</span>` +
    `<span>${esc(address.neighborhood)}, ${esc(address.city)} - ${esc(address.state)}</span><span>CEP ${esc(address.postalCode)}</span></address>` +
    `<dl class="location__contacts"><div><dt>WhatsApp</dt><dd><a href="tel:${phone.e164}">${esc(phone.display)}</a></dd></div>` +
    `<div><dt>E-mail</dt><dd><a href="mailto:${email}">${esc(email)}</a></dd></div>` +
    `<div><dt>Horários, retirada e entrega</dt><dd>Confirme as condições pelo WhatsApp.</dd></div></dl>` +
    `<div class="actions">${whatsappLink({ context, location, label })}<a class="btn btn--ghost" ${external(directionsUrl)}>Como chegar</a></div>${profile}</div>`
  );
}

/** <ul> com os itens publicados de uma categoria. Categoria sem itens publicados derruba o build. */
function itemList(category: CatalogCategory, className: string, where: string, exclude?: string): string {
  const items = publishedItems(category.id).filter((item) => !exclude || !item.includes(exclude));
  if (!items.length) fail(where, `categoria "${category.id}" sem itens publicados`);
  return `<ul class="${esc(className)}">${items.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>`;
}

function service(category: CatalogCategory, where: string): string {
  const primary = category.priority === 'foco';
  const cta = category.whatsapp
    ? whatsappLink({
        context: category.whatsapp,
        location: `servicos_${category.id}`,
        label: category.ctaLabel && esc(category.ctaLabel),
        variant: primary ? 'primary' : 'text',
      })
    : '';
  const related =
    primary && category.relatedPage
      ? `<p class="service__related"><a class="text-link" href="${esc(category.relatedPage.href)}">${esc(category.relatedPage.label)}</a></p>`
      : '';
  return (
    `<article id="${category.id}" class="${primary ? 'service' : 'service service--secondary'}"><div class="service__head"><h3>${esc(category.title)}</h3><p>${esc(category.summary)}</p>${cta}${related}</div>` +
    `${itemList(category, primary ? 'ticks ticks--columns' : 'ticks', where)}</article>`
  );
}

function digitalBlock(category: CatalogCategory, where: string): string {
  const cta = category.whatsapp
    ? whatsappLink({ context: category.whatsapp, location: 'servicos_digital', label: category.ctaLabel && esc(category.ctaLabel), variant: 'text' })
    : '';
  return (
    `<section id="${category.id}" class="section section--raised section--tight" aria-labelledby="digital-titulo"><div class="wrap digital-block">` +
    `<div><h2 id="digital-titulo">${esc(category.title)}</h2><p>${esc(category.summary)}</p></div>${itemList(category, 'ticks', where)}${cta}</div></section>`
  );
}

/* ---------- Tags <lcpc-*> ---------- */

type Renderer = (attrs: Attrs, inner: string, page: PageContext) => string | Promise<string>;

const tags: Record<string, Renderer> = {
  'lcpc-whatsapp': (attrs, inner, page) => {
    const where = `${page.where} <lcpc-whatsapp>`;
    const variant = attrs.get('variant') ?? 'primary';
    if (variant !== 'primary' && variant !== 'dark' && variant !== 'text') fail(where, `variant desconhecida "${variant}"`);
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
    return photo(requireImage(attrs.get('name'), where), required(attrs, 'sizes', where), {
      widths: attrs.has('widths') ? numbers(attrs.get('widths'), where) : undefined,
      class: attrs.get('class'),
      priority: attrs.has('priority'),
    });
  },

  // Imagem sem <figure>, com recorte alternativo para celular e preload no <head> (abertura da home).
  'lcpc-picture': async (attrs, _inner, page) => {
    const where = `${page.where} <lcpc-picture>`;
    const image = requireImage(attrs.get('name'), where);
    const sizes = required(attrs, 'sizes', where);
    const widths = numbers(attrs.get('widths'), where);
    const src = await source(image.file);
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
    return picture(src, image.alt, widths, sizes, { priority: attrs.has('priority'), art });
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
    };
    if (!Object.hasOwn(fields, field)) fail(where, `campo desconhecido "${field}". Opções: ${Object.keys(fields).join(', ')}`);
    return esc(fields[field]!);
  },

  'lcpc-catalog': (attrs, _inner, page) => {
    const where = `${page.where} <lcpc-catalog>`;
    return itemList(requireCategory(attrs.get('category'), where), attrs.get('class') ?? 'ticks', where, attrs.get('exclude'));
  },

  'lcpc-faq': (attrs, _inner, page) => {
    const where = `${page.where} <lcpc-faq>`;
    const set = required(attrs, 'set', where);
    page.faqSets.add(set);
    return faqList(set, attrs.get('title') ?? 'Perguntas frequentes', where);
  },

  'lcpc-location': (attrs, _inner, page) => {
    const where = `${page.where} <lcpc-location>`;
    return locationBlock(requireContext(attrs.get('context'), where), required(attrs, 'location', where), attrs.get('label'));
  },

  'lcpc-cta-band': (attrs, _inner, page) => {
    const where = `${page.where} <lcpc-cta-band>`;
    const context = requireContext(attrs.get('context'), where);
    return (
      `<section class="cta-band"><div class="wrap cta-band__inner"><div><h2>${required(attrs, 'title', where)}</h2><p>${required(attrs, 'text', where)}</p></div>` +
      `${whatsappLink({ context, location: 'faixa_final', label: attrs.get('label'), variant: 'dark' })}</div></section>`
    );
  },

  'lcpc-video': (_attrs, _inner, page) => {
    page.hasVideo = true;
    return (
      `<figure class="video" data-video><div class="video__frame"><video controls preload="none" playsinline poster="${esc(video.poster)}" width="${video.width}" height="${video.height}" aria-label="${esc(video.title)}">` +
      `<source src="${esc(video.src)}" type="video/mp4"><a href="${esc(video.src)}">Baixar o vídeo em MP4</a></video>` +
      `<button class="video__play" type="button" hidden data-video-play><svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true" focusable="false"><path fill="currentColor" d="M7 4.5v15l13-7.5z"/></svg><span>Assistir ao vídeo</span></button></div>` +
      `<figcaption>${esc(video.description)}</figcaption></figure>`
    );
  },

  // Catálogo de /servicos/: um <article> por categoria da prioridade pedida, na ordem de src/data/catalog.ts.
  'lcpc-services': (attrs, _inner, page) => {
    const where = `${page.where} <lcpc-services>`;
    const priority = requirePriority(attrs.get('priority'), where);
    const list = categoriesByPriority(priority);
    if (!list.length) fail(where, `nenhuma categoria com prioridade "${priority}"`);
    return list.map((category) => service(category, where)).join('');
  },

  'lcpc-digital-block': (attrs, _inner, page) => {
    const where = `${page.where} <lcpc-digital-block>`;
    return digitalBlock(requireCategory(attrs.get('category') ?? 'digital', where), where);
  },

  // <ul> de links de âncora (#id) para as categorias de uma prioridade, no índice de /servicos/.
  'lcpc-category-links': (attrs, _inner, page) => {
    const list = categoriesByPriority(requirePriority(attrs.get('priority'), `${page.where} <lcpc-category-links>`));
    return `<ul>${list.map((category) => `<li><a href="#${category.id}">${esc(category.title)}</a></li>`).join('')}</ul>`;
  },

  'lcpc-category-link': (attrs, _inner, page) => {
    const category = requireCategory(attrs.get('category'), `${page.where} <lcpc-category-link>`);
    return `<a href="#${category.id}">${esc(category.title)}</a>`;
  },

  // Resumos dos serviços prioritários da home, com link para /servicos/#id.
  'lcpc-category-summaries': (attrs, _inner, page) => {
    const where = `${page.where} <lcpc-category-summaries>`;
    const exclude = (attrs.get('exclude') ?? '').split(',').filter(Boolean);
    exclude.forEach((id) => requireCategory(id, where));
    const list = categoriesByPriority(requirePriority(attrs.get('priority'), where)).filter((category) => !exclude.includes(category.id));
    const items = list.map((category) => `<li><h3><a href="/servicos/#${category.id}">${esc(category.title)}</a></h3><p>${esc(category.summary)}</p></li>`);
    return `<ul class="${esc(attrs.get('class') ?? 'spec-rows')}">${items.join('')}</ul>`;
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
      inner = rest.slice(0, close);
      rest = rest.slice(close + name.length + 3);
    }
    output += await render(parseAttrs(rawAttrs), inner, page);
  }
  return output + rest;
}

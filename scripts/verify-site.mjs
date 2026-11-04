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
import sharp from 'sharp';
import { findOffPalette, htmlColorSpots } from './lib/palette-check.mjs';
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
const ogImages = new Map();
const wordCounts = new Map();
const cssSizes = new Map();

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
  // Revisão 2 (brief): frase banida, bairro errado, equipe inventada, "perto de mim" artificial, condição de autorizada e marcas como alvo.
  [/também monta/i, 'frase banida "também monta"'],
  [/vila mariana/i, 'Vila Mariana (o bairro é Vila Marari)'],
  [/nossa equipe|nosso time|nossos técnicos/i, 'equipe inexistente'],
  [/perto de mim/i, '"perto de mim" artificial'],
  [/assistência autorizada|autorizada d[aeo]|dell|lenovo|hp|asus|acer|samsung/i, 'marca ou condição de autorizada sem confirmação'],
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
  // O script do evento (o que contém whatsapp_click) nunca chama preventDefault. Outros scripts, como as abas de sintomas, podem usar nas teclas de seta.
  const analyticsScript = [...page.html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).find((code) => code.includes('whatsapp_click')) ?? '';
  check(analyticsScript !== '' && !/preventDefault/.test(analyticsScript), `${page.route}: evento pode atrasar o WhatsApp`);
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
  '/conserto-de-notebook/': 'Assistência técnica de notebooks na Vila Marari',
  '/conserto-de-computador/': 'Assistência técnica de computadores na Vila Marari',
  '/pc-gamer/': 'Assistência técnica e montagem de PC gamer na Vila Marari',
};
for (const page of commercial) {
  const title = decode(page.html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '');
  const description = decode(attr(metaContent(page.html, 'description') ?? '', 'content') ?? '');
  check(Boolean(title) && !titles.has(title), `${page.route}: title ausente ou repetido`);
  check(Boolean(description) && !descriptions.has(description), `${page.route}: description ausente ou repetida`);
  titles.set(title, page.route);
  descriptions.set(description, page.route);
  // Revisão 2: virou falha (antes era aviso). Exceção explícita: o título da home é fixado pelo brief ("Assistência Técnica na Vila Marari | LCPC Gaming", 48 caracteres).
  if (page.route === '/') check(title === 'Assistência Técnica na Vila Marari | LCPC Gaming', `/: title deve ser exatamente o do brief, está "${title}"`);
  else if (page.route !== '/404') check(title.length >= 50 && title.length <= 60, `${page.route}: title com ${title.length} caracteres (alvo: 50 a 60)`);
  check(description.length >= 140 && description.length <= 160, `${page.route}: description com ${description.length} caracteres (alvo: 140 a 160)`);

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

  /* JSON-LD ampliado: WebSite, WebPage, Service, VideoObject, ImageObject, Person, hasMap, contactPoint */
  const byType = (type) => data.filter((entry) => entry['@type'] === type);
  const pageNode = data.find((entry) => ['WebPage', 'AboutPage', 'ContactPage', 'CollectionPage'].includes(entry['@type']));
  check(byType('WebSite').length === 1, `${page.route}: sem WebSite`);
  check(Boolean(pageNode), `${page.route}: sem WebPage no JSON-LD`);
  check(Boolean(pageNode?.primaryImageOfPage?.url && pageNode.primaryImageOfPage.width && pageNode.primaryImageOfPage.height), `${page.route}: WebPage sem primaryImageOfPage`);
  check(business?.hasMap?.startsWith('https://www.google.com/maps?q='), `${page.route}: LocalBusiness sem hasMap`);
  check(business?.contactPoint?.['@type'] === 'ContactPoint' && business.contactPoint.telephone === '+5511944700732', `${page.route}: LocalBusiness sem contactPoint de WhatsApp`);
  const graphImages = data.flatMap((entry) => (entry['@graph'] ?? []).filter((node) => node['@type'] === 'ImageObject'));
  check(graphImages.length >= 1 && graphImages.every((img) => img.contentUrl && img.width && img.height && img.caption), `${page.route}: ImageObject incompleto`);
  const serviceRoutes = ['/', '/pc-gamer/', '/conserto-de-notebook/', '/conserto-de-computador/'];
  const service = byType('Service')[0];
  if (serviceRoutes.includes(page.route)) {
    check(Boolean(service?.serviceType) && service.provider?.['@id']?.endsWith('/#empresa'), `${page.route}: Service sem serviceType ou provider`);
    check(service?.areaServed?.['@type'] === 'City' && service.areaServed.name === 'São Paulo', `${page.route}: areaServed deve ser só a cidade de São Paulo`);
  }
  if (page.route === '/pc-gamer/') {
    const videoData = byType('VideoObject')[0];
    check(videoData?.duration === 'PT26S' && videoData.uploadDate === '2026-11-03', `${page.route}: VideoObject com duração ou data errada`);
    check(Boolean(videoData?.name && videoData.description && videoData.thumbnailUrl && videoData.contentUrl), `${page.route}: VideoObject incompleto`);
  } else {
    check(byType('VideoObject').length === 0, `${page.route}: VideoObject fora de /pc-gamer/`);
  }
  if (page.route === '/sobre/') {
    const person = byType('Person')[0];
    check(person?.name === 'Luis Carlos' && Boolean(person.image?.contentUrl), `${page.route}: Person sem nome ou imagem`);
  }
  const jsonText = JSON.stringify(data);
  check(!/"geo"|GeoCoordinates|latitude|longitude/.test(jsonText), `${page.route}: coordenadas no JSON-LD`);
  if (production) check(!jsonText.includes('localhost'), `${page.route}: URL de preview no JSON-LD de produção`);

  /* Imagem social própria, 1200x630 e abaixo de 300 KB */
  const ogUrl = attr(metaContent(page.html, 'og:image') ?? '', 'content') ?? '';
  const ogPath = ogUrl.replace(/^https?:\/\/[^/]+/, '');
  const ogFile = join(DIST, ogPath);
  check(existsSync(ogFile), `${page.route}: og:image inexistente (${ogPath})`);
  if (existsSync(ogFile)) {
    const size = statSync(ogFile).size;
    const meta = await sharp(ogFile).metadata();
    check(meta.width === 1200 && meta.height === 630, `${page.route}: og:image com ${meta.width}x${meta.height}`);
    check(size < 300 * 1024, `${page.route}: og:image com ${Math.round(size / 1024)} KB`);
    check(ogPath.startsWith('/og/'), `${page.route}: og:image sem imagem própria da página`);
    check(!ogImages.has(ogPath), `${page.route}: og:image repetida de ${ogImages.get(ogPath)}`);
    ogImages.set(ogPath, page.route);
  }

  /* Texto útil e resposta direta */
  const mainText = visibleText((page.html.match(/<main[\s\S]*<\/main>/) ?? [''])[0]);
  const words = mainText.split(' ').filter(Boolean).length;
  wordCounts.set(page.route, words);
  if ([...serviceRoutes, '/servicos/'].includes(page.route)) {
    check(words >= 400, `${page.route}: só ${words} palavras de texto útil (mínimo 400)`);
    const answer = page.html.match(/<div class="answer[^"]*">\s*<h2[^>]*>[\s\S]*?<\/h2>\s*<p>([\s\S]*?)<\/p>/)?.[1];
    const answerWords = answer ? decode(answer.replace(/<[^>]+>/g, ' ')).split(/\s+/).filter(Boolean).length : 0;
    check(answerWords >= 50 && answerWords <= 100, `${page.route}: resposta direta com ${answerWords} palavras (esperado 50 a 100)`);
  }
  if (['/pc-gamer/', '/conserto-de-notebook/', '/conserto-de-computador/', '/servicos/', '/contato/'].includes(page.route)) {
    check((faq?.mainEntity?.length ?? 0) >= 3, `${page.route}: menos de 3 perguntas frequentes`);
  }

  /* Seletor de sintomas: todas as respostas no HTML, cada uma com WhatsApp e links internos */
  const tabIds = [...page.html.matchAll(/data-tab="([^"]+)"/g)].map((m) => m[1]);
  if (tabIds.length) check(tabIds.length >= 4, `${page.route}: seletor de sintomas com poucas opções`);
  for (const id of tabIds) {
    const panel = page.html.match(new RegExp(`<article id="${id}" class="sx__panel"[\\s\\S]*?</article>`))?.[0] ?? '';
    check(panel.includes('wa.me/') && panel.includes('O que é avaliado') && panel.includes('O que enviar') && /href="\/[^"]*"/.test(panel), `${page.route}: painel de sintoma incompleto (${id})`);
  }
  check(!/<iframe/.test(page.html), `${page.route}: iframe no HTML (o mapa só pode carregar depois do clique)`);
  check(!/<(?:img|script|link)[^>]+(?:google\.com\/maps|maps\.googleapis|gstatic)/.test(page.html), `${page.route}: requisição a terceiros antes do clique`);

  /* Imagens: sizes junto de srcset, nomes descritivos em português */
  for (const tag of tags(page.html, 'img')) {
    if (attr(tag, 'srcset')) check(Boolean(attr(tag, 'sizes')), `${page.route}: imagem com srcset sem sizes: ${attr(tag, 'src')}`);
  }
  const css = page.html.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? '';
  check(css.length < 80 * 1024, `${page.route}: CSS embutido com ${Math.round(css.length / 1024)} KB`);
  cssSizes.set(page.route, css.length);
  for (const block of css.matchAll(/@keyframes[^{]+\{((?:[^{}]|\{[^{}]*\})*)\}/g)) {
    const props = [...block[1].matchAll(/([a-z-]+)\s*:/g)].map((m) => m[1]).filter((p) => !['from', 'to'].includes(p));
    // Revisão 2: `filter` é permitido só nos dois keyframes do conceito de cor (boot da abertura e power-on das fotos), que o Chrome anima no compositor.
    const colorEvent = /^(boot|power-on)$/.test(block[0].match(/@keyframes\s+([\w-]+)/)?.[1] ?? '');
    check(props.every((p) => ['transform', 'opacity'].includes(p) || (colorEvent && p === 'filter')), `${page.route}: @keyframes anima ${props.join(', ')} (só transform e opacity; filter só em boot e power-on)`);
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
// Revisão 2: botões do brief na abertura (o secundário rola até os serviços da própria home).
const heroHtml = (home?.html ?? '').match(/<section class="hero">[\s\S]*?<\/section>/)?.[0] ?? '';
check(/<a[^>]*data-wa-cta[^>]*><svg[\s\S]*?<span>Solicitar orçamento no WhatsApp<\/span>/.test(heroHtml), 'Home: botão principal "Solicitar orçamento no WhatsApp" ausente na abertura');
check(/<a class="btn btn--ghost" href="#servicos">Conhecer os serviços<\/a>/.test(heroHtml), 'Home: botão secundário "Conhecer os serviços" ausente na abertura');
check(!/Luis/.test(heroHtml.match(/<p class="lead">[\s\S]*?<\/p>/)?.[0] ?? 'Luis'), 'Home: o nome de Luis não pode estar na descrição principal');
check((heroHtml.match(/<p class="lead">([\s\S]*?)<\/p>/)?.[1] ?? '').trim() === 'Conserto, manutenção e upgrades para computadores e notebooks. Montagem e assistência técnica para PCs gamer, na Zona Sul de São Paulo.', 'Home: descrição da abertura diferente do brief');
// Nenhum endereço completo antes do H1 e nenhuma linha de lugar antes dele.
const beforeH1 = (home?.html ?? '').split('<h1')[0].replace(/<head>[\s\S]*?<\/head>/, '');
check(!/Rua Maria Pais de Barros|CEP 04402/.test(beforeH1), 'Home: endereço completo antes do H1');
// Ordem das seções do brief. Avaliações reais ficam de fora (não há material verificável).
const homeOrder = [...(home?.html ?? '').matchAll(/<section class="(?:hero|band[^"]*)"[^>]*?(?:id="([^"]+)")?[^>]*>/g)].map((m) => m[1]);
const homeMain = (home?.html ?? '').match(/<main[\s\S]*<\/main>/)?.[0] ?? '';
const positions = ['<section class="hero">', 'id="servicos"', 'id="sintomas"', 'id="como-funciona"', 'id="trabalho"', 'id="quem-cuida"', 'id="faq-titulo"', 'class="wrap loc"', 'class="cta-band"'].map((marker) => homeMain.indexOf(marker));
check(positions.every((position, index) => position >= 0 && (index === 0 || position > positions[index - 1])), `Home: seções fora da ordem do brief (${positions.join(', ')})`);
check(!/avalia(ç|c)(ões|ão) de clientes|depoimento|estrelas|★/i.test(homeMain), 'Home: avaliação ou depoimento sem material verificável');
check(!/class="(ticker|xray)/.test(homeMain), 'Home: faixa em movimento ou raio-x fora da ordem do brief');
check(/class="xray"/.test(pages.find((page) => page.route === '/pc-gamer/')?.html ?? ''), '/pc-gamer/: raio-x do gabinete ausente');

const gamer = pages.find((page) => page.route === '/pc-gamer/');
// Revisão 2: capa em imagem sob demanda e <video> só no <noscript>; o JavaScript cria o player depois do clique.
const gamerHtml = gamer?.html ?? '';
const outsideNoscript = gamerHtml.replace(/<noscript>[\s\S]*?<\/noscript>/g, '');
check(!/<video\b/.test(outsideNoscript), '/pc-gamer/: <video> no HTML fora do <noscript> (deveria nascer só depois do clique)');
check(/<noscript><video[^>]*controls[^>]*preload="none"/.test(gamerHtml), '/pc-gamer/: <noscript> sem player nativo com controles');
check(!/autoplay/.test(gamerHtml.replace(/<script>[\s\S]*?<\/script>/g, '')), 'Vídeo com autoplay');
const facade = gamerHtml.match(/<button class="video__facade"[\s\S]*?<\/button>/)?.[0] ?? '';
check(/data-video-open/.test(facade) && /<img[^>]*loading="lazy"/.test(facade) && /<source type="image\/avif"/.test(facade) && /<source type="image\/webp"/.test(facade), 'Capa do vídeo sem imagem AVIF/WebP sob demanda');
check(!/video-pc-gamer-capa\.jpg/.test(outsideNoscript.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '')), 'Capa JPEG do vídeo referenciada fora do <noscript> e do JSON-LD');
check(/data-sources="[^"]*\.webm\|video\/webm[^"]*;[^"]*\.mp4\|video\/mp4"/.test(gamerHtml), 'Vídeo sem WebM (AV1) antes do MP4 de reserva');
check(existsSync(join(DIST, 'media/video-pc-gamer.webm')) && statSync(join(DIST, 'media/video-pc-gamer.webm')).size < statSync(join(DIST, 'media/video-pc-gamer.mp4')).size, 'WebM ausente ou maior que o MP4');

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

/* 7b. Paleta (revisão 2): grafite neutro e uma só cor de interface, o laranja da logo. Logo e fotos ficam de fora. */
const authored = [
  ...['src/styles/global.css', 'src/styles/fonts.css', ...readdirSync('src/styles/parts').map((name) => `src/styles/parts/${name}`)],
  'scripts/lib/components.ts',
  'scripts/lib/layout.ts',
  'scripts/lib/og.ts',
  'src/lib/schema.ts',
  ...readdirSync('src/pages', { recursive: true }).filter((name) => name.endsWith('.html')).map((name) => `src/pages/${name}`),
];
for (const file of authored) {
  const hits = findOffPalette(readFileSync(file, 'utf8'));
  check(hits.length === 0, `${file}: cor fora da família do laranja (${[...new Set(hits)].join(', ')})`);
}
for (const page of pages) {
  const hits = findOffPalette(htmlColorSpots(page.html));
  check(hits.length === 0, `${page.route}: cor fora da família do laranja no HTML final (${[...new Set(hits)].join(', ')})`);
}
check(findOffPalette('color:#2fa2ff;fill:#0060f0;stroke:rgb(13,26,44)').length === 3, 'Verificação de paleta não reconhece azul (autoteste)');
check(findOffPalette('color:#fa6a0a;border:1px solid #4b5159;fill:rgba(250,106,10,.2)').length === 0, 'Verificação de paleta reprova laranja ou grafite (autoteste)');

/* 7c. Espaçamento (revisão 2): margin, padding e gap só com a escala --s-1 a --s-8 (ou 0, auto, calc/clamp feitos dela). */
const spacingCss = ['src/styles/global.css', ...readdirSync('src/styles/parts').map((name) => `src/styles/parts/${name}`)];
for (const file of spacingCss) {
  const css = readFileSync(file, 'utf8');
  for (const m of css.matchAll(/^\s*((?:margin|padding|gap|row-gap|column-gap)(?:-(?:top|bottom|left|right|inline|block)(?:-(?:start|end))?)?)\s*:\s*([^;]+);/gm)) {
    const values = m[2].replace(/var\(--s-\d\)/g, '').replace(/\bcalc\(|\bclamp\(/g, '');
    // Sobra algum número com unidade que não veio da escala? O ajuste de 0,875rem do marcador do raio-x é a única isenção.
    const loose = (values.match(/-?\d*\.?\d+(?:rem|px|em|%)/g) ?? []).filter((token) => !/^-?0\.875rem$/.test(token) && !/^0(?:rem|px)$/.test(token));
    check(loose.length === 0, `${file}: ${m[1]}: ${m[2].trim()} usa valor fora da escala --s-*`);
  }
}

/* 8. Rastreamento, GEO, ícones e regra de Apple nos arquivos */
const crawlers = ['Googlebot', 'Bingbot', 'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'PerplexityBot', 'Google-Extended'];
for (const agent of crawlers) check(robotsTxt.includes(`User-agent: ${agent}`), `robots.txt sem regra explícita para ${agent}`);
check(!/^\s*Disallow:\s*\/\s*$/m.test(robotsTxt), 'robots.txt bloqueia o site inteiro (o noindex precisa ser lido)');
const llms = readFileSync(join(DIST, 'llms.txt'), 'utf8');
check(llms.includes('Rua Maria Pais de Barros, 329') && llms.includes('5511944700732'), 'llms.txt sem endereço ou WhatsApp');
check(llms.includes('## Serviços publicados') && categories.filter((c) => c.id !== 'atendimento').every((c) => llms.includes(c.title)), 'llms.txt sem o resumo dos serviços publicados');
for (const item of catalogItems.filter((entry) => entry.status !== 'publicado' && entry.status !== 'publicado-adaptado')) {
  check(!llms.includes(item.source), `llms.txt cita item ${item.status}: ${item.source}`);
}
for (const [pattern, name] of forbidden) check(!decode(llms).match(pattern), `llms.txt: termo proibido (${name})`);
/* 8b. Revisão 2: arquivos de rastreamento e GEO ampliados */
for (const agent of ['Applebot', 'Applebot-Extended', 'Claude-SearchBot', 'Perplexity-User', 'Googlebot-Image']) check(robotsTxt.includes(`User-agent: ${agent}`), `robots.txt sem regra explícita para ${agent}`);
check(!/^\s*Disallow:\s*\S/m.test(robotsTxt), 'robots.txt tem Disallow (o noindex precisa ser lido)');
check(!production ? /Ambiente de teste/.test(robotsTxt) : !/Ambiente de teste/.test(robotsTxt), 'comentário do robots.txt não corresponde ao modo do build');
const llmsFull = readFileSync(join(DIST, 'llms-full.txt'), 'utf8');
check(llmsFull.includes('Rua Maria Pais de Barros, 329') && llmsFull.includes('5511944700732'), 'llms-full.txt sem endereço ou WhatsApp');
for (const item of catalogItems.filter((entry) => entry.status === 'publicado' || entry.status === 'publicado-adaptado')) check(llmsFull.includes(item.label ?? item.source), `llms-full.txt sem o item publicado: ${item.label ?? item.source}`);
for (const item of catalogItems.filter((entry) => entry.status !== 'publicado' && entry.status !== 'publicado-adaptado')) check(!llmsFull.includes(item.source), `llms-full.txt cita item ${item.status}: ${item.source}`);
for (const [pattern, name] of forbidden) check(!decode(llmsFull).match(pattern), `llms-full.txt: termo proibido (${name})`);
check(!/citad[oa]s? (por|em)|garant\w+ (de )?cita/i.test(`${llms} ${llmsFull}`), 'llms.txt promete citação');
for (const file of [llms, llmsFull]) {
  const links = [...file.matchAll(/\]\(([^)\s]+)\)/g)].map((m) => m[1]);
  for (const link of links) {
    if (/^https?:\/\/(wa\.me|www\.google)/.test(link)) continue;
    const path = link.replace(/^https?:\/\/[^/]+/, '').split('#')[0];
    check(existsSync(join(DIST, path.endsWith('/') ? `${path}index.html` : path)), `llms: link inexistente ${link}`);
    if (production) check(link.startsWith('https://www.dominio-de-teste.example') || link.startsWith('https://wa.me'), `llms: link relativo em produção: ${link}`);
    else check(link.startsWith('/') || link.startsWith('https://wa.me'), `llms: link absoluto em preview: ${link}`);
  }
}
const security = readFileSync(join(DIST, '.well-known/security.txt'), 'utf8');
check(/^Contact: mailto:contato@lcpcgaming\.com$/m.test(security) && /^Expires: \d{4}-\d\d-\d\dT[\d:]+Z$/m.test(security) && new Date(security.match(/^Expires: (.*)$/m)?.[1] ?? 0) > new Date(), 'security.txt inválido (RFC 9116)');
if (production) {
  check(sitemap.includes('xmlns:video=') && /<video:video>[\s\S]*<video:content_loc>[^<]*video-pc-gamer\.mp4/.test(sitemap) && (sitemap.match(/<video:video>/g) ?? []).length === 1, 'sitemap sem a entrada de vídeo em /pc-gamer/');
}
// Nada de materiais/ no dist, e nada de opentype.js no projeto.
const distFiles = readdirSync(DIST, { recursive: true }).map(String);
check(!distFiles.some((file) => /materiais|referencias|keyword|brief|\.xlsx$|\.md$|nao-publicar/i.test(file)), 'dist contém arquivo de materiais/ ou referência interna');
check(!distFiles.some((file) => /\.(map|py|woff)$/.test(file)) && !existsSync(join(DIST, 'fonts')), 'dist contém arquivo de desenvolvimento');
check(!JSON.parse(readFileSync('package.json', 'utf8')).devDependencies?.['opentype.js'], 'opentype.js continua no package.json');
// Chave pública do Worker: _links.json existe no dist (interno) e cada rota comercial tem preload da fonte.
const linksJson = JSON.parse(readFileSync(join(DIST, '_links.json'), 'utf8'));
for (const route of expectedRoutes) check(/rel=preload; as=font/.test(linksJson[route] ?? ''), `${route}: sem cabeçalho Link de preload da fonte`);
// Fontes: só os arquivos reduzidos, com fonte de reserva de métricas ajustadas.
const fontFiles = distFiles.filter((file) => file.endsWith('.woff2'));
check(fontFiles.length === 3 && fontFiles.reduce((total, file) => total + statSync(join(DIST, file)).size, 0) < 40 * 1024, `fontes: ${fontFiles.length} arquivos, esperado 3 e menos de 40 KB no total`);
for (const page of commercial) {
  check(/font-family:"?Saira Condensed Reserva/.test(page.html) || /Saira Condensed Reserva/.test(page.html), `${page.route}: sem fonte de reserva com métricas ajustadas`);
  check((page.html.match(/rel="preload"[^>]*as="font"/g) ?? []).length === 1, `${page.route}: deve pré-carregar só uma fonte (a do título)`);
  check(/<script type="speculationrules">/.test(page.html), `${page.route}: sem Speculation Rules`);
  check(/@view-transition\{navigation:auto\}/.test(page.html), `${page.route}: sem @view-transition`);
  const data = jsonLd(page.html);
  const pageNode = data.find((entry) => ['WebPage', 'AboutPage', 'ContactPage', 'CollectionPage'].includes(entry['@type']));
  check(pageNode?.speakable?.['@type'] === 'SpeakableSpecification', `${page.route}: sem speakable`);
  const place = data.find((entry) => entry['@type'] === 'LocalBusiness')?.containedInPlace;
  check(place?.name === 'Zona Sul de São Paulo' && place.containedInPlace?.name === 'São Paulo', `${page.route}: sem containedInPlace`);
  const howto = data.find((entry) => entry['@type'] === 'HowTo');
  if (page.route === '/') {
    const text = visibleText(page.html);
    check(Boolean(howto) && howto.step.length >= 3 && howto.step.every((step) => text.includes(step.name) && text.includes(step.text)), '/: HowTo diferente da seção "Como funciona" visível');
  } else check(!howto, `${page.route}: HowTo sem seção visível correspondente`);
}
// Cada página comercial deixa a mensagem e o WhatsApp à vista logo na abertura (H1 e botão antes de qualquer outra seção).
for (const route of ['/', '/conserto-de-notebook/', '/conserto-de-computador/', '/pc-gamer/']) {
  const first = pages.find((page) => page.route === route)?.html.match(/<main[^>]*>([\s\S]*?)<\/section>/)?.[1] ?? '';
  check(/<h1/.test(first) && /data-wa-cta/.test(first) && /Solicitar orçamento no WhatsApp/.test(first), `${route}: abertura sem H1 e botão "Solicitar orçamento no WhatsApp"`);
}
const manifest = JSON.parse(readFileSync(join(DIST, 'site.webmanifest'), 'utf8'));
check(Boolean(manifest.name) && manifest.short_name === 'LCPC Gaming' && manifest.lang === 'pt-BR' && manifest.start_url === '/', 'site.webmanifest incompleto');
for (const icon of manifest.icons ?? []) check(existsSync(join(DIST, icon.src)), `ícone do manifesto ausente: ${icon.src}`);
check((manifest.icons ?? []).some((icon) => icon.sizes === '512x512') && (manifest.icons ?? []).some((icon) => icon.sizes === '192x192'), 'manifesto sem ícones 192 e 512');
for (const page of commercial) check(page.html.includes('rel="manifest"') && page.html.includes('icon-192.png'), `${page.route}: sem link para o manifesto e o ícone 192`);
check(sitemap.includes('xmlns:image='), 'sitemap sem o namespace de imagens');
if (production) {
  for (const block of sitemap.split('<url>').slice(1)) {
    check((block.match(/<image:loc>/g) ?? []).length >= 1, `sitemap sem imagens em ${block.match(/<loc>([^<]*)<\/loc>/)?.[1]}`);
  }
}
const imageFiles = existsSync(join(DIST, 'assets/img')) ? readdirSync(join(DIST, 'assets/img')) : [];
for (const file of imageFiles) {
  check(!/macbook|cidade-ademar|zona-sul-sp/.test(file), `imagem de equipamento Apple no build: ${file}`);
  if (!file.startsWith('logo-')) check(/^[a-z0-9]+(-[a-z0-9]+){3,}-\d+\.[0-9a-f]{8}\.(avif|webp|jpg)$/.test(file), `nome de imagem pouco descritivo: ${file}`);
}
const prepareMedia = readFileSync('scripts/prepare-media.mjs', 'utf8');
check(!/crop\([^)]*nao-publicar-macbook/.test(prepareMedia), 'prepare-media.mjs recorta foto de nao-publicar-macbook');
for (const file of readdirSync('src/assets/media')) check(!/macbook|cidade-ademar|zona-sul-sp/.test(file), `foto com MacBook em src/assets/media: ${file}`);

for (const [route, count] of wordCounts) console.log(`  ${route.padEnd(26)} ${count} palavras de texto, CSS embutido ${Math.round((cssSizes.get(route) ?? 0) / 1024)} KB`);
for (const warning of warnings) console.warn(`aviso: ${warning}`);
if (failures.length) {
  console.error(`\n${failures.length} falha(s) em ${checks} verificações:`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(`OK: ${checks} verificações em ${pages.length} páginas e ${whatsappLinks} links de WhatsApp (modo ${production ? 'produção' : 'preview'}).`);

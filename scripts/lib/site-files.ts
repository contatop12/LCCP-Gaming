/** robots.txt, sitemap.xml, llms.txt, llms-full.txt, security.txt e site.webmanifest do site. */
import { business, fullAddress, neighborhoodNote } from '../../src/data/business.ts';
import { categories, publishedItems } from '../../src/data/catalog.ts';
import { faq } from '../../src/data/faq.ts';
import { video } from '../../src/data/media.ts';
import { mainNav, siteConfig } from '../../src/data/site.ts';
import { steps } from '../../src/data/steps.ts';

/**
 * Rastreadores citados pelo nome, para a política ficar explícita e poder mudar por rastreador.
 * Todos liberados: a barreira em preview é o noindex de cada página, que só pode ser lido se o rastreamento estiver aberto.
 */
const SEARCH_CRAWLERS = ['Googlebot', 'Googlebot-Image', 'Bingbot', 'DuckDuckBot', 'Applebot'];
/** Busca e resposta de assistentes de IA: leem o site para citar e linkar. */
const AI_SEARCH_CRAWLERS = ['OAI-SearchBot', 'ChatGPT-User', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User'];
/** Coleta para treinamento de modelos e tokens de controle de uso. Liberados por decisão do projeto; ver README. */
const AI_TRAINING_CRAWLERS = ['GPTBot', 'ClaudeBot', 'Google-Extended', 'Applebot-Extended', 'Amazonbot', 'Meta-ExternalAgent', 'CCBot'];

/** URL de uma página no llms.txt: absoluta com domínio de produção, a partir da raiz sem ele. */
const link = (path: string) => `${siteConfig.siteUrl}${path}`;

// Em preview o bloqueio fica no meta robots noindex de cada página e no X-Robots-Tag do Worker. O robots.txt não pode
// bloquear o rastreamento, senão os buscadores não chegam a ler o noindex.
export function robotsTxt(): string {
  const group = (title: string, agents: string[]) => [`# ${title}`, ...agents.flatMap((agent) => [`User-agent: ${agent}`, 'Allow: /', ''])];
  const lines = [
    '# robots.txt da LCPC Gaming.',
    siteConfig.indexable
      ? '# A indexação de cada página é controlada pelo meta robots da própria página.'
      : '# Ambiente de teste: as páginas saem com noindex e este arquivo não bloqueia o rastreamento, para que o noindex possa ser lido.',
    '# Google-Extended e Applebot-Extended são tokens de controle de uso, não rastreadores separados.',
    '',
    ...group('Buscadores', SEARCH_CRAWLERS),
    ...group('Busca e resposta em assistentes de IA', AI_SEARCH_CRAWLERS),
    ...group('Treinamento de modelos e controle de uso', AI_TRAINING_CRAWLERS),
    '# Demais rastreadores',
    'User-agent: *',
    'Allow: /',
  ];
  if (siteConfig.indexable) lines.push('', `Sitemap: ${siteConfig.siteUrl}/sitemap.xml`);
  return `${lines.join('\n')}\n`;
}

const xml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;');

/** `images`: caminho da página para os caminhos públicos das fotos reais dela. `videoPaths`: páginas com o vídeo. */
export function sitemapXml(images: Map<string, string[]>, videoPaths: Set<string>): string {
  const lastmod = new Date().toISOString().slice(0, 10);
  // Sem domínio de produção confirmado, o sitemap sai vazio para não publicar URLs de preview.
  const paths = siteConfig.indexable ? ['/', ...mainNav.map((item) => item.href)] : [];
  const urls = paths
    .map((path) => {
      const pics = (images.get(path) ?? []).map((src) => `<image:image><image:loc>${xml(siteConfig.siteUrl + src)}</image:loc></image:image>`).join('');
      const clip = videoPaths.has(path)
        ? `<video:video><video:thumbnail_loc>${xml(siteConfig.siteUrl + video.poster)}</video:thumbnail_loc><video:title>${xml(video.title)}</video:title>` +
          `<video:description>${xml(video.description)}</video:description><video:content_loc>${xml(siteConfig.siteUrl + video.src)}</video:content_loc>` +
          `<video:duration>26</video:duration><video:publication_date>${video.uploadDate}</video:publication_date></video:video>`
        : '';
      return `  <url><loc>${siteConfig.siteUrl}${path}</loc><lastmod>${lastmod}</lastmod>${pics}${clip}</url>`;
    })
    .join('\n');
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n' +
    `${urls}\n</urlset>\n`
  );
}

export interface PageSummary {
  path: string;
  title: string;
  h1: string;
  description: string;
  /** Bloco de resposta direta da página, quando existe. */
  answer?: string;
  /** Conjunto de FAQ da página (src/data/faq.ts), quando existe. */
  faq?: keyof typeof faq;
}

const FACTS = `A ${business.name} é uma assistência técnica de computadores e notebooks na ${neighborhoodNote}. ${business.owner.name} é o proprietário e o responsável pelos serviços. O foco gamer é em desktops: montagem, upgrade e manutenção de PC gamer.`;

const HOW_TO_ORDER = `O contato principal é o WhatsApp ${business.phone.display}. Para notebooks, informe marca, modelo e sintoma. Para desktops e PCs gamer, informe a configuração e o que acontece. Valores e prazos dependem do defeito, do modelo e das peças e não são publicados no site. Atendimento em domicílio ou no escritório e retirada e entrega só mediante consulta de condições e disponibilidade.`;

/** Resumo factual para sistemas de IA, só com o catálogo publicado. Sinalização simples, sem expectativa de citação. */
export function llmsTxt(pages: PageSummary[]): string {
  const services = categories
    .filter((category) => category.id !== 'atendimento')
    .flatMap((category) => [`- [${category.title}](${link(`/servicos/#${category.id}`)}): ${category.summary}`]);
  const lines = [
    `# ${business.name}`,
    '',
    `> Assistência técnica de computadores e notebooks na Vila Marari, Zona Sul de São Paulo, com montagem, upgrade e manutenção de PC gamer desktop. Endereço: ${fullAddress}.`,
    '',
    FACTS,
    '',
    HOW_TO_ORDER,
    '',
    '## Páginas',
    '',
    ...pages.filter((page) => page.path !== '/404/').map((page) => `- [${page.h1}](${link(page.path)}): ${page.description}`),
    '',
    '## Serviços publicados',
    '',
    ...services,
    '',
    '## Contato',
    '',
    `- Endereço: ${fullAddress}`,
    `- WhatsApp: ${business.phone.display} (https://wa.me/${business.phone.whatsappNumber})`,
    `- E-mail: ${business.email}`,
    '',
    '## Opcional',
    '',
    `- [Versão completa deste resumo](${link('/llms-full.txt')}): respostas das páginas, perguntas frequentes e todos os itens do catálogo publicado.`,
  ];
  return `${lines.join('\n').trimEnd()}\n`;
}

/** Versão completa: resposta direta de cada página, perguntas frequentes, passos do atendimento e catálogo publicado. */
export function llmsFullTxt(pages: PageSummary[]): string {
  const lines = [
    `# ${business.name}: versão completa`,
    '',
    `> Assistência técnica de computadores e notebooks na Vila Marari, Zona Sul de São Paulo. Este arquivo reúne o que está publicado no site; não há outras informações comerciais confirmadas.`,
    '',
    '## Empresa',
    '',
    FACTS,
    '',
    `- Endereço: ${fullAddress}`,
    `- WhatsApp: ${business.phone.display} (https://wa.me/${business.phone.whatsappNumber})`,
    `- E-mail: ${business.email}`,
    '',
    '## Como pedir um orçamento',
    '',
    HOW_TO_ORDER,
    '',
    ...steps.atendimento.map((step, index) => `${index + 1}. ${step.name}. ${step.text}`),
    '',
    'Preços, prazos, garantias, horários de atendimento e avaliações de clientes não são publicados no site.',
    '',
    '## Páginas e respostas',
    '',
  ];
  for (const page of pages.filter((entry) => entry.path !== '/404/')) {
    lines.push(`### ${page.h1}`, '', `Endereço: ${link(page.path)}`, '', page.description, '');
    if (page.answer) lines.push(page.answer, '');
    if (page.faq) {
      for (const item of faq[page.faq]) lines.push(`**${item.question}**`, '', item.answer, '');
    }
  }
  lines.push('## Catálogo de serviços publicado', '');
  for (const category of categories.filter((entry) => entry.id !== 'atendimento')) {
    lines.push(`### ${category.title}`, '', `${category.summary} Detalhes: ${link(`/servicos/#${category.id}`)}`, '', ...publishedItems(category.id).map((item) => `- ${item}`), '');
  }
  lines.push('### Atendimento', '', 'Só mediante consulta de condições e disponibilidade:', '', ...publishedItems('atendimento').map((item) => `- ${item}`), '');
  return `${lines.join('\n').trimEnd()}\n`;
}

/** RFC 9116. O canal é o e-mail oficial da empresa. A data de validade renova a cada build. */
export function securityTxt(): string {
  const expires = new Date(Date.now() + 364 * 24 * 3600 * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z');
  const lines = [`Contact: mailto:${business.email}`, `Expires: ${expires}`, 'Preferred-Languages: pt-BR'];
  if (siteConfig.siteUrl) lines.push(`Canonical: ${siteConfig.siteUrl}/.well-known/security.txt`);
  return `${lines.join('\n')}\n`;
}

export function webManifest(): string {
  return `${JSON.stringify(
    {
      name: `${business.name}: assistência técnica de computadores e notebooks`,
      short_name: business.name,
      description: 'Assistência técnica de computadores e notebooks na Vila Marari, em São Paulo, com montagem, upgrade e manutenção de PC gamer desktop.',
      lang: 'pt-BR',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      background_color: '#1d2024',
      theme_color: '#1d2024',
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      ],
    },
    null,
    2,
  )}\n`;
}

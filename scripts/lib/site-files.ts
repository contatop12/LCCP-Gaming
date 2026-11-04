/** robots.txt, sitemap.xml, llms.txt e site.webmanifest do site. */
import { business, fullAddress, neighborhoodNote } from '../../src/data/business.ts';
import { categories, publishedItems } from '../../src/data/catalog.ts';
import { mainNav, siteConfig } from '../../src/data/site.ts';

/** Rastreadores de busca e de IA citados pelo nome. Todos liberados: a barreira em preview é o noindex. */
const CRAWLERS = [
  'Googlebot',
  'Googlebot-Image',
  'Bingbot',
  'DuckDuckBot',
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Google-Extended',
];

// Em preview o bloqueio fica no meta robots noindex de cada página e no X-Robots-Tag do Worker. O robots.txt não pode
// bloquear o rastreamento, senão os buscadores não chegam a ler o noindex.
export function robotsTxt(): string {
  const lines = [
    '# Rastreadores de busca e de IA podem ler o site inteiro.',
    siteConfig.indexable ? '# A indexação fica a cargo das páginas (meta robots) e do domínio de produção.' : '# Preview: as páginas saem com noindex. O rastreamento fica liberado para o noindex ser lido.',
    '',
  ];
  for (const agent of CRAWLERS) lines.push(`User-agent: ${agent}`, 'Allow: /', '');
  lines.push('User-agent: *', 'Allow: /');
  if (siteConfig.indexable) lines.push('', `Sitemap: ${siteConfig.siteUrl}/sitemap.xml`);
  return `${lines.join('\n')}\n`;
}

const xml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;');

/** `images`: caminho da página para os caminhos públicos das fotos reais dela. */
export function sitemapXml(images: Map<string, string[]>): string {
  const lastmod = new Date().toISOString().slice(0, 10);
  // Sem domínio de produção confirmado, o sitemap sai vazio para não publicar URLs de preview.
  const paths = siteConfig.indexable ? ['/', ...mainNav.map((item) => item.href)] : [];
  const urls = paths
    .map((path) => {
      const pics = (images.get(path) ?? []).map((src) => `<image:image><image:loc>${xml(siteConfig.siteUrl + src)}</image:loc></image:image>`).join('');
      return `  <url><loc>${siteConfig.siteUrl}${path}</loc><lastmod>${lastmod}</lastmod>${pics}</url>`;
    })
    .join('\n');
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n' +
    `${urls}\n</urlset>\n`
  );
}

/** Resumo factual para sistemas de IA, só com o catálogo publicado. Sinalização simples, sem expectativa de citação. */
export function llmsTxt(): string {
  const base = siteConfig.siteUrl;
  const services = categories
    .filter((category) => category.id !== 'atendimento')
    .flatMap((category) => {
      const items = publishedItems(category.id);
      return [`### ${category.title}`, '', `${category.summary} Itens: ${items.join('; ')}.`, `Detalhes: ${base}/servicos/#${category.id}`, ''];
    });
  const lines = [
    `# ${business.name}`,
    '',
    `> Assistência técnica de computadores e notebooks na Vila Marari, em São Paulo, com montagem, upgrade e manutenção de PC gamer desktop. Endereço: ${fullAddress}.`,
    '',
    '## Quem é',
    '',
    `A ${business.name} é uma assistência técnica de computadores e notebooks. ${business.owner.name} é o proprietário e o responsável pelos serviços. A assistência fica na ${neighborhoodNote}. O foco gamer é em desktops: montagem, upgrade e manutenção.`,
    '',
    '## Como pedir um orçamento',
    '',
    `O contato principal é o WhatsApp ${business.phone.display}. Para notebooks, informe marca, modelo e sintoma. Para desktops e PCs gamer, informe a configuração e o que acontece. Valores e prazos dependem do defeito, do modelo e das peças e não são publicados no site. Atendimento em domicílio ou no escritório e retirada e entrega só mediante consulta de condições e disponibilidade.`,
    '',
    '## Contato',
    '',
    `- Endereço: ${fullAddress}`,
    `- WhatsApp: ${business.phone.display} (https://wa.me/${business.phone.whatsappNumber})`,
    `- E-mail: ${business.email}`,
    '',
    '## Páginas',
    '',
    ...mainNav.map((item) => `- [${item.label}](${base}${item.href})`),
    '',
    '## Serviços publicados',
    '',
    ...services,
  ];
  return `${lines.join('\n').trimEnd()}\n`;
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

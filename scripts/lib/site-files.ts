/** robots.txt, sitemap.xml e llms.txt do site. */
import { business, fullAddress } from '../../src/data/business.ts';
import { mainNav, siteConfig } from '../../src/data/site.ts';

// Em preview o bloqueio fica no meta robots noindex de cada página. O robots.txt não pode bloquear o rastreamento,
// senão os buscadores não chegam a ler o noindex.
export function robotsTxt(): string {
  const lines = ['User-agent: *', 'Allow: /'];
  if (siteConfig.indexable) lines.push('', `Sitemap: ${siteConfig.siteUrl}/sitemap.xml`);
  return `${lines.join('\n')}\n`;
}

export function sitemapXml(): string {
  const lastmod = new Date().toISOString().slice(0, 10);
  // Sem domínio de produção confirmado, o sitemap sai vazio para não publicar URLs de preview.
  const paths = siteConfig.indexable ? ['/', ...mainNav.map((item) => item.href)] : [];
  const urls = paths.map((path) => `  <url><loc>${siteConfig.siteUrl}${path}</loc><lastmod>${lastmod}</lastmod></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

/** Resumo factual para sistemas de IA. Sinalização simples, sem expectativa de citação. */
export function llmsTxt(): string {
  const base = siteConfig.siteUrl;
  const lines = [
    `# ${business.name}`,
    '',
    '> Assistência técnica de computadores e notebooks na Vila Marari, em São Paulo, com montagem, upgrade e manutenção de PC gamer desktop.',
    '',
    `- Responsável: ${business.owner.name}, ${business.owner.role.toLowerCase()}`,
    `- Endereço: ${fullAddress}`,
    `- WhatsApp: ${business.phone.display}`,
    `- E-mail: ${business.email}`,
    '',
    '## Páginas',
    '',
    ...mainNav.map((item) => `- [${item.label}](${base}${item.href})`),
    '',
  ];
  return lines.join('\n');
}

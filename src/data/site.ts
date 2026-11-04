/** Configuração que muda entre preview e produção. Veja .env.example e o README. Lida no build, de process.env. */
const siteUrl = (process.env.PUBLIC_SITE_URL ?? '').replace(/\/$/, '');

export const siteConfig = {
  /** Vazio enquanto o domínio não for confirmado. */
  siteUrl,
  /** Só indexa com domínio definido e PUBLIC_INDEXABLE=true. Previews ficam sempre em noindex. */
  indexable: Boolean(siteUrl) && process.env.PUBLIC_INDEXABLE === 'true',
  gtmId: process.env.PUBLIC_GTM_ID ?? '',
  ga4Id: process.env.PUBLIC_GA4_ID ?? '',
  googleBusinessUrl: process.env.PUBLIC_GOOGLE_BUSINESS_URL ?? '',
};

export interface NavItem {
  href: string;
  label: string;
}

/** PC Gamer abre o menu, como pede o brief. */
export const mainNav: NavItem[] = [
  { href: '/pc-gamer/', label: 'PC Gamer' },
  { href: '/conserto-de-notebook/', label: 'Conserto de notebook' },
  { href: '/conserto-de-computador/', label: 'Conserto de computador' },
  { href: '/servicos/', label: 'Serviços' },
  { href: '/sobre/', label: 'Sobre' },
  { href: '/contato/', label: 'Contato' },
];

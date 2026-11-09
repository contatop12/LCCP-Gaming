/** Configuração que muda entre preview e produção. Veja .env.example e o README. Lida no build, de process.env. */
const siteUrl = (process.env.PUBLIC_SITE_URL ?? '').replace(/\/$/, '');

export const siteConfig = {
  /** Vazio enquanto o domínio não for confirmado. */
  siteUrl,
  /** Só indexa com domínio definido e PUBLIC_INDEXABLE=true. Previews ficam sempre em noindex. */
  indexable: Boolean(siteUrl) && process.env.PUBLIC_INDEXABLE === 'true',
  /**
   * Contêiner do Google Tag Manager da LCPC, instalado a pedido do cliente. Vale em todo build, inclusive no Workers Builds.
   * Para desligar num build local, defina PUBLIC_GTM_ID vazio (o .env.example já faz isso).
   */
  gtmId: process.env.PUBLIC_GTM_ID ?? 'GTM-527W9345',
  ga4Id: process.env.PUBLIC_GA4_ID ?? '',
  googleBusinessUrl: process.env.PUBLIC_GOOGLE_BUSINESS_URL ?? '',
};

export interface NavItem {
  href: string;
  label: string;
}

/** Notebook abre o menu (decisão do cliente, que substitui o brief original, em que PC Gamer vinha primeiro). */
export const mainNav: NavItem[] = [
  { href: '/conserto-de-notebook/', label: 'Conserto de notebook' },
  { href: '/conserto-de-computador/', label: 'Conserto de computador' },
  { href: '/pc-gamer/', label: 'PC Gamer' },
  { href: '/servicos/', label: 'Serviços' },
  { href: '/sobre/', label: 'Sobre' },
  { href: '/contato/', label: 'Contato' },
];

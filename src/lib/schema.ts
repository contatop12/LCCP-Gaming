import { business } from '../data/business.ts';
import { categories, publishedItems, type CatalogCategory } from '../data/catalog.ts';
import type { FaqItem } from '../data/faq.ts';
import { siteConfig } from '../data/site.ts';

const { address, phone, email, owner } = business;

/** Somente fatos confirmados e visíveis no site. Sem horário, nota, preço ou área de atendimento até validação. */
export function localBusinessSchema(origin: URL) {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': new URL('/#empresa', origin).href,
    name: business.name,
    slogan: business.slogan,
    description:
      'Assistência técnica de computadores e notebooks na Vila Marari, em São Paulo, com montagem, upgrade e manutenção de PC gamer desktop.',
    image: new URL('/og-lcpc-gaming.jpg', origin).href,
    telephone: phone.e164,
    email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: address.street,
      addressLocality: address.city,
      addressRegion: address.state,
      postalCode: address.postalCode,
      addressCountry: address.country,
    },
    ...(siteConfig.siteUrl ? { url: `${siteConfig.siteUrl}/` } : {}),
    ...(siteConfig.googleBusinessUrl ? { sameAs: [siteConfig.googleBusinessUrl] } : {}),
  };
}

export function faqSchema(items: FaqItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}

export function breadcrumbSchema(items: { label: string; href: string }[], origin: URL) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      item: new URL(item.href, origin).href,
    })),
  };
}

/** Catálogo público de /servicos/, gerado só com itens publicados. */
export function offerCatalogSchema(origin: URL) {
  const listed = categories.filter((category: CatalogCategory) => category.id !== 'atendimento');
  return {
    '@context': 'https://schema.org',
    '@type': 'OfferCatalog',
    name: `Serviços da ${business.name}`,
    url: new URL('/servicos/', origin).href,
    provider: { '@id': new URL('/#empresa', origin).href },
    itemListElement: listed.map((category) => ({
      '@type': 'OfferCatalog',
      name: category.title,
      itemListElement: publishedItems(category.id).map((name) => ({
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name },
      })),
    })),
  };
}

export function personSchema(origin: URL) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: owner.name,
    jobTitle: owner.role,
    worksFor: { '@id': new URL('/#empresa', origin).href },
  };
}

import { business, mapsUrl } from '../data/business.ts';
import { categories, publishedItems, type CatalogCategory } from '../data/catalog.ts';
import type { FaqItem } from '../data/faq.ts';
import { siteConfig } from '../data/site.ts';
import type { Step } from '../data/steps.ts';

const { address, phone, email, owner } = business;

export interface SchemaImage {
  /** Caminho público da imagem. */
  path: string;
  width: number;
  height: number;
  caption: string;
}

const CONTEXT = 'https://schema.org';
const abs = (origin: URL, path: string) => new URL(path, origin).href;
const companyId = (origin: URL) => abs(origin, '/#empresa');
const siteId = (origin: URL) => abs(origin, '/#site');

/** Somente fatos confirmados e visíveis no site. Sem horário, nota, preço, coordenadas ou área de atendimento até validação. */
export function localBusinessSchema(origin: URL) {
  return {
    '@context': CONTEXT,
    '@type': 'LocalBusiness',
    '@id': companyId(origin),
    name: business.name,
    slogan: business.slogan,
    description:
      'Assistência técnica de computadores e notebooks na Vila Marari, em São Paulo, com montagem, upgrade e manutenção de PC gamer desktop.',
    image: [abs(origin, '/og-lcpc-gaming.jpg')],
    logo: abs(origin, '/icon-512.png'),
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
    hasMap: mapsUrl,
    // Região em que a empresa fica (fato geográfico, não área de atendimento): Zona Sul, dentro da cidade de São Paulo.
    containedInPlace: {
      '@type': 'Place',
      name: 'Zona Sul de São Paulo',
      containedInPlace: { '@type': 'City', name: 'São Paulo' },
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      telephone: phone.e164,
      email,
      availableLanguage: 'pt-BR',
      url: `https://wa.me/${phone.whatsappNumber}`,
    },
    ...(siteConfig.siteUrl ? { url: `${siteConfig.siteUrl}/` } : {}),
    ...(siteConfig.googleBusinessUrl ? { sameAs: [siteConfig.googleBusinessUrl] } : {}),
  };
}

export function webSiteSchema(origin: URL) {
  return {
    '@context': CONTEXT,
    '@type': 'WebSite',
    '@id': siteId(origin),
    url: abs(origin, '/'),
    name: business.name,
    inLanguage: 'pt-BR',
    publisher: { '@id': companyId(origin) },
  };
}

const imageObject = (origin: URL, image: SchemaImage, id?: string) => ({
  '@type': 'ImageObject',
  ...(id ? { '@id': id } : {}),
  url: abs(origin, image.path),
  contentUrl: abs(origin, image.path),
  width: image.width,
  height: image.height,
  caption: image.caption,
});

export function webPageSchema(
  origin: URL,
  page: { path: string; type: string; name: string; description: string; image?: SchemaImage; breadcrumb: boolean; speakable?: string[] },
) {
  const url = abs(origin, page.path);
  return {
    '@context': CONTEXT,
    '@type': page.type,
    '@id': `${url}#pagina`,
    url,
    name: page.name.replaceAll('&amp;', '&'),
    description: page.description.replaceAll('&amp;', '&'),
    inLanguage: 'pt-BR',
    isPartOf: { '@id': siteId(origin) },
    about: { '@id': companyId(origin) },
    ...(page.image ? { primaryImageOfPage: imageObject(origin, page.image, `${url}#imagem-principal`) } : {}),
    ...(page.breadcrumb ? { breadcrumb: { '@id': `${url}#migalhas` } } : {}),
    // Trechos feitos para leitura em voz alta e resposta direta: o título e o bloco de resposta da página.
    ...(page.speakable?.length ? { speakable: { '@type': 'SpeakableSpecification', cssSelector: page.speakable } } : {}),
  };
}

/** Passos do atendimento, os mesmos da seção visível. O Google não dá mais resultado rico para HowTo; o valor é de leitura por IA. */
export function howToSchema(origin: URL, howto: { path: string; name: string; steps: Step[] }) {
  const url = abs(origin, howto.path);
  return {
    '@context': CONTEXT,
    '@type': 'HowTo',
    '@id': `${url}#como-funciona`,
    name: howto.name,
    inLanguage: 'pt-BR',
    step: howto.steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.name,
      text: step.text,
    })),
  };
}

export function serviceSchema(origin: URL, service: { path: string; name: string; type: string; description: string }) {
  const url = abs(origin, service.path);
  return {
    '@context': CONTEXT,
    '@type': 'Service',
    '@id': `${url}#servico`,
    name: service.name,
    serviceType: service.type,
    description: service.description,
    url,
    provider: { '@id': companyId(origin) },
    areaServed: { '@type': 'City', name: 'São Paulo' },
  };
}

export function videoSchema(origin: URL, video: { src: string; poster: string; title: string; description: string; uploadDate: string; duration: string }) {
  return {
    '@context': CONTEXT,
    '@type': 'VideoObject',
    name: video.title,
    description: video.description,
    thumbnailUrl: abs(origin, video.poster),
    contentUrl: abs(origin, video.src),
    uploadDate: video.uploadDate,
    duration: video.duration,
    inLanguage: 'pt-BR',
  };
}

/** Fotos reais da página como ImageObject. */
export function imageObjectsSchema(origin: URL, images: SchemaImage[]) {
  return { '@context': CONTEXT, '@graph': images.map((image) => imageObject(origin, image)) };
}

export function faqSchema(items: FaqItem[]) {
  return {
    '@context': CONTEXT,
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}

export function breadcrumbSchema(items: { label: string; href: string }[], origin: URL, path: string) {
  return {
    '@context': CONTEXT,
    '@type': 'BreadcrumbList',
    '@id': `${abs(origin, path)}#migalhas`,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      item: abs(origin, item.href),
    })),
  };
}

/** Catálogo público de /servicos/, gerado só com itens publicados. */
export function offerCatalogSchema(origin: URL) {
  const listed = categories.filter((category: CatalogCategory) => category.id !== 'atendimento');
  return {
    '@context': CONTEXT,
    '@type': 'OfferCatalog',
    name: `Serviços da ${business.name}`,
    url: abs(origin, '/servicos/'),
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

export function personSchema(origin: URL, image?: SchemaImage) {
  return {
    '@context': CONTEXT,
    '@type': 'Person',
    '@id': abs(origin, '/sobre/#luis-carlos'),
    name: owner.name,
    jobTitle: owner.role,
    worksFor: { '@id': companyId(origin) },
    url: abs(origin, '/sobre/'),
    ...(image ? { image: imageObject(origin, image) } : {}),
  };
}

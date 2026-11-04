/** Nome do arquivo em src/assets/media/. Dimensões e formatos saem do arquivo, no build (scripts/lib/images.ts). */
export interface SiteImage {
  file: string;
  alt: string;
  /** Legenda factual. Não afirma qual reparo foi feito nem de quem é o equipamento sem confirmação. */
  caption?: string;
}

/*
 * Os arquivos têm nomes descritivos em português porque o nome vai para a URL pública da imagem
 * (ex.: /assets/img/conserto-de-notebook-bancada-vila-marari-800.<hash>.avif).
 * Nenhuma foto daqui mostra equipamento Apple. Fotos de extras/nao-publicar-macbook nunca entram.
 */
export const images = {
  hero: {
    file: 'pc-gamer-gabinete-branco-rgb-vila-marari.jpg',
    alt: 'Gabinete branco com lateral de vidro, ventoinhas e memórias com iluminação RGB e placa de vídeo à vista',
    caption: 'Gabinete branco com iluminação RGB: ventoinhas, memórias, water cooler e placa de vídeo.',
  },
  heroMobile: {
    file: 'pc-gamer-gabinete-rgb-recorte-celular.jpg',
    alt: 'Interior de um gabinete branco com ventoinhas e memórias com iluminação RGB e placa de vídeo à vista',
  },
  gabineteInterior: {
    file: 'pc-gamer-interior-water-cooler-memorias-rgb.jpg',
    alt: 'Interior de um PC gamer com ventoinha RGB, memórias iluminadas, water cooler e placa de vídeo',
    caption: 'Interior de um desktop com water cooler, memórias e ventoinhas com iluminação RGB.',
  },
  videoGabinete: {
    file: 'pc-gamer-gabinete-branco-borda-luminosa-video.jpg',
    alt: 'Gabinete branco com janela de vidro e uma linha de luz verde-azulada na borda do painel, sobre uma mesa, com luzes coloridas na parede ao fundo',
    caption: 'Quadro do vídeo: gabinete branco com janela de vidro e luz verde-azulada na borda.',
  },
  videoVerde: {
    file: 'pc-gamer-gabinete-lateral-luz-verde-video.jpg',
    alt: 'Detalhe da lateral de um gabinete com uma linha de luz verde acompanhando o recorte do painel',
    caption: 'Quadro do vídeo: detalhe da luz verde na lateral do gabinete.',
  },
  videoRosa: {
    file: 'pc-gamer-gabinete-branco-luz-rosa-video.jpg',
    alt: 'Gabinete branco sobre uma mesa, com uma linha de luz rosa no painel frontal e reflexos coloridos na parede',
    caption: 'Quadro do vídeo: gabinete branco com linha de luz rosa no painel.',
  },
  bancada: {
    file: 'assistencia-tecnica-bancada-lcpc-gaming-vila-marari.jpg',
    alt: 'Bancada com notebook aberto sobre o tapete de mesa, jogo de chaves de precisão e luz de anel, com a logo da LCPC Gaming no monitor ao fundo',
    caption: 'Notebook aberto na bancada, com chaves de precisão à mão e a logo da LCPC Gaming no monitor ao fundo.',
  },
  bancadaLuz: {
    file: 'bancada-lcpc-gaming-luz-de-anel-logo-no-monitor.jpg',
    alt: 'Mesa de trabalho com luz de anel, monitor exibindo a logo da LCPC Gaming e um notebook aberto sobre o tapete de mesa',
    caption: 'Mesa de trabalho da LCPC Gaming, com luz de anel e a logo no monitor.',
  },
  bancadaFerramentas: {
    file: 'conserto-de-notebook-chaves-de-precisao-bancada.jpg',
    alt: 'Notebook sem a tampa inferior sobre o tapete de mesa, ao lado de uma chave de precisão e de um estojo de pontas',
    caption: 'Notebook sem a tampa inferior, com estojo de pontas e chave de precisão ao lado.',
  },
  bancadaNotebookAberto: {
    file: 'conserto-de-notebook-aberto-placa-mae-ventoinha-sao-paulo.jpg',
    alt: 'Notebook aberto sobre a bancada, com a placa-mãe e a ventoinha expostas e a tela apoiada atrás',
    caption: 'Notebook aberto, com a placa-mãe e a ventoinha expostas.',
  },
  bancadaPositivo: {
    file: 'assistencia-tecnica-notebook-aberto-mao-positivo.jpg',
    alt: 'Mão fazendo sinal de positivo ao lado de um notebook aberto sobre o tapete de mesa, com caixas organizadoras ao fundo',
    caption: 'Notebook aberto sobre o tapete de mesa, com uma mão em sinal de positivo.',
  },
  placaMae: {
    file: 'conserto-de-notebook-placa-mae-chave-de-precisao.jpg',
    alt: 'Chave de precisão apoiada sobre a placa-mãe de um notebook aberto, com memória e conectores à vista',
    caption: 'Detalhe da placa-mãe de um notebook aberto, com uma chave de precisão.',
  },
  consertoNotebook: {
    file: 'conserto-de-notebook-bancada-vila-marari.jpg',
    alt: 'Mão usando uma chave de precisão no interior de um notebook aberto, com a placa-mãe e os pentes de memória à vista',
    caption: 'Manutenção em andamento: notebook aberto na bancada, com a placa-mãe e a memória à vista.',
  },
  detalheNotebook: {
    file: 'conserto-de-notebook-interior-placa-mae.jpg',
    alt: 'Interior de um notebook aberto, com placa-mãe, memória, ventoinha e dissipador',
    caption: 'Interior de um notebook, com placa-mãe, memória, ventoinha e dissipador.',
  },
  luisCarlos: {
    file: 'luis-carlos-assistencia-tecnica-lcpc-gaming.jpg',
    alt: 'Luis Carlos sorrindo de óculos e camiseta azul-marinho, com a logo da LCPC Gaming em um monitor e um gabinete com iluminação RGB ao fundo',
    caption: 'Luis Carlos, proprietário da LCPC Gaming e responsável pelos serviços.',
  },
} satisfies Record<string, SiteImage>;

export const logoImage = { file: 'logo-lcpc-gaming.png', alt: 'LCPC Gaming' };

export const video = {
  /** Arquivo de referência (contentUrl no VideoObject): o MP4 H.264 toca em qualquer navegador. */
  src: '/media/video-pc-gamer.mp4',
  /** Ordem de preferência: AV1 em WebM (~1,1 MB) e, para navegadores sem AV1, o MP4 H.264 (~2,5 MB). */
  sources: [
    { src: '/media/video-pc-gamer.webm', type: 'video/webm; codecs="av01.0.04M.08, opus"' },
    { src: '/media/video-pc-gamer.mp4', type: 'video/mp4' },
  ],
  /** Capa em JPEG: miniatura do VideoObject e capa do player sem JavaScript. A capa da página é a foto videoGabinete, em AVIF e WebP. */
  poster: '/media/video-pc-gamer-capa.jpg',
  width: 464,
  height: 832,
  title: 'Gabinete com iluminação RGB em vídeo',
  description:
    'Vídeo vertical da LCPC Gaming com detalhes da iluminação de um gabinete, que aparece inteiro perto do fim, antes da logo. O vídeo tem som.',
  /** Data do arquivo no Drive e duração, usadas no VideoObject. */
  uploadDate: '2026-11-03',
  duration: 'PT26S',
};

/** Imagem social padrão (as de cada página são geradas no build, em dist/og/). */
export const socialImage = { src: '/og-lcpc-gaming.jpg', width: 1200, height: 630, alt: 'LCPC Gaming. Seu PC, nosso conhecimento.' };

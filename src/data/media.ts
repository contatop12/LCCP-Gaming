
/** Nome do arquivo em src/assets/media/. Dimensões e formatos saem do arquivo, no build (scripts/lib/images.ts). */
export interface SiteImage {
  file: string;
  alt: string;
  /** Legenda factual. Não afirma qual reparo foi feito nem de quem é o equipamento sem confirmação. */
  caption?: string;
}

export const images = {
  hero: {
    file: 'hero-desktop.jpg',
    alt: 'Gabinete branco com lateral de vidro, ventoinhas e memórias com iluminação RGB e placa de vídeo à vista',
  },
  heroMobile: {
    file: 'hero-mobile.jpg',
    alt: 'Interior de um gabinete branco com ventoinhas e memórias com iluminação RGB e placa de vídeo à vista',
  },
  gabineteInterior: {
    file: 'gabinete-interior.jpg',
    alt: 'Interior de um PC gamer com ventoinha RGB, memórias iluminadas, water cooler e placa de vídeo',
    caption: 'Interior de um desktop com water cooler, memórias e ventoinhas com iluminação RGB.',
  },
  bancada: {
    file: 'bancada-lcpc.jpg',
    alt: 'Bancada com notebook aberto sobre o tapete de mesa, jogo de chaves de precisão e luz de anel, com a logo da LCPC Gaming no monitor ao fundo',
    caption: 'Notebook aberto na bancada, com chaves de precisão à mão e a logo da LCPC Gaming no monitor ao fundo.',
  },
  bancadaFerramentas: {
    file: 'bancada-ferramentas.jpg',
    alt: 'Notebook sem a tampa inferior sobre o tapete de mesa, ao lado de uma chave de precisão e de um estojo de pontas',
    caption: 'Notebook sem a tampa inferior, com estojo de pontas e chave de precisão ao lado.',
  },
  bancadaNotebookAberto: {
    file: 'bancada-notebook-aberto.jpg',
    alt: 'Notebook Acer aberto sobre a bancada, com a placa-mãe e a ventoinha expostas e a tela apoiada atrás',
    caption: 'Notebook Acer aberto, com a placa-mãe e a ventoinha expostas.',
  },
  consertoNotebook: {
    file: 'conserto-notebook.jpg',
    alt: 'Mão usando uma chave de precisão no interior de um notebook aberto, com a placa-mãe e os pentes de memória à vista',
    caption: 'Manutenção em andamento: notebook aberto na bancada, com a placa-mãe e a memória à vista.',
  },
  detalheNotebook: {
    file: 'detalhe-notebook.jpg',
    alt: 'Interior de um notebook aberto, com placa-mãe, memória, ventoinha e dissipador',
    caption: 'Interior de um notebook, com placa-mãe, memória, ventoinha e dissipador.',
  },
  luisCarlos: {
    file: 'luis-carlos.jpg',
    alt: 'Luis Carlos sorrindo de óculos e camiseta azul-marinho, com a logo da LCPC Gaming em um monitor e um gabinete com iluminação RGB ao fundo',
    caption: 'Luis Carlos, proprietário da LCPC Gaming e responsável pelos serviços.',
  },
} satisfies Record<string, SiteImage>;

export const logoImage = { file: 'logo-lcpc-gaming.png', alt: 'LCPC Gaming' };

export const video = {
  src: '/media/video-pc-gamer.mp4',
  poster: '/media/video-pc-gamer-capa.jpg',
  width: 464,
  height: 832,
  title: 'Gabinete com iluminação RGB em vídeo',
  description:
    'Vídeo vertical da LCPC Gaming com detalhes da iluminação de um gabinete branco, que aparece inteiro perto do fim, antes da logo. O vídeo tem som.',
};

export const socialImage = { src: '/og-lcpc-gaming.jpg', width: 1200, height: 630, alt: 'LCPC Gaming. Seu PC, nosso conhecimento.' };

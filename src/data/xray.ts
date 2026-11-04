/**
 * "Raio-x do gabinete": pontos sobre a foto real do gabinete (src/data/media.ts, chave "hero").
 * As coordenadas (x, y) são da foto de 1200x1600 antes de ir para a tela de 1440x1640 (original + 120, - 60).
 * Cada ponto leva ao serviço do catálogo publicado que cuida daquele componente.
 */
export interface XrayPart {
  id: string;
  name: string;
  /** Texto do link: o serviço, como está no catálogo. */
  service: string;
  href: string;
  /** Pontos sobre a foto, nas coordenadas da foto original de 1200x1600. */
  points: [number, number][];
  side: 'l' | 'r';
  /** Altura do rótulo na composição de desktop (0 a 560). */
  labelY: number;
}

/** Recorte mostrado, em pixels da tela de 1440x1640 da abertura. */
export const xrayCrop = { x: 170, y: 280, width: 960, height: 1020 };

export const xrayParts: XrayPart[] = [
  { id: 'radiador', name: 'Ventoinhas do radiador', service: 'Troca de cooler, ventoinhas e water cooler', href: '/servicos/#desktops', points: [[490, 470], [650, 455]], side: 'l', labelY: 38 },
  { id: 'ventoinha', name: 'Ventoinha lateral RGB', service: 'Limpeza de ventoinhas, dissipadores e filtros', href: '/servicos/#limpeza', points: [[200, 645]], side: 'l', labelY: 138 },
  { id: 'gpu', name: 'Placa de vídeo', service: 'Upgrade de placa de vídeo', href: '/pc-gamer/#upgrade-placa-de-video', points: [[270, 815], [505, 835]], side: 'l', labelY: 262 },
  { id: 'bomba', name: 'Bomba do water cooler', service: 'Upgrade do sistema de refrigeração', href: '/servicos/#montagem-upgrade', points: [[420, 640]], side: 'r', labelY: 100 },
  { id: 'ram', name: 'Memória RAM', service: 'Ampliação de memória RAM', href: '/pc-gamer/#upgrade-memoria-ram', points: [[545, 640]], side: 'r', labelY: 176 },
  { id: 'entrada', name: 'Entrada de ar lateral', service: 'Ajuste do fluxo de ar do gabinete', href: '/servicos/#limpeza', points: [[945, 700]], side: 'r', labelY: 246 },
  { id: 'montagem', name: 'Gabinete e cabos', service: 'Montagem de PC gamer', href: '/pc-gamer/#montar', points: [[700, 1110]], side: 'r', labelY: 340 },
];

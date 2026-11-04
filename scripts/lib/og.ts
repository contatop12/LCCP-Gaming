/**
 * Imagem social (Open Graph) de cada página, gerada no build: foto real, logo oficial e o título da página.
 * O texto vira caminho vetorial (opentype.js + Saira Condensed), então o resultado não depende de fontes do sistema.
 * Saída: dist/og/<nome>.jpg, 1200x630, abaixo de 300 KB.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import opentype from 'opentype.js';
import sharp from 'sharp';
import { MEDIA_DIR } from './images.ts';

const W = 1200;
const H = 630;
const PHOTO_X = 600;

const load = (file: string) => {
  const data = readFileSync(file);
  return opentype.parse(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer);
};
const display = load('src/assets/fonts/og/saira-condensed-700.ttf');
const body = load('src/assets/fonts/og/ibm-plex-sans.ttf');

function wrap(font: ReturnType<typeof load>, text: string, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (line && font.getAdvanceWidth(next, size) > maxWidth) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

export interface OgOptions {
  /** Nome do arquivo de saída, sem extensão. */
  name: string;
  /** Título da imagem, como aparece na página. */
  headline: string;
  /** Arquivo em src/assets/media. */
  photo: string;
}

export async function writeOgImage({ name, headline, photo }: OgOptions): Promise<string> {
  // Maior tamanho de texto que cabe em até 4 linhas na coluna da esquerda.
  let size = 84;
  let lines = wrap(display, headline, size, PHOTO_X - 64 - 40);
  while ((lines.length > 4 || lines.some((l) => display.getAdvanceWidth(l, size) > PHOTO_X - 64 - 40)) && size > 44) {
    size -= 4;
    lines = wrap(display, headline, size, PHOTO_X - 64 - 40);
  }
  const lead = Math.round(size * 1.04);
  const top = 232;
  const paths = lines.map((line, i) => `<path d="${display.getPath(line, 64, top + i * lead, size).toPathData(2)}" fill="#fff"/>`).join('');
  const barY = top + (lines.length - 1) * lead + 34;
  const place = `<path d="${body.getPath('Vila Marari, Zona Sul de São Paulo', 64, 580, 30).toPathData(2)}" fill="#c9d0d8"/>`;

  const background = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0c1a2e"/><stop offset="1" stop-color="#1d2024"/></linearGradient></defs>
<rect width="${W}" height="${H}" fill="url(#g)"/>
<g fill="none" stroke-width="3"><path d="M0 120H210L260 70H470" stroke="#1a9bff" opacity=".7"/><path d="M0 150H150L190 110H330" stroke="#fa6a0a" opacity=".8"/><path d="M0 560H120L170 610" stroke="#1a9bff" opacity=".5"/></g>
<rect x="64" y="${barY}" width="132" height="9" fill="#fa6a0a"/>${paths}${place}</svg>`;

  const mask = `<svg xmlns="http://www.w3.org/2000/svg" width="${W - PHOTO_X}" height="${H}"><polygon points="70,0 ${W - PHOTO_X},0 ${W - PHOTO_X},${H} 0,${H} 0,70" fill="#fff"/></svg>`;
  const photoBuffer = await sharp(join(MEDIA_DIR, photo))
    .rotate()
    .resize(W - PHOTO_X, H, { fit: 'cover', position: 'attention' })
    .composite([{ input: Buffer.from(mask), blend: 'dest-in' }])
    .png()
    .toBuffer();
  const logo = await sharp(join(MEDIA_DIR, 'logo-lcpc-gaming.png')).resize({ height: 92 }).png().toBuffer();

  const out = await sharp(Buffer.from(background))
    .composite([
      { input: photoBuffer, left: PHOTO_X, top: 0 },
      { input: logo, left: 64, top: 64 },
    ])
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
  mkdirSync('dist/og', { recursive: true });
  writeFileSync(join('dist/og', `${name}.jpg`), out);
  return `/og/${name}.jpg`;
}

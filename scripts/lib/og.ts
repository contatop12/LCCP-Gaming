/**
 * Imagem social (Open Graph) de cada página, gerada no build: foto real, logo oficial e o título da página.
 * O texto sai da entrada `text` do sharp (Pango) com os arquivos TTF de src/assets/fonts/og/, as mesmas fontes do site,
 * então o resultado não depende de fontes do sistema nem de nenhuma dependência extra (a revisão 1 usava opentype.js).
 * Saída: dist/og/<nome>.jpg, 1200x630, abaixo de 300 KB.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import sharp from 'sharp';
import { MEDIA_DIR } from './images.ts';

const W = 1200;
const H = 630;
const PHOTO_X = 600;
const TEXT_W = PHOTO_X - 64 - 40;
const FONT_DISPLAY = resolve('src/assets/fonts/og/saira-condensed-700.ttf');
const FONT_BODY = resolve('src/assets/fonts/og/ibm-plex-sans.ttf');

/** Texto branco (ou da cor dada) como imagem com fundo transparente. */
async function text(content: string, font: string, fontfile: string, color: string, width?: number, spacing = 0): Promise<{ data: Buffer; width: number; height: number }> {
  const safe = content.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const { data, info } = await sharp({
    text: { text: `<span foreground="${color}">${safe}</span>`, rgba: true, font, fontfile, width, wrap: 'word', align: 'left', spacing },
  })
    .png()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/** Maior corpo em que o título cabe em até 4 linhas (e 292 px de altura) na coluna da esquerda, com entrelinha de 1,04. */
async function fitHeadline(headline: string): Promise<{ data: Buffer; width: number; height: number; size: number }> {
  for (let size = 84; size >= 44; size -= 4) {
    // O Pango usa a entrelinha própria da fonte; `spacing` soma (ou tira) pontos para chegar a 1,04 do corpo.
    const one = await text('Ag', `Saira Condensed Bold ${size}`, FONT_DISPLAY, '#ffffff');
    const two = await text('Ag\nAg', `Saira Condensed Bold ${size}`, FONT_DISPLAY, '#ffffff');
    const pitch = two.height - one.height;
    const spacing = Math.round(size * 1.04 - pitch);
    const block = await text(headline, `Saira Condensed Bold ${size}`, FONT_DISPLAY, '#ffffff', TEXT_W, spacing);
    const lines = Math.round((block.height - one.height) / (pitch + spacing)) + 1;
    if ((lines <= 4 && block.height <= 292) || size === 44) return { ...block, size };
  }
  throw new Error('inalcançável');
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
  const title = await fitHeadline(headline);
  const top = 176;
  const barY = top + title.height + 18;
  const place = await text('Vila Marari, Zona Sul de São Paulo', 'IBM Plex Sans 30', FONT_BODY, '#c9d0d8');

  const background = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#15171a"/><stop offset="1" stop-color="#1d2024"/></linearGradient></defs>
<rect width="${W}" height="${H}" fill="url(#g)"/>
<g fill="none" stroke-width="3"><path d="M0 120H210L260 70H470" stroke="#868e97" opacity=".7"/><path d="M0 150H150L190 110H330" stroke="#fa6a0a" opacity=".8"/><path d="M0 560H120L170 610" stroke="#868e97" opacity=".5"/></g>
<rect x="64" y="${barY}" width="132" height="9" fill="#fa6a0a"/></svg>`;

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
      { input: title.data, left: 64, top },
      { input: place.data, left: 64, top: H - 52 - place.height },
    ])
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
  mkdirSync('dist/og', { recursive: true });
  writeFileSync(join('dist/og', `${name}.jpg`), out);
  return `/og/${name}.jpg`;
}

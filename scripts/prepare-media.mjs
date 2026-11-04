/**
 * Gera as mídias do site a partir dos originais em materiais/lcpc-gaming/.
 * Os originais nunca são publicados. Saídas:
 *   src/assets/media/  recortes de alta qualidade, convertidos no build para AVIF, WebP e JPEG (scripts/lib/images.ts)
 *   public/media/      vídeo e capa, servidos como arquivos estáticos
 *   public/            favicon e imagem social
 *
 * Uso: npm run media. O vídeo e a capa exigem ffmpeg no PATH.
 * Os arquivos gerados ficam versionados, então o build não depende deste script.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const SRC = 'materiais/lcpc-gaming';
const OUT = 'src/assets/media';
const PUB = 'public/media';
const GRAPHITE = { r: 29, g: 32, b: 36 };

mkdirSync(OUT, { recursive: true });
mkdirSync(PUB, { recursive: true });

const jpeg = { quality: 92, mozjpeg: true };

/** Recorta um original para src/assets/media. */
async function crop(input, output, region) {
  await sharp(join(SRC, input)).rotate().extract(region).jpeg(jpeg).toFile(join(OUT, output));
}

/**
 * Abertura da home: mantém o gabinete intacto e troca parede, capacete, boneco, prateleira e fios
 * por grafite, com um halo nas cores amostradas das fitas e ventoinhas da própria foto.
 */
async function buildHero() {
  const W = 1200;
  const H = 1600;
  const casePolygon = [
    [56, 394], [838, 196], [934, 180], [1096, 344], [1072, 1344], [930, 1590],
    [812, 1598], [566, 1462], [222, 1330], [186, 1342], [106, 1312], [88, 1262],
  ].map((p) => p.join(',')).join(' ');

  const mask = await sharp(Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="100%" height="100%" fill="#000"/><polygon points="${casePolygon}" fill="#fff"/></svg>`,
  )).blur(3.2).extractChannel(0).png().toBuffer();

  const orig = await sharp(join(SRC, 'hero-pc-gamer.jpeg')).rotate().removeAlpha().toBuffer();
  const cutout = await sharp(orig).joinChannel(mask).png().toBuffer();

  // Margem em volta do gabinete para o halo se dissolver no grafite antes da borda da imagem.
  const MARGIN = 120;
  const CANVAS_W = W + MARGIN * 2;
  const CANVAS_H = H + 100;
  const glows = [
    { x: 150, y: 660, r: 520, color: '#fe0072', opacity: 0.3 },
    { x: 220, y: 400, r: 420, color: '#1418dc', opacity: 0.34 },
    { x: 170, y: 1120, r: 480, color: '#fe39ff', opacity: 0.24 },
    { x: 1300, y: 640, r: 470, color: '#723ad1', opacity: 0.4 },
    { x: 1280, y: 1180, r: 430, color: '#fe0072', opacity: 0.18 },
    { x: 740, y: 170, r: 460, color: '#00d164', opacity: 0.1 },
  ];
  const graphite = `rgb(${GRAPHITE.r},${GRAPHITE.g},${GRAPHITE.b})`;
  const fade = (id, x1, y1, x2, y2) =>
    `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${graphite}"/><stop offset="1" stop-color="${graphite}" stop-opacity="0"/></linearGradient>`;
  const glowSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_W}" height="${CANVAS_H}"><defs>${glows
    .map((g, i) => `<radialGradient id="g${i}"><stop offset="0" stop-color="${g.color}" stop-opacity="${g.opacity}"/><stop offset="1" stop-color="${g.color}" stop-opacity="0"/></radialGradient>`)
    .join('')}${fade('fl', 0, 0, 1, 0)}${fade('fr', 1, 0, 0, 0)}${fade('ft', 0, 0, 0, 1)}${fade('fb', 0, 1, 0, 0)}</defs>${glows
    .map((g, i) => `<circle cx="${g.x}" cy="${g.y}" r="${g.r}" fill="url(#g${i})"/>`)
    .join('')}<rect width="240" height="100%" fill="url(#fl)"/><rect x="${CANVAS_W - 240}" width="240" height="100%" fill="url(#fr)"/><rect width="100%" height="220" fill="url(#ft)"/><rect y="${CANVAS_H - 220}" width="100%" height="220" fill="url(#fb)"/></svg>`;

  const composed = await sharp({ create: { width: CANVAS_W, height: CANVAS_H, channels: 3, background: GRAPHITE } })
    .composite([{ input: Buffer.from(glowSvg) }, { input: cutout, left: MARGIN, top: 0 }])
    .png()
    .toBuffer();

  await sharp(composed).extract({ left: 0, top: 60, width: CANVAS_W, height: CANVAS_H - 60 }).jpeg(jpeg).toFile(join(OUT, 'hero-desktop.jpg'));
  await sharp(composed).extract({ left: 130, top: 450, width: 1180, height: 800 }).jpeg(jpeg).toFile(join(OUT, 'hero-mobile.jpg'));
}

async function buildBrand() {
  const logo = await sharp(join(SRC, 'logos/logo-sem-fundo.png')).trim().png().toBuffer();
  await sharp(logo).png({ compressionLevel: 9 }).toFile(join(OUT, 'logo-lcpc-gaming.png'));

  const { width, height } = await sharp(logo).metadata();
  // Só o monograma LCPC: "Gaming" fica ilegível em tamanho de favicon.
  const mono = await sharp(logo).extract({ left: 0, top: 0, width, height: Math.round(height * 0.64) }).toBuffer();
  for (const size of [48, 180]) {
    const inner = Math.round(size * 0.86);
    const mark = await sharp(mono).resize({ width: inner }).png().toBuffer();
    await sharp({ create: { width: size, height: size, channels: 4, background: { ...GRAPHITE, alpha: 1 } } })
      .composite([{ input: mark, gravity: 'center' }])
      .png({ compressionLevel: 9 })
      .toFile(join('public', size === 48 ? 'favicon.png' : 'apple-touch-icon.png'));
  }

  await sharp(join(SRC, 'logos/logo-tech.png'))
    .resize({ width: 1200, height: 630, fit: 'cover', position: 'centre' })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile('public/og-lcpc-gaming.jpg');
}

async function buildPhotos() {
  await crop('hero-pc-gamer.jpeg', 'gabinete-interior.jpg', { left: 92, top: 500, width: 668, height: 640 });
  await crop('luis-carlos.jpeg', 'luis-carlos.jpg', { left: 0, top: 90, width: 1200, height: 1400 });
  await crop('conserto-notebook.jpeg', 'conserto-notebook.jpg', { left: 0, top: 0, width: 1200, height: 1400 });
  await crop('detalhe-notebook.jpeg', 'detalhe-notebook.jpg', { left: 0, top: 450, width: 1200, height: 960 });
  await crop('bancada-lcpc.jpeg', 'bancada-lcpc.jpg', { left: 0, top: 30, width: 1200, height: 1440 });
  await crop('extras/conserto-de-notebook-vila-marari.jpeg', 'bancada-ferramentas.jpg', { left: 0, top: 330, width: 1200, height: 1080 });
  await crop('extras/conserto-notebook-acer-sao-paulo.jpeg', 'bancada-notebook-aberto.jpg', { left: 0, top: 320, width: 1200, height: 1080 });
}

function buildVideo() {
  const source = join(SRC, 'video-pc-gamer.mp4');
  // Capa no intervalo pedido no brief (entre 21 s e 24 s), com enquadramento vertical preservado.
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-ss', '22.5', '-i', source, '-frames:v', '1', '-q:v', '3', join(PUB, 'video-pc-gamer-capa.jpg')]);
  execFileSync('ffmpeg', [
    '-y', '-v', 'error', '-i', source,
    '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'slow', '-crf', '25', '-r', '30', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '96k',
    '-movflags', '+faststart',
    join(PUB, 'video-pc-gamer.mp4'),
  ]);
}

await buildHero();
await buildBrand();
await buildPhotos();
if (!process.argv.includes('--sem-video')) buildVideo();

console.log('Mídias geradas.');

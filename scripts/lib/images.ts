/**
 * Imagens do site. Gera AVIF, WebP e JPEG/PNG nas larguras de cada uso,
 * com nomes que levam o hash do conteúdo (dist/assets/img/<nome>-<largura>.<hash>.<ext>).
 * As variantes ficam em cache (node_modules/.cache/lcpc-images), então rebuilds sem mudança são rápidos.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import sharp from 'sharp';

export const MEDIA_DIR = 'src/assets/media';
const CACHE_DIR = 'node_modules/.cache/lcpc-images';
const OUT_DIR = 'dist/assets/img';

/** Qualidade de cada formato. */
export const QUALITY = { avif: 62, webp: 74, jpg: 78, png: 90 } as const;
export type Format = keyof typeof QUALITY;

export interface Source {
  file: string;
  name: string;
  width: number;
  height: number;
  format: 'jpg' | 'png';
  digest: string;
}

const sources = new Map<string, Promise<Source>>();
const variants = new Map<string, Promise<string>>();

const sha1 = (data: string | Buffer) => createHash('sha1').update(data).digest('hex');

export function source(file: string): Promise<Source> {
  let found = sources.get(file);
  if (!found) {
    found = (async () => {
      const path = join(MEDIA_DIR, file);
      if (!existsSync(path)) throw new Error(`Imagem inexistente em ${MEDIA_DIR}: ${file}`);
      const data = readFileSync(path);
      const meta = await sharp(data).metadata();
      if (!meta.width || !meta.height) throw new Error(`Não foi possível ler as dimensões de ${file}`);
      const ext = extname(file).toLowerCase();
      const format = ext === '.png' ? 'png' : 'jpg';
      return { file, name: basename(file, extname(file)), width: meta.width, height: meta.height, format, digest: sha1(data) } satisfies Source;
    })();
    sources.set(file, found);
  }
  return found;
}

/** Só larguras que a imagem comporta; se nenhuma couber, usa a largura original. */
export const fitWidths = (image: Source, list: number[]): number[] => {
  const valid = list.filter((width) => width <= image.width).sort((a, b) => a - b);
  return valid.length ? valid : [image.width];
};

/** Gera (ou lê do cache) uma variante e a publica em dist/assets/img. Devolve a URL pública. */
export function variant(image: Source, width: number, format: Format): Promise<string> {
  const key = `${image.digest}|${width}|${format}|${QUALITY[format]}|${sharp.versions.sharp}`;
  let found = variants.get(key);
  if (!found) {
    found = (async () => {
      mkdirSync(CACHE_DIR, { recursive: true });
      mkdirSync(OUT_DIR, { recursive: true });
      const cached = join(CACHE_DIR, `${sha1(key)}.${format}`);
      if (!existsSync(cached)) {
        const pipeline = sharp(readFileSync(join(MEDIA_DIR, image.file))).rotate().resize({ width, withoutEnlargement: true });
        const encoded = await pipeline.toFormat(format === 'jpg' ? 'jpeg' : format, { quality: QUALITY[format] }).toBuffer();
        writeFileSync(cached, encoded);
      }
      const data = readFileSync(cached);
      const fileName = `${image.name}-${width}.${sha1(data).slice(0, 8)}.${format}`;
      writeFileSync(join(OUT_DIR, fileName), data);
      return `/assets/img/${fileName}`;
    })();
    variants.set(key, found);
  }
  return found;
}

export interface SrcSet {
  /** Valor do atributo srcset. */
  attribute: string;
  /** Variante maior, usada como src de reserva. */
  largest: string;
}

export async function srcset(image: Source, widths: number[], format: Format): Promise<SrcSet> {
  const usable = fitWidths(image, widths);
  const urls = await Promise.all(usable.map((width) => variant(image, width, format)));
  return {
    attribute: urls.map((url, index) => `${url} ${usable[index]}w`).join(', '),
    largest: urls[urls.length - 1]!,
  };
}

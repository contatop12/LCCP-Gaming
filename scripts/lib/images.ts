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
/** AVIF em 50 com esforço 6: 35% menor que em 62 e sem diferença visível numa amostra a 100% (as fotos são de celular, com pouco detalhe fino). */
export const QUALITY = { avif: 50, webp: 74, jpg: 78, png: 90 } as const;
export type Format = keyof typeof QUALITY;

/**
 * Recorte feito no build para a proporção real do bloco: as fotos são em retrato e os blocos costumam ser paisagem, então
 * sem recorte o navegador baixa pixels que o `object-fit: cover` joga fora. `pos` é o enquadramento em %, como o object-position.
 */
export interface Crop {
  ratio: number;
  pos: [number, number];
}

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
export function variant(image: Source, width: number, format: Format, crop?: Crop): Promise<string> {
  const key = `${image.digest}|${width}|${format}|${QUALITY[format]}|${crop ? `${crop.ratio}@${crop.pos.join(',')}` : ''}|${sharp.versions.sharp}`;
  let found = variants.get(key);
  if (!found) {
    found = (async () => {
      mkdirSync(CACHE_DIR, { recursive: true });
      mkdirSync(OUT_DIR, { recursive: true });
      const cached = join(CACHE_DIR, `${sha1(key)}.${format}`);
      if (!existsSync(cached)) {
        let pipeline = sharp(readFileSync(join(MEDIA_DIR, image.file))).rotate();
        const region = crop ? cropRegion(image, crop) : null;
        if (region) pipeline = pipeline.extract(region);
        pipeline = pipeline.resize({ width, withoutEnlargement: true });
        const encoded = await pipeline.toFormat(format === 'jpg' ? 'jpeg' : format, format === 'avif' ? { quality: QUALITY[format], effort: 6 } : { quality: QUALITY[format] }).toBuffer();
        writeFileSync(cached, encoded);
      }
      const data = readFileSync(cached);
      const fileName = `${image.name}${crop ? `-r${Math.round(crop.ratio * 100)}` : ''}-${width}.${sha1(data).slice(0, 8)}.${format}`;
      writeFileSync(join(OUT_DIR, fileName), data);
      return `/assets/img/${fileName}`;
    })();
    variants.set(key, found);
  }
  return found;
}

/** Região (em pixels da foto original) que cobre a proporção pedida em torno do enquadramento; null se a foto já tem essa proporção. */
export function cropRegion(image: Source, crop: Crop): { left: number; top: number; width: number; height: number } | null {
  const natural = image.width / image.height;
  if (Math.abs(natural - crop.ratio) / crop.ratio < 0.04) return null;
  if (crop.ratio > natural) {
    const height = Math.round(image.width / crop.ratio);
    return { left: 0, top: Math.round(((image.height - height) * crop.pos[1]) / 100), width: image.width, height };
  }
  const width = Math.round(image.height * crop.ratio);
  return { left: Math.round(((image.width - width) * crop.pos[0]) / 100), top: 0, width, height: image.height };
}

/** Dimensões da foto depois do recorte. */
export function croppedSize(image: Source, crop?: Crop): { width: number; height: number } {
  const region = crop ? cropRegion(image, crop) : null;
  return region ? { width: region.width, height: region.height } : { width: image.width, height: image.height };
}

export interface SrcSet {
  /** Valor do atributo srcset. */
  attribute: string;
  /** Variante maior, usada como src de reserva. */
  largest: string;
}

export async function srcset(image: Source, widths: number[], format: Format, crop?: Crop): Promise<SrcSet> {
  const usable = fitWidths({ ...image, width: croppedSize(image, crop).width }, widths);
  const urls = await Promise.all(usable.map((width) => variant(image, width, format, crop)));
  return {
    attribute: urls.map((url, index) => `${url} ${usable[index]}w`).join(', '),
    largest: urls[urls.length - 1]!,
  };
}

const placeholders = new Map<string, Promise<string>>();

/**
 * Cor de reserva da foto, como valor CSS de 7 caracteres (antes era uma miniatura WebP de ~24 px em base64, 300 a 500 bytes
 * por foto no HTML). Vem da luminância média, sem matiz: o espaço fica grafite neutro até a foto decodificar, e a interface
 * continua sem nenhuma cor além do laranja.
 */
export function placeholderColor(image: Source): Promise<string> {
  let found = placeholders.get(image.digest);
  if (!found) {
    found = sharp(readFileSync(join(MEDIA_DIR, image.file)))
      .rotate()
      .resize(8, 8, { fit: 'cover' })
      .greyscale()
      .stats()
      .then(({ channels }) => {
        // Escurece a média para o tom do bloco: a foto é clara, mas a reserva fica entre o grafite e o cinza.
        const level = Math.round(Math.min(Math.max(channels[0]!.mean * 0.45, 38), 92));
        const hex = level.toString(16).padStart(2, '0');
        return `#${hex}${hex}${hex}`;
      });
    placeholders.set(image.digest, found);
  }
  return found;
}

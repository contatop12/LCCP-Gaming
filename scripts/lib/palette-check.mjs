/**
 * Verificação de paleta (revisão 2): a interface usa grafite neutro e uma só cor, o laranja da logo.
 * A cor do site vem das fotos reais. Esta função falha se CSS escrito à mão ou SVG em linha usar um matiz
 * fora da família do laranja. Ficam de fora a logo (PNG) e as fotos, que não passam por aqui.
 *
 * Regra: cor com saturação (HSL) acima de 0,2 e luminosidade entre 3% e 97% precisa ter matiz entre 12 e 38 graus.
 * Cinzas levemente tingidos do grafite (saturação até ~0,13) passam como neutros.
 */
const NAMED = ['red', 'blue', 'green', 'yellow', 'purple', 'pink', 'cyan', 'magenta', 'teal', 'navy', 'lime', 'aqua', 'violet', 'indigo', 'crimson', 'fuchsia'];

function toHsl(r, g, b) {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h;
  if (max === r / 255) h = ((g - b) / 255 / d) % 6;
  else if (max === g / 255) h = (b - r) / 255 / d + 2;
  else h = (r - g) / 255 / d + 4;
  return { h: (h * 60 + 360) % 360, s, l };
}

function hexToRgb(hex) {
  let h = hex.toLowerCase();
  if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('');
  if (h.length !== 6 && h.length !== 8) return null;
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

function offending(r, g, b, alpha = 1) {
  if (alpha === 0) return false;
  const { h, s, l } = toHsl(r, g, b);
  if (s <= 0.2 || l < 0.03 || l > 0.97) return false;
  return !(h >= 12 && h <= 38);
}

/** Devolve a lista de cores fora da paleta encontradas no texto. */
export function findOffPalette(text) {
  const found = [];
  const source = text.replaceAll('%23', '#').replace(/&#x27;/g, "'");
  for (const m of source.matchAll(/#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})(?![0-9a-zA-Z_-])/g)) {
    const rgb = hexToRgb(m[1]);
    if (rgb && offending(...rgb)) found.push(m[0]);
  }
  for (const m of source.matchAll(/rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:[\s,/]+([\d.]+))?\s*\)/g)) {
    if (offending(Number(m[1]), Number(m[2]), Number(m[3]), m[4] === undefined ? 1 : Number(m[4]))) found.push(m[0]);
  }
  for (const m of source.matchAll(/hsla?\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%/g)) {
    const h = Number(m[1]) % 360;
    const s = Number(m[2]) / 100;
    const l = Number(m[3]) / 100;
    if (s > 0.2 && l >= 0.03 && l <= 0.97 && !(h >= 12 && h <= 38)) found.push(m[0]);
  }
  for (const name of NAMED) {
    if (new RegExp(`(?:fill|stroke|color|background|stop-color)\s*[:=]\s*["']?${name}\b`, 'i').test(source)) found.push(name);
  }
  return found;
}

/** Cores de um HTML final: <style>, atributos style e SVG em linha. */
export function htmlColorSpots(html) {
  const parts = [];
  for (const m of html.matchAll(/<style>([\s\S]*?)<\/style>/g)) parts.push(m[1]);
  for (const m of html.matchAll(/\sstyle="([^"]*)"/g)) parts.push(m[1]);
  for (const m of html.matchAll(/<svg\b[\s\S]*?<\/svg>/g)) parts.push(m[0]);
  return parts.join('\n');
}

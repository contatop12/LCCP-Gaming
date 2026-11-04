/** Utilidades de HTML do build: escape, atributos e compactação. Sem dependências. */

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };

/** Escapa texto vindo dos dados (src/data) antes de entrar no HTML. */
export const esc = (text: string): string => text.replace(/[&<>"]/g, (char) => ESCAPES[char]!);

/** Junta classes ignorando valores vazios. */
export const classes = (...names: (string | false | null | undefined)[]): string => names.filter(Boolean).join(' ');

export class BuildError extends Error {}

/** Falha o build com a página no começo da mensagem, para o erro apontar o arquivo a corrigir. */
export function fail(where: string, message: string): never {
  throw new BuildError(`${where}: ${message}`);
}

export type Attrs = Map<string, string>;

/** Lê atributos de uma tag. Atributo sem valor (ex.: priority) vale "true". */
export function parseAttrs(source: string): Attrs {
  const attrs: Attrs = new Map();
  const pattern = /([a-zA-Z][\w:.-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'))?/g;
  for (const match of source.matchAll(pattern)) {
    attrs.set(match[1]!, match[2] ?? match[3] ?? 'true');
  }
  return attrs;
}

/**
 * Compacta o HTML: remove comentários e reduz espaços em branco a um só,
 * sem tocar em <script>, <style> e <pre>.
 */
export function minifyHtml(html: string): string {
  return html
    .split(/(<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>|<pre\b[\s\S]*?<\/pre>)/)
    .map((part, index) => (index % 2 === 1 ? part : part.replace(/<!--[\s\S]*?-->/g, '').replace(/\s+/g, ' ')))
    .join('')
    .replace(/^\s+/, '');
}

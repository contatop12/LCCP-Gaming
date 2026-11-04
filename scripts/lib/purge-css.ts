/**
 * Tira do CSS de cada página as regras que usam classes que a página não tem.
 * Entrada: CSS já minificado (esbuild), o HTML final da página e as classes que o JavaScript do site acrescenta.
 * Regra de segurança: um seletor só é descartado se citar uma classe (fora de :not) que não existe no HTML nem no
 * JavaScript. Seletores sem classe (elementos, ids, atributos) ficam sempre. @keyframes e @font-face ficam sempre.
 */

/** Classes citadas em strings do JavaScript do navegador (classList, className, template). */
export function scriptClasses(scripts: string[]): Set<string> {
  const found = new Set<string>();
  for (const code of scripts) {
    for (const match of code.matchAll(/["'`]([a-z][\w-]*(?: [a-z][\w-]*)*)["'`]/g)) {
      for (const name of match[1]!.split(' ')) found.add(name);
    }
  }
  return found;
}

export function htmlClasses(html: string): Set<string> {
  const found = new Set<string>();
  for (const match of html.matchAll(/\sclass="([^"]*)"/g)) {
    for (const name of match[1]!.split(/\s+/)) if (name) found.add(name);
  }
  return found;
}

/** Divide o texto em blocos de primeiro nível: [prelúdio, corpo] ou declarações soltas. */
function topLevel(css: string): { prelude: string; body: string | null }[] {
  const out: { prelude: string; body: string | null }[] = [];
  let depth = 0;
  let start = 0;
  let bodyStart = -1;
  let prelude = '';
  for (let i = 0; i < css.length; i += 1) {
    const char = css[i];
    if (char === '"' || char === "'") {
      const quote = char;
      i += 1;
      while (i < css.length && css[i] !== quote) i += css[i] === '\\' ? 2 : 1;
    } else if (char === '(') {
      // url(data:...;) pode ter ; e { dentro de parênteses
      let level = 1;
      i += 1;
      while (i < css.length && level) {
        if (css[i] === '"' || css[i] === "'") {
          const quote = css[i];
          i += 1;
          while (i < css.length && css[i] !== quote) i += css[i] === '\\' ? 2 : 1;
        } else if (css[i] === '(') level += 1;
        else if (css[i] === ')') level -= 1;
        i += 1;
      }
      i -= 1;
    } else if (char === '{') {
      if (depth === 0) {
        prelude = css.slice(start, i).trim();
        bodyStart = i + 1;
      }
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        out.push({ prelude, body: css.slice(bodyStart, i) });
        start = i + 1;
      }
    } else if (char === ';' && depth === 0) {
      out.push({ prelude: css.slice(start, i).trim(), body: null });
      start = i + 1;
    }
  }
  return out;
}

function splitSelectors(list: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const char of list) {
    if (char === '(' || char === '[') depth += 1;
    if (char === ')' || char === ']') depth -= 1;
    if (char === ',' && depth === 0) {
      parts.push(current);
      current = '';
    } else current += char;
  }
  if (current) parts.push(current);
  return parts;
}

/** Remove :not(...) (as classes ali dentro não são exigidas) e devolve as classes que o seletor exige. */
function requiredClasses(selector: string): string[] {
  let text = selector;
  for (;;) {
    const index = text.indexOf(':not(');
    if (index < 0) break;
    let depth = 0;
    let end = index + 4;
    for (; end < text.length; end += 1) {
      if (text[end] === '(') depth += 1;
      if (text[end] === ')') {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    text = text.slice(0, index) + text.slice(end + 1);
  }
  // Atributos como [data-x="a.b"] não contam.
  text = text.replace(/\[[^\]]*\]/g, '');
  return [...text.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((match) => match[1]!);
}

function keepSelector(selector: string, used: Set<string>): boolean {
  return requiredClasses(selector).every((name) => used.has(name));
}

function purgeBlocks(css: string, used: Set<string>): string {
  let out = '';
  for (const { prelude, body } of topLevel(css)) {
    if (body === null) {
      out += `${prelude};`;
    } else if (prelude.startsWith('@keyframes') || prelude.startsWith('@font-face') || prelude.startsWith('@view-transition')) {
      out += `${prelude}{${body}}`;
    } else if (prelude.startsWith('@')) {
      const inner = purgeBlocks(body, used);
      if (inner) out += `${prelude}{${inner}}`;
    } else {
      const selectors = splitSelectors(prelude).filter((selector) => keepSelector(selector, used));
      if (selectors.length) out += `${selectors.join(',')}{${body}}`;
    }
  }
  return out;
}

export function purgeCss(css: string, html: string, extraClasses: Set<string>): string {
  const used = new Set([...htmlClasses(html), ...extraClasses]);
  const purged = purgeBlocks(css, used);
  // Remove @keyframes que nenhuma regra restante usa.
  return purged.replace(/@keyframes ([\w-]+)\{(?:[^{}]|\{[^{}]*\})*\}/g, (block, name: string) => (new RegExp(`animation(?:-name)?:[^;}]*\\b${name}\\b`).test(purged) ? block : ''));
}

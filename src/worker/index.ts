/**
 * Worker do site. Os arquivos estáticos (dist/) são servidos pelo Workers Static Assets; este Worker roda antes
 * (assets.run_worker_first) e só acrescenta o que o servidor de arquivos não faz:
 *   - cabeçalhos de segurança;
 *   - cache por tipo de arquivo: imutável em /assets/* (nomes com hash), um mês em /media/*, um dia em ícones e imagens
 *     sociais, uma hora nos arquivos de rastreamento e revalidação no HTML;
 *   - cabeçalho Link (preload da fonte do título e da foto de abertura) nas páginas, que a Cloudflare transforma em Early Hints;
 *   - X-Robots-Tag noindex fora do domínio de produção (PRODUCTION_HOST), como *.workers.dev e previews;
 *   - requisições Range (206/416) para o vídeo, que o iOS Safari exige, mesmo que a plataforma devolva 200.
 */

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

const IMMUTABLE = 'public, max-age=31536000, immutable';
const REVALIDATE = 'public, max-age=0, must-revalidate';

/** Cache por caminho (o primeiro que combinar vale). Só respostas 200 recebem cabeçalho de cache. */
const CACHE_RULES: [RegExp, string][] = [
  [/^\/assets\//, IMMUTABLE],
  // Vídeo e capa não têm hash no nome: um mês, com revalidação em segundo plano na semana seguinte.
  [/^\/media\//, 'public, max-age=2592000, stale-while-revalidate=604800'],
  [/^\/(og\/|favicon\.png|apple-touch-icon\.png|icon-\d+\.png|og-lcpc-gaming\.jpg|site\.webmanifest)/, 'public, max-age=86400, stale-while-revalidate=604800'],
  [/^\/(robots\.txt|sitemap\.xml|llms(-full)?\.txt|\.well-known\/)/, 'public, max-age=3600'],
];

/** Arquivo interno do build (caminho de página -> valor do cabeçalho Link). Não é servido ao público. */
const LINKS_FILE = '/_links.json';
let linksCache: Promise<Record<string, string>> | undefined;

function pageLinks(env: Env, url: URL): Promise<Record<string, string>> {
  linksCache ??= env.ASSETS.fetch(new Request(new URL(LINKS_FILE, url)))
    .then((response) => (response.ok ? (response.json() as Promise<Record<string, string>>) : {}))
    .catch(() => ({}));
  return linksCache;
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);

    // Só GET e HEAD fazem sentido num site estático.
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Método não permitido', { status: 405, headers: { Allow: 'GET, HEAD', ...SECURITY_HEADERS } });
    }

    if (url.pathname === LINKS_FILE) return new Response('Não encontrado', { status: 404, headers: SECURITY_HEADERS });

    let response = await env.ASSETS.fetch(request);
    if (request.method === 'GET') response = await applyRange(request, response);

    const result = new Response(response.body, response);
    const headers = result.headers;

    for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);
    // HSTS só faz sentido (e só vale) sobre https. Sem includeSubDomains/preload até o domínio estar definido.
    if (url.protocol === 'https:') headers.set('Strict-Transport-Security', 'max-age=31536000');

    if (response.ok) {
      const rule = CACHE_RULES.find(([pattern]) => pattern.test(url.pathname));
      if (rule) {
        headers.set('Cache-Control', rule[1]);
      } else if ((headers.get('Content-Type') ?? '').startsWith('text/html')) {
        headers.set('Cache-Control', REVALIDATE);
        const link = (await pageLinks(env, url))[url.pathname];
        if (link) headers.set('Link', link);
      }
    }

    // Qualquer host que não seja o de produção confirmado fica fora do índice, mesmo com build de produção.
    const productionHost = env.PRODUCTION_HOST.trim().toLowerCase();
    if (!productionHost || url.hostname.toLowerCase() !== productionHost) {
      headers.set('X-Robots-Tag', 'noindex, nofollow');
    }

    return result;
  },
} satisfies ExportedHandler<Env>;

/* ---------- Range ---------- */

type ByteRange = { start: number; end: number } | 'unsatisfiable' | null;

/**
 * Interpreta "bytes=a-b", "bytes=a-" e "bytes=-n" (um só intervalo). Devolve null quando o cabeçalho deve ser
 * ignorado (outra unidade ou vários intervalos, casos em que responder 200 completo é válido) e
 * "unsatisfiable" para intervalos malformados ou fora do arquivo (416).
 */
function parseRange(header: string, size: number): ByteRange {
  const match = /^\s*bytes\s*=\s*(.*)$/i.exec(header);
  if (!match) return null;
  const spec = match[1]!.trim();
  if (spec.includes(',')) return null;
  const parts = /^(\d*)\s*-\s*(\d*)$/.exec(spec);
  if (!parts || (parts[1] === '' && parts[2] === '')) return 'unsatisfiable';

  if (parts[1] === '') {
    // Sufixo: os últimos n bytes.
    const suffix = Number(parts[2]);
    if (suffix === 0) return 'unsatisfiable';
    return { start: Math.max(size - suffix, 0), end: size - 1 };
  }
  const start = Number(parts[1]);
  const end = parts[2] === '' ? size - 1 : Math.min(Number(parts[2]), size - 1);
  if (start >= size || start > end) return 'unsatisfiable';
  return { start, end };
}

/** Corta o fluxo de bytes em [start, end] sem carregar o arquivo inteiro na memória. */
function slice(body: ReadableStream<Uint8Array>, start: number, end: number): ReadableStream<Uint8Array> {
  let position = 0;
  const cutter = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      const chunkStart = position;
      position += chunk.byteLength;
      if (position <= start) return;
      controller.enqueue(chunk.subarray(Math.max(start - chunkStart, 0), Math.min(end - chunkStart + 1, chunk.byteLength)));
      // Passou do fim do intervalo: encerra e deixa de ler o resto do arquivo.
      if (position > end) controller.terminate();
    },
  });
  // FixedLengthStream faz a resposta sair com Content-Length exato, que o Safari espera em vídeo.
  const fixed = new FixedLengthStream(end - start + 1);
  body.pipeThrough(cutter).pipeTo(fixed.writable).catch(() => {});
  return fixed.readable;
}

/**
 * Garante Accept-Ranges e respostas 206/416 em arquivos que não são HTML. Se a plataforma já devolveu 206,
 * a resposta passa intacta; se devolveu 200 completo, o Worker faz o corte.
 */
async function applyRange(request: Request, response: Response): Promise<Response> {
  const type = response.headers.get('Content-Type') ?? '';
  if (response.status !== 200 || !response.body || type.startsWith('text/html')) return response;

  const rangeHeader = request.headers.get('Range');
  const plain = new Response(response.body, response);
  plain.headers.set('Accept-Ranges', 'bytes');
  if (!rangeHeader) return plain;

  // If-Range com validador diferente do ETag atual: o cliente quer o arquivo inteiro.
  const ifRange = request.headers.get('If-Range');
  if (ifRange && ifRange !== response.headers.get('ETag')) return plain;

  // O Static Assets pode não informar Content-Length ao Worker. Nesse caso o arquivo é lido uma vez para medir
  // o tamanho; arquivos estáticos têm limite de 25 MiB, então cabem na memória do Worker.
  let size = Number(plain.headers.get('Content-Length'));
  let bytes: ArrayBuffer | undefined;
  let body: ReadableStream<Uint8Array> = plain.body!;
  if (!Number.isFinite(size) || size <= 0) {
    bytes = await new Response(body).arrayBuffer();
    size = bytes.byteLength;
    body = new Response(bytes).body!;
  }

  const range = parseRange(rangeHeader, size);
  if (range === null) return new Response(body, plain);
  if (range === 'unsatisfiable') {
    await body.cancel();
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}`, 'Accept-Ranges': 'bytes', 'Content-Type': type } });
  }

  const headers = new Headers(plain.headers);
  headers.set('Content-Range', `bytes ${range.start}-${range.end}/${size}`);
  headers.set('Content-Length', String(range.end - range.start + 1));
  const part = bytes ? new Response(bytes.slice(range.start, range.end + 1)).body! : slice(body, range.start, range.end);
  return new Response(part, { status: 206, headers });
}

/**
 * Testes de comportamento no Chrome instalado. Requer o preview (wrangler dev) rodando em 127.0.0.1:4321:
 *   npm run preview   (o wrangler refaz o build antes de subir)
 *   npm run test:e2e
 * O wa.me é simulado: nenhuma mensagem sai da máquina.
 */
import { chromium } from 'playwright-core';

const BASE = 'http://127.0.0.1:4321';
const ROUTES = ['/', '/pc-gamer/', '/conserto-de-notebook/', '/conserto-de-computador/', '/servicos/', '/sobre/', '/contato/'];
const results = [];
const ok = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  [${detail}]` : ''}`);
};

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const mobile = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };
const desktop = { viewport: { width: 1440, height: 900 } };

// 1. Horizontal overflow at many widths, console errors and failed requests on every route
{
  const problems = [];
  const errors = [];
  for (const width of [320, 360, 390, 600, 768, 899, 900, 1024, 1099, 1100, 1280, 1440, 1920]) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await ctx.newPage();
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`${width} ${m.text()}`); });
    page.on('pageerror', (e) => errors.push(`${width} ${e.message}`));
    page.on('response', (r) => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
    for (const route of ROUTES) {
      await page.goto(BASE + route, { waitUntil: 'load' });
      const over = await page.evaluate(() => {
        const doc = document.documentElement.scrollWidth - document.documentElement.clientWidth;
        const off = [...document.querySelectorAll('main *, header *, footer *')].filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.right > innerWidth + 1 && getComputedStyle(el).position !== 'fixed';
        }).slice(0, 3).map((el) => `${el.tagName}.${el.className}`);
        return { doc, off };
      });
      if (over.doc > 0 || over.off.length) problems.push(`${width}${route} doc=${over.doc} ${over.off.join(',')}`);
    }
    await ctx.close();
  }
  ok('Sem rolagem horizontal em 13 larguras, 7 rotas', problems.length === 0, problems.slice(0, 6).join(' | '));
  ok('Sem erros de console nem requisições falhas', errors.length === 0, errors.slice(0, 5).join(' | '));
}

// 2. Mobile touch targets
{
  const ctx = await browser.newContext(mobile);
  const page = await ctx.newPage();
  const small = [];
  for (const route of ROUTES) {
    await page.goto(BASE + route, { waitUntil: 'load' });
    const found = await page.evaluate(() =>
      [...document.querySelectorAll('a.btn, button, summary, .link-rows a, .site-footer__nav a')]
        .filter((el) => el.offsetParent !== null)
        .map((el) => ({ t: (el.textContent || '').trim().slice(0, 30), h: Math.round(el.getBoundingClientRect().height) }))
        .filter((x) => x.h < 44));
    found.forEach((x) => small.push(`${route} "${x.t}" ${x.h}px`));
  }
  ok('Alvos de toque de pelo menos 44 px no celular', small.length === 0, small.slice(0, 6).join(' | '));
  await ctx.close();
}

// 3. Mobile menu
{
  const ctx = await browser.newContext(mobile);
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'load' });
  const summary = page.locator('.nav-mobile summary');
  const links = page.locator('.nav-mobile nav a');
  await summary.tap();
  const first = (await links.first().textContent()).trim();
  ok('Menu abre e PC Gamer é o primeiro item', (await links.first().isVisible()) && first === 'PC Gamer', first);
  const box = await page.evaluate(() => {
    const nav = document.querySelector('.nav-mobile nav').getBoundingClientRect();
    const bar = document.querySelector('.mobile-cta');
    return { navBottom: nav.bottom, barTop: bar.getBoundingClientRect().top, barHidden: getComputedStyle(bar).visibility === 'hidden' };
  });
  ok('Barra do celular não cobre o menu', box.barHidden || box.navBottom <= box.barTop, JSON.stringify(box));
  await page.keyboard.press('Escape');
  ok('Esc fecha o menu', !(await links.first().isVisible()));
  await summary.tap();
  await links.nth(1).tap();
  await page.waitForURL('**/conserto-de-notebook/');
  ok('Link do menu navega', page.url().endsWith('/conserto-de-notebook/'));
  await ctx.close();
}

// 4. Keyboard: skip link, focus ring, FAQ, desktop nav
{
  const ctx = await browser.newContext(desktop);
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await page.keyboard.press('Tab');
  const skip = await page.evaluate(() => ({ text: document.activeElement.textContent.trim(), top: document.activeElement.getBoundingClientRect().top }));
  ok('Primeiro Tab mostra "Pular para o conteúdo"', skip.text === 'Pular para o conteúdo' && skip.top >= 0, JSON.stringify(skip));
  const noRing = [];
  for (let i = 0; i < 45; i += 1) {
    await page.keyboard.press('Tab');
    const state = await page.evaluate(() => {
      const el = document.activeElement;
      const cs = getComputedStyle(el);
      const after = getComputedStyle(el, '::after');
      const visible = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2;
      const viaAfter = after.outlineStyle !== 'none' && parseFloat(after.outlineWidth) >= 2;
      return { tag: el.tagName, text: (el.textContent || '').trim().slice(0, 25), ring: visible || viaAfter };
    });
    if (!state.ring) noRing.push(`${state.tag} ${state.text}`);
  }
  ok('Foco visível em 45 paradas de teclado', noRing.length === 0, noRing.slice(0, 5).join(' | '));
  const faq = page.locator('.faq__item').first();
  await faq.locator('summary').focus();
  await page.keyboard.press('Enter');
  ok('FAQ abre pelo teclado', await faq.locator('p').isVisible());
  await page.keyboard.press('Enter');
  ok('FAQ fecha pelo teclado', !(await faq.locator('p').isVisible()));
  await ctx.close();
}

// 5. Video on demand
{
  const ctx = await browser.newContext(desktop);
  const page = await ctx.newPage();
  const mp4 = [];
  page.on('request', (r) => { if (r.url().endsWith('.mp4')) mp4.push(r.url()); });
  await page.goto(BASE + '/pc-gamer/', { waitUntil: 'networkidle' });
  ok('Vídeo não baixa antes do clique', mp4.length === 0, `${mp4.length} requisições`);
  const attrs = await page.evaluate(() => {
    const v = document.querySelector('video');
    const r = v.getBoundingClientRect();
    return { controls: v.controls, preload: v.preload, autoplay: v.autoplay, ratio: +(r.width / r.height).toFixed(3), poster: v.poster };
  });
  ok('Vídeo com controles, sem autoplay, enquadramento vertical', attrs.controls && attrs.preload === 'none' && !attrs.autoplay && Math.abs(attrs.ratio - 464 / 832) < 0.01, JSON.stringify(attrs));
  const poster = await page.request.get(attrs.poster);
  ok('Capa do vídeo disponível', poster.ok());
  const play = page.locator('[data-video-play]');
  ok('Botão de reprodução visível', await play.isVisible());
  await play.click();
  await page.waitForFunction(() => { const v = document.querySelector('video'); return v.currentTime > 0.3 && !v.paused; }, null, { timeout: 15000 });
  ok('Vídeo toca ao clicar', mp4.length > 0, `${mp4.length} requisição`);
  ok('Botão some depois do play', !(await play.isVisible()));
  const hasAudio = await page.evaluate(() => { const v = document.querySelector('video'); return { muted: v.muted, duration: Math.round(v.duration), w: v.videoWidth, h: v.videoHeight }; });
  ok('Arquivo do vídeo correto', hasAudio.w === 464 && hasAudio.h === 832 && hasAudio.duration === 26, JSON.stringify(hasAudio));
  await ctx.close();
}

// 6. Every WhatsApp CTA: number, message, analytics event, no delay
{
  const ctx = await browser.newContext(desktop);
  await ctx.route('https://wa.me/**', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: 'stub' }));
  const page = await ctx.newPage();
  const seen = new Map();
  let clicks = 0;
  let badEvents = 0;
  let badNumber = 0;
  let slowest = 0;
  for (const route of ROUTES) {
    await page.goto(BASE + route, { waitUntil: 'load' });
    const count = await page.locator('a[data-wa-cta]').count();
    for (let i = 0; i < count; i += 1) {
      const link = page.locator('a[data-wa-cta]').nth(i);
      if (!(await link.isVisible())) continue;
      await page.evaluate(() => { window.dataLayer = []; });
      const expected = await link.evaluate((el) => ({ cat: el.dataset.serviceCategory, loc: el.dataset.ctaLocation, href: el.href }));
      const start = Date.now();
      const [popup] = await Promise.all([ctx.waitForEvent('page'), link.click()]);
      await popup.waitForLoadState('domcontentloaded');
      slowest = Math.max(slowest, Date.now() - start);
      const url = new URL(popup.url());
      await popup.close();
      clicks += 1;
      if (url.pathname !== '/5511944700732' || !url.searchParams.get('text')) badNumber += 1;
      seen.set(url.searchParams.get('text'), `${route} ${expected.loc}`);
      const events = await page.evaluate(() => window.dataLayer);
      const event = events.find((e) => e.event === 'whatsapp_click');
      const keys = event ? Object.keys(event).sort().join(',') : '';
      if (!event || event.page_path !== route || event.service_category !== expected.cat || event.cta_location !== expected.loc || keys !== 'cta_location,event,page_path,service_category') {
        badEvents += 1;
        console.log('  evento incorreto', route, JSON.stringify(event), JSON.stringify(expected));
      }
    }
  }
  ok(`${clicks} CTAs abrem wa.me/5511944700732 com mensagem`, badNumber === 0 && clicks > 20, `${seen.size} mensagens distintas`);
  ok('Evento whatsapp_click correto em todos, sem dados pessoais', badEvents === 0, 'campos: event, page_path, service_category, cta_location');
  ok('Abertura sem espera do analytics', slowest < 2500, `mais lenta: ${slowest} ms em ambiente de teste`);
  console.log('\nMensagens por contexto:');
  for (const [text, where] of seen) console.log(`  ${where.padEnd(44)} ${text}`);
  console.log('');
  await ctx.close();
}

// 7. Mobile contact bar
{
  const ctx = await browser.newContext(mobile);
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await page.waitForTimeout(200);
  const atTop = await page.evaluate(() => getComputedStyle(document.querySelector('.mobile-cta')).visibility);
  ok('Barra some com o CTA do hero visível', atTop === 'hidden', atTop);
  await page.evaluate(() => document.querySelector('#conserto').scrollIntoView({ behavior: 'instant' }));
  await page.waitForTimeout(250);
  const mid = await page.evaluate(() => getComputedStyle(document.querySelector('.mobile-cta')).visibility);
  ok('Barra aparece ao rolar', mid === 'visible', mid);
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  await page.waitForTimeout(250);
  const end = await page.evaluate(() => {
    const legal = document.querySelector('.site-footer__legal').getBoundingClientRect();
    const bar = document.querySelector('.mobile-cta').getBoundingClientRect();
    return { legalBottom: Math.round(legal.bottom), barTop: Math.round(bar.top) };
  });
  ok('Barra não cobre o fim da página', end.legalBottom <= end.barTop, JSON.stringify(end));
  await ctx.close();

  const noJs = await browser.newContext({ ...mobile, javaScriptEnabled: false });
  const p2 = await noJs.newPage();
  await p2.goto(BASE + '/', { waitUntil: 'load' });
  const barNoJs = await p2.locator('.mobile-cta a').isVisible();
  ok('Sem JavaScript, a barra de contato continua visível', barNoJs);
  await p2.locator('.nav-mobile summary').tap();
  ok('Sem JavaScript, o menu abre', await p2.locator('.nav-mobile nav a').first().isVisible());
  await p2.locator('.nav-mobile summary').tap();
  await p2.locator('.faq__item summary').first().tap();
  ok('Sem JavaScript, o FAQ abre', await p2.locator('.faq__item p').first().isVisible());
  await p2.goto(BASE + '/pc-gamer/', { waitUntil: 'load' });
  ok('Sem JavaScript, o conteúdo principal está no HTML', (await p2.locator('h1').textContent()).includes('PC gamer') && await p2.locator('#diagnostico table').isVisible());
  ok('Sem JavaScript, o vídeo mantém controles nativos', await p2.locator('video[controls]').isVisible() && !(await p2.locator('[data-video-play]').isVisible()));
  await noJs.close();
}

// 8. Reduced motion, performance and image loading
{
  const ctx = await browser.newContext({ ...desktop, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'load' });
  ok('Movimento reduzido respeitado', (await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)) === 'auto');
  await ctx.close();

  for (const [name, options, expected] of [['desktop', desktop, 'hero-desktop'], ['celular', mobile, 'hero-mobile']]) {
    const c = await browser.newContext(options);
    const p = await c.newPage();
    await p.addInitScript(() => {
      window.__cls = 0;
      window.__lcp = null;
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
      new PerformanceObserver((l) => { const e = l.getEntries().at(-1); window.__lcp = { t: Math.round(e.startTime), url: e.url.split('/').pop(), el: e.element?.tagName }; }).observe({ type: 'largest-contentful-paint', buffered: true });
    });
    const bytes = { total: 0 };
    p.on('response', async (r) => { try { bytes.total += (await r.body()).length; } catch {} });
    await p.goto(BASE + '/', { waitUntil: 'networkidle' });
    await p.waitForTimeout(400);
    const m = await p.evaluate(() => ({ cls: +window.__cls.toFixed(4), lcp: window.__lcp, hero: document.querySelector('.hero img').currentSrc.split('/').pop(), lazy: [...document.images].filter((i) => i.loading === 'lazy' && i.complete && i.naturalWidth > 0).length }));
    ok(`Recorte certo no ${name}, em AVIF`, m.hero.startsWith(expected) && m.hero.endsWith('.avif'), m.hero);
    ok(`CLS baixo no ${name}`, m.cls < 0.1, `CLS ${m.cls}`);
    ok(`LCP local no ${name}`, m.lcp !== null && m.lcp.t < 2500, JSON.stringify(m.lcp));
    console.log(`      peso transferido na carga inicial (${name}): ${Math.round(bytes.total / 1024)} KB`);
    await c.close();
  }
}

// 9. Links
{
  const ctx = await browser.newContext(desktop);
  const page = await ctx.newPage();
  await page.goto(BASE + '/contato/', { waitUntil: 'load' });
  const mail = await page.locator('main a[href^="mailto:"]').first().getAttribute('href');
  ok('E-mail clicável', mail === 'mailto:contato@lcpcgaming.com', mail);
  const directions = new URL(await page.locator('main a:has-text("Como chegar")').first().getAttribute('href'));
  ok('Como chegar com o endereço oficial', directions.hostname === 'www.google.com' && directions.searchParams.get('destination') === 'Rua Maria Pais de Barros, 329, Vila Marari, São Paulo - SP, 04402-140', directions.searchParams.get('destination'));
  const resp = await page.goto(BASE + '/nao-existe/');
  ok('Rota inexistente responde 404', resp.status() === 404 && (await page.locator('h1').textContent()).includes('não existe'), String(resp.status()));
  await page.goto(BASE + '/conserto-de-notebook/#carregamento', { waitUntil: 'load' });
  await page.waitForTimeout(600);
  const target = await page.evaluate(() => { const r = document.querySelector('#carregamento').getBoundingClientRect(); return { top: Math.round(r.top), height: innerHeight }; });
  ok('Âncora abaixo do cabeçalho fixo', target.top >= 72 && target.top < target.height, JSON.stringify(target));
  await ctx.close();
}

// 10. Contrast of the design tokens
{
  const lum = (hex) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
  const pairs = [
    ['texto / grafite', '#f4f5f6', '#1d2024', 4.5], ['texto / grafite-2', '#f4f5f6', '#262a2f', 4.5], ['texto / grafite-3', '#f4f5f6', '#32373d', 4.5],
    ['apoio / grafite', '#c2c8cf', '#1d2024', 4.5], ['apoio / grafite-2', '#c2c8cf', '#262a2f', 4.5], ['apoio / grafite-3', '#c2c8cf', '#32373d', 4.5],
    ['apoio / rodapé', '#c2c8cf', '#15171a', 4.5], ['tinta / laranja', '#15171a', '#fa6a0a', 4.5], ['tinta / laranja hover', '#15171a', '#ff7d26', 4.5],
    ['branco / botão escuro', '#ffffff', '#15171a', 4.5], ['laranja forte / grafite (título)', '#ff7d26', '#1d2024', 3], ['laranja / grafite-2 (marcador)', '#fa6a0a', '#262a2f', 3],
    ['borda de controle / grafite', '#868e97', '#1d2024', 3], ['borda de controle / grafite-2', '#868e97', '#262a2f', 3],
  ];
  const bad = pairs.filter(([, a, b, min]) => ratio(a, b) < min);
  ok('Contraste AA em 14 combinações de cor', bad.length === 0, pairs.map(([n, a, b]) => `${n} ${ratio(a, b).toFixed(1)}`).join('; '));
}

// 11. Range / 206: o iOS Safari não reproduz mp4 sem suporte a byte-range
{
  const ctx = await browser.newContext(desktop);
  const first = await ctx.request.get(BASE + '/media/video-pc-gamer.mp4', { headers: { Range: 'bytes=0-99' } });
  const body = await first.body();
  ok('Range responde 206 com Content-Range e 100 bytes', first.status() === 206 && /^bytes 0-99\/\d+$/.test(first.headers()['content-range'] ?? '') && body.length === 100 && first.headers()['accept-ranges'] === 'bytes', `${first.status()} ${first.headers()['content-range']} ${body.length} bytes`);
  const total = Number((first.headers()['content-range'] ?? '').split('/')[1]);
  const tail = await ctx.request.get(BASE + '/media/video-pc-gamer.mp4', { headers: { Range: 'bytes=-10' } });
  ok('Range de sufixo devolve os 10 últimos bytes', tail.status() === 206 && (await tail.body()).length === 10 && tail.headers()['content-range'] === `bytes ${total - 10}-${total - 1}/${total}`, tail.headers()['content-range']);
  const bad = await ctx.request.get(BASE + '/media/video-pc-gamer.mp4', { headers: { Range: `bytes=${total + 1000}-` } });
  ok('Range fora do arquivo responde 416', bad.status() === 416 && bad.headers()['content-range'] === `bytes */${total}`, String(bad.status()));
  const plain = await ctx.request.get(BASE + '/media/video-pc-gamer.mp4');
  ok('Sem Range, o vídeo inteiro responde 200', plain.status() === 200 && (await plain.body()).length === total, String(plain.status()));
  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passaram.`);
process.exit(failed.length ? 1 : 0);

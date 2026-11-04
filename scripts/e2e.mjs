/**
 * Testes de comportamento no Chrome instalado. Requer o preview (wrangler dev) rodando em 127.0.0.1:4321:
 *   npm run preview   (o wrangler refaz o build antes de subir)
 *   npm run test:e2e
 * O wa.me é simulado: nenhuma mensagem sai da máquina.
 */
import { chromium } from 'playwright-core';
import { symptomSets } from '../src/data/symptoms.ts';
import { whatsappContexts } from '../src/data/whatsapp.ts';
import { xrayParts } from '../src/data/xray.ts';

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
        // Elementos cortados por um ancestral com overflow oculto (faixa em movimento, trilhas de circuito) não criam rolagem.
        const clipped = (el) => {
          for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
            const cs = getComputedStyle(node);
            if (['hidden', 'clip'].includes(cs.overflowX) && node.getBoundingClientRect().right <= innerWidth + 1) return true;
          }
          return false;
        };
        const off = [...document.querySelectorAll('main *, header *, footer *')].filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.right > innerWidth + 1 && getComputedStyle(el).position !== 'fixed' && !clipped(el);
        }).slice(0, 3).map((el) => `${el.tagName}.${String(el.className.baseVal ?? el.className)}`);
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
      [...document.querySelectorAll('a.btn, button, summary, .sx__tab, .sx__choices a, .index-chips a, .tile__sub a, .tile__actions .text-link, .sx__links .text-link, .xray__item a, .jump a, .site-footer__nav a')]
        .filter((el) => el.offsetParent !== null)
        // CTAs (botões de WhatsApp e abas): 48 px. Demais alvos: 44 px.
        .map((el) => ({ t: (el.textContent || '').trim().slice(0, 30), h: Math.round(el.getBoundingClientRect().height), min: el.matches('a.btn, button, .sx__tab') ? 48 : 44 }))
        .filter((x) => x.h < x.min));
    found.forEach((x) => small.push(`${route} "${x.t}" ${x.h}px`));
  }
  ok('Alvos de toque no celular: CTAs com 48 px ou mais, demais com 44 px ou mais', small.length === 0, small.slice(0, 6).join(' | '));
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
  await page.evaluate(() => document.querySelector('#sintomas').scrollIntoView({ behavior: 'instant' }));
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
  ok('Sem JavaScript, o conteúdo principal está no HTML', (await p2.locator('h1').textContent()).includes('PC gamer') && (await p2.locator('#diagnostico .sx__panel').count()) === symptomSets.gamer.length);
  const visiblePanels = await p2.locator('#diagnostico .sx__panel:visible').count();
  ok('Sem JavaScript, todas as respostas do seletor de sintomas estão legíveis', visiblePanels === symptomSets.gamer.length, `${visiblePanels} painéis visíveis`);
  ok('Sem JavaScript, o vídeo mantém controles nativos', await p2.locator('video[controls]').isVisible() && !(await p2.locator('[data-video-play]').isVisible()));
  await noJs.close();
}

// 8. Reduced motion, performance and image loading
{
  const ctx = await browser.newContext({ ...desktop, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'load' });
  ok('Movimento reduzido respeitado', (await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)) === 'auto');
  await page.waitForTimeout(1200);
  const calm = await page.evaluate(() => ({
    running: document.getAnimations().filter((a) => a.playState === 'running').length,
    ticker: getComputedStyle(document.querySelector('.ticker__track')).animationName,
    clone: getComputedStyle(document.querySelector('.ticker__list[aria-hidden]')).display,
    scan: getComputedStyle(document.querySelector('.hero__media'), '::after').animationName,
  }));
  ok('Movimento reduzido para de verdade: nenhuma animação rodando, faixa estática sem cópia', calm.running === 0 && calm.ticker === 'none' && calm.clone === 'none' && calm.scan === 'none', JSON.stringify(calm));
  await page.goto(BASE + '/pc-gamer/', { waitUntil: 'load' });
  await page.waitForTimeout(600);
  const calmGamer = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length);
  ok('Movimento reduzido em /pc-gamer/: nenhuma animação rodando', calmGamer === 0, String(calmGamer));
  await ctx.close();

  const live = await browser.newContext(desktop);
  const lp = await live.newPage();
  await lp.goto(BASE + '/', { waitUntil: 'load' });
  await lp.waitForTimeout(500);
  const motion = await lp.evaluate(() => {
    const animations = document.getAnimations();
    const names = [...new Set(animations.map((a) => a.animationName).filter(Boolean))];
    // Só transform e opacity são animados.
    const props = new Set();
    for (const a of animations) for (const frame of a.effect.getKeyframes()) for (const key of Object.keys(frame)) if (!['offset', 'easing', 'composite', 'computedOffset'].includes(key)) props.add(key);
    return { names, props: [...props], tickerCopies: document.querySelectorAll('.ticker__list').length, hiddenCopies: document.querySelectorAll('.ticker__list[aria-hidden="true"]').length };
  });
  ok('Com movimento permitido há animação (faixa e abertura) e só de transform e opacity', motion.names.includes('ticker') && motion.props.every((prop) => ['transform', 'opacity'].includes(prop)), JSON.stringify(motion));
  ok('Faixa de serviços: a cópia para a rolagem infinita fica oculta para leitores de tela', motion.tickerCopies === 2 && motion.hiddenCopies === 1);
  await live.close();

  for (const [name, options, expected] of [['desktop', desktop, 'pc-gamer-gabinete-branco-rgb-vila-marari'], ['celular', mobile, 'pc-gamer-gabinete-rgb-recorte-celular']]) {
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
    ['azul / grafite (dados)', '#2fa2ff', '#1d2024', 4.5], ['azul / marinho (tela de sintomas)', '#2fa2ff', '#13253d', 4.5], ['apoio / marinho', '#c2c8cf', '#13253d', 4.5],
    ['texto / marinho', '#f4f5f6', '#0d1a2c', 4.5], ['branco / azul forte', '#ffffff', '#0060f0', 4.5], ['tinta / laranja (faixa em movimento)', '#15171a', '#fa6a0a', 4.5],
    ['laranja / marinho (marcador)', '#fa6a0a', '#13253d', 3], ['azul / grafite-2 (marcador)', '#2fa2ff', '#262a2f', 3],
  ];
  const bad = pairs.filter(([, a, b, min]) => ratio(a, b) < min);
  ok('Contraste AA em 22 combinações de cor', bad.length === 0, pairs.map(([n, a, b]) => `${n} ${ratio(a, b).toFixed(1)}`).join('; '));
}


// 12. Raio-x do gabinete: pontos sobre a foto real, rótulos reais, trilhas ligadas aos pontos
{
  const partCount = xrayParts.length;
  const dotCount = xrayParts.reduce((sum, part) => sum + part.points.length, 0);
  for (const [name, options] of [['1100', { viewport: { width: 1100, height: 900 } }], ['1440', desktop], ['1920', { viewport: { width: 1920, height: 1080 } }], ['celular 390', mobile], ['celular 320', { viewport: { width: 320, height: 700 }, isMobile: true, hasTouch: true }]]) {
    const ctx = await browser.newContext(options);
    const page = await ctx.newPage();
    await page.goto(BASE + '/', { waitUntil: 'load' });
    await page.evaluate(async () => { document.querySelectorAll('img[loading=lazy]').forEach((i) => (i.loading = 'eager')); await Promise.all([...document.images].map((i) => i.decode().catch(() => {}))); });
    const links = page.locator('.xray__item a');
    const hrefs = await links.evaluateAll((els) => els.map((el) => el.getAttribute('href')));
    const texts = await links.evaluateAll((els) => els.map((el) => el.textContent.trim()));
    ok(`Raio-x (${name}): ${partCount} componentes, cada um é um link HTML para o serviço, com texto descritivo`, hrefs.length === partCount && hrefs.every((href, i) => href === xrayParts[i].href) && texts.every((text, i) => text.includes(xrayParts[i].name) && text.includes(xrayParts[i].service)), hrefs.join(' '));
    const geometry = await page.evaluate(() => {
      const photo = document.querySelector('.xray__photo').getBoundingClientRect();
      const dots = [...document.querySelectorAll('.xray__dot')].map((d) => { const r = d.getBoundingClientRect(); return { i: Number(d.dataset.i), x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
      const inside = dots.every((d) => d.x > photo.left && d.x < photo.right && d.y > photo.top && d.y < photo.bottom);
      const svg = document.querySelector('.xray__lines');
      let linesOk = true;
      let worst = 0;
      const desktopLayout = getComputedStyle(svg).display !== 'none';
      if (desktopLayout) {
        const box = svg.getBoundingClientRect();
        const [, , vw, vh] = svg.getAttribute('viewBox').split(' ').map(Number);
        for (const line of svg.querySelectorAll('polyline')) {
          const pts = line.getAttribute('points').trim().split(/\s+/).map((p) => p.split(',').map(Number));
          const end = pts[pts.length - 1];
          const ex = box.left + (end[0] / vw) * box.width;
          const ey = box.top + (end[1] / vh) * box.height;
          const dot = dots.filter((d) => d.i === Number(line.dataset.i)).sort((a, b) => Math.hypot(a.x - ex, a.y - ey) - Math.hypot(b.x - ex, b.y - ey))[0];
          const dist = Math.hypot(dot.x - ex, dot.y - ey);
          worst = Math.max(worst, dist);
          if (dist > 4) linesOk = false;
        }
      }
      const items = [...document.querySelectorAll('.xray__item')].map((el) => el.getBoundingClientRect());
      const stage = document.querySelector('.xray__stage').getBoundingClientRect();
      let overlap = false;
      if (desktopLayout) {
        for (let a = 0; a < items.length; a += 1) for (let b = a + 1; b < items.length; b += 1) {
          const sep = items[a].right <= items[b].left + 1 || items[b].right <= items[a].left + 1 || items[a].bottom <= items[b].top + 1 || items[b].bottom <= items[a].top + 1;
          if (!sep) overlap = true;
        }
        if (!items.every((r) => r.left >= stage.left - 1 && r.right <= stage.right + 1)) overlap = true;
      }
      const imgLoaded = document.querySelector('.xray__img').naturalWidth > 0;
      return { count: dots.length, inside, desktopLayout, linesOk, worst: +worst.toFixed(1), overlap, imgLoaded, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    ok(`Raio-x (${name}): ${dotCount} pontos dentro da foto, ${geometry.desktopLayout ? 'trilhas terminam nos pontos (erro máx. ' + geometry.worst + ' px), rótulos sem sobreposição' : 'lista numerada abaixo da foto'}`, geometry.count === dotCount && geometry.inside && geometry.linesOk && !geometry.overlap && geometry.imgLoaded && geometry.overflow <= 0, JSON.stringify(geometry));
    if (name === '1440') {
      await page.locator('.xray__item a').nth(2).focus();
      const focus = await page.evaluate(() => {
        const dot = getComputedStyle(document.querySelector('.xray__dot[data-i="3"] b')).backgroundColor;
        const line = getComputedStyle(document.querySelector('.xray__lines polyline[data-i="3"]')).strokeWidth;
        const ring = getComputedStyle(document.activeElement).outlineStyle;
        return { dot, line, ring };
      });
      ok('Raio-x: o foco de teclado no rótulo acende o ponto e a trilha, com anel de foco visível', focus.dot === 'rgb(255, 255, 255)' && parseFloat(focus.line) >= 3 && focus.ring !== 'none', JSON.stringify(focus));
      await page.keyboard.press('Tab');
      const next = await page.evaluate(() => document.activeElement.getAttribute('href'));
      ok('Raio-x: Tab percorre os rótulos na ordem da lista', next === xrayParts[3].href, next);
      await Promise.all([page.waitForURL('**/servicos/**'), page.locator('.xray__item a').first().click()]);
      const anchorOk = await page.evaluate(() => !!document.getElementById(location.hash.slice(1)));
      ok('Raio-x: o link do primeiro componente abre o serviço, e a âncora existe', page.url().endsWith('/servicos/#desktops') && anchorOk, page.url());
    }
    await ctx.close();
  }
}

// 13. Seletor de sintomas: mouse, teclado, leitor de tela, âncora de outras páginas e mensagem de WhatsApp de cada opção
{
  const ctx = await browser.newContext(desktop);
  await ctx.route('https://wa.me/**', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: 'stub' }));
  const page = await ctx.newPage();
  const sets = [['/', 'geral'], ['/conserto-de-computador/', 'computador'], ['/pc-gamer/', 'gamer']];
  let wrong = [];
  let optionCount = 0;
  for (const [route, setName] of sets) {
    await page.goto(BASE + route, { waitUntil: 'load' });
    const list = symptomSets[setName];
    const roles = await page.evaluate(() => ({
      tablist: !!document.querySelector('[role=tablist]'),
      tabs: document.querySelectorAll('[role=tab]').length,
      panels: document.querySelectorAll('[role=tabpanel]').length,
      selected: document.querySelectorAll('[role=tab][aria-selected=true]').length,
      visible: [...document.querySelectorAll('.sx__panel')].filter((p) => !p.hidden).length,
      labelled: [...document.querySelectorAll('[role=tabpanel]')].every((p) => document.getElementById(p.getAttribute('aria-labelledby'))?.getAttribute('aria-controls') === p.id),
    }));
    ok(`Sintomas ${route}: papéis ARIA de abas, um painel visível e rótulos ligados`, roles.tablist && roles.tabs === list.length && roles.panels === list.length && roles.selected === 1 && roles.visible === 1 && roles.labelled, JSON.stringify(roles));
    for (const item of list) {
      optionCount += 1;
      await page.locator(`[role=tab]`, { hasText: item.label }).first().click();
      const shown = await page.evaluate((id) => [...document.querySelectorAll('.sx__panel')].filter((p) => !p.hidden).map((p) => p.id), item.id);
      if (shown.length !== 1 || shown[0] !== item.id) wrong.push(`${route} ${item.id} mostrou ${shown}`);
      const panel = page.locator(`#${item.id}`);
      const text = await panel.innerText();
      for (const entry of [...item.evaluated, ...item.send]) if (!text.includes(entry)) wrong.push(`${item.id} sem "${entry}"`);
      for (const link of item.links) if (!(await panel.locator(`a[href="${link.href}"]`).count())) wrong.push(`${item.id} sem link ${link.href}`);
      const [popup] = await Promise.all([ctx.waitForEvent('page'), panel.locator('a[data-wa-cta]').click()]);
      await popup.waitForLoadState('domcontentloaded');
      const url = new URL(popup.url());
      await popup.close();
      if (url.pathname !== '/5511944700732' || url.searchParams.get('text') !== whatsappContexts[item.context].message) wrong.push(`${item.id} abriu a mensagem errada: ${url.searchParams.get('text')}`);
    }
  }
  ok(`Sintomas: ${optionCount} opções mostram avaliação, o que enviar, links internos e abrem a mensagem de WhatsApp certa (wa.me/5511944700732)`, wrong.length === 0, wrong.slice(0, 4).join(' | '));

  await page.goto(BASE + '/', { waitUntil: 'load' });
  const tabs = page.locator('[role=tab]');
  await tabs.first().focus();
  await page.keyboard.press('ArrowRight');
  const afterRight = await page.evaluate(() => ({ focus: document.activeElement.textContent, selected: document.querySelector('[role=tab][aria-selected=true]').textContent }));
  await page.keyboard.press('End');
  const afterEnd = await page.evaluate(() => document.activeElement.textContent);
  await page.keyboard.press('ArrowRight');
  const wrap = await page.evaluate(() => document.activeElement.textContent);
  await page.keyboard.press('Home');
  const afterHome = await page.evaluate(() => ({ focus: document.activeElement.textContent, tabindex: [...document.querySelectorAll('[role=tab]')].map((t) => t.tabIndex).join(',') }));
  ok('Sintomas: setas, Home e End movem e selecionam a aba (foco e seleção juntos, tabindex rotativo)', afterRight.focus === symptomSets.geral[1].label && afterRight.selected === afterRight.focus && afterEnd === 'Não carrega' && wrap === 'Não liga' && afterHome.focus === 'Não liga' && afterHome.tabindex === '0,-1,-1,-1,-1,-1', JSON.stringify({ afterRight, afterEnd, wrap, afterHome }));
  await page.keyboard.press('Tab');
  const tabOut = await page.evaluate(() => document.activeElement.closest('.sx__panel')?.id);
  ok('Sintomas: Tab sai da lista de abas direto para o painel escolhido', tabOut === symptomSets.geral[0].id, String(tabOut));

  await page.goto(BASE + '/conserto-de-computador/#sem-video', { waitUntil: 'load' });
  await page.waitForTimeout(300);
  const fromHash = await page.evaluate(() => ({ shown: [...document.querySelectorAll('.sx__panel')].filter((p) => !p.hidden).map((p) => p.id), top: Math.round(document.getElementById('sem-video').getBoundingClientRect().top) }));
  ok('Sintomas: a âncora #sem-video (link de outra página) abre o painel certo e leva a tela até ele', fromHash.shown.join() === 'sem-video' && fromHash.top >= 0 && fromHash.top < 700, JSON.stringify(fromHash));
  await ctx.close();

  const noJs = await browser.newContext({ ...desktop, javaScriptEnabled: false });
  const p2 = await noJs.newPage();
  await p2.goto(BASE + '/', { waitUntil: 'load' });
  const all = await p2.locator('.sx__panel:visible').count();
  const ctas = await p2.locator('.sx__panel:visible a[data-wa-cta]').count();
  ok('Sintomas sem JavaScript: as 6 respostas ficam visíveis em sequência, cada uma com seu botão de WhatsApp', all === 6 && ctas === 6, `${all} painéis, ${ctas} botões`);
  await p2.locator('.sx__choices a', { hasText: 'Tela quebrada' }).click();
  ok('Sintomas sem JavaScript: os botões da lista são âncoras para cada resposta', p2.url().endsWith('#sintoma-tela-quebrada'));
  await noJs.close();
}

// 14. Mapa sob demanda: nenhuma requisição a terceiros antes do clique
{
  for (const route of ['/contato/', '/']) {
    const ctx = await browser.newContext(desktop);
    const requests = [];
    await ctx.route(/google\.com|gstatic\.com|googleapis\.com/, (r) => { requests.push(r.request().url()); return r.fulfill({ status: 200, contentType: 'text/html', body: '<p>mapa simulado</p>' }); });
    const page = await ctx.newPage();
    await page.goto(BASE + route, { waitUntil: 'networkidle' });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    ok(`Mapa ${route}: nenhuma requisição ao Google antes do clique, nem iframe`, requests.length === 0 && (await page.locator('iframe').count()) === 0, requests.join(' '));
    const button = page.locator('[data-map-load]');
    ok(`Mapa ${route}: botão de carregar visível e link "Abrir no Google Maps" sempre presente`, (await button.isVisible()) && (await page.locator('.map a', { hasText: 'Abrir no Google Maps' }).count()) === 1);
    await button.click();
    await page.waitForSelector('iframe.map__frame');
    const src = await page.locator('iframe.map__frame').getAttribute('src');
    const url = new URL(src);
    ok(`Mapa ${route}: depois do clique carrega google.com/maps?q=...&output=embed, sem chave de API`, url.origin === 'https://www.google.com' && url.pathname === '/maps' && url.searchParams.get('output') === 'embed' && url.searchParams.get('q').includes('Rua Maria Pais de Barros, 329') && !url.searchParams.has('key') && requests.length >= 1, src);
    ok(`Mapa ${route}: o iframe tem título para leitores de tela`, ((await page.locator('iframe.map__frame').getAttribute('title')) ?? '').includes('Mapa'));
    await ctx.close();
  }
  const noJs = await browser.newContext({ ...desktop, javaScriptEnabled: false });
  const p2 = await noJs.newPage();
  await p2.goto(BASE + '/contato/', { waitUntil: 'load' });
  ok('Mapa sem JavaScript: só o link para o Google Maps, sem botão morto', (await p2.locator('[data-map-load]').isVisible()) === false && (await p2.locator('.map a', { hasText: 'Abrir no Google Maps' }).isVisible()));
  await noJs.close();
}

// 15. Imagens: marcador de cor inline nas fotos preguiçosas, dimensões reservadas e uma H1 por página
{
  const ctx = await browser.newContext(desktop);
  const page = await ctx.newPage();
  const problems = [];
  for (const route of ROUTES) {
    await page.goto(BASE + route, { waitUntil: 'load' });
    const info = await page.evaluate(() => {
      const lazy = [...document.querySelectorAll('img[loading=lazy]:not(.logo)')];
      return {
        lazy: lazy.length,
        noPlaceholder: lazy.filter((i) => !/url\(data:image\/webp;base64,/.test(i.getAttribute('style') || '')).length,
        noSize: [...document.images].filter((i) => !i.getAttribute('width') || !i.getAttribute('height')).length,
        h1: document.querySelectorAll('h1').length,
      };
    });
    if (info.noPlaceholder || info.noSize || info.h1 !== 1) problems.push(`${route} ${JSON.stringify(info)}`);
  }
  ok('Fotos preguiçosas com miniatura inline, todas as imagens com largura e altura, uma H1 por página', problems.length === 0, problems.join(' | '));
  await ctx.close();
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

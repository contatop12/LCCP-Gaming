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
// O GTM real nunca carrega nos testes: o contêiner seria executado e mandaria visitas falsas ao Analytics.
// gtm.js e os coletores do Google respondem vazio, sem erro de rede, em todo contexto criado aqui.
const GOOGLE_TAGS = /googletagmanager\.com|google-analytics\.com|analytics\.google\.com|doubleclick\.net/;
const newContext = browser.newContext.bind(browser);
browser.newContext = async (options) => {
  const ctx = await newContext(options);
  await ctx.route(GOOGLE_TAGS, (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  return ctx;
};
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
        // Elementos cortados por um ancestral com overflow oculto ou que rola por dentro (trilhas de circuito, faixas que rolam no celular) não criam rolagem da página.
        const clipped = (el) => {
          for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
            const cs = getComputedStyle(node);
            if (['hidden', 'clip', 'auto', 'scroll'].includes(cs.overflowX) && node.getBoundingClientRect().right <= innerWidth + 1) return true;
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
  ok('Menu abre e Conserto de notebook é o primeiro item (decisão do cliente: notebook antes de PC Gamer)', (await links.first().isVisible()) && first === 'Conserto de notebook', first);
  const order = (await links.allTextContents()).map((t) => t.trim()).join(' > ');
  ok('Ordem do menu do celular: notebook, computador, PC Gamer, serviços, sobre, contato', order === 'Conserto de notebook > Conserto de computador > PC Gamer > Serviços > Sobre > Contato', order);
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
  await page.waitForURL('**/conserto-de-computador/');
  ok('Link do menu navega', page.url().endsWith('/conserto-de-computador/'));
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

// 5. Video on demand (revisão 2: capa leve e <video> criado só depois do clique)
{
  const ctx = await browser.newContext(desktop);
  const page = await ctx.newPage();
  const media = [];
  const posters = [];
  page.on('request', (r) => {
    if (/\.(mp4|webm)(\?|$)/.test(r.url())) media.push(r.url());
    if (/video-pc-gamer-capa/.test(r.url())) posters.push(r.url());
  });
  await page.goto(BASE + '/pc-gamer/', { waitUntil: 'networkidle' });
  ok('Vídeo: nenhuma requisição ao arquivo nem à capa JPEG antes do clique', media.length === 0 && posters.length === 0, `${media.length} vídeo, ${posters.length} capa`);
  ok('Vídeo: não existe <video> na página antes do clique (só no <noscript>)', (await page.locator('video').count()) === 0);
  const facadeImg = page.locator('.video__facade img');
  const facadeBefore = await facadeImg.evaluate((img) => ({ complete: img.complete && img.naturalWidth > 0, lazy: img.loading }));
  ok('Capa do vídeo: imagem preguiçosa, ainda não baixada longe da tela', facadeBefore.lazy === 'lazy' && !facadeBefore.complete, JSON.stringify(facadeBefore));
  await page.locator('.video__facade').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => { const i = document.querySelector('.video__facade img'); return i.complete && i.naturalWidth > 0; }, null, { timeout: 10000 });
  ok('Capa do vídeo: carrega em AVIF ou WebP ao chegar perto, sem baixar o vídeo', /\.(avif|webp)$/.test(await facadeImg.evaluate((i) => i.currentSrc)) && media.length === 0);
  const play = page.locator('[data-video-open]');
  ok('Botão de reprodução visível, com nome acessível', (await play.isVisible()) && /Assistir ao vídeo/.test((await play.getAttribute('aria-label')) ?? ''));
  await play.click();
  await page.waitForFunction(() => { const v = document.querySelector('video'); return v && v.currentTime > 0.3 && !v.paused; }, null, { timeout: 20000 });
  const attrs = await page.evaluate(() => {
    const v = document.querySelector('video');
    const r = v.getBoundingClientRect();
    return { controls: v.controls, autoplayAttr: v.hasAttribute('autoplay'), ratio: +(r.width / r.height).toFixed(3), src: v.currentSrc.split('/').pop(), duration: Math.round(v.duration), w: v.videoWidth, h: v.videoHeight };
  });
  ok('Vídeo toca depois do clique, com controles e enquadramento vertical', attrs.controls && !attrs.autoplayAttr && Math.abs(attrs.ratio - 464 / 832) < 0.02 && media.length > 0, JSON.stringify(attrs));
  ok('Vídeo escolhe a fonte moderna (WebM AV1) e tem o arquivo correto', attrs.src.endsWith('.webm') && attrs.w === 464 && attrs.h === 832 && attrs.duration === 26, JSON.stringify(attrs));
  ok('Capa JPEG continua sem ser baixada depois do clique', posters.length === 0);
  await ctx.close();
  // Navegador que não decodifica o WebM (a requisição falha): o próximo <source>, o MP4 H.264, entra no lugar.
  const old = await browser.newContext(desktop);
  await old.route('**/*.webm', (route) => route.abort());
  const op = await old.newPage();
  await op.goto(BASE + '/pc-gamer/', { waitUntil: 'load' });
  await op.locator('[data-video-open]').click();
  await op.waitForFunction(() => { const v = document.querySelector('video'); return v && v.currentSrc && v.readyState > 0; }, null, { timeout: 20000 });
  ok('Sem WebM/AV1 o vídeo cai no MP4 H.264', (await op.evaluate(() => document.querySelector('video').currentSrc)).endsWith('.mp4'));
  await old.close();
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
  // Em #trabalho não há botão principal na tela (no seletor de sintomas há, e a barra se esconde para não repetir o botão).
  await page.evaluate(() => document.querySelector('#trabalho').scrollIntoView({ behavior: 'instant' }));
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
  ok('Sem JavaScript, o vídeo mantém controles nativos (player do <noscript>) e a capa interativa fica oculta', await p2.locator('video[controls]').isVisible() && !(await p2.locator('[data-video-open]').isVisible()));
  await noJs.close();
}

// 8. Reduced motion, performance and image loading
{
  const ctx = await browser.newContext({ ...desktop, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'load' });
  ok('Movimento reduzido respeitado', (await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)) === 'auto');
  await page.waitForTimeout(1200);
  const calm = await page.evaluate(() => {
    const animated = [...document.querySelectorAll('*')].filter((el) => ['', '::before', '::after'].some((pseudo) => getComputedStyle(el, pseudo).animationName !== 'none'));
    return {
      running: document.getAnimations().filter((a) => a.playState === 'running').length,
      animatedElements: animated.length,
      hero: getComputedStyle(document.querySelector('.hero__media img')).animationName,
      photo: getComputedStyle(document.querySelector('.tile__img')).animationName,
      photoFilter: getComputedStyle(document.querySelector('.tile__img')).filter,
      trace: getComputedStyle(document.querySelector('.t-signal')).display,
      transition: getComputedStyle(document.querySelector('.tile__img')).transitionDuration,
    };
  });
  ok('Movimento reduzido para de verdade: nenhuma animação nem transição, fotos em cor natural, sem sinal na trilha', calm.running === 0 && calm.animatedElements === 0 && calm.hero === 'none' && calm.photo === 'none' && calm.photoFilter === 'none' && calm.trace === 'none' && /^0s/.test(calm.transition), JSON.stringify(calm));
  const vt = await page.evaluate(() => [...document.styleSheets].flatMap((sheet) => [...sheet.cssRules]).flatMap((rule) => (rule.cssRules ? (!rule.media || matchMedia(rule.media.mediaText).matches ? [...rule.cssRules] : []) : [rule])).filter((rule) => rule.constructor.name === 'CSSViewTransitionRule' || /^@view-transition/.test(rule.cssText)).length);
  ok('Movimento reduzido: nenhuma regra de View Transition ativa', vt === 0, String(vt));
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
    const props = new Set();
    for (const a of animations) for (const frame of a.effect.getKeyframes()) for (const key of Object.keys(frame)) if (!['offset', 'easing', 'composite', 'computedOffset'].includes(key)) props.add(key);
    return { names, props: [...props], supportsScroll: CSS.supports('animation-timeline: view()') };
  });
  ok('Com movimento permitido há animação (abertura, fotos, trilha) e só de transform, opacity e filter', motion.names.includes('boot') && motion.names.includes('power-on') && motion.props.every((prop) => ['transform', 'opacity', 'filter'].includes(prop)), JSON.stringify(motion));
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
    ['laranja / grafite (links e marcadores)', '#ff7d26', '#1d2024', 4.5], ['laranja / grafite-2', '#ff7d26', '#262a2f', 4.5], ['apoio / ink', '#c2c8cf', '#15171a', 4.5], ['texto / ink', '#f4f5f6', '#15171a', 4.5], ['laranja / ink (marcador)', '#fa6a0a', '#15171a', 3],
  ];
  const bad = pairs.filter(([, a, b, min]) => ratio(a, b) < min);
  ok('Contraste AA nas combinações de cor da paleta', bad.length === 0, pairs.map(([n, a, b]) => `${n} ${ratio(a, b).toFixed(1)}`).join('; '));
}


// 12. Raio-x do gabinete: pontos sobre a foto real, rótulos reais, trilhas ligadas aos pontos
{
  const partCount = xrayParts.length;
  const dotCount = xrayParts.reduce((sum, part) => sum + part.points.length, 0);
  for (const [name, options] of [['1100', { viewport: { width: 1100, height: 900 } }], ['1440', desktop], ['1920', { viewport: { width: 1920, height: 1080 } }], ['celular 390', mobile], ['celular 320', { viewport: { width: 320, height: 700 }, isMobile: true, hasTouch: true }]]) {
    const ctx = await browser.newContext(options);
    const page = await ctx.newPage();
    await page.goto(BASE + '/pc-gamer/', { waitUntil: 'load' });
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
        noPlaceholder: lazy.filter((i) => !/background-color:#[0-9a-f]{6}/.test(i.getAttribute('style') || '') && !i.closest('.video__facade')).length,
        noSize: [...document.images].filter((i) => !i.getAttribute('width') || !i.getAttribute('height')).length,
        h1: document.querySelectorAll('h1').length,
      };
    });
    if (info.noPlaceholder || info.noSize || info.h1 !== 1) problems.push(`${route} ${JSON.stringify(info)}`);
  }
  ok('Fotos preguiçosas com cor de reserva inline, todas as imagens com largura e altura, uma H1 por página', problems.length === 0, problems.join(' | '));
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

// 16. Revisão 2: Range também no WebM, cabeçalhos de cache e Link
{
  const ctx = await browser.newContext();
  const webm = await ctx.request.get(BASE + '/media/video-pc-gamer.webm', { headers: { Range: 'bytes=0-99' } });
  ok('Range responde 206 também no WebM, com Content-Type video/webm', webm.status() === 206 && (await webm.body()).length === 100 && webm.headers()['content-type'] === 'video/webm', `${webm.status()} ${webm.headers()['content-type']}`);
  const cache = {};
  for (const path of ['/', '/robots.txt', '/llms.txt', '/llms-full.txt', '/sitemap.xml', '/.well-known/security.txt', '/favicon.png', '/media/video-pc-gamer.webm']) cache[path] = (await ctx.request.get(BASE + path)).headers()['cache-control'];
  const home = await ctx.request.get(BASE + '/');
  const assetUrl = (await home.text()).match(/\/assets\/img\/[^"\s,]+\.avif/)?.[0];
  cache.asset = (await ctx.request.get(BASE + assetUrl)).headers()['cache-control'];
  ok('Cache-Control por tipo: HTML revalida, /assets imutável, mídia e ícones com prazo, rastreamento por 1 hora', /must-revalidate/.test(cache['/']) && /immutable/.test(cache.asset) && /max-age=2592000/.test(cache['/media/video-pc-gamer.webm']) && /max-age=86400/.test(cache['/favicon.png']) && /max-age=3600/.test(cache['/robots.txt']) && /max-age=3600/.test(cache['/llms-full.txt']) && /max-age=3600/.test(cache['/.well-known/security.txt']), JSON.stringify(cache));
  const link = home.headers()['link'] ?? '';
  ok('Página envia o cabeçalho Link com preload da fonte do título e da foto de abertura', /rel=preload; as=font/.test(link) && /as=image/.test(link), link.slice(0, 120));
  const internal = await ctx.request.get(BASE + '/_links.json');
  ok('Arquivo interno _links.json não é servido ao público', internal.status() === 404);
  await ctx.close();
}

// 17. Revisão 2: cor como evento (fotos dessaturadas que "ligam"), abertura, View Transitions e Speculation Rules
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await page.waitForTimeout(2000);
  const hero = await page.evaluate(() => ({ filter: getComputedStyle(document.querySelector('.hero__media img')).filter, name: getComputedStyle(document.querySelector('.hero__media img')).animationName }));
  ok('Abertura: a foto do gabinete termina em cor total (única foto sempre saturada)', hero.name === 'boot' && (hero.filter === 'none' || /saturate\(1\)/.test(hero.filter)), JSON.stringify(hero));
  // Foto fora da região central: dessaturada. Foto no centro: em cor.
  const state = async (selector) => page.evaluate((sel) => {
    const img = document.querySelector(sel);
    img.scrollIntoView({ block: 'center' });
    return null;
  }, selector);
  await state('#trabalho .tile__img');
  await page.waitForTimeout(500);
  const centered = await page.evaluate(() => getComputedStyle(document.querySelector('#trabalho .tile__img')).filter);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  const away = await page.evaluate(() => getComputedStyle(document.querySelector('#trabalho .tile__img')).filter);
  const sat = (value) => Number(value.match(/saturate\(([\d.]+)\)/)?.[1] ?? 1);
  ok('Fotos: dessaturadas fora da tela e em cor ao chegar ao centro (animation-timeline: view)', sat(away) < 0.75 && sat(centered) > 0.95, `fora ${away} | centro ${centered}`);
  // Hover (mouse) também liga a foto.
  await page.evaluate(() => document.querySelector('#trabalho').scrollIntoView({ block: 'start' }));
  await page.evaluate(() => window.scrollBy(0, -400));
  await page.waitForTimeout(400);
  const target = page.locator('#trabalho .tile--photo').first();
  await target.scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, 600));
  await page.waitForTimeout(400);
  const before = await page.evaluate(() => getComputedStyle(document.querySelector('#trabalho .tile__img')).filter);
  await page.locator('#trabalho .tile--photo').first().hover({ force: true }).catch(() => {});
  await page.waitForTimeout(500);
  const hovered = await page.evaluate(() => getComputedStyle(document.querySelector('#trabalho .tile__img')).filter);
  ok('Fotos: o mouse sobre o bloco acende a foto (cor total)', sat(hovered) >= 1 && sat(hovered) >= sat(before), `antes ${before} | hover ${hovered}`);
  await ctx.close();

  // Toque (celular): o efeito acontece só pela rolagem, sem hover.
  const touch = await browser.newContext(mobile);
  const tp = await touch.newPage();
  await tp.goto(BASE + '/', { waitUntil: 'load' });
  // No celular a galeria de #trabalho é uma faixa que rola: a rolagem da página não a move, então o teste usa a foto de Luis (fora de faixas).
  await tp.evaluate(() => document.querySelector('#quem-cuida .tile__img').scrollIntoView({ block: 'center' }));
  await tp.waitForTimeout(500);
  const touchLit = await tp.evaluate(() => getComputedStyle(document.querySelector('#quem-cuida .tile__img')).filter);
  await tp.evaluate(() => window.scrollTo(0, 0));
  await tp.waitForTimeout(400);
  const touchDim = await tp.evaluate(() => getComputedStyle(document.querySelector('#quem-cuida .tile__img')).filter);
  ok('Celular (toque): a foto liga ao rolar até o centro e volta a dessaturar, sem depender de hover', sat(touchLit) > 0.95 && sat(touchDim) < 0.75, `${touchDim} -> ${touchLit}`);
  await touch.close();

  // Speculation Rules e View Transitions entre documentos
  const vtCtx = await browser.newContext(desktop);
  const vp = await vtCtx.newPage();
  await vp.addInitScript(() => {
    addEventListener('pagereveal', (event) => {
      sessionStorage.setItem('vt', event.viewTransition ? 'sim' : 'nao');
      event.viewTransition?.ready.then(() => sessionStorage.setItem('vtNames', [...document.querySelectorAll('[style*=view-transition-name]')].map((el) => el.getAttribute('style')).join('|')), () => {});
    });
  });
  await vp.goto(BASE + '/', { waitUntil: 'load' });
  const rules = await vp.evaluate(() => JSON.parse(document.querySelector('script[type=speculationrules]').textContent));
  ok('Speculation Rules: prerender moderado só de links internos, sem WhatsApp nem 404', rules.prerender?.[0]?.eagerness === 'moderate' && JSON.stringify(rules).includes('"/*"') && JSON.stringify(rules).includes('_blank'));
  await vp.locator('a.tile__link[href="/conserto-de-notebook/"]').click();
  await vp.waitForURL('**/conserto-de-notebook/');
  await vp.waitForTimeout(800);
  const vt = await vp.evaluate(() => sessionStorage.getItem('vt'));
  const names = await vp.evaluate(() => [...document.querySelectorAll('[style*=view-transition-name]')].map((el) => el.getAttribute('style')));
  ok('View Transition entre páginas (sem JavaScript de navegação) com a foto do notebook como elemento compartilhado', vt === 'sim' && names.some((n) => /morph-notebook/.test(n)), `vt=${vt} ${names.join(',')}`);
  const unique = await vtCtx.newPage();
  const dupes = [];
  for (const route of ROUTES) {
    await unique.goto(BASE + route, { waitUntil: 'load' });
    const all = await unique.evaluate(() => [...document.querySelectorAll('[style*=view-transition-name]')].map((el) => el.style.viewTransitionName));
    if (new Set(all).size !== all.length) dupes.push(route);
  }
  ok('Nomes de view-transition únicos em cada página (nome repetido cancelaria a transição)', dupes.length === 0, dupes.join());
  await vtCtx.close();
}

// 18. Revisão 2: imagens sem bytes de sobra, fontes sem salto, abaixo da dobra sem CLS e âncoras com content-visibility
{
  for (const [label, options, dpr] of [['celular 390 @2x', { ...mobile, deviceScaleFactor: 2 }, 2], ['desktop 1440 @1x', desktop, 1], ['desktop 1440 @2x', { ...desktop, deviceScaleFactor: 2 }, 2]]) {
    const over = [];
    for (const route of ROUTES) {
      // Contexto novo por rota: o Chrome reaproveita uma variante maior já em cache, o que mascararia a escolha do srcset.
      const ctx = await browser.newContext(options);
      const page = await ctx.newPage();
      await page.goto(BASE + route, { waitUntil: 'load' });
      // Rolagem natural: a variante é escolhida quando a imagem preguiçosa chega perto da tela, com o layout já pronto.
      const total = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < total; y += 350) { await page.evaluate((top) => window.scrollTo(0, top), y); await page.waitForTimeout(40); }
      await page.waitForTimeout(600);
      const rows = await page.evaluate((density) => [...document.images].filter((i) => i.complete && i.getBoundingClientRect().width > 0).map((i) => {
        const needed = Math.ceil(i.getBoundingClientRect().width * density);
        const src = i.currentSrc.split('/').pop();
        const intrinsic = i.naturalWidth * (parseFloat(getComputedStyle(i).width) ? 1 : 1);
        return { src, needed, have: Math.round(i.naturalWidth * (i.currentSrc && /-(\d+)\./.test(i.currentSrc) ? 1 : 1)), declared: Number(i.currentSrc.match(/-(\d+)\.[0-9a-f]{8}\./)?.[1] ?? 0), srcsetMax: ([...i.parentElement.querySelectorAll('source[type="image/avif"]')].find((src) => !src.media || matchMedia(src.media).matches)?.srcset ?? '').split(',').filter(Boolean).map((x) => Number(x.trim().split(' ')[1].replace('w', ''))) };
      }), dpr);
      for (const row of rows) {
        // Um arquivo é "grande demais" se há uma variante menor que ainda cobre a largura pedida e ele passa de 1,5x o necessário.
        const smaller = row.srcsetMax.filter((w) => w >= row.needed).sort((a, b) => a - b)[0];
        // A mesma foto repetida na página pode reaproveitar a variante já baixada (o navegador decide); só conta foto única.
        const repeated = rows.filter((other) => other.src.replace(/-\d+\.[0-9a-f]{8}\.\w+$/, '') === row.src.replace(/-\d+\.[0-9a-f]{8}\.\w+$/, '')).length > 1;
        if (row.declared && smaller && row.declared > smaller && !repeated) over.push(`${route} ${row.src} baixou ${row.declared}w, bastava ${smaller}w (precisa ${row.needed}px)`);
      }
      await ctx.close();
    }
    ok(`Imagens (${label}): o navegador sempre escolhe a menor variante que cobre o tamanho na tela`, over.length === 0, over.slice(0, 4).join(' | '));
  }

  // Só a abertura tem prioridade alta, em cada página.
  {
    const ctx = await browser.newContext(desktop);
    const page = await ctx.newPage();
    const bad = [];
    for (const route of ROUTES) {
      await page.goto(BASE + route, { waitUntil: 'load' });
      const info = await page.evaluate(() => ({ high: [...document.images].filter((i) => i.fetchPriority === 'high').length, syncDecode: [...document.images].filter((i) => i.decoding === 'sync').length, lazyEager: [...document.images].filter((i) => i.loading === 'lazy' && i.fetchPriority === 'high').length }));
      if (info.high > 1 || info.syncDecode > 1 || info.lazyEager) bad.push(`${route} ${JSON.stringify(info)}`);
    }
    ok('Só uma imagem por página com fetchpriority alto e decodificação síncrona (a de abertura)', bad.length === 0, bad.join(' | '));
    await ctx.close();
  }

  // Fontes atrasadas: a troca para a fonte final não pode deslocar o texto.
  for (const [label, options] of [['desktop', desktop], ['celular', mobile]]) {
    const ctx = await browser.newContext(options);
    await ctx.route('**/assets/fonts/**', async (route) => { await new Promise((resolve) => setTimeout(resolve, 1500)); await route.continue(); });
    const page = await ctx.newPage();
    await page.addInitScript(() => { window.__cls = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); });
    const worst = [];
    for (const route of ['/', '/pc-gamer/', '/conserto-de-notebook/']) {
      await page.goto(BASE + route, { waitUntil: 'load' });
      await page.waitForTimeout(2600);
      const fontsLoaded = await page.evaluate(() => document.fonts.check('700 20px "Saira Condensed"'));
      const cls = await page.evaluate(() => +window.__cls.toFixed(4));
      worst.push(`${route} cls=${cls} fonte=${fontsLoaded}`);
      if (cls > 0.01 || !fontsLoaded) worst.push('FALHOU');
    }
    ok(`Fonte chegando 1,5 s depois (${label}): CLS da troca <= 0,01 nas três páginas principais`, !worst.includes('FALHOU'), worst.join(' | '));
    await ctx.close();
  }

  // Rolagem completa: CLS (content-visibility) e jank
  for (const [label, options] of [['desktop 1440', desktop], ['celular 390', mobile]]) {
    const ctx = await browser.newContext(options);
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      window.__cls = 0;
      window.__long = [];
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
      try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__long.push(Math.round(e.duration)); }).observe({ type: 'long-animation-frame', buffered: true }); } catch {}
    });
    const report = [];
    for (const route of ROUTES) {
      await page.goto(BASE + route, { waitUntil: 'load' });
      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < height; y += 300) {
        await page.evaluate((top) => window.scrollTo(0, top), y);
        await page.waitForTimeout(60);
      }
      await page.waitForTimeout(400);
      const m = await page.evaluate(() => ({ cls: +window.__cls.toFixed(4), long: window.__long.filter((d) => d > 100).length, worst: Math.max(0, ...window.__long) }));
      report.push(`${route} cls=${m.cls} longFrames>100ms=${m.long} pior=${m.worst}ms`);
      if (m.cls > 0.01) report.push('CLS');
      if (m.long > 3) report.push('JANK');
    }
    ok(`Rolagem completa (${label}): CLS <= 0,01 e sem quadros longos repetidos (filtros das fotos)`, !report.includes('CLS') && !report.includes('JANK'), report.join(' | '));
    await ctx.close();
  }

  // Âncoras caem no lugar certo mesmo com as seções puladas por content-visibility
  {
    const ctx = await browser.newContext(desktop);
    const page = await ctx.newPage();
    const miss = [];
    for (const [route, id] of [['/', 'sintomas'], ['/', 'como-funciona'], ['/', 'trabalho'], ['/pc-gamer/', 'diagnostico'], ['/pc-gamer/', 'upgrade-placa-de-video'], ['/servicos/', 'placas'], ['/conserto-de-notebook/', 'superaquecimento']]) {
      await page.goto(`${BASE}${route}#${id}`, { waitUntil: 'load' });
      await page.waitForTimeout(900);
      const top = await page.evaluate((anchor) => Math.round(document.getElementById(anchor).getBoundingClientRect().top), id);
      if (top < -5 || top > 220) miss.push(`${route}#${id} topo em ${top}px`);
    }
    ok('Âncoras internas caem no começo da tela', miss.length === 0, miss.join(' | '));
    await ctx.close();
  }
}

// 19. Revisão 3: sanfonas (inclusive âncoras), faixas que rolam, orçamento de altura, circuito de "Como funciona" e linha de progresso
{
  // 19a. Sanfonas no celular: começam fechadas, abrem ao toque, e toda âncora que aponta para dentro delas as abre
  const ctx = await browser.newContext(mobile);
  const page = await ctx.newPage();
  await page.goto(BASE + '/servicos/', { waitUntil: 'load' });
  const state = await page.evaluate(() => {
    const all = [...document.querySelectorAll('details.acc')];
    return { n: all.length, open: all.filter((d) => d.open).length, listsHidden: all.every((d) => d.getBoundingClientRect().height < 80) };
  });
  ok('Celular: /servicos/ começa com todas as sanfonas fechadas e as listas fora da tela', state.n >= 10 && state.open === 0 && state.listsHidden, JSON.stringify(state));
  await page.locator('#limpeza summary').tap();
  ok('Celular: tocar no botão abre a sanfona e mostra a lista completa', await page.evaluate(() => { const d = document.querySelector('#limpeza details'); return d.open && d.querySelector('ul').getBoundingClientRect().height > 100; }));
  const miss = [];
  for (const id of ['notebooks', 'diagnostico', 'desktops', 'limpeza', 'montagem-upgrade', 'formatacao', 'virus', 'atendimento', 'placas', 'dados', 'perifericos', 'avaliacao']) {
    await page.goto(`${BASE}/servicos/#${id}`, { waitUntil: 'load' });
    await page.waitForTimeout(450);
    const r = await page.evaluate((anchor) => {
      const el = document.getElementById(anchor);
      const d = el.querySelector('details');
      return { open: d.open, list: Math.round(d.querySelector('ul').getBoundingClientRect().height), top: Math.round(el.getBoundingClientRect().top) };
    }, id);
    if (!r.open || r.list < 40 || r.top < -5 || r.top > 220) miss.push(`${id} ${JSON.stringify(r)}`);
  }
  ok('Celular: toda âncora /servicos/#categoria (vinda de outra página) abre a sanfona e cai no começo da tela', miss.length === 0, miss.join(' | '));
  await page.goto(BASE + '/servicos/', { waitUntil: 'load' });
  await page.locator('.service-index a[href="#placas"]').tap();
  await page.waitForTimeout(600);
  ok('Celular: link do índice do topo (na mesma página) abre a sanfona da categoria', await page.evaluate(() => document.querySelector('#placas details').open));
  await page.goto(BASE + '/conserto-de-computador/#componentes', { waitUntil: 'load' });
  await page.waitForTimeout(450);
  ok('Celular: /conserto-de-computador/#componentes abre a lista da troca de componentes', await page.evaluate(() => { const d = document.querySelector('#componentes details'); return d.open && d.querySelector('li').getBoundingClientRect().height > 10; }));
  await ctx.close();

  // Sem JavaScript: o celular abre pelo toque (nativo) e o computador mostra tudo, sem botão
  const noJsMobile = await browser.newContext({ ...mobile, javaScriptEnabled: false });
  const nm = await noJsMobile.newPage();
  await nm.goto(BASE + '/servicos/', { waitUntil: 'load' });
  await nm.locator('#placas summary').tap();
  ok('Sem JavaScript (celular): a sanfona abre pelo toque e a lista fica legível', await nm.evaluate(() => document.querySelector('#placas details').open && document.querySelector('#placas li').getBoundingClientRect().height > 10));
  await noJsMobile.close();
  for (const [label, options] of [['computador sem JavaScript', { ...desktop, javaScriptEnabled: false }], ['computador com JavaScript', desktop]]) {
    const c = await browser.newContext(options);
    const p = await c.newPage();
    await p.goto(BASE + '/servicos/', { waitUntil: 'load' });
    const rows = await p.evaluate(() => [...document.querySelectorAll('details.acc')].map((d) => ({ summary: getComputedStyle(d.querySelector('summary')).display, list: Math.round(d.querySelector('ul').getBoundingClientRect().height) })));
    ok(`Sanfonas em ${label}: listas de todas as categorias à vista e sem botão`, rows.length >= 10 && rows.every((r) => r.list > 40 && r.summary === 'none'), JSON.stringify(rows.slice(0, 3)));
    await c.close();
  }

  // 19b. Faixas que rolam no celular: cabem na tela, não criam rolagem da página, rolam de fato e têm acesso por teclado
  const sc = await browser.newContext(mobile);
  const sp = await sc.newPage();
  const bad = [];
  for (const route of ROUTES) {
    await sp.goto(BASE + route, { waitUntil: 'load' });
    const info = await sp.evaluate(() => [...document.querySelectorAll('.scroll-m, .index-chips, .jump, .xray__list, .sx__choices ul')].filter((el) => el.getBoundingClientRect().width > 0).map((el) => ({ cls: String(el.className).slice(0, 28), scrolls: el.scrollWidth > el.clientWidth + 2, w: Math.round(el.getBoundingClientRect().width), tab: el.tabIndex, kids: el.querySelectorAll('a, button').length, doc: document.documentElement.scrollWidth })));
    for (const i of info) {
      if (i.doc > 390) bad.push(`${route} página com rolagem lateral (${i.doc}px)`);
      if (i.w > 392) bad.push(`${route} ${i.cls} com ${i.w}px`);
      if (i.tab < 0 && !i.kids) bad.push(`${route} ${i.cls} sem acesso por teclado`);
    }
    if (route === '/' && !info.some((i) => i.scrolls)) bad.push('/ sem nenhuma faixa que rola');
  }
  ok('Faixas que rolam (celular): cabem na tela, não criam rolagem da página e têm acesso por teclado', bad.length === 0, bad.slice(0, 5).join(' | '));
  await sp.goto(BASE + '/', { waitUntil: 'load' });
  const gallery = sp.locator('[aria-label^="Fotos reais da bancada"]');
  await gallery.scrollIntoViewIfNeeded();
  await gallery.focus();
  await sp.keyboard.press('ArrowRight');
  await sp.keyboard.press('ArrowRight');
  await sp.waitForTimeout(500);
  ok('Galeria da home (celular): foco e setas do teclado rolam a faixa para o lado', await gallery.evaluate((el) => el.scrollLeft > 20 && el.scrollWidth > el.clientWidth), String(await gallery.evaluate((el) => el.scrollLeft)));
  await sp.goto(BASE + '/conserto-de-notebook/#superaquecimento', { waitUntil: 'load' });
  await sp.waitForTimeout(700);
  const inView = await sp.evaluate(() => { const b = document.getElementById('superaquecimento').getBoundingClientRect(); return { left: Math.round(b.left), right: Math.round(b.right), top: Math.round(b.top), doc: document.documentElement.scrollWidth }; });
  ok('Âncora dentro de faixa que rola (/conserto-de-notebook/#superaquecimento): o cartão aparece inteiro na tela e a página não desloca', inView.left >= -1 && inView.right <= 391 && inView.top > -5 && inView.top < 700 && inView.doc <= 390, JSON.stringify(inView));
  await sc.close();

  // 19c. Orçamento de altura no celular (390 px): início, serviços e PC gamer
  {
    const c = await browser.newContext(mobile);
    const p = await c.newPage();
    const heights = {};
    for (const [route, limit] of [['/', 6500], ['/servicos/', 7500], ['/pc-gamer/', 7500]]) {
      await p.goto(BASE + route, { waitUntil: 'load' });
      await p.waitForTimeout(300);
      heights[route] = [await p.evaluate(() => document.documentElement.scrollHeight), limit];
    }
    ok('Altura no celular (390 px) dentro do orçamento: início até 6.500 px, serviços e PC gamer até 7.500 px', Object.values(heights).every(([h, limit]) => h <= limit), JSON.stringify(heights));
    await c.close();
  }

  // 19d. Linha de progresso (scroll timeline) e circuito de "Como funciona" (acende em sequência, sem JavaScript)
  {
    const c = await browser.newContext(desktop);
    const p = await c.newPage();
    await p.goto(BASE + '/', { waitUntil: 'load' });
    const supported = await p.evaluate(() => CSS.supports('animation-timeline: scroll()') && CSS.supports('animation-timeline: view()'));
    if (!supported) ok('Linha de progresso e circuito: navegador sem animation-timeline (ficam estáticos e acesos)', true);
    else {
      const scaleOf = async () => p.evaluate(() => { const m = new DOMMatrix(getComputedStyle(document.querySelector('.site-header'), '::after').transform); return +m.a.toFixed(3); });
      const top = await scaleOf();
      await p.evaluate(() => window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) / 2));
      await p.waitForTimeout(350);
      const mid = await scaleOf();
      await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await p.waitForTimeout(350);
      const end = await scaleOf();
      ok('Linha de progresso sob o cabeçalho cresce com a rolagem (0 no topo, cerca de metade no meio, cheia no fim)', top < 0.02 && mid > 0.35 && mid < 0.65 && end > 0.98, `${top} | ${mid} | ${end}`);

      const lit = async () => p.evaluate(() => [...document.querySelectorAll('.steps--circuit li')].map((li) => +(+getComputedStyle(li, '::after').opacity).toFixed(2)));
      const samples = [];
      for (const fraction of [0.95, 0.8, 0.65, 0.5, 0.35, 0.2]) {
        await p.evaluate((f) => { const el = document.querySelector('.steps--circuit'); window.scrollTo(0, window.scrollY + el.getBoundingClientRect().top - innerHeight * f); }, fraction);
        await p.waitForTimeout(250);
        samples.push(await lit());
      }
      const ordered = samples.every(([a, b, c3]) => a >= b - 0.02 && b >= c3 - 0.02);
      ok('Circuito de "Como funciona": ao entrar na tela está apagado, acende na ordem 1, 2, 3 e termina todo aceso', samples[0].every((v) => v < 0.5) && ordered && samples.some(([a, , c3]) => a > 0.95 && c3 < 0.6) && samples.at(-1).every((v) => v > 0.95), JSON.stringify(samples));
    }
    await c.close();

    const rm = await browser.newContext({ ...desktop, reducedMotion: 'reduce' });
    const rp = await rm.newPage();
    await rp.goto(BASE + '/', { waitUntil: 'load' });
    const still = await rp.evaluate(() => ({
      progress: getComputedStyle(document.querySelector('.site-header'), '::after').content,
      steps: [...document.querySelectorAll('.steps--circuit li')].map((li) => getComputedStyle(li, '::after').opacity + '/' + getComputedStyle(li, '::after').animationName),
      line: getComputedStyle(document.querySelector('.steps--circuit'), '::after').animationName,
      running: document.getAnimations().filter((a) => a.playState === 'running').length,
    }));
    ok('Movimento reduzido: sem linha de progresso, circuito todo aceso e nenhuma animação rodando', still.progress === 'none' && still.steps.every((s) => s === '1/none') && still.line === 'none' && still.running === 0, JSON.stringify(still));
    await rm.close();
  }
}

await browser.close();
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passaram.`);
process.exit(failed.length ? 1 : 0);

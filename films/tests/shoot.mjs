/* 用 Chrome 的调试协议在固定宽度下截图并读节点数。
   用法：node films/tests/shoot.mjs
   Chrome 路径可用 CHROME 环境变量覆盖。 */
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const filmsRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(filmsRoot, 'tests', 'out');
const base = process.env.BASE || pathToFileURL(filmsRoot).href;
const chromePath = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const port = 9223;
const profile = join(tmpdir(), `films-shoot-${process.pid}`);

mkdirSync(outDir, { recursive: true });

const chrome = spawn(chromePath, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--no-first-run',
  '--no-default-browser-check',
  '--allow-file-access-from-files',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForChrome() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) return;
    } catch { /* retry */ }
    await sleep(100);
  }
  throw new Error('Chrome 调试端口没起来');
}

async function openTarget() {
  const res = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' });
  const data = await res.json();
  return data.webSocketDebuggerUrl;
}

class Cdp {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.id = 0;
    this.pending = new Map();
    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (!msg.id || !this.pending.has(msg.id)) return;
      const { resolve: done, reject } = this.pending.get(msg.id);
      this.pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else done(msg.result);
    };
  }
  async ready() {
    if (this.ws.readyState === WebSocket.OPEN) return;
    await new Promise((done, fail) => {
      this.ws.onopen = done;
      this.ws.onerror = fail;
    });
  }
  send(method, params = {}) {
    const id = (this.id += 1);
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((done, fail) => this.pending.set(id, { resolve: done, reject: fail }));
  }
  close() { this.ws.close(); }
}

async function evaluate(cdp, expression, awaitPromise = false) {
  const { result } = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise });
  return result.value;
}

async function shoot(cdp, name, url, width, height) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width, height, deviceScaleFactor: 1, mobile: false,
  });
  await cdp.send('Page.navigate', { url });
  for (let i = 0; i < 30; i += 1) {
    await sleep(100);
    const ready = await evaluate(cdp, 'document.readyState');
    const hasStats = await evaluate(cdp, 'Boolean(document.getElementById("stats"))');
    if (ready === 'complete' && (hasStats || !url.includes('list-100'))) break;
  }
  await sleep(400);
  await evaluate(cdp, 'document.fonts.ready.then(() => true)', true);
  await sleep(200);
  const metrics = await evaluate(cdp, `JSON.stringify({
    innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    nodes: document.querySelectorAll('*').length,
    rows: document.querySelectorAll('.row').length,
    title: document.querySelector('h1') ? document.querySelector('h1').textContent : '',
    errors: window.__errs || [],
    films: Object.keys(window.Films || {}),
    hasData: Boolean(window.FILMS_DATA),
    scripts: [...document.scripts].map((s) => s.getAttribute('src')),
    stats: document.getElementById('stats') ? document.getElementById('stats').textContent : '',
    detail: (() => {
      const t = document.querySelector('.techbar');
      const s = document.querySelector('.still-wm');
      const r = document.querySelector('.col-rail');
      const g = document.querySelector('.still-gallery');
      return t && s ? {
        techW: Math.round(t.getBoundingClientRect().width),
        techRight: Math.round(t.getBoundingClientRect().right),
        stillW: Math.round(s.getBoundingClientRect().width),
        stillRight: Math.round(s.getBoundingClientRect().right),
        rail: r ? { w: Math.round(r.getBoundingClientRect().width), h: Math.round(r.getBoundingClientRect().height) } : null,
        gallery: g ? { w: Math.round(g.getBoundingClientRect().width), h: Math.round(g.getBoundingClientRect().height) } : null,
      } : null;
    })(),
  })`);
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  writeFileSync(join(outDir, `${name}-${width}.png`), Buffer.from(shot.data, 'base64'));
  console.log(`${name} ${width}x${height} ${metrics}`);
}

async function checkVirtualStamp(cdp, url) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 700, height: 900, deviceScaleFactor: 1, mobile: false,
  });
  await cdp.send('Page.navigate', { url });
  await sleep(900);
  const result = await evaluate(cdp, `(async () => {
    try { localStorage.removeItem('films.watched.v1'); } catch {}
    const reel = document.querySelector('#reel');
    const top = reel.getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, top + 54 * 64 - 100);
    await new Promise((r) => setTimeout(r, 500));
    const row = document.querySelector('.row[data-movie="f050"]');
    if (!row) return JSON.stringify({ error: 'f050 not rendered', scrollY: Math.round(scrollY), rows: document.querySelectorAll('.row').length });
    const before = Math.round(window.scrollY);
    row.querySelector('.stampbtn').click();
    await new Promise((r) => setTimeout(r, 300));
    const now = document.querySelector('.row[data-movie="f050"]');
    return JSON.stringify({
      before,
      after: Math.round(window.scrollY),
      nodes: document.querySelectorAll('*').length,
      rows: document.querySelectorAll('.row').length,
      label: now ? now.querySelector('.stampbtn').textContent : 'missing',
      watched: now ? now.classList.contains('watched') : false,
      stamp: now ? Boolean(now.querySelector('.stamp')) : false,
      stored: (() => { try { return localStorage.getItem('films.watched.v1'); } catch { return 'blocked'; } })(),
    });
  })()`, true);
  console.log(`virtual-stamp 700x900 ${result}`);
}

async function checkRealWatch(cdp, url) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 700, height: 900, deviceScaleFactor: 1, mobile: false,
  });
  await cdp.send('Page.navigate', { url });
  await sleep(1000);
  const result = await evaluate(cdp, `(async () => {
    try { localStorage.removeItem('films.watched.v1'); } catch {}
    const btn = document.querySelector('.row[data-movie="m052357"] .stampbtn');
    if (!btn) return JSON.stringify({ error: 'row not found', rows: document.querySelectorAll('.row').length });
    btn.click();
    await new Promise((r) => setTimeout(r, 300));
    location.hash = '#/watch';
    await new Promise((r) => setTimeout(r, 1200));
    return JSON.stringify({
      rows: document.querySelectorAll('.row').length,
      watchItems: document.querySelectorAll('.watchlist li').length,
      text: document.querySelector('.watchlist') ? document.querySelector('.watchlist').textContent.trim().slice(0, 40) : '',
      nodes: document.querySelectorAll('*').length,
    });
  })()`, true);
  console.log(`real-watch 700x900 ${result}`);
}

async function checkGallery(cdp, url) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 700, height: 900, deviceScaleFactor: 1, mobile: false,
  });
  await cdp.send('Page.navigate', { url });
  await sleep(1200);
  const result = await evaluate(cdp, `(async () => {
    const fig = document.querySelector('.still-gallery');
    if (!fig) return JSON.stringify({ error: 'no gallery' });
    const count = fig.querySelector('.still-count');
    const img = fig.querySelector('.still-image');
    const before = { count: count.textContent, src: img.getAttribute('src') };
    fig.querySelector('[data-still-next]').click();
    await new Promise((r) => setTimeout(r, 100));
    const after = { count: count.textContent, src: img.getAttribute('src') };
    return JSON.stringify({ before, after });
  })()`, true);
  console.log(`gallery 700x900 ${result}`);
}

async function checkLightbox(cdp, url) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 700, height: 900, deviceScaleFactor: 1, mobile: false,
  });
  await cdp.send('Page.navigate', { url });
  await sleep(1200);
  const result = await evaluate(cdp, `(async () => {
    const fig = document.querySelector('.still-gallery');
    if (!fig) return JSON.stringify({ error: 'no gallery' });
    document.querySelector('.still-open').click();
    await new Promise((r) => setTimeout(r, 120));
    const box = document.querySelector('.lightbox');
    const count = box.querySelector('.lightbox-count');
    const first = { open: !box.hidden, count: count.textContent, src: box.querySelector('.lightbox-image').src };
    box.querySelector('.lightbox-next').click();
    await new Promise((r) => setTimeout(r, 80));
    const second = { count: count.textContent, src: box.querySelector('.lightbox-image').src };
    box.querySelector('.lightbox-close').click();
    return JSON.stringify({ first, second, closed: box.hidden });
  })()`, true);
  console.log(`lightbox 700x900 ${result}`);
}

async function checkSearch(cdp, url) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1200, height: 900, deviceScaleFactor: 1, mobile: false,
  });
  await cdp.send('Page.navigate', { url });
  await sleep(1000);
  const result = await evaluate(cdp, `(async () => {
    const rows = () => document.querySelectorAll('.search-row').length;
    const first = () => document.querySelector('.search-title b')?.textContent || '';
    const out = { initial: { rows: rows(), first: first() } };
    const input = document.querySelector('.search-input');
    input.value = '教父';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 100));
    out.query = { rows: rows(), first: first() };
    return JSON.stringify(out);
  })()`, true);
  console.log(`search 1200x900 ${result}`);
}

async function checkPager(cdp, url) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1200, height: 900, deviceScaleFactor: 1, mobile: false,
  });
  await cdp.send('Page.navigate', { url });
  await sleep(1200);
  const result = await evaluate(cdp, `(async () => {
    const rows = () => document.querySelectorAll('.reel .row').length;
    const pos = () => document.querySelector('.pager-pos').textContent;
    const out = { first: { rows: rows(), pos: pos() } };
    document.querySelector('[data-page-next]').click();
    await new Promise((r) => setTimeout(r, 100));
    out.second = { rows: rows(), pos: pos() };
    const size = document.querySelector('[data-page-size]');
    size.value = '20';
    size.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 100));
    out.size20 = { rows: rows(), pos: pos() };
    return JSON.stringify(out);
  })()`, true);
  console.log(`pager 1200x900 ${result}`);
}

async function checkThumbHover(cdp, url) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1200, height: 900, deviceScaleFactor: 1, mobile: false,
  });
  await cdp.send('Page.navigate', { url });
  await sleep(1200);
  const result = await evaluate(cdp, `(async () => {
    const img = document.querySelector('.row-still');
    if (!img) return JSON.stringify({ error: 'no image' });
    img.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false, clientX: 600, clientY: 320 }));
    await new Promise((r) => setTimeout(r, 80));
    const p = document.querySelector('.thumb-preview');
    const out = { shown: p ? !p.hidden : false, src: p ? p.getAttribute('src') : '' };
    img.dispatchEvent(new MouseEvent('mouseleave', { bubbles: false }));
    return JSON.stringify(out);
  })()`, true);
  console.log(`hover 1200x900 ${result}`);
}

async function checkQuoteReload(cdp, url) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 700, height: 900, deviceScaleFactor: 1, mobile: false,
  });
  await cdp.send('Page.navigate', { url });
  await sleep(1000);
  const before = await evaluate(cdp, "document.querySelector('.quoteline p') ? document.querySelector('.quoteline p').textContent : ''");
  await cdp.send('Page.reload', { ignoreCache: true });
  await sleep(1200);
  const after = await evaluate(cdp, "document.querySelector('.quoteline p') ? document.querySelector('.quoteline p').textContent : ''");
  console.log(`quote-reload 700x900 ${JSON.stringify({ before, after })}`);
}

async function checkStore(cdp, url) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 700, height: 900, deviceScaleFactor: 1, mobile: false,
  });
  await cdp.send('Page.navigate', { url });
  await sleep(900);
  const result = await evaluate(cdp, `(() => {
    const original = Films.store.all();
    const text = Films.store.exportText();
    try { localStorage.removeItem('films.watched.v1'); } catch {}
    const empty = Object.keys(Films.store.all()).length;
    const count = Films.store.importText(text);
    const restored = JSON.stringify(Films.store.all()) === JSON.stringify(original);
    const before = Films.store.all().f050 ? Films.store.all().f050.at : '';
    Films.store.importText(JSON.stringify({ version: 1, watched: { f050: { at: '2000-01-01' } } }));
    const after = Films.store.all().f050 ? Films.store.all().f050.at : '';
    return JSON.stringify({ empty, count, restored, before, after });
  })()`, true);
  console.log(`store 700x900 ${result}`);
}

async function checkKeyboard(cdp, url) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 700, height: 900, deviceScaleFactor: 1, mobile: false,
  });
  await cdp.send('Page.navigate', { url });
  await sleep(900);
  const result = await evaluate(cdp, `(async () => {
    const reel = document.querySelector('#reel');
    reel.focus();
    for (let i = 0; i < 5; i += 1) {
      reel.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      await new Promise((r) => setTimeout(r, 200));
    }
    const active = document.activeElement && document.activeElement.closest('.row');
    return JSON.stringify({
      index: active ? Number(active.dataset.index) : -1,
      scrollY: Math.round(window.scrollY),
      nodes: document.querySelectorAll('*').length,
      rows: document.querySelectorAll('.row').length,
    });
  })()`, true);
  console.log(`keyboard 700x900 ${result}`);
}

async function checkStamp(cdp, url) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 700, height: 900, deviceScaleFactor: 1, mobile: false,
  });
  await cdp.send('Page.navigate', { url });
  await sleep(900);
  const result = await evaluate(cdp, `(async () => {
    const rows = [...document.querySelectorAll('.row')];
    const row = rows[49];
    if (!row) return JSON.stringify({ error: 'no row 50' });
    row.scrollIntoView({ block: 'center' });
    await new Promise((r) => setTimeout(r, 300));
    const before = Math.round(window.scrollY);
    row.querySelector('.stampbtn').click();
    await new Promise((r) => setTimeout(r, 300));
    const now = document.querySelector('.row[data-movie="f050"]');
    return JSON.stringify({
      before,
      after: Math.round(window.scrollY),
      label: now ? now.querySelector('.stampbtn').textContent : 'missing',
      watched: now ? now.classList.contains('watched') : false,
      stamp: now ? Boolean(now.querySelector('.stamp')) : false,
      stored: (() => { try { return localStorage.getItem('films.watched.v1'); } catch { return 'blocked'; } })(),
    });
  })()`, true);
  console.log(`stamp 700x900 ${result}`);
}

await waitForChrome();
const wsUrl = await openTarget();
const cdp = new Cdp(wsUrl);
await cdp.ready();
await cdp.send('Page.enable');
await cdp.send('Runtime.enable');
await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
  source: "window.__errs=[];window.addEventListener('error',function(e){window.__errs.push(e.message+' @'+e.filename+':'+e.lineno);});",
});

const list = `${base}/tests/list-100.html`;
const virtual = `${base}/tests/virtual-100.html`;
const proto = `${base}/web/prototype.html`;
const index = `${base}/web/index.html`;

try {
  for (const width of [1440, 1024, 700, 390]) {
    await shoot(cdp, 'list-100', list, width, 900);
  }
  await checkStamp(cdp, list);
  for (const width of [1440, 1024, 700, 390]) {
    await shoot(cdp, 'virtual-100', virtual, width, 900);
  }
  await checkVirtualStamp(cdp, `${virtual}#/list/fixture-100`);
  await checkKeyboard(cdp, `${virtual}#/list/fixture-100`);
  await shoot(cdp, 'index-home', index, 1200, 900);
  await shoot(cdp, 'index-list', `${index}#/list/global-mystery-greatest`, 1440, 900);
  await shoot(cdp, 'index-list', `${index}#/list/global-mystery-greatest`, 1024, 900);
  await shoot(cdp, 'index-list', `${index}#/list/global-mystery-greatest`, 700, 900);
  await shoot(cdp, 'index-list', `${index}#/list/global-mystery-greatest`, 390, 900);
  await shoot(cdp, 'index-scifi', `${index}#/list/global-scifi-greatest`, 1440, 900);
  await shoot(cdp, 'index-action', `${index}#/list/global-action-greatest`, 390, 844);
  await shoot(cdp, 'index-detail', `${index}#/movie/m052357?list=global-mystery-greatest`, 390, 844);
  await shoot(cdp, 'index-gallery', `${index}#/movie/m042876?list=global-mystery-greatest`, 390, 844);
  await checkQuoteReload(cdp, `${index}#/movie/m052357?list=global-mystery-greatest`);
  await checkGallery(cdp, `${index}#/movie/m042876?list=global-mystery-greatest`);
  await checkLightbox(cdp, `${index}#/movie/m042876?list=global-mystery-greatest`);
  await checkThumbHover(cdp, `${index}#/list/global-mystery-greatest`);
  await checkPager(cdp, `${index}#/list/global-mystery-greatest`);
  await checkSearch(cdp, `${index}#/search`);
  await checkRealWatch(cdp, `${index}#/list/global-mystery-greatest`);
  await shoot(cdp, 'index-watch', `${virtual}#/watch`, 390, 844);
  await checkStore(cdp, `${virtual}#/watch`);
  await shoot(cdp, 'index-empty', `${virtual}#/list/empty-list`, 390, 844);
  await shoot(cdp, 'index-404', `${index}#/movie/not-found`, 390, 844);
  const pipelinePage = `${base}/tests/pipeline/out/web/index.html`;
  if (existsSync(join(filmsRoot, 'tests', 'pipeline', 'out', 'web', 'index.html'))) {
    await shoot(cdp, 'pipeline-list', `${pipelinePage}#/list/test-list`, 1440, 900);
    await shoot(cdp, 'pipeline-detail', `${pipelinePage}#/movie/m000101?list=test-list`, 390, 844);
  }
  await shoot(cdp, 'home', proto, 1200, 900);
  await shoot(cdp, 'list-sample', `${proto}#/list/global-mystery-greatest`, 1440, 900);
  await shoot(cdp, 'list-sample', `${proto}#/list/global-mystery-greatest`, 390, 844);
  await shoot(cdp, 'detail', `${proto}#/movie/guest?list=global-mystery-greatest`, 390, 844);
  await shoot(cdp, 'detail', `${proto}#/movie/guest?list=global-mystery-greatest`, 1440, 900);
} finally {
  cdp.close();
  chrome.kill();
  await sleep(200);
  try { rmSync(profile, { recursive: true, force: true }); } catch { /* ignore */ }
}

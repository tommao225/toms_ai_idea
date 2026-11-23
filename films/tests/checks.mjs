/* 交互检查：由 shoot.mjs 调用，不自己启动浏览器。 */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function evaluate(cdp, expression, awaitPromise = false) {
  const { result } = await cdp.send('Runtime.evaluate', {
    expression, returnByValue: true, awaitPromise,
  });
  return result.value;
}

export async function checkGallery(cdp, url) {
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

export async function checkLightbox(cdp, url) {
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

export async function checkSearch(cdp, url) {
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

export async function checkPager(cdp, url) {
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

export async function checkThumbHover(cdp, url) {
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

export async function checkSort(cdp, url) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1200, height: 900, deviceScaleFactor: 1, mobile: false,
  });
  await cdp.send('Page.navigate', { url });
  await sleep(800);
  await evaluate(cdp, "localStorage.removeItem('films.sortMode.v1')");
  await cdp.send('Page.reload', { ignoreCache: true });
  await sleep(1000);
  const result = await evaluate(cdp, `(async () => {
    const first = () => document.querySelector('.reel .row .clip-in.zh')?.textContent || '';
    const out = {
      zh: first(),
      noColumn: document.querySelectorAll('.reel .no').length,
      zhActive: document.querySelector('[data-sort="zh"]')?.classList.contains('active'),
    };
    document.querySelector('[data-sort="en"]').click();
    await new Promise((r) => setTimeout(r, 120));
    out.en = first();
    out.enActive = document.querySelector('[data-sort="en"]')?.classList.contains('active');
    document.querySelector('[data-sort="year"]').click();
    await new Promise((r) => setTimeout(r, 120));
    out.year = first();
    out.yearActive = document.querySelector('[data-sort="year"]')?.classList.contains('active');
    out.yearArrow = document.querySelector('[data-sort="year"] .sort-arrow.on')?.textContent;
    out.arrowCount = document.querySelectorAll('[data-sort="year"] .sort-arrow').length;
    out.years = [...document.querySelectorAll('.reel .row .meta.year')].slice(0, 5).map((el) => Number(el.textContent));
    document.querySelector('[data-sort="year"]').click();
    await new Promise((r) => setTimeout(r, 120));
    out.yearAsc = first();
    out.yearsAsc = [...document.querySelectorAll('.reel .row .meta.year')].slice(0, 5).map((el) => Number(el.textContent));
    out.yearArrowAsc = document.querySelector('[data-sort="year"] .sort-arrow.on')?.textContent;
    document.querySelector('[data-sort="zh"]').click();
    await new Promise((r) => setTimeout(r, 120));
    out.backToZh = document.querySelector('[data-sort="zh"]')?.classList.contains('active');
    return JSON.stringify(out);
  })()`, true);
  console.log(`sort 1200x900 ${result}`);
}

export async function checkHomeOrder(cdp, url) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1200, height: 900, deviceScaleFactor: 1, mobile: false,
  });
  await cdp.send('Page.navigate', { url });
  await sleep(800);
  await evaluate(cdp, "localStorage.removeItem('films.cardOrder.v1')");
  await cdp.send('Page.reload', { ignoreCache: true });
  await sleep(1000);
  const before = await evaluate(cdp, "[...document.querySelectorAll('.card[data-list-id]')].map((c) => c.dataset.listId)");
  await evaluate(cdp, `(() => {
    const cards = [...document.querySelectorAll('.card[data-list-id]')];
    const first = cards[0];
    const last = cards[cards.length - 1];
    const dt = new DataTransfer();
    first.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt }));
    last.after(first);
    first.dispatchEvent(new DragEvent('dragend', { bubbles: true, dataTransfer: dt }));
    return true;
  })()`);
  await cdp.send('Page.reload', { ignoreCache: true });
  await sleep(1000);
  const after = await evaluate(cdp, "[...document.querySelectorAll('.card[data-list-id]')].map((c) => c.dataset.listId)");
  console.log(`home-order 1200x900 ${JSON.stringify({ before: before[0], after: after[0], count: after.length })}`);
}


export async function checkQuoteReload(cdp, url) {
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


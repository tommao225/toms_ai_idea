/* 放映单：虚拟滚动只渲染视口附近的行，100 行也不会堆满节点。 */
(function () {
  const Films = window.Films || (window.Films = {});
  const ui = Films.ui;
  const BUFFER = 4;
  const VIEW = 24;
  const PAGE_SIZES = [10, 20];
  const DEFAULT_PAGE_SIZE = 10;
  let state = null;
  let thumbPreview = null;

  function getThumbPreview() {
    if (!thumbPreview) {
      thumbPreview = document.createElement('img');
      thumbPreview.className = 'thumb-preview';
      thumbPreview.hidden = true;
      thumbPreview.alt = '';
      document.body.appendChild(thumbPreview);
    }
    return thumbPreview;
  }

  function hideThumbPreview() {
    if (thumbPreview) thumbPreview.hidden = true;
  }

  function placeThumbPreview(e) {
    const preview = getThumbPreview();
    preview.hidden = false;
    const width = 240;
    const height = 320;
    const pad = 16;
    let left = e.clientX + 18;
    if (left + width > window.innerWidth - pad) left = e.clientX - width - 18;
    let top = e.clientY - height / 2;
    top = Math.max(pad, Math.min(window.innerHeight - height - pad, top));
    preview.style.left = `${Math.max(pad, left)}px`;
    preview.style.top = `${top}px`;
  }

  function bindThumbPreview(root) {
    root.querySelectorAll('.row-still').forEach((img) => {
      img.addEventListener('mouseenter', (e) => {
        const preview = getThumbPreview();
        preview.src = img.src;
        placeThumbPreview(e);
      });
      img.addEventListener('mousemove', placeThumbPreview);
      img.addEventListener('mouseleave', hideThumbPreview);
    });
  }

  const pad = (n) => String(n).padStart(2, '0');
  const pad3 = (n) => String(n).padStart(3, '0');

  function buildItems(l) {
    const items = [];
    const entries = Array.isArray(l.entries) ? l.entries : [];
    if (!entries.length && l.filmId) {
      const film = Films.data.film(l.filmId);
      if (film) {
        items.push({ type: 'vol', label: l.vol || '第一卷' });
        items.push({ type: 'row', film, rank: 1 });
      }
      return items;
    }

    entries.forEach((entry, i) => {
      const movieId = entry.movieId || entry.movie_id;
      const film = Films.data.film(movieId);
      if (!film) return;
      const rank = Number(entry.rank) || i + 1;
      items.push({ type: 'row', film, rank });
    });
    return items;
  }

  function rowHtml(film, rank, index, listId) {
    const watched = Films.store.isWatched(film.id);
    const at = Films.store.dateOf(film.id);
    const href = `#/movie/${encodeURIComponent(film.id)}?list=${encodeURIComponent(listId)}`;
    const still = Array.isArray(film.stills)
      ? ((film.stills.find((s) => s && s.kind !== 'placeholder') || {}).path || '')
      : (film.stills || '');
    const thumb = ui.asset(film.poster || still);
    const runtime = typeof film.runtime === 'number' ? `${film.runtime}′` : (film.runtime || '');
    const country = film.country || film.primary_country || '';
    const color = film.film || 'var(--film-fallback)';
    return `<li class="row ${watched ? 'watched' : ''}" data-movie="${ui.esc(film.id)}" data-index="${index}"
      aria-setsize="${state.items.length}" aria-posinset="${index + 1}" style="--film:${color}">
      <a class="row-link" href="${href}" style="--title-w:${ui.metrics.titleCellW}px; --dir-w:${ui.metrics.dirCap}px">
        <span class="no">No.${pad3(rank)}</span>
        <span class="titles" style="width:${ui.metrics.titleCellW}px">${ui.nameCells(film)}</span>
        <span class="meta year">${film.year}</span>
        ${ui.directorCell(film)}
        <span class="meta rt">${ui.esc(runtime)}</span>
        <span class="meta cc">${ui.esc(country)}</span>
      </a>
      <span class="row-mark">
        <img class="row-still" src="${ui.esc(thumb)}" alt="" aria-hidden="true">
        ${watched ? `<span class="stamp">已入场 · ${at}</span>` : ''}
      </span>
      <button class="stampbtn" data-watch="${ui.esc(film.id)}" aria-pressed="${watched}">${watched ? '已入场' : '看过'}</button>
    </li>`;
  }

  function headHtml(l) {
    return `<section class="listhead view">
      <div class="kicker">${ui.esc(l.genre)}</div>
      <h1>${ui.esc(l.title)}</h1>
      <p class="canon">${l.count} 部</p>
    </section>`;
  }

  function renderPaged() {
    if (!state) return;
    const total = Math.max(1, Math.ceil(state.entries.length / state.pageSize));
    state.page = Math.min(total, Math.max(1, state.page));
    const start = (state.page - 1) * state.pageSize;
    const pageEntries = state.entries.slice(start, start + state.pageSize);
    const pageList = Object.assign({}, state.list, { entries: pageEntries });
    const pageItems = buildItems(pageList);
    state.reel.innerHTML = pageItems.map((item, i) => (
      rowHtml(item.film, item.rank, start + i, state.listId)
    )).join('');
    ui.bindNameScroll(state.reel);
    bindThumbPreview(state.reel);
    const pos = state.pager.querySelector('.pager-pos');
    if (pos) pos.textContent = `第 ${state.page} / ${total} 页`;
    const prev = state.pager.querySelector('[data-page-prev]');
    const next = state.pager.querySelector('[data-page-next]');
    if (prev) prev.disabled = state.page <= 1;
    if (next) next.disabled = state.page >= total;
  }

  function bindPager() {
    const pager = state.pager;
    pager.querySelector('[data-page-prev]').addEventListener('click', () => {
      if (state.page <= 1) return;
      state.page -= 1;
      hideThumbPreview();
      renderPaged();
      window.scrollTo(0, Math.max(0, state.root.offsetTop - 20));
    });
    pager.querySelector('[data-page-next]').addEventListener('click', () => {
      const total = Math.ceil(state.entries.length / state.pageSize);
      if (state.page >= total) return;
      state.page += 1;
      hideThumbPreview();
      renderPaged();
      window.scrollTo(0, Math.max(0, state.root.offsetTop - 20));
    });
    pager.querySelector('[data-page-size]').addEventListener('change', (e) => {
      state.pageSize = PAGE_SIZES.includes(Number(e.target.value)) ? Number(e.target.value) : DEFAULT_PAGE_SIZE;
      state.page = 1;
      hideThumbPreview();
      renderPaged();
    });
  }

  function renderWindow(force = false) {
    if (!state) return;
    const { reel, items, itemH } = state;
    const localY = Math.max(0, -reel.getBoundingClientRect().top);
    const maxStart = Math.max(0, items.length - (VIEW + BUFFER * 2));
    const start = Math.min(maxStart, Math.max(0, Math.floor(localY / itemH) - BUFFER));
    const end = Math.min(items.length, start + VIEW + BUFFER * 2);
    if (!force && start === state.start && end === state.end) return;
    state.start = start;
    state.end = end;

    const top = `<li class="reel-spacer" aria-hidden="true" style="height:${start * itemH}px"></li>`;
    const bottom = `<li class="reel-spacer" aria-hidden="true" style="height:${(items.length - end) * itemH}px"></li>`;
    const body = items.slice(start, end).map((item, i) => {
      const index = start + i;
      return rowHtml(item.film, item.rank, index, state.listId);
    }).join('');
    reel.innerHTML = top + body + bottom;
    ui.bindNameScroll(reel);
    bindThumbPreview(reel);
  }

  function onScroll() {
    if (!state || state.ticking) return;
    hideThumbPreview();
    state.ticking = true;
    requestAnimationFrame(() => {
      if (!state) return;
      state.ticking = false;
      renderWindow();
    });
  }

  function onResize() {
    if (!state) return;
    state.itemH = window.matchMedia('(max-width: 560px)').matches ? 72 : 64;
    state.reel.style.setProperty('--reel-item-h', `${state.itemH}px`);
    renderWindow(true);
  }

  function firstRow(from, dir) {
    for (let i = from; i >= 0 && i < state.items.length; i += dir) {
      if (state.items[i].type === 'row') return i;
    }
    return -1;
  }

  function focusIndex(index) {
    if (!state || index < 0) return;
    state.cursor = index;
    const reelTop = state.reel.getBoundingClientRect().top + window.scrollY;
    const y = Math.max(0, reelTop + index * state.itemH - 80);
    window.scrollTo(0, y);
    renderWindow(true);
    requestAnimationFrame(() => {
      const row = state && state.reel.querySelector(`.row[data-index="${index}"] .row-link`);
      if (row) row.focus();
    });
  }

  function onKeydown(e) {
    if (!state) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const dir = e.key === 'ArrowDown' ? 1 : -1;
      const from = state.cursor >= 0 ? state.cursor + dir : 0;
      const next = firstRow(from, dir);
      if (next >= 0) focusIndex(next);
    } else if (e.key === 'Home') {
      e.preventDefault();
      focusIndex(firstRow(0, 1));
    } else if (e.key === 'End') {
      e.preventDefault();
      focusIndex(firstRow(state.items.length - 1, -1));
    }
  }

  function syncWatch(id) {
    if (!state) return;
    const watched = Films.store.isWatched(id);
    const at = Films.store.dateOf(id);
    state.reel.querySelectorAll(`.row[data-movie="${id}"]`).forEach((row) => {
      row.classList.toggle('watched', watched);
      const mark = row.querySelector('.row-mark');
      const old = mark && mark.querySelector('.stamp');
      if (watched && mark && !old) {
        const stamp = document.createElement('span');
        stamp.className = 'stamp';
        stamp.textContent = `已入场 · ${at}`;
        mark.appendChild(stamp);
      } else if (!watched && old) {
        old.remove();
      }
      const btn = row.querySelector('.stampbtn');
      if (btn) {
        btn.textContent = watched ? '已入场' : '看过';
        btn.setAttribute('aria-pressed', String(watched));
      }
    });
  }

  function destroy() {
    if (!state) return;
    hideThumbPreview();
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);
    state.reel.removeEventListener('keydown', onKeydown);
    state = null;
  }

  function mount(root, listId) {
    destroy();
    const l = Films.data.list(listId);
    if (!l) return false;
    const items = buildItems(l);
    if (!items.length) {
      root.innerHTML = `${headHtml(l)}<p class="canon view">这个榜还没有条目。</p>`;
      return true;
    }
    const entries = Array.isArray(l.entries) ? l.entries : [];
    const itemH = window.matchMedia('(max-width: 560px)').matches ? 72 : 64;

    if (!window.FILMS_VIRTUAL_TEST) {
      root.innerHTML = `${headHtml(l)}
        <ol class="reel view" id="reel" aria-label="${ui.esc(l.title)}，共 ${l.count} 部"></ol>
        <nav class="pager view" aria-label="分页">
          <button type="button" data-page-prev>上一页</button>
          <span class="pager-pos">第 1 / 1 页</span>
          <button type="button" data-page-next>下一页</button>
          <label class="pager-size">每页
            <select data-page-size>
              ${PAGE_SIZES.map((size) => `<option value="${size}"${size === DEFAULT_PAGE_SIZE ? ' selected' : ''}>${size}</option>`).join('')}
            </select>
            部
          </label>
        </nav>`;
      const reel = root.querySelector('#reel');
      state = {
        listId, list: l, entries, items, paginated: true,
        page: 1, pageSize: DEFAULT_PAGE_SIZE, itemH, cursor: -1,
        reel, root, pager: root.querySelector('.pager'),
      };
      bindPager();
      renderPaged();
      return true;
    }

    root.innerHTML = `${headHtml(l)}<ol class="reel reel-virt view" id="reel" tabindex="0"
      aria-label="${ui.esc(l.title)}，共 ${l.count} 部" style="--reel-item-h:${itemH}px"></ol>`;
    const reel = root.querySelector('#reel');
    state = { listId, list: l, items, itemH, start: -1, end: -1, cursor: -1, ticking: false, reel };
    renderWindow(true);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    reel.addEventListener('keydown', onKeydown);
    reel.addEventListener('focusin', (e) => {
      const row = e.target.closest('.row');
      if (row) state.cursor = Number(row.dataset.index);
    });
    return true;
  }

  Films.list = { mount, syncWatch, destroy };
})();

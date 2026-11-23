/* 详情页：一场放映。榜单来源来自网址里的 ?list=，没有来源时列所属榜单。 */
(function () {
  const Films = window.Films || (window.Films = {});
  const ui = Films.ui;
  let currentId = null;

  function render(f, listId) {
    const watched = Films.store.isWatched(f.id);
    const at = Films.store.dateOf(f.id);
    const memberships = Films.data.memberships(f);
    const stills = (Array.isArray(f.stills) ? f.stills : [])
      .filter((s) => s && s.path && s.kind !== 'placeholder')
      .map((s) => ui.asset(s.path));
    const posterSrc = ui.asset(f.poster);
    const galleryImages = posterSrc ? [posterSrc, ...stills] : stills;
    const quoteText = typeof f.quote === 'string' ? f.quote : (f.quote && f.quote.text) || '';
    const quoteZh = (f.quote && f.quote.zh) || '';
    const techRows = (f.tech || [
      ['片长', f.runtime ? `${f.runtime} 分钟` : ''],
      ['画幅', f.aspect || ''],
      ['声音', f.sound || ''],
      ['色彩', f.color === 'bw' ? '黑白' : '彩色'],
      ['国别', f.country || ''],
      ['语言', (f.languages || []).join(' / ') || ''],
    ]).filter(([, value]) => value && value !== '缺失');
    const tech = techRows.map(([k, v]) => `<div>${ui.esc(k)} <b>${ui.esc(v)}</b></div>`).join('');
    const awardsList = (f.awards || []).length
      ? f.awards.map((a) => `<li><span class="tier">${ui.esc(a.tier)}</span><span>${ui.esc(a.name)}</span><span class="yr">${a.year}</span></li>`).join('')
      : '';
    const awards = awardsList
      ? `<section class="awards"><h2>获奖记录</h2><ul>${awardsList}</ul></section>`
      : '';
    let noteParts = Array.isArray(f.note) ? f.note : [];
    if (!noteParts.length) {
      const contextList = listId || (memberships[0] && memberships[0].list_id);
      const list = contextList ? Films.data.list(contextList) : null;
      const entry = list && (list.entries || []).find((e) => (e.movie_id || e.movieId) === f.id);
      if (entry && entry.note) noteParts = [entry.note];
    }
    const note = noteParts.map((p) => `<p>${ui.esc(p)}</p>`).join('');
    const noteSection = note
      ? `<section class="note"><h2>上榜理由</h2>${note}</section>`
      : '';
    const quote = quoteText
      ? `<div class="quoteline"><p class="quote-original">${ui.esc(quoteText)}</p>${quoteZh ? `<p class="quote-zh"><em>${ui.esc(quoteZh)}</em></p>` : ''}</div>`
      : '';
    const gallery = galleryImages.length
      ? `<div class="still-block">
          <figure class="still-gallery" data-stills="${ui.esc(JSON.stringify(galleryImages))}">
            <button type="button" class="still-open" aria-label="查看大图">
              <img class="still-image" src="${ui.esc(galleryImages[0])}" alt="">
            </button>
          </figure>
          <div class="still-nav">
            <button type="button" data-still-prev aria-label="上一张">‹</button>
            <span class="still-count">1 / ${galleryImages.length}</span>
            <button type="button" data-still-next aria-label="下一张">›</button>
          </div>
        </div>`
      : '';
    const color = f.film || 'var(--film-fallback)';

    return `<article class="detail view" style="--film:${color}">
      <div class="still">
        ${posterSrc ? `<img class="still-poster" src="${ui.esc(posterSrc)}" alt="" aria-hidden="true">` : ''}
        <div class="bars" aria-hidden="true"></div>
        <div class="still-wm">
          <svg viewBox="0 0 1000 150" preserveAspectRatio="none" aria-hidden="true">
            <text x="0" y="128" textLength="${ui.wmTarget(f.wm || f.en || String(f.year))}" lengthAdjust="spacingAndGlyphs">${ui.esc(f.wm || f.en || String(f.year))}</text>
          </svg>
        </div>
        <div class="still-body">
          <div class="title-row">
            <h1>${ui.esc(f.zh)}</h1>
            <button class="watch-btn ${watched ? 'on stamped' : ''}" data-watch="${ui.esc(f.id)}" aria-pressed="${watched}">${watched ? `<span class="watch-label">已入场</span><span class="watch-stamp">${at}</span>` : '看过'}</button>
          </div>
          <div class="meta-row">
            <span class="en">${ui.esc(String(f.year))} · ${ui.esc(f.director)}</span>
          </div>
        </div>
      </div>
      <div class="detail-body">
        <div class="col-main">
          ${quote}
          <div class="techbar">${tech}</div>
          ${noteSection}
          ${awards}
        </div>
        <aside class="col-rail">
          ${gallery}
        </aside>
      </div>
      <div class="lightbox" hidden>
        <button type="button" class="lightbox-close" aria-label="关闭">×</button>
        <button type="button" class="lightbox-prev" aria-label="上一张">‹</button>
        <img class="lightbox-image" src="" alt="">
        <button type="button" class="lightbox-next" aria-label="下一张">›</button>
        <span class="lightbox-count"></span>
      </div>
    </article>`;
  }

  function bindGallery(root) {
    const figure = root.querySelector('.still-gallery');
    if (!figure) return;
    const paths = JSON.parse(figure.dataset.stills || '[]');
    const image = figure.querySelector('.still-image');
    const count = root.querySelector('.still-count');
    const prev = root.querySelector('[data-still-prev]');
    const next = root.querySelector('[data-still-next]');
    const box = root.querySelector('.lightbox');
    const boxImage = box.querySelector('.lightbox-image');
    const boxCount = box.querySelector('.lightbox-count');
    let index = 0;

    const show = (i) => {
      index = (i + paths.length) % paths.length;
      if (image) image.src = paths[index];
      if (count) count.textContent = `${index + 1} / ${paths.length}`;
      if (boxImage) boxImage.src = paths[index];
      if (boxCount) boxCount.textContent = `${index + 1} / ${paths.length}`;
    };
    const close = () => {
      box.hidden = true;
      document.body.classList.remove('lightbox-open');
    };
    const open = () => {
      box.hidden = false;
      document.body.classList.add('lightbox-open');
      show(index);
    };

    if (paths.length < 2) {
      const nav = root.querySelector('.still-nav');
      if (nav) nav.hidden = true;
      box.querySelector('.lightbox-prev').hidden = true;
      box.querySelector('.lightbox-next').hidden = true;
    } else {
      prev.addEventListener('click', () => show(index - 1));
      next.addEventListener('click', () => show(index + 1));
      box.querySelector('.lightbox-prev').addEventListener('click', () => show(index - 1));
      box.querySelector('.lightbox-next').addEventListener('click', () => show(index + 1));
    }
    figure.querySelector('.still-open').addEventListener('click', open);
    box.querySelector('.lightbox-close').addEventListener('click', close);
    box.addEventListener('click', (e) => { if (e.target === box) close(); });
    box.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(index - 1);
      if (e.key === 'ArrowRight') show(index + 1);
    });
  }

  function mount(root, movieId, listId) {
    const f = Films.data.film(movieId);
    if (!f) return false;
    currentId = movieId;
    root.innerHTML = render(f, listId);
    bindGallery(root);
    return true;
  }

  function syncWatch(id) {
    if (id !== currentId) return;
    const watched = Films.store.isWatched(id);
    const at = Films.store.dateOf(id);
    const btn = document.querySelector('.watch-btn[data-watch]');
    if (btn) {
      btn.classList.toggle('on', watched);
      btn.classList.toggle('stamped', watched);
      btn.innerHTML = watched ? `<span class="watch-label">已入场</span><span class="watch-stamp">${at}</span>` : '看过';
      btn.setAttribute('aria-pressed', String(watched));
    }
  }

  Films.detail = { mount, syncWatch };
})();

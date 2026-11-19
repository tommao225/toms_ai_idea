/* 我的观影册：已看数量、类型和年代分布、导出导入。 */
(function () {
  const Films = window.Films || (window.Films = {});
  const ui = Films.ui;
  let rootEl = null;

  function groups(films, keyFn) {
    const map = new Map();
    films.forEach((f) => {
      const key = keyFn(f);
      map.set(key, (map.get(key) || 0) + 1);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }

  function chips(pairs, suffix = '') {
    return pairs.map(([k, n]) => `<span>${ui.esc(k)}${suffix} <b>${n}</b></span>`).join('');
  }

  function bind() {
    const exportBtn = rootEl.querySelector('#watch-export');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const blob = new Blob([Films.store.exportText()], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'films-watched.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      });
    }

    const input = rootEl.querySelector('#watch-import');
    if (input) {
      input.addEventListener('change', async () => {
        const file = input.files && input.files[0];
        if (!file) return;
        const status = rootEl.querySelector('#watch-status');
        try {
          const count = Films.store.importText(await file.text());
          if (status) status.textContent = `导入完成，现在共 ${count} 部。`;
          Films.watch.mount(rootEl);
        } catch (err) {
          if (status) status.textContent = `导入失败：${err.message}`;
        }
      });
    }
  }

  function mount(root) {
    rootEl = root;
    const map = Films.store.all();
    const ids = Object.keys(map);
    const films = ids.map((id) => Films.data.film(id)).filter(Boolean);
    const sorted = ids
      .filter((id) => Films.data.film(id))
      .sort((a, b) => (map[b].at || '').localeCompare(map[a].at || ''));

    const items = sorted.map((id) => {
      const f = Films.data.film(id);
      return `<li><a class="zh" href="#/movie/${encodeURIComponent(id)}">${ui.esc(f.zh)}</a>
        <span class="yr">${f.year}</span><span class="at">${ui.esc(map[id].at)}</span></li>`;
    }).join('');

    const genre = groups(films, (f) => f.genreLabel || '其他');
    const decade = groups(films, (f) => `${Math.floor(f.year / 10) * 10}s`);

    root.innerHTML = `<section class="listhead view">
      <div class="kicker">我的</div>
      <h1>观影册</h1>
      <p class="canon">${ids.length ? `${ids.length} 部。数据只存本机，导出即备份。` : '还没有看过。去任意榜单点「看过」，这里会按日期排出来。'}</p>
      ${ids.length ? `<div class="canonbar"><span>类型</span>${chips(genre)}</div>
        <div class="canonbar"><span>年代</span>${chips(decade)}</div>` : ''}
      <div class="watch-actions">
        <button id="watch-export" class="watch-btn small">导出</button>
        <label class="watch-btn small" for="watch-import">导入</label>
        <input id="watch-import" type="file" accept="application/json,.json" hidden>
      </div>
      <p id="watch-status" class="watch-hint"></p>
    </section>
    ${ids.length ? `<ul class="watchlist view">${items}</ul>` : ''}`;
    bind();
  }

  Films.watch = { mount };
})();

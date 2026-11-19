/* 搜索：只查站内索引，不额外请求。 */
(function () {
  const Films = window.Films || (window.Films = {});
  const ui = Films.ui;

  function normalize(text) {
    return String(text || '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  function render(root, initial) {
    const items = Films.data.search();
    root.innerHTML = `<section class="listhead view">
      <div class="kicker">目录</div>
      <h1>搜索</h1>
      <p class="canon">${items.length} 部</p>
      <div class="search-box"><input class="search-input" type="search" placeholder="片名、导演、年份" value="${ui.esc(initial || '')}" autocomplete="off"></div>
    </section>
    <ol class="search-results view"></ol>`;
    const input = root.querySelector('.search-input');
    const results = root.querySelector('.search-results');

    const paint = () => {
      const q = normalize(input.value);
      const found = q
        ? items.filter((item) => normalize(`${item.zh} ${item.en} ${item.director} ${item.year} ${item.genre}`).includes(q))
        : items;
      const shown = found.slice(0, 80);
      results.innerHTML = shown.map((item) => `<li class="search-row">
        <a href="#/movie/${encodeURIComponent(item.id)}${item.list ? `?list=${encodeURIComponent(item.list)}` : ''}">
          <img src="${ui.esc(ui.asset(item.poster))}" alt="" loading="lazy">
          <span class="search-title"><b>${ui.esc(item.zh)}</b><i>${ui.esc(item.en)}</i></span>
          <span class="search-meta">${item.year} · ${ui.esc(item.director)}</span>
          <span class="search-genre">${ui.esc(item.genre)}</span>
        </a>
      </li>`).join('') || '<p class="canon">没有找到。</p>';
    };

    input.addEventListener('input', paint);
    input.focus();
    paint();
  }

  Films.search = { render };
})();

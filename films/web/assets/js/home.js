/* 首页：按榜单列出放映目录。 */
(function () {
  const Films = window.Films || (window.Films = {});
  const ui = Films.ui;

  function render() {
    const lists = Object.values(Films.data.lists())
      .filter((l) => Number(l.count) > 0)
      .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
    const cards = lists.map((l) => {
      const genre = l.genreKey || '';
      return `<a class="card" data-genre="${ui.esc(genre)}" href="#/list/${encodeURIComponent(l.id)}">
        <h2>${ui.esc(l.title)}</h2>
        <span class="card-count"><b>${l.count}</b> 部</span>
      </a>`;
    }).join('');

    return `<section class="hero view">
      <h1 class="hero-title">放 映 单</h1>
      <figure class="hero-quote">
        <blockquote>电影是一秒24格的真理</blockquote>
      </figure>
    </section>
    <section class="cards view">${cards || '<p class="canon">还没有片单。</p>'}</section>`;
  }

  Films.home = { render };
})();

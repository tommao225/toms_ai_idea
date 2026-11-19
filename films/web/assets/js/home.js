/* 首页：按榜单列出放映目录。 */
(function () {
  const Films = window.Films || (window.Films = {});
  const ui = Films.ui;

  function render() {
    const order = { 悬疑: 0, 科幻: 1, 动作: 2, 剧情: 3, 喜剧: 4, 爱情: 5, 犯罪: 6, 动画: 7, 恐怖: 8 };
    const lists = Object.values(Films.data.lists())
      .filter((l) => Number(l.count) > 0)
      .sort((a, b) => (order[a.genre] ?? 99) - (order[b.genre] ?? 99));
    const cards = lists.map((l) => {
      const color = l.color || '#3A4653';
      return `<a class="card" href="#/list/${encodeURIComponent(l.id)}" style="--film:${color}">
        <h2>${ui.esc(l.title)}</h2>
        <span class="card-count"><b>${l.count}</b> 部</span>
      </a>`;
    }).join('');

    return `<section class="hero view">
      <h1 class="hero-title">放 映 单</h1>
      <figure class="hero-quote">
        <blockquote>电影是一秒24格的真理&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="hero-quote-by">——吕克·戈达尔</span></blockquote>
      </figure>
    </section>
    <section class="cards view">${cards || '<p class="canon">还没有片单。</p>'}</section>`;
  }

  Films.home = { render };
})();

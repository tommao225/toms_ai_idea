/* 首页：按榜单列出放映目录；卡片顺序可拖动并保存在本机。 */
(function () {
  const Films = window.Films || (window.Films = {});
  const ui = Films.ui;
  const ORDER_KEY = 'films.cardOrder.v1';
  let dragged = null;

  function readOrder() {
    try {
      const value = JSON.parse(localStorage.getItem(ORDER_KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function ordered(lists) {
    const saved = readOrder();
    const rank = new Map(saved.map((id, i) => [id, i]));
    return [...lists].sort((a, b) => {
      const left = rank.has(a.id) ? rank.get(a.id) : Number.MAX_SAFE_INTEGER;
      const right = rank.has(b.id) ? rank.get(b.id) : Number.MAX_SAFE_INTEGER;
      return left - right || (a.order ?? 99) - (b.order ?? 99);
    });
  }

  function saveOrder() {
    const ids = [...document.querySelectorAll('.cards .card[data-list-id]')].map((card) => card.dataset.listId);
    try { localStorage.setItem(ORDER_KEY, JSON.stringify(ids)); } catch { /* 本机禁写时只保留当前 DOM 顺序 */ }
  }

  document.addEventListener('dragstart', (e) => {
    const card = e.target.closest('.card[data-list-id]');
    if (!card) return;
    dragged = card;
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', card.dataset.listId);
  });

  document.addEventListener('dragover', (e) => {
    if (!dragged || !e.target.closest('.cards')) return;
    e.preventDefault();
    const container = document.querySelector('.cards');
    const cards = [...container.querySelectorAll('.card:not(.dragging)')];
    const target = cards.find((card) => {
      const rect = card.getBoundingClientRect();
      return e.clientY < rect.top || (e.clientY <= rect.bottom && e.clientX < rect.left + rect.width / 2);
    });
    container.insertBefore(dragged, target || null);
  });

  document.addEventListener('dragend', () => {
    if (!dragged) return;
    dragged.classList.remove('dragging');
    dragged = null;
    saveOrder();
  });

  function render() {
    const lists = ordered(Object.values(Films.data.lists())
      .filter((l) => Number(l.count) > 0));
    const cards = lists.map((l) => {
      const genre = l.genreKey || '';
      return `<a class="card" draggable="true" data-list-id="${ui.esc(l.id)}" data-genre="${ui.esc(genre)}" href="#/list/${encodeURIComponent(l.id)}">
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

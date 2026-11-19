/* 路由与启动：只负责把地址映射到视图，数据按榜单/电影按需加载。 */
(function () {
  const Films = window.Films || (window.Films = {});
  let current = null;
  let renderToken = 0;

  function parse() {
    const hash = location.hash || '#/';
    if (hash.startsWith('#/list/')) {
      return { view: 'list', id: decodeURIComponent(hash.slice(7)) };
    }
    if (hash.startsWith('#/movie/')) {
      const raw = hash.slice(8);
      const [id, query] = raw.split('?');
      return {
        view: 'detail',
        id: decodeURIComponent(id),
        listId: new URLSearchParams(query || '').get('list'),
      };
    }
    if (hash === '#/watch') return { view: 'watch' };
    if (hash.startsWith('#/search')) {
      const [, query] = hash.split('?');
      return { view: 'search', q: new URLSearchParams(query || '').get('q') || '' };
    }
    return { view: 'home' };
  }

  function notFound(message) {
    return `<section class="listhead view">
      <div class="kicker">404</div>
      <h1>找不到这一页</h1>
      <p class="canon">${message} <a href="#/">回目录</a></p>
    </section>`;
  }

  const loading = '<section class="listhead view"><p class="canon">正在载入…</p></section>';

  async function render() {
    const token = ++renderToken;
    const route = parse();
    const app = document.getElementById('app');
    if (!app) return;
    Films.list.destroy();
    Films.ui.measure();
    app.innerHTML = '';
    current = route;

    if (route.view === 'list') {
      app.innerHTML = loading;
      try {
        const list = await Films.data.loadList(route.id);
        if (token !== renderToken) return;
        if (!list || !Films.list.mount(app, route.id)) {
          app.innerHTML = notFound('这个榜单不存在。');
          current = { view: '404' };
        }
      } catch {
        if (token !== renderToken) return;
        app.innerHTML = notFound('这个榜单不存在。');
        current = { view: '404' };
      }
    } else if (route.view === 'detail') {
      app.innerHTML = loading;
      try {
        const film = await Films.data.loadMovie(route.id);
        if (token !== renderToken) return;
        if (!film) {
          app.innerHTML = notFound('这部电影不存在。');
          current = { view: '404' };
        } else {
          const context = route.listId || (film.lists && film.lists[0] && film.lists[0].list_id);
          if (context) {
            try { await Films.data.loadList(context); } catch { /* 没榜单数据也能看详情 */ }
          }
          if (token !== renderToken) return;
          if (!Films.detail.mount(app, route.id, route.listId)) {
            app.innerHTML = notFound('这部电影不存在。');
            current = { view: '404' };
          }
        }
      } catch {
        if (token !== renderToken) return;
        app.innerHTML = notFound('这部电影不存在。');
        current = { view: '404' };
      }
    } else if (route.view === 'watch') {
      app.innerHTML = loading;
      const ids = Object.keys(Films.store.all());
      await Films.data.loadMovies(ids);
      if (token !== renderToken) return;
      Films.watch.mount(app);
    } else if (route.view === 'search') {
      Films.search.render(app, route.q);
    } else {
      app.innerHTML = Films.home.render();
    }
    window.scrollTo(0, 0);
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-watch]');
    if (!btn) return;
    e.preventDefault();
    const id = btn.dataset.watch;
    Films.store.toggle(id);
    if (current && current.view === 'list') Films.list.syncWatch(id);
    else if (current && current.view === 'detail') Films.detail.syncWatch(id);
  });

  window.addEventListener('hashchange', render);

  Films.ui.measure();
  render();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      Films.ui.measure();
      render();
    });
  }

  Films.app = { render };
})();

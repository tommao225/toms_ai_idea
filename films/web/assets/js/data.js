/* 数据入口：首页只读 site.js 的榜单索引；榜单页、详情页按需加载。 */
(function () {
  const Films = window.Films || (window.Films = {});
  const index = window.FILMS_DATA || { films: {}, lists: {} };
  const films = { ...(index.films || {}) };
  const lists = { ...(index.lists || {}) };
  const search = Array.isArray(index.search) ? index.search : [];
  const loadedLists = new Set();
  const loadedMovies = new Set();
  const scripts = new Map();

  function loadScript(src, globalName) {
    if (scripts.has(src)) return scripts.get(src);
    const promise = new Promise((resolve, reject) => {
      try { delete window[globalName]; } catch { window[globalName] = undefined; }
      const el = document.createElement('script');
      el.src = src;
      el.async = true;
      el.onload = () => {
        const value = window[globalName];
        if (!value) {
          reject(new Error(`没有读到 ${globalName}`));
          return;
        }
        resolve(value);
      };
      el.onerror = () => reject(new Error(`加载失败：${src}`));
      document.head.appendChild(el);
    });
    scripts.set(src, promise);
    return promise;
  }

  async function loadList(id) {
    if (loadedLists.has(id)) return lists[id];
    if (!lists[id]) return null;
    if (Array.isArray(lists[id].entries)) {
      loadedLists.add(id);
      return lists[id];
    }
    const payload = await loadScript(`data/lists/${encodeURIComponent(id)}.js`, 'FILM_LIST_DATA');
    if (!payload || !payload.list || payload.list.id !== id) throw new Error('榜单数据不对');
    lists[id] = payload.list;
    Object.entries(payload.films || {}).forEach(([movieId, film]) => {
      // 榜单里的是摘要；已经加载过完整电影时不能被摘要覆盖，否则详情页会丢字段。
      if (!isFull(films[movieId])) films[movieId] = film;
    });
    loadedLists.add(id);
    return lists[id];
  }

  function isFull(film) {
    return Boolean(film && film.titles && film.genres && Array.isArray(film.lists));
  }

  async function loadMovie(id) {
    if (isFull(films[id])) {
      loadedMovies.add(id);
      return films[id];
    }
    if (loadedMovies.has(id) && films[id]) return films[id];
    const movie = await loadScript(`data/movies/${encodeURIComponent(id)}.js`, 'FILM_MOVIE_DATA');
    films[id] = movie;
    loadedMovies.add(id);
    return movie;
  }

  async function loadMovies(ids) {
    for (const id of ids) {
      try { await loadMovie(id); } catch (err) {
        console.warn(`电影数据加载失败：${id}`, err);
      }
    }
  }

  Films.data = {
    films: () => films,
    lists: () => lists,
    search: () => search,
    film: (id) => films[id] || null,
    list: (id) => lists[id] || null,
    memberships: (film) => (Array.isArray(film.lists) ? film.lists : []),
    loadList,
    loadMovie,
    loadMovies,
  };
})();

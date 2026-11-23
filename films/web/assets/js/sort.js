/* 列表排序：中文拼音、英文标题、年份；年份可切换从大到小/从小到大。 */
(function () {
  const Films = window.Films || (window.Films = {});
  const MODES = ['zh', 'en', 'year'];
  const KEY = 'films.sortMode.v1';
  const DIR_KEY = 'films.sortYearDir.v1';

  function loadMode() {
    try {
      const value = localStorage.getItem(KEY);
      return MODES.includes(value) ? value : 'zh';
    } catch {
      return 'zh';
    }
  }

  function saveMode(mode) {
    try { localStorage.setItem(KEY, MODES.includes(mode) ? mode : 'zh'); } catch { /* 本机禁写时保持本次会话 */ }
  }

  function loadYearDir() {
    try {
      return localStorage.getItem(DIR_KEY) === 'asc' ? 'asc' : 'desc';
    } catch {
      return 'desc';
    }
  }

  function saveYearDir(dir) {
    try { localStorage.setItem(DIR_KEY, dir === 'asc' ? 'asc' : 'desc'); } catch { /* 本机禁写时保持本次会话 */ }
  }

  function titleFor(film, mode) {
    if (mode === 'en') return film.en || film.zh || '';
    return film.zh || film.en || '';
  }

  function sortItems(items, mode, yearDir = 'desc') {
    const zh = new Intl.Collator('zh-CN', { sensitivity: 'base', numeric: true });
    const en = new Intl.Collator('en', { sensitivity: 'base', numeric: true });
    return [...items].sort((a, b) => {
      if (mode === 'year') {
        const direction = yearDir === 'asc' ? 1 : -1;
        return direction * ((Number(a.film.year) || 0) - (Number(b.film.year) || 0))
          || zh.compare(titleFor(a.film, 'zh'), titleFor(b.film, 'zh'))
          || a.film.id.localeCompare(b.film.id);
      }
      const collator = mode === 'en' ? en : zh;
      return collator.compare(titleFor(a.film, mode), titleFor(b.film, mode))
        || zh.compare(titleFor(a.film, 'zh'), titleFor(b.film, 'zh'))
        || a.film.id.localeCompare(b.film.id);
    });
  }

  Films.sort = { loadMode, saveMode, loadYearDir, saveYearDir, sortItems, titleFor };
})();

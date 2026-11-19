/* 打卡存储：唯一写入口。格式是 { movie_id: { at: 'YYYY-MM-DD' } }。 */
(function () {
  const Films = window.Films || (window.Films = {});
  const KEY = 'films.watched.v1';

  function today() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  function read() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      const out = {};
      Object.entries(parsed || {}).forEach(([id, value]) => {
        const at = typeof value === 'string' ? value : value && value.at;
        if (at) out[id] = { at };
      });
      return out;
    } catch {
      return {};
    }
  }

  function write(map) {
    try { localStorage.setItem(KEY, JSON.stringify(map)); } catch { /* file:// 预览时忽略 */ }
  }

  function all() {
    return read();
  }

  function dateOf(id) {
    const item = read()[id];
    return item ? item.at : '';
  }

  function isWatched(id) {
    return Boolean(dateOf(id));
  }

  function mark(id) {
    const map = read();
    if (!map[id]) map[id] = { at: today() };
    write(map);
    return map[id].at;
  }

  function unmark(id) {
    const map = read();
    delete map[id];
    write(map);
  }

  function toggle(id) {
    if (isWatched(id)) {
      unmark(id);
      return false;
    }
    mark(id);
    return true;
  }

  function exportText() {
    return JSON.stringify({ version: 1, watched: read() }, null, 2);
  }

  function importText(text) {
    const parsed = JSON.parse(text);
    const incoming = parsed && parsed.watched ? parsed.watched : parsed;
    if (!incoming || typeof incoming !== 'object') throw new Error('不是有效的打卡文件');
    const map = read();
    Object.entries(incoming).forEach(([id, value]) => {
      const at = typeof value === 'string' ? value : value && value.at;
      if (!at) return;
      if (!map[id] || map[id].at < at) map[id] = { at };
    });
    write(map);
    return Object.keys(map).length;
  }

  Films.store = { all, dateOf, isWatched, mark, unmark, toggle, exportText, importText };
})();

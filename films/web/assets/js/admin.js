/* 管理员：会话、详情页编辑/删除、侧边抽屉新增。 */
(function () {
  const Films = window.Films || (window.Films = {});
  const ui = Films.ui;
  let admin = false;
  let drawer = null;

  async function session() {
    try {
      const res = await fetch('/api/admin/session', { headers: { Accept: 'application/json' } });
      const data = await res.json();
      admin = Boolean(data.admin);
    } catch {
      admin = false;
    }
  }

  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text) node.textContent = text;
    return node;
  }

  function addTopbar() {
    if (!admin || document.querySelector('.admin-add')) return;
    const nav = document.querySelector('.topnav');
    if (!nav) return;
    const link = el('a', 'admin-add', '新增');
    link.href = '#';
    link.addEventListener('click', (e) => { e.preventDefault(); openDrawer(); });
    nav.append(link);
  }

  function injectDetail() {
    if (!admin) return;
    const row = document.querySelector('.title-row');
    const watch = row && row.querySelector('.watch-btn[data-watch]');
    if (!row || !watch || row.querySelector('.admin-btn')) return;
    const movieId = watch.dataset.watch;
    const edit = el('button', 'watch-btn admin-btn', '编辑');
    edit.type = 'button';
    edit.addEventListener('click', () => openDrawer(movieId));
    const remove = el('button', 'watch-btn admin-btn admin-delete', '删除');
    remove.type = 'button';
    remove.addEventListener('click', async () => {
      if (!window.confirm('删除这部电影？')) return;
      const res = await fetch(`/api/admin/movies/${encodeURIComponent(movieId)}`, { method: 'DELETE' });
      if (res.ok) location.reload();
      else window.alert('删除失败');
    });
    watch.after(edit, remove);
  }

  function formField(label, name, value = '', type = 'text') {
    const wrap = el('label', 'admin-field');
    wrap.append(el('span', '', label));
    const input = type === 'textarea' ? el('textarea') : el('input');
    if (type !== 'textarea') input.type = type;
    input.name = name;
    input.value = value ?? '';
    if (type === 'number') {
      const box = el('div', 'admin-number');
      box.append(input);
      const steppers = el('span', 'admin-steppers');
      const up = el('button', 'step-up', '');
      const down = el('button', 'step-down', '');
      up.type = 'button';
      down.type = 'button';
      up.setAttribute('aria-label', '加一');
      down.setAttribute('aria-label', '减一');
      up.addEventListener('click', () => { input.value = String((Number(input.value) || 0) + 1); });
      down.addEventListener('click', () => { input.value = String(Math.max(0, (Number(input.value) || 0) - 1)); });
      steppers.append(up, down);
      box.append(steppers);
      wrap.append(box);
    } else {
      wrap.append(input);
    }
    return wrap;
  }

  function buildDrawer() {
    const shell = el('div', 'admin-drawer');
    shell.innerHTML = `<div class="admin-scrim"></div><div class="admin-panel">
      <h2>新增 / 编辑电影</h2>
      <div class="admin-lookup" data-lookup-row><input name="lookup" placeholder="输入中文或英文片名，自动检索"><button type="button" data-lookup>检索</button></div>
      <div data-fields></div>
      <div class="admin-actions"><button class="primary" data-save>保存</button><button data-close>取消</button></div>
      <div class="admin-status"></div>
    </div>`;
    document.body.append(shell);
    shell.querySelector('.admin-scrim').addEventListener('click', closeDrawer);
    shell.querySelector('[data-close]').addEventListener('click', closeDrawer);
    shell.querySelector('[data-lookup]').addEventListener('click', doLookup);
    shell.querySelector('[data-save]').addEventListener('click', save);
    return shell;
  }

  function fields(data = {}) {
    const target = drawer.querySelector('[data-fields]');
    const lists = Object.values(Films.data.lists()).sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
    const selected = data.list_id || (data.lists && data.lists[0] && data.lists[0].list_id) || (lists[0] && lists[0].id) || '';
    target.innerHTML = '';
    const rows = [
      formField('中文名', 'zh', data.zh),
      formField('英文名', 'en', data.en),
      formField('年份', 'year', data.year, 'number'),
      formField('时长（分钟）', 'runtime', data.runtime, 'number'),
      formField('导演', 'director', data.director),
      formField('国别', 'country', data.country),
    ];
    rows.forEach((row) => target.append(row));
    const listField = el('label', 'admin-field');
    listField.append(el('span', '', '分类'));
    const select = el('select');
    select.name = 'list_id';
    lists.forEach((list) => {
      const option = el('option', '', list.title);
      option.value = list.id;
      if (list.id === selected) option.selected = true;
      select.append(option);
    });
    listField.append(select);
    target.append(listField);
    target.append(formField('原语言摘句', 'quote', data.quote && (data.quote.text || data.quote)));
    target.append(formField('中文翻译', 'quote_zh', data.quote && data.quote.zh));
    target.append(formField('上榜理由（可空）', 'why_included', data.why_included || ''));
    target.append(formField('海报 URL（可空，留空不改）', 'poster_url', ''));
    target.append(formField('剧照 URL（可空）', 'still_url', ''));
  }

  function openDrawer(movieId = '') {
    if (!admin) return;
    if (!drawer) drawer = buildDrawer();
    drawer.dataset.movieId = movieId || '';
    drawer.querySelector('h2').textContent = movieId ? '编辑电影' : '新增电影';
    const lookupRow = drawer.querySelector('[data-lookup-row]');
    if (lookupRow) lookupRow.style.display = movieId ? 'none' : 'flex';
    const film = movieId ? Films.data.film(movieId) : null;
    fields(film || {});
    drawer.querySelector('.admin-status').textContent = '';
    drawer.classList.add('open');
  }

  function closeDrawer() {
    if (drawer) drawer.classList.remove('open');
  }

  async function doLookup() {
    const input = drawer.querySelector('[name="lookup"]');
    const status = drawer.querySelector('.admin-status');
    const title = (input.value || '').trim();
    if (!title) return;
    status.textContent = '检索中…';
    try {
      const res = await fetch(`/api/admin/lookup?title=${encodeURIComponent(title)}`);
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || '检索失败');
      const current = {
        zh: data.zh, en: data.en, year: data.year, runtime: data.runtime,
        director: data.director, country: data.country, genres: data.genres,
        quote: data.quote, quote_zh: data.quote_zh,
      };
      fields(current);
      drawer.querySelector('[name="poster_url"]').value = data.poster_url || '';
      drawer.querySelector('[name="still_url"]').value = data.still_url || '';
      status.textContent = '已填入检索结果，请核对';
    } catch (err) {
      status.textContent = String(err.message || err);
    }
  }

  async function save() {
    const get = (name) => drawer.querySelector(`[name="${name}"]`);
    const status = drawer.querySelector('.admin-status');
    const movieId = drawer.dataset.movieId;
    const body = {
      id: movieId || undefined,
      zh: get('zh').value.trim(),
      en: get('en').value.trim(),
      year: Number(get('year').value) || 0,
      runtime: Number(get('runtime').value) || 0,
      director: get('director').value.trim(),
      country: get('country').value.trim(),
      list_id: get('list_id').value,
      quote: get('quote').value.trim(),
      quote_zh: get('quote_zh').value.trim(),
      why_included: get('why_included').value.trim(),
      poster_url: get('poster_url').value.trim(),
      still_url: get('still_url').value.trim(),
    };
    if (!body.zh && !body.en) { status.textContent = '至少填一个片名'; return; }
    status.textContent = '保存中…';
    try {
      const res = await fetch('/api/admin/movies', {
        method: movieId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || '保存失败');
      location.reload();
    } catch (err) {
      status.textContent = String(err.message || err);
    }
  }

  async function boot() {
    await session();
    if (!admin) return;
    addTopbar();
    const app = document.getElementById('app');
    if (!app) return;
    new MutationObserver(injectDetail).observe(app, { childList: true, subtree: true });
    injectDetail();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

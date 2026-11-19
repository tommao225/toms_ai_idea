/* 原型脚本：只为验证版式与氛围，不是生产实现。
   自带四部示例片；测试页可用 fixture 数据换成 100 条。 */

const DATA = window.FILMS_DATA || {};
const FILMS = DATA.films || window.__FIXTURE_FILMS__ || {
  guest: {
    id: 'guest', stills: 'assets/img/p1.jpg', poster: 'assets/img/p3.jpg', wm: 'Contratiempo', rank: 1, genreLabel: '悬疑',
    zh: '看不见的客人', en: 'Contratiempo', year: 2016,
    director: '奥里奥尔·保罗', runtime: '106′', country: '西班牙',
    film: '#3A4653',
    tech: [['片长', '106 分钟'], ['画幅', '2.39:1'], ['声音', '杜比数字'], ['色彩', '彩色'], ['国别', '西班牙'], ['语言', '西班牙语']],
    quote: '反转不是目的，是叙事的刑罚工具。',
    note: [
      '它把观众放在当事人的位置上，每一次翻供都在惩罚信任。房间、证词、剪辑的刀——密闭推理片在有限成本下能做到的极限。',
      '它没有挤进任何权威榜的前列，却是这个类型近十年最讲效率的一次实验：不靠视听奇观，只靠信息控制。归入「悬疑」，按收录门槛第 2 条（形式创新）与第 3 条（类型奠基）入选。',
    ],
    awards: [],
    awardsNote: '奖项数据待核验，原型中留空。',
  },
  interstellar: {
    id: 'interstellar', stills: 'assets/img/p2.jpg', poster: 'assets/img/p4.jpg', wm: 'Interstellar', rank: 1, genreLabel: '科幻',
    zh: '星际穿越', en: 'Interstellar', year: 2014,
    director: '克里斯托弗·诺兰', runtime: '169′', country: '美国 / 英国',
    film: '#8A5A32',
    tech: [['片长', '169 分钟'], ['画幅', '2.39:1 / 1.43:1 IMAX'], ['声音', 'IMAX 12 声道'], ['色彩', '彩色'], ['国别', '美国 / 英国'], ['语言', '英语']],
    quote: '把相对论做成情感装置。',
    note: [
      '父女之间那二十三年不是设定，是代价；黑洞的视觉不是炫技，是把不可见变成可见。科幻里少有的、把硬核与抒情同时做到不尴尬的作品。',
      '按收录门槛第 1 条（影史地位）、第 2 条（形式创新）、第 4 条（奖项）入选。',
    ],
    awards: [
      { tier: 'A', name: '奥斯卡最佳视觉效果', year: 2015 },
      { tier: 'A−', name: '金球奖最佳原创配乐（提名）', year: 2015 },
    ],
    awardsNote: '',
  },
  ove: {
    id: 'ove', stills: 'assets/img/p1.jpg', poster: 'assets/img/p5.jpg', wm: 'En man som heter Ove', rank: 1, genreLabel: '剧情',
    zh: '一个叫欧维的男人决定去死', en: 'En man som heter Ove', year: 2015,
    director: '汉内斯·霍尔姆', runtime: '116′', country: '瑞典',
    film: '#4A5A4E',
    tech: [['片长', '116 分钟'], ['画幅', '2.39:1'], ['声音', '5.1'], ['色彩', '彩色'], ['国别', '瑞典'], ['语言', '瑞典语']],
    quote: '他决定去死，却被邻居的琐事一次次留下。',
    note: [
      '一个把人生关进规矩里的人，被邻居的笨拙一点点撬开。它不靠煽情推进，而靠重复的日常动作：关门、倒车、骂人、再让步。长片名的这部电影，恰好讲的是"不改主意的人最后改了主意"。',
      '本条目用于验证长片名的排版自适应，归入剧情片；剧情分类尚未开放，暂列测试位。',
    ],
    awards: [
      { tier: 'A', name: '奥斯卡最佳外语片 · 提名', year: 2017 },
      { tier: 'A', name: '奥斯卡最佳化妆与发型设计 · 提名', year: 2017 },
    ],
    awardsNote: '',
  },
  hateful: {
    id: 'hateful', stills: 'assets/img/p3.jpg', poster: 'assets/img/p2.jpg', wm: 'The Hateful Eight', rank: 1, genreLabel: '动作',
    zh: '八恶人', en: 'The Hateful Eight', year: 2015,
    director: '昆汀·塔伦蒂诺', runtime: '167′', country: '美国',
    film: '#6B4A32',
    tech: [['片长', '167 分钟（路演版 187 分钟）'], ['画幅', '2.76:1'], ['声音', '70mm 磁声'], ['色彩', '彩色'], ['国别', '美国'], ['语言', '英语']],
    quote: '把宽银幕用在一间木屋里，这本身就是一次挑衅。',
    note: [
      '密闭空间里的一场审判，每个人都带着一份伪造的过去。它同时属于悬念与暴力：前者靠证词，后者靠宽银幕上那支始终没放下的枪。',
      '本榜按「动作」收录（第 3 条类型奠基：西部片语法的一次改写），悬疑按多类型映射另行收录，不做重复计数。',
    ],
    awards: [
      { tier: 'A', name: '奥斯卡最佳原创配乐', year: 2016 },
    ],
    awardsNote: '',
  },
};

const LISTS = DATA.lists || window.__FIXTURE_LISTS__ || {
  'global-mystery-greatest': {
    id: 'global-mystery-greatest', genre: '悬疑', filmId: 'guest',
    title: '悬疑电影', count: 1, max: 100,
    canon: { rule: '以密闭空间、证词与信息控制为主轴；不按评分排序', bias: '英语与西语片偏多', window: '1920–2024' },
    vol: '01–10 · 第一卷：证词', slots: 5,
  },
  'global-scifi-greatest': {
    id: 'global-scifi-greatest', genre: '科幻', filmId: 'interstellar',
    title: '科幻电影', count: 1, max: 100,
    canon: { rule: '形式创新优先于视觉奇观；硬核设定与人文表达并重', bias: '美国作品偏多，非英语科幻样本不足', window: '1902–2024' },
    vol: '01–10 · 第一卷：深空', slots: 5,
  },
  'global-drama-greatest': {
    id: 'global-drama-greatest', genre: '剧情', filmId: 'ove',
    title: '剧情电影', count: 1, max: 100,
    canon: { rule: '以人物与关系的变化为主轴；煽情不计分', bias: '非英语剧情片样本待补', window: '1920–2024' },
    vol: '01–10 · 第一卷：规矩', slots: 3, testOnly: true,
  },
  'global-action-greatest': {
    id: 'global-action-greatest', genre: '动作', filmId: 'hateful',
    title: '动作电影', count: 1, max: 100,
    canon: { rule: '动作语法与身体调度优先；特效堆砌不计入', bias: '亚洲动作片收录不足，待补', window: '1920–2024' },
    vol: '01–10 · 第一卷：雪原', slots: 5,
  },
};

const STORE_KEY = 'films.watched.v1';

function watched() {
  // 原型演示用：?demo=watched 让三部片都显示为已看过，便于截取打卡后的视觉。
  if (new URLSearchParams(location.search).get('demo') === 'watched') {
    return { guest: '2026-11-12', interstellar: '2026-11-12', hateful: '2026-11-12' };
  }
  try {
    const parsed = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
    const out = {};
    Object.entries(parsed || {}).forEach(([id, value]) => {
      const at = typeof value === 'string' ? value : value && value.at;
      if (at) out[id] = at;
    });
    return out;
  } catch { return {}; }
}
function setWatched(map) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(map)); } catch { /* file:// 预览时忽略 */ }
}
function toggle(id) {
  const map = watched();
  if (map[id]) delete map[id];
  else map[id] = new Date().toISOString().slice(0, 10);
  setWatched(map);
  updateWatchUI(id);
}

function updateWatchUI(id) {
  const map = watched();
  const on = Boolean(map[id]);

  document.querySelectorAll(`[data-watch="${id}"]`).forEach((btn) => {
    btn.setAttribute('aria-pressed', String(on));
    if (btn.classList.contains('stampbtn')) {
      btn.textContent = on ? '已入场' : '看过';
    } else {
      btn.classList.toggle('on', on);
      btn.textContent = on ? '已入场' : '看过';
    }
  });

  document.querySelectorAll(`.row[data-movie="${id}"]`).forEach((row) => {
    row.classList.toggle('watched', on);
    const mark = row.querySelector('.row-mark');
    if (!mark) return;
    const old = mark.querySelector('.stamp');
    if (on && !old) {
      const stamp = document.createElement('span');
      stamp.className = 'stamp';
      stamp.textContent = `已入场 · ${map[id]}`;
      mark.appendChild(stamp);
    } else if (!on && old) {
      old.remove();
    }
  });

  const oldHint = document.querySelector('.watch-hint.watch-date');
  if (on && !oldHint) {
    const meta = document.querySelector('.meta-row');
    if (meta) {
      const hint = document.createElement('div');
      hint.className = 'watch-hint watch-date';
      hint.textContent = `${map[id]} 盖戳 · 仅存本机`;
      meta.after(hint);
    }
  } else if (!on && oldHint) {
    oldHint.remove();
  }
}

/* 描边字用 SVG + textLength 精确铺满：
   textLength 会按目标宽度拉伸字形，与字体是否加载、字体度量如何无关。
   units 只用来决定短标题该占多宽（6 个汉字单位 = 满幅）。 */
function wmTarget(text) {
  const units = [...text].reduce(
    (sum, ch) => sum + (/[\u3000-\u9fff\uff00-\uffef]/.test(ch) ? 1 : 0.6),
    0
  );
  // 留 4% 余量，窄屏下不会被容器右边裁掉。
  return Math.round(Math.min(960, (960 * units) / 6));
}

/* 标题格总宽固定 = 12 个中文字 + 间隙 + 10 个英文字符的宽度；
   空间够就两者全显（不看字数），不够时先保中文（≤12 字），再给英文剩余宽度。 */
const NAME_GAP = 14;
const ZH_LIMIT = 12;
const EN_LIMIT = 10;
const ZH_FONT = '18px "Films Serif", "Noto Serif SC", serif';
const EN_FONT = 'italic 12px "Films Serif", "Noto Serif SC", serif';
const ZH_TRACK = 1.03; // letter-spacing: .03em

const measureCtx = document.createElement('canvas').getContext('2d');
const textW = (text, font) => {
  measureCtx.font = font;
  return measureCtx.measureText(text).width;
};
const split = (text, limit) => [...text].slice(0, limit).join('');

/* 固定的 12 字 + 10 字符宽度，全站所有行一致，保证后面的列对齐。
   字体加载后再量一次，避免用回退字体的宽度。 */
let ZH_CAP = 0;
let EN_CAP = 0;
let TITLE_CELL_W = 0;

const clipText = (text, limit) => {
  const chars = [...text];
  return chars.length > limit ? chars.slice(0, limit).join('') + '…' : text;
};

function titleParts(f) {
  const zhW = textW(f.zh, ZH_FONT) * ZH_TRACK;
  const enW = textW(f.en, EN_FONT);
  let zhText = f.zh;
  let enText = f.en;
  let zhInner = zhW;

  if (zhW + NAME_GAP + enW > TITLE_CELL_W) {
    if (zhW > ZH_CAP) {
      zhText = clipText(f.zh, ZH_LIMIT);
      zhInner = ZH_CAP;
    }
    const enAvail = TITLE_CELL_W - zhInner - NAME_GAP;
    if (enW > enAvail) {
      enText = clipText(f.en, EN_LIMIT);
    }
  }

  const zhBox = Math.min(TITLE_CELL_W, Math.ceil(textW(zhText, ZH_FONT) * ZH_TRACK) + 2);
  const enBox = Math.max(0, Math.min(TITLE_CELL_W - zhBox - NAME_GAP, Math.ceil(textW(enText, EN_FONT)) + 2));
  return { zhText, enText, zhBox, enBox };
}

/* 导演列：固定 8 个字符宽；超出截断，悬停横向播放全文 */
const MONO_FONT = '11.5px "SF Mono", Menlo, monospace';
const DIR_LIMIT = 8;
let DIR_CAP = 0;

function measureLayout() {
  ZH_CAP = textW(split('中'.repeat(ZH_LIMIT), ZH_LIMIT), ZH_FONT) * ZH_TRACK;
  EN_CAP = textW('M'.repeat(EN_LIMIT), EN_FONT);
  TITLE_CELL_W = Math.round(ZH_CAP + NAME_GAP + EN_CAP);
  DIR_CAP = Math.ceil(textW('中'.repeat(DIR_LIMIT), MONO_FONT)) + 2;
}

function directorCell(f) {
  const full = f.director;
  const text = [...full].length > DIR_LIMIT ? split(full, DIR_LIMIT) + '…' : full;
  const box = Math.min(DIR_CAP, Math.ceil(textW(text, MONO_FONT)) + 2);
  return `<span class="clip clip-dir" style="width:${box}px" data-full="${esc(full)}"><span class="clip-in dir">${esc(text)}</span></span>`;
}

function nameCells(f) {
  const p = titleParts(f);
  return `<span class="clip clip-zh" style="width:${p.zhBox}px" data-full="${esc(f.zh)}"><span class="clip-in zh">${esc(p.zhText)}</span></span>
    <span class="clip clip-en" style="width:${p.enBox}px" data-full="${esc(f.en)}"><span class="clip-in en">${esc(p.enText)}</span></span>`;
}

/* 悬停：换成全文，超宽则按溢出宽度匀速横向播放；移出恢复截断 */
function bindNameScroll(root) {
  root.querySelectorAll('.clip').forEach((clip) => {
    const inner = clip.firstElementChild;
    const full = clip.dataset.full;
    const short = inner.textContent;
    const start = () => {
      inner.textContent = full;
      const overflow = inner.scrollWidth - clip.clientWidth;
      if (overflow > 2) {
        inner.style.setProperty('--shift', `-${overflow}px`);
        inner.style.setProperty('--dur', `${Math.min(8, Math.max(1.2, overflow / 36))}s`);
        inner.classList.add('scrolling');
      }
    };
    const stop = () => {
      inner.classList.remove('scrolling');
      inner.textContent = short;
      inner.style.removeProperty('--shift');
      inner.style.removeProperty('--dur');
    };
    clip.addEventListener('mouseenter', start);
    clip.addEventListener('mouseleave', stop);
    clip.addEventListener('focusin', start);
    clip.addEventListener('focusout', stop);
  });
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function homeView() {
  const cards = Object.values(LISTS).map((l) => {
    const f = FILMS[l.filmId];
    return `<a class="card" href="#/list/${l.id}" style="--film:${f.film}">
      <span class="card-kicker">卷 · ${esc(l.genre)}</span>
      <h2>${esc(l.title)}</h2>
      <p class="card-canon">${esc(l.canon.rule)}。</p>
      <span class="card-count">本原型载入 <b>1</b> 部示例<span class="dim"> · 上限 ${l.max}，不足如实</span></span>
    </a>`;
  }).join('');

  return `<section class="hero view">
    <div class="hero-kicker">影史榜单 · 按口径分卷</div>
    <h1 class="hero-title">放 映 单</h1>
    <p class="hero-sub">上限一百 · 宁可六十 · 每部都要能说出为什么</p>
  </section>
  <section class="cards view">${cards}</section>`;
}

function rowView(f, rank, map, listId) {
  const isWatched = Boolean(map[f.id]);
  return `<li class="row ${isWatched ? 'watched' : ''}" data-movie="${f.id}" style="--film:${f.film}">
    <a class="row-link" href="#/movie/${f.id}?list=${encodeURIComponent(listId)}" style="--title-w:${TITLE_CELL_W}px; --dir-w:${DIR_CAP}px">
      <span class="no">No.${String(rank).padStart(3, '0')}</span>
      <span class="titles" style="width:${TITLE_CELL_W}px">${nameCells(f)}</span>
      <span class="meta year">${f.year}</span>
      ${directorCell(f)}
      <span class="meta rt">${esc(f.runtime)}</span>
      <span class="meta cc">${esc(f.country)}</span>
    </a>
    <span class="row-mark">
      <img class="row-still" src="${f.stills}" alt="" aria-hidden="true">
      ${isWatched ? `<span class="stamp">已入场 · ${map[f.id]}</span>` : ''}
    </span>
    <button class="stampbtn" data-watch="${f.id}" aria-pressed="${isWatched}">${isWatched ? '已入场' : '看过'}</button>
  </li>`;
}

function listView(id) {
  const l = LISTS[id];
  if (!l) return homeView();
  const map = watched();
  const hasEntries = Array.isArray(l.entries) && l.entries.length > 0;
  const entries = hasEntries ? l.entries : (l.filmId ? [{ rank: 1, movieId: l.filmId }] : []);
  const rows = [];

  entries.forEach((entry, i) => {
    const f = FILMS[entry.movieId];
    if (!f) return;
    const rank = Number(entry.rank) || i + 1;
    if (hasEntries && rank % 10 === 1) {
      const volume = Math.floor(rank / 10) + 1;
      const chapter = (l.chapters || []).find((c) => c.index === volume);
      const title = chapter ? chapter.title : `第 ${volume} 卷`;
      const from = String(rank).padStart(2, '0');
      const to = String(Math.min(rank + 9, l.count || rank + 9)).padStart(2, '0');
      rows.push(`<li class="vol"><span>${from}–${to} · ${esc(title)}</span></li>`);
    }
    rows.push(rowView(f, rank, map, l.id));
  });

  const slots = hasEntries ? '' : Array.from({ length: l.slots || 0 }, (_, i) =>
    `<li class="row empty"><div class="row-link"><span class="no">No.00${i + 2}</span><span class="slot">待策展</span></div></li>`
  ).join('');
  const vol = (!hasEntries && l.vol) ? `<li class="vol"><span>${esc(l.vol)}</span></li>` : '';
  const countText = hasEntries
    ? `收录 ${l.count} 部（上限 ${l.max}）。`
    : `收录 ${l.count} 部（上限 ${l.max}，未凑满）。条数如实，宁可少收，不为凑整放进平庸之作。`;
  const foot = hasEntries ? '' : `<p class="foot" style="border:0;padding:22px 0 0">原型仅载入 1 部真实示例，其余为空位：正式榜单按实际收录条数渲染，空位不会出现。</p>`;

  return `<section class="listhead view">
    <div class="kicker">卷 · ${esc(l.genre)}</div>
    <h1>${esc(l.title)}</h1>
    <p class="canon">${countText}</p>
    <div class="canonbar"><span>排序：${esc(l.canon.rule)}</span><span>已知偏差：${esc(l.canon.bias)}</span><span>时间窗：${esc(l.canon.window)}</span></div>
  </section>
  <ol class="reel view">
    ${vol}
    ${rows.join('')}
    ${slots}
  </ol>
  ${foot}`;
}

function movieView(id, listId) {
  const f = FILMS[id];
  if (!f) return homeView();
  const map = watched();
  const isWatched = Boolean(map[f.id]);
  const memberships = Array.isArray(f.lists) ? f.lists : (f.rank ? [{ list_id: listId || '', rank: f.rank }] : []);
  const current = listId ? memberships.find((m) => m.list_id === listId) : null;
  const single = memberships.length === 1 ? memberships[0] : null;
  const rank = current ? current.rank : (single ? single.rank : null);
  const tech = (f.tech || []).map(([k, v]) => `<div>${esc(k)} <b>${esc(v)}</b></div>`).join('');
  const awards = (f.awards || []).length
    ? f.awards.map((a) => `<li><span class="tier">${esc(a.tier)}</span><span>${esc(a.name)}</span><span class="yr">${a.year}</span></li>`).join('')
    : `<li><span class="dim">${esc(f.awardsNote || '暂无已核验的 A/A− 级主奖记录')}</span></li>`;
  const note = (f.note || []).map((p) => `<p>${esc(p)}</p>`).join('');
  const quote = f.quote
    ? `<div class="quoteline"><p>${esc(f.quote)}</p></div>`
    : '';
  const membership = (!rank && memberships.length > 1)
    ? `<div class="watch-hint">所属榜单：${memberships.map((m) => `${esc(m.list_id)} 第 ${m.rank} 位`).join(' · ')}</div>`
    : '';
  const tag = rank != null ? `${esc(f.genreLabel)} · 榜单第 ${rank} 位` : esc(f.genreLabel);

  return `<article class="detail view" style="--film:${f.film}">
    <div class="still">
      <img class="still-poster" src="${f.poster}" alt="" aria-hidden="true">
      <div class="bars" aria-hidden="true"></div>
      <div class="still-wm">
        <svg viewBox="0 0 1000 150" preserveAspectRatio="none" aria-hidden="true">
          <text x="0" y="128" textLength="${wmTarget(f.wm || f.en || String(f.year))}" lengthAdjust="spacingAndGlyphs">${esc(f.wm || f.en || String(f.year))}</text>
        </svg>
      </div>
      <div class="still-body">
        <div class="title-row">
          <h1>${esc(f.zh)}</h1>
          <button class="watch-btn ${isWatched ? 'on' : ''}" data-watch="${f.id}" aria-pressed="${isWatched}">${isWatched ? '已入场' : '看过'}</button>
        </div>
        <div class="meta-row">
          <span class="en">${esc(String(f.year))} · ${esc(f.director)}</span>
          <span class="still-tag">${tag}</span>
        </div>
        ${membership}
        ${isWatched ? `<div class="watch-hint watch-date">${map[f.id]} 盖戳 · 仅存本机</div>` : ''}
      </div>
    </div>

    <div class="detail-body">
      <div class="col-main">
        ${quote}

        <div class="techbar">${tech}</div>

        <section class="note">
          <h2>为什么在榜上</h2>
          ${note}
        </section>

        <section class="awards">
          <h2>获奖记录</h2>
          <ul>${awards}</ul>
        </section>
      </div>

      <aside class="col-rail">
        <figure>
          <img src="${f.stills}" alt="" aria-hidden="true">
          <figcaption>示例剧照 · Unsplash 授权</figcaption>
        </figure>
      </aside>
    </div>
  </article>`;
}

function watchView() {
  const map = watched();
  const ids = Object.keys(map);
  if (!ids.length) {
    return `<section class="listhead view"><div class="kicker">我的</div><h1>观影册</h1>
      <p class="canon">还没有看过。去任意榜单点「看过」，这里会按日期排出来。</p></section>`;
  }
  const items = ids.map((id) => {
    const f = FILMS[id];
    if (!f) return '';
    return `<li><span class="zh">${esc(f.zh)}</span><span class="yr">${f.year}</span><span class="at">${map[id]}</span></li>`;
  }).join('');
  return `<section class="listhead view"><div class="kicker">我的</div><h1>观影册</h1>
    <p class="canon">共 ${ids.length} 部。数据只存本机，导出即备份。</p>
    <ul class="watchlist view">${items}</ul></section>`;
}

function render() {
  const hash = location.hash || '#/';
  const app = document.getElementById('app');
  if (hash.startsWith('#/list/')) {
    app.innerHTML = listView(decodeURIComponent(hash.replace('#/list/', '')));
  } else if (hash.startsWith('#/movie/')) {
    const raw = hash.replace('#/movie/', '');
    const [id, query] = raw.split('?');
    const listId = new URLSearchParams(query || '').get('list');
    app.innerHTML = movieView(decodeURIComponent(id), listId);
  } else if (hash === '#/watch') {
    app.innerHTML = watchView();
  } else {
    app.innerHTML = homeView();
  }
  window.scrollTo(0, 0);
  bindNameScroll(app);
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-watch]');
  if (!btn) return;
  e.preventDefault();
  toggle(btn.dataset.watch);
});

window.addEventListener('hashchange', render);

measureLayout();
render();
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => {
    measureLayout();
    render();
  });
}

/* 截图/演示：?demo=scroll 让第一条真正溢出的名称进入滚动状态 */
if (new URLSearchParams(location.search).get('demo') === 'scroll') {
  let target = null;
  let maxOverflow = 2;
  for (const clip of document.querySelectorAll('.clip')) {
    const inner = clip.firstElementChild;
    inner.textContent = clip.dataset.full;
    const overflow = inner.scrollWidth - clip.clientWidth;
    if (overflow > maxOverflow) { maxOverflow = overflow; target = clip; }
  }
  if (target) {
    const inner = target.firstElementChild;
    inner.style.setProperty('--shift', `-${maxOverflow}px`);
    inner.style.setProperty('--dur', '4s');
    inner.classList.add('scrolling');
  }
}

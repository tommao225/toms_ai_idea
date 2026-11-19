/* 100 行测试数据：只用于检查版式、换行和虚拟滚动，不是正式榜单。 */
(function () {
  const films = {};
  const entries = [];
  const colors = ['#3A4653', '#8A5A32', '#4A5A4E', '#6B4A32', '#5A4A6B'];

  for (let i = 1; i <= 100; i += 1) {
    const id = 'f' + String(i).padStart(3, '0');
    const n = String(i).padStart(3, '0');
    const zh = i % 7 === 0
      ? `测试影片第${n}号一个很长很长的中文片名`
      : `测试影片${n}`;
    const en = i % 5 === 0
      ? `A Very Long Fixture Film Title Number ${n}`
      : `Fixture Film ${n}`;
    const year = 1920 + (i * 7) % 105;
    const director = ['测试导演甲', '测试导演乙', '测试导演丙', '测试导演丁'][i % 4];
    const country = ['美国', '日本', '法国', '韩国', '意大利'][i % 5];
    const runtime = 90 + (i * 3) % 80;

    films[id] = {
      id,
      stills: `../web/assets/img/p${1 + (i % 5)}.jpg`,
      poster: '../web/assets/img/p3.jpg',
      wm: en,
      rank: i,
      genreLabel: '悬疑',
      zh,
      en,
      year,
      director,
      runtime: `${runtime}′`,
      country,
      film: colors[i % colors.length],
      tech: [['片长', `${runtime} 分钟`], ['画幅', '2.39:1'], ['声音', '测试'], ['色彩', '彩色'], ['国别', country], ['语言', '测试']],
      quote: `测试台词第 ${n} 条：这一行用来检查长句在小屏上的换行。`,
      note: [`测试手记 ${n}：这一段用来检查正文行高、宽度和滚动。`],
      awards: [],
      awardsNote: '测试数据，没有奖项。',
      lists: [{ list_id: 'fixture-100', rank: i }],
    };
    entries.push({ rank: i, movieId: id });
  }

  const chapters = Array.from({ length: 10 }, (_, i) => ({
    index: i + 1,
    title: `第 ${i + 1} 卷：测试`,
  }));

  window.FILMS_DATA = {
    films,
    lists: {
      'fixture-100': {
        id: 'fixture-100',
        genre: '悬疑',
        filmId: 'f001',
        title: '100 行测试：悬疑',
        count: 100,
        max: 100,
        canon: { rule: '测试排序规则', bias: '测试偏差', window: '1920–2024' },
        entries,
        chapters,
        testOnly: true,
      },
      'empty-list': {
        id: 'empty-list',
        genre: '剧情',
        title: '空榜测试',
        count: 0,
        max: 100,
        canon: { rule: '测试空榜', bias: '无', window: '1920–2024' },
        entries: [],
        chapters: [],
        testOnly: true,
      },
    },
  };
})();

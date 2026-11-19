/* 共享的显示工具：转义、列宽测量、片名格子、描边字。 */
(function () {
  const Films = window.Films || (window.Films = {});

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function asset(path) {
    if (!path) return '';
    if (/^(?:[a-z]+:|\/|\.{1,2}\/)/i.test(path)) return path;
    if (path.startsWith('assets/')) return path;
    return `../data/${path}`;
  }

  const NAME_GAP = 14;
  const ZH_LIMIT = 12;
  const EN_LIMIT = 10;
  const ZH_TRACK = 1.03;
  const ZH_FONT = '18px "Films Serif", "Noto Serif SC", serif';
  const EN_FONT = 'italic 12px "Films Serif", "Noto Serif SC", serif';
  const MONO_FONT = '11.5px "SF Mono", Menlo, monospace';
  const DIR_LIMIT = 8;

  const ctx = document.createElement('canvas').getContext('2d');
  const textW = (text, font) => {
    ctx.font = font;
    return ctx.measureText(text).width;
  };
  const split = (text, limit) => [...text].slice(0, limit).join('');
  const clipText = (text, limit) => {
    const chars = [...text];
    return chars.length > limit ? chars.slice(0, limit).join('') + '…' : text;
  };

  const metrics = { zhCap: 0, enCap: 0, titleCellW: 0, dirCap: 0 };

  function measure() {
    metrics.zhCap = textW(split('中'.repeat(ZH_LIMIT), ZH_LIMIT), ZH_FONT) * ZH_TRACK;
    metrics.enCap = textW('M'.repeat(EN_LIMIT), EN_FONT);
    metrics.titleCellW = Math.round(metrics.zhCap + NAME_GAP + metrics.enCap);
    metrics.dirCap = Math.ceil(textW('中'.repeat(DIR_LIMIT), MONO_FONT)) + 2;
  }

  function titleParts(f) {
    const zhW = textW(f.zh, ZH_FONT) * ZH_TRACK;
    const enW = textW(f.en, EN_FONT);
    let zhText = f.zh;
    let enText = f.en;
    let zhInner = zhW;

    if (zhW + NAME_GAP + enW > metrics.titleCellW) {
      if (zhW > metrics.zhCap) {
        zhText = clipText(f.zh, ZH_LIMIT);
        zhInner = metrics.zhCap;
      }
      const enAvail = metrics.titleCellW - zhInner - NAME_GAP;
      if (enW > enAvail) enText = clipText(f.en, EN_LIMIT);
    }

    const zhBox = Math.min(metrics.titleCellW, Math.ceil(textW(zhText, ZH_FONT) * ZH_TRACK) + 2);
    const enBox = Math.max(0, Math.min(metrics.titleCellW - zhBox - NAME_GAP, Math.ceil(textW(enText, EN_FONT)) + 2));
    return { zhText, enText, zhBox, enBox };
  }

  function nameCells(f) {
    const p = titleParts(f);
    return `<span class="clip clip-zh" style="width:${p.zhBox}px" data-full="${esc(f.zh)}"><span class="clip-in zh">${esc(p.zhText)}</span></span>
      <span class="clip clip-en" style="width:${p.enBox}px" data-full="${esc(f.en)}"><span class="clip-in en">${esc(p.enText)}</span></span>`;
  }

  function directorCell(f) {
    const full = f.director || '';
    const text = [...full].length > DIR_LIMIT ? split(full, DIR_LIMIT) + '…' : full;
    const box = Math.min(metrics.dirCap, Math.ceil(textW(text, MONO_FONT)) + 2);
    return `<span class="clip clip-dir" style="width:${box}px" data-full="${esc(full)}"><span class="clip-in dir">${esc(text)}</span></span>`;
  }

  function bindNameScroll(root) {
    root.querySelectorAll('.clip').forEach((clip) => {
      const inner = clip.firstElementChild;
      if (!inner) return;
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

  function wmTarget(text) {
    const units = [...text].reduce(
      (sum, ch) => sum + (/[\u3000-\u9fff\uff00-\uffef]/.test(ch) ? 1 : 0.6),
      0
    );
    return Math.round(Math.min(960, (960 * units) / 6));
  }

  Films.ui = { esc, asset, measure, metrics, nameCells, directorCell, bindNameScroll, wmTarget };
})();

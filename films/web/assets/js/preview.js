/* 列表剧照悬停预览。 */
(function () {
  const Films = window.Films || (window.Films = {});
  let thumbPreview = null;

  function getThumbPreview() {
    if (!thumbPreview) {
      thumbPreview = document.createElement('img');
      thumbPreview.className = 'thumb-preview';
      thumbPreview.hidden = true;
      thumbPreview.alt = '';
      document.body.appendChild(thumbPreview);
    }
    return thumbPreview;
  }

  function hide() {
    if (thumbPreview) thumbPreview.hidden = true;
  }

  function place(e) {
    const preview = getThumbPreview();
    preview.hidden = false;
    const width = 240;
    const height = 320;
    const pad = 16;
    let left = e.clientX + 18;
    if (left + width > window.innerWidth - pad) left = e.clientX - width - 18;
    let top = e.clientY - height / 2;
    top = Math.max(pad, Math.min(window.innerHeight - height - pad, top));
    preview.style.left = `${Math.max(pad, left)}px`;
    preview.style.top = `${top}px`;
  }

  function bind(root) {
    root.querySelectorAll('.row-still').forEach((img) => {
      img.addEventListener('mouseenter', (e) => {
        const preview = getThumbPreview();
        preview.src = img.src;
        place(e);
      });
      img.addEventListener('mousemove', place);
      img.addEventListener('mouseleave', hide);
    });
  }

  Films.preview = { bind, hide };
})();

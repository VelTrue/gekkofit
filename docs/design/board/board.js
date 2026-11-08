// Стрелки доски сценариев, перенесено из LMS (docs/design/wireframes/flow.html).
// Стрелки: от элемента [data-to] к экрану. Маршрут идёт по коридорам между колонками и строками, не через экраны.
(function () {
  const board = document.getElementById('board');
  const svg = document.getElementById('wires');
  const NS = 'http://www.w3.org/2000/svg';

  function rel(el) {
    let x = 0, y = 0, n = el;
    while (n && n !== board) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
    return { x, y, w: el.offsetWidth, h: el.offsetHeight };
  }

  // пунктир «граница первого экрана» - только у экранов длиннее телефона
  function folds() {
    const h = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--phoneh'));
    document.querySelectorAll('.phone').forEach((p) => {
      p.querySelectorAll('.fold').forEach((n) => n.remove());
      if (p.offsetHeight <= h + 4) return;
      const f = document.createElement('div');
      f.className = 'fold';
      f.style.top = h + 'px';
      f.innerHTML = '<span>↑ видно без прокрутки · ' + h + 'px</span>';
      p.appendChild(f);
    });
  }

  function draw() {
    folds();
    svg.querySelectorAll('.w').forEach((n) => n.remove());
    svg.setAttribute('width', board.scrollWidth);
    svg.setAttribute('height', board.scrollHeight);
    const colGap = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--colgap'));
    const lanes = {};
    // дорожки считаются отдельно для каждой строки и не выходят за просвет между колонками
    const lane = (k) => { lanes[k] = (lanes[k] || 0) + 1; const i = (lanes[k] - 1) % 13; return (i % 2 ? -1 : 1) * Math.ceil(i / 2) * 10; };

    document.querySelectorAll('[data-to]').forEach((el) => {
      const target = document.getElementById(el.dataset.to);
      if (!target) return;
      const s = rel(el), t = rel(target);
      const src = rel(el.closest('.phone') || el.closest('.cell'));
      const toRight = t.x >= src.x + src.w;
      const sx = toRight ? s.x + s.w : s.x;
      const sy = s.y + s.h / 2;
      const ty = t.y + 70 + lane('in' + target.id) ;
      const tx = toRight || t.x > src.x ? t.x : t.x + t.w;
      const enterLeft = tx === t.x;
      const g1 = (toRight ? src.x + src.w + colGap / 2 : src.x - colGap / 2) + lane('g' + (toRight ? src.x + src.w : src.x) + '@' + src.y);
      const g2 = (enterLeft ? t.x - colGap / 2 : t.x + t.w + colGap / 2) + lane('g' + (enterLeft ? t.x : t.x + t.w) + 't@' + t.y);
      let pts;
      if (Math.abs(g1 - g2) < 30) {
        pts = [[sx, sy], [g1, sy], [g1, ty], [tx, ty]];
      } else {
        // коридор над строкой цели
        const cy = t.y - 80 + lane('row' + t.y);
        pts = [[sx, sy], [g1, sy], [g1, cy], [g2, cy], [g2, ty], [tx, ty]];
      }
      const pl = document.createElementNS(NS, 'polyline');
      pl.setAttribute('class', 'w');
      pl.setAttribute('points', pts.map((p) => p.join(',')).join(' '));
      pl.setAttribute('fill', 'none');
      pl.setAttribute('stroke', '#3a3a3a');
      pl.setAttribute('stroke-width', '2');
      pl.setAttribute('stroke-linejoin', 'round');
      pl.setAttribute('marker-end', 'url(#arr)');
      svg.appendChild(pl);
      const dot = document.createElementNS(NS, 'circle');
      dot.setAttribute('class', 'w');
      dot.setAttribute('cx', sx); dot.setAttribute('cy', sy); dot.setAttribute('r', 5);
      dot.setAttribute('fill', '#fff'); dot.setAttribute('stroke', '#3a3a3a'); dot.setAttribute('stroke-width', '2');
      svg.appendChild(dot);
    });
  }

  document.querySelectorAll('[data-zoom]').forEach((b) =>
    b.addEventListener('click', () => { board.style.zoom = b.dataset.zoom; }));
  window.addEventListener('load', draw);
  window.addEventListener('resize', draw);
})();

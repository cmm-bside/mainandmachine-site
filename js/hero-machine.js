/* Hero — registration-grid motif + "Assembly Line" headline.
   Vanilla, dependency-free, idempotent. The grid plots in ONCE on load (no rAF
   loop, no pointer behavior), then the accent line machines into place with
   corner crop-marks + a tooling baseline. Degrades to the final static state
   with JS off or reduced-motion on. */
(() => {
  const root = document.querySelector('[data-hero-machine]');
  if (!root || root.dataset.init === '1') return;
  root.dataset.init = '1';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // split the accent line into letters, grouped by WORD so it can never break mid-word
  const word = root.querySelector('[data-machine-word]');
  if (word && !word.dataset.split) {
    const words = word.textContent.split(/(\s+)/);
    let i = 0; const frag = document.createDocumentFragment();
    words.forEach(chunk => {
      if (/^\s+$/.test(chunk)) { frag.appendChild(document.createTextNode(chunk)); return; }
      const wrap = document.createElement('span'); wrap.className = 'hm-word';
      [...chunk].forEach(ch => {
        const sp = document.createElement('span'); sp.className = 'hm-letter';
        sp.textContent = ch; sp.style.setProperty('--i', i++); wrap.appendChild(sp);
      });
      frag.appendChild(wrap);
    });
    word.textContent = ''; word.appendChild(frag); word.dataset.split = '1';
  }

  // draw the registration grid once (static; redrawn only on resize)
  const cv = root.querySelector('[data-machine-grid]');
  function drawGrid() {
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const r = root.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = r.width * dpr; cv.height = r.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, r.width, r.height);
    const G = 56;
    ctx.strokeStyle = 'rgba(26,21,17,0.045)'; ctx.lineWidth = 1;
    for (let x = G; x < r.width; x += G) { ctx.beginPath(); ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, r.height); ctx.stroke(); }
    for (let y = G; y < r.height; y += G) { ctx.beginPath(); ctx.moveTo(0, y + .5); ctx.lineTo(r.width, y + .5); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(26,21,17,0.14)';
    for (let y = G; y < r.height; y += G) for (let x = G; x < r.width; x += G) {
      ctx.beginPath(); ctx.moveTo(x - 3.5, y + .5); ctx.lineTo(x + 3.5, y + .5);
      ctx.moveTo(x + .5, y - 3.5); ctx.lineTo(x + .5, y + 3.5); ctx.stroke();
    }
  }
  drawGrid();
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(drawGrid, 150); }, { passive: true });

  if (reduce) { root.dataset.state = 'done'; return; }
  new IntersectionObserver((es, obs) => {
    es.forEach(e => { if (e.isIntersecting) { root.dataset.state = 'play'; obs.disconnect(); } });
  }, { threshold: 0.35 }).observe(root);
})();

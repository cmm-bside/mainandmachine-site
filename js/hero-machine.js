/* Hero — registration-grid motif + "Assembly Line" headline.
   Vanilla, dependency-free, idempotent.

   PROGRESSIVE ENHANCEMENT CONTRACT: the complete headline ships in the HTML
   and is visible with no JS, with reduced motion, mid-error, always. This
   script only upgrades: it draws the grid, and — only when it is about to
   animate — splits the accent line into letters and hides them via the
   "armed"/"play" states (see styles.css). Every exit path that could leave
   the letters hidden force-finishes to "done", which renders them visible. */
(() => {
  const root = document.querySelector('[data-hero-machine]');
  if (!root || root.dataset.init === '1') return;
  root.dataset.init = '1';
  const finish = () => { root.dataset.state = 'done'; };

  try {
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

    // Reduced motion, or no observer support: the headline is already whole
    // and visible — jump straight to the final state and never touch it.
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      finish();
      return;
    }

    // Animation is actually going to run: NOW split the accent line into
    // letters (grouped by word so it never breaks mid-word) and arm — the
    // first moment the text is hidden.
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
    root.dataset.state = 'armed';

    new IntersectionObserver((es, obs) => {
      es.forEach(e => { if (e.isIntersecting) { root.dataset.state = 'play'; obs.disconnect(); } });
    }, { threshold: 0.35 }).observe(root);

    // Safety net: if the observer never fires (zoomed viewport, prerender,
    // anything), the headline must not stay hidden. 2.5s later, force-finish.
    setTimeout(() => { if (root.dataset.state === 'armed') finish(); }, 2500);
  } catch (e) {
    finish();
  }
})();

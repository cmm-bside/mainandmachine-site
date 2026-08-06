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
    // Draw the registration TICKS once (static; redrawn only on resize).
    //
    // The 6% grid FIELD this used to draw is now a CSS background on every
    // hero on the site (see "THE GRID IS THE SURFACE" in styles.css), at the
    // same 56px pitch and the same alpha. Drawing it here as well would put
    // two identical grids on the homepage hero — double alpha, and phased
    // apart by the canvas's half-pixel offset, which is moiré rather than
    // texture. So the field is CSS and the ticks stay canvas: they are the
    // mark, they exist only here, and they are what makes this a registration
    // grid rather than graph paper.
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
      ctx.lineWidth = 1;
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

    // ARMING IS THE MOMENT THE TEXT DISAPPEARS, so nothing may sit between it
    // and the reveal. The hero is the top of the page: on a normal load it is
    // already well past the observer's 0.35 threshold when this script runs,
    // and waiting for IntersectionObserver to say so costs a full async
    // callback — the observer's first record is delivered on a later task, not
    // synchronously from observe(). That was the real defect. The headline
    // ships whole in the HTML and font-display:swap paints it at first paint,
    // so a late arm does not merely delay an entrance: it takes a line the
    // visitor has already read and removes it, then brings it back. On a slow
    // first visit — where the deferred script arrives long after first paint —
    // that is exactly the reported "the payoff line is absent seconds after
    // load", and no amount of CSS tuning reaches it, because the cost is in
    // front of the animation rather than inside it.
    //
    // So: measure the rect here and, if the hero already satisfies the same
    // 0.35 threshold, go straight to play in this task. Armed is then a state
    // the browser never gets a chance to paint, and the letters' first painted
    // frame is the first frame of the animation.
    const visibleRatio = () => {
      const r = root.getBoundingClientRect();
      if (!r.height) return 0;
      const vh = innerHeight || document.documentElement.clientHeight || 0;
      const vw = innerWidth || document.documentElement.clientWidth || 0;
      // Both axes, matching what IntersectionObserver actually measures — a
      // rect that is off to the side is not 100% visible because its top and
      // bottom happen to be on screen.
      const h = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
      const w = Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0));
      return (h * w) / (r.height * r.width);
    };
    const play = () => { if (root.dataset.state === 'armed') root.dataset.state = 'play'; };

    if (visibleRatio() >= 0.35) {
      play();
    } else {
      // Below the fold: the observer is the right instrument, and its latency
      // does not matter because the visitor has to scroll first anyway.
      new IntersectionObserver((es, obs) => {
        es.forEach(e => { if (e.isIntersecting) { play(); obs.disconnect(); } });
      }, { threshold: 0.35 }).observe(root);

      // A second look once the document is parsed. `defer` already puts us
      // after parsing, so this is normally a no-op — it exists for the case
      // where the rect was not yet meaningful at script time (the script moved
      // out of defer, a prerender, a hero whose height is still 0). Cheap, and
      // it is the difference between a headline that reveals and one that waits
      // on the safety net.
      if (document.readyState === 'loading') {
        addEventListener('DOMContentLoaded', () => { if (visibleRatio() >= 0.35) play(); }, { once: true });
      }
    }

    // Safety net: if neither path fires (zoomed viewport, prerender, anything),
    // the headline must not stay hidden. Tightened 2.5s -> 1.5s. It is a
    // backstop for a state nobody should reach, and 2.5s of a missing payoff
    // line is itself the bug this pass is about — the reveal's own worst case
    // is 0.74s, so 1.5s is still twice the time it needs.
    setTimeout(() => { if (root.dataset.state === 'armed') finish(); }, 1500);
  } catch (e) {
    finish();
  }
})();

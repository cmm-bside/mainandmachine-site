/* Hero — Concept 01 "The Assembly Line".
   Vanilla, dependency-free, idempotent. Adapted to Main & Machine tokens and a
   LIGHT (paper) hero: faint ink dots, accent cursor-tint (the reference assumed
   a dark hero with cream dots). Degrades to a perfect static headline with JS
   off or reduced-motion on. */
(() => {
  const root = document.querySelector('[data-hero-machine]');
  if (!root || root.dataset.init === '1') return;
  root.dataset.init = '1';

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 1 — split the accent word into letters (progressive enhancement: the word
     is plain text in source, never pre-split, so JS-off shows it normally). */
  const word = root.querySelector('[data-machine-word]');
  if (word && !word.dataset.split) {
    const frag = document.createDocumentFragment();
    [...word.textContent].forEach((ch, i) => {
      const s = document.createElement('span');
      s.className = 'hm-letter';
      s.textContent = ch === ' ' ? ' ' : ch;
      s.style.setProperty('--i', i);
      frag.appendChild(s);
    });
    word.textContent = '';
    word.appendChild(frag);
    word.dataset.split = '1';
  }

  /* 2 — reduced motion or automation (webdriver): final state, one static
     field frame, no rAF loop. */
  if (reduce || navigator.webdriver) { root.dataset.state = 'done'; paintStatic(); return; }

  /* 3 — fire the assembly once, when >=35% in view. Safety net: if the observer
     never fires (exotic layouts), force the final state so the headline is
     never left mid-assembly. */
  let played = false;
  const play = () => { if (!played) { played = true; root.dataset.state = 'play'; } };
  new IntersectionObserver((es, obs) => {
    es.forEach(e => { if (e.isIntersecting) { play(); obs.disconnect(); } });
  }, { threshold: 0.35 }).observe(root);
  setTimeout(() => { if (!played) { root.dataset.state = 'done'; } }, 2000);

  /* 4 — ledger dot-field on canvas (ink dots on paper; accent near the cursor) */
  const canvas = root.querySelector('[data-machine-canvas]');
  let ctx, w = 0, h = 0, pts = [], mx = -9999, my = -9999, running = false, raf = 0, t = 0, queued = false;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const GAP = 30, R = 120, PUSH = 26;
  const DOT_FAR = 'rgba(20,17,12,.12)';   /* --ink @ .12 — faint ledger grid */
  const DOT_NEAR = 'rgba(189,69,31,.7)';  /* --accent @ .7 — cursor tint */

  function build() {
    const r = canvas.getBoundingClientRect();
    w = r.width; h = r.height;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    pts = [];
    for (let y = GAP; y < h; y += GAP)
      for (let x = GAP; x < w; x += GAP) pts.push({ ox: x, oy: y, x, y });
  }
  function step() {
    if (!running) { raf = 0; return; }
    t += 0.01;
    ctx.clearRect(0, 0, w, h);
    for (const p of pts) {
      let tx = p.ox + Math.sin(t + p.oy * 0.01) * 1.2;
      let ty = p.oy + Math.cos(t + p.ox * 0.01) * 1.2;
      const dx = tx - mx, dy = ty - my, d2 = dx * dx + dy * dy;
      if (d2 < R * R) { const d = Math.sqrt(d2) || 1, f = (R - d) / R; tx += dx / d * f * PUSH; ty += dy / d * f * PUSH; }
      p.x += (tx - p.x) * 0.18; p.y += (ty - p.y) * 0.18;
      const near = Math.abs(p.x - mx) < 130 && Math.abs(p.y - my) < 130;
      ctx.fillStyle = near ? DOT_NEAR : DOT_FAR;
      ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
    }
    raf = requestAnimationFrame(step);
  }
  function paintStatic() {
    if (!canvas) return; ctx = canvas.getContext('2d'); build();
    for (const p of pts) { ctx.fillStyle = DOT_FAR; ctx.fillRect(p.x - 1, p.y - 1, 2, 2); }
  }
  function start() { if (!running) { running = true; if (!raf) raf = requestAnimationFrame(step); } }
  function stop() { running = false; }

  if (canvas) {
    ctx = canvas.getContext('2d', { alpha: true });
    build();
    addEventListener('resize', build, { passive: true });
    root.addEventListener('pointermove', e => {
      if (queued) return; queued = true;
      requestAnimationFrame(() => { const r = canvas.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; queued = false; });
    });
    root.addEventListener('pointerleave', () => { mx = -9999; my = -9999; });
    new IntersectionObserver(es => { es[0].isIntersecting ? start() : stop(); }, { threshold: 0 }).observe(canvas);
    document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
  }
})();

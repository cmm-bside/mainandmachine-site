/* Reveal-on-scroll — ONE shared observer, ONE shared `.reveal` class.
   Section headings, cards, and stat numbers fade up (opacity 0->1, translateY
   16px->0) once as they enter the viewport, staggered 60ms between siblings.
   Fires once per element, then unobserves.

   Fully disabled under prefers-reduced-motion / automation / no-IO: we simply
   never add `.reveal`, so every element stays in its natural final state (the
   hidden state lives in an @media (prefers-reduced-motion: no-preference) block).

   The hero keeps its own treatment (js/hero-machine.js) and is intentionally
   excluded here. Add the targets you want revealed to TARGETS — that's the only
   per-page knob; the mechanism is shared. */
(function () {
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || navigator.webdriver || !('IntersectionObserver' in window)) return;

  var TARGETS = ['.head-block', '.diffs > .diff', '.svc__item', '.paths > .path', '.failstat'];
  var els = [];
  TARGETS.forEach(function (sel) {
    document.querySelectorAll(sel).forEach(function (el) { if (els.indexOf(el) < 0) els.push(el); });
  });
  if (!els.length) return;

  els.forEach(function (el) { el.classList.add('reveal'); });

  // 60ms stagger between revealing siblings (capped so long lists don't crawl)
  els.forEach(function (el) {
    var sibs = Array.prototype.filter.call(el.parentElement.children, function (c) {
      return c.classList.contains('reveal');
    });
    el.style.transitionDelay = Math.min(sibs.indexOf(el), 8) * 60 + 'ms';
  });

  var io = new IntersectionObserver(function (entries, obs) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('is-visible'); obs.unobserve(e.target); }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

  // Anything already inside the initial viewport paints visible immediately —
  // above-the-fold content must never wait on the observer. Scroll-reveal
  // applies only below the fold.
  els.forEach(function (el) {
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) {
      el.classList.add('is-visible');
    } else {
      io.observe(el);
    }
  });

  // safety net: never leave anything hidden (e.g. element already past viewport)
  setTimeout(function () {
    els.forEach(function (el) { el.classList.add('is-visible'); });
  }, 900);
})();

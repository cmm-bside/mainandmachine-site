/* Mobile nav: toggle the collapsed link panel via the hamburger.
   Markup lives in every page's <header class="nav">; styling is in styles.css
   under the max-width:1140px block. Progressive enhancement — without JS the
   links stay collapsed but the CTA and logo still work. */
(function () {
  var nav = document.querySelector('.nav');
  if (!nav) return;
  var toggle = nav.querySelector('.nav__toggle');
  var menu = nav.querySelector('.nav__links');
  if (!toggle || !menu) return;

  function setOpen(open) {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }

  toggle.addEventListener('click', function (e) {
    e.stopPropagation();
    setOpen(!nav.classList.contains('is-open'));
  });

  // Click outside the bar closes the panel.
  document.addEventListener('click', function (e) {
    if (nav.classList.contains('is-open') && !nav.contains(e.target)) setOpen(false);
  });

  // Escape closes and returns focus to the toggle.
  document.addEventListener('keydown', function (e) {
    if ((e.key === 'Escape' || e.key === 'Esc') && nav.classList.contains('is-open')) {
      setOpen(false);
      toggle.focus();
    }
  });

  // Resizing up to the desktop bar collapses any open panel.
  var mq = window.matchMedia('(min-width: 1141px)');
  var onChange = function () { if (mq.matches) setOpen(false); };
  if (mq.addEventListener) mq.addEventListener('change', onChange);
  else if (mq.addListener) mq.addListener(onChange);
})();

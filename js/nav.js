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

  // Submenu flyouts (e.g. Services): hover opens them via CSS; the caret button
  // is the explicit toggle for touch + keyboard. closeMenus() clears open ones.
  var menuItems = nav.querySelectorAll('.nav__item--menu');
  function closeMenus(except) {
    menuItems.forEach(function (item) {
      if (item === except) return;
      item.classList.remove('is-open');
      var c = item.querySelector('.nav__caret');
      if (c) c.setAttribute('aria-expanded', 'false');
    });
  }
  menuItems.forEach(function (item) {
    var caret = item.querySelector('.nav__caret');
    if (!caret) return;
    caret.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var open = !item.classList.contains('is-open');
      closeMenus(item);
      item.classList.toggle('is-open', open);
      caret.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });

  // Click outside the bar closes the panel; clicking outside a submenu closes it.
  document.addEventListener('click', function (e) {
    if (nav.classList.contains('is-open') && !nav.contains(e.target)) setOpen(false);
    menuItems.forEach(function (item) {
      if (item.classList.contains('is-open') && !item.contains(e.target)) {
        item.classList.remove('is-open');
        var c = item.querySelector('.nav__caret');
        if (c) c.setAttribute('aria-expanded', 'false');
      }
    });
  });

  // Escape closes any open submenu and the panel, returning focus to the toggle.
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' && e.key !== 'Esc') return;
    closeMenus(null);
    if (nav.classList.contains('is-open')) {
      setOpen(false);
      toggle.focus();
    }
  });

  // Resizing up to the desktop bar collapses any open panel + submenus.
  var mq = window.matchMedia('(min-width: 1141px)');
  var onChange = function () { if (mq.matches) { setOpen(false); closeMenus(null); } };
  if (mq.addEventListener) mq.addEventListener('change', onChange);
  else if (mq.addListener) mq.addListener(onChange);
})();

/* Booking banner: keep the quarter current automatically so the topbar can
   never read a stale quarter (e.g. "Q3" in October). Shows the upcoming
   quarter — forward booking — and falls back to the hardcoded value with no JS. */
(function () {
  var els = document.querySelectorAll('.js-book-quarter');
  if (!els.length) return;
  var d = new Date();
  var q = Math.floor(d.getMonth() / 3) + 1;   // 1..4, current quarter
  var next = 'Q' + (q === 4 ? 1 : q + 1);      // next quarter — forward booking
  els.forEach(function (el) { el.textContent = next; });
})();

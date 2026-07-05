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
    var links = Array.prototype.slice.call(item.querySelectorAll('.nav__menu a'));
    var trigger = item.querySelector('a'); // the Services link (first <a> before .nav__menu)
    function open(focusFirst) {
      closeMenus(item);
      item.classList.add('is-open');
      caret.setAttribute('aria-expanded', 'true');
      if (focusFirst && links[0]) links[0].focus();
    }
    function close(focusCaret) {
      item.classList.remove('is-open');
      caret.setAttribute('aria-expanded', 'false');
      if (focusCaret) caret.focus();
    }
    caret.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      if (item.classList.contains('is-open')) close(false); else open(false);
    });
    // open the menu from the keyboard via the trigger link or caret
    [trigger, caret].forEach(function (el) {
      if (!el) return;
      el.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown' || e.key === 'Down') { e.preventDefault(); open(true); }
      });
    });
    // roving arrow-key navigation between menu items; Esc closes + returns focus
    links.forEach(function (link, i) {
      link.addEventListener('keydown', function (e) {
        var k = e.key;
        if (k === 'ArrowDown' || k === 'Down') { e.preventDefault(); links[(i + 1) % links.length].focus(); }
        else if (k === 'ArrowUp' || k === 'Up') { e.preventDefault(); links[(i - 1 + links.length) % links.length].focus(); }
        else if (k === 'Home') { e.preventDefault(); links[0].focus(); }
        else if (k === 'End') { e.preventDefault(); links[links.length - 1].focus(); }
        else if (k === 'Escape' || k === 'Esc') { e.preventDefault(); e.stopPropagation(); close(true); }
      });
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
   never read a stale quarter (e.g. "Q4" in January). The copy is delivery
   framing ("Booking now for QN delivery"), so the quarter shown is the NEXT
   one — when a build booked today lands — not the quarter being booked.
   Falls back to the hardcoded value with no JS. */
(function () {
  var els = document.querySelectorAll('.js-book-quarter');
  if (!els.length) return;
  var d = new Date();
  var q = Math.floor(d.getMonth() / 3) + 1;   // 1..4, current quarter
  var next = 'Q' + (q === 4 ? 1 : q + 1);      // next quarter — the delivery quarter
  els.forEach(function (el) { el.textContent = next; });
})();

/* Mobile nav: toggle the collapsed link panel via the hamburger.
   Markup lives in every page's <header class="nav">; styling is in styles.css
   under the max-width:1140px block. Progressive enhancement — without JS the
   links stay collapsed but the CTA and logo still work. */
var FOCUSABLE = 'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])';

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

  /* Focus trap. The drawer is a full-viewport-width overlay, so Tab from its
     last link used to walk into the page BEHIND it — a keyboard or switch user
     ended up driving content they could not see, with no way back but Shift+Tab
     through the whole page. Esc already closed the panel and returned focus;
     this closes the other half. Wrap both directions on the panel's focusables
     plus the toggle itself, which stays reachable as the way out. */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab' || !nav.classList.contains('is-open')) return;
    // DOM ORDER, not visual order: Tab follows the document, and the toggle
    // sits AFTER .nav__links in the markup even though it renders above it.
    // Seeding the list with the toggle put it at index 0, so Tab from the real
    // last element (the toggle) matched nothing and walked into the page.
    var f = [].slice.call(nav.querySelectorAll(FOCUSABLE))
      .filter(function (el) { return el.offsetParent; });
    if (f.length < 2) return;
    var i = f.indexOf(document.activeElement), last = f.length - 1;
    if (e.shiftKey ? i === 0 : i === last) { e.preventDefault(); f[e.shiftKey ? last : 0].focus(); }
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

/* The booking-quarter auto-advance was REMOVED 2026-08-04.

   It rewrote .js-book-quarter to the next calendar quarter on every page load,
   on the theory that a computed value can never go stale. It cannot go stale,
   but it can be WRONG, and wrong is worse here: the bar states capacity, the
   pricing page points at it as proof we mean it, and nobody had decided
   anything when the number changed. In October it would have flipped the whole
   site to "Booking Q1 delivery" — a claim about next year's capacity — with no
   human involved, and it would have kept doing that every quarter forever.

   The quarter is now stated by a person in src/data/site-facts.json
   (booking.quarter), stamped into the markup at build time by facts:render,
   and held current by scripts/check-booking-quarter.mjs, which warns 30 days
   out and fails the build once the stated quarter has ended. Forgetting is
   impossible; guessing is not permitted. See README.md → "Booking quarter". */

/* Sticky mobile booking bar (<=768px).
   Slides in after ~1.5 viewport heights of scroll; dismissible, and the
   dismissal persists for the session. Injected rather than added to 40 pages
   of markup: it is a pure enhancement, so no-JS loses nothing, and there is no
   chrome to keep in sync across hand-written and generated pages.

   NOT shown on /book/ — the visitor is already on the booking page, and a
   fixed bar there would sit over the Calendly iframe's action area, which is
   exactly where the confirm button lives on a phone. Never shown while the nav
   drawer is open either; that is CSS (body:has(.nav.is-open)), so there is no
   second piece of state to drift.

   data-cta="sticky-bar" makes js/analytics.js tag the click with the placement
   automatically — its document-level listener is capture-phase, so an element
   added later is picked up with no registration. */
(function () {
  var d = document, S = 'mm:sticky-dismissed';
  if (!window.matchMedia || !matchMedia('(max-width:768px)').matches) return;
  if (/^\/book(\/|$)/.test(location.pathname)) return;
  try { if (sessionStorage.getItem(S)) return; } catch (e) { /* private mode: show it */ }
  // A page that cannot scroll past 1.5 viewport heights can never show the bar,
  // so injecting one only adds DOM and its text to a page nobody will see it
  // on. /404.html is the case that proved it: one screen tall, and the injected
  // label was enough to break sweep:mobile's JS-off/JS-on text parity, which
  // exists to catch content that DISAPPEARS without JS. Bail early instead.
  if (d.documentElement.scrollHeight < innerHeight * 1.7) return;

  var bar = d.createElement('div');
  bar.className = 'stickybook';
  bar.innerHTML = '<a class="stickybook__cta" data-cta="sticky-bar" href="/book/">Book a free assessment <span class="arr">&#8594;</span></a>'
    + '<button class="stickybook__x" type="button" aria-label="Dismiss booking bar">&times;</button>';
  d.body.appendChild(bar);

  bar.lastChild.onclick = function () {
    bar.classList.remove('is-in');
    try { sessionStorage.setItem(S, '1'); } catch (e) { /* ignore */ }
    setTimeout(function () { bar.remove(); }, 300);
  };

  var t;
  function show() {
    t = 0;
    if (pageYOffset > innerHeight * 1.5) { bar.classList.add('is-in'); removeEventListener('scroll', onScroll); }
  }
  function onScroll() { t || (t = requestAnimationFrame(show)); }
  addEventListener('scroll', onScroll, { passive: true });
  show();
})();

/**
 * Site analytics — every Plausible custom event on the static site lives
 * HERE (the /book/ page adds its own booking trio inline; the Score app has
 * its own mapping in ai-ready-score/lib/analytics.ts). The full event
 * contract, funnel mapping, and no-PII rule: analytics-events.md.
 *
 * Cookieless (Plausible), first-party (script + events proxied at /js/pa.js
 * and /api/event — see functions/). Props carry only page paths, placement
 * labels, slugs, and coarse bands. Never a name, email, phone, free text,
 * or raw score.
 *
 *   cta_book_click        { page, location }   booking intent
 *   cta_score_click       { page, location }   tool engagement intent
 *   calculator_interacted { page, industry, team_band }   once per page load
 *   newsletter_subscribed { page }             beehiiv form submit
 *   guide_read            { page, guide }      75% scroll depth, once
 */
(function () {
  function fire(name, props) {
    if (typeof window.plausible === "function") {
      window.plausible(name, { props: props });
    }
  }
  var PAGE = location.pathname;

  /* ---------- CTA clicks: /book and /score links, placement-tagged ------- */
  function placementOf(a) {
    if (a.closest(".ticker")) return "ticker";
    if (a.closest("header.nav")) return "nav";
    if (a.closest(".foot")) return "footer";
    if (a.closest(".hero__cta")) return "hero";
    if (a.closest(".paths")) return "door";
    if (a.closest(".calcband")) return "calculator"; // homepage ROI band
    // The /calculator/ page: its CTAs sit outside .roi, so key off the path
    // (nav/footer/ticker already returned above).
    if (PAGE.indexOf("/calculator") === 0) return "calculator";
    return null;
  }

  document.addEventListener(
    "click",
    function (e) {
      var t = e.target;
      var a = t && t.closest ? t.closest("a[href]") : null;
      if (!a) return;
      var href = a.getAttribute("href") || "";
      var name =
        href.indexOf("/score") === 0
          ? "cta_score_click"
          : href.indexOf("/book") === 0
            ? "cta_book_click"
            : null;
      if (!name) return;
      // Explicit data-cta-placement wins; otherwise infer from the region.
      var placement = a.getAttribute("data-cta-placement") || placementOf(a);
      if (!placement) return;
      fire(name, { page: PAGE, location: placement });
    },
    true,
  );

  /* ---------- calculator_interacted: first touch, once per page load ----- */
  // Both calculators: /calculator/ (#calcIndustry/#calcRange) and the
  // homepage band (#bandIndustry/#bandRange). Props are the industry key and
  // a coarse headcount band — never the dollar output.
  (function () {
    var pairs = [
      ["calcIndustry", "calcRange"],
      ["bandIndustry", "bandRange"],
    ];
    var fired = false;
    function teamBand(v) {
      v = Number(v) || 0;
      if (v <= 10) return "1–10";
      if (v <= 25) return "11–25";
      if (v <= 50) return "26–50";
      if (v <= 100) return "51–100";
      return "100+";
    }
    pairs.forEach(function (p) {
      var sel = document.getElementById(p[0]);
      var range = document.getElementById(p[1]);
      if (!sel || !range) return;
      function onFirstTouch() {
        if (fired) return;
        fired = true;
        fire("calculator_interacted", {
          page: PAGE,
          industry: sel.value,
          team_band: teamBand(range.value),
        });
      }
      sel.addEventListener("change", onFirstTouch);
      range.addEventListener("input", onFirstTouch);
    });
  })();

  /* ---------- newsletter_subscribed: beehiiv subscribe forms ------------- */
  // Fires on submit (the form GETs to beehiiv in a new tab, so submit is the
  // closest observable moment to a confirmed subscribe). Email never rides.
  document.addEventListener(
    "submit",
    function (e) {
      var f = e.target;
      if (f && f.hasAttribute && f.hasAttribute("data-beehiiv-subscribe")) {
        fire("newsletter_subscribed", { page: PAGE });
      }
    },
    true,
  );

  /* ---------- guide_read: 75% scroll depth on a guide detail page -------- */
  (function () {
    var m = PAGE.match(/^\/guides\/([^/]+)\/$/);
    if (!m) return;
    var slug = m[1];
    var fired = false;
    var ticking = false;
    function depth() {
      var doc = document.documentElement;
      var total = doc.scrollHeight - window.innerHeight;
      if (total <= 0) return 1;
      return (window.pageYOffset || doc.scrollTop || 0) / total;
    }
    function check() {
      ticking = false;
      if (fired) return;
      if (depth() >= 0.75) {
        fired = true;
        window.removeEventListener("scroll", onScroll);
        fire("guide_read", { page: PAGE, guide: slug });
      }
    }
    function onScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(check);
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    check(); // short pages: already past 75% on load
  })();
})();

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
 *
 * `location` on cta_book_click comes from the link's own `data-cta` attribute,
 * which every booking CTA carries (16 distinct placements — ticker, nav,
 * footer, final-cta, hero, page-hero, door, calculator, faq-strip, prose,
 * breadcrumb, contact-cta, security-reviewer, story-close, legal, not-found).
 * Stamped by scripts/stamp-cta.mjs, asserted by scripts/check-cta.mjs, which
 * runs in build:static. /score links still use the region inference below.
 *
 *   calculator_interacted { page, industry, team_band, at } first-touch · cta-click
 *   newsletter_subscribed { page }             beehiiv form submit
 *   guide_read            { page, guide }      75% scroll depth, once
 *   calculator_emailed    { page, industry, team_band }  estimate emailed to self
 */
(function () {
  function fire(name, props) {
    if (typeof window.plausible === "function") {
      window.plausible(name, { props: props });
    }
  }
  var PAGE = location.pathname;

  // Coarse headcount bands — the no-PII contract allows the band, never the
  // number. Shared by calculator_interacted and calculator_emailed.
  function teamBand(v) {
    v = Number(v) || 0;
    if (v <= 10) return "1\u201310";
    if (v <= 25) return "11\u201325";
    if (v <= 50) return "26\u201350";
    if (v <= 100) return "51\u2013100";
    return "100+";
  }

  /* ---------- CTA clicks: /book and /score links, placement-tagged ------- */
  // `data-cta` in the markup is AUTHORITATIVE. Every booking CTA carries one
  // (stamped by scripts/stamp-cta.mjs, asserted by scripts/check-cta.mjs), and
  // the blog chrome carries the same three in templates.mjs.
  //
  // The region inference below used to be the only source, and it was wrong in
  // both directions:
  //   * 16 links matched nothing and fired NOTHING — the /pricing/ FAQ strip,
  //     /security/, /contact/, /404.html and nine in-prose links.
  //   * `.hero__cta` is a shared CTA-ROW wrapper, not the hero. 35 of the 36
  //     links it labelled "hero" were not heroes: 30 were the pre-footer
  //     `.final` band, two were page heroes, three were /work/marcus/ mid-page
  //     CTAs. Only the homepage's was real.
  // It is kept, corrected, purely so a newly added link is never silently
  // untracked. In practice it should be dead code — `cta:check` fails the build
  // on an unstamped /book link. It still carries the /score links, which are
  // not stamped.
  function placementOf(a) {
    if (a.closest(".ticker")) return "ticker";
    if (a.closest("header.nav")) return "nav";
    if (a.closest(".foot")) return "footer";
    if (a.closest("section.final")) return "final-cta"; // pre-footer band
    if (a.closest(".paths")) return "door";
    if (a.closest(".calcband")) return "calculator"; // homepage ROI band
    if (a.closest("section.hero")) return "hero"; // the homepage hero only
    if (a.closest(".pagehero, .sechero, .cr-hero, .bookhero")) return "page-hero";
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
      // data-cta wins; data-cta-placement is the retired spelling, kept because
      // the Score app's report door may still emit it; then region inference.
      var placement =
        a.getAttribute("data-cta") ||
        a.getAttribute("data-cta-placement") ||
        placementOf(a);
      if (!placement) return;
      fire(name, { page: PAGE, location: placement });
    },
    true,
  );

  /* ---------- calculator_interacted: first touch, once per page load ----- */
  // Both calculators: /calculator/ (#calcIndustry/#calcRange) and the
  // homepage band (#bandIndustry/#bandRange). Props are the industry key and
  // a coarse headcount band — never the dollar output.
  // `at` distinguishes the two moments this fires, and it is ONE event rather
  // than two names on purpose: the funnel question is "did they engage with the
  // calculator", and splitting that across two goals makes every rate in
  // analytics-events.md need reassembling by hand.
  //   first-touch — they started moving it. Debounced (below), latched, once.
  //   cta-click   — they clicked the calculator's own booking CTA. This is the
  //                 state they ACTED on, which first-touch cannot tell you: a
  //                 visitor who lands on professional-services/25 and drags to
  //                 construction/80 before booking reports the first pair only.
  (function () {
    var pairs = [
      ["calcIndustry", "calcRange"],
      ["bandIndustry", "bandRange"],
    ];
    // Exactly one pair exists per page (/calculator/ has calc*, the homepage
    // band has band*). The old loop shared one `fired` latch across both, so
    // taking the first present pair is the same behaviour.
    var sel = null, range = null;
    for (var i = 0; i < pairs.length && !sel; i++) {
      var s = document.getElementById(pairs[i][0]);
      var r = document.getElementById(pairs[i][1]);
      if (s && r) { sel = s; range = r; }
    }
    if (!sel) return;

    var touched = false, sent = false, sentCta = false, timer = null;
    function send(at) {
      fire("calculator_interacted", {
        page: PAGE,
        industry: sel.value,
        team_band: teamBand(range.value),
        at: at,
      });
    }

    // Debounced 400ms. `input` on a range fires per pixel of drag, and the
    // latch alone would have reported the FIRST tick of a drag — a visitor
    // hauling the slider from 25 to 60 got recorded at 26. The debounce is
    // what makes the reported value the one they settled on. It can never
    // change how MANY events fire; `sent` decides that.
    function onTouch() {
      touched = true;
      if (sent) return;
      clearTimeout(timer);
      timer = setTimeout(function () {
        if (sent) return;
        sent = true;
        send("first-touch");
      }, 400);
    }
    sel.addEventListener("change", onTouch);
    range.addEventListener("input", onTouch);

    // The final state, captured at the moment they act on it. Only for someone
    // who actually moved something — an untouched calculator's CTA click is
    // already `cta_book_click { location: "calculator" }` and carries nothing
    // about a calculation that never happened.
    document.addEventListener(
      "click",
      function (e) {
        var a = e.target && e.target.closest
          ? e.target.closest('a[data-cta="calculator"][href^="/book/"]')
          : null;
        if (!a || !touched || sentCta) return;
        sentCta = true;
        // A click inside the debounce window means first-touch never went. Drop
        // it rather than firing both: this event carries the same values, and
        // the pair would double-count one interaction.
        clearTimeout(timer);
        sent = true;
        send("cta-click");
      },
      true,
    );
  })();

  /* ---------- calculator_emailed: "email me this estimate" -------------- */
  // One handler for every .estimate-form on the site (the ROI calculator and
  // the guide worksheets). Props carry the industry + coarse band only — never
  // the address and never the dollar output, per the no-PII contract.
  document.addEventListener("submit", function (e) {
    var form = e.target.closest && e.target.closest(".estimate-form");
    if (!form) return;
    fire("calculator_emailed", {
      page: PAGE,
      industry: form.getAttribute("data-industry") || "",
      team_band: teamBand(form.getAttribute("data-team") || 0),
    });
  }, true);

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

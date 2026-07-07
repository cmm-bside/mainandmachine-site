/**
 * Funnel analytics — split the top of the funnel so we can compare score-first
 * vs book-first. Fires two Plausible custom events (the site's existing
 * provider; no new one):
 *
 *   score_cta_click  { placement }   for links to /score
 *   book_cta_click   { placement }   for links to /book
 *
 * placement ∈ hero | ticker | nav | door | footer | calculator, read from the
 * surrounding component. One delegated listener covers every page (nav/footer
 * live everywhere); a link opts in purely by its href, so no per-CTA markup is
 * needed. Stray /score or /book links outside the six known regions are ignored.
 *
 * NOTE: these are CTA CLICKS, not the success metric. Booked calls per visitor
 * fire inside the Score app (report page, GA4 report_calendly_booked).
 */
(function () {
  function placementOf(a) {
    if (a.closest(".ticker")) return "ticker";
    if (a.closest("header.nav")) return "nav";
    if (a.closest(".foot")) return "footer";
    if (a.closest(".hero__cta")) return "hero";
    if (a.closest(".paths")) return "door";
    if (a.closest(".calcband")) return "calculator"; // homepage ROI band
    // The /calculator/ page: its CTAs sit outside .roi, so key off the path
    // (nav/footer/ticker already returned above).
    if (location.pathname.indexOf("/calculator") === 0) return "calculator";
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
          ? "score_cta_click"
          : href.indexOf("/book") === 0
            ? "book_cta_click"
            : null;
      if (!name) return;
      // Explicit data-cta-placement wins; otherwise infer from the region.
      var placement = a.getAttribute("data-cta-placement") || placementOf(a);
      if (!placement) return;
      if (typeof window.plausible === "function") {
        window.plausible(name, { props: { placement: placement } });
      }
    },
    true,
  );
})();

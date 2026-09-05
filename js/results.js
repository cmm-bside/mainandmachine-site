// Preserve existing direct links into the expandable implementation chapters.
(function () {
  function revealHash() {
    if (!location.hash) return;
    var id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch (_) { return; }
    var target = document.getElementById(id);
    if (!target) return;
    var parent = target.parentElement, opened = false;
    while (parent) {
      if (parent.tagName === 'DETAILS' && !parent.open) {
        parent.open = true;
        opened = true;
      }
      parent = parent.parentElement;
    }
    if (opened) requestAnimationFrame(function () { target.scrollIntoView({ block: 'start' }); });
  }
  revealHash();
  window.addEventListener('hashchange', revealHash);
})();

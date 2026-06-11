/* Selected / All publication toggle.
   Used on index.html and papers.html. The papers container starts with
   class "pubs-selected" so the curated view shows immediately (no flash);
   this script wires the buttons and hides year headings that end up empty. */
(function () {
  function wire(toggle) {
    var root = toggle.closest('.papers-thumbs, .section');
    if (!root) return;

    function apply(filter) {
      var selectedOnly = filter !== 'all';
      root.classList.toggle('pubs-selected', selectedOnly);

      // Hide a year heading when no paper in its group is visible.
      var headings = root.querySelectorAll('.year-heading');
      headings.forEach(function (h) {
        var hasVisible = false;
        var el = h.nextElementSibling;
        while (el && !el.classList.contains('year-heading')) {
          if (el.classList.contains('paper') &&
              (!selectedOnly || el.classList.contains('selected'))) {
            hasVisible = true;
            break;
          }
          el = el.nextElementSibling;
        }
        h.classList.toggle('is-empty', !hasVisible);
      });

      // Reflect active state on the buttons.
      toggle.querySelectorAll('.pub-toggle-btn').forEach(function (b) {
        var active = b.getAttribute('data-filter') === filter;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
    }

    toggle.addEventListener('click', function (e) {
      var btn = e.target.closest('.pub-toggle-btn');
      if (btn) apply(btn.getAttribute('data-filter'));
    });

    // Default view.
    apply('selected');
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.pub-toggle').forEach(wire);
  });
})();

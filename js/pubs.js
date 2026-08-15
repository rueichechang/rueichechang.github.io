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

/* BibTeX chips + copy modal.
   For each .paper we derive an identifier from its links (DOI, then arXiv,
   then IEEE) and, if window.BIBTEX (js/bib.js) has a matching entry, append a
   "BibTeX" chip that opens a modal where the citation can be read and copied. */
(function () {
  var BIB = {};
  var modal, bodyEl, copyBtn, lastFocus;

  function lookupKey(paper) {
    var a = paper.querySelector('a[href*="doi.org/"]');
    if (a) {
      var doi = a.getAttribute('href').split('doi.org/')[1];
      if (doi) {
        doi = decodeURIComponent(doi).replace(/[#?].*$/, '').replace(/\/+$/, '');
        if (BIB[doi]) return doi;
      }
    }
    a = paper.querySelector('a[href*="arxiv.org/abs/"]');
    if (a) {
      var id = a.getAttribute('href').split('/abs/')[1];
      if (id) {
        id = id.replace(/v\d+$/, '').replace(/[#?].*$/, '').replace(/\/+$/, '');
        if (BIB['arxiv:' + id]) return 'arxiv:' + id;
      }
    }
    a = paper.querySelector('a[href*="ieeexplore.ieee.org/document/"]');
    if (a) {
      var docid = a.getAttribute('href').split('/document/')[1];
      if (docid) {
        docid = docid.replace(/[#/?].*$/, '');
        if (BIB['ieee:' + docid]) return 'ieee:' + docid;
      }
    }
    return null;
  }

  function buildModal() {
    modal = document.createElement('div');
    modal.className = 'bib-modal';
    modal.hidden = true;
    modal.innerHTML =
      '<div class="bib-modal-backdrop" data-close></div>' +
      '<div class="bib-modal-dialog" role="dialog" aria-modal="true" aria-label="BibTeX citation">' +
        '<div class="bib-modal-head">' +
          '<span class="bib-modal-title">BibTeX</span>' +
          '<span class="bib-modal-actions">' +
            '<button type="button" class="bib-modal-copy">Copy</button>' +
            '<button type="button" class="bib-modal-close" aria-label="Close" data-close>&times;</button>' +
          '</span>' +
        '</div>' +
        '<pre class="bib-modal-body" tabindex="0"></pre>' +
      '</div>';
    document.body.appendChild(modal);
    bodyEl = modal.querySelector('.bib-modal-body');
    copyBtn = modal.querySelector('.bib-modal-copy');

    modal.addEventListener('click', function (e) {
      if (e.target.hasAttribute('data-close')) closeModal();
    });
    copyBtn.addEventListener('click', function () {
      copyText(bodyEl.textContent, copyBtn);
    });
    document.addEventListener('keydown', function (e) {
      if (!modal.hidden && e.key === 'Escape') closeModal();
    });
  }

  function entryText(v) {
    return Array.isArray(v) ? v.join('\n') : (v || '');
  }

  function openModal(text) {
    lastFocus = document.activeElement;
    bodyEl.textContent = text;
    copyBtn.textContent = 'Copy';
    modal.hidden = false;
    document.body.classList.add('bib-modal-open');
    copyBtn.focus();
  }

  function closeModal() {
    modal.hidden = true;
    document.body.classList.remove('bib-modal-open');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) { /* ignore */ }
    document.body.removeChild(ta);
  }

  function copyText(text, btn) {
    function done() {
      btn.textContent = 'Copied!';
      setTimeout(function () { btn.textContent = 'Copy'; }, 1500);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () {
        fallbackCopy(text);
        done();
      });
    } else {
      fallbackCopy(text);
      done();
    }
  }

  function injectChips() {
    document.querySelectorAll('.paper').forEach(function (paper) {
      var key = lookupKey(paper);
      if (!key) return;
      var venue = paper.querySelector('.venue');
      if (!venue || venue.querySelector('.cite-btn')) return;

      var sep = document.createElement('span');
      sep.className = 'venue-sep';
      sep.textContent = '\u2022';

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cite-btn';
      btn.textContent = 'BibTeX';
      btn.addEventListener('click', function () { openModal(entryText(BIB[key])); });

      // Make the chip the second link (right after "ACM"); when there is no
      // ACM link, make it the first link instead.
      var links = venue.querySelectorAll('a');
      var acm = null;
      links.forEach(function (a) {
        if (!acm && a.textContent.trim() === 'ACM') acm = a;
      });
      if (acm) {
        acm.after(document.createTextNode(' '), sep, document.createTextNode(' '), btn);
      } else if (links.length) {
        links[0].before(btn, document.createTextNode(' '), sep, document.createTextNode(' '));
      } else {
        venue.appendChild(document.createTextNode(' '));
        venue.appendChild(sep);
        venue.appendChild(document.createTextNode(' '));
        venue.appendChild(btn);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!window.BIBTEX) return;
    BIB = window.BIBTEX;
    buildModal();
    injectChips();
  });
})();

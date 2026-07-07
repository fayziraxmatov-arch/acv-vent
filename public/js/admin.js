/* ACV — admin panel behaviour. External file only (strict CSP). */
(function () {
  'use strict';

  /* ── Confirm before destructive actions ──────────────────── */
  document.querySelectorAll('form.js-confirm').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      var msg = form.getAttribute('data-confirm') || 'Are you sure?';
      if (!window.confirm(msg)) e.preventDefault();
    });
  });

  /* ── Language tabs (UZ / RU / EN) ────────────────────────── */
  document.querySelectorAll('.lang-tabs').forEach(function (tabs) {
    var scope = tabs.parentElement;
    tabs.querySelectorAll('.tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        var key = tab.getAttribute('data-tab');
        tabs.querySelectorAll('.tab').forEach(function (t) { t.classList.toggle('active', t === tab); });
        scope.querySelectorAll('.lang-pane').forEach(function (pane) {
          pane.classList.toggle('active', pane.getAttribute('data-pane') === key);
        });
      });
    });
  });

  /* ── Video type switch (file ↔ YouTube) ─────────────────── */
  var typeRadios = document.querySelectorAll('[data-type-radio]');
  if (typeRadios.length) {
    var applyType = function () {
      var checked = document.querySelector('[data-type-radio]:checked');
      var val = checked ? checked.value : 'file';
      document.querySelectorAll('[data-type-pane]').forEach(function (pane) {
        pane.hidden = pane.getAttribute('data-type-pane') !== val;
      });
    };
    typeRadios.forEach(function (r) { r.addEventListener('change', applyType); });
    applyType();
  }

  /* ── File inputs: preview + show chosen filename ─────────── */
  document.querySelectorAll('.file-input').forEach(function (input) {
    input.addEventListener('change', function () {
      var file = input.files && input.files[0];
      var label = input.closest('.a-field');
      label = label && label.querySelector('[data-file-label]');
      if (label && file) label.textContent = file.name;

      var previewSel = input.getAttribute('data-preview');
      if (previewSel && file && /^image\//.test(file.type)) {
        var img = document.querySelector(previewSel);
        if (img) {
          var reader = new FileReader();
          reader.onload = function (e) {
            img.src = e.target.result;
            img.classList.remove('hidden');
          };
          reader.readAsDataURL(file);
        }
      }
    });
  });

  /* ── Toast autohide ──────────────────────────────────────── */
  var toast = document.querySelector('[data-toast]');
  if (toast) {
    setTimeout(function () {
      toast.classList.add('hide');
      setTimeout(function () { toast.remove(); }, 350);
    }, 4200);
  }
})();

/* ACV — public site behaviour. No inline scripts anywhere (strict CSP). */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Header shadow on scroll ─────────────────────────────── */
  var header = document.querySelector('[data-header]');
  if (header) {
    var onScroll = function () {
      header.classList.toggle('scrolled', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ── Mobile burger ───────────────────────────────────────── */
  var burger = document.querySelector('[data-burger]');
  if (burger) {
    burger.addEventListener('click', function () {
      var open = document.body.classList.toggle('nav-open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.querySelectorAll('.main-nav a').forEach(function (a) {
      a.addEventListener('click', function () {
        document.body.classList.remove('nav-open');
        burger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ── Language dropdown: close on outside click / Escape ──── */
  var lang = document.querySelector('[data-lang]');
  if (lang) {
    document.addEventListener('click', function (e) {
      if (lang.open && !lang.contains(e.target)) lang.open = false;
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') lang.open = false;
    });
  }

  /* ── Flash toast autohide ────────────────────────────────── */
  var toast = document.querySelector('[data-toast]');
  if (toast) {
    setTimeout(function () {
      toast.classList.add('hide');
      setTimeout(function () { toast.remove(); }, 350);
    }, 4200);
  }

  /* ── Reveal on scroll + stat counters ────────────────────── */
  var revealEls = document.querySelectorAll('.rv');
  var countEls = document.querySelectorAll('[data-count]');

  function runCounter(el) {
    var target = parseInt(el.getAttribute('data-count'), 10) || 0;
    if (reduceMotion || target === 0) { el.textContent = target.toLocaleString('ru-RU'); return; }
    var dur = 1400;
    var start = null;
    function tick(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased).toLocaleString('ru-RU');
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        entry.target.querySelectorAll('[data-count]').forEach(function (c) {
          if (!c.dataset.done) { c.dataset.done = '1'; runCounter(c); }
        });
        io.unobserve(entry.target);
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
    // Counters that live outside a .rv wrapper
    countEls.forEach(function (c) {
      if (!c.closest('.rv')) { c.dataset.done = '1'; runCounter(c); }
    });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
    countEls.forEach(runCounter);
  }

  /* ── Hero temperature chip ticker ────────────────────────── */
  var chip = document.querySelector('[data-temp-chip]');
  if (chip && !reduceMotion) {
    var label = chip.querySelector('[data-temp-label]');
    var value = chip.querySelector('[data-temp-value]');
    var states = [
      { label: chip.getAttribute('data-cold-label'), value: '\u221218\u00B0C', warm: false },
      { label: chip.getAttribute('data-warm-label'), value: '+23\u00B0C', warm: true }
    ];
    var idx = 0;
    setInterval(function () {
      chip.classList.add('swap');
      setTimeout(function () {
        idx = (idx + 1) % states.length;
        label.textContent = states[idx].label;
        value.textContent = states[idx].value;
        chip.classList.toggle('warm', states[idx].warm);
        chip.classList.remove('swap');
      }, 300);
    }, 3600);
  }

  /* ── Lightbox ────────────────────────────────────────────── */
  var lbRoot = document.querySelector('[data-lightbox-root]');
  if (lbRoot) {
    var lbImg = lbRoot.querySelector('[data-lb-img]');
    var lbTitle = lbRoot.querySelector('[data-lb-title]');
    var lbDesc = lbRoot.querySelector('[data-lb-desc]');
    var lbCounter = lbRoot.querySelector('[data-lb-counter]');
    var items = Array.prototype.slice.call(document.querySelectorAll('[data-lightbox]'));
    var current = 0;

    function show(i) {
      if (!items.length) return;
      current = (i + items.length) % items.length;
      var el = items[current];
      lbImg.src = el.getAttribute('data-full');
      lbImg.alt = el.getAttribute('data-title') || '';
      lbTitle.textContent = el.getAttribute('data-title') || '';
      lbDesc.textContent = el.getAttribute('data-desc') || '';
      lbCounter.textContent = (current + 1) + ' / ' + items.length;
    }
    function open(i) {
      show(i);
      lbRoot.classList.add('open');
      lbRoot.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }
    function close() {
      lbRoot.classList.remove('open');
      lbRoot.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      lbImg.src = '';
    }

    items.forEach(function (el, i) {
      el.addEventListener('click', function () { open(i); });
    });
    lbRoot.querySelector('[data-lb-close]').addEventListener('click', close);
    lbRoot.querySelector('[data-lb-prev]').addEventListener('click', function () { show(current - 1); });
    lbRoot.querySelector('[data-lb-next]').addEventListener('click', function () { show(current + 1); });
    lbRoot.addEventListener('click', function (e) { if (e.target === lbRoot) close(); });
    document.addEventListener('keydown', function (e) {
      if (!lbRoot.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(current - 1);
      if (e.key === 'ArrowRight') show(current + 1);
    });
  }

  /* ── YouTube click-to-load (privacy-friendly, fast) ──────── */
  document.querySelectorAll('[data-yt]').forEach(function (shell) {
    shell.addEventListener('click', function () {
      var id = shell.getAttribute('data-yt');
      if (!/^[\w-]{6,20}$/.test(id)) return;
      var iframe = document.createElement('iframe');
      iframe.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0';
      iframe.title = 'YouTube video';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      iframe.allowFullscreen = true;
      shell.replaceWith(iframe);
    }, { once: true });
  });
})();

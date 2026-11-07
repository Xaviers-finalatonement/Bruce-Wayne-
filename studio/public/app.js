// Progressive extras only: copy buttons. The site works fully without this file.
(function () {
  document.querySelectorAll('button.copy[hidden]').forEach(function (b) { b.hidden = false; });
  var live = document.createElement('div');
  live.className = 'sr'; live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite');
  document.body.appendChild(live);
  function legacy(el) {
    var prev = el.hidden; el.hidden = false; el.focus(); el.select(); el.setSelectionRange(0, 99999);
    var ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
    el.hidden = prev; return ok;
  }
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('button.copy');
    if (!b) return;
    var el = document.getElementById(b.getAttribute('data-copy-from'));
    if (!el) return;
    var done = function (ok) {
      var old = b.getAttribute('data-label') || b.textContent;
      b.setAttribute('data-label', old);
      b.textContent = ok ? 'Copied ✓' : 'Press and hold the text to copy';
      b.classList.toggle('copied', ok);
      live.textContent = ok ? 'Copied' : 'Copy failed';
      clearTimeout(b._t);
      b._t = setTimeout(function () { b.textContent = old; b.classList.remove('copied'); }, 2000);
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(el.value).then(function () { done(true); }, function () { done(legacy(el)); });
    } else { done(legacy(el)); }
  });
})();

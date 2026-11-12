/*
 * Welcome page, shown the first time the app opens on a device that has no checklist yet.
 * Continue with Google (iPhone app: sign in and sync, encrypted), start without an account,
 * or restore a backup file. Shown again later only if you ask for it: index.html?welcome
 */
(function () {
  'use strict';
  var L = window.mimiLocal;
  if (!L) return;
  var forced = /[?&]welcome\b/.test(location.search);

  Promise.all([L.flag('welcomed'), L.hasData(), L.healthy()]).then(function (r) {
    var seen = r[0] === '1', hasData = r[1];
    if (!r[2]) return; // saved data couldn't be read: not a fresh install, don't greet
    if (forced || (!seen && !hasData)) show();
    else if (!seen) L.flag('welcomed', '1'); // existing users skip it
  });

  var CAT = '<svg viewBox="0 0 32 32"><path d="M6 13 7 4l7 5h4l7-5 1 9a11 10 0 1 1-20 0z" fill="#FFF6EE" stroke="#1F2226" stroke-width="1.4" stroke-linejoin="round"/>' +
    '<path d="M19 9l6-4.5.8 7z" fill="#FF9F6E"/><circle class="eye" cx="12" cy="17" r="1.8" fill="#1F2226"/><circle class="eye" cx="20" cy="17" r="1.8" fill="#1F2226"/>' +
    '<path d="M15 20.5h2l-1 1.2z" fill="#FF8FA8"/><path d="M13.5 23q2.5 1.6 5 0" fill="none" stroke="#1F2226" stroke-width="1.2" stroke-linecap="round"/></svg>';
  var G = '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.2l7.9 6.2C12.5 13.6 17.8 9.5 24 9.5z"/>' +
    '<path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 7l7.4 5.8c4.3-4 6.9-9.9 6.9-17.3z"/>' +
    '<path fill="#FBBC05" d="M10.6 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6l-7.9-6.2A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l8-6.2z"/>' +
    '<path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.8c-2.1 1.4-4.8 2.3-8.5 2.3-6.2 0-11.5-4.1-13.4-9.8l-8 6.2C6.6 42.6 14.6 48 24 48z"/></svg>';
  var CHECK = '<svg viewBox="0 0 16 16"><path d="M3.5 8.5l3 3 6-7"/></svg>';
  var LOCK = '<svg viewBox="0 0 24 24"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';

  var root, statusEl, gBtn, busy = false, mode = 'signIn';

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  function show() {
    var sync = window.mimiSync && window.mimiSync.available;
    root = el('div', 'landing');
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Welcome to Mimi Checklist');

    ['b1', 'b2', 'b3'].forEach(function (b) { root.appendChild(el('i', 'ld-blob ' + b)); });
    var stars = el('div', 'ld-stars');
    for (var i = 0; i < 36; i++) {
      var s = el('i');
      s.style.left = (Math.random() * 100).toFixed(1) + '%';
      s.style.top = (Math.random() * 100).toFixed(1) + '%';
      s.style.setProperty('--d', (2 + Math.random() * 3).toFixed(2) + 's');
      s.style.setProperty('--w', (Math.random() * 3).toFixed(2) + 's');
      if (Math.random() < .3) { s.style.width = s.style.height = '2px'; }
      stars.appendChild(s);
    }
    root.appendChild(stars);

    // Mimi with finished tasks orbiting as light, and sample cards floating around.
    var hero = el('div', 'ld-hero');
    var orbit = el('div', 'ld-orbit');
    orbit.appendChild(el('i', 'ld-ring r3'));
    orbit.appendChild(el('i', 'ld-ring'));
    orbit.appendChild(el('i', 'ld-ring r2'));
    orbit.appendChild(el('i', 'ld-pulse'));
    var dots = el('div', 'ld-dots');
    ['#FF6B4A', '#2CC4BE', '#FFC24D', '#8ED85A', '#B59CFF'].forEach(function (c, k) {
      var d = el('i');
      d.style.setProperty('--c', c);
      d.style.setProperty('--a', (k * 72) + 'deg');
      dots.appendChild(d);
    });
    orbit.appendChild(dots);
    orbit.appendChild(el('div', 'ld-cat', CAT));
    hero.appendChild(orbit);
    hero.appendChild(el('div', 'ld-card c1', '<span class="ck">' + CHECK + '</span>Morning walk'));
    hero.appendChild(el('div', 'ld-card c2', '<span class="ic" style="background:#1E8FE1">💧</span>1.5 L of 2.5 L'));
    hero.appendChild(el('div', 'ld-card c3', '<span class="ic">25:00</span>Focus'));
    root.appendChild(hero);

    var copy = el('div', 'ld-copy');
    var title = el('h1', 'ld-title');
    'Mimi Checklist'.split(' ').forEach(function (w, k) {
      var sp = el('span');
      sp.textContent = w;
      sp.style.animationDelay = (0.15 + k * 0.14) + 's';
      title.appendChild(sp);
      title.appendChild(document.createTextNode(' '));
    });
    copy.appendChild(title);
    var sub = el('p', 'ld-sub');
    sub.textContent = 'Plan your day, focus with timers, drink your water. Mimi keeps you on track.';
    copy.appendChild(sub);
    var feats = el('ul', 'ld-feats');
    ['Tasks & focus timers', 'Water & notes', '“Hey Mimi” voice'].forEach(function (f, k) {
      var li = el('li');
      li.textContent = f;
      li.style.animationDelay = (0.8 + k * 0.1) + 's';
      feats.appendChild(li);
    });
    copy.appendChild(feats);

    var actions = el('div', 'ld-actions');
    var delay = 1.1;
    if (sync) {
      gBtn = el('button', 'ld-btn ld-google', G + '<span>Continue with Google</span>');
      gBtn.type = 'button';
      gBtn.style.animationDelay = delay + 's';
      delay += .1;
      gBtn.addEventListener('click', google);
      actions.appendChild(gBtn);
    }
    var start = el('button', 'ld-btn ld-start', sync ? 'Start without an account' : 'Get started');
    start.type = 'button';
    start.style.animationDelay = delay + 's';
    start.addEventListener('click', function () { finish(false); });
    actions.appendChild(start);
    var restore = el('button', 'ld-link', 'I have a backup file');
    restore.type = 'button';
    restore.style.animationDelay = (delay + .1) + 's';
    restore.addEventListener('click', restoreBackup);
    actions.appendChild(restore);
    copy.appendChild(actions);

    statusEl = el('div', 'ld-status');
    statusEl.setAttribute('aria-live', 'polite');
    copy.appendChild(statusEl);
    copy.appendChild(el('p', 'ld-foot', LOCK + (sync ? '<span>Encrypted with your own password before it reaches Google Drive.</span>'
      : '<span>Your checklist is saved on this device.</span>')));
    root.appendChild(copy);

    document.body.appendChild(root);
    window.addEventListener('mimi-sync-status', onStatus);
    if (window.mimiSync && window.mimiSync.status) onStatus({ detail: window.mimiSync.status });
  }

  function setStatus(text, isErr) {
    statusEl.textContent = text || '';
    statusEl.classList.toggle('err', !!isErr);
  }

  function setBusy(on, label) {
    busy = on;
    if (!gBtn) return;
    gBtn.disabled = on;
    var idle = mode === 'unlock' ? 'Enter sync password' : 'Continue with Google';
    gBtn.innerHTML = on ? '<span class="ld-spin"></span><span>' + (label || 'Signing in…') + '</span>' : G + '<span>' + idle + '</span>';
  }

  function google() {
    if (busy) return;
    setStatus('');
    setBusy(true, mode === 'unlock' ? 'Unlocking…' : 'Signing in…');
    window.mimiSync.act(mode);
  }

  function onStatus(e) {
    var s = e.detail || {};
    if (!root) return;
    if (s.configured === false && gBtn && !busy) { gBtn.remove(); gBtn = null; return; }
    if (!busy) return;
    if (s.phase === 'ok') { burst(); setStatus('All set' + (s.email ? ', ' + s.email : '') + '!'); setTimeout(function () { finish(true); }, 900); }
    else if (s.phase === 'syncing') setBusy(true, s.message || 'Syncing…');
    else if (s.phase === 'locked') { mode = 'unlock'; setBusy(false); setStatus(s.message || 'Enter your sync password to finish.', true); }
    else if (s.phase === 'error' || s.phase === 'off') { setBusy(false); if (s.message) setStatus(s.message, s.phase === 'error'); }
  }

  function restoreBackup() {
    var input = document.querySelector('#sBackupGrp input[type=file]');
    if (!input) return;
    L.flag('welcomed', '1');
    input.value = '';
    input.click();
  }

  function burst() {
    var b = el('div', 'ld-burst');
    var colors = ['#FF6B4A', '#2CC4BE', '#FFC24D', '#8ED85A', '#B59CFF', '#fff'];
    for (var i = 0; i < 28; i++) {
      var p = el('i');
      var a = Math.random() * Math.PI * 2, r = 80 + Math.random() * 140;
      p.style.setProperty('--c', colors[i % colors.length]);
      p.style.setProperty('--x', (Math.cos(a) * r).toFixed(0) + 'px');
      p.style.setProperty('--y', (Math.sin(a) * r).toFixed(0) + 'px');
      b.appendChild(p);
    }
    root.appendChild(b);
  }

  function finish(synced) {
    if (!root) return;
    window.removeEventListener('mimi-sync-status', onStatus);
    L.flag('welcomed', '1');
    root.classList.add('out');
    var r = root;
    root = null;
    setTimeout(function () { r.remove(); }, 750);
    if (!synced) {
      try { var t = document.getElementById('toast'); if (t) { t.textContent = 'Welcome! Add your first task below.'; t.classList.remove('err'); t.classList.add('show'); setTimeout(function () { t.classList.remove('show'); }, 2800); } } catch (e) {}
    }
  }
})();

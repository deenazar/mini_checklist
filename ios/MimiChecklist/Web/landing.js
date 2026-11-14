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

    // Brand, then a short animated story in three slides (swipe, or it moves on by itself).
    var brand = el('div', 'ld-brand', '<span class="ld-logo">' + CAT + '</span><b>Mimi Checklist</b>');
    root.appendChild(brand);

    var SLIDES = [
      { title: 'Plan your day', text: 'Add tasks, set a time, and tick them off one by one.', art:
        '<svg viewBox="0 0 300 220" aria-hidden="true">' +
        '<ellipse cx="150" cy="204" rx="96" ry="8" fill="#000" opacity=".12"/>' +
        '<g class="sl-card"><rect x="62" y="24" width="176" height="172" rx="22" fill="#fff"/>' +
        '<rect x="112" y="12" width="76" height="22" rx="11" fill="#FF6B4A"/>' +
        '<g class="sl-row r1"><rect x="84" y="58" width="22" height="22" rx="7" fill="none" stroke="#2CC4BE" stroke-width="3.5"/><path class="ck" d="M89 69l5 5 9-10" fill="none" stroke="#2CC4BE" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/><rect x="116" y="63" width="96" height="11" rx="5.5" fill="#E6EDF0"/></g>' +
        '<g class="sl-row r2"><rect x="84" y="98" width="22" height="22" rx="7" fill="none" stroke="#8B5CF6" stroke-width="3.5"/><path class="ck" d="M89 109l5 5 9-10" fill="none" stroke="#8B5CF6" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/><rect x="116" y="103" width="78" height="11" rx="5.5" fill="#E6EDF0"/></g>' +
        '<g class="sl-row r3"><rect x="84" y="138" width="22" height="22" rx="7" fill="none" stroke="#FF6B4A" stroke-width="3.5"/><path class="ck" d="M89 149l5 5 9-10" fill="none" stroke="#FF6B4A" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/><rect x="116" y="143" width="88" height="11" rx="5.5" fill="#E6EDF0"/></g></g>' +
        '<g class="sl-pencil"><path d="M232 150 L272 110 L282 120 L242 160 Z" fill="#FFC24D" stroke="#2A2420" stroke-width="3" stroke-linejoin="round"/><path d="M232 150 L226 166 L242 160 Z" fill="#FFE2CF" stroke="#2A2420" stroke-width="3" stroke-linejoin="round"/></g>' +
        '<g class="sl-spark" fill="#FFF"><path d="M40 50l3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/><path d="M262 40l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/></g></svg>' },
      { title: 'Stay focused', text: 'Timers keep you on track, and Mimi reminds you to drink water.', art:
        '<svg viewBox="0 0 300 220" aria-hidden="true">' +
        '<g class="sl-timer"><circle cx="112" cy="108" r="70" fill="#fff"/><circle cx="112" cy="108" r="54" fill="none" stroke="#FFE2D8" stroke-width="12"/>' +
        '<circle class="sl-ring" cx="112" cy="108" r="54" fill="none" stroke="#FF6B4A" stroke-width="12" stroke-linecap="round" pathLength="100" stroke-dasharray="100" transform="rotate(-90 112 108)"/>' +
        '<text x="112" y="116" text-anchor="middle" font-family="DM Mono, monospace" font-weight="500" font-size="24" fill="#10202A">25:00</text>' +
        '<rect x="100" y="28" width="24" height="12" rx="4" fill="#FF6B4A"/></g>' +
        '<defs><clipPath id="slGlass"><path d="M198 70 H262 L254 186 H206 Z"/></clipPath></defs>' +
        '<g class="sl-glass"><g clip-path="url(#slGlass)"><rect x="190" y="70" width="80" height="130" fill="#DFF1FD"/>' +
        '<path class="sl-water" d="M180 140 Q196 130 212 140 T244 140 T276 140 T308 140 V210 H180 Z" fill="#1E8FE1"/></g>' +
        '<path d="M198 70 H262 L254 186 H206 Z" fill="none" stroke="#fff" stroke-width="5" stroke-linejoin="round"/>' +
        '<circle class="sl-bub b1" cx="222" cy="170" r="4" fill="#fff" opacity=".7"/><circle class="sl-bub b2" cx="240" cy="176" r="3" fill="#fff" opacity=".7"/></g></svg>' },
      { title: 'Mimi cheers you on', text: 'She celebrates every win, and plays with you too.', art:
        '<div class="sl-mimi mw-figure">' + (window.MimiArt ? window.MimiArt.cat('landing') : CAT) + '</div>' +
        '<div class="sl-confetti" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>' }
    ];

    var deck = el('div', 'ld-deck');
    deck.setAttribute('role', 'region');
    deck.setAttribute('aria-roledescription', 'carousel');
    deck.setAttribute('aria-label', 'What Mimi Checklist does');
    var slides = SLIDES.map(function (sd, i) {
      var sl = el('div', 'ld-slide' + (i === 0 ? ' on' : ''));
      sl.setAttribute('role', 'group');
      sl.setAttribute('aria-roledescription', 'slide');
      sl.setAttribute('aria-label', (i + 1) + ' of ' + SLIDES.length + ': ' + sd.title);
      var art = el('div', 'ld-art', sd.art);
      var h = el('h2', 'ld-stitle'); h.textContent = sd.title;
      var p = el('p', 'ld-stext'); p.textContent = sd.text;
      sl.append(art, h, p);
      deck.appendChild(sl);
      return sl;
    });
    var dots = el('div', 'ld-pager');
    var dotEls = SLIDES.map(function (sd, i) {
      var d = el('button', i === 0 ? 'on' : '');
      d.type = 'button';
      d.setAttribute('aria-label', 'Show slide ' + (i + 1) + ': ' + sd.title);
      d.addEventListener('click', function () { go(i, true); });
      dots.appendChild(d);
      return d;
    });
    root.appendChild(deck);
    root.appendChild(dots);

    var cur = 0, autoT = 0;
    function go(i, byUser) {
      i = (i + SLIDES.length) % SLIDES.length;
      if (i === cur) { if (byUser) auto(9000); return; } // you're looking at it: hold still a while
      var dir = i > cur ? 1 : -1;
      slides[cur].classList.remove('on'); slides[cur].classList.add(dir > 0 ? 'off-l' : 'off-r');
      var old = slides[cur];
      setTimeout(function () { old.classList.remove('off-l', 'off-r'); }, 600);
      slides[i].classList.remove('off-l', 'off-r');
      slides[i].style.setProperty('--from', dir > 0 ? '60px' : '-60px');
      slides[i].classList.add('on');
      dotEls[cur].classList.remove('on'); dotEls[i].classList.add('on');
      cur = i;
      if (byUser) auto(9000); else auto();
    }
    function auto(delay) { clearTimeout(autoT); autoT = setTimeout(function () { if (root) go(cur + 1); }, delay || 3800); }
    auto();
    var sx = null;
    deck.addEventListener('pointerdown', function (e) { sx = e.clientX; });
    deck.addEventListener('pointerup', function (e) { if (sx == null) return; var dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 40) go(cur + (dx < 0 ? 1 : -1), true); });

    var copy = el('div', 'ld-copy');

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
    var start = el('button', 'ld-btn ld-start', 'Continue as guest');
    start.type = 'button';
    start.style.animationDelay = delay + 's';
    start.addEventListener('click', function () { finish(false); });
    actions.appendChild(start);
    var guestNote = el('p', 'ld-guest', 'Guest: your checklist is saved on this device only.');
    guestNote.style.animationDelay = (delay + .05) + 's';
    var restore = el('button', 'ld-link', 'I have a backup file');
    restore.type = 'button';
    restore.style.animationDelay = (delay + .1) + 's';
    restore.addEventListener('click', restoreBackup);
    actions.appendChild(restore);
    copy.appendChild(actions);
    copy.appendChild(guestNote);

    statusEl = el('div', 'ld-status');
    statusEl.setAttribute('aria-live', 'polite');
    copy.appendChild(statusEl);
    copy.appendChild(el('p', 'ld-foot', LOCK + (sync ? '<span>Signing in encrypts your data with your own password before it reaches Google Drive.</span>'
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
      try { var t = document.getElementById('toast'); if (t) { t.textContent = 'Welcome, guest! Your checklist is saved on this device.'; t.classList.remove('err'); t.classList.add('show'); setTimeout(function () { t.classList.remove('show'); }, 2800); } } catch (e) {}
    }
  }

  // Settings › "Show welcome page": the only way back to it on the iPhone, where you can't add ?welcome to the address.
  (function () {
    var body = document.querySelector('#ssheet .sbody');
    if (!body) return;
    var grp = el('div', 'sgrp');
    grp.id = 'sWelcomeGrp';
    var b = el('button', 'srow link', '');
    b.type = 'button';
    var sp = el('span', '', 'Show welcome page');
    var sm = el('small', 'ssub', 'Sign in with Google or continue as a guest');
    sp.appendChild(sm);
    b.appendChild(sp);
    b.appendChild(document.createElement('b'));
    b.addEventListener('click', function () {
      if (root) return;
      var closeBtn = document.getElementById('sClose');
      if (closeBtn) closeBtn.click();
      show();
    });
    grp.appendChild(b);
    var acct = document.getElementById('sAccountGrp');
    if (acct && acct.nextSibling) body.insertBefore(grp, acct.nextSibling); else body.insertBefore(grp, body.firstElementChild);
  })();
})();
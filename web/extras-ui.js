/*
 * Extra screens:
 *  - Profile › Account: who you're signed in as, Sign out / Sign in with Google (iPhone app).
 *  - Settings › Mimi › “Make Mimi sound more natural” (iPhone app): how to download a better iOS voice.
 *  - Settings › Upcoming release: what's coming next (smart reminders, AI features).
 */
(function () {
  'use strict';
  var sync = window.mimiSync || { available: false };
  var G = '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.2l7.9 6.2C12.5 13.6 17.8 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 7l7.4 5.8c4.3-4 6.9-9.9 6.9-17.3z"/><path fill="#FBBC05" d="M10.6 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6l-7.9-6.2A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l8-6.2z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.8c-2.1 1.4-4.8 2.3-8.5 2.3-6.2 0-11.5-4.1-13.4-9.8l-8 6.2C6.6 42.6 14.6 48 24 48z"/></svg>';

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  /* ---------- Profile › Account ---------- */
  var pbody = document.querySelector('#psheet .pbody');
  if (pbody) {
    var card = el('div', 'acct-card');
    card.setAttribute('aria-live', 'polite');
    pbody.appendChild(card);

    var paintCard = function (s) {
      card.textContent = '';
      var h = el('div', 'acct-h', 'Account');
      card.appendChild(h);
      var line = el('div', 'acct-line');
      var icon = el('span', 'acct-ic');
      var txt = el('div', 'acct-tx');
      line.append(icon, txt);
      card.appendChild(line);
      var actions = el('div', 'acct-actions');
      card.appendChild(actions);

      if (!sync.available) {
        icon.textContent = '💾';
        txt.append(el('b', '', 'Saved on this device'), el('span', '', 'Use Settings › Backup to keep a copy. Google sync is in the iPhone app.'));
        return;
      }
      if (!s || !s.signedIn) {
        icon.innerHTML = G;
        txt.append(el('b', '', 'Not signed in'), el('span', '', s && s.configured === false
          ? 'Google sign-in isn’t set up in this build yet. Your checklist is saved on this iPhone.'
          : 'Sign in to sync your checklist, encrypted, between your devices.'));
        if (!s || s.configured !== false) {
          var si = el('button', 'vbtn acct-google');
          si.type = 'button';
          si.innerHTML = G + '<span>Sign in with Google</span>';
          si.addEventListener('click', function () { sync.act('signIn'); });
          actions.appendChild(si);
        }
        return;
      }
      icon.textContent = (s.name || s.email || '?').trim().charAt(0).toUpperCase();
      icon.classList.add('letter');
      txt.append(el('b', '', s.name || 'Signed in'), el('span', '', s.email || 'Google account'));
      var state = el('div', 'acct-state ' + (s.phase || ''),
        s.phase === 'ok' ? '● Synced' : s.phase === 'syncing' ? '● Syncing…' : s.phase === 'locked' ? '● Locked — enter your sync password' : s.phase === 'error' ? '● ' + (s.message || 'Sync stopped') : '');
      txt.appendChild(state);
      if (s.phase === 'locked') {
        var un = el('button', 'vbtn', 'Enter sync password');
        un.type = 'button';
        un.addEventListener('click', function () { sync.act('unlock'); });
        actions.appendChild(un);
      } else {
        var sn = el('button', 'vbtn', 'Sync now');
        sn.type = 'button';
        sn.addEventListener('click', function () { sync.act('syncNow'); });
        actions.appendChild(sn);
      }
      var so = el('button', 'vbtn red', 'Sign out');
      so.type = 'button';
      so.addEventListener('click', function () {
        if (confirm('Sign out of Google?\n\nSync stops. Your checklist stays on this iPhone.')) sync.act('signOut');
      });
      actions.appendChild(so);
    };
    paintCard(sync.status);
    window.addEventListener('mimi-sync-status', function (e) { paintCard(e.detail); });
  }

  /* ---------- Settings ---------- */
  var sbody = document.querySelector('#ssheet .sbody');
  if (!sbody) return;

  function row(label, sub, right, onClick) {
    var r = el(onClick ? 'button' : 'div', 'srow' + (onClick ? ' link' : ''));
    if (onClick) { r.type = 'button'; r.addEventListener('click', onClick); }
    var s = el('span', '', label);
    if (sub) s.appendChild(el('small', 'ssub', sub));
    r.appendChild(s);
    if (right) r.appendChild(right);
    else if (onClick) r.appendChild(el('b'));
    return r;
  }

  // A natural voice for Mimi (iPhone app).
  var N = window.mimiNative;
  var voiceRow = document.getElementById('sStyle');
  // Voice styles (Airy, Buttery…) are Claude's voices and only exist on claude.ai.
  if (voiceRow && window.claude && window.claude.local && voiceRow.closest('.srow')) voiceRow.closest('.srow').hidden = true;
  if (N && typeof N.speak === 'function') {
    var mimiGrp = voiceRow ? voiceRow.closest('.sgrp') : null;
    if (mimiGrp) {
      mimiGrp.appendChild(row('Make Mimi sound more natural', 'Download a better iPhone voice', null, function () {
        alert('Make Mimi sound like a person:\n\n1. Open the iPhone Settings app.\n2. Accessibility › Spoken Content › Voices.\n3. Choose your language (e.g. English › English (India), or Tamil).\n4. Download a voice marked “Enhanced” or “Premium” (e.g. Isha, Rishi, or Vani for Tamil).\n\nMimi picks the best voice you have automatically.');
      }));
    }
  }

  // Voice input is in Upcoming release for now: hide its switches.
  if (window.MIMI_VOICE_INPUT === false) {
    ['sWake', 'sFab'].forEach(function (id) { var x = document.getElementById(id); if (x && x.closest('.srow')) x.closest('.srow').hidden = true; });
    var fab = document.getElementById('talkFab'); if (fab) fab.hidden = true;
  }
})();

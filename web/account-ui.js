/*
 * Settings › Account & sync (iPhone app only): sign in with Google and keep the checklist synced,
 * encrypted with your sync password, through Google Drive.
 *
 * The app does the work (SyncEngine.swift); this page asks with mimiNative.account(action) and hears back
 * through window.__mimiSyncStatus(status), which is also re-sent as a 'mimi-sync-status' event for
 * the welcome page.
 */
(function () {
  'use strict';
  var N = window.mimiNative;
  var available = !!(N && typeof N.account === 'function');
  window.mimiSync = { available: available, status: null, act: function (a) { if (available) N.account(a); } };

  window.__mimiSyncStatus = function (s) {
    if (!s || typeof s !== 'object') return;
    window.mimiSync.status = s;
    paint(s);
    try { window.dispatchEvent(new CustomEvent('mimi-sync-status', { detail: s })); } catch (e) {}
  };

  var body = document.querySelector('#ssheet .sbody');
  if (!available || !body) return;

  var grp = document.createElement('div');
  grp.className = 'sgrp';
  grp.id = 'sAccountGrp';
  var h = document.createElement('h4');
  h.textContent = 'Account & sync';
  grp.appendChild(h);
  var rows = document.createElement('div');
  grp.appendChild(rows);
  // First in Settings, so signing in and out is easy to find.
  body.insertBefore(grp, body.firstElementChild);

  function row(label, sub, onClick, cls) {
    var b = document.createElement(onClick ? 'button' : 'div');
    if (onClick) { b.type = 'button'; b.addEventListener('click', onClick); }
    b.className = 'srow' + (onClick ? ' link' : '') + (cls ? ' ' + cls : '');
    var s = document.createElement('span');
    s.textContent = label;
    if (sub) { var sm = document.createElement('small'); sm.className = 'ssub'; sm.textContent = sub; s.appendChild(sm); }
    b.appendChild(s);
    if (onClick) b.appendChild(document.createElement('b'));
    rows.appendChild(b);
    return b;
  }

  function ago(ms) {
    if (!ms) return 'not yet';
    var s = Math.max(0, (Date.now() - ms) / 1000);
    if (s < 50) return 'just now';
    if (s < 3600) return Math.round(s / 60) + ' min ago';
    if (s < 86400) return Math.round(s / 3600) + ' hr ago';
    return new Date(ms).toLocaleDateString();
  }

  function paint(s) {
    if (!rows) return;
    rows.textContent = '';
    if (!s.configured) {
      row('Google sync isn’t set up in this build', 'Add your Google client ID (see ios/README.md), then build the app again.');
      return;
    }
    if (!s.signedIn) {
      row('Sign in with Google', s.message || 'Sync your checklist between devices. It’s encrypted with your own password first.',
        function () { N.account('signIn'); });
      return;
    }
    var who = s.email || s.name || 'your Google account';
    var state = {
      ok: 'Synced ' + ago(s.lastSync),
      syncing: s.message || 'Syncing…',
      locked: s.message || 'Locked: enter your sync password',
      error: s.message || 'Sync stopped',
      off: s.message || 'Off'
    }[s.phase] || '';
    var top = row('Signed in as ' + who, state, null, 'acct');
    if (s.phase === 'error') top.classList.add('warn');
    if (s.phase === 'locked') row('Enter sync password', 'Unlocks your synced checklist on this iPhone.', function () { N.account('unlock'); });
    else row('Sync now', 'Changes also sync on their own.', function () { N.account('syncNow'); });
    row('Sign out', 'Your checklist stays on this iPhone.', function () {
      if (confirm('Sign out of Google?\n\nSync stops. Everything stays on this iPhone.')) N.account('signOut');
    }, 'danger');
  }

  paint({ configured: true, signedIn: false, message: '' });
  N.account('status');
  // Keep "Synced … ago" fresh while Settings is open.
  setInterval(function () { if (window.mimiSync.status && document.getElementById('ssheet').classList.contains('open')) paint(window.mimiSync.status); }, 30000);
})();

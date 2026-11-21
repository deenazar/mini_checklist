/*
 * Android app bridge. The Android app (android/) adds a `MimiAndroid` object to the page before it loads; this file
 * turns it into the same `window.mimiNative` the iPhone app provides, so the rest of the page works unchanged:
 *   schedule (reminder notifications), copy, haptic (and navigator.vibrate), share (backup files), activity (an
 *   ongoing "Focusing" notification with a live countdown), speak / stopSpeaking (Mimi's voice), dailyPlan,
 *   notifStatus / openNotifSettings. Google sign-in and sync (`account`) and widgets are iPhone-only for now.
 * In a browser or on the iPhone there is no MimiAndroid, and this file does nothing.
 */
(function () {
  'use strict';
  var A = window.MimiAndroid;
  if (!A || window.mimiNative) return;
  var html = document.documentElement;
  html.classList.add('android', 'in-app');
  function call(fn) { try { return fn(); } catch (e) { return undefined; } }

  window.mimiNative = {
    schedule: function (list) { call(function () { A.schedule(JSON.stringify(Array.isArray(list) ? list.slice(0, 60) : [])); }); },
    copy: function (text) { call(function () { A.copy(String(text || '').slice(0, 4000)); }); },
    haptic: function (kind) { call(function () { A.haptic(String(kind || 'light')); }); },
    share: function (name, text) { call(function () { A.share(String(name || 'mimi-checklist-backup.json').slice(0, 120), String(text || '')); }); },
    activity: function (state) { call(function () { A.activity(JSON.stringify(state && typeof state === 'object' ? state : { state: 'end' })); }); },
    speak: function (text, lang) { call(function () { A.speak(String(text || '').slice(0, 1200), String(lang || 'en-IN')); }); },
    stopSpeaking: function () { call(function () { A.stopSpeaking(); }); },
    widgets: function () {},
    ready: function () { call(function () { A.ready(); }); },
    dailyPlan: function (on, time) { call(function () { A.dailyPlan(!!on, String(time || '08:00')); }); },
    notifStatus: function () { call(function () { A.notifStatus(); }); },
    openNotifSettings: function () { call(function () { A.openNotifSettings(); }); }
  };
  try {
    navigator.vibrate = function (p) {
      var total = Array.isArray(p) ? p.reduce(function (a, b) { return a + (+b || 0); }, 0) : (+p || 0);
      window.mimiNative.haptic(total >= 600 ? 'alarm' : total >= 300 ? 'warning' : 'light');
      return true;
    };
  } catch (e) {}

  // Android words for the few iPhone-specific labels.
  document.addEventListener('DOMContentLoaded', function () {
    var sw = document.getElementById('sFeatIsland'), row = sw && sw.closest('.srow'), sp = row && row.querySelector('span');
    if (sp) {
      sp.firstChild.nodeValue = 'Timer notification';
      var sm = sp.querySelector('small'); if (sm) sm.textContent = 'Your running timer as a notification, counting down';
      sw.setAttribute('aria-label', 'Timer notification');
    }
  });
})();

/*
 * Settings › Upcoming release: four cards, each opening an intro screen with an illustration.
 * window.mimiSoon.open(id) also opens one (e.g. Siri's “Talk to Mimi” while voice chat is on the way).
 */
(function () {
  'use strict';

  // Small vector illustrations (320×240), animated with CSS (upcoming.css).
  var ART = {
    passwords:
      '<svg viewBox="0 0 320 240" aria-hidden="true">' +
      '<circle cx="160" cy="122" r="86" fill="#fff" opacity=".45"/>' +
      '<g class="s-f1"><path d="M160 34 L222 58 V112 C222 154 196 184 160 198 C124 184 98 154 98 112 V58 Z" fill="#2CC4BE" stroke="#2A2420" stroke-width="4" stroke-linejoin="round"/>' +
      '<path d="M160 52 L206 70 V112 C206 144 188 168 160 180" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".45"/>' +
      '<rect x="134" y="104" width="52" height="42" rx="10" fill="#FFC24D" stroke="#2A2420" stroke-width="4"/>' +
      '<path d="M144 104 V92 a16 16 0 0 1 32 0 V104" fill="none" stroke="#2A2420" stroke-width="5"/>' +
      '<circle cx="160" cy="122" r="5" fill="#2A2420"/><path d="M160 126 V134" stroke="#2A2420" stroke-width="4" stroke-linecap="round"/></g>' +
      '<g class="s-f2"><rect x="214" y="150" width="96" height="34" rx="12" fill="#fff" stroke="#2A2420" stroke-width="3"/>' +
      '<g fill="#2A2420"><circle cx="232" cy="167" r="4"/><circle cx="246" cy="167" r="4"/><circle cx="260" cy="167" r="4"/><circle cx="274" cy="167" r="4"/><circle cx="288" cy="167" r="4"/></g></g>' +
      '<g class="s-f3"><circle cx="58" cy="76" r="18" fill="#FF6B4A" stroke="#2A2420" stroke-width="3.5"/><path d="M72 88 L104 120 M92 108 L100 100 M98 114 L106 106" stroke="#2A2420" stroke-width="5" stroke-linecap="round"/><circle cx="58" cy="76" r="6" fill="#fff"/></g>' +
      '<g class="s-tw" fill="#8B5CF6"><path d="M250 50l3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/><path d="M60 180l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/></g></svg>',
    reminders:
      '<svg viewBox="0 0 320 240" aria-hidden="true">' +
      '<circle cx="160" cy="122" r="86" fill="#fff" opacity=".45"/><circle cx="160" cy="122" r="62" fill="#fff" opacity=".5"/>' +
      '<g class="s-f1"><rect x="18" y="52" width="104" height="40" rx="12" fill="#fff"/><circle cx="38" cy="72" r="8" fill="#FF6B4A"/><rect x="52" y="64" width="56" height="6" rx="3" fill="#2A2420" opacity=".75"/><rect x="52" y="76" width="38" height="5" rx="2.5" fill="#2A2420" opacity=".3"/></g>' +
      '<g class="s-f2"><rect x="206" y="150" width="100" height="40" rx="12" fill="#fff"/><circle cx="226" cy="170" r="8" fill="#2CC4BE"/><rect x="240" y="162" width="52" height="6" rx="3" fill="#2A2420" opacity=".75"/><rect x="240" y="174" width="32" height="5" rx="2.5" fill="#2A2420" opacity=".3"/></g>' +
      '<g class="s-bell"><path d="M160 58c-26 0-42 20-42 46v26l-12 16h108l-12-16v-26c0-26-16-46-42-46z" fill="#FFC24D" stroke="#2A2420" stroke-width="4" stroke-linejoin="round"/>' +
      '<path d="M146 152a14 14 0 0 0 28 0" fill="#FF9F6E" stroke="#2A2420" stroke-width="4"/><circle cx="160" cy="52" r="7" fill="#FFC24D" stroke="#2A2420" stroke-width="4"/>' +
      '<path d="M136 92q6-14 20-18" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".7"/></g>' +
      '<g class="s-f3"><circle cx="212" cy="88" r="22" fill="#2CC4BE" stroke="#2A2420" stroke-width="4"/><path d="M212 76v12l8 6" stroke="#fff" stroke-width="4" stroke-linecap="round" fill="none"/></g>' +
      '<g class="s-tw" fill="#FF6B4A"><path d="M96 150l3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/><path d="M250 54l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/></g></svg>',
    ai:
      '<svg viewBox="0 0 320 240" aria-hidden="true">' +
      '<circle cx="150" cy="124" r="86" fill="#fff" opacity=".45"/>' +
      '<g class="s-f1"><rect x="62" y="56" width="120" height="136" rx="18" fill="#fff" stroke="#2A2420" stroke-width="4"/>' +
      '<rect x="80" y="78" width="16" height="16" rx="5" fill="#8ED85A"/><path d="M84 86l3 3 6-6" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/><rect x="104" y="82" width="60" height="7" rx="3.5" fill="#2A2420" opacity=".7"/>' +
      '<rect x="80" y="110" width="16" height="16" rx="5" fill="none" stroke="#8B5CF6" stroke-width="3"/><rect x="104" y="114" width="48" height="7" rx="3.5" fill="#2A2420" opacity=".35"/>' +
      '<rect x="80" y="142" width="16" height="16" rx="5" fill="none" stroke="#2CC4BE" stroke-width="3"/><rect x="104" y="146" width="56" height="7" rx="3.5" fill="#2A2420" opacity=".35"/></g>' +
      '<path class="s-dash" d="M182 118 C 210 118 214 86 236 86 M182 118 C 210 118 214 150 236 150" fill="none" stroke="#8B5CF6" stroke-width="3" stroke-dasharray="6 6" stroke-linecap="round"/>' +
      '<g class="s-f2"><rect x="236" y="72" width="70" height="28" rx="14" fill="#B59CFF"/><rect x="250" y="83" width="42" height="6" rx="3" fill="#fff"/></g>' +
      '<g class="s-f3"><rect x="236" y="136" width="70" height="28" rx="14" fill="#2CC4BE"/><rect x="250" y="147" width="34" height="6" rx="3" fill="#fff"/></g>' +
      '<g class="s-wand"><path d="M196 46 L228 14" stroke="#2A2420" stroke-width="7" stroke-linecap="round"/><path d="M196 46 L210 32" stroke="#FFC24D" stroke-width="7" stroke-linecap="round"/>' +
      '<path d="M232 4l4 9 9 4-9 4-4 9-4-9-9-4 9-4z" fill="#FFC24D" stroke="#2A2420" stroke-width="2.5" stroke-linejoin="round"/></g>' +
      '<g class="s-tw" fill="#8B5CF6"><path d="M44 40l3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/><path d="M276 196l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/><path d="M196 202l2 4 4 2-4 2-2 4-2-4-4-2 4-2z"/></g></svg>',
    voice:
      '<svg viewBox="0 0 320 240" aria-hidden="true">' +
      '<g class="s-wave" fill="none" stroke="#2CC4BE" stroke-width="5" stroke-linecap="round">' +
      '<path class="w1" d="M104 92q-14 30 0 60"/><path class="w2" d="M80 76q-26 46 0 92"/><path class="w3" d="M56 60q-38 62 0 124"/>' +
      '<path class="w1" d="M216 92q14 30 0 60"/><path class="w2" d="M240 76q26 46 0 92"/><path class="w3" d="M264 60q38 62 0 124"/></g>' +
      '<g class="s-f1"><path d="M128 52 L134 22 L150 40 Z M192 52 L186 22 L170 40 Z" fill="#FFF3E6" stroke="#2A2420" stroke-width="4" stroke-linejoin="round"/>' +
      '<rect x="128" y="34" width="64" height="112" rx="32" fill="#FF6B4A" stroke="#2A2420" stroke-width="4"/>' +
      '<path d="M144 60h32M144 76h32M144 92h32" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".6"/>' +
      '<path d="M112 122a48 48 0 0 0 96 0" fill="none" stroke="#2A2420" stroke-width="5" stroke-linecap="round"/><path d="M160 170v26M136 198h48" stroke="#2A2420" stroke-width="5" stroke-linecap="round"/></g>' +
      '<g class="s-f2"><rect x="210" y="16" width="96" height="36" rx="18" fill="#fff" stroke="#2A2420" stroke-width="3"/><path d="M226 50l-6 12 16-10" fill="#fff" stroke="#2A2420" stroke-width="3" stroke-linejoin="round"/>' +
      '<text x="258" y="40" text-anchor="middle" font-family="DM Sans, system-ui" font-weight="700" font-size="14" fill="#2A2420">Hey Mimi!</text></g></svg>',
    voicechat:
      '<svg viewBox="0 0 320 240" aria-hidden="true">' +
      '<g class="s-f1"><rect x="24" y="40" width="170" height="70" rx="26" fill="#fff" stroke="#2A2420" stroke-width="4"/><path d="M60 108l-10 22 30-20" fill="#fff" stroke="#2A2420" stroke-width="4" stroke-linejoin="round"/>' +
      '<circle cx="62" cy="75" r="20" fill="#FFE2CF" stroke="#2A2420" stroke-width="3"/><path d="M48 62l2-12 8 8M76 62l-2-12-8 8" fill="#FFE2CF" stroke="#2A2420" stroke-width="3" stroke-linejoin="round"/>' +
      '<circle cx="55" cy="75" r="2.6" fill="#2A2420"/><circle cx="69" cy="75" r="2.6" fill="#2A2420"/><path d="M58 82q4 3 8 0" stroke="#2A2420" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      '<g class="s-bars" fill="#2CC4BE"><rect class="b1" x="96" y="66" width="7" height="18" rx="3.5"/><rect class="b2" x="108" y="58" width="7" height="34" rx="3.5"/><rect class="b3" x="120" y="62" width="7" height="26" rx="3.5"/><rect class="b1" x="132" y="54" width="7" height="42" rx="3.5"/><rect class="b2" x="144" y="64" width="7" height="22" rx="3.5"/><rect class="b3" x="156" y="60" width="7" height="30" rx="3.5"/><rect class="b1" x="168" y="68" width="7" height="14" rx="3.5"/></g></g>' +
      '<g class="s-f2"><rect x="126" y="134" width="170" height="64" rx="24" fill="#FF6B4A" stroke="#2A2420" stroke-width="4"/><path d="M262 196l10 20-28-18" fill="#FF6B4A" stroke="#2A2420" stroke-width="4" stroke-linejoin="round"/>' +
      '<g class="s-bars" fill="#fff"><rect class="b2" x="150" y="156" width="7" height="20" rx="3.5"/><rect class="b3" x="162" y="150" width="7" height="32" rx="3.5"/><rect class="b1" x="174" y="154" width="7" height="24" rx="3.5"/><rect class="b2" x="186" y="146" width="7" height="40" rx="3.5"/><rect class="b3" x="198" y="156" width="7" height="20" rx="3.5"/><rect class="b1" x="210" y="152" width="7" height="28" rx="3.5"/><rect class="b2" x="222" y="158" width="7" height="16" rx="3.5"/></g>' +
      '<circle cx="262" cy="166" r="14" fill="#fff" opacity=".9"/><path d="M257 160v12l10-6z" fill="#FF6B4A"/></g>' +
      '<g class="s-tw" fill="#FFC24D"><path d="M246 46l3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/><path d="M40 176l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/></g></svg>'
  };

  var FEATURES = [
    { id: 'reminders', title: 'Smart reminders', line: 'Snooze and finish from the notification',
      icon: '⏰', bg: 'linear-gradient(160deg,#FFE7D6,#FFD3E2)', accent: '#FF6B4A',
      about: 'Reminders that fit your day, not the other way around.',
      points: ['Snooze or mark a task done right from the notification', 'Repeat reminders: every day, weekdays, or your own pattern', 'A gentle morning heads-up with what’s planned today'] },
    { id: 'passwords', title: 'Password manager', line: 'Your logins, locked tight',
      icon: '🔐', bg: 'linear-gradient(160deg,#D8F5F3,#E4ECFF)', accent: '#0E9F9A',
      about: 'Keep your passwords safe with Mimi, locked with one master password.',
      points: ['Save logins and copy them with one tap', 'Encrypted on your iPhone before anything is stored', 'Strong password generator and a quick search'] },
    { id: 'ai', title: 'AI features', line: 'Mimi plans with you',
      icon: '✨', bg: 'linear-gradient(160deg,#ECE4FF,#D8F4F2)', accent: '#8B5CF6',
      about: 'Mimi gets smarter about your day, and helps you plan it.',
      points: ['Plans your day from your tasks, timers and energy', 'Breaks a big task into small, doable steps', 'Smart suggestions: what to do next, and when'] },
    { id: 'voice', title: 'Voice recognition', line: '“Hey Mimi”, hands-free',
      icon: '🎙️', bg: 'linear-gradient(160deg,#DCF0FF,#E6E2FF)', accent: '#2CC4BE',
      about: 'Say “Hey Mimi” and tell her what you need, no tapping.',
      points: ['Add tasks, log water and take notes by voice', 'Understands English, Tamil, Malayalam, Telugu and Hindi', 'Listens on your iPhone itself, private and battery-friendly'] },
    { id: 'voicechat', title: 'Voice chat with Mimi', line: 'Talk like you talk to a friend',
      icon: '💬', bg: 'linear-gradient(160deg,#DDF7E7,#FFF0D4)', accent: '#2E9E6A',
      about: 'A real back-and-forth conversation with Mimi about your day.',
      points: ['Natural, human-sounding replies in your language', 'Ask “What’s left today?” or “Move my study to tomorrow”', 'Mimi remembers the conversation while you talk'] }
  ];

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  // ---------- Intro screen ----------
  var screen = null, lastFocus = null;
  function open(id) {
    var f = FEATURES.filter(function (x) { return x.id === id; })[0];
    if (!f) return;
    close(true);
    lastFocus = document.activeElement;
    screen = el('section', 'soon');
    screen.setAttribute('role', 'dialog');
    screen.setAttribute('aria-modal', 'true');
    screen.setAttribute('aria-label', f.title + ', coming soon');
    screen.style.setProperty('--soon-accent', f.accent);

    var hero = el('div', 'soon-hero');
    hero.style.background = f.bg;
    hero.innerHTML = ART[f.id];
    var x = el('button', 'soon-x');
    x.type = 'button';
    x.setAttribute('aria-label', 'Close');
    x.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    x.addEventListener('click', function () { close(); });
    hero.appendChild(x);

    var body = el('div', 'soon-body');
    body.appendChild(el('span', 'soon-chip', 'Coming soon'));
    body.appendChild(el('h2', 'soon-title', f.title));
    body.appendChild(el('p', 'soon-about', f.about));
    var ul = el('ul', 'soon-points');
    f.points.forEach(function (p, i) {
      var li = el('li');
      li.style.animationDelay = (0.25 + i * 0.08) + 's';
      li.innerHTML = '<i><svg viewBox="0 0 16 16"><path d="M3.5 8.5l3 3 6-7"/></svg></i>';
      li.appendChild(el('span', '', p));
      ul.appendChild(li);
    });
    body.appendChild(ul);
    body.appendChild(el('p', 'soon-note', 'Arriving in a future update of Mimi Checklist.'));
    var ok = el('button', 'soon-ok', 'Got it');
    ok.type = 'button';
    ok.addEventListener('click', function () { close(); });
    body.appendChild(ok);

    screen.append(hero, body);
    document.body.appendChild(screen);
    requestAnimationFrame(function () { screen.classList.add('in'); });
    setTimeout(function () { try { ok.focus({ preventScroll: true }); } catch (e) {} }, 350);
    document.addEventListener('keydown', onKey);
  }

  function close(now) {
    if (!screen) return;
    var s = screen;
    screen = null;
    document.removeEventListener('keydown', onKey);
    if (now) { s.remove(); return; }
    s.classList.remove('in');
    s.classList.add('out');
    setTimeout(function () { s.remove(); }, 380);
    if (lastFocus && lastFocus.focus) try { lastFocus.focus({ preventScroll: true }); } catch (e) {}
  }

  function onKey(e) { if (e.key === 'Escape') close(); }

  window.mimiSoon = { open: open, features: FEATURES.map(function (f) { return f.id; }) };

  // ---------- Settings › Upcoming release ----------
  var sbody = document.querySelector('#ssheet .sbody');
  if (!sbody) return;
  var grp = el('div', 'sgrp upcoming2');
  grp.id = 'sUpcomingGrp';
  var head = el('div', 'up2-head');
  head.appendChild(el('h4', '', 'Upcoming release'));
  head.appendChild(el('p', '', 'What Mimi is learning next. Tap one to take a look.'));
  grp.appendChild(head);
  var grid = el('div', 'up2-grid');
  FEATURES.forEach(function (f, i) {
    var c = el('button', 'up2-card');
    c.type = 'button';
    c.style.background = f.bg;
    c.style.setProperty('--d', (i * 0.06) + 's');
    c.setAttribute('aria-label', f.title + ', coming soon. ' + f.line);
    var ic = el('span', 'up2-ic', f.icon);
    ic.setAttribute('aria-hidden', 'true');
    c.appendChild(ic);
    var tx = el('span', 'up2-tx');
    tx.appendChild(el('b', '', f.title));
    tx.appendChild(el('small', '', f.line));
    c.appendChild(tx);
    c.appendChild(el('i', 'up2-tag', 'Soon'));
    c.addEventListener('click', function () { open(f.id); });
    grid.appendChild(c);
  });
  grp.appendChild(grid);
  var note = sbody.querySelector(':scope > p.wnote');
  sbody.insertBefore(grp, note || null);
})();

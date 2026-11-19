/*
 * Mimi Checklist "Lilac" look (version 4): the new pieces on top of the existing app.
 *
 *  - Add a task: one big field with a "+" button; its options (list, priority, time, reminder, daily) open while you type.
 *  - Water: a little splash and "+250 ml" float up when you log a drink; the drop fills with the day's water.
 *  - Today's plan card at the top of the list: how the day is going, and one button for the next step.
 *  - A bottom bar: Today, Notes, Room, Insights, Settings (it hides while you type or a sheet is open).
 *  - Focus screen: the running task full screen, with Mimi, a ring, the time left, Pause/Resume and Done.
 *  - Day complete: when every task is ticked, Mimi celebrates with a trophy, confetti and your week.
 *
 * Everything works through the app's own buttons and window.mimiApp (app.js), so nothing about how the
 * checklist saves or syncs changes.
 */
(function () {
  'use strict';
  var A = window.mimiApp, Art = window.MimiArt;
  if (!A || !Art) return;
  var doc = document, html = doc.documentElement;
  html.classList.add('lilac');
  var $ = function (id) { return doc.getElementById(id); };
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function el(tag, cls, inner) { var e = doc.createElement(tag); if (cls) e.className = cls; if (inner != null) e.innerHTML = inner; return e; }
  function buzz(ms) { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function short(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
  function clock(ms) {
    var t = Math.max(0, Math.round(ms / 1000)), h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), s = t % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0');
  }
  function dur(ms) { var m = Math.round(ms / 60000); return m < 60 ? m + 'm' : Math.floor(m / 60) + 'h ' + (m % 60 ? (m % 60) + 'm' : ''); }
  function greet() {
    var h = new Date().getHours();
    return h < 5 ? 'Late night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 21 ? 'Good evening' : 'Good night';
  }
  var ICON = {
    home: '<svg viewBox="0 0 24 24"><path d="M4 11l8-6.5 8 6.5V20H4z"/><path d="M10 20v-5h4v5"/></svg>',
    notes: '<svg viewBox="0 0 24 24"><path d="M6 3h9l4 4v14H6z"/><path d="M9 12h7M9 16h5"/></svg>',
    room: '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-9.5A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7 2.5C19 15.6 12 20 12 20z"/></svg>',
    chart: '<svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
    gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/></svg>',
    arrow: '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><path d="M9 6v12M15 6v12"/></svg>',
    x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    bolt: '<svg viewBox="0 0 24 24"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8l-5.4 2.9 1.1-6.1L3.2 9.4l6.1-.8z"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
  };
  var TROPHY = '<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="ldGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFE08A"/><stop offset=".6" stop-color="#FFC24D"/><stop offset="1" stop-color="#E89A22"/></linearGradient></defs>' +
    '<path d="M14 6h36v12a18 18 0 0 1-36 0z" fill="url(#ldGold)"/><path d="M14 12H7a7 7 0 0 0 7 10M50 12h7a7 7 0 0 1-7 10" fill="none" stroke="#F2A93B" stroke-width="4" stroke-linecap="round"/>' +
    '<rect x="28" y="34" width="8" height="10" fill="#E8A030"/><rect x="18" y="43" width="28" height="9" rx="4" fill="url(#ldGold)"/>' +
    '<path d="M32 10l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" fill="#fff" opacity=".9"/><ellipse cx="21" cy="13" rx="3" ry="7" fill="#fff" opacity=".45"/></svg>';

  /* ---------- Keyboard and sheets: the bottom bar steps aside ---------- */
  var kbT = 0;
  doc.addEventListener('focusin', function (e) {
    var t = e.target;
    if (t && (t.tagName === 'TEXTAREA' || (t.tagName === 'INPUT' && !/^(range|checkbox|radio|button|submit|file)$/.test(t.type)))) { clearTimeout(kbT); html.classList.add('kb'); }
  });
  doc.addEventListener('focusout', function () { clearTimeout(kbT); kbT = setTimeout(function () {
    var a = doc.activeElement; if (!a || !(a.tagName === 'TEXTAREA' || a.tagName === 'INPUT')) html.classList.remove('kb'); }, 120); });
  var scrim = $('scrim');
  if (scrim && window.MutationObserver) new MutationObserver(function () { html.classList.toggle('sheet-open', scrim.classList.contains('open')); })
    .observe(scrim, { attributes: true, attributeFilter: ['class'] });

  /* ---------- Add a task ---------- */
  var form = $('addForm'), input = $('newTask');
  if (form && input) {
    var top = el('div', 'atop');
    input.parentNode.insertBefore(top, input);
    top.appendChild(input);
    var plus = el('button', 'aplus', ICON.plus);
    plus.type = 'button';
    plus.setAttribute('aria-label', 'Add task');
    top.appendChild(plus);
    input.placeholder = 'Add a task…';
    var openForm = function (on) { form.classList.toggle('open', on); };
    plus.addEventListener('click', function () {
      if (input.value.trim()) form.requestSubmit(); else { openForm(true); input.focus(); }
    });
    input.addEventListener('focus', function () { openForm(true); });
    input.addEventListener('input', function () { if (input.value) openForm(true); });
    form.addEventListener('focusout', function () {
      setTimeout(function () { if (!form.contains(doc.activeElement) && !input.value.trim() && $('remRow').hidden) openForm(false); }, 200);
    });
    form.addEventListener('submit', function () {
      setTimeout(function () { if (!input.value) { buzz(15); if (doc.activeElement !== input) openForm(false); } }, 60);
    });
  }

  /* ---------- Water ---------- */
  var wq = $('wQuick'), wMeter = $('wMeter'), wdrop = doc.querySelector('.wstrip .wdrop');
  function fillDrop() { if (wdrop && wMeter) wdrop.style.setProperty('--wfill', wMeter.style.width || '0%'); }
  if (wMeter && window.MutationObserver) new MutationObserver(fillDrop).observe(wMeter, { attributes: true, attributeFilter: ['style'] });
  fillDrop();
  function splash(x, y, label) {
    if (reduce) return;
    var b = el('div', 'wsplash');
    b.style.left = x + 'px'; b.style.top = y + 'px';
    for (var i = 0; i < 9; i++) {
      var d = el('i'), a = (-160 + i * 17.5) * Math.PI / 180, r = 34 + Math.random() * 24;
      d.style.setProperty('--x', (Math.cos(a) * r).toFixed(0) + 'px');
      d.style.setProperty('--y', (Math.sin(a) * r).toFixed(0) + 'px');
      b.appendChild(d);
    }
    doc.body.appendChild(b);
    setTimeout(function () { b.remove(); }, 800);
    if (label) {
      var p = el('div', 'wplus'); p.textContent = label; p.style.left = x + 'px'; p.style.top = y + 'px';
      doc.body.appendChild(p); setTimeout(function () { p.remove(); }, 1000);
    }
  }
  if (wq) wq.addEventListener('click', function () {
    var r = wq.getBoundingClientRect(), lbl = $('wQuickLbl');
    splash(r.left + r.width / 2, r.top + 4, '+' + (lbl ? lbl.textContent : ''));
    buzz(20);
  });
  doc.addEventListener('click', function (e) {
    var c = e.target.closest && e.target.closest('#wCups button');
    if (c) { var r = c.getBoundingClientRect(); splash(r.left + r.width / 2, r.top + r.height / 2, ''); buzz(20); }
  });

  /* ---------- Bottom bar ---------- */
  var nav = el('nav', 'lnav');
  nav.setAttribute('aria-label', 'Main');
  var navItems = [
    ['Today', 'home', '#B4A0FF', function () { A.goToday(); var sc = $('scroll'); if (sc) sc.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); }],
    ['Notes', 'notes', '#7FE3B8', function () { $('notesBtn') && $('notesBtn').click(); }],
    ['Room', 'room', '#FFB3C7', function () { $('roomBtn') && $('roomBtn').click(); }],
    ['Insights', 'chart', '#FF9A75', function () { $('insBtn') && $('insBtn').click(); }],
    ['Settings', 'gear', '#E9E4FF', function () { $('setBtn') && $('setBtn').click(); }]
  ];
  navItems.forEach(function (n, i) {
    if (n[1] === 'notes' && $('notesBtn') && $('notesBtn').hidden && !$('notesBtn').dataset.lilac) { /* notes may be turned off */ }
    var b = el('button', i === 0 ? 'on' : '', '<span class="ti" style="--c:' + n[2] + '">' + ICON[n[1]] + '</span>' + n[0]);
    b.type = 'button';
    b.dataset.k = n[1];
    if (i === 0) b.setAttribute('aria-current', 'page');
    b.addEventListener('click', function () { buzz(10); n[3](); });
    nav.appendChild(b);
  });
  doc.body.appendChild(nav);
  // Notes can be switched off in Settings: follow the header button.
  function syncNav() { var nb = $('notesBtn'), item = nav.querySelector('[data-k="notes"]'); if (nb && item) item.hidden = nb.hasAttribute('hidden'); }
  if ($('notesBtn') && window.MutationObserver) new MutationObserver(syncNav).observe($('notesBtn'), { attributes: true, attributeFilter: ['hidden'] });
  syncNav();
  if ($('setBtn')) $('setBtn').style.display = 'none';

  /* ---------- Today's plan card ---------- */
  var scroll = $('scroll'), list = $('list');
  var plan = el('section', 'lplan');
  plan.setAttribute('aria-live', 'polite');
  plan.innerHTML = '<div class="cap"></div><h3></h3><p></p><button class="go" type="button"></button><div class="pbar"><i></i></div><div class="art" aria-hidden="true"></div>';
  if (scroll && list) scroll.insertBefore(plan, list);
  // While the list scrolls, the header shrinks and app.js shifts the list to match; the card moves with it.
  if (list && window.MutationObserver) new MutationObserver(function () { plan.style.transform = list.style.transform; })
    .observe(list, { attributes: true, attributeFilter: ['style'] });
  var pCap = plan.querySelector('.cap'), pH = plan.querySelector('h3'), pP = plan.querySelector('p'), pGo = plan.querySelector('.go'), pBar = plan.querySelector('.pbar i'), pArt = plan.querySelector('.art');
  var planAction = null, planSig = '';
  function paintArt() { pArt.innerHTML = Art.cat('plan'); }
  paintArt();
  Art.onChange && Art.onChange(paintArt);
  function paintPlan() {
    var title = $('listTitle'), isToday = !title || title.textContent === 'Today';
    plan.hidden = !isToday;
    if (!isToday) return;
    var d = A.today(), r = A.running(), sig;
    if (!d.ready) { plan.hidden = true; return; }
    if (r) {
      var left = r.est ? r.est - r.elapsed : 0;
      sig = 'run' + r.id + Math.floor(r.elapsed / 30000);
      if (sig === planSig) { pP.textContent = r.est ? (left >= 0 ? clock(left) + ' left' : clock(-left) + ' over') : clock(r.elapsed) + ' so far'; return; }
      plan.classList.remove('all');
      pCap.textContent = 'Focusing now';
      pH.textContent = short(r.text, 46);
      pP.textContent = r.est ? (left >= 0 ? clock(left) + ' left' : clock(-left) + ' over') : clock(r.elapsed) + ' so far';
      pGo.innerHTML = 'Open focus ' + ICON.arrow;
      planAction = openFocus;
    } else if (!d.total) {
      // An empty day: the friendlier empty state below says it all.
      plan.hidden = true; planSig = 'none'; return;
    } else if (d.done >= d.total) {
      sig = 'all' + d.total;
      if (sig === planSig) return;
      plan.classList.add('all');
      pCap.textContent = greet() + ' · today’s plan';
      pH.textContent = 'All ' + d.total + ' done! 🎉';
      pP.textContent = 'Every box ticked. Mimi is proud of you.';
      pGo.innerHTML = 'See my day ' + ICON.arrow;
      planAction = openDone;
    } else {
      sig = 'some' + d.done + '/' + d.total + d.next;
      if (sig === planSig) return;
      plan.classList.remove('all');
      pCap.textContent = greet() + ' · today’s plan';
      pH.textContent = d.done + ' of ' + d.total + ' done. ' + (d.pct >= 60 ? 'Almost there.' : d.done ? 'Keep going.' : 'Let’s start.');
      pP.textContent = 'Next: ' + d.next;
      pGo.innerHTML = 'Start next task ' + ICON.play;
      planAction = function () { A.focusNext(); setTimeout(function () { if (A.running()) openFocus(); }, 250); };
    }
    planSig = sig;
    pBar.style.width = (d.total ? d.pct : 0) + '%';
  }
  pGo.addEventListener('click', function () { buzz(15); if (planAction) planAction(); });
  // The empty day: plush Mimi and one clear button instead of a wall of tips.
  function paintEmpty() {
    var e = list && list.querySelector('.empty'), art = e && e.querySelector('.empty-art');
    if (!e || !art || art.dataset.lilac) return;
    art.dataset.lilac = '1';
    art.innerHTML = '<div class="le-mimi">' + Art.cat('empty') + '</div>';
    var st = e.querySelector('strong'), p = e.querySelector('p');
    if (st && st.textContent === 'Nothing planned yet') {
      st.textContent = 'A fresh, empty day ✨';
      if (p) { p.textContent = 'Add your first task and Mimi will cheer you on. Tip: tap the ring to time it, swipe right to finish.'; }
      var b = el('button', 'le-go', 'Add your first task ' + ICON.plus);
      b.type = 'button';
      b.addEventListener('click', function () { buzz(15); if (input) { input.focus(); input.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' }); } });
      e.appendChild(b);
    }
  }
  paintEmpty();
  if (window.MutationObserver) {
    var mo = new MutationObserver(function () { paintPlan(); paintEmpty(); });
    [$('remain'), $('listTitle'), list].forEach(function (n) { if (n) mo.observe(n, { childList: true, characterData: true, subtree: n !== list }); });
  }
  setInterval(function () { if (!doc.hidden) paintPlan(); }, 1000);
  paintPlan();

  /* ---------- Focus screen ---------- */
  var fx = null, fxId = null, fxT = 0;
  function openFocus() {
    var r = A.running();
    if (!r || fx) return;
    fxId = r.id;
    fx = el('section', 'lfocus');
    fx.setAttribute('role', 'dialog');
    fx.setAttribute('aria-modal', 'true');
    fx.setAttribute('aria-label', 'Focus');
    var bars = '';
    [6, 10, 16, 24, 30, 22, 36, 28, 40, 30, 22, 34, 26, 18, 12, 20, 14, 10, 8, 6].forEach(function (h, i) { bars += '<i style="--h:' + h + 'px;--d:' + (i * 0.06).toFixed(2) + 's"></i>'; });
    fx.innerHTML =
      '<div class="lf-top"><button class="lx" type="button" aria-label="Close focus">' + ICON.x + '</button><div class="lf-prog"><i></i></div><span class="lf-fire"></span></div>' +
      '<div class="lcap" style="margin-top:22px"></div><h2 class="lf-h"></h2><p class="lf-sub">One small step at a time. Mimi’s got you.</p>' +
      '<div class="lf-stage"><div class="lf-ring"><svg viewBox="0 0 100 100"><circle class="t" cx="50" cy="50" r="46"/><circle class="f" cx="50" cy="50" r="46" pathLength="100"/></svg></div>' +
      '<div class="lf-mimi">' + Art.cat('focus') + '</div><span class="lf-z">z<small>z</small></span></div>' +
      '<div class="lf-card"><div class="lf-time">0:00</div><div class="lf-of"></div><div class="lf-wave">' + bars + '</div></div>' +
      '<button class="lbtn" type="button"></button><button class="llink" type="button">I’m done with this task</button>';
    doc.body.appendChild(fx);
    fx.querySelector('.lx').addEventListener('click', closeFocus);
    fx.querySelector('.lbtn').addEventListener('click', function () {
      buzz(20);
      var t = A.task(fxId);
      if (!t) return closeFocus();
      if (t.running) A.pause(); else A.resume(fxId);
      setTimeout(tickFocus, 80);
    });
    fx.querySelector('.llink').addEventListener('click', function () { buzz(30); var id = fxId; closeFocus(); A.finish(id); });
    doc.addEventListener('keydown', focusKey);
    requestAnimationFrame(function () { fx && fx.classList.add('in'); });
    tickFocus();
    fxT = setInterval(tickFocus, 1000);
  }
  function focusKey(e) { if (e.key === 'Escape') closeFocus(); }
  function tickFocus() {
    if (!fx) return;
    var t = A.task(fxId);
    if (!t || t.done) return closeFocus();
    var d = A.today(), est = t.est, el_ = t.elapsed, over = est && el_ > est;
    fx.classList.toggle('paused', !t.running);
    fx.classList.toggle('over', !!over);
    fx.querySelector('.lf-fire').textContent = '🔥 ' + A.streak();
    fx.querySelector('.lcap').textContent = 'Focus · task ' + Math.min(d.total, d.done + 1) + ' of ' + d.total;
    var h = fx.querySelector('.lf-h'); if (h.textContent !== t.text) h.textContent = t.text;
    var frac = est ? Math.min(1, el_ / est) : (el_ % 3600000) / 3600000;
    fx.querySelector('.lf-prog i').style.width = (frac * 100).toFixed(1) + '%';
    fx.querySelector('.lf-ring .f').style.strokeDashoffset = (100 - frac * 100).toFixed(1);
    fx.querySelector('.lf-time').textContent = est ? (over ? '+' + clock(el_ - est) : clock(est - el_)) : clock(el_);
    var ends = est && !over && t.running ? new Date(Date.now() + est - el_).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';
    fx.querySelector('.lf-of').textContent = !t.running ? 'Paused · tap Resume when you’re ready'
      : est ? (over ? 'Over your ' + dur(est) + ' plan. Wrap up when you can.' : 'of ' + dur(est) + ' · ends ' + ends) : 'No time planned · counting up';
    // Bars light up with the progress, like a little level meter.
    var bars = fx.querySelectorAll('.lf-wave i'), on = Math.round(frac * bars.length);
    for (var i = 0; i < bars.length; i++) bars[i].classList.toggle('on', i < Math.max(on, 1));
    fx.querySelector('.lbtn').innerHTML = t.running ? 'Pause ' + ICON.pause : 'Resume ' + ICON.play;
    fx.querySelector('.lf-sub').textContent = !t.running ? 'Taking a little break. Mimi’s napping too.' : over ? 'Time’s up! Finish strong or take a break.' : 'One small step at a time. Mimi’s got you.';
  }
  function closeFocus() {
    if (!fx) return;
    clearInterval(fxT);
    doc.removeEventListener('keydown', focusKey);
    var f = fx; fx = null; fxId = null;
    f.classList.remove('in');
    setTimeout(function () { f.remove(); }, 380);
  }
  // Tapping the running task's time also opens the focus screen.
  doc.addEventListener('click', function (e) {
    var tm = e.target.closest && e.target.closest('.meta .tm.run');
    if (tm) { e.preventDefault(); openFocus(); }
  });

  /* ---------- Day complete ---------- */
  var dn = null;
  function openDone() {
    if (dn) return;
    closeFocus();
    var d = A.today(), wk = A.week();
    dn = el('section', 'ldone');
    dn.setAttribute('role', 'dialog');
    dn.setAttribute('aria-modal', 'true');
    dn.setAttribute('aria-label', 'Day complete');
    var conf = '', cols = ['#B4A0FF', '#7FE3B8', '#FFC94D', '#FF7A59', '#FF8FB1'];
    if (!reduce) for (var i = 0; i < 22; i++) {
      conf += '<i style="--c:' + cols[i % 5] + ';--x:' + (Math.random() * 100).toFixed(0) + '%;--dx:' + ((Math.random() - .5) * 80).toFixed(0) + 'px;--r:' + (200 + Math.random() * 500).toFixed(0) +
        'deg;--t:' + (2.2 + Math.random() * 2).toFixed(2) + 's;--d:' + (-Math.random() * 3).toFixed(2) + 's"></i>';
    }
    var days = '';
    wk.forEach(function (w, i) {
      var ok = w.total > 0 && w.done >= w.total;
      days += '<div><span class="' + (w.today ? 'now' : ok ? 'ok' : '') + '" style="--d:' + (0.5 + i * 0.08).toFixed(2) + 's">' + (w.today ? '🔥' : ok ? ICON.check : '') + '</span>' + esc(w.label) + '</div>';
    });
    dn.innerHTML =
      '<div class="lc-top"><span class="lcap">Look at you go!</span><button class="lx" type="button" aria-label="Close">' + ICON.x + '</button></div>' +
      '<div class="lc-art"><div class="lc-conf" aria-hidden="true">' + conf + '</div><div class="lf-mimi">' + Art.cat('done') + '</div><div class="lc-trophy">' + TROPHY + '</div></div>' +
      '<h2 class="lc-big">' + d.done + ' of ' + d.total + '. All you.</h2>' +
      '<p class="lc-sub">Every box ticked. Tomorrow-you says thanks.</p>' +
      '<div class="lc-week"><div style="display:flex;justify-content:space-between"><b>A week of showing up</b><span>🔥 ' + A.streak() + '</span></div><div class="lc-days">' + days + '</div></div>' +
      '<div class="lc-kpis"><div><small>Focus today</small><b><i style="--c:#7FE3B8">' + ICON.bolt + '</i>' + (d.focusMs >= 60000 ? dur(d.focusMs) : '0m') + '</b></div>' +
      '<div><small>Done</small><b><i style="--c:#C2B0FF">' + ICON.star + '</i>' + d.pct + '%</b></div></div>' +
      '<div class="lc-push"></div>' +
      '<button class="lbtn" type="button">Plan tomorrow ' + ICON.arrow + '</button><button class="llink" type="button">Keep the good going</button>';
    doc.body.appendChild(dn);
    dn.querySelector('.lx').addEventListener('click', closeDone);
    dn.querySelector('.llink').addEventListener('click', closeDone);
    dn.querySelector('.lbtn').addEventListener('click', function () {
      closeDone();
      var t = doc.querySelector('.dchip.today'), nx = t && t.nextElementSibling;
      if (nx) nx.click();
      setTimeout(function () { input && input.focus(); }, 350);
    });
    doc.addEventListener('keydown', doneKey);
    requestAnimationFrame(function () { dn && dn.classList.add('in'); });
    buzz(60);
  }
  function doneKey(e) { if (e.key === 'Escape') closeDone(); }
  function closeDone() {
    if (!dn) return;
    doc.removeEventListener('keydown', doneKey);
    var x = dn; dn = null;
    x.classList.remove('in');
    setTimeout(function () { x.remove(); }, 380);
  }
  window.addEventListener('mimi-all-done', function () { setTimeout(openDone, 1100); });

  window.mimiLilac = { focus: openFocus, done: openDone, closeFocus: closeFocus, closeDone: closeDone };
})();

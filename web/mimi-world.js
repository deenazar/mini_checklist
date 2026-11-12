/*
 * Mimi's home header: an illustrated sky that follows the time of day in India, Mimi the cat with moods and
 * little reactions, finished tasks sparkling around her, a progress ring while a timer runs, and the week's
 * chart as tappable bars. Replaces the earlier 3D island; app.js uses the same small API:
 *
 *   say(text, ms)        speech bubble above Mimi
 *   react(kind, extra)   check, uncheck, add, del, play, pause, alarm, win, sad, hello, spin, flip
 *   setWeek(items)       [{v: 0..1, val, lab, sel, today, aria}] × 7
 *   setDone(n)           sparkles for today's finished tasks
 *   setTimer(frac, over) progress ring (null hides it)
 *   look(el), type(), focus(on)
 *   onPick(i), poke(), double()   set by app.js
 */
(function () {
  'use strict';

  var CAT = '' +
    '<svg class="mw-cat" viewBox="0 0 160 176" aria-hidden="true">' +
    '<defs><clipPath id="mwHead"><ellipse cx="80" cy="66" rx="48" ry="40"/></clipPath>' +
    '<radialGradient id="mwFur" cx="40%" cy="30%" r="80%"><stop offset="0" stop-color="#FFFDF9"/><stop offset="1" stop-color="#FFEBD8"/></radialGradient></defs>' +
    // tail
    '<g class="mw-tail"><path d="M116 146 C150 140 156 104 136 90" fill="none" stroke="#2A2420" stroke-width="17" stroke-linecap="round"/>' +
    '<path d="M116 146 C150 140 156 104 136 90" fill="none" stroke="url(#mwFur)" stroke-width="11" stroke-linecap="round"/>' +
    '<path d="M141 104 C146 96 142 92 136 90" fill="none" stroke="#FF9F6E" stroke-width="11" stroke-linecap="round"/></g>' +
    // body
    '<g class="mw-body"><ellipse cx="80" cy="130" rx="42" ry="36" fill="url(#mwFur)" stroke="#2A2420" stroke-width="3"/>' +
    '<ellipse cx="80" cy="138" rx="24" ry="20" fill="#FFFFFF"/>' +
    '<ellipse class="mw-paw l" cx="64" cy="162" rx="12" ry="8" fill="url(#mwFur)" stroke="#2A2420" stroke-width="3"/>' +
    '<g class="mw-wave"><ellipse cx="96" cy="162" rx="12" ry="8" fill="url(#mwFur)" stroke="#2A2420" stroke-width="3"/></g>' +
    '<path d="M54 106 Q80 120 106 106" fill="none" stroke="#FF6B4A" stroke-width="6" stroke-linecap="round"/>' +
    '<circle class="mw-bell" cx="80" cy="116" r="5.5" fill="#FFC24D" stroke="#2A2420" stroke-width="2"/></g>' +
    // head
    '<g class="mw-head">' +
    '<path d="M38 54 L44 12 L72 38 Z" fill="url(#mwFur)" stroke="#2A2420" stroke-width="3" stroke-linejoin="round" class="mw-ear l"/>' +
    '<path d="M46 44 L48 24 L63 38 Z" fill="#FFB8B8" class="mw-ear l"/>' +
    '<path d="M122 54 L116 12 L88 38 Z" fill="#FF9F6E" stroke="#2A2420" stroke-width="3" stroke-linejoin="round" class="mw-ear r"/>' +
    '<path d="M114 44 L112 24 L97 38 Z" fill="#FFB8B8" class="mw-ear r"/>' +
    '<ellipse cx="80" cy="66" rx="48" ry="40" fill="url(#mwFur)"/>' +
    '<g clip-path="url(#mwHead)"><path d="M94 22 Q130 28 132 70 Q116 52 96 46 Z" fill="#FF9F6E"/></g>' +
    '<ellipse cx="80" cy="66" rx="48" ry="40" fill="none" stroke="#2A2420" stroke-width="3"/>' +
    '<g class="mw-eyes-open"><g class="mw-look">' +
    '<ellipse cx="62" cy="68" rx="7.5" ry="9.5" fill="#2A2420"/><ellipse cx="98" cy="68" rx="7.5" ry="9.5" fill="#2A2420"/>' +
    '<circle cx="64.8" cy="64.2" r="2.8" fill="#fff"/><circle cx="100.8" cy="64.2" r="2.8" fill="#fff"/>' +
    '<circle cx="60" cy="72" r="1.2" fill="#fff" opacity=".7"/><circle cx="96" cy="72" r="1.2" fill="#fff" opacity=".7"/></g></g>' +
    '<g class="mw-eyes-happy" fill="none" stroke="#2A2420" stroke-width="4" stroke-linecap="round"><path d="M54 71 Q62 60 70 71"/><path d="M90 71 Q98 60 106 71"/></g>' +
    '<g class="mw-eyes-sleep" fill="none" stroke="#2A2420" stroke-width="3.5" stroke-linecap="round"><path d="M54 69 Q62 75 70 69"/><path d="M90 69 Q98 75 106 69"/></g>' +
    '<g class="mw-brows" fill="none" stroke="#2A2420" stroke-width="3" stroke-linecap="round"><path d="M54 52 L68 57"/><path d="M106 52 L92 57"/></g>' +
    '<circle cx="49" cy="82" r="7.5" fill="#FF8FA8" opacity=".45"/><circle cx="111" cy="82" r="7.5" fill="#FF8FA8" opacity=".45"/>' +
    '<path d="M76 79 L84 79 L80 84 Z" fill="#FF8FA8" stroke="#2A2420" stroke-width="1.5" stroke-linejoin="round"/>' +
    '<path class="mw-mouth-smile" d="M72 87 Q76 92 80 87 Q84 92 88 87" fill="none" stroke="#2A2420" stroke-width="2.5" stroke-linecap="round"/>' +
    '<path class="mw-mouth-open" d="M73 87 Q80 99 87 87 Z" fill="#E8556E" stroke="#2A2420" stroke-width="2.2" stroke-linejoin="round"/>' +
    '<path class="mw-mouth-sad" d="M73 91 Q80 84 87 91" fill="none" stroke="#2A2420" stroke-width="2.5" stroke-linecap="round"/>' +
    '<g stroke="#2A2420" stroke-width="2" stroke-linecap="round" opacity=".6"><path d="M38 80 L16 76"/><path d="M38 87 L17 90"/><path d="M122 80 L144 76"/><path d="M122 87 L143 90"/></g>' +
    '</g></svg>';

  var STAR = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 1.5l2.4 5.6 6.1.5-4.6 4 1.4 6-5.3-3.2-5.3 3.2 1.4-6-4.6-4 6.1-.5z"/></svg>';

  function TODAY_SHORT() {
    try { return new Intl.DateTimeFormat('en-IN', { weekday: 'short', timeZone: 'Asia/Kolkata' }).format(new Date()); }
    catch (e) { return 'Today'; }
  }

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  /** Mimi's artwork with its own SVG ids (so several copies on one page never clash). */
  // "Me as Mimi": the person's own face (a cartoon-styled photo) in Mimi's head, with her ears and whiskers.
  var ME_KEY = 'mimi-me', ME_ON = 'mimi-me-on';
  function meFace() {
    try { return localStorage.getItem(ME_ON) === '1' ? localStorage.getItem(ME_KEY) : null; } catch (e) { return null; }
  }
  function catSVG(id, face) {
    if (face === undefined) face = meFace();
    var s = CAT.replace(/mwHead/g, 'mwHead-' + id).replace(/mwFur/g, 'mwFur-' + id);
    if (!face || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(face)) return s;
    var photo = '<image class="mw-me-face" href="' + face + '" x="32" y="26" width="96" height="80" preserveAspectRatio="xMidYMid slice" clip-path="url(#mwHead-' + id + ')"/>';
    return s.replace('class="mw-cat"', 'class="mw-cat mw-me"')
      .replace('<g clip-path="url(#mwHead-' + id + ')">', photo + '<g class="mw-patch" clip-path="url(#mwHead-' + id + ')">');
  }
  var meListeners = [];
  window.MimiArt = {
    cat: catSVG,
    face: function () { try { return localStorage.getItem(ME_KEY); } catch (e) { return null; } },
    isMe: function () { return !!meFace(); },
    /** Save (or clear with null) the person's Mimi face and whether to use it, then redraw every Mimi. */
    setMe: function (dataUrl, on) {
      try {
        if (dataUrl === null) { localStorage.removeItem(ME_KEY); localStorage.removeItem(ME_ON); }
        else {
          if (dataUrl) localStorage.setItem(ME_KEY, dataUrl);
          localStorage.setItem(ME_ON, on ? '1' : '0');
        }
      } catch (e) {}
      meListeners.forEach(function (f) { try { f(); } catch (e) {} });
    },
    onChange: function (f) { meListeners.push(f); }
  };

  window.MimiWorld = function (opts) {
    var stage = opts.stage, bub = opts.bubble, B = opts.B || function () { return ''; };
    var reduce = !!opts.reduce;
    stage.classList.add('mw');

    // Sky: gradient, sun or moon, drifting clouds, stars at night.
    var sky = el('div', 'mw-sky');
    sky.setAttribute('aria-hidden', 'true');
    for (var c = 0; c < 3; c++) sky.appendChild(el('i', 'mw-cloud c' + (c + 1)));
    var stars = el('div', 'mw-stars');
    for (var s = 0; s < 14; s++) {
      var st = el('i');
      st.style.left = (4 + Math.random() * 92).toFixed(1) + '%';
      st.style.top = (4 + Math.random() * 60).toFixed(1) + '%';
      st.style.animationDelay = (Math.random() * 3).toFixed(2) + 's';
      stars.appendChild(st);
    }
    sky.appendChild(stars);
    sky.appendChild(el('i', 'mw-hill h1'));
    sky.appendChild(el('i', 'mw-hill h2'));
    stage.prepend(sky);

    // Mimi and the week chart.
    var scene = el('div', 'mw-scene');
    var mimi = el('button', 'mw-mimi');
    mimi.type = 'button';
    mimi.setAttribute("aria-label", "Mimi. Tap her head, belly, ears or tail, or stroke her. Double-tap for her dance.");
    var ring = el('div', 'mw-ring', '<svg viewBox="0 0 100 100" aria-hidden="true"><circle class="t" cx="50" cy="50" r="46"/><circle class="f" cx="50" cy="50" r="46" pathLength="100"/></svg>');
    var orbit = el('div', 'mw-orbit');
    var zz = el('span', 'mw-zz', '<i>z</i><i>z</i><i>z</i>');
    zz.setAttribute('aria-hidden', 'true');
    var shadow = el('i', 'mw-shadow');
    var figure = el('div', 'mw-figure', catSVG('header'));
    window.MimiArt.onChange(function () { figure.innerHTML = catSVG('header'); });
    var halo = el('i', 'mw-halo'); // the sun by day, the moon by night, behind Mimi
    mimi.append(halo, shadow, ring, orbit, figure, zz);
    var week = el('div', 'mw-week');
    week.setAttribute('role', 'group');
    week.setAttribute('aria-label', 'Your week');
    scene.append(mimi, week);
    stage.insertBefore(scene, stage.querySelector('.hud.top'));
    var bars = [];
    for (var b = 0; b < 7; b++) {
      (function (i) {
        var bt = el('button', 'mw-bar', '<b></b><span class="tr"><i></i></span><small></small>');
        bt.type = 'button';
        bt.style.setProperty('--d', (i * 0.05) + 's');
        bt.addEventListener('click', function () { if (api.onPick) api.onPick(i); });
        week.appendChild(bt);
        bars.push(bt);
      })(b);
    }

    // Time of day (India), refreshed every few minutes.
    function paintSky() {
      var h = opts.istHour ? opts.istHour() : new Date().getHours();
      var phase = h < 5 || h >= 20 ? 'night' : h < 7.5 ? 'dawn' : h < 17 ? 'day' : 'dusk';
      stage.classList.remove('sky-night', 'sky-dawn', 'sky-day', 'sky-dusk');
      stage.classList.add('sky-' + phase);
      sleepyHour = h >= 23 || h < 5;
      paintMood();
    }

    // ---------- Moods and reactions ----------
    var sleepyHour = false, awakeUntil = 0, focusOn = false, typingUntil = 0, mood = '', moodT = 0, animT = 0, talkT = 0;
    function wake() { awakeUntil = Date.now() + 25000; paintMood(); }
    function paintMood() {
      var sleepy = sleepyHour && Date.now() > awakeUntil && !focusOn && !mood;
      mimi.classList.toggle('is-sleepy', sleepy);
      mimi.classList.toggle('is-focus', focusOn);
      mimi.classList.toggle('is-typing', Date.now() < typingUntil);
      ['happy', 'sad'].forEach(function (m) { mimi.classList.toggle('is-' + m, mood === m); });
    }
    function setMood(m, ms) {
      mood = m;
      paintMood();
      clearTimeout(moodT);
      moodT = setTimeout(function () { mood = ''; paintMood(); }, ms || 1400);
    }
    function play(anim, ms) {
      if (reduce) return;
      figure.classList.remove('a-jump', 'a-hop', 'a-shake', 'a-nod', 'a-wave', 'a-dance', 'a-spin');
      void figure.offsetWidth;
      figure.classList.add('a-' + anim);
      clearTimeout(animT);
      animT = setTimeout(function () { figure.classList.remove('a-' + anim); }, ms || 900);
    }

    // Little bursts of stars where you tapped (finishing a task, a win).
    var lastTap = null;
    document.addEventListener('pointerdown', function (e) { lastTap = { x: e.clientX, y: e.clientY, t: Date.now() }; }, { passive: true, capture: true });
    function burst(x, y, n, colors) {
      if (reduce) return;
      var box = el('div', 'mw-burst');
      box.style.left = x + 'px';
      box.style.top = y + 'px';
      for (var i = 0; i < n; i++) {
        var p = el('i', '', STAR);
        var a = (i / n) * Math.PI * 2 + Math.random() * .5, r = 26 + Math.random() * 34;
        p.style.setProperty('--x', (Math.cos(a) * r).toFixed(0) + 'px');
        p.style.setProperty('--y', (Math.sin(a) * r).toFixed(0) + 'px');
        p.style.setProperty('--c', colors[i % colors.length]);
        box.appendChild(p);
      }
      document.body.appendChild(box);
      setTimeout(function () { box.remove(); }, 900);
    }
    var COLORS = ['#FF6B4A', '#2CC4BE', '#FFC24D', '#8ED85A', '#B59CFF'];

    // ---------- Speech bubble ----------
    var bubT = 0;
    function placeBubble() {
      // Beside Mimi's head, so it never covers the date.
      var sr = stage.getBoundingClientRect(), mr = figure.getBoundingClientRect();
      var x = Math.max(8, Math.min(sr.width - 210, mr.left - sr.left + mr.width * 0.78));
      var y = Math.max(8, mr.top - sr.top + mr.height * 0.02);
      bub.style.transform = 'translate(' + x.toFixed(0) + 'px,' + y.toFixed(0) + 'px)';
    }

    var api = {
      say: function (t, ms) {
        if (!t) return;
        active();
        bub.textContent = t;
        placeBubble();
        bub.classList.add('show');
        // Talking moves her mouth on top of whatever mood she's in.
        mimi.classList.add('is-talk');
        clearTimeout(talkT);
        talkT = setTimeout(function () { mimi.classList.remove('is-talk'); }, Math.min(ms || 2600, 1600));
        clearTimeout(bubT);
        bubT = setTimeout(function () { bub.classList.remove('show'); }, ms || 2600);
      },
      react: function (k, extra) {
        wake();
        active();
        var tap = lastTap && Date.now() - lastTap.t < 600 ? lastTap : null;
        if (k === 'check') { play('jump', 800); setMood('happy', 1500); api.say(B('check')); if (tap) burst(tap.x, tap.y, 9, COLORS); }
        else if (k === 'uncheck') { play('nod', 600); setMood('sad', 1000); api.say(B('uncheck')); }
        else if (k === 'add') { play('hop', 650); setMood('happy', 1200); api.say(B('add', extra || null)); }
        else if (k === 'del') { play('shake', 500); api.say(B('del')); }
        else if (k === 'play') { play('nod', 700); setMood('happy', 900); api.say(B('play', extra || null)); }
        else if (k === 'pause') { play('nod', 600); api.say(B('pause')); }
        else if (k === 'alarm') { play('shake', 1000); api.say(B('alarm'), 3500); }
        else if (k === 'win') {
          play('dance', 2000); setMood('happy', 2600); api.say(B('win'), 4000);
          var r = mimi.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, 16, COLORS);
        }
        else if (k === 'sad') { play('nod', 600); setMood('sad', 1200); }
        else if (k === 'hello') { play('wave', 1300); setMood('happy', 1300); }
        else if (k === 'spin') { play('spin', 900); }
        else if (k === 'flip') { play('dance', 2200); setMood('happy', 2400); }
      },
      setWeek: function (items) {
        items.forEach(function (it, i) {
          var bt = bars[i];
          if (!bt) return;
          bt.querySelector('b').textContent = it.val;
          // "Today" is too wide for a bar: show its weekday; the orange bar and dot mark it.
          bt.querySelector('small').textContent = it.today ? TODAY_SHORT() : it.lab;
          bt.querySelector('.tr i').style.height = (Math.max(0.06, Math.min(1, it.v || 0)) * 100).toFixed(1) + '%';
          bt.classList.toggle('is-today', !!it.today);
          bt.classList.toggle('is-sel', !!it.sel);
          bt.classList.toggle('is-empty', it.val === '–');
          bt.setAttribute('aria-label', it.aria);
          bt.setAttribute('aria-pressed', String(!!it.sel));
        });
      },
      setDone: function (n) {
        n = Math.max(0, Math.min(10, n | 0));
        while (orbit.children.length < n) {
          var k = orbit.children.length;
          var o = el('i', '', STAR);
          o.style.setProperty('--c', COLORS[k % COLORS.length]);
          o.style.setProperty('--a', (k * 36) + 'deg');
          o.style.setProperty('--r', (k % 2 ? 54 : 62) + '%');
          o.style.setProperty('--s', (9 + (k % 3) * 2.5) + 's');
          orbit.appendChild(o);
        }
        while (orbit.children.length > n) orbit.lastChild.remove();
      },
      setTimer: function (frac, over) {
        if (frac == null) { ring.classList.remove('on'); return; }
        ring.classList.add('on');
        ring.classList.toggle('over', !!over);
        ring.querySelector('.f').style.strokeDashoffset = (100 - Math.max(2, Math.min(100, frac * 100))).toFixed(1);
      },
      look: function (target) {
        if (!target) return;
        var r = target.getBoundingClientRect(), m = figure.getBoundingClientRect();
        var dx = (r.left + r.width / 2) - (m.left + m.width / 2), dy = (r.top + r.height / 2) - (m.top + m.height * 0.4);
        var d = Math.max(1, Math.hypot(dx, dy));
        figure.style.setProperty('--lx', (dx / d * 3.2).toFixed(2) + 'px');
        figure.style.setProperty('--ly', (dy / d * 3).toFixed(2) + 'px');
        clearTimeout(api._lookT);
        api._lookT = setTimeout(function () { figure.style.setProperty('--lx', '0px'); figure.style.setProperty('--ly', '0px'); }, 3500);
      },
      type: function () { wake(); typingUntil = Date.now() + 900; paintMood(); setTimeout(paintMood, 950); },
      focus: function (on) { if (focusOn !== !!on) { focusOn = !!on; paintMood(); } },
      onPick: null,
      poke: function () {},
      double: function () {}
    };

    // ---------- Touch: Mimi reacts to where you touch her ----------
    //  head → giggle · belly → ticklish laugh · tail → grumpy · ears → twitch · elsewhere → meow
    //  stroke her (drag across) → purrs with hearts · double-tap → her dance · lots of fast taps → dizzy
    var dizzyEl = el('div', 'mw-dizzy', '<i>⭐</i><i>💫</i><i>⭐</i>');
    dizzyEl.setAttribute('aria-hidden', 'true');
    mimi.appendChild(dizzyEl);
    var tone = opts.tone || function () {};
    var snd = {
      giggle: function () { [0, 0.09, 0.18, 0.27].forEach(function (d, i) { tone(900 + i * 140, 0.08, 'triangle', 0.06, d, 1300 + i * 140); }); },
      laugh: function () { [0, 0.11, 0.22, 0.33].forEach(function (d, i) { tone(760 + (i % 2) * 220, 0.09, 'sawtooth', 0.025, d, 980 + (i % 2) * 260); }); },
      grump: function () { tone(220, 0.35, 'sawtooth', 0.03, 0, 140); },
      mrrp: function () { tone(520, 0.12, 'sine', 0.07, 0, 820); },
      meow: function () { tone(680, 0.14, 'sine', 0.08, 0, 1080); tone(1020, 0.3, 'sine', 0.07, 0.13, 520); },
      purr: function () { tone(58, 0.32, 'triangle', 0.05, 0, 52); },
      dizzy: function () { [0, 0.12, 0.24, 0.36, 0.48].forEach(function (d, i) { tone(i % 2 ? 660 : 520, 0.1, 'sine', 0.05, d); }); }
    };
    function buzz(ms) { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} }
    function pickOne(a) { return a[Math.floor(Math.random() * a.length)]; }
    function heart(x, y, glyph) {
      if (reduce) return;
      var h = el('i', 'mw-heart', glyph);
      h.style.left = x + 'px';
      h.style.top = y + 'px';
      h.style.setProperty('--dx', ((Math.random() - 0.5) * 60).toFixed(0) + 'px');
      document.body.appendChild(h);
      setTimeout(function () { h.remove(); }, 1400);
    }
    function zoneAt(fx, fy) {
      if (fy < 0.31 && ((fx > 0.22 && fx < 0.46) || (fx > 0.54 && fx < 0.78))) return fx < 0.5 ? 'earL' : 'earR';
      if (fx > 0.70 && fy > 0.46 && fy < 0.88) return 'tail';
      if (fy < 0.6 && fx > 0.18 && fx < 0.82) return 'head';
      if (fy >= 0.6 && fx > 0.3 && fx < 0.7) return 'belly';
      return 'body';
    }
    function touchReact(zone, x, y) {
      wake(); active();
      if (zone === 'head') { play('hop', 650); setMood('happy', 1300); snd.giggle(); buzz(25); api.say(pickOne(['Hehe 😸', 'That’s nice!', 'More head pats!', 'Purr-fect 💕']), 1800); heart(x, y, '💕'); }
      else if (zone === 'belly') { play('jump', 800); setMood('happy', 1500); snd.laugh(); buzz(50); api.say(pickOne(['Hahaha! That tickles! 🤭', 'Not the tummy! 😹', 'Hehehe, stop! 😆']), 1800); heart(x, y, '✨'); }
      else if (zone === 'tail') { play('shake', 520); setMood('sad', 1500); snd.grump(); buzz(100); api.say(pickOne(['Hey! Not my tail! 😾', 'Hmph! 😤', 'That’s my tail!']), 1800); }
      else if (zone === 'earL' || zone === 'earR') {
        mimi.classList.remove('twitch-l', 'twitch-r'); void mimi.offsetWidth;
        mimi.classList.add(zone === 'earL' ? 'twitch-l' : 'twitch-r');
        setTimeout(function () { mimi.classList.remove('twitch-l', 'twitch-r'); }, 600);
        play('nod', 600); snd.mrrp(); buzz(20); api.say(pickOne(['Mrrp?', 'Hm? 👂', 'I heard that!']), 1600);
      } else { play('hop', 600); snd.meow(); buzz(20); api.say(pickOne(['Meow!', 'Mew? 🐾', 'Hi there!']), 1600); }
    }
    function dizzy() {
      play('spin', 1400); snd.dizzy(); buzz(300);
      mimi.classList.add('is-dizzy');
      setTimeout(function () { mimi.classList.remove('is-dizzy'); }, 2600);
      api.say('Whoa… so dizzy 😵‍💫', 2600);
    }

    var press = null, petting = false, petTick = 0, taps = [], lastTapAt = 0;
    function stopPetting(sayIt) {
      if (!petting) return;
      petting = false;
      mimi.classList.remove('is-purr');
      setMood('happy', 900);
      if (sayIt) api.say(pickOne(['I love that 💕', 'More pets please 🥰', 'Purr-fect!']), 2000);
    }
    mimi.addEventListener('pointerdown', function (e) {
      press = { x: e.clientX, y: e.clientY, t: Date.now(), dist: 0, lx: e.clientX, ly: e.clientY };
      try { mimi.setPointerCapture(e.pointerId); } catch (err) {}
    });
    mimi.addEventListener('pointermove', function (e) {
      if (!press) return;
      press.dist += Math.hypot(e.clientX - press.lx, e.clientY - press.ly);
      press.lx = e.clientX; press.ly = e.clientY;
      if (!petting && press.dist > 50 && Date.now() - press.t > 160) {
        petting = true; wake(); active();
        mimi.classList.add('is-purr');
        setMood('happy', 60000);
        api.say('Purrr… 💕', 2600);
      }
      if (petting && Date.now() - petTick > 300) {
        petTick = Date.now();
        heart(e.clientX, e.clientY, pickOne(['💕', '💗', '💖']));
        snd.purr(); buzz(12); active();
      }
    });
    mimi.addEventListener('pointerup', function (e) {
      var p = press; press = null;
      if (petting) { stopPetting(true); return; }
      if (!p || p.dist > 24) return;
      var now = Date.now();
      taps = taps.filter(function (t) { return now - t < 2500; });
      taps.push(now);
      if (taps.length >= 6) { taps = []; lastTapAt = 0; return dizzy(); }
      if (now - lastTapAt < 330) { lastTapAt = 0; return api.double(); }
      lastTapAt = now;
      var r = figure.getBoundingClientRect();
      touchReact(zoneAt((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height), e.clientX, e.clientY);
    });
    mimi.addEventListener('pointercancel', function () { press = null; stopPetting(false); });
    // Keyboard: Enter / Space pats her head.
    mimi.addEventListener('click', function (e) {
      if (e.detail !== 0) return; // pointer taps are handled above
      var r = figure.getBoundingClientRect();
      touchReact('head', r.left + r.width / 2, r.top + r.height * 0.3);
    });

    // Battery: rest the header's endless animations 15 s after the last touch; pause everything while hidden.
    var restT = 0;
    function active() {
      if (stage.classList.contains('mw-rest')) { stage.classList.remove('mw-rest'); document.documentElement.classList.remove('mw-rest'); }
      clearTimeout(restT);
      restT = setTimeout(function () { stage.classList.add('mw-rest'); document.documentElement.classList.add('mw-rest'); }, 15000);
    }
    ['pointerdown', 'keydown', 'wheel'].forEach(function (t) { document.addEventListener(t, active, { passive: true, capture: true }); });
    document.addEventListener('scroll', active, { passive: true, capture: true });
    document.addEventListener('visibilitychange', function () {
      document.documentElement.classList.toggle('mw-hidden', document.hidden);
      if (!document.hidden) { paintSky(); active(); }
    });
    active();

    paintSky();
    setInterval(function () { if (!document.hidden) paintSky(); }, 5 * 60 * 1000);
    setInterval(function () { if (!document.hidden) paintMood(); }, 30 * 1000);
    window.addEventListener('resize', function () { if (bub.classList.contains('show')) placeBubble(); });
    return api;
  };
})();

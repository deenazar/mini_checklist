/*
 * Mimi's room: play with Mimi, a little virtual pet (our own character and design).
 * Open it with the Room button at the top of the home screen (window.mimiRoom.open()).
 *
 *  Touch:   head → giggle · belly → ticklish laugh · tail → grumpy · ears → twitch · anywhere → meow
 *           stroke her (drag across her) → she purrs, hearts float up · poke her lots, fast → dizzy
 *  Buttons: Feed (a fish), Yarn (she bats a ball), Dance, My day (how your day is going),
 *           Me as Mimi (your own photo becomes a cartoon face in Mimi's body, also used on the home screen)
 *  A happiness meter fills as you play and slowly drains over the hours.
 */
(function () {
  'use strict';
  if (!window.MimiArt) return;

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = null, mimiEl = null, figure = null, bubble = null, fx = null, meterFill = null, meterTx = null, hint = null;
  var bubbleT = 0, moodT = 0, animT = 0;

  /* ---------- Happiness (saved on this device) ---------- */
  function loadHappy() {
    try {
      var x = JSON.parse(localStorage.getItem('mimi-happy') || 'null');
      if (x && typeof x.v === 'number') return Math.max(0, Math.min(100, x.v - ((Date.now() - x.t) / 3600000) * 4)); // −4 an hour
    } catch (e) {}
    return 50;
  }
  var happy = loadHappy();
  function addHappy(n) {
    happy = Math.max(0, Math.min(100, happy + n));
    try { localStorage.setItem('mimi-happy', JSON.stringify({ v: happy, t: Date.now() })); } catch (e) {}
    paintMeter(n > 0);
  }
  function paintMeter(pulse) {
    if (!meterFill) return;
    meterFill.style.width = happy.toFixed(0) + '%';
    meterTx.textContent = happy >= 85 ? 'Over the moon' : happy >= 60 ? 'Happy' : happy >= 35 ? 'Okay' : 'Wants to play';
    if (pulse && !reduce) { var m = meterFill.parentNode.parentNode; m.classList.remove('pulse'); void m.offsetWidth; m.classList.add('pulse'); }
  }

  /* ---------- Sound (follows the app's Sound effects setting) and haptics ---------- */
  var ac = null;
  function soundOn() { try { return localStorage.getItem('dc-sound') !== 'off'; } catch (e) { return true; } }
  function A() {
    if (!soundOn()) return null;
    try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); } catch (e) { return null; }
    return ac;
  }
  function tone(f, d, type, v, delay, to) {
    var a = A(); if (!a) return;
    var t = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v || 0.08, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + d + 0.03);
  }
  var sfx = {
    meow: function () { tone(680, 0.14, 'sine', 0.09, 0, 1080); tone(1020, 0.3, 'sine', 0.08, 0.13, 520); },
    giggle: function () { [0, 0.09, 0.18, 0.27].forEach(function (d, i) { tone(900 + i * 140, 0.08, 'triangle', 0.06, d, 1300 + i * 140); }); },
    laugh: function () { [0, 0.11, 0.22, 0.33, 0.44].forEach(function (d, i) { tone(760 + (i % 2) * 220, 0.09, 'sawtooth', 0.025, d, 980 + (i % 2) * 260); }); },
    grump: function () { tone(220, 0.35, 'sawtooth', 0.03, 0, 140); },
    mrrp: function () { tone(520, 0.12, 'sine', 0.07, 0, 820); },
    chomp: function () { [0, 0.18, 0.36].forEach(function (d) { tone(160, 0.07, 'square', 0.03, d, 90); }); },
    pop: function () { tone(500, 0.08, 'sine', 0.07, 0, 900); },
    boing: function () { tone(220, 0.35, 'sine', 0.08, 0, 660); },
    dizzy: function () { [0, 0.12, 0.24, 0.36, 0.48, 0.6].forEach(function (d, i) { tone(i % 2 ? 660 : 520, 0.1, 'sine', 0.05, d); }); },
    tune: function () { [523, 659, 784, 659, 880, 784, 659, 1047].forEach(function (f, i) { tone(f, 0.18, 'triangle', 0.05, i * 0.17); }); }
  };
  var purrOsc = null;
  function purr(on) {
    var a = A();
    if (on && a && !purrOsc) {
      var o = a.createOscillator(), lfo = a.createOscillator(), lg = a.createGain(), g = a.createGain();
      o.type = 'triangle'; o.frequency.value = 58;
      lfo.frequency.value = 24; lg.gain.value = 0.03; lfo.connect(lg).connect(g.gain);
      g.gain.value = 0.035; o.connect(g).connect(a.destination); o.start(); lfo.start();
      purrOsc = { o: o, lfo: lfo, g: g };
    } else if (!on && purrOsc) {
      try { purrOsc.g.gain.setTargetAtTime(0.0001, a.currentTime, 0.08); purrOsc.o.stop(a.currentTime + 0.3); purrOsc.lfo.stop(a.currentTime + 0.3); } catch (e) {}
      purrOsc = null;
    }
  }
  function buzz(ms) { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} }

  /* ---------- Mimi's face and moves ---------- */
  function say(text, ms, aloud) {
    if (!bubble) return;
    bubble.textContent = text;
    bubble.classList.remove('show'); void bubble.offsetWidth; bubble.classList.add('show');
    clearTimeout(bubbleT);
    bubbleT = setTimeout(function () { bubble.classList.remove('show'); }, ms || 2200);
    mimiEl.classList.add('is-talk');
    setTimeout(function () { mimiEl.classList.remove('is-talk'); }, Math.min(ms || 2200, 1400));
    if (aloud && window.__mimiSay) try { window.__mimiSay(text.replace(/[\u{1F300}-\u{1FAFF}☀-➿]/gu, '').trim()); } catch (e) {}
  }
  function mood(m, ms) {
    ['is-happy', 'is-sad'].forEach(function (c) { mimiEl.classList.remove(c); });
    if (m) mimiEl.classList.add('is-' + m);
    clearTimeout(moodT);
    moodT = setTimeout(function () { mimiEl.classList.remove('is-happy', 'is-sad'); }, ms || 1400);
  }
  function play(anim, ms) {
    if (reduce) return;
    figure.classList.remove('a-jump', 'a-hop', 'a-shake', 'a-nod', 'a-wave', 'a-dance', 'a-spin');
    void figure.offsetWidth;
    figure.classList.add('a-' + anim);
    clearTimeout(animT);
    animT = setTimeout(function () { figure.classList.remove('a-' + anim); }, ms || 900);
  }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  // Floating hearts, notes and stars.
  function particle(x, y, glyph, cls) {
    if (reduce) return;
    var p = document.createElement('i');
    p.className = 'rm-p ' + (cls || '');
    p.textContent = glyph;
    var r = fx.getBoundingClientRect();
    p.style.left = (x - r.left) + 'px';
    p.style.top = (y - r.top) + 'px';
    p.style.setProperty('--dx', ((Math.random() - 0.5) * 70).toFixed(0) + 'px');
    p.style.setProperty('--rot', ((Math.random() - 0.5) * 50).toFixed(0) + 'deg');
    fx.appendChild(p);
    setTimeout(function () { p.remove(); }, 1500);
  }
  function center(fracX, fracY) {
    var r = figure.getBoundingClientRect();
    return { x: r.left + r.width * fracX, y: r.top + r.height * fracY };
  }

  /* ---------- Touch: where on Mimi? (fractions of her 160×176 drawing) ---------- */
  function zoneAt(fx_, fy) {
    if (fy < 0.31 && ((fx_ > 0.22 && fx_ < 0.46) || (fx_ > 0.54 && fx_ < 0.78))) return fx_ < 0.5 ? 'earL' : 'earR';
    if (fx_ > 0.70 && fy > 0.46 && fy < 0.88) return 'tail';
    if (fy < 0.6 && fx_ > 0.18 && fx_ < 0.82) return 'head';
    if (fy >= 0.6 && fx_ > 0.3 && fx_ < 0.7) return 'belly';
    return 'body';
  }

  var taps = [];
  function onTap(zone, x, y) {
    var now = Date.now();
    taps = taps.filter(function (t) { return now - t < 2600; });
    taps.push(now);
    if (taps.length >= 6) { taps = []; return dizzy(); }
    hideHint();
    if (zone === 'head') {
      play('hop', 650); mood('happy', 1300); sfx.giggle(); buzz(30);
      say(pick(['Hehe 😸', 'That’s nice!', 'More head pats!', 'Purr-fect 💕'])); particle(x, y, '💕'); addHappy(3);
    } else if (zone === 'belly') {
      play('jump', 800); mood('happy', 1500); sfx.laugh(); buzz(60);
      say(pick(['Hahaha! That tickles! 🤭', 'Nooo, not the tummy! 😹', 'Hehehe, stop! 😆'])); particle(x, y, '✨'); addHappy(4);
    } else if (zone === 'tail') {
      play('shake', 520); mood('sad', 1500); sfx.grump(); buzz(120);
      say(pick(['Hey! Not my tail! 😾', 'Hmph! 😤', 'That’s my tail!'])); addHappy(-2);
    } else if (zone === 'earL' || zone === 'earR') {
      mimiEl.classList.remove('twitch-l', 'twitch-r'); void mimiEl.offsetWidth;
      mimiEl.classList.add(zone === 'earL' ? 'twitch-l' : 'twitch-r');
      setTimeout(function () { mimiEl.classList.remove('twitch-l', 'twitch-r'); }, 600);
      play('nod', 600); sfx.mrrp(); buzz(20); say(pick(['Mrrp?', 'Hm? 👂', 'I heard that!'])); addHappy(1);
    } else {
      play('hop', 600); sfx.meow(); buzz(20); say(pick(['Meow!', 'Mew? 🐾', 'Hi there!'])); addHappy(1);
    }
  }

  function dizzy() {
    play('spin', 1400); sfx.dizzy(); buzz(300);
    mimiEl.classList.add('is-dizzy');
    setTimeout(function () { mimiEl.classList.remove('is-dizzy'); }, 2600);
    say('Whoa… so dizzy 😵‍💫', 2600);
  }

  // Petting: drag across her; she purrs while you keep stroking.
  var drag = null, petting = false, purrTick = 0, petEndT = 0;
  function onDown(e) {
    drag = { x: e.clientX, y: e.clientY, dist: 0, t: Date.now(), lastX: e.clientX, lastY: e.clientY };
  }
  function onMove(e) {
    if (!drag) return;
    drag.dist += Math.hypot(e.clientX - drag.lastX, e.clientY - drag.lastY);
    drag.lastX = e.clientX; drag.lastY = e.clientY;
    if (!petting && drag.dist > 60 && Date.now() - drag.t > 180) {
      petting = true; hideHint();
      mimiEl.classList.add('is-happy', 'is-purr');
      purr(true);
      say('Purrr… 💕', 3000);
    }
    if (petting && Date.now() - purrTick > 320) {
      purrTick = Date.now();
      particle(e.clientX, e.clientY, pick(['💕', '💗', '💖']));
      buzz(15);
    }
  }
  function onUp(e) {
    var d = drag; drag = null;
    if (petting) {
      petting = false; purr(false);
      clearTimeout(petEndT);
      petEndT = setTimeout(function () { mimiEl.classList.remove('is-happy', 'is-purr'); }, 900);
      say(pick(['I love that 💕', 'More pets please 🥰', 'Purr-fect!']), 2000, true);
      addHappy(8);
      return;
    }
    if (!d || d.dist > 30) return;
    var r = figure.getBoundingClientRect();
    onTap(zoneAt((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height), e.clientX, e.clientY);
  }

  /* ---------- Buttons ---------- */
  var feeds = [];
  function feed() {
    hideHint();
    var now = Date.now();
    feeds = feeds.filter(function (t) { return now - t < 10 * 60000; });
    if (feeds.length >= 3) { play('nod', 600); return say('I’m full! 😋 Maybe later.', 2200, true); }
    feeds.push(now);
    var fish = document.createElement('i');
    fish.className = 'rm-fish';
    fish.innerHTML = '<svg viewBox="0 0 64 36"><path d="M8 18 C18 2 40 2 50 18 C40 34 18 34 8 18 Z" fill="#7CC8F2" stroke="#2A2420" stroke-width="3" stroke-linejoin="round"/><path d="M50 18 L62 6 L62 30 Z" fill="#5AB4E8" stroke="#2A2420" stroke-width="3" stroke-linejoin="round"/><circle cx="20" cy="15" r="3" fill="#2A2420"/><path d="M30 10 Q34 18 30 26" fill="none" stroke="#2A2420" stroke-width="2" opacity=".5"/></svg>';
    fx.appendChild(fish);
    var r = fx.getBoundingClientRect(), mouth = center(0.5, 0.5);
    var sx = r.width * 0.12, sy = r.height * 0.86, ex = mouth.x - r.left, ey = mouth.y - r.top;
    var done = function () {
      fish.remove();
      mimiEl.classList.add('is-talk');
      sfx.chomp(); buzz(40);
      setTimeout(function () { mimiEl.classList.remove('is-talk'); mood('happy', 1400); play('hop', 600); }, 700);
      say(pick(['Yum! 🐟', 'Mmm, fishy! 😋', 'Thank you! 💕']), 2000, true);
      addHappy(10);
    };
    if (reduce || !fish.animate) { done(); return; }
    var a = fish.animate([
      { transform: 'translate(' + sx + 'px,' + sy + 'px) rotate(-20deg) scale(1)' },
      { transform: 'translate(' + ((sx + ex) / 2) + 'px,' + (Math.min(sy, ey) - 120) + 'px) rotate(10deg) scale(1.1)' },
      { transform: 'translate(' + ex + 'px,' + ey + 'px) rotate(30deg) scale(.35)' }
    ], { duration: 900, easing: 'cubic-bezier(.3,.7,.4,1)', fill: 'forwards' });
    a.onfinish = done;
    sfx.pop();
  }

  function yarn() {
    hideHint();
    var ball = document.createElement('i');
    ball.className = 'rm-yarn';
    ball.innerHTML = '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="17" fill="#FF6B4A" stroke="#2A2420" stroke-width="3"/><path d="M6 14 Q20 24 34 12 M5 24 Q20 32 35 22 M14 4 Q20 20 12 36 M26 4 Q22 20 30 35" fill="none" stroke="#fff" stroke-width="2.2" opacity=".7"/></svg>';
    fx.appendChild(ball);
    var r = fx.getBoundingClientRect(), paw = center(0.62, 0.92);
    var floorY = paw.y - r.top - 16, pawX = paw.x - r.left + 8;
    var finish = function () { ball.remove(); };
    if (reduce || !ball.animate) { play('wave', 1200); say('Again! Again! 🧶', 2000); addHappy(6); finish(); return; }
    ball.animate([
      { transform: 'translate(' + (r.width + 40) + 'px,' + floorY + 'px) rotate(0deg)' },
      { transform: 'translate(' + pawX + 'px,' + floorY + 'px) rotate(-720deg)' }
    ], { duration: 1000, easing: 'cubic-bezier(.2,.8,.4,1)', fill: 'forwards' }).onfinish = function () {
      play('wave', 1100); sfx.boing(); buzz(40);
      say(pick(['Got it! 🧶', 'Again! Again!', 'Pounce! 🐾']), 2000);
      addHappy(6);
      ball.animate([
        { transform: 'translate(' + pawX + 'px,' + floorY + 'px) rotate(-720deg)' },
        { transform: 'translate(' + (pawX * 0.5) + 'px,' + (floorY - 70) + 'px) rotate(-900deg)' },
        { transform: 'translate(-60px,' + floorY + 'px) rotate(-1260deg)' }
      ], { duration: 1100, delay: 250, easing: 'ease-in', fill: 'forwards' }).onfinish = finish;
    };
  }

  function dance() {
    hideHint();
    play('dance', 2000); mood('happy', 2200); sfx.tune(); buzz(50);
    say('Dance party! 🎶', 2200, true);
    var i = 0, iv = setInterval(function () {
      var c = center(0.2 + Math.random() * 0.6, 0.15);
      particle(c.x, c.y, pick(['🎵', '🎶', '✨']), 'note');
      if (++i > 8) clearInterval(iv);
    }, 220);
    addHappy(5);
  }

  function myDay() {
    hideHint();
    var t = window.__mimiDay ? window.__mimiDay() : '';
    play('nod', 700);
    say(t || 'Let’s make today great! 💪', 4200);
  }

  /* ---------- Me as Mimi ---------- */
  var mePanel = null, meImg = null, meState = null;

  // Make a cartoon look: richer colours, flat colour bands and soft ink lines, like Mimi's drawing.
  function cartoon(ctx, w, h) {
    var img = ctx.getImageData(0, 0, w, h), d = img.data, n = w * h, lum = new Float32Array(n), i, k;
    for (i = 0, k = 0; k < n; i += 4, k++) {
      var r = d[i], g = d[i + 1], b = d[i + 2], l = 0.299 * r + 0.587 * g + 0.114 * b;
      r = l + (r - l) * 1.35; g = l + (g - l) * 1.35; b = l + (b - l) * 1.35;          // saturation
      r = (r - 128) * 1.12 + 136; g = (g - 128) * 1.12 + 136; b = (b - 128) * 1.12 + 136; // contrast, a bit brighter
      var q = 255 / 6;                                                                      // colour bands
      d[i] = Math.round(r / q) * q * 0.55 + r * 0.45;
      d[i + 1] = Math.round(g / q) * q * 0.55 + g * 0.45;
      d[i + 2] = Math.round(b / q) * q * 0.55 + b * 0.45;
      lum[k] = l;
    }
    for (var y = 1; y < h - 1; y++) for (var x = 1; x < w - 1; x++) {
      k = y * w + x;
      var gx = lum[k - w + 1] + 2 * lum[k + 1] + lum[k + w + 1] - lum[k - w - 1] - 2 * lum[k - 1] - lum[k + w - 1];
      var gy = lum[k + w - 1] + 2 * lum[k + w] + lum[k + w + 1] - lum[k - w - 1] - 2 * lum[k - w] - lum[k - w + 1];
      var e = Math.sqrt(gx * gx + gy * gy);
      if (e > 70) { var f = Math.max(0.35, 1 - (e - 70) / 260); i = k * 4; d[i] *= f; d[i + 1] *= f; d[i + 2] *= f; }
    }
    ctx.putImageData(img, 0, 0);
  }

  var OUT_W = 288, OUT_H = 240; // the shape of Mimi's head (96 × 80)
  function renderFace(final) {
    var st = meState; if (!st) return '';
    var c = document.createElement('canvas'); c.width = OUT_W; c.height = OUT_H;
    var ctx = c.getContext('2d');
    var cw = st.cw / st.z, ch = st.ch / st.z;
    st.cx = Math.max(cw / 2, Math.min(st.src.width - cw / 2, st.cx));
    st.cy = Math.max(ch / 2, Math.min(st.src.height - ch / 2, st.cy));
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(st.src, st.cx - cw / 2, st.cy - ch / 2, cw, ch, 0, 0, OUT_W, OUT_H);
    if (final !== 'fast' && st.style === 'cartoon') cartoon(ctx, OUT_W, OUT_H);
    return c.toDataURL('image/jpeg', 0.86);
  }

  function loadPhoto(file) {
    if (!file || !/^image\//.test(file.type || 'image/')) return;
    var url = URL.createObjectURL(file), im = new Image();
    im.onload = function () {
      var max = 900, sc = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
      var src = document.createElement('canvas');
      src.width = Math.round(im.naturalWidth * sc); src.height = Math.round(im.naturalHeight * sc);
      src.getContext('2d').drawImage(im, 0, 0, src.width, src.height);
      URL.revokeObjectURL(url);
      var ratio = OUT_W / OUT_H, cw, ch;
      if (src.width / src.height > ratio) { ch = src.height; cw = ch * ratio; } else { cw = src.width; ch = cw / ratio; }
      // Faces in selfies sit a little above the middle; start zoomed in on that.
      meState = { src: src, cw: cw, ch: ch, z: 1.6, cx: src.width / 2, cy: src.height * 0.42, style: 'cartoon' };
      meStep('edit');
    };
    im.onerror = function () { URL.revokeObjectURL(url); say('I couldn’t open that photo 🙈', 2400); };
    im.src = url;
  }

  function meOpen() {
    hideHint();
    if (mePanel) return;
    mePanel = document.createElement('div');
    mePanel.className = 'rm-me';
    mePanel.setAttribute('role', 'dialog');
    mePanel.setAttribute('aria-label', 'Me as Mimi');
    root.appendChild(mePanel);
    requestAnimationFrame(function () { mePanel && mePanel.classList.add('in'); });
    meStep(window.MimiArt.face() ? 'have' : 'intro');
  }
  function meClose() {
    if (!mePanel) return;
    var p = mePanel; mePanel = null; meState = null;
    p.classList.remove('in');
    setTimeout(function () { p.remove(); }, 320);
  }

  function pickPhoto() {
    var inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    inp.style.display = 'none';
    inp.addEventListener('change', function () { loadPhoto(inp.files && inp.files[0]); inp.remove(); });
    document.body.appendChild(inp);
    inp.click();
  }

  function btn(label, cls, fn) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'rm-mbtn' + (cls ? ' ' + cls : ''); b.innerHTML = label;
    b.addEventListener('click', fn);
    return b;
  }

  function meStep(step) {
    if (!mePanel) return;
    mePanel.textContent = '';
    var head = document.createElement('div');
    head.className = 'rm-mhead';
    var h = document.createElement('h3');
    var x = btn('<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>', 'x', meClose);
    x.setAttribute('aria-label', 'Close');
    head.append(h, x);
    mePanel.appendChild(head);
    var body = document.createElement('div');
    body.className = 'rm-mbody';
    mePanel.appendChild(body);
    var acts = document.createElement('div');
    acts.className = 'rm-macts';

    if (step === 'intro') {
      h.textContent = 'Be Mimi!';
      body.innerHTML = '<div class="rm-mduo"><div>' + window.MimiArt.cat('me-a', null) + '</div><span>→</span><div class="q">🙂</div></div>' +
        '<p>Pick a clear photo of your face. Mimi turns it into a cartoon you with her ears and whiskers, and you can play as Mimi here and on your home screen.</p>' +
        '<p class="small">Your photo stays on this iPhone.</p>';
      acts.append(btn('📷 Choose a photo', 'go', pickPhoto));
    } else if (step === 'have') {
      var on = window.MimiArt.isMe();
      h.textContent = 'Me as Mimi';
      var seg = document.createElement('div');
      seg.className = 'rm-mseg';
      [['Mimi', false], ['Me', true]].forEach(function (o) {
        var b = btn((o[1] ? '🙂 ' : '🐱 ') + o[0], (o[1] === on ? 'sel' : ''), function () {
          window.MimiArt.setMe(undefined, o[1]); sfx.pop(); buzz(20);
          meStep('have');
          play('hop', 600); say(o[1] ? 'Now you’re Mimi! 😸' : 'Mimi’s back! 🐾', 2000);
        });
        b.setAttribute('aria-pressed', o[1] === on ? 'true' : 'false');
        seg.appendChild(b);
      });
      var pv = document.createElement('div');
      pv.className = 'rm-mprev small';
      pv.innerHTML = window.MimiArt.cat('me-b', window.MimiArt.face());
      body.append(pv, seg);
      var p = document.createElement('p');
      p.className = 'small';
      p.textContent = 'Shown in Mimi’s room and on your home screen.';
      body.appendChild(p);
      acts.append(btn('🗑 Remove', 'red', function () {
        if (!confirm('Remove your Mimi photo?')) return;
        window.MimiArt.setMe(null); meStep('intro'); say('Mimi’s back! 🐾', 1800);
      }), btn('📷 New photo', '', pickPhoto));
    } else if (step === 'edit') {
      h.textContent = 'Fit your face';
      var prev = document.createElement('div');
      prev.className = 'rm-mprev';
      prev.innerHTML = window.MimiArt.cat('me-c', 'data:image/png;base64,AAAA');
      var image = prev.querySelector('image');
      var paint = function (q) { image.setAttribute('href', renderFace(q)); };
      paint();
      // Drag to move the photo; pinch is fiddly here, so a slider zooms.
      var dragP = null;
      prev.addEventListener('pointerdown', function (e) { dragP = { x: e.clientX, y: e.clientY }; prev.setPointerCapture && prev.setPointerCapture(e.pointerId); });
      prev.addEventListener('pointermove', function (e) {
        if (!dragP || !meState) return;
        var px = prev.getBoundingClientRect().width * 96 / 160; // head width on screen
        var k = (meState.cw / meState.z) / px;
        meState.cx -= (e.clientX - dragP.x) * k; meState.cy -= (e.clientY - dragP.y) * k;
        dragP = { x: e.clientX, y: e.clientY };
        paint('fast');
      });
      var endDrag = function () { if (dragP) { dragP = null; paint(); } };
      prev.addEventListener('pointerup', endDrag);
      prev.addEventListener('pointercancel', endDrag);
      var zoom = document.createElement('label');
      zoom.className = 'rm-mzoom';
      zoom.innerHTML = '<span>−</span><input type="range" min="1" max="4" step="0.05" aria-label="Zoom"><span>+</span>';
      var rng = zoom.querySelector('input');
      rng.value = meState.z;
      var zt = 0;
      rng.addEventListener('input', function () { meState.z = +rng.value; paint('fast'); clearTimeout(zt); zt = setTimeout(paint, 180); });
      var seg2 = document.createElement('div');
      seg2.className = 'rm-mseg';
      [['🎨 Cartoon', 'cartoon'], ['📷 Photo', 'photo']].forEach(function (o) {
        var b = btn(o[0], meState.style === o[1] ? 'sel' : '', function () {
          meState.style = o[1];
          [].forEach.call(seg2.children, function (c) { c.classList.toggle('sel', c === b); });
          paint();
        });
        seg2.appendChild(b);
      });
      var tip = document.createElement('p');
      tip.className = 'small';
      tip.textContent = 'Drag the photo to fit your face inside Mimi’s head.';
      body.append(prev, tip, zoom, seg2);
      acts.append(btn('Cancel', '', function () { meState = null; meStep(window.MimiArt.face() ? 'have' : 'intro'); }),
        btn('😸 Be Mimi', 'go', function () {
          var face = renderFace();
          window.MimiArt.setMe(face, true);
          meClose();
          sfx.tune(); buzz(60);
          play('dance', 1600); mood('happy', 1800);
          say('Look, it’s you! 😸', 2600, true);
          addHappy(10);
        }));
    }
    mePanel.appendChild(acts);
  }

  /* ---------- Room ---------- */
  function hideHint() { if (hint) { hint.classList.add('gone'); } }

  function build() {
    var el = function (tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
    var h = new Date().getHours();
    var night = h < 6 || h >= 19;
    root = el('section', 'room' + (night ? ' night' : ''));
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Mimi’s room');

    var scene = el('div', 'rm-scene');
    scene.innerHTML =
      '<div class="rm-wall"></div>' +
      '<div class="rm-window" aria-hidden="true"><i class="rm-orb"></i><i class="rm-cloud"></i><i class="rm-bar v"></i><i class="rm-bar h"></i></div>' +
      '<div class="rm-frame" aria-hidden="true"><svg viewBox="0 0 60 48"><rect x="3" y="3" width="54" height="42" rx="6" fill="#FFF7EE" stroke="#8A5A3C" stroke-width="5"/><path d="M14 30 Q22 16 32 26 T48 22" fill="none" stroke="#2CC4BE" stroke-width="3" stroke-linecap="round"/><circle cx="42" cy="15" r="5" fill="#FFC24D"/></svg></div>' +
      '<div class="rm-shelf" aria-hidden="true"><i class="b1"></i><i class="b2"></i><i class="b3"></i></div>' +
      '<div class="rm-plant" aria-hidden="true"><svg viewBox="0 0 60 90"><path d="M30 60 C10 40 6 20 18 10 C22 30 28 40 30 60 Z M30 60 C50 40 54 22 44 8 C38 28 32 40 30 60 Z M30 60 C24 34 30 18 30 4 C34 22 36 40 30 60 Z" fill="#5DB82E" stroke="#2A2420" stroke-width="2.5" stroke-linejoin="round"/><path d="M14 58 H46 L42 88 H18 Z" fill="#FF8A5B" stroke="#2A2420" stroke-width="3" stroke-linejoin="round"/></svg></div>' +
      '<div class="rm-floor"></div><div class="rm-rug"></div>';
    var stage = el('div', 'rm-stage');
    mimiEl = el('div', 'mw-mimi rm-mimi');
    mimiEl.appendChild(el('i', 'mw-shadow'));
    figure = el('div', 'mw-figure', window.MimiArt.cat('room'));
    mimiEl.appendChild(figure);
    mimiEl.appendChild(el('div', 'rm-dizzy', '<i>⭐</i><i>💫</i><i>⭐</i>'));
    var touch = el('div', 'rm-touch');
    touch.setAttribute('role', 'button');
    touch.setAttribute('tabindex', '0');
    touch.setAttribute('aria-label', 'Mimi. Tap her head, belly, ears or tail, or stroke her.');
    touch.addEventListener('pointerdown', function (e) { touch.setPointerCapture && touch.setPointerCapture(e.pointerId); onDown(e); });
    touch.addEventListener('pointermove', onMove);
    touch.addEventListener('pointerup', onUp);
    touch.addEventListener('pointercancel', function () { drag = null; if (petting) { petting = false; purr(false); mimiEl.classList.remove('is-happy', 'is-purr'); } });
    touch.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); var c = center(0.5, 0.35); onTap('head', c.x, c.y); } });
    mimiEl.appendChild(touch);
    stage.appendChild(mimiEl);
    scene.appendChild(stage);
    bubble = el('div', 'rm-bubble');
    bubble.setAttribute('aria-live', 'polite');
    scene.appendChild(bubble);
    fx = el('div', 'rm-fx');
    scene.appendChild(fx);
    root.appendChild(scene);

    var top = el('header', 'rm-top');
    var x = el('button', 'rm-x', '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>');
    x.type = 'button';
    x.setAttribute('aria-label', 'Close Mimi’s room');
    x.addEventListener('click', close);
    var meter = el('div', 'rm-meter', '<span class="rm-heart">❤</span><span class="rm-track"><i></i></span><small></small>');
    meter.setAttribute('aria-label', 'Mimi’s happiness');
    meterFill = meter.querySelector('i');
    meterTx = meter.querySelector('small');
    top.append(x, el('h2', 'rm-title', 'Mimi'), meter);
    root.appendChild(top);

    hint = el('p', 'rm-hint', 'Tap, tickle or stroke Mimi 🐾');
    root.appendChild(hint);

    var tools = el('nav', 'rm-tools');
    tools.setAttribute('aria-label', 'Play');
    [['🐟', 'Feed', feed], ['🧶', 'Yarn', yarn], ['💃', 'Dance', dance], ['💬', 'My day', myDay], ['🙂', 'Me as Mimi', meOpen]].forEach(function (t, i) {
      var b = el('button', 'rm-tool', '<span class="ic">' + t[0] + '</span><span>' + t[1] + '</span>');
      b.type = 'button';
      b.style.setProperty('--d', (0.15 + i * 0.05) + 's');
      b.addEventListener('click', function () { t[2](b); });
      if (t[2] === meOpen) b.classList.add('me');
      tools.appendChild(b);
    });
    root.appendChild(tools);
    document.body.appendChild(root);
    paintMeter(false);
  }

  var opener = null;
  function open(fromEl) {
    if (root) return;
    happy = loadHappy();
    build();
    opener = document.activeElement;
    // Zoom out of the header's Mimi.
    if (fromEl && fromEl.getBoundingClientRect && !reduce) {
      var r = fromEl.getBoundingClientRect();
      root.style.transformOrigin = (r.left + r.width / 2) + 'px ' + (r.top + r.height / 2) + 'px';
    }
    requestAnimationFrame(function () { root.classList.add('in'); });
    setTimeout(function () { play('wave', 1300); mood('happy', 1300); sfx.meow(); say(pick(['Hi! Play with me 🐾', 'Yay, playtime! 😸', 'You came to see me! 💕']), 2400); }, 450);
    document.addEventListener('keydown', onKey);
  }
  function close() {
    if (!root) return;
    meClose();
    purr(false);
    document.removeEventListener('keydown', onKey);
    var r = root;
    root = null;
    r.classList.remove('in');
    r.classList.add('out');
    setTimeout(function () { r.remove(); }, 420);
    if (opener && opener.focus) try { opener.focus({ preventScroll: true }); } catch (e) {}
  }
  function onKey(e) { if (e.key === 'Escape') { if (mePanel) meClose(); else close(); } }

  window.MimiArt.onChange && window.MimiArt.onChange(function () { if (figure && root) figure.innerHTML = window.MimiArt.cat('room'); });
  var roomBtn = document.getElementById('roomBtn');
  if (roomBtn) roomBtn.addEventListener('click', function () { open(roomBtn); });

  window.mimiRoom = { open: open, close: close, me: function () { if (!root) open(); setTimeout(meOpen, root ? 500 : 0); }, get happiness() { return happy; } };
})();

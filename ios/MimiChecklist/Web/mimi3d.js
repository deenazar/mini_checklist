/*
 * Mimi in 3D for Mimi's room (three.js, bundled in vendor/three.min.js and loaded only when the room opens).
 *
 * A soft plush cat built from simple shapes: shaded fur, glossy eyes, an orange patch and ear, a swaying tail,
 * a collar with a little bell. She breathes, blinks, looks at your finger, and gently turns so you can see
 * she's really 3D.
 *
 * She follows the room's existing moods: play.js keeps setting classes on the room's Mimi (is-happy, is-sad,
 * is-talk, is-purr, is-dizzy, twitch-l / twitch-r) and on her figure (a-jump, a-hop, a-shake, a-nod, a-dance,
 * a-spin, a-wave). This file watches those classes and acts them out in 3D, so the room's touch logic stays as is.
 *
 *   window.Mimi3D.load()            → Promise, resolves when three.js is ready (rejects if it can't run)
 *   window.Mimi3D.create(host, el)  → { look(x, y), destroy() }   host: the figure element, el: the room's Mimi
 */
(function () {
  'use strict';

  var loading = null;
  function load() {
    if (window.THREE) return Promise.resolve(window.THREE);
    if (loading) return loading;
    loading = new Promise(function (res, rej) {
      try {
        var c = document.createElement('canvas');
        if (!(c.getContext('webgl') || c.getContext('experimental-webgl'))) return rej(new Error('no webgl'));
      } catch (e) { return rej(e); }
      var s = document.createElement('script');
      s.src = 'vendor/three.min.js';
      s.onload = function () { window.THREE ? res(window.THREE) : rej(new Error('three missing')); };
      s.onerror = function () { loading = null; rej(new Error('three failed')); };
      document.head.appendChild(s);
    });
    return loading;
  }

  function create(host, mimiEl) {
    var T = window.THREE;
    var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var W = host.clientWidth || 300, H = host.clientHeight || 330;
    var renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(W, H);
    if ('outputEncoding' in renderer) renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    var canvas = renderer.domElement;
    canvas.className = 'm3-canvas';
    host.appendChild(canvas);

    var scene = new T.Scene();
    var cam = new T.PerspectiveCamera(30, W / H, 0.1, 50);
    cam.position.set(0, 2.7, 10.4);
    cam.lookAt(0, 2.25, 0);

    // Light: soft sky and warm floor bounce, a key light with a soft shadow, and a rim light for the plush edge.
    scene.add(new T.HemisphereLight(0xffffff, 0xe8b9a2, 0.62));
    var key = new T.DirectionalLight(0xfff6ee, 1.15);
    key.position.set(3, 7, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -3; key.shadow.camera.right = 3; key.shadow.camera.top = 5; key.shadow.camera.bottom = -1;
    key.shadow.radius = 6;
    scene.add(key);
    var rim = new T.DirectionalLight(0xffe6f0, 0.55);
    rim.position.set(-5, 4, -4);
    scene.add(rim);
    var floor = new T.Mesh(new T.PlaneGeometry(12, 12), new T.ShadowMaterial({ opacity: 0.16 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Colours are written in sRGB (as on screen); the renderer works in linear light, so convert them.
    function col(hex) { var c = new T.Color(hex); return c.convertSRGBToLinear ? c.convertSRGBToLinear() : c; }
    function mat(color, rough, extra) {
      return new T.MeshStandardMaterial(Object.assign({ color: col(color), roughness: rough == null ? 0.78 : rough, metalness: 0 }, extra || {}));
    }
    var FUR = mat(0xffe9d6), FUR2 = mat(0xfff6ec, 0.85), ORANGE = mat(0xff8a45, 0.7), PINK = mat(0xff9fb3, 0.75);
    var DARK = mat(0x1e1530, 0.12, { metalness: 0.15 }), CORAL = mat(0xff6f4e, 0.55), GOLD = mat(0xffc24d, 0.25, { metalness: 0.75 });
    var BLUSH = new T.MeshBasicMaterial({ color: col(0xff8fa8), transparent: true, opacity: 0.5, depthWrite: false });
    var WHITE = new T.MeshBasicMaterial({ color: 0xffffff });
    var MOUTH = mat(0x7a2840, 0.5);
    var LINE = new T.LineBasicMaterial({ color: col(0xb07a5e), transparent: true, opacity: 0.8 });

    function sphere(r, m, sx, sy, sz, seg) {
      var g = new T.SphereGeometry(r, seg || 40, seg ? Math.round(seg * 0.75) : 30);
      var me = new T.Mesh(g, m);
      me.scale.set(sx || 1, sy || 1, sz || 1);
      me.castShadow = true;
      return me;
    }

    var root = new T.Group();
    scene.add(root);
    var bodyG = new T.Group();
    root.add(bodyG);

    // Body, belly, legs and paws
    var body = sphere(1, FUR, 1.05, 0.95, 0.9); body.position.y = 1.0; bodyG.add(body);
    var belly = sphere(0.64, FUR2, 1, 1.05, 0.55); belly.position.set(0, 0.92, 0.6); bodyG.add(belly);
    [-1, 1].forEach(function (s) {
      var leg = sphere(0.44, FUR, 1, 0.75, 1.15); leg.position.set(s * 0.72, 0.3, 0.05); bodyG.add(leg);
      var paw = sphere(0.33, FUR2, 1.05, 0.7, 1.25); paw.position.set(s * 0.42, 0.2, 0.62); bodyG.add(paw);
      var bean = sphere(0.09, PINK, 1.3, 0.6, 0.6, 16); bean.position.set(s * 0.42, 0.18, 1.02); bodyG.add(bean);
    });

    // Tail: a soft tube with an orange tip, swaying from its base
    var tailG = new T.Group();
    tailG.position.set(0.72, 0.45, -0.55);
    bodyG.add(tailG);
    var curve = new T.CatmullRomCurve3([new T.Vector3(0, 0, 0), new T.Vector3(0.7, 0.05, -0.15), new T.Vector3(1.0, 0.75, -0.1), new T.Vector3(0.8, 1.5, 0.05)]);
    var tail = new T.Mesh(new T.TubeGeometry(curve, 40, 0.17, 16, false), FUR);
    tail.castShadow = true;
    tailG.add(tail);
    var tip = sphere(0.2, ORANGE, 1, 1.25, 1); tip.position.set(0.8, 1.55, 0.05); tailG.add(tip);

    // Collar and bell
    var collar = new T.Mesh(new T.TorusGeometry(0.66, 0.085, 16, 48), CORAL);
    collar.rotation.x = Math.PI / 2; collar.position.y = 1.78; collar.scale.set(1, 0.92, 1);
    bodyG.add(collar);
    var bell = sphere(0.14, GOLD); bell.position.set(0, 1.64, 0.66); bodyG.add(bell);

    // Head, on a neck pivot so it can tilt and look around
    var headG = new T.Group();
    headG.position.set(0, 1.85, 0);
    root.add(headG);
    var head = sphere(1, FUR, 1.18, 1, 1); head.position.y = 0.78; headG.add(head);
    var patchGeo = new T.SphereGeometry(1.012, 40, 30, Math.PI * 0.42, Math.PI * 0.8, 0, Math.PI * 0.42);
    var patch = new T.Mesh(patchGeo, ORANGE); patch.scale.set(1.18, 1, 1); patch.position.y = 0.78; headG.add(patch);
    var muzzle = sphere(0.36, FUR2, 1.35, 0.85, 0.7); muzzle.position.set(0, 0.42, 0.78); headG.add(muzzle);

    var ears = [];
    [-1, 1].forEach(function (s) {
      var eg = new T.Group();
      eg.position.set(s * 0.6, 1.5, 0.02);
      eg.rotation.z = -s * 0.38;
      headG.add(eg);
      var ear = new T.Mesh(new T.ConeGeometry(0.42, 0.82, 32), s > 0 ? ORANGE : FUR);
      ear.position.y = 0.3; ear.castShadow = true; eg.add(ear);
      var inner = new T.Mesh(new T.ConeGeometry(0.25, 0.52, 32), PINK);
      inner.position.set(0, 0.22, 0.27); inner.scale.set(1, 1, 0.45); eg.add(inner);
      ears.push(eg);
    });

    // Face: glossy eyes (and happy / sleepy arcs), nose, mouth, blush and whiskers
    var eyes = [], arcs = [], sleeps = [];
    [-1, 1].forEach(function (s) {
      var eg = new T.Group(); eg.position.set(s * 0.4, 0.82, 0.9); headG.add(eg);
      var e = sphere(0.2, DARK, 0.85, 1.08, 0.55); eg.add(e);
      var h1 = sphere(0.065, WHITE, 1, 1, 1, 12); h1.position.set(0.07, 0.09, 0.1); h1.castShadow = false; eg.add(h1);
      var h2 = sphere(0.03, WHITE, 1, 1, 1, 10); h2.position.set(-0.06, -0.08, 0.1); h2.castShadow = false; eg.add(h2);
      eyes.push(eg);
      var arc = new T.Mesh(new T.TorusGeometry(0.15, 0.04, 10, 24, Math.PI), DARK);
      arc.position.set(s * 0.4, 0.78, 0.98); arc.visible = false; headG.add(arc); arcs.push(arc);
      var sl = new T.Mesh(new T.TorusGeometry(0.15, 0.035, 10, 24, Math.PI), DARK);
      sl.rotation.z = Math.PI; sl.position.set(s * 0.4, 0.86, 0.98); sl.visible = false; headG.add(sl); sleeps.push(sl);
      var bl = sphere(0.17, BLUSH, 1, 0.55, 0.3, 20); bl.position.set(s * 0.7, 0.5, 0.78); bl.castShadow = false; headG.add(bl);
      [[0.58, 0.04], [0.62, -0.08]].forEach(function (w) {
        var g = new T.BufferGeometry().setFromPoints([new T.Vector3(s * 0.55, 0.45 + w[1] * 0.5, 0.86), new T.Vector3(s * 1.25, 0.45 + w[1] * 2.2 + 0.06, 0.62)]);
        headG.add(new T.Line(g, LINE));
      });
    });
    var nose = sphere(0.075, PINK, 1.4, 0.85, 0.8, 16); nose.position.set(0, 0.55, 1.04); headG.add(nose);
    var smile = new T.Group(); smile.position.set(0, 0.4, 1.0); headG.add(smile);
    [-1, 1].forEach(function (s) {
      var m = new T.Mesh(new T.TorusGeometry(0.075, 0.02, 8, 16, Math.PI), MOUTH);
      m.rotation.z = Math.PI; m.position.x = s * 0.075; smile.add(m);
    });
    var open = sphere(0.11, MOUTH, 1.05, 0.85, 0.5, 20); open.position.set(0, 0.36, 0.98); open.visible = false; headG.add(open);

    // ---------- Moods and moves, from the room's classes ----------
    var st = { happy: false, sad: false, talk: false, purr: false, dizzy: 0, jump: 0, hop: 0, shake: 0, nod: 0, dance: 0, wave: 0, twL: 0, twR: 0 };
    var now = function () { return performance.now() / 1000; };
    function readMood() {
      var c = mimiEl.classList;
      st.happy = c.contains('is-happy'); st.sad = c.contains('is-sad'); st.talk = c.contains('is-talk'); st.purr = c.contains('is-purr');
      if (c.contains('is-dizzy') && !st.dizzy) st.dizzy = now();
      if (!c.contains('is-dizzy')) st.dizzy = 0;
      if (c.contains('twitch-l')) st.twL = now();
      if (c.contains('twitch-r')) st.twR = now();
    }
    var fig = mimiEl.querySelector('.mw-figure') || host;
    function readMove() {
      ['jump', 'hop', 'shake', 'nod', 'dance', 'spin', 'wave'].forEach(function (k) { if (fig.classList.contains('a-' + k)) st[k] = now(); });
    }
    var mo = new MutationObserver(function () { readMood(); readMove(); });
    mo.observe(mimiEl, { attributes: true, attributeFilter: ['class'] });
    mo.observe(fig, { attributes: true, attributeFilter: ['class'] });

    var look = { x: 0, y: 0, tx: 0, ty: 0, until: 0 };
    var blinkAt = now() + 2, raf = 0, last = 0, alive = true;
    function ease(p) { return p < 0 ? 0 : p > 1 ? 1 : 1 - Math.pow(1 - p, 3); }
    function since(t0, d) { return t0 ? (now() - t0) / d : 2; }

    function frame(ms) {
      if (!alive) return;
      raf = requestAnimationFrame(frame);
      if (document.hidden) return;
      if (ms - last < 30) return; // ~30 fps is plenty, and kinder to the battery
      last = ms;
      var t = now();

      // Breathing and a slow turn so she reads as 3D
      var br = Math.sin(t * 1.9);
      bodyG.scale.set(1 + br * 0.012, 1 + br * 0.022, 1 + br * 0.012);
      headG.position.y = 1.85 + br * 0.025;
      var sway = reduce ? 0 : Math.sin(t * 0.45) * 0.38;

      // Looking: follows your finger for a moment, otherwise glances around now and then
      if (t > look.until && Math.random() < 0.006) { look.tx = (Math.random() - 0.5) * 0.9; look.ty = (Math.random() - 0.5) * 0.4; look.until = t + 1.5; }
      look.x += (look.tx - look.x) * 0.12; look.y += (look.ty - look.y) * 0.12;
      headG.rotation.y = look.x * 0.55;
      headG.rotation.x = -look.y * 0.35 + (st.sad ? 0.18 : 0);
      headG.rotation.z = Math.sin(t * 0.7) * 0.05 + (st.happy ? Math.sin(t * 5) * 0.06 : 0);
      eyes.forEach(function (e) { e.position.x = (e.position.x > 0 ? 0.4 : -0.4) + look.x * 0.05; });

      // Blinking
      var bl = 1;
      if (t > blinkAt) { var p = (t - blinkAt) / 0.16; bl = p < 0.5 ? 1 - p * 1.8 : p < 1 ? 0.1 + (p - 0.5) * 1.8 : 1; if (p >= 1) blinkAt = t + 2.5 + Math.random() * 3; }
      eyes.forEach(function (e) { e.scale.y = Math.max(0.08, bl); });

      // Face for the mood
      var happy = st.happy || st.purr || since(st.dance, 2) < 1;
      eyes.forEach(function (e) { e.visible = !happy; });
      arcs.forEach(function (a) { a.visible = happy; });
      sleeps.forEach(function (a) { a.visible = false; });
      var talking = st.talk && Math.floor(t * 7) % 2 === 0;
      open.visible = talking || since(st.jump, 0.8) < 1;
      smile.visible = !open.visible;
      smile.rotation.z = st.sad ? Math.PI : 0;
      smile.position.y = st.sad ? 0.36 : 0.4;

      // Ears: droop when sad, twitch when touched
      var tl = since(st.twL, 0.5), tr = since(st.twR, 0.5);
      ears[0].rotation.z = 0.38 + (st.sad ? 0.35 : 0) + (tl < 1 ? Math.sin(tl * Math.PI * 3) * 0.4 * (1 - tl) : 0);
      ears[1].rotation.z = -0.38 - (st.sad ? 0.35 : 0) - (tr < 1 ? Math.sin(tr * Math.PI * 3) * 0.4 * (1 - tr) : 0);

      // Tail: a lazy sway, quicker when she's happy
      tailG.rotation.z = Math.sin(t * (happy ? 6 : 2.2)) * (happy ? 0.28 : 0.18);
      tailG.rotation.y = Math.sin(t * 1.3) * 0.2;

      // Whole-body moves
      var y = 0, rotY = sway, rotZ = 0, sx = 1, sy = 1;
      var j = since(st.jump, 0.8); if (j < 1) { y = Math.sin(j * Math.PI) * 0.9; sy = 1 + Math.sin(j * Math.PI * 2) * 0.06; }
      var h = since(st.hop, 0.6); if (h < 1) y = Math.max(y, Math.sin(h * Math.PI) * 0.35);
      var sh = since(st.shake, 0.5); if (sh < 1) rotZ = Math.sin(sh * Math.PI * 4) * 0.12 * (1 - sh);
      var nd = since(st.nod, 0.6); if (nd < 1) headG.rotation.x += Math.sin(nd * Math.PI) * 0.3;
      var dn = since(st.dance, 2); if (dn < 1) { rotZ = Math.sin(dn * Math.PI * 4) * 0.18; y = Math.abs(Math.sin(dn * Math.PI * 4)) * 0.3; rotY = Math.sin(dn * Math.PI * 2) * 0.6; }
      var sp = since(st.spin, 0.9); if (sp < 1) rotY = sway + ease(sp) * Math.PI * 2;
      if (st.dizzy) { var dz = t - st.dizzy; rotY = sway + dz * 7; rotZ = Math.sin(dz * 9) * 0.1; }
      var pj = st.purr ? Math.sin(t * 60) * 0.008 : 0;
      root.position.set(pj, y, 0);
      root.rotation.set(0, rotY, rotZ);
      root.scale.set(sx, sy, 1);
      renderer.render(scene, cam);
    }
    raf = requestAnimationFrame(frame);

    function resize() {
      var w = host.clientWidth, h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h); cam.aspect = w / h; cam.updateProjectionMatrix();
    }
    var ro = window.ResizeObserver ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(host);

    return {
      // x, y from -1 to 1 across her box: she looks there for a moment.
      look: function (x, y) { look.tx = Math.max(-1, Math.min(1, x)); look.ty = Math.max(-1, Math.min(1, y)); look.until = now() + 2.2; },
      destroy: function () {
        alive = false; cancelAnimationFrame(raf); mo.disconnect(); if (ro) ro.disconnect();
        scene.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
        renderer.dispose(); canvas.remove();
      }
    };
  }

  window.Mimi3D = { load: load, create: create };
})();

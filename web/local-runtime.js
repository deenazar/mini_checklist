/*
 * Local stand-in for the claude.ai artifact runtime, so Mimi Checklist runs in any browser.
 *
 * The app asks for services with `claude.use(name)`:
 *   - 'db'    a small document store (docs and collections, live onSnapshot), kept in localStorage
 *   - 'user'  a stable local user id for this browser
 *   - 'tts', 'dictation', 'sample'  resolve to null, so the app uses its own fallbacks:
 *     the browser's speech synthesis, SpeechRecognition (or the iPhone app's bridge),
 *     and Mimi's built-in local replies.
 *
 * Data stays in this browser only. Back it up from the console with `mimiLocal.exportData()`
 * and restore it with `mimiLocal.importData(json)`.
 */
(function () {
  'use strict';
  if (window.claude && typeof window.claude.use === 'function') return; // the real runtime is present

  var DOC_PREFIX = 'mimi-db:';
  var LOCK_PREFIX = 'mimi-lock:';
  var USER_KEY = 'mimi-user-id';
  var MAX_DOC_CHARS = 1500000; // about 1.5 MB per document (a profile photo fits; localStorage holds ~5 MB)

  function fail(code, message) { var e = new Error(message || code); e.code = code; return e; }
  function clean(path) { return String(path || '').replace(/^\/+|\/+$/g, ''); }
  function parentOf(path) { var i = path.lastIndexOf('/'); return i < 0 ? '' : path.slice(0, i); }
  function idOf(path) { return path.slice(path.lastIndexOf('/') + 1); }
  function copy(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }
  function later(fn) { return Promise.resolve().then(fn); }
  function newId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID().replace(/-/g, '').slice(0, 20);
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  function readDoc(path) {
    try { var s = localStorage.getItem(DOC_PREFIX + path); return s == null ? null : JSON.parse(s); }
    catch (e) { return null; }
  }
  function writeDoc(path, value) {
    var s = JSON.stringify(value);
    if (s.length > MAX_DOC_CHARS) throw fail('too_large', 'This item is too large to save.');
    try { localStorage.setItem(DOC_PREFIX + path, s); }
    catch (e) { throw fail('quota_exceeded', 'Browser storage is full.'); }
    notify(path);
  }
  function removeDoc(path) {
    try { localStorage.removeItem(DOC_PREFIX + path); } catch (e) {}
    notify(path);
  }
  function docPathsIn(collection) {
    var pre = DOC_PREFIX + collection + '/', out = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf(pre) === 0 && k.slice(pre.length).indexOf('/') < 0) out.push(k.slice(DOC_PREFIX.length));
    }
    return out;
  }

  /* ---------- Live listeners ---------- */
  var listeners = [];
  function notify(path) {
    listeners.forEach(function (l) {
      if (l.kind === 'doc' ? l.path === path : l.path === parentOf(path)) l.schedule();
    });
  }
  // Changes made in another tab of the same browser.
  window.addEventListener('storage', function (e) {
    if (e.key && e.key.indexOf(DOC_PREFIX) === 0) notify(e.key.slice(DOC_PREFIX.length));
    else if (e.key === null) listeners.forEach(function (l) { l.schedule(); }); // storage cleared
  });
  function listen(kind, path, makeSnapshot, onNext, onError) {
    var entry = { kind: kind, path: path, pending: false, active: true };
    entry.schedule = function () {
      if (entry.pending || !entry.active) return;
      entry.pending = true;
      setTimeout(function () {
        entry.pending = false;
        if (!entry.active) return;
        try { onNext(makeSnapshot()); } catch (e) { if (onError) onError(e); else console.error(e); }
      }, 0);
    };
    listeners.push(entry);
    entry.schedule();
    return function unsubscribe() {
      entry.active = false;
      listeners = listeners.filter(function (l) { return l !== entry; });
    };
  }

  /* ---------- Snapshots ---------- */
  function docSnapshot(path) {
    var data = readDoc(path);
    return { id: idOf(path), exists: data != null, data: function () { return copy(data); }, ref: docRef(path) };
  }
  function querySnapshot(docs) {
    return {
      docs: docs, size: docs.length, empty: docs.length === 0,
      metadata: { fromCache: false, hasPendingWrites: false },
      forEach: function (fn) { docs.forEach(fn); }
    };
  }

  /* ---------- References ---------- */
  function docRef(rawPath) {
    var path = clean(rawPath);
    if (!path || path.split('/').length % 2) throw fail('invalid_argument', 'A document path needs an even number of parts: ' + path);
    return {
      id: idOf(path), path: path,
      get: function () { return later(function () { return docSnapshot(path); }); },
      set: function (data) { return later(function () { writeDoc(path, copy(data) || {}); }); },
      update: function (fields) {
        return later(function () {
          var cur = readDoc(path);
          if (cur == null) throw fail('not_found', 'Nothing to update at ' + path);
          var next = Object.assign({}, cur, copy(fields));
          writeDoc(path, next);
        });
      },
      delete: function () { return later(function () { removeDoc(path); }); },
      onSnapshot: function (onNext, onError) {
        return listen('doc', path, function () { return docSnapshot(path); }, onNext, onError);
      },
      collection: function (sub) { return collectionRef(path + '/' + clean(sub)); },
      // A short lease so two tabs don't run the morning rollover at the same time.
      acquire: function (opts) {
        return later(function () {
          var holder = (opts && opts.holder) || newId(), ttl = (opts && opts.ttlMs) || 15000, now = Date.now(), key = LOCK_PREFIX + path;
          var cur = null;
          try { cur = JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) {}
          if (cur && cur.until > now && cur.holder !== holder) return { acquired: false, holder: cur.holder };
          try { localStorage.setItem(key, JSON.stringify({ holder: holder, until: now + ttl })); } catch (e) {}
          return {
            acquired: true, holder: holder,
            release: function () {
              return later(function () {
                try {
                  var c = JSON.parse(localStorage.getItem(key) || 'null');
                  if (c && c.holder === holder) localStorage.removeItem(key);
                } catch (e) {}
              });
            }
          };
        });
      }
    };
  }

  function compare(a, b) {
    if (a === b) return 0;
    if (a == null) return -1;
    if (b == null) return 1;
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    return String(a) < String(b) ? -1 : 1;
  }

  function collectionRef(rawPath, order, max) {
    var path = clean(rawPath);
    if (!path || path.split('/').length % 2 === 0) throw fail('invalid_argument', 'A collection path needs an odd number of parts: ' + path);
    order = order || [];
    function run() {
      var docs = docPathsIn(path).map(docSnapshot).filter(function (s) { return s.exists; });
      docs.sort(function (x, y) {
        for (var i = 0; i < order.length; i++) {
          var f = order[i].field, c = compare((x.data() || {})[f], (y.data() || {})[f]);
          if (c) return order[i].desc ? -c : c;
        }
        return compare(x.id, y.id);
      });
      if (typeof max === 'number') docs = docs.slice(0, max);
      return querySnapshot(docs);
    }
    return {
      id: idOf(path), path: path,
      doc: function (id) { return docRef(path + '/' + (id == null ? newId() : clean(id))); },
      add: function (data) {
        var ref = docRef(path + '/' + newId());
        return ref.set(data).then(function () { return ref; });
      },
      orderBy: function (field, dir) {
        return collectionRef(path, order.concat([{ field: field, desc: String(dir).toLowerCase() === 'desc' }]), max);
      },
      limit: function (n) { return collectionRef(path, order, n); },
      get: function () { return later(run); },
      onSnapshot: function (onNext, onError) { return listen('collection', path, run, onNext, onError); }
    };
  }

  var db = {
    doc: docRef,
    collection: collectionRef
  };

  /* ---------- User ---------- */
  function localUserId() {
    var id = null;
    try { id = localStorage.getItem(USER_KEY); } catch (e) {}
    if (!id) {
      id = 'local-' + newId();
      try { localStorage.setItem(USER_KEY, id); } catch (e) {}
    }
    return id;
  }
  var user = {
    id: function () { return Promise.resolve(localUserId()); },
    me: function () { return Promise.resolve({ id: localUserId(), name: '', avatarUrl: '' }); }
  };

  window.claude = {
    local: true,
    use: function (name) {
      if (name === 'db') return Promise.resolve(db);
      if (name === 'user') return Promise.resolve(user);
      return Promise.resolve(null); // tts, dictation, sample: the app falls back on its own
    }
  };

  /* ---------- Backup helpers (run in the browser console) ---------- */
  window.mimiLocal = {
    exportData: function () {
      var out = {};
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf(DOC_PREFIX) === 0) out[k.slice(DOC_PREFIX.length)] = readDoc(k.slice(DOC_PREFIX.length));
      }
      return JSON.stringify({ app: 'mimi-checklist', version: 1, user: localUserId(), docs: out });
    },
    importData: function (json) {
      var data = typeof json === 'string' ? JSON.parse(json) : json;
      if (!data || data.app !== 'mimi-checklist' || !data.docs) throw new Error('Not a Mimi Checklist backup.');
      if (data.user) { try { localStorage.setItem(USER_KEY, data.user); } catch (e) {} }
      Object.keys(data.docs).forEach(function (p) { writeDoc(clean(p), data.docs[p]); });
      return Object.keys(data.docs).length + ' items restored. Reload the page to see them all.';
    }
  };
})();

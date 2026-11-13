/*
 * Local stand-in for the claude.ai artifact runtime, so Mimi Checklist runs in any browser
 * and inside the iPhone app.
 *
 * The app asks for services with `claude.use(name)`:
 *   - 'db'    a small document store (docs and collections, live onSnapshot), kept on this device
 *   - 'user'  a stable local user id for this device
 *   - 'tts', 'dictation', 'sample'  resolve to null, so the app uses its own fallbacks:
 *     the browser's speech synthesis, SpeechRecognition (or the iPhone app's bridge),
 *     and Mimi's built-in local replies.
 *
 * Where data is kept:
 *   - in a browser: localStorage, for this browser only;
 *   - in the iPhone app: a file inside the app. Each time the page loads it asks the app for the saved
 *     data (`mimiStore` handler, cmd 'load'), then sends every change back (cmd 'set' / 'remove').
 *     iOS can clear a web view's localStorage, but not the app's own files. If loading fails,
 *     the database is not offered at all, so nothing can overwrite the saved data.
 *
 * Backups: Settings › Backup, or `mimiLocal.exportData()` / `mimiLocal.importData(json)` (both return Promises).
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

  /* ---------- Storage backend ---------- */
  var nativeHandler = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.mimiStore;
  var store, ready, loadFailed = false;
  if (nativeHandler) {
    // iPhone app: keep everything in memory and send each change to the app, which saves it to a file.
    var mem = Object.create(null);
    store = {
      kind: 'app',
      get: function (k) { return k in mem ? mem[k] : null; },
      set: function (k, v) {
        if (loadFailed) throw fail('unavailable', 'Saved data could not be loaded.');
        mem[k] = String(v);
        nativeHandler.postMessage({ cmd: 'set', key: k, value: String(v) });
      },
      remove: function (k) {
        if (loadFailed || !(k in mem)) return;
        delete mem[k];
        nativeHandler.postMessage({ cmd: 'remove', key: k });
      },
      keys: function () { return Object.keys(mem); }
    };
    ready = Promise.resolve()
      .then(function () { return nativeHandler.postMessage({ cmd: 'load' }); })
      .then(function (json) {
        var data = typeof json === 'string' ? JSON.parse(json) : json;
        if (!data || typeof data !== 'object') throw new Error('No saved data was returned.');
        Object.keys(data).forEach(function (k) { if (typeof data[k] === 'string') mem[k] = data[k]; });
      })
      .catch(function (e) { loadFailed = true; console.error('Mimi: saved data could not be loaded', e); });
  } else {
    store = {
      kind: 'browser',
      get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
      set: function (k, v) { localStorage.setItem(k, v); },
      remove: function (k) { try { localStorage.removeItem(k); } catch (e) {} },
      keys: function () {
        var out = [];
        try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k != null) out.push(k); } } catch (e) {}
        return out;
      }
    };
    ready = Promise.resolve();
  }

  function readDoc(path) {
    try { var s = store.get(DOC_PREFIX + path); return s == null ? null : JSON.parse(s); }
    catch (e) { return null; }
  }
  function writeDoc(path, value) {
    var s = JSON.stringify(value);
    if (s.length > MAX_DOC_CHARS) throw fail('too_large', 'This item is too large to save.');
    try { store.set(DOC_PREFIX + path, s); }
    catch (e) { throw e && e.code ? e : fail('quota_exceeded', 'Storage is full.'); }
    notify(path);
  }
  function removeDoc(path) {
    store.remove(DOC_PREFIX + path);
    notify(path);
  }
  function docPathsIn(collection) {
    var pre = DOC_PREFIX + collection + '/';
    return store.keys().filter(function (k) {
      return k.indexOf(pre) === 0 && k.slice(pre.length).indexOf('/') < 0;
    }).map(function (k) { return k.slice(DOC_PREFIX.length); });
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
    if (store.kind !== 'browser') return;
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
          writeDoc(path, Object.assign({}, cur, copy(fields)));
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
          try { cur = JSON.parse(store.get(key) || 'null'); } catch (e) {}
          if (cur && cur.until > now && cur.holder !== holder) return { acquired: false, holder: cur.holder };
          try { store.set(key, JSON.stringify({ holder: holder, until: now + ttl })); } catch (e) {}
          return {
            acquired: true, holder: holder,
            release: function () {
              return later(function () {
                try {
                  var c = JSON.parse(store.get(key) || 'null');
                  if (c && c.holder === holder) store.remove(key);
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

  var db = { doc: docRef, collection: collectionRef };

  /* ---------- User ---------- */
  function localUserId() {
    var id = store.get(USER_KEY);
    if (!id) {
      id = 'local-' + newId();
      try { store.set(USER_KEY, id); } catch (e) {}
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
      if (name === 'db') return ready.then(function () { return loadFailed ? null : db; });
      if (name === 'user') return ready.then(function () { return loadFailed ? null : user; });
      return Promise.resolve(null); // tts, dictation, sample: the app falls back on its own
    }
  };

  /* ---------- Backups (Settings › Backup, or the console) ---------- */
  function isBackup(data) { return !!(data && data.app === 'mimi-checklist' && data.docs && typeof data.docs === 'object'); }

  function exportNow() {
    if (loadFailed) throw fail('unavailable', 'Saved data could not be loaded.');
    var out = {};
    store.keys().forEach(function (k) {
      if (k.indexOf(DOC_PREFIX) === 0) out[k.slice(DOC_PREFIX.length)] = readDoc(k.slice(DOC_PREFIX.length));
    });
    return JSON.stringify({ app: 'mimi-checklist', version: 1, exportedAt: new Date().toISOString(), user: localUserId(), docs: out });
  }

  function importNow(json) {
    if (loadFailed) throw fail('unavailable', 'Saved data could not be loaded.');
    var data = typeof json === 'string' ? JSON.parse(json) : json;
    if (!isBackup(data)) throw new Error('This file isn’t a Mimi Checklist backup.');
    var paths = Object.keys(data.docs).filter(function (p) {
      var c = clean(p);
      return c && c === p && c.split('/').length % 2 === 0 && data.docs[p] && typeof data.docs[p] === 'object';
    });
    // Private items (notes, profile, vault) live under the user id, so take over the backup's id.
    if (typeof data.user === 'string' && /^[A-Za-z0-9_\-.~:@+]{1,200}$/.test(data.user)) store.set(USER_KEY, data.user);
    paths.forEach(function (p) { writeDoc(p, copy(data.docs[p])); });
    return paths.length;
  }

  /* ---------- Changes from Google sync (iPhone app) ----------
     The app merged newer items from another device; update memory and live views without sending them back. */
  window.__mimiStoreApply = function (changes) {
    if (store.kind !== 'app' || !changes || typeof changes !== 'object') return;
    Object.keys(changes).forEach(function (k) {
      var v = changes[k];
      if (v === null) delete mem[k]; else if (typeof v === 'string') mem[k] = v; else return;
      if (k.indexOf(DOC_PREFIX) === 0) notify(k.slice(DOC_PREFIX.length));
    });
  };

  var FLAG_PREFIX = 'mimi-flag:';

  // Taken right after the saved data loads and before app.js runs (this reaction is registered first), so
  // the app's own first write (today's empty day) can't make a brand-new install look like an existing one.
  var hadDataAtStart = ready.then(function () {
    return store.keys().some(function (k) { return k.indexOf(DOC_PREFIX) === 0; });
  });

  window.mimiLocal = {
    storage: store.kind, // 'browser' or 'app'
    /** Reads a small saved flag, or saves it when a value is given (not synced). Returns a Promise. */
    flag: function (name, value) {
      var write = arguments.length > 1;
      return ready.then(function () {
        var k = FLAG_PREFIX + name;
        if (write) { try { store.set(k, String(value)); } catch (e) {} return String(value); }
        return store.get(k);
      });
    },
    /** False when the app's saved data couldn't be read (then nothing is saved either). */
    healthy: function () { return ready.then(function () { return !loadFailed; }); },
    /** True when there was saved checklist data on this device when the page started. */
    hasData: function () { return hadDataAtStart; },
    /** Resolves to the backup as a JSON string. */
    exportData: function () { return ready.then(exportNow); },
    /** Adds the backup's items, replacing items with the same path. Resolves to how many were restored. */
    importData: function (json) { return ready.then(function () { return importNow(json); }); },
    isBackup: isBackup
  };
})();

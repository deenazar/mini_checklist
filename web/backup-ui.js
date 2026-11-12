/*
 * Settings › Backup: export everything to a file, and restore a backup file
 * (including the one made from the old claude.ai checklist).
 * Uses window.mimiLocal from local-runtime.js. In the iPhone app, export opens the share sheet.
 */
(function () {
  'use strict';
  var L = window.mimiLocal;
  var body = document.querySelector('#ssheet .sbody');
  if (!L || !body) return;

  function toast(msg, isErr) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.toggle('err', !!isErr);
    t.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () { t.classList.remove('show'); }, 3200);
  }

  function row(label, sub, onClick) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'srow link';
    var s = document.createElement('span');
    s.textContent = label;
    if (sub) { var sm = document.createElement('small'); sm.className = 'ssub'; sm.textContent = sub; s.appendChild(sm); }
    b.appendChild(s);
    b.appendChild(document.createElement('b'));
    b.addEventListener('click', onClick);
    return b;
  }

  var where = L.storage === 'app' ? 'Saved on this iPhone, inside the app' : 'Saved in this browser';
  var grp = document.createElement('div');
  grp.className = 'sgrp';
  grp.id = 'sBackupGrp';
  var h = document.createElement('h4');
  h.textContent = 'Backup';
  grp.appendChild(h);

  var file = document.createElement('input');
  file.type = 'file';
  file.accept = '.json,application/json,text/plain';
  file.hidden = true;
  grp.appendChild(file);

  grp.appendChild(row('Export a backup', where + '. Save a copy to Files or send it to yourself.', exportBackup));
  grp.appendChild(row('Restore from a backup', 'Also brings in your old claude.ai checklist backup.', function () { file.value = ''; file.click(); }));

  // Put the group just above the closing note.
  var note = body.querySelector(':scope > p.wnote');
  body.insertBefore(grp, note || null);

  function fileName() {
    var d = new Date(), p = function (n) { return String(n).padStart(2, '0'); };
    return 'mimi-checklist-backup-' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()) + '.json';
  }

  function exportBackup() {
    L.exportData().then(saveBackup, function () { toast('Couldn’t make a backup right now.', true); });
  }

  function saveBackup(json) {
    var name = fileName();
    var N = window.mimiNative;
    if (N && typeof N.share === 'function') { N.share(name, json); return; }
    try {
      var url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      var a = document.createElement('a');
      a.href = url; a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      toast('Backup saved: ' + name);
    } catch (e) {
      toast('Couldn’t save the backup here.', true);
    }
  }

  file.addEventListener('change', function () {
    var f = file.files && file.files[0];
    if (!f) return;
    if (f.size > 20 * 1024 * 1024) { toast('That file is too large to be a backup.', true); return; }
    var r = new FileReader();
    r.onload = function () {
      var data;
      try { data = JSON.parse(String(r.result)); } catch (e) { toast('That file isn’t a Mimi Checklist backup.', true); return; }
      if (!L.isBackup(data)) { toast('That file isn’t a Mimi Checklist backup.', true); return; }
      var count = Object.keys(data.docs).length;
      var when = data.exportedAt ? ' from ' + new Date(data.exportedAt).toLocaleString() : '';
      if (!confirm('Restore ' + count + ' items' + when + '?\n\nDays, lists, notes and settings in the backup replace the same ones here. Everything else stays.')) return;
      L.importData(data).then(function (n) {
        toast(n + ' items restored.');
        setTimeout(function () { location.reload(); }, 900);
      }, function (e) {
        toast(e && e.code === 'quota_exceeded' ? 'Storage is full, so the backup couldn’t be restored.' : (e && e.message) || 'Couldn’t restore that backup.', true);
      });
    };
    r.onerror = function () { toast('Couldn’t read that file.', true); };
    r.readAsText(f);
  });
})();

(function () {
  'use strict';

  var PIN_HASH = 'b6c7470ca0e1b2126ca179990624575fd44cc6506bfc544022970fe83b74ebdf';

  var GRADE_KEYS = ['중1', '중2', '중3', '고1', '고2', '고3'];

  var db;

  function init() {
    var cfg = window.SPORTS_SYNC_CONFIG.firebase;
    var app;
    try { app = firebase.app('members'); }
    catch (e) { app = firebase.initializeApp(cfg, 'members'); }
    db = firebase.database(app);
    renderShell();
    GRADE_KEYS.forEach(listenGrade);
  }

  function renderShell() {
    var root = document.getElementById('members-roster-root');
    if (!root) return;

    var midCols = ['중1', '중2', '중3'].map(gradeBlockHtml).join('');
    var highCols = ['고1', '고2', '고3'].map(gradeBlockHtml).join('');

    root.innerHTML =
      '<div class="members-grid">' +
        '<div class="members-col">' +
          '<div class="members-col-head">중학교</div>' +
          midCols +
        '</div>' +
        '<div class="members-col">' +
          '<div class="members-col-head">고등학교</div>' +
          highCols +
        '</div>' +
      '</div>';

    root.querySelectorAll('[data-add-grade]').forEach(function (btn) {
      btn.addEventListener('click', function () { openAdd(btn.dataset.addGrade); });
    });
  }

  function gradeBlockHtml(grade) {
    var id = gradeId(grade);
    return '<div class="members-grade-block">' +
      '<div class="members-grade-head">' +
        '<span class="members-grade-label">' + grade + '</span>' +
        '<span class="members-grade-count" id="mcnt-' + id + '">0명</span>' +
        '<button class="members-add-btn" data-add-grade="' + grade + '" title="추가">+</button>' +
      '</div>' +
      '<div class="members-chips" id="mchips-' + id + '"><span class="member-empty">없음</span></div>' +
    '</div>';
  }

  function gradeId(grade) {
    return grade.replace(/\s+/g, '');
  }

  function listenGrade(grade) {
    var id = gradeId(grade);
    db.ref('members/' + grade).on('value', function (snap) {
      var chips = document.getElementById('mchips-' + id);
      var cnt   = document.getElementById('mcnt-'   + id);
      if (!chips) return;

      chips.innerHTML = '';
      var val = snap.val();
      var count = 0;

      if (val) {
        Object.keys(val).sort(function (a, b) {
          return val[a].name.localeCompare(val[b].name, 'ko');
        }).forEach(function (key) {
          count++;
          var chip = document.createElement('span');
          chip.className = 'member-chip';
          chip.innerHTML =
            '<span class="member-name">' + escHtml(val[key].name) + '</span>' +
            '<button class="member-del-btn" aria-label="삭제">×</button>';
          chip.querySelector('.member-del-btn').addEventListener('click', function () {
            confirmDel(grade, key, val[key].name);
          });
          chips.appendChild(chip);
        });
      }

      if (count === 0) chips.innerHTML = '<span class="member-empty">없음</span>';
      if (cnt) cnt.textContent = count + '명';
    });
  }

  function openAdd(grade) {
    var name = prompt(grade + ' 학생 이름을 입력하세요:');
    if (!name) return;
    name = name.trim();
    if (!name) return;
    db.ref('members/' + grade).push({ name: name })
      .catch(function (err) { alert('추가 실패: ' + err.message); });
  }

  function confirmDel(grade, key, name) {
    var pin = prompt('"' + name + '"을(를) 삭제하려면 핀코드를 입력하세요:');
    if (!pin) return;
    hashPin(pin).then(function (hash) {
      if (hash !== PIN_HASH) { alert('핀코드가 틀렸습니다.'); return; }
      db.ref('members/' + grade + '/' + key).remove()
        .catch(function (err) { alert('삭제 실패: ' + err.message); });
    });
  }

  function hashPin(pin) {
    var enc = new TextEncoder();
    return crypto.subtle.digest('SHA-256', enc.encode(pin)).then(function (buf) {
      return Array.from(new Uint8Array(buf))
        .map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    });
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  document.addEventListener('DOMContentLoaded', init);
})();

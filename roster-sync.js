(function () {
  'use strict';

  var PIN_HASH = 'b6c7470ca0e1b2126ca179990624575fd44cc6506bfc544022970fe83b74ebdf';
  var GRADE_KEYS = ['중1', '중2', '중3', '고1', '고2', '고3'];
  var FIELDS = ['name', 'phone', 'birthday', 'school', 'address'];

  var db;
  var editing = null; // { grade, key } or null when adding

  function init() {
    var cfg = window.SPORTS_SYNC_CONFIG.firebase;
    var app;
    try { app = firebase.app('members'); }
    catch (e) { app = firebase.initializeApp(cfg, 'members'); }
    db = firebase.database(app);
    renderShell();
    bindModal();
    GRADE_KEYS.forEach(listenGrade);
  }

  function renderShell() {
    var root = document.getElementById('roster-root');
    if (!root) return;

    var midCols = ['중1', '중2', '중3'].map(gradeBlockHtml).join('');
    var highCols = ['고1', '고2', '고3'].map(gradeBlockHtml).join('');

    root.innerHTML =
      '<div class="roster-grid">' +
        '<div class="roster-col">' +
          '<div class="roster-col-head">중학교</div>' +
          midCols +
        '</div>' +
        '<div class="roster-col">' +
          '<div class="roster-col-head">고등학교</div>' +
          highCols +
        '</div>' +
      '</div>';

    root.querySelectorAll('[data-add-grade]').forEach(function (btn) {
      btn.addEventListener('click', function () { openAdd(btn.dataset.addGrade); });
    });
  }

  function gradeBlockHtml(grade) {
    var id = gradeId(grade);
    return '<div class="roster-grade-block">' +
      '<div class="roster-grade-head">' +
        '<span class="roster-grade-label">' + grade + '</span>' +
        '<span class="roster-grade-count" id="rcnt-' + id + '">0명</span>' +
        '<button class="roster-add-btn" data-add-grade="' + grade + '" title="추가">+</button>' +
      '</div>' +
      '<div class="roster-chips" id="rchips-' + id + '"><span class="roster-empty">없음</span></div>' +
    '</div>';
  }

  function gradeId(grade) {
    return grade.replace(/\s+/g, '');
  }

  function listenGrade(grade) {
    var id = gradeId(grade);
    db.ref('members/' + grade).on('value', function (snap) {
      var chips = document.getElementById('rchips-' + id);
      var cnt   = document.getElementById('rcnt-'   + id);
      if (!chips) return;

      chips.innerHTML = '';
      var val = snap.val();
      var count = 0;

      if (val) {
        Object.keys(val).sort(function (a, b) {
          return (val[a].name || '').localeCompare(val[b].name || '', 'ko');
        }).forEach(function (key) {
          count++;
          chips.appendChild(buildChip(grade, key, val[key]));
        });
      }

      if (count === 0) chips.innerHTML = '<span class="roster-empty">없음</span>';
      if (cnt) cnt.textContent = count + '명';
    });
  }

  function buildChip(grade, key, data) {
    var wrap = document.createElement('div');
    wrap.className = 'roster-chip-wrap';

    var chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'roster-chip';
    chip.innerHTML = '<span class="roster-chip-name">' + escHtml(data.name || '(이름 없음)') + '</span>';

    var detail = document.createElement('div');
    detail.className = 'roster-detail';
    detail.hidden = true;
    detail.innerHTML =
      detailRow('전화번호', data.phone) +
      detailRow('생일', data.birthday) +
      detailRow('학교', data.school) +
      detailRow('주소', data.address) +
      '<div class="roster-detail-actions">' +
        '<button type="button" class="roster-edit-btn">수정</button>' +
        '<button type="button" class="roster-del-btn">삭제</button>' +
      '</div>';

    chip.addEventListener('click', function () {
      var willOpen = detail.hidden;
      wrap.parentElement.querySelectorAll('.roster-detail').forEach(function (d) { d.hidden = true; });
      wrap.parentElement.querySelectorAll('.roster-chip').forEach(function (c) { c.classList.remove('open'); });
      detail.hidden = !willOpen;
      chip.classList.toggle('open', willOpen);
    });

    detail.querySelector('.roster-edit-btn').addEventListener('click', function () {
      openEdit(grade, key, data);
    });
    detail.querySelector('.roster-del-btn').addEventListener('click', function () {
      confirmDel(grade, key, data.name);
    });

    wrap.appendChild(chip);
    wrap.appendChild(detail);
    return wrap;
  }

  function detailRow(label, value) {
    return '<div class="roster-detail-row">' +
      '<span class="roster-detail-label">' + label + '</span>' +
      '<span class="roster-detail-value">' + (value ? escHtml(value) : '<span class="roster-detail-empty">-</span>') + '</span>' +
    '</div>';
  }

  function bindModal() {
    var modal = document.getElementById('roster-modal');
    if (!modal) return;

    document.getElementById('roster-modal-cancel').addEventListener('click', closeModal);
    document.getElementById('roster-modal-backdrop').addEventListener('click', closeModal);
    document.getElementById('roster-modal-form').addEventListener('submit', function (e) {
      e.preventDefault();
      saveModal();
    });
  }

  function openAdd(grade) {
    editing = null;
    document.getElementById('roster-modal-title').textContent = '학생 추가';
    document.getElementById('rf-grade').value = grade;
    FIELDS.forEach(function (f) {
      var el = document.getElementById('rf-' + f);
      if (el) el.value = '';
    });
    showModal();
  }

  function openEdit(grade, key, data) {
    editing = { grade: grade, key: key };
    document.getElementById('roster-modal-title').textContent = '학생 정보 수정';
    document.getElementById('rf-grade').value = grade;
    FIELDS.forEach(function (f) {
      var el = document.getElementById('rf-' + f);
      if (el) el.value = data[f] || '';
    });
    showModal();
  }

  function showModal() {
    document.getElementById('roster-modal').classList.add('open');
    document.getElementById('rf-name').focus();
  }

  function closeModal() {
    document.getElementById('roster-modal').classList.remove('open');
    editing = null;
  }

  function saveModal() {
    var grade = document.getElementById('rf-grade').value;
    var record = {};
    FIELDS.forEach(function (f) {
      record[f] = document.getElementById('rf-' + f).value.trim();
    });

    if (!record.name) {
      alert('이름을 입력하세요.');
      return;
    }

    if (!editing) {
      db.ref('members/' + grade).push(record)
        .then(closeModal)
        .catch(function (err) { alert('추가 실패: ' + err.message); });
      return;
    }

    if (editing.grade === grade) {
      db.ref('members/' + grade + '/' + editing.key).update(record)
        .then(closeModal)
        .catch(function (err) { alert('수정 실패: ' + err.message); });
    } else {
      db.ref('members/' + grade).push(record)
        .then(function () {
          return db.ref('members/' + editing.grade + '/' + editing.key).remove();
        })
        .then(closeModal)
        .catch(function (err) { alert('수정 실패: ' + err.message); });
    }
  }

  function confirmDel(grade, key, name) {
    var pin = prompt('"' + (name || '이 학생') + '"을(를) 삭제하려면 핀코드를 입력하세요:');
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

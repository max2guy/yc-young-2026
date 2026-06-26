(function () {
  'use strict';

  var PIN_HASH = 'b6c7470ca0e1b2126ca179990624575fd44cc6506bfc544022970fe83b74ebdf';

  var SECTIONS = {
    retreat: { rtdbPath: 'uploads/plans',   label: '계획서' },
    reports: { rtdbPath: 'uploads/reports', label: '행사 보고서' },
    budget:  { rtdbPath: 'uploads/budget',  label: '예산 및 결산' }
  };

  var db, storage;

  function init() {
    var cfg = window.SPORTS_SYNC_CONFIG.firebase;
    var app;
    try {
      app = firebase.app('upload');
    } catch (e) {
      app = firebase.initializeApp(cfg, 'upload');
    }
    db      = firebase.database(app);
    storage = firebase.storage(app);

    Object.keys(SECTIONS).forEach(function (key) {
      listenSection(key);
    });

    attachUploadButtons();
  }

  function listenSection(sectionKey) {
    var path = SECTIONS[sectionKey].rtdbPath;
    db.ref(path).on('value', function (snap) {
      var container = document.getElementById('upload-cards-' + sectionKey);
      if (!container) return;
      container.innerHTML = '';
      var val = snap.val();
      if (!val) return;
      Object.keys(val).forEach(function (id) {
        container.appendChild(buildCard(sectionKey, id, val[id]));
      });
    });
  }

  function buildCard(sectionKey, id, item) {
    var a = document.createElement('a');
    a.className = 'resource-card uploaded-card';
    a.href = 'pdf-viewer.html?file=' + encodeURIComponent(item.url) + '&title=' + encodeURIComponent(item.title);
    a.innerHTML =
      '<span class="tag">PDF</span>' +
      '<h3>' + escHtml(item.title) + '</h3>' +
      '<div class="resource-meta">열기 →</div>' +
      '<button class="upload-delete-btn" title="삭제">×</button>';

    a.querySelector('.upload-delete-btn').addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      confirmDelete(sectionKey, id, item.storagePath);
    });
    return a;
  }

  function attachUploadButtons() {
    document.querySelectorAll('[data-upload-section]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openUploadModal(btn.dataset.uploadSection);
      });
    });
  }

  function openUploadModal(sectionKey) {
    var overlay = document.getElementById('upload-modal-overlay');
    var modal   = document.getElementById('upload-modal');
    modal.dataset.section = sectionKey;
    modal.querySelector('.upload-modal-title').textContent =
      SECTIONS[sectionKey].label + ' — 파일 추가';
    modal.querySelector('#upload-title-input').value = '';
    modal.querySelector('#upload-file-input').value  = '';
    modal.querySelector('.upload-progress').style.width = '0%';
    modal.querySelector('.upload-status').textContent   = '';
    modal.querySelector('.upload-submit-btn').disabled  = false;
    overlay.classList.add('open');
  }

  function closeUploadModal() {
    document.getElementById('upload-modal-overlay').classList.remove('open');
  }

  function handleUpload() {
    var modal   = document.getElementById('upload-modal');
    var section = modal.dataset.section;
    var title   = modal.querySelector('#upload-title-input').value.trim();
    var fileEl  = modal.querySelector('#upload-file-input');
    var file    = fileEl.files[0];

    if (!title) { alert('제목을 입력해 주세요.'); return; }
    if (!file)  { alert('파일을 선택해 주세요.'); return; }
    if (file.type !== 'application/pdf') { alert('PDF 파일만 업로드할 수 있습니다.'); return; }

    var btn = modal.querySelector('.upload-submit-btn');
    btn.disabled = true;

    var storagePath = 'uploads/' + section + '/' + Date.now() + '_' + file.name;
    var ref  = storage.ref(storagePath);
    var task = ref.put(file);
    var progress = modal.querySelector('.upload-progress');
    var status   = modal.querySelector('.upload-status');

    task.on('state_changed',
      function (snap) {
        var pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        progress.style.width = pct + '%';
        status.textContent   = pct + '%';
      },
      function (err) {
        status.textContent = '업로드 실패: ' + err.message;
        btn.disabled = false;
      },
      function () {
        task.snapshot.ref.getDownloadURL().then(function (url) {
          db.ref(SECTIONS[section].rtdbPath).push({
            title:       title,
            url:         url,
            storagePath: storagePath,
            date:        Date.now()
          });
          status.textContent = '완료!';
          setTimeout(closeUploadModal, 800);
        });
      }
    );
  }

  function confirmDelete(sectionKey, id, storagePath) {
    var pin = prompt('삭제하려면 핀코드를 입력하세요:');
    if (!pin) return;
    hashPin(pin).then(function (hash) {
      if (hash !== PIN_HASH) { alert('핀코드가 틀렸습니다.'); return; }
      if (storagePath) storage.ref(storagePath).delete().catch(function () {});
      db.ref(SECTIONS[sectionKey].rtdbPath + '/' + id).remove();
    });
  }

  function hashPin(pin) {
    var encoder = new TextEncoder();
    return crypto.subtle.digest('SHA-256', encoder.encode(pin)).then(function (buf) {
      return Array.from(new Uint8Array(buf)).map(function (b) {
        return b.toString(16).padStart(2, '0');
      }).join('');
    });
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  document.addEventListener('DOMContentLoaded', function () {
    init();
    document.getElementById('upload-modal-close').addEventListener('click', closeUploadModal);
    document.getElementById('upload-modal-overlay').addEventListener('click', function (e) {
      if (e.target === this) closeUploadModal();
    });
    document.querySelector('.upload-submit-btn').addEventListener('click', handleUpload);
  });
})();

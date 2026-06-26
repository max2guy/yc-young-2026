# File Upload Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 계획서·행사 보고서·예산 및 결산 섹션에서 누구나 PDF를 업로드하고, PIN 코드 입력 시 삭제할 수 있는 기능 구현

**Architecture:** Firebase Storage(파일 저장) + RTDB(메타데이터) 조합. `upload-sync.js`가 업로드/삭제/렌더 로직 전담. `index.html`에 섹션별 업로드 버튼과 동적 카드 컨테이너 추가.

**Tech Stack:** Firebase compat v10.7.1 (Storage + Database), Web Crypto API (PIN 해시), 순수 HTML/CSS/JS

---

## File Map

| 파일 | 역할 |
|------|------|
| `upload-sync.js` (신규) | 업로드·삭제·RTDB 렌더링·PIN 검증 |
| `index.html` (수정) | Storage SDK 추가, 업로드 버튼·모달·동적 컨테이너 삽입 |
| Firebase Console | Storage 버킷 규칙 설정 (read/write 공개) |

**RTDB 경로:**
```
uploads/
  plans/    {pushId}: { title, url, storagePath, date }
  reports/  {pushId}: { title, url, storagePath, date }
  budget/   {pushId}: { title, url, storagePath, date }
```

---

## Task 1: Firebase Storage 규칙 설정

Firebase Console에서 Storage 버킷 규칙을 공개 읽기/쓰기로 설정한다.

- [ ] **Step 1: Firebase Console 접속**

  https://console.firebase.google.com → 프로젝트 `yc-young-2026-sync` → Storage → Rules

- [ ] **Step 2: 규칙 교체**

  ```
  rules_version = '2';
  service firebase.storage {
    match /b/{bucket}/o {
      match /uploads/{allPaths=**} {
        allow read, write: if true;
      }
    }
  }
  ```

- [ ] **Step 3: 게시(Publish) 클릭 후 저장 확인**

---

## Task 2: upload-sync.js 생성

업로드·삭제·렌더 로직 전담 파일. Firebase 앱은 이미 index.html에서 초기화돼 있으므로 `firebase.storage()`를 직접 사용.

- [ ] **Step 1: 파일 생성 — `/yc-young-2026/upload-sync.js`**

```javascript
(function () {
  'use strict';

  // PIN SHA-256 해시 (원문 노출 방지)
  var PIN_HASH = 'b6c7470ca0e1b2126ca179990624575fd44cc6506bfc544022970fe83b74ebdf';

  var SECTIONS = {
    retreat: { rtdbPath: 'uploads/plans',   label: '계획서' },
    reports: { rtdbPath: 'uploads/reports', label: '행사 보고서' },
    budget:  { rtdbPath: 'uploads/budget',  label: '예산 및 결산' }
  };

  var db, storage;

  // ── 초기화 ──────────────────────────────────────────────
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

  // ── RTDB 실시간 렌더링 ───────────────────────────────────
  function listenSection(sectionKey) {
    var path = SECTIONS[sectionKey].rtdbPath;
    db.ref(path).on('value', function (snap) {
      var container = document.getElementById('upload-cards-' + sectionKey);
      if (!container) return;
      container.innerHTML = '';
      var val = snap.val();
      if (!val) return;
      Object.keys(val).forEach(function (id) {
        var item = val[id];
        container.appendChild(buildCard(sectionKey, id, item));
      });
    });
  }

  function buildCard(sectionKey, id, item) {
    var a = document.createElement('a');
    a.className = 'resource-card uploaded-card';
    a.href = item.url;
    a.target = '_blank';
    a.rel = 'noreferrer';
    a.innerHTML =
      '<span class="tag">PDF</span>' +
      '<h3>' + escHtml(item.title) + '</h3>' +
      '<div class="resource-meta">열기 →</div>' +
      '<button class="upload-delete-btn" title="삭제" data-section="' + sectionKey + '" data-id="' + id + '" data-path="' + escHtml(item.storagePath) + '">×</button>';

    a.querySelector('.upload-delete-btn').addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      confirmDelete(sectionKey, id, item.storagePath);
    });
    return a;
  }

  // ── 업로드 버튼 클릭 처리 ────────────────────────────────
  function attachUploadButtons() {
    document.querySelectorAll('[data-upload-section]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openUploadModal(btn.dataset.uploadSection);
      });
    });
  }

  // ── 모달 ─────────────────────────────────────────────────
  function openUploadModal(sectionKey) {
    var modal = document.getElementById('upload-modal');
    modal.dataset.section = sectionKey;
    modal.querySelector('.upload-modal-title').textContent =
      SECTIONS[sectionKey].label + ' — 파일 추가';
    modal.querySelector('#upload-title-input').value = '';
    modal.querySelector('#upload-file-input').value = '';
    modal.querySelector('.upload-progress').style.width = '0%';
    modal.querySelector('.upload-status').textContent = '';
    modal.querySelector('.upload-submit-btn').disabled = false;
    modal.classList.add('open');
  }

  function closeUploadModal() {
    document.getElementById('upload-modal').classList.remove('open');
  }

  function handleUpload() {
    var modal    = document.getElementById('upload-modal');
    var section  = modal.dataset.section;
    var title    = modal.querySelector('#upload-title-input').value.trim();
    var fileEl   = modal.querySelector('#upload-file-input');
    var file     = fileEl.files[0];

    if (!title) { alert('제목을 입력해 주세요.'); return; }
    if (!file)  { alert('파일을 선택해 주세요.'); return; }
    if (file.type !== 'application/pdf') { alert('PDF 파일만 업로드할 수 있습니다.'); return; }

    var btn = modal.querySelector('.upload-submit-btn');
    btn.disabled = true;

    var path     = 'uploads/' + section + '/' + Date.now() + '_' + file.name;
    var ref      = storage.ref(path);
    var task     = ref.put(file);
    var progress = modal.querySelector('.upload-progress');
    var status   = modal.querySelector('.upload-status');

    task.on('state_changed',
      function (snap) {
        var pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        progress.style.width = pct + '%';
        status.textContent = pct + '%';
      },
      function (err) {
        status.textContent = '업로드 실패: ' + err.message;
        btn.disabled = false;
      },
      function () {
        task.snapshot.ref.getDownloadURL().then(function (url) {
          var rtdbPath = SECTIONS[section].rtdbPath;
          db.ref(rtdbPath).push({ title: title, url: url, storagePath: path, date: Date.now() });
          status.textContent = '완료!';
          setTimeout(closeUploadModal, 800);
        });
      }
    );
  }

  // ── PIN 검증 후 삭제 ─────────────────────────────────────
  function confirmDelete(sectionKey, id, storagePath) {
    var pin = prompt('삭제하려면 핀코드를 입력하세요:');
    if (!pin) return;
    hashPin(pin).then(function (hash) {
      if (hash !== PIN_HASH) { alert('핀코드가 틀렸습니다.'); return; }
      storage.ref(storagePath).delete().catch(function () {});
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

  // ── 유틸 ─────────────────────────────────────────────────
  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── 이벤트 연결 ──────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    init();

    document.getElementById('upload-modal-close').addEventListener('click', closeUploadModal);
    document.getElementById('upload-modal-overlay').addEventListener('click', closeUploadModal);
    document.querySelector('.upload-submit-btn').addEventListener('click', handleUpload);
  });
})();
```

- [ ] **Step 2: 파일 저장 확인**
  ```bash
  ls "/Users/kimwoojung/Documents/New project/yc-young-2026/upload-sync.js"
  ```

---

## Task 3: index.html — Firebase Storage SDK + 모달 + 버튼 추가

- [ ] **Step 1: Firebase Storage SDK 추가**

  `index.html` 641번째 줄 (기존 Firebase SDK 로드 직후) 에 한 줄 추가:
  ```html
  <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-storage-compat.js"></script>
  ```

- [ ] **Step 2: 업로드 모달 CSS 추가**

  기존 `<style>` 블록 내 마지막 규칙 뒤에 추가:
  ```css
  /* ── 업로드 ── */
  .upload-add-btn {
    display: flex; align-items: center; justify-content: center;
    gap: 6px; width: 100%; padding: 14px;
    border: 2px dashed var(--line); border-radius: 12px;
    background: transparent; color: var(--muted);
    font-size: 14px; font-weight: 700; cursor: pointer;
    transition: border-color 140ms, color 140ms;
  }
  .upload-add-btn:hover { border-color: var(--section-accent); color: var(--section-accent); }

  .uploaded-card { position: relative; }
  .upload-delete-btn {
    position: absolute; top: 8px; right: 8px;
    width: 22px; height: 22px; border-radius: 50%;
    border: none; background: #f1f5f9; color: #64748b;
    font-size: 14px; line-height: 1; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    opacity: 0; transition: opacity 140ms;
  }
  .uploaded-card:hover .upload-delete-btn { opacity: 1; }

  #upload-modal-overlay {
    display: none; position: fixed; inset: 0;
    background: rgba(0,0,0,.45); z-index: 200;
    align-items: center; justify-content: center;
    padding: 20px;
  }
  #upload-modal-overlay.open { display: flex; }
  #upload-modal {
    background: #fff; border-radius: 16px;
    width: 100%; max-width: 440px;
    padding: 28px 24px 24px; position: relative;
  }
  .upload-modal-title { font-size: 16px; font-weight: 800; margin-bottom: 20px; }
  .upload-field { margin-bottom: 14px; }
  .upload-field label { display: block; font-size: 12px; font-weight: 700; color: var(--muted); margin-bottom: 6px; }
  .upload-field input[type="text"],
  .upload-field input[type="file"] {
    width: 100%; padding: 10px 12px; border: 1px solid var(--line);
    border-radius: 8px; font-size: 14px; font-family: inherit;
  }
  .upload-progress-track { height: 4px; background: #e2e8f0; border-radius: 4px; margin: 12px 0 4px; }
  .upload-progress { height: 100%; background: var(--green); border-radius: 4px; width: 0%; transition: width 200ms; }
  .upload-status { font-size: 12px; color: var(--muted); min-height: 16px; }
  .upload-submit-btn {
    margin-top: 16px; width: 100%; padding: 12px;
    background: var(--green); color: #fff; border: none;
    border-radius: 10px; font-size: 14px; font-weight: 800;
    cursor: pointer; font-family: inherit;
  }
  .upload-submit-btn:disabled { opacity: .5; cursor: not-allowed; }
  #upload-modal-close {
    position: absolute; top: 14px; right: 16px;
    background: none; border: none; font-size: 20px;
    cursor: pointer; color: var(--muted);
  }
  ```

- [ ] **Step 3: 업로드 모달 HTML 추가**

  `</body>` 직전에 추가:
  ```html
  <!-- 업로드 모달 -->
  <div id="upload-modal-overlay">
    <div id="upload-modal">
      <button id="upload-modal-close">×</button>
      <div class="upload-modal-title"></div>
      <div class="upload-field">
        <label for="upload-title-input">제목</label>
        <input type="text" id="upload-title-input" placeholder="자료 제목을 입력하세요">
      </div>
      <div class="upload-field">
        <label for="upload-file-input">PDF 파일</label>
        <input type="file" id="upload-file-input" accept=".pdf,application/pdf">
      </div>
      <div class="upload-progress-track">
        <div class="upload-progress"></div>
      </div>
      <div class="upload-status"></div>
      <button class="upload-submit-btn">업로드</button>
    </div>
  </div>
  ```

- [ ] **Step 4: 각 섹션에 동적 카드 컨테이너 + 업로드 버튼 추가**

  **retreat-section** 내 `.resource-grid` 닫는 `</div>` 뒤:
  ```html
  <div class="resource-grid" id="upload-cards-retreat"></div>
  <button class="upload-add-btn" data-upload-section="retreat">+ 파일 추가</button>
  ```

  **budget-section** 내 `.resource-grid` 닫는 `</div>` 뒤:
  ```html
  <div class="resource-grid" id="upload-cards-budget"></div>
  <button class="upload-add-btn" data-upload-section="budget">+ 파일 추가</button>
  ```

  **reports-section** 내 `.resource-grid` 닫는 `</div>` 뒤:
  ```html
  <div class="resource-grid" id="upload-cards-reports"></div>
  <button class="upload-add-btn" data-upload-section="reports">+ 파일 추가</button>
  ```

- [ ] **Step 5: upload-sync.js 로드 추가**

  기존 Firebase SDK 스크립트 뒤, `sync-config.js` 앞:
  ```html
  <script src="upload-sync.js"></script>
  ```

---

## Task 4: 검증

- [ ] **Step 1: 로컬 서버 실행**
  ```bash
  cd "/Users/kimwoojung/Documents/New project/yc-young-2026" && python3 -m http.server 3456
  ```
  브라우저에서 `http://localhost:3456` 접속

- [ ] **Step 2: 업로드 테스트**
  - 계획서 섹션 → `+ 파일 추가` 클릭 → 제목 입력 + PDF 선택 → 업로드 → 카드 즉시 나타나는지 확인

- [ ] **Step 3: 삭제 테스트**
  - 업로드된 카드 호버 → `×` 클릭 → 핀코드 입력 → 카드 사라지는지 확인
  - 틀린 핀코드 입력 → "핀코드가 틀렸습니다" 알림 확인

- [ ] **Step 4: 커밋 & 배포**
  ```bash
  cd "/Users/kimwoojung/Documents/New project/yc-young-2026"
  git add upload-sync.js index.html
  git commit -m "feat: add file upload/delete to 계획서·보고서·예산 sections"
  git push origin main
  ```

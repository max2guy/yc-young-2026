# 학생 명단 전용 페이지 (roster.html) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 학생 명단을 `attendance.html`에서 분리해 독립 페이지 `roster.html`로 만들고, 전화번호/생일/학교/주소 필드를 추가한다.

**Architecture:** 정적 HTML/JS 사이트. `roster.html`은 `roster-sync.js`를 로드해 Firebase RTDB `members/{학년}/{pushId}` 경로를 CRUD한다. 칩 UI로 이름만 표시하고 클릭 시 상세(전화/생일/학교/주소) 펼침, 하나의 모달로 추가/수정을 겸한다. 삭제만 기존 PIN 해시로 보호.

**Tech Stack:** Vanilla JS, Firebase compat SDK (app + database), Firebase RTDB. 이 프로젝트에는 자동화 테스트 러너가 없으므로(정적 사이트), 검증은 로컬 HTTP 서버 + 브라우저 수동/Chrome MCP 확인으로 수행한다.

---

### Task 1: `roster-sync.js` 생성 (RTDB CRUD 로직)

**Files:**
- Create: `roster-sync.js`

- [ ] **Step 1: 파일 작성**

```javascript
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
    FIELDS.filter(function (f) { return f !== 'name'; }).concat(['name']).forEach(function (f) {
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
```

- [ ] **Step 2: 검증 (정적 문법 확인)**

Run: `node --check roster-sync.js`
Expected: 아무 출력 없이 종료 (문법 오류 없음)

- [ ] **Step 3: Commit**

```bash
git add roster-sync.js
git commit -m "feat: roster-sync.js 생성 (학생 명단 RTDB CRUD)"
```

---

### Task 2: `roster.html` 생성 (페이지 골격 + CSS + 모달)

**Files:**
- Create: `roster.html`

- [ ] **Step 1: 파일 작성**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="theme-color" content="#1f436d">
<meta name="robots" content="noindex">
<title>학생 명단 - 연천장로교회 중고등부</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;800&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #e6ebf1;
    --text: #132231;
    --muted: #4e5f70;
    --line: #bcc7d3;
    --green: #163f6b;
    --card: #ffffff;
    --shadow-md: 0 12px 24px rgba(19, 34, 49, 0.08);
    --max-w: 860px;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: "Noto Sans KR", -apple-system, BlinkMacSystemFont, sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.55;
  }
  a { color: inherit; text-decoration: none; }

  .topbar {
    position: sticky;
    top: 0;
    z-index: 100;
    background: #ffffff;
    border-bottom: 1px solid var(--line);
    box-shadow: 0 2px 8px rgba(19, 34, 49, 0.06);
    padding-top: env(safe-area-inset-top);
  }
  .topbar-inner {
    display: flex;
    align-items: center;
    gap: 12px;
    max-width: var(--max-w);
    margin: 0 auto;
    padding: 0 max(20px, env(safe-area-inset-right));
    padding-left: max(20px, env(safe-area-inset-left));
    height: 52px;
  }
  .topbar-back {
    display: inline-flex;
    align-items: center;
    height: 34px;
    padding: 0 12px;
    border-radius: 7px;
    border: 1px solid var(--line);
    background: #fff;
    color: var(--text);
    font-size: 13px;
    font-weight: 700;
    white-space: nowrap;
  }
  .topbar-title {
    font-size: 14px;
    font-weight: 800;
    color: var(--green);
  }

  .page-wrap {
    max-width: var(--max-w);
    margin: 0 auto;
    padding: 24px 20px 56px;
  }

  .hero {
    padding: 24px 28px 22px;
    border-radius: 16px;
    background: linear-gradient(135deg, #2f5f95 0%, #163f6b 100%);
    box-shadow: 0 12px 32px rgba(22, 63, 107, 0.24);
    margin-bottom: 18px;
  }
  .hero-label {
    margin: 0 0 6px;
    font-size: 11px;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.55);
    letter-spacing: 0.4px;
  }
  .hero h1 {
    margin: 0;
    font-size: clamp(22px, 3vw, 30px);
    color: #ffffff;
  }

  .section {
    padding: 18px 20px;
    border: 1px solid var(--line);
    border-top: 3px solid #7c3aed;
    border-radius: 14px;
    background: var(--card);
    box-shadow: var(--shadow-md);
  }
  .section-title {
    margin: 0 0 12px;
    font-size: 18px;
    font-weight: 800;
    color: #7c3aed;
  }

  .roster-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }
  .roster-col-head {
    font-size: 13px;
    font-weight: 800;
    color: var(--green);
    padding-bottom: 9px;
    border-bottom: 2px solid var(--line);
    margin-bottom: 12px;
  }
  .roster-grade-block { margin-bottom: 16px; }
  .roster-grade-block:last-child { margin-bottom: 0; }
  .roster-grade-head {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 8px;
  }
  .roster-grade-label {
    font-size: 12px;
    font-weight: 800;
    color: var(--text);
  }
  .roster-grade-count {
    font-size: 11px;
    font-weight: 700;
    color: var(--muted);
  }
  .roster-add-btn {
    margin-left: auto;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 1.5px solid var(--line);
    background: transparent;
    color: var(--muted);
    font-size: 16px;
    font-weight: 300;
    line-height: 1;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-family: inherit;
  }
  .roster-add-btn:hover { border-color: #7c3aed; color: #7c3aed; }
  .roster-chips { display: flex; flex-direction: column; gap: 6px; }
  .roster-chip-wrap { display: block; }
  .roster-chip {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 6px 10px;
    border-radius: 999px;
    border: 1px solid var(--line);
    background: #fff;
    font-family: inherit;
    cursor: pointer;
    text-align: left;
  }
  .roster-chip.open { border-color: #7c3aed; background: #f3ecfd; }
  .roster-chip-name {
    font-size: 12px;
    font-weight: 700;
    color: var(--text);
  }
  .roster-empty { font-size: 12px; color: var(--muted); }

  .roster-detail {
    margin: 4px 0 4px 4px;
    padding: 10px 12px;
    border-radius: 10px;
    background: #f7f8fa;
    border: 1px solid var(--line);
  }
  .roster-detail-row {
    display: flex;
    gap: 8px;
    font-size: 12px;
    padding: 3px 0;
  }
  .roster-detail-label {
    flex-shrink: 0;
    width: 56px;
    color: var(--muted);
    font-weight: 700;
  }
  .roster-detail-value { color: var(--text); }
  .roster-detail-empty { color: var(--muted); }
  .roster-detail-actions {
    display: flex;
    gap: 8px;
    margin-top: 8px;
  }
  .roster-edit-btn, .roster-del-btn {
    font-size: 12px;
    font-weight: 700;
    padding: 5px 10px;
    border-radius: 7px;
    border: 1px solid var(--line);
    background: #fff;
    cursor: pointer;
    font-family: inherit;
  }
  .roster-edit-btn:hover { border-color: var(--green); color: var(--green); }
  .roster-del-btn:hover { border-color: #ef4444; color: #ef4444; }

  @media (max-width: 380px) {
    .roster-grid { grid-template-columns: 1fr; }
  }

  /* ── 모달 ── */
  .roster-modal {
    display: none;
    position: fixed;
    inset: 0;
    z-index: 200;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }
  .roster-modal.open { display: flex; }
  .roster-modal-backdrop {
    position: absolute;
    inset: 0;
    background: rgba(19, 34, 49, 0.45);
  }
  .roster-modal-box {
    position: relative;
    width: 100%;
    max-width: 380px;
    background: #fff;
    border-radius: 14px;
    padding: 20px;
    box-shadow: 0 20px 48px rgba(19, 34, 49, 0.3);
  }
  .roster-modal-box h3 {
    margin: 0 0 14px;
    font-size: 16px;
    color: var(--green);
  }
  .roster-modal-box label {
    display: block;
    font-size: 12px;
    font-weight: 700;
    color: var(--muted);
    margin: 10px 0 4px;
  }
  .roster-modal-box input,
  .roster-modal-box select {
    width: 100%;
    height: 36px;
    padding: 0 10px;
    border: 1px solid var(--line);
    border-radius: 8px;
    font-size: 13px;
    font-family: inherit;
  }
  .roster-modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 18px;
  }
  .roster-modal-actions button {
    height: 36px;
    padding: 0 16px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 700;
    font-family: inherit;
    cursor: pointer;
    border: 1px solid var(--line);
    background: #fff;
  }
  .roster-modal-actions button[type="submit"] {
    background: var(--green);
    border-color: var(--green);
    color: #fff;
  }

  @media (max-width: 600px) {
    .page-wrap { padding: 16px 14px 48px; }
    .hero { padding: 18px 20px 16px; }
    .section { padding: 14px 16px; }
  }
</style>
</head>
<body>

  <header class="topbar">
    <div class="topbar-inner">
      <a href="index.html" class="topbar-back">← 돌아가기</a>
      <span class="topbar-title">학생 명단</span>
    </div>
  </header>

  <div class="page-wrap">
    <section class="hero">
      <div class="hero-label">연천장로교회 중고등부</div>
      <h1>학생 명단</h1>
    </section>

    <section class="section" aria-labelledby="roster-title">
      <h2 class="section-title" id="roster-title">학년별 명단</h2>
      <div id="roster-root"></div>
    </section>
  </div>

  <div class="roster-modal" id="roster-modal">
    <div class="roster-modal-backdrop" id="roster-modal-backdrop"></div>
    <div class="roster-modal-box">
      <h3 id="roster-modal-title">학생 추가</h3>
      <form id="roster-modal-form">
        <label for="rf-grade">학년</label>
        <select id="rf-grade">
          <option value="중1">중1</option>
          <option value="중2">중2</option>
          <option value="중3">중3</option>
          <option value="고1">고1</option>
          <option value="고2">고2</option>
          <option value="고3">고3</option>
        </select>

        <label for="rf-name">이름</label>
        <input type="text" id="rf-name" required>

        <label for="rf-phone">전화번호</label>
        <input type="text" id="rf-phone" placeholder="010-0000-0000">

        <label for="rf-birthday">생일</label>
        <input type="text" id="rf-birthday" placeholder="YYYY-MM-DD">

        <label for="rf-school">학교</label>
        <input type="text" id="rf-school">

        <label for="rf-address">주소</label>
        <input type="text" id="rf-address">

        <div class="roster-modal-actions">
          <button type="button" id="roster-modal-cancel">취소</button>
          <button type="submit">저장</button>
        </div>
      </form>
    </div>
  </div>

  <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-database-compat.js"></script>
  <script src="sync-config.js"></script>
  <script src="roster-sync.js"></script>
</body>
</html>
```

- [ ] **Step 2: 문법 확인**

Run: `python3 -c "import html.parser; p = html.parser.HTMLParser(); p.feed(open('roster.html').read())"`
Expected: 예외 없이 종료 (기본적인 태그 균형 검사)

- [ ] **Step 3: Commit**

```bash
git add roster.html
git commit -m "feat: roster.html 생성 (학생 명단 독립 페이지)"
```

---

### Task 3: `members-sync.js` 삭제

**Files:**
- Delete: `members-sync.js`

- [ ] **Step 1: 삭제**

```bash
git rm members-sync.js
```

- [ ] **Step 2: Commit**

```bash
git commit -m "chore: members-sync.js 삭제 (roster-sync.js로 대체)"
```

(주의: Task 4에서 `attendance.html`의 참조를 먼저/함께 제거해야 깨진 링크가 남지 않는다. 두 커밋을 연속으로 실행할 것.)

---

### Task 4: `attendance.html`에서 임시 학생 명단 섹션 제거

**Files:**
- Modify: `attendance.html`

- [ ] **Step 1: CSS 블록 제거**

`attendance.html`에서 다음 블록 전체를 삭제한다 (`/* ── 학생 명단 ── */` 부터 `@media (max-width: 380px) { .members-grid ... }` 까지, `.sr-only` 규칙 직전):

```css
  /* ── 학생 명단 ── */
  #members-section { --section-accent: #7c3aed; }
  #members-section .section-title { color: #7c3aed; }

  .members-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }
  .members-col-head {
    font-size: 13px;
    font-weight: 800;
    color: var(--green);
    padding-bottom: 9px;
    border-bottom: 2px solid var(--line);
    margin-bottom: 12px;
  }
  .members-grade-block { margin-bottom: 14px; }
  .members-grade-block:last-child { margin-bottom: 0; }
  .members-grade-head {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 7px;
  }
  .members-grade-label {
    font-size: 12px;
    font-weight: 800;
    color: var(--text);
  }
  .members-grade-count {
    font-size: 11px;
    font-weight: 700;
    color: var(--muted);
  }
  .members-add-btn {
    margin-left: auto;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 1.5px solid var(--line);
    background: transparent;
    color: var(--muted);
    font-size: 16px;
    font-weight: 300;
    line-height: 1;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-family: inherit;
    transition: border-color 140ms, color 140ms;
  }
  .members-add-btn:hover { border-color: #7c3aed; color: #7c3aed; }
  .members-chips { display: flex; flex-wrap: wrap; gap: 5px; }
  .member-chip {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 3px 6px 3px 9px;
    border-radius: 999px;
    border: 1px solid var(--line);
    background: #fff;
  }
  .member-name {
    font-size: 12px;
    font-weight: 700;
    color: var(--text);
  }
  .member-del-btn {
    background: none;
    border: none;
    padding: 0;
    color: var(--muted);
    font-size: 13px;
    line-height: 1;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    transition: color 120ms;
  }
  .member-del-btn:hover { color: #ef4444; }
  .member-empty { font-size: 12px; color: var(--muted); }

  @media (max-width: 380px) {
    .members-grid { grid-template-columns: 1fr; }
  }

```

- [ ] **Step 2: HTML 섹션 제거**

다음 블록을 삭제한다:

```html
    <section class="section" id="members-section" aria-labelledby="members-title">
      <div class="section-head">
        <h2 class="section-title" id="members-title">학생 명단</h2>
      </div>
      <div id="members-roster-root"></div>
    </section>

```

- [ ] **Step 3: 스크립트 태그 제거**

다음 두 줄을 삭제한다 (firebase-database-compat.js는 attendance-sync.js에도 필요하다면 유지 — 확인 결과 attendance.html은 이미 630번째 줄에서 firebase-database-compat.js를 로드하므로 중복 로드분과 members-sync.js만 제거):

```html
    <script src="sync-config.js"></script>
    <script src="members-sync.js"></script>
```

(주의: `attendance-config.js`/`attendance-sync.js`가 `sync-config.js`의 `window.SPORTS_SYNC_CONFIG`를 사용하지 않는지 확인 후 제거. 확인 결과 `attendance-config.js`는 별도 설정을 사용하므로 `sync-config.js` 라인도 함께 제거 가능.)

- [ ] **Step 4: 브라우저에서 확인**

로컬 서버 구동 후 `attendance.html`을 열어 콘솔 에러 없이 기존 출결 대시보드가 정상 렌더링되는지 확인한다.

- [ ] **Step 5: Commit**

```bash
git add attendance.html
git commit -m "refactor: attendance.html에서 임시 학생 명단 섹션 제거 (roster.html로 이전)"
```

---

### Task 5: `index.html` 카드 링크 변경

**Files:**
- Modify: `index.html`

- [ ] **Step 1: href 변경**

`index.html`의 "출결현황" 섹션에서 다음:

```html
      <a class="resource-card attendance" href="attendance.html#members-section">
        <span class="tag">중고등부</span>
        <h3>학생 명단</h3>
        <div class="resource-meta">학년별 명단 관리 →</div>
      </a>
```

를 다음으로 교체:

```html
      <a class="resource-card attendance" href="roster.html">
        <span class="tag">중고등부</span>
        <h3>학생 명단</h3>
        <div class="resource-meta">학년별 명단 관리 →</div>
      </a>
```

- [ ] **Step 2: 브라우저에서 확인**

`index.html`을 열어 "학생 명단" 카드 클릭 시 `roster.html`로 이동하는지 확인.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "fix: 학생 명단 카드 링크를 roster.html로 변경"
```

---

### Task 6: 전체 기능 수동 검증

**Files:** 없음 (검증 전용)

- [ ] **Step 1: 로컬 서버 구동**

```bash
python3 -m http.server 3456
```

- [ ] **Step 2: 브라우저로 `http://localhost:3456/roster.html` 접속 후 확인**

1. "+"로 학생 추가 → 학년 블록에 칩으로 나타나는지 확인
2. 칩 클릭 → 상세 필드(전화/생일/학교/주소) 펼침 확인
3. 상세의 "수정" 버튼 → 모달에 기존 값이 채워진 채로 열리는지, 저장 후 반영되는지 확인
4. 상세의 "삭제" 버튼 → 잘못된 PIN 입력 시 삭제 안 됨, 올바른 PIN(006291) 입력 시 삭제되는지 확인
5. 기존에 이름만 있던 학생 칩이 정상적으로 보이는지(나머지 필드 빈 값 "-") 확인
6. `index.html` → "학생 명단" 카드 클릭 시 `roster.html`로 정상 이동하는지 확인
7. `attendance.html`에 더 이상 학생 명단 섹션이 없고, 출결 대시보드가 정상 동작하는지 확인

Expected: 위 7개 항목 모두 정상 동작.

- [ ] **Step 3: 문제 발견 시 수정 후 재확인, 문제 없으면 다음 태스크로 진행**

---

### Task 7: HANDOFF.md 갱신 및 최종 커밋/푸시

**Files:**
- Modify/Create: `.claude/HANDOFF.md`

- [ ] **Step 1: `.claude/` 디렉터리 존재 확인, 없으면 생성**

```bash
mkdir -p .claude
```

- [ ] **Step 2: HANDOFF.md 작성** (내용은 최종 커밋 해시를 반영해 실행 시점에 채운다 — Task 8 커밋 직후 커밋 해시로 갱신)

- [ ] **Step 3: 변경사항 전체 커밋**

```bash
git add .claude/HANDOFF.md
git commit -m "docs: HANDOFF.md 갱신 (학생 명단 페이지 분리 작업 반영)"
```

- [ ] **Step 4: 원격 푸시**

```bash
git push
```

Expected: 푸시 성공, 원격 브랜치가 로컬과 동기화됨.

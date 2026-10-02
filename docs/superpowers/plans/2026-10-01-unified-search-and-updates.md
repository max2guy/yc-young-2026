# 통합 검색 + 업데이트 피드 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recomm된) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `index.html` 상단에 통합 검색(회의자료 + 업로드 3종)과 최근 업데이트 피드(상위 5건)를 추가한다. 디자인 토큰 통일(모든 페이지 CSS 교체)은 별도 계획으로 분리한다 — 이 계획은 `index.html`과 신규 `assets/home-search.js` 하나만 건드리는 독립 기능 추가다.

**Architecture:** 새 파일 `assets/home-search.js`가 DOMContentLoaded 시점에 Firebase RTDB 4개 경로(`meetingDocuments`, `uploads/plans`, `uploads/reports`, `uploads/budget`)를 구독해 클라이언트 메모리에 `{id, title, badge, href, ts}` 통합 리스트를 만든다. 검색 입력은 제목 부분 문자열 매칭으로 그 리스트를 필터링하고, 업데이트 피드는 `ts` 내림차순 상위 5건을 렌더링한다. 두 UI 모두 `index.html` 안에 새 `<section>` 마크업으로 추가하고, 기존 `:root` CSS 변수(`--green`, `--line`, `--text`, `--muted`)를 그대로 재사용한다(토큰 통일은 별도 계획에서 다룬다).

**Tech Stack:** 순수 HTML/CSS/바닐라 JS, Firebase Realtime Database(이미 `sync-config.js`에 설정됨), 빌드 도구 없음.

**참조 스펙:** `docs/superpowers/specs/2026-10-01-site-redesign-unified-search-design.md`

---

## 사전 확인된 데이터 구조

- `meetingDocuments/{id}`: `{ title, updatedAt, deletedAt? }` — `deletedAt`이 있으면 휴지통 항목이므로 제외 ([index.html:1217-1230](index.html#L1217)).
- `uploads/plans`, `uploads/reports`, `uploads/budget`: 각 `{id}`가 `{ title, url, storagePath, date }` ([upload-sync.js:121-127](upload-sync.js#L121)).
- `members/*`(학생 명단), `sportsMeeting2026`(체육대회 단일 편집 문서, 제목 필드 없음)은 이 기능에서 **절대 읽지 않는다**.
- Firebase 설정은 `window.SPORTS_SYNC_CONFIG.firebase` (`sync-config.js`)에 이미 있고, `index.html`의 기존 인라인 스크립트(`bootRecentDocs()`, [index.html:1199-1215](index.html#L1199))가 페이지 파싱 중 동기적으로 `firebase.initializeApp(...)`을 먼저 호출하므로, 새 스크립트는 `DOMContentLoaded` 시점에 `firebase.apps.length > 0`를 안전하게 기대할 수 있다(방어적으로 한 번 더 체크는 한다).

---

### Task 1: `assets/home-search.js` 생성 — 데이터 구독 + 통합 인덱스

**Files:**
- Create: `assets/home-search.js`

- [ ] **Step 1: 디렉터리와 파일 생성, 소스 구독 골격 작성**

```js
(function () {
  'use strict';

  var SOURCES = [
    {
      path: 'meetingDocuments',
      badge: '회의자료',
      skip: function (item) { return !!item.deletedAt; },
      href: function (id) { return 'meeting-editor.html?id=' + id; },
      ts: function (item) { return item.updatedAt || 0; }
    },
    {
      path: 'uploads/plans',
      badge: '계획서',
      href: uploadHref,
      ts: function (item) { return item.date || 0; }
    },
    {
      path: 'uploads/reports',
      badge: '행사 보고서',
      href: uploadHref,
      ts: function (item) { return item.date || 0; }
    },
    {
      path: 'uploads/budget',
      badge: '예산 및 결산',
      href: uploadHref,
      ts: function (item) { return item.date || 0; }
    }
  ];

  var cache = {};
  var searchInput, resultsEl, feedEl, debounceTimer;

  function uploadHref(id, item) {
    return 'pdf-viewer.html?file=' + encodeURIComponent(item.url) + '&title=' + encodeURIComponent(item.title);
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function init() {
    searchInput = document.getElementById('unified-search-input');
    resultsEl = document.getElementById('unified-search-results');
    feedEl = document.getElementById('updates-feed');
    if (!searchInput || !resultsEl || !feedEl) return;

    if (!window.SPORTS_SYNC_CONFIG || !window.SPORTS_SYNC_CONFIG.firebase) {
      feedEl.innerHTML = '<div class="recent-empty">Firebase 연결이 없어 불러올 수 없습니다.</div>';
      return;
    }
    if (!firebase.apps.length) {
      firebase.initializeApp(window.SPORTS_SYNC_CONFIG.firebase);
    }

    SOURCES.forEach(listenSource);

    searchInput.addEventListener('input', function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(runSearch, 150);
    });
  }

  function listenSource(source) {
    firebase.database().ref(source.path).on('value', function (snap) {
      var val = snap.val() || {};
      cache[source.path] = Object.keys(val)
        .filter(function (id) { return !source.skip || !source.skip(val[id]); })
        .map(function (id) {
          var item = val[id];
          return {
            id: id,
            title: (item.title && String(item.title).trim()) || '제목 없음',
            badge: source.badge,
            href: source.href(id, item),
            ts: source.ts(item)
          };
        });
      runSearch();
      renderFeed();
    });
  }

  function allEntries() {
    return SOURCES.reduce(function (acc, source) {
      return acc.concat(cache[source.path] || []);
    }, []);
  }

  function runSearch() {
    if (!searchInput) return;
    var query = searchInput.value.trim();
    if (!query) {
      resultsEl.hidden = true;
      resultsEl.innerHTML = '';
      return;
    }
    resultsEl.hidden = false;
    var lower = query.toLowerCase();
    var matches = allEntries()
      .filter(function (entry) { return entry.title.toLowerCase().indexOf(lower) !== -1; })
      .sort(function (a, b) { return b.ts - a.ts; });

    if (!matches.length) {
      resultsEl.innerHTML = '<div class="recent-empty">검색 결과 없음</div>';
      return;
    }
    resultsEl.innerHTML = matches.map(function (entry) {
      return '<a class="search-result-item" href="' + entry.href + '">' +
        '<span class="search-result-badge">' + escHtml(entry.badge) + '</span>' +
        '<span class="search-result-title">' + escHtml(entry.title) + '</span>' +
        '</a>';
    }).join('');
  }

  function formatRelativeTime(ts) {
    if (!ts) return '';
    var diffDay = Math.floor((Date.now() - ts) / 86400000);
    if (diffDay <= 0) return '오늘';
    if (diffDay === 1) return '어제';
    if (diffDay < 7) return diffDay + '일 전';
    var date = new Date(ts);
    return date.getFullYear() + '.' + String(date.getMonth() + 1).padStart(2, '0') + '.' + String(date.getDate()).padStart(2, '0');
  }

  function renderFeed() {
    var top5 = allEntries().sort(function (a, b) { return b.ts - a.ts; }).slice(0, 5);
    if (!top5.length) {
      feedEl.innerHTML = '<div class="recent-empty">최근 업데이트가 없습니다.</div>';
      return;
    }
    feedEl.innerHTML = top5.map(function (entry) {
      return '<a class="update-feed-item" href="' + entry.href + '">' +
        '<span class="update-dot"></span>' +
        '<span class="update-title">' + escHtml(entry.title) + '</span>' +
        '<span class="update-feed-badge">' + escHtml(entry.badge) + '</span>' +
        '<span class="update-time">' + formatRelativeTime(entry.ts) + '</span>' +
        '</a>';
    }).join('');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
```

- [ ] **Step 2: 문법 검증**

Run: `node --check assets/home-search.js`
Expected: 출력 없음(에러 없이 종료).

- [ ] **Step 3: Commit**

```bash
git add assets/home-search.js
git commit -m "feat: 통합 검색/업데이트 피드 데이터 구독 스크립트 추가

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: `index.html`에 검색/피드 마크업 + 스크립트 태그 추가

**Files:**
- Modify: `index.html:575-576` (hero 섹션과 출결현황 섹션 사이)
- Modify: `index.html:741` (script 태그, `upload-sync.js` 다음 줄)

- [ ] **Step 1: hero 섹션 바로 뒤에 두 개의 새 섹션 삽입**

`index.html`에서 다음 블록을 찾는다:

```html
      <section class="hero" id="home-section">
        <div class="hero-label">연천장로교회 중고등부</div>
        <h1>교사 회의 자료</h1>
        <div class="hero-meta">2026</div>
      </section>

      <section class="section" id="attendance-section">
```

아래처럼 두 섹션을 hero와 attendance-section 사이에 끼워 넣는다:

```html
      <section class="hero" id="home-section">
        <div class="hero-label">연천장로교회 중고등부</div>
        <h1>교사 회의 자료</h1>
        <div class="hero-meta">2026</div>
      </section>

      <section class="section" id="search-section">
        <div class="section-head">
          <h2 class="section-title">통합 검색</h2>
        </div>
        <input
          type="search"
          id="unified-search-input"
          class="unified-search-input"
          placeholder="회의자료, 계획서, 보고서, 예산 검색"
          autocomplete="off"
        >
        <div id="unified-search-results" class="unified-search-results" hidden></div>
      </section>

      <section class="section" id="updates-section">
        <div class="section-head">
          <h2 class="section-title">최근 업데이트</h2>
        </div>
        <div id="updates-feed" class="updates-feed">
          <div class="recent-empty">불러오는 중입니다.</div>
        </div>
      </section>

      <section class="section" id="attendance-section">
```

- [ ] **Step 2: `home-search.js` 스크립트 태그 추가**

`index.html`에서 다음 줄을 찾는다:

```html
  <script src="sync-config.js"></script>
  <script src="upload-sync.js"></script>
```

아래처럼 한 줄 추가:

```html
  <script src="sync-config.js"></script>
  <script src="upload-sync.js"></script>
  <script src="assets/home-search.js"></script>
```

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: index.html에 통합 검색/업데이트 피드 섹션 마크업 추가

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: `index.html`에 검색/피드 CSS 추가

**Files:**
- Modify: `index.html:261` (`.recent-item {` 블록 바로 앞, 기존 `<style>` 안)

- [ ] **Step 1: 기존 `.recent-list { ... }` 블록 앞에 아래 CSS를 삽입**

`index.html`에서 다음 줄을 찾는다(`.resource-meta` 블록 끝 직후):

```css
  .recent-list {
    display: grid;
```

바로 위에 아래 블록을 추가한다:

```css
  .unified-search-input {
    width: 100%;
    padding: 12px 14px;
    border: 1px solid var(--line);
    border-radius: 10px;
    font-size: 15px;
    font-family: inherit;
    box-sizing: border-box;
  }
  .unified-search-input:focus {
    outline: none;
    border-color: var(--green);
  }
  .unified-search-results {
    margin-top: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .search-result-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    border: 1px solid var(--line);
    border-radius: 10px;
    background: #fff;
  }
  .search-result-item:hover {
    border-color: #9eb4cc;
  }
  .search-result-badge {
    flex-shrink: 0;
    font-size: 11px;
    font-weight: 800;
    color: #fff;
    background: var(--green);
    border-radius: 6px;
    padding: 3px 8px;
    white-space: nowrap;
  }
  .search-result-title {
    font-size: 14px;
    font-weight: 700;
    color: var(--text);
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .updates-feed {
    display: flex;
    flex-direction: column;
  }
  .update-feed-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 2px;
    border-bottom: 1px solid var(--line);
  }
  .update-feed-item:last-child {
    border-bottom: none;
  }
  .update-dot {
    flex-shrink: 0;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #c98a2c;
  }
  .update-title {
    flex: 1;
    min-width: 0;
    font-size: 14px;
    font-weight: 700;
    color: var(--text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .update-feed-badge {
    flex-shrink: 0;
    font-size: 11px;
    font-weight: 700;
    color: var(--muted);
  }
  .update-time {
    flex-shrink: 0;
    font-size: 12px;
    color: var(--muted);
  }
  .recent-list {
    display: grid;
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "style: 통합 검색/업데이트 피드 CSS 추가

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: 로컬 수동 검증 (이 프로젝트엔 테스트 러너가 없음)

**Files:** 없음 (검증 전용 태스크)

- [ ] **Step 1: 로컬 서버 기동**

Run: `python3 -m http.server 3457` (프로젝트 루트에서)

- [ ] **Step 2: 브라우저로 `http://localhost:3457/index.html` 열기**

확인 항목:
1. 히어로 바로 아래에 "통합 검색"과 "최근 업데이트" 두 섹션이 출결현황 섹션 위에 보인다.
2. 페이지 로드 직후 "최근 업데이트"에 최대 5건이 최신순으로 뜬다(회의자료/계획서/보고서/예산 중 실제 존재하는 데이터만).
3. 검색창에 기존 회의자료 제목 일부를 입력하면 결과가 즉시 필터링되고, 클릭 시 `meeting-editor.html?id=...`로 이동한다.
4. 검색창에 업로드 문서 제목 일부를 입력하면 `pdf-viewer.html?file=...`로 연결되는 결과가 뜬다.
5. 존재하지 않는 문자열을 입력하면 "검색 결과 없음"이 뜬다.
6. 검색창을 비우면 결과 목록이 사라진다(hidden).
7. 개발자 도구 Network/콘솔에서 `members` 경로로의 요청이 전혀 없는지 확인한다(검색 결과에도 학생 이름이 섞여 나오지 않는지 확인).

- [ ] **Step 3: 모바일 폭 확인**

브라우저 개발자 도구에서 375px 폭으로 리사이즈 후 같은 페이지를 다시 확인 — 가로 스크롤이 생기지 않는지, 검색 결과/피드 항목 텍스트가 잘려도 레이아웃이 깨지지 않는지 확인.

- [ ] **Step 4: 보안 파일 미변경 확인**

Run: `git diff --stat HEAD~3 -- firebase-database.rules.json storage.rules upload-sync.js roster-sync.js`
Expected: 출력 없음(변경 없음).

---

### Task 5: `.claude/HANDOFF.md` 갱신

**Files:**
- Modify: `.claude/HANDOFF.md`

- [ ] **Step 1: 최신 커밋 해시 확인**

Run: `git log -1 --oneline`

- [ ] **Step 2: HANDOFF.md를 아래 구조로 갱신**

`.claude/HANDOFF.md`를 열어 "현재 상태"와 "방금 수정한 내용" 섹션을 이번 작업 내용으로 교체한다(기존 섹션 구조·나머지 섹션 유지):

```markdown
## 현재 상태
- 브랜치: main
- 최신 커밋: [Step 1에서 확인한 해시] "통합 검색/업데이트 피드 CSS 추가"

## 방금 수정한 내용
- index.html 홈 화면에 통합 검색(회의자료 + 업로드 3종: 계획서/보고서/예산)과 최근 업데이트 피드(상위 5건) 추가
- 신규 파일 assets/home-search.js: meetingDocuments, uploads/plans, uploads/reports, uploads/budget 4개 RTDB 경로를 구독해 제목 기준 클라이언트 검색 인덱스 생성
- 학생 명단(members) 데이터는 검색/피드에서 완전히 제외 (PRODUCT.md Accessibility & Inclusion 결정에 따름)
- 삭제 PIN 로직, Firebase 규칙, members 스키마는 손대지 않음
- 다음 라운드(별도 계획 예정): assets/tokens.css + assets/components.css로 9개 페이지 디자인(네이비+오프화이트) 통일 — 설계는 DESIGN.md(2026-10-01)에 이미 확정됨, 아직 미착수
```

- [ ] **Step 3: Commit**

```bash
git add .claude/HANDOFF.md
git commit -m "docs: 통합 검색/업데이트 피드 작업 핸드오프 갱신

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## 이 계획 다음에 할 일 (별도 계획, 이번 범위 아님)

- `assets/tokens.css` / `assets/components.css`를 만들어 9개 페이지를 DESIGN.md 토큰(네이비 `#163f6b` + 오프화이트 `#f3efe8`)으로 통일 — `docs/superpowers/specs/2026-10-01-site-redesign-unified-search-design.md` 1절(페이지 구조)에 범위가 적혀 있으며, 페이지가 많고 각기 다른 기존 CSS를 가지고 있어 독립된 계획으로 분리하는 것을 권장한다.

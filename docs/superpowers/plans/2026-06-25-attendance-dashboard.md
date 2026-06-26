# Attendance Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a read-only middle/high attendance dashboard to `yc-young-2026`, put it ahead of meeting materials in navigation and layout, and load its data directly from the `ministry-report-v2` Firestore `reports` collection.

**Architecture:** Keep the current static-site structure, add one dedicated `attendance.html` page plus a small shared script for Firestore reads and attendance aggregation, and wire both `index.html` and the new page to the same sidebar order. Read only `departments.middleHigh` from report documents and compute weekly and monthly summary data client-side.

**Tech Stack:** Static HTML/CSS/JS, Firebase Web SDK (Firestore compat or modular browser build), existing GitHub Pages/Firebase Hosting setup

---

## File Structure

- Create: `attendance.html`
  - Read-only attendance dashboard page
- Create: `attendance-sync.js`
  - Firebase bootstrap, Firestore read, middle/high aggregation helpers, render helpers
- Create: `attendance-config.js`
  - Public browser config contract for the `ministry-report-v2` Firebase project plus collection metadata
- Modify: `index.html`
  - Put `출결현황` first in the sidebar
  - Add an attendance hero card/section above `회의자료`
  - Switch sidebar click handling from “all sections open” to section-by-section view if that work is being finished together
- Modify: `README.md`
  - Add one short setup note for `attendance-config.js`
- Optional verify helper: `FIREBASE_SETUP.md`
  - Mention the second Firebase read-only source if needed

---

### Task 1: Add the read-only attendance config contract

**Files:**
- Create: `attendance-config.js`
- Modify: `README.md`

- [ ] **Step 1: Write the config contract file**

```js
window.MINISTRY_ATTENDANCE_CONFIG = {
  firebase: {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
  },
  collection: "reports",
  departmentKey: "middleHigh",
  recentWeeks: 8,
  recentMonths: 12
};
```

- [ ] **Step 2: Add a setup note to the README**

```md
## Attendance Dashboard Setup

`attendance.html` reads middle/high attendance from the `ministry-report-v2` Firebase project.

Before using it, fill in `attendance-config.js` with the same public web config values used by `ministry-report-v2`.

Required collection:
- `reports`
```

- [ ] **Step 3: Verify the config contract is referenced only by the new feature**

Run: `rg -n "MINISTRY_ATTENDANCE_CONFIG|attendance-config" /Users/kimwoojung/Documents/New\ project/yc-young-2026`
Expected: only the new attendance files and setup note appear

- [ ] **Step 4: Commit**

```bash
git -C /Users/kimwoojung/Documents/New\ project/yc-young-2026 add attendance-config.js README.md
git -C /Users/kimwoojung/Documents/New\ project/yc-young-2026 commit -m "Add attendance dashboard config contract"
```

---

### Task 2: Build the Firestore reader and aggregation module

**Files:**
- Create: `attendance-sync.js`

- [ ] **Step 1: Add the Firestore loader and normalization helpers**

```js
function getAttendanceConfig() {
  const config = window.MINISTRY_ATTENDANCE_CONFIG;
  if (!config || !config.firebase || !config.projectId) {
    throw new Error("attendance-config.js is missing ministry Firestore settings.");
  }
  return config;
}

function toDateParts(reportDate) {
  const [year, month, day] = String(reportDate || "").split("-").map(Number);
  return { year, month, day };
}

function getMiddleHighDepartment(report) {
  return report &&
    report.departments &&
    report.departments.middleHigh
    ? report.departments.middleHigh
    : null;
}

function getTotalMembers(department) {
  if (department && Array.isArray(department.members)) return department.members.length;
  return null;
}

function toAttendanceEntry(report) {
  const department = getMiddleHighDepartment(report);
  if (!department || !report.reportDate) return null;
  const totalMembers = getTotalMembers(department);
  const attendance = Number(department.attendance || 0);
  return {
    id: report.id,
    reportDate: report.reportDate,
    title: report.title || "주간 사역보고서",
    attendance,
    totalMembers,
    rate: totalMembers && totalMembers > 0 ? Math.round((attendance / totalMembers) * 1000) / 10 : null,
    updatedAt: report.updatedAt || report.createdAt || null
  };
}
```

- [ ] **Step 2: Add the browser Firestore fetch function**

```js
let attendanceDb = null;

function getAttendanceDb() {
  if (attendanceDb) return attendanceDb;
  const config = getAttendanceConfig();
  const app = firebase.apps && firebase.apps.length
    ? firebase.apps.find(function (candidate) { return candidate.name === "attendance-dashboard"; })
    : null;
  const firebaseApp = app || firebase.initializeApp(config.firebase, "attendance-dashboard");
  attendanceDb = firebase.firestore(firebaseApp);
  return attendanceDb;
}

async function fetchAttendanceReports() {
  const config = getAttendanceConfig();
  const snapshot = await getAttendanceDb().collection(config.collection).get();
  return snapshot.docs
    .map(function (doc) { return doc.data(); })
    .map(toAttendanceEntry)
    .filter(Boolean)
    .sort(function (a, b) { return b.reportDate.localeCompare(a.reportDate); });
}
```

- [ ] **Step 3: Add weekly and monthly aggregation helpers**

```js
function summarizeRecentWeeks(entries, recentWeeks) {
  return entries.slice(0, recentWeeks);
}

function summarizeCurrentMonth(entries) {
  if (!entries.length) return { averageAttendance: 0, averageRate: null, weekCount: 0 };
  const latestMonth = entries[0].reportDate.slice(0, 7);
  const monthEntries = entries.filter(function (entry) {
    return entry.reportDate.slice(0, 7) === latestMonth;
  });
  const attendanceTotal = monthEntries.reduce(function (sum, entry) { return sum + entry.attendance; }, 0);
  const rateEntries = monthEntries.filter(function (entry) { return entry.rate !== null; });
  return {
    label: latestMonth,
    averageAttendance: Math.round((attendanceTotal / monthEntries.length) * 10) / 10,
    averageRate: rateEntries.length
      ? Math.round((rateEntries.reduce(function (sum, entry) { return sum + entry.rate; }, 0) / rateEntries.length) * 10) / 10
      : null,
    weekCount: monthEntries.length
  };
}

function summarizeMonths(entries, recentMonths) {
  const monthMap = new Map();
  entries.forEach(function (entry) {
    const key = entry.reportDate.slice(0, 7);
    const current = monthMap.get(key) || [];
    current.push(entry);
    monthMap.set(key, current);
  });
  return Array.from(monthMap.entries())
    .sort(function (a, b) { return b[0].localeCompare(a[0]); })
    .slice(0, recentMonths)
    .map(function (pair) {
      const key = pair[0];
      const monthEntries = pair[1];
      const attendanceValues = monthEntries.map(function (entry) { return entry.attendance; });
      return {
        month: key,
        averageAttendance: Math.round((attendanceValues.reduce(function (sum, value) { return sum + value; }, 0) / monthEntries.length) * 10) / 10,
        maxAttendance: Math.max.apply(null, attendanceValues),
        minAttendance: Math.min.apply(null, attendanceValues),
        weekCount: monthEntries.length
      };
    });
}
```

- [ ] **Step 4: Check the file for syntax issues**

Run: `node --check /Users/kimwoojung/Documents/New\ project/yc-young-2026/attendance-sync.js`
Expected: no output

- [ ] **Step 5: Commit**

```bash
git -C /Users/kimwoojung/Documents/New\ project/yc-young-2026 add attendance-sync.js
git -C /Users/kimwoojung/Documents/New\ project/yc-young-2026 commit -m "Add attendance Firestore reader and summaries"
```

---

### Task 3: Create the attendance dashboard page

**Files:**
- Create: `attendance.html`

- [ ] **Step 1: Add the page shell and shared sidebar**

```html
<aside class="sidebar">
  <div class="brand">...</div>
  <nav class="nav">
    <a class="nav-item active" href="attendance.html">출결현황</a>
    <a class="nav-item" href="index.html#meetings-section">회의자료</a>
    <a class="nav-item" href="index.html#retreat-section">수련회 계획</a>
    <a class="nav-item" href="index.html#budget-section">예산 및 결산</a>
    <a class="nav-item" href="index.html#reports-section">행사 보고서</a>
    <a class="nav-item" href="index.html#archive-section">보관함</a>
    <a class="nav-item" href="index.html#trash-section">휴지통</a>
  </nav>
</aside>
```

- [ ] **Step 2: Add summary, weekly, and monthly containers**

```html
<main class="content">
  <section class="hero">
    <h1>중고등부 출결현황</h1>
    <p>최근 주간 흐름과 월별 요약을 한 번에 확인합니다.</p>
  </section>

  <section class="section">
    <div class="stats-grid" id="attendance-summary">
      <div class="stat-card"><span>최근 주일</span><strong id="stat-latest-attendance">-</strong></div>
      <div class="stat-card"><span>이번 달 평균</span><strong id="stat-month-average">-</strong></div>
      <div class="stat-card"><span>이번 달 주차</span><strong id="stat-month-weeks">-</strong></div>
      <div class="stat-card"><span>평균 출석률</span><strong id="stat-month-rate">-</strong></div>
    </div>
  </section>

  <section class="section">
    <div class="section-head"><h2 class="section-title">최근 주간</h2></div>
    <div class="recent-list" id="attendance-week-list"></div>
  </section>

  <section class="section">
    <div class="section-head"><h2 class="section-title">월별 요약</h2></div>
    <div class="month-grid" id="attendance-month-list"></div>
  </section>
</main>
```

- [ ] **Step 3: Add load/failure rendering hooks**

```html
<script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js"></script>
<script src="attendance-config.js"></script>
<script src="attendance-sync.js"></script>
<script>
  window.addEventListener("DOMContentLoaded", function () {
    renderAttendanceDashboard({
      summaryRoot: document.getElementById("attendance-summary"),
      weekRoot: document.getElementById("attendance-week-list"),
      monthRoot: document.getElementById("attendance-month-list"),
      latestAttendanceId: "stat-latest-attendance",
      monthAverageId: "stat-month-average",
      monthWeeksId: "stat-month-weeks",
      monthRateId: "stat-month-rate"
    });
  });
</script>
```

- [ ] **Step 4: Open the page locally and confirm layout loads**

Run: `python3 -m http.server 4173`
Expected: local server starts for `yc-young-2026`

- [ ] **Step 5: Commit**

```bash
git -C /Users/kimwoojung/Documents/New\ project/yc-young-2026 add attendance.html
git -C /Users/kimwoojung/Documents/New\ project/yc-young-2026 commit -m "Add attendance dashboard page"
```

---

### Task 4: Put attendance first on the homepage and wire the entry point

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Move the sidebar order so attendance is first**

```html
<nav class="nav">
  <a class="nav-item active" href="attendance.html">출결현황</a>
  <a class="nav-item" href="#meetings-section" data-nav-target="meetings-section">회의자료</a>
  <a class="nav-item" href="#retreat-section" data-nav-target="retreat-section">수련회 계획</a>
  <a class="nav-item" href="#budget-section" data-nav-target="budget-section">예산 및 결산</a>
  <a class="nav-item" href="#reports-section" data-nav-target="reports-section">행사 보고서</a>
  <a class="nav-item" href="#archive-section" data-nav-target="archive-section">보관함</a>
  <a class="nav-item" href="#trash-section" data-nav-target="trash-section">휴지통</a>
</nav>
```

- [ ] **Step 2: Add the attendance card/section above meeting materials**

```html
<section class="section" id="attendance-section">
  <div class="section-head">
    <h2 class="section-title">출결현황</h2>
  </div>
  <p class="section-copy">중고등부 최근 출결과 월별 흐름을 바로 확인합니다.</p>
  <div class="resource-grid">
    <a class="resource-card meeting" href="attendance.html">
      <span class="tag">읽기 전용</span>
      <h3>중고등부 출결현황</h3>
      <div class="resource-meta">열기 →</div>
    </a>
  </div>
</section>
```

- [ ] **Step 3: Keep meeting documents below attendance**

```html
<section class="section" id="meetings-section">
  <div class="section-head">
    <h2 class="section-title">회의자료</h2>
    <a class="section-action" href="meeting-editor.html?new=1">새 문서</a>
  </div>
  <p class="section-copy">5월, 6월처럼 작성된 일반 회의 문서가 여기 표시됩니다.</p>
  <div class="recent-list" id="recent-list">
    <div class="recent-empty">최근 회의자료를 불러오는 중입니다.</div>
  </div>
</section>
```

- [ ] **Step 4: Validate the homepage markup**

Run: `node --check /Users/kimwoojung/Documents/New\ project/yc-young-2026/index.html`
Expected: this fails because HTML is not JavaScript; instead verify with a browser load in Task 5

- [ ] **Step 5: Browser-check both pages**

Run: `curl -I http://127.0.0.1:4173/`
Expected: `HTTP/1.0 200 OK`

Run: `curl -I http://127.0.0.1:4173/attendance.html`
Expected: `HTTP/1.0 200 OK`

- [ ] **Step 6: Commit**

```bash
git -C /Users/kimwoojung/Documents/New\ project/yc-young-2026 add index.html
git -C /Users/kimwoojung/Documents/New\ project/yc-young-2026 commit -m "Prioritize attendance entry in homepage navigation"
```

---

### Task 5: Render live attendance states and verify fallback behavior

**Files:**
- Modify: `attendance-sync.js`
- Modify: `attendance.html`

- [ ] **Step 1: Add render helpers for loading, empty, success, and failure**

```js
function renderMessage(target, text) {
  target.innerHTML = '<div class="recent-empty">' + text + '</div>';
}

function renderWeekCards(target, entries) {
  target.innerHTML = entries.map(function (entry) {
    return `
      <article class="recent-item">
        <div class="recent-item-main">
          <div class="recent-item-title">${entry.reportDate}</div>
          <div class="recent-item-meta">출석 ${entry.attendance}명${entry.totalMembers ? " / 총원 " + entry.totalMembers + "명" : ""}${entry.rate !== null ? " · " + entry.rate + "%" : ""}</div>
        </div>
      </article>
    `;
  }).join("");
}

function renderMonthCards(target, months) {
  target.innerHTML = months.map(function (month) {
    return `
      <article class="resource-card">
        <span class="tag">월별</span>
        <h3>${month.month}</h3>
        <div class="resource-meta">평균 ${month.averageAttendance}명 · ${month.weekCount}주</div>
        <div class="recent-item-meta">최고 ${month.maxAttendance}명 · 최저 ${month.minAttendance}명</div>
      </article>
    `;
  }).join("");
}
```

- [ ] **Step 2: Add the main page renderer**

```js
async function renderAttendanceDashboard(options) {
  const weekRoot = options.weekRoot;
  const monthRoot = options.monthRoot;
  renderMessage(weekRoot, "출결현황을 불러오는 중입니다.");
  renderMessage(monthRoot, "월별 요약을 계산하는 중입니다.");

  try {
    const config = getAttendanceConfig();
    const entries = await fetchAttendanceReports();
    if (!entries.length) {
      renderMessage(weekRoot, "표시할 중고등부 출결 데이터가 없습니다.");
      renderMessage(monthRoot, "월별 요약 데이터가 없습니다.");
      return;
    }

    const latest = entries[0];
    const monthSummary = summarizeCurrentMonth(entries);
    const weeks = summarizeRecentWeeks(entries, config.recentWeeks || 8);
    const months = summarizeMonths(entries, config.recentMonths || 12);

    document.getElementById(options.latestAttendanceId).textContent = latest.attendance + "명";
    document.getElementById(options.monthAverageId).textContent = monthSummary.averageAttendance + "명";
    document.getElementById(options.monthWeeksId).textContent = String(monthSummary.weekCount);
    document.getElementById(options.monthRateId).textContent = monthSummary.averageRate !== null ? monthSummary.averageRate + "%" : "-";

    renderWeekCards(weekRoot, weeks);
    renderMonthCards(monthRoot, months);
  } catch (error) {
    console.error(error);
    renderMessage(weekRoot, "출결현황을 불러오지 못했습니다. 수정은 ministry-report-v2에서 계속 진행해 주세요.");
    renderMessage(monthRoot, "출결현황 권한 또는 설정을 확인해 주세요.");
  }
}
```

- [ ] **Step 3: Smoke-test the page with missing config**

Run: `python3 -m http.server 4173`
Expected: local server starts if not already running

Run: open `http://127.0.0.1:4173/attendance.html`
Expected: a graceful failure message appears instead of a blank page when config values are empty

- [ ] **Step 4: Smoke-test the page with valid config**

Run: open `http://127.0.0.1:4173/attendance.html`
Expected: summary cards, weekly cards, and monthly cards render from `reports` documents once valid Firebase web config and read permissions are present

- [ ] **Step 5: Commit**

```bash
git -C /Users/kimwoojung/Documents/New\ project/yc-young-2026 add attendance-sync.js attendance.html
git -C /Users/kimwoojung/Documents/New\ project/yc-young-2026 commit -m "Render middle-high attendance dashboard states"
```

---

## Self-Review

- Spec coverage:
  - Nav first: Task 4
  - Homepage priority: Task 4
  - Separate attendance page: Task 3
  - Firestore `reports` read: Task 2
  - Middle/high only: Task 2
  - Weekly and monthly summaries: Tasks 2 and 5
  - Error/empty handling: Task 5
- Placeholder scan:
  - No `TODO` or `TBD` strings in tasks
  - The only open dependency is the real Firebase web config, handled explicitly in Task 1
- Type consistency:
  - Uses `departments.middleHigh`, `reportDate`, `attendance`, and `members` consistently with `ministry-report-v2`

---

Plan complete and saved to `docs/superpowers/plans/2026-06-25-attendance-dashboard.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**

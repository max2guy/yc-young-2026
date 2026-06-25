# yc-young-2026 — Codex Handoff (v2026-06-25)

## 현재 상태
- 브랜치: main
- 최근 커밋: `fba81c4` Render middle-high attendance dashboard states
- GitHub: https://github.com/max2guy/yc-young-2026
- 배포: https://max2guy.github.io/yc-young-2026/ (GitHub Pages)

---

## 완료된 작업

### 출결 대시보드 구현 (6개 커밋, 2026-06-25)
Codex가 로컬에서 구현 완료 후 토큰 만료로 중단 → Claude가 rebase 후 푸시 완료

**추가/수정 파일:**
- `attendance-config.js` (신규): Firebase 설정 계약 파일. **현재 빈 값** — Firebase 콘솔에서 채워야 함
- `attendance-sync.js` (신규): Firestore 읽기 + 집계 + 렌더 헬퍼 전체 (713줄)
- `attendance.html` (신규): 중고등부 출결 대시보드 페이지 (488줄)
- `index.html` (수정): 네비게이션 첫 번째 항목으로 출결현황 추가, 출결 섹션 및 카드 추가

**구조:**
```
nav 순서: 출결현황 → 회의자료 → 수련회 계획 → 예산 및 결산 → 행사 보고서 → 보관함 → 휴지통
출결 데이터: ministry-report-v2 Firestore > reports 컬렉션 > departments.middleHigh
```

---

## ⚠️ 유일하게 남은 작업

### `attendance-config.js` Firebase 설정값 채우기

파일 경로: `attendance-config.js`

현재 상태 (빈 값):
```js
window.MINISTRY_ATTENDANCE_CONFIG = {
  firebase: {
    apiKey: "",          // ← 채워야 함
    authDomain: "",      // ← 채워야 함
    projectId: "",       // ← 채워야 함
    storageBucket: "",   // ← 채워야 함
    messagingSenderId: "", // ← 채워야 함
    appId: ""            // ← 채워야 함
  },
  collection: "reports",
  departmentKey: "middleHigh",
  recentWeeks: 8,
  recentMonths: 12
};
```

**값 출처:** Firebase 콘솔 → `ministry-report-v2` 프로젝트 → 프로젝트 설정 → 앱 설정 → 웹 앱 SDK 설정

**주의:** `.gitignore`에 추가하지 말 것. 이 값은 공개 브라우저 설정이며, Firestore 보안 규칙으로 읽기 권한을 관리함.

---

## 프로젝트 개요

- **스택:** 순수 HTML/CSS/JS, Firebase Web SDK (compat), GitHub Pages 배포
- **데이터 소스:**
  - `ministry-report-v2` Firestore (출결 대시보드용, 읽기 전용)
  - `yc-young-2026` Firebase Realtime Database (회의자료 편집기용)
- **인증 없음:** 공개 링크로 접근, Firestore 규칙에서 읽기 허용 필요

## 주요 파일
- `index.html`: 홈 페이지 — 사이드바 + 모든 섹션 (출결현황 포함)
- `attendance.html`: 출결 대시보드 전용 페이지
- `attendance-sync.js`: Firestore 읽기, 집계, 렌더 헬퍼
- `attendance-config.js`: Firebase 설정 계약 (값 채워야 함)
- `meeting-editor.html`: 회의자료 편집기 (contenteditable 기반)
- `sync-config.js`: 회의자료용 Realtime Database 설정

## 빌드 & 배포
```bash
# 배포 없음 — GitHub main 브랜치 push시 GitHub Pages 자동 반영
git push origin main
```

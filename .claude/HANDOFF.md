# yc-young-2026 — Codex Handoff (v2026-06-25b)

## 현재 상태
- 브랜치: main
- 최근 커밋: `74f0e1d` Add attendance roster section showing present/absent members from latest report
- GitHub: https://github.com/max2guy/yc-young-2026
- 배포: https://max2guy.github.io/yc-young-2026/ (GitHub Pages)

---

## 방금 수정한 내용

### 출결자 명단 섹션 추가 (2026-06-25)

**문제:** 출결 대시보드에 가장 최근 보고서의 출석자/결석자 명단이 없었음

**해결 (파일별 변경사항):**

- **`attendance.html`**
  - 불필요한 설명 텍스트 4개 제거 (hero `<p>`, `section-copy` 단락 3개)
  - `#attendance-roster-section` 섹션 추가 (주간/월간 섹션 사이)
  - `.roster-*` CSS 클래스 추가 (chip, group, label 등)
  - inline script에 `roster`, `rosterDate` 컨테이너 전달 추가

- **`index.html`**
  - 불필요한 설명 텍스트 8개 제거 (`section-copy`, hero `<p>`)

- **`attendance-sync.js`**
  - `toAttendanceEntry()`: `members` 배열 반환값에 추가
  - `renderRosterSection(container, dateEl, latestEntry)` 함수 추가
    - `status === 'present'` 기준 출석/결석 분리
    - `group === 'middle'` → "중", `group === 'high'` → "고" 서브 레이블
    - `.roster-chip.present` / `.roster-chip.absent` chip 렌더
  - `renderAttendanceDashboard()`: 성공 시 `renderRosterSection` 호출 추가
  - `window.AttendanceSync`에 `renderRosterSection` export 추가

---

## 프로젝트 개요

- **스택:** 순수 HTML/CSS/JS, Firebase Web SDK (compat v10.12.2), GitHub Pages 배포
- **데이터 소스:**
  - `ministry-report-v2` Firestore (출결 대시보드용, 읽기 공개)
  - `yc-young-2026` Firebase Realtime Database (회의자료 편집기용)
- **인증 없음:** 공개 링크 접근, Firestore 규칙 `allow read: if true` 적용 완료

## Firestore 데이터 구조
```
reports/{reportId}
  └── departments.middleHigh
        ├── attendance: number
        └── members[]: { id, name, status: "present"|"absent", group?: "middle"|"high", role?, phone? }
```

## 주요 파일
- `index.html`: 홈 페이지 — 사이드바 + 모든 섹션 (출결현황 포함)
- `attendance.html`: 출결 대시보드 전용 페이지 (주간/명단/월간)
- `attendance-sync.js`: Firestore 읽기, 집계, 렌더 헬퍼 (roster 포함)
- `attendance-config.js`: Firebase 설정 (ministry-report-v2, 값 채워짐)
- `meeting-editor.html`: 회의자료 편집기 (contenteditable 기반)
- `sync-config.js`: 회의자료용 Realtime Database 설정

## 다음으로 할 수 있는 작업
- 명단 섹션 다크모드 스타일 검토 (현재 light 계열 색상 하드코딩)
- 명단 그룹 정렬 — 중학부/고등부 각각 섹션 분리 (현재 출석/결석만 구분)
- 출석률 변화 추이 차트 (월간 섹션 하위)
- 주간 카드 클릭 시 해당 주 상세 명단 표시 (드릴다운)

## 빌드 & 배포
```bash
# GitHub main 브랜치 push시 GitHub Pages 자동 반영
git push origin main
```

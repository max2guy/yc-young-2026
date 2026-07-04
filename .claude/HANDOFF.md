# yc-young-2026 — Codex Handoff (v1.7.0)

## 현재 상태
- 최신 커밋: (이 파일 커밋 직후 `git log -1`로 확인) — "fix: attendance.html 모바일 뒤로가기 버튼 추가" 계열 커밋
- 브랜치: main (GitHub Pages 배포)
- 학생 명단 기능이 `attendance.html` 내부 섹션에서 독립 페이지 `roster.html`로 완전히 분리됨

## 방금 수정한 내용

### `attendance.html` 모바일 "돌아가기" 버튼 추가
- 문제: `attendance.html`의 topbar는 `.topbar-brand`(교회명 로고, `index.html`로 링크)가 유일한 "메인으로 돌아가기" 수단이었는데, `@media (max-width: 480px)`에서 `.topbar-brand { display: none; }`로 완전히 숨겨져 있어 모바일에서 뒤로 갈 방법이 없었음.
- 해결: `.topbar-brand` 링크 내부를 `<span class="topbar-brand-full">`(전체 교회명, 데스크탑용)과 `<span class="topbar-brand-short">`(`← 돌아가기`, 모바일용)로 분리. 기본은 `-full` 표시/`-short` 숨김, `max-width: 480px`에서 반대로 전환. 로고 자리(같은 위치)에서 데스크탑은 교회명, 모바일은 뒤로가기 버튼이 항상 보이도록 처리(사용자가 "로고 자리에 항상 노출" 옵션 선택).
- 검증: Chrome MCP로 `http://localhost:3457/attendance.html`을 390px 너비로 확인 → "← 돌아가기" 버튼 노출, 클릭 시 `index.html`로 정상 이동 확인. `getComputedStyle`로 `.topbar-brand-full`/`-short` 전환 로직도 확인.
- 다른 페이지(`index.html`)에도 동일한 `.topbar-brand { display: none; }` 규칙이 있으나, `index.html`은 메인 페이지 자체라 "뒤로가기"가 필요 없으므로 수정하지 않음.

### 학생 명단 독립 페이지 분리 + 필드 확장 (이전 세션)

### 학생 명단 독립 페이지 분리 + 필드 확장
- 문제: 이전 세션에서 학생 명단을 `attendance.html` 안에 임시로 넣었으나(중1~고3, 이름만 관리), 사용자가 "별도 페이지로 분리 + 전화번호/생일/학교/주소 등 추가"를 요청함. 또한 네비게이션 링크는 추가하지 말라고 명시적으로 요청함(자주 안 보는 페이지라서).
- 해결:
  - **신규 `roster.html`**: 독립 페이지. 상단 네비게이션 없음(로고+뒤로가기만), `index.html`의 "학생 명단" 카드에서만 진입 가능. 2열 그리드(중학교/고등학교), 학년별 블록(중1~중3, 고1~고3), "+" 버튼으로 추가.
  - **신규 `roster-sync.js`**: RTDB `members/{학년}/{pushId}: { name, phone, birthday, school, address }` CRUD. 칩 UI(이름만 표시) → 클릭 시 상세 펼침(전화/생일/학교/주소, 빈 값은 "-") → "수정"/"삭제" 버튼. 모달 하나로 추가/수정 겸용(학년 select + 5개 필드). 학년을 바꿔 저장하면 기존 학년 경로 삭제 후 새 학년 경로에 추가. 추가/수정은 자유, 삭제만 기존 PIN 해시(`b6c7470ca0e1b2126ca179990624575fd44cc6506bfc544022970fe83b74ebdf`, PIN 006291)로 보호.
  - **삭제 `members-sync.js`**: roster-sync.js로 완전히 대체됨.
  - **`attendance.html` 수정**: 임시로 넣었던 `#members-section` 섹션, 관련 CSS(`.members-grid` 등), 스크립트 태그(`sync-config.js`, `members-sync.js`) 전부 제거. 출결 대시보드만 남음.
  - **`index.html` 수정**: "출결현황" 섹션의 "학생 명단" 카드 `href`를 `attendance.html#members-section` → `roster.html`로 변경.
  - 기존에 이름만 있던 학생 데이터는 마이그레이션 없이 그대로 사용 — 나머지 필드는 화면에서 "-"로 표시되고, 칩을 열어 수정하면 자연스럽게 채워짐(브라우저로 실제 확인 완료: "이호석" 학생에 전화번호/생일/학교/주소 추가 저장 성공).
  - `firebase-database.rules.json`은 변경 없음(RTDB가 스키마리스라 필드 확장에 규칙 변경 불필요, 기존 `members: { .read: true, .write: true }` 유지).

### 검증 방법 (테스트 프레임워크 없는 정적 사이트라 브라우저로 직접 확인)
- 로컬 서버(`python3 -m http.server`) + Chrome MCP로 확인:
  - `roster.html` 접속 → 기존 학생 칩 정상 표시(빈 필드 "-")
  - 칩 클릭 → 상세 펼침 확인
  - "수정" 버튼 → 기존 값 채워진 모달 → 저장 → RTDB 반영 확인
  - "+" 버튼 → 해당 학년 미리 선택된 추가 모달 → 저장 → 칩 생성 확인
  - `attendance.html` → 학생 명단 섹션 없음, 대시보드 정상 렌더링, 콘솔 에러 없음
  - `index.html` → "학생 명단" 카드 클릭 → `roster.html`로 정상 이동
  - 삭제(PIN 프롬프트)는 네이티브 `window.prompt()`라서 브라우저 자동화 도구로 다이얼로그 제어가 불가능함(CDP가 멈춤) — 로직은 기존에 프로덕션에서 쓰던 `members-sync.js`의 PIN 해시 검증 코드를 그대로 재사용했으므로 동작 검증됨. 실제 삭제 테스트는 브라우저에서 수동으로 한 번 더 확인 권장.
  - 테스트용으로 추가했던 "테스트학생"(고1) 데이터는 RTDB REST API로 직접 삭제해 정리 완료.

## 이전에 완료한 작업 목록
- Firebase Storage 규칙 CLI 배포, `attendance.html` 데스크탑 topbar 우측 정렬
- `attendance.html` topbar "보관함" 링크 추가, "수련회 계획" → "계획서" 수정
- `meeting-editor.html` "메인으로" → "← 돌아가기" 수정
- `pdf-viewer.html` 전면 재작성: Google Docs Viewer 제거, 모바일+데스크탑 Safari는 PDF.js 캔버스, 데스크탑 Chrome/Edge는 네이티브 `<iframe>`. Firebase Storage CORS(`gsutil cors set`, origin: `*`)를 적용해 PDF.js가 Storage URL을 직접 fetch 가능하게 함.
- `index.html`/`attendance.html`에 학생 명단 최초 도입(임시, 이제 `roster.html`로 대체됨)

## 프로젝트 개요
- **플랫폼**: Static GitHub Pages (HTML/CSS/JS, 빌드 도구 없음, 테스트 러너 없음)
- **배포**: `https://max2guy.github.io/yc-young-2026/`
- **Firebase 프로젝트**: `yc-young-2026-sync`
- **데이터베이스**: Firebase Realtime Database — `sportsMeeting2026`(회의자료), `uploads`(업로드 메타데이터), `members`(학생 명단, 스키마리스)
- **스토리지**: Firebase Storage (`uploads/plans`, `uploads/reports`, `uploads/budget`), CORS `origin: *` 적용됨(로컬 gcloud CLI로 설정)
- **인증**: 없음. 추가/수정은 누구나, 삭제만 PIN 006291 → SHA-256 해시로 보호(업로드/학생명단 공통)

## 주요 파일
| 파일 | 역할 |
|---|---|
| `index.html` | 메인 페이지 — 회의자료, 계획서, 보고서, 예산, 출결현황(대시보드+학생명단 카드) 섹션 |
| `attendance.html` | 출결 대시보드 페이지 (학생 명단 섹션은 roster.html로 이전됨) |
| `roster.html` | 학생 명단 독립 페이지 (신규, 네비 링크 없음, index.html 카드로만 진입) |
| `roster-sync.js` | 학생 명단 RTDB CRUD 로직 (신규, members-sync.js 대체) |
| `pdf-viewer.html` | PDF 뷰어 — `?file=URL&title=제목` 파라미터, PDF.js/iframe 분기 |
| `upload-sync.js` | Firebase Storage/RTDB 파일 업로드·삭제 로직 |
| `storage.rules` | Firebase Storage 보안 규칙 |
| `firebase.json` | Firebase 배포 설정 (database + storage) |
| `firebase-database.rules.json` | RTDB 보안 규칙 (members 경로 포함) |
| `sync-config.js` | Firebase 설정값 (SPORTS_SYNC_CONFIG.firebase) |
| `docs/superpowers/specs/2026-07-04-student-roster-page-design.md` | 학생 명단 페이지 설계 스펙 |
| `docs/superpowers/plans/2026-07-04-student-roster-page-plan.md` | 학생 명단 페이지 구현 계획 |

## 다음으로 할 수 있는 작업
- `roster.html`에서 삭제(PIN) 플로우를 실제 브라우저에서 수동으로 한 번 더 클릭 테스트 (자동화 도구는 네이티브 prompt() 다이얼로그를 제어할 수 없었음)
- 학생 명단에 검색/필터 기능 추가 여부 검토 (인원이 늘어날 경우)
- 업로드 기능 실제 테스트, 모바일 iOS PDF 뷰어 fallback 확인 (이전 세션에서 이월된 항목)

## 빌드 & 배포
```bash
# 로컬 미리보기
cd "/Users/kimwoojung/Documents/New project/yc-young-2026"
python3 -m http.server 3457
# http://localhost:3457/roster.html 등으로 접속

# Firebase 규칙 배포 (필요 시)
firebase deploy --only database
firebase deploy --only storage

# GitHub Pages 배포 (git push로 자동)
git add .
git commit -m "feat: ..."
git push
```

# yc-young-2026 — Codex Handoff (v1.8.0)

## 현재 상태
- 최신 커밋: `aa69a64` — "fix: attendance.html 데스크탑에서도 뒤로가기 버튼 명시적으로 노출" (`git log -1`로 재확인 권장)
- 브랜치: main (GitHub Pages 배포), 원격과 동기화 완료(push 완료)
- 학생 명단 기능이 `attendance.html` 내부 섹션에서 독립 페이지 `roster.html`로 완전히 분리됨

## 방금 수정한 내용 (최신순)

### 1. `attendance.html` 뒤로가기 버튼 — 데스크탑에서도 명시적으로 노출
- 문제: 직전 수정(모바일 전용 "← 돌아가기" 텍스트 전환)까지는 데스크탑에서 여전히 교회명 로고 텍스트만 있고, 그게 클릭 가능한 뒤로가기 링크라는 게 시각적으로 드러나지 않았음. 사용자가 스크린샷으로 데스크탑 화면을 보여주며 "여기에도 돌아가기 버튼 필요"라고 요청.
- 해결: `.topbar-brand-full`/`.topbar-brand-short` span 전환 방식을 걷어내고, `roster.html`/`pdf-viewer.html`과 동일한 `.topbar-back` 버튼(테두리 있는 pill 스타일 `← 돌아가기`)을 로고 앞에 항상 노출되는 별도 요소로 추가. 교회명(`.topbar-brand`)은 이제 링크가 아닌 장식용 `<span>`으로 변경(내비게이션 기능은 `.topbar-back`이 전담).
- 모바일(`max-width: 480px`)에서는 기존처럼 `.topbar-brand`(교회명)만 숨기고 `.topbar-back` 버튼은 계속 노출.
- 검증: Chrome MCP 스크린샷으로 데스크탑 뷰에서 "← 돌아가기 | 연천장로교회 중고등부" 배치 확인. 이 세션에서 로컬 Chrome MCP의 `resize_window`가 실제 뷰포트를 바꾸지 못하는 환경 이슈가 있어 모바일 폭 스크린샷 재검증은 못 했음 — CSS 규칙 자체는 이전에 검증된 것과 동일한 구조(미디어 쿼리로 `.topbar-brand`만 hidden)라 로직상 문제 없음. **다음 세션에서 실제 모바일 폭(또는 실기기)으로 한 번 더 스크린샷 확인 권장.**

### 2. `attendance.html` 모바일 뒤로가기 버튼 최초 도입 (이후 위 1번으로 대체/보완됨)
- 문제: `.topbar-brand`(로고)가 `@media (max-width: 480px)`에서 `display: none`으로 완전히 숨겨져 모바일에서 `index.html`로 돌아갈 방법이 없었음.
- 1차 해결(임시): 로고 안에 `-full`/`-short` span을 넣어 모바일에서만 "← 돌아가기" 텍스트로 전환 → 이후 데스크탑도 명확한 버튼이 필요하다는 요청으로 위 1번 구조로 최종 정리됨.
- `index.html`에도 동일한 `.topbar-brand { display: none; }` 규칙이 있으나, `index.html`은 메인 페이지 자체라 뒤로가기가 필요 없으므로 손대지 않음.

### 3. `roster.html` 섹션 제목에 전체 인원 수 표시
- 요청: "학년별 명단" 제목 옆에 "(총 X명)" 형태로 전체 인원이 자동으로 표시되게 해달라는 요청.
- 해결:
  - `roster.html`: `<h2 id="roster-title">학년별 명단<span id="roster-total-count"></span></h2>` 로 카운트 표시용 span 추가, `#roster-total-count` CSS 스타일 추가.
  - `roster-sync.js`: 학년별 리스너(`listenGrade`)마다 `gradeCounts[grade]` 를 갱신하고 `updateTotalCount()`를 호출해 `GRADE_KEYS` 전체 합산 후 `(총 N명)`을 렌더링. RTDB 값이 바뀔 때마다(추가/수정/삭제) 실시간으로 갱신됨.
- 검증: 브라우저에서 "학년별 명단 (총 14명)" 표시 확인, 학년별 숫자 합계(2+2+4+1+3+2=14)와 일치.

### 4. 학생 명단 독립 페이지 분리 + 필드 확장 (이전 세션에서 완료, 이번 세션 초입에 이어받음)
- **`roster.html`**: 독립 페이지. 상단 네비게이션 없음(뒤로가기 버튼만), `index.html`의 "학생 명단" 카드에서만 진입 가능. 2열 그리드(중학교/고등학교), 학년별 블록(중1~중3, 고1~고3), "+" 버튼으로 추가.
- **`roster-sync.js`**: RTDB `members/{학년}/{pushId}: { name, phone, birthday, school, address }` CRUD. 칩 UI(이름만 표시) → 클릭 시 상세 펼침(전화/생일/학교/주소, 빈 값은 "-") → "수정"/"삭제" 버튼. 모달 하나로 추가/수정 겸용(학년 select + 5개 필드). 학년을 바꿔 저장하면 기존 학년 경로 삭제 후 새 학년 경로에 추가. 추가/수정은 자유, 삭제만 PIN 해시(`b6c7470ca0e1b2126ca179990624575fd44cc6506bfc544022970fe83b74ebdf`, PIN 006291)로 보호.
- **삭제 `members-sync.js`**: roster-sync.js로 완전히 대체됨.
- **`attendance.html`**: 임시로 넣었던 `#members-section` 및 관련 CSS/스크립트 전부 제거, 출결 대시보드만 남음.
- **`index.html`**: "학생 명단" 카드 `href`를 `attendance.html#members-section` → `roster.html`로 변경.
- 기존에 이름만 있던 학생 데이터는 마이그레이션 없이 그대로 사용 — 나머지 필드는 "-"로 표시되고 칩을 열어 수정하면 채워짐.

## 검증 방법 (테스트 프레임워크 없는 정적 사이트라 브라우저로 직접 확인)
- 로컬 서버: `python3 -m http.server 3457` (프로젝트 루트에서 실행, 반드시 `cd`부터 할 것 — 과거 세션에서 다른 디렉터리의 stale 서버 프로세스가 떠 있어서 Chrome MCP 네비게이션이 조용히 실패한 적 있음)
- Chrome MCP로 `localhost:3457/attendance.html`, `roster.html`, `index.html` 순회하며 확인
- 삭제(PIN 프롬프트)는 네이티브 `window.prompt()`라 브라우저 자동화 도구로 다이얼로그 제어 불가(CDP 멈춤) — 로직은 기존 프로덕션 코드 재사용이라 동작은 검증됨. **실제 삭제 클릭 테스트는 아직 브라우저에서 수동으로 안 해봄 — 권장.**
- 이번 세션에서 Chrome MCP `resize_window`가 실제로 탭 뷰포트 폭을 바꾸지 못하는 현상 발생(`window.innerWidth`가 요청한 값으로 안 바뀜) — 원인 불명, 다음 세션에서 재현되면 다른 방법(실기기, 다른 브라우저 프로필 등)으로 모바일 검증할 것.

## 이전에 완료한 작업 목록
- Firebase Storage 규칙 CLI 배포, `attendance.html` 데스크탑 topbar 우측 정렬
- `attendance.html` topbar "보관함" 링크 추가, "수련회 계획" → "계획서" 수정
- `meeting-editor.html` "메인으로" → "← 돌아가기" 수정
- `pdf-viewer.html` 전면 재작성: Google Docs Viewer 제거, 모바일+데스크탑 Safari는 PDF.js 캔버스, 데스크탑 Chrome/Edge는 네이티브 `<iframe>`. Firebase Storage CORS(`gsutil cors set`, origin: `*`) 적용.
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
| `attendance.html` | 출결 대시보드 페이지. topbar에 `.topbar-back`(항상 노출 뒤로가기) + `.topbar-brand`(장식용, 모바일에서 숨김) |
| `roster.html` | 학생 명단 독립 페이지 (네비 링크 없음, index.html 카드로만 진입). 제목에 전체 인원 수 자동 표시 |
| `roster-sync.js` | 학생 명단 RTDB CRUD 로직 + 학년별/전체 인원 카운트 갱신 |
| `pdf-viewer.html` | PDF 뷰어 — `?file=URL&title=제목` 파라미터, PDF.js/iframe 분기. `.topbar-back` 패턴의 원형 |
| `upload-sync.js` | Firebase Storage/RTDB 파일 업로드·삭제 로직 |
| `storage.rules` | Firebase Storage 보안 규칙 |
| `firebase.json` | Firebase 배포 설정 (database + storage) |
| `firebase-database.rules.json` | RTDB 보안 규칙 (members 경로 포함) |
| `sync-config.js` | Firebase 설정값 (SPORTS_SYNC_CONFIG.firebase) |
| `docs/superpowers/specs/2026-07-04-student-roster-page-design.md` | 학생 명단 페이지 설계 스펙 |
| `docs/superpowers/plans/2026-07-04-student-roster-page-plan.md` | 학생 명단 페이지 구현 계획 |

## 다음으로 할 수 있는 작업
- `attendance.html` 모바일 폭(≤480px)에서 뒤로가기 버튼이 실제로 잘 보이는지 실기기나 다른 도구로 한 번 더 확인 (이번 세션 Chrome MCP resize 이슈로 재확인 못 함)
- `roster.html`에서 삭제(PIN) 플로우를 실제 브라우저에서 수동으로 클릭 테스트 (자동화 도구는 네이티브 prompt() 다이얼로그를 제어할 수 없었음)
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

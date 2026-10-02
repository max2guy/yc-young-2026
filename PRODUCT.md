# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

연천장로교회 중고등부 교사들. 별도 로그인 없이 URL만 알면 누구나 열람·수정할 수 있는 소규모 신뢰 기반 그룹 — 학생·학부모는 사용 대상이 아니다. 교사들은 회의 중 또는 회의 준비 중에 과거 회의자료, 수련회/행사 계획서, 보고서, 예산안, 출결 현황, 학생 명단을 찾아보거나 새로 기록한다.

## Product Purpose

중고등부 교사 회의에 필요한 모든 자료(회의자료, 계획서, 보고서, 예산, 출결, 학생 명단)를 한 사이트에서 열람·기록하는 자료실. 로그인 장벽 없이 빠르게 접근하되, 삭제처럼 되돌리기 어려운 조작만 PIN으로 보호한다. 성공은 "필요한 자료를 빠르게 찾아내는 것"이다 — 현재 섹션이 많아지면서(회의자료/계획서/예산/보고서/보관함) 원하는 문서를 찾으려면 여러 섹션을 뒤져야 하는 문제가 있다.

## Positioning

교회 내부용 무료 정적 사이트 + Firebase 실시간 동기화 조합으로, 별도 서버 비용이나 로그인 시스템 없이도 여러 교사가 같은 자료를 실시간으로 보고 고칠 수 있다. 상용 문서 협업 툴과 달리 이 교회 중고등부 업무 흐름(회의자료 에디터, PDF 계획서, 출결 대시보드, 학생 명단)에 맞춰 전용 페이지로 짜여 있다.

## Operating Context

- 정적 GitHub Pages 배포(`https://max2guy.github.io/yc-young-2026/`), 빌드 도구·테스트 러너 없음. 로컬 확인은 프로젝트 루트에서 `python3 -m http.server 3457`.
- Firebase Realtime Database로 데이터 동기화: `sportsMeeting2026`(회의자료 에디터 콘텐츠), `uploads/{plans,reports,budget}`(업로드 파일 메타데이터), `members/{학년}`(학생 명단).
- Firebase Storage에 업로드 파일 저장(`uploads/plans`, `uploads/reports`, `uploads/budget`), CORS `origin: *`.
- 주요 하위 페이지: `attendance.html`(출결 대시보드), `roster.html`(학생 명단), `pdf-viewer.html`(PDF 뷰어), `meeting-editor.html`(회의자료 편집기), `sports-meeting.html`(체육대회 회의자료 보관), `plan-viewer.html`, `feedback.html`, `camp-comparison.html`.
- index.html 섹션 구성: 출결현황 · 회의자료(recent-list, updatedAt 기준 최신순 이미 존재) · 계획서 · 예산 및 결산 · 행사 보고서 · 보관함 · 휴지통.

## Capabilities and Constraints

- 인증 없음. 추가/수정은 누구나 가능, **삭제만** PIN(SHA-256 해시 비교)으로 보호 — 업로드 삭제, 학생 명단 삭제 공통.
- **건드리지 말 것(사용자 명시 제약)**: 삭제 PIN 보호 로직, Firebase 보안 규칙(`firebase-database.rules.json`, `storage.rules`), 학생 명단 RTDB 스키마(`members/{학년}/{pushId}: { name, phone, birthday, school, address }`).
- 학생 명단에는 전화번호·생일·주소 등 미성년자 개인정보가 포함되어 있어 민감 데이터로 취급한다 — 검색 기능에 포함할지는 설계 단계에서 별도 확인 필요.
- 모바일(특히 ≤480px)에서도 정상 동작해야 함 — 교사들이 모바일로도 접속.
- 이번 라운드에서 명시적으로 제외: 다크 모드, 모바일 하단 내비게이션/PWA 전환.

## Brand Commitments

- 이름: "연천장로교회 중고등부" / 사이트 타이틀 "연천장로교회 중고등부 교사 회의 자료".
- 기존 주조색 `#163f6b`(네이비)와 배경 `#e6ebf1` 계열을 계승 요구됨 — 완전히 새로운 색상 체계로 교체하지 않음.
- 폰트: Noto Sans KR (현재 전 페이지 공통 사용 중).

## Evidence on Hand

- 실제 회의/행사 PDF 자료 다수 보유(`2026-middle-high-plan.pdf`, `2026-retreat-preevent-plan.pdf`, `2026-summer-retreat-plan.pdf`, `2026-sports-report.pdf`).
- 예산안은 외부 구글 시트 링크로 연결(별도 임베드 없음).
- 로고/워드마크 이미지 자산은 없음 — 현재는 텍스트 워드마크(`.topbar-brand`)만 사용.

## Product Principles

1. 로그인 장벽 없이 빠르게 접근 가능해야 한다 — 소규모 신뢰 기반 팀의 업무 도구다.
2. 삭제처럼 되돌릴 수 없는 조작만 보호하고, 나머지는 마찰 없이 열람·수정 가능해야 한다.
3. 자료를 "찾는 시간"을 줄이는 것이 이번 라운드 최우선 목표다 — 통합 검색과 업데이트 피드가 이를 위해 추가된다.
4. 기존 네이비 아이덴티티와 차분한 톤을 유지하면서 섹션 간 구분은 굵은 색 띠 대신 가는 선과 여백으로 표현한다(에디토리얼 톤).
5. 빌드 도구가 없는 순수 정적 사이트라는 제약 안에서 설계해야 한다 — 공유 CSS(`assets/tokens.css`, `assets/components.css`)로 통일성을 확보한다.

## Accessibility & Inclusion

학생 개인정보(전화번호·생일·주소)를 다루므로, 공개 통합 검색에 해당 필드를 그대로 노출할지는 설계 단계에서 신중히 결정해야 한다. 그 외 별도로 확정된 접근성 요구사항은 없음(스크린리더/대비 등 일반 모범사례를 따른다).

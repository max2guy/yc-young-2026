# yc-young-2026 리뉴얼: 디자인 통일 + 통합 검색 + 업데이트 피드

## 배경

9개 페이지(`index`, `attendance`, `roster`, `pdf-viewer`, `meeting-editor`, `sports-meeting`, `plan-viewer`, `feedback`, `camp-comparison`)가 서로 다른 팔레트(네이비/초록/청록/갈색/다양한 블루)와 두꺼운 색 띠로 섹션을 구분하고 있어, 이번 라운드에서 디자인을 네이비 한 가지로 통일하고, 흩어진 자료를 빠르게 찾을 수 있도록 통합 검색과 최근 업데이트 피드를 추가한다. 디자인 토큰은 `DESIGN.md`(2026-10-01 작성, 커밋 `9c8b444`)에 확정되어 있다.

## 건드리지 않는 것 (PRODUCT.md 제약)

- 삭제 PIN 보호 로직(SHA-256 해시 비교)
- Firebase 보안 규칙(`firebase-database.rules.json`, `storage.rules`)
- 학생 명단 RTDB 스키마(`members/{학년}/{pushId}: { name, phone, birthday, school, address }`)
- 다크 모드, 모바일 하단 내비게이션/PWA 전환(이번 라운드 범위 밖)

## 1. 페이지 구조

페이지 구성과 라우팅은 바꾸지 않는다. 변경은 두 가지뿐이다.

- `index.html` 히어로 타이틀 바로 아래, 기존 "출결현황" 섹션 위에 **통합 검색** 블록과 **최근 업데이트** 블록을 새로 삽입한다.
- 모든 페이지에 DESIGN.md 토큰을 반영하는 공유 CSS(`assets/tokens.css`, `assets/components.css`)를 적용해 네이비(`#163f6b`)+오프화이트(`#f3efe8`) 톤으로 통일한다. 각 페이지 고유 기능(회의자료 에디터, PDF 뷰어, 출결 대시보드, 체육대회 보관함 등)의 동작은 변경하지 않는다.

## 2. 통합 검색

### 범위

- 포함: `uploads/plans`, `uploads/reports`, `uploads/budget` (RTDB, 각 항목 `{title, url, storagePath, date}`), `meetingDocuments/{id}`(일반 회의자료, `{title, updatedAt, deletedAt?}` — `deletedAt`이 있는 휴지통 항목은 제외).
- 제외: `members/*`(학생 명단 — 전화번호·생일·주소 등 미성년자 개인정보 포함, PRODUCT.md Accessibility & Inclusion 항목에 따라 완전 제외로 확정), `sportsMeeting2026`(체육대회 회의자료는 단일 공유 편집 문서이며 제목 필드가 없어 검색 리스트 구조에 맞지 않음 — index.html:858-1215 확인 결과 정정).

### 동작

- `index.html` 로드 시 위 4개 RTDB 경로를 한 번에 읽어 클라이언트 메모리에 제목 기준 통합 인덱스를 만든다. 서버 쿼리나 별도 백엔드는 없다.
- 검색창 입력 시 제목 부분 문자열 매칭으로 실시간 필터링한다(디바운스 약 150ms). 결과가 없으면 "검색 결과 없음" 빈 상태 메시지를 보여준다.
- 결과 항목마다 출처 배지("계획서"/"보고서"/"예산"/"회의자료")를 `caption` 크기로 표시하고, 클릭 시 해당 문서 또는 페이지로 이동한다.

### UI

- 검색 입력창 하나(버튼 없이 타이핑 즉시 필터링 — 되돌릴 수 없는 동작이 아니므로 확인 버튼 불필요).
- 위치: 히어로 타이틀 바로 아래, 출결현황 섹션 위.

## 3. 업데이트 피드

### 데이터

- 통합 검색과 동일한 4개 소스에서 `date`(uploads) 또는 `updatedAt`(meetingDocuments) 기준 내림차순 정렬 후 상위 5건만 추린다.
- 5건 미만이면 있는 만큼만 표시하고, 빈 상태 메시지는 띄우지 않는다(데이터가 적은 것은 오류가 아니다).

### UI

- DESIGN.md `update-feed-item` 컴포넌트 사용: 카드로 감싸지 않고 `hairline`로만 행을 구분하는 밀도 높은 리스트.
- 왼쪽에 `accent-update`(`#c98a2c`) 점, 중앙에 제목+출처 배지, 오른쪽에 `caption` 굵기의 상대 시각("오늘", "2일 전" 등).
- 위치: 통합 검색 블록 바로 아래, 기존 "회의자료" 섹션 위.

## 4. 구현 접근

- 신규 로직은 `assets/home-search.js`(가칭) 파일 하나로 분리해 `index.html`에서만 로드한다. 다른 페이지는 영향받지 않는다.
- 기존 `upload-sync.js`의 RTDB 읽기 패턴을 재사용하되, 쓰기(push)는 건드리지 않는다.
- 디자인 통일은 `assets/tokens.css` + `assets/components.css`를 새로 만들어 각 페이지가 공유하고, 페이지별 `<style>`은 최소화한다. 페이지를 한 번에 하나씩 안전하게 이전한다(순서는 구현 계획에서 결정).
- 빌드 도구·테스트 러너 없음. 로컬 확인은 프로젝트 루트에서 `python3 -m http.server 3457`.

## 5. 검증 항목

- 모바일 폭(≤480px)에서 통합 검색/업데이트 피드가 가로 스크롤 없이 동작하는지 확인.
- 각 하위 페이지의 `.topbar-back`(← 돌아가기) 버튼이 공유 CSS 적용 후에도 동일하게 보이는지 확인.
- 통합 검색에 `members` 데이터가 섞여 들어가지 않는지(코드 리뷰 시 명시적으로 확인).
- 삭제 PIN 플로우, Firebase 규칙 파일이 이번 변경으로 수정되지 않았는지 diff로 확인.

## 미결 사항

없음 — 범위, 데이터 소스, 제외 항목 모두 사용자 확인 완료(2026-10-01).

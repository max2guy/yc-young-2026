---
name: 연천장로교회 중고등부 교사 회의 자료실
description: 차분한 네이비 에디토리얼 — 두꺼운 색 띠 대신 가는 선과 여백으로 구획하는 정적 자료실
colors:
  primary: "#163f6b"
  primary-deep: "#0f2d4d"
  primary-pressed: "#0a2238"
  primary-soft: "#d4e1ef"
  on-primary: "#ffffff"
  canvas: "#f3efe8"
  surface: "#ffffff"
  surface-sunken: "#ece7dd"
  ink: "#132231"
  ink-muted: "#4e5f70"
  ink-subtle: "#8a93a0"
  hairline: "#ddd6c8"
  hairline-strong: "#bcc7d3"
  accent-update: "#c98a2c"
  semantic-success: "#1a6b3c"
  semantic-error: "#c0392b"
  semantic-error-bg: "#f8e9e7"
typography:
  display:
    fontFamily: "Noto Sans KR, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "clamp(22px, 3vw, 30px)"
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "normal"
  heading:
    fontFamily: "Noto Sans KR, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "18px"
    fontWeight: 800
    lineHeight: 1.3
    letterSpacing: "normal"
  label:
    fontFamily: "Noto Sans KR, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "13px"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "0.2px"
  body:
    fontFamily: "Noto Sans KR, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  caption:
    fontFamily: "Noto Sans KR, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
rounded:
  sm: "7px"
  md: "10px"
  lg: "14px"
  xl: "16px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  xxl: "48px"
components:
  topbar-back:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "0 12px"
  section-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "18px 20px"
  section-card-hover:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
  cta-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
  cta-primary-hover:
    backgroundColor: "{colors.primary-deep}"
    textColor: "{colors.on-primary}"
---

## Overview

이 사이트는 로그인 없는 소규모 신뢰 그룹(중고등부 교사)을 위한 업무 자료실이다. 기존 9개 페이지가 각자 다른 팔레트(네이비, 초록, 갈색, 청록 등)와 두꺼운 색 띠로 섹션을 구분해 왔고, 이번 라운드의 목표는 "찾는 시간"을 줄이는 통합 검색·업데이트 피드를 더하면서, 흩어진 비주얼을 기존 네이비(`#163f6b`, index·attendance·roster·pdf-viewer·meeting-editor 5개 페이지에서 이미 지배적)로 수렴시키는 것이다.

참고 기준으로 IBM Carbon Design System(`~/.claude/references/awesome-design-md/design-md/ibm/DESIGN.md`)을 선택했다 — 흰 카드에 그림자 없는 얇은 테두리, 섹션을 가르는 가는 회색 선, 단 하나의 확신 있는 강조색이라는 철학이 "굵은 색 띠 대신 가는 선과 여백"이라는 이번 요구와 정확히 맞는다. 다만 Carbon의 시그니처인 라이트 웨이트(300) 대형 타이틀과 각진(0-4px) 모서리는 그대로 가져오지 않는다 — 기존 사이트는 굵은 제목(700-800)과 부드러운 모서리(10-16px)로 이미 일관돼 있고, 이건 "완전히 새로운 색상 체계로 교체하지 않는다"는 PRODUCT.md 제약과도 맞지 않는 변화이기 때문이다. Carbon에서 가져오는 것은 얇은 선·단일 강조색·그림자 최소화라는 태도뿐이다.

배경은 기존 `#e6ebf1`(차가운 블루그레이)을 그대로 쓰지 않는다. 같은 코드베이스 안에 이미 `plan-viewer.html`이 쓰는 따뜻한 오프화이트(`#f4f1eb`)와 선 색(`#ddd6c8`)이 있었고, 이번 브리프가 요구한 "따뜻한 오프화이트 배경"에 가장 가까운 기존 증거라 이를 기준으로 전 페이지 공통 배경(`#f3efe8`)과 공통 헤어라인(`#ddd6c8`)을 정했다. 폰트는 전 페이지가 이미 공통으로 쓰는 Noto Sans KR을 그대로 유지한다 — 교체 사유도, 대체 후보도 없다(Hangul을 지원하는 에디토리얼 세리프들을 ui-ux-pro-max로 검색했으나 모두 새 글꼴 도입이 되어 "완전 교체 금지" 제약과 맞지 않는다고 판단해 기각).

## Colors

- `primary` (`#163f6b`): 토프바 브랜드, 주요 CTA, 히어로 그라디언트 — 거의 유일한 강조색.
- `primary-soft` (`#d4e1ef`): 칩/배지 배경, hover 틴트.
- `canvas` (`#f3efe8`) / `surface` (`#ffffff`): 페이지 배경과 카드 배경. 카드는 배경보다 항상 밝아야 구획이 보인다.
- `hairline` (`#ddd6c8`): 섹션 상단 두꺼운 색 띠(`border-top: 3px solid #7c3aed` 류)를 대체하는 기본 구분선. 강조가 필요한 곳에만 `hairline-strong`(`#bcc7d3`, 기존 `--line`)을 쓴다.
- `accent-update` (`#c98a2c`): 업데이트 피드의 "새 문서" 표시 전용. 그 외 위치에서 재사용하지 않는다 — 두 번째 "주조색"을 만들지 않는 것이 이번 방향의 핵심이다.
- `semantic-error` / `semantic-error-bg`: 삭제 확인, 유효성 오류 등 기존 PIN 보호 플로우에서 이미 쓰는 빨강 계열을 재사용.

## Typography

전부 Noto Sans KR 한 글꼴, 굵기로만 위계를 만든다(IBM Plex Sans 한 글꼴 전략과 동일한 태도). `display`는 페이지당 하나의 히어로 타이틀에만, `heading`은 섹션 제목에, `label`은 버튼·배지·칩처럼 짧고 굵은 텍스트에, `body`는 본문, `caption`은 보조 숫자/날짜에 쓴다. 두 단계 이상 건너뛰지 않는다(heading 다음 바로 caption으로 가지 않는다).

## Layout

- 콘텐츠 최대 폭 860px(`--max-w`, 기존값 유지) — 교사들이 모바일로도 자주 접속하므로 넓은 데스크톱 레이아웃을 새로 만들지 않는다.
- 섹션 간 구분은 색이 아니라 `hairline` + 24px 이상의 여백으로 한다. 섹션 카드 상단의 색깔 있는 3px 띠(roster.html의 `#7c3aed` 등 페이지마다 다른 색)는 전부 제거 대상이다.
- 모바일 ≤480px에서 가로 스크롤 금지, 터치 타깃 44×44px 이상 유지는 기존 관행을 그대로 따른다.

## Elevation & Depth

그림자는 보조 수단이다. 평소 섹션 카드는 `hairline` 테두리만으로 배경과 구분하고, 모달·히어로 배너처럼 배경 위에 "뜬" 요소에만 기존 `--shadow-md`(`0 12px 24px rgba(19,34,49,0.08)`)를 쓴다. 카드마다 그림자를 쌓지 않는다.

## Shapes

기존 모서리 값을 그대로 유지한다 — 카드 14-16px, 버튼/칩 7-10px. Carbon처럼 각지게 바꾸지 않는다(브랜드 정체성 변경 금지 제약).

## Components

- **topbar-back**: `roster.html`/`pdf-viewer.html`에 이미 있는 `.topbar-back` pill 버튼 패턴(테두리 있는 흰 배경, `← 돌아가기`)을 모든 하위 페이지의 표준으로 승격한다. 데스크톱에서도 항상 노출(최근 `attendance.html` 수정과 동일한 원칙).
- **section-card**: 흰 배경 + `hairline` 테두리 + `rounded.lg`. 상단 색 띠 대신 섹션 제목 자체의 `heading` 굵기로 위계를 표현한다.
- **cta-primary**: `primary` 배경, 흰 텍스트. 페이지당 눈에 띄는 CTA는 하나로 제한한다(검색창의 "검색" 버튼이나 추가 폼의 "저장" 정도).
- **update-feed-item** (신규, step 2에서 데이터 소스 확정 후 상세 설계): 왼쪽에 `accent-update` 점 또는 "NEW" 라벨, 오른쪽에 `caption` 굵기의 상대 시각(예: "2일 전"). 리스트는 `hairline`로만 행을 구분하고 카드로 감싸지 않는다 — 피드는 밀도가 중요하다.

## Do's and Don'ts

- **Do** 섹션 구분을 가는 선 + 여백으로. **Don't** 섹션마다 다른 색의 3px 상단 띠를 쓰지 않는다.
- **Do** 네이비(`#163f6b`) 한 가지를 주조색으로. **Don't** 페이지마다 다른 주조색(초록 `#1a6b3c`, 청록 `#1f514d`, 각기 다른 블루 계열)을 섞지 않는다 — 통합이 이번 라운드의 목적이다.
- **Do** Noto Sans KR 하나로 굵기 위계만. **Don't** 새 글꼴을 들여오지 않는다(한글 미지원 에디토리얼 세리프 포함).
- **Do** 카드 배경을 배경(canvas)보다 밝게 유지해 구획을 유지한다. **Don't** 그림자를 구획의 1차 수단으로 쓰지 않는다.
- **Do** 학생 개인정보(전화번호·생일·주소) 필드는 통합 검색 범위 밖에 둔다(PRODUCT.md 미결 사항, step 2에서 사용자 확인 전까지는 제외). **Don't** roster 데이터를 검색 인덱스에 임의로 포함하지 않는다.

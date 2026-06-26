# yc-young-2026 — Codex Handoff (v1.5.0)

## 현재 상태
- 최신 커밋: `4d3d5e6 Fix desktop topbar: right-align nav links`
- 브랜치: main (GitHub Pages 배포)
- Firebase Storage 규칙: CLI로 배포 완료 (`allow read, write: if true` → `uploads/**`)

## 방금 수정한 내용

### 1. Firebase Storage 규칙 배포 (브라우저 UI → CLI로 전환)
- 문제: Firebase Console CodeMirror 에디터에서 Angular 변경 감지가 안 되어 규칙 게시 실패
- 해결: `storage.rules` 파일 생성, `firebase.json`에 storage 설정 추가, `firebase deploy --only storage`로 배포
- 파일: `storage.rules` (신규), `firebase.json` (storage 항목 추가)

### 2. attendance.html 데스크탑 topbar 우측 정렬
- 문제: 데스크탑에서 nav 링크들이 좌측으로 몰림
- 해결: `@media (min-width: 481px)` 에서 `.topbar-nav { justify-content: flex-end; }` 추가
- 파일: `attendance.html` (CSS 미디어쿼리 추가)

## 이전에 완료한 작업 목록
- `attendance.html` topbar "보관함" 링크 추가, "수련회 계획" → "계획서" 수정
- `attendance.html` 모바일 nav overflow 수정 (`flex: 1` 제거)
- `meeting-editor.html` "메인으로" → "← 돌아가기" 수정
- `pdf-viewer.html` 전면 재작성: PDF.js 캔버스 → `<iframe>` 네이티브 렌더러
- `index.html` 카드 "수련회 비교 분석" → "2026 중고등부 계획서", `pdf-viewer.html` 링크 수정
- `index.html` 카드 "여름계획서안" → "2026 여름 수련회 계획서"
- `index.html` nav "수련회 계획" → "계획서" 수정
- `index.html` 데스크탑 topbar 우측 정렬 (`justify-content: flex-end`)
- Firebase Storage 버킷 생성 (yc-young-2026-sync.firebasestorage.app, US-EAST1)
- Firebase Blaze 플랜 업그레이드
- `upload-sync.js` 신규 생성: 파일 업로드/삭제 기능 (PIN: SHA-256 해시 보관)
- `index.html` 업로드 UI 추가: 계획서·행사 보고서·예산 및 결산 섹션

## 프로젝트 개요
- **플랫폼**: Static GitHub Pages (HTML/CSS/JS)
- **배포**: `https://max2guy.github.io/yc-young-2026/`
- **Firebase 프로젝트**: `yc-young-2026-sync`
- **데이터베이스**: Firebase Realtime Database (회의자료 + 업로드 메타데이터)
- **스토리지**: Firebase Storage (`uploads/plans`, `uploads/reports`, `uploads/budget`)
- **인증**: 없음 (업로드 누구나, 삭제만 PIN 006291 → SHA-256 해시)

## 주요 파일
| 파일 | 역할 |
|---|---|
| `index.html` | 메인 페이지 — 회의자료, 계획서, 보고서, 예산 섹션 + 업로드 UI |
| `attendance.html` | 출결현황 페이지 |
| `pdf-viewer.html` | PDF 뷰어 — `?file=URL&title=제목` 파라미터 |
| `upload-sync.js` | Firebase Storage/RTDB 파일 업로드·삭제 로직 |
| `storage.rules` | Firebase Storage 보안 규칙 |
| `firebase.json` | Firebase 배포 설정 (database + storage) |
| `firebase-database.rules.json` | RTDB 보안 규칙 |
| `sync-config.js` | Firebase 설정값 (SPORTS_SYNC_CONFIG.firebase) |

## 다음으로 할 수 있는 작업
- 업로드 기능 실제 테스트 (브라우저에서 `+ 파일 추가` 클릭)
- 모바일 iOS에서 PDF 뷰어 fallback 동작 확인
- `attendance.html` 데스크탑 뷰 topbar 정렬 Preview에서 확인
- 업로드된 파일 삭제 PIN 기능 테스트

## 빌드 & 배포
```bash
# Firebase Storage 규칙 배포
cd "/Users/kimwoojung/Documents/New project/yc-young-2026"
firebase deploy --only storage

# RTDB 규칙 배포
firebase deploy --only database

# GitHub Pages 배포 (git push로 자동)
git add .
git commit -m "feat: ..."
git push
```

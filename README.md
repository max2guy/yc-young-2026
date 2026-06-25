# 2026 교회 행사 자료

- `index.html`: 두 자료를 묶는 시작 페이지
- `sports-meeting.html`: 체육대회 회의자료
- `camp-comparison.html`: 2026 수련회 비교 분석 자료
- `attendance-config.js`: 출결현황 페이지용 Firebase 웹 설정 파일
- `sports-sync.js`: 체육대회 자료의 수정 내용을 저장/반영
- `sync-config.js`: 별도 Firebase Realtime Database 설정 파일. 비워두면 로컬 저장만 동작
- `firebase-database.rules.json`: 실시간 동기화용 Realtime Database 규칙 예시
- `FIREBASE_SETUP.md`: Firebase 연결 순서
- `sync-materials.mjs`: Downloads 폴더의 원본 HTML을 다시 반영

원본 HTML을 고친 뒤에는 아래 명령만 실행하면 됩니다.

```sh
node sync-materials.mjs
```

기본 자료 페이지는 독립적으로 동작하며, 출결현황은 별도 Firebase 설정을 채우면 읽기 전용으로 연결할 수 있습니다.

## Attendance Dashboard Setup

`attendance.html` reads middle/high attendance from the `ministry-report-v2` Firebase project.

Before using it, fill in `attendance-config.js` with the same public web config values used by `ministry-report-v2`.

Required collection:
- `reports`

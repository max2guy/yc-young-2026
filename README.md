# 2026 교회 행사 자료

- `index.html`: 두 자료를 묶는 시작 페이지
- `sports-meeting.html`: 체육대회 회의자료
- `camp-comparison.html`: 2026 수련회 비교 분석 자료
- `sports-sync.js`: 체육대회 자료의 수정 내용을 저장/반영
- `sync-config.js`: 별도 Firebase Realtime Database 설정 파일. 비워두면 로컬 저장만 동작
- `sync-materials.mjs`: Downloads 폴더의 원본 HTML을 다시 반영

원본 HTML을 고친 뒤에는 아래 명령만 실행하면 됩니다.

```sh
node sync-materials.mjs
```

다른 서비스나 기존 자료 저장소와 연결하지 않는 독립 페이지입니다.

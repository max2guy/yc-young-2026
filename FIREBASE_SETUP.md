# Firebase Realtime Database Setup

`sports-meeting.html`의 실시간 동기화는 별도 Firebase Realtime Database 프로젝트를 사용합니다.

1. Firebase 콘솔에서 새 프로젝트를 만든다.
2. `Build > Realtime Database`에서 데이터베이스를 생성한다.
3. 규칙을 [firebase-database.rules.json](/Users/kimwoojung/Documents/New%20project/yc-young-2026/firebase-database.rules.json) 내용으로 적용한다.
4. `Project settings > General`에서 웹 앱을 추가한다.
5. 발급된 값을 [sync-config.js](/Users/kimwoojung/Documents/New%20project/yc-young-2026/sync-config.js)에 넣는다.

예시:

```js
window.SPORTS_SYNC_CONFIG = {
  firebase: {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "YOUR_PROJECT",
    appId: "YOUR_APP_ID"
  },
  path: "sportsMeeting2026",
  userName: "체육팀",
  enablePresence: true
};
```

적용 후 페이지를 새로고침하면 상단 편집 안내 오른쪽에 동기화 상태와 접속 인원이 표시됩니다.

(function () {
  var CLIENT_KEY = 'sportsMeetingClientId';
  var LOCAL_KEY = 'sportsMeetingLocalState';
  var clientId = localStorage.getItem(CLIENT_KEY);
  var applyingRemote = false;
  var connected = false;
  var saveTimer = null;
  var syncBadge = null;
  var presenceBadge = null;
  var firebaseRootRef = null;
  var firebaseStateRef = null;
  var firebasePresenceRef = null;

  if (!clientId) {
    clientId = Date.now().toString(36) + Math.random().toString(36).slice(2);
    localStorage.setItem(CLIENT_KEY, clientId);
  }

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function safeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function collectState() {
    var fields = {};
    document.querySelectorAll('[id^="field-"]').forEach(function (el) {
      fields[el.id] = el.textContent.trim();
    });

    return {
      fields: fields,
      status: document.getElementById('status-badge') ? document.getElementById('status-badge').textContent.trim() : '',
      notes: document.getElementById('notes-area') ? document.getElementById('notes-area').value : '',
      events: typeof events !== 'undefined' ? events : [],
      agenda: typeof agenda !== 'undefined' ? agenda : [],
      roles: typeof roles !== 'undefined' ? roles : [],
      updatedAt: Date.now(),
      updatedBy: clientId,
      updatedByLabel: getUserLabel()
    };
  }

  function getUserLabel() {
    if (window.SPORTS_SYNC_CONFIG && window.SPORTS_SYNC_CONFIG.userName) {
      return window.SPORTS_SYNC_CONFIG.userName;
    }
    return '편집자';
  }

  function replaceArray(target, next) {
    if (!Array.isArray(target)) return;
    target.splice.apply(target, [0, target.length].concat(safeArray(next)));
  }

  function applyState(state) {
    if (!state || !state.fields) return;
    applyingRemote = true;

    Object.keys(state.fields).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.textContent = state.fields[id];
    });

    if (document.getElementById('notes-area') && typeof state.notes === 'string') {
      document.getElementById('notes-area').value = state.notes;
    }

    if (typeof events !== 'undefined') replaceArray(events, state.events);
    if (typeof agenda !== 'undefined') replaceArray(agenda, state.agenda);
    if (typeof roles !== 'undefined') replaceArray(roles, state.roles);

    if (typeof renderEvents === 'function') renderEvents();
    if (typeof renderAgenda === 'function') renderAgenda();
    if (typeof renderRoles === 'function') renderRoles();

    if (state.status) {
      var badge = document.getElementById('status-badge');
      if (badge) badge.textContent = state.status;
      document.querySelectorAll('#status-row .status-chip').forEach(function (chip) {
        chip.classList.toggle('active', chip.textContent.trim() === state.status);
      });
    }

    applyingRemote = false;
  }

  function scheduleSave() {
    if (applyingRemote) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      var state = collectState();
      localStorage.setItem(LOCAL_KEY, JSON.stringify(state));
      if (window.sportsMeetingRef) {
        state.updatedAt = firebase.database.ServerValue.TIMESTAMP;
        window.sportsMeetingRef.set(state);
        showSyncState(connected ? '동기화 저장 중' : '재연결 대기');
      } else {
        showSyncState('로컬 저장됨');
      }
    }, 350);
  }

  function wrap(name) {
    var original = window[name];
    if (typeof original !== 'function') return;
    window[name] = function () {
      var result = original.apply(this, arguments);
      scheduleSave();
      return result;
    };
  }

  function showSyncState(text) {
    if (syncBadge) syncBadge.textContent = text;
  }

  function showPresenceState(count) {
    if (!presenceBadge) return;
    presenceBadge.textContent = count > 0 ? '접속 ' + count + '명' : '접속 없음';
  }

  function loadLocalState() {
    try {
      applyState(JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null'));
    } catch (_) {}
  }

  function attachPresence(config) {
    if (!firebase.database || !firebaseRootRef) return;
    var infoRef = firebase.database().ref('.info/connected');
    infoRef.on('value', function (snap) {
      connected = !!snap.val();
      showSyncState(connected ? '실시간 연결됨' : '재연결 중');
      if (!connected) return;

      var currentPresenceRef = firebasePresenceRef.child(clientId);
      currentPresenceRef.onDisconnect().remove();
      currentPresenceRef.set({
        id: clientId,
        name: getUserLabel(),
        updatedAt: firebase.database.ServerValue.TIMESTAMP
      });
    });

    firebasePresenceRef.on('value', function (snap) {
      var value = snap.val() || {};
      showPresenceState(Object.keys(value).length);
    });

    if (config.enablePresence === false) {
      showPresenceState(0);
    }
  }

  ready(function () {
    var hint = document.querySelector('.edit-hint');
    if (hint) {
      var meta = document.createElement('span');
      meta.style.cssText = 'float:right;display:flex;gap:10px;align-items:center;font-weight:800;color:#1a6b3c;';
      syncBadge = document.createElement('span');
      syncBadge.id = 'sync-state';
      syncBadge.textContent = '동기화 준비 중';
      presenceBadge = document.createElement('span');
      presenceBadge.id = 'presence-state';
      presenceBadge.style.color = '#6f7f74';
      presenceBadge.textContent = '로컬 모드';
      meta.appendChild(syncBadge);
      meta.appendChild(presenceBadge);
      hint.appendChild(meta);
    }

    ['saveField', 'toggleStatus', 'addEvent', 'saveEv', 'deleteCurrentEv', 'addAgenda', 'saveAg', 'deleteCurrentAg', 'saveRole'].forEach(wrap);

    var notes = document.getElementById('notes-area');
    if (notes) notes.addEventListener('input', scheduleSave);

    var config = window.SPORTS_SYNC_CONFIG;
    if (!window.firebase || !firebase.database || !config) {
      loadLocalState();
      showSyncState('로컬 저장');
      showPresenceState(0);
      return;
    }

    if (!firebase.apps || firebase.apps.length === 0) {
      firebase.initializeApp(config.firebase);
    }

    firebaseRootRef = firebase.database().ref(config.path || 'sportsMeeting2026');
    firebaseStateRef = firebaseRootRef.child('state');
    firebasePresenceRef = firebaseRootRef.child('presence');
    window.sportsMeetingRef = firebaseStateRef;

    loadLocalState();
    attachPresence(config);

    window.sportsMeetingRef.on('value', function (snap) {
      var state = snap.val();
      if (!state) {
        scheduleSave();
        showSyncState('초기 저장 중');
        return;
      }
      if (state.updatedBy !== clientId) applyState(state);
      localStorage.setItem(LOCAL_KEY, JSON.stringify(state));
      showSyncState(state.updatedBy === clientId ? '동기화 저장됨' : '원격 변경 반영됨');
    }, function () {
      showSyncState('동기화 오류');
    });
  });
})();

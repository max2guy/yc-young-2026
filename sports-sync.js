(function () {
  var CLIENT_KEY = 'sportsMeetingClientId';
  var LOCAL_KEY = 'sportsMeetingLocalState';
  var clientId = localStorage.getItem(CLIENT_KEY);
  var applyingRemote = false;
  var saveTimer = null;

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
      updatedBy: clientId
    };
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
      if (window.sportsMeetingRef) {
        window.sportsMeetingRef.set(state);
        showSyncState('저장됨');
      } else {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(state));
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
    var el = document.getElementById('sync-state');
    if (el) el.textContent = text;
  }

  ready(function () {
    var hint = document.querySelector('.edit-hint');
    if (hint) {
      var badge = document.createElement('span');
      badge.id = 'sync-state';
      badge.textContent = '동기화 준비 중';
      badge.style.cssText = 'float:right;font-weight:800;color:#1a6b3c;';
      hint.appendChild(badge);
    }

    ['saveField', 'toggleStatus', 'addEvent', 'saveEv', 'deleteCurrentEv', 'addAgenda', 'saveAg', 'deleteCurrentAg', 'saveRole'].forEach(wrap);

    var notes = document.getElementById('notes-area');
    if (notes) notes.addEventListener('input', scheduleSave);

    var config = window.SPORTS_SYNC_CONFIG;
    if (!window.firebase || !firebase.database || !config) {
      try {
        applyState(JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null'));
      } catch (_) {}
      showSyncState('로컬 저장');
      return;
    }

    if (!firebase.apps || firebase.apps.length === 0) {
      firebase.initializeApp(config.firebase);
    }

    window.sportsMeetingRef = firebase.database().ref(config.path || 'sportsMeeting2026');

    window.sportsMeetingRef.on('value', function (snap) {
      var state = snap.val();
      if (!state) {
        scheduleSave();
        showSyncState('초기 저장 중');
        return;
      }
      if (state.updatedBy !== clientId) applyState(state);
      showSyncState('동기화됨');
    }, function () {
      showSyncState('동기화 오류');
    });
  });
})();

(function () {
  'use strict';

  var SOURCES = [
    {
      path: 'meetingDocuments',
      badge: '회의자료',
      skip: function (item) { return !!item.deletedAt; },
      href: function (id) { return 'meeting-editor.html?id=' + encodeURIComponent(id); },
      ts: function (item) { return item.updatedAt || 0; }
    },
    {
      path: 'uploads/plans',
      badge: '계획서',
      href: uploadHref,
      ts: function (item) { return item.date || 0; }
    },
    {
      path: 'uploads/reports',
      badge: '행사 보고서',
      href: uploadHref,
      ts: function (item) { return item.date || 0; }
    },
    {
      path: 'uploads/budget',
      badge: '예산 및 결산',
      href: uploadHref,
      ts: function (item) { return item.date || 0; }
    }
  ];

  var cache = {};
  var searchInput, resultsEl, feedEl, debounceTimer;

  function uploadHref(id, item) {
    return 'pdf-viewer.html?file=' + encodeURIComponent(item.url) + '&title=' + encodeURIComponent(item.title);
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function init() {
    searchInput = document.getElementById('unified-search-input');
    resultsEl = document.getElementById('unified-search-results');
    feedEl = document.getElementById('updates-feed');
    if (!searchInput || !resultsEl || !feedEl) return;

    if (!window.SPORTS_SYNC_CONFIG || !window.SPORTS_SYNC_CONFIG.firebase) {
      feedEl.innerHTML = '<div class="recent-empty">Firebase 연결이 없어 불러올 수 없습니다.</div>';
      return;
    }
    if (!firebase.apps.length) {
      firebase.initializeApp(window.SPORTS_SYNC_CONFIG.firebase);
    }

    SOURCES.forEach(listenSource);

    searchInput.addEventListener('input', function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(runSearch, 150);
    });
  }

  function listenSource(source) {
    firebase.database().ref(source.path).on('value', function (snap) {
      var val = snap.val() || {};
      cache[source.path] = Object.keys(val)
        .filter(function (id) { return !source.skip || !source.skip(val[id]); })
        .map(function (id) {
          var item = val[id];
          return {
            id: id,
            title: (item.title && String(item.title).trim()) || '제목 없음',
            badge: source.badge,
            href: source.href(id, item),
            ts: source.ts(item)
          };
        });
      runSearch();
      renderFeed();
    });
  }

  function allEntries() {
    return SOURCES.reduce(function (acc, source) {
      return acc.concat(cache[source.path] || []);
    }, []);
  }

  function runSearch() {
    if (!searchInput) return;
    var query = searchInput.value.trim();
    if (!query) {
      resultsEl.hidden = true;
      resultsEl.innerHTML = '';
      return;
    }
    resultsEl.hidden = false;
    var lower = query.toLowerCase();
    var matches = allEntries()
      .filter(function (entry) { return entry.title.toLowerCase().indexOf(lower) !== -1; })
      .sort(function (a, b) { return b.ts - a.ts; });

    if (!matches.length) {
      resultsEl.innerHTML = '<div class="recent-empty">검색 결과 없음</div>';
      return;
    }
    resultsEl.innerHTML = matches.map(function (entry) {
      return '<a class="search-result-item" href="' + entry.href + '">' +
        '<span class="search-result-badge">' + escHtml(entry.badge) + '</span>' +
        '<span class="search-result-title">' + escHtml(entry.title) + '</span>' +
        '</a>';
    }).join('');
  }

  function formatRelativeTime(ts) {
    if (!ts) return '';
    var diffDay = Math.floor((Date.now() - ts) / 86400000);
    if (diffDay <= 0) return '오늘';
    if (diffDay === 1) return '어제';
    if (diffDay < 7) return diffDay + '일 전';
    var date = new Date(ts);
    return date.getFullYear() + '.' + String(date.getMonth() + 1).padStart(2, '0') + '.' + String(date.getDate()).padStart(2, '0');
  }

  function renderFeed() {
    var top5 = allEntries().sort(function (a, b) { return b.ts - a.ts; }).slice(0, 5);
    if (!top5.length) {
      feedEl.innerHTML = '<div class="recent-empty">최근 업데이트가 없습니다.</div>';
      return;
    }
    feedEl.innerHTML = top5.map(function (entry) {
      return '<a class="update-feed-item" href="' + entry.href + '">' +
        '<span class="update-dot"></span>' +
        '<span class="update-title">' + escHtml(entry.title) + '</span>' +
        '<span class="update-feed-badge">' + escHtml(entry.badge) + '</span>' +
        '<span class="update-time">' + formatRelativeTime(entry.ts) + '</span>' +
        '</a>';
    }).join('');
  }

  document.addEventListener('DOMContentLoaded', init);
})();

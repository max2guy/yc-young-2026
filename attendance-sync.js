(function () {
  'use strict';

  var APP_NAME = 'attendance-dashboard';
  var attendanceDb = null;

  function isObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function getAttendanceConfig() {
    var config = window.MINISTRY_ATTENDANCE_CONFIG;
    var firebaseConfig = config && config.firebase;

    if (!isObject(config)) {
      throw new Error('attendance-config.js is missing window.MINISTRY_ATTENDANCE_CONFIG.');
    }

    if (!isObject(firebaseConfig)) {
      throw new Error('attendance-config.js is missing firebase settings.');
    }

    ['apiKey', 'authDomain', 'projectId', 'appId'].forEach(function (key) {
      if (typeof firebaseConfig[key] !== 'string' || !firebaseConfig[key].trim()) {
        throw new Error('attendance-config.js is missing firebase.' + key + '.');
      }
    });

    if (typeof config.collection !== 'string' || !config.collection.trim()) {
      throw new Error('attendance-config.js is missing collection.');
    }

    return {
      firebase: firebaseConfig,
      collection: config.collection.trim(),
      departmentKey: typeof config.departmentKey === 'string' && config.departmentKey.trim()
        ? config.departmentKey.trim()
        : 'middleHigh',
      recentWeeks: Number(config.recentWeeks) > 0 ? Number(config.recentWeeks) : 8,
      recentMonths: Number(config.recentMonths) > 0 ? Number(config.recentMonths) : 12
    };
  }

  function toDateParts(reportDate) {
    var value = reportDate;

    if (value && typeof value.toDate === 'function') {
      value = value.toDate();
    }

    if (value instanceof Date) {
      value = value.getFullYear() + '-' + String(value.getMonth() + 1).padStart(2, '0') + '-' + String(value.getDate()).padStart(2, '0');
    }

    var match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) {
      return null;
    }

    return {
      year: Number(match[1]),
      month: Number(match[2]),
      day: Number(match[3]),
      monthKey: match[1] + '-' + match[2],
      dateKey: match[1] + '-' + match[2] + '-' + match[3]
    };
  }

  function getMiddleHighDepartment(report, departmentKey) {
    var departments = report && report.departments;
    var key = typeof departmentKey === 'string' && departmentKey.trim()
      ? departmentKey.trim()
      : 'middleHigh';
    if (!isObject(departments)) {
      return null;
    }
    return isObject(departments[key]) ? departments[key] : null;
  }

  function getTotalMembers(department) {
    if (!isObject(department)) {
      return null;
    }

    if (Array.isArray(department.members)) {
      return department.members.length;
    }

    if (Array.isArray(department.zones)) {
      return department.zones.reduce(function (sum, zone) {
        return sum + (Array.isArray(zone && zone.members) ? zone.members.length : 0);
      }, 0);
    }

    return null;
  }

  function toNumber(value) {
    var number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function toAttendanceEntry(report, departmentKey) {
    var department = getMiddleHighDepartment(report, departmentKey);
    var parts = toDateParts(report && report.reportDate);
    if (!department || !parts) {
      return null;
    }

    var totalMembers = getTotalMembers(department);
    var attendance = toNumber(department.attendance);
    var rate = totalMembers && totalMembers > 0
      ? Math.round((attendance / totalMembers) * 1000) / 10
      : null;

    return {
      id: report.id || parts.dateKey,
      reportDate: parts.dateKey,
      dateParts: parts,
      title: typeof report.title === 'string' && report.title.trim() ? report.title.trim() : '주간 사역보고서',
      attendance: attendance,
      totalMembers: totalMembers,
      rate: rate,
      members: Array.isArray(department.members) ? department.members.slice() : [],
      updatedAt: report.updatedAt || report.createdAt || null
    };
  }

  function ensureFirebaseCompat() {
    if (!window.firebase || typeof firebase.initializeApp !== 'function' || typeof firebase.firestore !== 'function') {
      throw new Error('Firebase compat scripts for app and firestore are required before attendance-sync.js.');
    }
  }

  function getAttendanceApp() {
    ensureFirebaseCompat();

    var config = getAttendanceConfig();
    var apps = Array.isArray(firebase.apps) ? firebase.apps : [];
    var app = null;
    var index = 0;

    for (index = 0; index < apps.length; index += 1) {
      if (apps[index] && apps[index].name === APP_NAME) {
        app = apps[index];
        break;
      }
    }

    if (app) {
      return app;
    }

    return firebase.initializeApp(config.firebase, APP_NAME);
  }

  function getAttendanceDb() {
    if (attendanceDb) {
      return attendanceDb;
    }

    attendanceDb = firebase.firestore(getAttendanceApp());
    return attendanceDb;
  }

  async function fetchAttendanceReports() {
    var config = getAttendanceConfig();
    var snapshot = await getAttendanceDb().collection(config.collection).get();

    return snapshot.docs
      .map(function (doc) {
        var data = doc.data() || {};
        if (!data.id) {
          data.id = doc.id;
        }
        return data;
      })
      .map(function (report) {
        return toAttendanceEntry(report, config.departmentKey);
      })
      .filter(Boolean)
      .sort(function (left, right) {
        return right.reportDate.localeCompare(left.reportDate);
      });
  }

  function summarizeRecentWeeks(entries, recentWeeks) {
    var list = Array.isArray(entries) ? entries.slice() : [];
    var count = Number(recentWeeks) > 0 ? Number(recentWeeks) : 8;

    return list
      .filter(Boolean)
      .sort(function (left, right) {
        return right.reportDate.localeCompare(left.reportDate);
      })
      .slice(0, count);
  }

  function summarizeCurrentMonth(entries) {
    var list = Array.isArray(entries) ? entries.filter(Boolean) : [];
    if (!list.length) {
      return {
        label: null,
        averageAttendance: 0,
        averageRate: null,
        maxAttendance: 0,
        minAttendance: 0,
        totalAttendance: 0,
        weekCount: 0
      };
    }

    var sorted = list.slice().sort(function (left, right) {
      return right.reportDate.localeCompare(left.reportDate);
    });
    var latestMonth = sorted[0].dateParts ? sorted[0].dateParts.monthKey : sorted[0].reportDate.slice(0, 7);
    var monthEntries = sorted.filter(function (entry) {
      var monthKey = entry.dateParts ? entry.dateParts.monthKey : entry.reportDate.slice(0, 7);
      return monthKey === latestMonth;
    });
    var attendanceValues = monthEntries.map(function (entry) {
      return toNumber(entry.attendance);
    });
    var rateValues = monthEntries
      .map(function (entry) { return entry.rate; })
      .filter(function (value) { return value !== null; });
    var totalAttendance = attendanceValues.reduce(function (sum, value) {
      return sum + value;
    }, 0);

    return {
      label: latestMonth,
      averageAttendance: monthEntries.length ? Math.round((totalAttendance / monthEntries.length) * 10) / 10 : 0,
      averageRate: rateValues.length
        ? Math.round((rateValues.reduce(function (sum, value) { return sum + value; }, 0) / rateValues.length) * 10) / 10
        : null,
      maxAttendance: attendanceValues.length ? Math.max.apply(null, attendanceValues) : 0,
      minAttendance: attendanceValues.length ? Math.min.apply(null, attendanceValues) : 0,
      totalAttendance: totalAttendance,
      weekCount: monthEntries.length
    };
  }

  function summarizeMonths(entries, recentMonths) {
    var list = Array.isArray(entries) ? entries.filter(Boolean) : [];
    var count = Number(recentMonths) > 0 ? Number(recentMonths) : 12;
    var monthMap = new Map();

    list
      .slice()
      .sort(function (left, right) {
        return right.reportDate.localeCompare(left.reportDate);
      })
      .forEach(function (entry) {
        var monthKey = entry.dateParts ? entry.dateParts.monthKey : entry.reportDate.slice(0, 7);
        var bucket = monthMap.get(monthKey);

        if (!bucket) {
          bucket = [];
          monthMap.set(monthKey, bucket);
        }

        bucket.push(entry);
      });

    return Array.from(monthMap.entries())
      .slice(0, count)
      .map(function (pair) {
        var month = pair[0];
        var monthEntries = pair[1];
        var attendanceValues = monthEntries.map(function (entry) {
          return toNumber(entry.attendance);
        });
        var rateValues = monthEntries
          .map(function (entry) { return entry.rate; })
          .filter(function (value) { return value !== null; });
        var totalAttendance = attendanceValues.reduce(function (sum, value) {
          return sum + value;
        }, 0);

        return {
          month: month,
          averageAttendance: monthEntries.length ? Math.round((totalAttendance / monthEntries.length) * 10) / 10 : 0,
          averageRate: rateValues.length
            ? Math.round((rateValues.reduce(function (sum, value) { return sum + value; }, 0) / rateValues.length) * 10) / 10
            : null,
          maxAttendance: attendanceValues.length ? Math.max.apply(null, attendanceValues) : 0,
          minAttendance: attendanceValues.length ? Math.min.apply(null, attendanceValues) : 0,
          totalAttendance: totalAttendance,
          weekCount: monthEntries.length,
          entries: monthEntries.slice()
        };
      });
  }

  function getElement(target) {
    if (!target || typeof target !== 'object') {
      return null;
    }
    return typeof target.nodeType === 'number' ? target : null;
  }

  function setText(element, value) {
    if (!element) {
      return;
    }
    element.textContent = value;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatAttendance(value) {
    var number = Number(value);
    if (!Number.isFinite(number)) {
      return '--';
    }
    return String(Math.round(number * 10) / 10).replace(/\.0$/, '') + '명';
  }

  function formatRate(value) {
    var number = Number(value);
    if (!Number.isFinite(number)) {
      return '--';
    }
    return String(Math.round(number * 10) / 10).replace(/\.0$/, '') + '%';
  }

  function formatMonthLabel(monthKey) {
    var match = String(monthKey || '').match(/^(\d{4})-(\d{2})$/);
    if (!match) {
      return '월간 집계';
    }
    return Number(match[2]) + '월';
  }

  function formatWeekLabel(reportDate) {
    var parts = toDateParts(reportDate);
    if (!parts) {
      return '주간 보고서';
    }
    return parts.year + '년 ' + parts.month + '월 ' + parts.day + '일';
  }

  function renderStatusMessage(container, tone, title, copy, pill) {
    var element = getElement(container);
    if (!element) {
      return;
    }

    element.innerHTML = [
      '<article class="placeholder-week" data-tone="', escapeHtml(tone || 'neutral'), '">',
      '<div>',
      '<div class="placeholder-title">', escapeHtml(title), '</div>',
      '<div class="placeholder-copy">', escapeHtml(copy), '</div>',
      '</div>',
      '<div class="placeholder-pill">', escapeHtml(pill || '안내'), '</div>',
      '</article>'
    ].join('');
  }

  function renderLoadingMessage(container, label) {
    renderStatusMessage(
      container,
      'loading',
      label || '출결 데이터를 불러오는 중입니다',
      '최근 보고서를 확인한 뒤 주간 카드와 월간 요약을 여기에 표시합니다.',
      '불러오는 중'
    );
  }

  function renderEmptyMessage(container, label) {
    renderStatusMessage(
      container,
      'empty',
      label || '표시할 출결 보고서가 없습니다',
      '읽기 권한이 있더라도 아직 중고등부 출결이 포함된 주간 보고서가 없을 수 있습니다.',
      '데이터 없음'
    );
  }

  function renderFailureMessage(container, title, copy) {
    renderStatusMessage(
      container,
      'failure',
      title || '출결 데이터를 불러오지 못했습니다',
      copy || '설정 또는 읽기 권한을 확인한 뒤 다시 시도해 주세요.',
      '확인 필요'
    );
  }

  function renderWeeklyCards(container, entries) {
    var element = getElement(container);
    var list = Array.isArray(entries) ? entries : [];

    if (!element) {
      return;
    }

    if (!list.length) {
      renderEmptyMessage(element, '최근 주간 데이터가 없습니다');
      return;
    }

    var monthMap = new Map();
    list.forEach(function (entry) {
      var monthKey = entry.dateParts ? entry.dateParts.monthKey : entry.reportDate.slice(0, 7);
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, []);
      }
      monthMap.get(monthKey).push(entry);
    });

    var isFirst = true;
    var html = Array.from(monthMap.entries()).map(function (pair) {
      var monthKey = pair[0];
      var monthEntries = pair[1];
      var expanded = isFirst;
      isFirst = false;

      var match = String(monthKey).match(/^(\d{4})-(\d{2})$/);
      var monthLabel = match
        ? Number(match[1]) + '년 ' + Number(match[2]) + '월'
        : monthKey;

      var cards = monthEntries.map(function (entry) {
        var metaParts = [];
        if (entry.totalMembers && entry.totalMembers > 0) {
          metaParts.push('총원 ' + entry.totalMembers + '명');
        }
        if (entry.rate !== null) {
          metaParts.push('출석률 ' + formatRate(entry.rate));
        }
        return [
          '<article class="placeholder-week">',
          '<div class="placeholder-info">',
          '<div class="placeholder-date">', escapeHtml(formatWeekLabel(entry.reportDate)), '</div>',
          metaParts.length ? '<div class="placeholder-meta">' + escapeHtml(metaParts.join(' · ')) + '</div>' : '',
          '</div>',
          '<div class="placeholder-count">', escapeHtml(formatAttendance(entry.attendance)), '</div>',
          '</article>'
        ].join('');
      }).join('');

      return [
        '<div class="month-group">',
        '<button class="month-group-header" type="button" aria-expanded="', expanded ? 'true' : 'false', '">',
        '<span class="month-group-name">', escapeHtml(monthLabel), '</span>',
        '<span class="month-group-count">', escapeHtml(String(monthEntries.length)), '주</span>',
        '<span class="month-group-toggle">', expanded ? '접기 ↑' : '펼치기 ↓', '</span>',
        '</button>',
        '<div class="month-group-entries"', expanded ? '' : ' hidden', '>',
        '<div class="placeholder-list">',
        cards,
        '</div>',
        '</div>',
        '</div>'
      ].join('');
    }).join('');

    element.innerHTML = html;

    element.querySelectorAll('.month-group-header').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var group = btn.closest('.month-group');
        var entriesEl = group.querySelector('.month-group-entries');
        var toggleEl = btn.querySelector('.month-group-toggle');
        var isExpanded = btn.getAttribute('aria-expanded') === 'true';

        btn.setAttribute('aria-expanded', isExpanded ? 'false' : 'true');
        toggleEl.textContent = isExpanded ? '펼치기 ↓' : '접기 ↑';

        if (isExpanded) {
          entriesEl.setAttribute('hidden', '');
        } else {
          entriesEl.removeAttribute('hidden');
        }
      });
    });
  }

  function renderMonthlyCards(container, months) {
    var element = getElement(container);
    var list = Array.isArray(months) ? months : [];

    if (!element) {
      return;
    }

    if (!list.length) {
      renderEmptyMessage(element, '월간 요약 데이터가 없습니다');
      return;
    }

    element.innerHTML = list.map(function (month) {
      var summary = [
        '평균 ' + formatAttendance(month.averageAttendance),
        '최고 ' + formatAttendance(month.maxAttendance),
        '최저 ' + formatAttendance(month.minAttendance),
        month.weekCount + '주 반영'
      ];

      if (month.averageRate !== null) {
        summary.splice(1, 0, '평균 출석률 ' + formatRate(month.averageRate));
      }

      return [
        '<article class="placeholder-month">',
        '<div class="placeholder-info">',
        '<div class="placeholder-date">', escapeHtml(formatMonthLabel(month.month)), '</div>',
        '<div class="placeholder-meta">', escapeHtml(summary.join(' · ')), '</div>',
        '</div>',
        '<div class="placeholder-count">', escapeHtml(formatAttendance(month.averageAttendance)), '</div>',
        '</article>'
      ].join('');
    }).join('');
  }

  function renderRosterSection(container, dateEl, latestEntry) {
    var element = getElement(container);
    if (!element) {
      return;
    }

    var members = latestEntry && Array.isArray(latestEntry.members) ? latestEntry.members : [];

    if (latestEntry && getElement(dateEl)) {
      setText(dateEl, formatWeekLabel(latestEntry.reportDate) + ' 기준');
    }

    if (!members.length) {
      renderEmptyMessage(element, '명단 정보가 없습니다');
      return;
    }

    var presentMembers = members.filter(function (m) { return m && m.status === 'present'; });
    var absentMembers = members.filter(function (m) { return m && m.status !== 'present'; });

    function renderChips(list, statusClass) {
      return list.map(function (m) {
        return '<span class="roster-chip ' + escapeHtml(statusClass) + '">' + escapeHtml(m.name || '이름 없음') + '</span>';
      }).join('');
    }

    var html = [];

    if (presentMembers.length) {
      html.push([
        '<div class="roster-group">',
        '<div class="roster-group-head">',
        '<span class="roster-group-label">출석</span>',
        '<span class="roster-group-count">', escapeHtml(String(presentMembers.length)), '명</span>',
        '</div>',
        '<div class="roster-chips">',
        renderChips(presentMembers, 'present'),
        '</div>',
        '</div>'
      ].join(''));
    }

    if (absentMembers.length) {
      html.push([
        '<div class="roster-group">',
        '<div class="roster-group-head">',
        '<span class="roster-group-label">결석</span>',
        '<span class="roster-group-count" style="color:var(--muted)">', escapeHtml(String(absentMembers.length)), '명</span>',
        '</div>',
        '<div class="roster-chips">',
        renderChips(absentMembers, 'absent'),
        '</div>',
        '</div>'
      ].join(''));
    }

    element.innerHTML = html.join('');
  }

  function renderSummaryCards(summaryCards, latestEntry, currentMonth, weeklyEntries) {
    var cards = summaryCards || {};
    var recentCount = Array.isArray(weeklyEntries) ? weeklyEntries.length : 0;

    setText(cards.latestValue, latestEntry ? formatAttendance(latestEntry.attendance) : '--');
    setText(
      cards.latestMeta,
      latestEntry
        ? formatWeekLabel(latestEntry.reportDate) + (latestEntry.totalMembers ? ' · 총원 ' + latestEntry.totalMembers + '명' : '')
        : '가장 최근 주간 보고서가 없습니다'
    );

    setText(cards.rateValue, latestEntry && latestEntry.rate !== null ? formatRate(latestEntry.rate) : '--');
    setText(
      cards.rateMeta,
      latestEntry && latestEntry.rate !== null
        ? '최근 보고서 기준 출석률입니다'
        : '총원 데이터가 없어 출석률을 계산하지 못했습니다'
    );

    setText(cards.monthAverageValue, currentMonth && currentMonth.weekCount ? formatAttendance(currentMonth.averageAttendance) : '--');
    setText(
      cards.monthAverageMeta,
      currentMonth && currentMonth.weekCount
        ? formatMonthLabel(currentMonth.label) + ' · ' + currentMonth.weekCount + '주 평균'
        : '이번 달 집계할 출결 보고서가 없습니다'
    );

    setText(cards.weeksValue, String(recentCount));
    setText(
      cards.weeksMeta,
      recentCount
        ? '최근 ' + recentCount + '주 데이터를 표시 중입니다'
        : '표시할 최근 주간 데이터가 없습니다'
    );
  }

  function renderSummaryFailure(summaryCards, message) {
    var cards = summaryCards || {};
    setText(cards.latestValue, '--');
    setText(cards.latestMeta, message);
    setText(cards.rateValue, '--');
    setText(cards.rateMeta, message);
    setText(cards.monthAverageValue, '--');
    setText(cards.monthAverageMeta, message);
    setText(cards.weeksValue, '0');
    setText(cards.weeksMeta, message);
  }

  function createContractError(missingTargets) {
    return new Error(
      'renderAttendanceDashboard contract mismatch. Missing required DOM targets: ' + missingTargets.join(', ')
    );
  }

  function validateRendererTargets(options) {
    var settings = options || {};
    var containers = settings.containers || {};
    var summaryCards = settings.summaryCards || {};
    var missingTargets = [];
    var requiredCards = [
      'latestValue',
      'latestMeta',
      'rateValue',
      'rateMeta',
      'monthAverageValue',
      'monthAverageMeta',
      'weeksValue',
      'weeksMeta'
    ];
    var index = 0;

    if (!getElement(containers.weekly)) {
      missingTargets.push('containers.weekly');
    }

    if (!getElement(containers.monthly)) {
      missingTargets.push('containers.monthly');
    }

    for (index = 0; index < requiredCards.length; index += 1) {
      if (!getElement(summaryCards[requiredCards[index]])) {
        missingTargets.push('summaryCards.' + requiredCards[index]);
      }
    }

    if (missingTargets.length) {
      throw createContractError(missingTargets);
    }

    return {
      loadingState: settings.loadingState,
      containers: containers,
      summaryCards: summaryCards
    };
  }

  function getFailureCopy(error) {
    var message = error && error.message ? String(error.message) : '';
    var code = error && error.code ? String(error.code) : '';
    var lowered = (code + ' ' + message).toLowerCase();

    if (
      lowered.indexOf('permission-denied') !== -1 ||
      lowered.indexOf('unauthenticated') !== -1 ||
      lowered.indexOf('missing or insufficient permissions') !== -1
    ) {
      return {
        title: '출결 보고서를 읽을 권한이 없습니다',
        copy: '현재 Firestore 규칙에서 인증을 요구할 수 있습니다. 로그인 또는 읽기 권한이 준비되면 대시보드가 자동으로 같은 구조로 표시됩니다.'
      };
    }

    if (
      lowered.indexOf('attendance-config.js') !== -1 ||
      lowered.indexOf('window.ministry_attendance_config') !== -1 ||
      lowered.indexOf('firebase settings') !== -1 ||
      lowered.indexOf('firebase.apikey') !== -1 ||
      lowered.indexOf('firebase.authdomain') !== -1 ||
      lowered.indexOf('firebase.projectid') !== -1 ||
      lowered.indexOf('firebase.appid') !== -1 ||
      lowered.indexOf('missing collection') !== -1
    ) {
      return {
        title: '출결 설정이 아직 비어 있습니다',
        copy: 'attendance-config.js의 Firebase 공개 설정과 컬렉션 정보가 필요합니다. 설정이 비어 있으면 이 페이지는 읽기 전용 안내 상태로 유지됩니다.'
      };
    }

    if (lowered.indexOf('renderattendancedashboard contract mismatch') !== -1) {
      return {
        title: '출결 대시보드 화면 구성이 맞지 않습니다',
        copy: '필수 DOM 대상이 누락되어 출결 카드를 그릴 수 없습니다. 페이지의 고정 컨테이너와 요약 카드 요소가 모두 있는지 확인해 주세요.'
      };
    }

    return {
      title: '출결 데이터를 불러오지 못했습니다',
      copy: 'Firestore 연결 상태와 읽기 권한을 확인한 뒤 다시 시도해 주세요.'
    };
  }

  async function renderAttendanceDashboard(options) {
    var settings = null;
    var loadingState = null;
    var containers = null;
    var summaryCards = null;
    var config;
    var entries;
    var weeklyEntries;
    var monthlyEntries;
    var currentMonth;
    var latestEntry;
    var failure;

    try {
      settings = validateRendererTargets(options);
      loadingState = settings.loadingState;
      containers = settings.containers;
      summaryCards = settings.summaryCards;

      setText(loadingState, '출결 데이터를 불러오는 중입니다.');
      renderSummaryFailure(summaryCards, '데이터를 불러오는 중입니다.');
      renderLoadingMessage(containers.weekly, '최근 주간 데이터를 준비하는 중입니다');
      renderLoadingMessage(containers.monthly, '월간 요약을 준비하는 중입니다');

      config = getAttendanceConfig();
      entries = await fetchAttendanceReports();
      weeklyEntries = summarizeRecentWeeks(entries, config.recentWeeks);
      monthlyEntries = summarizeMonths(entries, config.recentMonths);
      currentMonth = summarizeCurrentMonth(entries);
      latestEntry = entries.length ? entries[0] : null;

      if (!entries.length) {
        renderSummaryFailure(summaryCards, '표시할 출결 보고서가 없습니다.');
        renderEmptyMessage(containers.weekly, '최근 주간 데이터가 없습니다');
        renderEmptyMessage(containers.monthly, '월간 요약 데이터가 없습니다');
        setText(loadingState, '표시할 출결 보고서가 아직 없습니다.');
        return {
          status: 'empty',
          entries: entries
        };
      }

      renderSummaryCards(summaryCards, latestEntry, currentMonth, weeklyEntries);
      renderWeeklyCards(containers.weekly, weeklyEntries);
      renderMonthlyCards(containers.monthly, monthlyEntries);
      renderRosterSection(containers.roster, containers.rosterDate, latestEntry);
      setText(loadingState, '최근 출결 보고서를 기준으로 읽기 전용 대시보드를 표시합니다.');

      return {
        status: 'success',
        entries: entries,
        weeklyEntries: weeklyEntries,
        monthlyEntries: monthlyEntries,
        currentMonth: currentMonth
      };
    } catch (error) {
      failure = getFailureCopy(error);

      if (summaryCards) {
        renderSummaryFailure(summaryCards, failure.title);
      }

      if (containers) {
        renderFailureMessage(containers.weekly, failure.title, failure.copy);
        renderFailureMessage(containers.monthly, failure.title, failure.copy);
      }

      if (loadingState) {
        setText(loadingState, failure.copy);
      }

      return {
        status: 'failure',
        error: error,
        title: failure.title,
        message: failure.copy
      };
    }
  }

  window.AttendanceSync = {
    getAttendanceConfig: getAttendanceConfig,
    toDateParts: toDateParts,
    getMiddleHighDepartment: getMiddleHighDepartment,
    getTotalMembers: getTotalMembers,
    toAttendanceEntry: toAttendanceEntry,
    getAttendanceDb: getAttendanceDb,
    fetchAttendanceReports: fetchAttendanceReports,
    summarizeRecentWeeks: summarizeRecentWeeks,
    summarizeCurrentMonth: summarizeCurrentMonth,
    summarizeMonths: summarizeMonths,
    renderLoadingMessage: renderLoadingMessage,
    renderEmptyMessage: renderEmptyMessage,
    renderFailureMessage: renderFailureMessage,
    renderWeeklyCards: renderWeeklyCards,
    renderMonthlyCards: renderMonthlyCards,
    renderRosterSection: renderRosterSection,
    renderAttendanceDashboard: renderAttendanceDashboard
  };
})();

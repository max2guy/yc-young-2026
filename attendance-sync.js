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
    summarizeMonths: summarizeMonths
  };
})();

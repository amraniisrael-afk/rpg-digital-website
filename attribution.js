/*
 * RPG Digital — לכידת מזהי קליק ומקור תנועה לטפסי הלידים
 * --------------------------------------------------------
 * תופס מה-URL: gclid, gbraid, wbraid, fbclid, utm_* ושומר אותם
 * ב-localStorage ל-90 יום, כך שגם אם הגולש מגיע מהמודעה, מסתובב
 * באתר ומשאיר פרטים בביקור מאוחר יותר — המזהה עדיין יישלח.
 *
 * שימוש:
 *   1. לטעון את הקובץ בכל עמוד, לפני quiz.js:
 *        <script src="attribution.js"></script>
 *   2. בכל טופס, לפני השליחה:
 *        Object.assign(data, window.rpgAttribution());
 *   הסקריפט גם ממלא אוטומטית שדות נסתרים (input type="hidden")
 *   עם name תואם, אם הם קיימים בטופס.
 */
(function () {
  'use strict';

  var STORE_KEY = 'rpg_attribution';
  var TTL_DAYS = 90; // חלון ההמרה המקסימלי של Google Ads
  var CLICK_IDS = ['gclid', 'gbraid', 'wbraid', 'fbclid'];
  var UTMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  var FIELDS = CLICK_IDS.concat(UTMS, ['fbc', 'fbp', 'landing_page', 'referrer', 'first_seen']);

  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return {};
      var obj = JSON.parse(raw);
      if (obj._exp && Date.now() > obj._exp) {
        localStorage.removeItem(STORE_KEY);
        return {};
      }
      return obj;
    } catch (e) {
      return {};
    }
  }

  function save(obj) {
    try {
      obj._exp = Date.now() + TTL_DAYS * 864e5;
      localStorage.setItem(STORE_KEY, JSON.stringify(obj));
    } catch (e) { /* גלישה פרטית / חסימת אחסון — ממשיכים בלי לשמור */ }
  }

  function getCookie(name) {
    var m = document.cookie.match('(?:^|; )' + name + '=([^;]*)');
    return m ? decodeURIComponent(m[1]) : '';
  }

  var params = new URLSearchParams(window.location.search);
  var stored = load();
  var hasNewClick = CLICK_IDS.some(function (k) { return params.get(k); }) ||
                    UTMS.some(function (k) { return params.get(k); });

  if (hasNewClick) {
    // קליק חדש על מודעה — מחליף את הנתונים הישנים (last click)
    stored = {};
    CLICK_IDS.concat(UTMS).forEach(function (k) {
      var v = params.get(k);
      if (v) stored[k] = v;
    });
    if (stored.fbclid) {
      // פורמט _fbc הסטנדרטי של מטא: fb.1.<timestamp>.<fbclid>
      stored.fbc = 'fb.1.' + Date.now() + '.' + stored.fbclid;
    }
    stored.landing_page = window.location.href.split('#')[0];
    stored.referrer = document.referrer || '';
    stored.first_seen = new Date().toISOString();
    save(stored);
  } else if (!stored.landing_page) {
    // ביקור אורגני/ישיר ראשון — שומרים רק עמוד נחיתה ומפנה
    stored.landing_page = window.location.href.split('#')[0];
    stored.referrer = document.referrer || '';
    stored.first_seen = new Date().toISOString();
    save(stored);
  }

  window.rpgAttribution = function () {
    var s = load();
    var out = {};
    FIELDS.forEach(function (k) { out[k] = s[k] || ''; });
    // עדיפות לעוגיות של הפיקסל אם קיימות (מדויקות יותר)
    out.fbc = getCookie('_fbc') || out.fbc;
    out.fbp = getCookie('_fbp') || '';
    return out;
  };

  function fillHiddenFields() {
    var a = window.rpgAttribution();
    FIELDS.forEach(function (k) {
      var inputs = document.querySelectorAll('input[type="hidden"][name="' + k + '"]');
      for (var i = 0; i < inputs.length; i++) inputs[i].value = a[k];
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fillHiddenFields);
  } else {
    fillHiddenFields();
  }
})();

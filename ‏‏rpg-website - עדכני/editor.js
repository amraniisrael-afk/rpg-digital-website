/* ==========================================================================
   RPG Digital — עורך תוכן מובנה באתר
   נטען אך ורק כאשר בכתובת יש ?edit  (ראה הסניפט בתחתית index.html).

   כל טקסט שסומן ב-data-edit ניתן לעריכה, ויש שתי דרכים להוציא אותו החוצה:
     • "פרסמו לאתר"    — שולח ל-/api/editor-publish, שכותב לקובץ ב-GitHub
     • "הורידו קובץ"   — בונה index.html מעודכן בדפדפן להעלאה ידנית לריפו

   שתי הדרכים עובדות על **קובץ המקור** ולא על ה-DOM: ה-DOM כבר עבר נרמול
   ע"י הדפדפן ותוספות של סקריפטים, ושמירה שלו הייתה הורסת את הקובץ.
   ========================================================================== */
(function () {
    'use strict';

    var API_LOGIN = '/api/editor-login';
    var API_PUBLISH = '/api/editor-publish';
    var TOKEN_KEY = 'rpgEditorToken';

    var nodes = [];          // { key, el, multiline, original, value, hidden }
    var byKey = {};
    var active = null;       // element currently being edited inline
    var token = null;        // null במצב הורדה בלבד
    var publishing = false;
    var handedOff = false;   // נדלק אחרי הורדת קובץ, כדי לא להזהיר ביציאה

    /* ---------- קריאה וכתיבה של הטקסט בתוך אלמנט ---------- */

    function readValue(el, multiline) {
        if (!multiline) return el.textContent.replace(/\s+/g, ' ').trim();
        var out = '';
        (function walk(n) {
            for (var i = 0; i < n.childNodes.length; i++) {
                var c = n.childNodes[i];
                if (c.nodeType === 3) out += c.nodeValue;
                else if (c.nodeName === 'BR') out += '\n';
                else if (c.nodeType === 1) walk(c);
            }
        })(el);
        return out.split('\n').map(function (l) {
            return l.replace(/\s+/g, ' ').trim();
        }).join('\n').replace(/\n{3,}/g, '\n\n').trim();
    }

    function writeValue(el, multiline, value) {
        if (!multiline) {
            el.textContent = value;
            return;
        }
        el.innerHTML = '';
        var parts = value.split('\n');
        for (var i = 0; i < parts.length; i++) {
            if (i) el.appendChild(document.createElement('br'));
            el.appendChild(document.createTextNode(parts[i]));
        }
    }

    /* ==================================================================
       כתיבת השינויים לתוך קובץ המקור (למצב "הורידו קובץ")
       ================================================================== */

    function escapeHtml(s) {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    /** מוצא את ה-'>' שסוגר את תגית הפתיחה שמתחילה ב-from, תוך התעלמות ממרכאות */
    function findTagEnd(src, from) {
        var quote = 0;
        for (var i = from; i < src.length; i++) {
            var c = src.charAt(i);
            if (quote) {
                if (c === String.fromCharCode(quote)) quote = 0;
            } else if (c === '"' || c === "'") {
                quote = c.charCodeAt(0);
            } else if (c === '>') {
                return i + 1;
            }
        }
        return -1;
    }

    /** מוצא את תגית הסגירה התואמת, תוך ספירת קינון של אותו שם תגית */
    function findMatchingClose(src, from, tag) {
        var open = new RegExp('<' + tag + '(?=[\\s/>])', 'gi');
        var close = new RegExp('</' + tag + '\\s*>', 'gi');
        var depth = 0;
        var i = from;
        while (i < src.length) {
            open.lastIndex = i;
            close.lastIndex = i;
            var mOpen = open.exec(src);
            var mClose = close.exec(src);
            if (!mClose) return -1;
            if (mOpen && mOpen.index < mClose.index) {
                depth++;
                i = findTagEnd(src, mOpen.index);
                if (i === -1) return -1;
            } else {
                if (depth === 0) return mClose.index;
                depth--;
                i = mClose.index + mClose[0].length;
            }
        }
        return -1;
    }

    /**
     * מחיל את השינויים על מחרוזת ה-HTML המקורית.
     * changes: { key: { value, multiline } }
     * מחזיר { out, missing }
     */
    function applyToSource(src, changes) {
        var missing = [];
        var edits = [];

        Object.keys(changes).forEach(function (key) {
            var marker = 'data-edit="' + key + '"';
            var idx = src.indexOf(marker);
            if (idx === -1 || src.indexOf(marker, idx + 1) !== -1) {
                missing.push(key);           // לא נמצא, או נמצא יותר מפעם אחת
                return;
            }
            var lt = src.lastIndexOf('<', idx);
            if (lt === -1) { missing.push(key); return; }
            var m = /^<([a-zA-Z][a-zA-Z0-9]*)/.exec(src.slice(lt, idx));
            if (!m) { missing.push(key); return; }
            var tag = m[1];
            var openEnd = findTagEnd(src, lt);
            if (openEnd === -1 || openEnd > idx + marker.length + 400) { missing.push(key); return; }
            var closeStart = findMatchingClose(src, openEnd, tag);
            if (closeStart === -1) { missing.push(key); return; }

            var value = escapeHtml(changes[key].value);
            if (changes[key].multiline) value = value.replace(/\r?\n/g, '<br>');
            edits.push({ start: openEnd, end: closeStart, html: value });
        });

        edits.sort(function (a, b) { return b.start - a.start; });   // מהסוף להתחלה
        var out = src;
        edits.forEach(function (e) {
            out = out.slice(0, e.start) + e.html + out.slice(e.end);
        });
        return { out: out, missing: missing };
    }

    /** אותן בדיקות בטיחות שרצות בשרת לפני קומיט */
    function safetyProblems(original, out) {
        var count = function (s) { return (s.match(/data-edit="/g) || []).length; };
        var problems = [];
        if (count(out) !== count(original)) problems.push('מספר הטקסטים המסומנים השתנה');
        if (!/^\s*<!doctype html/i.test(out)) problems.push('הקובץ לא מתחיל ב-DOCTYPE');
        if (out.indexOf('</html>') === -1) problems.push('חסר תג סגירה של html');
        if (Math.abs(out.length - original.length) > original.length * 0.25) {
            problems.push('גודל הקובץ השתנה בצורה חריגה');
        }
        return problems;
    }

    /** מושך את קובץ המקור מהשרת — לא את ה-DOM */
    function fetchSource() {
        return fetch(location.pathname, { cache: 'no-store' }).then(function (r) {
            if (!r.ok) throw new Error('לא ניתן לקרוא את קובץ המקור (' + r.status + ')');
            return r.arrayBuffer();
        }).then(function (buf) {
            var bytes = new Uint8Array(buf);
            return {
                text: new TextDecoder('utf-8').decode(bytes),   // ה-BOM מוסר כאן
                bom: bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF
            };
        });
    }

    /* ---------- איסוף האלמנטים ---------- */

    function collect() {
        var list = document.querySelectorAll('[data-edit]');
        for (var i = 0; i < list.length; i++) {
            var el = list[i];
            var key = el.getAttribute('data-edit');
            if (byKey[key]) continue;                 // מפתח כפול — מתעלמים
            var multiline = el.hasAttribute('data-edit-multiline');
            var current = readValue(el, multiline);
            var rec = {
                key: key,
                el: el,
                multiline: multiline,
                original: current,
                value: current
            };
            nodes.push(rec);
            byKey[key] = rec;
            el.setAttribute('data-rpg-ed', '1');
        }
    }

    function isHidden(el) {
        return !el.offsetParent && getComputedStyle(el).position !== 'fixed';
    }

    function changed() {
        return nodes.filter(function (n) { return n.value !== n.original; });
    }

    /* ---------- עיצוב ---------- */

    var CSS = [
        '#rpg-ed-bar,#rpg-ed-panel,#rpg-ed-login{direction:rtl;font-family:system-ui,"Segoe UI",Arial,sans-serif;box-sizing:border-box}',
        '#rpg-ed-bar *,#rpg-ed-panel *,#rpg-ed-login *{box-sizing:border-box}',
        '#rpg-ed-bar{position:fixed;bottom:0;right:0;left:0;z-index:2147483000;background:#11151c;color:#fff;',
        'display:flex;align-items:center;gap:10px;padding:10px 16px;border-top:2px solid #2f6df6;',
        'box-shadow:0 -6px 24px rgba(0,0,0,.35);font-size:14px}',
        '#rpg-ed-bar .rpg-ed-sp{flex:1}',
        '#rpg-ed-bar button,#rpg-ed-panel button,#rpg-ed-login button{font:inherit;cursor:pointer;border-radius:8px;',
        'border:1px solid #3a4658;background:#1b2230;color:#fff;padding:8px 14px;transition:.15s}',
        '#rpg-ed-bar button:hover,#rpg-ed-panel button:hover,#rpg-ed-login button:hover{background:#28303f}',
        '#rpg-ed-bar button.rpg-primary,#rpg-ed-login button.rpg-primary{background:#2f6df6;border-color:#2f6df6;font-weight:700}',
        '#rpg-ed-bar button.rpg-primary:hover,#rpg-ed-login button.rpg-primary:hover{background:#1c58dc}',
        '#rpg-ed-bar button[disabled]{opacity:.45;cursor:not-allowed}',
        '#rpg-ed-count{background:#2f6df6;color:#fff;border-radius:999px;padding:3px 11px;font-weight:700}',
        '#rpg-ed-count.rpg-zero{background:#39424f}',
        '#rpg-ed-msg{color:#9fb4d6;font-size:13px}',
        '#rpg-ed-msg.rpg-ok{color:#54d98c}#rpg-ed-msg.rpg-err{color:#ff8080}',

        '[data-rpg-ed]{outline:1px dashed rgba(47,109,246,.55);outline-offset:2px;cursor:text;',
        'transition:background .12s,outline-color .12s;border-radius:3px}',
        '[data-rpg-ed]:hover{outline:2px solid #2f6df6;background:rgba(47,109,246,.10)}',
        '[data-rpg-ed][data-rpg-dirty]{outline:2px solid #f5a623;background:rgba(245,166,35,.12)}',
        '[data-rpg-ed]:focus{outline:2px solid #2f6df6;background:rgba(47,109,246,.16)}',
        'body.rpg-ed-on{padding-bottom:64px}',

        '#rpg-ed-panel{position:fixed;top:0;bottom:56px;right:0;width:390px;max-width:92vw;z-index:2147482999;',
        'background:#141922;color:#fff;border-left:1px solid #2a3342;display:none;flex-direction:column;',
        'box-shadow:-8px 0 28px rgba(0,0,0,.35)}',
        '#rpg-ed-panel.rpg-open{display:flex}',
        '#rpg-ed-panel header{padding:12px 14px;border-bottom:1px solid #2a3342;display:flex;gap:8px;align-items:center}',
        '#rpg-ed-search{flex:1;background:#0e1219;border:1px solid #2a3342;color:#fff;border-radius:8px;padding:8px 10px;font:inherit}',
        '#rpg-ed-list{overflow:auto;padding:6px 8px 20px;flex:1}',
        '.rpg-ed-sec{color:#7f93b3;font-size:12px;font-weight:700;padding:12px 6px 4px;letter-spacing:.02em}',
        '.rpg-ed-item{padding:8px 10px;border-radius:8px;cursor:pointer;font-size:13px;line-height:1.5;color:#dce6f5;border:1px solid transparent}',
        '.rpg-ed-item:hover{background:#1d2534;border-color:#2f3b4d}',
        '.rpg-ed-item.rpg-dirty{border-color:#f5a623;background:rgba(245,166,35,.10)}',
        '.rpg-ed-item .rpg-tag{display:inline-block;font-size:10px;color:#8aa0c2;background:#232c3b;border-radius:4px;padding:1px 6px;margin-inline-start:6px}',
        '.rpg-ed-item textarea{width:100%;margin-top:8px;background:#0e1219;color:#fff;border:1px solid #2f6df6;',
        'border-radius:8px;padding:8px;font:inherit;font-size:13px;line-height:1.6;resize:vertical;min-height:80px}',

        '#rpg-ed-login{position:fixed;inset:0;z-index:2147483600;background:rgba(8,11,16,.92);',
        'display:flex;align-items:center;justify-content:center}',
        '#rpg-ed-login .rpg-box{background:#141922;border:1px solid #2a3342;border-radius:16px;padding:26px;width:340px;max-width:92vw;color:#fff}',
        '#rpg-ed-login h2{margin:0 0 6px;font-size:19px;color:#fff}',
        '#rpg-ed-login p{margin:0 0 16px;font-size:13px;color:#9fb4d6;line-height:1.6}',
        '#rpg-ed-login input{width:100%;background:#0e1219;border:1px solid #2a3342;color:#fff;',
        'border-radius:8px;padding:10px 12px;font:inherit;margin-bottom:12px}',
        '#rpg-ed-login .rpg-err{color:#ff8080;font-size:13px;margin:0 0 10px;display:none}'
    ].join('');

    function injectCSS() {
        var s = document.createElement('style');
        s.id = 'rpg-ed-css';
        s.textContent = CSS;
        document.head.appendChild(s);
    }

    /* ---------- מסך כניסה ---------- */

    function showLogin(onDone) {
        var wrap = document.createElement('div');
        wrap.id = 'rpg-ed-login';
        wrap.innerHTML =
            '<div class="rpg-box">' +
            '<h2>עריכת תוכן</h2>' +
            '<p>הזינו את סיסמת העורך כדי לערוך את הטקסטים בעמוד.</p>' +
            '<p class="rpg-err" id="rpg-login-err"></p>' +
            '<input type="password" id="rpg-login-pw" placeholder="סיסמה" autocomplete="current-password">' +
            '<button class="rpg-primary" id="rpg-login-go" style="width:100%">כניסה</button>' +
            '</div>';
        document.body.appendChild(wrap);

        var pw = wrap.querySelector('#rpg-login-pw');
        var go = wrap.querySelector('#rpg-login-go');
        var err = wrap.querySelector('#rpg-login-err');
        pw.focus();

        function fail(m) {
            err.textContent = m;
            err.style.display = 'block';
            go.disabled = false;
            go.textContent = 'כניסה';
        }

        /* אם הפונקציות בשרת עוד לא הוגדרו, אין טעם לנעול את המשתמש בחוץ —
           מציעים מצב הורדה בלבד, שלא נוגע באתר החי בכלל. */
        function offerOfflineMode() {
            if (wrap.querySelector('#rpg-login-offline')) return;
            var b = document.createElement('button');
            b.id = 'rpg-login-offline';
            b.style.cssText = 'width:100%;margin-top:10px';
            b.textContent = 'המשיכו במצב הורדה בלבד';
            b.addEventListener('click', function () {
                token = null;
                wrap.remove();
                onDone();
            });
            wrap.querySelector('.rpg-box').appendChild(b);
        }

        function submit() {
            if (!pw.value) return;
            go.disabled = true;
            go.textContent = 'בודק…';
            err.style.display = 'none';
            fetch(API_LOGIN, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: pw.value })
            }).then(function (r) {
                return r.text().then(function (body) {
                    var j = {};
                    try { j = JSON.parse(body); } catch (e) { }
                    return { status: r.status, ok: r.ok, j: j };
                });
            }).then(function (res) {
                if (res.status === 404 || res.status === 405) {
                    fail('העורך עוד לא הוגדר בשרת — הפונקציות לא נמצאו.');
                    offerOfflineMode();
                    return;
                }
                if (res.status >= 500) {
                    fail(res.j.error || 'שגיאת שרת — ייתכן שהעורך עוד לא הוגדר');
                    offerOfflineMode();
                    return;
                }
                if (!res.ok || !res.j.token) return fail(res.j.error || 'סיסמה שגויה');
                token = res.j.token;
                try { sessionStorage.setItem(TOKEN_KEY, token); } catch (e) { }
                wrap.remove();
                onDone();
            }).catch(function () {
                fail('שגיאת רשת — נסו שוב');
                offerOfflineMode();
            });
        }

        go.addEventListener('click', submit);
        pw.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') submit();
        });
    }

    /* ---------- סרגל תחתון ---------- */

    var bar, countEl, msgEl, publishBtn, downloadBtn;

    function buildBar() {
        bar = document.createElement('div');
        bar.id = 'rpg-ed-bar';
        bar.innerHTML =
            '<strong>מצב עריכה</strong>' +
            '<span id="rpg-ed-count" class="rpg-zero">0 שינויים</span>' +
            '<button id="rpg-ed-toggle">רשימת הטקסטים</button>' +
            '<span id="rpg-ed-msg"></span>' +
            '<span class="rpg-ed-sp"></span>' +
            '<button id="rpg-ed-reset">בטלו הכל</button>' +
            '<button id="rpg-ed-exit">יציאה</button>' +
            '<button id="rpg-ed-download">הורידו קובץ</button>' +
            '<button id="rpg-ed-publish" class="rpg-primary">פרסמו לאתר</button>';
        document.body.appendChild(bar);
        document.body.classList.add('rpg-ed-on');

        countEl = bar.querySelector('#rpg-ed-count');
        msgEl = bar.querySelector('#rpg-ed-msg');
        publishBtn = bar.querySelector('#rpg-ed-publish');
        downloadBtn = bar.querySelector('#rpg-ed-download');
        downloadBtn.addEventListener('click', downloadFile);

        // בלי טוקן אין למי לפרסם — נשאר רק מסלול ההורדה
        if (!token) {
            publishBtn.style.display = 'none';
            downloadBtn.className = 'rpg-primary';
        }

        bar.querySelector('#rpg-ed-toggle').addEventListener('click', function () {
            panel.classList.toggle('rpg-open');
            if (panel.classList.contains('rpg-open') && listStale) renderList();
        });
        bar.querySelector('#rpg-ed-reset').addEventListener('click', resetAll);
        bar.querySelector('#rpg-ed-exit').addEventListener('click', exitEditor);
        publishBtn.addEventListener('click', publish);
    }

    function setMsg(text, cls) {
        msgEl.textContent = text || '';
        msgEl.className = cls ? 'rpg-' + cls : '';
    }

    function refresh() {
        var n = changed().length;
        countEl.textContent = n === 1 ? 'שינוי אחד' : n + ' שינויים';
        countEl.className = n ? '' : 'rpg-zero';
        publishBtn.disabled = !n || publishing;
        downloadBtn.disabled = !n;
        nodes.forEach(function (r) {
            if (r.value !== r.original) r.el.setAttribute('data-rpg-dirty', '1');
            else r.el.removeAttribute('data-rpg-dirty');
        });
        renderList();
    }

    /* ---------- עריכה בתוך העמוד ---------- */

    /* כל האלמנטים נעשים contenteditable מראש, כדי שלחיצה תמקם את הסמן
       בדיוק במקום שנלחץ — בדיוק כמו בעריכת טקסט רגילה. */
    function makeEditable() {
        nodes.forEach(function (rec) {
            rec.el.setAttribute('contenteditable', 'true');
            rec.el.setAttribute('spellcheck', 'false');
        });
    }

    function startEdit(el) {
        var rec = byKey[el.getAttribute('data-edit')];
        if (!rec) return;
        el.focus();
    }

    /** מנרמל את מה שנמצא כרגע באלמנט — מנקה מארקאפ שהודבק */
    function commit(el) {
        var rec = el && byKey[el.getAttribute('data-edit')];
        if (!rec) return;
        var value = readValue(el, rec.multiline);
        if (value !== rec.value || el.innerHTML.indexOf('<') !== -1) {
            rec.value = value;
            writeValue(el, rec.multiline, value);
        }
        refresh();
    }

    function stopEdit() {
        if (!active) return;
        var el = active;
        active = null;
        commit(el);
    }

    function bindPageEditing() {
        // בלימת ניווט וטפסים כל עוד מצב העריכה פעיל
        document.addEventListener('click', function (e) {
            if (e.target.closest && e.target.closest('#rpg-ed-bar,#rpg-ed-panel,#rpg-ed-login')) return;
            if (e.target.closest && e.target.closest('a,button,summary,label,[data-edit]')) {
                e.preventDefault();
                e.stopPropagation();
            }
        }, true);

        document.addEventListener('submit', function (e) {
            if (!e.target.closest('#rpg-ed-panel')) e.preventDefault();
        }, true);

        document.addEventListener('focusin', function (e) {
            var ed = e.target.closest && e.target.closest('[data-edit]');
            if (ed && ed !== active) {
                if (active) commit(active);
                active = ed;
            }
        }, true);

        document.addEventListener('focusout', function (e) {
            if (active && e.target === active) {
                var el = active;
                active = null;
                commit(el);
            }
        }, true);

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && active) { active.blur(); return; }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault();
                publish();
                return;
            }
            if (!active) return;
            var rec = byKey[active.getAttribute('data-edit')];
            if (e.key === 'Enter' && rec && !rec.multiline) e.preventDefault();
        }, true);

        // הדבקה כטקסט נקי בלבד
        document.addEventListener('paste', function (e) {
            if (!active) return;
            e.preventDefault();
            var text = (e.clipboardData || window.clipboardData).getData('text/plain');
            var rec = byKey[active.getAttribute('data-edit')];
            if (rec && !rec.multiline) text = text.replace(/\s+/g, ' ');
            document.execCommand('insertText', false, text);
        }, true);

        document.addEventListener('input', function (e) {
            if (!active || e.target !== active) return;
            var rec = byKey[active.getAttribute('data-edit')];
            if (rec) {
                rec.value = readValue(active, rec.multiline);
                handedOff = false;
                refresh();
            }
        }, true);

        window.addEventListener('beforeunload', function (e) {
            if (changed().length && !handedOff) { e.preventDefault(); e.returnValue = ''; }
        });
    }

    /* ---------- פאנל רשימת הטקסטים ---------- */

    var panel, listEl, searchEl;

    function buildPanel() {
        panel = document.createElement('div');
        panel.id = 'rpg-ed-panel';
        panel.innerHTML =
            '<header><input id="rpg-ed-search" placeholder="חיפוש טקסט…">' +
            '<button id="rpg-ed-close">סגירה</button></header>' +
            '<div id="rpg-ed-list"></div>';
        document.body.appendChild(panel);
        listEl = panel.querySelector('#rpg-ed-list');
        searchEl = panel.querySelector('#rpg-ed-search');
        searchEl.addEventListener('input', renderList);
        panel.querySelector('#rpg-ed-close').addEventListener('click', function () {
            panel.classList.remove('rpg-open');
        });
    }

    var SECTION_NAMES = {
        'hero': 'ראש העמוד', 'results': 'מספרים / הוכחה', 'pas-section': 'הבעיה והפתרון',
        'testimonials': 'המלצות לקוחות', 'solution': 'השיטה שלנו', 'value-section': 'מה מקבלים',
        'ugc-section': 'יוצרי תוכן ו-UGC', 'chart-section': 'הגרף', 'who': 'למי זה מתאים',
        'quiz': 'שאלון האבחון', 'urgency-section': 'דחיפות / בלעדיות',
        'newsletter-section': 'ניוזלטר', 'faq': 'שאלות נפוצות', 'lead-form': 'טופס יצירת קשר',
        'main': 'כללי'
    };

    var listStale = true;

    function renderList() {
        // הרשימה נבנית מחדש רק כשהפאנל פתוח — אחרת כל הקשה הייתה בונה 209 פריטים
        if (!listEl || !panel.classList.contains('rpg-open')) {
            listStale = true;
            return;
        }
        listStale = false;
        var q = (searchEl.value || '').trim();
        var open = listEl.querySelector('textarea');
        var openKey = open ? open.getAttribute('data-for') : null;
        listEl.innerHTML = '';
        var lastSec = null;

        nodes.forEach(function (rec) {
            if (q && rec.value.indexOf(q) === -1 && rec.original.indexOf(q) === -1) return;
            var sec = rec.key.split('.')[0];
            if (sec !== lastSec) {
                lastSec = sec;
                var h = document.createElement('div');
                h.className = 'rpg-ed-sec';
                h.textContent = SECTION_NAMES[sec] || sec;
                listEl.appendChild(h);
            }
            var item = document.createElement('div');
            item.className = 'rpg-ed-item' + (rec.value !== rec.original ? ' rpg-dirty' : '');
            var hidden = isHidden(rec.el);
            item.innerHTML = '<span class="rpg-txt"></span>' +
                (hidden ? '<span class="rpg-tag">מוסתר בעמוד</span>' : '');
            item.querySelector('.rpg-txt').textContent =
                rec.value.replace(/\n/g, ' ⏎ ').slice(0, 90) || '(ריק)';
            item.addEventListener('click', function (e) {
                if (e.target.tagName === 'TEXTAREA') return;
                if (!hidden) {
                    rec.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    startEdit(rec.el);
                } else {
                    openInline(item, rec);
                }
            });
            listEl.appendChild(item);
            if (openKey === rec.key) openInline(item, rec);
        });
    }

    function openInline(item, rec) {
        if (item.querySelector('textarea')) return;
        var ta = document.createElement('textarea');
        ta.value = rec.value;
        ta.setAttribute('data-for', rec.key);
        ta.addEventListener('input', function () {
            rec.value = rec.multiline ? ta.value : ta.value.replace(/\s+/g, ' ');
            writeValue(rec.el, rec.multiline, rec.value);
            handedOff = false;
            var n = changed().length;
            countEl.textContent = n === 1 ? 'שינוי אחד' : n + ' שינויים';
            countEl.className = n ? '' : 'rpg-zero';
            publishBtn.disabled = !n || publishing;
            downloadBtn.disabled = !n;
            item.classList.toggle('rpg-dirty', rec.value !== rec.original);
        });
        item.appendChild(ta);
        ta.focus();
    }

    /* ---------- ביטול ופרסום ---------- */

    function resetAll() {
        if (!changed().length) return;
        if (!confirm('לבטל את כל השינויים ולחזור לטקסט שמופיע כרגע באתר?')) return;
        stopEdit();
        nodes.forEach(function (r) {
            if (r.value !== r.original) {
                r.value = r.original;
                writeValue(r.el, r.multiline, r.original);
            }
        });
        setMsg('');
        refresh();
    }

    function exitEditor() {
        if (changed().length && !confirm('יש שינויים שלא פורסמו. לצאת ולאבד אותם?')) return;
        nodes.forEach(function (r) { r.value = r.original; });
        var url = location.pathname + location.hash;
        location.href = url;
    }

    function downloadFile() {
        var list = changed();
        if (!list.length) return;
        stopEdit();
        list = changed();

        setMsg('מכין את הקובץ…');
        var map = {};
        list.forEach(function (r) { map[r.key] = { value: r.value, multiline: r.multiline }; });

        fetchSource().then(function (src) {
            var res = applyToSource(src.text, map);
            if (res.missing.length) {
                setMsg('הטקסטים הבאים לא נמצאו בקובץ — רעננו ונסו שוב: ' +
                    res.missing.slice(0, 3).join(', '), 'err');
                return;
            }
            var problems = safetyProblems(src.text, res.out);
            if (problems.length) {
                setMsg('ההורדה בוטלה מטעמי בטיחות: ' + problems.join('; '), 'err');
                return;
            }

            var blob = new Blob([(src.bom ? '﻿' : '') + res.out],
                { type: 'text/html;charset=utf-8' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'index.html';
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(function () { URL.revokeObjectURL(url); }, 10000);

            handedOff = true;
            setMsg('הקובץ ירד עם ' + list.length + ' שינויים. החליפו איתו את index.html בריפו.', 'ok');
        }).catch(function (err) {
            setMsg('ההורדה נכשלה: ' + err.message, 'err');
        });
    }

    function publish() {
        if (publishing) return;
        if (!token) { downloadFile(); return; }     // במצב הורדה, Ctrl+S מוריד קובץ
        var list = changed();
        if (!list.length) return;
        stopEdit();
        list = changed();
        if (!confirm('לפרסם ' + list.length + ' שינויים לאתר החי?')) return;

        publishing = true;
        publishBtn.disabled = true;
        publishBtn.textContent = 'מפרסם…';
        setMsg('שולח לשרת…');

        var payload = { changes: {} };
        list.forEach(function (r) { payload.changes[r.key] = r.value; });

        fetch(API_PUBLISH, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(payload)
        }).then(function (r) {
            return r.json().then(function (j) { return { status: r.status, j: j }; });
        }).then(function (res) {
            publishing = false;
            publishBtn.textContent = 'פרסמו לאתר';
            if (res.status === 401) {
                try { sessionStorage.removeItem(TOKEN_KEY); } catch (e) { }
                setMsg('פג תוקף ההתחברות — רעננו את העמוד והתחברו שוב', 'err');
                return;
            }
            if (res.status !== 200) {
                setMsg('הפרסום נכשל: ' + (res.j.error || res.status), 'err');
                refresh();
                return;
            }
            nodes.forEach(function (r) { r.original = r.value; });
            setMsg('פורסם! השינויים יעלו לאתר החי תוך כדקה (' + res.j.commit + ')', 'ok');
            refresh();
        }).catch(function (err) {
            publishing = false;
            publishBtn.textContent = 'פרסמו לאתר';
            setMsg('שגיאת רשת: ' + err.message, 'err');
            refresh();
        });
    }

    /* ---------- הפעלה ---------- */

    function start() {
        collect();
        if (!nodes.length) {
            alert('לא נמצאו טקסטים לעריכה בעמוד הזה.');
            return;
        }
        injectCSS();
        buildPanel();
        buildBar();
        makeEditable();
        bindPageEditing();
        refresh();
        setMsg(token
            ? 'לחצו על כל טקסט בעמוד כדי לערוך אותו'
            : 'מצב הורדה בלבד — העריכות לא יעלו לאתר עד שתעלו את הקובץ לריפו');
    }

    function boot() {
        try { token = sessionStorage.getItem(TOKEN_KEY); } catch (e) { token = null; }
        if (token) start();
        else showLogin(start);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();

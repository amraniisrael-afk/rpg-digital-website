/* ============================================================
   RPG Digital — אבחון חינם (מנוע משותף לכל הדפים)
   ------------------------------------------------------------
   <section id="quiz" data-quiz-track="ecommerce | leads | split">
     - ecommerce / leads: מציג רק את השאלות עם data-track המתאים.
     - split: מתחיל בשאלת פתיחה (data-split), וכל תשובה בה
       (data-track על הכפתור) ממשיכה ל-6 השאלות של אותו מסלול.
   כל כפתור תשובה: data-score (ניקוד) ו-data-rec (מפתח להמלצה).
   הניקוד המקסימלי בכל מסלול הוא 100.
   ============================================================ */
(function () {
    var section = document.getElementById('quiz');
    if (!section) return;

    var ENDPOINT = 'https://script.google.com/macros/s/AKfycbzn04fzYK_VWD6217-l-CRaeyVsgNGfnsfzMwCNgwFnJQSMerq-PBGGzl4QaRbkSaeJ/exec';
    var TRACK_LABEL = { ecommerce: 'איקומרס', leads: 'לידים' };

    /* ---------- טקסטים לתוצאה, לפי מסלול וטווח ציון ---------- */
    var RESULTS = {
        ecommerce: [
            ['יש פה פוטנציאל ענק שלא מנוצל',
             'על סמך התשובות שלכם, יש כמה נקודות קריטיות שמונעות מהחנות למכור כמו שהיא יכולה. השאירו פרטים לגלות את הציון המדויק ואיפה הכסף דולף.'],
            ['אתם על הדרך הנכונה, אבל יש מה לשפר',
             'יש לכם בסיס טוב, אבל כמה שינויים בפיד, במדידה ובקריאטיב יכולים להכפיל את המכירות. השאירו פרטים לגלות את הציון המלא ומה אפשר לעשות מיד.'],
            ['החנות שלכם נשמעת במצב טוב',
             'אתם מנהלים את הפרסום ברצינות. השאירו פרטים לגלות את הציון המדויק ולוודא שאתם לא משאירים רווח על השולחן בדרך לסקייל.']
        ],
        leads: [
            ['הלידים שלכם עולים יותר ממה שנראה בדוח',
             'על סמך התשובות שלכם, יש כמה נקודות שמונעות מהלידים להפוך לעסקאות. השאירו פרטים לגלות את הציון המדויק ואיפה העסקאות הולכות לאיבוד.'],
            ['יש בסיס טוב, אבל עסקאות נופלות בדרך',
             'הלידים נכנסים, אבל חלק מהם נעצר בין הטופס לשיחה. השאירו פרטים לגלות את הציון המלא ומה אפשר לתקן מיד.'],
            ['מערך הלידים שלכם נשמע במצב טוב',
             'אתם מנהלים את הלידים ברצינות. השאירו פרטים לגלות את הציון המדויק ולוודא שאתם לא משאירים עסקאות על השולחן כשמגדילים תקציב.']
        ]
    };

    /* ---------- המלצות, לפי data-rec של התשובה ---------- */
    var RECS = {
        ecommerce: {
            roas_unknown: 'בלי ROAS אמין אי אפשר לדעת אם החנות מרוויחה מהפרסום. הצעד הראשון שלנו עם כל חנות הוא הקמת מדידת רכישות מלאה עם ערך הזמנה אמיתי — בלי זה כל החלטה על תקציב היא ניחוש.',
            roas_low: 'ROAS מתחת ל-2 מצביע כמעט תמיד על אחד משלושה: פיד מוצרים שדוחף את המוצרים הלא נכונים, קריאטיב שלא עוצר את הגלילה, או דף מוצר שלא ממיר — לרוב לא על התקציב עצמו.',
            track_none: 'בלי מעקב רכישות האלגוריתם לא יודע על מה לבצע אופטימיזציה, ואתם מפרסמים בעיניים עצומות. חיבור Conversions API ומדידת Server-Side הוא ההשקעה שמחזירה את עצמה הכי מהר בחנות.',
            track_gap: 'פער בין מה שהפלטפורמה מדווחת לבין ההזמנות בפועל אומר שאתם מקבלים החלטות תקציב על נתונים שגויים. סגירת הפער תחשוף אילו קמפיינים באמת מוכרים ואילו רק לוקחים קרדיט.',
            track_pixel: 'פיקסל בדפדפן בלבד מאבד היום חלק ניכר מהרכישות בגלל חסימות וקוקיז. הוספת Conversions API בצד השרת מחזירה את האירועים החסרים ומשפרת את הלמידה של האלגוריתם.',
            feed_none: 'חנות בלי פיד ב-Merchant Center מוותרת על הערוץ עם כוונת הרכישה הגבוהה ביותר. Shopping ו-PMax תופסים קונים בדיוק ברגע שהם מחפשים את המוצר שלכם.',
            feed_errors: 'כל מוצר שנדחה ב-Merchant Center הוא מוצר שלא מוצג לקונים. ניקוי הדחיות הוא בדרך כלל השיפור המהיר והזול ביותר שאפשר לעשות לחנות.',
            feed_basic: 'פיד אוטומטי מהחנות מייצא כותרות שנכתבו לבני אדם, לא למנוע חיפוש. כתיבת כותרות לפי כוונת חיפוש ותיוג Custom Labels לפי רווחיות מאפשרים לנהל תקציב לפי רווח ולא לפי מחזור.',
            creative_stale: 'קריאטיב שחי כמה חודשים כבר נשחק — הקהל ראה אותו, ה-CTR יורד ועלות הרכישה מטפסת. תחלופה שיטתית היא לא מותרות בחנות, היא הכרחית.',
            creative_none: 'קריאטיב קבוע = עלות רכישת לקוח שעולה כל חודש. הפלטפורמות מתגמלות תוכן טרי — בניית מערך UGC ותחלופה שוטפת היא ההבדל בין חנות שצומחת לחנות שנתקעת.',
            scale_drop: 'כשמגדילים תקציב וה-ROAS נופל, זה כמעט תמיד סימן שהחנות נשענת על קהל צר מדי או על מוצר אחד. צריך להרחיב את בסיס הקריאטיב והמוצרים לפני שמגדילים, לא אחרי.',
            scale_afraid: 'הפחד להגדיל תקציב מונע צמיחה. כשיודעים מה שולי הרווח לכל מוצר ומה עלות רכישת לקוח שעדיין כדאית, אפשר להגדיל בביטחון ולדעת מראש מה יקרה.',
            _fallback: [
                'המשיכו לנתח את הנתונים ברמת מוצר ולא רק ברמת קמפיין — שם מתחבאות ההזדמנויות הגדולות בחנות.',
                'בדקו את ה-ROAS שלכם לפי מוצר ולפי קהל — לרוב 20% מהמוצרים מייצרים 80% מהרווח, וכדאי שהתקציב ידע את זה.'
            ]
        },
        leads: {
            conv_unknown: 'בלי לדעת כמה לידים הופכים לעסקה, אי אפשר לדעת איזה קמפיין מרוויח. הצעד הראשון הוא סימון סטטוס פשוט לכל ליד: רלוונטי, פגישה, עסקה.',
            conv_low: 'שיעור סגירה נמוך מצביע בדרך כלל על לידים לא מסוננים, לא על צוות מכירות חלש. שאלות סינון בדף הנחיתה מרחיקות את מי שלא רלוונטי לפני שהוא מגיע אליכם.',
            speed_late: 'ליד שמחכה עד הבוקר כבר השאיר פרטים גם אצל מתחרה. מענה אוטומטי בוואטסאפ תוך דקות שומר עליו חם עד שאיש המכירות חוזר אליו.',
            speed_hour: 'שעה נשמעת מהר, אבל ליד שמקבל מענה בדקות הראשונות נסגר בסיכוי גבוה יותר. מענה אוטומטי מיידי סוגר את הפער בלי להעמיס על הצוות.',
            attr_count: 'כשיודעים רק כמה לידים הגיעו מכל ערוץ, התקציב זורם לקמפיין עם הליד הכי זול, לא לזה שמביא עסקאות. החזרת סטטוס העסקה לקמפיינים מלמדת את האלגוריתם מי באמת סוגר.',
            attr_channel: 'מדידה ברמת ערוץ מסתירה מודעות שמביאות טפסים בלי עסקאות. ירידה לרמת מודעה מראה איפה התקציב נשרף.',
            scale_quality: 'כשהגדלת תקציב מביאה לידים פחות איכותיים, האלגוריתם מחפש עוד אנשים שקל להם למלא טופס. אופטימיזציה לפי לידים רלוונטיים במקום לפי כל טופס משנה את מי שהוא מחפש.',
            scale_cpl: 'קפיצה בעלות לליד כשמגדילים תקציב היא סימן לקהל צר או למסר אחד שנשחק. צריך להרחיב קהלים וזוויות קריאייטיב לפני שמגדילים, לא אחרי.',
            scale_afraid: 'כשיודעים כמה עולה עסקה ולא רק כמה עולה ליד, אפשר להגדיל תקציב בביטחון ולדעת מראש איפה הגבול.',
            _fallback: [
                'המשיכו למדוד עלות לעסקה ולא רק עלות לליד, לפי קמפיין ולפי מודעה. שם מתחבאות ההזדמנויות.',
                'בדקו כמה מהר חוזרים לכל ליד בפועל, כולל בערבים ובסופי שבוע. זה המקום הכי זול לשפר בו את שיעור הסגירה.'
            ]
        }
    };

    var mode = section.getAttribute('data-quiz-track') || 'ecommerce';
    var wrap = document.getElementById('quizQuestions');
    var progressBox = section.querySelector('.quiz-progress');
    var progressFill = document.getElementById('quizProgressFill');
    var progressText = document.getElementById('quizProgressText');
    var quizResult = document.getElementById('quizResult');
    var splitQ = wrap.querySelector('.quiz-question[data-split]');

    var state = { track: mode === 'split' ? null : mode, seq: [], idx: 0, score: 0, answers: [] };
    window._quizState = state;

    function all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

    function hideAll() { all('.quiz-question', wrap).forEach(function (q) { q.classList.remove('active'); }); }

    function show(i) {
        hideAll();
        state.seq[i].classList.add('active');
        progressFill.style.width = ((i + 1) / state.seq.length * 100) + '%';
        progressText.textContent = 'שאלה ' + (i + 1) + ' מתוך ' + state.seq.length;
    }

    function start(track) {
        state.track = track;
        state.seq = all('.quiz-question[data-track="' + track + '"]', wrap);
        state.idx = 0;
        section.setAttribute('data-active-track', track);
        var biz = document.getElementById('quizBusiness');
        if (biz && biz.dataset['placeholder' + (track === 'leads' ? 'Leads' : 'Ecommerce')]) {
            biz.placeholder = biz.dataset['placeholder' + (track === 'leads' ? 'Leads' : 'Ecommerce')];
        }
        show(0);
    }

    function showResult() {
        wrap.style.display = 'none';
        if (progressBox) progressBox.style.display = 'none';
        quizResult.style.display = 'block';
        var tiers = RESULTS[state.track];
        var t = state.score <= 35 ? tiers[0] : state.score <= 65 ? tiers[1] : tiers[2];
        document.getElementById('quizResultTitle').textContent = t[0];
        document.getElementById('quizResultText').textContent = t[1];
    }

    if (splitQ) {
        hideAll();
        splitQ.classList.add('active');
        progressFill.style.width = '0%';
        progressText.textContent = 'שאלת פתיחה';
    } else {
        start(state.track);
    }

    wrap.addEventListener('click', function (e) {
        var btn = e.target.closest('.quiz-option');
        if (!btn || btn.disabled) return;
        var q = btn.closest('.quiz-question');
        all('.quiz-option', q).forEach(function (b) { b.classList.remove('selected'); b.disabled = true; });
        btn.classList.add('selected');

        if (q.hasAttribute('data-split')) {
            setTimeout(function () { start(btn.getAttribute('data-track')); }, 300);
            return;
        }

        state.score += parseInt(btn.getAttribute('data-score') || '0', 10);
        state.answers.push({
            q: q.querySelector('h3').textContent.trim(),
            a: btn.textContent.trim(),
            rec: btn.getAttribute('data-rec') || ''
        });
        setTimeout(function () {
            state.idx++;
            if (state.idx < state.seq.length) show(state.idx);
            else showResult();
        }, 300);
    });

    function pickRecs() {
        var bank = RECS[state.track];
        var out = [];
        state.answers.forEach(function (a) {
            if (a.rec && bank[a.rec] && out.indexOf(bank[a.rec]) === -1) out.push(bank[a.rec]);
        });
        out = out.slice(0, 2);
        var i = 0;
        while (out.length < 2 && i < bank._fallback.length) {
            if (out.indexOf(bank._fallback[i]) === -1) out.push(bank._fallback[i]);
            i++;
        }
        return out;
    }

    function revealScore() {
        var s = Math.min(state.score, 100);
        var circumference = 408;
        var color = s <= 35 ? '#ff6b6b' : s <= 60 ? '#f9ca24' : '#FF5500';
        var verdict = s <= 35 ? 'יש הרבה מה לשפר 🔴' : s <= 60 ? 'פוטנציאל גדול לשיפור 🟡' : 'ביצועים מעל הממוצע 🟢';
        var fill = document.getElementById('scoreCircleFill');
        var numEl = document.getElementById('scoreNumber');
        document.getElementById('scoreOut').textContent = 'מתוך 100';
        fill.style.stroke = color;
        numEl.style.color = color;
        document.getElementById('scoreVerdict').textContent = verdict;
        document.getElementById('scoreReveal').style.display = 'block';

        var recs = pickRecs();
        document.getElementById('recItem1').textContent = recs[0];
        document.getElementById('recItem2').textContent = recs[1];
        document.getElementById('quizRecommendations').style.display = 'block';

        setTimeout(function () {
            fill.style.strokeDashoffset = circumference - (circumference * s / 100);
            var startTime = null;
            function animateNum(ts) {
                if (!startTime) startTime = ts;
                var p = Math.min((ts - startTime) / 1600, 1);
                numEl.textContent = Math.round(s * p);
                if (p < 1) requestAnimationFrame(animateNum);
            }
            requestAnimationFrame(animateNum);
        }, 100);
    }

    window.handleQuizSubmit = function (e) {
        e.preventDefault();
        var btn = e.target.querySelector('button[type="submit"]');
        btn.textContent = '⏳ שולח...';
        btn.disabled = true;

        var name = document.getElementById('quizName').value;
        var business = document.getElementById('quizBusiness').value;
        var lines = state.answers.map(function (item, i) {
            return 'ש' + (i + 1) + ': ' + item.q + ' | תשובה: ' + item.a;
        });
        lines.unshift('מסלול: ' + (TRACK_LABEL[state.track] || state.track));

        var data = {
            formType: 'quiz',
            track: state.track,
            name: name,
            business: business,
            phone: document.getElementById('quizPhone').value,
            email: document.getElementById('quizEmail').value,
            score: Math.min(state.score, 100) + '/100',
            answers: lines.join('\n'),
            consent: 'אישר',
            consentTimestamp: new Date().toLocaleString('he-IL')
        };

        window.dataLayer = window.dataLayer || [];
        dataLayer.push({ event: 'form_submit', form_id: 'quizForm', track: state.track, business_name: business, page_path: window.location.pathname });

        fetch(ENDPOINT, { method: 'POST', body: JSON.stringify(data) })
            .then(function () {
                dataLayer.push({ event: 'generate_lead', form_id: 'quizForm', track: state.track, business_name: business, page_path: window.location.pathname });
                var thanks = document.createElement('p');
                thanks.style.cssText = 'color: var(--teal); font-size: 16px; font-weight: 700; text-align: center;';
                thanks.textContent = 'תודה ' + name + '! נחזור אליכם בהקדם 🙌';
                var form = document.getElementById('quizLeadForm');
                form.innerHTML = '';
                form.appendChild(thanks);
                document.getElementById('scoreLockedMsg').style.display = 'none';
                revealScore();
            })
            .catch(function () {
                btn.textContent = '✗ שגיאה, נסו שוב';
                btn.disabled = false;
            });
    };
})();

/**
 * RPG Digital — Accessibility Widget + WhatsApp Float Button
 * Shared across all pages. Include at bottom of <body>.
 */
(function () {

    // ===== Inject CSS =====
    const style = document.createElement('style');
    style.textContent = `
        /* ========== ACCESSIBILITY WIDGET ========== */
        .a11y-float {
            position: fixed;
            top: 160px;
            right: 20px;
            z-index: 999;
            width: 48px;
            height: 48px;
            background: #2196F3;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 16px rgba(33,150,243,0.5);
            cursor: pointer;
            border: none;
            transition: all 0.3s ease;
        }
        .a11y-float:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 30px rgba(21,101,192,0.6);
        }
        .a11y-float svg {
            width: 28px;
            height: 28px;
            fill: white;
        }
        .a11y-panel {
            position: fixed;
            top: 220px;
            right: 20px;
            z-index: 1001;
            width: 320px;
            max-height: 80vh;
            background: #1a1a1a;
            border: 1px solid rgba(21,101,192,0.3);
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.6);
            overflow-y: auto;
            transform: scale(0.8) translateY(-20px);
            transform-origin: top right;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
        }
        .a11y-panel.open {
            transform: scale(1) translateY(0);
            opacity: 1;
            visibility: visible;
        }
        .a11y-panel-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 18px 20px;
            background: #1565C0;
            border-radius: 16px 16px 0 0;
            position: sticky;
            top: 0;
            z-index: 2;
        }
        .a11y-panel-header h3 {
            font-size: 17px;
            font-weight: 700;
            color: white;
            margin: 0;
        }
        .a11y-close {
            background: none;
            border: none;
            color: white;
            font-size: 22px;
            cursor: pointer;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: background 0.3s;
        }
        .a11y-close:hover { background: rgba(255,255,255,0.2); }
        .a11y-panel-body { padding: 16px; }
        .a11y-section-title {
            font-size: 12px;
            font-weight: 700;
            color: #1565C0;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin: 16px 0 10px;
            padding-bottom: 6px;
            border-bottom: 1px solid rgba(21,101,192,0.2);
        }
        .a11y-section-title:first-child { margin-top: 0; }
        .a11y-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
        }
        .a11y-btn {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 6px;
            padding: 14px 8px;
            background: #222;
            border: 1px solid #333;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.3s ease;
            color: #ccc;
            font-family: 'Heebo', sans-serif;
            font-size: 12px;
            font-weight: 500;
            text-align: center;
            line-height: 1.3;
        }
        .a11y-btn:hover { background: #2a2a2a; border-color: #1565C0; }
        .a11y-btn.active { background: rgba(21,101,192,0.15); border-color: #1565C0; color: #1565C0; }
        .a11y-btn-icon { font-size: 22px; line-height: 1; }
        .a11y-slider-row {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px 0;
        }
        .a11y-slider-label { font-size: 13px; color: #ccc; flex-shrink: 0; width: 90px; }
        .a11y-slider {
            flex: 1;
            -webkit-appearance: none;
            appearance: none;
            height: 6px;
            background: #333;
            border-radius: 3px;
            outline: none;
        }
        .a11y-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 18px;
            height: 18px;
            background: #1565C0;
            border-radius: 50%;
            cursor: pointer;
        }
        .a11y-slider-value { font-size: 13px; color: #1565C0; font-weight: 700; width: 35px; text-align: center; }
        .a11y-reset {
            width: 100%;
            padding: 12px;
            margin-top: 16px;
            background: transparent;
            border: 1px solid #ff6b6b;
            border-radius: 10px;
            color: #ff6b6b;
            font-family: 'Heebo', sans-serif;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
        }
        .a11y-reset:hover { background: rgba(255,107,107,0.1); }
        .a11y-footer { text-align: center; padding: 12px 16px; border-top: 1px solid #333; margin-top: 12px; }
        .a11y-footer a { font-size: 12px; color: #888; text-decoration: none; }
        .a11y-footer a:hover { color: #1565C0; }

        /* Accessibility overrides */
        body.a11y-high-contrast * { background-color: #000 !important; color: #ffff00 !important; border-color: #ffff00 !important; }
        body.a11y-high-contrast a { color: #00ffff !important; }
        body.a11y-high-contrast .a11y-panel, body.a11y-high-contrast .a11y-panel * { background-color: revert !important; color: revert !important; border-color: revert !important; }
        body.a11y-dark-contrast * { background-color: #000 !important; color: #fff !important; border-color: #fff !important; }
        body.a11y-dark-contrast .a11y-panel, body.a11y-dark-contrast .a11y-panel * { background-color: revert !important; color: revert !important; border-color: revert !important; }
        body.a11y-light-contrast * { background-color: #fff !important; color: #000 !important; border-color: #000 !important; }
        body.a11y-light-contrast .a11y-panel, body.a11y-light-contrast .a11y-panel * { background-color: revert !important; color: revert !important; border-color: revert !important; }
        body.a11y-grayscale { filter: grayscale(100%); }
        body.a11y-highlight-links a { outline: 3px solid #ffff00 !important; outline-offset: 2px; text-decoration: underline !important; }
        body.a11y-big-cursor, body.a11y-big-cursor * { cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24'%3E%3Cpath fill='%23000' stroke='%23fff' stroke-width='1' d='M5 3l14 9-6 1 4 8-3 1-4-8-5 4z'/%3E%3C/svg%3E") 4 2, auto !important; }
        body.a11y-readable-font * { font-family: Arial, Helvetica, sans-serif !important; letter-spacing: 0.5px !important; }
        body.a11y-stop-animations *, body.a11y-stop-animations *::before, body.a11y-stop-animations *::after { animation: none !important; transition: none !important; }
        body.a11y-highlight-titles h1, body.a11y-highlight-titles h2, body.a11y-highlight-titles h3,
        body.a11y-highlight-titles h4, body.a11y-highlight-titles h5, body.a11y-highlight-titles h6 { outline: 3px solid #1565C0 !important; outline-offset: 4px; }
        body.a11y-reading-guide .a11y-guide-bar { display: block !important; }
        .a11y-guide-bar {
            display: none;
            position: fixed;
            top: 0; left: 0;
            width: 100%;
            height: 12px;
            background: rgba(21,101,192,0.3);
            z-index: 99999;
            pointer-events: none;
            transition: top 0.05s;
        }

        /* ========== WHATSAPP FLOAT BUTTON ========== */
        .whatsapp-float {
            position: fixed;
            bottom: 30px;
            right: 30px;
            z-index: 999;
            width: 60px;
            height: 60px;
            background: #25D366;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 20px rgba(37,211,102,0.4);
            text-decoration: none;
            animation: float 3s ease-in-out infinite;
        }
        @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
        }
        .whatsapp-float:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 30px rgba(37,211,102,0.6);
            animation: none;
        }
        .whatsapp-float svg { width: 32px; height: 32px; fill: white; }
        .whatsapp-tooltip {
            position: absolute;
            bottom: 70px;
            left: 50%;
            transform: translateX(-50%);
            background: #111;
            color: white;
            font-size: 13px;
            padding: 6px 12px;
            border-radius: 8px;
            white-space: nowrap;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        }
        .whatsapp-float:hover .whatsapp-tooltip { opacity: 1; }

        @media (max-width: 768px) {
            .whatsapp-float { width: 48px; height: 48px; right: 16px; bottom: 20px; }
            .whatsapp-float svg { width: 26px; height: 26px; }
        }
    `;
    document.head.appendChild(style);

    // ===== Inject HTML =====
    // Determine accessibility.html path (one level up for blog sub-pages)
    const depth = window.location.pathname.split('/').filter(Boolean).length;
    const accessibilityHref = depth >= 2 ? '../accessibility.html' : 'accessibility.html';

    document.body.insertAdjacentHTML('beforeend', `
        <!-- ACCESSIBILITY WIDGET -->
        <button class="a11y-float" id="a11yToggle" aria-label="תפריט נגישות" title="נגישות">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm9 7h-6l-1.41 7.41L16 22h-2l-2-5-2 5H8l2.41-5.59L9 9H3V7h18v2z"/></svg>
        </button>

        <div class="a11y-panel" id="a11yPanel">
            <div class="a11y-panel-header">
                <h3>♿ תפריט נגישות</h3>
                <button class="a11y-close" id="a11yClose" aria-label="סגור תפריט נגישות">✕</button>
            </div>
            <div class="a11y-panel-body">
                <div class="a11y-section-title">התאמת תצוגה</div>
                <div class="a11y-grid">
                    <button class="a11y-btn" data-a11y="high-contrast"><span class="a11y-btn-icon">🌗</span>ניגודיות גבוהה</button>
                    <button class="a11y-btn" data-a11y="dark-contrast"><span class="a11y-btn-icon">⬛</span>ניגודיות כהה</button>
                    <button class="a11y-btn" data-a11y="light-contrast"><span class="a11y-btn-icon">⬜</span>ניגודיות בהירה</button>
                    <button class="a11y-btn" data-a11y="grayscale"><span class="a11y-btn-icon">🩶</span>גווני אפור</button>
                </div>
                <div class="a11y-section-title">גודל טקסט</div>
                <div class="a11y-slider-row">
                    <span class="a11y-slider-label">גודל גופן</span>
                    <input type="range" class="a11y-slider" id="a11yFontSize" min="80" max="200" value="100" step="10">
                    <span class="a11y-slider-value" id="a11yFontSizeVal">100%</span>
                </div>
                <div class="a11y-section-title">ריווח</div>
                <div class="a11y-slider-row">
                    <span class="a11y-slider-label">גובה שורה</span>
                    <input type="range" class="a11y-slider" id="a11yLineHeight" min="100" max="250" value="100" step="10">
                    <span class="a11y-slider-value" id="a11yLineHeightVal">100%</span>
                </div>
                <div class="a11y-slider-row">
                    <span class="a11y-slider-label">ריווח מילים</span>
                    <input type="range" class="a11y-slider" id="a11yWordSpacing" min="0" max="16" value="0" step="2">
                    <span class="a11y-slider-value" id="a11yWordSpacingVal">0px</span>
                </div>
                <div class="a11y-slider-row">
                    <span class="a11y-slider-label">ריווח אותיות</span>
                    <input type="range" class="a11y-slider" id="a11yLetterSpacing" min="0" max="10" value="0" step="1">
                    <span class="a11y-slider-value" id="a11yLetterSpacingVal">0px</span>
                </div>
                <div class="a11y-section-title">עזרי קריאה וניווט</div>
                <div class="a11y-grid">
                    <button class="a11y-btn" data-a11y="readable-font"><span class="a11y-btn-icon">🔤</span>גופן קריא</button>
                    <button class="a11y-btn" data-a11y="highlight-titles"><span class="a11y-btn-icon">🔠</span>הדגשת כותרות</button>
                    <button class="a11y-btn" data-a11y="highlight-links"><span class="a11y-btn-icon">🔗</span>הדגשת קישורים</button>
                    <button class="a11y-btn" data-a11y="reading-guide"><span class="a11y-btn-icon">📏</span>סרגל קריאה</button>
                    <button class="a11y-btn" data-a11y="big-cursor"><span class="a11y-btn-icon">🖱️</span>סמן מוגדל</button>
                    <button class="a11y-btn" data-a11y="stop-animations"><span class="a11y-btn-icon">⏸️</span>עצירת אנימציות</button>
                </div>
                <button class="a11y-reset" id="a11yReset">↻ איפוס כל ההגדרות</button>
            </div>
            <div class="a11y-footer">
                <a href="${accessibilityHref}">הצהרת נגישות מלאה</a>
            </div>
        </div>

        <div class="a11y-guide-bar" id="a11yGuideBar"></div>

        <!-- WHATSAPP FLOAT BUTTON -->
        <a href="https://wa.me/972546288340?text=%D7%94%D7%99%D7%99%2C%20%D7%90%D7%A9%D7%9E%D7%97%20%D7%9C%D7%A9%D7%9E%D7%95%D7%A2%20%D7%A2%D7%9C%20%D7%94%D7%A9%D7%99%D7%A8%D7%95%D7%AA%D7%99%D7%9D%20%D7%A9%D7%9C%D7%9B%D7%9D" target="_blank" class="whatsapp-float" aria-label="WhatsApp">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            <span class="whatsapp-tooltip">דברו איתנו בוואטסאפ</span>
        </a>
    `);

    // ===== JavaScript Logic =====
    const a11yToggle = document.getElementById('a11yToggle');
    const a11yPanel  = document.getElementById('a11yPanel');
    const a11yClose  = document.getElementById('a11yClose');
    const a11yReset  = document.getElementById('a11yReset');
    const a11yGuideBar = document.getElementById('a11yGuideBar');

    a11yToggle.addEventListener('click', () => a11yPanel.classList.toggle('open'));
    a11yClose.addEventListener('click',  () => a11yPanel.classList.remove('open'));

    const contrastModes = ['high-contrast', 'dark-contrast', 'light-contrast'];

    document.querySelectorAll('.a11y-btn[data-a11y]').forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.a11y;
            const cls  = 'a11y-' + mode;
            const isActive = document.body.classList.contains(cls);

            if (contrastModes.includes(mode)) {
                contrastModes.forEach(cm => {
                    document.body.classList.remove('a11y-' + cm);
                    const ob = document.querySelector(`.a11y-btn[data-a11y="${cm}"]`);
                    if (ob) ob.classList.remove('active');
                });
            }

            if (isActive) {
                document.body.classList.remove(cls);
                btn.classList.remove('active');
            } else {
                document.body.classList.add(cls);
                btn.classList.add('active');
            }
            saveA11yState();
        });
    });

    const fontSlider   = document.getElementById('a11yFontSize');
    const fontVal      = document.getElementById('a11yFontSizeVal');
    const lineSlider   = document.getElementById('a11yLineHeight');
    const lineVal      = document.getElementById('a11yLineHeightVal');
    const wordSlider   = document.getElementById('a11yWordSpacing');
    const wordVal      = document.getElementById('a11yWordSpacingVal');
    const letterSlider = document.getElementById('a11yLetterSpacing');
    const letterVal    = document.getElementById('a11yLetterSpacingVal');

    fontSlider.addEventListener('input', () => {
        document.body.style.zoom = fontSlider.value / 100;
        fontVal.textContent = fontSlider.value + '%';
        saveA11yState();
    });
    lineSlider.addEventListener('input', () => {
        document.body.style.lineHeight = lineSlider.value == 100 ? '' : (lineSlider.value / 100);
        lineVal.textContent = lineSlider.value + '%';
        saveA11yState();
    });
    wordSlider.addEventListener('input', () => {
        document.body.style.wordSpacing = wordSlider.value + 'px';
        wordVal.textContent = wordSlider.value + 'px';
        saveA11yState();
    });
    letterSlider.addEventListener('input', () => {
        document.body.style.letterSpacing = letterSlider.value + 'px';
        letterVal.textContent = letterSlider.value + 'px';
        saveA11yState();
    });

    document.addEventListener('mousemove', (ev) => {
        if (document.body.classList.contains('a11y-reading-guide')) {
            a11yGuideBar.style.top = (ev.clientY - 6) + 'px';
        }
    });

    a11yReset.addEventListener('click', () => {
        document.body.className = document.body.className.replace(/a11y-[\w-]+/g, '').trim();
        document.body.style.zoom = '';
        document.body.style.lineHeight = '';
        document.body.style.wordSpacing = '';
        document.body.style.letterSpacing = '';
        fontSlider.value = 100;   fontVal.textContent = '100%';
        lineSlider.value = 100;   lineVal.textContent = '100%';
        wordSlider.value = 0;     wordVal.textContent = '0px';
        letterSlider.value = 0;   letterVal.textContent = '0px';
        document.querySelectorAll('.a11y-btn').forEach(b => b.classList.remove('active'));
        localStorage.removeItem('a11yState');
    });

    function saveA11yState() {
        localStorage.setItem('a11yState', JSON.stringify({
            classes:       [...document.body.classList].filter(c => c.startsWith('a11y-')),
            fontSize:      fontSlider.value,
            lineHeight:    lineSlider.value,
            wordSpacing:   wordSlider.value,
            letterSpacing: letterSlider.value
        }));
    }

    function loadA11yState() {
        const saved = localStorage.getItem('a11yState');
        if (!saved) return;
        try {
            const s = JSON.parse(saved);
            s.classes.forEach(cls => {
                document.body.classList.add(cls);
                const btn = document.querySelector(`.a11y-btn[data-a11y="${cls.replace('a11y-', '')}"]`);
                if (btn) btn.classList.add('active');
            });
            if (s.fontSize && s.fontSize != 100)     { fontSlider.value = s.fontSize;   fontVal.textContent = s.fontSize + '%';   document.body.style.zoom = s.fontSize / 100; }
            if (s.lineHeight && s.lineHeight != 100)  { lineSlider.value = s.lineHeight;  lineVal.textContent = s.lineHeight + '%'; document.body.style.lineHeight = s.lineHeight / 100; }
            if (s.wordSpacing && s.wordSpacing != 0)  { wordSlider.value = s.wordSpacing; wordVal.textContent = s.wordSpacing + 'px'; document.body.style.wordSpacing = s.wordSpacing + 'px'; }
            if (s.letterSpacing && s.letterSpacing != 0) { letterSlider.value = s.letterSpacing; letterVal.textContent = s.letterSpacing + 'px'; document.body.style.letterSpacing = s.letterSpacing + 'px'; }
        } catch(e) {}
    }

    loadA11yState();

})();

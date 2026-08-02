// ============================================================
// RPG Digital — DataLayer Events
// ============================================================
window.dataLayer = window.dataLayer || [];

document.addEventListener('DOMContentLoaded', function () {

    // ─────────────────────────────────────────────────────────
    // 1. CTA CLICK TRACKING
    // ─────────────────────────────────────────────────────────
    var ctaSelectors = [
        '.cta-button',
        '.cta-button-outline',
        '.offer-cta',
        '.btn-chart',
        '.ugc-btn',
        '.btn-cta-nav',
        '.btn-primary',
        '.cta-btn',
        '.submit-btn'
    ].join(', ');

    document.querySelectorAll(ctaSelectors).forEach(function (btn) {
        btn.addEventListener('click', function () {
            dataLayer.push({
                event: 'cta_click',
                cta_text: btn.innerText.trim().substring(0, 100),
                cta_location: getSection(btn),
                cta_href: btn.getAttribute('href') || '',
                page_path: window.location.pathname
            });
        });
    });

    // ─────────────────────────────────────────────────────────
    // 2. FORM START TRACKING (first interaction with any field)
    // ─────────────────────────────────────────────────────────
    var formStarted = {};

    document.querySelectorAll('input, textarea, select').forEach(function (field) {
        field.addEventListener('focus', function () {
            var form = field.closest('form');
            if (!form) return;
            var formId = form.id || 'unknown_form';
            if (!formStarted[formId]) {
                formStarted[formId] = true;
                dataLayer.push({
                    event: 'form_start',
                    form_id: formId,
                    page_path: window.location.pathname
                });
            }
        });
    });

    // ─────────────────────────────────────────────────────────
    // 3. FAQ EXPAND TRACKING
    // ─────────────────────────────────────────────────────────
    document.querySelectorAll('.faq-question').forEach(function (question) {
        question.addEventListener('click', function () {
            var questionText = question.querySelector('span:first-child');
            dataLayer.push({
                event: 'faq_expand',
                faq_question: questionText ? questionText.innerText.trim() : question.innerText.trim().substring(0, 100),
                page_path: window.location.pathname
            });
        });
    });

    // ─────────────────────────────────────────────────────────
    // 4. COOKIE CONSENT TRACKING
    // ─────────────────────────────────────────────────────────
    var cookieAcceptAll  = document.getElementById('cookie-accept-all');
    var cookieRejectAll  = document.getElementById('cookie-reject-all');
    var cookieModalAccept = document.getElementById('cookie-modal-accept');
    var cookieModalReject = document.getElementById('cookie-modal-reject');
    var cookieModalSave   = document.getElementById('cookie-modal-save');

    function pushCookieConsent(action) {
        dataLayer.push({
            event: 'cookie_consent',
            consent_action: action,
            page_path: window.location.pathname
        });
    }

    if (cookieAcceptAll)   cookieAcceptAll.addEventListener('click',   function () { pushCookieConsent('accept_all'); });
    if (cookieRejectAll)   cookieRejectAll.addEventListener('click',   function () { pushCookieConsent('reject_all'); });
    if (cookieModalAccept) cookieModalAccept.addEventListener('click', function () { pushCookieConsent('accept_all'); });
    if (cookieModalReject) cookieModalReject.addEventListener('click', function () { pushCookieConsent('reject_all'); });
    if (cookieModalSave)   cookieModalSave.addEventListener('click',   function () { pushCookieConsent('save_preferences'); });

    // ─────────────────────────────────────────────────────────
    // 5. SECTION VIEW TRACKING (Intersection Observer)
    // ─────────────────────────────────────────────────────────
    var viewedSections = {};

    var sectionObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            var key = entry.target.id || entry.target.className.split(' ')[0];
            if (viewedSections[key]) return;
            viewedSections[key] = true;
            dataLayer.push({
                event: 'section_view',
                section_name: key,
                page_path: window.location.pathname
            });
        });
    }, { threshold: 0.3 });

    // Sections by ID
    ['hero', 'results', 'testimonials', 'solution', 'faq', 'lead-form'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) sectionObserver.observe(el);
    });

    // Sections by class
    ['.offer-section', '.urgency-section', '.ugc-section', '.chart-section', '.who-section', '.pas-section'].forEach(function (selector) {
        var el = document.querySelector(selector);
        if (el) sectionObserver.observe(el);
    });

    // ─────────────────────────────────────────────────────────
    // 6. SCROLL DEPTH TRACKING
    // ─────────────────────────────────────────────────────────
    var scrollDepths = [25, 50, 75, 90];
    var firedDepths  = {};

    window.addEventListener('scroll', function () {
        var scrolled = (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight * 100;
        scrollDepths.forEach(function (depth) {
            if (!firedDepths[depth] && scrolled >= depth) {
                firedDepths[depth] = true;
                dataLayer.push({
                    event: 'scroll_depth',
                    depth_percentage: depth,
                    page_path: window.location.pathname
                });
            }
        });
    }, { passive: true });

    // ─────────────────────────────────────────────────────────
    // 7. SOCIAL LINKS CLICK TRACKING
    // ─────────────────────────────────────────────────────────
    document.querySelectorAll('.footer-socials a').forEach(function (link) {
        link.addEventListener('click', function () {
            dataLayer.push({
                event: 'social_click',
                social_network: link.getAttribute('aria-label') || 'unknown',
                page_path: window.location.pathname
            });
        });
    });

});

// ─────────────────────────────────────────────────────────
// HELPER: Get parent section name for a given element
// ─────────────────────────────────────────────────────────
function getSection(el) {
    var withId = el.closest('[id]');
    if (withId && withId.id) return withId.id;

    var classMap = [
        '.hero', '.offer-section', '.lead-section', '.faq-section',
        '.ugc-section', '.chart-section', '.testimonials-section',
        '.solution-section', '.pas-section', '.who-section', '.footer'
    ];
    for (var i = 0; i < classMap.length; i++) {
        if (el.closest(classMap[i])) return classMap[i].replace('.', '');
    }
    return 'unknown';
}

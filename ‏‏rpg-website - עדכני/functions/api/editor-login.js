/**
 * POST /api/editor-login
 * מקבל סיסמה, ומחזיר טוקן חתום שתקף ל-8 שעות.
 * הסיסמה עצמה אף פעם לא נשמרת בדפדפן — רק הטוקן.
 *
 * משתני סביבה נדרשים (Cloudflare Pages → Settings → Environment variables):
 *   EDITOR_PASSWORD  הסיסמה לכניסה לעורך
 *   EDITOR_SECRET    מחרוזת אקראית ארוכה לחתימת הטוקנים
 */

const TOKEN_TTL_SECONDS = 8 * 60 * 60;

async function sign(secret, payload) {
    const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
    return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** השוואה בזמן קבוע — לא מדליפה כמה תווים התאימו */
function safeEqual(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
}

const json = (obj, status = 200) =>
    new Response(JSON.stringify(obj), {
        status,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
    });

export async function onRequestPost({ request, env }) {
    if (!env.EDITOR_PASSWORD || !env.EDITOR_SECRET) {
        return json({ error: 'העורך לא הוגדר בשרת (חסרים משתני סביבה)' }, 500);
    }

    let body;
    try {
        body = await request.json();
    } catch (e) {
        return json({ error: 'בקשה לא תקינה' }, 400);
    }

    if (!safeEqual(String(body.password || ''), env.EDITOR_PASSWORD)) {
        // השהייה קצרה כדי להאט ניסיונות ניחוש
        await new Promise((r) => setTimeout(r, 1000));
        return json({ error: 'סיסמה שגויה' }, 401);
    }

    const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
    const sig = await sign(env.EDITOR_SECRET, 'v1.' + exp);
    return json({ token: exp + '.' + sig, expiresAt: exp });
}

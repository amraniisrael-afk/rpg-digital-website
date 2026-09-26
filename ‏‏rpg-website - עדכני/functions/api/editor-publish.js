/**
 * POST /api/editor-publish
 * מקבל מפת שינויים { "hero.h1": "טקסט חדש", ... }, כותב אותם לקובץ ה-HTML
 * בריפו ב-GitHub, ומחזיר את מזהה הקומיט. Cloudflare Pages בונה מחדש אוטומטית.
 *
 * משתני סביבה נדרשים:
 *   EDITOR_SECRET   אותה מחרוזת שבה משתמש editor-login לחתימה
 *   GITHUB_TOKEN    Fine-grained PAT עם הרשאת Contents: Read and write על הריפו בלבד
 *   GITHUB_REPO     בפורמט owner/repo
 *   GITHUB_BRANCH   ברירת מחדל: main
 *   EDITOR_PAGES    רשימת קבצים מותרים לעריכה, מופרדים בפסיק. ברירת מחדל: index.html
 */

const MAX_BODY_BYTES = 256 * 1024;
const MAX_CHANGES = 400;
const MAX_VALUE_LENGTH = 5000;

const json = (obj, status = 200) =>
    new Response(JSON.stringify(obj), {
        status,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
    });

/* ---------------------------------- אימות --------------------------------- */

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

function safeEqual(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
}

async function verifyToken(request, secret) {
    const auth = request.headers.get('Authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    const [expStr, sig] = token.split('.');
    const exp = parseInt(expStr, 10);
    if (!exp || !sig) return false;
    if (exp < Math.floor(Date.now() / 1000)) return false;
    return safeEqual(sig, await sign(secret, 'v1.' + exp));
}

/* -------------------------------- base64 --------------------------------- */

function base64ToBytes(b64) {
    const bin = atob(b64.replace(/\s/g, ''));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
}

function bytesToBase64(bytes) {
    let bin = '';
    const CHUNK = 0x8000;
    for (let i = 0; i < bytes.length; i += CHUNK) {
        bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
    }
    return btoa(bin);
}

/* --------------------------------- GitHub -------------------------------- */

function ghHeaders(env) {
    return {
        Authorization: 'Bearer ' + env.GITHUB_TOKEN,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'rpg-digital-site-editor',
        'Content-Type': 'application/json'
    };
}

/* -------------------------------- rewriting ------------------------------- */

const escapeHtml = (s) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

class ContentSetter {
    constructor(changes) {
        this.changes = changes;
        this.applied = new Set();
    }
    element(el) {
        const key = el.getAttribute('data-edit');
        if (!key || !Object.prototype.hasOwnProperty.call(this.changes, key)) return;
        const value = this.changes[key];
        if (el.hasAttribute('data-edit-multiline')) {
            el.setInnerContent(escapeHtml(value).replace(/\r?\n/g, '<br>'), { html: true });
        } else {
            el.setInnerContent(value, { html: false });
        }
        this.applied.add(key);
    }
}

/**
 * מחיל את השינויים על ה-HTML ומריץ את בדיקות הבטיחות.
 * פונקציה טהורה — אין לה תלות ב-GitHub, כדי שאפשר יהיה לבדוק אותה מקומית.
 * מחזירה { rewritten, missing, problems }.
 */
export async function applyChanges(original, changes) {
    const keys = Object.keys(changes);
    const setter = new ContentSetter(changes);
    const rewritten = await new HTMLRewriter()
        .on('[data-edit]', setter)
        .transform(new Response(original))
        .text();

    const missing = keys.filter((k) => !setter.applied.has(k));

    const countMarkers = (s) => (s.match(/data-edit="/g) || []).length;
    const before = countMarkers(original);
    const after = countMarkers(rewritten);
    const problems = [];
    if (after !== before) problems.push('מספר הטקסטים המסומנים השתנה (' + before + '→' + after + ')');
    if (!/^\s*<!doctype html/i.test(rewritten)) problems.push('הקובץ לא מתחיל ב-DOCTYPE');
    if (rewritten.indexOf('</html>') === -1) problems.push('חסר תג סגירה של html');
    if (Math.abs(rewritten.length - original.length) > original.length * 0.25) {
        problems.push('גודל הקובץ השתנה בצורה חריגה');
    }

    return { rewritten, missing, problems };
}

/* ---------------------------------- route --------------------------------- */

export async function onRequestPost({ request, env }) {
    for (const name of ['EDITOR_SECRET', 'GITHUB_TOKEN', 'GITHUB_REPO']) {
        if (!env[name]) return json({ error: 'העורך לא הוגדר בשרת (חסר ' + name + ')' }, 500);
    }
    if (!(await verifyToken(request, env.EDITOR_SECRET))) {
        return json({ error: 'ההתחברות פגה' }, 401);
    }

    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return json({ error: 'הבקשה גדולה מדי' }, 413);

    let body;
    try {
        body = JSON.parse(raw);
    } catch (e) {
        return json({ error: 'בקשה לא תקינה' }, 400);
    }

    const changes = body && body.changes;
    if (!changes || typeof changes !== 'object' || Array.isArray(changes)) {
        return json({ error: 'לא התקבלו שינויים' }, 400);
    }

    const keys = Object.keys(changes);
    if (!keys.length) return json({ error: 'לא התקבלו שינויים' }, 400);
    if (keys.length > MAX_CHANGES) return json({ error: 'יותר מדי שינויים בבת אחת' }, 400);

    for (const k of keys) {
        if (!/^[a-z0-9.\-]+$/i.test(k)) return json({ error: 'מזהה טקסט לא תקין: ' + k }, 400);
        const v = changes[k];
        if (typeof v !== 'string') return json({ error: 'ערך לא תקין עבור ' + k }, 400);
        if (v.length > MAX_VALUE_LENGTH) return json({ error: 'הטקסט ארוך מדי: ' + k }, 400);
        // שורות חדשות וטאב מותרים; שאר תווי הבקרה נחסמים
        if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(v)) {
            return json({ error: 'הטקסט מכיל תווים לא חוקיים: ' + k }, 400);
        }
    }

    const allowed = (env.EDITOR_PAGES || 'index.html').split(',').map((s) => s.trim());
    const page = String((body.page || 'index.html')).replace(/^\/+/, '');
    if (allowed.indexOf(page) === -1) return json({ error: 'עריכה של ' + page + ' לא מאושרת' }, 400);

    const repo = env.GITHUB_REPO;
    const branch = env.GITHUB_BRANCH || 'main';
    const api = 'https://api.github.com/repos/' + repo + '/contents/' + encodeURIComponent(page);

    /* 1. משיכת הקובץ הנוכחי מהריפו */
    const getRes = await fetch(api + '?ref=' + encodeURIComponent(branch), {
        headers: ghHeaders(env)
    });
    if (!getRes.ok) {
        return json({ error: 'לא ניתן לקרוא את הקובץ מ-GitHub (' + getRes.status + ')' }, 502);
    }
    const file = await getRes.json();
    if (!file.content) return json({ error: 'הקובץ גדול מדי לקריאה דרך ה-API' }, 502);

    const bytes = base64ToBytes(file.content);
    const hadBom = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
    const original = new TextDecoder('utf-8').decode(bytes); // ה-BOM מוסר כאן אוטומטית

    /* 2. החלת השינויים והרצת בדיקות הבטיחות */
    const { rewritten, missing, problems } = await applyChanges(original, changes);

    if (missing.length) {
        return json(
            {
                error:
                    'הטקסטים הבאים כבר לא קיימים בקובץ — רעננו את העמוד ונסו שוב: ' +
                    missing.slice(0, 5).join(', ')
            },
            409
        );
    }

    /* 3. אם משהו נראה חשוד — לא מבצעים קומיט בכלל */
    if (problems.length) {
        return json({ error: 'הפרסום בוטל מטעמי בטיחות: ' + problems.join('; ') }, 500);
    }

    /* 4. קומיט חזרה ל-GitHub */
    const encoded = new TextEncoder().encode(rewritten);
    const outBytes = hadBom ? new Uint8Array([0xef, 0xbb, 0xbf, ...encoded]) : encoded;

    const summary =
        keys.length === 1 ? 'עדכון טקסט אחד באתר' : 'עדכון ' + keys.length + ' טקסטים באתר';
    const message =
        summary +
        ' (' +
        page +
        ')\n\n' +
        keys.map((k) => '- ' + k).join('\n') +
        '\n\nנערך דרך העורך המובנה באתר.';

    const putRes = await fetch(api, {
        method: 'PUT',
        headers: ghHeaders(env),
        body: JSON.stringify({
            message: message,
            content: bytesToBase64(outBytes),
            sha: file.sha,
            branch: branch
        })
    });

    if (putRes.status === 409) {
        return json({ error: 'הקובץ השתנה בינתיים — רעננו את העמוד ונסו שוב' }, 409);
    }
    if (!putRes.ok) {
        const detail = await putRes.text();
        return json({ error: 'הכתיבה ל-GitHub נכשלה (' + putRes.status + '): ' + detail.slice(0, 200) }, 502);
    }

    const result = await putRes.json();
    return json({
        ok: true,
        commit: (result.commit && result.commit.sha ? result.commit.sha : '').slice(0, 7),
        changed: keys.length
    });
}

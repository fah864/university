// ============================================================================
// 🎓 UNI Helper API — النسخة المعمارية المحصّنة (Elite Omni-AI Edition v2.5)
// ============================================================================
// المتغيرات المطلوبة (Cloudflare → Worker → Settings → Variables & Secrets):
//   TG_TOKEN        (Secret)  توكن البوت (مثلاً من BotFather)
//   GEMINI_KEY      (Secret)  مفتاح Google AI Studio (Gemini API Key)
//   WEBHOOK_SECRET  (Secret)  حروف/أرقام/_/- فقط، طول 16 إلى 64 (إجباري لأمان الويبهوك)
//   ADMIN_SECRET    (Secret)  سر طويل عشوائي لأوامر الأدمن (/debug, /setup-webhook, إلخ)
//   ALLOWED_CHAT_IDS          (اختياري) أرقام شات تلقرام المسموحة مفصولة بفاصلة
//   ALLOWED_ORIGINS           (اختياري) الافتراضي: https://fah864.github.io
// KV Binding:
//   UNI_KV                    مساحة تخزين Cloudflare KV
// Cron Trigger:
//   * * * * *                 كل دقيقة (للبومودورو وتنبيهات المحاضرات والملخصات الذكية)
// ============================================================================

const DEFAULT_ORIGIN = 'https://fah864.github.io';
const MAX_BODY = 8 * 1024 * 1024; // 8 MB
const TOKEN_RE = /^[0-9a-f]{48}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const SAFE_ID_RE = /^[A-Za-z0-9_-]{0,64}$/;
const SAFE_COLOR_RE = /^[#A-Za-z0-9(),.%\s-]{0,64}$/;
const MAX_ITEMS = 5000;

// ============================================================================
// 🛡️ نظام الحماية والـ Rate Limiter في الذاكرة (Zero KV Write Quota Waste)
// ============================================================================
const memRateMap = new Map();
let memLastCleanup = 0;

function checkMemRate(key, limit, windowMs) {
  const now = Date.now();
  if (now - memLastCleanup > 3 * 60 * 1000) {
    for (const [k, v] of memRateMap.entries()) {
      if (now - v.start > v.win * 2) memRateMap.delete(k);
    }
    memLastCleanup = now;
  }
  const entry = memRateMap.get(key);
  if (!entry || now - entry.start > windowMs) {
    memRateMap.set(key, { start: now, count: 1, win: windowMs });
    return { ok: true, remaining: limit - 1 };
  }
  entry.count++;
  if (entry.count > limit) return { ok: false, remaining: 0 };
  return { ok: true, remaining: limit - entry.count };
}

// ============================================================================
// 🚀 نقطة الدخول الرئيسية (Fetch + Scheduled Handler)
// ============================================================================
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || DEFAULT_ORIGIN)
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const isLocalOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
    const originValid = !!origin && (allowed.includes('*') || allowed.includes(origin) || isLocalOrigin);
    const isAdminOrRoot =
      url.pathname === '/webhook' ||
      url.pathname === '/' ||
      url.pathname === '/debug' ||
      url.pathname === '/clear-notif' ||
      url.pathname === '/restore-backup' ||
      url.pathname === '/setup-webhook' ||
      url.pathname.startsWith('/check');
    const isBeaconCompat =
      (url.pathname === '/pomo-cancel' || url.pathname === '/unlink') &&
      (!origin || origin === 'null' || originValid);
    const originOk = originValid || (isAdminOrRoot && (!origin || originValid)) || isBeaconCompat;

    const corsOrigin = allowed.includes('*')
      ? '*'
      : (origin && originValid ? origin : allowed[0] || DEFAULT_ORIGIN);

    const baseHeaders = {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Vary': 'Origin',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Cache-Control': 'no-store, no-cache, must-revalidate'
    };

    const json = (obj, status = 200) =>
      new Response(JSON.stringify(obj), {
        status,
        headers: { ...baseHeaders, 'Content-Type': 'application/json; charset=utf-8' }
      });

    const jsonRaw = (str, status = 200) =>
      new Response(str, {
        status,
        headers: { ...baseHeaders, 'Content-Type': 'application/json; charset=utf-8' }
      });

    const plain = (t, status = 200) =>
      new Response(t, {
        status,
        headers: { ...baseHeaders, 'Content-Type': 'text/plain; charset=utf-8' }
      });

    const fail = (e) => {
      console.error('[Worker Error]', e);
      if (e && e.code === 'bad_data') {
        return json({ ok: false, error: e.message, detail: e.detail }, 422);
      }
      if (e && e.message === 'invalid_json') {
        return json({ ok: false, error: 'invalid_json' }, 400);
      }
      const big = e && e.message === 'too_large';
      return json({ ok: false, error: big ? 'too_large' : 'server_error' }, big ? 413 : 500);
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: baseHeaders });
    }
    if (!originOk && url.pathname !== '/webhook') {
      return json({ ok: false, error: 'forbidden_origin' }, 403);
    }

    const TOKEN = env.TG_TOKEN;
    const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';

    // ============ 🔐 أدوات قراءة الطلبات والمصادقة ============
    async function readJson() {
      const cl = parseInt(request.headers.get('Content-Length') || '0', 10);
      if (cl > MAX_BODY) throw new Error('too_large');
      const raw = await request.text();
      if (raw.length > MAX_BODY) throw new Error('too_large');
      if (!raw) return {};
      try {
        return JSON.parse(raw);
      } catch (e) {
        throw new Error('invalid_json');
      }
    }

    function bearer() {
      const a = request.headers.get('Authorization') || '';
      return a.startsWith('Bearer ') ? a.slice(7).trim() : '';
    }

    async function resolveAuth(body) {
      const token = ((body && body.token ? String(body.token) : '') || bearer()).trim();
      if (!TOKEN_RE.test(token)) return null;
      const chatId = await env.UNI_KV.get('session_' + token);
      if (!chatId || !chatAllowed(env, chatId)) return null;
      return { chatId: String(chatId), token };
    }

    function isAdmin() {
      const secret = env.ADMIN_SECRET || '';
      if (!secret) return false;
      const provided = url.searchParams.get('secret') || bearer();
      return !!provided && safeEqual(provided, secret);
    }

    const adminDenied = () => json({ ok: false, error: 'unauthorized_admin' }, 401);
    const unauthorized = () => json({ ok: false, error: 'unauthorized' }, 401);

    // ============ 1) Telegram Webhook (/webhook) ============
    if (url.pathname === '/webhook' && request.method === 'POST') {
      const secret = env.WEBHOOK_SECRET || '';
      const got = request.headers.get('X-Telegram-Bot-Api-Secret-Token') || '';
      if (!secret || !safeEqual(got, secret)) return plain('forbidden', 403);

      const cl = parseInt(request.headers.get('Content-Length') || '0', 10);
      if (cl > 100_000) return plain('payload_too_large', 413);

      try {
        const update = await readJson();
        if (update.callback_query) {
          await handleCallback(env, TOKEN, update.callback_query);
          return plain('OK');
        }

        const msg = update.message;
        if (!msg || !msg.text || !msg.chat || msg.chat.type !== 'private') {
          return plain('OK');
        }

        const chatId = String(msg.chat.id);
        if (!chatAllowed(env, chatId)) return plain('OK');

        const firstName = md((msg.from && msg.from.first_name) || 'صديقي');
        const text = msg.text.trim();

        let code = null;
        let m;
        if ((m = text.match(/^\/start(?:@\w+)?\s+([A-Za-z0-9]{4,12})$/))) {
          code = m[1].toUpperCase();
        } else if ((m = text.match(/^\/link(?:@\w+)?\s+([A-Za-z0-9]{4,12})$/))) {
          code = m[1].toUpperCase();
        } else if (/^[A-HJ-NP-Z2-9]{6}$/i.test(text)) {
          code = text.toUpperCase();
        }

        if (code) {
          const sessionToken = generateSessionToken();
          await env.UNI_KV.put('session_' + sessionToken, chatId, {
            expirationTtl: 60 * 60 * 24 * 365
          });
          await env.UNI_KV.put(
            'link_' + code,
            JSON.stringify({ chatId, token: sessionToken }),
            { expirationTtl: 900 }
          );
          await registerUser(env, chatId);
        }

        const replyText = code
          ? `🎓 *أهلاً ${firstName}!*\n\n✅ *تم ربط حسابك بنجاح*\n\nارجع للموقع الآن، وبتوصلك التنبيهات الذكية قبل كل محاضرة ومهمة واختبار 🔔`
          : `🎓 *أهلاً ${firstName} في مُساعد الجامعة!*\n\n📱 لربط حسابك بالموقع:\nادخل الموقع ← *الإعدادات* ← *ربط تلقرام*\n\nبيطلع لك كود سداسي، أرسله هنا مباشرة أو اضغط زر الفتح التلقائي 👌`;

        await tgSend(TOKEN, chatId, { text: replyText });
        return plain('OK');
      } catch (e) {
        console.error('webhook error:', e);
        return plain('OK');
      }
    }

    // ============ 2) فحص رمز الربط (/poll) ============
    if (url.pathname === '/poll') {
      const prl = checkMemRate('poll_' + clientIp, 120, 60_000);
      if (!prl.ok) return json({ chatId: null, rateLimited: true }, 429);

      const code = (url.searchParams.get('code') || '').toUpperCase();
      if (!/^[A-Z0-9]{4,12}$/.test(code)) return json({ chatId: null });

      const raw = await env.UNI_KV.get('link_' + code);
      if (!raw) return json({ chatId: null });

      try {
        const p = JSON.parse(raw);
        if (p && p.chatId && p.token) {
          await env.UNI_KV.delete('link_' + code);
          return json({ chatId: p.chatId, token: p.token });
        }
      } catch (e) {}
      return json({ chatId: null });
    }

    // ============ 3) فك الربط (/unlink) ============
    if (request.method === 'POST' && url.pathname === '/unlink') {
      try {
        const body = await readJson();
        const token = String(body.token || bearer() || '').trim();
        if (TOKEN_RE.test(token)) {
          const chatId = await env.UNI_KV.get('session_' + token);
          await env.UNI_KV.delete('session_' + token);
          if (chatId) {
            await env.UNI_KV.delete('pomo_' + chatId);
          }
        }
        return json({ ok: true });
      } catch (e) {
        return fail(e);
      }
    }

    // ============ 4) حفظ ومزامنة البيانات (/save) ============
    if (request.method === 'POST' && url.pathname === '/save') {
      try {
        const data = await readJson();
        const auth = await resolveAuth(data);
        if (!auth) return unauthorized();
        const chatId = auth.chatId;

        const srl = checkMemRate('save_' + chatId, 90, 60_000);
        if (!srl.ok) return json({ ok: false, error: 'rate_limited' }, 429);

        const existingRaw = await env.UNI_KV.get('user_' + chatId);
        let existing = {};
        try {
          existing = existingRaw ? JSON.parse(existingRaw) : {};
        } catch (e) {
          existing = {};
        }

        const incoming = sanitizeUserData(data, data.force === true ? {} : existing);
        validateUserData(incoming);

        if (data.force !== true && hasData(existing) && !hasData(incoming)) {
          return json({ ok: false, error: 'empty_overwrite_blocked' }, 409);
        }

        const today = riyadhToday();
        if (existingRaw && hasData(existing) && existing.lastBackupDate !== today) {
          const bk = 'backup_' + chatId + '_' + today;
          await env.UNI_KV.put(bk, existingRaw, { expirationTtl: 14 * 86400 });
          incoming.lastBackupDate = today;
        } else if (existing.lastBackupDate) {
          incoming.lastBackupDate = existing.lastBackupDate;
        }

        const lastSync = new Date().toISOString();
        await env.UNI_KV.put(
          'user_' + chatId,
          JSON.stringify({ ...incoming, lastSync })
        );

        const activeAtt = (incoming.attendance || []).filter(a => a && !a.deleted);
        const prevActiveAtt = (existing.attendance || []).filter(a => a && !a.deleted);
        if (JSON.stringify(activeAtt) !== JSON.stringify(prevActiveAtt)) {
          await env.UNI_KV.put('attendance_' + chatId, JSON.stringify(activeAtt));
        }

        await registerUser(env, chatId);
        return json({ ok: true, lastSync });
      } catch (e) {
        return fail(e);
      }
    }

    // ============ 5) تحميل البيانات (/load) ============
    if (url.pathname === '/load') {
      const auth = await resolveAuth();
      if (!auth) return unauthorized();
      const raw = await env.UNI_KV.get('user_' + auth.chatId);
      return jsonRaw(raw || '{}');
    }

    // ============ 6) جلب سجل الحضور المستقل (/get-attendance) ============
    if (url.pathname === '/get-attendance') {
      const auth = await resolveAuth();
      if (!auth) return unauthorized();
      const raw = await env.UNI_KV.get('attendance_' + auth.chatId);
      if (raw) return jsonRaw(raw);
      const u = await getUser(env, auth.chatId);
      return json(Array.isArray(u.attendance) ? u.attendance : []);
    }

    // ============ 7) مؤقّت البومودورو السحابي ============
    if (request.method === 'POST' && url.pathname === '/pomo-start') {
      try {
        const body = await readJson();
        const auth = await resolveAuth(body);
        if (!auth) return unauthorized();
        const mode = cleanMode(body.mode);
        const total = clamp(parseInt(body.total, 10) || 1500, 1, 14400);
        const now = Date.now();
        let endTimestamp = parseInt(body.endTimestamp, 10);
        if (!endTimestamp || endTimestamp <= now || endTimestamp > now + 14400 * 1000 + 60000) {
          endTimestamp = now + total * 1000;
        }
        await env.UNI_KV.put(
          'pomo_' + auth.chatId,
          JSON.stringify({ mode, total, endTimestamp, startedAt: now }),
          { expirationTtl: 86400 }
        );
        return json({ ok: true, endTimestamp });
      } catch (e) {
        return fail(e);
      }
    }

    if (request.method === 'POST' && url.pathname === '/pomo-cancel') {
      try {
        const body = await readJson();
        const auth = await resolveAuth(body);
        if (!auth) return unauthorized();
        await env.UNI_KV.delete('pomo_' + auth.chatId);
        return json({ ok: true });
      } catch (e) {
        return fail(e);
      }
    }

    if (url.pathname === '/pomo-status') {
      const auth = await resolveAuth();
      if (!auth) return json({ active: false });
      const raw = await env.UNI_KV.get('pomo_' + auth.chatId);
      if (!raw) return json({ active: false });
      try {
        const parsed = JSON.parse(raw);
        return json({ active: true, ...parsed });
      } catch (e) {
        return json({ active: false });
      }
    }

    if (request.method === 'POST' && url.pathname === '/pomo-done') {
      try {
        const body = await readJson();
        const auth = await resolveAuth(body);
        if (!auth) return unauthorized();

        const rl = checkMemRate('pomodone_' + auth.chatId, 30, 3600_000);
        if (!rl.ok) return json({ ok: false, error: 'rate_limited' }, 429);

        const existingPomo = await env.UNI_KV.get('pomo_' + auth.chatId);
        const dedupKey = 'pomodone_dedup_' + auth.chatId;
        const recentSent = checkMemRate(dedupKey, 1, 15_000);
        await env.UNI_KV.delete('pomo_' + auth.chatId);

        if (recentSent.ok || existingPomo) {
          const mode = cleanMode(body.mode);
          const minutes = clamp(parseInt(body.minutes, 10) || 25, 1, 600);
          await sendTG(TOKEN, auth.chatId, [pomoText(mode, minutes)]);
        }
        return json({ ok: true });
      } catch (e) {
        return fail(e);
      }
    }

    // ============ 8) 🤖 المحرك الذكي الشامل (Omni-Agent AI) (/ai-parse) ============
    // 💡 توصية أمنية: يُنصح أيضاً بإضافة قاعدة Rate Limiting في لوحة تحكم Cloudflare
    // (Security → WAF → Rate limiting rules) على المسار /ai-parse (مثلاً 20 طلب / دقيقة لكل IP) كطبقة حماية إضافية على مستوى الشبكة.
    if (request.method === 'POST' && url.pathname === '/ai-parse') {
      try {
        const body = await readJson();
        const auth = await resolveAuth(body);
        if (!auth) {
          return json({ ok: false, error: 'يجب ربط حسابك بتلقرام من الإعدادات أولاً لاستخدام المساعد الذكي' }, 401);
        }
        const rateIdentity = 'user_' + auth.chatId;

        const rlMin = checkMemRate('ai_min_' + rateIdentity, 15, 60_000);
        if (!rlMin.ok) {
          return json({ ok: false, error: 'طلبات كثيرة في الدقيقة، انتظر ثواني وحاول مجدداً' }, 429);
        }

        const rlDay = await checkRateLimit(env, 'ai_day_' + rateIdentity, 200, 86400);
        if (!rlDay.ok) {
          return json({ ok: false, error: 'وصلت للحد اليومي للذكاء الاصطناعي، حاول غداً' }, 429);
        }

        const text = String(body.text || '').trim().slice(0, 4000);
        let image = null;
        if (body.image && typeof body.image.data === 'string') {
          if (body.image.data.length > 7_000_000) {
            return json({ ok: false, error: 'حجم الصورة كبير جداً (الحد 5MB)' }, 413);
          }
          const mt = String(body.image.mimeType || 'image/jpeg').toLowerCase();
          if (!/^image\/(jpeg|jpg|png|webp|heic|heif)$/.test(mt)) {
            return json({ ok: false, error: 'صيغة الصورة غير مدعومة' }, 400);
          }
          image = { data: body.image.data, mimeType: mt === 'image/jpg' ? 'image/jpeg' : mt };
        }

        if (!text && !image) {
          return json({ ok: false, error: 'أدخل نصاً أو ارفع صورة للتحليل' }, 400);
        }

        const courses = Array.isArray(body.courses)
          ? body.courses.slice(0, 50).map(c => ({
              id: String((c && c.id) || '').slice(0, 64),
              name: String((c && c.name) || '').slice(0, 100),
              code: String((c && c.code) || '').slice(0, 30)
            }))
          : [];

        const goals = Array.isArray(body.goals)
          ? body.goals.slice(0, 30).map(g => ({
              id: String((g && g.id) || '').slice(0, 64),
              name: String((g && g.name) || '').slice(0, 100)
            }))
          : [];

        const today = DATE_RE.test(String(body.today || '')) ? body.today : riyadhToday();
        const result = await callGemini(env.GEMINI_KEY, text, image, courses, goals, today);
        return json({ ok: true, ...result });
      } catch (e) {
        console.error('ai-parse error:', e);
        if (e && e.message === 'deadline') {
          return json({ ok: false, error: 'الخدمة مزدحمة حالياً — حاول بعد لحظات' }, 503);
        }
        return json({ ok: false, error: (e && e.userMessage) || 'تعذّر التحليل حالياً — حاول مرة ثانية' }, 500);
      }
    }

    // ============ 9) اختبار الإشعارات (/test) ============
    if (url.pathname === '/test' && request.method === 'POST') {
      try {
        const body = await readJson();
        const auth = await resolveAuth(body);
        if (!auth) return unauthorized();
        const rl = checkMemRate('test_' + auth.chatId, 5, 600_000);
        if (!rl.ok) return json({ ok: false, error: 'rate_limited' }, 429);
        const sentOk = await sendTG(TOKEN, auth.chatId, [
          '🧪 *اختبار الاتصال ناجح!*\n\nإشعارات مُساعد الجامعة شغالة معك 100% ✅'
        ]);
        return json({ ok: sentOk });
      } catch (e) {
        return fail(e);
      }
    }

    // ============ 10) فحوصات يدوية وأدوات الأدمن ============
    const checks = {
      '/check-morning': () => morningSummary(env, TOKEN),
      '/check-weekly': () => weeklySummary(env, TOKEN),
      '/check-weekly-plan': () => weeklyPlan(env, TOKEN),
      '/check-absence': () => absenceWarning(env, TOKEN),
      '/check': () => checkExamsAndTasks(env, TOKEN),
      '/check-classes': () => checkClasses(env, TOKEN),
      '/check-sleep': () => checkSleep(env, TOKEN),
      '/check-water': () => checkWater(env, TOKEN),
      '/check-pomo': () => checkPomoTimers(env, TOKEN)
    };
    if (checks[url.pathname]) {
      if (!isAdmin()) return adminDenied();
      try {
        return json(await checks[url.pathname]());
      } catch (e) {
        return fail(e);
      }
    }

    if (url.pathname === '/debug') {
      if (!isAdmin()) return adminDenied();
      const users = await getUsers(env);
      const today = riyadhToday();
      const result = [];
      for (const chatId of users) {
        const u = await getUser(env, chatId);
        const pomoRaw = await env.UNI_KV.get('pomo_' + chatId);
        result.push({
          chatId,
          courses: (u.courses || []).length,
          schedule: (u.schedule || []).length,
          tasks: (u.tasks || []).length,
          exams: (u.exams || []).length,
          attendance: (u.attendance || []).length,
          pomo: pomoRaw ? JSON.parse(pomoRaw) : null,
          lastSync: u.lastSync
        });
      }
      return jsonRaw(JSON.stringify({ today, users: result }, null, 2));
    }

    if (url.pathname === '/clear-notif') {
      if (!isAdmin()) return adminDenied();
      const chatId = url.searchParams.get('chatId');
      const type = url.searchParams.get('type') || 'all';
      let deleted = 0;
      let cursor = undefined;
      do {
        const list = await env.UNI_KV.list({ prefix: 'notif_', cursor });
        for (const key of list.keys) {
          if (chatId && !key.name.includes('_' + chatId + '_')) continue;
          if (type !== 'all' && !key.name.startsWith('notif_' + type + '_')) continue;
          await env.UNI_KV.delete(key.name);
          deleted++;
        }
        cursor = list.list_complete ? undefined : list.cursor;
      } while (cursor);
      return json({ ok: true, deleted });
    }

    if (url.pathname === '/restore-backup') {
      if (!isAdmin()) return adminDenied();
      const chatId = url.searchParams.get('chatId') || '';
      const date = url.searchParams.get('date') || '';
      if (!/^\d{1,20}$/.test(chatId) || !DATE_RE.test(date)) {
        return json({ ok: false, error: 'bad_params' }, 400);
      }
      const raw = await env.UNI_KV.get('backup_' + chatId + '_' + date);
      if (!raw) return json({ ok: false, error: 'not_found' }, 404);
      const obj = JSON.parse(raw);
      obj.lastSync = new Date().toISOString();
      await env.UNI_KV.put('user_' + chatId, JSON.stringify(obj));
      if (Array.isArray(obj.attendance)) {
        await env.UNI_KV.put('attendance_' + chatId, JSON.stringify(obj.attendance));
      }
      return json({ ok: true, restored: date });
    }

    if (url.pathname === '/setup-webhook') {
      if (!isAdmin()) return adminDenied();
      if (!/^[A-Za-z0-9_-]{16,64}$/.test(env.WEBHOOK_SECRET || '')) {
        return json(
          { ok: false, error: 'WEBHOOK_SECRET غير مضبوط أو صيغته غير صالحة (16-64 حرفاً/رقماً/_/-)' },
          400
        );
      }
      const r = await fetch('https://api.telegram.org/bot' + TOKEN + '/setWebhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.origin + '/webhook',
          secret_token: env.WEBHOOK_SECRET,
          allowed_updates: ['message', 'callback_query']
        })
      });
      return jsonRaw(await r.text());
    }

    return json({ ok: true, service: 'UNI Helper API v2.5 Omni-AI Elite', status: 'healthy' });
  },

  // ============ ⏰ المهام المجدولة (Cron Trigger: Every Minute) ============
  async scheduled(event, env, ctx) {
    const TOKEN = env.TG_TOKEN;
    ctx.waitUntil(
      (async () => {
        const MIG_KEY = 'migration_users_v2_done';
        if (!(await env.UNI_KV.get(MIG_KEY))) {
          await migrateUsers(env);
          await env.UNI_KV.put(MIG_KEY, '1');
        }

        const run = async (name, fn) => {
          try {
            await fn();
          } catch (e) {
            console.error('scheduled ' + name, e);
          }
        };

        await run('pomo', () => checkPomoTimers(env, TOKEN));
        await run('classes', () => checkClasses(env, TOKEN));

        const now = riyadhNow();
        const hour = now.getUTCHours();
        const minute = now.getUTCMinutes();
        const dayOfWeek = now.getUTCDay();

        if (minute < 5) {
          if (hour === 6) await run('morning', () => morningSummary(env, TOKEN));
          if (hour === 7 && dayOfWeek === 0) await run('weeklyPlan', () => weeklyPlan(env, TOKEN));
          if (hour === 9) await run('examsTasks', () => checkExamsAndTasks(env, TOKEN));
          if (hour === 12) await run('sleep', () => checkSleep(env, TOKEN));
          if (hour === 20 && dayOfWeek === 4) await run('weeklySummary', () => weeklySummary(env, TOKEN));
          if (hour === 21) await run('absence', () => absenceWarning(env, TOKEN));
          if (hour === 22) await run('water', () => checkWater(env, TOKEN));
        }
      })()
    );
  }
};

// ============================================================================
// 🛠️ الدوال المساعدة والتحقق الأمني
// ============================================================================
function generateSessionToken() {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function safeEqual(a, b) {
  const enc = new TextEncoder();
  const x = enc.encode(String(a));
  const y = enc.encode(String(b));
  if (x.length !== y.length) return false;
  if (crypto.subtle && typeof crypto.subtle.timingSafeEqual === 'function') {
    return crypto.subtle.timingSafeEqual(x, y);
  }
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

function chatAllowed(env, chatId) {
  const list = (env.ALLOWED_CHAT_IDS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  return !list.length || list.includes(String(chatId));
}

async function checkRateLimit(env, key, max, windowSec) {
  const bucket = Math.floor(Date.now() / (windowSec * 1000));
  const k = 'rl_' + key + '_' + bucket;
  const cur = parseInt((await env.UNI_KV.get(k)) || '0', 10);
  if (cur >= max) return { ok: false, remaining: 0 };
  await env.UNI_KV.put(k, String(cur + 1), { expirationTtl: Math.max(windowSec * 2, 60) });
  return { ok: true, remaining: max - cur - 1 };
}

async function registerUser(env, chatId) {
  chatId = String(chatId);
  const k = `user_list_${chatId}`;
  if (!(await env.UNI_KV.get(k))) {
    await env.UNI_KV.put(k, '1');
  }
}

async function getUsers(env) {
  const users = [];
  let cursor = undefined;
  try {
    do {
      const res = await env.UNI_KV.list({ prefix: 'user_list_', cursor });
      users.push(...res.keys.map(k => k.name.slice('user_list_'.length)));
      cursor = res.list_complete ? undefined : res.cursor;
    } while (cursor);
  } catch (e) {
    console.error('getUsers pagination error:', e);
  }
  return users.filter(id => chatAllowed(env, id));
}

async function migrateUsers(env) {
  try {
    const old = JSON.parse((await env.UNI_KV.get('users')) || '[]');
    for (const id of old) {
      if (id) await env.UNI_KV.put(`user_list_${id}`, '1');
    }
    await env.UNI_KV.delete('users');
  } catch (e) {
    console.error('migrateUsers error:', e);
  }
}

async function getUser(env, chatId) {
  try {
    const raw = JSON.parse((await env.UNI_KV.get('user_' + chatId)) || '{}');
    return stripTombstones(raw);
  } catch (e) {
    return {};
  }
}

async function eachUser(env, fn) {
  for (const chatId of await getUsers(env)) {
    try {
      await fn(chatId);
    } catch (e) {
      console.error('user error', chatId, e);
    }
  }
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function cleanMode(m) {
  m = String(m || 'work');
  return /^(work|short|long)$/.test(m) ? m : 'work';
}

function md(s) {
  return String(s == null ? '' : s).replace(/([_*`\[])/g, '\\$1');
}

const isObj = v => v && typeof v === 'object' && !Array.isArray(v);

const TOMBSTONE_TTL_MS = 30 * 86400 * 1000;

function itemMergeKey(it, keyField = 'id') {
  if (!it || typeof it !== 'object') return '';
  if (keyField === 'date') return it.date ? String(it.date) : '';
  if (it.id != null && String(it.id) !== '') return String(it.id);
  if (it.classId && it.date) return `att_${it.classId}_${it.date}`;
  if (it.name && it.credits != null && it.grade) return `gpa_${it.name}_${it.credits}_${it.grade}`;
  return '';
}

function mergeArrayById(incArr, exArr, keyField = 'id') {
  const hasInc = Array.isArray(incArr);
  const hasEx = Array.isArray(exArr);
  if (!hasInc && !hasEx) return [];
  const now = Date.now();
  const map = new Map();
  const unkeyed = [];

  const putItem = (raw, isIncoming) => {
    if (!raw || typeof raw !== 'object') return;
    const it = { ...raw };
    const ts = typeof it.updatedAt === 'number' && isFinite(it.updatedAt) ? it.updatedAt : 0;
    it.updatedAt = ts;
    if (it.deleted && ts > 0 && now - ts > TOMBSTONE_TTL_MS) return;
    const k = itemMergeKey(it, keyField);
    if (!k) {
      if (isIncoming && !it.deleted) unkeyed.push(it);
      return;
    }
    if (keyField === 'id' && !it.id) it.id = k.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 64);
    const prev = map.get(k);
    if (!prev) {
      map.set(k, it);
    } else {
      const prevTs = typeof prev.updatedAt === 'number' && isFinite(prev.updatedAt) ? prev.updatedAt : 0;
      if (ts > prevTs || (ts === prevTs && isIncoming)) {
        map.set(k, it);
      }
    }
  };

  if (hasEx) exArr.forEach(x => putItem(x, false));
  if (hasInc) incArr.forEach(x => putItem(x, true));

  const merged = Array.from(map.values()).filter(
    it => !(it.deleted && it.updatedAt > 0 && now - it.updatedAt > TOMBSTONE_TTL_MS)
  );
  return merged.concat(unkeyed);
}

function pickArr(d, ex, k) {
  return mergeArrayById(d[k], ex[k], 'id');
}

function mergeObjectFieldWiseServer(incObj, exObj, scalarKeys, defObj = {}) {
  const inc = isObj(incObj) ? incObj : {};
  const ex = isObj(exObj) ? exObj : {};
  const incFieldTs = isObj(inc._fieldTs) ? inc._fieldTs : {};
  const exFieldTs = isObj(ex._fieldTs) ? ex._fieldTs : {};
  const incObjTs = typeof inc.updatedAt === 'number' && isFinite(inc.updatedAt) ? inc.updatedAt : (typeof inc.salaryUpdatedAt === 'number' ? inc.salaryUpdatedAt : 0);
  const exObjTs = typeof ex.updatedAt === 'number' && isFinite(ex.updatedAt) ? ex.updatedAt : (typeof ex.salaryUpdatedAt === 'number' ? ex.salaryUpdatedAt : 0);
  const out = { ...defObj, ...ex, ...inc };
  const outFieldTs = { ...exFieldTs, ...incFieldTs };
  const hasIncFieldTs = Object.keys(incFieldTs).length > 0;
  const hasExFieldTs = Object.keys(exFieldTs).length > 0;
  for (const k of scalarKeys) {
    const iTs = typeof incFieldTs[k] === 'number' ? incFieldTs[k] : (hasIncFieldTs ? 0 : incObjTs);
    const eTs = typeof exFieldTs[k] === 'number' ? exFieldTs[k] : (hasExFieldTs ? 0 : exObjTs);
    if (iTs > eTs && inc[k] !== undefined) {
      out[k] = inc[k];
      outFieldTs[k] = iTs;
    } else if (eTs > iTs && ex[k] !== undefined) {
      out[k] = ex[k];
      outFieldTs[k] = eTs;
    } else if (inc[k] !== undefined) {
      out[k] = inc[k];
    } else if (ex[k] !== undefined) {
      out[k] = ex[k];
    }
  }
  out.updatedAt = Math.max(incObjTs, exObjTs);
  out._fieldTs = outFieldTs;
  return out;
}

function sanitizeUserData(d, ex) {
  ex = isObj(ex) ? ex : {};
  const incMoney = isObj(d.money) ? d.money : {};
  const exMoney = isObj(ex.money)
    ? ex.money
    : { salary: 0, salaryExactDate: null, expenses: [], incomes: [], goals: [] };
  const mergedMoneyBase = mergeObjectFieldWiseServer(
    incMoney,
    exMoney,
    ['salary', 'salaryExactDate'],
    { salary: 0, salaryExactDate: null }
  );
  const rawMoney = {
    ...mergedMoneyBase,
    expenses: mergeArrayById(incMoney.expenses, exMoney.expenses, 'id'),
    incomes: mergeArrayById(incMoney.incomes, exMoney.incomes, 'id'),
    goals: mergeArrayById(incMoney.goals, exMoney.goals, 'id')
  };

  const incWell = isObj(d.wellness) ? d.wellness : {};
  const exWell = isObj(ex.wellness) ? ex.wellness : { sleepGoal: 8, waterGoal: 8, log: [] };
  const mergedWellBase = mergeObjectFieldWiseServer(
    incWell,
    exWell,
    ['sleepGoal', 'waterGoal'],
    { sleepGoal: 8, waterGoal: 8 }
  );
  const mergedWellness = {
    ...mergedWellBase,
    log: mergeArrayById(incWell.log, exWell.log, 'date')
  };

  const incHealth = isObj(d.health) ? d.health : {};
  const exHealth = isObj(ex.health) ? ex.health : { teethLog: [] };
  const mergedHealthBase = mergeObjectFieldWiseServer(incHealth, exHealth, [], {});
  const mergedHealth = {
    ...mergedHealthBase,
    teethLog: mergeArrayById(incHealth.teethLog, exHealth.teethLog, 'date')
  };

  const incSet = isObj(d.settings) ? d.settings : {};
  const exSet = isObj(ex.settings) ? ex.settings : {};
  const mergedSetBase = mergeObjectFieldWiseServer(
    incSet,
    exSet,
    ['theme', 'semesterStart', 'semesterWeeks', 'customAcademicEvents', 'gpaScale', 'absenceLimit', 'defaultWeights', 'showHijri', 'lastExportAt', 'onboardingDismissed', 'backupReminderDismissedAt'],
    {}
  );
  const mergedPomo = mergeObjectFieldWiseServer(
    isObj(incSet.pomo) ? incSet.pomo : {},
    isObj(exSet.pomo) ? exSet.pomo : {},
    ['work', 'short', 'long'],
    { work: 25, short: 5, long: 15 }
  );
  const mergedSettings = {
    ...mergedSetBase,
    pomo: mergedPomo
  };

  return {
    tasks: pickArr(d, ex, 'tasks'),
    exams: pickArr(d, ex, 'exams'),
    courses: pickArr(d, ex, 'courses'),
    schedule: pickArr(d, ex, 'schedule'),
    attendance: pickArr(d, ex, 'attendance'),
    gpaCourses: pickArr(d, ex, 'gpaCourses'),
    archive: pickArr(d, ex, 'archive'),
    studyLog: pickArr(d, ex, 'studyLog'),
    wellness: mergedWellness,
    health: mergedHealth,
    money: rawMoney,
    settings: mergedSettings
  };
}

function badData(msg, detail) {
  const e = new Error(msg);
  e.code = 'bad_data';
  e.detail = detail;
  return e;
}

function validateUserData(o) {
  const m = isObj(o.money) ? o.money : {};
  const lists = {
    tasks: o.tasks,
    exams: o.exams,
    courses: o.courses,
    schedule: o.schedule,
    attendance: o.attendance,
    gpaCourses: o.gpaCourses,
    archive: o.archive,
    studyLog: o.studyLog,
    'money.expenses': m.expenses,
    'money.incomes': m.incomes,
    'money.goals': m.goals,
    'wellness.log': o.wellness && o.wellness.log,
    'health.teethLog': o.health && o.health.teethLog
  };
  for (const [name, arr] of Object.entries(lists)) {
    if (!Array.isArray(arr)) continue;
    if (arr.length > MAX_ITEMS) {
      throw badData('too_many_items', `${name}: ${arr.length} > ${MAX_ITEMS}`);
    }
    for (let i = 0; i < arr.length; i++) {
      const it = arr[i];
      if (!it || typeof it !== 'object') continue;
      for (const k of ['id', 'courseId', 'classId']) {
        if (it[k] != null && !SAFE_ID_RE.test(String(it[k]))) {
          throw badData('unsafe_id', `${name}[${i}].${k}`);
        }
      }
      if (it.color != null && !SAFE_COLOR_RE.test(String(it.color))) {
        throw badData('unsafe_color', `${name}[${i}].color`);
      }
    }
  }
}

const isAlive = x => x && typeof x === 'object' && !x.deleted;

function stripTombstones(u) {
  if (!u || typeof u !== 'object') return {};
  const copy = { ...u };
  for (const k of ['tasks', 'exams', 'courses', 'schedule', 'attendance', 'gpaCourses', 'archive', 'studyLog']) {
    if (Array.isArray(copy[k])) copy[k] = copy[k].filter(isAlive);
  }
  if (copy.wellness && Array.isArray(copy.wellness.log)) {
    copy.wellness = { ...copy.wellness, log: copy.wellness.log.filter(isAlive) };
  }
  if (copy.health && Array.isArray(copy.health.teethLog)) {
    copy.health = { ...copy.health, teethLog: copy.health.teethLog.filter(isAlive) };
  }
  if (copy.money && typeof copy.money === 'object') {
    copy.money = {
      ...copy.money,
      expenses: Array.isArray(copy.money.expenses) ? copy.money.expenses.filter(isAlive) : [],
      incomes: Array.isArray(copy.money.incomes) ? copy.money.incomes.filter(isAlive) : [],
      goals: Array.isArray(copy.money.goals) ? copy.money.goals.filter(isAlive) : []
    };
  }
  return copy;
}

function hasData(o) {
  if (!o) return false;
  const lists = ['tasks', 'exams', 'courses', 'schedule', 'attendance', 'gpaCourses', 'archive', 'studyLog'];
  if (lists.some(k => Array.isArray(o[k]) && o[k].some(isAlive))) return true;
  if (o.wellness && Array.isArray(o.wellness.log) && o.wellness.log.some(isAlive)) return true;
  if (o.health && Array.isArray(o.health.teethLog) && o.health.teethLog.some(isAlive)) return true;
  if (
    o.money &&
    ((Array.isArray(o.money.expenses) && o.money.expenses.some(isAlive)) ||
      (Array.isArray(o.money.incomes) && o.money.incomes.some(isAlive)) ||
      (Array.isArray(o.money.goals) && o.money.goals.some(isAlive)) ||
      o.money.salary)
  ) {
    return true;
  }
  return false;
}

// ============================================================================
// 📅 دوال التوقيت والتقويم والراتب والدخل الإضافي (متطابقة 100% مع الفرونت إند)
// ============================================================================
function riyadhNow() {
  return new Date(Date.now() + 3 * 60 * 60 * 1000);
}

function riyadhToday() {
  return riyadhNow().toISOString().slice(0, 10);
}

function daysUntilFrom(iso, today) {
  return Math.round((new Date(iso + 'T00:00:00Z') - new Date(today + 'T00:00:00Z')) / 86400000);
}

function arDate(iso) {
  try {
    const d = new Date(iso + 'T00:00:00Z');
    const day = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'][d.getUTCDay()];
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    return `${day} ${d.getUTCDate()} ${months[d.getUTCMonth()]}`;
  } catch (e) {
    return iso;
  }
}

function arDayShort(iso) {
  try {
    const d = new Date(iso + 'T00:00:00Z');
    return ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'][d.getUTCDay()];
  } catch (e) {
    return iso;
  }
}

function isoFromUTCDate(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function addDaysISO(iso, days) {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return isoFromUTCDate(d);
}

function addMonthsClampedUTC(baseDate, monthsToAdd) {
  const y = baseDate.getUTCFullYear();
  const m = baseDate.getUTCMonth() + monthsToAdd;
  const targetDay = baseDate.getUTCDate();
  const firstOfTarget = new Date(Date.UTC(y, m, 1));
  const maxDay = new Date(Date.UTC(firstOfTarget.getUTCFullYear(), firstOfTarget.getUTCMonth() + 1, 0)).getUTCDate();
  return new Date(Date.UTC(firstOfTarget.getUTCFullYear(), firstOfTarget.getUTCMonth(), Math.min(targetDay, maxDay)));
}

function courseName(u, id) {
  const c = (u.courses || []).find(x => x.id === id);
  return md(c ? c.name : 'عام');
}

const ATT_STATUS = {
  p: { key: 'present', label: 'حضرت', emoji: '✅' },
  e: { key: 'excused', label: 'غايب بعذر', emoji: '🟡' },
  a: { key: 'absent', label: 'غايب بدون عذر', emoji: '🔴' },
  l: { key: 'late', label: 'متأخر', emoji: '⏰' },
  c: { key: 'cancelled', label: 'ملغي', emoji: '🚫' }
};

function pomoText(mode, minutes) {
  const line = '━━━━━━━━━━━━━━━━━\n';
  if (mode === 'work') {
    return (
      '🎉 *انتهى وقت التركيز!*\n\n' +
      `⏱️ أكملت: *${minutes} دقيقة*\n\n` +
      line +
      '💪 خذ راحة الآن — أنت تستحقها!\n' +
      '☕ اختر: راحة قصيرة أو طويلة'
    );
  }
  if (mode === 'short') {
    return (
      '☕ *انتهت الراحة القصيرة!*\n\n' +
      `⏱️ الراحة: *${minutes} دقيقة*\n\n` +
      line +
      '🎯 يلا نرجع للتركيز 💪'
    );
  }
  if (mode === 'long') {
    return (
      '🛋️ *انتهت الراحة الطويلة!*\n\n' +
      `⏱️ الراحة: *${minutes} دقيقة*\n\n` +
      line +
      '🎯 وقت التركيز من جديد — يلا نكمل! 💪'
    );
  }
  return '⏱️ *انتهى المؤقّت!*\n\n' + `⏱️ المدة: *${minutes} دقيقة*`;
}

// حساب دورة الراتب + الفلوس المضافة (incomes) + المصاريف + الحصالة
function calcMoneyStats(money, today) {
  if (!money) return null;
  const hasSalary = money.salaryExactDate && +money.salary > 0;
  const hasIncomes = Array.isArray(money.incomes) && money.incomes.length > 0;
  if (!hasSalary && !hasIncomes) return null;

  const CATS = {
    food: '🍔 أكل ومطاعم',
    coffee: '☕ قهوة',
    transport: '🚗 مواصلات',
    books: '📚 كتب وقرطاسية',
    clothes: '👕 ملابس',
    entertainment: '🎬 ترفيه',
    subscriptions: '📱 اشتراكات',
    bills: '🏠 فواتير',
    health: '💊 صحة',
    gifts: '🎁 هدايا',
    other: '🚨 أخرى'
  };

  const salary = +money.salary || 0;
  const todayDate = new Date(today + 'T00:00:00Z');
  let lastISO = '0000-01-01';
  let nextISO = '9999-12-31';
  let lastTs = 0;
  let daysToSalary = 0;
  let cycleDays = 1;

  if (money.salaryExactDate) {
    const baseDate = new Date(money.salaryExactDate + 'T00:00:00Z');
    if (baseDate <= todayDate) {
      let months = 0;
      while (addMonthsClampedUTC(baseDate, months + 1) <= todayDate) {
        months++;
        if (months > 120) break;
      }
      const lastSalaryDate = addMonthsClampedUTC(baseDate, months);
      const nextSalaryDate = addMonthsClampedUTC(baseDate, months + 1);
      lastISO = isoFromUTCDate(lastSalaryDate);
      nextISO = isoFromUTCDate(nextSalaryDate);
      lastTs = lastSalaryDate.getTime();
      daysToSalary = Math.max(0, Math.ceil((nextSalaryDate - todayDate) / 86400000));
      cycleDays = Math.max(1, Math.round((todayDate - lastSalaryDate) / 86400000) + 1);
    }
  }

  const cycleExpenses = (money.expenses || []).filter(e => e.date >= lastISO && e.date < nextISO);
  const expensesSpent = cycleExpenses.reduce((a, b) => a + (+b.amount || 0), 0);

  const cycleIncomes = (money.incomes || []).filter(inc => inc.date >= lastISO && inc.date < nextISO);
  const addedIncome = cycleIncomes.reduce((a, b) => a + (+b.amount || 0), 0);

  const goalSavedCycle = (money.goals || []).reduce((sum, g) => {
    if (!Array.isArray(g.txs) || !g.txs.length) return sum + Math.max(0, +g.saved || 0);
    const cycleNet = g.txs.filter(tx => tx.ts >= lastTs).reduce((a, tx) => a + (+tx.amount || 0), 0);
    return sum + cycleNet;
  }, 0);

  const totalBudget = salary + addedIncome;
  const cycleSpent = Math.max(0, expensesSpent + goalSavedCycle);
  const remaining = totalBudget - (expensesSpent + goalSavedCycle);
  const percent = totalBudget > 0 ? Math.round((cycleSpent / totalBudget) * 100) : 0;

  const todaySpent = (money.expenses || [])
    .filter(e => e.date === today)
    .reduce((a, b) => a + (+b.amount || 0), 0);

  const weekAgoISO = addDaysISO(today, -6);
  const weekSpent = (money.expenses || [])
    .filter(e => e.date >= weekAgoISO && e.date <= today)
    .reduce((a, b) => a + (+b.amount || 0), 0);

  const twoWeeksAgoISO = addDaysISO(today, -13);
  const prevWeekSpent = (money.expenses || [])
    .filter(e => e.date >= twoWeeksAgoISO && e.date < weekAgoISO)
    .reduce((a, b) => a + (+b.amount || 0), 0);

  const byCat = {};
  cycleExpenses.forEach(e => {
    byCat[e.category] = (byCat[e.category] || 0) + (+e.amount || 0);
  });
  const topCat = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];
  const avgDaily = Math.round(expensesSpent / cycleDays);

  return {
    salary,
    addedIncome,
    totalBudget,
    cycleSpent,
    expensesSpent,
    goalSavedCycle,
    remaining,
    percent,
    todaySpent,
    weekSpent,
    prevWeekSpent,
    topCat: topCat ? topCat[0] : null,
    topCatName: topCat ? CATS[topCat[0]] || md(topCat[0]) : null,
    topCatAmount: topCat ? topCat[1] : 0,
    daysToSalary,
    avgDaily
  };
}

// ============================================================================
// 📨 إرسال رسائل تلقرام
// ============================================================================
async function tgSend(token, chatId, payload) {
  if (!token) return false;
  const call = async extra =>
    fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, ...payload, ...extra })
    });
  try {
    let r = await call({ parse_mode: 'Markdown' });
    if (r.status === 400) r = await call({ parse_mode: undefined });
    if (!r.ok) {
      console.error('telegram send failed', r.status, (await r.text()).slice(0, 200));
    }
    return r.ok;
  } catch (e) {
    console.error('telegram send error', e);
    return false;
  }
}

function sendTG(token, chatId, msgs) {
  return tgSend(token, chatId, { text: '🎓 *مُساعد الجامعة*\n\n' + msgs.join('\n\n') });
}

function sendTGWithButtons(token, chatId, text, buttons) {
  return tgSend(token, chatId, {
    text: '🎓 *مُساعد الجامعة*\n\n' + text,
    reply_markup: { inline_keyboard: buttons }
  });
}

// ============================================================================
// 🤖 المحرك الذكي الشامل — Google Gemini Omni-Agent (ينفذ كل شيء في الموقع!)
// ============================================================================
async function callGemini(apiKey, text, image, courses, goals, today) {
  if (!apiKey) {
    const err = new Error('GEMINI_KEY غير موجود في إعدادات Cloudflare Worker');
    err.userMessage = 'مفتاح الذكاء الاصطناعي غير مضبوط في السيرفر';
    throw err;
  }

  const coursesList = courses
    .map(c => `- ID: ${c.id} | الاسم: ${c.name}${c.code ? ' | الرمز: ' + c.code : ''}`.replace(/[\r\n]+/g, ' '))
    .join('\n');

  const goalsList = (goals || [])
    .map(g => `- ID: ${g.id} | الهدف: ${g.name}`.replace(/[\r\n]+/g, ' '))
    .join('\n');

  const todayDayIdx = new Date(today + 'T00:00:00Z').getUTCDay();
  const todayDayName = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'][todayDayIdx];

  const prompt = `أنت المساعد الذكي الشامل (Omni-Agent) في تطبيق "مُساعد الجامعة" للطلاب الجامعيين في السعودية.
مهمتك فهم كلام المستخدم (بالعربي السعودي الدارج أو الفصحى) أو الصور المرفقة (جدول دراسي، تقويم أكاديمي، إيصال، درجات، مهام) وتحويلها إلى قائمة أوامر برمجية دقيقة (JSON) لتنفيذها فوراً في الموقع.

**تاريخ اليوم:** ${today} (${todayDayName})

**قائمة مقررات المستخدم المسجلة:**
${coursesList || '(لا توجد مقررات مسجلة حالياً)'}

**قائمة الأهداف المالية للمستخدم:**
${goalsList || '(لا توجد أهداف مالية حالياً)'}

**القدرات الشاملة (يمكنك إرجاع أمر واحد أو عدة أوامر معاً في مصفوفة actions):**
يجب أن ترجع دائماً كائن JSON بالصيغة التالية:
{
  "actions": [
    { "action": "اسم_الأمر", "data": { ... } }
  ],
  "reply": "رسالة قصيرة ومبهجة باللهجة السعودية تلخص ما قمت بتنفيذه"
}

**جميع الأوامر المدعومة (14 أمراً تغطي الموقع بالكامل):**

1. **إضافة مصروف مالي (add_expense):**
   { "action": "add_expense", "data": { "amount": 45, "category": "food", "note": "غداء مع الشباب", "date": "${today}" } }
   التصنيفات: food | coffee | transport | books | clothes | entertainment | subscriptions | bills | health | gifts | other

2. **زيادة فلوس / إضافة دخل إضافي للميزانية (add_income):**
   يُستخدم عندما يقول المستخدم مثلاً: "جاتني 500 ريال هدية"، "أبوي حول لي 300"، "زد فلوسي 200 ريال"، "مكافأة إضافية 1000"، "ربحت 150 ريال".
   { "action": "add_income", "data": { "amount": 500, "source": "gift", "note": "هدية / تحويل من الوالد", "date": "${today}" } }
   المصادر المسموحة (source): allowance (مكافأة/مصروف) | transfer (تحويل أهلي) | freelance (عمل حر/مشروع) | reward (مكافأة تفوق/حافز) | gift (هدية/عيدية) | other (أخرى)

3. **ضبط أو تعديل الراتب/المكافأة الأساسية (set_salary):**
   يُستخدم عندما يقول: "راتبي 990 ينزل يوم 27"، "خل المكافأة 1000 ريال".
   { "action": "set_salary", "data": { "salary": 990, "date": "${today}" } }

4. **إضافة هدف مالي جديد (add_goal):**
   { "action": "add_goal", "data": { "name": "آيباد للدراسة", "target": 3200, "saved": 0, "emoji": "📱" } }

5. **إيداع أو سحب من هدف مالي (goal_transaction):**
   { "action": "goal_transaction", "data": { "goalId": "معرف الهدف إن وجد", "goalName": "اسم الهدف", "amount": 200, "type": "deposit" } }
   حيث type إما "deposit" (إيداع/تحويش) أو "withdraw" (سحب).

6. **إضافة مقرر دراسي جديد (add_course):**
   { "action": "add_course", "data": { "name": "فيزياء عامة", "code": "PHYS101", "credits": 3, "teacher": "د. فهد" } }

7. **إضافة محاضرة للجدول الأسبوعي (add_class):**
   (إذا رفع المستخدم صورة جدول دراسي كامل، استخرج كل المقررات بـ add_course وكل المحاضرات بـ add_class في مصفوفة actions!)
   { "action": "add_class", "data": { "courseId": "معرف المقرر أو فارغ", "courseName": "اسم المقرر", "day": 0, "start": "08:00", "end": "09:30", "room": "قاعة 204" } }
   الأيام (day): 0=الأحد، 1=الاثنين، 2=الثلاثاء، 3=الأربعاء، 4=الخميس، 5=الجمعة، 6=السبت.

8. **إضافة مهمة أو واجب أو مشروع (add_task):**
   { "action": "add_task", "data": { "title": "حل واجب الفصل الثالث", "courseId": "معرف المقرر", "courseName": "اسم المقرر", "type": "واجب", "due": "YYYY-MM-DD", "priority": "high", "notes": "" } }
   الأنواع: واجب | كويز | مشروع | تقرير | عرض تقديمي | بحث | أخرى
   الأولوية: high | med | low

9. **إضافة اختبار أو كويز (add_exam):**
   { "action": "add_exam", "data": { "title": "ميدتيرم أول", "courseId": "معرف المقرر", "courseName": "اسم المقرر", "type": "ميدتيرم", "date": "YYYY-MM-DD", "time": "08:00", "place": "قاعة 102", "notes": "" } }
   الأنواع: كويز | ميدتيرم | فاينل | اختبار عملي | مناقشة مشروع

10. **تسجيل حضور أو غياب أو تأخير (log_attendance):**
    يُستخدم عندما يقول: "غبت اليوم في محاضرة التفاضل"، "تأخرت في الفيزياء"، "انلغت محاضرة البرمجة اليوم".
    { "action": "log_attendance", "data": { "courseId": "معرف المقرر", "courseName": "اسم المقرر", "date": "${today}", "status": "absent", "note": "" } }
    الحالات (status): present (حاضر) | absent (غايب بدون عذر) | excused (غايب بعذر) | late (متأخر) | cancelled (ملغي)

11. **تسجيل جلسة مذاكرة (log_study):**
    يُستخدم عندما يقول: "ذاكرت تفاضل ساعتين"، "درست 45 دقيقة فيزياء".
    { "action": "log_study", "data": { "courseId": "معرف المقرر", "courseName": "اسم المقرر", "minutes": 120, "date": "${today}" } }

12. **تسجيل النوم والماء وتفريش الأسنان (log_wellness):**
    يُستخدم عندما يقول: "نمت 7 ساعات وشربت 5 أكواب موية وفرشت أسناني الصباح".
    { "action": "log_wellness", "data": { "sleep": 7, "water": 5, "teethMorning": true, "teethNight": null, "date": "${today}" } }
    (ضع null للحقل الذي لم يذكره المستخدم حتى لا يتغير).

13. **رصد درجة أو تقدير في مقرر (add_grade):**
    يُستخدم عندما يقول: "جبت 28 من 30 في ميدتيرم التفاضل" (نحولها لنسبة مئوية أو نضع الوزن والدرجة) أو "تقديري في المقرر A+".
    { "action": "add_grade", "data": { "courseId": "معرف المقرر", "courseName": "اسم المقرر", "letter": "A+", "componentName": "ميدتيرم", "weight": 30, "score": 93.3 } }

14. **إعداد التقويم الأكاديمي من صورة أو نص (setup_semester):**
    { "action": "setup_semester", "data": { "startDate": "YYYY-MM-DD", "weeks": 16, "events": [ { "date": "YYYY-MM-DD", "title": "اسم الحدث", "type": "info" } ] } }
    أنواع الأحداث: info | holiday | exam

15. **إذا كان الكلام سؤالاً عاماً أو غير واضح (unknown):**
    { "actions": [], "action": "unknown", "message": "رد ذكي ومفيد باللهجة السعودية" }

**قواعد ذهبية:**
- إذا طلب المستخدم أكثر من شيء في نفس الجملة (مثلاً: "تغديت بـ 35 ريال وقهوة بـ 18 ريال وعندي واجب برمجة بكرة")، ضع كل الأوامر في مصفوفة \`actions\` ليتم تنفيذها كلها دفعة واحدة!
- التاريخ دائماً بصيغة YYYY-MM-DD، والوقت بصيغة 24 ساعة HH:MM.
- "بكرة" أو "غداً" = تاريخ اليوم + 1 يوم.
- أرجع JSON صالح فقط بدون أي نص خارجه.

**مدخلات المستخدم:**
${JSON.stringify(text)}`;

  const parts = [{ text: prompt }];
  if (image && image.data) {
    parts.push({
      inline_data: {
        mime_type: image.mimeType || 'image/jpeg',
        data: image.data
      }
    });
  }

  // ترتيب الموديلات حسب المتاح فعلياً في حساب Google AI Studio الخاص بك
  const models = [
    'gemini-2.5-flash',
    'gemini-3.8-flash',
    'gemini-3.6-flash',
    'gemini-3-flash',
    'gemini-3.1-flash-lite',
    'gemini-3.5-flash-lite',
    'gemini-2.5-flash-lite',
    'gemini-flash-latest'
  ];

  const deadline = Date.now() + 24000;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  let lastError = null;

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const left = deadline - Date.now();
      if (left < 1500) throw new Error('deadline');
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey
            },
            signal: AbortSignal.timeout(Math.min(11000, left)),
            body: JSON.stringify({
              contents: [{ parts }],
              generationConfig: {
                temperature: 0.1,
                responseMimeType: 'application/json'
              }
            })
          }
        );

        if (res.status === 503 || res.status === 429) {
          lastError = new Error(`[${model}] ${res.status}`);
          if (attempt === 1) break;
          if (deadline - Date.now() <= 2500) throw new Error('deadline');
          await sleep(1200);
          continue;
        }
        if (res.status === 404 || res.status === 400) {
          lastError = new Error(`[${model}] ${res.status}`);
          break;
        }
        if (!res.ok) {
          lastError = new Error(`[${model}] ${res.status}: ${(await res.text()).slice(0, 180)}`);
          break;
        }

        const data = await res.json();
        const rawText =
          (data.candidates &&
            data.candidates[0] &&
            data.candidates[0].content &&
            data.candidates[0].content.parts &&
            data.candidates[0].content.parts[0] &&
            data.candidates[0].content.parts[0].text) ||
          '';

        let parsed;
        try {
          parsed = JSON.parse(rawText);
        } catch (e) {
          const match = rawText.match(/\{[\s\S]*\}/);
          if (match) {
            try {
              parsed = JSON.parse(match[0]);
            } catch (e2) {
              parsed = { action: 'unknown', message: rawText };
            }
          } else {
            parsed = { action: 'unknown', message: rawText };
          }
        }
        return parsed;
      } catch (e) {
        if (e && e.message === 'deadline') throw e;
        lastError = e;
        if (e && (e.name === 'TimeoutError' || e.name === 'AbortError')) break;
        continue;
      }
    }
  }

  if (lastError && /\] (503|429)$/.test(lastError.message)) {
    throw new Error('deadline');
  }
  throw lastError || new Error('جميع موديلات الذكاء الاصطناعي مشغولة حالياً');
}

// ============================================================================
// ⏰ تنفيذ المهام المجدولة والتنبيهات الذكية
// ============================================================================
async function checkPomoTimers(env, TOKEN) {
  let cursor = undefined;
  const now = Date.now();
  let sent = 0;

  do {
    const list = await env.UNI_KV.list({ prefix: 'pomo_', cursor });
    for (const key of list.keys) {
      try {
        const raw = await env.UNI_KV.get(key.name);
        if (!raw) continue;
        const timer = JSON.parse(raw);
        const chatId = key.name.slice('pomo_'.length);
        if (!chatAllowed(env, chatId)) {
          await env.UNI_KV.delete(key.name);
          continue;
        }
        if (timer.endTimestamp && timer.endTimestamp <= now) {
          await env.UNI_KV.delete(key.name);
          const dedup = checkMemRate('pomodone_dedup_' + chatId, 1, 15_000);
          if (dedup.ok) {
            const minutes = Math.round((timer.total || 1500) / 60);
            await sendTG(TOKEN, chatId, [pomoText(cleanMode(timer.mode), minutes)]);
            sent++;
          }
        }
      } catch (e) {
        console.error('pomo timer error', e);
      }
    }
    cursor = list.list_complete ? undefined : list.cursor;
  } while (cursor);

  return { ok: true, sent };
}

async function updateAttendance(env, chatId, classId, date, status) {
  const now = Date.now();
  const key = 'attendance_' + chatId;
  let arr = [];
  try {
    arr = JSON.parse((await env.UNI_KV.get(key)) || '[]');
  } catch (e) {
    arr = [];
  }
  arr = arr.filter(a => a && !a.deleted && !(a.classId === classId && a.date === date));
  if (status !== 'present') {
    arr.push({ id: `att_${classId}_${date}`, classId, date, status, note: '', updatedAt: now });
  }
  await env.UNI_KV.put(key, JSON.stringify(arr));

  let u = {};
  try {
    u = JSON.parse((await env.UNI_KV.get('user_' + chatId)) || '{}');
  } catch (e) {
    u = {};
  }
  if (!Array.isArray(u.attendance)) u.attendance = [];
  const existingIdx = u.attendance.findIndex(a => a && a.classId === classId && a.date === date);
  if (status === 'present') {
    if (existingIdx !== -1) {
      u.attendance[existingIdx] = { ...u.attendance[existingIdx], deleted: true, updatedAt: now };
    }
  } else {
    const rec = {
      id: existingIdx !== -1 && u.attendance[existingIdx].id ? u.attendance[existingIdx].id : `att_${classId}_${date}`,
      classId,
      date,
      status,
      note: existingIdx !== -1 ? u.attendance[existingIdx].note || '' : '',
      updatedAt: now
    };
    delete rec.deleted;
    if (existingIdx !== -1) u.attendance[existingIdx] = rec;
    else u.attendance.push(rec);
  }
  u.lastSync = new Date(now).toISOString();
  await env.UNI_KV.put('user_' + chatId, JSON.stringify(u));
  return arr;
}

async function morningSummary(env, TOKEN) {
  const today = riyadhToday();
  const yesterday = addDaysISO(today, -1);
  let totalSent = 0;

  await eachUser(env, async chatId => {
    const key = `notif_morning_${chatId}_${today}`;
    if (await env.UNI_KV.get(key)) return;
    const u = await getUser(env, chatId);
    if (!hasData(u)) return;

    const w = u.wellness || { sleepGoal: 8, waterGoal: 8, log: [] };
    const yW = (w.log || []).find(l => l.date === yesterday) || { sleep: 0, water: 0 };
    const yTeeth = ((u.health && u.health.teethLog) || []).find(l => l.date === yesterday) || {
      morning: false,
      night: false
    };
    const yDoneTasks = (u.tasks || []).filter(t => t.done && t.due === yesterday).length;
    const yTotalTasks = (u.tasks || []).filter(t => t.due === yesterday).length;
    const openTasks = (u.tasks || []).filter(t => !t.done).length;
    const dayOfWeek = new Date(today + 'T00:00:00Z').getUTCDay();
    const todayClasses = (u.schedule || [])
      .filter(s => +s.day === dayOfWeek)
      .sort((a, b) => (a.start || '').localeCompare(b.start || ''));
    const todayTasks = (u.tasks || []).filter(t => !t.done && t.due === today);
    const todayExams = (u.exams || []).filter(e => !e.done && e.date === today);

    let msg = '☀️ *صباح الخير والهمّة!*\n';
    msg += `📅 ${arDate(today)}\n\n`;
    msg += '━━━━━━━━━━━━━━━━━\n';
    msg += '📊 *ملخص أمس:*\n';
    const healthParts = [];
    if (yW.water > 0) healthParts.push(`💧 ${yW.water}/${w.waterGoal || 8}`);
    if (yW.sleep > 0) healthParts.push(`😴 ${yW.sleep}/${w.sleepGoal || 8} س`);
    const teethCount = (yTeeth.morning ? 1 : 0) + (yTeeth.night ? 1 : 0);
    if (teethCount > 0) healthParts.push(`🦷 ${teethCount}/2`);
    if (healthParts.length) msg += healthParts.join(' · ') + '\n';

    if (yTotalTasks > 0) {
      const pct = Math.round((yDoneTasks / yTotalTasks) * 100);
      const emoji = pct === 100 ? '🎉' : pct >= 50 ? '✅' : '⚠️';
      msg += `${emoji} أنجزت: ${yDoneTasks}/${yTotalTasks} مهمة (${pct}%)\n`;
    } else {
      msg += '📋 ما كان عندك تسليمات أمس\n';
    }

    const money = calcMoneyStats(u.money, today);
    if (money) {
      const yesterdaySpent = ((u.money && u.money.expenses) || [])
        .filter(e => e.date === yesterday)
        .reduce((a, b) => a + (+b.amount || 0), 0);
      if (yesterdaySpent > 0) msg += `💸 صرفت أمس: ${yesterdaySpent.toLocaleString('ar-EG')} ر.س\n`;
      msg += `💰 المتبقي: ${money.remaining.toLocaleString('ar-EG')} من ${money.totalBudget.toLocaleString('ar-EG')} ر.س (صرفت ${money.percent}%)\n`;
      if (money.percent >= 80) msg += `🚨 *انتبه! استهلكت ${money.percent}% من ميزانيتك*\n`;
      else if (money.percent >= 60) msg += `⚠️ استهلكت أكثر من نصف الميزانية\n`;
      if (money.daysToSalary > 0) msg += `📅 باقي ${money.daysToSalary} يوم على الراتب الجاي\n`;
    }

    msg += '\n━━━━━━━━━━━━━━━━━\n';
    msg += '📅 *جدولك اليوم:*\n';
    if (todayClasses.length) {
      msg += `📚 *${todayClasses.length} محاضرات:*\n`;
      todayClasses.forEach(c => {
        msg += `• ${c.start} - ${c.end} · ${courseName(u, c.courseId)}${c.room ? ' · ' + md(c.room) : ''}\n`;
      });
    } else {
      msg += '📚 ما عندك محاضرات اليوم 🎉\n';
    }

    if (todayExams.length) {
      msg += `\n📝 *اختبارات اليوم:*\n`;
      todayExams.forEach(e => {
        msg += `• ${md(e.title)} · ${courseName(u, e.courseId)}${e.time ? ' · 🕐 ' + e.time : ''}\n`;
      });
    }
    if (todayTasks.length) {
      msg += `\n✅ *تسليمات اليوم:*\n`;
      todayTasks.forEach(t => {
        msg += `• ${md(t.title)} · ${courseName(u, t.courseId)}\n`;
      });
    }

    const tips = [];
    const teeth = ((u.health && u.health.teethLog) || []).find(l => l.date === today) || { morning: false };
    if (!teeth.morning) tips.push('🦷 لا تنسَ تفريش الصباح');
    if (todayExams.length) tips.push(`📝 ركّز في اختبار اليوم: ${md(todayExams[0].title)}`);
    if (todayTasks.length >= 3) tips.push(`⚡ عندك ${todayTasks.length} تسليمات اليوم — ابدأ بالأهم`);
    if (openTasks > 5) tips.push(`📋 لديك ${openTasks} مهام مفتوحة إجمالاً`);

    if (tips.length) {
      msg += '\n━━━━━━━━━━━━━━━━━\n';
      msg += '💡 *تذكيرات سريعة:*\n';
      tips.forEach(t => (msg += `• ${t}\n`));
    }

    msg += '\n━━━━━━━━━━━━━━━━━\n';
    msg += '💪 يومك موفق ومليان إنجاز بإذن الله!';

    if (await sendTG(TOKEN, chatId, [msg])) {
      await env.UNI_KV.put(key, '1', { expirationTtl: 86400 });
      totalSent++;
    }
  });

  return { ok: true, sent: totalSent, today };
}

async function weeklyPlan(env, TOKEN) {
  const today = riyadhToday();
  const todayDate = new Date(today + 'T00:00:00Z');
  const dayOfWeek = todayDate.getUTCDay();
  const weekEndStr = addDaysISO(today, 6 - dayOfWeek);
  let totalSent = 0;

  await eachUser(env, async chatId => {
    const key = `notif_weeklyplan_${chatId}_${today}`;
    if (await env.UNI_KV.get(key)) return;
    const u = await getUser(env, chatId);
    const weekExams = (u.exams || [])
      .filter(e => !e.done && e.date >= today && e.date <= weekEndStr)
      .sort((a, b) => a.date.localeCompare(b.date));
    const weekTasks = (u.tasks || [])
      .filter(t => !t.done && t.due >= today && t.due <= weekEndStr)
      .sort((a, b) => a.due.localeCompare(b.due));
    const weekSchedule = u.schedule || [];
    const daysInWeek = [];

    for (let i = 0; i <= 6 - dayOfWeek; i++) {
      const iso = addDaysISO(today, i);
      const dIdx = new Date(iso + 'T00:00:00Z').getUTCDay();
      const classes = weekSchedule.filter(s => +s.day === dIdx);
      if (classes.length) daysInWeek.push({ date: iso, dayIdx: dIdx, count: classes.length });
    }

    if (!weekExams.length && !weekTasks.length && !daysInWeek.length) return;

    let msg = '📅 *خطة الأسبوع الدراسي الجديد*\n';
    msg += `من ${arDate(today)} إلى ${arDate(weekEndStr)}\n\n`;

    if (weekExams.length) {
      msg += '━━━━━━━━━━━━━━━━━\n';
      msg += `📝 *الاختبارات (${weekExams.length}):*\n`;
      weekExams.forEach(e => {
        msg += `• ${arDayShort(e.date)} — ${courseName(u, e.courseId)}\n`;
        msg += `  📌 ${md(e.title)}${e.time ? ' · 🕐 ' + e.time : ''}\n`;
      });
      msg += '\n';
    } else {
      msg += '━━━━━━━━━━━━━━━━━\n';
      msg += '📝 *لا توجد اختبارات مسجلة هذا الأسبوع* 🎉\n\n';
    }

    if (weekTasks.length) {
      msg += '━━━━━━━━━━━━━━━━━\n';
      msg += `✅ *المهام والتسليمات (${weekTasks.length}):*\n`;
      weekTasks.forEach(t => {
        msg += `• ${arDayShort(t.due)} — ${md(t.title)} (${courseName(u, t.courseId)})\n`;
      });
      msg += '\n';
    }

    if (daysInWeek.length) {
      msg += '━━━━━━━━━━━━━━━━━\n';
      msg += '📚 *محاضرات الأسبوع:*\n';
      let totalClasses = 0;
      daysInWeek.forEach(d => {
        msg += `• ${arDayShort(d.date)}: ${d.count} محاضرة\n`;
        totalClasses += d.count;
      });
      msg += `📊 الإجمالي: ${totalClasses} محاضرة\n\n`;
    }

    msg += '━━━━━━━━━━━━━━━━━\n';
    msg += '💪 بداية أسبوع موفقة — فالك المعدل العالي!';

    if (await sendTG(TOKEN, chatId, [msg])) {
      await env.UNI_KV.put(key, '1', { expirationTtl: 8 * 86400 });
      totalSent++;
    }
  });

  return { ok: true, sent: totalSent, today };
}

async function absenceWarning(env, TOKEN) {
  const today = riyadhToday();
  const MAX_PERCENT = 0.25;
  const WARN_THRESHOLD = 18.75;
  let totalSent = 0;

  await eachUser(env, async chatId => {
    const key = `notif_absence_${chatId}_${today}`;
    if (await env.UNI_KV.get(key)) return;
    const u = await getUser(env, chatId);
    const courses = u.courses || [];
    const schedule = u.schedule || [];
    const attendance = u.attendance || [];
    const semesterWeeks = (u.settings && +u.settings.semesterWeeks) || 16;
    if (!courses.length) return;

    const warnings = [];
    for (const c of courses) {
      const courseClasses = schedule.filter(s => s.courseId === c.id);
      const uniqueSlots = new Set();
      courseClasses.forEach(s => uniqueSlots.add(`${s.day}_${s.start}`));
      const daysPerWeek = uniqueSlots.size;
      if (daysPerWeek === 0) continue;

      const totalDays = daysPerWeek * semesterWeeks;
      const absentKeys = new Set();
      attendance.forEach(a => {
        if (a.status !== 'absent' && a.status !== 'excused') return;
        const sch = courseClasses.find(s => s.id === a.classId);
        if (!sch) return;
        absentKeys.add(`${sch.day}_${sch.start}_${a.date}`);
      });

      const absences = absentKeys.size;
      const percent = totalDays > 0 ? (absences / totalDays) * 100 : 0;
      const maxAbsences = Math.floor(totalDays * MAX_PERCENT);
      const remaining = Math.max(0, maxAbsences - absences);

      if (percent >= WARN_THRESHOLD) {
        warnings.push({ course: c, percent, absences, maxAbsences, remaining });
      }
    }

    if (!warnings.length) return;

    let msg = '🚨 *تنبيه مهم: حد الحرمان!*\n\n';
    msg += 'اقتربت من الحد الأقصى للغياب (25%) في المقررات التالية:\n\n';
    warnings.forEach(w => {
      const dangerEmoji = w.percent >= 22 ? '🔴' : w.percent >= 20 ? '🟠' : '🟡';
      msg += `${dangerEmoji} *${md(w.course.name)}*\n`;
      msg += `   ⚠️ نسبة الغياب: ${w.percent.toFixed(2)}%\n`;
      msg += `   📊 السجل: ${w.absences} من أصل ${w.maxAbsences} محاضرات مسموحة\n`;
      msg += `   💡 المتبقي قبل الحرمان: *${w.remaining}* فقط!\n\n`;
    });
    msg += '━━━━━━━━━━━━━━━━━\n';
    msg += '🚫 احرص على الحضور الكامل في المحاضرات القادمة!';

    if (await sendTG(TOKEN, chatId, [msg])) {
      await env.UNI_KV.put(key, '1', { expirationTtl: 86400 });
      totalSent++;
    }
  });

  return { ok: true, sent: totalSent, today };
}

async function weeklySummary(env, TOKEN) {
  const today = riyadhToday();
  const weekStart = addDaysISO(today, -6);
  let totalSent = 0;

  await eachUser(env, async chatId => {
    const key = `notif_weekly_${chatId}_${today}`;
    if (await env.UNI_KV.get(key)) return;
    const u = await getUser(env, chatId);
    if (!hasData(u)) return;

    const w = u.wellness || { sleepGoal: 8, waterGoal: 8, log: [] };
    const weekStudy = (u.studyLog || [])
      .filter(l => l.date >= weekStart && l.date <= today)
      .reduce((a, b) => a + (+b.minutes || 0), 0);
    const weekStudyHours = (weekStudy / 60).toFixed(1);
    const weekTasksDone = (u.tasks || []).filter(t => t.done && t.due >= weekStart && t.due <= today).length;
    const openTasks = (u.tasks || []).filter(t => !t.done).length;
    const weekWater = (w.log || []).filter(l => l.date >= weekStart && l.date <= today);
    const totalWater = weekWater.reduce((a, b) => a + (+b.water || 0), 0);
    const avgWater = weekWater.length ? (totalWater / weekWater.length).toFixed(1) : '0';
    const totalSleep = weekWater.reduce((a, b) => a + (+b.sleep || 0), 0);
    const avgSleep = weekWater.length ? (totalSleep / weekWater.length).toFixed(1) : '0';

    let teethDays = 0;
    for (let i = 0; i < 7; i++) {
      const d = addDaysISO(today, -i);
      const log = ((u.health && u.health.teethLog) || []).find(l => l.date === d);
      if (log && log.morning && log.night) teethDays++;
    }

    let msg = '📊 *حصاد الأسبوع*\n';
    msg += `📅 من ${weekStart} إلى ${today}\n\n`;
    msg += '━━━━━━━━━━━━━━━━━\n';
    msg += '📚 *الإنجاز الدراسي:*\n';
    msg += `⏱️ ساعات المذاكرة: ${weekStudyHours} ساعة\n`;
    msg += `✅ المهام المنجزة: ${weekTasksDone} مهمة\n`;
    msg += `⏳ المهام المتبقية: ${openTasks} مهمة\n\n`;
    msg += '━━━━━━━━━━━━━━━━━\n';
    msg += '💪 *العادات الصحية:*\n';
    msg += `💧 معدل شرب الماء: ${avgWater} كوب/يوم\n`;
    msg += `😴 معدل النوم: ${avgSleep} ساعة/يوم\n`;
    msg += `🦷 التزام الأسنان الكامل: ${teethDays}/7 أيام\n\n`;

    const money = calcMoneyStats(u.money, today);
    if (money) {
      msg += '━━━━━━━━━━━━━━━━━\n';
      msg += '💰 *التقرير المالي:*\n';
      msg += `📊 مصروف الأسبوع: ${money.weekSpent.toLocaleString('ar-EG')} ر.س\n`;
      if (money.addedIncome > 0) {
        msg += `➕ إضافات الرصيد بالدورة: +${money.addedIncome.toLocaleString('ar-EG')} ر.س\n`;
      }
      msg += `📈 المتوسط اليومي: ${money.avgDaily.toLocaleString('ar-EG')} ر.س\n`;
      if (money.topCatName) {
        msg += `🏆 أعلى فئة صرف: ${money.topCatName} (${money.topCatAmount.toLocaleString('ar-EG')} ر.س)\n`;
      }
      if (money.prevWeekSpent > 0) {
        const diff = money.weekSpent - money.prevWeekSpent;
        const diffPct = Math.round((diff / money.prevWeekSpent) * 100);
        if (diff > 0) msg += `⬆️ صرفت ${diffPct}% أكثر من الأسبوع الماضي\n`;
        else if (diff < 0) msg += `⬇️ وفّرت ${Math.abs(diffPct)}% مقارنة بالأسبوع الماضي 🎉\n`;
      }
      msg += `✅ الرصيد المتبقي: ${money.remaining.toLocaleString('ar-EG')} من ${money.totalBudget.toLocaleString('ar-EG')} ر.س\n\n`;
    }

    msg += '━━━━━━━━━━━━━━━━━\n';
    msg += '🌟 إجازة نهاية أسبوع سعيدة!';

    if (await sendTG(TOKEN, chatId, [msg])) {
      await env.UNI_KV.put(key, '1', { expirationTtl: 7 * 86400 });
      totalSent++;
    }
  });

  return { ok: true, sent: totalSent, today };
}

async function checkExamsAndTasks(env, TOKEN) {
  const today = riyadhToday();
  let totalSent = 0;

  await eachUser(env, async chatId => {
    const u = await getUser(env, chatId);
    const msgs = [];
    const keys = [];

    for (const t of (u.tasks || []).filter(t => !t.done && t.due)) {
      const d = daysUntilFrom(t.due, today);
      let stage = null;
      if (d < 0) stage = 'late';
      else if (d === 0) stage = 'today';
      else if (d === 1) stage = 'tomorrow';
      if (!stage) continue;

      const key = `notif_task_${chatId}_${t.id}_stage_${stage}`;
      if (await env.UNI_KV.get(key)) continue;
      const when = stage === 'late' ? '⚠️ *مهمة متأخرة!*' : stage === 'today' ? '🔥 *تسليم اليوم!*' : '⏰ *تسليم غداً*';
      keys.push(key);
      msgs.push(`${when}\n📚 ${courseName(u, t.courseId)}\n📝 ${md(t.title)}`);
    }

    for (const e of (u.exams || []).filter(e => !e.done && e.date)) {
      const d = daysUntilFrom(e.date, today);
      let stage = null;
      let label = '';
      if (d === 0) {
        stage = 'today';
        label = '🔥 *اختبارك اليوم!*';
      } else if (d === 1) {
        stage = '1day';
        label = '⏰ *اختبارك غداً*';
      } else if (d >= 2 && d <= 3) {
        stage = '3days';
        label = `📅 *اختبار بعد ${d} أيام*`;
      } else if (d >= 4 && d <= 7) {
        stage = '7days';
        label = `📅 *اختبار بعد ${d} أيام*`;
      }
      if (!stage) continue;

      const key = `notif_exam_${chatId}_${e.id}_stage_${stage}`;
      if (await env.UNI_KV.get(key)) continue;
      keys.push(key);
      msgs.push(
        `${label}\n📚 ${courseName(u, e.courseId)}\n📌 ${md(e.title)}${e.time ? '\n🕐 ' + e.time : ''}${
          e.place ? '\n📍 ' + md(e.place) : ''
        }`
      );
    }

    if (msgs.length && (await sendTG(TOKEN, chatId, msgs))) {
      for (const k of keys) await env.UNI_KV.put(k, '1', { expirationTtl: 2592000 });
      totalSent += msgs.length;
    }
  });

  return { ok: true, sent: totalSent, today };
}

async function checkClasses(env, TOKEN) {
  const today = riyadhToday();
  const now = riyadhNow();
  const currentDay = now.getUTCDay();
  const currentTime = now.getUTCHours() * 60 + now.getUTCMinutes();
  let sent = 0;

  await eachUser(env, async chatId => {
    const u = await getUser(env, chatId);
    for (const cls of u.schedule || []) {
      if (+cls.day !== currentDay) continue;
      const [ch, cm] = (cls.start || '00:00').split(':').map(Number);
      const diff = currentTime - (ch * 60 + cm);
      if (diff >= 4 && diff <= 9) {
        const key = `notif_class_${chatId}_${cls.id}_${today}`;
        if (await env.UNI_KV.get(key)) continue;
        const buttons = [
          [{ text: '✅ حضرت', callback_data: `att|p|${cls.id}|${today}` }],
          [
            { text: '🟡 بعذر', callback_data: `att|e|${cls.id}|${today}` },
            { text: '🔴 بدون عذر', callback_data: `att|a|${cls.id}|${today}` }
          ],
          [
            { text: '⏰ متأخر', callback_data: `att|l|${cls.id}|${today}` },
            { text: '🚫 ملغي', callback_data: `att|c|${cls.id}|${today}` }
          ]
        ];
        const text =
          `📚 *${courseName(u, cls.courseId)}*\n` +
          `🕐 بدأت الساعة ${cls.start}${cls.room ? '\n📍 ' + md(cls.room) : ''}\n\n` +
          '📋 *سجّل حالة حضورك بضغطة زر:*';
        if (await sendTGWithButtons(TOKEN, chatId, text, buttons)) {
          await env.UNI_KV.put(key, '1', { expirationTtl: 86400 });
          sent++;
        }
      }
    }
  });

  return { ok: true, sent };
}

async function checkSleep(env, TOKEN) {
  const today = riyadhToday();
  let sent = 0;
  await eachUser(env, async chatId => {
    const key = `notif_sleep_${chatId}_${today}`;
    if (await env.UNI_KV.get(key)) return;
    const row = (from, to) => {
      const r = [];
      for (let i = from; i <= to; i++) {
        r.push({ text: i + (i === 1 ? ' ساعة' : ' ساعات'), callback_data: `sleep|${i}|${today}` });
      }
      return r;
    };
    if (
      await sendTGWithButtons(
        TOKEN,
        chatId,
        '😴 *كيف كان نومك الليلة؟*\n\nاضغط على عدد الساعات اللي نمتها لتسجيلها في ملفك الصحي:',
        [row(4, 6), row(7, 9)]
      )
    ) {
      await env.UNI_KV.put(key, '1', { expirationTtl: 86400 });
      sent++;
    }
  });
  return { ok: true, sent };
}

async function checkWater(env, TOKEN) {
  const today = riyadhToday();
  let sent = 0;
  await eachUser(env, async chatId => {
    const key = `notif_water_${chatId}_${today}`;
    if (await env.UNI_KV.get(key)) return;
    const row = (from, to) => {
      const r = [];
      for (let i = from; i <= to; i++) {
        r.push({ text: i + ' 🥤', callback_data: `water|${i}|${today}` });
      }
      return r;
    };
    if (
      await sendTGWithButtons(
        TOKEN,
        chatId,
        '💧 *كم كوب ماء شربت اليوم؟*\n\nاضغط على العدد لتسجيله في متابع الصحة:',
        [row(1, 4), row(5, 8)]
      )
    ) {
      await env.UNI_KV.put(key, '1', { expirationTtl: 86400 });
      sent++;
    }
  });
  return { ok: true, sent };
}

async function handleCallback(env, TOKEN, cq) {
  const chatId = String((cq.from && cq.from.id) || '');
  const data = String(cq.data || '');
  const messageId = cq.message && cq.message.message_id;

  try {
    await fetch('https://api.telegram.org/bot' + TOKEN + '/answerCallbackQuery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: cq.id })
    });
  } catch (e) {}

  if (!chatId || !chatAllowed(env, chatId)) return;

  const userKey = 'user_' + chatId;
  const userExists = await env.UNI_KV.get(userKey);
  if (!userExists) return;

  const u = await getUser(env, chatId);

  const edit = async text => {
    if (!messageId) return;
    try {
      await fetch('https://api.telegram.org/bot' + TOKEN + '/editMessageText', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text,
          parse_mode: 'Markdown'
        })
      });
    } catch (e) {}
  };

  let type = '';
  let arg1 = '';
  let arg2 = '';
  let arg3 = '';

  if (data.includes('|')) {
    const parts = data.split('|');
    type = parts[0];
    arg1 = parts[1];
    arg2 = parts[2];
    arg3 = parts[3];
  } else {
    const attMatch = data.match(/^att_([pealc])_(.+)_(\d{4}-\d{2}-\d{2})$/);
    if (attMatch) {
      type = 'att';
      arg1 = attMatch[1];
      arg2 = attMatch[2];
      arg3 = attMatch[3];
    } else {
      const parts = data.split('_');
      type = parts[0];
      arg1 = parts[1];
      arg2 = parts[2];
    }
  }

  if (type === 'att') {
    const statusInfo = ATT_STATUS[arg1];
    const classId = arg2;
    const date = arg3;
    if (!statusInfo || !ID_RE.test(classId || '') || !DATE_RE.test(date || '')) return;
    await updateAttendance(env, chatId, classId, date, statusInfo.key);
    await edit(
      `📋 *تم تسجيل الحضور بنجاح*\n\n${statusInfo.emoji} الحالة: *${statusInfo.label}*\n📅 التاريخ: ${date}\n\n🔄 تم التحديث تلقائياً في الموقع`
    );
    return;
  }

  const value = parseInt(arg1, 10);
  let today = arg2;
  if (!today || !DATE_RE.test(today)) today = riyadhToday();
  if ((type !== 'sleep' && type !== 'water') || isNaN(value) || value < 0 || value > 30) return;

  let rawUser = {};
  try {
    rawUser = JSON.parse((await env.UNI_KV.get('user_' + chatId)) || '{}');
  } catch (e) {
    rawUser = u;
  }
  if (!rawUser.wellness) rawUser.wellness = { sleepGoal: 8, waterGoal: 8, log: [] };
  if (!Array.isArray(rawUser.wellness.log)) rawUser.wellness.log = [];
  let log = rawUser.wellness.log.find(l => l && l.date === today);
  if (!log) {
    log = { date: today, sleep: 0, water: 0, updatedAt: Date.now() };
    rawUser.wellness.log.push(log);
  }
  delete log.deleted;
  log.updatedAt = Date.now();
  if (type === 'sleep') log.sleep = value;
  else log.water = value;
  rawUser.lastSync = new Date().toISOString();
  await env.UNI_KV.put('user_' + chatId, JSON.stringify(rawUser));

  const emoji = type === 'sleep' ? '😴' : '💧';
  const label = type === 'sleep' ? 'ساعات نومك' : 'أكواب الماء';
  await edit(
    `${emoji} *تم الحفظ بنجاح!*\n\n✅ سجّلت: *${value}* (${label})\n📅 التاريخ: ${today}\n\n🔄 تم التحديث تلقائياً في الموقع`
  );
}

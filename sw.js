/* ============================================================================
   🎓 مُساعد الجامعة — Service Worker (Network-First App Shell + Safe Fallback)
   - استراتيجية Network-First لملفات التطبيق الأساسية (index.html, app.js, styles.css, manifest.json)
   - استراتيجية Cache-First للأصول الثابتة (الأيقونات والخطوط المحلية /icons و /fonts)
   - عدم تخزين طلبات الـ Worker API أبداً
   - دعم التحديث الفوري برسالة SKIP_WAITING من إشعار ("تحديث جديد متاح — أعد التحميل")
   - آلية أمان ضد تعطل التطبيق (Safe Fallback + استثناء الأصول المفقودة عند التثبيت)
   ============================================================================ */

const CACHE_VERSION = 'v2.7.0';
const CACHE_NAME = 'uni-helper-cache-' + CACHE_VERSION;

const CORE_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './state.js',
  './schedule.js',
  './grades.js',
  './money.js',
  './pomodoro.js',
  './sync.js',
  './pin.js',
  './ui.js',
  './ai.js',
  './app.js',
  './manifest.json'
];

const STATIC_ASSETS = [
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './fonts/Cairo-Regular.woff2',
  './fonts/Cairo-SemiBold.woff2',
  './fonts/Cairo-Bold.woff2',
  './fonts/Cairo-ExtraBold.woff2'
];

const WORKER_API_PATHS = new Set([
  '/save',
  '/load',
  '/ai-parse',
  '/poll',
  '/test',
  '/unlink',
  '/pomo-start',
  '/pomo-cancel',
  '/pomo-done',
  '/pomo-status',
  '/get-attendance',
  '/webhook',
  '/debug',
  '/clear-notif',
  '/restore-backup',
  '/setup-webhook'
]);

function isWorkerApiRequest(url) {
  if (url.origin !== self.location.origin) return true;
  if (url.hostname.includes('workers.dev')) return true;
  if (WORKER_API_PATHS.has(url.pathname) || url.pathname.startsWith('/check')) return true;
  return false;
}

function isCoreAppShell(url, request) {
  if (request.mode === 'navigate') return true;
  const p = url.pathname;
  return (
    p === '/' ||
    p.endsWith('/index.html') ||
    p.endsWith('/state.js') ||
    p.endsWith('/schedule.js') ||
    p.endsWith('/grades.js') ||
    p.endsWith('/money.js') ||
    p.endsWith('/pomodoro.js') ||
    p.endsWith('/sync.js') ||
    p.endsWith('/pin.js') ||
    p.endsWith('/ui.js') ||
    p.endsWith('/ai.js') ||
    p.endsWith('/app.js') ||
    p.endsWith('/styles.css') ||
    p.endsWith('/manifest.json')
  );
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      // تخزين كل ملف بشكل مستقل عبر allSettled حتى لا يفشل التثبيت إذا فُقدت أيقونة أو خط
      const allAssets = [...CORE_ASSETS, ...STATIC_ASSETS];
      await Promise.allSettled(
        allAssets.map(async assetUrl => {
          try {
            const res = await fetch(assetUrl, { cache: 'reload' });
            if (res && res.ok) {
              await cache.put(assetUrl, res);
            }
          } catch (_) {}
        })
      );
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k.startsWith('uni-helper'))
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (!event.data) return;
  if (event.data === 'SKIP_WAITING' || event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try {
    url = new URL(req.url);
  } catch (_) {
    return;
  }

  // عدم تخزين طلبات الـ Worker API أو النطاقات الخارجية أبداً
  if (isWorkerApiRequest(url)) return;

  // 1) Network-First لملفات التطبيق الأساسية (index.html, app.js, styles.css, manifest.json)
  if (isCoreAppShell(url, req)) {
    event.respondWith(
      fetch(req)
        .then(networkRes => {
          if (networkRes && networkRes.status === 200 && networkRes.type === 'basic') {
            const copy = networkRes.clone();
            caches.open(CACHE_NAME).then(c => c.put(req, copy)).catch(() => {});
          }
          return networkRes;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          if (cached) return cached;
          if (req.mode === 'navigate') {
            const fallbackDoc = (await caches.match('./index.html')) || (await caches.match('./'));
            if (fallbackDoc) return fallbackDoc;
            return new Response(
              '<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>مُساعد الجامعة</title></head><body style="font-family:system-ui,sans-serif;text-align:center;padding:40px"><h2>⚠️ لا يوجد اتصال بالإنترنت</h2><p>تحقق من الاتصال ثم أعد تحميل الصفحة.</p><button onclick="location.reload()" style="padding:10px 20px;border-radius:8px;cursor:pointer">إعادة المحاولة</button></body></html>',
              { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
            );
          }
          return new Response('', { status: 504, statusText: 'Offline' });
        })
    );
    return;
  }

  // 2) Cache-First للأصول الثابتة (الأيقونات والخطوط المحلية)
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req)
        .then(networkRes => {
          if (networkRes && networkRes.status === 200 && networkRes.type === 'basic') {
            const copy = networkRes.clone();
            caches.open(CACHE_NAME).then(c => c.put(req, copy)).catch(() => {});
          }
          return networkRes;
        })
        .catch(() => new Response('', { status: 404, statusText: 'Not Found Offline' }));
    })
  );
});

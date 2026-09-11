/* =========================================================
   برآوردکار — Service Worker  (نصب و اجرای آفلاین روی گوشی)
   سازندهٔ برنامه: سید عبدالمجید افرازی
   شماره تماس و پشتیبانی: 09367343370
   ========================================================= */
const CACHE = 'baravardkar-v2.1.0';

/* فایل‌هایی که برای اجرای آفلاین ذخیره می‌شوند */
const APP_SHELL = [
  './',
  './baravardkar.html',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

/* نصب: پیش‌بارگذاری پوستهٔ برنامه */
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    /* هر فایل را جداگانه می‌گیریم تا نبودِ یک فایل کل نصب را خراب نکند */
    await Promise.all(APP_SHELL.map(async url => {
      try {
        const res = await fetch(new Request(url, { cache: 'reload' }));
        if (res && (res.ok || res.type === 'opaque')) await cache.put(url, res.clone());
      } catch (e) { /* فایل موجود نیست — ادامه بده */ }
    }));
    await self.skipWaiting();
  })());
});

/* فعال‌سازی: پاک‌سازی کش‌های قدیمی */
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    if (self.registration.navigationPreload) {
      try { await self.registration.navigationPreload.disable(); } catch (e) {}
    }
    await self.clients.claim();
  })());
});

/* واکشی: صفحه‌ها شبکه‌اول (با بازگشت به کش)، فایل‌های ثابت کش‌اول */
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  /* درخواست‌های بیرونی (CDN اکسل و ...) دست‌نخورده رد شوند */
  if (url.origin !== self.location.origin) return;

  /* باز شدن خود برنامه */
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put(req, fresh.clone());
        return fresh;
      } catch (e) {
        const cache = await caches.open(CACHE);
        return (await cache.match(req)) ||
               (await cache.match('./baravardkar.html')) ||
               (await cache.match('./index.html')) ||
               (await cache.match('./')) ||
               new Response('<h1 dir="rtl">برآوردکار — حالت آفلاین</h1><p dir="rtl">اتصال اینترنت برقرار نیست و نسخهٔ ذخیره‌شده یافت نشد.</p>',
                 { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      }
    })());
    return;
  }

  /* مانیفست، آیکون‌ها و سایر فایل‌های ثابت */
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req);
    if (hit) {
      /* به‌روزرسانی در پس‌زمینه */
      fetch(req).then(res => { if (res && res.ok) cache.put(req, res.clone()); }).catch(() => {});
      return hit;
    }
    try {
      const res = await fetch(req);
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    } catch (e) {
      return (await cache.match('./baravardkar.html')) || Response.error();
    }
  })());
});

/* پیام از سمت برنامه: فعال‌سازی نسخهٔ جدید */
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

const CACHE_NAME = 'masrofi-cache-v17';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/studio.css',
  './css/theme.css',
  './css/components.css',
  './css/screens.css',
  './css/refresh.css',
  './js/i18n.js',
  './js/data.js',
  './js/config.js',
  './js/api.js',
  './js/icons.js',
  './js/ui.js',
  './js/screen-home.js',
  './js/screen-bills.js',
  './js/screen-family.js',
  './js/screen-insights.js',
  './js/scanner.js',
  './js/app.js',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

let cachedBgAlert = null;

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS)).catch(() => {})
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => key !== CACHE_NAME ? caches.delete(key) : Promise.resolve())
    )).then(() => self.clients.claim())
  );
});

/* Background & Outside-App Notifications Handler */
self.addEventListener('message', event => {
  const data = event.data || {};
  if (data.type === 'SCHEDULE_NOTIFICATION') {
    const delay = Math.max(0, Number(data.delayMs) || 0);
    setTimeout(() => {
      self.registration.showNotification(data.title || 'مصروفي · Masrofi', {
        body: data.body || '',
        icon: './assets/icon-192.png',
        badge: './assets/icon-192.png',
        vibrate: [200, 100, 200],
        tag: 'masrofi-scheduled-' + Date.now(),
        renotify: true
      }).catch(() => {});
    }, delay);
  } else if (data.type === 'SYNC_BG_ALERTS') {
    cachedBgAlert = {
      title: data.title || 'تنبيه الذكاء الاصطناعي لهذا الشهر',
      body: data.body || ''
    };
  } else if (data.type === 'APP_BACKGROUNDED' && cachedBgAlert && data.notifyOnExit) {
    self.registration.showNotification(cachedBgAlert.title, {
      body: cachedBgAlert.body,
      icon: './assets/icon-192.png',
      badge: './assets/icon-192.png',
      vibrate: [200, 100, 200],
      tag: 'masrofi-monthly-ai',
      renotify: false
    }).catch(() => {});
  }
});

self.addEventListener('push', event => {
  let payload = { title: 'مصروفي · Masrofi', body: 'تنبيه جديد من محفظة العائلة' };
  try {
    if (event.data) payload = Object.assign(payload, event.data.json());
  } catch {}
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: './assets/icon-192.png',
      badge: './assets/icon-192.png',
      vibrate: [200, 100, 200],
      tag: 'masrofi-push'
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('./');
    })
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (url.pathname.startsWith('/api')) {
    event.respondWith(
      fetch(event.request).catch(() => new Response(
        JSON.stringify({ error: 'offline', message: 'You are currently offline. Operations queued.' }),
        { headers: { 'Content-Type': 'application/json' }, status: 503 }
      ))
    );
    return;
  }

  if (event.request.method === 'GET') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const toCache = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
        }
        return response;
      }).catch(() => caches.match(event.request).then(cached => {
        if (cached) return cached;
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('./index.html');
        }
      }))
    );
  }
});

const CACHE_NAME = 'masrofi-cache-v1';
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

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // For API endpoints, prefer network, fall back to failure handled by app's localStorage sync
  if (url.pathname.startsWith('/api')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({ error: 'offline', message: 'You are currently offline. Operations queued.' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 503
        });
      })
    );
    return;
  }

  // For static assets, use cache-first strategy with network fallback
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const toCache = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
        return response;
      }).catch(() => {
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('./index.html');
        }
      });
    })
  );
});

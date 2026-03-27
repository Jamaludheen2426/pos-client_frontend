const CACHE_NAME = 'pos-v1';
const STATIC_ASSETS = ['/', '/cashier', '/manager/dashboard'];

// Install: cache core pages
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)),
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

// Fetch: network-first for API, cache-first for static
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API calls — network only, queue offline
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request).catch(() =>
      new Response(JSON.stringify({ offline: true }), {
        headers: { 'Content-Type': 'application/json' },
      }),
    ));
    return;
  }

  // Static — cache first, network fallback
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request)),
  );
});

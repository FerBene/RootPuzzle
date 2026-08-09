const CACHE_NAME = 'raices-static-v1';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/raices-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Network-first strategy with cache fallback for navigation and assets
  event.respondWith(
    fetch(event.request).then((resp) => {
      // Optionally cache same-origin GET responses
      if (event.request.method === 'GET' && resp && resp.type !== 'opaque') {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      }
      return resp;
    }).catch(() => caches.match(event.request).then((r) => r || caches.match('/')))
  );
});

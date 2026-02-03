const CACHE_VERSION = 'gravity-rift-v1';
const ASSETS = [
  './',
  './index.html',
  './gravity-rift.js',
  './manifest.json',
  './icon-192.svg',
  './icon-192-maskable.svg',
  './icon-512.svg',
  './icon-512-maskable.svg',
  './screenshot-1.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key !== CACHE_VERSION)
        .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true })
      .then((cached) => {
        if (cached) {
          return cached;
        }
        return fetch(event.request)
          .then((response) => {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy));
            return response;
          })
          .catch(() => caches.match('./index.html'));
      })
  );
});

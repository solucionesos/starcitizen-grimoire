const CACHE_NAME = 'grimoire-v1';

// Estrategia de Cache: Network falling back to cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});

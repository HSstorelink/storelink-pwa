const CACHE_NAME = 'storelink-shell-v5';
const STATIC_PATHS = ['./', './index.html', './styles.css', './app.js', './manifest.webmanifest', './icon.svg', './version.json'];

function shellUrls() {
  return new Set(STATIC_PATHS.map(p => new URL(p, self.registration.scope).href));
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(STATIC_PATHS);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  url.search = '';
  url.hash = '';
  const isStaticShell = event.request.method === 'GET' && shellUrls().has(url.href);

  if (!isStaticShell) {
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const fresh = await fetch(event.request, { cache: 'no-cache' });
      if (fresh.ok) await cache.put(event.request, fresh.clone());
      return fresh;
    } catch {
      const cached = await cache.match(event.request, { ignoreSearch: true });
      if (cached) return cached;
      throw new Error('network unavailable');
    }
  })());
});

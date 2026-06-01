/* Wedage & Co. — Service Worker
 * Conservative, app-shell caching that NEVER interferes with Firebase/Firestore,
 * authentication, or any cross-origin/API traffic.
 *
 *  - Navigations (HTML)  → network-first, fall back to cached shell when offline.
 *  - Same-origin static  → stale-while-revalidate (instant loads, refresh in bg).
 *  - Everything else     → passed straight through to the network (no caching).
 */
const VERSION = 'wedage-v1';
const SHELL_CACHE = `${VERSION}-shell`;
const ASSET_CACHE = `${VERSION}-assets`;
const SHELL_URLS = ['/', '/index.html', '/manifest.json', '/logo.png.JPEG'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GET requests. All Firebase/Firestore/Storage/API
  // calls are cross-origin and pass through untouched.
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Navigations → network-first with offline shell fallback (keeps SPA routing).
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put('/index.html', copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/index.html'))),
    );
    return;
  }

  // Hashed build assets / images → stale-while-revalidate.
  if (url.pathname.startsWith('/assets/') || /\.(?:js|css|png|jpe?g|svg|woff2?|ico)$/i.test(url.pathname)) {
    event.respondWith(
      caches.open(ASSET_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((res) => { if (res && res.status === 200) cache.put(request, res.clone()); return res; })
          .catch(() => cached);
        return cached || network;
      }),
    );
  }
});

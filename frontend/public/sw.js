// LawTech PWA Service Worker — network-first для HTML, cache-first для статики
const CACHE = 'lawtech-v1';
const STATIC_ASSETS = ['/', '/manifest.json', '/logo.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // API запросы — всегда сеть, не кэшируем
  if (url.pathname.startsWith('/api/')) return;
  // HTML — сеть с откатом на кэш (чтобы новые версии подхватывались)
  if (e.request.mode === 'navigate' || e.request.destination === 'document') {
    e.respondWith(
      fetch(e.request).then(r => { caches.open(CACHE).then(c => c.put(e.request, r.clone())); return r; })
        .catch(() => caches.match(e.request) || caches.match('/'))
    );
    return;
  }
  // Статика (JS/CSS/изображения) — кэш с подкачкой
  if (/\.(js|css|svg|png|jpg|woff2?)$/.test(url.pathname)) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        const fresh = fetch(e.request).then(r => { caches.open(CACHE).then(c => c.put(e.request, r.clone())); return r; }).catch(() => cached);
        return cached || fresh;
      })
    );
  }
});

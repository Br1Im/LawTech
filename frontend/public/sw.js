// LawTech PWA Service Worker v3 — network-first для всего, чтобы пользователь
// никогда не залипал на старом коде. Кэш только как fallback при offline.

const CACHE = 'lawtech-v6';
const STATIC = ['/', '/manifest.json', '/logo.svg', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', e => {
  // Сразу активируем новую версию, не ждём закрытия всех вкладок
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC).catch(()=>{})));
});

self.addEventListener('activate', e => {
  e.waitUntil(Promise.all([
    // Удаляем все старые кэши
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))),
    // Берём контроль над всеми открытыми вкладками
    self.clients.claim(),
  ]));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // API-запросы — всегда network, никакого кэша
  if (req.url.includes('/api/')) return;
  // Всё остальное — network-first с fallback на кэш только при сетевой ошибке
  e.respondWith(
    fetch(req)
      .then(res => {
        // Кладём в кэш свежий ответ (для offline)
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(()=>{});
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});

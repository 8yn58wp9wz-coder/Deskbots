/* BasketWise service worker — lock-screen store list notifications */
const CACHE = 'basketwise-v2';
const ASSETS = ['./', './index.html', './styles.css', './app.js', './data.js', './favicon.svg', './manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/')) return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).catch(() => caches.match('./index.html')))
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data && event.notification.data.url ? event.notification.data.url : './?step=4';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.postMessage({ type: 'open-journey', storeId: event.notification.data && event.notification.data.storeId });
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'notify-store-list') {
    const title = data.title || 'BasketWise';
    const body = data.body || '';
    const tag = data.tag || 'basketwise';
    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        tag,
        renotify: true,
        requireInteraction: true,
        icon: './favicon.svg',
        badge: './favicon.svg',
        data: { url: './?step=4', storeId: data.storeId || null },
      })
    );
  }
});

importScripts('config.js', 'plan.js', 'store.js');

const CACHE = 'hanma-v5';
const ASSETS = [
  './', 'index.html', 'styles.css', 'app.js', 'plan.js', 'store.js', 'config.js', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/badge-96.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Stale-while-revalidate: instant loads (even offline at the gym), quiet updates.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async (cache) => {
    const cached = await cache.match(e.request, { ignoreSearch: true });
    const network = fetch(e.request)
      .then((res) => { if (res.ok) cache.put(e.request, res.clone()); return res; })
      .catch(() => cached);
    return cached || network;
  }));
});

// The push payload only says which reminder it is; the text is built here from
// the person's own settings and logs, which never leave the phone.
self.addEventListener('push', (e) => {
  e.waitUntil((async () => {
    let data = {};
    try { data = e.data ? e.data.json() : {}; } catch { /* plain-text payload */ }
    const type = data.type === 'evening' ? 'evening' : 'morning';
    let msg;
    try {
      const state = await Store.get('state');
      msg = BakiPlan.compose(state, type, new Date());
    } catch {
      msg = { title: 'Hanma Training', body: "Open the app to see today's plan." };
    }
    await self.registration.showNotification(msg.title, {
      body: msg.body,
      icon: 'icons/icon-192.png',
      badge: 'icons/badge-96.png',
      tag: `hanma-${type}`,
      data: { url: './' },
    });
  })());
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (all.length) return all[0].focus();
    return self.clients.openWindow(e.notification.data && e.notification.data.url || './');
  })());
});

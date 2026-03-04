// Haven Service Worker v1.0
// Handles caching for offline support + local notifications

const CACHE_NAME = 'haven-v1';
const CACHE_URLS = [
  '/',
  '/index.html'
];

// =============================================
// INSTALL — cache the app shell
// =============================================
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(CACHE_URLS).catch(() => {
        // Silently fail if some assets can't be cached
      });
    })
  );
  self.skipWaiting();
});

// =============================================
// ACTIVATE — clean up old caches
// =============================================
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// =============================================
// FETCH — serve from cache, fallback to network
// =============================================
self.addEventListener('fetch', event => {
  // Only handle same-origin requests
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        // Cache successful GET responses
        if (event.request.method === 'GET' && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback — return cached index
        if (event.request.mode === 'navigate') {
          return caches.match('/') || caches.match('/index.html');
        }
      });
    })
  );
});

// =============================================
// PUSH NOTIFICATIONS — handle incoming pushes
// =============================================
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Haven 💙';
  const options = {
    body: data.body || "I'm here whenever you need me. How are you feeling today?",
    icon: 'https://i.postimg.cc/sDzXqtd4/0BB7B8D1-A256-4C29-ABD6-EDF54E16C825-1-201-a.jpg',
    badge: 'https://i.postimg.cc/sDzXqtd4/0BB7B8D1-A256-4C29-ABD6-EDF54E16C825-1-201-a.jpg',
    vibrate: [100, 50, 100],
    data: { url: '/' },
    actions: [
      { action: 'open', title: 'Open Haven' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// =============================================
// NOTIFICATION CLICK — open the app
// =============================================
self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // If app is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});

// =============================================
// MESSAGE — handle messages from the main app
// =============================================
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SCHEDULE_REMINDER') {
    // Schedule a local notification after a delay
    const delay = event.data.delay || 86400000; // default 24 hours
    const messages = [
      { title: 'Haven 💙', body: "I'm here whenever you need me. How are you feeling today?" },
      { title: 'Haven 🌿', body: "Just checking in. You don't have to face things alone." },
      { title: 'Haven ✨', body: "Remember — it's okay to not be okay. I'm always here." },
      { title: 'Haven 🌙', body: "How did today go? I'd love to hear about it." },
      { title: 'Haven 🌅', body: "A new day, a fresh start. How are you feeling this morning?" }
    ];
    const msg = messages[Math.floor(Math.random() * messages.length)];

    setTimeout(() => {
      self.registration.showNotification(msg.title, {
        body: msg.body,
        icon: 'https://i.postimg.cc/sDzXqtd4/0BB7B8D1-A256-4C29-ABD6-EDF54E16C825-1-201-a.jpg',
        badge: 'https://i.postimg.cc/sDzXqtd4/0BB7B8D1-A256-4C29-ABD6-EDF54E16C825-1-201-a.jpg',
        vibrate: [100, 50, 100],
        tag: 'haven-reminder',
        renotify: true,
        data: { url: '/' }
      });
    }, delay);
  }
});

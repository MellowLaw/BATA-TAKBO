// Service Worker — Bata, Takbo!
// Network-first strategy — always serve fresh assets, cache only as offline fallback

const CACHE_NAME = 'bata-takbo-v8';

// Install — activate immediately, no pre-caching
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate — wipe ALL old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// Fetch
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Bypass Vite development/HMR hot-reloads and WebSockets
  if (
    url.pathname.includes('/@vite/') ||
    url.pathname.includes('/@id/') ||
    url.pathname.includes('hot-update') ||
    url.search.includes('vite') ||
    event.request.headers.get('Upgrade') === 'websocket'
  ) return;

  // Bypass API and local backend routes — always fetch live
  if (['/auth', '/api', '/leaderboard', '/admin', '/health'].some(p => url.pathname.startsWith(p))) return;

  // Media files (audio/video) range request support
  const isMedia = url.pathname.endsWith('.mp3') || url.pathname.endsWith('.mp4');
  if (isMedia) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(event.request).then(cached => {
          if (cached) return cached;
          return fetch(event.request).then(response => {
            if (response.status === 200) {
              cache.put(event.request, response.clone());
            }
            return response;
          }).catch(() => caches.match(event.request));
        })
      )
    );
    return;
  }

  // HTML pages — network first (always get latest app shell)
  if (url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Assets (images, fonts, JS, CSS) — stale-while-revalidate:
  // Serve cache instantly for speed, fetch fresh in background to update cache.
  // On cache miss, fetch from network normally.
  event.respondWith(
    caches.open(CACHE_NAME).then(cache =>
      cache.match(event.request).then(cached => {
        const fetchPromise = fetch(event.request).then(response => {
          if (response && response.status === 200) {
            cache.put(event.request, response.clone());
          }
          return response;
        });
        // Return cached instantly if available, otherwise wait for network
        return cached || fetchPromise;
      })
    )
  );
});

// Push Notifications listener
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Bata, Takbo!', body: event.data.text() };
    }
  }

  const title = data.title || 'Bata, Takbo!';
  const options = {
    body: data.body || 'New game update available!',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click listener
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const targetUrl = event.notification.data?.url || '/';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing open tab if available
        for (const client of clientList) {
          if (client.url.includes(targetUrl) && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});

// Service Worker — Bata, Takbo!
// Network-first strategy — always serve fresh assets, cache only as offline fallback

const CACHE_NAME = 'bata-takbo-v9';

// Define core static assets to pre-cache on install for immediate offline playability
const STATIC_ASSETS = [
  // App Shell & Manifests
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icons.svg',
  '/icons/icon-32.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',

  // Font Assets
  '/assets/fonts/Alphabet Minus Eighty.ttf',
  '/assets/fonts/DirtyHarold.ttf',
  '/assets/fonts/GigaSaturn.ttf',
  '/assets/fonts/VCRosdNEUE.ttf',

  // Core UI Backgrounds & Layout Components
  '/assets/ui/backgrounds/landscape_orientation.png',
  '/assets/ui/backgrounds/left_panel.png',
  '/assets/ui/backgrounds/chapterselect_background.png',
  '/assets/ui/backgrounds/settings_background.png',
  
  // Game Play Field and UI Grids
  '/assets/ui/game-ui/grid.png',
  '/assets/ui/game-ui/grid-second-bg.png',
  '/assets/ui/game-ui/boss-frame.png',
  '/assets/ui/game-ui/red_tile.png',

  // PWA & Guest Tutorials
  '/assets/ui/tutorials/tuts1.png',
  '/assets/ui/tutorials/tuts2.png',
  '/assets/ui/tutorials/tuts3.png',
  '/assets/ui/tutorials/tuts4.png',

  // Player Characters Spritesheets
  '/assets/entity/player/female/Idle/Idle_Down.png',
  '/assets/entity/player/female/Idle/Idle_Up.png',
  '/assets/entity/player/female/Idle/Idle_Left_Down.png',
  '/assets/entity/player/female/Idle/Idle_Right_Down.png',
  '/assets/entity/player/female/Dash/Dash_Down.png',
  '/assets/entity/player/female/Dash/Dash_Up.png',
  '/assets/entity/player/female/Dash/Dash_Left_Down.png',
  '/assets/entity/player/female/Dash/Dash_Right_Down.png',

  '/assets/entity/player/male/idle/idle_down.png',
  '/assets/entity/player/male/idle/idle_up.png',
  '/assets/entity/player/male/idle/idle_left.png',
  '/assets/entity/player/male/idle/idle_right.png',
  '/assets/entity/player/male/dash/dash-down.png',
  '/assets/entity/player/male/dash/dash-up.png',
  '/assets/entity/player/male/dash/dash-left-down.png',
  '/assets/entity/player/male/dash/dash-right-down.png',

  // Chapter 1 & Endless Boss (Manananggal) Sprites
  '/assets/entity/boss/chapter1/chapter-1-idle-sprite.png',
  '/assets/entity/boss/chapter1/chapter-1-attack-sprite.png',

  // Projectiles & Shared Assets
  '/assets/projectiles/shared/monster-hand.png',
  '/assets/projectiles/shared/monster-finger.png',
  '/assets/projectiles/shared/monster-feet.png',
  '/assets/projectiles/shared/heart.png',
  '/assets/projectiles/shared/brain.png',
  '/assets/fx/moving_hit1.png',
  '/assets/projectiles/chapter-1/ultimate/attack.png',
  '/assets/projectiles/chapter-1/ultimate/loop.png',
  '/assets/projectiles/chapter-1/ultimate/end.png',
  '/assets/projectiles/chapter-1/eye/eyeball.png',
  '/assets/fx/eye_explosion.png',
  '/assets/projectiles/chapter-1/hands-1.png',
  '/assets/projectiles/chapter-1/hand-2.png',
  '/assets/projectiles/chapter-1/hand-3.png',
  '/assets/projectiles/chapter-1/blood_chem.png',

  // Soundtracks
  '/assets/audio/menu_bg_music.mp3',
  '/assets/audio/chapter-1-bg.mp3',
  '/assets/audio/chapter1_ultimate.mp3',

  // Core SFX
  '/assets/audio/sd/DSGNMisc_INTERFACE-Zap Select_HY_PC-001.ogg',
  '/assets/audio/sd/UIClick_INTERFACE-Positive Click_HY_PC-001.ogg',
  '/assets/audio/sd/DSGNMisc_MOVEMENT-Jump Sparkle_HY_PC-001.ogg',
  '/assets/audio/sd/DSGNMisc_HIT-Hit Noise_HY_PC-001.ogg',
  '/assets/audio/sd/FEETMisc_STEP-Boots on Generic Ground 2_HY_PC-001.ogg',
  '/assets/audio/sd/FEETMisc_STEP-Boots on Generic Ground 2_HY_PC-002.ogg',
  '/assets/audio/sd/FEETMisc_STEP-Boots on Generic Ground 2_HY_PC-003.ogg',
  '/assets/audio/sd/FEETMisc_STEP-Boots on Generic Ground 2_HY_PC-004.ogg',
  '/assets/audio/sd/FEETMisc_STEP-Boots on Generic Ground 2_HY_PC-005.ogg',
  '/assets/audio/sd/FEETMisc_STEP-Boots on Generic Ground 2_HY_PC-006.ogg',
  '/assets/audio/sd/DSGNTonl_MELEE-Sword Critical_HY_PC-001.ogg',
  '/assets/audio/sd/DSGNTonl_SKILL RELEASE-Transformizer_HY_PC-002.ogg',
  '/assets/audio/sd/DSGNImpt_EXPLOSION-Bit Bomb_HY_PC-002.ogg',
  '/assets/audio/sd/DSGNImpt_EXPLOSION-Cruncher_HY_PC-001.ogg',
  '/assets/audio/sd/DSGNImpt_EXPLOSION-Crunching_HY_PC-001.ogg',
  '/assets/audio/sd/DSGNMisc_HIT-Gore Pierce_HY_PC-001.ogg',
  '/assets/audio/sd/DSGNMisc_SKILL IMPACT-Crunchy Burst_HY_PC-001.ogg',
  '/assets/audio/sd/DSGNImpt_MELEE-Hollow Punch_HY_PC-001.ogg',
  '/assets/audio/sd/DSGNMisc_CAST-Slime Ball_HY_PC-001.ogg',
  '/assets/audio/sd/DSGNImpt_EXPLOSION-Thud_HY_PC-001.ogg',
  '/assets/audio/sd/DSGNMisc_CAST-Slime Ball_HY_PC-002.ogg',
  '/assets/audio/sd/DSGNMisc_PROJECTILE-Water Bolt_HY_PC-005.ogg',
  '/assets/audio/sd/DSGNMisc_MOVEMENT-Whoosh Sweep_HY_PC-001.ogg',
  '/assets/audio/sd/DSGNImpt_EXPLOSION-Crunching_HY_PC-005.ogg',
  '/assets/audio/sd/DSGNMisc_MOVEMENT-Watery Laser_HY_PC-003.ogg',
  '/assets/audio/sd/DSGNMisc_MOVEMENT-Mecha Large Takeoff_HY_PC-001.ogg',
  '/assets/audio/sd/DSGNMisc_MOVEMENT-Noise Sweeper_HY_PC-001.ogg',
  '/assets/audio/sd/MAGAngl_BUFF-Buff Drop_HY_PC-001.ogg',
  '/assets/audio/sd/DSGNSynth_BUFF-Bubbly Buff_HY_PC-003.ogg',
  '/assets/audio/sd/DSGNSynth_BUFF-Bonus Max Shield_HY_PC-001.ogg',
  '/assets/audio/sd/DSGNSynth_BUFF-Bonus Max Shield_HY_PC-003.ogg'
];

// Dynamically generate blood splat and dark blood projectile frames
// Dark blood: 15 frames (1_0.png to 1_14.png)
const darkBlood = Array.from({ length: 15 }, (_, i) => `/assets/projectiles/chapter-1/dark-blood/1_${i}.png`);
// Blood splat: 60 frames (1_000.png to 1_059.png)
const bloodSplat = Array.from({ length: 60 }, (_, i) => `/assets/projectiles/chapter-1/blood-splat/1_${String(i).padStart(3, '0')}.png`);

const ASSETS_TO_CACHE = STATIC_ASSETS.concat(darkBlood, bloodSplat);

// Install — pre-cache core resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Pre-caching core game assets...');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate — wipe older caches securely
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              console.log('[Service Worker] Deleting obsolete cache:', key);
              return caches.delete(key);
            }
          })
        );
      })
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
        if (cached) {
          // Serve cached asset immediately, revalidate silently in background
          fetch(event.request)
            .then(response => {
              if (response && response.status === 200) {
                cache.put(event.request, response.clone());
              }
            })
            .catch(() => {
              // Gracefully handle background fetch failures when offline (prevent console noise)
            });
          return cached;
        }

        // On cache miss, perform standard network request
        return fetch(event.request).then(response => {
          if (response && response.status === 200) {
            cache.put(event.request, response.clone());
          }
          return response;
        });
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

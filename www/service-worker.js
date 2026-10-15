const CACHE_NAME = 'floaty-shooter-v3';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './game.js',
  './data.js',
  './store.js',
  './music/background.mp3',
  './music/1stplane.ogg',
  './music/anime_crash.ogg',
  './music/anime_fire.ogg',
  './music/shooter_destoyed.ogg',
  './icon.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting(); // Activate immediately
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  // Delete old caches
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Network-first for code files, cache-first for assets
  const url = event.request.url;
  if (url.endsWith('.js') || url.endsWith('.html') || url.endsWith('.css')) {
    // Network first — always get fresh code
    event.respondWith(
      fetch(event.request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      }).catch(() => caches.match(event.request))
    );
  } else {
    // Cache first for audio, images, etc.
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});

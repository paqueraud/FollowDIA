const CACHE_NAME = 'followdia-v1';
const ASSETS = [
    './',
    './index.html',
    './css/app.css',
    './js/app.js',
    './foods.json',
    './manifest.json',
    './version.json',
    './js/vendor/qrcode-generator.js',
    './js/vendor/jsQR.min.js'
];

// Install: cache all essential assets
self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Activate: clean old caches
self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

// Fetch: network-first for API calls, cache-first for app assets
self.addEventListener('fetch', e => {
    const url = new URL(e.request.url);

    // Tout ce qui est externe (Nightscout, GitHub, myDiabby, Anthropic)
    // n'est jamais mis en cache : l'application ne sert que ses propres fichiers.
    if (url.hostname !== location.hostname) return;

    // version.json: always network-first to detect updates
    if (url.pathname.endsWith('version.json')) {
        e.respondWith(
            fetch(e.request).catch(() => caches.match(e.request))
        );
        return;
    }

    // App assets: cache-first, fallback to network and update cache
    e.respondWith(
        caches.match(e.request).then(cached => {
            const fetchPromise = fetch(e.request).then(response => {
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
                }
                return response;
            }).catch(() => cached);

            return cached || fetchPromise;
        })
    );
});

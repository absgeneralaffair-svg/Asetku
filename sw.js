/**
 * AsetKu — Service Worker
 * PWA offline support + caching
 */

const CACHE_NAME = 'asetku-v7';
const STATIC_ASSETS = [
    './',
    './index.html',
    './style.css?v=7',
    './app.js?v=7',
    './firebase-config.js',
    './firebase-sync.js',
    './manifest.json',
];

const CDN_ASSETS = [
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js',
    'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js',
    'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js',
];

// ── INSTALL: cache all static assets ─────────────────────────
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            // Cache local assets first (these must succeed)
            return cache.addAll(STATIC_ASSETS).then(() => {
                // Cache CDN assets individually (allow failures)
                return Promise.allSettled(
                    CDN_ASSETS.map(url =>
                        cache.add(url).catch(err =>
                            console.warn('[SW] CDN cache skip:', url, err.message)
                        )
                    )
                );
            });
        }).then(() => self.skipWaiting())
    );
});

// ── ACTIVATE: cleanup old caches ─────────────────────────────
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            )
        ).then(() => self.clients.claim())
    );
});

// ── FETCH: network-first for navigation, cache-first for assets ─
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // Skip Firebase/Firestore API calls (let them go direct to network)
    if (url.hostname.includes('firestore') ||
        url.hostname.includes('firebase') ||
        url.hostname.includes('googleapis.com') && url.pathname.includes('/firestore/')) {
        return;
    }

    // For navigation (HTML pages): Network-first
    if (request.mode === 'navigate' || request.destination === 'document') {
        event.respondWith(
            fetch(request)
                .then(response => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
                    return response;
                })
                .catch(() => caches.match(request).then(r => r || caches.match('./index.html')))
        );
        return;
    }

    // For static assets: Cache-first, then network
    event.respondWith(
        caches.match(request).then(cached => {
            if (cached) return cached;
            return fetch(request).then(response => {
                // Cache successful responses
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
                }
                return response;
            }).catch(() => {
                // Offline fallback for fonts
                if (request.destination === 'font') {
                    return new Response('', { status: 200, statusText: 'Offline' });
                }
            });
        })
    );
});

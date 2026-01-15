// FILE: service-worker.js

/*
    Service Worker
    ----------------
    Purpose:
    - Enable offline-capable PWA shell
    - Cache static assets deterministically
    - Avoid aggressive runtime caching of camera streams or dynamic data
    - Fail safely: app must continue to function without SW support

    Design principles:
    - Cache-first for static assets
    - Network fallback for everything else
    - No background sync or push (not required for camera app)
*/

const CACHE_VERSION = 'pro-camera-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;

/*
    Only cache assets that are:
    - Immutable
    - Required for initial render
    - Safe to serve offline
*/
const STATIC_ASSETS = [
    './',
    './index.html',
    './manifest.json',

    // CSS
    './css/base.css',
    './css/camera.css',
    './css/sliders.css',
    './css/animations.css',

    // JS
    './js/app.js',
    './js/camera.js',
    './js/constraints.js',
    './js/filters.js',
    './js/lut-engine.js',
    './js/capture.js',
    './js/gallery.js',
    './js/ui.js',

    // Icons (best-effort; missing icons must not break install)
    './assets/icons/icon-192.png',
    './assets/icons/icon-512.png'
];

/* ================================
   INSTALL
   ================================ */
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );

    // Activate immediately; no need to wait
    self.skipWaiting();
});

/* ================================
   ACTIVATE
   ================================ */
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== STATIC_CACHE) {
                        return caches.delete(key);
                    }
                })
            );
        })
    );

    self.clients.claim();
});

/* ================================
   FETCH
   ================================ */
self.addEventListener('fetch', (event) => {
    const request = event.request;

    // Only handle GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Do NOT interfere with media streams or camera-related requests
    if (
        request.url.startsWith('blob:') ||
        request.destination === 'video' ||
        request.destination === 'audio'
    ) {
        return;
    }

    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(request).catch(() => {
                // Offline fallback strategy:
                // If navigation fails, return cached shell
                if (request.mode === 'navigate') {
                    return caches.match('./index.html');
                }

                return null;
            });
        })
    );
});

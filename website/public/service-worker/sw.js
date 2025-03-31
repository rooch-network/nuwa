const CACHE_NAME = 'nuwa-cache-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.webmanifest',
    '/nuwa-icon-192x192.png',
    '/nuwa-icon-512x512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
}); 
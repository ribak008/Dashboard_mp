const CACHE_NAME = 'logistica-pwa-v1';
const urlsToCache = [
    './',
    './index.html',
    './styles.css',
    './app.js'
];

self.addEventListener('install', event => {
    self.skipWaiting(); // Forza al SW a activarse inmediatamente
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', event => {
    // Solo interceptamos peticiones de nuestro propio dominio.
    // Evitamos interceptar llamadas a la API de Google u otros dominios externos.
    if (!event.request.url.startsWith(self.location.origin) || event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(clients.claim()); // Toma el control de las ventanas abiertas inmediatamente
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

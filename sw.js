/* Portal LOGE - Service Worker
 *
 * Estrategia: "stale-while-revalidate" para la app shell.
 * - Cuando el usuario abre la app, le servimos lo que tenemos cacheado (rápido, funciona offline).
 * - En paralelo, vamos a buscar la versión más nueva y actualizamos el caché.
 * - En la próxima apertura, ya ve la versión nueva.
 *
 * Para forzar refresco cuando publiques cambios grandes, subí el número de CACHE_VERSION.
 */

const CACHE_VERSION = 'loge-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Solo GET y mismo origen
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req).then((networkRes) => {
        // Cachear copia si la respuesta fue OK
        if (networkRes && networkRes.status === 200 && networkRes.type === 'basic') {
          const copy = networkRes.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
        }
        return networkRes;
      }).catch(() => cached);

      // Stale-while-revalidate
      return cached || fetchPromise;
    })
  );
});

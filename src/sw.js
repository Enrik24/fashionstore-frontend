/*
 * [EXAMEN-2] Service Worker manual de la PWA (RF-006).
 *
 * El proyecto no tiene instalado `@angular/service-worker`, por lo que este
 * archivo implementa el equivalente del `ngsw-config.json`:
 *  - precarga del shell de la aplicación,
 *  - cache-first para estáticos del mismo origen,
 *  - network-first con respaldo en caché para `/api/v1/public/**`,
 *  - navegación offline hacia el shell (la app decide si muestra `/offline/acceso`).
 *
 * Los datos autenticados de negocio NO se cachean aquí: viven cifrados en
 * IndexedDB (ver `core/offline/indexed-db.service.ts`).
 */
const CACHE_VERSION = 'fashionstore-v1';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const ASSETS_CACHE = `${CACHE_VERSION}-assets`;
const PUBLIC_API_CACHE = `${CACHE_VERSION}-public-api`;

const SHELL_URLS = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/manifest.webmanifest',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  '/assets/icons/icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => !key.startsWith(CACHE_VERSION)).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Nunca cachear autenticación ni endpoints de negocio.
  if (url.pathname.startsWith('/api/v1/auth') || url.pathname.startsWith('/api/v1/offline')) {
    return;
  }

  if (url.pathname.startsWith('/api/v1/public/')) {
    event.respondWith(networkFirst(request, PUBLIC_API_CACHE));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (url.pathname.startsWith('/assets/') || /\.(css|js|png|jpg|jpeg|svg|webp|woff2?|ttf|ico)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request, ASSETS_CACHE));
  }
});

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(SHELL_CACHE);
    cache.put('/index.html', response.clone());
    return response;
  } catch {
    const cache = await caches.open(SHELL_CACHE);
    return (await cache.match('/index.html')) || (await cache.match('/')) || Response.error();
  }
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response(
      JSON.stringify({ detail: 'Sin conexión y sin datos en caché.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}

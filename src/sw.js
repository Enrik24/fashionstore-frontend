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
const CACHE_VERSION = 'fashionstore-v2';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const ASSETS_CACHE = `${CACHE_VERSION}-assets`;
const PUBLIC_API_CACHE = `${CACHE_VERSION}-public-api`;
// La llena CU05 (offline-catalog.service) con las imágenes de los productos.
const IMAGES_CACHE = `${CACHE_VERSION}-imagenes`;

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
  event.waitUntil((async () => {
    const shell = await caches.open(SHELL_CACHE);
    await precacheLista(shell, SHELL_URLS);
    // [EXAMEN-2] Precache de todos los chunks (incluidos los lazy) para que
    // cualquier ruta cargue offline aunque nunca se haya visitado con conexión.
    const assets = await caches.open(ASSETS_CACHE);
    await precacheLista(assets, await obtenerManifiesto());
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((key) => !key.startsWith(CACHE_VERSION)).map((key) => caches.delete(key))
    );
    // Purga chunks de builds anteriores; solo si hay manifiesto (nunca offline).
    const urls = new Set(await obtenerManifiesto());
    if (urls.size > 0) {
      const assets = await caches.open(ASSETS_CACHE);
      const peticiones = await assets.keys();
      await Promise.all(peticiones.map((req) => {
        const path = new URL(req.url).pathname;
        const esBuild = /\.(js|css)$/.test(path) && !path.startsWith('/assets/');
        return esBuild && !urls.has(path) ? assets.delete(req) : Promise.resolve();
      }));
    }
    await self.clients.claim();
  })());
});

/** Manifiesto generado por scripts/generate-sw-precache.mjs (postbuild). */
async function obtenerManifiesto() {
  try {
    const res = await fetch('/sw-precache.json', { cache: 'no-store' });
    if (!res.ok) return [];
    const lista = await res.json();
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

/** cache.add individual: un asset faltante no rompe la instalación completa. */
async function precacheLista(cache, urls) {
  await Promise.allSettled(urls.map((url) => cache.add(url)));
}

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Imágenes de productos (Cloudinary u otro origen): cache-first contra el
  // cache que llena la descarga CU05; sin esto nunca se ven sin conexión.
  if (url.origin !== self.location.origin) {
    if (request.destination === 'image') {
      event.respondWith(cacheFirstImagen(request));
    }
    return;
  }

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

async function cacheFirstImagen(request) {
  const cache = await caches.open(IMAGES_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    // CORS para poder cachear sin el padding de cuota de las opaque responses.
    const response = await fetch(request.url, { mode: 'cors' });
    if (response.ok) {
      cache.put(request.url, response.clone());
    }
    return response;
  } catch {
    try {
      return await fetch(request);
    } catch {
      return Response.error();
    }
  }
}

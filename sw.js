// IdentScan Service Worker
// Version bump = neuer Cache-Name = erzwungenes Update auf allen Geräten.
const CACHE_VERSION = "v4";
const CACHE_NAME = "identscan-" + CACHE_VERSION;

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/icon-512-maskable.png",
  "./assets/JsBarcode.all.min.js",
  "./assets/deu.traineddata",
  "./assets/tesseract/tesseract.min.js",
  "./assets/tesseract/worker.min.js",
  "./assets/tesseract/tesseract-core-lstm.wasm.js",
  "./assets/tesseract/tesseract-core-lstm.wasm",
  "./assets/tesseract/tesseract-core-simd-lstm.wasm.js",
  "./assets/tesseract/tesseract-core-simd-lstm.wasm",
  "./assets/tesseract/tesseract-core-relaxedsimd-lstm.wasm.js",
  "./assets/tesseract/tesseract-core-relaxedsimd-lstm.wasm"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((n) => n.startsWith("identscan-") && n !== CACHE_NAME)
          .map((n) => caches.delete(n))
      )
    ).then(() => self.clients.claim())
  );
});

// Strategy:
// - Precached large/static assets (tesseract, jsbarcode, traineddata, icons): cache-first (they never change per version).
// - index.html / manifest: network-first with cache fallback, so a fresh deploy is picked up when online,
//   but the app still opens offline from cache.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const isAppShell = url.pathname.endsWith("/index.html") || url.pathname.endsWith("/") || url.pathname.endsWith("manifest.json");

  if (isAppShell) {
    event.respondWith(
      fetch(req, { cache: "no-store" })
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return res;
      });
    })
  );
});

// Allows the page to force-activate a waiting new version immediately (see index.html).
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

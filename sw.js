const CACHE = "qr-scanner-v4";

const REQUIRED_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
];

const OPTIONAL_ASSETS = [
  "./icon-192.png",
  "./icon-512.png",
  "./favicon-32.png",
  "./html5-qrcode.min.js",  // present only if manually downloaded
];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(async cache => {
      // Required assets — if these fail, something is genuinely wrong
      await cache.addAll(REQUIRED_ASSETS);

      // Optional assets — cache each one individually; ignore failures
      await Promise.allSettled(
        OPTIONAL_ASSETS.map(url =>
          cache.add(url).catch(() => {/* missing or fetch failed — skip */})
        )
      );
    })
  );
});

// Activate: delete old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first for shell, network-first for CDN
self.addEventListener("fetch", event => {
  const url = event.request.url;

  // Network-first for external CDN resources
  if (url.includes("unpkg.com") || url.includes("cdnjs")) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for all other assets
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});

const CACHE_VERSION = "chatnest-pwa-v1";
const APP_SHELL_CACHE = `${CACHE_VERSION}-app-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const APP_SHELL_ASSETS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/favicon.svg",
  "/favicon.ico",
  "/pwa-192.png",
  "/pwa-512.png",
  "/pwa-512-maskable.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then(async (cache) => {
      await cache.addAll(APP_SHELL_ASSETS);
      await self.skipWaiting();
    }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => ![APP_SHELL_CACHE, RUNTIME_CACHE].includes(name))
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

function isCacheableRequest(requestUrl) {
  const { origin, pathname } = new URL(requestUrl);

  if (origin !== self.location.origin) return false;
  if (pathname.startsWith("/api")) return false;
  if (pathname.includes("/hub")) return false;

  return true;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;
  if (!isCacheableRequest(request.url)) return;

  // SPA navigation fallback
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(request);
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put("/index.html", networkResponse.clone());
          return networkResponse;
        } catch {
          return (
            (await caches.match(request)) ||
            (await caches.match("/index.html")) ||
            Response.error()
          );
        }
      })(),
    );
    return;
  }

  // Static asset strategy: cache first, then network fallback/update
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) {
        event.waitUntil(
          fetch(request)
            .then(async (response) => {
              if (response && response.ok) {
                const cache = await caches.open(RUNTIME_CACHE);
                await cache.put(request, response.clone());
              }
            })
            .catch(() => {}),
        );
        return cached;
      }

      const networkResponse = await fetch(request);
      if (networkResponse && networkResponse.ok) {
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })(),
  );
});

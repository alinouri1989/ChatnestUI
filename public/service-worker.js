const CACHE_VERSION = "chatnest-pwa-v2.0.3";
const APP_SHELL_CACHE = `${CACHE_VERSION}-app-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;

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
    (async () => {
      await self.skipWaiting();
      const cache = await caches.open(APP_SHELL_CACHE);
      await cache.addAll(APP_SHELL_ASSETS);
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => ![APP_SHELL_CACHE, RUNTIME_CACHE, IMAGE_CACHE].includes(name))
          .map((name) => caches.delete(name))
      );

      await self.clients.claim();

      const clients = await self.self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      clients.forEach((client) => {
        client.postMessage({
          type: "SERVICE_WORKER_ACTIVATED",
          version: CACHE_VERSION,
        });
      });
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    event.waitUntil(self.skipWaiting());
  }

  if (event.data?.type === "GET_VERSION") {
    event.source?.postMessage({
      type: "SERVICE_WORKER_VERSION",
      version: CACHE_VERSION,
    });
  }
});

function isMessageImage(url) {
  return url.includes("/api/media/messages/") || url.includes("/api/media/profiles/") || url.includes("/api/media/groups");
}

function isCacheableStatic(url) {
  const { origin, pathname } = new URL(url);
  if (origin !== self.location.origin) return false;
  if (pathname === "/service-worker.js") return false;
  if (pathname === "/index.html") return false;
  if (pathname.includes("/hub")) return false;
  return true;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  // Message and profile images: cache first.
  if (isMessageImage(request.url)) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;

        try {
          const response = await fetch(request);
          if (response && response.ok) {
            cache.put(request, response.clone());
          }
          return response;
        } catch {
          return cached || Response.error();
        }
      })
    );
    return;
  }

  // SPA navigations: network first, cached shell fallback.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          if (response.ok) {
            const cache = await caches.open(RUNTIME_CACHE);
            cache.put("/index.html", response.clone());
          }
          return response;
        } catch {
          return (await caches.match("/index.html")) || Response.error();
        }
      })()
    );
    return;
  }

  // Static assets: stale while revalidate.
  if (isCacheableStatic(request.url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(RUNTIME_CACHE);
        const cached = await cache.match(request);
        if (cached) {
          event.waitUntil(
            fetch(request).then((response) => {
              if (response.ok) cache.put(request, response.clone());
            })
          );
          return cached;
        }

        try {
          const response = await fetch(request);
          if (response.ok) cache.put(request, response.clone());
          return response;
        } catch {
          return cached || Response.error();
        }
      })()
    );
  }
});

self.addEventListener("push", (event) => {
  if (!event.data) {
    return;
  }

  const payload = (() => {
    try {
      return event.data.json();
    } catch {
      return { notification: { title: "ChatNest", body: event.data.text() } };
    }
  })();

  const notification = payload.notification || {};
  const data = payload.data || {};
  const title = notification.title || data.title || "ChatNest";
  const body = notification.body || data.body || "New message";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: notification.icon || "/pwa-192.png",
      badge: notification.badge || "/pwa-192.png",
      data,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const chatId = event.notification.data?.chatId;
  const targetUrl = chatId ? `/chats/${chatId}` : "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      return self.clients.openWindow(targetUrl);
    })
  );
});

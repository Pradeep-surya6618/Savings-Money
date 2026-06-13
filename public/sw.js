const VERSION = "v1";
const CACHE = `fufi-shell-${VERSION}`;
const PRECACHE = ["/offline", "/Icons/icon-192.png", "/Icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // never touch mutations / Server Actions

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // same-origin only

  // App-shell navigations: network-first, fall back to the cached offline page.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/offline")));
    return;
  }

  // Hashed static assets + icons: cache-first (content-hashed → safe forever).
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/Icons/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
            return res;
          }),
      ),
    );
    return;
  }

  // Everything else (data, APIs, auth): straight to network, never cached.
});

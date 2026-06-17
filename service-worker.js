const CACHE_NAME = "ceo-de-bolso-ai-functional-v1";
const CORE_ASSETS = [
  "/",
  "/index.html",
  "/app.html",
  "/blog.html",
  "/privacy.html",
  "/terms.html",
  "/styles.css?v=1",
  "/firebase.js?v=1",
  "/app.js?v=1",
  "/assets/logo.svg",
  "/manifest.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/api/") || event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).catch(() => caches.match("/index.html")))
  );
});

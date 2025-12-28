/* Viral Link — simple PWA cache (safe + stable) */
const CACHE = "viral-link-cache-v1";
const CORE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./sw.js",
  "./assets/intro.mp4",
  "./assets/intro.webm"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // cacheCore: try-add (ignore missing assets)
    await cache.addAll(CORE.filter(x => !x.includes("assets/intro")));
    for (const a of CORE.filter(x => x.includes("assets/intro"))) {
      try { await cache.add(a); } catch(e) {}
    }
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== CACHE) ? caches.delete(k) : null));
    self.clients.claim();
  })());
});

// Network-first for navigation, cache-first for assets
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only same-origin
  if (url.origin !== location.origin) return;

  // Navigation (HTML): network-first, fallback cache
  if (req.mode === "navigate" || (req.headers.get("accept")||"").includes("text/html")) {
    event.respondWith((async () => {
      try{
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put("./index.html", fresh.clone());
        return fresh;
      }catch(e){
        const cached = await caches.match("./index.html");
        return cached || new Response("Offline", {status: 200, headers: {"Content-Type":"text/plain"}});
      }
    })());
    return;
  }

  // Assets: cache-first, fallback network
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try{
      const fresh = await fetch(req);
      const cache = await caches.open(CACHE);
      cache.put(req, fresh.clone());
      return fresh;
    }catch(e){
      return new Response("", {status: 504});
    }
  })());
});

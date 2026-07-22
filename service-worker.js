/* Service worker: cache app shell for offline install. GitHub API always goes to network. */

const CACHE_NAME = "choreo-og-shell-v3";
const SHELL_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./config.js",
  "./githubApi.js",
  "./dataStore.js",
  "./validation.js",
  "./cryptoUtils.js",
  "./exportJson.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never cache GitHub API — always network
  if (url.hostname === "api.github.com") {
    event.respondWith(fetch(request));
    return;
  }

  if (request.method !== "GET") {
    return;
  }

  // Network-first for app files so UI updates show up after deploy/refresh.
  // Fall back to cache when offline.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200 && response.type === "basic") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

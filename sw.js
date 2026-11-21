/* =====================================================
   XIDATA LENME - SERVICE WORKER (PWA)
   - Réseau d'abord pour tes fichiers : tes modifications
     apparaissent tout de suite quand tu es en ligne.
   - Sans connexion : le jeu s'ouvre depuis le cache.
   - Firebase (jeu en ligne) n'est jamais mis en cache.
   Change VERSION si tu veux forcer un nettoyage du cache.
   ===================================================== */

const VERSION = "v1";
const CACHE = "xidata-lenme-" + VERSION;

// Fichiers préchargés à l'installation. Un fichier introuvable
// est simplement ignoré (il sera mis en cache à sa première utilisation).
const CORE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./style.css",
  "./african-theme.css",
  "./themes.css",
  "./home.css",
  "./home-v2.css",
  "./settings.css",
  "./firebase.js",
  "./sounds.js",
  "./settings.js",
  "./pwa.js",
  "./game.js",
  "./online.js",
  "./SHARED/shared-loader.js",
  "./SHARED/cauris.js",
  "./SHARED/wallet.js",
  "./SHARED/shop.js",
  "./SHARED/ai-engine.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.allSettled(
      CORE.map(url => cache.add(new Request(url, { cache: "reload" })))
    );
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(
      names
        .filter(name => name.startsWith("xidata-lenme-") && name !== CACHE)
        .map(name => caches.delete(name))
    );
    await self.clients.claim();
  })());
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);

  try {
    const response = await Promise.race([
      fetch(new Request(request, { cache: "no-cache" })),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 6000))
    ]);

    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;

    if (request.mode === "navigate") {
      const page = (await cache.match("./index.html")) || (await cache.match("./"));
      if (page) return page;
    }
    throw error;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && (response.ok || response.type === "opaque")) {
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;
  const firebaseSdk =
    url.hostname === "www.gstatic.com" && url.pathname.startsWith("/firebasejs/");

  // Tout le reste (base de données Firebase, etc.) passe directement.
  if (!sameOrigin && !firebaseSdk) return;

  event.respondWith(firebaseSdk ? cacheFirst(request) : networkFirst(request));
});

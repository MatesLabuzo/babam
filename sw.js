/*
 * Offline režim webové aplikace: aplikace se uloží do telefonu, takže se v hale
 * bez signálu otevře hned. Seznam souborů a verzi doplní scripts/deploy-web.sh.
 */
const VERSION = '20261124182153';
const PRECACHE = ["/babam/", "/babam/manifest.json", "/babam/icon.png", "/babam/vendor/maplibre-gl.js", "/babam/vendor/maplibre-gl.css", "/babam/vendor/maplibre-contour.js", "/babam/vendor/europe.json", "/babam/_expo/static/js/web/[id]-000a313ea34e101d4f9156e0df7bac5c.js", "/babam/_expo/static/js/web/[id]-0db14bdd629f1a85358efa23a998d5e0.js", "/babam/_expo/static/js/web/[id]-4c4e74ec392d7bf8699825fb2a87c806.js", "/babam/_expo/static/js/web/[id]-8e426415c48e9360c8e82981e5618a7d.js", "/babam/_expo/static/js/web/[id]-9b6f6b3a41a3554c8456a039d79b3bc0.js", "/babam/_expo/static/js/web/[id]-a0ca1fb013429da721358adf0170c736.js", "/babam/_expo/static/js/web/[id]-a820f037ba3793d1172e6caa1ee1fc2b.js", "/babam/_expo/static/js/web/[id]-f98f5e3600f710e8d23ad289530443e9.js", "/babam/_expo/static/js/web/__common-f094466dc537984f18b9bded790e158d.js", "/babam/_expo/static/js/web/__expo-metro-runtime-ed4c1cfa6193d76fc294130e42bd1916.js", "/babam/_expo/static/js/web/_layout-6239eec15f158c0dd5f833bc6307ab7d.js", "/babam/_expo/static/js/web/_layout-85bfd1ed18d87ab98cb1006bc2f4ba71.js", "/babam/_expo/static/js/web/add-9c0d2845d0df7db86ff8661582d92868.js", "/babam/_expo/static/js/web/entry-f1a81c8e6dc0efa9eb26939036888d7c.js", "/babam/_expo/static/js/web/friends-128e01ecbcfc439fde565c3d408b8a2b.js", "/babam/_expo/static/js/web/gyms-ca6a95c4e22085b5bab27d7147e14759.js", "/babam/_expo/static/js/web/hikes-838e22e65548dc0b50b1aa9c94bbc4ee.js", "/babam/_expo/static/js/web/hikes-map-49410ef4d72d02c433b317c6b13f4bed.js", "/babam/_expo/static/js/web/index-cf685af9e84d1c0b5714614d1b051120.js", "/babam/_expo/static/js/web/new-242452a70514e1405dc523b33b1a5e17.js", "/babam/_expo/static/js/web/new-cb580f443499179f7a708ff6fee0c56d.js", "/babam/_expo/static/js/web/privacy-28c3f19ca1d64ea68c4ed0f0bc25aec9.js", "/babam/_expo/static/js/web/profile-e7e836961d1f4d398a59ca2fd84244c0.js", "/babam/_expo/static/js/web/profile-edit-7a7f4dd799d4874fe8e9b7c176d0fa10.js", "/babam/_expo/static/js/web/rekap-2b75eef8ac2e24d4a1b26c3b3ec7c0a2.js", "/babam/_expo/static/js/web/scan-952d19c35a184a2341477ad97532eb21.js", "/babam/_expo/static/js/web/search-5d0f57104ed5b4605449542a733f2450.js", "/babam/_expo/static/js/web/welcome-0610a7350530d93fa19db07a5557a804.js"];
const CACHE = `boulder-${VERSION}`;
const SCOPE = new URL(self.registration.scope).pathname; // „/babam/“

// Mapová data (výšky, trasy) se ukládají zvlášť a přežijí i aktualizaci aplikace.
const TILE_CACHE = 'maptiles-v1';
const MAP_HOSTS = ['s3.amazonaws.com', 'tile.waymarkedtrails.org'];
const MAX_TILES = 4000;
let puts = 0;

async function mapTile(req) {
  const cache = await caches.open(TILE_CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) {
    cache.put(req, res.clone());
    if (++puts % 100 === 0) {
      // nejstarší dlaždice pryč, ať mapa nezabere v telefonu moc místa
      const keys = await cache.keys();
      if (keys.length > MAX_TILES) await Promise.all(keys.slice(0, keys.length - MAX_TILES).map((k) => cache.delete(k)));
    }
  }
  return res;
}

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('boulder-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method === 'GET' && MAP_HOSTS.includes(url.hostname)) {
    e.respondWith(mapTile(req));
    return;
  }
  if (req.method !== 'GET' || url.origin !== location.origin || !url.pathname.startsWith(SCOPE)) return;

  // Stránky: nejdřív síť (ať je vidět nová verze), bez signálu uložená aplikace.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(SCOPE, copy));
          return res;
        })
        .catch(() => caches.match(SCOPE)),
    );
    return;
  }

  // Ostatní soubory (skripty, písma, knihovna pro sken): z telefonu, jinak stáhnout a uložit.
  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});

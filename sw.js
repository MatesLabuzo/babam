/*
 * Offline režim webové aplikace: aplikace se uloží do telefonu, takže se v hale
 * bez signálu otevře hned. Seznam souborů a verzi doplní scripts/deploy-web.sh.
 */
const VERSION = '20261126113159';
const PRECACHE = ["/babam/", "/babam/manifest.json", "/babam/icon.png", "/babam/vendor/maplibre-gl.js", "/babam/vendor/maplibre-gl.css", "/babam/vendor/maplibre-contour.js", "/babam/vendor/europe.json", "/babam/_expo/static/js/web/[id]-1a93cc57e485b67b98fcf7d4f0e5472a.js", "/babam/_expo/static/js/web/[id]-3ccceed5f1501590daf661c2e3f9914c.js", "/babam/_expo/static/js/web/[id]-4104bb6bc92534c64de8bcacc88a3949.js", "/babam/_expo/static/js/web/[id]-ace6fd594cba236be7260ff4a44f1a52.js", "/babam/_expo/static/js/web/[id]-b16359ba6b21390010292533adb8fe7e.js", "/babam/_expo/static/js/web/[id]-d9c8f67a155c414c2d2ccc9e9bc69ec7.js", "/babam/_expo/static/js/web/[id]-f8dd0faa58ae5a128b93ec740902e5c3.js", "/babam/_expo/static/js/web/[id]-fbd2aa0e375aeb6cd76c51da3334337e.js", "/babam/_expo/static/js/web/__common-c866711abb5237a7fd125935b66e2229.js", "/babam/_expo/static/js/web/__expo-metro-runtime-ed4c1cfa6193d76fc294130e42bd1916.js", "/babam/_expo/static/js/web/_layout-175d951b6453be237fdc4e71bf373c7f.js", "/babam/_expo/static/js/web/_layout-ab1dfd948aa9db19a1558737749d8bf0.js", "/babam/_expo/static/js/web/add-437f09e4c180e3b38b4387c54a485bce.js", "/babam/_expo/static/js/web/entry-bbb53a332eddd3099d9192afdf66d01a.js", "/babam/_expo/static/js/web/friends-88be0e152f39916193e4b7abe35595b5.js", "/babam/_expo/static/js/web/gyms-c6ee026af1b0621e7ca5fa5370e8ee44.js", "/babam/_expo/static/js/web/hikes-cdde144cf2b27c85dbaeb531283f02dd.js", "/babam/_expo/static/js/web/hikes-map-b01828b3e03e4605a9b27d09144de647.js", "/babam/_expo/static/js/web/index-6dfdeeb68e1b5b9956e333038668e686.js", "/babam/_expo/static/js/web/map3d-c17d29941ffbb3d7b776e0f6b626919c.js", "/babam/_expo/static/js/web/new-9abab74e596dc81f0b3c481eb6ca7106.js", "/babam/_expo/static/js/web/new-a9b8f40f9bab46e866b856a913cc2732.js", "/babam/_expo/static/js/web/privacy-5fa9e0837e191a98a8800de58da94036.js", "/babam/_expo/static/js/web/profile-e4ff00c06358c7f2bfe06393d12ab120.js", "/babam/_expo/static/js/web/profile-edit-5e980bd5f3b121ea0a3881c3233da706.js", "/babam/_expo/static/js/web/rekap-3d53155e50122119c9ddf3e80711b009.js", "/babam/_expo/static/js/web/scan-19ba8393a3a322adb161fdc893c640b6.js", "/babam/_expo/static/js/web/search-8cc0b6ff7157e4cf0a055aa1cbcb9ce5.js", "/babam/_expo/static/js/web/welcome-a0a72acedc9416e8a47c53e4c67697ea.js"];
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

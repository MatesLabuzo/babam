/*
 * Offline režim webové aplikace: aplikace se uloží do telefonu, takže se v hale
 * bez signálu otevře hned. Seznam souborů a verzi doplní scripts/deploy-web.sh.
 */
const VERSION = '20261124184247';
const PRECACHE = ["/babam/", "/babam/manifest.json", "/babam/icon.png", "/babam/vendor/maplibre-gl.js", "/babam/vendor/maplibre-gl.css", "/babam/vendor/maplibre-contour.js", "/babam/vendor/europe.json", "/babam/_expo/static/js/web/[id]-101ac8aa08afeb46da9c5916ff3900b9.js", "/babam/_expo/static/js/web/[id]-227a29bc4885132e091ceaedb7385d01.js", "/babam/_expo/static/js/web/[id]-3ccceed5f1501590daf661c2e3f9914c.js", "/babam/_expo/static/js/web/[id]-838a555cca2e67cb307daf386b690f06.js", "/babam/_expo/static/js/web/[id]-ace6fd594cba236be7260ff4a44f1a52.js", "/babam/_expo/static/js/web/[id]-b47c2c65ebb7f64eccf6cc85d924242e.js", "/babam/_expo/static/js/web/[id]-e35356d550eeef90cc5d41dc97137d4a.js", "/babam/_expo/static/js/web/[id]-f8dd0faa58ae5a128b93ec740902e5c3.js", "/babam/_expo/static/js/web/__common-4ab9f4f625d1b480926c00262a7e980e.js", "/babam/_expo/static/js/web/__expo-metro-runtime-ed4c1cfa6193d76fc294130e42bd1916.js", "/babam/_expo/static/js/web/_layout-175d951b6453be237fdc4e71bf373c7f.js", "/babam/_expo/static/js/web/_layout-8656387c1f0b7c90cb832cf7b34b02d5.js", "/babam/_expo/static/js/web/add-437f09e4c180e3b38b4387c54a485bce.js", "/babam/_expo/static/js/web/entry-60e992ebeb0e73b187b0d34da03c4ea6.js", "/babam/_expo/static/js/web/friends-88be0e152f39916193e4b7abe35595b5.js", "/babam/_expo/static/js/web/gyms-e25b2f6648f630d722866216991de1b2.js", "/babam/_expo/static/js/web/hikes-cdde144cf2b27c85dbaeb531283f02dd.js", "/babam/_expo/static/js/web/hikes-map-4766ffed8b7e988a816e2f7299be019c.js", "/babam/_expo/static/js/web/index-6dfdeeb68e1b5b9956e333038668e686.js", "/babam/_expo/static/js/web/map3d-ce920ff4b07fa85c38e8086bec0cfcdc.js", "/babam/_expo/static/js/web/new-a9b8f40f9bab46e866b856a913cc2732.js", "/babam/_expo/static/js/web/new-ce8be76b530825821e80f6c289e54783.js", "/babam/_expo/static/js/web/privacy-5fa9e0837e191a98a8800de58da94036.js", "/babam/_expo/static/js/web/profile-e4ff00c06358c7f2bfe06393d12ab120.js", "/babam/_expo/static/js/web/profile-edit-5e980bd5f3b121ea0a3881c3233da706.js", "/babam/_expo/static/js/web/rekap-3d53155e50122119c9ddf3e80711b009.js", "/babam/_expo/static/js/web/scan-126b2112fbf7957d0715cbfbcad6d3b3.js", "/babam/_expo/static/js/web/search-8cc0b6ff7157e4cf0a055aa1cbcb9ce5.js", "/babam/_expo/static/js/web/welcome-3dc4a1f7cd057679c74d65d33cb190f0.js"];
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

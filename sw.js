/*
 * Offline režim webové aplikace: aplikace se uloží do telefonu, takže se v hale
 * bez signálu otevře hned. Seznam souborů a verzi doplní scripts/deploy-web.sh.
 */
const VERSION = '20261124170110';
const PRECACHE = ["/babam/", "/babam/manifest.json", "/babam/icon.png", "/babam/_expo/static/js/web/[id]-28a64d2172c9e7c409723ae2955053ea.js", "/babam/_expo/static/js/web/[id]-342258e58813bcf063f0fd66f06767c9.js", "/babam/_expo/static/js/web/[id]-36e3cac061912da7109d026d1ed45bd0.js", "/babam/_expo/static/js/web/[id]-8dea341aca8f368c425d857fd53f1a52.js", "/babam/_expo/static/js/web/[id]-8e5c91cac5e90f1e10941570c4965118.js", "/babam/_expo/static/js/web/[id]-987731856555c9875a6cffde5711dcb5.js", "/babam/_expo/static/js/web/[id]-a85b1da1c8c9b9bbf962c37fcc42fa90.js", "/babam/_expo/static/js/web/[id]-c856ea138025e137f65e4cdac18cdcb1.js", "/babam/_expo/static/js/web/__common-4b4d638852d9ef023a68e42bb29093a0.js", "/babam/_expo/static/js/web/__expo-metro-runtime-ed4c1cfa6193d76fc294130e42bd1916.js", "/babam/_expo/static/js/web/_layout-6239eec15f158c0dd5f833bc6307ab7d.js", "/babam/_expo/static/js/web/_layout-bd8f8f68d0bb6a4e056289d743e0cc88.js", "/babam/_expo/static/js/web/add-9c0d2845d0df7db86ff8661582d92868.js", "/babam/_expo/static/js/web/entry-3b3b2d94b8522a5085a211dc8f116a0a.js", "/babam/_expo/static/js/web/friends-b97c61783194ffce96cb27b095ea6716.js", "/babam/_expo/static/js/web/gyms-ca6a95c4e22085b5bab27d7147e14759.js", "/babam/_expo/static/js/web/hikes-7fd4f6904e6f24d8de3d9e67ae51601c.js", "/babam/_expo/static/js/web/hikes-map-845347216dd67035efd609cdd719a99b.js", "/babam/_expo/static/js/web/index-ce51b99b2758013ed813e5d57abcec21.js", "/babam/_expo/static/js/web/new-196d752ac2cb7dc12ff9520c8c0c5f8f.js", "/babam/_expo/static/js/web/new-2e65ecd94123bce1a1714310693f0deb.js", "/babam/_expo/static/js/web/privacy-eecfc44d557175b9133b1ce1a062a1af.js", "/babam/_expo/static/js/web/profile-96bf3826b17d7d84f6bc12b165a92ed1.js", "/babam/_expo/static/js/web/profile-edit-fa6997c4a31f799a68f78da156a7e604.js", "/babam/_expo/static/js/web/rekap-babd9a34522b5fce4a1eb2a3d8bb99d7.js", "/babam/_expo/static/js/web/scan-022ac03c9776a7fb4ad4bd1173198487.js", "/babam/_expo/static/js/web/search-5372bae6b5e2e3d26eb27e16822b9ad6.js", "/babam/_expo/static/js/web/welcome-80da73f4cbf9d9b04d78b5ed074d0197.js"];
const CACHE = `boulder-${VERSION}`;
const SCOPE = new URL(self.registration.scope).pathname; // „/babam/“

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

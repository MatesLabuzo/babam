/*
 * Offline režim webové aplikace: aplikace se uloží do telefonu, takže se v hale
 * bez signálu otevře hned. Seznam souborů a verzi doplní scripts/deploy-web.sh.
 */
const VERSION = '20261124151505';
const PRECACHE = ["/babam/", "/babam/manifest.json", "/babam/icon.png", "/babam/_expo/static/js/web/[id]-86674aed41c3221273575f6f30e5b3ec.js", "/babam/_expo/static/js/web/[id]-9709cc59de526d1d1022971a5d1499b4.js", "/babam/_expo/static/js/web/[id]-a2cc13fe15002e130c803b05add6f70c.js", "/babam/_expo/static/js/web/[id]-a31a4d75df7c10c396e4baed72eac4c3.js", "/babam/_expo/static/js/web/[id]-c3afa4dfbbcb413546becee0e58c848f.js", "/babam/_expo/static/js/web/[id]-f2246e9de735762b857f050f5efe0ee4.js", "/babam/_expo/static/js/web/[id]-ff5f6d49096649fd8a5c38f573b020d6.js", "/babam/_expo/static/js/web/__common-da9d4a4c6b3c4a416094b7d68aa1dceb.js", "/babam/_expo/static/js/web/__expo-metro-runtime-ed4c1cfa6193d76fc294130e42bd1916.js", "/babam/_expo/static/js/web/_layout-4471cac58041000e5d23d07e04be8224.js", "/babam/_expo/static/js/web/_layout-49b02d47042344f65176371b052f13d6.js", "/babam/_expo/static/js/web/add-b9c60f15eec2249da41135d9e4bb675b.js", "/babam/_expo/static/js/web/entry-9e615df26837ed2c3b38a0bf6159720f.js", "/babam/_expo/static/js/web/friends-16953628fc460ef3f51dd66e8987217e.js", "/babam/_expo/static/js/web/gyms-34857c2e45fe0c6581935a551a1f90b0.js", "/babam/_expo/static/js/web/hikes-c3d7497046fddb7fb84c7dbe13fc0e74.js", "/babam/_expo/static/js/web/hikes-map-1f4b7b3f640416a1bcadca7250e62bb5.js", "/babam/_expo/static/js/web/index-cb2374b6dba5ea6ced1d9a3c608a97f8.js", "/babam/_expo/static/js/web/new-b53bb771a3a1f32e060029f6bf31f6ea.js", "/babam/_expo/static/js/web/privacy-862d1b872b15f4db2a9b64980d13674c.js", "/babam/_expo/static/js/web/profile-3b021e3047d659134097ef7865c5d16d.js", "/babam/_expo/static/js/web/profile-edit-dd2087961b237d7e3ad1a755aa7e409a.js", "/babam/_expo/static/js/web/rekap-98edf87e9754176b7518d8b1efdda79c.js", "/babam/_expo/static/js/web/scan-aabd26484bfa09f8aba810b1e4369b86.js", "/babam/_expo/static/js/web/search-584679b075d03cdf2335cc19d05fffe2.js", "/babam/_expo/static/js/web/welcome-a5fdcdd3e1ddd9740f8ce654a77d816e.js"];
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

/*
 * Offline režim webové aplikace: aplikace se uloží do telefonu, takže se v hale
 * bez signálu otevře hned. Seznam souborů a verzi doplní scripts/deploy-web.sh.
 */
const VERSION = '20261124144659';
const PRECACHE = ["/babam/", "/babam/manifest.json", "/babam/icon.png", "/babam/_expo/static/js/web/[id]-16a074f0b936deeda36b3aaf1a0eec31.js", "/babam/_expo/static/js/web/[id]-1e5eb2eae72bace27150916f09d3c190.js", "/babam/_expo/static/js/web/[id]-33995d3f9a9ef0900ce2137b94c50fb2.js", "/babam/_expo/static/js/web/[id]-4f15e065f86b4d0f60919f6ce86e1081.js", "/babam/_expo/static/js/web/[id]-60d167d6f84ed415cf1351e9c54ff00f.js", "/babam/_expo/static/js/web/[id]-ef87bff7736ecbdf7722f33c36719d83.js", "/babam/_expo/static/js/web/__common-4dbe1d2b7d722b20a28dd35d7f067d25.js", "/babam/_expo/static/js/web/__expo-metro-runtime-ed4c1cfa6193d76fc294130e42bd1916.js", "/babam/_expo/static/js/web/_layout-395cabdf9c8cb2ee9ce8d381e03fca10.js", "/babam/_expo/static/js/web/_layout-fda41c211f17f6e2e3d5931bc4d62dce.js", "/babam/_expo/static/js/web/add-98071f3156c013aeaa9aa3caabd93411.js", "/babam/_expo/static/js/web/entry-3ae3611711a04a956a400f2c3acdcfed.js", "/babam/_expo/static/js/web/gyms-b0fc41d54dbf6fb8d9f9422f231e1a0d.js", "/babam/_expo/static/js/web/hikes-1832595fdb13fa3a65d9a88f4c58c080.js", "/babam/_expo/static/js/web/index-0d0a180b5f30b43b38d126899149faee.js", "/babam/_expo/static/js/web/new-f9ac278f1444a593ba73587c0ac65dc3.js", "/babam/_expo/static/js/web/privacy-776ee8e2f11b5cb9f10e0c0140497707.js", "/babam/_expo/static/js/web/profile-4e4d11a0272bcfe570576a3f8c9421d0.js", "/babam/_expo/static/js/web/profile-edit-2c8aba3f5f9a9b86bae9fa021f095c3d.js", "/babam/_expo/static/js/web/scan-df4a37c8be64938894cfdf48a8235fab.js", "/babam/_expo/static/js/web/search-0bd14b0f985c5dd538e53d053204c3c4.js", "/babam/_expo/static/js/web/welcome-8dbde107cc161512d4a815fddd706874.js", "/babam/_expo/static/js/web/wrapped-e7a25532198a11e9dbc436b83fd90381.js"];
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

/*
 * Offline režim webové aplikace: aplikace se uloží do telefonu, takže se v hale
 * bez signálu otevře hned. Seznam souborů a verzi doplní scripts/deploy-web.sh.
 */
const VERSION = '20261124142135';
const PRECACHE = ["/babam/", "/babam/manifest.json", "/babam/icon.png", "/babam/_expo/static/js/web/[id]-2e714b08449ba64403ca73dcf3c7ab1e.js", "/babam/_expo/static/js/web/[id]-5af1637442b84c87835fe89c0f026779.js", "/babam/_expo/static/js/web/[id]-708261e8a9b1cb4cd888b9525c3d72d6.js", "/babam/_expo/static/js/web/[id]-f856cca6dd2b7005a9f7278a1b44fa07.js", "/babam/_expo/static/js/web/[id]-fa589436da46357b2aee393125ab4c09.js", "/babam/_expo/static/js/web/__common-571e074efc81e7bdb7290a1bafad4b80.js", "/babam/_expo/static/js/web/__expo-metro-runtime-ed4c1cfa6193d76fc294130e42bd1916.js", "/babam/_expo/static/js/web/_layout-061dfe5ccd765a3a8624e40e48a2adb1.js", "/babam/_expo/static/js/web/_layout-cbf99897b2b1e58cf04595fad41cc1d8.js", "/babam/_expo/static/js/web/add-7216cbee189c86379a4f6be9dcecef30.js", "/babam/_expo/static/js/web/entry-a51aa40f87d644589287bb7f2d68a048.js", "/babam/_expo/static/js/web/gyms-58a75b1ed203d255c26f8919d3e0d795.js", "/babam/_expo/static/js/web/hikes-60431a5c9beaa8a4527ff8a88926a75a.js", "/babam/_expo/static/js/web/index-4b8be1fbf3c090a38b72ca1099ed0d59.js", "/babam/_expo/static/js/web/new-48c0300ff6a806dea32e1121dedf5d03.js", "/babam/_expo/static/js/web/profile-f8aa268b66261b5931e8bd80887196cd.js", "/babam/_expo/static/js/web/scan-e2a212bd5624e12f3288227006aaab09.js", "/babam/_expo/static/js/web/search-c1ccfce57fc760cd1ea8ed7d5fcb887a.js", "/babam/_expo/static/js/web/welcome-13f33c543da260e82ab1e5561c9ace63.js"];
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

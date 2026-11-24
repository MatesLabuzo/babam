/*
 * Offline režim webové aplikace: aplikace se uloží do telefonu, takže se v hale
 * bez signálu otevře hned. Seznam souborů a verzi doplní scripts/deploy-web.sh.
 */
const VERSION = '20261124143830';
const PRECACHE = ["/babam/", "/babam/manifest.json", "/babam/icon.png", "/babam/_expo/static/js/web/[id]-0b13b6895acea6e111ff069656146602.js", "/babam/_expo/static/js/web/[id]-8774a396cfa7a5cce500e4db90b7b03b.js", "/babam/_expo/static/js/web/[id]-acacd1370698a8307879906700d86e48.js", "/babam/_expo/static/js/web/[id]-c0fdae27cd26d7f3f025cdd9dcc527a3.js", "/babam/_expo/static/js/web/[id]-c7cc6c417ab2012d520608f3b44344df.js", "/babam/_expo/static/js/web/__common-5c6b5e510b2021d6e16f85f5a136d6e4.js", "/babam/_expo/static/js/web/__expo-metro-runtime-ed4c1cfa6193d76fc294130e42bd1916.js", "/babam/_expo/static/js/web/_layout-5520a1ec87203f6fec744521e0d10aca.js", "/babam/_expo/static/js/web/_layout-6b75d17a6584205b312bdb0d2eab7614.js", "/babam/_expo/static/js/web/add-2e1663ad325701786a5cc5d8e9651f20.js", "/babam/_expo/static/js/web/entry-58727d450180dd8c5a466a2ef186e0d1.js", "/babam/_expo/static/js/web/gyms-14c03205f6f3838b135168f84259c4ad.js", "/babam/_expo/static/js/web/hikes-f9f33781787c17798d1f4a4559b8b142.js", "/babam/_expo/static/js/web/index-7a461a2a855a9f0b1bfe6043046867eb.js", "/babam/_expo/static/js/web/new-7abad777babfe6268e46bf3de2e2f122.js", "/babam/_expo/static/js/web/profile-3883f093b51c8bd8f816f4a9200d0ed9.js", "/babam/_expo/static/js/web/profile-edit-c9c18569a9313395ebea6f66f1f3fac6.js", "/babam/_expo/static/js/web/scan-4af4a3f2affcbcfe7315bb44fd4be8a8.js", "/babam/_expo/static/js/web/search-1e0a4736d1f8ed7f63f8186508d7cde6.js", "/babam/_expo/static/js/web/welcome-dbf882911c9e1747751379d813f8c8fd.js"];
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

// Garde l'app ouvrable sans réseau (utile dans les allées où ça ne capte pas).
const CACHE = 'lepanier-v2-0';
const FICHIERS = ['./', './index.html', './app.js', './cuisine.js', './firebase.js', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function (ev) {
  ev.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FICHIERS); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (ev) {
  ev.waitUntil(caches.keys().then(function (cles) {
    return Promise.all(cles.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (ev) {
  const req = ev.request;
  if (req.method !== 'GET') { return; }
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) { return; }

  // Le code de l'app : le réseau d'abord pour recevoir les mises à jour, le cache si hors ligne.
  if (req.mode === 'navigate' || /\.(html|js)$/.test(url.pathname) && !/firebase\.js$/.test(url.pathname)) {
    ev.respondWith(fetch(req).then(function (rep) {
      const copie = rep.clone();
      caches.open(CACHE).then(function (c) { c.put(req.mode === 'navigate' ? './index.html' : req, copie); });
      return rep;
    }).catch(function () {
      return caches.match(req.mode === 'navigate' ? './index.html' : req).then(function (r) { return r || caches.match('./index.html'); });
    }));
    return;
  }

  // Le reste (bibliothèque, icônes) : le cache d'abord.
  ev.respondWith(caches.match(req).then(function (r) {
    return r || fetch(req).then(function (rep) {
      const copie = rep.clone();
      caches.open(CACHE).then(function (c) { c.put(req, copie); });
      return rep;
    });
  }));
});

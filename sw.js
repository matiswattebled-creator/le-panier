// Garde l'app ouvrable sans réseau (utile dans les allées où ça ne capte pas).
const CACHE = 'lepanier-v2-3';
const FICHIERS = ['./', './index.html', './app.js', './cuisine.js', './firebase.js', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function (ev) {
  ev.waitUntil(caches.open(CACHE).then(function (c) {
    // « reload » : on ignore le cache du navigateur pour partir des fichiers à jour.
    return c.addAll(FICHIERS.map(function (f) { return new Request(f, { cache: 'reload' }); }));
  }).then(function () { return self.skipWaiting(); }));
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

  const estCode = req.mode === 'navigate' || (/\.(html|js|webmanifest)$/.test(url.pathname) && !/firebase\.js$/.test(url.pathname));

  // Le code de l'app : le réseau d'abord (en revalidant) pour recevoir les mises à jour, le cache si hors ligne.
  if (estCode) {
    const cle = req.mode === 'navigate' ? './index.html' : url.pathname;
    const aJour = req.mode === 'navigate'
      ? fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' })
      : fetch(new Request(req, { cache: 'no-cache' }));
    ev.respondWith(aJour.then(function (rep) {
      if (rep && rep.ok) {
        const copie = rep.clone();
        caches.open(CACHE).then(function (c) { c.put(cle, copie); });
      }
      return rep;
    }).catch(function () {
      return caches.match(cle).then(function (r) { return r || caches.match('./index.html'); });
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

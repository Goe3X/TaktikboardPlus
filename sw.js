// Offline-Betrieb: alles Nötige einmal ablegen, danach zuerst aus dem Cache liefern.
// VERSION bei jeder Änderung hochzählen — sonst sieht das iPad die alte Fassung.
const VERSION = 'taktikboard-v1';
const DATEIEN = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', ev => {
  ev.waitUntil(
    caches.open(VERSION)
      .then(c => c.addAll(DATEIEN))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', ev => {
  ev.waitUntil(
    caches.keys()
      .then(namen => Promise.all(
        namen.filter(n => n !== VERSION).map(n => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', ev => {
  if (ev.request.method !== 'GET') return;
  ev.respondWith(
    caches.match(ev.request).then(treffer => {
      if (treffer) {
        // Im Hintergrund nach einer neueren Fassung schauen.
        fetch(ev.request)
          .then(antwort => {
            if (antwort && antwort.ok) {
              caches.open(VERSION).then(c => c.put(ev.request, antwort.clone()));
            }
          })
          .catch(() => {});
        return treffer;
      }
      return fetch(ev.request);
    })
  );
});

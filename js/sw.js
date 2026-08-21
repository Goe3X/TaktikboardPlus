// Offline-Betrieb: alles Nötige einmal ablegen, danach zuerst aus dem Cache liefern.
// VERSION bei jeder Änderung hochzählen — sonst sieht das iPad die alte Fassung.
// Und: JEDE neue Datei muss hier in DATEIEN eingetragen werden, sonst
// funktioniert Offline nur halb — und das merkt man erst in der Kabine.
const VERSION = 'taktikboard-v19';
const DATEIEN = [
  './',
  './index.html',
  './stufe1.html',
  './stufe2.html',
  './stufe3.html',
  './stufe4.html',
  './manifest.webmanifest',
  './css/board.css',
  './js/svg.js',
  './js/eisflaeche.js',
  './js/ziehen.js',
  './js/feiern.js',
  './js/offline.js',
  './js/vorschau.js',
  './js/start.js',
  './js/stufe1.js',
  './js/aufgaben1.js',
  './js/stufe2.js',
  './js/situation2.js',
  './js/stufe3.js',
  './js/situation3.js',
  './js/stufe4.js',
  './js/situation4.js',
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

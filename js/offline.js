// Offline-Betrieb. Läuft nur über http(s), beim direkten Öffnen der Datei nicht.
// Wird von jeder Seite eingebunden.

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

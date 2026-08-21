// Startseite. Baut für jede vorhandene Stufe eine Bildkachel.
//
// Neue Stufe freischalten: einen Eintrag in STUFEN ergänzen und die
// passende Vorschau in vorschau.js anlegen. Nur fertige Stufen eintragen —
// ausgegraute Kacheln für später sind für ein Kind reine Frustration.

import { VORSCHAU } from './vorschau.js';

const STUFEN = [
  { datei:'stufe1.html', vorschau:'stufe1', name:'Wo muss ich hinfahren?' },
  { datei:'stufe2.html', vorschau:'stufe2', name:'Wer ist frei?' },
  { datei:'stufe3.html', vorschau:'stufe3', name:'Pass in den freien Raum' }
];

const kacheln = document.getElementById('kacheln');

STUFEN.forEach(s => {
  const a = document.createElement('a');
  a.className = 'kachel';
  a.href = s.datei;
  a.setAttribute('aria-label', s.name);   // fürs Vorlesen, nicht sichtbar
  a.appendChild(VORSCHAU[s.vorschau]());
  kacheln.appendChild(a);
});

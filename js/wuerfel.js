// Der Würfel-Knopf. Bisher waren die fünf Augen fest gemalt — der Würfel
// zeigte also immer dieselbe Zahl, obwohl er sich dreht. Kinder merken das
// sofort. Jetzt bekommt er nach jedem Wurf eine neue Augenzahl.

import { svgEl } from './svg.js';

// Augenpositionen im 48×48-Feld
const L = 15, M = 24, R = 33;
const AUGEN = {
  1: [[M,M]],
  2: [[L,L],[R,R]],
  3: [[L,L],[M,M],[R,R]],
  4: [[L,L],[R,L],[L,R],[R,R]],
  5: [[L,L],[R,L],[M,M],[L,R],[R,R]],
  6: [[L,L],[R,L],[L,M],[R,M],[L,R],[R,R]]
};

let aktuell = 5;

export function setzeAugen(icon, n){
  // Alte Augen entfernen, das Grundquadrat behalten.
  [...icon.querySelectorAll('circle')].forEach(c => c.remove());
  AUGEN[n].forEach(([x, y]) => {
    icon.appendChild(svgEl('circle', {cx:x, cy:y, r:4.2, fill:'#16212B'}));
  });
  aktuell = n;
}

/**
 * Dreht den Würfel und zeigt danach eine neue Augenzahl —
 * nie zweimal dieselbe hintereinander.
 */
export function wuerfle(icon){
  const moeglich = [1,2,3,4,5,6].filter(n => n !== aktuell);
  const neu = moeglich[Math.floor(Math.random() * moeglich.length)];

  const anim = icon.animate(
    [{transform:'rotate(0deg) scale(1)'},
     {transform:'rotate(360deg) scale(1.2)'},
     {transform:'rotate(720deg) scale(1)'}],
    {duration:500, easing:'ease-out'}
  );
  // Umschalten, während er sich dreht — dann sieht man den Wechsel nicht.
  setTimeout(() => setzeAugen(icon, neu), 260);
  return anim;
}

/** Beim Laden eine zufällige Zahl zeigen. */
export function starteWuerfel(icon){
  setzeAugen(icon, 1 + Math.floor(Math.random() * 6));
}

// Regelwerk des Matches. Alles, was man zum Ausbalancieren drehen will,
// steht hier — nicht verteilt in der Spiellogik.


import { FELD } from './eisflaeche.js';

export const MITTE = {x: 500, y: 300};

// Gold spielt nach rechts (auf das violette Tor), Violett nach links.
// Das entspricht den Torfarben, die seit Stufe 1 gelten.
export const TEAMS = {
  gold:    {name:'Gold',    farbe:'--wir',     richtung: +1, tor:{x:914, y:300}},
  violett: {name:'Violett', farbe:'--gegner',  richtung: -1, tor:{x: 86, y:300}}
};

// Startaufstellung: je ein Spieler am Mittelkreis, die anderen beiden
// links und rechts hinter dem eigenen Spieler.
export const AUFSTELLUNG = {
  gold:    [{x:430, y:300}, {x:280, y:170}, {x:280, y:430}],
  violett: [{x:570, y:300}, {x:720, y:170}, {x:720, y:430}]
};

export const SPIELER_R   = 40;    // Radius eines Spielsteins
// Mindestabstand von Mittelpunkt zu Mittelpunkt beim Platzieren.
// Genau ein Durchmesser: die Steine dürfen sich berühren, aber nicht
// überlappen. Darunter verschmelzen sie optisch und lassen sich am
// iPad nicht mehr einzeln greifen.
export const MIN_ABSTAND = SPIELER_R * 2;

// Wie viele Tore zum Sieg — vor dem Match einstellbar.
export const ZIEL_AUSWAHL = [2, 3, 5];
export const ZIEL_STANDARD = 3;

// Ist das Tor gedeckt, entscheidet der Würfel. Diese Augenzahlen zählen.
export const TREFFER_AUGEN = [5, 6];

// Wie weit ein Spieler in einem Spielzug wirken kann — Pass, Fahrt und
// Schuss teilen sich diese Reichweite. Sie wird als Kreis um den
// Puckführenden gezeichnet: was man sieht, ist was gilt.
export const REICHWEITE = 420;

// So nah darf man mit dem Puck nicht an einen Gegner heranfahren.
// Derselbe Wert wie in Stufe 3, damit sich das Match nicht anders anfühlt.
export const GEFAHR = 118;

/** Abstand eines Punktes zur Strecke a→b (für gedeckte Schüsse). */
export function abstandZurLinie(p, a, b){
  const vx = b.x - a.x, vy = b.y - a.y;
  const laenge2 = vx*vx + vy*vy || 1;
  let t = ((p.x - a.x) * vx + (p.y - a.y) * vy) / laenge2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t*vx), p.y - (a.y + t*vy));
}

/** Liegt ein Punkt im erlaubten Bereich und frei genug von den anderen? */
export function platzFrei(p, andere, ausser){
  if (p.x < FELD.minX || p.x > FELD.maxX) return false;
  if (p.y < FELD.minY || p.y > FELD.maxY) return false;
  return andere.every((q, i) =>
    i === ausser || Math.hypot(p.x - q.x, p.y - q.y) >= MIN_ABSTAND);
}

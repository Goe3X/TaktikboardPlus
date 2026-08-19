// Erzeugt zufällige Situationen für Stufe 3: "Pass in den freien Raum".
//
// Neu gegenüber Stufe 2: jeder Mitspieler hat eine LAUFBAHN — ein sichtbares
// Band in die Richtung, in die er startet. Gepasst wird nicht auf den
// Spieler, sondern in seine Bahn.
//
// Dieselbe Grundregel wie in Stufe 2: keine Graustufe. Eine Bahn ist
// entweder klar versperrt oder klar frei. Mittlere Fälle werden verworfen.

import { FELD } from './eisflaeche.js';

export const BAHN_LAENGE  = 320;   // wie weit die Laufbahn reicht
export const BAHN_HALB    = 105;   // halbe Breite des Bandes
export const BAHN_MIN     = 130;   // näher am Mitspieler zählt nicht als "in den Raum"

export const VERSPERRT = BAHN_HALB + 40;    // Gegner näher: Bahn ist zu
export const FREI      = BAHN_HALB + 130;   // Gegner weiter: Bahn ist offen
                                            // dazwischen: verboten

const MIN_ABSTAND = 100;

function d(a, b){ return Math.hypot(a.x - b.x, a.y - b.y); }
function zw(min, max){ return min + Math.random() * (max - min); }

// Endpunkt einer Laufbahn.
export function bahnEnde(mate){
  return {
    x: mate.x + Math.cos(mate.richtung) * BAHN_LAENGE,
    y: mate.y + Math.sin(mate.richtung) * BAHN_LAENGE
  };
}

// Umriss der Laufbahn als Kapselform (Rechteck mit runden Enden).
// Als Pfad, damit die Bahn eine sichtbare Kante bekommt — ein reines
// breites Band ohne Rand verschwindet optisch auf dem hellen Eis.
export function bahnPfad(mate){
  const e = bahnEnde(mate);
  const vx = Math.cos(mate.richtung), vy = Math.sin(mate.richtung);
  const px = -vy * BAHN_HALB, py = vx * BAHN_HALB;   // Normale
  const r = BAHN_HALB;
  return 'M ' + (mate.x + px) + ' ' + (mate.y + py) +
         ' L ' + (e.x + px) + ' ' + (e.y + py) +
         ' A ' + r + ' ' + r + ' 0 0 1 ' + (e.x - px) + ' ' + (e.y - py) +
         ' L ' + (mate.x - px) + ' ' + (mate.y - py) +
         ' A ' + r + ' ' + r + ' 0 0 1 ' + (mate.x + px) + ' ' + (mate.y + py) + ' Z';
}

// Abstand eines Punktes zur Bahnachse (Strecke Mitspieler → Bahnende).
export function abstandZurBahn(p, mate){
  const e = bahnEnde(mate);
  const vx = e.x - mate.x, vy = e.y - mate.y;
  const laenge2 = vx*vx + vy*vy;
  let t = ((p.x - mate.x) * vx + (p.y - mate.y) * vy) / laenge2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (mate.x + t*vx), p.y - (mate.y + t*vy));
}

/**
 * Liegt ein getippter Punkt im nutzbaren Teil der Bahn?
 * Nicht direkt am Mitspieler (das wäre kein Pass in den Raum) und
 * nicht seitlich daneben.
 */
export function inBahn(p, mate){
  const e = bahnEnde(mate);
  const vx = e.x - mate.x, vy = e.y - mate.y;
  const laenge = Math.hypot(vx, vy);
  const entlang = ((p.x - mate.x) * vx + (p.y - mate.y) * vy) / laenge;
  if (entlang < BAHN_MIN || entlang > laenge + 40) return false;
  return abstandZurBahn(p, mate) <= BAHN_HALB;
}

function imFeld(p, rand = 50){
  return p.x > FELD.minX - 20 + rand && p.x < FELD.maxX + 20 - rand &&
         p.y > FELD.minY - 20 + rand && p.y < FELD.maxY + 20 - rand;
}

// Punkt auf der Bahn, in einem bestimmten Anteil der Länge, seitlich versetzt.
function punktInBahn(mate, anteil, seitlich){
  const e = bahnEnde(mate);
  const vx = (e.x - mate.x) / BAHN_LAENGE, vy = (e.y - mate.y) / BAHN_LAENGE;
  return {
    x: mate.x + vx * BAHN_LAENGE * anteil - vy * seitlich,
    y: mate.y + vy * BAHN_LAENGE * anteil + vx * seitlich
  };
}

function versuch(freieAnzahl){
  // Puckführender steht hinten links.
  const du = {x: zw(FELD.minX + 50, 330), y: zw(FELD.minY + 40, FELD.maxY - 60)};

  // Ein Mitspieler oben, einer unten — und die Laufrichtung zeigt jeweils
  // von der Mitte weg. Damit sind die zwei Bahnen zuverlässig getrennt und
  // ein Tipp kann nie in beide gleichzeitig fallen.
  const oben = {
    x: zw(du.x + 170, 700),
    y: zw(FELD.minY + 40, 240),
    richtung: zw(-0.60, 0.15)
  };
  const unten = {
    x: zw(du.x + 170, 700),
    y: zw(360, FELD.maxY - 40),
    richtung: zw(-0.15, 0.60)
  };
  const mates = Math.random() < .5 ? [oben, unten] : [unten, oben];

  for (const m of mates){
    if (d(m, du) < 230) return null;
    if (!imFeld(bahnEnde(m), 35)) return null;
  }
  if (d(mates[0], mates[1]) < 280) return null;
  // Kein Mitspieler darf in der Bahn des anderen stehen.
  if (abstandZurBahn(mates[0], mates[1]) < BAHN_HALB + 50) return null;
  if (abstandZurBahn(mates[1], mates[0]) < BAHN_HALB + 50) return null;

  const reihenfolge = Math.random() < .5 ? [0, 1] : [1, 0];
  const sollFrei = [false, false];
  for (let i = 0; i < freieAnzahl; i++) sollFrei[reihenfolge[i]] = true;

  const geg = [];

  // Für jede versperrte Bahn ein Gegner mitten hinein.
  for (let i = 0; i < 2; i++){
    if (sollFrei[i]) continue;
    const p = punktInBahn(mates[i], zw(.45, .85), zw(-45, 45));
    if (!imFeld(p, 30)) return null;
    geg.push(p);
  }

  // Ein Gegner bedrängt den Puckführenden, ohne eine Bahn zu stören.
  let bedraenger = null;
  for (let n = 0; n < 80 && !bedraenger; n++){
    const w = Math.random() * Math.PI * 2, r = zw(145, 215);
    const k = {x: du.x + Math.cos(w)*r, y: du.y + Math.sin(w)*r};
    if (!imFeld(k, 30)) continue;
    if (mates.every(m => abstandZurBahn(k, m) > FREI + 15)) bedraenger = k;
  }
  if (!bedraenger) return null;
  geg.push(bedraenger);

  // Restliche Gegner weit weg von beiden Bahnen.
  while (geg.length < 3){
    let p = null;
    for (let n = 0; n < 80 && !p; n++){
      const k = {x: zw(FELD.minX + 60, FELD.maxX - 60), y: zw(FELD.minY + 40, FELD.maxY - 40)};
      if (mates.every(m => abstandZurBahn(k, m) > FREI + 15)) p = k;
    }
    if (!p) return null;
    geg.push(p);
  }

  // Überlappungen ausschließen.
  const alle = [du, ...mates, ...geg];
  for (let i = 0; i < alle.length; i++)
    for (let j = i + 1; j < alle.length; j++)
      if (d(alle[i], alle[j]) < MIN_ABSTAND) return null;

  // Eindeutigkeit gegenrechnen: jede Bahn klar frei oder klar zu.
  const frei = [];
  for (let i = 0; i < 2; i++){
    const naechster = Math.min(...geg.map(g => abstandZurBahn(g, mates[i])));
    if (naechster < VERSPERRT)   frei.push(false);
    else if (naechster > FREI)   frei.push(true);
    else return null;
    if (frei[i] !== sollFrei[i]) return null;
  }

  return { du, mates, geg, frei, freieAnzahl };
}

export function neueSituation(){
  const w = Math.random();
  const freieAnzahl = w < .5 ? 1 : (w < .78 ? 2 : 0);

  for (let n = 0; n < 800; n++){
    const s = versuch(freieAnzahl);
    if (s) return s;
  }
  for (let n = 0; n < 800; n++){
    const s = versuch(1);
    if (s) return s;
  }
  return NOTFALL();
}

// Handgesetzte Rückfallsituation: Bahn 0 (oben) versperrt, Bahn 1 (unten) frei.
// Nachgerechnet, damit sie die eigenen Regeln erfüllt.
function NOTFALL(){
  return {
    du: {x:220, y:300},
    mates: [
      {x:500, y:160, richtung:-0.15},
      {x:480, y:450, richtung: 0.20}
    ],
    geg: [{x:690, y:131}, {x:120, y:380}, {x:180, y:130}],
    frei: [false, true],
    freieAnzahl: 1
  };
}

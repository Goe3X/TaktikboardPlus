// Erzeugt die Schritte eines Spielzugs für Stufe 4.
//
// Ein Spielzug besteht aus drei Schritten:
//   1. Entscheidung — Pass auf einen freien Mitspieler ODER in seine Laufbahn
//   2. Entscheidung — dasselbe, aber der Puck landet in Tornähe
//   3. Abschluss    — in die Schusszone fahren und das Tor antippen
//
// Die Schritte werden NICHT im Voraus gebaut, sondern erst wenn der Puck
// tatsächlich irgendwo gelandet ist. Sonst müsste der Generator raten,
// wohin das Kind tippt.

import { FELD } from './eisflaeche.js';
import { bahnStart, bahnEnde, abstandZurBahn, GEFAHR,
         BAHN_HALB, BAHN_LAENGE, BAHN_MIN } from './situation3.js';

// Mitte der Laufbahn — dorthin zielt der Generator, weil das Kind
// erfahrungsgemäß ungefähr in die Mitte des Bandes tippt.
const BAHN_MITTE = (BAHN_MIN + BAHN_LAENGE) / 2;

// Deckung eines einzelnen Spielers (wie in Stufe 2)
export const DECKUNG = 130;
export const OFFEN   = 220;

// Deckung einer Laufbahn (wie in Stufe 3)
const BAHN_ZU  = BAHN_HALB + 40;
const BAHN_AUF = BAHN_HALB + 130;

// Von hier aus darf geschossen werden.
export const TOR = {x: 914, y: 300};
export const SCHUSSZONE = 250;

const MIN_ABSTAND = 100;

function d(a, b){ return Math.hypot(a.x - b.x, a.y - b.y); }
function zw(min, max){ return min + Math.random() * (max - min); }

function imEis(p, rand){
  return p.x - rand > 30 && p.x + rand < 970 &&
         p.y - rand > 30 && p.y + rand < 570;
}

// Ist ein Weg von A bis in die Schusszone frei? Grobes Raster genügt.
export function wegZurZone(du, geg){
  const S = 20;
  const spalten = Math.floor((FELD.maxX - FELD.minX) / S) + 1;
  const zeilen  = Math.floor((FELD.maxY - FELD.minY) / S) + 1;
  const offen = (x, y) => geg.every(g => Math.hypot(x - g.x, y - g.y) >= GEFAHR);

  const start = [Math.round((du.x - FELD.minX) / S), Math.round((du.y - FELD.minY) / S)];
  if (!offen(FELD.minX + start[0]*S, FELD.minY + start[1]*S)) return false;

  const gesehen = new Set([start[0]*zeilen + start[1]]);
  const stapel = [start];
  while (stapel.length){
    const [a, b] = stapel.pop();
    const x = FELD.minX + a*S, y = FELD.minY + b*S;
    if (Math.hypot(x - TOR.x, y - TOR.y) < SCHUSSZONE) return true;
    for (const [da, db] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const na = a + da, nb = b + db;
      if (na < 0 || nb < 0 || na >= spalten || nb >= zeilen) continue;
      const k = na*zeilen + nb;
      if (gesehen.has(k)) continue;
      if (!offen(FELD.minX + na*S, FELD.minY + nb*S)) continue;
      gesehen.add(k);
      stapel.push([na, nb]);
    }
  }
  return false;
}

/**
 * Baut einen Entscheidungsschritt.
 * @param {object} du        feste Position des Puckführenden
 * @param {string} typ       'spieler' (Stufe-2-Mechanik) oder 'bahn' (Stufe 3)
 * @param {number} zielMinX  wo der Puck danach ungefähr landen soll
 * @param {number} zielMaxX
 * @param {number} freieAnzahl  0, 1 oder 2
 */
function versuchSchritt(du, typ, zielMinX, zielMaxX, freieAnzahl){
  const istBahn = typ === 'bahn';

  // Nur die x-Lage wird vom Zielpunkt abgeleitet — die y-Lage kommt direkt,
  // sonst rutschen die Mitspieler bei schrägen Bahnen aus dem Feld.
  //
  // Bei Laufbahnen steht der Mitspieler weit HINTER seinem Zielpunkt: der
  // Puck landet ja erst im Band vor ihm. Deshalb ein eigener x-Bereich,
  // sonst klebt er dem Puckführenden auf der Nase.
  const xMin = istBahn ? zielMinX - BAHN_MITTE + 60 : zielMinX;
  const xMax = istBahn ? zielMaxX - BAHN_MIN + 40   : zielMaxX;

  function baueMate(yMin, yMax, rMin, rMax){
    const x = zw(xMin, xMax);
    if (!istBahn) return {x: x, y: zw(yMin, yMax)};
    return {x: x, y: zw(yMin, yMax), richtung: zw(rMin, rMax)};
  }

  const oben  = baueMate(145, 215, -0.05, 0.14);
  const unten = baueMate(385, 455, -0.14, 0.05);
  const mates = Math.random() < .5 ? [oben, unten] : [unten, oben];

  for (const m of mates){
    if (d(m, du) < 175) return null;
    if (!imEis(m, 50)) return null;
    if (istBahn && (!imEis(bahnStart(m), BAHN_HALB) || !imEis(bahnEnde(m), BAHN_HALB))) return null;
  }
  if (d(mates[0], mates[1]) < 240) return null;
  if (istBahn && !bahnenGetrennt(mates[0], mates[1])) return null;
  if (!istBahn && d(mates[0], mates[1]) < 290) return null;

  const reihenfolge = Math.random() < .5 ? [0,1] : [1,0];
  const sollFrei = [false, false];
  for (let i = 0; i < freieAnzahl; i++) sollFrei[reihenfolge[i]] = true;

  const geg = [];

  // Decker
  for (let i = 0; i < 2; i++){
    if (sollFrei[i]) continue;
    const p = istBahn
      ? punktInBahn(mates[i], zw(.25, .85), zw(-45, 45))
      : punktUm(mates[i], 95, DECKUNG - 15);
    if (!imEis(p, 30)) return null;
    geg.push(p);
  }

  // Bedränger beim Puckführenden
  let bedraenger = null;
  for (let n = 0; n < 80 && !bedraenger; n++){
    const k = punktUm(du, GEFAHR + 34, GEFAHR + 95);
    if (!imEis(k, 30)) continue;
    if (frei(k, mates, istBahn)) bedraenger = k;
  }
  if (!bedraenger) return null;
  geg.push(bedraenger);

  // Restliche Gegner
  while (geg.length < 3){
    let p = null;
    for (let n = 0; n < 80 && !p; n++){
      const k = {x: zw(FELD.minX + 60, FELD.maxX - 60), y: zw(FELD.minY + 40, FELD.maxY - 40)};
      if (imEis(k, 30) && frei(k, mates, istBahn) && d(k, du) > GEFAHR + 32) p = k;
    }
    if (!p) return null;
    geg.push(p);
  }

  const alle = [du, ...mates, ...geg];
  for (let i = 0; i < alle.length; i++)
    for (let j = i + 1; j < alle.length; j++)
      if (d(alle[i], alle[j]) < MIN_ABSTAND) return null;

  if (geg.some(g => d(g, du) < GEFAHR + 32)) return null;

  // Gegenrechnen
  const freiListe = [];
  for (let i = 0; i < 2; i++){
    const nah = istBahn
      ? Math.min(...geg.map(g => abstandZurBahn(g, mates[i])))
      : Math.min(...geg.map(g => d(g, mates[i])));
    const zu  = istBahn ? BAHN_ZU  : DECKUNG;
    const auf = istBahn ? BAHN_AUF : OFFEN;
    if (nah < zu)       freiListe.push(false);
    else if (nah > auf) freiListe.push(true);
    else return null;
    if (freiListe[i] !== sollFrei[i]) return null;
  }

  // Ist keiner frei, muss Selbstfahren möglich sein.
  if (freieAnzahl === 0 && !wegZurZone(du, geg)) return null;

  return { typ, du, mates, geg, frei: freiListe, freieAnzahl };
}

function punktUm(zentrum, minR, maxR){
  const w = Math.random() * Math.PI * 2;
  const r = zw(minR, maxR);
  return {x: zentrum.x + Math.cos(w)*r, y: zentrum.y + Math.sin(w)*r};
}

function punktInBahn(mate, anteil, seitlich){
  const a = bahnStart(mate), b = bahnEnde(mate);
  const vx = Math.cos(mate.richtung), vy = Math.sin(mate.richtung);
  return {
    x: a.x + (b.x - a.x)*anteil - vy*seitlich,
    y: a.y + (b.y - a.y)*anteil + vx*seitlich
  };
}

function frei(k, mates, istBahn){
  return mates.every(m => istBahn
    ? abstandZurBahn(k, m) > BAHN_AUF + 15
    : d(k, m) > OFFEN + 15);
}

// Zwei Laufbahnen sind 210 Pixel breit — nebeneinander passen sie kaum
// aufs Eis. Deshalb hier etwas toleranter als in Stufe 3: eine kleine
// Überschneidung ist zulässig, die Stufe wählt dann die nähere Achse.
function bahnenGetrennt(a, b){
  const s = bahnStart(a), e = bahnEnde(a);
  for (let i = 0; i <= 12; i++){
    const p = {x: s.x + (e.x - s.x)*i/12, y: s.y + (e.y - s.y)*i/12};
    if (abstandZurBahn(p, b) < BAHN_HALB * 1.6) return false;
  }
  return true;
}

function wuerfleFreieAnzahl(){
  const w = Math.random();
  return w < .55 ? 1 : (w < .82 ? 2 : 0);
}

/** Entscheidungsschritt an fester Position. Liefert immer etwas Spielbares. */
export function baueSchritt(du, zielMinX, zielMaxX){
  const typ = Math.random() < .5 ? 'spieler' : 'bahn';
  const anzahl = wuerfleFreieAnzahl();

  // Erst den gewuerfelten Typ hartnaeckig probieren — sonst kippt die
  // Mischung zugunsten des leichter erfuellbaren Typs.
  for (const a of [anzahl, 1, 2]){
    for (let n = 0; n < 2500; n++){
      const s = versuchSchritt(du, typ, zielMinX, zielMaxX, a);
      if (s) return s;
    }
  }
  const anderer = typ === 'bahn' ? 'spieler' : 'bahn';
  for (const a of [anzahl, 1, 2]){
    for (let n = 0; n < 2500; n++){
      const s = versuchSchritt(du, anderer, zielMinX, zielMaxX, a);
      if (s) return s;
    }
  }
  return null;
}

/** Startposition des Spielzugs: hinten links. */
export function startPosition(){
  return {x: zw(FELD.minX + 30, 175), y: zw(FELD.minY + 50, FELD.maxY - 70)};
}

/** Abschlussschritt: Gegner vor dem Tor, Schusszone muss erreichbar sein. */
export function baueAbschluss(du){
  for (let n = 0; n < 800; n++){
    const geg = [];
    let gut = true;
    for (let i = 0; i < 3; i++){
      const p = {x: zw(520, 860), y: zw(FELD.minY + 40, FELD.maxY - 40)};
      if (!imEis(p, 30) || d(p, du) < GEFAHR + 32){ gut = false; break; }
      if (geg.some(g => d(g, p) < MIN_ABSTAND)){ gut = false; break; }
      // Nicht direkt im Tor stehen
      if (d(p, TOR) < 90){ gut = false; break; }
      geg.push(p);
    }
    if (!gut) continue;
    // Der Weg in die Schusszone muss offen sein …
    if (!wegZurZone(du, geg)) continue;
    // … aber nicht geschenkt: mindestens ein Gegner nah an der Zone.
    if (!geg.some(g => d(g, TOR) < SCHUSSZONE + 120)) continue;
    return { typ:'schuss', du, mates:[], geg, frei:[] };
  }
  return { typ:'schuss', du, mates:[],
           geg:[{x:700, y:150},{x:700, y:450},{x:600, y:300}], frei:[] };
}

// Erzeugt zufällige Spielsituationen für Stufe 2: 3 gegen 3.
//
// Kernregel: "gedeckt" muss man SEHEN können. Deshalb gibt es keine
// Graustufe — ein Mitspieler ist entweder klar zugestellt oder klar allein.
// Zwischenabstände werden verworfen und neu gewürfelt.

import { FELD } from './eisflaeche.js';

export const DECKUNG = 130;   // darunter: gedeckt, die Steine berühren sich fast
export const FREI    = 220;   // darüber: frei, klar leere Fläche
                              // dazwischen: verboten, sieht für ein Kind willkürlich aus

const MIN_ABSTAND = 100;      // damit sich Spielsteine nicht überlappen

function d(a, b){ return Math.hypot(a.x - b.x, a.y - b.y); }
function zufallZwischen(min, max){ return min + Math.random() * (max - min); }

function zufallsPunkt(minX, maxX){
  return {
    x: zufallZwischen(minX, maxX),
    y: zufallZwischen(FELD.minY + 30, FELD.maxY - 30)
  };
}

// Punkt in einem Ring um ein Zentrum — für Deckung und Bedrängen.
function punktUm(zentrum, minR, maxR){
  const w = Math.random() * Math.PI * 2;
  const r = zufallZwischen(minR, maxR);
  return {
    x: Math.max(FELD.minX, Math.min(FELD.maxX, zentrum.x + Math.cos(w) * r)),
    y: Math.max(FELD.minY, Math.min(FELD.maxY, zentrum.y + Math.sin(w) * r))
  };
}

/**
 * Baut eine Situation.
 * @param {number} freieAnzahl  wie viele der zwei Mitspieler frei sein sollen (0, 1 oder 2)
 * @returns {object|null}  null, wenn die Anordnung die Regeln verletzt
 */
function versuch(freieAnzahl){
  // Der Puckführende steht eher hinten — er soll nach vorne spielen.
  // y begrenzt, damit der Puck unter ihm nicht aus dem Feld ragt.
  const du = {
    x: zufallZwischen(FELD.minX + 60, 480),
    y: zufallZwischen(FELD.minY + 30, FELD.maxY - 60)
  };

  // Mitspieler: weit genug weg, dass ein Pass ein Pass ist.
  const mates = [];
  for (let i = 0; i < 2; i++){
    const p = punktUm(du, 260, 470);
    if (p.x < FELD.minX + 40 || p.x > FELD.maxX - 40) return null;
    if (p.y < FELD.minY + 40 || p.y > FELD.maxY - 40) return null;
    mates.push(p);
  }
  // Mindestens 290 auseinander: die Trefferzonen beim Passen (je 130)
  // dürfen sich nicht überlappen, sonst ist ein Zug mehrdeutig.
  if (d(mates[0], mates[1]) < 290) return null;

  // Wer soll frei sein? Zufällig auswählen, damit nicht immer derselbe.
  const reihenfolge = Math.random() < .5 ? [0, 1] : [1, 0];
  const sollFrei = [false, false];
  for (let i = 0; i < freieAnzahl; i++) sollFrei[reihenfolge[i]] = true;

  const geg = [];

  // Für jeden gedeckten Mitspieler ein Gegner direkt daneben.
  for (let i = 0; i < 2; i++){
    if (sollFrei[i]) continue;
    geg.push(punktUm(mates[i], 95, DECKUNG - 15));
  }

  // Ein Gegner bedrängt den Puckführenden — das erklärt, warum er passen soll.
  // Er darf dabei aber keinen Mitspieler mitdecken.
  let bedraenger = null;
  for (let n = 0; n < 60 && !bedraenger; n++){
    const k = punktUm(du, 145, 215);
    if (mates.every(m => d(k, m) > FREI + 40)) bedraenger = k;
  }
  if (!bedraenger) return null;
  geg.push(bedraenger);

  // Restliche Gegner frei auf dem Eis verteilen — aber bewusst weit weg von
  // den Mitspielern, sonst decken sie versehentlich jemanden.
  while (geg.length < 3){
    let p = null;
    for (let n = 0; n < 60 && !p; n++){
      const k = zufallsPunkt(FELD.minX + 60, FELD.maxX - 60);
      if (mates.every(m => d(k, m) > FREI + 40)) p = k;
    }
    if (!p) return null;
    geg.push(p);
  }

  const alle = [du, ...mates, ...geg];

  // Nichts darf überlappen — außer der Deckung, die soll ja eng sein.
  for (let i = 0; i < alle.length; i++){
    for (let j = i + 1; j < alle.length; j++){
      const eng = d(alle[i], alle[j]) < MIN_ABSTAND;
      if (!eng) continue;
      const istDeckung = mates.includes(alle[i]) && geg.includes(alle[j]) ||
                         mates.includes(alle[j]) && geg.includes(alle[i]);
      if (!istDeckung || d(alle[i], alle[j]) < 90) return null;
    }
  }

  // Entscheidend: jeder Mitspieler muss EINDEUTIG frei oder gedeckt sein.
  const frei = [];
  for (let i = 0; i < 2; i++){
    const naechster = Math.min(...geg.map(g => d(mates[i], g)));
    if (naechster < DECKUNG)      frei.push(false);
    else if (naechster > FREI)    frei.push(true);
    else return null;                       // Graustufe — verwerfen
    if (frei[i] !== sollFrei[i]) return null;
  }

  return { du, mates, geg, frei, freieAnzahl };
}

/**
 * Erzeugt eine neue Situation.
 * Der Fall wird EINMAL gewürfelt und dann dafür durchprobiert — sonst
 * gewinnen die leicht zu erfüllenden Fälle und die Mischung kippt.
 * "Beide frei" ist die Aufgabe ohne falsche Antwort, deshalb seltener.
 */
export function neueSituation(){
  const w = Math.random();
  const freieAnzahl = w < .5 ? 1 : (w < .78 ? 2 : 0);

  for (let n = 0; n < 600; n++){
    const s = versuch(freieAnzahl);
    if (s) return s;
  }
  // Zweite Chance mit einem anderen Fall, bevor wir aufgeben.
  for (let n = 0; n < 600; n++){
    const s = versuch(1);
    if (s) return s;
  }
  return NOTFALL();   // sollte nie passieren, aber lieber spielbar als leer
}

// Handgesetzte Rückfallsituation, falls der Zufall streikt.
// mate0 ist gedeckt (Gegner direkt daneben), mate1 steht klar allein.
function NOTFALL(){
  return {
    du:    {x:250, y:300},
    mates: [{x:600, y:150}, {x:620, y:470}],
    geg:   [{x:660, y:200}, {x:420, y:300}, {x:180, y:120}],
    frei:  [false, true],
    freieAnzahl: 1
  };
}

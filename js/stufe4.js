// Stufe 4: "Der ganze Spielzug"
//
// Drei Schritte, alle aus bekannten Mechaniken zusammengesetzt:
//   1. Entscheidung — freien Mitspieler antippen ODER in seine Laufbahn tippen
//   2. Entscheidung — dasselbe, der Puck landet in Tornähe
//   3. Abschluss    — in die Schusszone fahren und das Tor antippen
//
// Selbstfahren ist in jedem Schritt möglich und die einzige Lösung, wenn
// niemand frei ist. Zu nah an einen Gegner heißt Puck weg — dann beginnt
// der GANZE Spielzug von vorn. Das ist Absicht: so kann er neu gedacht
// werden, statt eine schlechte Lage zu retten.

import { svgEl, setze, stern, FARBE } from './svg.js';
import { baueEis, pfeilRichtung, FELD } from './eisflaeche.js';
import { machZiehbar } from './ziehen.js';
import { feiern, konfettiLeeren } from './feiern.js';
import { inBahn, bahnPfad, abstandZurBahn, GEFAHR } from './situation3.js';
import { baueSchritt, baueAbschluss, startPosition,
         TOR, SCHUSSZONE } from './situation4.js';

const PUCK_ABSTAND = {x:0, y:52};
const BEUTE_WEG    = 120;

const TEXTE = {
  schritt1: 'Spiel den Puck nach vorne — wer ist frei?',
  schritt2: 'Weiter! Bring den Puck vors Tor.',
  schuss:   'Jetzt: fahr in den hellen Bereich und tippe aufs Tor!'
};

const statusEl    = document.getElementById('statusText');
const aufgabeEl   = document.getElementById('aufgabeText');
const wuerfelIcon = document.getElementById('wuerfelIcon');
const neuKnopf    = document.getElementById('neuKnopf');
const schrittEl   = document.getElementById('schrittAnzeige');

// --- Eisfläche -------------------------------------------------------------
const { svg, spieler, konfetti, pfeilGross } = baueEis();
document.querySelector('.eisflaeche').appendChild(svg);

// Schusszone liegt unter allem anderen.
const zoneG = svgEl('g');
zoneG.appendChild(svgEl('circle', {
  cx:TOR.x, cy:TOR.y, r:SCHUSSZONE,
  fill:'var(--wir)', 'fill-opacity':'.20',
  stroke:'var(--wir)', 'stroke-width':7,
  'stroke-dasharray':'26 20', 'stroke-opacity':'.9'
}));
spieler.appendChild(zoneG);

const bahnenG = svgEl('g');
spieler.appendChild(bahnenG);

function token(r, fill, extra){
  const g = svgEl('g', {class:'token'});
  g.appendChild(svgEl('circle', {r:r, fill:fill}));
  if (extra) g.appendChild(extra);
  spieler.appendChild(g);
  return g;
}

const gegner = [0,1,2].map(() => {
  const g = svgEl('g', {class:'token'});
  g.appendChild(svgEl('circle', {
    r: GEFAHR, fill:'var(--gegner)', 'fill-opacity':'.10',
    stroke:'var(--gegner)', 'stroke-width':5,
    'stroke-dasharray':'16 14', 'stroke-opacity':'.55'
  }));
  g.appendChild(svgEl('circle', {r:40, fill:FARBE.geg}));
  spieler.appendChild(g);
  return g;
});

const mates = [0,1].map(() => {
  const g = token(40, FARBE.wir);
  g.setAttribute('class', 'token tippbar');
  g.appendChild(svgEl('circle', {r:75, fill:'transparent'}));
  return g;
});
mates.forEach((g,i) => g.addEventListener('click', () => tippeSpieler(i)));

const du = token(54, FARBE.wir, stern());
du.appendChild(svgEl('circle', {r:66, class:'du-ring'}));
const puls = svgEl('circle', {r:66, class:'puls'});
du.appendChild(puls);

const puck = svgEl('g');
puck.appendChild(svgEl('ellipse', {rx:22, ry:16, fill:'#0C1319', stroke:'#fff', 'stroke-width':5}));
spieler.appendChild(puck);

// Antippbares Tor (liegt über der Torgrafik aus baueEis)
const torFeld = svgEl('g', {class:'tor-feld'});
torFeld.appendChild(svgEl('rect', {
  x:856, y:215, width:76, height:170, rx:18,
  fill:'transparent'
}));
const torGlanz = svgEl('rect', {
  x:862, y:222, width:64, height:156, rx:14,
  fill:'none', stroke:'#fff', 'stroke-width':8, opacity:'0'
});
torFeld.appendChild(torGlanz);
spieler.appendChild(torFeld);
torFeld.addEventListener('click', schiessen);

const bahnen = [0,1].map(() => {
  const g = svgEl('g');
  const flaeche = svgEl('path', {
    fill:'var(--wir)', 'fill-opacity':'.26',
    stroke:'var(--wir)', 'stroke-width':7,
    'stroke-dasharray':'26 20', 'stroke-linecap':'round', 'stroke-opacity':'.95'
  });
  const spitze = svgEl('path', {fill:'var(--wir)', stroke:'#fff', 'stroke-width':4});
  g.appendChild(flaeche); g.appendChild(spitze);
  bahnenG.appendChild(g);
  return { g, flaeche, spitze };
});

// --- Zustand ---------------------------------------------------------------
let lage = null;
let schritt = 1;              // 1, 2 oder 3
let start = null;             // Startposition des ganzen Spielzugs
let geschafft = false;
let verloren  = false;
let laeuft    = false;
const puckPos = {x:0, y:0};
const duPos   = {x:0, y:0};

function keinerFrei(){ return lage.frei.length > 0 && !lage.frei.some(Boolean); }
function bereit(){ return !geschafft && !verloren && !laeuft; }
function inZone(p){ return Math.hypot(p.x - TOR.x, p.y - TOR.y) < SCHUSSZONE; }

function puckAnDu(){
  puckPos.x = duPos.x + PUCK_ABSTAND.x;
  puckPos.y = duPos.y + PUCK_ABSTAND.y;
  setze(puck, puckPos);
}

function farbenSetzen(istWir){
  document.documentElement.style.setProperty('--aktiv', istWir ? FARBE.wir : FARBE.geg);
  document.documentElement.style.setProperty('--aktiv-tief', istWir ? FARBE.wirTief : FARBE.gegTief);
  statusEl.textContent = istWir ? 'Du hast den Puck' : 'Gegner hat den Puck';
  pfeilRichtung(pfeilGross, istWir, istWir ? FARBE.wir : FARBE.geg);
}

function zeichneBahn(i, mate){
  bahnen[i].flaeche.setAttribute('d', bahnPfad(mate));
  const grad = mate.richtung * 180 / Math.PI;
  bahnen[i].spitze.setAttribute('d', 'M -16 -19 L 23 0 L -16 19 L -7 0 Z');
  bahnen[i].spitze.setAttribute('transform',
    'translate(' + (mate.x + Math.cos(mate.richtung) * 48) + ',' +
                   (mate.y + Math.sin(mate.richtung) * 48) + ') rotate(' + grad + ')');
}

// Zeigt die aktuelle Lage an. Ein Kind liest keine Schrittnummer —
// die drei Punkte oben sind für den Vorleser.
function zeichne(){
  duPos.x = lage.du.x; duPos.y = lage.du.y;
  setze(du, duPos);
  puckAnDu();

  lage.geg.forEach((p,i) => setze(gegner[i], p));

  const zeigeMates = lage.typ !== 'schuss';
  mates.forEach((g,i) => {
    g.style.display = zeigeMates ? '' : 'none';
    if (zeigeMates) setze(g, lage.mates[i]);
  });

  const zeigeBahnen = lage.typ === 'bahn';
  bahnenG.style.display = zeigeBahnen ? '' : 'none';
  if (zeigeBahnen) lage.mates.forEach((p,i) => zeichneBahn(i, p));

  const zeigeZone = lage.typ === 'schuss';
  zoneG.style.display = zeigeZone ? '' : 'none';
  torFeld.style.display = zeigeZone ? '' : 'none';

  schrittEl.textContent = '●'.repeat(schritt) + '○'.repeat(3 - schritt);
  aufgabeEl.textContent = lage.typ === 'schuss' ? TEXTE.schuss
                        : (schritt === 1 ? TEXTE.schritt1 : TEXTE.schritt2);
  aufgabeEl.classList.remove('geloest');
  neuKnopf.classList.remove('ruft');
  farbenSetzen(true);
  torGlanz.setAttribute('opacity', '0');

  geschafft = false;
  verloren  = false;
  laeuft    = false;
  konfettiLeeren(konfetti);
}

let ersteLage = null;          // damit "Nochmal" dieselbe Ausgangslage bringt

function neuerSpielzug(neuWuerfeln){
  if (neuWuerfeln || !ersteLage){
    start = startPosition();
    ersteLage = baueSchritt(start, 430, 600) || baueAbschluss(start);
  }
  schritt = 1;
  lage = ersteLage;
  zeichne();
}

// --- Animationen -----------------------------------------------------------
function fliege(el, von, nach, dauer, danach){
  laeuft = true;
  const a = el.animate(
    [{transform:'translate(' + von.x + 'px,' + von.y + 'px)'},
     {transform:'translate(' + nach.x + 'px,' + nach.y + 'px)'}],
    {duration:dauer, easing:'cubic-bezier(.3,.8,.4,1)'});
  a.onfinish = () => { setze(el, nach); laeuft = false; if (danach) danach(); };
}

function laufe(el, von, nach, dauer, verzoegerung, danach){
  const a = el.animate(
    [{transform:'translate(' + von.x + 'px,' + von.y + 'px)'},
     {transform:'translate(' + nach.x + 'px,' + nach.y + 'px)'}],
    {duration:dauer, delay:verzoegerung || 0, easing:'cubic-bezier(.4,.1,.3,1)', fill:'both'});
  a.onfinish = () => { setze(el, nach); a.cancel(); if (danach) danach(); };
}

function beutePunkt(p){
  return {
    x: Math.max(FELD.minX, p.x - BEUTE_WEG),
    y: Math.min(FELD.maxY, Math.max(FELD.minY, p.y + 34))
  };
}

function puckIstWeg(text){
  laeuft = false;
  verloren = true;
  bahnenG.style.display = 'none';
  zoneG.style.display = 'none';
  farbenSetzen(false);
  aufgabeEl.textContent = text;
  aufgabeEl.classList.add('geloest');
  neuKnopf.classList.add('ruft');
}

// --- Weiter zum nächsten Schritt ------------------------------------------
function weiter(neuePosition){
  schritt++;
  if (schritt === 2){
    lage = baueSchritt(neuePosition, 620, 850) || baueAbschluss(neuePosition);
  } else {
    lage = baueAbschluss(neuePosition);
  }
  zeichne();
}

function gelungen(zielPunkt, i){
  laeuft = true;
  fliege(puck, puckPos, zielPunkt, 460, () => { laeuft = true; });
  laufe(mates[i], lage.mates[i], zielPunkt, 560, 150, () => {
    laeuft = false;
    weiter(zielPunkt);
  });
}

function verlorenAn(k, ort, text){
  const abfaenger = lage.geg[k];
  laeuft = true;
  bahnenG.style.display = 'none';
  fliege(puck, puckPos, ort, 420, () => {
    laeuft = true;
    laufe(gegner[k], abfaenger, ort, 460, 120, () => {
      const weg = beutePunkt(ort);
      setTimeout(() => {
        laufe(gegner[k], ort, weg, 500);
        laufe(puck, ort, weg, 500, 0, () => puckIstWeg(text));
      }, 260);
    });
  });
}

// --- Eingaben --------------------------------------------------------------
function naechsterGegnerZu(mate, alsBahn){
  let k = 0;
  lage.geg.forEach((g, i) => {
    const neu = alsBahn ? abstandZurBahn(g, mate) : Math.hypot(g.x - mate.x, g.y - mate.y);
    const alt = alsBahn ? abstandZurBahn(lage.geg[k], mate)
                        : Math.hypot(lage.geg[k].x - mate.x, lage.geg[k].y - mate.y);
    if (neu < alt) k = i;
  });
  return k;
}

function tippeSpieler(i){
  if (!bereit() || lage.typ !== 'spieler') return;
  if (lage.frei[i]) gelungen(lage.mates[i], i);
  else verlorenAn(naechsterGegnerZu(lage.mates[i], false), lage.mates[i],
                  'Der war gedeckt — Puck weg. Von vorne!');
}

svg.addEventListener('click', ev => {
  if (!bereit()) return;
  if (du.contains(ev.target)) return;
  if (mates.some(m => m.contains(ev.target))) return;
  if (torFeld.contains(ev.target)) return;
  if (lage.typ !== 'bahn') return;

  const pt = svg.createSVGPoint();
  pt.x = ev.clientX; pt.y = ev.clientY;
  const p = pt.matrixTransform(svg.getScreenCTM().inverse());

  const treffer = [0,1].filter(i => inBahn(p, lage.mates[i]));
  if (!treffer.length){
    bahnenG.animate([{opacity:1},{opacity:.35},{opacity:1}], {duration:900, iterations:2});
    return;
  }
  const i = treffer.length === 1 ? treffer[0]
          : (abstandZurBahn(p, lage.mates[0]) <= abstandZurBahn(p, lage.mates[1]) ? 0 : 1);

  if (lage.frei[i]) gelungen(p, i);
  else verlorenAn(naechsterGegnerZu(lage.mates[i], true), p,
                  'Da stand ein Gegner — Puck weg. Von vorne!');
});

function schiessen(){
  if (!bereit() || lage.typ !== 'schuss') return;
  if (!inZone(duPos)){
    zoneG.animate([{opacity:1},{opacity:.3},{opacity:1}], {duration:900, iterations:2});
    return;
  }
  laeuft = true;
  fliege(puck, puckPos, {x:TOR.x, y:TOR.y}, 320, () => {
    laeuft = false;
    geschafft = true;
    zoneG.style.display = 'none';
    torGlanz.animate([{opacity:1},{opacity:0}], {duration:900, iterations:2});
    aufgabeEl.textContent = 'TOR! Der ganze Spielzug hat gesessen.';
    aufgabeEl.classList.add('geloest');
    feiern(konfetti, du, puls, {x:TOR.x - 60, y:TOR.y});
  });
}

function duBewegt(){
  puckAnDu();
  if (!bereit()) return;
  for (let k = 0; k < lage.geg.length; k++){
    const g = lage.geg[k];
    if (Math.hypot(duPos.x - g.x, duPos.y - g.y) < GEFAHR){
      verlorenAn(k, {x:g.x, y:g.y}, 'Zu nah am Gegner — Puck weg. Von vorne!');
      return;
    }
  }
  // In der Schusszone leuchtet das Tor auf.
  if (lage.typ === 'schuss'){
    torGlanz.setAttribute('opacity', inZone(duPos) ? '.9' : '0');
  }
}

function duLoslassen(){
  if (!bereit()) return;
  if (lage.typ === 'schuss') return;      // hier darf er frei fahren
  if (!keinerFrei()){
    duPos.x = lage.du.x; duPos.y = lage.du.y;
    setze(du, duPos);
    puckAnDu();
    return;
  }
  // Niemand frei: selbst nach vorne fahren bringt ihn in den nächsten Schritt.
  if (duPos.x > (schritt === 1 ? 430 : 620)){
    weiter({x: duPos.x, y: duPos.y});
  }
}

machZiehbar(svg, du, duPos, {
  beiLoslassen: duLoslassen,
  beiBewegung: duBewegt,
  aktiv: bereit
});

document.getElementById('wuerfelKnopf').addEventListener('click', () => {
  wuerfelIcon.animate(
    [{transform:'rotate(0deg) scale(1)'},
     {transform:'rotate(360deg) scale(1.2)'},
     {transform:'rotate(720deg) scale(1)'}],
    {duration:500, easing:'ease-out'});
  neuerSpielzug(true);
});
neuKnopf.addEventListener('click', () => neuerSpielzug(false));

neuerSpielzug(true);

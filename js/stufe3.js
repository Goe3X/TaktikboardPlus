// Stufe 3: "Pass in den freien Raum"
//
// Jeder Mitspieler hat eine sichtbare LAUFBAHN — ein blasses Band in die
// Richtung, in die er startet. Das Kind tippt in eine Bahn, der Puck gleitet
// dorthin, und erst DANN läuft der Mitspieler los und nimmt ihn an.
// Kein Timing, keine laufende Uhr: das Brett steht still bis zum Tipp.
//
// Ist keine Bahn frei, fährt das Kind selbst Richtung gegnerisches Tor —
// derselbe Ausweg wie in Stufe 2.

import { svgEl, setze, stern, FARBE } from './svg.js';
import { baueEis, pfeilRichtung, FELD } from './eisflaeche.js';
import { machZiehbar } from './ziehen.js';
import { feiern, konfettiLeeren } from './feiern.js';
import { neueSituation, inBahn, bahnPfad,
         abstandZurBahn, GEFAHR } from './situation3.js';

const TOR_LINIE    = 720;
const PUCK_ABSTAND = {x:0, y:52};
// GEFAHR kommt aus situation3.js — der Generator muss mit demselben Wert
// rechnen, sonst erzeugt er unlösbare Situationen. Der Ring um jeden
// Gegner zeigt genau diesen Radius; unsichtbare Mathematik wirkt für ein
// Kind willkürlich.
// Wie weit der Gegner den eroberten Puck noch mitnimmt, damit man sieht,
// wer ihn hat. Ohne das liegen Gegner und Mitspieler übereinander.
const BEUTE_WEG    = 120;

const AUFGABE = 'Welcher Laufweg ist frei? Tippe dorthin, wo er hinfährt!';

const statusEl    = document.getElementById('statusText');
const aufgabeEl   = document.getElementById('aufgabeText');
const wuerfelIcon = document.getElementById('wuerfelIcon');
const neuKnopf    = document.getElementById('neuKnopf');

// --- Eisfläche -------------------------------------------------------------
const { svg, spieler, konfetti, pfeilGross } = baueEis();
document.querySelector('.eisflaeche').appendChild(svg);

// Die Laufbahnen liegen UNTER den Spielsteinen.
const bahnenG = svgEl('g');
spieler.appendChild(bahnenG);

function token(r, fill, extra){
  const g = svgEl('g', {class:'token'});
  g.appendChild(svgEl('circle', {r:r, fill:fill}));
  if (extra) g.appendChild(extra);
  spieler.appendChild(g);
  return g;
}

// Gegner mit sichtbarem Gefahrenring: so weit reicht ihr Zugriff.
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
const mates  = [0,1].map(() => token(40, FARBE.wir));

const du = token(54, FARBE.wir, stern());
du.appendChild(svgEl('circle', {r:66, class:'du-ring'}));
const puls = svgEl('circle', {r:66, class:'puls'});
du.appendChild(puls);

const puck = svgEl('g');
puck.appendChild(svgEl('ellipse', {rx:22, ry:16, fill:'#0C1319', stroke:'#fff', 'stroke-width':5}));
spieler.appendChild(puck);

// Zwei Bahnen: Fläche mit gestrichelter Kante plus Pfeilspitze am Ende.
const bahnen = [0,1].map(() => {
  const g = svgEl('g', {class:'bahn'});
  const flaeche = svgEl('path', {
    fill:'var(--wir)', 'fill-opacity':'.26',
    stroke:'var(--wir)', 'stroke-width':7,
    'stroke-dasharray':'26 20', 'stroke-linecap':'round', 'stroke-opacity':'.95'
  });
  const spitze = svgEl('path', {fill:'var(--wir)', stroke:'#fff', 'stroke-width':4});
  g.appendChild(flaeche);
  g.appendChild(spitze);
  bahnenG.appendChild(g);
  return { g, flaeche, spitze };
});

function zeichneBahn(i, mate){
  bahnen[i].flaeche.setAttribute('d', bahnPfad(mate));
  // Die Spitze sitzt am Rand des Spielersteins (Radius 40) und zeigt in
  // seine Startrichtung — so gehört sie sichtbar zu ihm.
  const grad = mate.richtung * 180 / Math.PI;
  bahnen[i].spitze.setAttribute('d', 'M -16 -19 L 23 0 L -16 19 L -7 0 Z');
  bahnen[i].spitze.setAttribute('transform',
    'translate(' + (mate.x + Math.cos(mate.richtung) * 48) + ',' +
                   (mate.y + Math.sin(mate.richtung) * 48) + ') rotate(' + grad + ')');
}

// --- Zustand ---------------------------------------------------------------
let lage = null;
let geschafft = false;
let verloren  = false;
let laeuft    = false;
let hatDaneben = false;
const puckPos = {x:0, y:0};
const duPos   = {x:0, y:0};

function keineBahnFrei(){ return lage && !lage.frei[0] && !lage.frei[1]; }
function bereit(){ return !geschafft && !verloren && !laeuft; }

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

function anwenden(neu){
  if (neu || !lage){ lage = neueSituation(); hatDaneben = false; }

  duPos.x = lage.du.x; duPos.y = lage.du.y;
  setze(du, duPos);
  lage.mates.forEach((p,i) => { setze(mates[i], p); zeichneBahn(i, p); });
  lage.geg.forEach((p,i) => setze(gegner[i], p));
  puckAnDu();

  farbenSetzen(true);
  aufgabeEl.textContent = AUFGABE;
  aufgabeEl.classList.remove('geloest');
  neuKnopf.classList.remove('ruft');
  bahnenG.style.opacity = 1;

  geschafft = false;
  verloren  = false;
  laeuft    = false;
  konfettiLeeren(konfetti);

  if (hatDaneben && keineBahnFrei()) hinweisSelbstFahren();
}

// --- Animationen -----------------------------------------------------------
function fliege(el, von, nach, dauer, danach){
  laeuft = true;
  const anim = el.animate(
    [{transform:'translate(' + von.x  + 'px,' + von.y  + 'px)'},
     {transform:'translate(' + nach.x + 'px,' + nach.y + 'px)'}],
    {duration:dauer, easing:'cubic-bezier(.3,.8,.4,1)'}
  );
  anim.onfinish = () => { setze(el, nach); laeuft = false; if (danach) danach(); };
}

// Läuft parallel zu einer anderen Animation, ohne die Sperre zu lösen.
function laufe(el, von, nach, dauer, verzoegerung, danach){
  const anim = el.animate(
    [{transform:'translate(' + von.x  + 'px,' + von.y  + 'px)'},
     {transform:'translate(' + nach.x + 'px,' + nach.y + 'px)'}],
    {duration:dauer, delay:verzoegerung, easing:'cubic-bezier(.4,.1,.3,1)', fill:'both'}
  );
  anim.onfinish = () => { setze(el, nach); anim.cancel(); if (danach) danach(); };
}

function gelungenerPass(i, ziel){
  const mate = lage.mates[i];
  laeuft = true;
  // Puck gleitet in den Raum …
  fliege(puck, puckPos, ziel, 500, () => { laeuft = true; });
  // … und der Mitspieler startet dorthin.
  laufe(mates[i], mate, ziel, 620, 180, () => {
    laeuft = false;
    geschafft = true;
    bahnenG.style.opacity = 0;
    aufgabeEl.textContent = 'Super! Genau in den freien Raum.';
    aufgabeEl.classList.add('geloest');
    feiern(konfetti, mates[i], null, ziel);
  });
}

// Wohin der Gegner den eroberten Puck mitnimmt: Richtung SEIN Tor, also
// nach links. Damit sieht man, dass der Puck die Seite gewechselt hat.
function beutePunkt(p){
  return {
    x: Math.max(FELD.minX, p.x - BEUTE_WEG),
    y: Math.min(FELD.maxY, Math.max(FELD.minY, p.y + 34))
  };
}

// Gemeinsamer Abschluss für jeden Puckverlust.
function puckIstWeg(text){
  laeuft = false;
  verloren = true;
  hatDaneben = true;
  bahnenG.style.opacity = 0;
  farbenSetzen(false);
  aufgabeEl.textContent = text;
  aufgabeEl.classList.add('geloest');
  neuKnopf.classList.add('ruft');
}

// Versperrte Bahn: der Gegner ist vor dem Mitspieler am Puck.
function abgefangen(i, ziel){
  const mate = lage.mates[i];
  let nah = 0;
  lage.geg.forEach((g, k) => {
    if (abstandZurBahn(g, mate) < abstandZurBahn(lage.geg[nah], mate)) nah = k;
  });
  const abfaenger = lage.geg[nah];

  // Der Mitspieler bleibt ein Stück VOR dem Puck stehen — sonst liegen
  // er und der Gegner übereinander und es sieht aus, als hätte er ihn.
  const laenge = Math.hypot(ziel.x - mate.x, ziel.y - mate.y) || 1;
  const bremse = {
    x: mate.x + (ziel.x - mate.x) * Math.max(0, (laenge - 110) / laenge),
    y: mate.y + (ziel.y - mate.y) * Math.max(0, (laenge - 110) / laenge)
  };

  laeuft = true;
  fliege(puck, puckPos, ziel, 500, () => { laeuft = true; });
  laufe(mates[i], mate, bremse, 700, 180);
  laufe(gegner[nah], abfaenger, ziel, 520, 180, () => {
    gegner[nah].animate(
      [{transform:'translate(' + ziel.x + 'px,' + ziel.y + 'px) scale(1)'},
       {transform:'translate(' + ziel.x + 'px,' + ziel.y + 'px) scale(1.3)'},
       {transform:'translate(' + ziel.x + 'px,' + ziel.y + 'px) scale(1)'}],
      {duration:400, easing:'ease-out'}
    );
    // Und er fährt mit der Beute ein Stück Richtung eigenes Tor davon.
    const weg = beutePunkt(ziel);
    setTimeout(() => {
      laufe(gegner[nah], ziel, weg, 520);
      laufe(puck, ziel, weg, 520, 0, () => {
        puckIstWeg('Da stand ein Gegner — der hat den Puck.');
      });
    }, 340);
  });
}

// Beim Selbstfahren zu nah an einen Gegner gekommen.
function abgenommenBeimFahren(k){
  const abfaenger = lage.geg[k];
  laeuft = true;
  bahnenG.style.opacity = 0;

  fliege(puck, puckPos, abfaenger, 300, () => {
    laeuft = true;
    gegner[k].animate(
      [{transform:'translate(' + abfaenger.x + 'px,' + abfaenger.y + 'px) scale(1)'},
       {transform:'translate(' + abfaenger.x + 'px,' + abfaenger.y + 'px) scale(1.3)'},
       {transform:'translate(' + abfaenger.x + 'px,' + abfaenger.y + 'px) scale(1)'}],
      {duration:400, easing:'ease-out'}
    );
    const weg = beutePunkt(abfaenger);
    setTimeout(() => {
      laufe(gegner[k], abfaenger, weg, 520);
      laufe(puck, abfaenger, weg, 520, 0, () => {
        puckIstWeg('Zu nah am Gegner — der hat dir den Puck abgenommen.');
      });
    }, 320);
  });
}

// Tipp daneben: kein Fehler, nur ein Hinweis auf die Bahnen.
function daneben(ziel){
  laeuft = true;
  fliege(puck, puckPos, ziel, 320, () => {
    setTimeout(() => {
      fliege(puck, ziel, {x: duPos.x + PUCK_ABSTAND.x, y: duPos.y + PUCK_ABSTAND.y}, 320, puckAnDu);
    }, 160);
  });
  bahnenG.animate(
    [{opacity:1}, {opacity:.35}, {opacity:1}],
    {duration:900, iterations:2}
  );
}

function hinweisSelbstFahren(){
  puls.animate(
    [{transform:'scale(1)', opacity:.8}, {transform:'scale(1.6)', opacity:0}],
    {duration:1100, iterations:3, easing:'ease-out'}
  );
}

// --- Eingaben --------------------------------------------------------------
function svgPunkt(ev){
  const pt = svg.createSVGPoint();
  pt.x = ev.clientX; pt.y = ev.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}

svg.addEventListener('click', ev => {
  if (!bereit()) return;
  if (du.contains(ev.target)) return;        // das ist ein Zieh-Versuch

  const p = svgPunkt(ev);
  const treffer = [0,1].filter(i => inBahn(p, lage.mates[i]));

  if (!treffer.length){ daneben(p); return; }
  // Bei Überschneidung die Bahn nehmen, deren Achse näher liegt.
  const i = treffer.length === 1 ? treffer[0]
          : (abstandZurBahn(p, lage.mates[0]) <= abstandZurBahn(p, lage.mates[1]) ? 0 : 1);

  if (lage.frei[i]) gelungenerPass(i, p);
  else abgefangen(i, p);
});

// Während des Fahrens: kommt er einem Gegner zu nah, ist der Puck weg.
function duBewegt(){
  puckAnDu();
  if (!bereit()) return;
  for (let k = 0; k < lage.geg.length; k++){
    const g = lage.geg[k];
    if (Math.hypot(duPos.x - g.x, duPos.y - g.y) < GEFAHR){
      abgenommenBeimFahren(k);
      return;
    }
  }
}

function duLoslassen(){
  if (!bereit()) return;
  if (!keineBahnFrei()){
    duPos.x = lage.du.x; duPos.y = lage.du.y;
    setze(du, duPos);
    puckAnDu();
    return;
  }
  if (duPos.x > TOR_LINIE){
    geschafft = true;
    bahnenG.style.opacity = 0;
    aufgabeEl.textContent = 'Stark! Keine Bahn war frei — du bist selbst gefahren.';
    aufgabeEl.classList.add('geloest');
    feiern(konfetti, du, puls, {x: duPos.x, y: duPos.y});
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
    {duration:500, easing:'ease-out'}
  );
  anwenden(true);
});
neuKnopf.addEventListener('click', () => anwenden(false));

anwenden(true);

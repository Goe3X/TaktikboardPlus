// Stufe 2: "Wer ist frei?"
// Das Kind hat den Puck und TIPPT den Mitspieler an, den es anspielen will.
// Ist keiner frei, zieht es den eigenen Spieler Richtung gegnerisches Tor.
//
// Warum tippen statt ziehen: der Puck lag im Kreis des eigenen Spielers.
// Ein Kinderfinger deckt beides ab und trifft den größeren — die Bedienung
// war damit nicht spielbar. Jetzt sind die Gesten klar getrennt:
//   tippen = passen, ziehen = selbst fahren.

import { svgEl, setze, stern, FARBE } from './svg.js';
import { baueEis, pfeilRichtung } from './eisflaeche.js';
import { machZiehbar } from './ziehen.js';
import { feiern, konfettiLeeren } from './feiern.js';
import { neueSituation } from './situation2.js';

const TOR_LINIE    = 720;           // ab hier gilt "selbst zum Tor gefahren"
const PUCK_ABSTAND = {x:0, y:52};   // wo der Puck am Puckführenden liegt
const TIPP_ZONE    = 75;            // unsichtbare, großzügige Trefferfläche

const AUFGABE = 'Wer ist frei? Tippe ihn an — oder fahr selbst!';

const statusEl    = document.getElementById('statusText');
const aufgabeEl   = document.getElementById('aufgabeText');
const wuerfelIcon = document.getElementById('wuerfelIcon');
const neuKnopf    = document.getElementById('neuKnopf');

// --- Eisfläche -------------------------------------------------------------
const { svg, spieler, konfetti, pfeilGross } = baueEis();
document.querySelector('.eisflaeche').appendChild(svg);

function token(r, fill, extra){
  const g = svgEl('g', {class:'token'});
  g.appendChild(svgEl('circle', {r:r, fill:fill}));
  if (extra) g.appendChild(extra);
  spieler.appendChild(g);
  return g;
}

const gegner = [0,1,2].map(() => token(40, FARBE.geg));

// Mitspieler bekommen eine unsichtbare große Tippfläche — 40 Pixel Radius
// sind für einen Kinderfinger auf dem iPad zu wenig.
const mates = [0,1].map(i => {
  const g = token(40, FARBE.wir);
  g.setAttribute('class', 'token tippbar');
  g.appendChild(svgEl('circle', {r:TIPP_ZONE, fill:'transparent'}));
  g.addEventListener('click', () => tippe(i));
  return g;
});

const du = token(54, FARBE.wir, stern());
du.appendChild(svgEl('circle', {r:66, class:'du-ring'}));
const puls = svgEl('circle', {r:66, class:'puls'});
du.appendChild(puls);

const puck = svgEl('g');
puck.appendChild(svgEl('ellipse', {rx:22, ry:16, fill:'#0C1319', stroke:'#fff', 'stroke-width':5}));
spieler.appendChild(puck);

// --- Zustand ---------------------------------------------------------------
let lage = null;          // aktuelle Situation aus dem Generator
let geschafft = false;
let verloren = false;     // Puck weg — es geht erst mit "Nochmal" weiter
let laeuft = false;       // während einer Animation nichts annehmen
let hatDaneben = false;   // schon einmal falsch gepasst? (pro Situation)
const puckPos = {x:0, y:0};
const duPos   = {x:0, y:0};

function keinerFrei(){ return lage && !lage.frei[0] && !lage.frei[1]; }
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

/**
 * @param {boolean} neu  true = neue Situation würfeln, false = dieselbe nochmal
 */
function anwenden(neu){
  if (neu || !lage){ lage = neueSituation(); hatDaneben = false; }

  duPos.x = lage.du.x; duPos.y = lage.du.y;
  setze(du, duPos);
  lage.mates.forEach((p,i) => setze(mates[i], p));
  lage.geg.forEach((p,i) => setze(gegner[i], p));
  puckAnDu();
  puck.style.opacity = 1;

  farbenSetzen(true);
  aufgabeEl.textContent = AUFGABE;
  aufgabeEl.classList.remove('geloest');
  neuKnopf.classList.remove('ruft');

  geschafft = false;
  verloren  = false;
  laeuft    = false;
  konfettiLeeren(konfetti);

  // Nach einem Fehlversuch zeigen wir, dass er auch selbst fahren darf.
  if (hatDaneben && keinerFrei()) hinweisSelbstFahren();
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

function gelungenerPass(i){
  const ziel = lage.mates[i];
  fliege(puck, puckPos, ziel, 380, () => {
    puckPos.x = ziel.x; puckPos.y = ziel.y;
    geschafft = true;
    aufgabeEl.textContent = 'Super! Der war frei.';
    aufgabeEl.classList.add('geloest');
    feiern(konfetti, mates[i], null, ziel);
  });
}

// Puckverlust in zwei Schritten. Der Pass kommt ZUERST beim Mitspieler an
// und wird ihm dort abgenommen — das erzählt "der war gedeckt".
// Fliegt der Puck direkt zum Gegner, liest es sich als Fehlpass, also als
// Zielfehler statt als Deckungsfehler.
function abgefangen(i){
  const mate = lage.mates[i];
  let nah = 0;
  lage.geg.forEach((g, k) => {
    const dNeu = Math.hypot(g.x - mate.x, g.y - mate.y);
    const dAlt = Math.hypot(lage.geg[nah].x - mate.x, lage.geg[nah].y - mate.y);
    if (dNeu < dAlt) nah = k;
  });
  const abfaenger = lage.geg[nah];

  // 1. Pass kommt an
  fliege(puck, puckPos, mate, 380, () => {
    laeuft = true;                       // bis zum Ende der Kette gesperrt
    // 2. Der Gegner greift zu
    setTimeout(() => {
      gegner[nah].animate(
        [{transform:'translate(' + abfaenger.x + 'px,' + abfaenger.y + 'px) scale(1)'},
         {transform:'translate(' + abfaenger.x + 'px,' + abfaenger.y + 'px) scale(1.35)'},
         {transform:'translate(' + abfaenger.x + 'px,' + abfaenger.y + 'px) scale(1)'}],
        {duration:460, easing:'ease-out'}
      );
      // 3. Puck wechselt zum Gegner
      fliege(puck, mate, abfaenger, 300, () => {
        verloren = true;
        hatDaneben = true;
        farbenSetzen(false);             // Bild kippt auf Violett
        aufgabeEl.textContent = 'Der war gedeckt — der Gegner hat den Puck.';
        aufgabeEl.classList.add('geloest');
        rufeNochmal();
      });
    }, 260);
  });
}

// Er kann nicht lesen: der Nochmal-Knopf muss sich selbst anbieten.
function rufeNochmal(){
  neuKnopf.classList.add('ruft');
}

function hinweisSelbstFahren(){
  puls.animate(
    [{transform:'scale(1)', opacity:.8}, {transform:'scale(1.6)', opacity:0}],
    {duration:1100, iterations:3, easing:'ease-out'}
  );
}

// --- Eingaben --------------------------------------------------------------
function tippe(i){
  if (!bereit()) return;
  if (lage.frei[i]) gelungenerPass(i);
  else abgefangen(i);
}

function duLoslassen(){
  if (!bereit()) return;
  if (!keinerFrei()){          // Passen ist hier die Aufgabe
    duPos.x = lage.du.x; duPos.y = lage.du.y;
    setze(du, duPos);
    puckAnDu();
    return;
  }
  if (duPos.x > TOR_LINIE){
    geschafft = true;
    aufgabeEl.textContent = 'Stark! Keiner war frei — du bist selbst gefahren.';
    aufgabeEl.classList.add('geloest');
    feiern(konfetti, du, puls, {x: duPos.x, y: duPos.y});
  }
}

machZiehbar(svg, du, duPos, {
  beiLoslassen: duLoslassen,
  beiBewegung: puckAnDu,       // der Puck fährt mit
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

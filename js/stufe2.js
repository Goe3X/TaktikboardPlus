// Stufe 2: "Wer ist frei?"
// Das Kind hat den Puck und zieht ihn zu einem Mitspieler.
// Ist keiner frei, fährt es selbst Richtung gegnerisches Tor.

import { svgEl, setze, stern, FARBE } from './svg.js';
import { baueEis, pfeilRichtung, FELD } from './eisflaeche.js';
import { machZiehbar } from './ziehen.js';
import { feiern, konfettiLeeren } from './feiern.js';
import { neueSituation } from './situation2.js';

const PASS_TREFFER = 130;   // wie nah der Puck am Mitspieler landen muss
const TOR_LINIE    = 720;   // ab hier gilt "selbst zum Tor gefahren"
const PUCK_ABSTAND = {x:0, y:52};   // wo der Puck am Puckführenden liegt

const AUFGABE = 'Wer ist frei? Schieb den Puck zu ihm — oder fahr selbst!';

const aufgabeEl   = document.getElementById('aufgabeText');
const wuerfelIcon = document.getElementById('wuerfelIcon');

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
const mates  = [0,1].map(() => token(40, FARBE.wir));

const du = token(54, FARBE.wir, stern());
du.appendChild(svgEl('circle', {r:66, class:'du-ring'}));
const puls = svgEl('circle', {r:66, class:'puls'});
du.appendChild(puls);

// Der Puck liegt oben, damit man ihn immer greifen kann.
const puck = svgEl('g', {class:'token'});
puck.appendChild(svgEl('ellipse', {rx:22, ry:16, fill:'#0C1319', stroke:'#fff', 'stroke-width':5}));
spieler.appendChild(puck);

// --- Zustand ---------------------------------------------------------------
let lage = null;              // aktuelle Situation aus dem Generator
let geschafft = false;
let laeuft = false;           // während einer Animation nichts annehmen
let hatDaneben = false;       // hat er schon einen Fehlpass versucht?
const puckPos = {x:0, y:0};
const duPos   = {x:0, y:0};

function keinerFrei(){ return lage && !lage.frei[0] && !lage.frei[1]; }

function puckAnDu(){
  puckPos.x = duPos.x + PUCK_ABSTAND.x;
  puckPos.y = duPos.y + PUCK_ABSTAND.y;
  setze(puck, puckPos);
}

function anwenden(neu){
  if (neu || !lage) lage = neueSituation();

  duPos.x = lage.du.x; duPos.y = lage.du.y;
  setze(du, duPos);
  lage.mates.forEach((p,i) => setze(mates[i], p));
  lage.geg.forEach((p,i) => setze(gegner[i], p));
  puckAnDu();

  // In Stufe 2 haben immer wir den Puck.
  document.documentElement.style.setProperty('--aktiv', FARBE.wir);
  document.documentElement.style.setProperty('--aktiv-tief', FARBE.wirTief);
  pfeilRichtung(pfeilGross, true, FARBE.wir);

  aufgabeEl.textContent = AUFGABE;
  aufgabeEl.classList.remove('geloest');

  geschafft = false;
  laeuft = false;
  hatDaneben = false;
  konfettiLeeren(konfetti);
}

// --- Puck bewegen ----------------------------------------------------------
// Kleine Hilfsanimation: Element von A nach B fliegen lassen.
function fliege(el, von, nach, dauer, danach){
  laeuft = true;
  const anim = el.animate(
    [{transform:'translate(' + von.x  + 'px,' + von.y  + 'px)'},
     {transform:'translate(' + nach.x + 'px,' + nach.y + 'px)'}],
    {duration:dauer, easing:'cubic-bezier(.3,.8,.4,1)'}
  );
  anim.onfinish = () => {
    setze(el, nach);
    laeuft = false;
    if (danach) danach();
  };
}

function gelungenerPass(zielIndex){
  const ziel = lage.mates[zielIndex];
  fliege(puck, puckPos, ziel, 380, () => {
    puckPos.x = ziel.x; puckPos.y = ziel.y;
    geschafft = true;
    aufgabeEl.textContent = 'Super! Der war frei.';
    aufgabeEl.classList.add('geloest');
    feiern(konfetti, mates[zielIndex], null, ziel);
  });
}

function abgefangen(zielIndex){
  const mate = lage.mates[zielIndex];
  // Der deckende Gegner ist der, der dem Mitspieler am nächsten steht.
  let nah = 0;
  lage.geg.forEach((g,i) => {
    if (Math.hypot(g.x - mate.x, g.y - mate.y) <
        Math.hypot(lage.geg[nah].x - mate.x, lage.geg[nah].y - mate.y)) nah = i;
  });
  const abfaenger = lage.geg[nah];

  // Puck fliegt los, der Gegner schnappt ihn, dann kommt er zurück.
  fliege(puck, puckPos, abfaenger, 330, () => {
    gegner[nah].animate(
      [{transform:'translate(' + abfaenger.x + 'px,' + abfaenger.y + 'px) scale(1)'},
       {transform:'translate(' + abfaenger.x + 'px,' + abfaenger.y + 'px) scale(1.3)'},
       {transform:'translate(' + abfaenger.x + 'px,' + abfaenger.y + 'px) scale(1)'}],
      {duration:420, easing:'ease-out'}
    );
    setTimeout(() => {
      fliege(puck, abfaenger, {x: duPos.x + PUCK_ABSTAND.x, y: duPos.y + PUCK_ABSTAND.y}, 420, () => {
        puckAnDu();
        hatDaneben = true;
        // Erst nach einem Fehlversuch zeigen wir, dass er selbst fahren darf.
        if (keinerFrei()) hinweisSelbstFahren();
      });
    }, 380);
  });
}

// Sanfter Hinweis statt einer Textmeldung: sein Spieler pulsiert.
function hinweisSelbstFahren(){
  puls.animate(
    [{transform:'scale(1)', opacity:.8}, {transform:'scale(1.6)', opacity:0}],
    {duration:1100, iterations:3, easing:'ease-out'}
  );
}

function puckLoslassen(){
  if (geschafft || laeuft) return;

  // Welcher Mitspieler wurde getroffen?
  let treffer = -1, besteEntfernung = PASS_TREFFER;
  lage.mates.forEach((m,i) => {
    const e = Math.hypot(puckPos.x - m.x, puckPos.y - m.y);
    if (e < besteEntfernung){ besteEntfernung = e; treffer = i; }
  });

  if (treffer === -1){ puckAnDu(); return; }        // ins Leere — einfach zurück
  if (lage.frei[treffer]) gelungenerPass(treffer);
  else abgefangen(treffer);
}

// --- Selbst fahren ---------------------------------------------------------
function duLoslassen(){
  if (geschafft || laeuft) return;
  if (!keinerFrei()){ // Passen ist hier die Aufgabe — zurück auf Anfang
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

machZiehbar(svg, puck, puckPos, {
  beiLoslassen: puckLoslassen,
  aktiv: () => !geschafft && !laeuft
});

machZiehbar(svg, du, duPos, {
  beiLoslassen: duLoslassen,
  beiBewegung: puckAnDu,          // der Puck fährt mit
  aktiv: () => !geschafft && !laeuft
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
document.getElementById('neuKnopf').addEventListener('click', () => anwenden(false));

anwenden(true);

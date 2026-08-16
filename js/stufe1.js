// Stufe 1: "Wo muss ich hinfahren?"
// Das Kind zieht seinen Spieler (Stern) an die richtige Stelle.

import { svgEl, setze, stern, FARBE } from './svg.js';
import { baueEis, pfeilRichtung } from './eisflaeche.js';
import { machZiehbar } from './ziehen.js';
import { feiern, konfettiLeeren } from './feiern.js';
import { AUFGABEN } from './aufgaben1.js';

// Ohne sichtbaren Zielkreis muss die Trefferzone großzügig sein.
const TREFFER = 170;

const statusEl    = document.getElementById('statusText');
const aufgabeEl   = document.getElementById('aufgabeText');
const wuerfelIcon = document.getElementById('wuerfelIcon');

// --- Eisfläche einhängen ---------------------------------------------------
const { svg, spieler, konfetti, pfeilGross } = baueEis();
document.querySelector('.eisflaeche').appendChild(svg);

function token(r, fill, extra){
  const g = svgEl('g', {class:'token'});
  g.appendChild(svgEl('circle', {r:r, fill:fill}));
  if (extra) g.appendChild(extra);
  spieler.appendChild(g);
  return g;
}

const gegner = AUFGABEN[0].geg.map(() => token(40, FARBE.geg));
const mates  = AUFGABEN[0].mate.map(() => token(40, FARBE.wir));

const du   = token(54, FARBE.wir, stern());
du.appendChild(svgEl('circle', {r:66, class:'du-ring'}));
const puls = svgEl('circle', {r:66, class:'puls'});
du.appendChild(puls);

const puck = svgEl('g', {class:'token'});
puck.appendChild(svgEl('ellipse', {rx:19, ry:14, fill:'#0C1319', stroke:'#fff', 'stroke-width':4}));
spieler.appendChild(puck);

// --- Zustand ---------------------------------------------------------------
let nr = 0;                  // welche Aufgabe gerade läuft
let geschafft = false;
const pos = {x:0, y:0};

function anwenden(){
  const a = AUFGABEN[nr];
  const istWir = a.puck === 'wir';
  const farbe  = istWir ? FARBE.wir : FARBE.geg;
  const tief   = istWir ? FARBE.wirTief : FARBE.gegTief;

  document.documentElement.style.setProperty('--aktiv', farbe);
  document.documentElement.style.setProperty('--aktiv-tief', tief);
  statusEl.textContent  = istWir ? 'Wir haben den Puck' : 'Gegner hat den Puck';
  aufgabeEl.textContent = a.text;
  aufgabeEl.classList.remove('geloest');

  setze(du, a.start);
  pos.x = a.start.x; pos.y = a.start.y;
  a.mate.forEach((p,i) => setze(mates[i], p));
  a.geg.forEach((p,i) => setze(gegner[i], p));

  // Puck neben den legen, der ihn hat. Bei "wir" ist das ein Mitspieler,
  // nicht das Kind selbst — es soll sich ja anbieten.
  const halter = istWir ? a.mate[0] : a.geg[0];
  setze(puck, {x: halter.x + (istWir ? 44 : -44), y: halter.y + 42});

  pfeilRichtung(pfeilGross, istWir, farbe);

  geschafft = false;
  konfettiLeeren(konfetti);
}

// Zufällig, aber nie zweimal dieselbe hintereinander.
function zufall(){
  const moeglich = AUFGABEN.map((a,i) => i).filter(i => i !== nr);
  if (!moeglich.length) return;
  nr = moeglich[Math.floor(Math.random() * moeglich.length)];
  anwenden();
}

function wuerfeln(){
  wuerfelIcon.animate(
    [{transform:'rotate(0deg) scale(1)'},
     {transform:'rotate(360deg) scale(1.2)'},
     {transform:'rotate(720deg) scale(1)'}],
    {duration:500, easing:'ease-out'}
  );
  zufall();
}

function pruefe(){
  if (geschafft) return;
  const a = AUFGABEN[nr];
  if (Math.hypot(pos.x - a.ziel.x, pos.y - a.ziel.y) < TREFFER){
    setze(du, a.ziel);
    pos.x = a.ziel.x; pos.y = a.ziel.y;
    geschafft = true;
    aufgabeEl.textContent = a.lob;
    aufgabeEl.classList.add('geloest');
    feiern(konfetti, du, puls, a.ziel);
  }
}

machZiehbar(svg, du, pos, pruefe);

document.getElementById('wuerfelKnopf').addEventListener('click', wuerfeln);
document.getElementById('neuKnopf').addEventListener('click', anwenden);

anwenden();

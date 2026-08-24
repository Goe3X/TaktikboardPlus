// Match: Gold gegen Violett auf einem iPad.
//
// DIESER STAND enthält nur den Aufbau — Startaufstellung, Bully mit dem
// Würfel, abwechselndes Platzieren und die Punktetafel. Die Aktionen
// (passen, fahren, schießen) kommen im nächsten Schritt.
//
// Ablauf eines Spielzugs:
//   1. Alle fünf Spieler OHNE Puck werden neu gesetzt, abwechselnd,
//      die verteidigende Mannschaft beginnt
//   2. Die Mannschaft mit Puck führt eine Aktion aus
//
// Der Puckführende wird nicht mitgesetzt — ihn zu bewegen ist eine
// Aktion (Selbstfahren), keine Aufstellung.

import { svgEl, setze, FARBE } from './svg.js';
import { baueEis } from './eisflaeche.js';
import { machZiehbar } from './ziehen.js';
import { wuerfle, starteWuerfel } from './wuerfel.js';
import { MITTE, TEAMS, AUFSTELLUNG, SPIELER_R,
         ZIEL_AUSWAHL, ZIEL_STANDARD, platzFrei } from './matchregeln.js';

const statusEl    = document.getElementById('statusText');
const aufgabeEl   = document.getElementById('aufgabeText');
const wuerfelIcon = document.getElementById('wuerfelIcon');
const wuerfelKnopf= document.getElementById('wuerfelKnopf');
const neuKnopf    = document.getElementById('neuKnopf');
const tafelGold   = document.getElementById('toreGold');
const tafelViolett= document.getElementById('toreViolett');
const tafelZiel   = document.getElementById('zielAnzeige');
const startBox    = document.getElementById('startBox');
const zielKnoepfe = document.getElementById('zielKnoepfe');

// --- Eisfläche -------------------------------------------------------------
const { svg, spieler } = baueEis({ pfeil: false });
document.querySelector('.eisflaeche').appendChild(svg);

function spielstein(farbe){
  const g = svgEl('g', {class:'token'});
  g.appendChild(svgEl('circle', {r: SPIELER_R + 26, class:'wahl-ring'}));
  g.appendChild(svgEl('circle', {r: SPIELER_R, fill: farbe}));
  spieler.appendChild(g);
  return g;
}

const steine = {
  gold:    [0,1,2].map(() => spielstein(FARBE.wir)),
  violett: [0,1,2].map(() => spielstein(FARBE.geg))
};

const puck = svgEl('g');
puck.appendChild(svgEl('ellipse', {rx:22, ry:16, fill:'#0C1319', stroke:'#fff', 'stroke-width':5}));
spieler.appendChild(puck);

// --- Zustand ---------------------------------------------------------------
let ziel = ZIEL_STANDARD;
let tore = {gold: 0, violett: 0};
let pos  = {gold: [], violett: []};
let angreifer = null;          // 'gold' oder 'violett'
let puckSpieler = 0;           // Index innerhalb des angreifenden Teams
let phase = 'start';           // start | bully | platzieren | aktion | ende

// Reihenfolge beim Setzen: Verteidiger beginnt, dann abwechselnd.
let reihe = [];                // [{team, index}, …]
let reiheNr = 0;

function verteidiger(){ return angreifer === 'gold' ? 'violett' : 'gold'; }

function alleSteine(){
  return [...pos.gold.map((p,i) => ({team:'gold', i, p})),
          ...pos.violett.map((p,i) => ({team:'violett', i, p}))];
}

function zeichne(){
  ['gold','violett'].forEach(t =>
    pos[t].forEach((p,i) => setze(steine[t][i], p)));
  if (angreifer) setze(puck, puckNeben(pos[angreifer][puckSpieler]));
  else setze(puck, MITTE);
  tafelGold.textContent    = tore.gold;
  tafelViolett.textContent = tore.violett;
  tafelZiel.textContent    = 'bis ' + ziel;
}

function puckNeben(p){ return {x: p.x, y: p.y + 52}; }

function farbeSetzen(team){
  const f = team === 'gold' ? FARBE.wir : FARBE.geg;
  const tief = team === 'gold' ? FARBE.wirTief : FARBE.gegTief;
  document.documentElement.style.setProperty('--aktiv', f);
  document.documentElement.style.setProperty('--aktiv-tief', tief);
}

// --- Match starten ---------------------------------------------------------
ZIEL_AUSWAHL.forEach(n => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'ziel-knopf' + (n === ZIEL_STANDARD ? ' gewaehlt' : '');
  b.textContent = n;
  b.addEventListener('click', () => {
    ziel = n;
    [...zielKnoepfe.children].forEach(k => k.classList.toggle('gewaehlt', k === b));
  });
  zielKnoepfe.appendChild(b);
});

document.getElementById('startKnopf').addEventListener('click', () => {
  startBox.style.display = 'none';
  tore = {gold: 0, violett: 0};
  zumBully();
});

// --- Bully -----------------------------------------------------------------
function zumBully(){
  phase = 'bully';
  angreifer = null;
  pos.gold    = AUFSTELLUNG.gold.map(p => ({...p}));
  pos.violett = AUFSTELLUNG.violett.map(p => ({...p}));
  ringeAus();
  farbeSetzen('gold');
  statusEl.textContent = 'Bully';
  aufgabeEl.textContent = 'Würfeln — wer bekommt den Puck?';
  wuerfelKnopf.classList.add('ruft');
  zeichne();
}

function bullyWuerfeln(){
  if (phase !== 'bully') return;
  wuerfelKnopf.classList.remove('ruft');
  const anim = wuerfle(wuerfelIcon);
  anim.onfinish = () => {
    // Gerade Augenzahl für Gold, ungerade für Violett — der Würfel
    // entscheidet sichtbar, statt dass im Hintergrund gelost wird.
    angreifer = (letzteAugen() % 2 === 0) ? 'gold' : 'violett';
    puckSpieler = 0;                     // der Spieler am Mittelkreis
    farbeSetzen(angreifer);
    zeichne();
    setTimeout(zumPlatzieren, 500);
  };
}

// Die Augenzahl steht im Würfel-Icon — so bleibt Anzeige und Ergebnis eins.
function letzteAugen(){
  return wuerfelIcon.querySelectorAll('circle').length;
}

// --- Platzieren ------------------------------------------------------------
function zumPlatzieren(){
  phase = 'platzieren';
  const v = verteidiger();
  // Verteidiger beginnt, dann abwechselnd. Der Puckführende ist nicht dabei.
  const vListe = [0,1,2].map(i => ({team: v, index: i}));
  const aListe = [0,1,2].filter(i => i !== puckSpieler)
                        .map(i => ({team: angreifer, index: i}));
  reihe = [];
  for (let i = 0; i < 3; i++){
    if (vListe[i]) reihe.push(vListe[i]);
    if (aListe[i]) reihe.push(aListe[i]);
  }
  reiheNr = 0;
  naechsterStein();
}

function naechsterStein(){
  ringeAus();
  if (reiheNr >= reihe.length){
    phase = 'aktion';
    statusEl.textContent = TEAMS[angreifer].name + ' hat den Puck';
    aufgabeEl.textContent = 'Aufstellung fertig. Die Aktionen kommen im nächsten Schritt.';
    farbeSetzen(angreifer);
    neuKnopf.classList.add('ruft');
    return;
  }
  const dran = reihe[reiheNr];
  farbeSetzen(dran.team);
  statusEl.textContent = TEAMS[angreifer].name + ' hat den Puck';
  aufgabeEl.textContent = TEAMS[dran.team].name + ' stellt auf — Spieler ' +
                          (reiheNr + 1) + ' von ' + reihe.length;
  steine[dran.team][dran.index].classList.add('waehlbar');
}

function ringeAus(){
  ['gold','violett'].forEach(t =>
    steine[t].forEach(s => s.classList.remove('waehlbar')));
}

// Jeder Stein ist ziehbar, aber nur, wenn er gerade an der Reihe ist.
['gold','violett'].forEach(team => {
  steine[team].forEach((stein, index) => {
    const p = {x:0, y:0};
    machZiehbar(svg, stein, p, {
      aktiv: () => phase === 'platzieren' &&
                   reihe[reiheNr] &&
                   reihe[reiheNr].team === team &&
                   reihe[reiheNr].index === index,
      beiBewegung: () => {},
      beiLoslassen: () => {
        const andere = alleSteine()
          .filter(s => !(s.team === team && s.i === index))
          .map(s => s.p);
        if (platzFrei(p, andere, -1)){
          pos[team][index] = {x: p.x, y: p.y};
          reiheNr++;
          zeichne();
          naechsterStein();
        } else {
          // Zu nah an einem anderen Spieler — zurück auf den alten Platz.
          setze(stein, pos[team][index]);
          stein.animate([{opacity:1},{opacity:.4},{opacity:1}], {duration:400});
        }
      }
    });
    // Startwert der Ziehposition mitführen
    stein.addEventListener('pointerdown', () => {
      p.x = pos[team][index].x;
      p.y = pos[team][index].y;
    });
  });
});

// --- Knöpfe ----------------------------------------------------------------
wuerfelKnopf.addEventListener('click', () => {
  if (phase === 'bully') bullyWuerfeln();
  else if (phase === 'aktion' || phase === 'platzieren') zumBully();
  else wuerfle(wuerfelIcon);
});

neuKnopf.addEventListener('click', () => {
  neuKnopf.classList.remove('ruft');
  if (phase === 'aktion' || phase === 'platzieren') zumPlatzieren();
});

starteWuerfel(wuerfelIcon);
zeichne();

// Match: Gold gegen Violett auf einem iPad.
//
// Ablauf eines Spielzugs:
//   1. Alle fünf Spieler OHNE Puck werden neu gesetzt, abwechselnd,
//      die verteidigende Mannschaft beginnt
//   2. Die Mannschaft mit Puck führt EINE Aktion aus
//
// Drei Aktionen, alle innerhalb eines sichtbaren Reichweitenkreises:
//   Aufs Eis tippen  = Pass. Wer dem Zielort am nächsten steht, bekommt
//                      den Puck — auch ein Gegner. Das ersetzt "freier
//                      Mann" und "Pass in den Raum" durch eine Regel.
//   Puckführenden ziehen = selbst fahren. Zu nah an einem Gegner heißt
//                      Puck weg.
//   Auf das Tor tippen   = Schuss. Steht ein Gegner in der Schusslinie,
//                      entscheidet der Würfel.
//
// Der Puckführende wird nicht mitgesetzt — ihn zu bewegen ist eine
// Aktion, keine Aufstellung.

import { svgEl, setze, FARBE } from './svg.js';
import { baueEis } from './eisflaeche.js';
import { machZiehbar } from './ziehen.js';
import { wuerfle, starteWuerfel } from './wuerfel.js';
import { feiern, konfettiLeeren } from './feiern.js';
import { MITTE, TEAMS, AUFSTELLUNG, SPIELER_R, REICHWEITE, GEFAHR,
         TREFFER_AUGEN, ZIEL_AUSWAHL, ZIEL_STANDARD,
         platzFrei, abstandZurLinie } from './matchregeln.js';

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
const { svg, spieler, konfetti } = baueEis({ pfeil: false });
document.querySelector('.eisflaeche').appendChild(svg);

// Pass- und Schusslinie: wird während der Animation gezeigt, damit man
// sieht, warum ein Gegner abfangen konnte.
const linie = svgEl('line', {class:'spiellinie'});
spieler.appendChild(linie);

// Reichweitenkreis um den Puckführenden — was man sieht, ist was gilt.
const reichweite = svgEl('circle', {
  r: REICHWEITE, class:'reichweite'
});
spieler.appendChild(reichweite);

// Antippbare Torflächen. Aktiv ist immer nur das Tor, auf das die
// angreifende Mannschaft spielt.
function torFeld(x){
  const g = svgEl('g', {class:'tor-feld'});
  g.appendChild(svgEl('rect', {x:x-38, y:215, width:76, height:170, rx:18, fill:'transparent'}));
  const glanz = svgEl('rect', {x:x-32, y:222, width:64, height:156, rx:14,
                               fill:'none', stroke:'#fff', 'stroke-width':8, opacity:'0'});
  g.appendChild(glanz);
  spieler.appendChild(g);
  return {g, glanz};
}
const tore_feld = {gold: torFeld(914), violett: torFeld(86)};

function spielstein(farbe, team){
  // Die Mannschaft steht als Klasse am Stein — die Ringfarbe kommt dann
  // aus dem Stylesheet. Über ein stroke-Attribut wäre sie angreifbar:
  // eine CSS-Regel würde es überschreiben.
  const g = svgEl('g', {class: 'token ' + team});
  g.appendChild(svgEl('circle', {r: SPIELER_R + 26, class:'wahl-ring'}));
  g.appendChild(svgEl('circle', {r: SPIELER_R, fill: farbe}));
  spieler.appendChild(g);
  return g;
}

const steine = {
  gold:    [0,1,2].map(() => spielstein(FARBE.wir, 'gold')),
  violett: [0,1,2].map(() => spielstein(FARBE.geg, 'violett'))
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

// Beim Setzen wechseln die Mannschaften ab, aber JEDE wählt selbst,
// welchen ihrer offenen Spieler sie als nächsten stellt.
let gesetzt = {gold:[false,false,false], violett:[false,false,false]};
let amZug = null;              // 'gold' oder 'violett'

// Nach dem Loslassen eines Spielsteins feuert der Browser noch ein
// click-Ereignis. Fällt genau in diesen Moment der Wechsel in die
// Aktionsphase, würde das Setzen des letzten Spielers sofort als Pass
// gewertet. Deshalb eine kurze Sperre nach jedem Zug mit dem Finger.
let klickSperreBis = 0;
const AUFBAU_MS = 560;         // wie lange der Reichweitenkreis aufwächst
function klickSperren(){ klickSperreBis = performance.now() + 400; }

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
  amZug = null;
  pos.gold    = AUFSTELLUNG.gold.map(p => ({...p}));
  pos.violett = AUFSTELLUNG.violett.map(p => ({...p}));
  ringeZeigen();
  farbeSetzen('gold');
  statusEl.textContent = 'Bully';
  aufgabeEl.textContent = 'Würfeln — wer bekommt den Puck?';
  wuerfelKnopf.classList.add('ruft');
  konfettiLeeren(konfetti);
  zeichne();
  aktionAnzeigen();
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
function offene(team){
  return gesetzt[team].filter((g,i) => !g).length;
}

function zumPlatzieren(){
  phase = 'platzieren';
  gesetzt = {gold:[false,false,false], violett:[false,false,false]};
  // Der Puckführende bleibt stehen und gilt als gesetzt.
  gesetzt[angreifer][puckSpieler] = true;
  amZug = verteidiger();          // die verteidigende Mannschaft beginnt
  ringeZeigen();
  aktionAnzeigen();
}

// Nach jedem gesetzten Spieler wechselt das Recht — es sei denn, die
// andere Mannschaft ist schon fertig.
function zugWechseln(){
  const andere = amZug === 'gold' ? 'violett' : 'gold';
  if (offene(andere) > 0) amZug = andere;
  if (offene('gold') === 0 && offene('violett') === 0) aufstellungFertig();
  else ringeZeigen();
}

function aufstellungFertig(){
  phase = 'aktion';
  amZug = null;
  ringeZeigen();
  farbeSetzen(angreifer);
  statusEl.textContent = TEAMS[angreifer].name + ' hat den Puck';
  aufgabeEl.textContent = 'Passen, fahren oder schießen — im hellen Kreis.';
  neuKnopf.classList.remove('ruft');
  aktionAnzeigen();
  reichweiteAufbauen();
}

// --- Aktionen --------------------------------------------------------------
function puckPos(){ return pos[angreifer][puckSpieler]; }

function aktionAnzeigen(){
  if (phase !== 'animation') linieAus();
  const zeigen = phase === 'aktion';
  reichweite.style.display = zeigen ? '' : 'none';
  if (zeigen){
    const p = puckPos();
    reichweite.setAttribute('cx', p.x);
    reichweite.setAttribute('cy', p.y);
  }
  ['gold','violett'].forEach(t => {
    const aktiv = zeigen && t === angreifer;
    tore_feld[t].g.style.display = aktiv ? '' : 'none';
    tore_feld[t].glanz.setAttribute('opacity', aktiv && torInReichweite() ? '.9' : '0');
  });
}

function torInReichweite(){
  if (!angreifer) return false;
  const t = TEAMS[angreifer].tor;
  return Math.hypot(puckPos().x - t.x, puckPos().y - t.y) <= REICHWEITE;
}

function inReichweite(p){
  return Math.hypot(p.x - puckPos().x, p.y - puckPos().y) <= REICHWEITE;
}

function linieZeigen(von, nach){
  linie.setAttribute('x1', von.x); linie.setAttribute('y1', von.y);
  linie.setAttribute('x2', nach.x); linie.setAttribute('y2', nach.y);
  linie.style.display = '';
}

function linieAus(){ linie.style.display = 'none'; }

function reichweiteBlinken(){
  reichweite.animate([{opacity:1},{opacity:.25},{opacity:1}], {duration:700, iterations:2});
}

/**
 * Der Reichweitenkreis wächst auf und blitzt am Ende kurz auf.
 * Solange er wächst, wird nicht getippt — dadurch wird aus der nötigen
 * Klick-Sperre ein sichtbares "jetzt bist du dran" statt einer toten
 * Wartezeit.
 */
function reichweiteAufbauen(){
  klickSperreBis = performance.now() + AUFBAU_MS;
  reichweite.animate([
    {transform:'scale(.06)', opacity:.45},
    {transform:'scale(1)',   opacity:1,  offset:.70},
    {transform:'scale(1.06)', opacity:1, offset:.85},
    {transform:'scale(1)',   opacity:1}
  ], {duration: AUFBAU_MS, easing:'cubic-bezier(.25,.9,.35,1)'});
}

// Animationen
function fliege(el, von, nach, dauer, danach){
  const a = el.animate(
    [{transform:'translate(' + von.x + 'px,' + von.y + 'px)'},
     {transform:'translate(' + nach.x + 'px,' + nach.y + 'px)'}],
    {duration:dauer, easing:'cubic-bezier(.3,.8,.4,1)'});
  a.onfinish = () => { setze(el, nach); if (danach) danach(); };
}

function laufe(el, von, nach, dauer, verzoegerung, danach){
  const a = el.animate(
    [{transform:'translate(' + von.x + 'px,' + von.y + 'px)'},
     {transform:'translate(' + nach.x + 'px,' + nach.y + 'px)'}],
    {duration:dauer, delay:verzoegerung || 0, easing:'cubic-bezier(.4,.1,.3,1)', fill:'both'});
  a.onfinish = () => { setze(el, nach); a.cancel(); if (danach) danach(); };
}

/** Wer steht dem Zielort am nächsten? Der Puckführende zählt nicht mit. */
function naechsterZu(ort){
  let best = null;
  alleSteine().forEach(s => {
    if (s.team === angreifer && s.i === puckSpieler) return;
    const d = Math.hypot(s.p.x - ort.x, s.p.y - ort.y);
    if (!best || d < best.d) best = {team: s.team, i: s.i, p: s.p, d};
  });
  return best;
}

/**
 * Steht ein Gegner im Weg? Liefert seinen Index oder -1.
 * Gilt gleichermaßen für Pass und Schuss: "Gegner in der Linie heißt
 * Würfel" ist damit EINE Regel statt zweier verschiedener.
 * Der Blocker ganz nah am Puckführenden zählt nicht mit — sonst wäre
 * ein Bedränger schon ein Passverbot.
 */
function blockerInLinie(von, nach){
  const gegner = verteidiger();
  let k = -1, best = Infinity;
  pos[gegner].forEach((g, i) => {
    if (Math.hypot(g.x - von.x, g.y - von.y) < 60) return;
    const d = abstandZurLinie(g, von, nach);
    if (d < GEFAHR && d < best){ best = d; k = i; }
  });
  return k;
}

function passe(ort){
  const empfaenger = naechsterZu(ort);
  if (!empfaenger) return;
  const von = puckPos();
  const blocker = blockerInLinie(von, ort);

  phase = 'animation';
  aktionAnzeigen();
  linieZeigen(von, ort);

  if (blocker < 0){ passAusfuehren(empfaenger, ort); return; }

  // Jemand steht im Weg — der Würfel entscheidet, wie beim Schuss.
  aufgabeEl.textContent = 'Ein Gegner steht im Passweg — der Würfel entscheidet!';
  const anim = wuerfle(wuerfelIcon);
  anim.onfinish = () => {
    if (TREFFER_AUGEN.includes(letzteAugen())){
      passAusfuehren(empfaenger, ort);
    } else {
      const gegner = verteidiger();
      const ziel = pos[gegner][blocker];
      fliege(puck, puckNeben(von), puckNeben(ziel), 420, () => {
        linieAus();
        besitzWechsel(gegner, blocker,
                      'Abgefangen! ' + TEAMS[gegner].name + ' hat den Puck.');
      });
    }
  };
}

function passAusfuehren(empfaenger, ort){
  fliege(puck, puckNeben(puckPos()), ort, 480);
  laufe(steine[empfaenger.team][empfaenger.i], empfaenger.p, ort, 620, 160, () => {
    pos[empfaenger.team][empfaenger.i] = {x: ort.x, y: ort.y};
    setze(puck, puckNeben(ort));
    linieAus();
    if (empfaenger.team === angreifer){
      puckSpieler = empfaenger.i;
      weiterMitZug('Angekommen! ' + TEAMS[angreifer].name + ' bleibt am Puck.');
    } else {
      besitzWechsel(empfaenger.team, empfaenger.i,
                    'Da war der Gegner näher — ' + TEAMS[empfaenger.team].name +
                    ' hat den Puck.');
    }
  });
}

function fahre(neuerOrt){
  // Zu nah an einem Gegner? Dann ist der Puck weg.
  const gegner = verteidiger();
  let k = -1;
  pos[gegner].forEach((g, i) => {
    if (Math.hypot(neuerOrt.x - g.x, neuerOrt.y - g.y) < GEFAHR) k = i;
  });
  pos[angreifer][puckSpieler] = {x: neuerOrt.x, y: neuerOrt.y};
  zeichne();
  if (k >= 0){
    phase = 'animation';
    aktionAnzeigen();
    fliege(puck, puckNeben(neuerOrt), puckNeben(pos[gegner][k]), 380, () => {
      besitzWechsel(gegner, k, 'Zu nah! ' + TEAMS[gegner].name + ' hat den Puck.');
    });
  } else {
    weiterMitZug('Gefahren. Weiter geht es.');
  }
}

function schiesse(){
  const von = puckPos();
  const tor = TEAMS[angreifer].tor;
  const gegner = verteidiger();
  const decker = blockerInLinie(von, tor);

  phase = 'animation';
  aktionAnzeigen();
  linieZeigen(von, tor);

  if (decker < 0){
    fliege(puck, puckNeben(von), tor, 340, () => { linieAus(); torGefallen(); });
    return;
  }
  // Gedeckt: der Würfel entscheidet.
  aufgabeEl.textContent = 'Der Schuss ist gedeckt — der Würfel entscheidet!';
  const anim = wuerfle(wuerfelIcon);
  anim.onfinish = () => {
    const augen = letzteAugen();
    if (TREFFER_AUGEN.includes(augen)){
      fliege(puck, puckNeben(von), tor, 340, () => { linieAus(); torGefallen(); });
    } else {
      fliege(puck, puckNeben(von), puckNeben(pos[gegner][decker]), 420, () => {
        linieAus();
        besitzWechsel(gegner, decker,
                      'Geblockt! ' + TEAMS[gegner].name + ' hat den Puck.');
      });
    }
  };
}

function torGefallen(){
  tore[angreifer]++;
  zeichne();
  feiern(konfetti, puck, null, TEAMS[angreifer].tor);
  const glanz = tore_feld[angreifer].glanz;
  glanz.animate([{opacity:1},{opacity:0}], {duration:900, iterations:2});
  statusEl.textContent = 'TOR für ' + TEAMS[angreifer].name;
  aufgabeEl.textContent = tore[angreifer] >= ziel
    ? TEAMS[angreifer].name + ' gewinnt das Match!'
    : 'Tor! Weiter mit dem Bully.';
  if (tore[angreifer] >= ziel){
    phase = 'ende';
    aktionAnzeigen();
    wuerfelKnopf.classList.add('ruft');
    return;
  }
  phase = 'pause';
  aktionAnzeigen();
  setTimeout(zumBully, 1400);
}

function besitzWechsel(team, index, text){
  angreifer = team;
  puckSpieler = index;
  farbeSetzen(angreifer);
  aufgabeEl.textContent = text;
  setze(puck, puckNeben(pos[team][index]));
  phase = 'pause';
  aktionAnzeigen();
  setTimeout(zumPlatzieren, 1100);
}

function weiterMitZug(text){
  aufgabeEl.textContent = text;
  phase = 'pause';
  aktionAnzeigen();
  setTimeout(zumPlatzieren, 900);
}

function ringeZeigen(){
  ['gold','violett'].forEach(t => steine[t].forEach((s,i) => {
    const offen = phase === 'platzieren' && !gesetzt[t][i];
    s.classList.toggle('offen', offen);
    s.classList.toggle('am-zug', offen && t === amZug);
  }));
  if (phase !== 'platzieren') return;
  farbeSetzen(amZug);
  statusEl.textContent = TEAMS[angreifer].name + ' hat den Puck';
  const n = offene(amZug);
  aufgabeEl.textContent = TEAMS[amZug].name + ' stellt auf — noch ' + n +
                          (n === 1 ? ' Spieler' : ' Spieler');
}

// Jeder Stein ist ziehbar, aber nur, wenn er gerade an der Reihe ist.
['gold','violett'].forEach(team => {
  steine[team].forEach((stein, index) => {
    const p = {x:0, y:0};
    const darfSetzen = () => phase === 'platzieren' &&
                              team === amZug &&
                              !gesetzt[team][index];
    // In der Aktionsphase darf nur der Puckführende fahren.
    const darfFahren = () => phase === 'aktion' &&
                             team === angreifer &&
                             index === puckSpieler;

    machZiehbar(svg, stein, p, {
      aktiv: () => darfSetzen() || darfFahren(),
      beiBewegung: () => {
        if (darfFahren()) setze(puck, puckNeben(p));
      },
      beiLoslassen: () => {
        if (darfFahren()){
          if (!inReichweite(p)){
            setze(stein, pos[team][index]);
            setze(puck, puckNeben(pos[team][index]));
            reichweiteBlinken();
            klickSperren();
            return;
          }
          fahre(p);
          return;
        }
        const andere = alleSteine()
          .filter(s => !(s.team === team && s.i === index))
          .map(s => s.p);
        if (platzFrei(p, andere, -1)){
          pos[team][index] = {x: p.x, y: p.y};
          gesetzt[team][index] = true;
          zeichne();
          klickSperren();
          zugWechseln();
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

// --- Tippen auf dem Eis ----------------------------------------------------
function svgPunkt(ev){
  const pt = svg.createSVGPoint();
  pt.x = ev.clientX; pt.y = ev.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}

svg.addEventListener('click', ev => {
  if (phase !== 'aktion') return;
  if (performance.now() < klickSperreBis) return;
  // Der Puckführende wird gezogen, nicht angetippt.
  if (steine[angreifer][puckSpieler].contains(ev.target)) return;

  // Auf das eigene Angriffstor getippt? Dann ist es ein Schuss.
  if (tore_feld[angreifer].g.contains(ev.target)){
    if (!torInReichweite()){ reichweiteBlinken(); return; }
    schiesse();
    return;
  }

  const p = svgPunkt(ev);
  if (!inReichweite(p)){ reichweiteBlinken(); return; }
  passe(p);
});

// --- Knöpfe ----------------------------------------------------------------
wuerfelKnopf.addEventListener('click', () => {
  if (phase === 'bully'){ bullyWuerfeln(); return; }
  if (phase === 'ende'){
    // Neues Match mit demselben Ziel.
    wuerfelKnopf.classList.remove('ruft');
    tore = {gold: 0, violett: 0};
    zumBully();
    return;
  }
  if (phase === 'aktion' || phase === 'platzieren') zumBully();
});

// Aufstellung des laufenden Spielzugs verwerfen und neu setzen.
neuKnopf.addEventListener('click', () => {
  neuKnopf.classList.remove('ruft');
  if (phase === 'aktion' || phase === 'platzieren') zumPlatzieren();
});

starteWuerfel(wuerfelIcon);
zeichne();

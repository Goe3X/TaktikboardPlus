// Macht einen Spielstein ziehbar — mit Finger, Maus und Pfeiltasten.
// Jede Stufe sagt nur, was beim Loslassen passieren soll.

import { setze } from './svg.js';
import { begrenze } from './eisflaeche.js';

/**
 * @param {SVGSVGElement} svg      die Eisfläche (für die Koordinatenumrechnung)
 * @param {SVGGElement}   el       der Spielstein
 * @param {object}        pos      { x, y } — wird laufend aktualisiert
 * @param {Function}      beiLoslassen  wird nach jedem Zug aufgerufen
 * @param {Function}      aktiv     liefert false, wenn gerade nicht gezogen werden darf
 */
export function machZiehbar(svg, el, pos, beiLoslassen, aktiv = () => true){
  let zieht = false;

  function svgPunkt(ev){
    const pt = svg.createSVGPoint();
    pt.x = ev.clientX; pt.y = ev.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }

  el.addEventListener('pointerdown', ev => {
    if (!aktiv()) return;
    zieht = true;
    el.classList.add('zieht');
    el.setPointerCapture(ev.pointerId);
    ev.preventDefault();
  });

  el.addEventListener('pointermove', ev => {
    if (!zieht) return;
    const p = begrenze(svgPunkt(ev));
    pos.x = p.x; pos.y = p.y;
    setze(el, pos);
  });

  function loslassen(){
    if (!zieht) return;
    zieht = false;
    el.classList.remove('zieht');
    beiLoslassen();
  }
  el.addEventListener('pointerup', loslassen);
  el.addEventListener('pointercancel', loslassen);

  // Tastatur — praktisch zum Testen am Rechner.
  let timer = null;
  document.addEventListener('keydown', ev => {
    if (!aktiv()) return;
    const m = {ArrowLeft:[-1,0], ArrowRight:[1,0], ArrowUp:[0,-1], ArrowDown:[0,1]}[ev.key];
    if (!m) return;
    ev.preventDefault();
    const p = begrenze({x: pos.x + m[0]*25, y: pos.y + m[1]*25});
    pos.x = p.x; pos.y = p.y;
    el.classList.add('zieht');
    setze(el, pos);
    clearTimeout(timer);
    timer = setTimeout(() => { el.classList.remove('zieht'); beiLoslassen(); }, 220);
  });
}

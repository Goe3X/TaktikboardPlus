// Baut die Eisfläche: Rink, Linien, Tore, Riesenpfeil.
// Wird von jeder Stufe und von den Vorschaubildern der Startseite benutzt.

import { svgEl } from './svg.js';

// Koordinatensystem aller Stufen. Nicht ändern, ohne die Aufgaben anzupassen.
export const FELD = {
  breite: 1000,
  hoehe: 600,
  // Rand, innerhalb dessen sich Spielsteine bewegen dürfen
  minX: 70, maxX: 930,
  minY: 70, maxY: 530
};

let clipZaehler = 0;

/**
 * Erzeugt ein <svg> mit der kompletten Eisfläche.
 * Rückgabe: { svg, spieler, konfetti, pfeilGross }
 * spieler und konfetti sind leere <g>, in die die Stufe ihre Figuren hängt.
 */
export function baueEis({ pfeil = true, interaktiv = true } = {}){
  const id = 'eisClip' + (++clipZaehler);

  const svg = svgEl('svg', {
    viewBox: '0 0 ' + FELD.breite + ' ' + FELD.hoehe,
    preserveAspectRatio: 'xMidYMid meet',
    'aria-label': 'Eisfläche'
  });
  if (!interaktiv) svg.setAttribute('aria-hidden', 'true');

  const defs = svgEl('defs');
  const clip = svgEl('clipPath', {id: id});
  clip.appendChild(svgEl('rect', {x:10, y:10, width:980, height:580, rx:120}));
  defs.appendChild(clip);
  svg.appendChild(defs);

  // Eis
  svg.appendChild(svgEl('rect', {
    x:10, y:10, width:980, height:580, rx:120,
    fill:'var(--eis)', stroke:'#fff', 'stroke-width':10
  }));

  const innen = svgEl('g', {'clip-path':'url(#' + id + ')'});

  // Riesenpfeil: die Eisfläche selbst zeigt die Angriffsrichtung.
  let pfeilGross = null;
  if (pfeil){
    pfeilGross = svgEl('g', {class:'pfeil-gross', fill:'var(--wir)', opacity:'.16'});
    pfeilGross.appendChild(svgEl('path', {
      d:'M 180 260 H 640 V 190 L 830 300 L 640 410 V 340 H 180 Z'
    }));
    innen.appendChild(pfeilGross);
  }

  // Markierungen
  const marken = [
    ['line',   {x1:500, y1:10, x2:500, y2:590, stroke:'var(--linie-rot)',  'stroke-width':8, opacity:'.5'}],
    ['circle', {cx:500, cy:300, r:70, fill:'none', stroke:'var(--linie-blau)', 'stroke-width':7, opacity:'.5'}],
    ['circle', {cx:500, cy:300, r:12, fill:'var(--linie-rot)', opacity:'.6'}],
    ['line',   {x1:150, y1:10, x2:150, y2:590, stroke:'var(--linie-rot)', 'stroke-width':7, opacity:'.45'}],
    ['line',   {x1:850, y1:10, x2:850, y2:590, stroke:'var(--linie-rot)', 'stroke-width':7, opacity:'.45'}],
    ['path',   {d:'M 150 210 A 90 90 0 0 1 150 390 Z', fill:'var(--linie-blau)', opacity:'.16'}],
    ['path',   {d:'M 850 210 A 90 90 0 0 0 850 390 Z', fill:'var(--linie-blau)', opacity:'.16'}]
  ];
  marken.forEach(([tag, attrs]) => innen.appendChild(svgEl(tag, attrs)));
  svg.appendChild(innen);

  // Tore in Teamfarben: links unser Tor, rechts das des Gegners.
  // Die Seiten bleiben immer gleich — sonst verliert man die Orientierung.
  const tore = svgEl('g', {stroke:'#fff', 'stroke-width':6});
  tore.appendChild(svgEl('rect', {x:86,  y:235, width:46, height:130, rx:14, fill:'var(--wir)'}));
  tore.appendChild(svgEl('rect', {x:868, y:235, width:46, height:130, rx:14, fill:'var(--gegner)'}));
  svg.appendChild(tore);

  const spieler  = svgEl('g');
  const konfetti = svgEl('g');
  svg.appendChild(spieler);
  svg.appendChild(konfetti);

  return { svg, spieler, konfetti, pfeilGross };
}

// Dreht den Riesenpfeil: nach vorne (wir) oder zurück (Gegner).
export function pfeilRichtung(pfeilGross, istWir, farbe){
  if (!pfeilGross) return;
  pfeilGross.setAttribute('fill', farbe);
  pfeilGross.setAttribute('transform',
    istWir ? 'translate(0,0)' : 'translate(1000,600) rotate(180)');
}

// Hält einen Punkt innerhalb der Eisfläche.
export function begrenze(p){
  return {
    x: Math.max(FELD.minX, Math.min(FELD.maxX, p.x)),
    y: Math.max(FELD.minY, Math.min(FELD.maxY, p.y))
  };
}

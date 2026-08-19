// Vorschaubilder für die Kacheln der Startseite.
// Er kann noch nicht lesen — das Bild muss die Stufe erkennbar machen.
// Deshalb zeigt jede Kachel die Eisfläche mit genau der Geste dieser Stufe.

import { svgEl, stern, FARBE } from './svg.js';
import { baueEis } from './eisflaeche.js';

function spielstein(x, y, r, fill, mitStern){
  const g = svgEl('g', {transform:'translate(' + x + ',' + y + ')'});
  g.appendChild(svgEl('circle', {r:r, fill:fill, stroke:'#fff', 'stroke-width':5}));
  if (mitStern) g.appendChild(stern(26));
  return g;
}

// Stufe 1: Spieler mit gestricheltem Weg zu seiner Position.
export function vorschauStufe1(){
  const { svg, spieler } = baueEis({ interaktiv:false });

  spieler.appendChild(svgEl('path', {
    d:'M 300 420 Q 480 380 660 300',
    fill:'none', stroke:'#fff', 'stroke-width':14,
    'stroke-dasharray':'30 26', 'stroke-linecap':'round', opacity:'.85'
  }));
  spieler.appendChild(spielstein(810, 220, 40, FARBE.geg));
  spieler.appendChild(spielstein(790, 420, 40, FARBE.geg));
  spieler.appendChild(spielstein(560, 140, 40, FARBE.wir));
  spieler.appendChild(spielstein(660, 300, 54, FARBE.wir, true));

  return svg;
}

// Stufe 2: Puck wird zum freien Mitspieler gespielt, der andere ist gedeckt.
export function vorschauStufe2(){
  const { svg, spieler } = baueEis({ interaktiv:false });

  // Passlinie zum freien Mann
  spieler.appendChild(svgEl('path', {
    d:'M 290 320 L 690 460',
    fill:'none', stroke:'#fff', 'stroke-width':14,
    'stroke-dasharray':'30 26', 'stroke-linecap':'round', opacity:'.85'
  }));

  // Oben: gedeckter Mitspieler, Gegner klebt daneben
  spieler.appendChild(spielstein(620, 165, 40, FARBE.wir));
  spieler.appendChild(spielstein(715, 190, 40, FARBE.geg));
  // Unten: freier Mitspieler
  spieler.appendChild(spielstein(690, 460, 40, FARBE.wir));
  // Bedränger
  spieler.appendChild(spielstein(420, 250, 40, FARBE.geg));

  spieler.appendChild(spielstein(250, 300, 54, FARBE.wir, true));

  // Puck
  const p = svgEl('g', {transform:'translate(250,352)'});
  p.appendChild(svgEl('ellipse', {rx:22, ry:16, fill:'#0C1319', stroke:'#fff', 'stroke-width':5}));
  spieler.appendChild(p);

  return svg;
}

// Stufe 3: Pass in den freien Raum vor einem laufenden Mitspieler.
export function vorschauStufe3(){
  const { svg, spieler } = baueEis({ interaktiv:false });

  function bahn(x1, y1, x2, y2){
    const g = svgEl('g');
    g.appendChild(svgEl('line', {
      x1:x1, y1:y1, x2:x2, y2:y2,
      stroke:'var(--wir)', 'stroke-width':210, 'stroke-linecap':'round',
      opacity:'.26'
    }));
    const grad = Math.atan2(y2-y1, x2-x1) * 180 / Math.PI;
    const ex = x1 + Math.cos(Math.atan2(y2-y1, x2-x1)) * 64;
    const ey = y1 + Math.sin(Math.atan2(y2-y1, x2-x1)) * 64;
    g.appendChild(svgEl('path', {
      d:'M -22 -26 L 30 0 L -22 26 L -10 0 Z',
      fill:'var(--wir)', stroke:'#fff', 'stroke-width':4,
      transform:'translate(' + ex + ',' + ey + ') rotate(' + grad + ')'
    }));
    return g;
  }

  spieler.appendChild(bahn(470, 430, 740, 480));   // freie Bahn unten
  spieler.appendChild(bahn(490, 170, 750, 130));   // versperrte Bahn oben

  spieler.appendChild(spielstein(490, 170, 40, FARBE.wir));
  spieler.appendChild(spielstein(680, 145, 40, FARBE.geg));   // steht in der Bahn
  spieler.appendChild(spielstein(470, 430, 40, FARBE.wir));
  spieler.appendChild(spielstein(340, 250, 40, FARBE.geg));

  spieler.appendChild(spielstein(210, 300, 54, FARBE.wir, true));

  // Puck fliegt in den freien Raum
  const p = svgEl('g', {transform:'translate(650,466)'});
  p.appendChild(svgEl('ellipse', {rx:22, ry:16, fill:'#0C1319', stroke:'#fff', 'stroke-width':5}));
  spieler.appendChild(p);

  return svg;
}

// Registry: hier kommen die nächsten Stufen dazu.
export const VORSCHAU = {
  stufe1: vorschauStufe1,
  stufe2: vorschauStufe2,
  stufe3: vorschauStufe3
};

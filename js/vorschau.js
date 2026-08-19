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

  // Freie Laufbahn nach unten rechts
  spieler.appendChild(svgEl('line', {
    x1:470, y1:430, x2:760, y2:490,
    stroke:'#fff', 'stroke-width':210, 'stroke-linecap':'round', opacity:'.15'
  }));
  spieler.appendChild(svgEl('path', {
    d:'M -30 -34 L 34 0 L -30 34 L -14 0 Z', fill:'#fff', opacity:'.32',
    transform:'translate(760,490) rotate(12)'
  }));
  // Versperrte Laufbahn oben
  spieler.appendChild(svgEl('line', {
    x1:490, y1:170, x2:770, y2:120,
    stroke:'#fff', 'stroke-width':210, 'stroke-linecap':'round', opacity:'.15'
  }));

  spieler.appendChild(spielstein(490, 170, 40, FARBE.wir));
  spieler.appendChild(spielstein(690, 140, 40, FARBE.geg));   // steht in der Bahn
  spieler.appendChild(spielstein(470, 430, 40, FARBE.wir));
  spieler.appendChild(spielstein(370, 250, 40, FARBE.geg));

  spieler.appendChild(spielstein(220, 300, 54, FARBE.wir, true));

  // Puck fliegt in den freien Raum
  const p = svgEl('g', {transform:'translate(640,468)'});
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

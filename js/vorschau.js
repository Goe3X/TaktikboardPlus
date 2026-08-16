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

// Registry: hier kommen die nächsten Stufen dazu.
export const VORSCHAU = {
  stufe1: vorschauStufe1
};

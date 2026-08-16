// Kleine SVG-Helfer, die alle Stufen brauchen.
//
// WICHTIG: SVG-Knoten immer hierüber bauen, nie mit innerHTML.
// innerHTML funktioniert auf SVG-Elementen in iOS-Safari nicht zuverlässig
// und bricht das ganze Skript ab — das hat uns schon einmal einen Abend gekostet.

export const NS = 'http://www.w3.org/2000/svg';

export function svgEl(tag, attrs){
  const el = document.createElementNS(NS, tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}

// Positioniert ein Element auf der Eisfläche.
export function setze(el, p){
  el.setAttribute('transform', 'translate(' + p.x + ',' + p.y + ')');
}

// Liest eine CSS-Variable aus (für die Farben aus board.css).
export function cssFarbe(name){
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export const FARBE = {
  get wir()    { return cssFarbe('--wir'); },
  get wirTief(){ return cssFarbe('--wir-tief'); },
  get geg()    { return cssFarbe('--gegner'); },
  get gegTief(){ return cssFarbe('--gegner-tief'); }
};

// Der Stern kennzeichnet den Spieler, den das Kind steuert.
export function stern(groesse = 26){
  const f = groesse / 26;
  const p = [
    [0,-26],[7.6,-8.4],[26.5,-8.4],[11.5,3.2],[17,21],
    [0,10.5],[-17,21],[-11.5,3.2],[-26.5,-8.4],[-7.6,-8.4]
  ].map(([x,y]) => (x*f).toFixed(1) + ' ' + (y*f).toFixed(1));
  return svgEl('path', {d:'M' + p.join(' L') + ' Z', fill:'#fff'});
}

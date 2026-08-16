// Die Belohnung, wenn eine Aufgabe gelöst ist.
// Bewusst kräftig — das ist für ein Kind der eigentliche Grund weiterzuspielen.

import { svgEl } from './svg.js';

const FARBEN = ['#F2A413', '#FFFFFF', '#FFD874', '#2B5FA8'];

/**
 * @param {SVGGElement} konfettiG  leere Gruppe, in die die Sterne gehängt werden
 * @param {SVGGElement} figur      der Spielstein, der hüpfen soll
 * @param {SVGCircleElement} puls  der Ring, der sich abstößt
 * @param {{x:number,y:number}} ort  wo gefeiert wird
 */
export function feiern(konfettiG, figur, puls, ort){
  if (puls){
    puls.animate(
      [{transform:'scale(1)', opacity:.95}, {transform:'scale(2.4)', opacity:0}],
      {duration:700, easing:'ease-out'}
    );
  }

  if (figur){
    const t = 'translate(' + ort.x + 'px,' + ort.y + 'px) ';
    figur.animate(
      [{transform:t + 'scale(1)'}, {transform:t + 'scale(1.35)'}, {transform:t + 'scale(1)'}],
      {duration:520, easing:'ease-out'}
    );
  }

  const anzahl = 14;
  for (let i = 0; i < anzahl; i++){
    const winkel = (Math.PI * 2 / anzahl) * i + Math.random() * .4;
    const weite  = 130 + Math.random() * 110;
    const s = svgEl('path', {
      d:'M0 -13 L3.8 -4.2 L13.2 -4.2 L5.7 1.6 L8.5 10.5 L0 5.2 L-8.5 10.5 L-5.7 1.6 L-13.2 -4.2 L-3.8 -4.2 Z',
      fill: FARBEN[i % FARBEN.length],
      transform: 'translate(' + ort.x + ',' + ort.y + ')'
    });
    konfettiG.appendChild(s);
    const anim = s.animate([
      {transform:'translate(' + ort.x + 'px,' + ort.y + 'px) scale(.4) rotate(0deg)', opacity:1},
      {transform:'translate(' + (ort.x + Math.cos(winkel) * weite) + 'px,' +
                                (ort.y + Math.sin(winkel) * weite) + 'px) scale(1.5) rotate(' +
                                (Math.random() * 540 - 270) + 'deg)', opacity:0}
    ], {duration: 750 + Math.random() * 350, easing:'cubic-bezier(.2,.7,.4,1)'});
    anim.onfinish = () => s.remove();
  }
}

// Alte Sterne wegräumen, bevor eine neue Aufgabe startet.
export function konfettiLeeren(konfettiG){
  while (konfettiG.firstChild) konfettiG.removeChild(konfettiG.firstChild);
}

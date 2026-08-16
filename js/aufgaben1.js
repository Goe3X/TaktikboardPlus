// Aufgaben für Stufe 1: "Wo muss ich hinfahren?"
//
// Neue Aufgabe anlegen: Block unten anhängen, sonst ist nichts anzupassen.
//   puck  'wir' oder 'gegner' — bestimmt Farbe, Pfeilrichtung, Statuszeile
//   start wo das Kind anfängt   \  die beiden dürfen NIE gleich sein,
//   ziel  wo es hin soll        /  sonst gibt es nichts zu tun
//   mate  zwei Mitspieler
//   geg   drei Gegner
//   text  wird vorgelesen
//   lob   erscheint, wenn es gelöst ist
//
// Faustregeln: Abstand start↔ziel mindestens 200, und auf dem Ziel
// darf kein anderer Spielstein stehen (Ausnahme: wenn die Aufgabe
// genau das verlangt, wie beim Stören).

export const AUFGABEN = [
  {
    puck:'wir',
    start:{x:280, y:430},
    ziel: {x:700, y:300},
    mate: [{x:610, y:120},{x:560, y:480}],
    geg:  [{x:810, y:210},{x:820, y:400},{x:470, y:300}],
    text:'Wir haben den Puck! Fahr nach vorne und biete dich an.',
    lob: 'Super! Vorne hilft man mit.'
  },
  {
    puck:'wir',
    start:{x:620, y:300},
    ziel: {x:790, y:470},
    mate: [{x:540, y:170},{x:330, y:380}],
    geg:  [{x:700, y:180},{x:760, y:300},{x:480, y:460}],
    text:'Dein Freund hat den Puck. Fahr zum Tor, damit er dir zuspielen kann!',
    lob: 'Genau! Vor dem Tor kannst du Tore schießen.'
  },
  {
    puck:'wir',
    start:{x:250, y:170},
    ziel: {x:500, y:300},
    mate: [{x:180, y:400},{x:700, y:210}],
    geg:  [{x:380, y:250},{x:620, y:430},{x:800, y:330}],
    text:'Der Puck kommt aus unserer Ecke. Fahr in die Mitte und hol ihn ab!',
    lob: 'Toll! In der Mitte bist du gut zu finden.'
  },
  {
    puck:'gegner',
    start:{x:730, y:180},
    ziel: {x:300, y:300},
    mate: [{x:380, y:140},{x:360, y:465}],
    geg:  [{x:520, y:300},{x:430, y:150},{x:450, y:455}],
    text:'Der Gegner hat den Puck! Fahr zurück vor dein Tor.',
    lob: 'Stark! Du hilfst hinten mit.'
  },
  {
    puck:'gegner',
    start:{x:520, y:150},
    ziel: {x:330, y:430},
    mate: [{x:300, y:180},{x:600, y:320}],
    geg:  [{x:450, y:450},{x:640, y:170},{x:720, y:400}],
    text:'Ein Gegner fährt zu deinem Tor. Fahr zwischen ihn und das Tor!',
    lob: 'Klasse! Immer zwischen Gegner und Tor.'
  },
  {
    puck:'gegner',
    start:{x:800, y:300},
    ziel: {x:540, y:235},
    mate: [{x:400, y:420},{x:250, y:280}],
    geg:  [{x:620, y:170},{x:700, y:430},{x:450, y:300}],
    text:'Der Gegner ganz nah bei dir hat den Puck. Fahr hin und störe ihn!',
    lob: 'Ja! Nah dran ist er nervös.'
  }
];

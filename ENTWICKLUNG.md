# Taktikboard — Entwicklerdokumentation

Interaktives Eishockey-Lernspiel für Kinder ab ca. 5 Jahren. Läuft als
statische Website ohne Build-Schritt, gehostet über GitHub Pages, auf dem
iPad als PWA vom Home-Bildschirm.

## Grundannahmen

Diese Punkte prägen fast jede Entscheidung im Code. Wer sie ignoriert,
baut versehentlich etwas, das für die Zielgruppe nicht funktioniert.

- **Die Zielgruppe kann nicht lesen.** Jede Bedienung muss über Bild,
  Farbe und Form funktionieren. Text im Spiel ist zum Vorlesen durch
  einen Erwachsenen da, nicht zur Bedienung.
- **Eine Aussage pro Bildschirm.** Zwei konkurrierende Richtungsanzeigen
  oder zwei ähnlich wichtige Knöpfe überfordern.
- **Kein Tadel bei Fehlern.** Ein falscher Zug wird gezeigt, nicht
  gemeldet — keine roten Kreuze, keine Fehlertexte, sofort neuer Versuch.
- **Was gezeigt wird, muss sichtbar wahr sein.** Wenn das Spiel einen
  Mitspieler als „gedeckt" bewertet, muss man das auf dem Bild erkennen.
  Berechnete Wahrheiten ohne visuelle Entsprechung wirken willkürlich.

## Dateien

```
index.html            Startseite: Bildkacheln zur Stufenauswahl
stufe1.html           Stufe 1 — "Wo muss ich hinfahren?"
stufe2.html           Stufe 2 — "Wer ist frei?"
manifest.webmanifest  PWA-Manifest (Vollbild, Querformat)
sw.js                 Service Worker für Offline-Betrieb
icon-{180,192,512}.png

css/board.css         gesamtes Layout, alle Stufen

js/svg.js             SVG-Helfer, Farbzugriff, Sternform
js/eisflaeche.js      Rink, Linien, Tore, Riesenpfeil, Feldkoordinaten
js/ziehen.js          Zieh-Steuerung (Finger, Maus, Pfeiltasten)
js/feiern.js          Erfolgsanimation (Konfetti, Hüpfer, Ring)
js/offline.js         Service-Worker-Registrierung
js/vorschau.js        Kachelbilder der Startseite
js/start.js           baut die Startseite aus der Stufenliste

js/stufe1.js          Spiellogik Stufe 1
js/aufgaben1.js       handgeschriebene Aufgabendaten für Stufe 1
js/stufe2.js          Spiellogik Stufe 2
js/situation2.js      Zufallsgenerator für Stufe 2
```

Jede Stufe ist eine eigene HTML-Seite mit eigenem Modul. Gemeinsames liegt
genau einmal in `js/` und `css/`. Der Grund ist Erfahrung: solange die
Eisfläche in jeder Stufe kopiert war, musste jeder Fehler mehrfach
repariert werden.

## Koordinatensystem

Alle Stufen rechnen in einem festen SVG-Koordinatensystem, definiert in
`js/eisflaeche.js`:

| Größe            | Wert                        |
|------------------|-----------------------------|
| Feld             | 1000 × 600                  |
| Bewegungsbereich | x 70–930, y 70–530          |
| Spielstein       | Radius 40                   |
| Eigener Spieler  | Radius 54, mit weißem Ring  |
| Tor links        | eigenes Tor, Farbe `--wir`  |
| Tor rechts       | Gegnertor, Farbe `--gegner` |

Die Torseiten sind **fix**. Der Riesenpfeil auf dem Eis dreht sich je nach
Puckbesitz, die Tore nicht — „mein Tor ist links" soll eine merkbare Regel
bleiben.

## Farben

Definiert als CSS-Variablen in `css/board.css`. Zwei davon werden zur
Laufzeit umgesetzt und färben die Bande, den Riesenpfeil und den Würfel:

| Variable       | Bedeutung                          |
|----------------|------------------------------------|
| `--wir`        | eigenes Team (Gold)                |
| `--gegner`     | Gegner (Violett)                   |
| `--aktiv`      | Farbe der Seite, die den Puck hat  |
| `--aktiv-tief` | dunklere Fassung für die Bande     |

Spielsteine holen ihre Farbe über `FARBE` aus `js/svg.js`, das die
Variablen ausliest. Wer die Teamfarben ändert, ändert damit automatisch
auch die Tore und die Bande.

## Gemeinsame Module

### `js/svg.js`

`svgEl(tag, attrs)` ist der einzige erlaubte Weg, SVG-Knoten zu erzeugen.

> **Nie `innerHTML` auf SVG-Elementen verwenden.** In iOS-Safari
> funktioniert das nicht zuverlässig und bricht das gesamte Skript ab.
> Das Symptom ist unscheinbar: Figuren erscheinen nicht und Knöpfe
> reagieren nicht, weil der Rest des Moduls nie ausgeführt wurde.

Weiter enthalten: `setze(el, punkt)` zum Positionieren, `stern(groesse)`
für die Markierung des eigenen Spielers, `FARBE` für den Zugriff auf die
CSS-Variablen.

### `js/eisflaeche.js`

`baueEis({ pfeil, interaktiv })` liefert `{ svg, spieler, konfetti,
pfeilGross }`. `spieler` und `konfetti` sind leere `<g>`, in die die Stufe
ihre Figuren hängt. Mit `interaktiv: false` entsteht eine reine Grafik für
die Startseitenkacheln.

`pfeilRichtung(pfeilGross, istWir, farbe)` dreht den Riesenpfeil.
`begrenze(punkt)` hält einen Punkt im Bewegungsbereich.

### `js/ziehen.js`

```js
machZiehbar(svg, element, pos, {
  beiLoslassen,   // nach jedem Zug — hier prüft die Stufe das Ergebnis
  beiBewegung,    // während des Ziehens, z. B. damit der Puck mitfährt
  aktiv           // false blockiert das Ziehen (Animation läuft, gelöst)
});
```

`pos` ist ein Objekt, das laufend aktualisiert wird — die Stufe liest
daraus die aktuelle Position. Pfeiltasten sind mit abgedeckt, was das
Testen am Rechner erheblich erleichtert.

### `js/feiern.js`

`feiern(konfettiGruppe, figur, puls, ort)` spielt die Belohnung ab:
Ring stößt sich ab, Figur hüpft, 14 Sterne fliegen auseinander.
`konfettiLeeren(gruppe)` räumt vor einer neuen Aufgabe auf.

## Stufe 1 — „Wo muss ich hinfahren?"

Handgeschriebene Aufgaben in `js/aufgaben1.js`. Das ist Absicht: jede
Aufgabe vermittelt eine **andere** Lektion (sich anbieten, in die Mitte
fahren, zwischen Gegner und Tor). Diese Vielfalt lässt sich nicht
generieren, sie ist der Inhalt.

Aufbau einer Aufgabe:

```js
{
  puck:'wir',                 // 'wir' oder 'gegner' — Farbe, Pfeil, Status
  start:{x:280, y:430},       // wo das Kind anfängt
  ziel: {x:700, y:300},       // wo es hin soll
  mate: [{...},{...}],        // zwei Mitspieler
  geg:  [{...},{...},{...}],  // drei Gegner
  text:'…',                   // wird vorgelesen
  lob: '…'                    // erscheint bei Erfolg
}
```

Regeln beim Anlegen neuer Aufgaben:

- Abstand `start` ↔ `ziel` mindestens 200. Sonst steht das Kind schon
  auf der Lösung und hat nichts zu tun.
- Auf dem Ziel darf kein anderer Spielstein stehen — Ausnahme: die
  Aufgabe verlangt genau das, etwa beim Stören eines Gegners.
- Trefferradius ist 170. Ohne sichtbaren Zielkreis muss die Zone
  großzügig sein.

Es gibt bewusst **keinen sichtbaren Zielkreis**. Er würde die Lösung
verraten; die Aufgabe steckt im Text und in der Spielsituation.

## Stufe 2 — „Wer ist frei?"

Situationen werden zufällig erzeugt (`js/situation2.js`), weil hier jede
Situation dieselbe Frage stellt. Ein einziger Aufgabentext genügt für
alle.

### Deckungsregel

```js
DECKUNG = 130   // darunter: gedeckt
FREI    = 220   // darüber: frei
```

Der Bereich dazwischen ist **verboten**. Der Generator verwirft solche
Anordnungen und würfelt neu. Grund: bei einem mittleren Abstand kann ein
Kind nicht sehen, ob jemand gedeckt ist — das Spiel wirkt dann zufällig.

### Situationsaufbau

Drei gegen drei. Der Generator würfelt zuerst den Fall (0, 1 oder 2 freie
Mitspieler) und probiert dann **für diesen Fall** bis zu 600 Anordnungen
durch. Würde bei jedem Versuch neu gewürfelt, gewännen die leicht
erfüllbaren Fälle und die Mischung kippte.

Weitere Zusicherungen:

- Mitspieler mindestens 290 auseinander, damit ein Zug nie zwei
  Trefferzonen (je 130) gleichzeitig berührt
- ein Gegner bedrängt den Puckführenden, ohne einen Mitspieler mitzudecken
- freie Gegner stehen mindestens `FREI + 40` von jedem Mitspieler entfernt
- kein Paar näher als 90, außer bei gewollter Deckung
- `NOTFALL()` als handgesetzte Rückfallsituation, falls der Zufall streikt

### Ablauf

| Aktion                          | Ergebnis                                        |
|---------------------------------|-------------------------------------------------|
| Puck auf freien Mitspieler      | Puck fliegt hin, Konfetti                        |
| Puck auf gedeckten Mitspieler   | Gegner fängt ab, Puck kehrt zurück               |
| Puck ins Leere                  | Puck rutscht zurück, keine Reaktion              |
| Eigenen Spieler ziehen, jemand frei | springt zurück — Passen ist hier die Aufgabe |
| Eigenen Spieler ziehen, keiner frei | ab x > 720 gelöst                            |

Der Hinweis, dass man selbst fahren darf (Pulsieren des eigenen Spielers),
erscheint **erst nach einem Fehlversuch**. Vorher muss das Kind selbst
schauen; danach steckt es nicht in einer Sackgasse fest.

## Neue Stufe anlegen

1. `stufeN.html` von einer bestehenden Stufe kopieren, Titel und
   Skriptpfad anpassen
2. `js/stufeN.js` schreiben — Eisfläche einhängen, Figuren bauen,
   `machZiehbar` verdrahten
3. Aufgabendaten (`js/aufgabenN.js`) oder Generator (`js/situationN.js`)
4. Vorschaufunktion in `js/vorschau.js` ergänzen und in `VORSCHAU`
   eintragen
5. Eintrag in `STUFEN` in `js/start.js`
6. **Alle neuen Dateien in `DATEIEN` in `sw.js` eintragen**
7. `VERSION` in `sw.js` hochzählen

Auf der Startseite nur fertige Stufen eintragen. Ausgegraute Kacheln für
später sind für ein Kind reine Frustration.

## Offline-Betrieb und Caching

`sw.js` legt beim ersten Aufruf alle gelisteten Dateien im Cache ab und
liefert danach zuerst daraus. Im Hintergrund wird auf eine neuere Fassung
geprüft.

> **Häufigste Fehlerquelle im Projekt:** Nach einer Änderung muss
> `VERSION` in `sw.js` hochgezählt werden. Sonst zeigt das iPad hartnäckig
> die alte Fassung, und man sucht den Fehler im falschen File.

Ebenso: jede neue Datei gehört in `DATEIEN`. Fehlt sie, funktioniert die
Seite online einwandfrei und offline nur halb — was typischerweise erst in
der Eishalle auffällt.

## Lokales Testen

ES-Module laufen **nicht** per Doppelklick auf die HTML-Datei; der Browser
blockiert die Imports beim `file://`-Protokoll. Nötig ist ein Server:

```bash
python3 -m http.server 8000
```

Alternativ direkt über GitHub Pages testen. Der Service Worker
registriert sich nur über `http(s)` und stört beim lokalen Testen daher
nicht.

Der Generator lässt sich ohne Browser prüfen, da er keine DOM-Abhängigkeit
hat:

```bash
node -e "
  import('./js/situation2.js').then(m => {
    const s = m.neueSituation();
    console.log(s.freieAnzahl, s.frei);
  });
"
```

## Hosting

GitHub Pages, Branch `main`, Ordner `/ (root)`. Das Repository muss
öffentlich sein, sonst benötigt Pages einen kostenpflichtigen Plan.

Auf dem iPad in Safari öffnen und über Teilen → „Zum Home-Bildschirm"
hinzufügen. Erst dann startet die Seite im Vollbild ohne Adressleiste —
für ein Kindergerät der eigentliche Gewinn.

## Offene Punkte

- Stufe 3 („Laufweg finden") soll Bewegung über Zeit einführen. Das
  Freilaufen eines Mitspielers samt Pass in den Raum gehört inhaltlich
  dorthin, nicht in Stufe 2: dort würde es der Regel „passe dorthin, wo
  jemand steht" widersprechen, bevor diese sitzt.
- Stufe 2 kann eine gelungene Zufallssituation nicht reproduzieren. Ein
  Startwert-Mechanismus wäre nachrüstbar.
- Stufen 4 und 5 (Mannschaftspositionen, Spielzüge) sind inhaltlich
  eher U10-Stoff. Vor dem Bau klären, ob sie sich an das Kind oder an
  einen Trainer richten — davon hängt die Gestaltung ab.

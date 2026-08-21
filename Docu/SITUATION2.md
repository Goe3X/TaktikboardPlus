# `js/situation2.js` — Situationsgenerator für Stufe 2

Erzeugt zufällige 3-gegen-3-Spielsituationen für die Stufe „Wer ist frei?".
Kein Zustand, keine DOM-Abhängigkeit — reine Geometrie, dadurch ohne
Browser testbar.

## Warum überhaupt generiert wird

Stufe 1 hat handgeschriebene Aufgaben, weil dort jede Aufgabe eine
**andere** Lektion vermittelt. Stufe 2 stellt in jeder Situation
**dieselbe** Frage: Wer ist frei? Damit entfällt der Grund für
handgeschriebene Daten, und der Nachschub an Aufgaben löst sich von
selbst — der entscheidende Punkt, nachdem sechs feste Aufgaben in Stufe 1
nach drei Runden durchgespielt waren.

## Schnittstelle

```js
import { neueSituation, DECKUNG, FREI } from './situation2.js';

const s = neueSituation();
```

Rückgabe:

| Feld          | Typ                    | Bedeutung                                   |
|---------------|------------------------|---------------------------------------------|
| `du`          | `{x, y}`               | Position des Puckführenden                   |
| `mates`       | `[{x,y}, {x,y}]`       | die zwei Mitspieler                          |
| `geg`         | `[{x,y} × 3]`          | die drei Gegner                              |
| `frei`        | `[bool, bool]`         | ist `mates[i]` anspielbar?                   |
| `freieAnzahl` | `0 \| 1 \| 2`          | wie viele Mitspieler frei sind               |

`neueSituation()` liefert **immer** ein gültiges Objekt, nie `null`.

Exportierte Konstanten: `DECKUNG` (130) und `FREI` (220).

## Die Kernregel: keine Graustufe

```js
export const DECKUNG = 130;   // darunter: gedeckt
export const FREI    = 220;   // darüber: frei
```

Der Bereich **zwischen 130 und 220 ist verboten**. Anordnungen, die dort
landen, werden verworfen und neu gewürfelt.

Der Grund ist didaktisch, nicht technisch. Ein Fünfjähriger kann keine
Abstände schätzen — er sieht „klebt daneben" oder „steht allein". Läge ein
Gegner in mittlerer Entfernung, würde das Spiel einen Pass abfangen, ohne
dass für das Kind erkennbar wäre warum. Es lernt dann nicht Deckung zu
lesen, sondern hält das Spiel für willkürlich.

Deshalb ist der Generator absichtlich streng und verwirft lieber, statt
mittlere Fälle zu erlauben.

## Ablauf

### 1. Fall würfeln — einmal

```js
const w = Math.random();
const freieAnzahl = w < .5 ? 1 : (w < .78 ? 2 : 0);
```

| Fall               | Anteil | Rolle im Spiel                             |
|--------------------|--------|--------------------------------------------|
| ein Mitspieler frei| 50 %   | der Normalfall, echte Entscheidung          |
| beide frei         | 28 %   | Aufgabe ohne falsche Antwort, Erfolgserlebnis|
| keiner frei        | 22 %   | Kind muss selbst zum Tor fahren             |

**Wichtig:** Der Fall wird einmal gezogen und dann bis zu 600-mal *für
diesen Fall* durchprobiert. Ein früherer Entwurf würfelte den Fall bei
jedem Versuch neu — dabei gewannen die leicht erfüllbaren Anordnungen und
die Mischung kippte auf 50 % „keiner frei" statt 22 %.

### 2. Puckführenden setzen

```js
x: 130 … 480          // eher hinten, er soll nach vorne spielen
y: 100 … 470          // begrenzt, damit der Puck unter ihm im Feld bleibt
```

Die y-Begrenzung hängt an `PUCK_ABSTAND` in `stufe2.js` (52 nach unten).
Wird der Puck dort anders platziert, muss diese Grenze mitwandern.

### 3. Mitspieler setzen

- Abstand 260–470 vom Puckführenden — nah genug zum Passen, weit genug,
  dass es ein Pass ist und kein Antippen
- mindestens 40 vom Feldrand
- **mindestens 290 voneinander entfernt**

Die 290 sind kein Schönheitswert: `stufe2.js` nimmt beim Loslassen den
nächstgelegenen Mitspieler im Umkreis von 130. Bei weniger als 260
Abstand könnten sich diese Zonen überlappen und ein Zug wäre mehrdeutig.
290 lässt Puffer.

### 4. Gegner nach Rollen verteilen

| Rolle        | Anzahl        | Platzierung                                  |
|--------------|---------------|----------------------------------------------|
| Decker       | je gedecktem Mitspieler | 95–115 neben ihm (also unter `DECKUNG`) |
| Bedränger    | 1             | 145–215 um den Puckführenden                  |
| Freilaufende | Rest auf 3    | irgendwo, aber > `FREI + 40` von beiden Mitspielern |

Der Bedränger hat eine erzählerische Funktion: er erklärt, warum das Kind
überhaupt abspielen soll, statt selbst zu fahren. Er darf deshalb **keinen
Mitspieler mitdecken** — dafür bis zu 60 Platzierungsversuche, sonst wird
die ganze Anordnung verworfen.

Dasselbe gilt für freilaufende Gegner: ohne die Abstandsbedingung stellen
sie zufällig einen Mitspieler zu und machen die beabsichtigte Situation
kaputt.

### 5. Überlappungen ausschließen

Kein Paar näher als 100 — außer bei gewollter Deckung, dort ist 90 die
harte Untergrenze. Spielsteine haben Radius 40, bei 90 berühren sie sich
also fast, ohne sich zu verdecken. Genau der gewünschte Eindruck.

### 6. Gegenrechnen

```js
const naechster = Math.min(...geg.map(g => d(mates[i], g)));
if (naechster < DECKUNG)   frei.push(false);
else if (naechster > FREI) frei.push(true);
else return null;                    // Graustufe
if (frei[i] !== sollFrei[i]) return null;
```

Der letzte Schritt prüft nicht nur die Eindeutigkeit, sondern auch, ob die
gemessene Lage der **beabsichtigten** entspricht. Ohne diese Prüfung
könnte ein freilaufender Gegner den eigentlich freien Mitspieler zustellen
und der Generator lieferte stillschweigend den falschen Fall.

### 7. Notfall

Nach 600 vergeblichen Versuchen für den gewürfelten Fall folgen 600
weitere mit `freieAnzahl = 1`. Erst danach greift `NOTFALL()`, eine
handgesetzte Anordnung.

In 3000 Testdurchläufen trat sie **nie** auf. Sie existiert, damit ein
extremer Zufallspfad nicht zu einem leeren Spielfeld führt.

## Testen ohne Browser

Das Modul importiert nur `FELD` aus `eisflaeche.js` und ist damit in Node
lauffähig:

```js
import { neueSituation, DECKUNG, FREI } from './js/situation2.js';

const d = (a,b) => Math.hypot(a.x-b.x, a.y-b.y);
let grau = 0, falsch = 0, ueberlappt = 0;

for (let i = 0; i < 3000; i++){
  const s = neueSituation();
  s.mates.forEach((m, idx) => {
    const nah = Math.min(...s.geg.map(g => d(m, g)));
    if (nah >= DECKUNG && nah <= FREI) grau++;
    if ((nah > FREI) !== s.frei[idx]) falsch++;
  });
  const alle = [s.du, ...s.mates, ...s.geg];
  for (let a = 0; a < alle.length; a++)
    for (let b = a+1; b < alle.length; b++)
      if (d(alle[a], alle[b]) < 90) ueberlappt++;
}
console.log({grau, falsch, ueberlappt});   // erwartet: alles 0
```

Dieser Test hat zwei Fehler aufgedeckt, die im Browser erst nach vielen
Runden aufgefallen wären: der Bedränger konnte einen Mitspieler mitdecken,
und die Fallverteilung war stark verzerrt. Er lohnt sich nach jeder
Änderung an den Konstanten.

## Stellschrauben

| Konstante        | Wert | Wirkung beim Verändern                        |
|------------------|------|-----------------------------------------------|
| `DECKUNG`        | 130  | größer → Deckung wirkt lockerer, schwerer lesbar |
| `FREI`           | 220  | größer → „frei" braucht mehr Platz, mehr Verwürfe |
| `MIN_ABSTAND`    | 100  | größer → luftigeres Bild, mehr Verwürfe        |
| Mitspielerdistanz| 290  | muss über `2 × PASS_TREFFER` aus `stufe2.js` bleiben |
| Passdistanz      | 260–470 | kleiner → Pässe wirken wie Antippen        |

Nach jeder Änderung den Testlauf oben wiederholen. Die Grenzen hängen
zusammen: `DECKUNG` und `FREI` zu eng aneinander erhöht die Verwurfsrate
stark, weil der erlaubte Korridor schrumpft.

## Bewusst nicht enthalten

- **Kein Startwert (Seed).** Eine gelungene Situation lässt sich derzeit
  nicht reproduzieren. Nachrüstbar über einen ersetzbaren Zufallsgenerator.
- **Keine Passlinienprüfung.** Ein Pass darf durch andere Spieler
  hindurchgehen; abgefangen wird nur bei gedecktem Empfänger. Bewusste
  Entscheidung: Stufe 2 lehrt „freie Spieler erkennen", nicht „Lücken
  finden".
- **Keine Bewegung.** Alle Spieler stehen still. Bewegung ist für Stufe 3
  vorgesehen.

# Clear Sight — Planungsstand

Argument-Waage für den Politik-Stream (`~/playing/freiheitfueralle`). Felix legt live Karten an, gibt ihnen eine
Stufe, Einwände nehmen Anteile weg, die Werte rechnen sich wirklich zusammen. Der Chat sieht dieselbe Ansicht.
Open Source (GPL-3.0). Ausgefragt am 2026-11-05.

Getrennt vom Talkshow-Röntgen. Das Röntgen misst, wer *besser argumentiert*. Dieses Werkzeug soll mit der
Community herausfinden, *was stimmt*: Im Stream ist mehr Zeit, man sammelt so lange Argumente, bis ein gutes Bild
der Wirklichkeit entsteht.
- Nur wer das Werkzeug bedient (Felix), legt Karten an. Er bestimmt im Stream, wie stark eine Karte ist und wie
  sehr sie eine andere entkräftet.
- Die Werte addieren und subtrahieren sich wirklich.
- Der Chat sieht genau diese Ansicht und kann Argumente einbringen.
- Open Source, damit andere es auch nutzen.
Vorlage für die Ansicht: Spalten + Pfeile aus `~/playing/talkshow-roentgen/docs/ansichten.html`.

**Entschieden (Runde 1, 2026-11-05):**
- F1 Eigenes Projekt mit eigenem Repo (Open Source), getrennt von diesem Plan. Name noch offen.
- F2 Pro Thema eine Ja/Nein-Frage, Spalte Pro und Spalte Contra. Mehr als zwei Seiten vielleicht später.
- F3 Eine Karte kann eine andere entkräften. Ist sie selbst geschwächt, entkräftet sie weniger.
- F4 Stärke 1–10, aber wie die Erdbeben-Skala (Felix): 2 ≈ persönliche Bequemlichkeit, 10 = Ende der
  Zivilisation. Grund: Verhältnismäßigkeit („Ohne Kapitalismus keine Handys“ gegen zivilisatorischen Kollaps).
  Wie die Werte rechnen → Runde 2.
- F5 Jede Karte hat ein Quellen-Feld. Ohne Quelle sichtbar markiert „ohne Quelle“.
- F6 Version 1: Felix tippt Chat-Vorschläge selbst ab. **Version 2: Chat direkt anbinden** (z. B. `!arg …` in
  Twitch/YouTube, Vorschläge landen in einer Warteliste, Felix nimmt an oder lehnt ab).
- F7 Anzeige als Browser-Quelle in OBS. Kein Server.
- F8 Jedes Thema als Datei speichern, im nächsten Stream weiter sammeln.
- F9 Fertig, wenn Felix im Stream eine Frage anlegt, 10 Karten einträgt, eine Karte eine andere entkräftet
  und die Gesamtzahl sich sofort ändert — sichtbar in OBS.

**Entschieden (Runde 2, 2026-11-05):**
- F10 Erdbeben-Rechnung: Jede Stufe ist 10× so schwer (Gewicht = 10^Stufe). Gewichte werden addiert, die Summe
  wird wieder als Stufe angezeigt (log10). Beispiel: Pro 4 gegen Contra 9 → Contra wiegt 100.000× mehr.
- F11 Die Stufe misst die Wirkung auf die ganze Gesellschaft, nicht auf einen Menschen.
- F12 Zwei Kartenarten: **Argument** (Pro/Contra, Stufe 1–10) und **Einwand** (zeigt auf eine Karte, nimmt ihr einen
  Anteil weg: „wie viel davon stimmt?“). Einwände können selbst Einwände bekommen. „Probieren wir so.“
- F13 Ein Einwand, der alles wegnimmt, setzt die Karte auf 0. Sonst bestimmt Felix den Anteil von Hand.
- F14 Oben: beide Seiten als Stufe + „Contra wiegt 100.000-mal mehr“.
- F15 Leiter mit einem Beispiel pro Stufe: Claude entwirft, Felix passt an.

**Entschieden (Runde 3, 2026-11-05):**
- F16 Leiter (ganze Gesellschaft), „passt erstmal“:
  1 Kleinigkeit (Zeitumstellung) · 2 Bequemlichkeit im Alltag (Handy) · 3 spürbar im Geldbeutel vieler ·
  4 ernste Last für eine große Gruppe (Rente sinkt deutlich, Wohnungsnot) · 5 Existenz einer Gruppe bedroht ·
  6 Leben in Gefahr (Tausende Tote, Grundrechte weg) · 7 Katastrophe für ein Land · 8 für einen Kontinent ·
  9 weltweite Katastrophe (Kipppunkte) · 10 Ende der Zivilisation.
- F17 Einwände ziehen ihren Anteil immer vom **ganzen** Wert ab und werden zusammengezählt (30 % + 50 % = 80 % weg),
  höchstens 100 % → Karte 0. Ein geschwächter Einwand nimmt weniger weg (F3): Anteil × was vom Einwand übrig ist.
- F18 Ein Fenster für alles: Steuerung und Zuschauer-Ansicht sind dasselbe Fenster (OBS nimmt es auf).
  → Die Bedienknöpfe müssen im Stream gut aussehen und dürfen nicht stören.
- F19 Rückgängig mit Strg+Z für jeden Schritt.
- F20 Arbeitstitel: **Clear Sight**.

**Entschieden (Runde 4, 2026-11-05):**
- F21 Einwände hängen eingerückt unter der Karte, die sie treffen. Keine Pfeile.
- F22 Oberfläche erst Deutsch, Texte an einer Stelle, damit Englisch leicht dazukommt.
- F23 Lizenz GPL-3.0.
- Von Claude festgelegt: keine Kreise (A entkräftet B und B entkräftet A geht nicht); Karte löschen löscht ihre
  Einwände mit (Strg+Z holt alles zurück); 2 Looks in Nachtblau zur Auswahl.


## Vorbilder (2026-11-05)

Gesucht auf GitHub: „argument map“, „argument mapping tool“, „pro con argument weighing“, „debate argument tree“,
„kialo“, „bipolar argumentation framework“. Kein Werkzeug rechnet mit Gewichten. Argdown (1058★, Text-Syntax für
Argument-Karten) und Kialo (Baum mit Pro/Contra, Einwände eingerückt) bestätigen F21. Übernommen: nur die Idee des
eingerückten Baums, kein Code.

## Technik

- Kein Framework, keine Bibliothek, kein Build: eine HTML-Seite + kleine JS-Module, läuft direkt in Chrome/Edge.
- **Regeln im Code, getrennt von der Ansicht** (`rechnen.js`), getestet mit `node --test` (in Node eingebaut).
- Speichern: Datei pro Thema (JSON) über den Datei-Dialog des Browsers. Dazu ein Not-Speicher im Browser
  (`localStorage`) nach jeder Änderung, damit ein Absturz oder ein geschlossenes Fenster nichts kostet.
- OBS: Fenster-Aufnahme des Browser-Fensters.

## Schritte (jeder endet mit etwas, das man ansehen kann)

1. ✅ **Rechen-Regeln + Tests** (2026-11-05, `rechnen.js`, 18 Tests mit `node --test`, Gegenproben rot): Gewicht = 10^Stufe; Einwände: Anteil × was vom Einwand übrig ist, zusammengezählt,
   höchstens 100 %; Einwände gegen Einwände; keine Kreise; Summe pro Seite → Stufe (log10); Satz
   „Contra wiegt N-mal mehr“. Sonderfälle: keine Karten, eine Seite leer, beide Seiten 0.
2. ✅ **Ansicht** (2026-11-05, `index.html`, Beispiel-Thema fest eingebaut; Look-Wahl offen): Frage oben, Kopfzeile mit beiden Stufen + Satz, zwei Spalten, Einwände eingerückt, „ohne Quelle“.
   2 Looks in Nachtblau zur Wahl (Bildschirmfoto).
3. **Bedienung:** Karte anlegen / ändern / löschen, Stufe und Anteil schnell per Tastatur, Strg+Z.
   Knöpfe so, dass sie im Stream nicht stören (F18).
4. **Speichern + Öffnen** als Datei, Not-Speicher. Kaputte Datei → Meldung, nichts überschreiben.
5. **Abnahme (F9)** in OBS: Frage anlegen, 10 Karten, ein Einwand, Gesamtzahl ändert sich sofort.

## Version 2 (später)

- Chat direkt anbinden (F6): `!arg …` in Twitch/YouTube → Warteliste, Felix nimmt an oder lehnt ab.
- Englische Oberfläche (F22), mehr als zwei Seiten (F2).

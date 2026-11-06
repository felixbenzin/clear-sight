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
2. ✅ **Ansicht** (2026-11-05, Felix wählt **Look B** „Waage mit Leuchten“, A gestrichen): Frage oben, Kopfzeile mit beiden Stufen + Satz, zwei Spalten, Einwände eingerückt, „ohne Quelle“.
   2 Looks in Nachtblau zur Wahl (Bildschirmfoto).
3. ✅ **Bedienung** (2026-11-05, `bearbeiten.js` + `app.js`, 11 Tests + Klick-Test `e2e/klick.js` mit 19 Prüfungen): Karte anlegen / ändern / löschen, Stufe und Anteil schnell per Tastatur, Strg+Z.
   Knöpfe so, dass sie im Stream nicht stören (F18).
4. ✅ **Speichern + Öffnen** (2026-11-05, 13 Tests + 17 Klick-Prüfungen; Strg+S/Strg+O, Öffnen und Neu per Strg+Z umkehrbar) als Datei, Not-Speicher. Kaputte Datei → Meldung, nichts überschreiben.
   Bekannte Grenzen: Nach dem Neuladen fragt das erste Strg+S wieder nach dem Ort (der Browser merkt sich den
   Datei-Zugriff nicht über `localStorage`). Strg+Z nach „Neu“ holt das Thema zurück, aber nicht den Dateinamen.
5. ✅ **Abnahme (F9)** (2026-11-06, Felix: „sieht schick aus, funktioniert, gut in OBS“) in OBS: Frage anlegen, 10 Karten, ein Einwand, Gesamtzahl ändert sich sofort.

## Skala-Vorlagen (ausgefragt 2026-11-06)

Anlass: Felix' Test-Frage „Wie gut funktioniert die Waage?“ — die Skala „Gesellschaft“ (F16) passt dort nicht.

**Entschieden (Runde 5 + 6, 2026-11-06):**
- F24 Jede Skala hat 10 Stufen und dieselbe Erdbeben-Rechnung (F10). Nur die Wörter ändern sich.
- F25 Jede Themen-Datei speichert ihre eigene Skala mit (Name, 10 Wörter, Datum).
- F26 Die Liste der Vorlagen liegt im Browser (`localStorage`). Öffnet man eine Themen-Datei, kommt ihre Skala von
  selbst in die Liste. Geht der Browser-Speicher verloren, holen die Dateien die Skalen zurück.
- F27 Neue Skala in der App anlegen: Name + 10 Felder, auch als Kopie einer bestehenden.
- F28 Beim neuen Thema Skala aus der Liste wählen; vorgewählt „Gesellschaft“.
- F29 Skala eines Themas später wechseln: Stufen der Karten bleiben gleich, Strg+Z macht es rückgängig.
- F30 Fertig, wenn Felix eine Skala „Gesundheit“ anlegt, ein Thema damit speichert, den Browser schließt und neu
  öffnet, „Gesundheit“ in der Liste steht und die Leiter ihre Wörter zeigt.
- F31 Bearbeitet wird immer die Skala des offenen Themas. Die Liste merkt sich von selbst die neueste Fassung pro
  Name. Kein Knopf „Als Vorlage speichern“.
- F32 Gleicher Name, andere Wörter (z. B. aus alter Datei): In der Liste bleibt die Fassung mit dem neueren Datum.
  Die Datei behält ihre Wörter.
- F33 Vorlagen lassen sich löschen, nur „Gesellschaft“ bleibt immer.
- F34 Über der Leiter steht „Skala: <Name>“.
- F35 Felder dürfen leer bleiben, dann steht dort nur die Zahl.
- F36 Zweite mitgelieferte Vorlage „Werkzeug“: 1 kaum spürbar (Farbe eines Knopfs) · 2 kleine Bequemlichkeit ·
  3 kostet oder spart merklich Zeit · 4 nervt bei jeder Nutzung · 5 eine wichtige Aufgabe geht nur schwer ·
  6 eine wichtige Aufgabe geht gar nicht · 7 der Kern ist kaputt · 8 Ergebnisse falsch oder irreführend ·
  9 Daten weg oder Schaden für Nutzer · 10 unbrauchbar oder gefährlich.
- Von Claude festgelegt: Alte Dateien (Version 1, ohne Skala) öffnen weiter und bekommen „Gesellschaft“. Kaputte
  Skala in einer Datei (nicht 10 Felder, kein Text) → Datei wird abgelehnt wie bisher, nichts überschrieben.
  Browser-Speicher gesperrt → es gibt nur die beiden mitgelieferten Skalen und die des offenen Themas.

**Schritte:**
6. ✅ **Regeln + Tests** (2026-11-06, `bearbeiten.js`, 15 Tests in `test/skala.test.js`, 6 Gegenproben rot): Thema trägt Skala; Datei Version 2 mit Skala, Version 1
   → „Gesellschaft“; kaputte Skala abgelehnt; Liste zusammenführen (neueres Datum gewinnt, F32); Löschen lässt
   „Gesellschaft“ (F33); Skala wechseln ändert keine Stufe (F29) und ist per Strg+Z umkehrbar.
7. ✅ **Ansicht + Bedienung** (2026-11-06; Skala löschen = Knopf „Vorlage löschen“, kopieren = im Editor neuen Namen geben): Leiter und Stufen-Auswahl zeigen die Wörter der Themen-Skala, „Skala: <Name>“ (F34);
   in der Leiste: Skala wählen, bearbeiten (Name + 10 Felder), kopieren, löschen. Klick-Test erweitert.
8. ✅ **Merken** (2026-11-06, Klick-Test jetzt 67 Prüfungen, 2 Gegenproben rot; Strg+Z/Y lässt die Liste der Skala im Thema folgen, Öffnen einer Datei nimmt die neuere): Liste bleibt nach Neuladen, Öffnen einer Datei ergänzt die Liste. Klick-Test spielt
   F30 ganz durch (inkl. Neuladen der Seite).
9. ✅ **Abnahme (F30)** durch Felix, auch in OBS (2026-11-06, Felix: „stark, funktioniert“).

## Version 2: Chat schlägt vor (ausgefragt 2026-11-06)

**Vorbilder (2026-11-06):** `gh search repos` nach „twitch chat overlay obs browser source“, „chat overlay obs“,
„youtube live chat“, „multichat twitch youtube“, „tmi.js“. Ergebnis: Twitch-Chat lässt sich ohne Login und ohne
Server im Browser mitlesen (anonymes IRC über WebSocket) — so machen es `tmijs/tmi.js` (MIT, 1.590★) und
`IXenthI/keychat` (GPL-3.0, „zero credentials“). Übernommen: nur die Idee, kein Code; die ~30 Zeilen schreiben wir
selbst, keine Bibliothek. YouTube braucht einen Google-Schlüssel mit Tageslimit oder einen Server
(`LinaTsukusu/youtube-chat`, MIT, liest die Chat-Seite in Node) → später.

**Entschieden (Runde 7 + 8, 2026-11-06):**
- F37 Erst nur Twitch. YouTube später als eigener Schritt.
- F38 Drei Befehle: `!pro <Text>`, `!contra <Text>`, `!einwand <Nr> <Text>`. Felix kann die Art beim Annehmen ändern.
  Die Stufe bzw. den Anteil bestimmt immer Felix (F6).
- F39 Die Warteliste liegt in einem kleinen zweiten Fenster, das OBS nicht aufnimmt. Im Stream steht nur
  „N Vorschläge warten“. (Einzige Ausnahme von F18 — damit nichts ungeprüft in den Stream kommt.)
- F40 Angenommene Karten zeigen „von @name“.
- F41 Pro Person höchstens 1 Vorschlag alle **3 Minuten**, höchstens 300 Zeichen, doppelte fallen weg.
- F42 Verbindung weg → von selbst neu verbinden, klein „Chat getrennt“; die Waage läuft ohne Chat weiter.
- F43 Warteliste und Kanalname überstehen Neuladen.
- F44 Fertig, wenn jemand im Twitch-Chat `!arg Mieten steigen weiter` schreibt, der Vorschlag nach ein paar Sekunden in
  der Warteliste steht, Felix ihn mit 2 Klicks als Contra Stufe 4 annimmt und die Karte mit „von @name“ in der Waage steht.
- F45 Jede Karte zeigt klein ihre feste Nummer („#3“), damit der Chat Einwände darauf richten kann.
- F46 Einwand ohne oder mit falscher Nummer kommt trotzdem in die Warteliste, mit „Ziel fehlt“; Felix wählt die Karte.
- F47 `!arg <Text>` ohne Seite geht auch, Felix ordnet ein („probieren wir so“).
- F48 Klein im Stream: „Mitmachen: !pro … · !contra … · !einwand Nr …“.
- Von Claude festgelegt: Texte aus dem Chat nur als Text anzeigen (nie als HTML). Steht ein Link im Vorschlag,
  ist er beim Annehmen schon als Quelle eingetragen. Neues Kartenfeld `von` (freiwillig), Datei bleibt Version 2.

**Technik-Risiko:** Die Seite läuft als `file://`. Ob zwei Fenster dort miteinander reden können
(`BroadcastChannel` oder das `storage`-Ereignis von `localStorage`), prüft Schritt 10, bevor gebaut wird.

**Schritte:**
10. ✅ **Probe**: Twitch-Chat eines laufenden Kanals im Browser mitlesen (von `file://`); zwei Fenster reden miteinander.
    Ergebnis: welcher Weg zwischen den Fenstern trägt.
    **Ergebnis (2026-11-06, Chromium headless, Wegwerf-Code im Scratchpad):** Anonym (`justinfan…`) über
    `wss://irc-ws.chat.twitch.tv:443` von `file://` aus: verbunden, 14 Kanäle beigetreten, 28 Nachrichten in 15 s, Namen
    aus dem Tag `display-name`. Zwei Fenster: `BroadcastChannel` ✅, `storage`-Ereignis ✅, direkter Zugriff über
    `window.opener` ❌ (Browser sperrt: Herkunft „null“). → Warteliste liegt in `localStorage` (übersteht Neuladen, F43),
    das Warteliste-Fenster schickt „annehmen/ablehnen“ per `BroadcastChannel` ans Stream-Fenster. Das Stream-Fenster hält
    die Verbindung, damit Vorschläge auch bei geschlossener Warteliste ankommen. Offen: Felix' echter Chrome/Edge unter
    Windows mit `\\wsl.localhost\…` — prüft Schritt 15.
11. ✅ **Regeln + Tests** (2026-11-06, `chat.js` + `von` in `bearbeiten.js`, 28 Tests in `test/chat.test.js`, 7 Gegenproben rot): Chat-Zeile lesen (Name, Text); Befehle (F38, F47); Einwand-Nummer
    prüfen (F46); 3-Minuten-Sperre, 300 Zeichen, doppelte (F41); Annehmen macht eine Karte mit `von` (F40).
12. ✅ **Im Stream** (2026-11-06): Nummern an den Karten (F45), Hilfe-Zeile (F48), „N Vorschläge warten“ (F39), „Chat getrennt“ (F42).
13. ✅ **Warteliste-Fenster** (2026-11-06, `warteliste.html` + `warteliste.js`; „2 Klicks“ = Art wählen, Klick auf die Stufe nimmt an): Liste, annehmen (Art, Stufe/Anteil, Ziel) mit 2 Klicks, ablehnen. Klick-Test mit
    nachgemachtem Chat.
14. ✅ **Verbindung** (2026-11-06; Klick-Test jetzt 96 Prüfungen mit nachgemachtem Twitch-Server, 3 Gegenproben rot): Kanalname merken, neu verbinden, Warteliste im Browser (F42, F43). Klick-Test: Neuladen.
15. **Abnahme (F44)** durch Felix mit echtem Twitch-Chat.

## Später

- YouTube-Chat (F37), englische Oberfläche (F22), mehr als zwei Seiten (F2).

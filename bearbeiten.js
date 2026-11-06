// Clear Sight — Karten anlegen, ändern, löschen, Rückgängig. Gibt immer ein NEUES Thema zurück (für Strg+Z).
// Prüft jede Eingabe, weil Felix live tippt und Dateien von außen kommen können.
(function (wurzel) {
  "use strict";
  const Rechnen = typeof module !== "undefined" && module.exports ? require("./rechnen.js") : wurzel.Rechnen;

  const MAX_TEXT = 300;
  const MAX_SCHRITTE = 300;

  class Fehler extends Error {}

  function text(t) {
    const s = String(t ?? "").trim();
    if (!s) throw new Fehler("Der Text ist leer.");
    if (s.length > MAX_TEXT) throw new Fehler(`Der Text ist zu lang (höchstens ${MAX_TEXT} Zeichen).`);
    return s;
  }

  function stufe(x) {
    if (!Number.isInteger(x) || x < 1 || x > 10) throw new Fehler("Die Stufe muss eine ganze Zahl von 1 bis 10 sein.");
    return x;
  }

  function anteil(x) {
    const zehntel = Math.round(Number(x) * 10);
    if (!Number.isFinite(Number(x)) || Math.abs(Number(x) * 10 - zehntel) > 1e-6 || zehntel < 1 || zehntel > 10) {
      throw new Fehler("Der Anteil muss 10 % bis 100 % sein, in 10-%-Schritten.");
    }
    return zehntel / 10;
  }

  function seite(s) {
    if (s !== "pro" && s !== "contra") throw new Fehler("Die Seite muss Pro oder Contra sein.");
    return s;
  }

  // Nur echte Web-Links werden klickbar. Alles andere (z. B. "Destatis 2024") bleibt Text.
  function link(q) {
    const s = String(q ?? "").trim();
    try {
      const u = new URL(s);
      return u.protocol === "http:" || u.protocol === "https:" ? s : null;
    } catch {
      return null;
    }
  }

  // Wer die Karte im Chat vorgeschlagen hat (F40). Freiwillig; fehlt es, gibt es das Feld nicht.
  function von(v) {
    if (v == null || v === "") return {};
    if (typeof v !== "string" || !v.trim() || v.trim().length > 40) throw new Fehler("Der Name im Feld „von“ ist ungültig.");
    return { von: v.trim() };
  }

  function naechsteId(karten) {
    const n = karten.map((k) => Number(/^k(\d+)$/.exec(k.id)?.[1] ?? 0));
    return "k" + (Math.max(0, ...n) + 1);
  }

  // Baut eine geprüfte Karte. `id` ist die Nummer der Karte selbst (für den Kreis-Check).
  function pruefe(e, karten, id) {
    const basis = { id, art: e.art, text: text(e.text), quelle: String(e.quelle ?? "").trim(), ...von(e.von) };
    if (e.art === "argument") return { ...basis, seite: seite(e.seite), stufe: stufe(e.stufe) };
    if (e.art === "einwand") {
      if (!Rechnen.zielErlaubt(karten, id, e.ziel)) throw new Fehler("Dieser Einwand kann nicht auf diese Karte zeigen.");
      return { ...basis, ziel: e.ziel, anteil: anteil(e.anteil) };
    }
    throw new Fehler("Unbekannte Kartenart.");
  }

  function neu(thema, eingabe) {
    const id = naechsteId(thema.karten);
    const karte = pruefe(eingabe, thema.karten, id);
    return { thema: { ...thema, karten: [...thema.karten, karte] }, id };
  }

  function aendern(thema, id, felder) {
    const alt = thema.karten.find((k) => k.id === id);
    if (!alt) throw new Fehler("Diese Karte gibt es nicht mehr.");
    const karte = pruefe({ ...alt, ...felder }, thema.karten, id);
    return { ...thema, karten: thema.karten.map((k) => (k.id === id ? karte : k)) };
  }

  function entfernen(thema, id) {
    return { ...thema, karten: Rechnen.loeschen(thema.karten, id) };
  }

  function frage(thema, f) {
    return { ...thema, frage: text(f) };
  }

  // Rückgängig / Wiederherstellen. Speichert ganze Stände (klein genug, und nichts kann verrutschen).
  function verlauf(start) {
    let staende = [start];
    let pos = 0;
    return {
      jetzt: () => staende[pos],
      setze(t) {
        staende = staende.slice(0, pos + 1);
        staende.push(t);
        if (staende.length > MAX_SCHRITTE + 1) staende.shift();
        pos = staende.length - 1;
        return t;
      },
      zurueck() { pos = Math.max(0, pos - 1); return staende[pos]; },
      vor() { pos = Math.min(staende.length - 1, pos + 1); return staende[pos]; },
    };
  }

  // --- Skalen (F24–F36): 10 Wörter für die Stufen, die Rechnung bleibt gleich. Jedes Thema trägt seine Skala.
  const MAX_NAME = 40;
  const MAX_WORT = 60;
  const SKALEN = [
    { name: "Gesellschaft", datum: "2026-11-05T00:00:00.000Z", stufen: ["Kleinigkeit", "Bequemlichkeit", "Geldbeutel vieler",
      "Last für eine Gruppe", "Existenz bedroht", "Leben in Gefahr", "Katastrophe im Land", "Kontinent", "weltweit",
      "Ende der Zivilisation"] },
    { name: "Werkzeug", datum: "2026-11-06T00:00:00.000Z", stufen: ["kaum spürbar (Farbe eines Knopfs)", "kleine Bequemlichkeit",
      "kostet oder spart merklich Zeit", "nervt bei jeder Nutzung", "eine wichtige Aufgabe geht nur schwer",
      "eine wichtige Aufgabe geht gar nicht", "der Kern ist kaputt", "Ergebnisse falsch oder irreführend",
      "Daten weg oder Schaden für Nutzer", "unbrauchbar oder gefährlich"] },
  ];
  const GRUND = SKALEN[0].name;
  const gleich = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();

  function pruefeSkala(s, datum) {
    const name = String(s?.name ?? "").trim();
    if (!name) throw new Fehler("Der Name der Skala ist leer.");
    if (name.length > MAX_NAME) throw new Fehler(`Der Name der Skala ist zu lang (höchstens ${MAX_NAME} Zeichen).`);
    if (!Array.isArray(s.stufen) || s.stufen.length !== 10) throw new Fehler("Eine Skala hat genau 10 Stufen.");
    const stufen = s.stufen.map((w, i) => {
      if (w != null && typeof w !== "string") throw new Fehler(`Stufe ${i + 1} der Skala ist kein Text.`);
      const t = (w ?? "").trim();
      if (t.length > MAX_WORT) throw new Fehler(`Stufe ${i + 1} der Skala ist zu lang (höchstens ${MAX_WORT} Zeichen).`);
      return t;
    });
    if (typeof datum !== "string" || !/^\d{4}-\d\d-\d\dT/.test(datum) || !Number.isFinite(Date.parse(datum))) {
      throw new Fehler("Das Datum der Skala fehlt oder ist ungültig.");
    }
    return { name, stufen, datum };
  }

  // Skala des Themas setzen oder ändern (F27, F29). `jetzt` als ISO-Text, damit die Liste die neueste erkennt (F32).
  function skala(thema, s, jetzt) {
    return { ...thema, skala: pruefeSkala(s, jetzt) };
  }

  const ordne = (liste) => [...liste].sort((a, b) =>
    (b.name === GRUND) - (a.name === GRUND) || a.name.localeCompare(b.name, "de"));

  // Skala in die Liste der Vorlagen: neu → dazu; gleicher Name → die neuere bleibt (F32), mit `immer` ersetzt sie (F31).
  function merkeSkala(liste, s, { immer = false } = {}) {
    const alt = liste.find((x) => gleich(x.name, s.name));
    if (alt && !immer && alt.datum >= s.datum) return liste;
    return ordne([...liste.filter((x) => x !== alt), s]);
  }

  function loescheSkala(liste, name) {
    if (gleich(name, GRUND)) throw new Fehler(`Die Skala „${GRUND}“ bleibt immer.`);
    return liste.filter((x) => !gleich(x.name, name));
  }

  // Liste aus dem Browser-Speicher. Nichts da → die mitgelieferten. Kaputtes fällt weg, wird aber gemeldet.
  function leseSkalen(roh) {
    if (roh == null) return { liste: SKALEN, kaputt: false };
    let d, kaputt = false;
    try { d = JSON.parse(roh); } catch { return { liste: SKALEN, kaputt: true }; }
    if (!Array.isArray(d)) return { liste: SKALEN, kaputt: true };
    let liste = [];
    for (const x of d) {
      try { liste = merkeSkala(liste, pruefeSkala(x, x?.datum)); } catch (e) { if (!(e instanceof Fehler)) throw e; kaputt = true; }
    }
    if (!liste.some((x) => x.name === GRUND)) liste = merkeSkala(liste, SKALEN[0]);
    return { liste, kaputt };
  }

  // --- Datei: speichern und öffnen. Dateien kommen von außen → jede Karte wie eine Eingabe prüfen.
  const FORMAT = "clear-sight";
  const VERSION = 2;              // 2: mit Skala. Version 1 öffnet weiter und bekommt „Gesellschaft“.

  function inDatei(thema) {
    return JSON.stringify({ format: FORMAT, version: VERSION, frage: thema.frage, skala: thema.skala ?? SKALEN[0],
      karten: thema.karten }, null, 1);
  }

  function ausDatei(inhalt) {
    let d;
    try { d = JSON.parse(inhalt); } catch { throw new Fehler("Die Datei ist nicht lesbar (kein gültiges JSON)."); }
    if (!d || d.format !== FORMAT) throw new Fehler("Das ist keine Clear-Sight-Datei.");
    if (d.version > VERSION) throw new Fehler("Die Datei stammt aus einer neueren Version von Clear Sight.");
    if (!Array.isArray(d.karten)) throw new Fehler("In der Datei fehlen die Karten.");
    const frageText = text(d.frage);
    const ids = new Set();
    const karten = d.karten.map((k, i) => {
      try {
        if (!k || typeof k.id !== "string" || !/^[\w-]{1,40}$/.test(k.id)) throw new Fehler("Die Nummer fehlt oder ist ungültig.");
        if (ids.has(k.id)) throw new Fehler(`Die Nummer ${k.id} gibt es doppelt.`);
        ids.add(k.id);
        return pruefe(k, d.karten, k.id);
      } catch (e) {
        if (e instanceof Fehler) throw new Fehler(`Karte ${i + 1}: ${e.message}`);
        throw e;
      }
    });
    let sk = SKALEN[0];
    if (d.version >= 2) {
      if (d.skala == null) throw new Fehler("Die Skala fehlt.");
      try { sk = pruefeSkala(d.skala, d.skala.datum); } catch (e) { if (e instanceof Fehler) throw new Fehler("Skala: " + e.message); throw e; }
    }
    return { frage: frageText, karten, skala: sk };
  }

  const Bearbeiten = { Fehler, neu, aendern, entfernen, frage, verlauf, link, inDatei, ausDatei,
    SKALEN, skala, merkeSkala, loescheSkala, leseSkalen };
  if (typeof module !== "undefined" && module.exports) module.exports = Bearbeiten;
  else wurzel.Bearbeiten = Bearbeiten;
})(typeof window !== "undefined" ? window : globalThis);

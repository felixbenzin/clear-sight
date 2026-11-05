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

  function naechsteId(karten) {
    const n = karten.map((k) => Number(/^k(\d+)$/.exec(k.id)?.[1] ?? 0));
    return "k" + (Math.max(0, ...n) + 1);
  }

  // Baut eine geprüfte Karte. `id` ist die Nummer der Karte selbst (für den Kreis-Check).
  function pruefe(e, karten, id) {
    const basis = { id, art: e.art, text: text(e.text), quelle: String(e.quelle ?? "").trim() };
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

  const Bearbeiten = { Fehler, neu, aendern, entfernen, frage, verlauf, link };
  if (typeof module !== "undefined" && module.exports) module.exports = Bearbeiten;
  else wurzel.Bearbeiten = Bearbeiten;
})(typeof window !== "undefined" ? window : globalThis);

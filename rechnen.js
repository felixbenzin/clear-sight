// Clear Sight — Rechen-Regeln (PLAN.md F10–F17). Keine Anzeige hier, nur Zahlen.
// Normales Skript (kein ES-Modul), damit es auch direkt aus einer Datei (file://) im Browser läuft.
//
// Karte: { id, art: "argument", seite: "pro" | "contra", stufe: 1–10, text, quelle }
//    oder { id, art: "einwand", ziel: <id>, anteil: 0–1, text, quelle }
(function (wurzel) {
  "use strict";

  const zahl = (stellen) => new Intl.NumberFormat("de-DE", stellen);

  function finde(karten, id) {
    return karten.find((k) => k.id === id);
  }

  // Ein Einwand steckt im Kreis, wenn seine Ziel-Kette zu ihm zurückführt (nur in kaputten Dateien möglich).
  function imKreis(karten, id) {
    let k = finde(karten, id);
    for (let i = 0; k && k.art === "einwand" && i <= karten.length; i++) {
      if (k.ziel === id) return true;
      k = finde(karten, k.ziel);
    }
    return false;
  }

  // F17 + F3: Was von einer Karte übrig ist (0–1). Jeder Einwand nimmt seinen Anteil vom ganzen Wert,
  // mal das, was von ihm selbst übrig ist. Zusammengezählt, höchstens 100 %.
  function rest(id, karten) {
    let weg = 0;
    for (const e of karten) {
      if (e.art === "einwand" && e.ziel === id && !imKreis(karten, e.id)) {
        weg += e.anteil * rest(e.id, karten);
      }
    }
    return Math.max(0, 1 - weg);
  }

  // F10: Gewicht = 10^Stufe × Rest. Nur Argumente haben Gewicht.
  function seiten(karten) {
    const s = { pro: 0, contra: 0 };
    for (const k of karten) {
      if (k.art === "argument" && k.seite in s) s[k.seite] += 10 ** k.stufe * rest(k.id, karten);
    }
    return s;
  }

  function stufe(gewicht) {
    return gewicht > 0 ? Math.log10(gewicht) : null;
  }

  function stufeText(gewicht) {
    const s = stufe(gewicht);
    return s === null ? "–" : zahl({ minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(s);
  }

  // F14: der Satz oben.
  function vergleich(karten) {
    if (!karten.some((k) => k.art === "argument")) return "Noch keine Karten";
    const { pro, contra } = seiten(karten);
    if (pro === 0 && contra === 0) return "Alles ist entkräftet";
    if (contra === 0) return "Nur Pro hat Gewicht";
    if (pro === 0) return "Nur Contra hat Gewicht";
    const [vorn, faktor] = pro >= contra ? ["Pro", pro / contra] : ["Contra", contra / pro];
    const text = zahl({ maximumSignificantDigits: 2 }).format(faktor);
    return text === "1" ? "Beide Seiten wiegen gleich viel" : `${vorn} wiegt ${text}-mal mehr`;
  }

  // Darf Einwand `einwandId` (neu oder vorhanden) auf `zielId` zeigen? Nicht auf sich, nicht ins Leere, kein Kreis.
  function zielErlaubt(karten, einwandId, zielId) {
    if (zielId === einwandId) return false;
    let k = finde(karten, zielId);
    if (!k) return false;
    for (let i = 0; k && k.art === "einwand" && i <= karten.length; i++) {
      if (k.ziel === einwandId) return false;
      k = finde(karten, k.ziel);
    }
    return true;
  }

  // Löscht eine Karte und alle Einwände darunter. Gibt eine neue Liste zurück (Original bleibt für Strg+Z).
  function loeschen(karten, id) {
    const weg = new Set([id]);
    let mehr = true;
    while (mehr) {
      mehr = false;
      for (const k of karten) {
        if (k.art === "einwand" && weg.has(k.ziel) && !weg.has(k.id)) {
          weg.add(k.id);
          mehr = true;
        }
      }
    }
    return karten.filter((k) => !weg.has(k.id));
  }

  const Rechnen = { rest, seiten, stufe, stufeText, vergleich, zielErlaubt, loeschen };
  if (typeof module !== "undefined" && module.exports) module.exports = Rechnen;
  else wurzel.Rechnen = Rechnen;
})(typeof window !== "undefined" ? window : globalThis);

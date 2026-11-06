// Clear Sight — Chat-Regeln (Version 2, F37–F48): Twitch-Zeilen lesen, Befehle, Warteliste, Annehmen.
// Ohne Browser-Teile, damit alles mit `node --test` prüfbar ist. Texte aus dem Chat sind fremd → nur als Text verwenden.
(function (wurzel) {
  "use strict";
  const Bearbeiten = typeof module !== "undefined" && module.exports ? require("./bearbeiten.js") : wurzel.Bearbeiten;

  const MAX_TEXT = 300;
  const SPERRE = 3 * 60 * 1000;   // F41: pro Person ein Vorschlag alle 3 Minuten
  const MAX_LISTE = 100;

  // --- Eine Zeile vom Twitch-Server (IRC). Nur was wir brauchen: Nachricht, PING, Beitritt.
  function leseZeile(zeile) {
    if (/^PING\b/.test(zeile)) return { typ: "ping" };
    if (/^:\S+ 366 /.test(zeile)) return { typ: "drin" };
    const m = /^(?:@(\S+) )?:([^!\s]+)!\S+ PRIVMSG #\S+ :(.*)$/.exec(zeile);
    if (!m) return null;
    const tags = Object.fromEntries((m[1] || "").split(";").map((t) => { const i = t.indexOf("="); return [t.slice(0, i), t.slice(i + 1)]; }));
    const anzeige = (tags["display-name"] || "").replace(/\\s/g, " ").replace(/\\\\/g, "\\");
    let text = m[3];
    const me = /^\u0001ACTION (.*)\u0001$/.exec(text);
    if (me) text = me[1];
    return { typ: "nachricht", name: anzeige || m[2], text };
  }

  // --- Befehle: !pro / !contra / !arg <Text>, !einwand [#]<Nr> <Text> (F38, F46, F47)
  function befehl(nachricht) {
    const m = /^!(pro|contra|arg|einwand)(?:\s+(.*))?$/i.exec(String(nachricht).trim());
    if (!m) return null;
    const art = { pro: "pro", contra: "contra", arg: "offen", einwand: "einwand" }[m[1].toLowerCase()];
    let rest = (m[2] || "").trim();
    let ziel = null;
    if (art === "einwand") {
      const n = /^#?(\d{1,6})(?:\s+|$)(.*)$/.exec(rest);
      if (n) { ziel = "k" + Number(n[1]); rest = n[2].trim(); }
    }
    rest = rest.replace(/\s+/g, " ");
    if (!rest) return null;
    if (rest.length > MAX_TEXT) rest = rest.slice(0, MAX_TEXT - 1) + "…";
    return { art, text: rest, ziel };
  }

  // --- Warteliste: { vorschlaege, zuletzt: {name: Zeit}, zaehler }. Jede Funktion gibt einen NEUEN Stand zurück.
  const leer = () => ({ vorschlaege: [], zuletzt: {}, zaehler: 0 });
  const gleichText = (t) => t.toLowerCase().replace(/\s+/g, " ").trim();

  // Nimmt einen Vorschlag {name, art, text, ziel} auf. grund: null | "sperre" | "doppelt" | "voll"
  function nimmAuf(stand, v, jetzt, karten) {
    const wer = v.name.toLowerCase();
    if (stand.zuletzt[wer] != null && jetzt - stand.zuletzt[wer] < SPERRE) return { stand, grund: "sperre" };
    const t = gleichText(v.text);
    if (stand.vorschlaege.some((x) => gleichText(x.text) === t) || karten.some((k) => gleichText(k.text) === t)) {
      return { stand, grund: "doppelt" };
    }
    if (stand.vorschlaege.length >= MAX_LISTE) return { stand, grund: "voll" };
    const ziel = v.art === "einwand" && v.ziel && karten.some((k) => k.id === v.ziel) ? v.ziel : null;   // F46
    const zaehler = stand.zaehler + 1;
    const neu = { id: "v" + zaehler, name: v.name, art: v.art, text: v.text, ziel, zeit: jetzt };
    return { stand: { vorschlaege: [...stand.vorschlaege, neu], zuletzt: { ...stand.zuletzt, [wer]: jetzt }, zaehler }, grund: null };
  }

  function entferne(stand, id) {
    return { ...stand, vorschlaege: stand.vorschlaege.filter((v) => v.id !== id) };
  }

  // Aus dem Browser-Speicher (F43). Kaputte Einträge fallen weg; Speicher kommt von außen.
  function lies(roh) {
    let d;
    try { d = JSON.parse(roh); } catch { return leer(); }
    if (!d || !Array.isArray(d.vorschlaege)) return leer();
    const art = new Set(["pro", "contra", "offen", "einwand"]);
    const vorschlaege = d.vorschlaege.filter((v) => v && typeof v.id === "string" && typeof v.name === "string" &&
      typeof v.text === "string" && art.has(v.art) && (v.ziel === null || typeof v.ziel === "string") && Number.isFinite(v.zeit))
      .map(({ id, name, art, text, ziel, zeit }) => ({ id, name, art, text, ziel, zeit }));
    const zuletzt = {};
    if (d.zuletzt && typeof d.zuletzt === "object") for (const [k, z] of Object.entries(d.zuletzt)) if (Number.isFinite(z)) zuletzt[k] = z;
    return { vorschlaege, zuletzt, zaehler: Number.isInteger(d.zaehler) && d.zaehler >= 0 ? d.zaehler : 0 };
  }

  // --- Annehmen (F40): Felix bestimmt Art, Stufe/Anteil, Ziel, Quelle. Gibt {thema, id} zurück wie Bearbeiten.neu.
  function annehmen(thema, v, wahl) {
    const basis = { text: v.text, quelle: wahl.quelle ?? "", von: v.name };
    if (wahl.art === "einwand") return Bearbeiten.neu(thema, { ...basis, art: "einwand", ziel: wahl.ziel, anteil: wahl.anteil });
    return Bearbeiten.neu(thema, { ...basis, art: "argument", seite: wahl.art, stufe: wahl.stufe });
  }

  function ersterLink(text) {
    for (const w of String(text).split(/\s+/)) {
      const kandidat = w.replace(/[),.;:!?]+$/, "");
      if (Bearbeiten.link(kandidat)) return kandidat;
    }
    return "";
  }

  const Chat = { leseZeile, befehl, leer, nimmAuf, entferne, lies, annehmen, ersterLink, SPERRE };
  if (typeof module !== "undefined" && module.exports) module.exports = Chat;
  else wurzel.Chat = Chat;
})(typeof window !== "undefined" ? window : globalThis);

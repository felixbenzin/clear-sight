// Datei-Format: Speichern und wieder Öffnen. Dateien kommen von außen → alles prüfen, nichts still reparieren.
const test = require("node:test");
const assert = require("node:assert/strict");
const B = require("../bearbeiten.js");

const THEMA = {
  frage: "Rente mit 70?",
  karten: [
    { id: "k1", art: "argument", seite: "pro", stufe: 4, text: "a", quelle: "https://destatis.de" },
    { id: "k2", art: "argument", seite: "contra", stufe: 6, text: "b", quelle: "" },
    { id: "k3", art: "einwand", ziel: "k2", anteil: 0.5, text: "e", quelle: "" },
    { id: "k4", art: "einwand", ziel: "k3", anteil: 1, text: "f", quelle: "" },
  ],
};
const datei = (t) => JSON.stringify({ format: "clear-sight", version: 1, ...t });
const kaputt = (text, grund) => assert.throws(() => B.ausDatei(text), (e) => e instanceof B.Fehler && grund.test(e.message));

test("Speichern und Öffnen ergibt genau dasselbe Thema", () => {
  assert.deepEqual(B.ausDatei(B.inDatei(THEMA)), THEMA);
});

test("Datei sagt, was sie ist", () => {
  const d = JSON.parse(B.inDatei(THEMA));
  assert.equal(d.format, "clear-sight");
  assert.equal(d.version, 1);
});

test("kein JSON", () => kaputt("{ kaputt", /lesbar/));
test("andere Datei", () => kaputt(JSON.stringify({ format: "excel", frage: "x", karten: [] }), /keine Clear-Sight-Datei/));
test("neuere Version", () => kaputt(JSON.stringify({ format: "clear-sight", version: 2, frage: "x", karten: [] }), /neueren Version/));
test("Karten fehlen", () => kaputt(JSON.stringify({ format: "clear-sight", version: 1, frage: "x" }), /Karten/));
test("leere Frage", () => kaputt(datei({ ...THEMA, frage: " " }), /leer/));
test("Stufe 11", () => kaputt(datei({ ...THEMA, karten: [{ ...THEMA.karten[0], stufe: 11 }] }), /Karte 1.*Stufe/));
test("doppelte Nummer", () => kaputt(datei({ ...THEMA, karten: [THEMA.karten[0], { ...THEMA.karten[1], id: "k1" }] }), /doppelt/));
test("Einwand ins Leere", () => kaputt(datei({ ...THEMA, karten: [{ ...THEMA.karten[2], ziel: "k9" }] }), /Karte 1/));
test("Kreis", () => kaputt(datei({
  frage: "x", karten: [{ id: "k1", art: "einwand", ziel: "k2", anteil: 0.5, text: "a" },
                       { id: "k2", art: "einwand", ziel: "k1", anteil: 0.5, text: "b" }] }), /Karte/));

test("fremde Felder fallen weg, fehlende Quelle wird leer", () => {
  const t = B.ausDatei(datei({ frage: "x", karten: [{ id: "k1", art: "argument", seite: "pro", stufe: 2, text: "a", boese: "<script>" }] }));
  assert.deepEqual(t.karten[0], { id: "k1", art: "argument", seite: "pro", stufe: 2, text: "a", quelle: "" });
});

test("Einwand, der vor seinem Ziel steht, ist erlaubt", () => {
  const t = B.ausDatei(datei({ frage: "x", karten: [THEMA.karten[2], THEMA.karten[1]] }));
  assert.equal(t.karten.length, 2);
});

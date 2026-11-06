// Skala-Vorlagen (F24–F36): jede Skala hat Name + 10 Wörter + Datum, steckt im Thema, Liste merkt die neueste.
// Erwartete Werte von Hand hingeschrieben.
const test = require("node:test");
const assert = require("node:assert/strict");
const B = require("../bearbeiten.js");

const ALT = "2026-11-06T00:00:00.000Z";
const JETZT = "2026-11-07T10:00:00.000Z";
const SPAETER = "2026-11-08T10:00:00.000Z";
const zehn = (w) => Array.from({ length: 10 }, (_, i) => `${w}${i + 1}`);
const gesundheit = (datum = JETZT, w = "g") => ({ name: "Gesundheit", stufen: zehn(w), datum });
const fehlt = (f, grund) => assert.throws(f, (e) => e instanceof B.Fehler && grund.test(e.message));
const KARTEN = [
  { id: "k1", art: "argument", seite: "pro", stufe: 4, text: "a", quelle: "" },
  { id: "k2", art: "argument", seite: "contra", stufe: 7, text: "b", quelle: "" },
];

test("zwei Skalen sind mitgeliefert: Gesellschaft zuerst, dann Werkzeug (F36)", () => {
  assert.deepEqual(B.SKALEN.map((s) => s.name), ["Gesellschaft", "Werkzeug"]);
  assert.equal(B.SKALEN[0].stufen[0], "Kleinigkeit");
  assert.equal(B.SKALEN[0].stufen[9], "Ende der Zivilisation");
  assert.equal(B.SKALEN[1].stufen[0], "kaum spürbar (Farbe eines Knopfs)");
  assert.equal(B.SKALEN[1].stufen[9], "unbrauchbar oder gefährlich");
  for (const s of B.SKALEN) assert.equal(s.stufen.length, 10);
});

test("Skala setzen: Name und Wörter werden geprüft, Datum = jetzt, Stufen der Karten bleiben (F29)", () => {
  const t = { frage: "x", karten: KARTEN, skala: B.SKALEN[0] };
  const n = B.skala(t, { name: "  Gesundheit ", stufen: [" a ", "", ...zehn("w").slice(2)] }, JETZT);
  assert.deepEqual(n.skala, { name: "Gesundheit", stufen: ["a", "", "w3", "w4", "w5", "w6", "w7", "w8", "w9", "w10"], datum: JETZT });
  assert.equal(n.karten, KARTEN);
  assert.deepEqual(n.karten.map((k) => k.stufe), [4, 7]);
  assert.equal(t.skala, B.SKALEN[0], "altes Thema bleibt unverändert (Strg+Z)");
});

test("leere Felder sind erlaubt (F35), fehlende werden leer", () => {
  const n = B.skala({ frage: "x", karten: [] }, { name: "Leer", stufen: [null, undefined, "", "", "", "", "", "", "", ""] }, JETZT);
  assert.deepEqual(n.skala.stufen, ["", "", "", "", "", "", "", "", "", ""]);
});

test("kaputte Skala wird abgelehnt", () => {
  const t = { frage: "x", karten: [] };
  fehlt(() => B.skala(t, { name: " ", stufen: zehn("a") }, JETZT), /Name der Skala ist leer/);
  fehlt(() => B.skala(t, { name: "x".repeat(41), stufen: zehn("a") }, JETZT), /Name der Skala ist zu lang/);
  fehlt(() => B.skala(t, { name: "A", stufen: zehn("a").slice(0, 9) }, JETZT), /genau 10 Stufen/);
  fehlt(() => B.skala(t, { name: "A", stufen: "abc" }, JETZT), /genau 10 Stufen/);
  fehlt(() => B.skala(t, { name: "A", stufen: [...zehn("a").slice(0, 9), 5] }, JETZT), /Stufe 10/);
  fehlt(() => B.skala(t, { name: "A", stufen: [...zehn("a").slice(0, 9), "x".repeat(61)] }, JETZT), /Stufe 10.*zu lang/);
});

test("Datei Version 2 trägt die Skala, Speichern + Öffnen ergibt dasselbe (F25)", () => {
  const t = { frage: "Wie gut funktioniert die Waage?", karten: KARTEN, skala: gesundheit() };
  const d = JSON.parse(B.inDatei(t));
  assert.equal(d.version, 2);
  assert.deepEqual(d.skala, gesundheit());
  assert.deepEqual(B.ausDatei(B.inDatei(t)), t);
});

test("alte Datei (Version 1, ohne Skala) bekommt Gesellschaft", () => {
  const t = B.ausDatei(JSON.stringify({ format: "clear-sight", version: 1, frage: "Rente mit 70?", karten: KARTEN }));
  assert.deepEqual(t.skala, B.SKALEN[0]);
});

test("Datei mit kaputter Skala wird abgelehnt", () => {
  const datei = (skala) => JSON.stringify({ format: "clear-sight", version: 2, frage: "x", karten: [], skala });
  fehlt(() => B.ausDatei(datei({ name: "A", stufen: zehn("a").slice(0, 3), datum: JETZT })), /Skala: .*10 Stufen/);
  fehlt(() => B.ausDatei(datei({ name: "A", stufen: zehn("a"), datum: "gestern" })), /Skala: .*Datum/);
  fehlt(() => B.ausDatei(datei({ name: "A", stufen: zehn("a") })), /Skala: .*Datum/);
  fehlt(() => B.ausDatei(datei(undefined)), /Skala fehlt/);
  fehlt(() => B.ausDatei(JSON.stringify({ format: "clear-sight", version: 3, frage: "x", karten: [] })), /neueren Version/);
});

test("Liste: neue Skala kommt dazu, Gesellschaft bleibt vorn, Rest nach Name", () => {
  const l = B.merkeSkala(B.SKALEN, gesundheit());
  assert.deepEqual(l.map((s) => s.name), ["Gesellschaft", "Gesundheit", "Werkzeug"]);
});

test("Liste: gleicher Name → die neuere Fassung bleibt (F32), Groß/Klein egal", () => {
  const l = B.merkeSkala(B.SKALEN, gesundheit(SPAETER, "neu"));
  const aelter = B.merkeSkala(l, { ...gesundheit(JETZT, "alt"), name: "gesundheit" });
  assert.equal(aelter.length, 3);
  assert.equal(aelter[1].stufen[0], "neu1");
  const neuer = B.merkeSkala(B.merkeSkala(B.SKALEN, gesundheit(JETZT, "alt")), gesundheit(SPAETER, "neu"));
  assert.equal(neuer.length, 3);
  assert.equal(neuer[1].stufen[0], "neu1");
});

test("Liste: Bearbeiten im Thema ersetzt immer, auch mit älterem Datum (Strg+Z, F31)", () => {
  const l = B.merkeSkala(B.SKALEN, gesundheit(SPAETER, "neu"));
  const zurueck = B.merkeSkala(l, gesundheit(JETZT, "alt"), { immer: true });
  assert.equal(zurueck.length, 3);
  assert.equal(zurueck[1].stufen[0], "alt1");
});

test("Löschen: Vorlage geht weg, Gesellschaft nie (F33)", () => {
  const l = B.merkeSkala(B.SKALEN, gesundheit());
  assert.deepEqual(B.loescheSkala(l, "Werkzeug").map((s) => s.name), ["Gesellschaft", "Gesundheit"]);
  fehlt(() => B.loescheSkala(l, "Gesellschaft"), /Gesellschaft/);
  fehlt(() => B.loescheSkala(l, "gesellschaft"), /Gesellschaft/);
});

test("Liste aus dem Browser-Speicher: nichts gespeichert → beide mitgelieferten", () => {
  assert.deepEqual(B.leseSkalen(null).liste, B.SKALEN);
  assert.equal(B.leseSkalen(null).kaputt, false);
});

test("Liste aus dem Browser-Speicher: gelöschtes Werkzeug kommt nicht zurück, Gesellschaft fehlt nie", () => {
  const r = B.leseSkalen(JSON.stringify([gesundheit()]));
  assert.deepEqual(r.liste.map((s) => s.name), ["Gesellschaft", "Gesundheit"]);
  assert.equal(r.kaputt, false);
});

test("Liste aus dem Browser-Speicher: kaputte Einträge fallen weg und werden gemeldet", () => {
  const r = B.leseSkalen(JSON.stringify([gesundheit(), { name: "Kaputt", stufen: [1] }]));
  assert.deepEqual(r.liste.map((s) => s.name), ["Gesellschaft", "Gesundheit"]);
  assert.equal(r.kaputt, true);
  const r2 = B.leseSkalen("{ kein json");
  assert.deepEqual(r2.liste, B.SKALEN);
  assert.equal(r2.kaputt, true);
});

test("mitgelieferte Skalen sind älter als alles, was Felix anlegt", () => {
  for (const s of B.SKALEN) assert.ok(s.datum <= ALT);
});

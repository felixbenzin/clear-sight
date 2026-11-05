// Bearbeiten: Karten anlegen, ändern, löschen, Rückgängig. Prüft auch Eingaben (Felix tippt live).
const test = require("node:test");
const assert = require("node:assert/strict");
const B = require("../bearbeiten.js");

const leer = () => ({ frage: "F?", karten: [] });

test("Argument anlegen: Text wird getrimmt, neue Nummer", () => {
  let t = leer();
  ({ thema: t } = B.neu(t, { art: "argument", seite: "pro", stufe: 4, text: "  Handys  ", quelle: "" }));
  ({ thema: t } = B.neu(t, { art: "argument", seite: "contra", stufe: 9, text: "Klima", quelle: "" }));
  assert.deepEqual(t.karten.map((k) => [k.id, k.text, k.stufe]), [["k1", "Handys", 4], ["k2", "Klima", 9]]);
});

test("Original bleibt unverändert (sonst kein Rückgängig)", () => {
  const t = leer();
  B.neu(t, { art: "argument", seite: "pro", stufe: 4, text: "x" });
  assert.equal(t.karten.length, 0);
});

test("nächste Nummer nach geladener Datei kollidiert nicht", () => {
  const t = { frage: "F", karten: [{ id: "k7", art: "argument", seite: "pro", stufe: 2, text: "a", quelle: "" }] };
  assert.equal(B.neu(t, { art: "argument", seite: "pro", stufe: 2, text: "b" }).id, "k8");
});

test("falsche Eingaben werden abgelehnt, mit Grund", () => {
  const t = { frage: "F", karten: [{ id: "k1", art: "argument", seite: "pro", stufe: 2, text: "a", quelle: "" }] };
  const fehler = (e) => assert.throws(() => B.neu(t, e), B.Fehler);
  fehler({ art: "argument", seite: "pro", stufe: 4, text: "   " });        // leer
  fehler({ art: "argument", seite: "pro", stufe: 0, text: "x" });          // Stufe zu klein
  fehler({ art: "argument", seite: "pro", stufe: 11, text: "x" });         // zu groß
  fehler({ art: "argument", seite: "pro", stufe: 2.5, text: "x" });        // keine ganze Zahl
  fehler({ art: "argument", seite: "mitte", stufe: 2, text: "x" });        // unbekannte Seite
  fehler({ art: "einwand", ziel: "k9", anteil: 0.5, text: "x" });          // Ziel gibt es nicht
  fehler({ art: "einwand", ziel: "k1", anteil: 0, text: "x" });            // 0 % ist kein Einwand
  fehler({ art: "einwand", ziel: "k1", anteil: 1.1, text: "x" });          // über 100 %
  fehler({ art: "einwand", ziel: "k1", anteil: 0.25, text: "x" });         // nur 10-%-Schritte
  fehler({ art: "frage", text: "x" });                                     // unbekannte Art
  fehler({ art: "argument", seite: "pro", stufe: 2, text: "x".repeat(301) }); // zu lang
});

test("Anteil aus Rechnung mit Rundungsfehler zählt als 10-%-Schritt", () => {
  const t = { frage: "F", karten: [{ id: "k1", art: "argument", seite: "pro", stufe: 2, text: "a", quelle: "" }] };
  const { thema } = B.neu(t, { art: "einwand", ziel: "k1", anteil: 0.1 * 3, text: "x" }); // 0,30000000000000004
  assert.equal(thema.karten[1].anteil, 0.3);
});

test("Quelle wird getrimmt; Link nur bei http(s)", () => {
  assert.equal(B.link(" https://destatis.de/x "), "https://destatis.de/x");
  assert.equal(B.link("javascript:alert(1)"), null);
  assert.equal(B.link("Statistisches Bundesamt 2024"), null);
});

test("Ändern: Stufe, Text, Seite; Einwand bekommt kein Stufe-Feld", () => {
  let { thema: t } = B.neu(leer(), { art: "argument", seite: "pro", stufe: 4, text: "a" });
  ({ thema: t } = B.neu(t, { art: "einwand", ziel: "k1", anteil: 0.5, text: "e" }));
  t = B.aendern(t, "k1", { stufe: 7, text: " neu ", seite: "contra" });
  assert.deepEqual([t.karten[0].stufe, t.karten[0].text, t.karten[0].seite], [7, "neu", "contra"]);
  t = B.aendern(t, "k2", { anteil: 1 });
  assert.equal(t.karten[1].anteil, 1);
  assert.throws(() => B.aendern(t, "k1", { stufe: 12 }), B.Fehler);
  assert.throws(() => B.aendern(t, "k2", { ziel: "k2" }), B.Fehler); // auf sich selbst
  assert.throws(() => B.aendern(t, "k9", { text: "x" }), B.Fehler);  // gibt es nicht
});

test("Entfernen nimmt Einwände darunter mit", () => {
  let { thema: t } = B.neu(leer(), { art: "argument", seite: "pro", stufe: 4, text: "a" });
  ({ thema: t } = B.neu(t, { art: "einwand", ziel: "k1", anteil: 0.5, text: "e" }));
  ({ thema: t } = B.neu(t, { art: "argument", seite: "contra", stufe: 2, text: "b" }));
  assert.deepEqual(B.entfernen(t, "k1").karten.map((k) => k.id), ["k3"]);
});

test("Frage ändern: getrimmt, leer abgelehnt", () => {
  assert.equal(B.frage(leer(), "  Rente mit 70?  ").frage, "Rente mit 70?");
  assert.throws(() => B.frage(leer(), "  "), B.Fehler);
});

test("Verlauf: zurück, vor, neue Änderung löscht das Vor", () => {
  const v = B.verlauf({ n: 0 });
  v.setze({ n: 1 }); v.setze({ n: 2 });
  assert.equal(v.zurueck().n, 1);
  assert.equal(v.zurueck().n, 0);
  assert.equal(v.zurueck().n, 0);          // am Anfang bleibt es stehen
  assert.equal(v.vor().n, 1);
  v.setze({ n: 5 });
  assert.equal(v.vor().n, 5);              // nach neuer Änderung gibt es kein altes "vor" mehr
  assert.equal(v.zurueck().n, 1);
});

test("Verlauf merkt sich höchstens 300 Schritte", () => {
  const v = B.verlauf({ n: 0 });
  for (let i = 1; i <= 400; i++) v.setze({ n: i });
  let x;
  for (let i = 0; i < 500; i++) x = v.zurueck();
  assert.equal(x.n, 100);
});

// Rechen-Regeln von Clear Sight. Erwartete Werte von Hand gerechnet, siehe PLAN.md F10–F17.
const test = require("node:test");
const assert = require("node:assert/strict");
const R = require("../rechnen.js");

const arg = (id, seite, stufe) => ({ id, art: "argument", seite, stufe, text: id });
const ein = (id, ziel, anteil) => ({ id, art: "einwand", ziel, anteil, text: id });
const nah = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ist nicht ${b}`);

// --- F10 Erdbeben-Rechnung: Gewicht = 10^Stufe, Gewichte addieren, Summe zurück als Stufe

test("eine Karte Stufe 4 wiegt 10.000 und zeigt Stufe 4", () => {
  const s = R.seiten([arg("a", "pro", 4)]);
  assert.equal(s.pro, 10000);
  assert.equal(s.contra, 0);
  nah(R.stufe(s.pro), 4);
});

test("zwei Karten Stufe 2 ergeben 200, also Stufe 2,3 — nicht Stufe 4", () => {
  const s = R.seiten([arg("a", "pro", 2), arg("b", "pro", 2)]);
  assert.equal(s.pro, 200);
  assert.equal(R.stufeText(s.pro), "2,3");
});

test("zehn Karten Stufe 5 wiegen so viel wie eine Karte Stufe 6", () => {
  const zehn = Array.from({ length: 10 }, (_, i) => arg("p" + i, "pro", 5));
  const s = R.seiten([...zehn, arg("c", "contra", 6)]);
  nah(s.pro, s.contra);
});

test("Stufe ohne Gewicht gibt es nicht", () => {
  assert.equal(R.stufe(0), null);
  assert.equal(R.stufeText(0), "–");
});

// --- F14 Satz oben

test("Pro 4 gegen Contra 9: Contra wiegt 100.000-mal mehr", () => {
  assert.equal(R.vergleich([arg("a", "pro", 4), arg("b", "contra", 9)]), "Contra wiegt 100.000-mal mehr");
});

test("Pro schwerer: Satz nennt Pro, Faktor auf 2 Stellen gerundet", () => {
  // Pro 10^3 + 10^2 = 1100, Contra 10^1 = 10 → 110-mal
  const k = [arg("a", "pro", 3), arg("b", "pro", 2), arg("c", "contra", 1)];
  assert.equal(R.vergleich(k), "Pro wiegt 110-mal mehr");
});

test("gleich schwer", () => {
  assert.equal(R.vergleich([arg("a", "pro", 5), arg("b", "contra", 5)]), "Beide Seiten wiegen gleich viel");
});

test("Sonderfälle: leer, eine Seite leer, alles entkräftet", () => {
  assert.equal(R.vergleich([]), "Noch keine Karten");
  assert.equal(R.vergleich([arg("a", "pro", 3)]), "Nur Pro hat Gewicht");
  assert.equal(R.vergleich([arg("a", "contra", 3)]), "Nur Contra hat Gewicht");
  assert.equal(R.vergleich([arg("a", "pro", 3), ein("e", "a", 1)]), "Alles ist entkräftet");
});

// --- F12 + F17 Einwände: Anteil vom ganzen Wert, zusammengezählt, höchstens 100 %

test("Einwand 50 % halbiert das Gewicht: Contra 9 → Stufe 8,7", () => {
  const s = R.seiten([arg("c", "contra", 9), ein("e", "c", 0.5)]);
  assert.equal(s.contra, 5e8);
  assert.equal(R.stufeText(s.contra), "8,7");
});

test("30 % + 50 % = 80 % weg, egal in welcher Reihenfolge", () => {
  nah(R.rest("a", [arg("a", "pro", 3), ein("e1", "a", 0.3), ein("e2", "a", 0.5)]), 0.2);
  nah(R.rest("a", [arg("a", "pro", 3), ein("e2", "a", 0.5), ein("e1", "a", 0.3)]), 0.2);
});

test("mehr als 100 % weg ergibt 0, nie weniger", () => {
  assert.equal(R.rest("a", [arg("a", "pro", 3), ein("e1", "a", 0.6), ein("e2", "a", 0.6)]), 0);
});

test("F13: Einwand 100 % setzt die Karte auf 0", () => {
  assert.equal(R.seiten([arg("a", "pro", 7), ein("e", "a", 1)]).pro, 0);
});

// --- F3: Ein geschwächter Einwand nimmt weniger weg

test("Einwand gegen Einwand: halb entkräfteter 50-%-Einwand nimmt nur 25 %", () => {
  nah(R.rest("a", [arg("a", "pro", 3), ein("e", "a", 0.5), ein("f", "e", 0.5)]), 0.75);
});

test("ganz entkräfteter Einwand nimmt nichts mehr weg", () => {
  assert.equal(R.rest("a", [arg("a", "pro", 3), ein("e", "a", 0.5), ein("f", "e", 1)]), 1);
});

test("Einwände zählen nicht selbst als Gewicht", () => {
  const s = R.seiten([arg("a", "pro", 2), ein("e", "a", 0.1)]);
  nah(s.pro, 90);
  assert.equal(s.contra, 0);
});

// --- Keine Kreise, Löschen

test("Ziel erlaubt: nicht sich selbst, nicht unbekannt, kein Kreis", () => {
  const k = [arg("a", "pro", 3), ein("e", "a", 0.5), ein("f", "e", 0.5)];
  assert.equal(R.zielErlaubt(k, "f", "a"), true);
  assert.equal(R.zielErlaubt(k, "f", "f"), false);   // auf sich selbst
  assert.equal(R.zielErlaubt(k, "f", "gibts"), false); // unbekannt
  assert.equal(R.zielErlaubt(k, "e", "f"), false);   // e → f → e wäre ein Kreis
  assert.equal(R.zielErlaubt(k, "neu", "f"), true);  // neuer Einwand auf einen Einwand
});

test("Kreis in einer kaputten Datei hängt nicht und zählt nicht", () => {
  const k = [arg("a", "pro", 3), ein("e", "f", 0.5), ein("f", "e", 0.5), ein("g", "a", 0.5)];
  nah(R.rest("a", k), 0.5); // g wirkt, e und f stecken im Kreis
  assert.equal(R.rest("e", k), 1); // die Ansicht fragt auch Karten im Kreis ab: darf nicht endlos laufen
});

test("Löschen nimmt alle Einwände darunter mit, sonst nichts", () => {
  const k = [arg("a", "pro", 3), arg("b", "contra", 2), ein("e", "a", 0.5), ein("f", "e", 0.5), ein("g", "b", 0.5)];
  assert.deepEqual(R.loeschen(k, "a").map((x) => x.id), ["b", "g"]);
  assert.equal(k.length, 5); // Original bleibt unverändert (für Strg+Z)
});

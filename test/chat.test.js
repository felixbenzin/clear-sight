// Chat-Regeln (Version 2, F37–F48): Twitch-Zeile lesen, Befehle, Warteliste mit Sperre, Annehmen.
// Erwartete Werte von Hand hingeschrieben. Chat-Zeilen wie sie Twitch schickt (aus der Probe, Schritt 10).
const test = require("node:test");
const assert = require("node:assert/strict");
const C = require("../chat.js");
const B = require("../bearbeiten.js");

const zeile = (name, text, extra = "") =>
  `@badge-info=;color=#1E90FF;display-name=${name};${extra}id=abc-123;mod=0 :${name.toLowerCase()}!${name.toLowerCase()}@${name.toLowerCase()}.tmi.twitch.tv PRIVMSG #felix :${text}`;
const MIN = 60 * 1000;
const KARTEN = [
  { id: "k1", art: "argument", seite: "pro", stufe: 4, text: "Mieten steigen weiter", quelle: "" },
  { id: "k3", art: "argument", seite: "contra", stufe: 6, text: "Neubau dauert", quelle: "" },
];
const THEMA = { frage: "Mietendeckel?", karten: KARTEN, skala: B.SKALEN[0] };
const LEER = C.leer();

// --- Zeile lesen
test("Chat-Nachricht: Name aus display-name, Text", () => {
  assert.deepEqual(C.leseZeile(zeile("AnnaB", "!pro Mieten sinken")), { typ: "nachricht", name: "AnnaB", text: "!pro Mieten sinken" });
});
test("ohne display-name: Login-Name", () => {
  assert.deepEqual(C.leseZeile("@display-name=;id=x :anna!anna@anna.tmi.twitch.tv PRIVMSG #felix :hallo"),
    { typ: "nachricht", name: "anna", text: "hallo" });
});
test("Name mit Leerzeichen-Kodierung (\\s) wird lesbar", () => {
  assert.equal(C.leseZeile(zeile("Anna\\sB", "x")).name, "Anna B");
});
test("/me-Nachricht: nur der Text", () => {
  assert.equal(C.leseZeile(zeile("AnnaB", "\u0001ACTION !pro winkt\u0001")).text, "!pro winkt");
});
test("PING → Antwort nötig", () => assert.deepEqual(C.leseZeile("PING :tmi.twitch.tv"), { typ: "ping" }));
test("Beitritt bestätigt (366)", () => assert.deepEqual(C.leseZeile(":justinfan1.tmi.twitch.tv 366 justinfan1 #felix :End of /NAMES list"), { typ: "drin" }));
test("anderes → null", () => {
  assert.equal(C.leseZeile(":tmi.twitch.tv 001 justinfan1 :Welcome, GLHF!"), null);
  assert.equal(C.leseZeile(""), null);
  assert.equal(C.leseZeile("Müll ohne Aufbau"), null);
});

// --- Befehle (F38, F46, F47)
test("!pro / !contra / !arg", () => {
  assert.deepEqual(C.befehl("!pro Mieten sinken"), { art: "pro", text: "Mieten sinken", ziel: null });
  assert.deepEqual(C.befehl("!CONTRA  Zu teuer  "), { art: "contra", text: "Zu teuer", ziel: null });
  assert.deepEqual(C.befehl("!arg Mieten steigen weiter"), { art: "offen", text: "Mieten steigen weiter", ziel: null });
});
test("!einwand mit Nummer, auch mit #", () => {
  assert.deepEqual(C.befehl("!einwand 3 Stimmt nur in Städten"), { art: "einwand", text: "Stimmt nur in Städten", ziel: "k3" });
  assert.deepEqual(C.befehl("!einwand #12 Quelle ist alt"), { art: "einwand", text: "Quelle ist alt", ziel: "k12" });
});
test("!einwand ohne Nummer: Ziel fehlt, Text bleibt (F46)", () => {
  assert.deepEqual(C.befehl("!einwand Stimmt so nicht"), { art: "einwand", text: "Stimmt so nicht", ziel: null });
});
test("kein Befehl oder leer → null", () => {
  assert.equal(C.befehl("pro Mieten"), null);
  assert.equal(C.befehl("!pros Mieten"), null);
  assert.equal(C.befehl("!pro"), null);
  assert.equal(C.befehl("!pro    "), null);
  assert.equal(C.befehl("!einwand 3"), null);
  assert.equal(C.befehl("hey !pro mitten im Satz"), null);
});
test("zu lang → auf 300 Zeichen gekürzt (F41)", () => {
  const t = C.befehl("!pro " + "a".repeat(400)).text;
  assert.equal(t.length, 300);
  assert.equal(t.endsWith("…"), true);
});

// --- Warteliste (F41, F46)
const vorschlag = (name, text) => ({ name, ...C.befehl(text) });
test("Vorschlag kommt in die Warteliste, mit Nummer und Zeit", () => {
  const r = C.nimmAuf(LEER, vorschlag("AnnaB", "!pro Mieten sinken"), 1000 * MIN, KARTEN);
  assert.equal(r.grund, null);
  assert.deepEqual(r.stand.vorschlaege, [{ id: "v1", name: "AnnaB", art: "pro", text: "Mieten sinken", ziel: null, zeit: 1000 * MIN }]);
});
test("gleiche Person: erst nach 3 Minuten wieder (F41), Groß/Klein egal", () => {
  const a = C.nimmAuf(LEER, vorschlag("AnnaB", "!pro eins"), 1000 * MIN, KARTEN).stand;
  const zuFrueh = C.nimmAuf(a, vorschlag("annab", "!pro zwei"), 1000 * MIN + 3 * MIN - 1, KARTEN);
  assert.equal(zuFrueh.grund, "sperre");
  assert.equal(zuFrueh.stand, a);
  const ok = C.nimmAuf(a, vorschlag("annab", "!pro zwei"), 1000 * MIN + 3 * MIN, KARTEN);
  assert.equal(ok.grund, null);
  assert.equal(ok.stand.vorschlaege.length, 2);
});
test("Sperre gilt auch, wenn der Vorschlag schon angenommen oder abgelehnt ist", () => {
  const a = C.nimmAuf(LEER, vorschlag("AnnaB", "!pro eins"), 1000 * MIN, KARTEN).stand;
  const weg = C.entferne(a, "v1");
  assert.equal(weg.vorschlaege.length, 0);
  assert.equal(C.nimmAuf(weg, vorschlag("AnnaB", "!pro zwei"), 1001 * MIN, KARTEN).grund, "sperre");
});
test("abgelehnt wegen Sperre setzt die Uhr nicht neu", () => {
  const a = C.nimmAuf(LEER, vorschlag("AnnaB", "!pro eins"), 1000 * MIN, KARTEN).stand;
  const b = C.nimmAuf(a, vorschlag("AnnaB", "!pro zwei"), 1002 * MIN, KARTEN).stand;
  assert.equal(C.nimmAuf(b, vorschlag("AnnaB", "!pro drei"), 1003 * MIN, KARTEN).grund, null);
});
test("doppelt: gleicher Text in der Liste oder schon als Karte → weg (F41)", () => {
  const a = C.nimmAuf(LEER, vorschlag("AnnaB", "!pro Mieten sinken"), 1000 * MIN, KARTEN).stand;
  assert.equal(C.nimmAuf(a, vorschlag("Bert", "!contra  mieten   SINKEN "), 1000 * MIN, KARTEN).grund, "doppelt");
  assert.equal(C.nimmAuf(LEER, vorschlag("Bert", "!arg Mieten steigen weiter"), 1000 * MIN, KARTEN).grund, "doppelt");
});
test("Einwand auf eine Nummer, die es nicht gibt → Ziel fehlt (F46)", () => {
  const r = C.nimmAuf(LEER, vorschlag("Bert", "!einwand 9 Quatsch"), 1000 * MIN, KARTEN);
  assert.equal(r.grund, null);
  assert.equal(r.stand.vorschlaege[0].ziel, null);
  const gut = C.nimmAuf(LEER, vorschlag("Bert", "!einwand 3 Dauert nicht so lang"), 1000 * MIN, KARTEN);
  assert.equal(gut.stand.vorschlaege[0].ziel, "k3");
});
test("Nummern laufen weiter, auch nach Entfernen", () => {
  let s = C.nimmAuf(LEER, vorschlag("A", "!pro eins"), 1000 * MIN, KARTEN).stand;
  s = C.entferne(s, "v1");
  s = C.nimmAuf(s, vorschlag("B", "!pro zwei"), 1000 * MIN, KARTEN).stand;
  assert.equal(s.vorschlaege[0].id, "v2");
});
test("höchstens 100 Vorschläge in der Liste", () => {
  let s = LEER;
  for (let i = 0; i < 100; i++) s = C.nimmAuf(s, vorschlag("n" + i, "!pro text " + i), 1000 * MIN, KARTEN).stand;
  assert.equal(s.vorschlaege.length, 100);
  assert.equal(C.nimmAuf(s, vorschlag("x", "!pro noch einer"), 1000 * MIN, KARTEN).grund, "voll");
});

// --- Warteliste aus dem Browser-Speicher (F43)
test("Warteliste speichern und lesen ergibt dasselbe", () => {
  const s = C.nimmAuf(LEER, vorschlag("AnnaB", "!einwand 3 Stimmt nicht"), 1000 * MIN, KARTEN).stand;
  assert.deepEqual(C.lies(JSON.stringify(s)), s);
});
test("nichts oder Kaputtes im Speicher → leere Liste", () => {
  assert.deepEqual(C.lies(null), LEER);
  assert.deepEqual(C.lies("{ kaputt"), LEER);
  assert.deepEqual(C.lies(JSON.stringify({ vorschlaege: [{ id: 5 }], zuletzt: {}, zaehler: 1 })), { ...LEER, zaehler: 1 });
});

// --- Annehmen (F40)
test("annehmen als Contra Stufe 4: Karte mit von @name", () => {
  const v = { id: "v1", name: "AnnaB", art: "offen", text: "Mieten steigen weiter, sagt https://destatis.de/x", ziel: null, zeit: 0 };
  const r = C.annehmen(THEMA, v, { art: "contra", stufe: 4, quelle: C.ersterLink(v.text) });
  const k = r.thema.karten.find((x) => x.id === r.id);
  assert.deepEqual(k, { id: "k4", art: "argument", seite: "contra", stufe: 4, text: "Mieten steigen weiter, sagt https://destatis.de/x",
    quelle: "https://destatis.de/x", von: "AnnaB" });
});
test("annehmen als Einwand 50 % auf #3", () => {
  const v = { id: "v2", name: "Bert", art: "einwand", text: "Dauert nicht so lang", ziel: "k3", zeit: 0 };
  const k = C.annehmen(THEMA, v, { art: "einwand", anteil: 0.5, ziel: "k3" }).thema.karten.at(-1);
  assert.deepEqual(k, { id: "k4", art: "einwand", ziel: "k3", anteil: 0.5, text: "Dauert nicht so lang", quelle: "", von: "Bert" });
});
test("annehmen ohne Ziel bei Einwand → Fehler, nichts geändert", () => {
  const v = { id: "v2", name: "Bert", art: "einwand", text: "x", ziel: null, zeit: 0 };
  assert.throws(() => C.annehmen(THEMA, v, { art: "einwand", anteil: 0.5, ziel: null }), B.Fehler);
});
test("ersterLink", () => {
  assert.equal(C.ersterLink("siehe https://a.de/b?c=1, und http://x.org"), "https://a.de/b?c=1");
  assert.equal(C.ersterLink("kein link javascript:alert(1)"), "");
});

// --- von in Dateien: bleibt beim Speichern, fällt nicht weg
test("Karte mit von übersteht Speichern + Öffnen", () => {
  const t = { ...THEMA, karten: [...KARTEN, { id: "k4", art: "argument", seite: "pro", stufe: 2, text: "x", quelle: "", von: "AnnaB" }] };
  assert.deepEqual(B.ausDatei(B.inDatei(t)).karten[2].von, "AnnaB");
});
test("von zu lang oder kein Text → Datei abgelehnt", () => {
  const datei = (von) => JSON.stringify({ format: "clear-sight", version: 2, frage: "x", skala: B.SKALEN[0],
    karten: [{ id: "k1", art: "argument", seite: "pro", stufe: 2, text: "x", von }] });
  assert.throws(() => B.ausDatei(datei("x".repeat(41))), /Karte 1.*Name/);
  assert.throws(() => B.ausDatei(datei(5)), /Karte 1.*Name/);
});

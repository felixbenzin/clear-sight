// Klick-Test im echten Browser (Fertig-Kriterium F9 + Bedienung). Braucht playwright-core und ein Chromium:
//   PLAYWRIGHT_CORE=/pfad/zu/playwright-core CHROME=/pfad/zu/chrome node e2e/klick.js /tmp
// Erwartete Zahlen von Hand gerechnet (siehe PLAN.md, Schritt 3).
const { chromium } = require(process.env.PLAYWRIGHT_CORE || "playwright-core");
const SP = process.argv[2];
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME, args: ["--no-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const fehler = [];
  page.on("pageerror", (e) => fehler.push(e.message));
  page.on("console", (m) => m.type() === "error" && !m.text().includes("fonts") && fehler.push(m.text()));
  await page.goto("file://" + require("path").resolve(__dirname, "../index.html"));
  const satz = () => page.textContent(".satz");
  const stufen = async () => (await page.$$eval(".seite .stufe", (e) => e.map((x) => x.textContent))).join(" | ");
  const ergebnis = [];
  const pruefe = async (name, ist, soll) => ergebnis.push(`${ist === soll ? "OK  " : "FEHL"} ${name}: ${ist}${ist === soll ? "" : "  (erwartet: " + soll + ")"}`);

  await pruefe("Start leer", await satz(), "Noch keine Karten");
  // Frage
  await page.click("#frage"); await page.keyboard.type("Rente mit 70?"); await page.keyboard.press("Enter");
  await pruefe("Frage", await page.textContent("#frage"), "Rente mit 70?");
  // 10 Karten per Tastatur
  const karte = async (taste, text, stufe) => {
    await page.keyboard.press("Escape"); await page.click("body", { position: { x: 5, y: 5 } });
    await page.keyboard.press(taste); await page.selectOption("#eStufe", String(stufe));
    await page.focus("#eText"); await page.keyboard.type(text); await page.keyboard.press("Enter");
  };
  for (const [t, s] of [["A4", 4], ["A3", 3], ["A2", 2], ["B2", 2], ["A1", 1]]) await karte("p", "Pro " + t, s);
  for (const [t, s] of [["C6", 6], ["C5", 5], ["C3", 3], ["C2", 2], ["C1", 1]]) await karte("c", "Contra " + t, s);
  await pruefe("10 Karten", String(await page.$$eval(".karte", (e) => e.length)), "10");
  await pruefe("Stufen", await stufen(), "4,0 | 6,0");
  await pruefe("Satz", await satz(), "Contra wiegt 98-mal mehr");
  // Einwand ohne Auswahl → Hinweis
  await page.keyboard.press("Escape"); await page.keyboard.press("Escape"); await page.click(".arten [data-art=einwand]");
  await page.keyboard.type("x"); await page.keyboard.press("Enter");
  await pruefe("Einwand ohne Auswahl", await page.locator("#hinweis").textContent({ timeout: 3000 }), "Für einen Einwand erst eine Karte anklicken.");
  await page.fill("#eText", ""); await page.keyboard.press("Escape");
  // Einwand 50 % gegen Contra C6
  await page.click(".karte:has-text('Contra C6') .text"); await page.keyboard.press("e");
  await page.selectOption("#eAnteil", "5"); await page.keyboard.type("Stimmt nur halb"); await page.keyboard.press("Enter");
  await pruefe("Einwand hängt unter C6", String(await page.$$eval(".karte[data-id] .einwaende .einwand", (e) => e.length)), "1");
  await pruefe("Stufen nach Einwand", await stufen(), "4,0 | 5,8");
  await pruefe("Satz nach Einwand", await satz(), "Contra wiegt 54-mal mehr");
  await page.screenshot({ path: SP + "/e2e-1.png" });
  // Taste 9 auf Pro A4
  await page.keyboard.press("Escape");
  await page.click(".karte:has-text('Pro A4') .text"); await page.keyboard.press("9");
  await pruefe("Taste 9", await satz(), "Pro wiegt 1.700-mal mehr");
  // Löschen C6 samt Einwand, dann Strg+Z / Strg+Y
  await page.click(".karte:has-text('Contra C6') > .kopf .text"); await page.keyboard.press("Delete");
  await pruefe("Löschen", await satz(), "Pro wiegt 9.900-mal mehr");
  await pruefe("Einwand mit gelöscht", String(await page.$$eval(".einwand", (e) => e.length)), "0");
  await page.keyboard.press("Control+z");
  await pruefe("Strg+Z", await satz(), "Pro wiegt 1.700-mal mehr");
  await page.keyboard.press("Control+y");
  await pruefe("Strg+Y", await satz(), "Pro wiegt 9.900-mal mehr");
  await page.keyboard.press("Control+z");
  // Ändern per Enter
  await page.click(".karte:has-text('Pro A3') .text"); await page.keyboard.press("Enter");
  await pruefe("Ändern lädt Text", await page.inputValue("#eText"), "Pro A3");
  await page.fill("#eText", "Pro A3 neu"); await page.fill("#eQuelle", "https://destatis.de/x"); await page.keyboard.press("Enter");
  await pruefe("Geändert + Link", await page.textContent(".karte:has-text('Pro A3 neu') .fuss a"), "destatis.de");
  // Leerer Text → Fehler
  await page.keyboard.press("p"); await page.keyboard.press("Enter");
  await pruefe("Leerer Text", await page.locator("#hinweis").textContent({ timeout: 3000 }), "Der Text ist leer.");
  // Quelle javascript: wird kein Link
  await page.fill("#eText", "Böse"); await page.fill("#eQuelle", "javascript:alert(1)"); await page.keyboard.press("Enter");
  await pruefe("javascript: kein Link", String(await page.$$eval(".karte:has-text('Böse') .fuss a", (e) => e.length)), "0");
  // H blendet Leiste aus
  await page.click("body", { position: { x: 5, y: 5 } }); await page.keyboard.press("Escape");
  await page.locator("#eText").blur(); await page.keyboard.press("h");
  await pruefe("H blendet aus", String(await page.isVisible("#leiste")), "false");
  await page.keyboard.press("h");
  await page.screenshot({ path: SP + "/e2e-2.png" });
  // --- Schritt 4: Not-Speicher, Speichern, Öffnen, kaputte Datei, Neu
  await page.keyboard.press("Escape");
  const satzVorher = await satz();
  await page.reload();
  await pruefe("Neu laden: Not-Speicher", await satz(), satzVorher);
  await pruefe("Neu laden: Meldung", await page.textContent("#hinweis"), "Letzter Stand wiederhergestellt (Not-Speicher).");
  await pruefe("Status vor Speichern", await page.textContent("#dStatus"), "noch keine Datei · nicht gespeichert");
  // Speichern: Datei-Dialog durch eine Attrappe ersetzen, die mitschreibt
  await page.evaluate(() => {
    window.__datei = null;
    window.showSaveFilePicker = async () => ({ name: "rente.clear-sight.json",
      createWritable: async () => ({ write: async (t) => { window.__datei = t; }, close: async () => {} }) });
  });
  await page.keyboard.press("Control+s");
  await page.waitForFunction(() => window.__datei);
  const gespeichert = JSON.parse(await page.evaluate(() => window.__datei));
  await pruefe("Datei: Format", gespeichert.format, "clear-sight");
  await pruefe("Datei: Frage", gespeichert.frage, "Rente mit 70?");
  await pruefe("Datei: Kartenzahl", String(gespeichert.karten.length), "12"); // 10 + Einwand + „Böse“
  await pruefe("Status nach Speichern", await page.textContent("#dStatus"), "rente.clear-sight.json · gespeichert");
  await page.click(".karte:has-text('Pro A1') .text"); await page.keyboard.press("2");
  await pruefe("Status nach Änderung", await page.textContent("#dStatus"), "rente.clear-sight.json · nicht gespeichert");
  await page.keyboard.press("Control+z");
  await pruefe("Strg+Z bis zum gespeicherten Stand", await page.textContent("#dStatus"), "rente.clear-sight.json · gespeichert");
  // Kaputte Datei öffnen: Meldung, nichts ändert sich
  const vorher = await satz();
  await page.setInputFiles("#dWahl", { name: "kaputt.json", mimeType: "application/json", buffer: Buffer.from("{ kaputt") });
  await page.waitForFunction(() => document.querySelector("#hinweis .fehler")); // Datei lesen ist async
  await pruefe("Kaputte Datei: Meldung", await page.textContent("#hinweis"), "kaputt.json nicht geöffnet: Die Datei ist nicht lesbar (kein gültiges JSON).");
  await pruefe("Kaputte Datei: nichts geändert", await satz(), vorher);
  // Gute Datei öffnen, dann Strg+Z
  const gut = JSON.stringify({ format: "clear-sight", version: 1, frage: "Mindestlohn 15 €?", karten: [
    { id: "k1", art: "argument", seite: "pro", stufe: 4, text: "Mehr Kaufkraft", quelle: "" }] });
  await page.setInputFiles("#dWahl", { name: "lohn.json", mimeType: "application/json", buffer: Buffer.from(gut) });
  await page.waitForFunction(() => document.querySelector("#frage").textContent === "Mindestlohn 15 €?", null, { timeout: 3000 }).catch(() => {});
  await pruefe("Öffnen: Frage", await page.textContent("#frage"), "Mindestlohn 15 €?");
  await pruefe("Öffnen: Satz", await satz(), "Nur Pro hat Gewicht");
  await pruefe("Öffnen: Status", await page.textContent("#dStatus"), "lohn.json · gespeichert");
  await page.click("body", { position: { x: 5, y: 5 } }); await page.keyboard.press("Control+z");
  await pruefe("Öffnen + Strg+Z", await page.textContent("#frage"), "Rente mit 70?");
  // Neu, dann Strg+Z
  await page.click("#dNeu");
  await pruefe("Neu", await satz(), "Noch keine Karten");
  await page.keyboard.press("Control+z");
  await pruefe("Neu + Strg+Z", await page.textContent("#frage"), "Rente mit 70?");
  await page.screenshot({ path: SP + "/e2e-3.png" });
  // --- Schritt 7 + 8: Skala-Vorlagen (F24–F36), am Ende F30 ganz
  const titel = () => page.textContent("#skalaTitel");
  const woerter = async () => page.$$eval("#leiter span", (e) => e.map((x) => x.textContent));
  const wort = async (i) => (await woerter())[i];
  const liste = async () => (await page.$$eval("#sWahl option", (e) => e.map((x) => x.textContent))).join(" | ");
  const weg = () => page.click("body", { position: { x: 5, y: 5 } });
  const warte = (f, arg) => page.waitForFunction(f, arg, { timeout: 3000 }).catch(() => {});
  await pruefe("Skala: Start", await titel(), "Skala: Gesellschaft");
  await pruefe("Skala: Leiter 1", await wort(0), "Kleinigkeit");
  await pruefe("Skala: Stufen-Auswahl", await page.textContent("#eStufe option[value='1']"), "Stufe 1 · Kleinigkeit");
  await pruefe("Skala: Liste", await liste(), "Gesellschaft | Werkzeug");
  await pruefe("Skala: Gesellschaft nicht löschbar", String(await page.isDisabled("#sWeg")), "true");
  const satzVorSkala = await satz();
  await page.selectOption("#sWahl", "Werkzeug");
  await pruefe("Wechsel: Titel", await titel(), "Skala: Werkzeug");
  await pruefe("Wechsel: Leiter 1", await wort(0), "kaum spürbar (Farbe eines Knopfs)");
  await pruefe("Wechsel: Zahl bleibt (F29)", await satz(), satzVorSkala);
  await weg(); await page.keyboard.press("Control+z");
  await pruefe("Wechsel + Strg+Z", await titel(), "Skala: Gesellschaft");
  // F30: Neu → Skala „Gesundheit“ anlegen, Feld 5 leer → speichern → neu laden → in der Liste
  await page.click("#dNeu");
  await page.click("#sAuf");
  await page.fill("#sName", "Gesundheit");
  const felder = await page.$$(".sWort");
  for (let i = 0; i < 10; i++) await felder[i].fill(i === 4 ? "" : "G" + (i + 1));
  await page.click("#sOk");
  await pruefe("Anlegen: Titel", await titel(), "Skala: Gesundheit");
  await pruefe("Anlegen: Leiter 1", await wort(0), "G1");
  await pruefe("Anlegen: leeres Feld (F35)", await wort(4), "");
  await pruefe("Anlegen: Stufen-Auswahl leer", await page.textContent("#eStufe option[value='5']"), "Stufe 5");
  await pruefe("Anlegen: Liste", await liste(), "Gesellschaft | Gesundheit | Werkzeug");
  await pruefe("Anlegen: Box zu", String(await page.isVisible("#skalaBox")), "false");
  await page.click("#frage"); await page.keyboard.type("Wie gut funktioniert die Waage?"); await page.keyboard.press("Enter");
  await page.click("#sAuf"); await page.fill("#sName", " "); await page.keyboard.press("Enter");
  await pruefe("Leerer Name", await page.textContent("#hinweis"), "Der Name der Skala ist leer.");
  await page.keyboard.press("Escape");
  await pruefe("Leerer Name: nichts geändert", await titel(), "Skala: Gesundheit");
  await page.evaluate(() => { window.__datei = null; });
  await weg(); await page.keyboard.press("Control+s");
  await page.waitForFunction(() => window.__datei);
  const d2 = JSON.parse(await page.evaluate(() => window.__datei));
  await pruefe("Datei: Version 2", String(d2.version), "2");
  await pruefe("Datei: Skala", d2.skala.name + " " + d2.skala.stufen.join(","), "Gesundheit G1,G2,G3,G4,,G6,G7,G8,G9,G10");
  await page.reload();
  await pruefe("Neu geladen: Titel", await titel(), "Skala: Gesundheit");
  await page.click("#dNeu");
  await pruefe("Neu geladen + Neu: Gesellschaft (F28)", await titel(), "Skala: Gesellschaft");
  await pruefe("Neu geladen: Liste hat Gesundheit (F30)", await liste(), "Gesellschaft | Gesundheit | Werkzeug");
  await page.selectOption("#sWahl", "Gesundheit");
  await pruefe("Neu geladen: Leiter zeigt Wörter (F30)", (await woerter()).join(","), "G1,G2,G3,G4,,G6,G7,G8,G9,G10");
  // Vorlage löschen (F33): Thema behält die Wörter, nach Neuladen nicht zurück
  await page.selectOption("#sWahl", "Werkzeug");
  await page.click("#sWeg");
  await pruefe("Löschen: Liste", await liste(), "Werkzeug (nur dieses Thema) | Gesellschaft | Gesundheit");
  await pruefe("Löschen: Thema behält Wörter", await wort(0), "kaum spürbar (Farbe eines Knopfs)");
  await page.click("#dNeu");
  await page.reload();
  await pruefe("Löschen + Neuladen", await liste(), "Gesellschaft | Gesundheit");
  // Datei öffnen bringt ihre Skala in die Liste (F26); ältere Fassung überschreibt nicht (F32)
  const zehn = (w) => Array.from({ length: 10 }, (_, i) => w + (i + 1));
  const mitSkala = (name, w, datum) => Buffer.from(JSON.stringify({ format: "clear-sight", version: 2, frage: "Test?", karten: [],
    skala: { name, stufen: zehn(w), datum } }));
  await page.setInputFiles("#dWahl", { name: "politik.json", mimeType: "application/json", buffer: mitSkala("Politik", "P", "2026-11-06T12:00:00.000Z") });
  await warte(() => document.querySelector("#skalaTitel").textContent === "Skala: Politik");
  await pruefe("Öffnen: Skala der Datei", await titel(), "Skala: Politik");
  await pruefe("Öffnen: in der Liste (F26)", await liste(), "Gesellschaft | Gesundheit | Politik");
  await page.setInputFiles("#dWahl", { name: "alt.json", mimeType: "application/json", buffer: mitSkala("Gesundheit", "alt", "2020-01-01T00:00:00.000Z") });
  await warte(() => document.querySelector("#leiter span").textContent === "alt1");
  await pruefe("Alte Datei: behält ihre Wörter", await wort(0), "alt1");
  await pruefe("Alte Datei: Liste behält neuere (F32)", await page.evaluate(() =>
    JSON.parse(localStorage.getItem("cs-skalen")).find((s) => s.name === "Gesundheit").stufen[0]), "G1");
  await page.setInputFiles("#dWahl", { name: "v1.json", mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ format: "clear-sight", version: 1, frage: "Alt?", karten: [] })) });
  await warte(() => document.querySelector("#frage").textContent === "Alt?");
  await pruefe("Version-1-Datei: Gesellschaft", await titel(), "Skala: Gesellschaft");
  await page.selectOption("#sWahl", "Gesundheit");
  await page.screenshot({ path: SP + "/e2e-4.png" });
  await page.click("#sAuf");
  await page.screenshot({ path: SP + "/e2e-5.png" });
  console.log(ergebnis.join("\n"));
  console.log("Fehler im Browser:", fehler.length ? fehler : "keine");
  await browser.close();
})();

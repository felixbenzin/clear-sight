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
  console.log(ergebnis.join("\n"));
  console.log("Fehler im Browser:", fehler.length ? fehler : "keine");
  await browser.close();
})();

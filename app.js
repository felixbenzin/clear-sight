// Clear Sight — Ansicht + Bedienung. Rechnen in rechnen.js, Regeln fürs Bearbeiten in bearbeiten.js.
"use strict";

// Alle Texte an einer Stelle (F22: Englisch kommt später dazu)
const TEXT = {
  marke: "Clear Sight", pro: "Pro", contra: "Contra", einwand: "Einwand", leer: "Noch keine Karte",
  ohneQuelle: "ohne Quelle", wirktWie: "wirkt wie Stufe", entkraeftet: "ganz entkräftet", wirkt: "wirkt nur",
  gesamt: "Gesamt-Stufe", keinGewicht: "kein Gewicht", startFrage: "Neue Frage – zum Ändern anklicken",
  textPlatz: { pro: "Neues Pro-Argument …", contra: "Neues Contra-Argument …", einwand: "Einwand gegen die gewählte Karte …" },
  quellePlatz: "Quelle (Link oder Text)", anlegen: "Anlegen", aendern: "Ändern", abbrechen: "Abbrechen",
  stufe: (n) => `Stufe ${n}`, anteil: (p) => `−${p} %`,
  einwandGegen: (t) => `Einwand gegen: „${t}“`, erstWaehlen: "Für einen Einwand erst eine Karte anklicken.",
  hilfe: "Karte anklicken, dann: <kbd>1</kbd>–<kbd>0</kbd> Stufe/Anteil · <kbd>E</kbd> Einwand · <kbd>Enter</kbd> ändern · " +
         "<kbd>Entf</kbd> löschen · <kbd>P</kbd>/<kbd>C</kbd> neue Karte · <kbd>Strg</kbd>+<kbd>Z</kbd> zurück · " +
         "<kbd>Strg</kbd>+<kbd>Y</kbd> vor · <kbd>H</kbd> Leiste aus/an",
  leiter: ["Kleinigkeit", "Bequemlichkeit", "Geldbeutel vieler", "Last für eine Gruppe", "Existenz bedroht",
           "Leben in Gefahr", "Katastrophe im Land", "Kontinent", "weltweit", "Ende der Zivilisation"],
};

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const komma = (x) => new Intl.NumberFormat("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(x);
const kurz = (t) => (t.length > 60 ? t.slice(0, 57) + "…" : t);

// --- Zustand
const verlauf = Bearbeiten.verlauf({ frage: TEXT.startFrage, karten: [] });
let gewaehlt = null;              // id der angeklickten Karte
let art = "pro";                  // was die Leiste anlegt: pro | contra | einwand
let bearbeitet = null;            // id der Karte, die gerade in der Leiste geändert wird
const thema = () => verlauf.jetzt();
const finde = (id) => thema().karten.find((k) => k.id === id);

function aendere(neu) {           // jede Änderung geht hier durch → Strg+Z kennt sie
  verlauf.setze(neu);
  zeichne();
}

function melde(text, fehler) {
  const h = $("hinweis");
  if (!text) { h.innerHTML = TEXT.hilfe; return; }
  h.replaceChildren(el("span", fehler ? "fehler" : "", text));
}

function versuche(f) {            // Fehler aus den Regeln landen sichtbar in der Leiste, nicht in der Konsole
  try { f(); melde(); return true; }
  catch (e) { if (e instanceof Bearbeiten.Fehler) { melde(e.message, true); return false; } throw e; }
}

// --- Ansicht
function quelleTag(q) {
  if (!q) return el("span", "tag warn", TEXT.ohneQuelle);
  const url = Bearbeiten.link(q);
  if (!url) return el("span", "", q);
  const a = el("a", "", (() => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; } })());
  a.href = url; a.target = "_blank"; a.rel = "noopener";
  return a;
}

function karteHtml(k, karten) {
  const rest = Rechnen.rest(k.id, karten);
  const d = el("div", "karte" + (k.art === "einwand" ? " einwand" : "") + (rest === 0 ? " tot" : "") + (k.id === gewaehlt ? " gewaehlt" : ""));
  d.dataset.id = k.id;
  const kopf = el("div", "kopf");
  const fuss = el("div", "fuss");
  if (k.art === "argument") {
    d.style.setProperty("--staerke", 20 + k.stufe * 8 * Math.max(rest, 0.15));
    d.style.setProperty("--glanz", Math.round(k.stufe * 4 * rest));
    kopf.append(el("div", "zahl", k.stufe), el("div", "text", k.text));
    if (rest === 0) fuss.append(el("span", "tag", TEXT.entkraeftet));
    else if (rest < 1) fuss.append(el("span", "tag", `${TEXT.wirktWie} ${komma(Rechnen.stufe(10 ** k.stufe * rest))}`));
  } else {
    kopf.append(el("div", "zahl", "−" + Math.round(k.anteil * 100)), el("div", "text", k.text));
    if (rest === 0) fuss.append(el("span", "tag", TEXT.entkraeftet));
    else if (rest < 1) fuss.append(el("span", "tag", `${TEXT.wirkt} −${Math.round(k.anteil * rest * 100)} %`));
  }
  fuss.prepend(quelleTag(k.quelle));
  d.append(kopf);
  if (k.art === "argument" && rest < 1) { const r = el("div", "rest"); r.style.setProperty("--rest", rest); r.append(el("i")); d.append(r); }
  d.append(fuss);
  const kinder = karten.filter((e) => e.art === "einwand" && e.ziel === k.id);
  if (kinder.length) {
    const box = el("div", "einwaende");
    kinder.sort((a, b) => b.anteil * Rechnen.rest(b.id, karten) - a.anteil * Rechnen.rest(a.id, karten))
          .forEach((e) => box.append(karteHtml(e, karten)));
    d.append(box);
  }
  return d;
}

function zeichne() {
  const { karten, frage } = thema();
  if (gewaehlt && !finde(gewaehlt)) gewaehlt = null;      // z. B. nach Strg+Z
  if (bearbeitet && !finde(bearbeitet)) beendeAendern();
  $("marke").textContent = TEXT.marke;
  if ($("frage").contentEditable !== "true") $("frage").textContent = frage;

  const s = Rechnen.seiten(karten);
  const w = $("waage"); w.replaceChildren();
  const seite = (name, cls, g) => {
    const d = el("div", "seite " + cls);
    d.append(el("div", "name", name), el("div", "stufe", Rechnen.stufeText(g)), el("div", "klein", g > 0 ? TEXT.gesamt : TEXT.keinGewicht));
    return d;
  };
  const mitte = el("div");
  mitte.append(el("div", "satz", Rechnen.vergleich(karten)));
  const balken = el("div", "balken"); const stange = el("div", "stange");
  balken.append(el("div", "fuss"), stange);
  const diff = (Rechnen.stufe(s.contra) ?? 0) - (Rechnen.stufe(s.pro) ?? 0);
  stange.style.setProperty("--kipp", Math.max(-14, Math.min(14, diff * 2.5)) + "deg");
  mitte.append(balken);
  w.append(seite(TEXT.pro, "pro", s.pro), mitte, seite(TEXT.contra, "contra", s.contra));

  const sp = $("spalten"); sp.replaceChildren();
  for (const [name, cls] of [[TEXT.pro, "pro"], [TEXT.contra, "contra"]]) {
    const col = el("div", "spalte " + cls);
    col.append(el("div", "titel", name));
    const args = karten.filter((k) => k.art === "argument" && k.seite === cls)
      .sort((a, b) => 10 ** b.stufe * Rechnen.rest(b.id, karten) - 10 ** a.stufe * Rechnen.rest(a.id, karten));
    if (!args.length) col.append(el("div", "leer", TEXT.leer));
    args.forEach((k) => col.append(karteHtml(k, karten)));
    sp.append(col);
  }
  zeichneLeiste();
}

// --- Leiste
function zeichneLeiste() {
  document.querySelectorAll(".arten button").forEach((b) => {
    b.setAttribute("aria-pressed", String(b.dataset.art === art));
    // Beim Ändern kann ein Argument die Seite wechseln, aber nicht zum Einwand werden (und umgekehrt)
    b.disabled = !!bearbeitet && (finde(bearbeitet).art === "einwand") !== (b.dataset.art === "einwand");
  });
  const istEinwand = art === "einwand";
  $("eStufe").hidden = istEinwand;
  $("eAnteil").hidden = !istEinwand;
  const ziel = istEinwand && !bearbeitet && gewaehlt ? finde(gewaehlt) : null;
  $("eText").placeholder = ziel ? TEXT.einwandGegen(kurz(ziel.text)) : TEXT.textPlatz[art];
  $("eLos").textContent = bearbeitet ? TEXT.aendern : TEXT.anlegen;
  $("eNein").hidden = !bearbeitet;
}

function waehleArt(a) { art = a; zeichneLeiste(); }

function eingabe() {
  const basis = { text: $("eText").value, quelle: $("eQuelle").value };
  if (art === "einwand") return { ...basis, art: "einwand", anteil: Number($("eAnteil").value) / 10 };
  return { ...basis, art: "argument", seite: art, stufe: Number($("eStufe").value) };
}

function leereLeiste() { $("eText").value = ""; $("eQuelle").value = ""; }

function los() {
  if (bearbeitet) {
    const { art: _a, ...felder } = eingabe();
    if (versuche(() => aendere(Bearbeiten.aendern(thema(), bearbeitet, felder)))) { beendeAendern(); $("eText").blur(); }
    return;
  }
  if (art === "einwand" && !gewaehlt) { melde(TEXT.erstWaehlen, true); return; }
  let neueId = null;
  const ok = versuche(() => {
    const r = Bearbeiten.neu(thema(), art === "einwand" ? { ...eingabe(), ziel: gewaehlt } : eingabe());
    neueId = r.id;
    aendere(r.thema);
  });
  if (ok) { leereLeiste(); if (art !== "einwand") { gewaehlt = neueId; zeichne(); } }
}

function starteAendern(id) {
  const k = finde(id);
  bearbeitet = id;
  art = k.art === "einwand" ? "einwand" : k.seite;
  $("eText").value = k.text;
  $("eQuelle").value = k.quelle || "";
  if (k.art === "einwand") $("eAnteil").value = String(Math.round(k.anteil * 10));
  else $("eStufe").value = String(k.stufe);
  $("leiste").classList.remove("aus");
  zeichneLeiste();
  $("eText").focus();
}

function beendeAendern() { bearbeitet = null; leereLeiste(); zeichneLeiste(); melde(); }

// --- Frage oben: anklicken, tippen, Enter
const frageEl = $("frage");
frageEl.addEventListener("click", () => {
  if (frageEl.contentEditable === "true") return;
  frageEl.contentEditable = "true";
  frageEl.focus();
  document.getSelection().selectAllChildren(frageEl);
});
function frageFertig(speichern) {
  if (frageEl.contentEditable !== "true") return;
  frageEl.contentEditable = "false";
  if (speichern && frageEl.textContent.trim() !== thema().frage) versuche(() => aendere(Bearbeiten.frage(thema(), frageEl.textContent)));
  zeichne();
}
frageEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); frageFertig(true); frageEl.blur(); }
  if (e.key === "Escape") { frageFertig(false); frageEl.blur(); }
});
frageEl.addEventListener("blur", () => frageFertig(true));

// --- Karten anklicken
$("spalten").addEventListener("click", (e) => {
  if (e.target.closest("a")) return;            // Quelle öffnen, nicht wählen
  const k = e.target.closest(".karte");
  gewaehlt = k && k.dataset.id !== gewaehlt ? k.dataset.id : null;
  zeichne();
});

// --- Leiste bedienen
document.querySelectorAll(".arten button").forEach((b) => b.addEventListener("click", () => { waehleArt(b.dataset.art); $("eText").focus(); }));
$("eLos").addEventListener("click", los);
$("eNein").addEventListener("click", beendeAendern);
for (const id of ["eText", "eQuelle"]) {
  $(id).addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); los(); }
    if (e.key === "Escape") { if (bearbeitet) beendeAendern(); e.target.blur(); }
  });
}

// --- Tastatur, wenn nicht gerade getippt wird
const tippt = (t) => t.closest("input, select, textarea, [contenteditable='true']");
document.addEventListener("keydown", (e) => {
  const strg = e.ctrlKey || e.metaKey;
  if (strg && !tippt(e.target)) {
    const k = e.key.toLowerCase();
    if (k === "z" && !e.shiftKey) { e.preventDefault(); verlauf.zurueck(); zeichne(); return; }
    if (k === "y" || (k === "z" && e.shiftKey)) { e.preventDefault(); verlauf.vor(); zeichne(); return; }
  }
  if (strg || e.altKey || tippt(e.target)) return;
  const k = gewaehlt && finde(gewaehlt);
  if (/^[0-9]$/.test(e.key) && k) {
    const n = e.key === "0" ? 10 : Number(e.key);
    versuche(() => aendere(Bearbeiten.aendern(thema(), k.id, k.art === "einwand" ? { anteil: n / 10 } : { stufe: n })));
  } else if ((e.key === "Delete" || e.key === "Backspace") && k) {
    e.preventDefault();
    aendere(Bearbeiten.entfernen(thema(), k.id));
  } else if (e.key === "Enter" && k) {
    e.preventDefault(); starteAendern(k.id);
  } else if (e.key.toLowerCase() === "e" && k) {
    e.preventDefault(); $("leiste").classList.remove("aus"); waehleArt("einwand"); $("eText").focus();
  } else if (e.key.toLowerCase() === "p" || e.key.toLowerCase() === "c") {
    e.preventDefault(); $("leiste").classList.remove("aus"); waehleArt(e.key.toLowerCase() === "p" ? "pro" : "contra"); $("eText").focus();
  } else if (e.key.toLowerCase() === "h") {
    $("leiste").classList.toggle("aus");
  } else if (e.key === "Escape") {
    gewaehlt = null; zeichne();
  }
});

// --- Start
for (let i = 1; i <= 10; i++) {
  $("eStufe").append(new Option(`${TEXT.stufe(i)} · ${TEXT.leiter[i - 1]}`, String(i)));
  $("eAnteil").append(new Option(TEXT.anteil(i * 10), String(i)));
}
$("eStufe").value = "3";
$("eAnteil").value = "5";
$("eQuelle").placeholder = TEXT.quellePlatz;
$("eNein").textContent = TEXT.abbrechen;
const l = $("leiter");
TEXT.leiter.forEach((t, i) => { const d = el("div"); d.append(el("b", "", i + 1), el("span", "", t)); l.append(d); });
melde();
zeichne();

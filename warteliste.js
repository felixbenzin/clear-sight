// Clear Sight — Warteliste-Fenster (F39). Liest Warteliste + Thema aus localStorage (schreibt beides nie),
// schickt Annehmen/Ablehnen per BroadcastChannel ans Stream-Fenster. Chat-Texte nur als Text anzeigen.
"use strict";

const TEXT = {
  titel: "Clear Sight · Warteliste", leer: "Noch keine Vorschläge.",
  status: (n) => (n === 1 ? "1 Vorschlag" : `${n} Vorschläge`) + " · OBS nimmt dieses Fenster nicht auf",
  art: { pro: "Pro", contra: "Contra", einwand: "Einwand", offen: "ohne Seite" },
  ablehnen: "Ablehnen", quelle: "Quelle (Link oder Text)",
  zielWaehlen: "Ziel wählen …", zielFehlt: "Ziel fehlt – bitte Karte wählen", ziel: "Einwand gegen",
  erstArt: "Erst Pro, Contra oder Einwand wählen, dann die Stufe.",
  stufeKlick: "Klick auf die Stufe nimmt an.", anteilKlick: "Klick auf den Anteil nimmt an.",
  erstZiel: "Erst ein Ziel wählen.", keineAntwort: "Das Stream-Fenster antwortet nicht. Ist es offen?",
  vor: (min) => (min < 1 ? "gerade eben" : `vor ${min} Min.`),
};

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const lies = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const kurz = (t) => (t.length > 50 ? t.slice(0, 47) + "…" : t);

let funk = null;
try { funk = new BroadcastChannel("clear-sight"); } catch {}

let stand = Chat.lies(lies("cs-warteliste"));
let thema = leseThema();
const wahl = {};          // pro Vorschlag: { art, quelle, ziel } — Felix' Einstellungen, bis er annimmt
const fehler = {};        // pro Vorschlag: Meldung
const wartet = {};        // pro Vorschlag: Zeitgeber, falls das Stream-Fenster nicht antwortet
let spaeter = false;      // neu zeichnen, sobald Felix nicht mehr tippt

function leseThema() {
  try {
    const n = JSON.parse(lies("cs-notspeicher"));
    return Bearbeiten.ausDatei(JSON.stringify(n.datei));
  } catch {
    return { frage: "", karten: [], skala: Bearbeiten.SKALEN[0] };
  }
}

function w(v) {
  if (!wahl[v.id]) wahl[v.id] = { art: v.art === "offen" ? null : v.art, quelle: Chat.ersterLink(v.text), ziel: v.ziel };
  return wahl[v.id];
}

function sende(v, nachricht) {
  if (!funk) { fehler[v.id] = TEXT.keineAntwort; zeichne(); return; }
  delete fehler[v.id];
  clearTimeout(wartet[v.id]);
  wartet[v.id] = setTimeout(() => { fehler[v.id] = TEXT.keineAntwort; zeichne(); }, 2000);
  funk.postMessage({ ...nachricht, id: v.id });
}

function nimmAn(v, wert) {
  const x = w(v);
  if (x.art === "einwand" && !x.ziel) { fehler[v.id] = TEXT.erstZiel; zeichne(); return; }
  const auswahl = x.art === "einwand" ? { art: "einwand", anteil: wert / 10, ziel: x.ziel, quelle: x.quelle }
                                      : { art: x.art, stufe: wert, quelle: x.quelle };
  sende(v, { typ: "annehmen", wahl: auswahl });
}

function karteVorschlag(v, jetzt) {
  const x = w(v);
  const d = el("div", "v");
  d.dataset.id = v.id;

  const kopf = el("div", "kopf");
  const weg = el("button", "nein weg", TEXT.ablehnen);
  weg.addEventListener("click", () => sende(v, { typ: "ablehnen" }));
  kopf.append(el("span", "name", "@" + v.name), el("span", "zeit", TEXT.vor(Math.floor((jetzt - v.zeit) / 60000))), weg);
  d.append(kopf, el("div", "text", v.text));

  const zeile = el("div", "zeile");
  const arten = el("div", "arten");
  for (const a of ["pro", "contra", "einwand"]) {
    const b = el("button", "", TEXT.art[a]);
    b.dataset.art = a;
    b.setAttribute("aria-pressed", String(x.art === a));
    b.addEventListener("click", () => { x.art = a; delete fehler[v.id]; zeichne(); });
    arten.append(b);
  }
  const quelle = el("input");
  quelle.placeholder = TEXT.quelle;
  quelle.value = x.quelle;
  quelle.addEventListener("input", () => { x.quelle = quelle.value; });
  zeile.append(arten, quelle);
  d.append(zeile);

  if (x.art === "einwand") {
    const z = el("div", "zeile");
    const sel = el("select");
    sel.append(new Option(TEXT.zielWaehlen, ""));
    for (const k of thema.karten) sel.append(new Option(`#${k.id.replace(/^k(\d+)$/, "$1")} ${kurz(k.text)}`, k.id));
    sel.value = thema.karten.some((k) => k.id === x.ziel) ? x.ziel : "";
    if (!sel.value) x.ziel = null;
    sel.addEventListener("change", () => { x.ziel = sel.value || null; delete fehler[v.id]; zeichne(); });
    z.append(el("span", "ziel" + (x.ziel ? "" : " fehlt"), x.ziel ? TEXT.ziel : TEXT.zielFehlt), sel);
    d.append(z);
  }

  const werte = el("div", "werte");
  for (let i = 1; i <= 10; i++) {
    const b = el("button", "", x.art === "einwand" ? `−${i * 10}` : String(i));
    b.dataset.wert = String(i);
    b.disabled = !x.art;
    if (x.art !== "einwand" && thema.skala.stufen[i - 1]) b.title = thema.skala.stufen[i - 1];
    b.addEventListener("click", () => nimmAn(v, i));
    werte.append(b);
  }
  d.append(werte, el("div", "hinweisWert", !x.art ? TEXT.erstArt : x.art === "einwand" ? TEXT.anteilKlick : TEXT.stufeKlick));
  if (fehler[v.id]) d.append(el("div", "fehler", fehler[v.id]));
  return d;
}

function zeichne() {
  const tippt = document.activeElement && document.activeElement.closest("#liste input, #liste select");
  if (tippt) { spaeter = true; return; }      // nicht unter Felix' Fingern neu bauen
  spaeter = false;
  $("titel").textContent = TEXT.titel;
  $("status").textContent = TEXT.status(stand.vorschlaege.length);
  const jetzt = Date.now();
  const liste = $("liste");
  liste.replaceChildren(...(stand.vorschlaege.length ? stand.vorschlaege.map((v) => karteVorschlag(v, jetzt)) : [el("div", "leer", TEXT.leer)]));
  liste.style.display = "flex"; liste.style.flexDirection = "column"; liste.style.gap = "10px";
}

document.addEventListener("focusout", () => setTimeout(() => { if (spaeter) zeichne(); }, 0));
window.addEventListener("storage", (e) => {
  if (e.key === "cs-warteliste") stand = Chat.lies(e.newValue);
  else if (e.key === "cs-notspeicher") thema = leseThema();
  else return;
  for (const id of Object.keys(wahl)) if (!stand.vorschlaege.some((v) => v.id === id)) { delete wahl[id]; delete fehler[id]; }
  zeichne();
});
if (funk) funk.onmessage = (e) => {
  const m = e.data || {};
  if (m.typ !== "antwort") return;
  clearTimeout(wartet[m.id]);
  if (m.fehler) fehler[m.id] = m.fehler; else delete fehler[m.id];
  zeichne();
};
setInterval(zeichne, 30000);                  // „vor N Min.“ aktuell halten
zeichne();

/* =====================================================================
   Strait Systems — ADII tariff PDF → JSON extractor (best-effort).
   Parses the Moroccan customs tariff (ADII, édition 2022) and the régime
   circulaire from the per-chapter PDFs into structured datasets:
     data/adii/tariff.json   — [{ code, lvl, chapter, designation, droit, unite }]
     data/adii/regimes.json  — [{ code, label }]

   HOW TO REGENERATE (the PDFs are NOT committed — ~53 MB):
     1. Fetch the source PDFs into ./tariff_work/ :
        curl -s "https://api.github.com/repos/Sudnix1/presaisie-badr/contents/PDF%20TARIFFS" \
          | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>JSON.parse(s).forEach(f=>f.download_url&&console.log(f.download_url)))' \
          | while read u; do curl -sL "$u" -o "tariff_work/$(basename "${u%%\?*}")"; done
        curl -sL "https://raw.githubusercontent.com/Sudnix1/presaisie-badr/master/circulaire_81362.pdf" -o tariff_work/circulaire_81362.pdf
     2. node scripts/parse-tariff.mjs

   CAVEATS: text-layer extraction + column reconstruction over 98 hierarchical
   PDFs. Codes + désignations are reliable; duties are partial (~75% of 10-digit
   lines) and column-dependent. NOT authoritative — production should use the
   official ADIL feed. See data/adii/README.md.
   ===================================================================== */

import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";

const pdfjs = await import(pathToFileURL("node_modules/pdfjs-dist/legacy/build/pdf.mjs").href);
const WORK = "tariff_work";

const UNIT = /^(kg|u|l|m|m2|m3|m²|m³|paire|paires|ct|carat|gr|g|t|tonne|hl|kw|kwh|mwh|p\/st|nombre|st)$/i;
const cleanDesig = (s) => s.replace(/\.{3,}/g, " ").replace(/…/g, " ").replace(/\s+/g, " ").replace(/^[\s.–-]+/, "").trim();
const dutyVal = (s) => {
  if (s == null) return null;
  s = String(s).trim();
  if (/^(exo?|ex|exem)/i.test(s)) return 0;
  const m = s.replace(/\s/g, "").replace(",", ".").match(/^\d{1,3}(\.\d+)?$/);
  const v = m ? parseFloat(m[0]) : null;
  return v != null && v <= 300 ? v : null;
};

/* Per-page: find the droit + unité column x by clustering right-side tokens. */
function detectCols(items) {
  const dutyXs = {}, uniteXs = {};
  for (const [x, str] of items) {
    const s = str.trim();
    if (x < 380) continue;
    if (/^\d{1,3}([.,]\d+)?$/.test(s) && parseFloat(s.replace(",", ".")) <= 300) { const b = Math.round(x / 6) * 6; dutyXs[b] = (dutyXs[b] || 0) + 1; }
    if (UNIT.test(s)) { const b = Math.round(x / 6) * 6; uniteXs[b] = (uniteXs[b] || 0) + 1; }
  }
  const top = (o) => Object.entries(o).sort((a, b) => b[1] - a[1])[0];
  const d = top(dutyXs), u = top(uniteXs);
  return { dutyX: d ? +d[0] : 457, uniteX: u ? +u[0] : 489 };
}

async function parseChapter(file) {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(file)), useWorkerFetch: false, isEvalSupported: false }).promise;
  const entries = [];
  let sh6 = null, pair = null;
  for (let p = 1; p <= doc.numPages; p++) {
    const c = await (await doc.getPage(p)).getTextContent();
    const { dutyX, uniteX } = detectCols(c.items.map((it) => [it.transform[4], it.str]));
    const rows = {};
    for (const it of c.items) { const y = Math.round(it.transform[5]); (rows[y] = rows[y] || []).push([it.transform[4], it.str]); }
    for (const y of Object.keys(rows).sort((a, b) => b - a)) {
      const items = rows[y].sort((a, b) => a[0] - b[0]);
      let headTok = null, sh6Tok = null, pairTok = null, sufTok = null, desig = [], duty = null, unite = null;
      for (const [x, str] of items) {
        const s = str.trim(); if (!s || x < 50) continue;
        if (x < 78 && /^\d{2}\.\d{2}$/.test(s)) headTok = s;
        else if (x < 108 && /^\d{4}\.\d{2}$/.test(s)) sh6Tok = s;
        else if (x >= 108 && x < 138 && /^\d{2}$/.test(s)) pairTok = s;
        else if (x >= 138 && x < 162 && /^\d{2}$/.test(s)) sufTok = s;
        else if (x >= dutyX - 7 && x < dutyX + 13 && dutyVal(s) != null) duty = dutyVal(s);
        else if (x >= uniteX - 7 && x < uniteX + 16 && UNIT.test(s)) unite = s.toLowerCase();
        else if (x >= 158 && x < dutyX - 7) desig.push(s);
      }
      const designation = cleanDesig(desig.join(" "));
      if (headTok) { sh6 = null; pair = null; if (designation) entries.push({ code: headTok.replace(".", ""), lvl: 4, designation, droit: null, unite: null }); }
      if (sh6Tok) { sh6 = sh6Tok.replace(".", ""); pair = null; if (designation) entries.push({ code: sh6, lvl: 6, designation, droit: duty, unite }); }
      if (pairTok) pair = pairTok;
      if (sufTok && sh6) entries.push({ code: sh6 + (pair || "00") + sufTok, lvl: 10, designation, droit: duty, unite });
    }
  }
  return entries;
}

/* ---- parse every chapter PDF ---- */
const files = readdirSync(WORK).filter((f) => /^tarif_\d+\.pdf$/.test(f));
let all = [];
for (const f of files) {
  try { all = all.concat(await parseChapter(WORK + "/" + f)); }
  catch (e) { console.error("FAIL", f, String(e).slice(0, 60)); }
}

/* ---- chapter from code prefix (authoritative), drop malformed, dedupe ---- */
all = all.filter((e) => /^\d{4,10}$/.test(e.code) && (e.designation || e.droit != null));
for (const e of all) e.chapter = parseInt(e.code.slice(0, 2), 10);
const by = new Map();
for (const e of all) {
  const cur = by.get(e.code);
  if (!cur) { by.set(e.code, e); continue; }
  const better = (e.droit != null && cur.droit == null) ||
    ((e.designation || "").length > (cur.designation || "").length && (e.droit != null) === (cur.droit != null));
  if (better) by.set(e.code, e);
}
const tariff = [...by.values()]
  .map((e) => ({ code: e.code, lvl: e.lvl, chapter: e.chapter, designation: e.designation, droit: e.droit, unite: e.unite }))
  .sort((a, b) => a.code.localeCompare(b.code));

/* ---- régime codes from the circulaire ---- */
let regimes = [];
try {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(WORK + "/circulaire_81362.pdf")), useWorkerFetch: false, isEvalSupported: false }).promise;
  let txt = "";
  for (let p = 1; p <= doc.numPages; p++) txt += " " + (await (await doc.getPage(p)).getTextContent()).items.map((i) => i.str).join(" ");
  txt = txt.replace(/\s+/g, " ");
  const seen = new Set();
  let m;
  const re = /«\s*([^»]{4,80}?)\s*»\s*\(?\s*code\s+régime\s+(\d{3})/gi;
  while ((m = re.exec(txt))) if (!seen.has(m[2])) { seen.add(m[2]); regimes.push({ code: m[2], label: m[1].trim() }); }
  const re2 = /code\s+régime\s+(\d{3})/gi;
  while ((m = re2.exec(txt))) if (!seen.has(m[1])) { seen.add(m[1]); regimes.push({ code: m[1], label: null }); }
} catch (e) { console.error("circ fail", String(e).slice(0, 60)); }

mkdirSync("data/adii", { recursive: true });
writeFileSync("data/adii/tariff.json", JSON.stringify(tariff));
writeFileSync("data/adii/regimes.json", JSON.stringify(regimes, null, 1));

const ten = tariff.filter((t) => t.lvl === 10), wd = ten.filter((t) => t.droit != null);
const chaps = new Set(tariff.map((t) => t.chapter));
const missing = []; for (let i = 1; i <= 97; i++) if (!chaps.has(i)) missing.push(i);
console.log(`tariff.json: ${tariff.length} codes · ${chaps.size} chapitres · ${ten.length} à 10 chiffres (${Math.round(wd.length / ten.length * 100)}% avec droit)`);
console.log(`chapitres absents: ${missing.join(", ") || "aucun"}  (ch.77 réservé dans le SH)`);
console.log(`regimes.json: ${regimes.length} régimes`);

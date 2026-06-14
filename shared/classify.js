/* =====================================================================
   Strait Systems — deterministic HS/NGP classifier.
   Pure, isomorphic. NO network, NO LLM. Same text -> same result, always.
   Used by demo 1 (per extracted invoice line) and demo 2 (free-text query).
   ===================================================================== */

import { TARIFF } from "./tariff.js";

const ARABIC = /[؀-ۿ]/;
export const isArabicText = (s) => ARABIC.test(s || "");

/* lowercase, strip Latin accents, keep Latin alphanum + Arabic, collapse spaces. */
function normalize(s) {
  return (s || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9؀-ۿ]+/g, " ")
    .trim();
}

function tokenize(s) {
  return normalize(s).split(" ").filter((t) => t.length >= 2);
}

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const round2 = (x) => Math.round(x * 100) / 100;

/* Score a single tariff row against a normalized query + its token set. */
function scoreRow(row, q, qTokens) {
  let score = 0;
  const hits = [];
  for (const aliasRaw of row.aliases) {
    const a = normalize(aliasRaw);
    if (!a) continue;
    if (a.includes(" ")) {
      if (q.includes(a)) { score += 3; hits.push(aliasRaw); }       // phrase match
    } else if (qTokens.has(a)) {
      score += 2; hits.push(aliasRaw);                              // exact token
    } else {
      for (const qt of qTokens) {                                   // stem match (>=4 char shared prefix)
        const n = Math.min(qt.length, a.length);
        if (n >= 4 && qt.slice(0, n) === a.slice(0, n)) { score += 1; hits.push(aliasRaw); break; }
      }
    }
  }
  // small boost when label words (>=4 chars) appear in the query
  for (const w of tokenize(row.fr + " " + (row.en || "") + " " + (row.ar || ""))) {
    if (w.length >= 4 && qTokens.has(w)) score += 0.5;
  }
  return { row, score: round2(score), hits: Array.from(new Set(hits)) };
}

function confidenceOf(score) {
  return clamp01(score / (score + 2.5)); // saturating: 2->0.44, 3->0.55, 5->0.67, 9->0.78
}

/* Rank the tariff table for a piece of text. Returns top-N candidates. */
export function rankHs(text, opts = {}) {
  const topN = opts.topN || 3;
  const q = normalize(text);
  const qTokens = new Set(tokenize(text));

  const scored = TARIFF
    .map((row) => scoreRow(row, q, qTokens))
    .filter((s) => s.score > 0)
    .sort((a, b) =>
      b.score - a.score ||
      b.hits.length - a.hits.length ||
      a.row.code.localeCompare(b.row.code)
    );

  if (scored.length === 0) {
    return { candidates: [], confidence: 0, needsReview: true, margin: 0,
      reason: "aucune correspondance — classement manuel requis" };
  }

  const best = scored[0];
  const second = scored[1];
  const baseConf = confidenceOf(best.score);
  const margin = best.score > 0 ? (best.score - (second ? second.score : 0)) / best.score : 0;
  const confidence = round2(baseConf * (0.7 + 0.3 * margin));

  const candidates = scored.slice(0, topN).map((s, i) => ({
    code: s.row.code,
    fr: s.row.fr, ar: s.row.ar, en: s.row.en,
    duty: s.row.duty, vat: s.row.vat, tpi: s.row.tpi,
    category: s.row.category,
    unit: s.row.unit || null,
    sensitive: !!s.row.sensitive,
    priceBand: s.row.priceBand || null,
    score: s.score,
    confidence: i === 0 ? confidence : round2(confidenceOf(s.score) * 0.85),
    reason: s.hits.length ? "correspond sur : " + s.hits.slice(0, 4).join(", ") : "correspondance faible",
  }));

  return {
    candidates,
    confidence,
    margin: round2(margin),
    needsReview: confidence < 0.5 || margin < 0.15,
    reason: candidates[0].reason,
  };
}

/* Resolve the single best HS row for one description (demo 1 enrichment). */
export function resolveHs(text) {
  const r = rankHs(text, { topN: 3 });
  return {
    best: r.candidates[0] || null,
    alternates: r.candidates.slice(1),
    confidence: r.confidence,
    needsReview: r.needsReview,
    reason: r.reason,
  };
}

/* =====================================================================
   Strait Systems — declaration enrichment (the deterministic spine).
   Turns an extracted {header, lines} payload into a full DUM-ready
   declaration: HS classification → landed cost → risk circuit.
   Pure + isomorphic; the server calls this after the LLM (or canned)
   extraction, and the browser can call it too. NO numbers from the LLM.
   ===================================================================== */

import { resolveHs } from "./classify.js";
import { computeLanded } from "./landed.js";
import { assessRisk } from "./risk.js";
import { TARIFF_BY_CODE } from "./tariff.js";

export function enrichDeclaration(extracted, meta = {}) {
  const header = extracted.header || {};
  const currency = header.currency || "MAD";
  const incoterm = header.incoterm || "";
  const overrides = meta.hsOverrides || {}; // { lineIndex: hsCode } — manual reclassification

  /* 1 — classify each line and attach the resolved tariff rates.
     A manual override (declarant picks another code) wins over the suggestion;
     the rest of the pipeline — landed cost, risk — recomputes from it unchanged. */
  const classified = (extracted.lines || []).map((ln, idx) => {
    const desc = ln.raw_description || ln.description || "";
    const res = resolveHs(desc);
    const cands = [res.best, ...(res.alternates || [])].filter(Boolean);
    const ovCode = overrides[idx];
    const manual = !!(ovCode && TARIFF_BY_CODE[ovCode]);
    const best = manual ? TARIFF_BY_CODE[ovCode] : (res.best || {});
    const code = best.code || null;
    return {
      ...ln,
      description: desc,
      hs_code: code,
      hs_label_fr: best.fr || null,
      hs_label_ar: best.ar || null,
      hs_label_en: best.en || null,
      hs_category: best.category || null,
      duty: best.duty != null ? best.duty : 0,
      vat: best.vat != null ? best.vat : 20,
      tpi: best.tpi != null ? best.tpi : 0.25,
      sensitive: !!best.sensitive,
      priceBand: best.priceBand || null,
      confidence: manual ? 1 : res.confidence,
      needs_review: manual ? false : res.needsReview,
      classification_reason: manual ? "classement validé manuellement" : res.reason,
      manual_hs: manual,
      alternates: cands.filter((c) => c.code !== code),
    };
  });

  /* 2 — deterministic landed cost (CIF → duty → TPI → VAT → total) */
  const { lines, totals } = computeLanded(classified, {
    currency,
    incoterm,
    freight: header.freight_amount || 0,
    insurance: header.insurance_amount || 0,
  });

  /* 2b — attach the importer's own price history to each line (optional;
     injected by the caller so the engine stays decoupled from demo data).
     Lets the risk scorer flag undervaluation against THIS importer's
     baseline, not just a generic tariff band. NO numbers from the LLM. */
  const historyLookup = typeof meta.historyFor === "function" ? meta.historyFor : null;
  const importer = (header.buyer && header.buyer.name) || meta.importer || null;
  const withHistory = lines.map((ln) => {
    if (!historyLookup || !ln.hs_code || !(ln.unit_price_mad > 0)) return ln;
    const h = historyLookup(importer, ln.hs_code);
    if (!h || !(h.unit_mad > 0)) return ln;
    const ratio = ln.unit_price_mad / h.unit_mad;
    const status = ratio < 0.6 ? "low" : ratio < 0.85 ? "soft_low" : ratio > 1.6 ? "high" : "consistent";
    return {
      ...ln,
      history: {
        importer,
        baseline_mad: h.unit_mad,
        samples: h.samples,
        ratio: Math.round(ratio * 1000) / 1000,
        status,
        last_red_ref: h.last_red_ref || null,
        last_red_when: h.last_red_when || null,
      },
    };
  });

  /* 3 — risk circuit */
  const coo_present = meta.coo_present != null
    ? meta.coo_present
    : (Array.isArray(header.documents_present) && header.documents_present.includes("certificat_origine"));
  const origin_country = meta.origin_country
    || header.origin_country
    || (header.seller && header.seller.country)
    || null;
  const importer_known = meta.importer_known; // undefined in live mode = neutral

  const risk = assessRisk({ lines: withHistory, origin_country, coo_present, importer_known });

  return {
    header,
    currency,
    incoterm,
    lines: withHistory,
    totals,
    risk,
    coo_present,
    origin_country,
    importer_known, // surfaced so a client-side recompute keeps the same circuit basis
    documents_present: header.documents_present || [],
    source: meta.source || "live",
    note: "Données illustratives — démonstration (l'IA structure, le code calcule).",
  };
}

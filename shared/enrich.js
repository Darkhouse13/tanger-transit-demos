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

export function enrichDeclaration(extracted, meta = {}) {
  const header = extracted.header || {};
  const currency = header.currency || "MAD";
  const incoterm = header.incoterm || "";

  /* 1 — classify each line and attach the resolved tariff rates */
  const classified = (extracted.lines || []).map((ln) => {
    const desc = ln.raw_description || ln.description || "";
    const res = resolveHs(desc);
    const best = res.best || {};
    return {
      ...ln,
      description: desc,
      hs_code: best.code || null,
      hs_label_fr: best.fr || null,
      hs_label_ar: best.ar || null,
      hs_label_en: best.en || null,
      hs_category: best.category || null,
      duty: best.duty != null ? best.duty : 0,
      vat: best.vat != null ? best.vat : 20,
      tpi: best.tpi != null ? best.tpi : 0.25,
      sensitive: !!best.sensitive,
      priceBand: best.priceBand || null,
      confidence: res.confidence,
      needs_review: res.needsReview,
      classification_reason: res.reason,
      alternates: res.alternates || [],
    };
  });

  /* 2 — deterministic landed cost (CIF → duty → TPI → VAT → total) */
  const { lines, totals } = computeLanded(classified, {
    currency,
    incoterm,
    freight: header.freight_amount || 0,
    insurance: header.insurance_amount || 0,
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

  const risk = assessRisk({ lines, origin_country, coo_present, importer_known });

  return {
    header,
    currency,
    incoterm,
    lines,
    totals,
    risk,
    coo_present,
    origin_country,
    documents_present: header.documents_present || [],
    source: meta.source || "live",
    note: "Données illustratives — démonstration (l'IA structure, le code calcule).",
  };
}

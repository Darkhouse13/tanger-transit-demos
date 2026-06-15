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
import { predictBadr, remediationFor } from "./badr.js";
import { runPreflight } from "./checks.js";
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
    const adiiRow = (meta.hsResolved || {})[idx]; // {code, designation, droit, unite} from the ADII nomenclature
    const inGrid = !!(ovCode && TARIFF_BY_CODE[ovCode]);
    const isAdii = !!ovCode && !inGrid && !!adiiRow && String(adiiRow.code) === String(ovCode);
    const offGrid = !!ovCode && !inGrid && !isAdii; // typed code, unknown to grid AND nomenclature
    const manual = inGrid || isAdii || offGrid;
    const best = inGrid ? TARIFF_BY_CODE[ovCode] : (res.best || {});
    const code = (isAdii || offGrid) ? ovCode : (best.code || null);
    const adiiDuty = isAdii && adiiRow.droit != null ? adiiRow.droit : null;
    const rateUnconfirmed = offGrid || (isAdii && adiiDuty == null); // duty not authoritative → "à confirmer"
    return {
      ...ln,
      description: desc,
      hs_code: code,
      hs_label_fr: inGrid ? (best.fr || null) : isAdii ? (adiiRow.designation || null) : offGrid ? null : (best.fr || null),
      hs_label_ar: (isAdii || offGrid) ? null : (best.ar || null),
      hs_label_en: (isAdii || offGrid) ? null : (best.en || null),
      hs_category: (isAdii || offGrid) ? null : (best.category || null),
      /* in-grid → grid rate; ADII → its droit when known (else 0, flagged);
         off-grid → 0, flagged. With the full ADIL tariff every code resolves. */
      duty: inGrid ? (best.duty != null ? best.duty : 0) : isAdii ? (adiiDuty != null ? adiiDuty : 0) : offGrid ? 0 : (best.duty != null ? best.duty : 0),
      vat: best.vat != null ? best.vat : 20,
      tpi: best.tpi != null ? best.tpi : 0.25,
      sensitive: (isAdii || offGrid) ? false : !!best.sensitive,
      priceBand: (isAdii || offGrid) ? null : (best.priceBand || null),
      confidence: manual ? 1 : res.confidence,
      needs_review: rateUnconfirmed ? true : (manual ? false : res.needsReview),
      classification_reason: inGrid ? "classement validé manuellement"
        : isAdii ? `code ADII — ${adiiRow.designation || code}${adiiDuty == null ? " (droit à confirmer sur l'ADIL)" : ""}`
        : offGrid ? "code saisi manuellement — hors nomenclature (taux à confirmer sur l'ADIL)"
        : res.reason,
      manual_hs: manual,
      hs_off_grid: rateUnconfirmed,
      hs_source: inGrid ? "grid" : isAdii ? "adii" : offGrid ? "manual" : "auto",
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

  /* 3b — frame the circuit as a BADR PREDICTION (confidence + likelihood) and
     turn every risk flag into a concrete remediation action ("à faire"). Both
     are deterministic functions of the risk result — no LLM, no random. */
  const prediction = predictBadr(risk);
  const remediation = remediationFor(risk.flags);

  /* 4 — money at stake: for lines undervalued vs the importer's own history,
     quantify the under-declared customs value and the duty+VAT+TPI it would
     escape. Deterministic — the gap is run through the SAME landed engine
     (in MAD; baselines and goods values are already MAD). */
  const underLines = withHistory.filter((l) => l.history && l.history.status === "low");
  let undervaluation = null;
  if (underLines.length) {
    let declared = 0, reference = 0, gap = 0, taxesEluded = 0;
    for (const l of underLines) {
      const ref = (l.history.baseline_mad || 0) * (Number(l.quantity) || 0);
      const dec = l.goods_value_mad || 0;
      const g = Math.max(0, ref - dec);
      declared += dec; reference += ref; gap += g;
      taxesEluded += computeLanded(
        [{ line_total: g, duty: l.duty, vat: l.vat, tpi: l.tpi }],
        { currency: "MAD" }
      ).totals.taxes_total_mad;
    }
    undervaluation = {
      lines: underLines.length,
      declared_mad: declared,
      reference_mad: reference,
      gap_mad: gap,
      taxes_eluded_mad: taxesEluded,
    };
  }

  /* 5 — pre-flight input checks (arithmetic, duplicates, weight/amount swap,
     client HS mismatch, mandatory documents). Deterministic, separate from the
     risk circuit: "is the declaration correct & complete?" vs "how hard will
     customs look?". Runs on the enriched lines so it sees our HS code + totals. */
  const checks = runPreflight({
    header,
    lines: withHistory,
    documents_present: header.documents_present || [],
    coo_present,
  });

  return {
    header,
    currency,
    incoterm,
    flow: checks.flow,
    lines: withHistory,
    totals,
    risk,
    prediction,
    remediation,
    checks,
    undervaluation,
    coo_present,
    origin_country,
    importer_known, // surfaced so a client-side recompute keeps the same circuit basis
    documents_present: header.documents_present || [],
    source: meta.source || "live",
    note: "Données illustratives — démonstration (l'IA structure, le code calcule).",
  };
}

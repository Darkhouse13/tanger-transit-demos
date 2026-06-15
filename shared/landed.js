/* =====================================================================
   Strait Systems — deterministic landed-cost / duty engine.
   Pure, isomorphic. The LLM never computes a number; THIS does.

   Pipeline (order confirmed against an ADII worked example):
     to-MAD (fixed FX)
       → apportion freight + insurance across lines (by value, fallback weight)
       → CIF per line
       → duty   = CIF × dutyRate
       → TPI    = CIF × tpiRate            (parafiscal, ~0.25 %)
       → VAT    = (CIF + duty + TPI) × vatRate
       → landed = CIF + duty + TPI + VAT
       → roll up as the sum of r2-rounded line values (penny-consistent).

   Each line passed in MUST already carry duty/vat/tpi (from the resolved
   tariff row). Caller attaches them after classification.
   ===================================================================== */

import { r2, toMAD } from "./format.js";

/* Incoterm → which costs are already inside the invoice line value.
   DAP/DPU: the seller carries the goods to the named destination, so main
   carriage (freight) is already in the price — do NOT re-add it. Insurance is
   not obligatory under DAP/DPU, so it stays addable if separately invoiced. */
const INCLUDES_FREIGHT = new Set(["CIF", "CIP", "CFR", "CPT", "DAP", "DPU", "DDP"]);
const INCLUDES_INSURANCE = new Set(["CIF", "CIP", "DDP"]);

export function computeLanded(lines, opts = {}) {
  const currency = opts.currency || "MAD";
  const incoterm = (opts.incoterm || "").toUpperCase();
  const addFreight = !INCLUDES_FREIGHT.has(incoterm);
  const addInsurance = !INCLUDES_INSURANCE.has(incoterm);

  const freightMad = addFreight ? toMAD(opts.freight || 0, currency) : 0;
  const insuranceMad = addInsurance ? toMAD(opts.insurance || 0, currency) : 0;

  /* Step 0 — per-line goods value in MAD. */
  const prepared = lines.map((ln) => {
    const lineTotalSrc = ln.line_total != null
      ? ln.line_total
      : (ln.unit_price != null && ln.quantity != null ? ln.unit_price * ln.quantity : null);
    return {
      ...ln,
      _valueMad: lineTotalSrc != null ? toMAD(lineTotalSrc, currency) : 0,
      _weight: Number(ln.gross_weight_kg) || 0,
      _valueMissing: lineTotalSrc == null,
      line_total_src: lineTotalSrc,
    };
  });

  const totalValue = prepared.reduce((s, l) => s + l._valueMad, 0);
  const totalWeight = prepared.reduce((s, l) => s + l._weight, 0);
  const basis = totalValue > 0 ? "value" : (totalWeight > 0 ? "weight" : "equal");

  const out = prepared.map((ln) => {
    let share;
    if (basis === "value") share = totalValue > 0 ? ln._valueMad / totalValue : 0;
    else if (basis === "weight") share = totalWeight > 0 ? ln._weight / totalWeight : 0;
    else share = 1 / prepared.length;

    const freightShare = r2(freightMad * share);
    const insuranceShare = r2(insuranceMad * share);
    const cif = r2(ln._valueMad + freightShare + insuranceShare);

    const dutyRate = Number(ln.duty) || 0;
    const vatRate = Number(ln.vat) || 0;
    const tpiRate = Number(ln.tpi) || 0;

    const duty = r2(cif * dutyRate / 100);
    const tpi = r2(cif * tpiRate / 100);
    const vatBase = r2(cif + duty + tpi);
    const vat = r2(vatBase * vatRate / 100);
    const taxes = r2(duty + tpi + vat);
    const landed = r2(cif + taxes);

    const unitPriceMad = (ln.unit_price != null)
      ? toMAD(ln.unit_price, currency)
      : (ln.quantity ? r2(ln._valueMad / ln.quantity) : null);

    const { _valueMad, _weight, _valueMissing, ...clean } = ln;
    return {
      ...clean,
      goods_value_mad: _valueMad,
      unit_price_mad: unitPriceMad,
      freight_share_mad: freightShare,
      insurance_share_mad: insuranceShare,
      cif_mad: cif,
      duty_mad: duty,
      tpi_mad: tpi,
      vat_base_mad: vatBase,
      vat_mad: vat,
      taxes_total_mad: taxes,
      landed_cost_mad: landed,
      value_missing: _valueMissing,
    };
  });

  const sum = (k) => r2(out.reduce((s, l) => s + (l[k] || 0), 0));
  const totals = {
    currency,
    basis,
    goods_value_mad: sum("goods_value_mad"),
    freight_mad: freightMad,
    insurance_mad: insuranceMad,
    cif_mad: sum("cif_mad"),
    duty_mad: sum("duty_mad"),
    tpi_mad: sum("tpi_mad"),
    vat_mad: sum("vat_mad"),
    taxes_total_mad: sum("taxes_total_mad"),
    landed_cost_mad: sum("landed_cost_mad"),
  };

  return { lines: out, totals };
}

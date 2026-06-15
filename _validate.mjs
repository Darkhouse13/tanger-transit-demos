import { INVOICES } from "./data/invoices.js";
import { enrichDeclaration } from "./shared/enrich.js";
import { computeLanded } from "./shared/landed.js";
import { rankHs } from "./shared/classify.js";

let pass = true;

/* 1 — worked example, must match to the dirham */
const wk = computeLanded([
  { raw_description: "faisceaux", line_total: 8000, duty: 2.5, vat: 20, tpi: 0.25 },
  { raw_description: "t-shirts", line_total: 4000, duty: 40, vat: 20, tpi: 0.25 },
  { raw_description: "granulés PE", line_total: 8000, duty: 2.5, vat: 20, tpi: 0.25 },
], { currency: "EUR", incoterm: "FOB", freight: 1200, insurance: 150 });
const expect = { cif_mad: 231647.5, duty_mad: 23164.76, tpi_mad: 579.12, vat_mad: 51078.28, landed_cost_mad: 306469.66 };
const wkOk = Object.entries(expect).every(([k, v]) => Math.abs(wk.totals[k] - v) < 0.01);
if (!wkOk) pass = false;
console.log("WORKED EXAMPLE:", wkOk ? "OK" : "*** MISMATCH ***");
console.log("   got:", JSON.stringify({ cif: wk.totals.cif_mad, duty: wk.totals.duty_mad, tpi: wk.totals.tpi_mad, vat: wk.totals.vat_mad, landed: wk.totals.landed_cost_mad }));
console.log("   exp:", JSON.stringify({ cif: expect.cif_mad, duty: expect.duty_mad, tpi: expect.tpi_mad, vat: expect.vat_mad, landed: expect.landed_cost_mad }));

/* 2 — every sample invoice must land on its intended circuit */
console.log("\nINVOICES:");
for (const inv of INVOICES) {
  const d = enrichDeclaration(inv.extracted, inv.meta);
  const ok = d.risk.circuit === inv.meta.expected_circuit;
  if (!ok) pass = false;
  const codes = d.lines.map((l) => `${l.hs_code}@${Math.round((l.confidence || 0) * 100)}%`).join(", ");
  console.log(`  ${inv.id}: circuit=${d.risk.circuit} expected=${inv.meta.expected_circuit} ${ok ? "OK" : "*** MISMATCH ***"} (score ${d.risk.score})`);
  console.log(`      landed=${d.totals.landed_cost_mad} MAD · duty=${d.totals.duty_mad} · vat=${d.totals.vat_mad}`);
  console.log(`      HS: ${codes}`);
  console.log(`      flags: ${d.risk.flags.map((f) => f.code).join(", ") || "—"}`);

  /* BADR prediction must agree with the risk circuit, carry a sane confidence,
     and a normalised likelihood; every flag should yield an action (or none). */
  const p = d.prediction || {};
  const distSum = ["vert", "orange", "rouge"].reduce((a, c) => a + ((p.distribution || {})[c] || 0), 0);
  const predOk = p.predicted === d.risk.circuit
    && p.confidence > 0 && p.confidence <= 1
    && Math.abs(distSum - 1) < 0.05
    && (d.remediation || []).length <= d.risk.flags.length;
  if (!predOk) pass = false;
  console.log(`      BADR: predicted=${p.predicted} conf=${Math.round((p.confidence || 0) * 100)}% Σ=${distSum.toFixed(2)} todo=${(d.remediation || []).length} ${predOk ? "OK" : "*** PREDICTION MISMATCH ***"}`);
}

/* 3 — classifier sanity on a few free-text queries (demo 2) */
console.log("\nCLASSIFY:");
for (const q of ["tissu de coton imprimé", "قماش قطني", "faisceaux automobiles", "حذاء جلدي", "بن محمص", "articles divers xyz"]) {
  const r = rankHs(q, { topN: 1 });
  const c = r.candidates[0];
  console.log(`  "${q}" -> ${c ? c.code + " (" + Math.round(r.confidence * 100) + "%)" : "AUCUN (manuel)"}`);
}

console.log("\n" + (pass ? "ALL CHECKS PASSED" : "*** SOME CHECKS FAILED ***"));
process.exit(pass ? 0 : 1);

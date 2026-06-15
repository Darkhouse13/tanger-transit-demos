import { INVOICES } from "./data/invoices.js";
import { enrichDeclaration } from "./shared/enrich.js";
import { computeLanded } from "./shared/landed.js";
import { rankHs } from "./shared/classify.js";
import { runPreflight } from "./shared/checks.js";
import { SHIPMENTS, buildActionQueue } from "./data/shipments.js";
import { fxInfo } from "./shared/format.js";

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
  const ck = d.checks || { flow: "?", anomalies: [] };
  console.log(`      CHECKS: flow=${ck.flow} anomalies=[${ck.anomalies.map((a) => a.code).join(", ") || "—"}]`);
  /* The clean samples must NOT raise a weight/amount false positive even when a
     legitimate value happens to equal the weight (inv4: 18000 € = 18000 kg). */
  if (inv.id === "inv4" && ck.anomalies.some((a) => a.code === "WEIGHT_VALUE")) {
    pass = false; console.log("      *** inv4 WEIGHT_VALUE false positive ***");
  }
  /* inv7 is engineered to trip the pre-flight (qty, dup, total, client HS). */
  if (inv.id === "inv7") {
    const need = ["QTY_MISMATCH", "DUP_LINE", "TOTAL_MISMATCH", "HS_CLIENT_MISMATCH"];
    const got = new Set(ck.anomalies.map((a) => a.code));
    const ok = need.every((c) => got.has(c));
    if (!ok) pass = false;
    console.log(`      inv7 pre-flight: ${need.filter((c) => got.has(c)).join(", ")} ${ok ? "OK" : "*** MISSING " + need.filter((c) => !got.has(c)).join(", ") + " ***"}`);
  }
}

/* 2b — incoterm cost inclusion (DAP/DPU must NOT re-add freight; EXW must) */
console.log("\nINCOTERMS:");
for (const [inco, expCif] of [["DAP", 1000], ["DPU", 1000], ["DDP", 1000], ["EXW", 1500], ["FOB", 1500], ["CFR", 1000]]) {
  const r = computeLanded([{ line_total: 1000, duty: 0, vat: 20, tpi: 0.25 }], { currency: "MAD", incoterm: inco, freight: 500, insurance: 0 });
  const ok = Math.abs(r.totals.cif_mad - expCif) < 0.01;
  if (!ok) pass = false;
  console.log(`  ${inco}: CIF=${r.totals.cif_mad} expected=${expCif} ${ok ? "OK" : "*** MISMATCH ***"}`);
}

/* 2c — pre-flight checks fire on crafted bad input */
console.log("\nPRE-FLIGHT:");
const pf = runPreflight({
  header: { buyer: { country: "MA" }, seller: { country: "FR" }, total_amount: 16800 },
  documents_present: ["facture"], // colisage + bad missing
  lines: [
    { description: "Faisceaux", quantity: 300, unit_price: 25, line_total_src: 7500, gross_weight_kg: 900, hs_code: "8544300000", declared_hs: "8473309000" },
    { description: "Roulements", quantity: 200, unit_price: 9, line_total_src: 2700, gross_weight_kg: 500, hs_code: "8482100000" },
    { description: "Faisceaux", quantity: 300, unit_price: 25, line_total_src: 7500, gross_weight_kg: 900, hs_code: "8544300000" },
    { description: "Sacs PE", quantity: 100, unit_price: 50, line_total_src: 2000, gross_weight_kg: 2000, hs_code: "3923210000" }, // weight swapped into amount
  ],
});
const codes = new Set(pf.anomalies.map((a) => a.code));
const wantPf = ["QTY_MISMATCH", "DUP_LINE", "TOTAL_MISMATCH", "HS_CLIENT_MISMATCH", "WEIGHT_VALUE", "DOC_MISSING"];
const pfOk = pf.flow === "import" && wantPf.every((c) => codes.has(c));
if (!pfOk) pass = false;
console.log(`  flow=${pf.flow} fired=[${[...codes].join(", ")}] ${pfOk ? "OK" : "*** MISSING " + wantPf.filter((c) => !codes.has(c)).join(", ") + " ***"}`);

/* 2d — board action queue: non-empty, sorted most-urgent first, alert on top */
console.log("\nACTION QUEUE:");
const q = buildActionQueue(SHIPMENTS.map((s) => ({ ...s })));
const sortedOk = q.every((a, i) => i === 0 || q[i - 1].priority >= a.priority);
const qOk = q.length > 0 && sortedOk && q[0].severity === "alert";
if (!qOk) pass = false;
for (const a of q.slice(0, 4)) console.log(`  ${a.ref}: [${a.severity}] ${a.title} — ${a.detail}`);
console.log(`  total=${q.length} sorted=${sortedOk} top=${q[0] ? q[0].severity : "—"} ${qOk ? "OK" : "*** ACTION QUEUE ISSUE ***"}`);

/* 2e — official FX rate carries a rate + effective date + ADII source */
const fi = fxInfo("EUR");
const fxOk = fi.rate === 10.85 && !!fi.date && /ADII/.test(fi.source);
if (!fxOk) pass = false;
console.log(`\nFX: 1 EUR = ${fi.rate} MAD · cours du ${fi.date} · ${fi.source} ${fxOk ? "OK" : "*** FX ISSUE ***"}`);

/* 3 — classifier sanity on a few free-text queries (demo 2) */
console.log("\nCLASSIFY:");
for (const q of ["tissu de coton imprimé", "قماش قطني", "faisceaux automobiles", "حذاء جلدي", "بن محمص", "articles divers xyz"]) {
  const r = rankHs(q, { topN: 1 });
  const c = r.candidates[0];
  console.log(`  "${q}" -> ${c ? c.code + " (" + Math.round(r.confidence * 100) + "%)" : "AUCUN (manuel)"}`);
}

console.log("\n" + (pass ? "ALL CHECKS PASSED" : "*** SOME CHECKS FAILED ***"));
process.exit(pass ? 0 : 1);

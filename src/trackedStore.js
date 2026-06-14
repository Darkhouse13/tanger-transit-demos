/* =====================================================================
   Strait Systems — tiny cross-demo store.
   Lets the Déclarant (demo 1) push a finished declaration onto the live
   board (demo 3), so the three demos read as ONE system: Préparer →
   Chiffrer → Suivre. Module-level (survives tab switches, since demos
   unmount) and dependency-free.
   ===================================================================== */

import { REF_DATE } from "../data/shipments.js";

let dossiers = [];
const subs = new Set();

export function addTracked(d) {
  dossiers = [d, ...dossiers.filter((x) => x.ref !== d.ref)]; // newest first, dedup by ref
  subs.forEach((fn) => fn(dossiers));
}
export function getTracked() { return dossiers; }
export function subscribeTracked(fn) { subs.add(fn); return () => subs.delete(fn); }

function addDays(iso, n) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/* Shape a finished declaration into a board dossier (same fields as the
   synthetic shipments, so the board renders it with no special-casing). */
export function dossierFromDecl(decl) {
  const header = decl.header || {};
  const buyer = header.buyer || {};
  const seller = header.seller || {};
  const l0 = (decl.lines || [])[0] || {};
  const freeTimeDays = 5;
  const ref = "DUM-2026-" + String(1000 + Math.floor((decl.totals.landed_cost_mad % 9000))).padStart(5, "0");
  return {
    id: "t-" + ref,
    ref,
    importer: buyer.name || "Importateur",
    supplier: seller.name || "—",
    origin: decl.origin_country || "—",
    goods: l0.hs_label_fr || l0.description || "—",
    hsCode: l0.hs_code || "—",
    mode: "mer",
    circuit: decl.risk.circuit,
    status: decl.risk.circuit === "rouge" ? "inspection" : "sous_douane",
    eta: REF_DATE,
    arrivedAt: REF_DATE,
    freeTimeDays,
    freeTimeEndsAt: addDays(REF_DATE, freeTimeDays),
    dailySurestarie: 700,
    declaredValueMad: Math.round(decl.totals.goods_value_mad || decl.totals.cif_mad || 0),
    riskFlags: (decl.risk.flags || []).map((f) => f.message),
    undervaluation: decl.undervaluation || null,
    tracked: true,
  };
}

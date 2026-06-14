/* =====================================================================
   Strait Systems — synthetic per-importer declaration history.
   ⚠️ Fictional. Stands in for the broker's own past DUMs in BADR.

   The point: undervaluation is far more convincing when measured against
   *this importer's own* typical declared unit value than against a generic
   tariff band. Same deterministic principle — the LLM never sees this; the
   risk engine compares the extracted unit price (MAD) to the baseline below.

   Baselines are in MAD/unit (matching landed.js `unit_price_mad`), with a
   sample count and, where relevant, the reference of a past dossier that was
   pulled to the red circuit for the same goods.
   ===================================================================== */

const norm = (s) =>
  (s == null ? "" : String(s)).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

const HISTORY = [
  {
    match: ["atlas mobile"],
    byHs: {
      // smartphones — flagrantly undervalued in inv3 (≈109 MAD/u live)
      "8517120000": { unit_mad: 3200, samples: 4, last_red_ref: "DUM-2026-00121", last_red_when: "mars 2026" },
    },
  },
  {
    match: ["detroit auto"],
    byHs: {
      "8544300000": { unit_mad: 265, samples: 6 }, // faisceaux de câblage
      "8421230000": { unit_mad: 90, samples: 6 },  // filtres à huile
      "8482100000": { unit_mad: 92, samples: 5 },  // roulements à billes
      "4011100000": { unit_mad: 310, samples: 5 }, // pneumatiques
    },
  },
  {
    match: ["medina textile"],
    byHs: {
      "6109100012": { unit_mad: 39, samples: 8 },  // t-shirts coton
      "6204430090": { unit_mad: 200, samples: 8 }, // robes synthétiques
      "5208520000": { unit_mad: 45, samples: 8 },  // tissu coton imprimé
    },
  },
];

/* Returns { unit_mad, samples, last_red_ref?, last_red_when? } or null. */
export function historyFor(importer, hsCode) {
  if (!importer || !hsCode) return null;
  const n = norm(importer);
  const entry = HISTORY.find((h) => h.match.some((m) => n.includes(m)));
  return (entry && entry.byHs[hsCode]) || null;
}

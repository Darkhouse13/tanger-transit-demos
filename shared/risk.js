/* =====================================================================
   Strait Systems — deterministic, explainable risk-circuit scorer.
   Pure, isomorphic. Outputs Vert / Orange / Rouge + human-readable flags.
   Transparent by design: "Rouge parce que X, Y" — no black box.

   Expects an enriched declaration:
     { lines: [ enrichedLine ], origin_country, coo_present, importer_known }
   where each enrichedLine carries (from classify + landed):
     description, confidence, sensitive, priceBand, duty,
     unit_price_mad, value_missing, line_total_src
   ===================================================================== */

/* Countries whose origin claims a preferential tariff → a certificate of
   origin (EUR.1 / declaration of origin) is expected to justify the reduced duty. */
const PREFERENTIAL = new Set([
  "FR", "ES", "IT", "DE", "NL", "BE", "PT", "GB", "UK", // EU + UK
  "TR", "US", "EG", "JO", "TN", "AE",                    // FTA partners
]);

const SEV = { high: 3, medium: 2, low: 1 };

/* flags whose presence forces at least a Rouge circuit regardless of total score */
const RED_FORCING = new Set(["UNDERVALUE", "HIST_UNDERVALUE", "NO_COO", "NO_VALUE", "LOW_CONF"]);

export function assessRisk(decl) {
  const lines = decl.lines || [];
  let score = 0;
  const flags = [];
  const add = (pts, severity, code, message) => { score += pts; flags.push({ code, severity, message }); };

  for (const ln of lines) {
    const desc = ln.description || ln.raw_description || "ligne";

    /* L1 — classification confidence */
    if (ln.confidence != null) {
      if (ln.confidence < 0.30)
        add(25, "high", "LOW_CONF", `Classement incertain : « ${desc} » (confiance ${Math.round(ln.confidence * 100)} %)`);
      else if (ln.confidence < 0.45)
        add(12, "medium", "MED_CONF", `Classement à vérifier : « ${desc} » (confiance ${Math.round(ln.confidence * 100)} %)`);
    }

    /* L2 — declared unit price vs expected value.
       Prefer the importer's OWN history when available (far more telling than
       a generic band); otherwise fall back to the tariff price band. */
    const up = ln.unit_price_mad;
    const h = ln.history;
    if (h && up != null && up > 0) {
      const base = Math.round(h.baseline_mad);
      const pct = Math.round((up / h.baseline_mad - 1) * 100);
      if (h.status === "low") {
        const redNote = h.last_red_ref
          ? ` — profil déjà passé en rouge (${h.last_red_ref}${h.last_red_when ? ", " + h.last_red_when : ""})`
          : "";
        add(32, "high", "HIST_UNDERVALUE",
          `Sous-évaluation vs historique : ${h.importer} déclare ce produit à ~${base} MAD/u (${h.samples} dossiers) ; ici ${Math.round(up)} MAD/u (${pct} %)${redNote}`);
      } else if (h.status === "soft_low") {
        add(16, "medium", "HIST_LOW",
          `Valeur sous l'historique de l'importateur : ~${base} MAD/u sur ${h.samples} dossiers, ici ${Math.round(up)} MAD/u (${pct} %) (« ${desc} »)`);
      }
    } else {
      const band = ln.priceBand;
      if (band && up != null && up > 0) {
        const [lo, hi] = band;
        if (up < 0.5 * lo)
          add(30, "high", "UNDERVALUE", `Valeur anormalement basse : ${Math.round(up)} MAD/u vs ${lo}–${hi} attendu (« ${desc} »)`);
        else if (up < 0.8 * lo)
          add(15, "medium", "LOW_VALUE", `Valeur basse : ${Math.round(up)} MAD/u vs ${lo}–${hi} attendu (« ${desc} »)`);
        else if (up > 1.5 * hi)
          add(10, "medium", "HIGH_VALUE", `Valeur élevée — vérifier la facture (« ${desc} »)`);
      }
    }

    /* L3 — sensitive / controlled goods */
    if (ln.sensitive) add(8, "low", "SENSITIVE", `Marchandise sensible / surveillée (« ${desc} »)`);

    /* L4 — line declared without a value */
    if (ln.value_missing) add(20, "high", "NO_VALUE", `Ligne sans valeur déclarée (« ${desc} »)`);
  }

  /* D1 — preferential origin without a certificate of origin */
  const origin = (decl.origin_country || "").toUpperCase();
  if (origin && PREFERENTIAL.has(origin) && decl.coo_present === false) {
    add(22, "high", "NO_COO",
      `Origine préférentielle (${origin}) sans certificat d'origine — droit préférentiel non justifié`);
  }

  /* D2 — every line a round thousand (forfait valuation smell) */
  const roundCount = lines.filter((l) => l.line_total_src != null && Number(l.line_total_src) % 1000 === 0).length;
  if (lines.length > 1 && roundCount === lines.length)
    add(6, "low", "ROUND", "Montants tous ronds — valorisation forfaitaire possible");

  /* D3 — importer history */
  if (decl.importer_known === false) add(8, "medium", "NEW_IMPORTER", "Importateur non connu — premier dossier");
  else if (decl.importer_known === true) score = Math.max(0, score - 5);

  score = Math.max(0, score);
  const banded = score >= 30 ? "rouge" : score >= 12 ? "orange" : "vert";
  const forced = flags.some((f) => RED_FORCING.has(f.code));
  const circuit = forced ? "rouge" : banded;

  flags.sort((a, b) => (SEV[b.severity] || 0) - (SEV[a.severity] || 0));

  return { circuit, score: Math.round(score), flags };
}

export const CIRCUIT_LABEL = {
  vert: { fr: "Circuit vert", ar: "المسار الأخضر", hint: "Mainlevée automatique attendue" },
  orange: { fr: "Circuit orange", ar: "المسار البرتقالي", hint: "Contrôle documentaire probable" },
  rouge: { fr: "Circuit rouge", ar: "المسار الأحمر", hint: "Visite physique probable" },
};

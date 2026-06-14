/* =====================================================================
   Strait Systems — formatting + FX helpers.
   Pure, isomorphic (runs in the browser AND in Node).
   ALL monetary figures in these demos are ILLUSTRATIVE SYNTHETIC DATA.
   ===================================================================== */

/* Round to 2 decimals (same discipline as the Cours pricing engine). */
export const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/* fr-FR number formatting. */
export const fmt = (n, d = 2) =>
  (Number(n) || 0).toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });

export const fmtInt = (n) => Math.round(Number(n) || 0).toLocaleString("fr-FR");

/* ---- Fixed demo FX table → MAD. Frozen for reproducibility. ---- */
export const FX_TO_MAD = { MAD: 1, EUR: 10.85, USD: 9.95, CNY: 1.38, GBP: 12.6, TRY: 0.30 };
export const FX_NOTE = "Taux de change figés — données de démonstration.";

export const toMAD = (amount, currency) => {
  const rate = FX_TO_MAD[currency] != null ? FX_TO_MAD[currency] : 1;
  return r2((Number(amount) || 0) * rate);
};

/* Currency-aware money string (suffix style, e.g. "1 234,56 MAD"). */
const SYMBOL = { MAD: "MAD", EUR: "€", USD: "$", CNY: "¥", GBP: "£", TRY: "₺" };
export const money = (n, cur = "MAD") => fmt(n) + " " + (SYMBOL[cur] || cur);
export const mad = (n) => fmt(n) + " MAD";

/* =====================================================================
   Strait Systems — simulated clearance board (demo 3 "Tableau de bord").
   ⚠️ Fictional shipments. No LLM. Dates anchored to REF_DATE so the board
   looks identical every run (stable for a live demo).

   circuit: vert | orange | rouge   (≈ 60/25/15 spread)
   status:  en_route | arrivé | sous_douane | inspection | dédouané | livré
   ===================================================================== */

export const REF_DATE = "2026-06-13"; // "today" for the demo

export const SHIPMENTS = [
  { id: "s1", ref: "DUM-2026-00148", importer: "Détroit Auto Maroc", supplier: "Garonne Components", origin: "FR",
    goods: "Faisceaux de câblage automobile", hsCode: "8544300000", mode: "mer", circuit: "vert", status: "livré",
    eta: "2026-06-08", arrivedAt: "2026-06-08", freeTimeDays: 7, freeTimeEndsAt: "2026-06-15",
    dailySurestarie: 600, declaredValueMad: 178000, riskFlags: [] },

  { id: "s2", ref: "DUM-2026-00151", importer: "Médina Textile", supplier: "Bursa Tekstil", origin: "TR",
    goods: "T-shirts coton & robes synthétiques", hsCode: "6109100012", mode: "mer", circuit: "orange", status: "sous_douane",
    eta: "2026-06-09", arrivedAt: "2026-06-09", freeTimeDays: 5, freeTimeEndsAt: "2026-06-14",
    dailySurestarie: 700, declaredValueMad: 597000, riskFlags: ["Contrôle documentaire — certificat A.TR à valider"] },

  { id: "s3", ref: "DUM-2026-00153", importer: "Atlas Mobile Distribution", supplier: "Shenzhen Sourcing", origin: "CN",
    goods: "Téléphones mobiles (smartphones)", hsCode: "8517120000", mode: "air", circuit: "rouge", status: "inspection",
    eta: "2026-06-11", arrivedAt: "2026-06-11", freeTimeDays: 3, freeTimeEndsAt: "2026-06-14",
    dailySurestarie: 1200, declaredValueMad: 219000, riskFlags: ["Valeur sous-évaluée — visite physique en cours"] },

  { id: "s4", ref: "DUM-2026-00155", importer: "Rif Bâti Distribution", supplier: "Valencia Cerámica", origin: "ES",
    goods: "Carreaux en céramique émaillée", hsCode: "6907210000", mode: "mer", circuit: "rouge", status: "sous_douane",
    eta: "2026-06-08", arrivedAt: "2026-06-08", freeTimeDays: 3, freeTimeEndsAt: "2026-06-11",
    dailySurestarie: 900, declaredValueMad: 195000, riskFlags: ["Certificat d'origine manquant", "Surestaries en cours"] },

  { id: "s5", ref: "DUM-2026-00156", importer: "Maghreb Précision", supplier: "Garonne Components", origin: "FR",
    goods: "Roulements à billes", hsCode: "8482100000", mode: "route", circuit: "vert", status: "dédouané",
    eta: "2026-06-12", arrivedAt: "2026-06-12", freeTimeDays: 7, freeTimeEndsAt: "2026-06-19",
    dailySurestarie: 500, declaredValueMad: 84000, riskFlags: [] },

  { id: "s6", ref: "DUM-2026-00159", importer: "Détroit Auto Maroc", supplier: "Anatolia Rubber", origin: "TR",
    goods: "Pneumatiques neufs voitures", hsCode: "4011100000", mode: "mer", circuit: "vert", status: "en_route",
    eta: "2026-06-18", arrivedAt: null, freeTimeDays: 7, freeTimeEndsAt: null,
    dailySurestarie: 600, declaredValueMad: 320000, riskFlags: [] },

  { id: "s7", ref: "DUM-2026-00161", importer: "Médina Textile", supplier: "Porto Linens", origin: "PT",
    goods: "Linge de lit en coton", hsCode: "6302310000", mode: "mer", circuit: "vert", status: "en_route",
    eta: "2026-06-20", arrivedAt: null, freeTimeDays: 7, freeTimeEndsAt: null,
    dailySurestarie: 600, declaredValueMad: 150000, riskFlags: [] },

  { id: "s8", ref: "DUM-2026-00162", importer: "Atlantic Foods", supplier: "Santos Café", origin: "BR",
    goods: "Café torréfié en grains", hsCode: "0901210000", mode: "mer", circuit: "orange", status: "arrivé",
    eta: "2026-06-12", arrivedAt: "2026-06-12", freeTimeDays: 5, freeTimeEndsAt: "2026-06-17",
    dailySurestarie: 800, declaredValueMad: 96000, riskFlags: ["Marchandise sensible — échantillon ONSSA"] },

  { id: "s9", ref: "DUM-2026-00164", importer: "Atlas Mobile Distribution", supplier: "Shenzhen Powertech", origin: "CN",
    goods: "Chargeurs / alimentations", hsCode: "8504401000", mode: "air", circuit: "vert", status: "dédouané",
    eta: "2026-06-11", arrivedAt: "2026-06-11", freeTimeDays: 7, freeTimeEndsAt: "2026-06-18",
    dailySurestarie: 1000, declaredValueMad: 47000, riskFlags: [] },

  { id: "s10", ref: "DUM-2026-00166", importer: "Rif Bâti Distribution", supplier: "Lombardia Pumps", origin: "IT",
    goods: "Pompes pour liquides", hsCode: "8413810000", mode: "mer", circuit: "vert", status: "livré",
    eta: "2026-06-06", arrivedAt: "2026-06-06", freeTimeDays: 7, freeTimeEndsAt: "2026-06-13",
    dailySurestarie: 700, declaredValueMad: 210000, riskFlags: [] },
];

/* Days between two ISO dates (b - a), integer. */
function daysBetween(aISO, bISO) {
  const a = new Date(aISO + "T00:00:00Z").getTime();
  const b = new Date(bISO + "T00:00:00Z").getTime();
  return Math.round((b - a) / 86400000);
}

/* Free-time / surestarie status relative to a reference date (default REF_DATE). */
export function surestarieFor(s, refISO = REF_DATE) {
  if (!s.freeTimeEndsAt) return { state: "n/a", daysLeft: null, overdueDays: 0, amount: 0 };
  const delta = daysBetween(refISO, s.freeTimeEndsAt); // >0 = days remaining, <0 = overdue
  if (delta < 0) {
    const overdueDays = -delta;
    return { state: "overdue", daysLeft: 0, overdueDays, amount: overdueDays * (s.dailySurestarie || 0) };
  }
  return { state: delta <= 1 ? "soon" : "ok", daysLeft: delta, overdueDays: 0, amount: 0 };
}

export const STATUS_STEPS = ["en_route", "arrivé", "sous_douane", "inspection", "dédouané", "livré"];
/* The canonical clearance timeline (inspection only shown on rouge). */
export const TIMELINE = [
  { key: "arrivee", fr: "Arrivée navire", ar: "وصول الباخرة" },
  { key: "dum", fr: "Dépôt DUM (BADR)", ar: "إيداع التصريح" },
  { key: "visite", fr: "Visite / contrôle douane", ar: "المعاينة الجمركية" },
  { key: "bae", fr: "Mainlevée (BAE)", ar: "رفع اليد" },
  { key: "livraison", fr: "Livraison", ar: "التسليم" },
];

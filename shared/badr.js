/* =====================================================================
   Strait Systems — BADR prediction + remediation (deterministic).
   Pure, isomorphic. Two jobs, both built ON TOP of assessRisk():

     1. predictBadr(risk)   → what BADR is LIKELY to assign (circuit +
        confidence + per-circuit likelihood). A PREDICTION, not a verdict —
        BADR has no public API, so the declarant still confirms/corrects it.

     2. remediationFor(flags) → the concrete "à faire" : for every risk
        signal, the action that actually lifts it (justify the value, attach
        the certificate, validate the HS code…).

   No black box, no LLM, no random: same declaration → same prediction.
   ===================================================================== */

import { CIRCUIT_LABEL } from "./risk.js";

/* Score boundaries mirror assessRisk(): rouge ≥ 30, orange ≥ 12, vert < 12.
   A red-FORCING flag overrides the soft score and pins the prediction rouge. */
const RED_FORCING = new Set(["UNDERVALUE", "HIST_UNDERVALUE", "NO_COO", "NO_VALUE", "LOW_CONF"]);
const ORDER = ["vert", "orange", "rouge"];
const r2 = (x) => Math.round(x * 100) / 100;
const sigmoid = (x) => 1 / (1 + Math.exp(-x));

/* Turn the risk result into a BADR forecast. The likelihood spread is a smooth
   reading of how far the score sits from the 12 / 30 boundaries (softness k),
   so "score 42 → well past the rouge threshold" reads as high confidence and
   "score 13 → just over orange" reads as a coin-flip. The predicted circuit is
   always assessRisk()'s circuit — the spread only quantifies the confidence. */
export function predictBadr(risk = {}) {
  const score = risk.score || 0;
  const circuit = risk.circuit || "vert";
  const forced = (risk.flags || []).some((f) => RED_FORCING.has(f.code));

  const k = 5; // softness around the boundaries
  const pAboveOrange = sigmoid((score - 12) / k);
  const pAboveRouge = sigmoid((score - 30) / k);
  const dist = {
    vert: 1 - pAboveOrange,
    orange: Math.max(0, pAboveOrange - pAboveRouge),
    rouge: pAboveRouge,
  };
  if (forced) {
    // a forcing flag (e.g. undervaluation, missing C/O) trumps the soft score
    dist.vert *= 0.15;
    dist.orange *= 0.4;
    dist.rouge = Math.max(dist.rouge, 0.8);
  }
  // keep the predicted circuit the visible maximum, then normalise to 1
  const top = Math.max(dist.vert, dist.orange, dist.rouge);
  if (dist[circuit] < top) dist[circuit] = top;
  const sum = ORDER.reduce((a, c) => a + dist[c], 0) || 1;
  for (const c of ORDER) dist[c] = dist[c] / sum;

  return {
    predicted: circuit,
    confidence: r2(dist[circuit]),
    distribution: { vert: r2(dist.vert), orange: r2(dist.orange), rouge: r2(dist.rouge) },
    forced,
    hint: (CIRCUIT_LABEL[circuit] || {}).hint || "",
  };
}

/* For each risk flag, the action that resolves it. Keyed by flag code so it
   stays in lock-step with assessRisk(); FR + AR so the remediation list is
   bilingual like the rest of the declaration. */
export const REMEDIATION = {
  HIST_UNDERVALUE: {
    severity: "high",
    fr: "Sous-évaluation vs historique : justifier le prix (facture proforma, contrat, preuve de paiement bancaire) ou aligner la valeur déclarée sur le prix de transaction réel avant dépôt.",
    ar: "قيمة أقل من السجلّ: تبرير السعر (فاتورة أولية، عقد، إثبات الدفع البنكي) أو مطابقة القيمة المصرّح بها مع سعر الصفقة الحقيقي قبل الإيداع.",
  },
  UNDERVALUE: {
    severity: "high",
    fr: "Valeur anormalement basse : documenter le prix réel (proforma / contrat) ou corriger la valeur en douane — sinon la douane retiendra sa propre valeur.",
    ar: "قيمة منخفضة بشكل غير اعتيادي: توثيق السعر الحقيقي (فاتورة أولية / عقد) أو تصحيح القيمة الجمركية — وإلا اعتمدت الجمارك قيمتها الخاصة.",
  },
  NO_COO: {
    severity: "high",
    fr: "Origine préférentielle sans certificat : obtenir et joindre le certificat d'origine (EUR.1 / A.TR) avant dépôt, sinon déclarer au droit de droit commun.",
    ar: "منشأ تفضيلي بدون شهادة: الحصول على شهادة المنشأ (EUR.1 / A.TR) وإرفاقها قبل الإيداع، وإلا التصريح بالرسم العادي.",
  },
  NO_VALUE: {
    severity: "high",
    fr: "Ligne sans valeur déclarée : renseigner le prix unitaire et le montant de la ligne — obligatoire pour liquider la DUM.",
    ar: "بند بدون قيمة مصرّح بها: إدخال السعر الوحدوي ومبلغ البند — إلزامي لتصفية التصريح.",
  },
  LOW_CONF: {
    severity: "high",
    fr: "Classement SH incertain : vérifier et valider le code SH à 10 chiffres sur l'ADIL (reclasser ci-dessus si besoin) avant dépôt.",
    ar: "تصنيف SH غير مؤكّد: التحقّق من رمز SH (10 أرقام) والمصادقة عليه على ADIL (إعادة التصنيف أعلاه عند الحاجة) قبل الإيداع.",
  },
  MED_CONF: {
    severity: "medium",
    fr: "Classement SH à vérifier : confirmer le code SH à 10 chiffres (reclasser ci-dessus si une alternative correspond mieux).",
    ar: "تصنيف SH للمراجعة: تأكيد رمز SH (10 أرقام) (إعادة التصنيف أعلاه إن كان بديل أنسب).",
  },
  HIST_LOW: {
    severity: "medium",
    fr: "Valeur sous l'historique de l'importateur : préparer un justificatif de prix au cas où la douane conteste la valeur.",
    ar: "قيمة أقل من سجلّ المستورد: تجهيز مبرّر للسعر تحسّبًا لاعتراض الجمارك على القيمة.",
  },
  LOW_VALUE: {
    severity: "medium",
    fr: "Valeur basse vs la fourchette attendue : confirmer le prix réel et tenir un justificatif prêt.",
    ar: "قيمة منخفضة مقارنة بالمجال المتوقّع: تأكيد السعر الحقيقي وإبقاء مبرّر جاهزًا.",
  },
  HIGH_VALUE: {
    severity: "medium",
    fr: "Valeur élevée : vérifier la facture et les frais (fret / assurance) inclus dans la valeur CIF.",
    ar: "قيمة مرتفعة: التحقّق من الفاتورة والمصاريف (الشحن / التأمين) المُدرَجة في قيمة CIF.",
  },
  SENSITIVE: {
    severity: "low",
    fr: "Marchandise sensible / surveillée : préparer les autorisations ou licences requises (ex. ONSSA) et anticiper un contrôle.",
    ar: "بضاعة حسّاسة / خاضعة للمراقبة: تجهيز التراخيص أو الأذونات المطلوبة (مثل ONSSA) وتوقّع المعاينة.",
  },
  NEW_IMPORTER: {
    severity: "medium",
    fr: "Premier dossier de l'importateur : constituer un dossier complet (contrat, paiement, fiche société) — profil non encore connu de la douane.",
    ar: "أول ملف للمستورد: تكوين ملف كامل (عقد، دفع، بطاقة الشركة) — الملف غير معروف بعد لدى الجمارك.",
  },
  ROUND: {
    severity: "low",
    fr: "Montants tous ronds : confirmer qu'il s'agit de prix réels et non d'une valorisation forfaitaire.",
    ar: "مبالغ كلّها مدوّرة: تأكيد أنّها أسعار حقيقية وليست تقديرًا جزافيًا.",
  },
};

const SEV = { high: 3, medium: 2, low: 1 };

/* Ordered, de-duplicated remediation list for a set of risk flags — the
   "what needs to be done". Highest-severity action first. */
export function remediationFor(flags = []) {
  const seen = new Set();
  const out = [];
  for (const f of flags) {
    const r = REMEDIATION[f.code];
    if (!r || seen.has(f.code)) continue;
    seen.add(f.code);
    out.push({ code: f.code, severity: r.severity || f.severity || "low", fr: r.fr, ar: r.ar });
  }
  out.sort((a, b) => (SEV[b.severity] || 0) - (SEV[a.severity] || 0));
  return out;
}

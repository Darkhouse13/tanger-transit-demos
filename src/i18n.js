/* Chrome + demo-2 strings (FR primary, AR for full RTL showcase). */
export const DIR = { fr: "ltr", ar: "rtl" };

const STRINGS = {
  fr: {
    brand_tagline: "l'IA structure, le code calcule",
    nav_declarant: "Déclarant",
    nav_calc: "Calculatrice",
    nav_board: "Tableau de bord",
    sub_declarant: "De la facture à la DUM",
    sub_calc: "Code SH & droits",
    sub_board: "Suivi du dédouanement",
    footer: "Démonstration — données synthétiques · Strait Systems",
    demo_note: "Données illustratives — démonstration (tarifs non contractuels).",
    // calculatrice
    calc_title: "Code SH & calcul des droits",
    calc_lede: "Décrivez la marchandise (français ou arabe). Le moteur propose le code SH à 10 chiffres et calcule droits, TVA et coût de revient — instantanément, par du code.",
    calc_placeholder: "ex. tissu de coton imprimé, faisceaux automobiles, قماش قطني…",
    calc_value: "Valeur en douane",
    calc_currency: "Devise",
    calc_btn: "Classer",
    calc_candidates: "Codes SH proposés",
    calc_confidence: "confiance",
    calc_duty: "Droit",
    calc_vat: "TVA",
    calc_tpi: "TPI",
    calc_landed: "Coût de revient",
    calc_review: "à vérifier",
    calc_empty: "Aucune correspondance — classement manuel requis.",
  },
  ar: {
    brand_tagline: "الذكاء الاصطناعي ينظّم، والشيفرة تحسب",
    nav_declarant: "التصريح",
    nav_calc: "حاسبة الرسوم",
    nav_board: "لوحة القيادة",
    sub_declarant: "من الفاتورة إلى التصريح المفصّل",
    sub_calc: "رمز النظام المنسّق والرسوم",
    sub_board: "تتبّع التخليص الجمركي",
    footer: "عرض توضيحي — بيانات تركيبية · Strait Systems",
    demo_note: "بيانات توضيحية — عرض تجريبي (تعريفات غير تعاقدية).",
    calc_title: "رمز النظام المنسّق وحساب الرسوم",
    calc_lede: "صف البضاعة (بالفرنسية أو العربية). يقترح المحرّك رمز النظام المنسّق المكوّن من 10 أرقام ويحسب الرسوم والضريبة وكلفة الاستيراد — فوريًا، عبر الشيفرة.",
    calc_placeholder: "مثال: قماش قطني، أحذية جلدية، ضفائر أسلاك…",
    calc_value: "القيمة الجمركية",
    calc_currency: "العملة",
    calc_btn: "تصنيف",
    calc_candidates: "رموز النظام المنسّق المقترحة",
    calc_confidence: "ثقة",
    calc_duty: "رسوم",
    calc_vat: "ض.ق.م",
    calc_tpi: "TPI",
    calc_landed: "كلفة الاستيراد",
    calc_review: "للمراجعة",
    calc_empty: "لا تطابق — يلزم تصنيف يدوي.",
  },
};

export function t(locale, key) {
  const l = STRINGS[locale] || STRINGS.fr;
  return l[key] != null ? l[key] : (STRINGS.fr[key] != null ? STRINGS.fr[key] : key);
}

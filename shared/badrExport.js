/* =====================================================================
   Strait Systems — BADR hand-off mapper.
   Turns an enriched declaration into the field-by-field structure a
   declarant retypes into BADR (the DUM) — so the "we kill the re-keying"
   promise is VISIBLE: every BADR field already filled, copy-ready, plus a
   machine export. Pure + isomorphic; derives only from `decl` (no LLM, no
   network) so it works in the offline demo.

   Each field carries:
     value   — display string (already formatted), or null
     raw     — machine value for the JSON export
     missing — declarant still has to enter it (ICE, bureau…)  → "à renseigner"
     assumed — we injected a default/derived value             → "hypothèse"
   ===================================================================== */

import { FX_TO_MAD, fmt } from "./format.js";

const REGIME = { code: "031", fr: "Mise à la consommation", ar: "الاستهلاك المحلي" };

const num = (n) => fmt(Number(n) || 0, 0);
const mad = (n) => num(n) + " MAD";

function field(key, fr, ar, value, opts = {}) {
  const empty = value == null || value === "";
  return {
    key,
    label: { fr, ar },
    value: empty ? null : value,
    raw: opts.raw !== undefined ? opts.raw : (empty ? null : value),
    missing: !!opts.missing || (empty && !opts.assumed),
    assumed: !!opts.assumed,
  };
}

export function toBadrDeclaration(decl = {}, opts = {}) {
  const header = decl.header || {};
  const buyer = header.buyer || {};
  const seller = header.seller || {};
  const lines = decl.lines || [];
  const totals = decl.totals || {};
  const currency = decl.currency || header.currency || "MAD";
  const circuit = opts.circuit || (decl.prediction && decl.prediction.predicted) || (decl.risk && decl.risk.circuit) || "vert";
  const flow = opts.flow || decl.flow || "import";

  const fxRate = FX_TO_MAD[currency] != null ? FX_TO_MAD[currency] : 1;
  /* On export the origin is Morocco; on import it's the product's real origin. */
  const originCountry = flow === "export" ? (decl.origin_country || "MA") : decl.origin_country;
  const provenance = seller.country || originCountry || null;

  /* ---- en-tête ---- */
  const head = [
    field("bureau", "Bureau de douane", "مكتب الجمارك", null, { missing: true }),
    field("regime", "Régime douanier", "النظام الجمركي", `${REGIME.code} — ${REGIME.fr}`,
      { raw: REGIME.code, assumed: true }),
    field("flux", "Flux", "النوع", flow === "export" ? "Export" : "Import", { raw: flow, assumed: true }),
    field("importateur", "Importateur", "المستورد", buyer.name || null, { missing: !buyer.name }),
    field("ice", "ICE importateur", "المعرّف الموحّد للمقاولة", null, { missing: true }),
    field("exportateur", "Exportateur / Fournisseur", "المصدّر / المورّد",
      seller.name ? `${seller.name}${seller.country ? " (" + seller.country + ")" : ""}` : null,
      { raw: seller.name || null, missing: !seller.name }),
    field("origine", "Pays d'origine", "بلد المنشأ", originCountry || null, { missing: !originCountry, assumed: flow === "export" && !decl.origin_country }),
    field("provenance", "Pays de provenance", "بلد الإرسال", provenance, { assumed: !seller.country && !!provenance }),
    field("incoterm", "Incoterm", "إنكوترم",
      header.incoterm ? `${header.incoterm}${header.incoterm_place ? " " + header.incoterm_place : ""}` : null,
      { raw: header.incoterm || null, missing: !header.incoterm }),
    field("devise", "Devise facture", "عملة الفاتورة", currency, { raw: currency }),
    field("taux_change", "Taux de change", "سعر الصرف",
      currency === "MAD" ? "1,0000 (MAD)" : `1 ${currency} = ${fmt(fxRate, 4)} MAD`,
      { raw: fxRate, assumed: true }),
    field("fret", "Fret", "الشحن", `${num(header.freight_amount || 0)} ${currency}`, { raw: header.freight_amount || 0 }),
    field("assurance", "Assurance", "التأمين", `${num(header.insurance_amount || 0)} ${currency}`, { raw: header.insurance_amount || 0 }),
    field("nb_articles", "Nombre d'articles", "عدد البنود", String(lines.length), { raw: lines.length }),
    field("circuit", "Circuit prévu (prédiction)", "المسار المتوقَّع", circuit, { raw: circuit, assumed: true }),
  ];

  /* ---- articles ---- */
  const articles = lines.map((l, i) => ({
    index: i + 1,
    fields: [
      field("code_sh", "Code SH (NGP, 10 ch.)", "رمز النظام المنسّق (10 أرقام)", l.hs_code || null, { missing: !l.hs_code }),
      field("designation", "Désignation", "التسمية", l.hs_label_fr || l.description || null,
        { raw: l.hs_label_fr || l.description || null, missing: !(l.hs_label_fr || l.description) }),
      field("origine_art", "Origine", "المنشأ", l.declared_origin || decl.origin_country || null,
        { missing: !(l.declared_origin || decl.origin_country) }),
      field("quantite", "Quantité", "الكمية",
        l.quantity != null ? `${num(l.quantity)}${l.unit ? " " + l.unit : ""}` : null,
        { raw: l.quantity != null ? Number(l.quantity) : null, missing: l.quantity == null }),
      field("poids_brut", "Poids brut (kg)", "الوزن الإجمالي (كغ)",
        l.gross_weight_kg != null ? num(l.gross_weight_kg) : null,
        { raw: l.gross_weight_kg != null ? Number(l.gross_weight_kg) : null, missing: l.gross_weight_kg == null }),
      field("valeur_facture", "Valeur facture", "قيمة الفاتورة",
        l.line_total_src != null ? `${num(l.line_total_src)} ${currency}` : null,
        { raw: l.line_total_src != null ? Number(l.line_total_src) : null, missing: l.line_total_src == null }),
      field("valeur_douane", "Valeur en douane (CIF)", "القيمة الجمركية (CIF)", mad(l.cif_mad),
        { raw: l.cif_mad, assumed: true }),
      field("quotite", "Quotité droit", "نسبة الرسم", `${fmt(l.duty || 0, 1)} %`, { raw: l.duty || 0 }),
      field("droit", "Montant droit", "مبلغ الرسم", mad(l.duty_mad), { raw: l.duty_mad }),
      field("tva", "TVA", "ض.ق.م", `${fmt(l.vat != null ? l.vat : 20, 0)} % · ${mad(l.vat_mad)}`, { raw: l.vat_mad }),
      field("tpi", "TPI", "TPI", mad(l.tpi_mad), { raw: l.tpi_mad }),
    ],
  }));

  /* ---- totaux ---- */
  const totalsList = [
    field("t_cif", "Total valeur en douane (CIF)", "مجموع القيمة الجمركية", mad(totals.cif_mad), { raw: totals.cif_mad }),
    field("t_droit", "Total droits de douane", "مجموع الرسوم الجمركية", mad(totals.duty_mad), { raw: totals.duty_mad }),
    field("t_tva", "Total TVA (20 %)", "مجموع ض.ق.م", mad(totals.vat_mad), { raw: totals.vat_mad }),
    field("t_tpi", "Total TPI (0,25 %)", "مجموع TPI", mad(totals.tpi_mad), { raw: totals.tpi_mad }),
    field("t_taxes", "Total droits & taxes", "مجموع الرسوم والضرائب", mad(totals.taxes_total_mad), { raw: totals.taxes_total_mad }),
    field("t_landed", "Coût de revient dédouané", "كلفة الاستيراد بعد التخليص", mad(totals.landed_cost_mad), { raw: totals.landed_cost_mad }),
  ];

  /* ---- machine export (the structured hand-off itself) ---- */
  const flat = (list) => list.reduce((o, f) => { o[f.key] = f.raw; return o; }, {});
  const json = {
    document: "DUM — projet (Déclaration Unique de Marchandises)",
    regime: REGIME.code,
    circuit_prevu: circuit,
    devise: currency,
    taux_change_mad: fxRate,
    entete: flat(head),
    articles: articles.map((a) => ({ article: a.index, ...flat(a.fields) })),
    totaux: flat(totalsList),
    avertissement: "Projet généré par Strait Systems — valeurs déterministes (l'IA structure, le code calcule). À valider sur l'ADIL avant dépôt dans BADR.",
  };

  return { regime: REGIME, circuit, fxRate, head, articles, totals: totalsList, json };
}

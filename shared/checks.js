/* =====================================================================
   Strait Systems — pre-flight input checks (deterministic).
   Polices the INPUT before it ever reaches BADR — the human-error catches a
   déclarant cares about (and gets fined for): quantity/total arithmetic that
   doesn't add up, an article repeated across pages, a weight typed into the
   amount column, a client-supplied HS code that disagrees with ours, and the
   mandatory documents missing for the flow (import / export).

   Pure + isomorphic. Separate from assessRisk(): risk = "how hard will customs
   look?", checks = "is the declaration internally correct and complete?".
   Each anomaly carries the message AND the fix.
   ===================================================================== */

const SEV = { high: 3, medium: 2, low: 1 };
const digits = (s) => String(s == null ? "" : s).replace(/\D/g, "");
const r0 = (n) => Math.round(Number(n) || 0);

/* Required annexes per flow (ADII practice the worker described):
   always Facture + Liste de colisage; import adds the Bon à délivrer (carrier),
   export adds the Bon de livraison (client). */
const MANDATORY_DOCS = {
  import: ["facture", "colisage", "bad"],
  export: ["facture", "colisage", "bon_livraison"],
};

const DOC_LABEL_FR = {
  facture: "Facture",
  colisage: "Liste de colisage",
  bad: "Bon à délivrer (BAD)",
  bon_livraison: "Bon de livraison",
  certificat_origine: "Certificat d'origine",
  bl: "Connaissement (BL)",
};

/* import vs export from the parties' countries (Tanger Med is import-dominant,
   so that's the safe default when a side is unknown). */
export function detectFlow(decl = {}) {
  const header = decl.header || {};
  const bc = ((header.buyer && header.buyer.country) || "").toUpperCase();
  const sc = ((header.seller && header.seller.country) || "").toUpperCase();
  if (sc === "MA" && bc && bc !== "MA") return "export";
  if (bc === "MA" && sc && sc !== "MA") return "import";
  return "import";
}

export function runPreflight(decl = {}) {
  const header = decl.header || {};
  const lines = decl.lines || [];
  const anomalies = [];
  const add = (code, severity, message, fix) => anomalies.push({ code, severity, message, fix });

  const seen = new Map(); // normalized description → count (duplicate / multi-page article)

  for (const l of lines) {
    const desc = l.description || l.raw_description || "ligne";
    const qty = Number(l.quantity);
    const pu = Number(l.unit_price);
    const lt = l.line_total_src != null ? Number(l.line_total_src)
      : (l.line_total != null ? Number(l.line_total) : null);
    const calc = qty > 0 && pu > 0 ? qty * pu : null;
    const consistent = calc != null && lt != null && Math.abs(calc - lt) <= Math.max(1, 0.02 * Math.abs(lt));

    /* A — quantity × unit price must equal the line total (qty forgotten/doubled,
       or a value mistyped — the classic "article sur plusieurs pages" symptom). */
    if (calc != null && lt != null && !consistent) {
      add("QTY_MISMATCH", "high",
        `Incohérence quantité × P.U. ≠ total : ${r0(qty)} × ${pu} = ${r0(calc)} ≠ ${r0(lt)} déclaré (« ${desc} »)`,
        "Vérifier la quantité ou le montant de la ligne — article possiblement réparti sur plusieurs pages.");
    }

    /* B — weight typed into the amount column: the line total matches the gross
       weight AND the qty×P.U. arithmetic doesn't (so it's not a coincidence). */
    const wt = Number(l.gross_weight_kg);
    if (wt > 0 && lt != null && calc != null && !consistent
        && Math.abs(wt - lt) <= 0.01 * Math.max(wt, lt)) {
      add("WEIGHT_VALUE", "high",
        `Montant = poids ? ${r0(lt)} ≈ ${r0(wt)} kg (« ${desc} ») — montant et poids possiblement intervertis`,
        "Vérifier : le total de la ligne semble correspondre au poids, pas à la valeur.");
    }

    /* C — client put their OWN HS code and it disagrees with our classification.
       Never trust it (strict fines on misclassification right now). */
    if (l.declared_hs && l.hs_code && digits(l.declared_hs) && digits(l.declared_hs) !== digits(l.hs_code)) {
      add("HS_CLIENT_MISMATCH", "high",
        `Code SH client « ${l.declared_hs} » ≠ code proposé « ${l.hs_code} » (« ${desc} ») — ne pas se fier au code du client`,
        "Classer d'après la marchandise réelle et valider sur l'ADIL (amendes en cas d'erreur de classement).");
    }

    const key = desc.toLowerCase().replace(/\s+/g, " ").trim();
    if (key) seen.set(key, (seen.get(key) || 0) + 1);
  }

  /* D — same article appearing more than once (continued across pages). */
  for (const [key, n] of seen) {
    if (n > 1) {
      const l = lines.find((x) => (x.description || x.raw_description || "").toLowerCase().replace(/\s+/g, " ").trim() === key);
      const desc = l ? (l.description || l.raw_description) : key;
      add("DUP_LINE", "medium",
        `Ligne en double possible : « ${desc} » apparaît ${n} fois — vérifier (article sur plusieurs pages ?)`,
        "Fusionner les lignes ou confirmer que les quantités ne sont pas comptées deux fois.");
    }
  }

  /* E — sum of the lines must reconcile with the stated invoice total. */
  const total = header.total_amount != null ? Number(header.total_amount) : null;
  if (total != null && total > 0 && lines.length) {
    const sum = lines.reduce((s, l) => s + (l.line_total_src != null ? Number(l.line_total_src) : (Number(l.line_total) || 0)), 0);
    if (Math.abs(sum - total) > Math.max(1, 0.02 * total)) {
      add("TOTAL_MISMATCH", "high",
        `Somme des lignes (${r0(sum)}) ≠ total facture (${r0(total)}) — écart ${r0(Math.abs(sum - total))}`,
        "Ligne manquante ou en double — recompter les articles avant dépôt.");
    }
  }

  /* F — mandatory annexes for the flow. Certificate of origin is shown when the
     origin is preferential but its absence is already raised by assessRisk
     (NO_COO), so it isn't double-counted as a blocking anomaly here. */
  const flow = detectFlow(decl);
  const present = new Set(decl.documents_present || header.documents_present || []);
  const mandatory = MANDATORY_DOCS[flow] || MANDATORY_DOCS.import;
  const documents = mandatory.map((code) => ({ code, present: present.has(code), mandatory: true }));
  if (decl.coo_present === false || (decl.coo_present == null && !present.has("certificat_origine"))) {
    documents.push({ code: "certificat_origine", present: present.has("certificat_origine"), mandatory: false });
  } else if (present.has("certificat_origine")) {
    documents.push({ code: "certificat_origine", present: true, mandatory: false });
  }
  for (const d of documents) {
    if (d.mandatory && !d.present) {
      add("DOC_MISSING", "high",
        `Document obligatoire manquant (flux ${flow}) : ${DOC_LABEL_FR[d.code] || d.code}`,
        "Annexer le document avant dépôt de la DUM.");
    }
  }

  anomalies.sort((a, b) => (SEV[b.severity] || 0) - (SEV[a.severity] || 0));
  return { flow, anomalies, documents };
}

export { DOC_LABEL_FR };

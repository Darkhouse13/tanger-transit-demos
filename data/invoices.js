/* =====================================================================
   Strait Systems — synthetic commercial invoices (demo 1 "AI Déclarant").
   ⚠️ Entirely fictional. Companies, prices and figures are illustrative.

   Each sample carries:
     - the messy raw `body` (what a transitaire actually receives), used for
       live LLM extraction AND for the "paste" path;
     - a pre-extracted `extracted` payload (header + lines) used as the
       OFFLINE safety net so the deterministic engine still runs verbatim;
     - `meta` (origin_country, coo_present, importer_known) + the
       `expected_circuit` the demo is designed to land on.
   ===================================================================== */

export const INVOICES = [
  /* ---------- 1. Clean import, low duty -> VERT ---------- */
  {
    id: "inv1",
    sender: "Détroit Auto Maroc",
    email: "import@detroit-auto.ma",
    date: "Aujourd'hui · 09:12",
    subject: "Facture FR-2026-0412 — pièces auto (Garonne Components)",
    snippet: "Faisceaux de câblage + filtres à huile, FOB Le Havre, certificat d'origine joint…",
    body:
`FACTURE COMMERCIALE / COMMERCIAL INVOICE
Garonne Components SAS — 33700 Mérignac, France
Facture n° FR-2026-0412   Date: 03/06/2026
Vendu à: Détroit Auto Maroc SARL, Zone Industrielle Gzenaya, Tanger

Incoterm: FOB Le Havre        Devise: EUR
Fret maritime: 1 200,00 EUR   Assurance: 150,00 EUR

Réf      Désignation                                Qté     P.U.(EUR)   Total
HV-441   Faisceaux de câblage automobile            400     25,00       10 000,00
OF-218   Filtres à huile pour moteurs diesel        800      8,00        6 400,00
                                                            TOTAL HT    16 400,00

Origine: France. Documents: facture, liste de colisage, BL, certificat d'origine EUR.1.`,
    extracted: {
      header: {
        seller: { name: "Garonne Components SAS", country: "FR" },
        buyer: { name: "Détroit Auto Maroc SARL", city: "Tanger", country: "MA" },
        invoice_no: "FR-2026-0412", invoice_date: "2026-06-03",
        incoterm: "FOB", incoterm_place: "Le Havre", currency: "EUR",
        freight_amount: 1200, insurance_amount: 150,
        documents_present: ["facture", "colisage", "bl", "certificat_origine"],
      },
      lines: [
        { raw_description: "Faisceaux de câblage automobile", quantity: 400, unit: "piece", unit_price: 25, line_total: 10000, declared_origin: "FR", gross_weight_kg: 1200 },
        { raw_description: "Filtres à huile pour moteurs diesel", quantity: 800, unit: "piece", unit_price: 8, line_total: 6400, declared_origin: "FR", gross_weight_kg: 600 },
      ],
    },
    meta: { origin_country: "FR", coo_present: true, importer_known: true, expected_circuit: "vert" },
  },

  /* ---------- 2. Textiles, high duty, compliant -> VERT (spotlights 40% duty) ---------- */
  {
    id: "inv2",
    sender: "Médina Textile",
    email: "achats@medina-textile.ma",
    date: "Aujourd'hui · 08:40",
    subject: "Invoice BRS-7781 — knitwear & fabric (Bursa Tekstil)",
    snippet: "T-shirts coton, robes synthétiques, tissu imprimé — CFR Tanger Med, ATR joint…",
    body:
`COMMERCIAL INVOICE
Bursa Tekstil A.S. — Bursa, Türkiye
Invoice BRS-7781   Date: 2026-06-05
Sold to: Médina Textile, Casablanca, Morocco

Incoterm: CFR Tanger Med     Currency: EUR     (freight included)

Item                                   Qty(pcs)   Unit(EUR)   Amount
Cotton crew-neck T-shirts              5000       3.50        17 500.00
Dresses, synthetic fibres              1200       18.00       21 600.00
Printed cotton woven fabric (m2)       4000       4.00        16 000.00
                                                  TOTAL       55 100.00

Origin: Türkiye. Movement certificate A.TR + certificate of origin enclosed.`,
    extracted: {
      header: {
        seller: { name: "Bursa Tekstil A.Ş.", country: "TR" },
        buyer: { name: "Médina Textile", city: "Casablanca", country: "MA" },
        invoice_no: "BRS-7781", invoice_date: "2026-06-05",
        incoterm: "CFR", incoterm_place: "Tanger Med", currency: "EUR",
        freight_amount: 0, insurance_amount: 0,
        documents_present: ["facture", "colisage", "bl", "certificat_origine"],
      },
      lines: [
        { raw_description: "T-shirts en coton, col rond", quantity: 5000, unit: "piece", unit_price: 3.5, line_total: 17500, declared_origin: "TR", gross_weight_kg: 900 },
        { raw_description: "Robes en fibres synthétiques", quantity: 1200, unit: "piece", unit_price: 18, line_total: 21600, declared_origin: "TR", gross_weight_kg: 600 },
        { raw_description: "Tissus de coton imprimés", quantity: 4000, unit: "m2", unit_price: 4, line_total: 16000, declared_origin: "TR", gross_weight_kg: 1100 },
      ],
    },
    meta: { origin_country: "TR", coo_present: true, importer_known: true, expected_circuit: "vert" },
  },

  /* ---------- 3. Undervalued smartphones -> ROUGE ---------- */
  {
    id: "inv3",
    sender: "Atlas Mobile Distribution",
    email: "ops@atlasmobile.ma",
    date: "Hier · 17:55",
    subject: "INV SZ-90233 — mobile phones (Shenzhen Sourcing)",
    snippet: "2000 smartphones déclarés à 11 USD pièce — FOB Shenzhen, pas de certificat d'origine…",
    body:
`COMMERCIAL INVOICE
Shenzhen Sourcing Co., Ltd — Shenzhen, China
Invoice: SZ-90233   Date: 2026/06/09
Buyer: Atlas Mobile Distribution, Tanger, Morocco

Incoterm: FOB Shenzhen   Currency: USD
Freight: 800 USD   Insurance: 100 USD

Description                         Qty     Unit(USD)   Total
Mobile phones (smartphones) 6.5"    2000    11.00       22 000.00

Origin: China. Docs: invoice, packing list, B/L.`,
    extracted: {
      header: {
        seller: { name: "Shenzhen Sourcing Co., Ltd", country: "CN" },
        buyer: { name: "Atlas Mobile Distribution", city: "Tanger", country: "MA" },
        invoice_no: "SZ-90233", invoice_date: "2026-06-09",
        incoterm: "FOB", incoterm_place: "Shenzhen", currency: "USD",
        freight_amount: 800, insurance_amount: 100,
        documents_present: ["facture", "colisage", "bl"],
      },
      lines: [
        { raw_description: "Téléphones mobiles (smartphones) 6.5\"", quantity: 2000, unit: "piece", unit_price: 11, line_total: 22000, declared_origin: "CN", gross_weight_kg: 400 },
      ],
    },
    meta: { origin_country: "CN", coo_present: false, importer_known: false, expected_circuit: "rouge" },
  },

  /* ---------- 4. Preferential origin, missing certificate of origin -> ROUGE ---------- */
  {
    id: "inv4",
    sender: "Rif Bâti Distribution",
    email: "import@rifbati.ma",
    date: "Hier · 14:20",
    subject: "Factura VC-1182 — azulejos cerámicos (Valencia Cerámica)",
    snippet: "Carreaux céramique 60x60, CIF Tanger Med, origine Espagne — certificat d'origine manquant…",
    body:
`FACTURA COMERCIAL / COMMERCIAL INVOICE
Valencia Cerámica S.L. — Castellón, España
Factura VC-1182   Fecha: 08/06/2026
Cliente: Rif Bâti Distribution, Tétouan, Marruecos

Incoterm: CIF Tanger Med   Moneda: EUR

Descripción                              Cant.(m2)   Precio(EUR)   Importe
Azulejos de cerámica esmaltada 60x60     3000        6,00          18 000,00

Origen: España. Documentos: factura, packing list, B/L.
(NB: certificado de origen / EUR.1 no adjunto)`,
    extracted: {
      header: {
        seller: { name: "Valencia Cerámica S.L.", country: "ES" },
        buyer: { name: "Rif Bâti Distribution", city: "Tétouan", country: "MA" },
        invoice_no: "VC-1182", invoice_date: "2026-06-08",
        incoterm: "CIF", incoterm_place: "Tanger Med", currency: "EUR",
        freight_amount: 0, insurance_amount: 0,
        documents_present: ["facture", "colisage", "bl"],
      },
      lines: [
        { raw_description: "Carreaux en céramique émaillée 60x60", quantity: 3000, unit: "m2", unit_price: 6, line_total: 18000, declared_origin: "ES", gross_weight_kg: 18000 },
      ],
    },
    meta: { origin_country: "ES", coo_present: false, importer_known: true, expected_circuit: "rouge" },
  },

  /* ---------- 5. Mixed FR/AR invoice, one low value -> ORANGE ---------- */
  {
    id: "inv5",
    sender: "شركة طنجة للتجارة / Tanger Négoce",
    email: "contact@tanger-negoce.ma",
    date: "Hier · 10:05",
    subject: "Facture mixte — chaussures, riz, café (multi-origine)",
    snippet: "حذاء جلدي · أرز أبيض · بن محمص — FOB, certificat d'origine joint…",
    body:
`FACTURE COMMERCIALE
Iberia Trading S.L. — Algeciras, España
Facture n° IB-3340   Date: 07/06/2026
Client / الزبون: شركة طنجة للتجارة — Société Tanger Négoce, Tanger

Incoterm: FOB Algeciras   Devise: EUR
Fret: 600 EUR   Assurance: 80 EUR

Désignation                                   Qté        P.U.(EUR)   Total
حذاء جلدي رجالي / Chaussures cuir homme        600 paires 35,00       21 000,00
أرز أبيض حبة طويلة / Riz blanchi grain long    10000 kg   0,70         7 000,00
بن محمص / Café torréfié en grains              2000 kg    2,40         4 800,00
                                                          TOTAL HT    32 800,00

Origine: UE. Documents: facture, colisage, BL, certificat d'origine.`,
    extracted: {
      header: {
        seller: { name: "Iberia Trading S.L.", country: "ES" },
        buyer: { name: "Société Tanger Négoce", city: "Tanger", country: "MA" },
        invoice_no: "IB-3340", invoice_date: "2026-06-07",
        incoterm: "FOB", incoterm_place: "Algeciras", currency: "EUR",
        freight_amount: 600, insurance_amount: 80,
        documents_present: ["facture", "colisage", "bl", "certificat_origine"],
      },
      lines: [
        { raw_description: "حذاء جلدي رجالي / Chaussures cuir homme", quantity: 600, unit: "pair", unit_price: 35, line_total: 21000, declared_origin: "ES", gross_weight_kg: 1200 },
        { raw_description: "أرز أبيض حبة طويلة / Riz blanchi grain long", quantity: 10000, unit: "kg", unit_price: 0.7, line_total: 7000, declared_origin: "ES", gross_weight_kg: 10000 },
        { raw_description: "بن محمص / Café torréfié en grains", quantity: 2000, unit: "kg", unit_price: 2.4, line_total: 4800, declared_origin: "ES", gross_weight_kg: 2000 },
      ],
    },
    meta: { origin_country: "ES", coo_present: true, importer_known: true, expected_circuit: "orange" },
  },
];

/* Match pasted/incoming text back to a sample (offline extraction fallback). */
export function matchInvoice(text) {
  if (!text) return null;
  const t = text.trim();
  return INVOICES.find((inv) => inv.body.trim() === t)
    || INVOICES.find((inv) => t.includes(inv.extracted.header.invoice_no))
    || null;
}

/* =====================================================================
   Strait Systems — curated Moroccan customs tariff (HS/NGP) table.

   ⚠️  ILLUSTRATIVE SYNTHETIC DEMO DATA — NOT a live ADII/ADIL feed.
   10-digit NGP codes, duty bands and expected price ranges are curated to
   be *credible* to a customs professional, not authoritative. The whole
   point of the architecture: this table is swappable for the client's real
   ADIL tariff and the engine keeps working unchanged.

   Row schema:
     code      10-digit NGP code (string, leading zeros preserved)
     fr/ar/en  labels
     duty      ad-valorem customs duty %  (MA bands: 0 / 2.5 / 10 / 17.5 / 25 / 40)
     vat       VAT %  (20 standard, 10 reduced, 0 exempt)
     tpi       parafiscal import tax %  (0.25 default)
     category  one of CATEGORIES
     unit      typical declared unit (piece|pair|kg|m2|unit…)
     priceBand [lo, hi] expected MAD per unit (drives undervaluation risk)
     sensitive controlled / inspection-prone good (drives risk)
     aliases   lowercased FR/AR/EN keywords + phrases for free-text matching
   ===================================================================== */

export const TARIFF_NOTE = "Tarifs illustratifs — données de démonstration (non un flux ADII en direct).";

export const CATEGORIES = [
  "textile", "footwear", "automotive", "electronics", "machinery",
  "plastics", "agrifood", "chemicals", "metals", "other",
];

export const TARIFF = [
  /* ----------------------------- TEXTILE ----------------------------- */
  { code: "6109100012", fr: "T-shirts en coton, en bonneterie", ar: "قمصان قطنية (تي شيرت)", en: "Cotton T-shirts, knitted",
    duty: 40, vat: 20, tpi: 0.25, category: "textile", unit: "piece", priceBand: [25, 250], sensitive: false,
    aliases: ["t-shirts coton", "t-shirt", "tee shirt", "tshirt", "coton bonneterie", "maillot", "قميص", "تي شيرت", "cotton t-shirt"] },
  { code: "5208520000", fr: "Tissus de coton imprimés", ar: "أقمشة قطنية مطبوعة", en: "Printed cotton woven fabric",
    duty: 25, vat: 20, tpi: 0.25, category: "textile", unit: "m2", priceBand: [15, 150], sensitive: false,
    aliases: ["tissus de coton imprimes", "tissu de coton", "tissu coton", "coton imprime", "etoffe", "قماش قطني", "قماش", "printed cotton fabric"] },
  { code: "6204430090", fr: "Robes en fibres synthétiques", ar: "فساتين من ألياف اصطناعية", en: "Dresses of synthetic fibres",
    duty: 40, vat: 20, tpi: 0.25, category: "textile", unit: "piece", priceBand: [120, 1200], sensitive: false,
    aliases: ["robes synthetiques", "robe", "robes en fibres synthetiques", "polyester", "vetement", "pret-a-porter", "فستان", "dress"] },
  { code: "6302310000", fr: "Linge de lit en coton", ar: "بياضات سرير قطنية", en: "Bed linen of cotton",
    duty: 40, vat: 20, tpi: 0.25, category: "textile", unit: "piece", priceBand: [50, 600], sensitive: false,
    aliases: ["linge de lit", "draps", "parure de lit", "bed linen", "بياضات", "drap"] },

  /* ----------------------------- FOOTWEAR ---------------------------- */
  { code: "6403990000", fr: "Chaussures à dessus en cuir", ar: "أحذية جلدية", en: "Footwear with leather uppers",
    duty: 40, vat: 20, tpi: 0.25, category: "footwear", unit: "pair", priceBand: [200, 1800], sensitive: false,
    aliases: ["chaussures cuir", "chaussure", "soulier", "cuir", "حذاء جلدي", "حذاء", "احذية جلدية", "leather shoes", "footwear"] },
  { code: "6402990000", fr: "Chaussures à dessus en plastique/caoutchouc", ar: "أحذية بلاستيكية", en: "Footwear, plastic/rubber",
    duty: 40, vat: 20, tpi: 0.25, category: "footwear", unit: "pair", priceBand: [40, 500], sensitive: false,
    aliases: ["chaussures plastique", "sandale", "tong", "basket", "حذاء بلاستيكي", "sport shoe"] },

  /* ---------------------------- AUTOMOTIVE --------------------------- */
  { code: "8544300000", fr: "Faisceaux de câblage pour automobiles", ar: "ضفائر أسلاك السيارات", en: "Automotive wiring harnesses",
    duty: 2.5, vat: 20, tpi: 0.25, category: "automotive", unit: "piece", priceBand: [60, 2500], sensitive: false,
    aliases: ["faisceaux de cablage", "cablage automobile", "faisceau", "cablage", "fil", "wiring harness", "harness", "ضفيرة", "اسلاك"] },
  { code: "8708299000", fr: "Parties de carrosserie pour véhicules", ar: "أجزاء هياكل السيارات", en: "Motor-vehicle body parts",
    duty: 17.5, vat: 20, tpi: 0.25, category: "automotive", unit: "piece", priceBand: [80, 6000], sensitive: false,
    aliases: ["carrosserie", "piece auto", "pare-choc", "body part", "vehicule", "قطع غيار", "هيكل"] },
  { code: "4011100000", fr: "Pneumatiques neufs pour voitures", ar: "إطارات جديدة للسيارات", en: "New pneumatic tyres, cars",
    duty: 25, vat: 20, tpi: 0.25, category: "automotive", unit: "piece", priceBand: [300, 3500], sensitive: false,
    aliases: ["pneumatiques", "pneu", "tyre", "tire", "roue", "اطار", "اطارات"] },
  { code: "8482100000", fr: "Roulements à billes", ar: "محامل كروية (رولمان)", en: "Ball bearings",
    duty: 2.5, vat: 20, tpi: 0.25, category: "automotive", unit: "piece", priceBand: [10, 2000], sensitive: false,
    aliases: ["roulements a billes", "roulement", "bearing", "rolement", "محمل", "rulman"] },

  /* --------------------------- ELECTRONICS --------------------------- */
  { code: "8517120000", fr: "Téléphones mobiles (smartphones)", ar: "هواتف محمولة (ذكية)", en: "Mobile phones / smartphones",
    duty: 2.5, vat: 20, tpi: 0.25, category: "electronics", unit: "piece", priceBand: [3000, 120000], sensitive: true,
    aliases: ["telephones mobiles", "smartphone", "telephone", "mobile", "gsm", "portable", "phone", "هاتف", "هواتف"] },
  { code: "8528720000", fr: "Téléviseurs couleur", ar: "أجهزة تلفاز ملونة", en: "Colour television receivers",
    duty: 25, vat: 20, tpi: 0.25, category: "electronics", unit: "piece", priceBand: [1500, 60000], sensitive: false,
    aliases: ["televiseurs", "television", "tele", "tv", "ecran", "led tv", "تلفاز", "تلفزيون"] },
  { code: "8471300000", fr: "Ordinateurs portables", ar: "حواسيب محمولة", en: "Portable laptops",
    duty: 2.5, vat: 20, tpi: 0.25, category: "electronics", unit: "piece", priceBand: [2000, 60000], sensitive: false,
    aliases: ["ordinateurs portables", "ordinateur", "portable", "laptop", "pc portable", "حاسوب", "لابتوب"] },
  { code: "8504401000", fr: "Chargeurs / alimentations électriques", ar: "شواحن كهربائية", en: "Power adapters / chargers",
    duty: 10, vat: 20, tpi: 0.25, category: "electronics", unit: "piece", priceBand: [20, 800], sensitive: false,
    aliases: ["chargeurs", "chargeur", "adaptateur", "alimentation", "charger", "transfo", "شاحن"] },

  /* ---------------------------- MACHINERY ---------------------------- */
  { code: "8479899000", fr: "Machines et appareils mécaniques, n.d.a.", ar: "آلات وأجهزة ميكانيكية", en: "Mechanical machines/appliances, nesoi",
    duty: 2.5, vat: 20, tpi: 0.25, category: "machinery", unit: "unit", priceBand: [5000, 2000000], sensitive: false,
    aliases: ["machine", "appareil mecanique", "mecanique", "machinery", "equipement", "industriel", "الة", "ماكينة"] },
  { code: "8413810000", fr: "Pompes pour liquides", ar: "مضخات سوائل", en: "Pumps for liquids",
    duty: 2.5, vat: 20, tpi: 0.25, category: "machinery", unit: "unit", priceBand: [600, 120000], sensitive: false,
    aliases: ["pompes", "pompe", "pump", "hydraulique", "circulateur", "مضخة"] },
  { code: "8421230000", fr: "Filtres à huile/carburant pour moteurs", ar: "مرشحات زيت ووقود للمحركات", en: "Oil/fuel filters for engines",
    duty: 10, vat: 20, tpi: 0.25, category: "machinery", unit: "piece", priceBand: [30, 800], sensitive: false,
    aliases: ["filtres a huile", "filtre a huile", "filtre", "filter", "huile", "carburant", "moteur", "مرشح", "فلتر"] },
  { code: "8418102000", fr: "Réfrigérateurs-congélateurs ménagers", ar: "ثلاجات", en: "Refrigerator-freezers, household",
    duty: 25, vat: 20, tpi: 0.25, category: "machinery", unit: "unit", priceBand: [1500, 40000], sensitive: false,
    aliases: ["refrigerateurs", "refrigerateur", "frigo", "congelateur", "refrigerator", "ثلاجة"] },

  /* ----------------------------- PLASTICS ---------------------------- */
  { code: "3901100000", fr: "Polyéthylène en formes primaires", ar: "بولي إيثيلين أولي", en: "Polyethylene, primary form",
    duty: 2.5, vat: 20, tpi: 0.25, category: "plastics", unit: "kg", priceBand: [12, 45], sensitive: false,
    aliases: ["polyethylene", "granules de polyethylene", "granule", "pe", "ldpe", "polymere", "resine", "بلاستيك", "بولي ايثيلين"] },
  { code: "3902100000", fr: "Polypropylène en formes primaires", ar: "بولي بروبيلين أولي", en: "Polypropylene, primary form",
    duty: 2.5, vat: 20, tpi: 0.25, category: "plastics", unit: "kg", priceBand: [12, 40], sensitive: false,
    aliases: ["polypropylene", "pp", "granule pp", "polymere", "بولي بروبيلين"] },
  { code: "3923300000", fr: "Bouteilles et flacons en plastique", ar: "قنينات وزجاجات بلاستيكية", en: "Plastic bottles/flasks",
    duty: 25, vat: 20, tpi: 0.25, category: "plastics", unit: "piece", priceBand: [0.5, 30], sensitive: false,
    aliases: ["bouteilles plastique", "bouteille", "flacon", "emballage plastique", "pet", "قنينة", "زجاجة"] },

  /* ----------------------------- AGRIFOOD ---------------------------- */
  { code: "1006304000", fr: "Riz blanchi (semi-blanchi ou blanchi)", ar: "أرز أبيض", en: "Milled rice (semi/wholly)",
    duty: 2.5, vat: 10, tpi: 0.25, category: "agrifood", unit: "kg", priceBand: [6, 25], sensitive: false,
    aliases: ["riz blanchi", "riz", "rice", "cereale", "grain", "أرز أبيض", "أرز", "ارز", "rice white"] },
  { code: "0901210000", fr: "Café torréfié, non décaféiné", ar: "بن محمص", en: "Roasted coffee, not decaffeinated",
    duty: 25, vat: 20, tpi: 0.25, category: "agrifood", unit: "kg", priceBand: [40, 200], sensitive: true,
    aliases: ["cafe torrefie", "cafe", "coffee", "arabica", "robusta", "بن محمص", "بن", "قهوة", "roasted coffee"] },
  { code: "1511900000", fr: "Huile de palme raffinée", ar: "زيت نخيل مكرر", en: "Refined palm oil",
    duty: 2.5, vat: 10, tpi: 0.25, category: "agrifood", unit: "kg", priceBand: [8, 30], sensitive: false,
    aliases: ["huile de palme", "huile vegetale", "palm oil", "زيت نخيل", "زيت"] },

  /* ----------------------------- CHEMICALS --------------------------- */
  { code: "3208200000", fr: "Peintures à base de polymères acryliques", ar: "دهانات أكريليك", en: "Acrylic-polymer paints",
    duty: 10, vat: 20, tpi: 0.25, category: "chemicals", unit: "kg", priceBand: [20, 200], sensitive: false,
    aliases: ["peintures acryliques", "peinture", "vernis", "acrylique", "paint", "revetement", "دهان", "صباغة"] },
  { code: "3304990000", fr: "Produits de beauté / cosmétiques", ar: "مستحضرات تجميل", en: "Beauty / cosmetic preparations",
    duty: 40, vat: 20, tpi: 0.25, category: "chemicals", unit: "piece", priceBand: [20, 1500], sensitive: true,
    aliases: ["cosmetiques", "cosmetique", "produits de beaute", "creme", "maquillage", "cosmetic", "مستحضرات تجميل", "تجميل"] },
  { code: "3402200000", fr: "Préparations tensioactives (détergents)", ar: "مواد منظفة (تنظيف)", en: "Surface-active / detergent preparations",
    duty: 2.5, vat: 20, tpi: 0.25, category: "chemicals", unit: "kg", priceBand: [10, 80], sensitive: false,
    aliases: ["detergents", "detergent", "tensioactif", "savon", "nettoyant", "detergent powder", "منظف", "صابون"] },

  /* ------------------------------ METALS ----------------------------- */
  { code: "7308900000", fr: "Constructions et parties en fer/acier", ar: "إنشاءات حديدية", en: "Iron/steel structures & parts",
    duty: 17.5, vat: 20, tpi: 0.25, category: "metals", unit: "kg", priceBand: [8, 60], sensitive: false,
    aliases: ["construction acier", "acier", "fer", "structure metallique", "charpente", "profile", "steel structure", "حديد", "فولاذ"] },
  { code: "7318150000", fr: "Vis et boulons en fer/acier", ar: "براغي وصواميل", en: "Iron/steel screws and bolts",
    duty: 10, vat: 20, tpi: 0.25, category: "metals", unit: "kg", priceBand: [10, 150], sensitive: false,
    aliases: ["vis et boulons", "vis", "boulon", "ecrou", "screw", "bolt", "visserie", "برغي", "صامولة"] },
  { code: "7604210000", fr: "Profilés en aluminium", ar: "مقاطع ألمنيوم", en: "Aluminium profiles",
    duty: 10, vat: 20, tpi: 0.25, category: "metals", unit: "kg", priceBand: [25, 120], sensitive: false,
    aliases: ["profiles aluminium", "aluminium", "alu", "profile alu", "aluminum profile", "ألمنيوم", "الومنيوم"] },

  /* ------------------------------ OTHER ------------------------------ */
  { code: "6907210000", fr: "Carreaux en céramique (absorption ≤ 0,5 %)", ar: "بلاط سيراميك", en: "Ceramic tiles, low water absorption",
    duty: 40, vat: 20, tpi: 0.25, category: "other", unit: "m2", priceBand: [40, 300], sensitive: true,
    aliases: ["carreaux ceramique", "carreau", "carrelage", "ceramique", "faience", "tile", "بلاط", "سيراميك", "ceramic tiles"] },
  { code: "9403600000", fr: "Meubles en bois (autres)", ar: "أثاث خشبي", en: "Wooden furniture (other)",
    duty: 40, vat: 20, tpi: 0.25, category: "other", unit: "piece", priceBand: [200, 8000], sensitive: false,
    aliases: ["meubles en bois", "meuble", "mobilier", "furniture", "bois", "أثاث", "موبيليا"] },
  { code: "4819100000", fr: "Cartons et boîtes en papier ondulé", ar: "علب من ورق مقوى", en: "Cartons/boxes of corrugated paper",
    duty: 25, vat: 20, tpi: 0.25, category: "other", unit: "piece", priceBand: [0.5, 20], sensitive: false,
    aliases: ["cartons", "carton", "boite carton", "emballage carton", "ondule", "box", "كرتون", "علبة"] },
];

/* Quick index by code (used when the model proposes a known code). */
export const TARIFF_BY_CODE = Object.fromEntries(TARIFF.map((r) => [r.code, r]));

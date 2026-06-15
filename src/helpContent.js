export const HELP = {
  global: {
    title: "Comment lire cette démo",
    items: [
      ["L'IA structure, le code calcule", "L'IA se limite à lire et structurer le texte des factures. Tous les montants (valeur en douane, droits, TVA, TPI, coût de revient) et le contrôle du risque sont calculés par du code déterministe sur une grille tarifaire — à facture identique, résultat identique."],
      ["Données illustratives", "Sociétés, prix, historiques et tarifs sont synthétiques. La grille tarifaire est remplaçable par le tarif ADIL réel du client."],
      ["BADR sans API publique", "BADR / PortNet n'exposent pas d'API. Le circuit affiché est une prédiction de notre moteur ; le déclarant la confirme ou la corrige avec la réponse réelle de BADR."],
      ["Taux de change figés", "Conversion en MAD via une table figée (EUR 10,85 · USD 9,95 · CNY 1,38 · GBP 12,60 · TRY 0,30). En production : taux de change officiel de la douane à la date de l'opération."],
    ],
  },
  declarant: {
    title: "AI Déclarant — de la facture à la DUM",
    items: [
      ["Extraction", "L'IA lit la facture (ou un texte collé) et en extrait parties, lignes et montants. Aucune valeur monétaire n'est inventée — elle recopie ce qui est écrit."],
      ["Code SH (10 chiffres)", "Proposé par un classeur déterministe (mots-clés FR/AR/EN) avec indice de confiance. Sous ~45 %, signalé « à vérifier ». Reclassement manuel possible ; un code validé passe à 100 %."],
      ["Valeur en douane (CIF)", "Valeur facture convertie en MAD + quote-part de fret et d'assurance répartie entre les lignes (au prorata de la valeur, sinon du poids). Selon l'Incoterm, le fret/assurance déjà inclus ne sont pas recomptés (CIF, CFR, CIP, DDP…)."],
      ["Droits & taxes", "Droit = CIF × quotité du tarif. TPI = CIF × 0,25 %. TVA = (CIF + droit + TPI) × 20 %. Coût de revient = CIF + droit + TPI + TVA."],
      ["Prédiction BADR", "Circuit Vert/Orange/Rouge issu d'un score de risque explicite (confiance + motifs). C'est une prédiction, à confirmer auprès de BADR après dépôt."],
      ["À faire", "Chaque motif de risque est accompagné de l'action qui le lève : justifier la valeur, joindre le certificat d'origine, valider le code SH…"],
      ["Hand-off BADR", "Tous les champs de la DUM pré-remplis, prêts à copier ou exporter. « à renseigner » = à compléter dans BADR (bureau, ICE) ; « hypothèse » = valeur déduite par défaut (régime 031, taux de change, circuit) à confirmer."],
    ],
  },
  calc: {
    title: "Calculatrice de droits",
    items: [
      ["Classement", "Vous décrivez la marchandise (FR ou AR) ; le moteur propose jusqu'à 3 codes SH candidats avec indice de confiance, via le même classeur que le Déclarant."],
      ["Calcul", "Pour la valeur saisie : droit, TVA (20 %), TPI (0,25 %) et coût de revient, instantanément, par du code. Mêmes formules que le Déclarant."],
      ["Tarifs illustratifs", "Quotités issues d'une grille de démonstration, remplaçable par le tarif ADIL."],
    ],
  },
  board: {
    title: "Tableau de bord — suivi du dédouanement",
    items: [
      ["Circuits", "Vert (mainlevée automatique, ~60 %), Orange (contrôle documentaire, ~25 %), Rouge (visite physique, ~15 %, 2–5 jours)."],
      ["Prédiction BADR", "« prédit juste » / « corrigé » compare notre prédiction au circuit réellement affecté ; la précision agrège ces résultats."],
      ["Surestaries", "Au-delà de la franchise (free-time), chaque jour de retard coûte un montant journalier (illustratif, ~500–1 500 MAD/j). Date de référence figée pour la démonstration."],
      ["Sous-déclaration", "Pour les valeurs anormalement basses face à l'historique de l'importateur, on chiffre l'écart et les droits & taxes potentiellement éludés."],
      ["Heures économisées", "≈ 35 min de ressaisie manuelle évitée par DUM pré-remplie (hypothèse prudente)."],
      ["Données synthétiques", "Dossiers fictifs, dates ancrées pour un rendu identique à chaque lancement."],
    ],
  },
};

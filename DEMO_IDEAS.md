# Idées de démos — transit Tanger

Trois démos construites, racontant **une histoire : Préparer → Chiffrer → Suivre.** Toutes réutilisent le même moteur déterministe (le code calcule, l'IA ne fait que structurer).

## Construites (prêtes pour lundi)

### 1. ★ AI Déclarant — *facture → DUM pré-remplie* (flagship)
Coller/charger une facture commerciale (même multilingue FR/AR, désordonnée). L'IA extrait chaque ligne ; le code **suggère le code SH à 10 chiffres** (avec un indice de confiance), calcule **valeur en douane (CIF), droits, TVA 20 %, TPI**, **pré-remplit une DUM** et affiche les **drapeaux de risque + le circuit** (Vert/Orange/Rouge).
**Pourquoi ça gagne :** vise la douleur n°1 (re-saisie dans BADR) + le classement SH + le calcul des droits, c'est-à-dire le cœur de métier du transitaire. C'est l'effet « waouh » et la preuve qu'on connaît leur monde.

### 2. Calculatrice de droits — *description → SH + droits*
Saisir une description (FR ou AR) → meilleurs codes SH candidats + droit/TVA + **coût de revient**, **instantané**. Montre la même mécanique déterministe que le Déclarant ; vitrine **RTL arabe** complète.

### 3. Tableau de bord — *suivi du dédouanement*
Tableau multi-acteurs de ~10 dossiers à travers les circuits Vert/Orange/Rouge, avec **alertes surestaries** et chronologie du dédouanement par dossier. Peint la vision « plateforme » ; sans IA, données simulées.

## Pourquoi le flagship plutôt qu'un autre concept
- Le métier du transitaire = **le dédouanement (la DUM dans BADR)**, pas seulement la cotation. La démo doit toucher ce cœur.
- La douleur la plus universelle et chère = **re-saisie manuelle + classement SH + droits**. Le Déclarant l'attaque frontalement.
- Réutilise exactement le muscle du démonstrateur existant *Cours* : *texte désordonné → JSON structuré → calcul déterministe*.

## Pistes suivantes (non construites — discussion)
- **Prédiction de circuit** sur historique réel de l'importateur (scoring OEA, probabilité de rouge).
- **OCR de vrais PDF / photos** de factures (au-delà du texte) + e-facturation 2026.
- **Réconciliation paiement ↔ DUM** et suivi e-paiement.
- **Connecteurs lignes maritimes / PortNet** pour pré-déclencher la pré-déclaration à l'arrivée conteneur.
- **Alertes multi-canaux** (WhatsApp/SMS/e-mail) sur changement de statut.

## Garde-fou de crédibilité
Tous les tarifs sont **illustratifs / synthétiques** et étiquetés comme tels. Le **mécanisme** (déterministe, auditable, reproductible) est le produit ; `shared/tariff.js` est **remplaçable par le tarif ADIL réel** du client — c'est précisément l'argument commercial.

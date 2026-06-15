# Tarif ADII (édition 2022) — données extraites

Données du **tarif douanier marocain** (ADII) et des **codes régime**, extraites des
PDF par chapitre du dépôt public [`Sudnix1/presaisie-badr`](https://github.com/Sudnix1/presaisie-badr)
(`PDF TARIFFS/` — 98 PDF, ~53 Mo ; `circulaire_81362.pdf`).

> **Extraction au mieux (best-effort), non contractuelle.** Reconstruite par
> lecture de la couche texte des PDF (`scripts/parse-tariff.mjs`, via pdfjs) +
> recomposition des colonnes. Les **codes et désignations sont fiables** ; les
> **droits sont partiels** (≈ 75 % des lignes à 10 chiffres) et dépendent de la
> mise en page. Source faisant foi en production : le flux officiel **ADIL**.

## Fichiers

| Fichier | Contenu |
|---|---|
| `tariff.json` | `[{ code, lvl, chapter, designation, droit, unite }]` — `lvl` = 4 (position), 6 (sous-position), 10 (NGP). `droit` en %, `null` si non extrait. |
| `regimes.json` | `[{ code, label }]` — codes régime issus de la circulaire (n° 6047/312). |

## Couverture (régénérée par `node scripts/parse-tariff.mjs`)

- **13 588 codes** · **87 chapitres** · **8 373 lignes à 10 chiffres** (≈ 75 % avec droit).
- Chapitre déduit des 2 premiers chiffres du code (fiable).
- **Chapitres absents** : 1, 17, 19, 21, 24, 30, 53, 72, 73 (mise en page non reconnue
  par le parseur — à récupérer) ; **77 réservé** dans le SH (normalement vide).
- **Régimes** : 3 (765, 769, 682). La circulaire est ciblée (zones franches Tanger Med),
  ce n'est pas la nomenclature complète des régimes — à compléter par une autre source.

## Régénérer

Voir l'en-tête de [`scripts/parse-tariff.mjs`](../../scripts/parse-tariff.mjs) : déposer les
PDF source dans `tariff_work/` (non versionné, ~53 Mo) puis `node scripts/parse-tariff.mjs`.

## Usage prévu

Référentiel pour **valider / autocompléter** un code SH saisi (la saisie manuelle du
Déclarant). La grille de chiffrage de démonstration (`shared/tariff.js`) reste la source
des droits tant que les taux extraits ne sont pas consolidés.

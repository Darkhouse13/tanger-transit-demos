# Le transit à Tanger — note de recherche

> Brief préparé pour la rencontre avec le dirigeant d'une grande société de transit (commissionnaire en douane / transitaire) à Tanger. Objectif : prouver que nous comprenons leur métier et cibler les vraies pertes de temps et d'argent.
>
> *Les chiffres ci-dessous proviennent de sources publiques (2024–2026) ; ils situent l'ordre de grandeur, pas une vérité contractuelle.*

---

## 1. L'écosystème Tanger Med

- **Tanger Med est le 1er port à conteneurs d'Afrique** et l'un des plus actifs de Méditerranée : **~11,1 millions d'EVP en 2025** (+8,4 % sur un an), ~161 Mt de fret total, capacité conteneurs ~9 M EVP sur 4 terminaux.
- **Zones franches (TFZ / Tanger Med Zones)** : 500+ entreprises (automobile, aéronautique, électronique, textile, agroalimentaire), > 2,6 Md€ d'exports.
- **Lien avec l'Europe** : navette permanente camions/RoRo vers **Algésiras** (~1h20 à travers le détroit de Gibraltar), plus Tarifa, Sète, Gênes, Barcelone.

Sources : Tanger Med Port Authority ; Morocco World News (avr. 2026) ; WorldCargo News (fév. 2026).

## 2. Le métier du transitaire & la DUM

Le **transitaire** (commissionnaire agréé en douane) est l'intermédiaire entre l'importateur/exportateur, les compagnies maritimes, **l'ADII** (Administration des Douanes et Impôts Indirects), l'autorité portuaire et les banques. Son livrable central est la **DUM — Déclaration Unique de Marchandises**, déposée électroniquement dans **BADR**.

Étapes d'un dédouanement import (schéma) :
1. Arrivée du navire ; le transitaire réunit facture, connaissement (BL), liste de colisage, certificat d'origine.
2. Classement tarifaire (**code SH / NGP à 10 chiffres**) + détermination de la valeur en douane (**CIF**).
3. Dépôt de la **DUM dans BADR** → le système affecte un **circuit de contrôle**.
4. Liquidation des droits et taxes (**droit de douane + TVA 20 % + TPI 0,25 %**), paiement (e-paiement bancaire).
5. Contrôle éventuel, **mainlevée (BAE)**, sortie et livraison.

Documents clés : facture commerciale, BL/LTA, liste de colisage, **certificat d'origine** (EUR.1 / A.TR pour les régimes préférentiels UE/Turquie), licences éventuelles.

## 3. Les systèmes : BADR & PortNet

- **BADR** (*Base Automatisée des Douanes en Réseau*, ADII) : système de dédouanement électronique. Toute DUM y est déposée. Affecte un **circuit** :
  - **Vert (~60 %)** : mainlevée automatique.
  - **Orange (~25 %)** : contrôle documentaire.
  - **Rouge (~15 %)** : visite physique → **2 à 5 jours**, + **surestaries ~500–1 500 MAD/jour**.
- **PortNet** : guichet unique national du commerce extérieur ; pré-dédouanement, e-paiement, suivi ; alimente BADR. Maroc reconnu par la CNUCED comme modèle de digitalisation (96 % des procédures dématérialisées).
- **Pas d'API publique** BADR/PortNet pour les tiers : les intégrations sont sur-mesure.

Sources : ADII / douane.gov.ma ; PortNet.ma ; WCO News (dématérialisation) ; Morocco World News (avr. 2026, « 3 heures »).

## 4. Où fuient le temps et l'argent (ce que nous attaquons)

1. **Re-saisie manuelle** des données facture/BL (désignations, valeurs, **codes SH**) dans BADR — 1ère source de retards et d'erreurs ; documents reçus en PDF par e-mail/WhatsApp, sans hand-off structuré.
2. **Classement SH** erroné (10 chiffres) → rejets de DUM, litiges de valeur, **passages en rouge** surprises.
3. **Droits / coût de revient** calculés à la main ou sous Excel ; l'importateur ne connaît son coût total que tard.
4. **Absence de visibilité temps réel** : coordination par e-mail/WhatsApp ; l'importateur téléphone pour savoir « est-ce dédouané ? » ; créneaux d'enlèvement manqués → **surestaries / surestaries évitables (~30 %)**.

## 5. Le paysage logiciel & les manques

- Beaucoup de transitaires s'appuient **directement sur BADR/PortNet + Excel + e-mail/WhatsApp**.
- Acteurs : **Freterium** (TMS marocain, levée 4 M$, peu orienté douane), **Clearcust** (middleware douane), outils mondiaux (Avalara, Zonos, ONESOURCE) peu adaptés au SH marocain à 10 chiffres.
- **Manque clé** : une couche **IA de préparation + validation en amont de BADR** (OCR/extraction de facture, suggestion de code SH, calcul des droits, contrôle du risque), avec données structurées prêtes à déposer.

## 6. Vents porteurs 2026

- **Facturation électronique obligatoire** (DGI) → données de facture structurées.
- **Plateforme blockchain** d'échange de documents commerciaux (pilote ADII).
- **Gestion du risque par IA** à l'ADII (partenariat OMD / SECO).

→ Le moment est idéal pour une couche privée qui **accélère le travail en amont de BADR** et s'aligne sur la feuille de route ADII.

---

## Ce que démontrent nos trois démos

| Démo | Douleur ciblée |
|------|----------------|
| **AI Déclarant** (facture → DUM pré-remplie) | Re-saisie manuelle (#1), classement SH (#2), calcul des droits (#3), risque/circuit |
| **Calculatrice de droits** (description → SH + droits) | Classement SH (#2), coût de revient (#3) |
| **Tableau de bord** (suivi + alertes surestaries) | Visibilité temps réel (#4), surestaries évitables |

**Principe d'architecture (crédibilité) :** l'IA ne fait que **structurer** le texte ; **tout le calcul monétaire et le risque sont du code déterministe** sur une grille tarifaire — remplaçable par le tarif ADIL réel du client. *« L'IA structure, le code calcule. »*

---

### Sources principales
- Tanger Med Port Authority — ports & logistique : <https://www.tangermedport.com/>
- Morocco World News — activité Tanger Med 2025 / réformes douanières 2026
- ADII / Douane Maroc — DUM, dédouanement, BADR : <https://www.douane.gov.ma/>
- PortNet — guichet unique : <https://www.portnet.ma/>
- WCO News — dématérialisation des procédures douanières (Maroc)
- Mordor Intelligence — marché logistique marocain
- Traddal / RTC Suite / EDICOM — droits, TVA, facturation électronique 2026

*Chiffres indicatifs, à actualiser avant toute communication externe.*

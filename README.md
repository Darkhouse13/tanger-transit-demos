# Strait Systems — Démos Transit Tanger

Trois démos web pour une société de transit / dédouanement à Tanger, racontant une histoire : **Préparer → Chiffrer → Suivre**.

1. **AI Déclarant** — facture commerciale → déclaration (DUM) pré-remplie : extraction IA des lignes, suggestion du **code SH à 10 chiffres**, calcul **CIF + droits + TVA 20 % + TPI**, et **circuit de risque** (Vert/Orange/Rouge).
2. **Calculatrice de droits** — description produit (FR/AR) → codes SH candidats + droits + coût de revient, instantané.
3. **Tableau de bord** — suivi de ~10 dossiers à travers les circuits, avec alertes **surestaries** et chronologie de dédouanement.

UI **français + arabe (RTL)**. Données **synthétiques**. Voir [`RESEARCH.md`](./RESEARCH.md) et [`DEMO_IDEAS.md`](./DEMO_IDEAS.md).

## Principe d'architecture (à dire en réunion)
> **L'IA ne fait que structurer le texte. Tout le calcul monétaire et le risque sont du code déterministe** sur une grille tarifaire — *« à facture identique, le résultat est toujours identique »*. La grille (`shared/tariff.js`) est **remplaçable par le tarif ADIL réel** du client.

```
src/            React (Vite) — App + 3 démos + i18n/RTL
server.js       Fastify — /api/extract, /api/classify, /api/shipments
server/         prompts DeepSeek + caller (clé côté serveur uniquement)
shared/         moteur ISOMORPHE (client + serveur) : tariff, classify, landed, risk, enrich, format
data/           factures + dossiers synthétiques
```

## Lancer

```bash
cd tanger_transit
npm install
cp .env.example .env          # (optionnel) renseigner DEEPSEEK_API_KEY pour l'extraction de texte libre
npm run build
npm start                     # http://localhost:8080
```

- **Mode démo hors-ligne (recommandé en réunion)** — aucun réseau / aucune clé requis ; les 5 factures d'exemple fonctionnent (extraction figée, moteur déterministe complet) :
  ```bash
  DEMO_OFFLINE=1 npm start
  ```
- **Itération en dev** : `npm run dev` (port 5173, proxy `/api` → 8080) avec `npm start` dans un second terminal.
- **Clé API** : `DEEPSEEK_API_KEY` sert UNIQUEMENT à extraire une facture **collée** (texte libre). Les exemples et les démos 2 & 3 marchent sans clé. La clé reste **côté serveur** (jamais exposée au navigateur).
- **Test du moteur** (déterminisme) : `node _validate.mjs` — vérifie l'exemple chiffré au dirham près et les 5 circuits attendus.
- **Docker** : `docker build -t tt . && docker run -p 8080:8080 -e DEMO_OFFLINE=1 tt`.

## Script de démo (~4 min)
1. **Déclarant** → cliquer *« Atlas Mobile »* (smartphones sous-évalués) : l'IA extrait, le code propose le SH, calcule les droits, et le dossier passe **Rouge** avec le motif « valeur anormalement basse ». Puis *« Détroit Auto »* → **Vert**. Montrer la **DUM pré-remplie**.
2. **Calculatrice** → taper `قماش قطني` : l'UI bascule en **RTL arabe**, même code SH, mêmes droits que le Déclarant (même moteur).
3. **Tableau de bord** → un dossier **Rouge** accumule des **surestaries** ; ouvrir la chronologie.
4. Conclure : *« L'IA structure, le code calcule — branchez votre tarif ADIL et c'est prêt pour la production. »*

*Tarifs et chiffres illustratifs — démonstration.*

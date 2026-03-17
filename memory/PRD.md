# GreenLink - Product Requirements Document

## Problème Original
Plateforme agritech multi-persona pour la Côte d'Ivoire. Gestion des coopératives agricoles, producteurs, acheteurs, agents terrain et entreprises RSE. Traçabilité EUDR/SSRTE, commerce de récoltes et crédits carbone.

## Architecture
- **Frontend**: React (CRA) + TailwindCSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB Atlas
- **Mobile**: React Native (Expo/EAS)
- **PWA**: Service Worker + IndexedDB (mode offline)

## Personas
1. **Super Admin** — Gestion globale, fixation prix carbone, approbation crédits
2. **Coopérative** — Gestion membres, parcelles, récoltes, lots, soumission crédits carbone
3. **Producteur** — Déclaration parcelles/récoltes, accès marchés, réception primes carbone
4. **Acheteur** — Achat récoltes, traçabilité
5. **Agent Terrain** — Recherche producteurs par téléphone, vérification terrain
6. **Entreprise RSE** — Achat crédits carbone

## Fonctionnalités Implémentées

### Activation & Connexion Membres/Agents (Vérifié Mars 2026)
- Coopérative crée membres (`coop_members`) et agents (`coop_agents`)
- Membre/Agent active son compte via numéro de téléphone (web: `/activate-member`, `/activate-agent`)
- Mobile: `MemberActivationScreen`, `AgentActivationScreen`
- Login par téléphone ou email sur web et mobile
- Flux complet: Création par coop → Vérification téléphone → Activation → Login ✅

### Marché Carbone avec Modèle de Prix Admin (Mars 2026)
- **Soumission**: Coopérative soumet quantité CO2 uniquement (pas le prix)
- **Prix**: Super Admin fixe le prix de vente par tonne
- **Approbation**: Admin approuve avec prix → publication automatique sur le marché
- **Modèle de répartition des revenus**:
  - 30% frais de service
  - 70% restants répartis:
    - **70% agriculteurs** (prime producteur)
    - **25% GreenLink** (revenu plateforme)
    - **5% coopérative** (commission)
- Endpoint simulation: `/api/carbon-listings/simulate-premium`
- Gestion prix par défaut: `/api/carbon-listings/carbon-price`

### Accès Rapide Marchés (Mars 2026)
- Boutons Bourse des Récoltes + Marché Carbone sur dashboards coop, producteur, admin

### Suppression QR Code (Mars 2026)
- Remplacé par recherche par numéro de téléphone

### Système de Recherche Sécurisé Agent (Session précédente)
- Recherche producteur par numéro de téléphone
- RBAC + audit logs pour conformité SSRTE/EUDR

### PWA & Mode Offline (Session précédente)
- Service Worker + manifest.json pour installation
- IndexedDB pour cache données hors-ligne

### Bourse des Récoltes (Sessions précédentes)
- Publication récoltes par producteurs/coopératives
- Formulaire 5 onglets

## Endpoints API Clés
- `POST /api/carbon-listings/submit` — Soumettre crédits (quantité uniquement)
- `PUT /api/carbon-listings/{id}/review` — Approuver avec prix / Rejeter
- `GET /api/carbon-listings/simulate-premium` — Simuler répartition primes
- `GET/PUT /api/carbon-listings/carbon-price` — Prix carbone par défaut
- `POST /api/auth/activate-member-account` — Activation compte membre
- `POST /api/auth/activate-agent-account` — Activation compte agent
- `GET /api/auth/check-member-phone/{phone}` — Vérifier téléphone membre
- `GET /api/auth/check-agent-phone/{phone}` — Vérifier téléphone agent

## Comptes Test
- Admin: klenakan.eric@gmail.com / 474Treckadzo
- Coopérative: coop-gagnoa@greenlink.ci / password
- Agent: agent@greenlink.ci / password

## Issues Connues
- P0: Google Play - hashtags à supprimer (action utilisateur)
- P1: Page blanche inscription web (vérification utilisateur)
- P2: Page blanche après soumission formulaire parcelle

## Backlog (P1-P2)
- Données démo Marketplace Intrants
- Builds APK/AAB v1.21.2
- Intégration Orange Money
- Langues Baoulé/Dioula mobile
- Notifications multi-canal
- Intégration USSD réelle
- Refactoring cooperative.py / auth.py
- Stockage cloud S3

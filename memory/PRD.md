# GreenLink - Product Requirements Document

## Problème Original
Plateforme agritech multi-persona pour la Côte d'Ivoire. Gestion des coopératives agricoles, producteurs, acheteurs, agents terrain et entreprises RSE. Traçabilité EUDR/SSRTE, commerce de récoltes et crédits carbone.

## Architecture
- **Frontend**: React (CRA) + TailwindCSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB Atlas
- **Mobile**: React Native (Expo/EAS)
- **PWA**: Service Worker + IndexedDB (mode offline)

## Personas
1. **Super Admin** — Gestion globale, approbation crédits carbone
2. **Coopérative** — Gestion membres, parcelles, récoltes, lots
3. **Producteur** — Déclaration parcelles/récoltes, accès marchés
4. **Acheteur** — Achat récoltes, traçabilité
5. **Agent Terrain** — Recherche producteurs par téléphone, vérification terrain
6. **Entreprise RSE** — Achat crédits carbone

## Fonctionnalités Implémentées

### Système de Recherche Sécurisé Agent (Session précédente)
- Recherche producteur par numéro de téléphone (remplace QR code)
- RBAC + audit logs pour conformité SSRTE/EUDR
- Dashboard terrain mobile-first `/agent/terrain`

### PWA & Mode Offline (Session précédente)
- Service Worker + manifest.json pour installation
- IndexedDB pour cache données hors-ligne
- Hook `useOfflineSync` pour synchronisation

### Marché Carbone avec Workflow d'Approbation (Session actuelle - Mars 2026)
- **Soumission**: Coopératives/producteurs soumettent crédits carbone (POST /api/carbon-listings/submit)
- **Approbation**: Super Admin examine et approuve/rejette (PUT /api/carbon-listings/{id}/review)
- **Publication**: Crédits approuvés apparaissent sur le Marché Carbone
- **Page d'approbation admin**: `/admin/carbon-approvals`
- **Formulaire soumission**: `/carbon-marketplace/create`
- **Données démo**: Fallback avec 6 projets carbone réalistes quand la base est vide

### Accès Rapide Marchés (Session actuelle)
- Boutons Bourse des Récoltes + Marché Carbone sur dashboard coopérative
- Boutons Bourse des Récoltes + Marché Carbone sur dashboard producteur
- Boutons Approbation Carbone + Marché Carbone sur dashboard admin

### Suppression QR Code (Session actuelle)
- Route `/cooperative/qrcodes` supprimée
- Backend `qrcode_generator` router retiré
- Bouton QR Code remplacé par accès marchés sur dashboard coopérative

### Bourse des Récoltes (Sessions précédentes)
- Publication récoltes par producteurs/coopératives
- Formulaire 5 onglets: Produit, Qualité, Certifications, Traçabilité, Logistique
- Marketplace avec recherche/filtres

## Endpoints API Clés
- `POST /api/carbon-listings/submit` — Soumettre crédits carbone
- `GET /api/carbon-listings/pending` — Soumissions en attente (admin)
- `PUT /api/carbon-listings/{id}/review` — Approuver/rejeter (admin)
- `GET /api/carbon-listings/stats` — Statistiques
- `POST /api/agent/search` — Recherche producteur par téléphone
- `GET/POST /api/sync/*` — Synchronisation offline
- `POST /api/auth/login` — Connexion (identifier + password)
- `GET /api/greenlink/carbon-credits` — Crédits carbone sur le marché

## Schéma DB Clé
- `carbon_listings`: Soumissions crédits carbone (status: pending_approval/approved/rejected)
- `carbon_credits`: Crédits publiés sur le marché
- `audit_logs`: Logs d'accès données agent
- `users`: Tous les utilisateurs (admin, cooperative, producteur, etc.)

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
- Refactoring cooperative.py/auth.py
- Stockage cloud S3

# GreenLink - Product Requirements Document

## Problème Original
Plateforme numérique pour les coopératives de cacao/café en Côte d'Ivoire. Connecte producteurs, coopératives, acheteurs RSE et fournisseurs d'intrants dans un écosystème de commerce durable et de crédits carbone.

## Architecture
- **Frontend**: React + Shadcn/UI + Tailwind CSS
- **Backend**: FastAPI + MongoDB Atlas
- **Mobile**: Expo SDK 53 + React Native
- **Déploiement**: Kubernetes (preview), EAS Build (mobile)

## Utilisateurs
- **Super Admin**: Gestion globale, approbation crédits carbone
- **Coopérative**: Gestion membres, soumission crédits carbone
- **Producteur/Agriculteur**: Parcelles, récoltes, prime carbone
- **Agent de terrain**: Vérification parcelles, visites SSRTE
- **Acheteur RSE**: Achats crédits carbone
- **Fournisseur**: Marketplace intrants

## Fonctionnalités Implémentées

### Authentification
- Inscription par téléphone (+225) et email
- Connexion multi-identifiant (téléphone/email)
- Activation des comptes membres/agents créés par les coopératives
- Profil utilisateur par type

### Carbon Market V2 (Admin-gated workflow)
- Coopératives soumettent des crédits carbone (tonnage)
- Super Admin approuve/rejette et fixe le prix de vente
- Distribution automatique des primes (70% producteur, 25% coopérative, 5% GreenLink)

### Calculatrice Prime Carbone (Producteur)
- Questionnaire en 5 étapes, 8 questions
- Calcul immédiat de la prime estimée en FCFA/kg
- Interface simplifiée (pas de détails de distribution)

### Marketplace Intrants
- 12 produits de démonstration (engrais, pesticides, semences, outils, équipements)
- Recherche et filtrage par catégorie
- Fournisseurs locaux ivoiriens

### Coopérative
- Dashboard avec statistiques
- Gestion des membres (ajout, activation)
- Gestion des parcelles par membre
- Rapports coopérative

### Agent de terrain
- Recherche producteurs par téléphone
- Vérification de parcelles avec géolocalisation
- Formulaires de visites SSRTE
- Photos géolocalisées

### Marketplace Récoltes
- Publication des récoltes par les producteurs
- Système de commandes et panier

### Messagerie
- Système de messages entre utilisateurs
- WebSocket pour temps réel

### Mobile (Expo SDK 53)
- Toutes les fonctionnalités web adaptées au mobile
- Synchronisation hors-ligne
- Notifications push
- Simulateur USSD

## État Actuel (17 Mars 2026)

### Corrections Récentes
- **Écran blanc mobile (P0)**: Corrections appliquées:
  - `metro.config.js` simplifié (suppression blocking Node builtins)
  - `COLORS.accent` ajouté dans `config.js`
  - `app.json` corrigé (photosPermission invalide)
  - `App.js` rendu crash-resilient (try-catch imports services)
  - `sync.js` et `notifications.js` protégés (try-catch top-level)
  - `QRScannerScreen.js` nettoyé (code mort → redirect minimal)
  - **EN ATTENTE**: L'utilisateur doit rebuilder l'APK via EAS pour vérifier
- **Marketplace Intrants**: 12 produits démo ajoutés et vérifiés
- **QR Code**: Complètement supprimé du web et mobile

### Tests (Iteration 26)
- Backend: 19/19 tests passés (100%)
- Frontend: Home, Marketplace, Login, Profile vérifiés (100%)

## Backlog Prioritisé

### P0 (Bloquant)
- [ ] Vérifier que l'APK mobile fonctionne après corrections écran blanc
- [ ] Vérifier les permissions Google Play dans l'AAB final

### P1 (Important)
- [ ] Bug "page blanche" après soumission formulaire Nouvelle Parcelle (à reproduire)
- [ ] Bug "page blanche" après inscription web (non reproduit - peut être résolu)

### P2 (Futur)
- [ ] Intégration Orange Money (paiement réel)
- [ ] Langues Baoulé et Dioula (mobile)
- [ ] Notifications multi-canal (Push, SMS, Email)
- [ ] Intégration USSD réelle
- [ ] Refactoring `cooperative.py` (monolithique)
- [ ] Stockage cloud pour uploads de fichiers

## Credentials de Test
- **Super Admin**: klenakan.eric@gmail.com / 474Treckadzo
- **Coopérative**: coop-gagnoa@greenlink.ci / password
- **Agent**: agent@greenlink.ci / password

## API Endpoints Clés
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `GET /api/marketplace/products` - Liste produits intrants
- `POST /api/carbon-credits/submit` - Soumission crédits (coop)
- `GET /api/carbon-credits/pending` - Crédits en attente (admin)
- `PUT /api/carbon-credits/{id}/approve` - Approbation (admin)
- `POST /api/carbon-premium/calculate` - Calculatrice prime
- `POST /api/marketplace/seed-demo-products` - Seed données démo

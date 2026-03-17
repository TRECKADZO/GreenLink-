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
- 12 produits de démonstration avec images générées par IA
- Recherche et filtrage par catégorie
- Fournisseurs locaux ivoiriens
- Images produits professionnelles pour chaque catégorie

### Mobile App
- Toutes les fonctionnalités web adaptées au mobile
- Synchronisation hors-ligne
- Notifications push
- Corrections écran blanc (metro.config, crash-resilience, etc.)
- Permissions Google Play corrigées (READ_MEDIA_IMAGES/VIDEO supprimées)

## État Actuel (17 Mars 2026)

### Builds Mobile Disponibles
- **APK Preview**: https://expo.dev/artifacts/eas/8tzCa4cbvgcMXyXmhTW2gk.apk
- **AAB Production**: https://expo.dev/artifacts/eas/pAMFd7oCsmus1ZqknjwG3F.aab
- **Permissions vérifiées**: READ_MEDIA_IMAGES/VIDEO confirmées ABSENTES via aapt

### Corrections Appliquées (Session actuelle)
1. `metro.config.js` simplifié (suppression blocking Node builtins)
2. `COLORS.accent` ajouté dans `config.js`
3. `app.json` corrigé (photosPermission invalide supprimé)
4. `App.js` rendu crash-resilient (try-catch imports services)
5. `sync.js` et `notifications.js` protégés (try-catch top-level)
6. `QRScannerScreen.js` nettoyé (code mort -> redirect minimal)
7. 12 images produits générées par IA pour la Marketplace Intrants
8. Frontend Marketplace mis à jour pour afficher les images produits

### Tests (Iteration 26)
- Backend: 19/19 tests passés (100%)
- Frontend: Home, Marketplace, Login, Profile vérifiés (100%)

## Backlog Prioritisé

### P0 (Bloquant)
- [x] Corrections écran blanc mobile - TERMINÉ
- [x] Vérification permissions Google Play - TERMINÉ (confirmé via aapt)
- [ ] **EN ATTENTE**: Test utilisateur de l'APK sur appareil physique

### P1 (Important)
- [ ] Bug "page blanche" après soumission formulaire Nouvelle Parcelle
- [ ] Bug "page blanche" après inscription web (non reproduit)

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

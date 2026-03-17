# GreenLink - Product Requirements Document

## Problème Original
Plateforme numérique pour les coopératives de cacao/café en Côte d'Ivoire.

## Architecture
- **Frontend**: React + Shadcn/UI + Tailwind CSS
- **Backend**: FastAPI + MongoDB Atlas
- **Mobile**: Expo SDK 53 + React Native
- **Déploiement**: Kubernetes (preview), EAS Build (mobile)

## Fonctionnalités Implémentées

### Authentification & Profil
- Inscription par téléphone/email, Connexion multi-identifiant
- Activation comptes membres/agents, Profil par type

### Carbon Market V2
- Soumission crédits (coopératives), Approbation/prix (admin)
- Distribution primes (70/25/5)

### Calculatrice Prime Carbone
- Questionnaire 5 étapes, 8 questions, résultat en FCFA/kg

### Marketplace Intrants
- 12 produits avec images IA, filtrage par catégorie

### PWA Mobile-Optimized (Session actuelle)
- Navbar responsive: hamburger menu mobile, dropdown desktop
- Hero responsive: texte/boutons adaptatifs
- Marketplace responsive: grille 1→2→3→4 colonnes
- Features/CTA responsive
- PWA: manifest corrigé (start_url=/), service worker mis à jour
- Meta tags PWA: theme-color, apple-mobile-web-app

### Mobile App (Expo)
- Corrections écran blanc, permissions Google Play supprimées
- APK/AAB builds disponibles

## État Actuel (17 Mars 2026)

### Tests
- Backend: 19/19 (100%) - Iteration 26
- Frontend: 9/9 (100%) - Iteration 27
- Builds: APK + AAB terminés, permissions vérifiées via aapt

### Builds Mobile
- APK: https://expo.dev/artifacts/eas/8tzCa4cbvgcMXyXmhTW2gk.apk
- AAB: https://expo.dev/artifacts/eas/pAMFd7oCsmus1ZqknjwG3F.aab

## Backlog

### P0
- [ ] Test APK sur appareil physique (écran blanc)
- [ ] Soumission AAB Google Play

### P1
- [ ] Bug "page blanche" formulaire Nouvelle Parcelle
- [ ] Bug "page blanche" après inscription web

### P2
- [ ] Orange Money, Langues Baoulé/Dioula, Notifications multi-canal
- [ ] USSD réel, Refactoring cooperative.py, Stockage cloud

## Credentials
- Admin: klenakan.eric@gmail.com / 474Treckadzo
- Coop: coop-gagnoa@greenlink.ci / password
- Agent: agent@greenlink.ci / password

# GreenLink - Product Requirements Document

## Problème Original
Plateforme numérique pour les coopératives de cacao/café en Côte d'Ivoire.

## Architecture
- **Frontend**: React + Shadcn/UI + Tailwind CSS
- **Backend**: FastAPI + MongoDB Atlas
- **Mobile**: Expo SDK 53 + React Native

## Fonctionnalités Implémentées

### Authentification & Profil
- Inscription par téléphone/email, Connexion multi-identifiant
- Activation comptes membres/agents, Profil par type

### Carbon Market V2 (Admin-gated)
- Soumission crédits (coopératives), Approbation/prix (admin)
- Distribution primes 70/25/5

### Calculatrice Prime Carbone Web
- Questionnaire 5 étapes, 8 questions, résultat FCFA/kg

### USSD Carbon Calculator *144*88# (NEW)
- Simulateur USSD avec design téléphone mobile
- 8 questions: hectares, arbres, culture, engrais, brûlage, compost, agroforesterie, couverture sol
- Calcul stateless (standard USSD protocol, texte accumulé)
- Résultat: score/10, prime FCFA/kg, prime annuelle estimée
- Backend: POST /api/ussd/carbon-calculator
- Frontend: /farmer/prime-carbone
- Lien rapide sur le dashboard producteur

### Marketplace Intrants
- 12 produits avec images IA, filtrage par catégorie

### PWA Mobile-Optimized
- Navbar responsive avec hamburger, Hero/Features/CTA responsive
- PWA manifest corrigé, service worker v2

### Mobile App (Expo SDK 53)
- Corrections écran blanc, permissions Google Play
- APK/AAB builds disponibles

## État Actuel (17 Mars 2026)

### Tests
- Backend: 10/10 USSD + 19/19 API (Iterations 26, 28)
- Frontend: 5/5 USSD + 9/9 UI (Iterations 27, 28)
- Builds mobile: APK + AAB, permissions vérifiées

## Backlog

### P0
- [ ] Test APK sur appareil physique
- [ ] Soumission AAB Google Play

### P1
- [ ] Bug "page blanche" formulaire Nouvelle Parcelle
- [ ] Bug "page blanche" après inscription web

### P2
- [ ] Orange Money (paiement réel)
- [ ] Langues Baoulé/Dioula
- [ ] Notifications multi-canal
- [ ] USSD réel (connecter à gateway telco)
- [ ] Refactoring cooperative.py
- [ ] Stockage cloud uploads

## Credentials
- Admin: klenakan.eric@gmail.com / 474Treckadzo
- Coop: coop-gagnoa@greenlink.ci / password
- Agent: agent@greenlink.ci / password

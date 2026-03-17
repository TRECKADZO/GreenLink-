# GreenLink - Product Requirements Document

## Probleme Original
Plateforme numerique pour les cooperatives de cacao/cafe en Cote d'Ivoire.

## Architecture
- **Frontend**: React + Shadcn/UI + Tailwind CSS
- **Backend**: FastAPI + MongoDB Atlas
- **Mobile**: Expo SDK 53 + React Native

## Fonctionnalites Implementees

### Authentification & Profil
- Inscription par telephone/email, Connexion multi-identifiant
- Activation comptes membres/agents, Profil par type

### Carbon Market V2 (Admin-gated, RSE only)
- Soumission credits (cooperatives), Approbation/prix (admin)
- Distribution primes 70/25/5
- Acces restreint aux entreprises RSE et admins uniquement

### Calculatrice Prime Carbone Web
- Questionnaire 5 etapes, 8 questions, resultat FCFA/kg

### USSD Carbon Calculator *144*88#
- Simulateur USSD avec design telephone mobile
- 8 questions: hectares, arbres, culture, engrais, brulage, compost, agroforesterie, couverture sol
- Backend: POST /api/ussd/carbon-calculator
- Frontend: /farmer/prime-carbone

### Marketplace Intrants
- 12 produits avec images IA, filtrage par categorie

### PWA Mobile-Optimized
- Navbar responsive avec hamburger, Hero/Features/CTA responsive
- PWA manifest corrige, service worker v2

### Mobile App (Expo SDK 53)
- babel.config.js ajoute (manquant), expo-font installe
- newArchEnabled: false, structure App.js ultra-resiliente
- Permissions Google Play verifiees (READ_MEDIA_IMAGES/VIDEO supprimees)

### Controle d'acces Carbon Marketplace (17 Mars 2026)
- Carbon Marketplace accessible UNIQUEMENT par entreprises RSE et admins
- Web: garde d'acces dans CarbonMarketplace.jsx avec redirect + toast
- Web: liens supprimes des dashboards farmer et cooperative
- Web: Navbar filtre conditionnel (RSE/admin uniquement)
- Web: Footer nettoye (lien Carbon supprime)
- Mobile: banniere Carbon supprimee du HomeScreen farmer
- Mobile: CarbonMarketplace retire des quick actions BottomTabBar
- Mobile: liens vers CarbonMarketplace retires de MyCarbonScore et MyCarbonPurchases
- Mobile: garde d'acces dans CarbonMarketplaceScreen avec Alert + goBack

## Etat Actuel (17 Mars 2026)

### Tests
- Backend: 10/10 USSD + 19/19 API
- Frontend: 5/5 USSD + 9/9 UI
- Controle acces Carbon: teste cooperative (redirect OK, toast OK, Navbar OK)
- Builds mobile: APK v1.24.0 en cours

## Backlog

### P0
- [ ] Test APK v1.24.0 sur appareil physique (ecran blanc fix)
- [ ] Soumission AAB Google Play

### P1
- [ ] Bug "page blanche" formulaire Nouvelle Parcelle
- [ ] Bug "page blanche" apres inscription web

### P2
- [ ] Orange Money (paiement reel)
- [ ] Langues Baoule/Dioula
- [ ] Notifications multi-canal
- [ ] USSD reel (connecter a gateway telco)
- [ ] Refactoring cooperative.py
- [ ] Stockage cloud uploads

## Credentials
- Admin: klenakan.eric@gmail.com / 474Treckadzo
- Coop: coop-gagnoa@greenlink.ci / password
- Agent: agent@greenlink.ci / password

# GreenLink - Product Requirements Document

## Probleme Original
Plateforme numerique pour les cooperatives de cacao/cafe en Cote d'Ivoire.

## Architecture
- **Frontend**: React + Shadcn/UI + Tailwind CSS
- **Backend**: FastAPI + MongoDB Atlas
- **Mobile**: Expo SDK 53 + React Native

## Fonctionnalites Implementees

### Authentification et Profil
- Inscription par telephone/email, Connexion multi-identifiant
- Activation comptes membres/agents, Profil par type

### Carbon Market V2 - Workflow Complet (Verifie 17 Mars 2026)
**Etape 1 - Soumission (Cooperative/Agriculteur)**:
- Page "Declarer Tonnage Carbone" accessible depuis dashboard cooperative
- Formulaire: type projet, standard certification, tonnage CO2, localisation
- Route: /cooperative/carbon-submit
- API: POST /api/carbon-listings/submit

**Etape 2 - Approbation (Super Admin)**:
- Page d'approbation avec filtres (En attente, Approuves, Rejetes)
- L'admin fixe le prix de vente par tonne
- Calcul automatique de la repartition (70% farmers, 25% GreenLink, 5% coop)
- Route: /admin/carbon-approvals
- API: PUT /api/carbon-listings/{id}/review

**Etape 3 - Publication (Carbon Marketplace)**:
- Les credits approuves apparaissent dans le Marche Carbone
- Acces RESTREINT aux entreprises RSE et admins uniquement
- Route: /carbon-marketplace
- API: GET /api/carbon-sales/credits

**Suivi cooperative**:
- Page "Mes Soumissions Carbone" avec stats et statuts
- Route: /cooperative/carbon-submissions
- API: GET /api/carbon-listings/my

### Controle d'acces Carbon Marketplace
- Web: garde d'acces avec redirect + toast pour non-RSE
- Web: liens supprimes des dashboards farmer et cooperative
- Web: Navbar filtree conditionnel (RSE/admin uniquement)
- Web: Footer nettoye
- Mobile: banniere et liens supprimes pour farmers
- Mobile: garde d'acces dans CarbonMarketplaceScreen

### Calculatrice Prime Carbone Web
- Questionnaire 5 etapes, 8 questions, resultat FCFA/kg

### USSD Carbon Calculator *144*88#
- Simulateur USSD stateless
- Backend: POST /api/ussd/carbon-calculator
- Frontend: /farmer/prime-carbone

### Marketplace Intrants
- 12 produits avec images IA, filtrage par categorie

### PWA Mobile-Optimized
- Navbar responsive avec hamburger
- PWA manifest et service worker corriges

### Mobile App (Expo SDK 53)
- babel.config.js ajoute, expo-font installe
- newArchEnabled: false, structure App.js ultra-resiliente
- Permissions Google Play verifiees

## Etat Actuel (17 Mars 2026)

### Web: FONCTIONNEL
- Workflow Carbon Market complet et teste
- Controle d'acces RSE verifie

### Mobile: APK v1.24.0 en attente de test utilisateur
- Build: https://expo.dev/accounts/treckadzo/projects/greenlink-farmer/builds/72345002-d65b-410f-a282-6b3be5c5e3d2

## Backlog

### P0
- [ ] Test APK v1.24.0 sur appareil physique (ecran blanc fix)
- [ ] Soumission AAB Google Play

### P1
- [ ] Dashboard RSE dedie avec analytics impact carbone
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

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

### Carbon Market V2 - Workflow Complet
**Etape 1 - Soumission (Cooperative/Agriculteur)**:
- Route: /cooperative/carbon-submit | /cooperative/carbon-submissions
- API: POST /api/carbon-listings/submit | GET /api/carbon-listings/my

**Etape 2 - Approbation (Super Admin)**:
- Route: /admin/carbon-approvals
- API: PUT /api/carbon-listings/{id}/review (fixe prix + approuve)

**Etape 3 - Publication (Carbon Marketplace RSE)**:
- Route: /carbon-marketplace (acces RSE/admin uniquement)
- API: GET /api/carbon-sales/credits

### Repartition des Primes (Verifie 17 Mars 2026)
- 30% couts et frais
- 70% montant net reparti: 70% agriculteurs + 25% GreenLink + 5% cooperative
- Backend: carbon_listings.py (FEES_RATE=0.30, FARMER_SHARE=0.70, GREENLINK_SHARE=0.25, COOP_SHARE=0.05)
- carbon_business_model.py (meme constantes, coherent)
- Verifie sur 8 projets approuves, toutes les distributions sont correctes

### Dashboard RSE avec Analytics Impact
- Route: /rse/dashboard (acces RSE/admin)
- Metriques: CO2 compense, agriculteurs impactes, femmes beneficiaires, arbres plantes
- Visualisation de la repartition des primes (barres visuelles 30/70 et 70/25/5)
- Carte d'impact territorial interactive
- Evolution mensuelle, histoires d'impact
- Export rapport CSRD
- API: GET /api/carbon-listings/distribution-summary

### Controle d'acces Carbon Marketplace
- Web + Mobile: restreint aux entreprises RSE et admins
- Gardes d'acces, redirections, toast/alerts

### USSD Carbon Calculator *144*88#
- Simulateur USSD stateless
- Backend: POST /api/ussd/carbon-calculator

### Mobile App (Expo SDK 53) - v1.24.0
- babel.config.js ajoute, expo-font installe
- newArchEnabled: false, structure App.js ultra-resiliente
- Build: https://expo.dev/accounts/treckadzo/projects/greenlink-farmer/builds/72345002-d65b-410f-a282-6b3be5c5e3d2

## Etat Actuel (17 Mars 2026)
- Web: FONCTIONNEL - Workflow Carbon Market + Dashboard RSE complets
- Mobile: APK v1.24.0 en attente de test utilisateur

## Backlog

### P0
- [ ] Test APK v1.24.0 (ecran blanc fix)
- [ ] Soumission AAB Google Play

### P1
- [ ] Bug "page blanche" formulaire Nouvelle Parcelle
- [ ] Bug "page blanche" apres inscription web

### P2
- [ ] Orange Money (paiement reel)
- [ ] Langues Baoule/Dioula
- [ ] Notifications multi-canal
- [ ] USSD reel (gateway telco)
- [ ] Refactoring cooperative.py
- [ ] Stockage cloud uploads

## Credentials
- Admin: klenakan.eric@gmail.com / 474Treckadzo
- Coop: coop-gagnoa@greenlink.ci / password
- Agent: agent@greenlink.ci / password

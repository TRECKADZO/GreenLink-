# GreenLink - Product Requirements Document

## Probleme Original
Plateforme numerique pour les cooperatives de cacao/cafe en Cote d'Ivoire.

## Architecture
- **Frontend**: React + Shadcn/UI + Tailwind CSS
- **Backend**: FastAPI + MongoDB Atlas
- **Mobile**: Expo SDK 53 + React Native

## Fonctionnalites Implementees

### Carbon Market V2 - Workflow Complet
**Soumission (Cooperative)**: /cooperative/carbon-submit, /cooperative/carbon-submissions
**Approbation (Admin)**: /admin/carbon-approvals (fixe prix + approuve)
**Marketplace RSE**: /carbon-marketplace (acces RSE/admin uniquement)

### Modele de Repartition (CONFIDENTIEL - Admin uniquement)
- 30% couts et frais
- 70% montant net reparti: 70% agriculteurs + 25% GreenLink + 5% cooperative
- Visible UNIQUEMENT dans:
  - Dashboard RSE section distribution (admin uniquement)
  - Endpoint /api/carbon-listings/distribution-summary (admin auth requise)
- CACHE pour: agriculteurs, cooperatives, entreprises RSE, pages publiques

### Calculateurs de Prime Carbone
**Page d'accueil** (CarbonCalculator.jsx):
- Appel API backend /api/ussd/calculate-premium (formule cachee cote serveur)
- Affiche uniquement: score, prime/kg, prime annuelle, CO2/ha
- Aucun detail de repartition expose

**USSD *144*88#** (ussd.py):
- Resultat simplifie: score, prime/kg, prime annuelle
- Aucun taux de distribution dans le texte de reponse

**Ma Prime** (carbon_payments_dashboard.py):
- Resultat simplifie: score, prime/kg, prime annuelle, conseil

### Dashboard RSE avec Analytics
- Section distribution visible admin uniquement (user_type check)
- Impact cards, carte territoriale pour tous les RSE
- Endpoint distribution-summary protege par auth admin

### Controle d'acces
- Carbon Marketplace: RSE + admin uniquement
- Distribution details: admin uniquement
- Dashboard RSE: RSE + admin
- Soumission carbone: cooperatives
- Approbation: admin uniquement

## Etat Actuel (17 Mars 2026)
- Web: FONCTIONNEL - Tout le workflow Carbon Market
- Mobile: APK v1.24.0 en attente de test

## Backlog
### P0
- [ ] Test APK v1.24.0 (ecran blanc fix)
- [ ] Soumission AAB Google Play
### P1
- [ ] Bug pages blanches (Nouvelle Parcelle, inscription)
### P2
- [ ] Orange Money, Langues Baoule/Dioula, Notifications, USSD reel, Refactoring

## Credentials
- Admin: klenakan.eric@gmail.com / 474Treckadzo
- Coop: coop-gagnoa@greenlink.ci / password
- Agent: agent@greenlink.ci / password

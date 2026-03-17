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

### Modele de Repartition (Verifie 17 Mars 2026)
- 30% couts et frais (FEES_RATE = 0.30)
- 70% montant net reparti:
  - 70% agriculteurs (FARMER_SHARE_RATE = 0.70)
  - 25% GreenLink (GREENLINK_MARGIN_RATE = 0.25)
  - 5% cooperative (COOPERATIVE_SHARE_RATE = 0.05)
- Constantes coherentes dans: carbon_listings.py, carbon_business_model.py, carbon_payments_dashboard.py, ussd.py

### Calculateurs de Prime Carbone
**USSD *144*88#** (ussd.py):
- Formule liee au prix RSE moyen de la base de donnees
- Score (0-10) determine le % du max (70% du net)
- CO2/ha = 2 + (score/10) * 6 (2-8 t/ha selon pratiques)
- Prime/kg = (farmer_per_tonne * CO2/ha) / rendement_kg_ha
- Resultat affiche la repartition RSE detaillee

**Ma Prime** (carbon_payments_dashboard.py):
- Formule detaillee avec SEQUESTRATION_RATES
- Prix depuis carbon_config (admin configurable)
- Meme distribution: 30% couts, 70% net, farmer 70% du net

### Dashboard RSE avec Analytics
- Visualisation barres de repartition 30/70 et 70/25/5
- Metriques: revenu total, tonnes CO2, prix moyen, par type de projet
- API: GET /api/carbon-listings/distribution-summary

### Controle d'acces
- Carbon Marketplace: RSE + admin uniquement
- Dashboard RSE: RSE + admin
- Soumission carbone: cooperatives + producteurs
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

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

### Integrations Orange (Preparees - 17 Mars 2026)
**Orange Money** (services/orange_money.py):
- Service avec OAuth 2.0 complet (client_credentials flow)
- Mode MOCK quand credentials absentes
- Initiation paiement, verification statut transaction
- Variables: ORANGE_MONEY_CLIENT_ID, ORANGE_MONEY_CLIENT_SECRET, ORANGE_MERCHANT_KEY

**Orange SMS** (services/orange_sms.py):
- Service avec OAuth 2.0 complet
- Mode MOCK quand credentials absentes
- Templates: OTP, paiement, recolte, prime carbone
- Variables: ORANGE_SMS_CLIENT_ID, ORANGE_SMS_CLIENT_SECRET, ORANGE_SMS_SENDER_NUMBER

**USSD Gateway** (services/ussd_gateway.py):
- Adaptateur multi-fournisseur (Orange, Africa's Talking, Infobip)
- Mode MOCK quand credentials absentes
- Formatage reponses selon le fournisseur
- Variables: USSD_GATEWAY_URL, USSD_GATEWAY_API_KEY, USSD_GATEWAY_PROVIDER

**Endpoint admin**: GET /api/payments/integrations-status
- Statut des 3 services en temps reel
- Accessible uniquement par admin

## Etat Actuel (17 Mars 2026)
- Web: FONCTIONNEL - Tout le workflow Carbon Market
- Mobile: APK v1.24.0 en attente de test utilisateur
- Integrations Orange: PRET (mode MOCK, activer avec credentials reelles)

## Backlog
### P0
- [ ] Test APK v1.24.0 (ecran blanc fix)
- [ ] Soumission AAB Google Play
### P1
- [ ] Bug pages blanches (Nouvelle Parcelle, inscription)
### P2
- [ ] Langues Baoule/Dioula
- [ ] Notifications multi-canal (Push, SMS, Email)
- [ ] Stockage cloud fichiers
- [ ] Refactoring cooperative.py
- [ ] USSD reel (quand passerelle disponible)

## Credentials
- Admin: klenakan.eric@gmail.com / 474Treckadzo
- Coop: coop-gagnoa@greenlink.ci / password
- Agent: agent@greenlink.ci / password

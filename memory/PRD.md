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
- Visible UNIQUEMENT pour admin

### Calculateurs de Prime Carbone
- Page accueil (CarbonCalculator.jsx) via API backend
- USSD *144*88# (ussd.py)
- Ma Prime (carbon_payments_dashboard.py)

### Integrations Orange (Preparees - 17 Mars 2026)
- **Orange Money** (services/orange_money.py): OAuth 2.0, mode MOCK
- **Orange SMS** (services/orange_sms.py): OAuth 2.0, mode MOCK
- **USSD Gateway** (services/ussd_gateway.py): Multi-fournisseur, mode MOCK
- **Endpoint admin**: GET /api/payments/integrations-status
- Tests: 24/24 passes (iteration 29)

### Dashboard Cooperative - Corrections (17 Mars 2026)
- Ajout stat card "Agents Terrain" avec decompte correct (ObjectId matching)
- Ajout bouton "Accueil" (retour page accueil)
- Ajout bouton "Profil"
- Ajout menu "Naturalisation" dans Actions Rapides
- Fix decompte membres avec ObjectId matching (coop_id string vs ObjectId)
- Tests: Backend 10/10, Frontend 7/7 (iteration 30)

### Comptes crees (17 Mars 2026)
- Cooperative Bielaghana: bielaghana@gmail.com / greenlink2024
- Agent Kone Alphone: +2250709005301 / greenlink2024
- Membre Balde ibo (village zebia) sous cooperative Bielaghana

### Builds Mobile (17 Mars 2026)
- APK v1.25.0: https://expo.dev/accounts/treckadzo/projects/greenlink-farmer/builds/84a82645-cb1b-4fbd-80c5-9be5d147fa33
- AAB v1.25.0: https://expo.dev/accounts/treckadzo/projects/greenlink-farmer/builds/42b992b9-5c8c-47e5-990a-8c15367a9735

## Etat Actuel
- Web: FONCTIONNEL
- Mobile: APK/AAB v1.25.0 en build
- Integrations Orange: PRET (mode MOCK)

## Backlog
### P0
- [ ] Test APK v1.25.0 (ecran blanc fix)
- [ ] Soumission AAB Google Play
### P1
- [ ] Bug pages blanches mobile (Nouvelle Parcelle, inscription)
### P2
- [ ] Langues Baoule/Dioula
- [ ] Notifications multi-canal (Push, SMS, Email)
- [ ] Stockage cloud fichiers
- [ ] Refactoring cooperative.py

## Credentials
- Admin: klenakan.eric@gmail.com / 474Treckadzo
- Coop Gagnoa: coop-gagnoa@greenlink.ci / password
- Coop Bielaghana: bielaghana@gmail.com / greenlink2024
- Agent Kone: +2250709005301 / greenlink2024
- Agent test: agent@greenlink.ci / password

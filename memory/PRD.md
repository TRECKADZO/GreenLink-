# GreenLink - Product Requirements Document

## Probleme Original
Plateforme numerique pour les cooperatives de cacao/cafe en Cote d'Ivoire.

## Architecture
- **Frontend**: React + Shadcn/UI + Tailwind CSS
- **Backend**: FastAPI + MongoDB Atlas
- **Mobile**: Expo SDK 53 + React Native

## Fonctionnalites Implementees

### Carbon Market V2 - Workflow Complet
- Soumission (Cooperative): /cooperative/carbon-submit, /cooperative/carbon-submissions
- Approbation (Admin): /admin/carbon-approvals
- Marketplace RSE: /carbon-marketplace (acces RSE/admin uniquement)

### Modele de Repartition (CONFIDENTIEL - Admin uniquement)
- 30% couts et frais, 70% net: 70% agriculteurs + 25% GreenLink + 5% cooperative

### Calculateurs de Prime Carbone
- Page accueil, USSD *144*88#, Ma Prime - tous via API backend (formule cachee)

### Integrations Orange (Preparees - 17 Mars 2026)
- Orange Money (services/orange_money.py): OAuth 2.0, mode MOCK
- Orange SMS (services/orange_sms.py): OAuth 2.0, mode MOCK
- USSD Gateway (services/ussd_gateway.py): Multi-fournisseur, mode MOCK
- Endpoint admin: GET /api/payments/integrations-status
- Tests: 24/24 passes (iteration 29)

### Dashboard Cooperative - Corrections (17 Mars 2026)
- Stat card "Agents Terrain" avec decompte (ObjectId matching)
- Boutons "Accueil" et "Profil" dans le header
- Menu "Naturalisation" dans Actions Rapides
- Fix decompte membres/agents avec ObjectId matching
- Tests: Backend 10/10, Frontend 7/7 (iteration 30)

### Dashboard Agent Terrain - NOUVEAU (17 Mars 2026)
- Header: nom agent, cooperative, badge niveau (Debutant/Confirme/Expert), score performance
- KPI Cards avec barres de progression: Visites SSRTE, Membres Enregistres, Parcelles Declarees, Photos Geotag
- Objectifs mensuels: 20 visites, 10 membres, 15 parcelles, 30 photos
- Stats supplementaires: QR Scannes, Enfants identifies
- Distribution des risques (critique/eleve/modere/faible)
- Badges/Achievements debloques
- Activites recentes
- Actions rapides: Visite SSRTE, Recherche Planteur, Scanner QR
- Onglet Recherche: trouver un planteur par telephone
- Boutons Accueil et Profil
- Backend: GET /api/field-agent/dashboard, /leaderboard, /my-visits
- Fix ObjectId matching pour GET /api/cooperative/agents
- Tests: Backend 16/16, Frontend 95% -> 100% apres fix header (iteration 31)

### Comptes crees (17 Mars 2026)
- Cooperative Bielaghana: bielaghana@gmail.com / greenlink2024
- Agent Kone Alphone: +2250709005301 / greenlink2024
- Membre Balde ibo (village zebia)

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
- [ ] Notifications multi-canal
- [ ] Stockage cloud fichiers
- [ ] Refactoring cooperative.py

## Credentials
- Admin: klenakan.eric@gmail.com / 474Treckadzo
- Coop Gagnoa: coop-gagnoa@greenlink.ci / password
- Coop Bielaghana: bielaghana@gmail.com / greenlink2024
- Agent Kone: +2250709005301 / greenlink2024
- Agent test: agent@greenlink.ci / password

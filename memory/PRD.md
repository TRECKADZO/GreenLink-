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

### Integrations Orange (Preparees)
- Orange Money (services/orange_money.py): OAuth 2.0, mode MOCK
- Orange SMS (services/orange_sms.py): OAuth 2.0, mode MOCK
- USSD Gateway (services/ussd_gateway.py): Multi-fournisseur, mode MOCK
- Endpoint admin: GET /api/payments/integrations-status

### Dashboard Cooperative - Corrections
- Stat card "Agents Terrain" avec decompte (ObjectId matching)
- Boutons "Accueil" et "Profil" dans le header
- Menu "Naturalisation" dans Actions Rapides
- Fix decompte membres/agents avec ObjectId matching

### Dashboard Agent Terrain
- Header: nom agent, cooperative, badge niveau, score performance
- KPI Cards: Visites SSRTE, Membres Enregistres, Parcelles Declarees, Photos Geotag
- Objectifs mensuels, stats supplementaires, distribution risques
- Actions rapides, recherche planteur, badges

### Attribution Fermier-Agent Terrain (17 Mars 2026)
- Backend: 5 endpoints (assign, unassign, list assigned, agents enrichis, my-farmers offline)
- Frontend: Modale d'attribution dans /cooperative/agents
- Mobile: Pre-chargement offline dans sync.js + getOfflineFarmers()
- Regle metier: un fermier = un seul agent
- Tests: 13/13 backend, 100% frontend (iteration 32)

### Builds Mobile v1.27.0 (17 Mars 2026)
- APK: https://expo.dev/artifacts/eas/fViHgUZYjEMmyLkBFF7oB3.apk
- AAB: https://expo.dev/artifacts/eas/tJdqAxSgdRRbmtG4exKMwj.aab
- Build APK: https://expo.dev/accounts/treckadzo/projects/greenlink-farmer/builds/78d146b6-df33-4001-8469-c13bd63c5508
- Build AAB: https://expo.dev/accounts/treckadzo/projects/greenlink-farmer/builds/e08ba385-d49f-4f86-b8bf-f78f151902ba

## Etat Actuel
- Web: FONCTIONNEL
- Mobile: APK/AAB v1.27.0 prets
- Integrations Orange: PRET (mode MOCK)
- Attribution fermier-agent: FONCTIONNEL

## Backlog
### P1
- [ ] Soumission AAB v1.27.0 Google Play
- [ ] Bug pages blanches mobile (Nouvelle Parcelle, inscription)
### P2
- [ ] Langues Baoule/Dioula
- [ ] Notifications multi-canal
- [ ] Stockage cloud fichiers
- [ ] Refactoring cooperative.py et ssrte.py

## Credentials
- Admin: klenakan.eric@gmail.com / 474Treckadzo
- Coop Bielaghana: bielaghana@gmail.com / greenlink2024
- Coop Cacao: coopcacao@greenlink.ci / greenlink2024
- Agent Kone: +2250709005301 / greenlink2024
- Agent Cacao: +2250709005310 / greenlink2024

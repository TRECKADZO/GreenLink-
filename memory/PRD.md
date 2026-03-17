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

### Attribution Fermier-Agent Terrain - NOUVEAU (17 Mars 2026)
- **Backend** - 5 endpoints:
  - GET /api/cooperative/agents (enrichi: assigned_farmers_count, assigned_farmers)
  - POST /api/cooperative/agents/{id}/assign-farmers
  - POST /api/cooperative/agents/{id}/unassign-farmers
  - GET /api/cooperative/agents/{id}/assigned-farmers
  - GET /api/field-agent/my-farmers (donnees enrichies pour offline mobile)
- **Frontend** - Page /cooperative/agents:
  - Bouton "Attribuer" sur chaque carte agent
  - Modale d'attribution avec liste membres, recherche, checkboxes
  - Section "Fermiers assignes" avec bouton Retirer
  - Badge "Deja assigne" pour fermiers deja attribues
  - Indicateur "Chez [autre agent]" pour reassignation
- **Mobile** - sync.js:
  - Pre-chargement automatique des fermiers assignes (AsyncStorage)
  - Methode getOfflineFarmers() pour acces hors-ligne
- **Regle metier**: Un fermier ne peut etre assigne qu'a un seul agent (reassignation automatique)
- **Tests**: 13/13 backend, 100% frontend (iteration 32)

### Comptes crees
- Cooperative Bielaghana: bielaghana@gmail.com / greenlink2024
- Cooperative Cacao: coopcacao@greenlink.ci / greenlink2024
- Agent Kone Alphone: +2250709005301 / greenlink2024
- Agent Coop Cacao: +2250709005310 / greenlink2024

### Builds Mobile
- APK/AAB v1.26.0 disponibles

## Etat Actuel
- Web: FONCTIONNEL
- Mobile: APK/AAB v1.26.0
- Integrations Orange: PRET (mode MOCK)
- Attribution fermier-agent: FONCTIONNEL

## Backlog
### P0
- [ ] Soumission AAB v1.26.0 Google Play
### P1
- [ ] Guide soumission Google Play Store
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

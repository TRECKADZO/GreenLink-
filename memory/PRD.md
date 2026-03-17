# GreenLink - Product Requirements Document

## Probleme Original
Plateforme numerique pour les cooperatives de cacao/cafe en Cote d'Ivoire.

## Architecture
- **Frontend**: React + Shadcn/UI + Tailwind CSS
- **Backend**: FastAPI + MongoDB Atlas
- **Mobile**: Expo SDK 53 + React Native

## Fonctionnalites Implementees

### Carbon Market V2 - Workflow Complet
- Soumission, Approbation, Marketplace RSE

### Modele de Repartition (CONFIDENTIEL - Admin uniquement)
- 30% couts et frais, 70% net: 70% agriculteurs + 25% GreenLink + 5% cooperative

### Integrations Orange (Preparees - MOCK)
- Orange Money, Orange SMS, USSD Gateway

### Dashboard Cooperative - Corrections
- Stats, boutons nav, ObjectId matching

### Dashboard Agent Terrain
- KPIs, Objectifs, Actions rapides, Badges

### Attribution Fermier-Agent Terrain (17 Mars 2026)
- Backend: 5 endpoints API (assign, unassign, list, agents enrichis, my-farmers offline)
- Frontend: Modale attribution dans /cooperative/agents
- Mobile: Pre-chargement offline dans sync.js
- Tests: 13/13 backend, 100% frontend

### Interface Agent Terrain Mobile Specifique (17 Mars 2026)
- **BottomTabBar**: Config `field_agent` ajoutee (Accueil, Fermiers, Plus, Visites, Profil)
- **Actions Rapides Agent**: Visite SSRTE, Recherche Planteur, Photo Geo, Nouveau Membre, Verif Parcelle, Messagerie, Stats
- **ProfileScreen**: Affiche "Agent Terrain" (pas "Producteur"), champs Zone et Cooperative
- **FieldAgentDashboard**: Enveloppe dans MainLayout avec barre onglets agent specifique, suppression bouton retour

### Builds Mobile v1.27.1 (17 Mars 2026)
- APK: https://expo.dev/artifacts/eas/sTauSngohed1JrxTesFirG.apk
- AAB: https://expo.dev/artifacts/eas/s7qaLmsDR4G6Zz2tfbEixs.aab
- Build APK: https://expo.dev/accounts/treckadzo/projects/greenlink-farmer/builds/d9b263ff-4ce9-4802-9717-d042111fff4e
- Build AAB: https://expo.dev/accounts/treckadzo/projects/greenlink-farmer/builds/d372f649-7dc1-40ed-a12a-12dcac8fdc14

## Etat Actuel
- Web: FONCTIONNEL
- Mobile: v1.27.1 (APK + AAB prets)
- Integrations Orange: MOCK

## Backlog
### P1
- [ ] Soumission AAB Google Play
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

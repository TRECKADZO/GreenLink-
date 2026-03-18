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

### Dashboard Cooperative & Agent Terrain
- Dashboard cooperative avec stats corrigees
- Dashboard agent terrain avec KPIs et quick actions

### Attribution Fermier-Agent Terrain (17 Mars 2026)
- Backend: 5 endpoints API (assign, unassign, list, agents enrichis, my-farmers offline)
- Frontend: Modale attribution dans /cooperative/agents
- Mobile: Pre-chargement offline dans sync.js
- Tests: 13/13 backend, 100% frontend (iteration 32)

### Interface Agent Terrain Mobile (17 Mars 2026)
- BottomTabBar: Config field_agent (Accueil, Fermiers, Plus, Visites, Profil)
- Actions Rapides: Visite SSRTE, Recherche, Fiche ICI, Photo Geo, Nouveau Membre
- ProfileScreen: "Agent Terrain", champs Zone et Cooperative
- FieldAgentDashboard: MainLayout avec barre onglets agent

### Fiche ICI (18 Mars 2026)
- Backend: ChildDetail (prenom, sexe, age, scolarise, travaille), calcul risque
- Frontend Web: ICIProfileModal dans attribution
- Mobile: FarmerICIFormScreen avec support offline
- Tests: 11/11 backend, 100% frontend (iteration 33)

### Fix Normalisation Telephone Membre (18 Mars 2026)
- check-member-phone: ajout normalize_phone()
- activate-member-account: ajout normalize_phone() + coop_id ObjectId fix

### Builds Mobile v1.28.0 (18 Mars 2026)
- APK: https://expo.dev/artifacts/eas/tK8crCWFjZ1QHTyhc1E3Jj.apk
- AAB: https://expo.dev/artifacts/eas/kVdYqUSAoHcsaGXaqvXaj4.aab

## Etat Actuel
- Web: FONCTIONNEL
- Mobile: v1.28.0 (APK + AAB prets)
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

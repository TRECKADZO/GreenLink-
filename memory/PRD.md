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

### Interface Agent Terrain Mobile Specifique (17 Mars 2026)
- BottomTabBar: Config field_agent (Accueil, Fermiers, Plus, Visites, Profil)
- Actions Rapides Agent: Visite SSRTE, Recherche, Fiche ICI, Photo Geo, Nouveau Membre, Verif Parcelle
- ProfileScreen: Affiche "Agent Terrain", champs Zone et Cooperative
- FieldAgentDashboard: MainLayout avec barre onglets agent

### Fiche ICI (Indice Composite de l'Enfant) (18 Mars 2026)
- **Backend** - Modele enrichi:
  - ChildDetail: prenom, sexe (Fille/Garcon), age (0-17), scolarise, travaille_exploitation
  - HouseholdChildData: liste_enfants (liste detaillee), totaux auto-calcules
  - Acces ouvert aux field_agent (pas seulement admin/cooperative)
  - Calcul automatique du score de risque travail enfants
  - Alertes generees si risque ELEVE
- **Frontend Web** - ICIProfileModal.jsx:
  - Accessible depuis le bouton "ICI" dans la modale d'attribution (fermiers assignes)
  - Infos producteur: genre, education, taille menage, alphabetisation
  - Enfants: ajout individuel avec prenom, sexe, age, scolarise, travaille
  - Resume automatique: scolarises, travaillant, total
  - Pratiques: pesticides, formation securite, epargne, main-d'oeuvre
  - Badge risque avec score
- **Mobile** - FarmerICIFormScreen.js:
  - Ecran complet pour agents terrain
  - Support offline (cache AsyncStorage + pendingActions)
  - Navigation depuis Quick Actions (Fiche ICI) et liste fermiers
  - Memes champs que version web
- **Tests**: 11/11 backend, 100% frontend (iteration 33)

### Builds Mobile
- v1.27.1 APK: https://expo.dev/artifacts/eas/sTauSngohed1JrxTesFirG.apk
- v1.27.1 AAB: https://expo.dev/artifacts/eas/s7qaLmsDR4G6Zz2tfbEixs.aab

## Etat Actuel
- Web: FONCTIONNEL
- Mobile: v1.27.1 (APK + AAB prets)
- Integrations Orange: MOCK
- Attribution fermier-agent: FONCTIONNEL
- Fiche ICI: FONCTIONNEL (web + backend, mobile a rebuilder)

## Backlog
### P0
- [ ] Rebuild APK/AAB avec Fiche ICI mobile + interface agent
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

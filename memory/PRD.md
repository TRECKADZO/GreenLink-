# GreenLink - Product Requirements Document

## Probleme Original
Plateforme numerique pour les cooperatives de cacao/cafe en Cote d'Ivoire.

## Architecture
- **Frontend**: React + Shadcn/UI + Tailwind CSS
- **Backend**: FastAPI + MongoDB Atlas
- **Mobile**: Expo SDK 53 + React Native

## Fonctionnalites Implementees

### Attribution Fermier-Agent (17 Mars 2026)
- 5 endpoints API, modale attribution web, offline mobile
- Tests: 13/13 backend (iteration 32)

### Fiche ICI (18 Mars 2026)
- ChildDetail (prenom, sexe, age, scolarise, travaille), calcul risque
- Web: ICIProfileModal, Mobile: FarmerICIFormScreen avec offline
- Tests: 11/11 backend (iteration 33)

### Dashboard Agent Terrain Web Complet (18 Mars 2026)
- 8 sections menu lateral: Dashboard, SSRTE, ICI, Membres, Parcelles, Photos, Enfants, Recherche
- Tests: 100% frontend (iteration 34)

### Interface Agent Terrain Mobile Complete (18 Mars 2026)
- **BottomTabBar**: 5 onglets (Accueil, Fermiers, Plus, Visites, Profil)
- **Quick Actions**: 8 items (SSRTE, Recherche, Fiche ICI, Photo Geo, Nouveau Membre, Verif Parcelle, Messagerie, Notifications)
- **Dashboard**: 6 actions rapides en grille (SSRTE, Visite ICI, Nouveau Membre, Parcelles, Photo Geo, Recherche)
- **FarmerICIForm**: Affiche liste fermiers assignes si ouvert sans parametre
- **ProfileScreen**: "Agent Terrain" avec Zone et Cooperative
- **FieldAgentDashboard**: Dans MainLayout avec barre onglets agent
- **Tous les ecrans registres dans AppContent.js**

### Fix Normalisation Telephone Membre (18 Mars 2026)
- check-member-phone + activate-member-account: normalize_phone()

### Builds Mobile
- v1.28.0 APK: https://expo.dev/artifacts/eas/tK8crCWFjZ1QHTyhc1E3Jj.apk
- v1.28.0 AAB: https://expo.dev/artifacts/eas/kVdYqUSAoHcsaGXaqvXaj4.aab
- Note: v1.28.0 ne contient PAS les derniers changements (grille actions, selection fermier ICI). Rebuild necessaire.

## Etat Actuel
- Web: FONCTIONNEL (dashboard agent complet)
- Mobile: Code complet, rebuild necessaire pour integrer les derniers changements

## Backlog
### P0
- [ ] Rebuild APK/AAB v1.29.0
### P1
- [ ] Soumission AAB Google Play
- [ ] Bug pages blanches mobile
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

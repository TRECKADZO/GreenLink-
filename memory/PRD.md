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

### Fiche ICI (18 Mars 2026)
- ChildDetail (prenom, sexe, age, scolarise, travaille)
- Web: ICIProfileModal, Mobile: FarmerICIFormScreen

### Approche "Selection Fermier → Toutes les Fiches" (18 Mars 2026)
- **Web**: Menu simplifie (Dashboard, Mes Agriculteurs, Recherche)
  - Clic sur fermier → page profil avec 6 fiches: ICI, SSRTE, Enfants, Parcelles, Photos, Enregistrement
- **Mobile**: FarmerProfileScreen cree
  - Dashboard affiche "Mes Agriculteurs" avec navigation vers profil
  - Profil fermier = 5 fiches a remplir (ICI, SSRTE, Parcelles, Photos, Enregistrement)
  - FarmerICIForm: liste fermiers si pas de farmerId

### Interface Agent Terrain Mobile
- BottomTabBar field_agent, Quick Actions 8 items, Dashboard 6 actions grille
- Section "Mes Agriculteurs" dans dashboard avec navigation vers profils
- ProfileScreen "Agent Terrain", MainLayout

### Fix Normalisation Telephone Membre (18 Mars 2026)
- check-member-phone + activate-member-account: normalize_phone()

### Builds Mobile
- v1.28.0 APK/AAB (precedent, pas a jour)
- Rebuild necessaire v1.29.0

## Etat Actuel
- Web: FONCTIONNEL
- Mobile: Code complet, rebuild necessaire

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
- Agent Kone: +2250709005301 / greenlink2024

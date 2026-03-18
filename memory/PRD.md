# GreenLink - Product Requirements Document

## Probleme Original
Plateforme numerique pour les cooperatives de cacao/cafe en Cote d'Ivoire.

## Architecture
- **Frontend**: React + Shadcn/UI + Tailwind CSS
- **Backend**: FastAPI + MongoDB Atlas
- **Mobile**: Expo SDK 53 + React Native

## Fonctionnalites Implementees

### Carbon Market V2
- Soumission, Approbation, Marketplace RSE

### Modele de Repartition (CONFIDENTIEL - Admin uniquement)
- 30% couts, 70% net: 70% agriculteurs + 25% GreenLink + 5% cooperative

### Integrations Orange (MOCK)
- Orange Money, Orange SMS, USSD Gateway

### Attribution Fermier-Agent (17 Mars 2026)
- 5 endpoints API, modale attribution web, offline mobile
- Tests: 13/13 backend (iteration 32)

### Fiche ICI (18 Mars 2026)
- ChildDetail: prenom, sexe (Fille/Garcon), age, scolarise, travaille
- Web: ICIProfileModal dans attribution + dashboard agent
- Mobile: FarmerICIFormScreen avec offline
- Tests: 11/11 backend (iteration 33)

### Dashboard Agent Terrain Web - Menu Complet (18 Mars 2026)
- **8 sections dans le menu lateral:**
  1. Tableau de bord (KPIs, performance, risques, badges, activites)
  2. Visites SSRTE (stats + liste fermiers)
  3. Visite ICI (fiche producteur ICI avec enfants)
  4. Enregistrement membres (stats + liste)
  5. Declaration parcelles (stats + details parcelles par fermier)
  6. Photos geolocalisees (stats + objectifs)
  7. Suivi travail enfants (stats enfants + liens fiches ICI)
  8. Recherche planteur (recherche par telephone)
- Header: nom agent, cooperative, badge niveau, score performance
- "ICI" renomme "Visite ICI" partout (web)
- Tests: 100% frontend (iteration 34)

### Interface Agent Terrain Mobile (17 Mars 2026)
- BottomTabBar field_agent, Actions Rapides, ProfileScreen "Agent Terrain"
- FieldAgentDashboard dans MainLayout

### Fix Normalisation Telephone Membre (18 Mars 2026)
- check-member-phone + activate-member-account: normalize_phone()

### Builds Mobile
- v1.28.0 APK: https://expo.dev/artifacts/eas/tK8crCWFjZ1QHTyhc1E3Jj.apk
- v1.28.0 AAB: https://expo.dev/artifacts/eas/kVdYqUSAoHcsaGXaqvXaj4.aab

## Etat Actuel
- Web: FONCTIONNEL (dashboard agent complet)
- Mobile: v1.28.0 (APK + AAB)
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

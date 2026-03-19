# GreenLink - Product Requirements Document

## Probleme Original
Plateforme numerique pour les cooperatives de cacao/cafe en Cote d'Ivoire.

## Architecture
- **Frontend**: React + Shadcn/UI + Tailwind CSS
- **Backend**: FastAPI + MongoDB Atlas
- **Mobile**: Expo SDK 53 + React Native

## Fonctionnalites Implementees

### Recuperation mot de passe telephone (19 Mars 2026)
- Backend: /api/auth/forgot-password retourne TOUJOURS simulation_code (SMS mocks)
- Web: page ForgotPassword affiche le code dans boite "Mode Simulation"
- Mobile: ecran ForgotPasswordScreen affiche le code, flow complet (forgot -> verify -> reset)

### Attribution Admin Globale Agriculteurs-Agents (19 Mars 2026)
- Backend: GET /api/admin/agents - liste tous les agents (8) avec cooperative
- Backend: GET /api/admin/all-farmers - liste TOUS agriculteurs (43) membres + non-membres
- Backend: POST /api/admin/assign-farmers-to-agent - attribution sans restriction cooperative
- Frontend: nouvelle page /admin/farmer-assignment avec recherche + selection
- Frontend: bouton "Attribution" ajoute au dashboard admin

### Inscription Web: Agent Terrain supprime (19 Mars 2026)
- Option "Agent Terrain" retiree de Register.jsx (crees uniquement par cooperatives/admin)

### Fix double /api mobile (19 Mars 2026)
- config.js: API_URL ne contient plus /api (base URL seulement)
- api.js: baseURL = CONFIG.API_URL + '/api'
- Tous les ecrans utilisent ${API_URL}/api/... de maniere coherente

### Historique ICI + SSRTE dans profil agriculteur (19 Mars 2026)
- Backend: nouvel endpoint GET /api/ici-data/farmers/{id}/history (ICI profile + SSRTE visits + risk evolution)
- Web: composant FarmerHistorySection avec onglets SSRTE/ICI, visites expandables, evolution risque
- Mobile: section historique ajoutee dans FarmerProfileScreen avec memes fonctionnalites
- Indicateur evolution risque: amelioration/degradation/stable

### Fix Visite SSRTE ouvre modal specifique (19 Mars 2026)
- Web: "Visite SSRTE" naviguait vers /agent/ssrte (dashboard generique) au lieu du formulaire
- Cree SSRTEVisitModal.jsx: modal avec champs observation, taches dangereuses, risque, support, recommandations
- Integre dans AgentTerrainDashboard: ouvre le modal pour l'agriculteur selectionne
- Teste: soumission reussie avec toast "Visite SSRTE enregistree"

### Suppression doublon "Suivi travail enfants" (19 Mars 2026)
- Web: Supprime la fiche "Suivi travail enfants" (id=children) qui etait un doublon de Fiche ICI
- Le handleFormAction ouvrait le meme modal ICI pour les deux
- Maintenant 5 fiches uniquement: ICI, SSRTE, Parcelles, Photos, Enregistrement
- Descriptions clarifiees pour distinguer ICI (evaluation initiale) et SSRTE (visite terrain)
- Mobile: Descriptions aussi mises a jour dans FarmerProfileScreen

### Fix API_URL Export Mobile - Root Cause (19 Mars 2026)
- Bug CRITIQUE: config.js n'exportait pas API_URL comme export nomme
- 11 ecrans importaient { API_URL } et recevaient undefined
- Impact: TOUTES les requetes fetch directes echouaient (ICI save, refresh profile, etc.)
- Fix: Ajoute export const API_URL = CONFIG.API_URL dans config.js

### Fix Navigation SSRTE Mobile (19 Mars 2026)
- Bug: "Visite SSRTE" depuis FarmerProfile ne passait pas farmerData au formulaire
- Fix FarmerProfileScreen.js: handleOpenForm passe maintenant farmerData: f en plus de farmerId et farmerName
- Fix SSRTEVisitFormScreen.js: destructure farmerName depuis route.params comme fallback
- Backend: endpoint POST /api/ici-data/ssrte/visit valide et fonctionnel pour field_agent

### Build Mobile v1.33.0 (19 Mars 2026)
- APK: https://expo.dev/artifacts/eas/49BprsiA4wLbLNAaLt53X1.apk
- AAB: https://expo.dev/artifacts/eas/fdeQ3vTafF5mU721kU6yVD.aab

## Services MOCK
- Orange Money, Orange SMS, USSD Gateway, Email
- simulation_code toujours retourne dans forgot-password

## Backlog
### P1
- [ ] Soumission AAB Google Play Store
- [ ] Configurer SMTP pour emails reels
### P2
- [ ] Langues Baoule/Dioula
- [ ] Stockage cloud fichiers
- [ ] Refactoring cooperative.py et ssrte.py

## Credentials
- Admin: klenakan.eric@gmail.com / 474Treckadzo
- Coop: bielaghana@gmail.com / greenlink2024
- Agent: +2250709005301 / greenlink2024

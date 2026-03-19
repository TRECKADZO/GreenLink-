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

### Fix Login Comptes Telephone - EmailStr Vide (19 Mars 2026)
- Bug CRITIQUE P0: les comptes crees avec telephone uniquement avaient email="" en base
- Pydantic EmailStr rejetait la chaine vide -> erreur 500 sur POST /api/auth/login
- Fix: pre-validateur clean_empty_email dans UserBase convertit "" en None avant validation
- Aussi corrige: lookups ObjectId inconsistants dans check-agent-phone et activate-agent-account
- Teste: login telephone OK, login email OK (regression), activation membre OK

### Notifications Email Automatiques (19 Mars 2026)
- 6 hooks de notification ajoutes (fire-and-forget via asyncio.create_task):
  1. Activation membre -> email bienvenue au membre + alerte cooperative
  2. Activation agent -> email bienvenue a l'agent + alerte cooperative
  3. Recolte declaree -> notification a la cooperative (quantite, prime carbone)
  4. Visite SSRTE effectuee -> notification a la cooperative (risque, enfants)
  5. Agriculteur assigne a agent -> notification a l'agent (noms agriculteurs)
  6. Parcelle verifiee -> notification a l'agriculteur (statut, score carbone)
- Nouveau fichier: services/notification_email_helper.py (dispatcher + helpers DB lookup)
- Teste: 13/13 backend tests OK, notifications fire-and-forget ne bloquent pas les endpoints

### Integration Resend Email (19 Mars 2026)
- Service email reel configure avec Resend API (cle: re_MfK...)
- email_service.py reecrit: send_email() synchrone + send_email_async() non-bloquant
- Templates: password_reset, quote_approved, quote_rejected, account_suspended, account_activated, welcome
- forgot-password: envoie un vrai email quand l'utilisateur a un email, sinon simulation_code pour telephone
- Frontend web + mobile mis a jour: affiche "Email envoye" ou "Mode Simulation SMS" selon le cas
- Domaine greenlink-agritech.com verifie - envoi vers tous destinataires OK
- SENDER_EMAIL: noreply@greenlink-agritech.com

## Services MOCK
- Orange Money, Orange SMS, USSD Gateway
- simulation_code retourne uniquement pour comptes telephone (forgot-password)
- Resend email operationnel (domaine greenlink-agritech.com verifie)

## Backlog
### P1
- [x] Verifier domaine Resend pour debloquer envoi vers tous destinataires (FAIT)
- [ ] Soumission AAB Google Play Store
### P1.5
- [ ] Configurer Orange SMS API (en attente des cles)
### P2
- [ ] Langues Baoule/Dioula
- [ ] Stockage cloud fichiers
- [ ] Refactoring cooperative.py et ssrte.py

## Credentials
- Admin: klenakan.eric@gmail.com / 474Treckadzo
- Coop: bielaghana@gmail.com / greenlink2024
- Agent: +2250709005301 / greenlink2024

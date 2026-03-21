# GreenLink - Product Requirements Document

## Probleme Original
Plateforme numerique pour les cooperatives de cacao/cafe en Cote d'Ivoire.

## Architecture
- **Frontend**: React + Shadcn/UI + Tailwind CSS
- **Backend**: FastAPI + MongoDB Atlas
- **Mobile**: Expo SDK 53 + React Native

## Fonctionnalites Implementees

### Session Precedente (19 Mars 2026)
- Fix login comptes telephone (pre-validateur EmailStr)
- Integration Resend Email (domaine greenlink-agritech.com verifie)
- 8 notifications email automatiques (fire-and-forget)
- Enrichissement EUDR Dashboard (cooperative + super-admin)
- Enrichissement formulaire SSRTE (backend + web modal + web dashboard + mobile)
- Suppression SSRTE standalone cooperative/agent + Analytics SSRTE super-admin
- Alertes automatiques SSRTE critiques par email
- Suppression complete QR Code du projet

### Build Mobile v1.36.0 (20 Mars 2026)
- Nouvelle icone app GreenLink (logo vert sur fond #2d5a4d)
- Icones generees: icon.png, adaptive-icon.png, monochrome, splash, favicon
- Section "Une plateforme tout-en-un" masquee (conformite Google Play metadonnees)
- versionCode 36, version 1.36.0
- Build Credentials 3Ses4evueO

### Correction Bugs ICI/SSRTE (21 Mars 2026)
- Bug 1: Genre picker mobile remplace par boutons tactiles TouchableOpacity
- Bug 2: taille_menage nettoyee avant envoi backend (parseInt || 1)
- Bug 3: Sync croisee SSRTE taille_menage vers ICI profile + pre-remplissage
- Bug 4: Compteur completion corrige (all_possible_ids: member_id + user_id)
- Bug 5: Auto-update agent_activities quand 5/5 formulaires completes
- Tests: iteration_48 (19/19 PASS)

### Dashboard Progression Agents (21 Mars 2026)
- Nouvel endpoint GET /api/cooperative/agents-progress
- Nouvelle page /cooperative/agents-progress avec:
  - 4 cartes resume (Agents, Fermiers Assignes, Fermiers 5/5, Progression Moyenne)
  - Liste agents avec barres de progression
  - Details expandables par fermier avec badges formulaires (vert/rouge)
- Bouton "Progression Agents" ajoute au dashboard cooperative
- Tests: iteration_49 (15/15 PASS)

### Refactoring farmer_id / member_id (21 Mars 2026)
- Migration DB: parcels.member_id ObjectId -> String (17 docs fixes)
- Migration DB: ssrte_cases.member_id -> farmer_id (5 docs migres)
- cooperative.py: Requetes parcelles utilisent string member_id
- agent_search.py: _get_farmer_parcels() requetes string
- carbon_auditor.py: lookup member_id avec fallback coop_members
- Standard: farmer_id = str(coop_members._id) partout comme string

## Services MOCK
- Orange Money, Orange SMS, USSD Gateway

## Backlog
### P1
- [ ] Soumission AAB Google Play Store (action utilisateur)
### P1.5
- [ ] Configurer Orange SMS API (en attente des cles)
### P2
- [ ] Langues Baoule/Dioula
- [ ] Stockage cloud fichiers (S3)
- [ ] Refactoring cooperative.py (fichier 2600+ lignes)

## Credentials
- Admin: klenakan.eric@gmail.com / 474Treckadzo
- Coop Bielaghana: bielaghana@gmail.com / greenlink2024
- Coop Traore: traore_eric@yahoo.fr / greenlink2024
- Agent Test (Kone Alphone): +2250709005301 / greenlink2024
- EAS: treckadzo (session active)

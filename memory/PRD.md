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
- Nouvelle icone app GreenLink
- Build APK + AAB via EAS

### Correction Bugs ICI/SSRTE (21 Mars 2026)
- Bug 1: Genre picker mobile -> boutons tactiles
- Bug 2: taille_menage nettoyee avant envoi (parseInt || 1)
- Bug 3: Sync croisee SSRTE -> ICI pour taille_menage
- Bug 4: Compteur completion corrige (all_possible_ids)
- Bug 5: Auto-update agent_activities quand 5/5

### Dashboard Progression Agents (21 Mars 2026)
- GET /api/cooperative/agents-progress
- Page /cooperative/agents-progress (cartes resume + details expandables)
- Bouton "Progression Agents" dans dashboard cooperative

### Refactoring farmer_id / member_id (21 Mars 2026)
- Migration DB: parcels.member_id ObjectId -> String
- Migration DB: ssrte_cases.member_id -> farmer_id
- Requetes uniformisees dans cooperative.py, agent_search.py, carbon_auditor.py

### Fix Email SSRTE enfants_observes (21 Mars 2026)
- Corrige donnees KINDA YABRE (0 -> 1 enfant)
- Auto-sync enfantsObserves depuis liste_enfants (mobile + web)
- Validation: alerte si risque critique/eleve mais 0 enfant observe

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
- [ ] Refactoring cooperative.py (2600+ lignes)

## Credentials
- Admin: klenakan.eric@gmail.com / 474Treckadzo
- Coop Bielaghana: bielaghana@gmail.com / greenlink2024
- Coop Traore: traore_eric@yahoo.fr / greenlink2024
- Agent Test (Kone Alphone): +2250709005301 / greenlink2024
- EAS: treckadzo (session active)

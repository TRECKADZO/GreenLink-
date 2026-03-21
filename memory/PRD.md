# GreenLink - Product Requirements Document

## Probleme Original
Plateforme numerique pour les cooperatives de cacao/cafe en Cote d'Ivoire.

## Architecture
- **Frontend**: React + Shadcn/UI + Tailwind CSS
- **Backend**: FastAPI + MongoDB Atlas
- **Mobile**: Expo SDK 53 + React Native

## Fonctionnalites Implementees

### Session Precedente (19 Mars 2026)
- Fix login comptes telephone
- Integration Resend Email
- 8 notifications email automatiques
- Enrichissement EUDR Dashboard + SSRTE
- Suppression QR Code
- Alertes automatiques SSRTE critiques

### Build Mobile v1.36.0 (20 Mars 2026)
- Nouvelle icone app GreenLink
- Build APK + AAB via EAS

### Correction Bugs ICI/SSRTE (21 Mars 2026)
- Bug 1-5: Genre picker, taille_menage, sync croisee, compteur completion, auto-update 5/5
- Tests: iteration_48 (19/19 PASS)

### Dashboard Progression Agents (21 Mars 2026)
- GET /api/cooperative/agents-progress + page web
- Tests: iteration_49 (15/15 PASS)

### Refactoring farmer_id / member_id (21 Mars 2026)
- Migration DB parcels/ssrte_cases
- Requetes uniformisees

### Fix Email SSRTE enfants_observes (21 Mars 2026)
- Corrige donnees + auto-sync + validation

### Fix Crash Parcelle + Visibilite (21 Mars 2026)
- ParcelCreate model elargi: accepte format mobile (size, department, has_shade_trees etc.)
- Normalisation backend: size->area_hectares, department->region, booleans->farming_practices
- my-parcels: recherche via phone_number -> coop_members pour lier farmer<->agent parcelles
- Producteur voit maintenant les parcelles enregistrees par l'agent terrain
- Build APK v1.37.0 genere

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
- Producteur Test (Kouassi): +2250701234567 / greenlink2024
- EAS: treckadzo (session active)

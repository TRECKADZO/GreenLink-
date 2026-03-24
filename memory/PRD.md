# GreenLink - Product Requirements Document

## Probleme Original
Plateforme agricole full-stack pour la gestion des cooperatives cacao en Cote d'Ivoire, avec suivi carbone, conformite EUDR, et protection des enfants (SSRTE).

## Architecture
- **Backend**: FastAPI + MongoDB (Atlas)
- **Frontend Web**: React + Shadcn UI
- **Mobile**: React Native (Expo/EAS)

## Fonctionnalites Implementees

### Phases 1-10 (DONE - voir historique)

### Phase 11 - Prime Carbone dans Verification Terrain (DONE - 22/03/2026)
### Phase 12 - Dashboard Score Carbone Visuel (DONE - 22/03/2026)
### Phase 13 - Corrections Web + Fonctionnalites Manquantes (DONE - 23/03/2026)
### Phase 14 - Distribution Proportionnelle + Notifications Temps Reel (DONE - 23/03/2026)
### Phase 15 - Formulaire Creation Lot avec Selection Agriculteurs + Builds v1.51.0 (DONE - 24/03/2026)
### Phase 16 - Calcul Prime Carbone avec Taille des Arbres (DONE - 24/03/2026)
### Phase 17 - Super Admin Gestion Primes Carbone (DONE - 24/03/2026)
### Phase 17b - Vue Planteur Demandes Prime (DONE - 24/03/2026)
### Phase 17c - Mise a jour page Cooperative (DONE - 24/03/2026)
### Phase 18 - Formule RSE Confidentielle (DONE - 24/03/2026)
### Phase 18b - Calculateur Prime Accueil mis a jour (DONE - 24/03/2026)
### Phase 19 - Refonte USSD + Inscription + Dashboards (DONE - 24/03/2026)
### Phase 19b - Simulateur USSD Interactif (DONE - 24/03/2026)
### Phase 19c - Corrections Logique Metier + Auto-Code Planteur (DONE - 24/03/2026)
### Phase 20 - Auto-Generation Code Cooperative (DONE - 24/03/2026)
### Phase 21 - Audit Global + Dashboard Onboarding + Harmonisation (DONE - 24/03/2026)
### Phase 22 - Fix Activation Membre + PIN USSD (DONE - 24/03/2026)
### Phase 23 - Export PDF/Excel + Nom Cooperative (DONE - 24/03/2026)
### Phase 24 - Verification Flux Activation + Libelles (DONE - 24/03/2026)
### Phase 25 - Build APK/AAB v1.52.0 (DONE - 24/03/2026)
### Phase 26 - Fix Cloudflare Mobile + Build v1.53.0 (DONE - 24/03/2026)

### Phase 27 - Fix Mobile Add Member Form + Build v1.55.0 (DONE - 24/03/2026)
**Bug P0 corrige : Formulaire mobile "Ajouter un Membre" desynchronise avec le backend**
- `AddCoopMemberScreen.js` mis a jour avec champs PIN (4 chiffres, obligatoire) et Hectares
- Validation PIN cote mobile : regex `^\d{4}$`, maxLength=4, secureTextEntry
- Modal de succes affiche code_planteur, nom, telephone, statut PIN
- Coherence verifiee avec `CoopMemberCreate` Pydantic model (pin_code: str, hectares: Optional[float])
- Backend POST /api/cooperative/members teste OK (retourne code_planteur + pin_configured=true)
- Version bumpee a v1.55.0 dans app.json
- Builds EAS soumis:
  - APK: https://expo.dev/accounts/treckadzo/projects/greenlink-farmer/builds/1d69c9fa-bbf4-424d-a37c-3e8f2d4819e0
  - AAB: https://expo.dev/accounts/treckadzo/projects/greenlink-farmer/builds/6dcfe825-6a67-4acb-8cbf-23a5fe97001c
- Mot de passe cooperative bielaghana@gmail.com reinitialise (474Treckadzo)
**Tests: 11/11 backend PASS, 100% frontend PASS (iteration 72)**

## Credentials
- Admin: klenakan.eric@gmail.com / 474Treckadzo
- Cooperative Gagnoa: bielaghana@gmail.com / 474Treckadzo
- Agent terrain test: test_agent@greenlink.ci / agent2024
- Producteur test: +2250799999999

## APIs Mockees
- Orange SMS, Orange Money

## Backlog
- P2: Passerelle SMS Orange (remplacer mock)
- P2: Langues locales (Baoule, Dioula)
- P2: Stockage cloud AWS S3
- P3: Refactoring greenlink.py, ussd.py en fichiers dedies
- P3: Optimisation N+1 query dans get_coop_members

## Key API Endpoints
- POST /api/auth/login | register
- POST /api/auth/activate-member-account
- POST /api/auth/check-member-phone/{phone}
- POST /api/cooperative/members (pin_code + hectares obligatoires)
- GET /api/cooperative/members/activation-stats
- GET /api/cooperative/members/export?format=xlsx|pdf
- POST /api/ussd/callback
- POST /api/ussd/carbon-calculator
- POST /api/ussd/calculate-premium
- POST /api/ussd/register-web
- GET /api/ussd/registrations
- GET /api/admin/carbon-premiums/config | stats | requests
- PUT /api/admin/carbon-premiums/requests/{id}/validate
- PUT /api/admin/carbon-premiums/requests/{id}/pay
- GET /api/farmer/carbon-premiums/my-requests
- GET /api/cooperative/carbon-premiums/admin-requests

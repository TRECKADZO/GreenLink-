# GreenLink - Product Requirements Document

## Probleme Original
Plateforme agricole full-stack pour la gestion des cooperatives cacao en Cote d'Ivoire, avec suivi carbone, conformite EUDR, et protection des enfants (SSRTE).

## Architecture
- **Backend**: FastAPI + MongoDB (Atlas)
- **Frontend Web**: React + Shadcn UI
- **Mobile**: React Native (Expo/EAS)

## Fonctionnalites Implementees

### Phases 1-5 (DONE)
- Core Platform, Mobile, Backend Refactoring, Cles Francaises, Notifications Push

### Phase 6 - Systeme de Livraison Marketplace (DONE)
- 3 modeles cumulables: frais_fixe, par_distance, par_poids + seuil_gratuit

### Phase 7 - Corrections Connexion & Parcelles (DONE - 21/03/2026)
- Rate limiter JSON, messages d'erreur specifiques, normalisation telephone
- Mapping cles francaises dans mobile, liaison auto parcelles, reset mot de passe

### Phase 8 - Recoltes & Validation Cooperative (DONE - 21/03/2026)
- Flux complet: declaration -> notification coop -> validation/rejet -> notification agriculteur

### Phase 9 - Conversion Unites & Emails Recoltes (DONE - 22/03/2026)
- Conversion unites correcte: tonnes->kg (x1000), sacs->kg (x65)
- Email Resend envoye a la cooperative lors de chaque declaration

### Phase 10 - Ecran Suivi Recoltes & Dashboard Coop (DONE - 22/03/2026)
- GET /api/greenlink/harvests/my-harvests, MyHarvestsScreen, CoopDashboard recoltes en attente

### Phase 11 - Prime Carbone dans Verification Terrain (DONE - 22/03/2026)
**Backend:**
- PUT /api/field-agent/parcels/{id}/verify enrichi: nombre_arbres, couverture_ombragee, pratiques_ecologiques
- Recalcul score carbone: base 3.0, densite arbres (0-2pts), ombrage (0-2pts), pratiques (0-2.5pts), surface (0.5pt), max 10.0
- GET /api/greenlink/parcels/my-parcels retourne champs carbone enrichis

**Mobile Agent Terrain:**
- ParcelVerifyFormScreen enrichi avec section "Indicateurs prime carbone"
- Decomptage arbres, couverture ombragee (%), checklist 5 pratiques ecologiques

### Phase 12 - Dashboard Score Carbone Visuel (DONE - 22/03/2026)
**Backend:**
- GET /api/greenlink/carbon/my-score enrichi avec:
  - Decomposition du score (base, arbres, ombrage, pratiques, surface)
  - Recommandations personnalisees triees par gain potentiel
  - Stats agregees (total_trees, avg_shade_cover, practices_count/list)
  - Scores par parcelle avec detail carbone

**Mobile Agriculteur:**
- HomeScreen: carte score carbone interactive avec jauge mini + barre de progression + lien vers detail
- MyCarbonScoreScreen revampe:
  - Jauge animee avec score et label de qualite
  - Stats rapides (tCO2, primes XOF, parcelles)
  - Barres de progression par composante (base, arbres, ombrage, pratiques, surface)
  - Chips des pratiques actives
  - Recommandations personnalisees avec gain potentiel
  - Scores par parcelle avec indicateurs visuels

## Builds
- v1.39-v1.40: Corrections diverses et features
- v1.41.0: Corrections crash React hooks + API retry + renommage GreenLink Agritech

## Credentials
- Admin: klenakan.eric@gmail.com / 474Treckadzo
- Agent terrain test: test_agent@greenlink.ci / agent2024
- Producteur test: +2250705551234 / koffi2024

## APIs Mockees
- Orange SMS, Orange Money

## Backlog
- P1: Soumettre AAB au Google Play Console
- P2: Passerelle SMS Orange (remplacer mock)
- P2: Langues locales (Baoule, Dioula)
- P2: Stockage cloud AWS S3
- P3: Refactoring greenlink.py en fichiers dedies (parcels.py, harvests.py)

## Key API Endpoints
- POST /api/auth/login | register | forgot-password | verify-reset-code | reset-password
- GET /api/greenlink/carbon/my-score (enrichi avec breakdown + recommandations)
- GET /api/greenlink/harvests/my-harvests
- POST /api/greenlink/harvests
- GET /api/greenlink/parcels/my-parcels
- GET /api/greenlink/farmer/dashboard
- PUT /api/field-agent/parcels/{id}/verify (enrichi prime carbone)
- GET /api/cooperative/dashboard | harvests | members
- PUT /api/cooperative/harvests/{id}/validate | reject

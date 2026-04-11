# GreenLink Agritech - PRD

## Probleme original
Plateforme agritech Cote d'Ivoire - modules ARS 1000 pour certification cacao durable.

## Modules implementes

### PDC v2 - Stepper 3 Etapes / 8 Fiches (10 avril 2026)
- Carte interactive Garmin eTrex 20 avec GPS Tracking, drag & drop vertices, detection rectangle
- Bouton permanent "Ajouter arbre ici" avec formulaire rapide
- PDF officiel ReportLab, 8 fiches dynamiques, RBAC strict
- **Dropdowns geographiques CI (11 avril)**: 32 regions, departements et sous-prefectures en cascade dans Fiche 1
- **Auto-propagation Fiche 1 -> Fiche 2**: sous-prefecture, village, campement auto-remplis. Reset en cascade quand region/departement change.

### Migration PDC v1 -> v2 (11 avril 2026)
- Ancien systeme PDC supprime. Routes redirigees vers PDC v2.

### Workflow RBAC PDC v2 (11 avril 2026)
- Etape 1 lecture seule pour cooperative apres soumission agent.

### Offline-First avec Cache Tuiles (11 avril 2026)
- Service Worker TILES_CACHE: Cache-First, 200Mo max

### Code Quality Reviews (11 avril 2026 - 3 passes)
- Secrets env vars, XSS esc(), hook ordering, empty catches, nested ternaries, inline props

### Auto-remplissage PDC -> Fiches de visite (11 avril 2026)
- Endpoint `/api/ici-data/farmers/{id}/family-data` enrichi pour inclure donnees PDC v2
- Extraction automatique depuis PDC fiche1: genre, niveau education, taille menage, enfants (age, sexe, scolarisation, travail exploitation), geographie
- Pre-remplissage ICI et SSRTE avec source tracking (pdc, ici, ssrte, combinaisons)
- Priorite: PDC > ICI > SSRTE pour la fusion des donnees
- 14/14 tests pytest passes

### Core Platform
- Auth JWT, Dashboard multi-roles, Notifications, USSD, Score carbone, Marketplace

## Architecture
- Backend: FastAPI + MongoDB | Frontend: React + Tailwind + Shadcn + Leaflet + html2canvas
- Offline: Service Worker + IndexedDB + TILES_CACHE

## Backlog
- P1: Integration SMS reel (Orange CI / MTN)
- P1: Support langues locales (Baoule/Dioula)
- P2: Nettoyage donnees test/demo
- P2: Emails Resend en spam (attente config DNS utilisateur)
- P3: Refactoring admin.py, composants > 700 lignes, routing App.js

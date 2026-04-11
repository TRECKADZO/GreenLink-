# GreenLink Agritech - PRD

## Probleme original
Plateforme agritech Cote d'Ivoire - modules ARS 1000 pour certification cacao durable.

## Modules implementes

### PDC v2 - Stepper 3 Etapes / 8 Fiches (10 avril 2026)
- Carte interactive Garmin eTrex 20 avec GPS Tracking, drag & drop vertices, detection rectangle
- Bouton permanent "Ajouter arbre ici" avec formulaire rapide
- PDF officiel ReportLab, 8 fiches dynamiques, RBAC strict
- **Dropdowns geographiques CI (11 avril)**: 32 regions, departements et sous-prefectures en cascade dans Fiche 1
- **Auto-propagation Fiche 1 -> Fiche 2**: sous-prefecture, village, campement auto-remplis

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
- Extraction automatique depuis PDC fiche1: genre, niveau education, taille menage, enfants, geographie
- Pre-remplissage ICI et SSRTE avec source tracking (pdc, ici, ssrte, combinaisons)
- 14/14 tests pytest passes

### Score Ombrage ARS 1000 (11 avril 2026)
- **Calcul automatique**: densite (40pts), diversite especes (30pts), strates (30pts) = score 0-100
- **Conformite ARS 1000**: densite 25-40 arbres/ha, min 3 especes, strate 3 presente
- **Endpoint API**: GET /api/pdc-v2/{id}/shade-score avec impact prime FCFA
- **Integration score carbone**: bonus ombrage x coefficient 0.30 (max +1.0 pts sur score /10)
- **Panneau temps reel Fiche 3**: barres de progression densite/diversite/strates, badge conformite, prime FCFA
- **Calcul offline-first**: computeShadeScore() cote client dans PDCStepperPage
- **PDF mis a jour**: section Score Ombrage ARS 1000 dans le PDF avec impact prime
- 20/20 tests pytest passes

### Compteur Fiches 7/7 (11 avril 2026)
- Mise a jour du compteur de fiches de 5/5 a 7/7 (ajout PDC + REDD)
- Backend: check_and_update_farmer_completion verifie 7 formulaires
- Backend: cooperative_agents progress tracking avec 7 fiches
- Frontend: AgentProgressPage affiche 7/7 avec labels PDC et REDD+

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

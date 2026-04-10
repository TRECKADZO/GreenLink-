# GreenLink Agritech - PRD

## Probleme original
Plateforme agritech Cote d'Ivoire - modules ARS 1000 pour certification cacao durable.

## Modules implementes

### PDC v2 - Stepper 3 Etapes / 8 Fiches (10 avril 2026)
- **Carte interactive Garmin eTrex 20** dans Fiche 2:
  - Polygone bleu limites parcelle + pins jaunes arbres ombrage
  - **GPS Tracking continu** : watchPosition, filtre 3m, Haversine, bandeau rouge temps reel
  - Boutons: Enregistrer GPS, Trace manuel, Marquer arbre, Capturer PDF
  - Info box Garmin + liste waypoints + snapshot html2canvas
- PDF officiel: carte statique + liste arbres + numerotation pages + header GreenLink
- 8 fiches dynamiques, RBAC strict, validation cooperative

### Migration PDC v1 -> v2 (11 avril 2026)
- **Ancien systeme PDC supprime**: `ars1000_pdc.py`, `AgentVisitePDC.jsx`, `FarmerPDCPage.jsx`
- **Routes redirigees**: `/farmer/pdc` et `/agent/visite-pdc` pointent vers `PDCListPage` (PDC v2)
- **Navigation mise a jour**: Agent Terrain dashboard et Farmer dashboard redirigent vers PDC v2
- **Backend nettoye**: routeur `ars1000_pdc` retire de `server.py`

### Workflow RBAC PDC v2 (11 avril 2026)
- **Etape 1 lecture seule pour cooperative**: Apres soumission par l'agent terrain, la cooperative voit les donnees collectees en mode lecture. Backend bloque PUT step1 (403).
- **Bannieres de workflow contextuelles**:
  - Bleue (Step 1 cooperative): "Mode lecture — Donnees collectees par l'agent terrain"
  - Ambre (Step 2 cooperative): "Analyse des problemes — Annexe 2"
  - Violette (Step 3 cooperative): "Planification — Annexe 3"
  - Verte (Planteur PDC valide): "Votre Plan de Developpement Cacaoyer"
- **Planteur voit PDC uniquement apres validation** par l'agronome

### Core Platform
- Auth JWT, Dashboard multi-roles, Notifications, USSD, Score carbone, Marketplace

### ARS 1000
- PDC v2 (seul actif), Lots Traceabilite, Certification, Agroforesterie, Visite Terrain
- Declarations Recolte, Diagnostic Conformite, Protection Environnementale

## Architecture
- Backend: FastAPI + MongoDB | Frontend: React + Tailwind + Shadcn + Leaflet + html2canvas
- PDF: ReportLab | SMS: Orange CI (MOCKE) | Paiement: Orange Money (MOCKE)

## Backlog
- P1: Integration SMS reel (Orange CI / MTN)
- P1: Support langues locales (Baoule/Dioula)
- P2: Offline-first complet (Service Worker tiles cache)
- P2: Nettoyage donnees test/demo
- P3: Refactoring ussd.py, composants > 300 lignes

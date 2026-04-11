# GreenLink Agritech - PRD

## Probleme original
Plateforme agritech Cote d'Ivoire - modules ARS 1000 pour certification cacao durable.

## Modules implementes

### PDC v2 - Stepper 3 Etapes / 8 Fiches (10 avril 2026)
- Carte interactive Garmin eTrex 20 dans Fiche 2 avec GPS Tracking, drag & drop vertices, detection rectangle, calcul geodesique
- Bouton permanent "Ajouter arbre ici" avec formulaire rapide (nom, circonference, decision)
- PDF officiel ReportLab, 8 fiches dynamiques, RBAC strict

### Migration PDC v1 -> v2 (11 avril 2026)
- Ancien systeme PDC supprime. Routes redirigees vers PDC v2.

### Workflow RBAC PDC v2 (11 avril 2026)
- Etape 1 lecture seule pour cooperative apres soumission agent. Bannieres contextuelles.

### Offline-First avec Cache Tuiles (11 avril 2026)
- Service Worker TILES_CACHE: Cache-First, 200Mo max, nettoyage LRU
- TilesDownloader dans dashboard agent + carte Garmin

### Code Quality Review Applied (11 avril 2026)
- **Hardcoded secrets**: Test files migres vers os.environ.get() (3 fichiers)
- **XSS vulnerability**: document.write() sanitise avec esc() dans UsersManagement.jsx
- **Empty catch blocks**: console.warn() ajoute dans offlineDB.js et offlineCooperativeApi.js
- **Inline props**: Path options extraites en constantes dans ParcelMapGarmin.jsx
- **is True/False**: Conserve avec noqa:E712 pour tri-state (carbon_score_engine, ssrte_analytics)

### Core Platform
- Auth JWT, Dashboard multi-roles, Notifications, USSD, Score carbone, Marketplace

### ARS 1000
- PDC v2 (seul actif), Lots Traceabilite, Certification, Agroforesterie, Visite Terrain

## Architecture
- Backend: FastAPI + MongoDB | Frontend: React + Tailwind + Shadcn + Leaflet + html2canvas
- PDF: ReportLab | SMS: Orange CI (MOCKE) | Paiement: Orange Money (MOCKE)
- Offline: Service Worker + IndexedDB + TILES_CACHE

## Backlog
- P1: Integration SMS reel (Orange CI / MTN)
- P1: Support langues locales (Baoule/Dioula)
- P2: Nettoyage donnees test/demo
- P3: Refactoring ussd.py, admin.py fonctions complexes, composants > 300 lignes

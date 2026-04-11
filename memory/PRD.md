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

### Workflow RBAC PDC v2 (11 avril 2026)
- **Etape 1 lecture seule pour cooperative**: Apres soumission agent, la cooperative consulte en mode lecture. Backend bloque PUT step1 (403).
- **Bannieres de workflow contextuelles**: Bleue (lecture step1), Ambre (analyse step2), Violette (planification step3), Verte (planteur valide)
- **Planteur voit PDC uniquement apres validation** par l'agronome

### Offline-First Complet avec Cache Tuiles (11 avril 2026)
- **Service Worker TILES_CACHE**: Cache dedie pour tuiles OpenStreetMap, strategie Cache-First, limite 200Mo, nettoyage LRU automatique
- **Pre-telechargement par zone**: Calcul des tuiles necessaires (zoom 10-17) a partir du centre GPS ou polygone parcelle, telechargement par lots de 6 avec progression
- **TilesDownloader (dashboard agent)**: Composant complet avec stats cache (tuiles/Mo), barre de progression, bouton telechargement, bouton vider cache
- **TilesDownloader compact (carte Garmin)**: Bouton inline pour telecharger les tuiles de la parcelle en cours
- **Indicateur cache sur carte**: Badge "En ligne" (vert) ou "Cache hors-ligne" (ambre) sur la carte Garmin
- **Communication SW <-> page**: Messages postMessage (PRECACHE_TILES, TILES_PRECACHE_PROGRESS, GET_TILES_CACHE_STATS, CLEAR_TILES_CACHE)
- **Fallback offline**: Tuile transparente 1px si tuile non disponible en cache

### Core Platform
- Auth JWT, Dashboard multi-roles, Notifications, USSD, Score carbone, Marketplace

### ARS 1000
- PDC v2 (seul actif), Lots Traceabilite, Certification, Agroforesterie, Visite Terrain
- Declarations Recolte, Diagnostic Conformite, Protection Environnementale

## Architecture
- Backend: FastAPI + MongoDB | Frontend: React + Tailwind + Shadcn + Leaflet + html2canvas
- PDF: ReportLab | SMS: Orange CI (MOCKE) | Paiement: Orange Money (MOCKE)
- Offline: Service Worker + IndexedDB (idb) + TILES_CACHE

## Backlog
- P1: Integration SMS reel (Orange CI / MTN)
- P1: Support langues locales (Baoule/Dioula)
- P2: Nettoyage donnees test/demo
- P3: Refactoring ussd.py, composants > 300 lignes

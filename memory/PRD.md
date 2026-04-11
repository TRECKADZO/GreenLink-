# GreenLink Agritech - PRD

## Probleme original
Plateforme agritech Cote d'Ivoire - modules ARS 1000 pour certification cacao durable.

## Modules implementes

### PDC v2 - Stepper 3 Etapes / 8 Fiches (10 avril 2026)
- **Carte interactive Garmin eTrex 20** dans Fiche 2:
  - Polygone bleu limites parcelle + pins jaunes arbres ombrage
  - **GPS Tracking continu** : watchPosition, filtre 3m, Haversine, bandeau rouge temps reel
  - **Bouton permanent "Ajouter arbre ici"** (11 avril): Capture GPS instantanee, disponible PENDANT et APRES le trace du polygone. Formulaire rapide: Nom botanique, Nom local, Circonference, Origine, Decision.
  - **Trace manuel ameliore** (11 avril):
    - Drag & drop des vertices apres trace (DraggableVertex component)
    - Detection intelligente rectangle au 4e point (snap 30m) + alignement automatique
    - Bouton "Terminer le trace" pendant le tracage
    - Banniere "Polygone ferme" avec superficie/perimetre/points
    - Calcul geodesique precis (Shoelace + Haversine)
  - Boutons: Enregistrer GPS, Trace manuel, Marquer arbre (manuel), Capturer PDF
  - Info box enrichie: Producteur, Village, Superficie, Perimetre, Points, Arbres
- PDF officiel: carte statique + liste arbres + numerotation pages + header GreenLink
- 8 fiches dynamiques, RBAC strict, validation cooperative

### Migration PDC v1 -> v2 (11 avril 2026)
- Ancien systeme PDC supprime. Routes redirigees vers PDC v2. Navigation mise a jour.

### Workflow RBAC PDC v2 (11 avril 2026)
- Etape 1 lecture seule pour cooperative apres soumission agent. Bannieres contextuelles. Planteur voit PDC apres validation.

### Offline-First avec Cache Tuiles (11 avril 2026)
- Service Worker TILES_CACHE: Cache-First, 200Mo max, nettoyage LRU
- Pre-telechargement par zone (zoom 10-17), progression temps reel
- TilesDownloader dans dashboard agent + carte Garmin (compact)

### Core Platform
- Auth JWT, Dashboard multi-roles, Notifications, USSD, Score carbone, Marketplace

### ARS 1000
- PDC v2 (seul actif), Lots Traceabilite, Certification, Agroforesterie, Visite Terrain

## Architecture
- Backend: FastAPI + MongoDB | Frontend: React + Tailwind + Shadcn + Leaflet + html2canvas
- PDF: ReportLab | SMS: Orange CI (MOCKE) | Paiement: Orange Money (MOCKE)
- Offline: Service Worker + IndexedDB (idb) + TILES_CACHE

## Backlog
- P1: Integration SMS reel (Orange CI / MTN)
- P1: Support langues locales (Baoule/Dioula)
- P2: Nettoyage donnees test/demo
- P3: Refactoring ussd.py, composants > 300 lignes

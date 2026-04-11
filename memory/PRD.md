# GreenLink Agritech - PRD

## Probleme original
Plateforme agritech Cote d'Ivoire - modules ARS 1000 pour certification cacao durable.

## Modules implementes

### PDC v2 - Stepper 3 Etapes / 8 Fiches (10 avril 2026)
- Carte interactive Garmin eTrex 20 avec GPS Tracking, drag & drop vertices, detection rectangle
- Bouton permanent "Ajouter arbre ici" avec formulaire rapide
- PDF officiel ReportLab, 8 fiches dynamiques, RBAC strict
- Dropdowns geographiques CI: 32 regions, departements et sous-prefectures en cascade

### Auto-remplissage PDC -> Fiches (11 avril 2026)
- Endpoint family-data enrichi pour inclure donnees PDC v2
- Pre-remplissage ICI et SSRTE avec source tracking

### Score Ombrage ARS 1000 (11 avril 2026)
- Calcul auto: densite 40pts + diversite 30pts + strates 30pts = score 0-100
- Integration score carbone: bonus x coefficient 0.30 (max +1.0 pts)
- Panneau temps reel Fiche 3: barres de progression, badge conformite, prime FCFA
- PDF PDC mis a jour avec section score ombrage

### Compteur Fiches 7/7 (11 avril 2026)
- 7 formulaires: PDC, ICI, SSRTE, REDD, Parcelles, Photos, Inscription

### Fix Bouton GPS Tracking (11 avril 2026)
- Bouton toggle: vert (idle) <-> orange pulsant (enregistrement en cours)
- Texte dynamique: "Enregistrer le parcours GPS" / "Enregistrement en cours..."
- Banniere tracking orange (anciennement rouge)
- Message clair si geolocalisation refusee

### Core Platform
- Auth JWT, Dashboard multi-roles, Notifications, USSD, Score carbone, Marketplace
- Offline-First: Service Worker + IndexedDB + TILES_CACHE

## Architecture
- Backend: FastAPI + MongoDB | Frontend: React + Tailwind + Shadcn + Leaflet

## Backlog
- P1: Integration SMS reel (Orange CI / MTN)
- P1: Support langues locales (Baoule/Dioula)
- P2: Nettoyage donnees test/demo
- P2: Emails Resend en spam (attente config DNS)
- P3: Refactoring admin.py, composants > 700 lignes

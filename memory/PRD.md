# GreenLink Agritech - PRD

## Probleme original
Plateforme agritech Cote d'Ivoire - modules ARS 1000 pour certification cacao durable.

## Modules implementes

### PDC v2 - Stepper 3 Etapes / 8 Fiches (10 avril 2026)
- Carte interactive Garmin eTrex 20 avec GPS Tracking, drag & drop vertices
- PDF officiel ReportLab, 8 fiches dynamiques, RBAC strict
- Dropdowns geographiques CI en cascade

### Harmonisation Fiches PDC avec documents officiels (12 avril 2026)
- **Fiche 5 (Etape 2 - Agronome)**: 10 themes d'analyse predefinis conformes au document "Donc agronome"
- **Fiche 6 (Etape 3)**: 6 axes strategiques ARS 1000 predefinis (Rehabilitation, Swollen shoot, Diversification, Arbres compagnons, Gestion technique, Gestion financiere)
- **Fiche 7 (Etape 3)**: Nouvelles colonnes Sous-activites, Execution, Appui conformes au document
- **Fiche 8 (Etape 3)**: Categories predefinies (Investissement: Atomiseur/Pulverisateur/EPI, Intrants: Engrais/Insecticide/Fongicide/Plants, Main d'oeuvre: MO permanente/occasionnelle)
- **Auto-remplissage Etape 1 -> Etape 3**: Identification producteur, Situation menage (tableau), Description exploitation (superficies, arbres, cultures), Production cacao - tout en lecture seule
- **PDF Fiche 7 mis a jour** avec colonnes sous-activites, execution, appui
- 11/11 tests pytest passes

### Score Ombrage ARS 1000 (11 avril 2026)
- Calcul auto: densite 40pts + diversite 30pts + strates 30pts = score 0-100
- Integration score carbone: bonus x coefficient 0.30
- Panneau temps reel Fiche 3

### Harmonisation ARS 1000 avec PDC v2 (11 avril 2026)
- Backend migre de collection pdc vers pdc_v2
- Score ombrage integre dans onglet Certification
- Diagnostic migre vers 8 fiches PDC v2

### Auto-remplissage PDC -> Fiches visite (11 avril 2026)
- Pre-remplissage ICI et SSRTE depuis PDC

### Compteur Fiches 7/7 (11 avril 2026)
- 7 formulaires: PDC, ICI, SSRTE, REDD, Parcelles, Photos, Inscription

### Core Platform
- Auth JWT, Dashboard multi-roles, Notifications, USSD, Score carbone, Marketplace
- Offline-First: Service Worker + IndexedDB + TILES_CACHE

## Architecture
- Backend: FastAPI + MongoDB | Frontend: React + Tailwind + Shadcn + Leaflet

## Backlog
- P0: Ajouter grille carres Fiche 3 (comptage densité 10m x 10m) + tableau maladies/ravageurs detaille
- P0: Ajouter tableau depenses courantes Fiche 4 (Scolarite, Nourriture, Sante, etc.)
- P1: Integration SMS reel (Orange CI / MTN)
- P1: Support langues locales (Baoule/Dioula)
- P2: Nettoyage donnees test/demo
- P2: Emails Resend en spam (attente config DNS)
- P3: Refactoring admin.py, composants > 700 lignes

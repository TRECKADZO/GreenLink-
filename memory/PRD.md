# GreenLink Agritech - PRD

## Probleme original
Plateforme agritech Cote d'Ivoire - modules ARS 1000 pour certification cacao durable.

## Modules implementes

### Core Platform
- Authentification JWT, Dashboard multi-roles, Notifications, USSD, Score carbone, Marketplace

### ARS 1000 - Certification Cacao Durable
1. **PDC v2 - Stepper 3 Etapes / 8 Fiches** + Generation PDF officiel (10 avril 2026)
   - **Carte interactive Garmin eTrex 20** dans Fiche 2 (10 avril 2026)
     - Polygone bleu avec sommets pour les limites de parcelle
     - Pins jaunes pour les arbres d'ombrage (avec GPS)
     - Info box Garmin (producteur, village, superficie, nb points/arbres)
     - 4 boutons tactiles (Tracer parcelle, Marquer arbre, Annuler, Capturer pour PDF)
     - Liste waypoints style GPS (WPT01, WPT02...)
     - Capture html2canvas pour inclusion dans le PDF
   - PDF officiel avec carte statique + numérotation pages + header GreenLink
2. PDC v1 (7 Fiches) via /api/ars1000/pdc
3. Lots Traceabilite, Certification, Agroforesterie, Visite Terrain, Declarations Recolte
4. Diagnostic Conformite, Protection Environnementale, Registre Reclamations

## Architecture
- Backend: FastAPI + MongoDB | Frontend: React + Tailwind + Shadcn UI + Leaflet + html2canvas
- PDF: ReportLab | SMS: Orange CI (MOCKE) | Paiement: Orange Money (MOCKE)

## Fichiers cles PDC v2
- Backend: /app/backend/routes/pdc_v2.py, pdc_v2_pdf.py
- Frontend: /app/frontend/src/pages/cooperative/pdc/
  - PDCListPage.jsx, PDCStepperPage.jsx, DynamicTable.jsx, ParcelMapGarmin.jsx

## Revue de code appliquee (10 avril 2026)
- 114 fichiers test casses supprimes, XSS corrigee, random->secrets, hook deps, 175 console.log supprimes

## Backlog
- P1: Integration SMS reel (Orange CI / MTN)
- P1: Support langues locales (Baoule/Dioula)
- P2: Mode offline-first complet (Service Worker tiles cache)
- P2: Nettoyage donnees test/demo
- P2: Emails Resend en spam (DNS)
- P3: Refactoring ussd.py, composants > 300 lignes, fonctions complexes admin.py

# GreenLink Agritech - PRD

## Probleme original
Reproduire le projet GreenLink Agritech (plateforme agritech Cote d'Ivoire) et implementer les modules ARS 1000 pour la certification du cacao durable.

## Modules implementes

### Core Platform
- Authentification JWT, Dashboard multi-roles, Notifications, USSD, Score carbone, Marketplace

### ARS 1000 - Certification Cacao Durable
1. **PDC v2 - Stepper 3 Etapes / 8 Fiches** (10 avril 2026)
   - Etape 1 (Annexe 1): Fiches 1-4 (Collecte donnees - Agent Terrain)
   - Etape 2 (Annexe 2): Fiche 5 (Analyse problemes - Cooperative/Agronome)
   - Etape 3 (Annexe 3): Fiches 6-8 (Planification - Cooperative/Agronome)
   - RBAC strict, tableaux dynamiques, notification planteur apres validation
   - **Generation PDF officiel** (ReportLab) - 8 fiches + couverture + signatures (10 avril 2026)
2. PDC v1 (7 Fiches) - Ancien module via /api/ars1000/pdc
3. Lots Traceabilite (ARS 1000-2)
4. Certification Bronze/Argent/Or
5. Agroforesterie - 54 especes
6. Visite Terrain Agent (7 Fiches)
7. Generation PDF + Export Excel (PDC v1)
8. Declarations Recolte
9. Registre Reclamations/Risques/Impartialite
10. Diagnostic Conformite PDC
11. Protection Environnementale

## Architecture
- Backend: FastAPI + MongoDB | Frontend: React + Tailwind + Shadcn UI
- PDF: ReportLab | Excel: openpyxl | SMS: Orange CI (MOCKE) | Paiement: Orange Money (MOCKE)

## PDC v2 - Schema technique
- Collection MongoDB: pdc_v2
- Backend API: /app/backend/routes/pdc_v2.py (12 endpoints CRUD + RBAC)
- Backend PDF: /app/backend/routes/pdc_v2_pdf.py (GET /api/pdc-v2/pdf/{id})
- Frontend:
  - /app/frontend/src/pages/cooperative/pdc/PDCListPage.jsx
  - /app/frontend/src/pages/cooperative/pdc/PDCStepperPage.jsx
  - /app/frontend/src/pages/cooperative/pdc/DynamicTable.jsx
- Routes: /cooperative/pdc-v2 (liste) et /cooperative/pdc-v2/:id (stepper)

## Backlog
- P1: Integration SMS reel (Orange CI / MTN)
- P1: Support langues locales (Baoule/Dioula)
- P2: Nettoyage donnees test/demo
- P2: Emails Resend en spam (DNS SPF/DKIM/DMARC a configurer)
- P3: Refactoring ussd.py (2700+ lignes)
- P3: Splitter composants > 300 lignes

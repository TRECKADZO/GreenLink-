# GreenLink Agritech - PRD

## Probleme original
Reproduire le projet GreenLink Agritech (plateforme agritech Cote d'Ivoire) et implementer les modules ARS 1000 pour la certification du cacao durable.

## Modules implementes

### Core Platform
- Authentification JWT, Dashboard multi-roles, Notifications, USSD, Score carbone, Marketplace

### ARS 1000 - Certification Cacao Durable
1. PDC v2 - Stepper 3 Etapes / 8 Fiches (NOUVEAU - 10 avril 2026)
   - Etape 1 (Annexe 1): Fiches 1-4 (Collecte donnees - Agent Terrain)
   - Etape 2 (Annexe 2): Fiche 5 (Analyse problemes - Cooperative/Agronome)
   - Etape 3 (Annexe 3): Fiches 6-8 (Planification - Cooperative/Agronome)
   - RBAC: Agent Terrain (Step 1), Cooperative = Agronome (Steps 2-3 + validation), Planteur (lecture seule apres validation)
   - Tableaux dynamiques (ajout/suppression de lignes)
   - Notification automatique au planteur apres validation
2. PDC v1 (7 Fiches) - Ancien module, toujours disponible via /api/ars1000/pdc
3. Lots Traceabilite (ARS 1000-2) - Controles qualite, rapports d'essai, grades
4. Certification - Niveaux Bronze/Argent/Or, audits, conformite
5. Agroforesterie - 54 especes, diagnostic cooperatif visuel, recommandations
6. Visite Terrain Agent (7 Fiches) - Workflow 10 etapes, GPS
7. Generation PDF + Export Excel - PDC 10 pages PDF, Excel 7 onglets
8. Declarations Recolte (ARS 1000-2) - Controles qualite, validation cooperative
9. Registre Reclamations/Risques/Impartialite - Matrice de risques 5x5
10. Diagnostic Conformite PDC - Score moyen cooperatif
11. Protection Environnementale - Score conformite, checklist ARS 1000
12. Widget ARS 1000, Onglet ARS 1000 Super Admin

## Architecture
- Backend: FastAPI + MongoDB | Frontend: React + Tailwind + Shadcn UI + Recharts
- PDF: ReportLab | Excel: openpyxl | SMS: Orange CI (MOCKE) | Paiement: Orange Money (MOCKE)

## PDC v2 - Schema technique
- Collection MongoDB: pdc_v2
- Backend: /app/backend/routes/pdc_v2.py
- Frontend: /app/frontend/src/pages/cooperative/pdc/
  - PDCListPage.jsx - Liste, stats, creation
  - PDCStepperPage.jsx - Stepper 3 etapes, 8 fiches
  - DynamicTable.jsx - Composant reutilisable tableaux dynamiques
- Routes: /cooperative/pdc-v2 (liste) et /cooperative/pdc-v2/:id (stepper)
- API: /api/pdc-v2/* (12 endpoints)

## Statuts PDC v2
- brouillon -> etape1_en_cours -> etape1_complete -> etape2_en_cours -> etape2_complete -> etape3_en_cours -> valide
- archive (suppression logique)

## Backlog
- P1: Integration SMS reel (Orange CI / MTN)
- P1: Support langues locales (Baoule/Dioula)
- P2: Generation PDF officiel pour PDC v2 valide
- P2: Nettoyage donnees test/demo
- P2: Emails Resend en spam (DNS SPF/DKIM/DMARC a configurer)
- P3: Refactoring ussd.py (2700+ lignes)
- P3: Migrer 32 hooks dependencies restants
- P3: Splitter les composants > 300 lignes (AgentMapLeaflet 1103 lignes, Profile 800 lignes)

# GreenLink Agritech - Product Requirements Document

## Original Problem Statement
Utiliser le meme code developpe sur GitHub (GreenLink). Implementer tout le projet GreenLink Agritech.
Ajouter les modules ARS 1000 (Certification Cacao Durable) et le workflow Visite Terrain PDC.

## Product Requirements
1. Fix cooperative referral code bugs (DONE)
2. Clean up all test/demo data (P2 - PENDING)
3. Fix security and data isolation bugs (DONE)
4. Implement Harvest validation flow (P2 - PENDING)
5. Improve Web views for Agent Terrain and Agriculteur (DONE)
6. Messaging system improvements (DONE)
7. Mobile native spec generation (DONE)
8. ARS 1000 Certification modules (DONE)
9. Agent Terrain PDC Visit workflow (DONE)

## Architecture
- **Backend**: FastAPI (Python) + MongoDB Atlas (greenlink_production)
- **Frontend**: React (CRA) + Tailwind CSS + Shadcn UI
- **Mobile**: Expo React Native
- **Database**: MongoDB Atlas

## ARS 1000 Module Architecture
### New Collections
- `pdc`: Plan de Developpement de la Cacaoyere (farmer development plans)
- `lots_traceabilite`: Traceability lots with quality controls (ARS 1000-2)
- `certification`: Cooperative certification levels (Bronze/Argent/Or) (ARS 1000-3)
- `arbres_ombrage`: Shade tree inventory for agroforestry compliance

### New API Routes
- `/api/ars1000/pdc/*` - PDC CRUD, submit, validate, sign, agent-visit, complete-visit
- `/api/ars1000/lots/*` - Lot management, quality controls, test reports
- `/api/ars1000/certification/*` - Dashboard, audits, NC, complaints, risks, trees

### New Frontend Pages
- `/cooperative/ars1000` - ARS 1000 Dashboard (5 tabs: Certification, PDC, Tracabilite, Agroforesterie, Registres)
- `/farmer/pdc` - Farmer PDC form (7 steps)
- `/agent/visite-pdc` - Agent Terrain field visit PDC form (9 steps with GPS, photos, signatures)

## Agent Terrain Visit Workflow
1. Agent logs into dashboard -> clicks "Mes Planteurs"
2. Selects a farmer -> clicks "Visite Terrain PDC"
3. Opens full 9-step PDC form:
   - Identification (pre-filled from farmer data)
   - Menage (household composition)
   - Parcelles with GPS capture
   - Inventaire Arbres d'Ombrage (species, circumference, GPS, decision)
   - Materiel Agricole
   - Matrice Strategique
   - Photos de parcelle (camera upload)
   - Signatures electroniques (canvas drawing for farmer + agent)
   - Resume with conformity percentage
4. Agent clicks "Terminer la visite" -> PDC status = "complete_agent"
5. Notification sent to cooperative for validation + cachet

## Completed Tasks
- Carbon Score Analytics Dashboard
- Fixed shade cover formula (35m2/tree)
- Fixed messaging contacts loading
- Fixed ICI profile history refresh
- Generated mobile native specs (MOBILE_SPEC.md)
- ARS 1000 PDC Module (CRUD, submit, validate, sign)
- ARS 1000 Lots/Traceability Module (quality controls, grading, test reports)
- ARS 1000 Certification Module (Bronze/Argent/Or, audits, NC, complaints, risks)
- ARS 1000 Agroforestry Module (tree inventory, density calc, 3-strata conformity)
- Cooperative ARS 1000 Dashboard (5 tabs)
- Farmer PDC Form (7 steps)
- Agent Terrain Visit Workflow (9 steps with GPS, photos, signatures, notifications)

## Pending Issues
- P2: Emails via Resend going to Spam (BLOCKED: awaiting DNS config)

## Upcoming Tasks
- P2: PDF Generation (PDC 10-page official PDF, Audit Annexe A, Lot traceability sheet)
- P2: Clean up test/demo data
- P2: Implement Harvest validation flow
- P1: Real SMS Gateway integration (Orange CI / MTN)
- P1: Support for local languages (Baoule/Dioula)

## Future/Backlog
- P3: Refactor ussd.py (over 2700 lines)
- P3: USSD PDC update menu
- P3: WhatsApp/Push notifications

## Mocked Services
- Orange CI SMS
- Orange Money

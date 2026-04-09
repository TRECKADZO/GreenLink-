# GreenLink Agritech - Product Requirements Document

## Original Problem Statement
Utiliser le meme code developpe sur GitHub (GreenLink). Implementer tout le projet (reproduire le projet GreenLink Agritech avec le meme code).
Ajouter les modules ARS 1000 (Certification Cacao Durable) sans casser les fonctionnalites existantes.

## Product Requirements
1. Fix cooperative referral code bugs (DONE)
2. Clean up all test/demo data and keep only real data across all dashboards
3. Fix security and data isolation bugs (DONE)
4. Implement Harvest validation flow
5. Improve the Web views for "Agent Terrain" and "Agriculteur" (DONE)
6. Verify and professionally improve the messaging system for all users (DONE)
7. Generate mobile native implementation prompts for handoff to another developer (DONE)
8. **NEW** Implement ARS 1000 certification modules (PDC, Traceability, Certification, Agroforestry)

## Architecture
- **Backend**: FastAPI (Python) + MongoDB Atlas (greenlink_production)
- **Frontend**: React (CRA)
- **Mobile**: Expo React Native
- **Database**: MongoDB Atlas

## ARS 1000 Module Architecture
### New Collections
- `pdc`: Plan de Developpement de la Cacaoyere (farmer development plans)
- `lots_traceabilite`: Traceability lots with quality controls
- `certification`: Cooperative certification levels (Bronze/Argent/Or)
- `arbres_ombrage`: Shade tree inventory for agroforestry compliance

### New API Routes
- `/api/ars1000/pdc/*` - PDC CRUD, submit, validate, sign
- `/api/ars1000/lots/*` - Lot management, quality controls, test reports
- `/api/ars1000/certification/*` - Dashboard, audits, NC, complaints, risks, trees

### New Frontend Pages
- `/cooperative/ars1000` - ARS 1000 Dashboard (5 tabs)
- `/farmer/pdc` - Farmer PDC form (7 steps)

## Completed Tasks
- Fixed auto-calculated "Couverture ombragee" 404 API error
- Fixed mobile strata formula in ParcelVerifyFormScreen.js
- Created Carbon Score Analytics Dashboard for Cooperatives
- Upgraded Farmer's Carbon Score page with charts and history
- Upgraded Farmer's Web Parcel Declaration form
- Generated complete Mobile App Specification (MOBILE_SPEC.md)
- Generated Field Agent, REDD+ Guide, USSD Simulator, and Messaging mobile prompts
- Fixed shade cover fallback formula (80 -> 35 m2)
- Fixed messaging contacts loading (member_id -> user_id)
- Fixed ICI profile history refresh
- Enriched history API
- **ARS 1000 PDC Module** - Full CRUD, submit, validate, sign workflow
- **ARS 1000 Lots/Traceability Module** - Quality controls (humidity, sieving, foreign bodies, cut test, fermentation), grading, test reports
- **ARS 1000 Certification Module** - Bronze/Argent/Or levels, audits, non-conformities, complaints, risks
- **ARS 1000 Agroforestry Module** - Tree inventory, density calculation, 3-strata conformity
- **Cooperative ARS 1000 Dashboard** - 5 tabs (Certification, PDC, Tracabilite, Agroforesterie, Registres)
- **Farmer PDC Form** - 7-step form (Identification, Menage, Parcelles, Arbres, Materiel, Strategie, Resume)

## Pending Issues
- P2: Emails sent via Resend going to Spam (BLOCKED: awaiting user DNS config SPF/DKIM/DMARC)

## Upcoming Tasks
- P1: Real SMS Gateway integration (Orange CI / MTN) - currently mocked
- P1: Support for local languages (Baoule/Dioula)
- P2: Clean up all test/demo data
- P2: Implement Harvest validation flow
- P2: PDF Generation (PDC official 10-page PDF, Audit report Annexe A, Lot traceability sheet)

## Future/Backlog
- P3: Refactor ussd.py (over 2700 lines)

## Mocked Services
- Orange CI SMS
- Orange Money

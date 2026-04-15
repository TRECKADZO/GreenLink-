# GreenLink Agritech - PRD

## Architecture
- Backend: FastAPI (Python) sur port 8001
- Frontend: React (CRA) sur port 3000
- Database: MongoDB | Langues: Francais

## 8 Modules ARS 1000 Implementes

### 1. PDC v2 - 4 etapes, PDF conforme, Score Ombrage
### 2. Tracabilite ARS 1000-2 - 7 etapes, Segregation, QR Codes, USSD
### 3. Audit Interne & NC - 52 exigences, NC, Rapports, Revue direction
### 4. Formation & Sensibilisation - 12 themes obligatoires, PV, Attestations
### 5. Gouvernance & Direction - 7 postes, Politique, Revue direction auto-collecte
### 6. Membres & Enregistrement - Adhesion 4 etapes, 14 champs 4.2.3.2, Perimetre SM
### 7. Tableau de Bord Consolide ARS 1000 - Score readiness global, 6 cartes modules
### 8. Simulation d'Audit Blanc - 17 clauses interactives, verdict, recommandations, PDF
- Parcours clause par clause avec boutons Conforme/NC/NA
- Score recalcule en temps reel, mini-dots de progression
- 3 verdicts: FAVORABLE / FAVORABLE AVEC RESERVES / DEFAVORABLE
- Recommandations specifiques par NC avec priorite
- Export PDF rapport complet
- Backend: /api/simulation-audit/* (7 endpoints)
- Collection: simulation_audits

## Backlog
- P1: Integration Gateway SMS reel (Orange CI / MTN)
- P1: Support langues locales (Baoule/Dioula)
- P2: Nettoyage donnees test/demo
- P2: Emails Resend (bloque sur config DNS)
- P3: Refactoring composants React volumineux

# GreenLink Agritech - PRD

## Architecture
- Backend: FastAPI (Python) sur port 8001
- Frontend: React (CRA) sur port 3000
- Database: MongoDB | Langues: Francais

## 9 Modules ARS 1000 Implementes

### 1. PDC v2 - 4 etapes, PDF conforme, Score Ombrage
### 2. Tracabilite ARS 1000-2 - 7 etapes, Segregation, QR Codes, USSD
### 3. Audit Interne & NC - 52 exigences, NC, Rapports, Revue direction
### 4. Formation & Sensibilisation - 12 themes obligatoires, PV, Attestations
### 5. Gouvernance & Direction - 7 postes, Politique, Revue direction auto-collecte
### 6. Membres & Enregistrement - Adhesion 4 etapes, 14 champs 4.2.3.2, Perimetre SM
### 7. Tableau de Bord Consolide ARS 1000 - Score readiness global, 7 modules
### 8. Simulation d'Audit Blanc - 17 clauses interactives, verdict, recommandations
### 9. Risques & Durabilite (Clauses 6.1, 6.2) - NOUVEAU
- Registre des risques avec calcul automatique (probabilite x impact)
- 6 categories: Environnement, Social, Economique, Climatique, Gouvernance, Tracabilite
- 4 niveaux: Critique (>=16), Eleve (>=9), Moyen (>=4), Faible (<4)
- Matrice par categorie, top risques, plan de mitigation
- Indicateurs environnementaux
- Backend: /api/risques/* | Collection: risques_registre, risques_indicateurs

### Dashboard Cooperatif - Mis a jour
- ModulesARSGrid integre: Barre readiness ARS 1000 + 7 cartes modules cliquables avec KPIs temps reel
- Toutes les sections dans les Actions Rapides sidebar

### Navigation - Boutons Retour (DONE - 2026-04-15)
- 26 pages avec bouton retour (data-testid="btn-retour")
- Navigation coherente: dashboards -> /cooperative/dashboard, sous-pages -> dashboard module parent
- Pattern: ChevronRight rotate-180 dans un bouton w-8 h-8 bg-white/10
- Modules couverts: Tracabilite (5), Audit (5), Formation (5), Gouvernance (4), Membres (4), Risques (1), Consolide (1), Simulation (1)

### Registre ARS 1000 Complet (DONE - 2026-04-18)
- Backend: Modele AdhesionCreate enrichi avec 5 sections (43 champs conforme registre YAKRO)
  - Identification Producteur (9 champs), Cacaoyere (12), Production (4), Travailleurs (liste dynamique), Menage (liste dynamique avec scolarisation)
- Endpoint /api/membres/coop-info GET/PUT pour infos cooperative ARS 1000 (sigle, siege, nb sections, nb magasins, nb cacaoyeres, niveau certification, campagne)
- Frontend: Formulaire adhesion 4 etapes refait (AdhesionPage.jsx) avec stepper et toutes les sections
- Frontend: Page Register enrichie avec champs ARS 1000 cooperative
- Export Excel restructure avec 5 sections + headers hierarchiques conformes au fichier officiel
- Tests: 11/11 backend, 100% frontend

### Code Quality Fixes (DONE - 2026-04-15)
- Secrets tests: 6 fichiers migres vers os.environ.get() avec fallback
- Catch vides: 12+ handlers remplaces par console.error() (farmer, ARS1000, PDC, formation)
- Array index as key: 4 instances corrigees avec identifiants stables (traceability, formation, audit)
- Python undefined: `timedelta` import ajoute (cooperative_harvests), `verify_pin` defini (ussd)
- Bare except: 6 instances remplacees par Exception/ValueError (carbon_sales, cooperative_referral, harvest_marketplace)
- Auto-fix ruff: 82 corrections automatiques (f-strings vides, imports)

## Backlog
- P1: Integration Gateway SMS reel (Orange CI / MTN)
- P1: Support langues locales (Baoule/Dioula)
- P2: Nettoyage donnees test/demo
- P2: Emails Resend (bloque sur config DNS)
- P3: Refactoring composants React volumineux

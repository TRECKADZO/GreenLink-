# GreenLink Agritech - PRD

## Probleme original
Reproduire le projet GreenLink Agritech (plateforme agritech Cote d'Ivoire) et implementer les modules ARS 1000 pour la certification du cacao durable.

## Modules implementes

### Core Platform
- Authentification JWT, Dashboard multi-roles, Notifications, USSD, Score carbone, Marketplace

### ARS 1000 - Certification Cacao Durable
1. PDC 7 Fiches - Formulaire complet Fiche 1-7
2. Lots Traceabilite (ARS 1000-2) - Controles qualite, rapports d'essai, grades
3. Certification - Niveaux Bronze/Argent/Or, audits, conformite
4. Agroforesterie - 54 especes, diagnostic cooperatif visuel, recommandations
5. Visite Terrain Agent (7 Fiches) - Workflow 10 etapes, GPS
6. Generation PDF + Export Excel - PDC 10 pages PDF, Excel 7 onglets
7. Declarations Recolte (ARS 1000-2) - Controles qualite, validation cooperative
8. Registre Reclamations/Risques/Impartialite - Matrice de risques 5x5
9. Diagnostic Conformite PDC - Score moyen cooperatif
10. Protection Environnementale - Score conformite, checklist ARS 1000
11. Widget ARS 1000, Onglet ARS 1000 Super Admin

## Architecture
- Backend: FastAPI + MongoDB | Frontend: React + Tailwind + Shadcn UI + Recharts
- PDF: ReportLab | Excel: openpyxl | SMS: Orange CI (MOCKE) | Paiement: Orange Money (MOCKE)

## Corrections recentes (10 avril 2026)
- Bug P0: Bouton "Details" sur ParcelsVerificationPage corrige (modale Dialog)
- Page accueil mise a jour (Hero + Features ARS 1000)

## Refactoring qualite code (10 avril 2026)
- Centralisation credentials tests: test_config.py (83 fichiers migres)
- Empty catch blocks corriges: offlineDB.js, offlineCooperativeApi.js
- Logger centralise: logger.js (suppression console.log en production)
- TokenService: tokenService.js (migration localStorage -> sessionStorage, 58+ fichiers)
- AuthContext migre vers tokenService
- admin_analytics.py refactore: complexite 94 -> ~10 par fonction (12 helpers)
- Array index as key: 140+ occurrences corrigees
- Hook dependencies: 210+ fixes appliques (32 warnings non-bloquants restants)
- Services API migres vers tokenService (cooperativeApi, greenlinkApi, marketplaceApi, etc.)

## Backlog
- P1: Integration SMS reel (Orange CI / MTN)
- P1: Support langues locales (Baoule/Dioula)
- P2: Nettoyage donnees test/demo
- P2: Emails Resend en spam (DNS SPF/DKIM/DMARC a configurer)
- P3: Refactoring ussd.py (2700+ lignes)
- P3: Migrer 32 hooks dependencies restants
- P3: Splitter les composants > 300 lignes (AgentMapLeaflet 1103 lignes, Profile 800 lignes)

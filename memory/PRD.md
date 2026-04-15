# GreenLink Agritech - PRD

## Architecture
- Backend: FastAPI (Python) sur port 8001
- Frontend: React (CRA) sur port 3000
- Database: MongoDB
- Langues: Francais

## 4 Modules Strategiques Implementes

### 1. PDC v2 (Plan de Developpement de la Cacaoyere)
- 4 etapes conformes aux documents officiels ARS 1000
- PDF genere conforme au "PDC du Planteur"
- Pre-remplissage ICI/SSRTE avec donnees du PDC
- Score Ombrage ARS 1000 integre au Score Carbone

### 2. Module Tracabilite ARS 1000-2 (Clauses 11-16)
- Dashboard, Flux du Cacao (7 etapes), Segregation, Rapports, Objectifs ARS
- Segregation physique automatique, QR Codes, export PDF/Excel, USSD
- Backend: /api/traceability/* (14 endpoints)

### 3. Module Audit Interne & Non-conformites (ARS 1000)
- Dashboard Conformite, Checklist digitale (52 exigences), NC & Plan d'actions, Rapports, Revue direction
- Filtres par norme (ARS 1000-1/2), niveau (Bronze/Argent/Or), conformite (C/NC/NA)
- Historique des modifications (clause 7.5), Export PDF/Excel
- Backend: /api/audit/* (15 endpoints)

### 4. Module Formation & Sensibilisation (Clauses 7.3-7.4, 12.2-12.10, 13.1-13.5) - NOUVEAU
- **Programme Annuel** : 12 themes obligatoires ARS 1000 pre-remplis
- **Sessions** : CRUD complet, themes pre-remplis, filtres par statut/theme
- **PV & Listes de Presence** : Participants depuis base membres, signature, PDF conforme audit
- **Attestations** : PDF individuel telechargeable, suivi par membre
- **Dashboard** : KPIs, couverture des themes, alertes formations manquantes
- Codes couleurs: Vert=Complete, Orange=Planifie, Rouge=Non planifie/En retard
- Backend: /api/formation/* (15 endpoints)
- Collections: formation_programmes, formation_sessions

### Autres modules existants
- Score Carbone, SSRTE/ICI, ARS 1000, Marketplace, REDD+ MRV, Messaging, Facturation

## Backlog
- P1: Integration Gateway SMS reel (Orange CI / MTN) - actuellement mocke
- P1: Support langues locales (Baoule/Dioula)
- P2: Nettoyage donnees test/demo
- P2: Emails Resend (bloque sur config DNS SPF/DKIM/DMARC)
- P3: Refactoring composants React volumineux
- P3: Refactoring fonctions backend complexes

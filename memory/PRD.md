# GreenLink Agritech - PRD

## Architecture
- Backend: FastAPI (Python) sur port 8001
- Frontend: React (CRA) sur port 3000
- Database: MongoDB
- Langues: Francais

## 5 Modules Strategiques Implementes

### 1. PDC v2 (Plan de Developpement de la Cacaoyere)
- 4 etapes conformes aux documents officiels ARS 1000
- PDF genere conforme au "PDC du Planteur"
- Pre-remplissage ICI/SSRTE, Score Ombrage ARS 1000

### 2. Module Tracabilite ARS 1000-2 (Clauses 11-16)
- Dashboard, Flux du Cacao (7 etapes), Segregation, Rapports, Objectifs
- QR Codes, export PDF/Excel, USSD | Backend: /api/traceability/*

### 3. Module Audit Interne & Non-conformites (ARS 1000)
- Checklist digitale (52 exigences), NC & Plan d'actions, Rapports, Revue direction
- Filtres norme/niveau/conformite, Export PDF/Excel | Backend: /api/audit/*

### 4. Module Formation & Sensibilisation (Clauses 7.3-7.4, 12.2-12.10, 13.1-13.5)
- Programme Annuel (12 themes obligatoires), Sessions, PV & Presence, Attestations PDF
- Dashboard, alertes formations manquantes | Backend: /api/formation/*

### 5. Module Gouvernance & Revue de Direction (Clauses 5.1, 5.2, 5.3, 9.3) - NOUVEAU
- **Organigramme & Roles** : 7 postes ARS 1000 (Resp SMCD, Coach formateur, Charge risques TE, etc.), fiches de poste, affectations, export PDF
- **Politique de Management** : Editeur, workflow brouillon > validee > diffusee, PV AG, accuses reception
- **Revue de Direction** : Formulaire guide clause 9.3 (entrees/sorties), auto-collecte des donnees des 4 autres modules (PDC, Tracabilite, Formation, Audit), validation, export PDF
- **Dashboard Gouvernance** : % postes pourvus, politiques validees, conformite globale, alertes postes vacants
- Backend: /api/gouvernance/* (14 endpoints)
- Collections: gouvernance_postes, gouvernance_politiques, gouvernance_revues

### Autres modules existants
- Score Carbone, SSRTE/ICI, ARS 1000 (certification, lots, agroforesterie), Marketplace, REDD+ MRV, Messaging, Facturation

## Backlog
- P1: Integration Gateway SMS reel (Orange CI / MTN) - actuellement mocke
- P1: Support langues locales (Baoule/Dioula)
- P2: Nettoyage donnees test/demo
- P2: Emails Resend (bloque sur config DNS SPF/DKIM/DMARC)
- P3: Refactoring composants React volumineux
- P3: Refactoring fonctions backend complexes

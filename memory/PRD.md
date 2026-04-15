# GreenLink Agritech - PRD

## Architecture
- Backend: FastAPI (Python) sur port 8001
- Frontend: React (CRA) sur port 3000
- Database: MongoDB
- Langues: Francais

## 6 Modules Strategiques ARS 1000 Implementes

### 1. PDC v2 (Plan de Developpement de la Cacaoyere)
- 4 etapes conformes aux documents officiels ARS 1000
- PDF, Pre-remplissage ICI/SSRTE, Score Ombrage

### 2. Tracabilite ARS 1000-2 (Clauses 11-16)
- Flux du Cacao (7 etapes), Segregation, QR Codes, USSD
- Backend: /api/traceability/*

### 3. Audit Interne & Non-conformites (ARS 1000)
- Checklist digitale (52 exigences), NC, Rapports, Revue direction
- Backend: /api/audit/*

### 4. Formation & Sensibilisation (Clauses 7.3-7.4, 12.2-12.10, 13.1-13.5)
- 12 themes obligatoires, Sessions, PV, Attestations PDF
- Backend: /api/formation/*

### 5. Gouvernance & Revue de Direction (Clauses 5.1, 5.2, 5.3, 9.3)
- Organigramme (7 postes ARS), Politique de management, Revue direction auto-collecte modules
- Backend: /api/gouvernance/*

### 6. Membres & Enregistrement ARS 1000 (Clauses 4.2.2, 4.2.3, 4.3) - NOUVEAU
- **Procedure d'adhesion 4 etapes** : Sensibilisation, Infos 4.2.3.2 (a-n), Bulletin/Contrat (signature + 2 temoins), Validation
- **Base de donnees** : 14 champs norme 4.2.3.2, filtres, historique, Export Excel
- **Bulletin PDF** : Genere automatiquement avec tous les champs et signatures
- **Perimetre SM** (clause 4.3) : Definition, auto-stats, exclusions, validation Direction
- **Dashboard** : 8 KPIs (total, actifs, en cours, hommes, femmes, hectares), repartition villages
- Backend: /api/membres/* (17 endpoints)
- Collections: membres_adhesions, membres_perimetres

### Autres modules existants
- Score Carbone, SSRTE/ICI, ARS 1000, Marketplace, REDD+ MRV, Messaging, Facturation

## Backlog
- P1: Integration Gateway SMS reel (Orange CI / MTN)
- P1: Support langues locales (Baoule/Dioula)
- P2: Nettoyage donnees test/demo
- P2: Emails Resend (bloque sur config DNS)
- P3: Refactoring composants React volumineux

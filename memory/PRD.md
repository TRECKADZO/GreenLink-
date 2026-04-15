# GreenLink Agritech - PRD

## Architecture
- Backend: FastAPI (Python) sur port 8001
- Frontend: React (CRA) sur port 3000
- Database: MongoDB
- Langues: Francais

## Modules Implementes

### PDC v2 (Plan de Developpement de la Cacaoyere)
- 4 etapes conformes aux documents officiels ARS 1000
- PDF genere conforme au "PDC du Planteur"
- Pre-remplissage ICI/SSRTE avec donnees du PDC
- Score Ombrage ARS 1000 integre au Score Carbone
- Acces producteur en lecture seule

### Module Tracabilite ARS 1000-2 (Clauses 11-16)
- Dashboard, Flux du Cacao, Segregation, Rapports, Objectifs ARS
- 7 etapes: Recolte > Fermentation > Sechage > Stockage > Conditionnement > Transport > Export
- Segregation physique automatique (blocage melanges certifie/non-certifie)
- QR Codes, export PDF/Excel, USSD simule
- Backend: /api/traceability/* (14 endpoints)

### Module Audit Interne & Non-conformites (ARS 1000) - NOUVEAU
- **Dashboard Conformite** (/cooperative/audit): KPIs, cartes ARS 1000-1/2, conformite par section, NC summary
- **Checklist d'Audit Interne** (/cooperative/audit/checklist): 52 exigences (38 ARS 1000-1 + 14 ARS 1000-2)
  - Colonnes fideles au Excel: Clause, Titre, Contenu detaille, Resume, Moyens, Matieres, Precision de conformite, Niveau (Bronze/Argent/Or), Type (Majeure/Mineure), Cible, Etape
  - Champs editables: Conformite (C/NC/NA), Preuves d'audit, Constatation
  - Filtres dynamiques: Par norme, niveau, cible, etape, conformite
  - Historique complet des modifications (clause 7.5)
- **Non-conformites & Plan d'actions** (/cooperative/audit/non-conformites): CRUD complet
  - N d'ordre auto, clause, constatation, type (Majeure/Mineure), cause profonde, corrections, actions correctives, responsable, date resolution, statut (Ouvert/En cours/Resolu)
  - Creation directe depuis un item NC de la checklist
- **Rapports d'audit** (/cooperative/audit/reports): Tableau recapitulatif (format identique feuille "Resultats d'audit" du Excel), export PDF/Excel
- **Revue de direction** (/cooperative/audit/revue): PV conforme clause 9.3
- Backend: /api/audit/* (15 endpoints)
- Collections MongoDB: audit_sessions, audit_checklist_items, audit_non_conformites, audit_revues_direction

### Autres modules
- Score Carbone (moteur unifie), SSRTE/ICI, ARS 1000, Marketplace, REDD+ MRV, Messaging, Facturation

## Backlog
- P1: Integration Gateway SMS reel (Orange CI / MTN) - actuellement mocke
- P1: Support langues locales (Baoule/Dioula)
- P2: Nettoyage donnees test/demo
- P2: Emails Resend (bloque sur config DNS SPF/DKIM/DMARC)
- P3: Refactoring composants React volumineux
- P3: Refactoring fonctions backend complexes

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

### Module Tracabilite ARS 1000-2 (Clauses 11-16) - NOUVEAU
- **Dashboard** (/cooperative/traceability): KPIs, repartition par etape, evenements recents, alertes
- **Flux du Cacao** (/cooperative/traceability/flow): CRUD lots, ajout evenements, timeline visuelle
  - 7 etapes: Recolte > Fermentation > Sechage > Stockage Coop > Conditionnement > Transport > Export
- **Segregation physique** (/cooperative/traceability/segregation): Magasins virtuels certifie/non-certifie, blocage automatique des melanges
- **Rapports & Audits** (/cooperative/traceability/reports): Export PDF et Excel pour auditeurs ARS 1000
- **Objectifs ARS** (/cooperative/traceability/objectives): 6 clauses avec indicateurs de progression
- **QR Codes**: Generation pour chaque lot (tracabilite sur sacs)
- **USSD**: Endpoint simule pour tracer un lot par code
- Backend: /api/traceability/* (14 endpoints)
- Collections MongoDB: traceability_lots

### Autres modules
- Score Carbone (moteur unifie)
- SSRTE/ICI (fiches de visite)
- ARS 1000 (certification, lots, agroforesterie)
- Marketplace & Harvest Marketplace
- REDD+ MRV
- Messaging, Notifications
- Facturation & Abonnements

## Backlog
- P1: Integration Gateway SMS reel (Orange CI / MTN) - actuellement mocke
- P1: Support langues locales (Baoule/Dioula)
- P2: Nettoyage donnees test/demo
- P2: Emails Resend (bloque sur config DNS SPF/DKIM/DMARC)
- P3: Refactoring composants React volumineux (AgentMapLeaflet, Profile, BillingDashboard > 700 lignes)
- P3: Refactoring fonctions backend complexes (admin_analytics, carbon_business_model)

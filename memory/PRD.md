# GreenLink Agritech - PRD

## Probleme original
Reproduire le projet GreenLink Agritech (plateforme agritech Cote d'Ivoire) et implementer les modules ARS 1000 pour la certification du cacao durable.

## Modules implementes

### Core Platform
- Authentification JWT, Dashboard multi-roles, Notifications, USSD, Score carbone, Marketplace

### ARS 1000 - Certification Cacao Durable
1. **PDC** - CRUD complet, validation, soumission
2. **Lots Traceabilite (ARS 1000-2)** - Controles qualite, rapports d'essai, grades
3. **Certification** - Niveaux Bronze/Argent/Or, audits, conformite
4. **Agroforesterie** - 54 especes, diagnostic, recommandations intelligentes
5. **Visite Terrain Agent** - Workflow 9 etapes (GPS, inventaire, signatures)
6. **Recommandation Intelligente** - Suggestions especes, plan plantation, projection score
7. **Generation PDF** - PDC 10 pages, rapport essai, fiche traceabilite
8. **Menus geographiques** - Regions, Departements, Sous-prefectures CI en cascade
9. **Declarations Recolte (ARS 1000-2)** - Formulaire planteur avec controles qualite ferme (Grade A/B/C/D), flux validation cooperative (valider/rejeter)
10. **Registre Reclamations/Risques/Impartialite** - Gestion statuts (ouverte->en_cours->resolue), suppression, declarations impartialite signees

## Architecture
- Backend: FastAPI + MongoDB | Frontend: React + Tailwind + Shadcn UI
- PDF: ReportLab | SMS: Orange CI (MOCKE) | Paiement: Orange Money (MOCKE) | Email: Resend (DNS pending)

## Fichiers cles
- `/app/backend/routes/ars1000_recoltes.py` - Declarations recolte
- `/app/backend/routes/ars1000_certification.py` - Reclamations, risques, impartialite
- `/app/frontend/src/pages/farmer/DeclarationRecoltePage.jsx` - Page declaration planteur
- `/app/frontend/src/pages/cooperative/ARS1000Dashboard.jsx` - Dashboard 9 onglets

## Backlog
- P1: Integration SMS reel (Orange CI / MTN)
- P1: Support langues locales (Baoule/Dioula)
- P2: Nettoyage donnees test/demo
- P3: Refactoring ussd.py (2700+ lignes)

## Problemes connus
- Emails Resend en spam (DNS SPF/DKIM/DMARC a configurer)

# GreenLink Agritech - PRD

## Probleme original
Reproduire le projet GreenLink Agritech (plateforme agritech Cote d'Ivoire) et implementer les modules ARS 1000 pour la certification du cacao durable.

## Modules implementes

### Core Platform
- Authentification JWT, Dashboard multi-roles, Notifications, USSD, Score carbone, Marketplace

### ARS 1000 - Certification Cacao Durable
1. **PDC 7 Fiches** - Formulaire complet Fiche 1-7 (identification+epargne, menage, exploitation+cultures, inventaire arbres, ombrage, materiel, planification strategique+programme annuel)
2. **Lots Traceabilite (ARS 1000-2)** - Controles qualite, rapports d'essai, grades
3. **Certification** - Niveaux Bronze/Argent/Or, audits, conformite
4. **Agroforesterie** - 54 especes, diagnostic cooperatif visuel, recommandations intelligentes, alertes non-conformes par planteur
5. **Visite Terrain Agent (7 Fiches)** - Workflow 10 etapes (7 fiches + Photos + Signatures + Resume), GPS, recommandations
6. **Generation PDF + Export Excel** - PDC 10 pages PDF, Excel 7 onglets par planteur
7. **Menus geographiques** - Regions, Departements, Sous-prefectures CI en cascade
8. **Declarations Recolte (ARS 1000-2)** - Controles qualite ferme, validation cooperative
9. **Registre Reclamations/Risques/Impartialite**
10. **Tableau de bord analytique recoltes** - Graphiques recharts
11. **Widget ARS 1000** - Widget certification cooperative
12. **Onglet ARS 1000 Super Admin** - Metriques qualitatives: conformite, fiches, recoltes, certifications, cooperatives
13. **Diagnostic Cooperatif Agroforesterie** - Score cooperatif, diagnostic par planteur, criteres ARS 1000, recommandations, alertes non-conformes
14. **Protection environnementale parcelles**

## Architecture
- Backend: FastAPI + MongoDB | Frontend: React + Tailwind + Shadcn UI + Recharts
- PDF: ReportLab | Excel: openpyxl | SMS: Orange CI (MOCKE) | Paiement: Orange Money (MOCKE) | Email: Resend (DNS pending)

## Backlog
- P1: Integration SMS reel (Orange CI / MTN)
- P1: Support langues locales (Baoule/Dioula)
- P2: Nettoyage donnees test/demo
- P3: Refactoring ussd.py (2700+ lignes)

## Problemes connus
- Emails Resend en spam (DNS SPF/DKIM/DMARC a configurer)

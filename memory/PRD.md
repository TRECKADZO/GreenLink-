# GreenLink Agritech - PRD

## Probleme original
Reproduire le projet GreenLink Agritech (plateforme agritech Cote d'Ivoire) et implementer les modules ARS 1000 pour la certification du cacao durable.

## Modules implementes

### Core Platform
- Authentification JWT, Dashboard multi-roles, Notifications, USSD, Score carbone, Marketplace

### ARS 1000 - Certification Cacao Durable
1. **PDC 7 Fiches** - Formulaire complet Fiche 1-7 avec navigation par etapes (identification, menage, exploitation, inventaire arbres, arbres d'ombrage, materiel, planification strategique + programme annuel)
2. **Lots Traceabilite (ARS 1000-2)** - Controles qualite, rapports d'essai, grades
3. **Certification** - Niveaux Bronze/Argent/Or, audits, conformite
4. **Agroforesterie** - 54 especes, diagnostic, recommandations intelligentes
5. **Visite Terrain Agent (7 Fiches)** - Workflow 10 etapes alignees (7 fiches + Photos + Signatures + Resume), GPS, recommandations intelligentes
6. **Recommandation Intelligente** - Suggestions especes, plan plantation, projection score
7. **Generation PDF** - PDC 10 pages, rapport essai, fiche traceabilite
8. **Menus geographiques** - Regions, Departements, Sous-prefectures CI en cascade
9. **Declarations Recolte (ARS 1000-2)** - Formulaire planteur avec controles qualite ferme (Grade A/B/C/D), flux validation cooperative
10. **Registre Reclamations/Risques/Impartialite** - Gestion statuts, suppression, declarations impartialite
11. **Tableau de bord analytique recoltes** - Graphiques recharts (volume/campagne, qualite/parcelle, distribution grades, evolution mensuelle, top planteurs)
12. **Widget ARS 1000** - Widget certification sur dashboard principal cooperative (niveau, conformite %, PDC, kg recoltes)
13. **Reclamations agriculteur** - Les planteurs peuvent soumettre des reclamations depuis leur dashboard, la cooperative les traite
14. **Protection environnementale parcelles** - Mesures liees aux parcelles des agriculteurs (cours d'eau, anti-erosion, reforestation, zone risque)

## Schema PDC 7 Fiches (Nouveau)
- **Fiche 1**: Identification du producteur + situation epargne (mobile money, microfinance, banque)
- **Fiche 2**: Situation du menage - tableau detaille 8 lignes (proprietaire, gerant, conjoints, enfants 0-6/6-18/+18, manoeuvres, autres) x (nombre, ecole, niveaux instruction, temps travail)
- **Fiche 3**: Description exploitation (superficies, eau) + tableau cultures (nom, superficie, annee, source materiel, production, revenu)
- **Fiche 4**: Inventaire arbres autres que cacaoyer (nom botanique, nom local, circonference, GPS, origine, decision)
- **Fiche 5**: Resume arbres d'ombrage (strate 1/2/3 + total)
- **Fiche 6**: Materiel agricole (16 equipements: traitement, transport, deplacement, sechage, fermentation, outillage) x (quantite, annee, cout, etat)
- **Fiche 7a**: Matrice planification strategique (6 axes x objectifs, activites, cout, annees A1-A5, responsable, partenaires)
- **Fiche 7b**: Programme annuel d'action (axe, activite, sous-activite, indicateurs, trimestres T1-T4, execution, appui, cout)

## Architecture
- Backend: FastAPI + MongoDB | Frontend: React + Tailwind + Shadcn UI + Recharts
- PDF: ReportLab | SMS: Orange CI (MOCKE) | Paiement: Orange Money (MOCKE) | Email: Resend (DNS pending)

## Backlog
- P1: Integration SMS reel (Orange CI / MTN)
- P1: Support langues locales (Baoule/Dioula)
- P2: Nettoyage donnees test/demo
- P3: Refactoring ussd.py (2700+ lignes)

## Problemes connus
- Emails Resend en spam (DNS SPF/DKIM/DMARC a configurer)

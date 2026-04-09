# GreenLink Agritech - PRD

## Probleme original
Reproduire le projet GreenLink Agritech (plateforme agritech Cote d'Ivoire) et implementer les modules ARS 1000 pour la certification du cacao durable.

## Modules implementes

### Core Platform
- Authentification JWT, Dashboard multi-roles, Notifications, USSD, Score carbone, Marketplace

### ARS 1000 - Certification Cacao Durable
1. **PDC 7 Fiches** - Formulaire complet Fiche 1-7 avec navigation par etapes (identification, epargne, menage, exploitation, inventaire arbres, arbres d'ombrage, materiel, planification strategique + programme annuel)
2. **Lots Traceabilite (ARS 1000-2)** - Controles qualite, rapports d'essai, grades
3. **Certification** - Niveaux Bronze/Argent/Or, audits, conformite
4. **Agroforesterie** - 54 especes, diagnostic, recommandations intelligentes
5. **Visite Terrain Agent (7 Fiches)** - Workflow 10 etapes alignees (7 fiches + Photos + Signatures + Resume), GPS, recommandations intelligentes
6. **Recommandation Intelligente** - Suggestions especes, plan plantation, projection score
7. **Generation PDF** - PDC 10 pages, rapport essai, fiche traceabilite
8. **Export Excel PDC** - Export individuel par planteur avec 7 onglets (F1-Identification a F7-Planification)
9. **Menus geographiques** - Regions, Departements, Sous-prefectures CI en cascade
10. **Declarations Recolte (ARS 1000-2)** - Formulaire planteur avec controles qualite ferme
11. **Registre Reclamations/Risques/Impartialite** - Gestion statuts, suppression, declarations impartialite
12. **Tableau de bord analytique recoltes** - Graphiques recharts
13. **Widget ARS 1000** - Widget certification sur dashboard cooperative
14. **Onglet ARS 1000 Super Admin** - Metriques qualitatives: distribution conformite, taux remplissage par fiche, qualite recoltes par grade, top cooperatives, certifications, reclamations, agroforesterie
15. **Protection environnementale parcelles**

## Schema PDC 7 Fiches
- Fiche 1: Identification + epargne (mobile money, microfinance, banque)
- Fiche 2: Menage - tableau 8 lignes x niveaux instruction + travail
- Fiche 3: Exploitation (superficies, eau) + cultures (nom, superficie, annee, source, production, revenu)
- Fiche 4: Inventaire arbres (nom botanique, local, circonference, GPS, decision)
- Fiche 5: Arbres d'ombrage (strates 1/2/3 + total)
- Fiche 6: Materiel (16 equipements x quantite, annee, cout, etat)
- Fiche 7a: Matrice strategique (6 axes x objectifs, activites, cout, A1-A5, responsable)
- Fiche 7b: Programme annuel (axe, activite, sous-activite, indicateurs, T1-T4, execution, appui, cout)

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

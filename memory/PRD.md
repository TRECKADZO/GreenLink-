# GreenLink Agritech - PRD

## Probleme original
Reproduire le projet GreenLink Agritech (plateforme agritech Cote d'Ivoire) et implementer les modules ARS 1000 pour la certification du cacao durable.

## Utilisateurs
- **Admin** : Supervision globale
- **Cooperative** : Gestion des planteurs, lots, certification ARS 1000
- **Agent Terrain** : Visites de terrain, completion PDC, inventaire arbres
- **Planteur/Producteur** : Consultation de son PDC, suivi conformite

## Modules implementes

### Core Platform
- Authentification JWT (login, register, forgot-password)
- Dashboard multi-roles (admin, cooperative, planteur, agent terrain)
- Systeme de notification
- USSD gateway
- Score carbone
- Marketplace

### ARS 1000 - Certification Cacao Durable
1. **PDC (Plan de Developpement de la Cacaoyere)** - CRUD complet, validation cooperative, soumission
2. **Lots Traceabilite (ARS 1000-2)** - Controles qualite, rapports d'essai, grades
3. **Certification** - Niveaux Bronze/Argent/Or, cycle d'audit, conformite globale
4. **Agroforesterie** - Base de donnees 54 especes, 10 especes interdites, diagnostic parcelle
5. **Visite Terrain Agent** - Workflow 9 etapes (identification, menage, parcelles GPS, inventaire arbres, materiel, strategie, photos, signatures, resume)
6. **Systeme de Recommandation Intelligent** - Analyse des manques, suggestions d'especes specifiques avec quantites, plan de plantation, projection de score
7. **Generation PDF Automatique** :
   - PDC officiel 10 pages (format ARS 1000-1)
   - Rapport d'essai (ARS 1000-2)
   - Fiche traceabilite lot
8. **Menus deroulants geographiques** - Regions, Departements, Sous-prefectures de Cote d'Ivoire en cascade (PDC planteur + visite agent + inscription)

## Architecture technique
- Backend: FastAPI + MongoDB (Motor async)
- Frontend: React + Tailwind CSS + Shadcn UI
- PDF: ReportLab
- SMS: Orange CI (MOCKE)
- Paiement: Orange Money (MOCKE)
- Email: Resend (DNS pending)

## Fichiers cles
- `/app/frontend/src/data/divisionsCI.js` - Donnees divisions administratives CI
- `/app/frontend/src/components/GeoSelectCI.jsx` - Composant reutilisable selection geographique
- `/app/backend/routes/ars1000_pdf.py` - Generation PDF
- `/app/backend/routes/ars1000_agroforesterie.py` - Recommandations + especes

## Backlog
- P1: Integration SMS reel (Orange CI / MTN)
- P1: Support langues locales (Baoule/Dioula)
- P2: Nettoyage donnees test/demo
- P2: Flux validation recoltes (ARS 1000-2)
- P2: Registre reclamations/risques/impartialite
- P3: Refactoring ussd.py (2700+ lignes)

## Problemes connus
- Emails Resend en spam (DNS SPF/DKIM/DMARC a configurer par l'utilisateur)

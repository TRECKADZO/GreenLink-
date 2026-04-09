# GreenLink Agritech - Product Requirements Document

## Original Problem Statement
Implementer le projet GreenLink Agritech avec modules ARS 1000, workflow visite terrain PDC,
et modules agroforesterie avances selon les Lignes Directrices officielles CI.

## Architecture
- **Backend**: FastAPI (Python) + MongoDB Atlas (greenlink_production)
- **Frontend**: React (CRA) + Tailwind CSS + Shadcn UI
- **Mobile**: Expo React Native
- **Database**: MongoDB Atlas

## ARS 1000 Module Architecture

### Collections MongoDB
- `pdc`: Plans de Developpement Cacaoyer (PDC)
- `lots_traceabilite`: Lots tracabilite avec controles qualite (ARS 1000-2)
- `certification`: Niveaux certification cooperative (Bronze/Argent/Or) (ARS 1000-3)
- `arbres_ombrage`: Inventaire arbres ombrage
- `protection_environnementale`: Mesures de protection env.

### API Routes
- `/api/ars1000/pdc/*` - PDC CRUD, submit, validate, sign, agent-visit, complete-visit
- `/api/ars1000/lots/*` - Lots, quality controls, test reports
- `/api/ars1000/certification/*` - Dashboard, audits, NC, reclamations, risques, arbres
- `/api/ars1000/agroforesterie/*` - Especes (44+10), diagnostic, pepiniere, protection env

### Frontend Pages
- `/cooperative/ars1000` - ARS 1000 Dashboard (8 onglets)
- `/farmer/pdc` - Formulaire PDC planteur (7 etapes)
- `/agent/visite-pdc` - Visite terrain agent (9 etapes, GPS, photos, signatures canvas)
- `/guide-agroforesterie` - Guide interactif especes + pepiniere + diagnostic + protection

## Completed Features

### ARS 1000-1 : PDC
- Formulaire PDC complet (identification, menage, parcelles, arbres, materiel, strategie)
- Workflow: brouillon -> soumis -> valide (par cooperative)
- Calcul automatique % conformite

### ARS 1000-2 : Tracabilite & Qualite
- Registre lots avec code automatique
- Controles qualite: humidite (≤8%), tamisage (≤1.5%), corps etrangers (≤0.75%)
- Epreuve coupe (300 feves), fermentation
- Grading automatique (Grade 1/2/3/SS)
- Generation rapport d'essai

### ARS 1000-3 : Certification
- Niveaux: Bronze (38%/78%), Argent (90%/100%), Or (100%/100%)
- Cycle audits, non-conformites, reclamations, risques impartialite
- Dashboard temps reel avec conformite calculee

### Visite Terrain Agent PDC
- Formulaire 9 etapes avec GPS, photos camera, inventaire arbres individuel
- Signature canvas (dessin) planteur + agent
- Notification automatique cooperative apres completion

### Agroforesterie Avancee (6 modules)
1. **Base de donnees 54 especes** : 44 compatibles (S3:14, S2:14, S1:7, bordure:5, jachere:4) + 10 interdites
2. **Calcul conformite avance** : 6 criteres ponderes (densite, especes, strate 3, 2+ strates, ombrage, liste noire)
3. **Guide interactif especes** : Recherche, filtres strate/usage, fiches detaillees
4. **Calendrier pepiniere** : Timeline groupee par duree, techniques reproduction
5. **Diagnostic automatique parcelle** : Score + recommandations personnalisees
6. **Protection environnementale** : Cours eau (min 10m), anti-erosion, reforestation, zones risque

## Pending Issues
- P2: Emails Resend en Spam (BLOQUE: DNS SPF/DKIM/DMARC)

## Upcoming Tasks
- P2: Generation PDF (PDC 10 pages, rapport audit Annexe A, fiche tracabilite lot)
- P2: Nettoyage donnees test/demo
- P2: Flux validation recoltes
- P1: Integration SMS reelle (Orange CI / MTN)
- P1: Support langues locales (Baoule/Dioula)

## Future/Backlog
- P3: Refactoring ussd.py (+2700 lignes)
- P3: Menu USSD mise a jour PDC
- P3: Notifications WhatsApp/Push

## Mocked Services
- Orange CI SMS, Orange Money

# GreenLink - Product Requirements Document

## Probleme Original
Plateforme numerique pour les cooperatives de cacao/cafe en Cote d'Ivoire.

## Architecture
- **Frontend**: React + Shadcn/UI + Tailwind CSS
- **Backend**: FastAPI + MongoDB Atlas
- **Mobile**: Expo SDK 53 + React Native

## Fonctionnalites Implementees

### Attribution Fermier-Agent (17 Mars 2026)
- 5 endpoints API, modale attribution web, offline mobile

### Fiche ICI (18 Mars 2026)
- ChildDetail (prenom, sexe, age, scolarise, travaille)

### Approche Farmer-Centric (18 Mars 2026)
- Web + Mobile: workflow selection fermier -> toutes les fiches

### Suivi Completion Formulaires (18 Mars 2026)
- 5 formulaires suivis: ICI, SSRTE, Parcelles, Photos, Enregistrement

### Abonnement par DEVIS (18 Mars 2026)
- 15 jours gratuits pour fournisseurs/acheteurs/entreprises RSE
- Workflow: inscription -> trial 15j -> formulaire devis -> approbation admin
- **Tarification personnalisee par le Super Admin:**
  - Montant abonnement XOF fixe individuellement par devis
  - Cycle facturation: mensuel/trimestriel/annuel
  - Fournisseurs: commission 3-5% sur chaque vente + abonnement
  - Acheteurs: montant mensuel/annuel uniquement (pas de commission)
  - Entreprises RSE: montant mensuel/annuel uniquement (pas de commission)
  - Montant affiche dans le dashboard de CHAQUE utilisateur
- **Dashboards avec tarification:**
  - Fournisseur: abonnement + commission + facturation
  - Acheteur: abonnement + facturation (sans commission)
  - Entreprise RSE: abonnement + facturation (sans commission)
- Admin: approuver/rejeter devis + activer/suspendre/supprimer comptes
- Notifications email automatiques (MOCK si SMTP non configure)

### Tarifs Page Accueil + FAQ (18 Mars 2026)
- Producteurs/Cooperatives: GRATUIT
- Fournisseurs: Sur devis - Commission 3-5% + abonnement sur devis
- Acheteurs/RSE: Sur devis - 15 jours gratuits
- Section 3 etapes workflow devis

### Dashboard RSE Enrichi + Formulaire Credit Carbone (18 Mars 2026)
- **Nouveau endpoint**: GET /api/rse/dashboard-stats avec metriques:
  - Conformite EUDR (deforestation-free, geolocalisation, verification terrain)
  - Monitoring travail enfants (fiches ICI, visites SSRTE, cas risques, alertes)
  - Tracabilite chaine approvisionnement (cooperatives, producteurs, parcelles, hectares, certifications)
  - Marche carbone (credits disponibles, tonnes, prix moyen/min/max, types)
  - Mon impact (tonnes compensees, investissement XOF, achats)
  - Score ESG global (E: environnement, S: social, G: gouvernance) avec details
- **Dashboard RSE redesigne** avec theme sombre professionnel:
  - Score ESG avec anneau SVG anime
  - Cartes EUDR compliance avec barres de progression
  - Section monitoring travail enfants avec ICI/SSRTE stats
  - Apercu marche carbone avec types et prix
  - Tracabilite avec certifications (UTZ, Fairtrade, Bio, Rainforest Alliance)
  - Carte interactive, evolution mensuelle, histoires d'impact
- **Formulaire credit carbone ameliore** en 4 etapes:
  - Etape 1: Type de projet + dates debut/fin
  - Etape 2: Standard, organisme certificateur, quantite, methodologie
  - Etape 3: Localisation, surface, impact social, plan MRV
  - Etape 4: Additionnalite, permanence, fuites, co-benefices, ODD, consentement CLIP/FPIC

## Services MOCK
- Orange Money, Orange SMS, USSD Gateway, Email (SMTP non configure)

## Backlog
### P0
- [ ] Rebuild APK/AAB v1.29.0
### P1
- [ ] Soumission AAB Google Play
- [ ] Configurer SMTP pour emails reels
### P2
- [ ] Langues Baoule/Dioula
- [ ] Notifications multi-canal
- [ ] Stockage cloud fichiers
- [ ] Refactoring cooperative.py et ssrte.py

## Credentials
- Admin: klenakan.eric@gmail.com / 474Treckadzo
- Coop: bielaghana@gmail.com / greenlink2024
- Agent: +2250709005301 / greenlink2024
- Fournisseur: intrants-ci@test.com / test1234 (35000/mois, 5%)
- Acheteur: acheteur-devis@test.com / test1234 (500000/an)
- RSE: rse-devis@test.com / test1234 (150000/trimestre)

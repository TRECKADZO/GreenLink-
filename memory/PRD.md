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
- Tarification personnalisee par le Super Admin
- Admin: approuver/rejeter devis + activer/suspendre/supprimer comptes

### Dashboard RSE Enrichi + Formulaire Credit Carbone (18 Mars 2026)
- Nouveau endpoint GET /api/rse/dashboard-stats
- Score ESG (E/S/G), conformite EUDR, monitoring travail enfants
- Tracabilite chaine approvisionnement, marche carbone
- Formulaire credit carbone en 4 etapes avec champs ESG

### Build Mobile v1.29.0 (18 Mars 2026)
- APK: https://expo.dev/artifacts/eas/upC9yPPseDnn2nAnLQ3iDj.apk
- AAB: https://expo.dev/artifacts/eas/ih1ynZ2bAEhV7BMJySssJS.aab

### Portail Agent Terrain Mobile Restructure (18 Mars 2026)
- **FieldAgentDashboard.js**: 3 onglets (Dashboard, Agriculteurs, Recherche) comme la version web
  - Onglet Dashboard: stats KPIs, alerte enfants, CTA "Selectionnez un agriculteur", risques, activites
  - Onglet Agriculteurs: liste filtrable, barres progression, badges completion, count parcelles
  - Onglet Recherche: recherche par telephone, resultat -> profil fermier
- **FarmerProfileScreen.js**: Profil enrichi avec:
  - Header avec badge "Valide" si 100%
  - Section progression: cercle pourcentage, barre progression, mini-icones statut par fiche
  - Banniere validation verte quand toutes les fiches sont completes
  - Liste fiches avec numeros d'etapes (1-5), badges "Complete", descriptions
  - Section parcelles avec score carbone
- **FarmerSearchScreen.js**: Workflow farmer-centric
  - Bouton unique "Ouvrir les fiches" -> navigue vers FarmerProfile (plus CoopMemberDetail)
- **Workflow**: Dashboard -> Selectionner fermier -> Profil fermier -> Fiches a remplir -> Validation

## Services MOCK
- Orange Money, Orange SMS, USSD Gateway, Email (SMTP non configure)

## Backlog
### P0
- [ ] Rebuild APK/AAB v1.30.0 avec portail agent restructure
### P1
- [ ] Soumission AAB Google Play Store
- [ ] Configurer SMTP pour emails reels
### P2
- [ ] Langues Baoule/Dioula
- [ ] Stockage cloud fichiers
- [ ] Refactoring cooperative.py et ssrte.py

## Credentials
- Admin: klenakan.eric@gmail.com / 474Treckadzo
- Coop: bielaghana@gmail.com / greenlink2024
- Agent: +2250709005301 / greenlink2024
- Fournisseur: intrants-ci@test.com / test1234
- Acheteur: acheteur-devis@test.com / test1234
- RSE: rse-devis@test.com / test1234

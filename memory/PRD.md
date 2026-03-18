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
- Notifications email automatiques (MOCK si SMTP non configure)

### Dashboard RSE Enrichi + Formulaire Credit Carbone (18 Mars 2026)
- Nouveau endpoint GET /api/rse/dashboard-stats
- Score ESG (E/S/G), conformite EUDR, monitoring travail enfants
- Tracabilite chaine approvisionnement, marche carbone
- Formulaire credit carbone en 4 etapes avec champs ESG

### Build Mobile v1.29.0 (18 Mars 2026)
- APK (preview): https://expo.dev/artifacts/eas/upC9yPPseDnn2nAnLQ3iDj.apk
- AAB (production): https://expo.dev/artifacts/eas/ih1ynZ2bAEhV7BMJySssJS.aab
- Version code APK: 28, AAB: 29
- Expo SDK 53, Runtime 1.29.0

## Services MOCK
- Orange Money, Orange SMS, USSD Gateway, Email (SMTP non configure)

## Backlog
### P1
- [ ] Soumission AAB Google Play Store
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

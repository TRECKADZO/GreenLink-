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
- 15 jours gratuits, tarification personnalisee par Super Admin

### Dashboard RSE Enrichi + Formulaire Credit Carbone (18 Mars 2026)
- Score ESG, conformite EUDR, monitoring travail enfants, tracabilite

### Portail Agent Terrain Mobile (18 Mars 2026)
- v1.30: 3 onglets internes (Dashboard/Agriculteurs/Recherche), profil fermier enrichi
- v1.31: Suppression "Actions Rapides" redondantes, barre navigation simplifiee:
  - Accueil (dashboard avec onglets) | Visites (SSRTE stats) | Alertes | Profil
  - Bug ParcelVerificationScreen corrige
  - Workflow farmer-centric: selectionner fermier -> voir/remplir fiches -> validation

### Build Mobile v1.31.0 (18 Mars 2026)
- APK: https://expo.dev/artifacts/eas/nnqCHVA2EhctFUVGCtHT4Q.apk
- AAB: https://expo.dev/artifacts/eas/4ZotmyDhBHj2CrDs9ybyug.aab

## Services MOCK
- Orange Money, Orange SMS, USSD Gateway, Email

## Backlog
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

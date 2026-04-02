# GreenLink Agritech - PRD

## Probleme Original
Plateforme agricole complete (React + FastAPI + Expo React Native + MongoDB) pour la Cote d'Ivoire.
**Message principal** : Prime carbone accessible via USSD pour les petits planteurs.

## Architecture
- **Backend**: FastAPI (Python) + MongoDB Atlas (`greenlink_production`)
- **Frontend**: React (Vite) + Shadcn UI
- **Mobile**: Expo React Native v1.74.0 (SDK 53)

## Modele Economique
**Cooperatives : 100% GRATUIT** — acces complet, sans abonnement.
**Formule Prime Carbone** :
```
Prix vente RSE = 30% frais + 70% (25% GreenLink + 70% agriculteurs + 5% cooperatives)
```
**Devise** : Toutes les donnees monetaires en **XOF**.

## Terminologie Officielle (31 mars 2026)
- ~~REDD+~~ → "Pratiques Durables" / "Impact Environnemental" / "Suivi & Verification"
- ~~ARS 1000~~ → "Score Pratiques Durables" / "Certification Qualite" / supprime
- ~~Bronze/Argent/Or~~ → **Bon / Tres Bon / Excellent** (niveaux planteur)
- ~~Conformite ARS~~ → "Prime bonifiee grace a vos bonnes pratiques"
- Code interne: variables/routes/collections MongoDB gardent les noms originaux (ars_, redd_)

## Ce qui est implemente

### Core
- Auth JWT, Dashboards (cooperative, admin, farmer, agent)
- Marketplace, FAQ, Notifications, Conformite EUDR & certification

### Pratiques Durables
- Guide des 21 pratiques (5 categories)
- Dashboard MRV & Suivi + Export PDF
- SSRTE/ICI alertes + dashboard
- KPIs complets sans restriction
- Onglet "Impact Environnemental" Super Admin

### Score Carbone (0-10)
- USSD : 14 questions (9 base + 3 bonus) — textes reformules centres planteur
- Agent terrain : 5 pratiques eco + 21 pratiques durables (5 categories)
- Verification parcelle : integre les visites de suivi

### Menus USSD reformules
- "Estimation de ma prime" (ex: "Prime carbone + conformite ARS")
- "Mes pratiques durables" (ex: "Mes donnees ARS 1000")
- "Conseils pour ma prime" (ex: "Conseils pratiques ARS")
- Niveaux: Excellent/Tres Bon/Bon (ex: Or/Argent/Bronze)

### Build APK Mobile
- AAB v1.76.0 (versionCode 71, nouvelle icône): https://expo.dev/artifacts/eas/p9urNq29d8SkXcF1uta7ZJ.aab
- APK v1.76.0: https://expo.dev/accounts/treckadzo/projects/greenlink-farmer/builds/9959655a-5fba-4bea-809d-ae2eaad44c58

## Travail complété (2 avril 2026)
- Migration automatique MongoDB : script `data_seed/restore_if_empty.py` qui restaure les données au démarrage si la base est vide (55 collections, 108 users)
- Amélioration UI réinitialisation de mot de passe : code affiché en grand format avec instructions claires
- Archive de données compressée incluse dans le backend pour les déploiements frais
- Suppression complète de toutes les références visibles "REDD+" dans le code mobile (FarmerProfileScreen, AppContent, HomeScreen, ussdOfflineEngine)
- Suppression "REDD+" dans les réponses USSD backend, API redd_tracking, rapports PDF (redd_pdf)
- Correction badge "REDD+" → "Environnement" dans CarbonAuditorsPage (frontend web)
- Mise à jour des level_label REDD+ → termes simplifiés (Excellent, Très Bon, Bon, En Progression, À Améliorer)

## Backlog
### P2
- Passerelle SMS reelle Orange CI / MTN (MOCK)
- Langues locales (Baoule/Dioula) mobile
### P3
- Refactoriser ussd.py
- Nettoyage code mort (subscription files)

## Credentials
- Admin: `klenakan.eric@gmail.com` / `474Treckadzo`
- Test farmer: `+2250707070707`

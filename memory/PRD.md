# GreenLink Agritech - PRD

## Probleme Original
Plateforme agricole complete (React + FastAPI + Expo React Native + MongoDB) pour la Cote d'Ivoire.
**Message principal** : Prime carbone accessible via USSD pour les petits planteurs.

## Architecture
- **Backend**: FastAPI (Python) + MongoDB Atlas (`greenlink_production`)
- **Frontend**: React (Vite) + Shadcn UI
- **Mobile**: Expo React Native v1.76.0 (SDK 53) + **expo-sqlite** (stockage local)

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
- AAB v1.76.0 (versionCode 71, nouvelle icone): https://expo.dev/artifacts/eas/p9urNq29d8SkXcF1uta7ZJ.aab
- APK v1.76.0: https://expo.dev/accounts/treckadzo/projects/greenlink-farmer/builds/9959655a-5fba-4bea-809d-ae2eaad44c58

### Base de donnees
- MongoDB Atlas (Cluster0): `mongodb+srv://klenakaneric_db_user:474Treckadzo@cluster0.ieoimmt.mongodb.net/?appName=Cluster0`
- DB: `greenlink_production` — 55 collections, 1072 documents

### Stockage Local SQLite (3 avril 2026)
- **expo-sqlite@15.2.14** integre dans l'app mobile (SDK 53)
- Schema SQLite avec 10 tables miroir des collections MongoDB cles :
  `users`, `parcels`, `harvests`, `products`, `orders`, `notifications`, `messages`, `carbon_scores`, `payments`, `pending_sync`
- `DatabaseContext` avec DAOs complets (upsert, upsertMany, getBy*, search, delete)
- File `pending_sync` pour queue d'actions offline avec retry automatique
- Sync bidirectionnel : push pending actions → pull from server
- Auto-sync au login, au retour foreground, et nettoyage au logout
- Fichiers : `src/services/database.js`, `src/context/DatabaseContext.js`

## Travail complete
- (2 avr) Migration auto MongoDB, UI mot de passe oublie, suppression REDD+/ARS 1000
- (3 avr) Expo SQLite integre avec 10 tables, DAOs, sync bidirectionnel, DatabaseContext

## Backlog
### P0
- Mettre a jour MONGO_URL dans les Secrets Emergent Dashboard (action utilisateur)
### P2
- Passerelle SMS reelle Orange CI / MTN (MOCK)
- Langues locales (Baoule/Dioula) mobile
### P3
- Refactoriser ussd.py
- Nettoyage code mort (subscription files)

## Credentials
- Admin: `klenakan.eric@gmail.com` / `474Treckadzo`
- Test farmer: `+2250707070707`

# GreenLink Agritech - PRD

## Probleme Original
Plateforme agricole complete (React + FastAPI + Expo React Native + MongoDB) pour la Cote d'Ivoire.

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
**Devise** : Toutes les donnees monetaires en **XOF** (Franc CFA BCEAO).

## Ce qui est implemente

### Core
- Auth JWT, Dashboards (cooperative, admin, farmer, agent)
- Marketplace, FAQ, Notifications, Conformite EUDR & ARS 1000

### REDD+ / SSRTE / ICI
- Guide REDD+ (21 pratiques, 5 categories)
- Dashboard MRV REDD+ + Export PDF
- SSRTE/ICI alertes + dashboard
- KPIs complets sans restriction

### Score Carbone (0-10)
- USSD : 9 questions + REDD+ (biochar, zero-def, reboisement)
- Agent terrain : 5 pratiques eco + 21 pratiques REDD+ (5 categories)
- Verification parcelle : integre les visites REDD+ tracking

### Conversion USD → XOF (31 Mars 2026)
- BillingDashboard.jsx : tous montants en XOF (factures, paiements, overview)
- CarbonBusinessDashboard.jsx : distribution 30/25/70/5, prix marche en XOF, simulateur en XOF
- Formulaires de saisie convertis (prix/tonne XOF, montant paiement XOF)
- Conversion backend transparente (1 USD = 655 XOF)
- Distribution affichee corrigee : 27%/20%/75%/5% → 30%/25%/70%/5%

## Build APK Mobile
- APK: https://expo.dev/artifacts/eas/bFGGgTSa5yoMchWxr4KYPe.apk
- Version: 1.74.0 (build 69)

## Backlog
### P2
- Passerelle SMS reelle Orange CI / MTN (MOCK)
- Langues locales (Baoule/Dioula) mobile
### P3
- Refactoriser ussd.py (>2400 lignes)
- Optimiser get_coop_members (N+1)
- Nettoyage code mort (subscription files)

## Credentials
- Admin: `klenakan.eric@gmail.com` / `474Treckadzo`
- Expo: `treckadzo` / `474Treckadzo$1986`
- Test farmer: `+2250707070707`

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
**Devise** : Toutes les donnees monetaires en **XOF** (Franc CFA BCEAO).

## Ce qui est implemente

### Core
- Auth JWT, Dashboards (cooperative, admin, farmer, agent)
- Marketplace, FAQ, Notifications, Conformite EUDR & ARS 1000

### Pratiques Durables (anciennement REDD+)
- Guide des 21 pratiques durables (5 categories)
- Dashboard MRV & Suivi + Export PDF
- SSRTE/ICI alertes + dashboard
- KPIs complets sans restriction
- **IMPORTANT** : Le terme "REDD+" a ete retire de toute l'UI (31 mars 2026). Le code backend conserve les noms de variables/routes internes (`redd_tracking_visits`, `redd_agent`, etc.) mais aucun texte visible ne mentionne REDD+. Terminologie de remplacement : "Pratiques Durables", "Impact Environnemental", "Suivi & Verification".

### Score Carbone (0-10)
- USSD : 9 questions + pratiques durables (biochar, zero-def, reboisement)
- Agent terrain : 5 pratiques eco + 21 pratiques durables (5 categories)
- Verification parcelle : integre les visites de suivi

### Conversions et Dashboards
- Tous montants Super Admin en XOF
- Onglet "Impact Environnemental" Super Admin avec 6 sections (carbone, conformite, social, MRV, cooperatives, investisseurs)
- Triple Casquette auditeurs : Carbone + SSRTE + Environnemental

### Build APK Mobile
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

# GreenLink Agritech - PRD

## Probleme Original
Plateforme agricole complete (React + FastAPI + Expo React Native + MongoDB) pour la Cote d'Ivoire.

## Architecture
- **Backend**: FastAPI (Python) + MongoDB Atlas (`greenlink_production`)
- **Frontend**: React (Vite) + Shadcn UI
- **Mobile**: Expo React Native v1.74.0 (SDK 53)
- **Proxy CDN**: Bunny CDN (frontend)
- **Mobile API Proxy**: Cloudflare Worker -> `https://greenlink-agritech.com`

## Modele Economique
**Cooperatives : 100% GRATUIT** — acces complet, sans abonnement, sans limite de temps.
Producteurs : gratuit a vie.
Acheteurs/Fournisseurs/RSE : sur devis.

## Ce qui est implemente

### Core
- Auth JWT, Dashboards (cooperative, admin, farmer, agent)
- Marketplace, FAQ, Notifications
- Conformite EUDR & ARS 1000

### USSD / Carbon
- Calculateur carbone USSD (9 questions)
- Resultats USSD: Score, Prime estimee, Niveau ARS

### REDD+
- Guide REDD+ (21 pratiques, 5 categories) - Web + Mobile
- Dashboard MRV REDD+ + Export PDF professionnel
- Fiche de suivi REDD+ agents terrain

### SSRTE/ICI
- SSRTE/ICI alertes USSD
- Dashboard SSRTE cooperatives

### KPIs REDD+, SSRTE & ICI + Graphiques
- `GET /api/cooperative/dashboard-kpis` — toutes les donnees, sans restriction
- `GET /api/cooperative/dashboard-charts` — graphiques temps reel complets
- 4 graphiques recharts (CO2, SSRTE, Risques, Pratiques)

### Export PDF Dashboard
- `GET /api/cooperative/pdf/dashboard-report` — acces libre

### Gratuite Cooperatives (31 Mars 2026)
- **Backend** : Suppression de tout gating par abonnement sur dashboard-kpis, dashboard-charts, dashboard-report
- **Frontend** : 
  - Page accueil : PricingSection reecrite — carte unique "Gratuit" avec toutes les fonctionnalites
  - CTASection : suppression reference "6 mois essai"
  - Dashboard : suppression SubscriptionBanner, REDDWidget/SSRTEWidget sans etat verrouille
  - QuickActions : tous les liens visibles (MRV, SSRTE/ICI)
  - MRVDashboard : acces libre sans blocage
  - FAQPage : reecrite pour refléter la gratuite
- **Tests** : 100% pass (iteration 87)

### Build APK Mobile (30 Mars 2026)
- APK: https://expo.dev/artifacts/eas/bFGGgTSa5yoMchWxr4KYPe.apk
- Version: 1.74.0 (build 69), SDK Expo 53

## Design System
- Theme "Organic & Earthy" - vert foret (#1A3622), blanc os (#FAF9F6), or (#D4AF37), terre cuite (#C25E30)

## Backlog

### P1
- SSL custom domain Cloudflare (bloque - propagation)

### P2
- Passerelle SMS reelle Orange CI / MTN (actuellement MOCK)
- Langues locales (Baoule/Dioula) mobile

### P3
- Refactoriser ussd.py (>2400 lignes)
- Optimiser get_coop_members (N+1)
- Nettoyage : supprimer subscription_guard.py, coop_subscription_models.py, SubscriptionBanner.jsx (code mort)

## Credentials
- Admin: `klenakan.eric@gmail.com` / `474Treckadzo`
- Expo: `treckadzo` / `474Treckadzo$1986`
- Test farmer: `+2250707070707`

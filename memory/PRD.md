# GreenLink Agritech - PRD

## Probleme Original
Plateforme agricole complete (React + FastAPI + Expo React Native + MongoDB) pour la Cote d'Ivoire.

## Architecture
- **Backend**: FastAPI (Python) + MongoDB Atlas (`greenlink_production`)
- **Frontend**: React (Vite) + Shadcn UI
- **Mobile**: Expo React Native v1.74.0 (SDK 53)
- **Proxy CDN**: Bunny CDN (frontend uniquement, NE proxy PAS les routes /api)
- **Mobile API Proxy**: Cloudflare Worker -> `https://greenlink-agritech.com`

## Shortcode USSD: `*144*99#` (14 questions)

## Ce qui est implemente

### Core
- Auth JWT, Dashboards (cooperative, admin, farmer, agent)
- Marketplace, FAQ, Notifications
- Conformite EUDR & ARS 1000

### USSD / Carbon
- Calculateur carbone USSD (9 questions avec explications des concepts)
- Resultats USSD: Score, Prime estimee, Niveau ARS

### REDD+
- Guide REDD+ (21 pratiques, 5 categories) - Web + Mobile
- Dashboard MRV REDD+ + Export PDF professionnel
- Fiche de suivi REDD+ agents terrain
- Section REDD+ page d'accueil web + mobile

### SSRTE/ICI
- SSRTE/ICI alertes USSD
- Dashboard SSRTE cooperatives

### Systeme d'Abonnements Cooperatives REDD+
- 3 plans : Starter (50K), Pro (120K), Enterprise (250K) FCFA/mois
- Essai gratuit 6 mois avec acces Pro complet
- Notifications automatiques 30/15/7 jours avant fin essai

### KPIs REDD+, SSRTE & ICI + Synchronisation Temps Reel
- Backend: `GET /api/cooperative/dashboard-kpis` - gates par abonnement
- Harmonisation champs USSD/Web
- Frontend: SubscriptionBanner, REDDWidget, SSRTEWidget

### Graphiques Interactifs Dashboard
- Backend: `GET /api/cooperative/dashboard-charts` - gates par abonnement
- Frontend: 4 graphiques recharts (CO2, SSRTE, Risques, Pratiques)

### Export PDF Dashboard Complet
- Backend: `GET /api/cooperative/pdf/dashboard-report` - gate par export_pdf_excel
- Design: Palette vert foret / or / terre cuite

### Audit & Gating des Fonctionnalites Abonnement (30 Mars 2026)
- Backend: `subscription_guard.py` helper reutilisable
- Gating complet: dashboard-charts, dashboard-report PDF, dashboard-kpis
- Frontend: PDF button, graphiques, QuickActions, MRVDashboard — tous gates
- Tests: 100% pass (iteration 86)

### Build APK Mobile (30 Mars 2026)
- Profil: preview (APK distributable interne)
- Version: 1.74.0 (build code 69)
- SDK: Expo 53.0.0
- APK: https://expo.dev/artifacts/eas/bFGGgTSa5yoMchWxr4KYPe.apk
- Build ID: 568678f1-57e9-4b13-8a05-6a1c6b731ddb
- API URL: https://greenlink-agritech.com (Cloudflare Worker proxy)

## Design System
- Theme "Organic & Earthy" - vert foret (#1A3622), blanc os (#FAF9F6), or (#D4AF37), terre cuite (#C25E30)
- Typographie: DM Sans, Manrope, JetBrains Mono

## Backlog

### P1
- SSL custom domain Cloudflare (bloque - propagation externe)

### P2
- Configurer passerelle SMS reelle Orange CI / MTN (actuellement MOCK)
- Langues locales (Baoule/Dioula) dans l'app mobile

### P3
- Refactoriser ussd.py (>2400 lignes)
- Optimiser get_coop_members (N+1)

## Credentials
- Admin: `klenakan.eric@gmail.com` / `474Treckadzo`
- Expo: `treckadzo` / `474Treckadzo$1986`
- Test farmer: `+2250707070707`

## API Endpoints Cles
- `GET /api/cooperative/dashboard-kpis` - KPIs gates par abonnement
- `GET /api/cooperative/dashboard-charts` - Graphiques gates par abonnement
- `GET /api/cooperative/pdf/dashboard-report` - Export PDF gate par export_pdf_excel
- `GET /api/coop-subscriptions/plans` - Plans abonnement
- `GET /api/coop-subscriptions/my-subscription` - Mon abonnement
- `GET /api/cooperative/dashboard` - Dashboard cooperative
- `POST /api/redd/tracking/visit` - Creer fiche de suivi
- `GET /api/redd/mrv/summary` - MRV Dashboard

## Fichiers Cles
- `/app/backend/subscription_guard.py` - Helper gating abonnement
- `/app/backend/coop_subscription_models.py` - Modeles et features par plan
- `/app/backend/routes/cooperative.py` - Dashboard KPIs, Charts
- `/app/backend/routes/dashboard_pdf.py` - Export PDF
- `/app/frontend/src/pages/cooperative/Dashboard.jsx` - Orchestrateur dashboard
- `/app/frontend/src/pages/cooperative/components/` - 14+ composants dashboard
- `/app/mobile/greenlink-farmer/` - App mobile Expo
- `/app/mobile/greenlink-farmer/eas.json` - Config builds EAS
- `/app/mobile/greenlink-farmer/src/config.js` - Config API mobile

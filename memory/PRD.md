# GreenLink Agritech - PRD

## Probleme Original
Plateforme agricole complete (React + FastAPI + Expo React Native + MongoDB) pour la Cote d'Ivoire.

## Architecture
- **Backend**: FastAPI (Python) + MongoDB Atlas (`greenlink_production`)
- **Frontend**: React (Vite) + Shadcn UI
- **Mobile**: Expo React Native v1.73.3
- **Proxy CDN**: Bunny CDN (frontend uniquement, NE proxy PAS les routes /api)

## Shortcode USSD: `*144*99#` (14 questions)

## Ce qui est implemente

### Core
- Auth JWT, Dashboards (cooperative, admin, farmer, agent)
- Marketplace, FAQ, Notifications
- Conformite EUDR & ARS 1000

### USSD / Carbon
- Calculateur carbone USSD (9 questions avec explications des concepts)
- Resultats USSD: Score, Prime estimee, Niveau ARS (sans formules ni pourcentages)
- Section "Notions importantes" sur la page web du calculateur

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
- Backend: Endpoint `GET /api/cooperative/dashboard-kpis`
- Harmonisation champs: `niveau_risque` <-> `risk_level`, etc.
- Frontend: SubscriptionBanner, REDDWidget, SSRTEWidget

### Graphiques Interactifs Dashboard
- Backend: Endpoint `GET /api/cooperative/dashboard-charts` - donnees temporelles sur 6 mois
- Frontend: 4 graphiques recharts (CO2, SSRTE, Risques, Pratiques)

### Export PDF Dashboard Complet
- Backend: Endpoint `GET /api/cooperative/pdf/dashboard-report`
- Design: Palette vert foret / or / terre cuite, tableaux avec bordures

### Audit & Gating des Fonctionnalites Abonnement (30 Mars 2026)
- **Backend**: Nouveau module `subscription_guard.py` - helper reutilisable `get_coop_features()` et `require_feature()`
- **Backend Gating**:
  - `dashboard-charts`: Retourne donnees vides pour les plans sans les features correspondantes (redd_monthly vide si pas redd_avance/redd_simplifie, risk_by_zone vide si pas rapports_ssrte_ici)
  - `dashboard-report` (PDF): Renvoie 403 si pas `export_pdf_excel`
  - `dashboard-kpis`: Refactorise pour utiliser le helper partage
- **Frontend Gating**:
  - Bouton Export PDF: Desactive et grise pour les plans sans `export_pdf_excel`
  - Section Graphiques: Visible seulement si `redd_avance`, `redd_simplifie` ou `alertes_ssrte`
  - QuickActions: MRV REDD+ masque si pas `redd_avance`, SSRTE/ICI masque si pas `alertes_ssrte`
  - MRVDashboard: Affiche message "bloque" avec CTA upgrade si pas `redd_donnees_mrv`
- **Verification par plan**:
  - Trial: Acces Pro complet (6 mois gratuits)
  - Starter: Limite (pas PDF, pas REDD+ avance, pas ICI reports, pas MRV)
  - Pro: Tout sauf Enterprise (pas API personnalisee, pas formation, pas co-branding)
  - Enterprise: Tout inclus
- **Tests**: 100% pass (iteration 86 — 19/19 backend, tous elements UI verifies)

## Design System
- Theme "Organic & Earthy" - vert foret profond (#1A3622), blanc os (#FAF9F6), or (#D4AF37), terre cuite (#C25E30)
- Typographie: DM Sans (titres), Manrope (corps), JetBrains Mono (code)

## Backlog

### P0
- Build APK mobile (demande utilisateur)

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
- Test farmer: `+2250707070707`

## API Endpoints Cles
- `POST /api/ussd/carbon-calculator` - Calculateur USSD
- `GET /api/redd/mrv/summary` - MRV Dashboard
- `GET /api/redd/mrv/export-pdf` - Export PDF
- `GET /api/redd/tracking/practices-list` - 21 pratiques REDD+
- `POST /api/redd/tracking/visit` - Creer fiche de suivi
- `GET /api/redd/tracking/visits` - Historique fiches
- `GET /api/redd/tracking/stats` - Statistiques suivi
- `GET /api/ussd/ssrte/responses` - Alertes SSRTE
- `GET /api/cooperative/dashboard` - Dashboard cooperative
- `GET /api/cooperative/members/activation-stats` - Stats activations
- `GET /api/cooperative/dashboard-kpis` - KPIs REDD+/SSRTE/ICI gates par abonnement
- `GET /api/cooperative/dashboard-charts` - Graphiques gates par abonnement
- `GET /api/cooperative/pdf/dashboard-report` - Export PDF gate par export_pdf_excel
- `GET /api/coop-subscriptions/plans` - Plans abonnement
- `GET /api/coop-subscriptions/my-subscription` - Mon abonnement

## Fichiers Cles
- `/app/backend/subscription_guard.py` - Helper gating abonnement
- `/app/backend/coop_subscription_models.py` - Modeles et features par plan
- `/app/backend/routes/cooperative.py` - Dashboard KPIs, Charts
- `/app/backend/routes/dashboard_pdf.py` - Export PDF
- `/app/backend/routes/coop_subscriptions.py` - API abonnements
- `/app/frontend/src/pages/cooperative/Dashboard.jsx` - Orchestrateur dashboard
- `/app/frontend/src/pages/cooperative/components/` - Composants dashboard gates
- `/app/frontend/src/services/cooperativeApi.js` - API service
- `/app/mobile/greenlink-farmer/` - App mobile Expo

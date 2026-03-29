# GreenLink Agritech - PRD

## Probleme Original
Plateforme agricole complete (React + FastAPI + Expo React Native + MongoDB) pour la Cote d'Ivoire.

## Architecture
- **Backend**: FastAPI (Python) + MongoDB Atlas (`greenlink_production`)
- **Frontend**: React (Vite) + Shadcn UI
- **Mobile**: Expo React Native v1.73.3
- **Proxy CDN**: Bunny CDN (frontend uniquement, NE proxy PAS les routes /api)

## Shortcode USSD: `*144*99#` (14 questions)

## Fix Critique v1.71.0
- **Cause du bug "donnees introuvables"** : Le Bunny CDN retourne 404 pour les routes `/api/`. Fix: URL directe en priorite, CDN en fallback.

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
- **Fiche de suivi REDD+ agents terrain** (NEW):
  - Flux: Agent terrain -> Selection agriculteur -> Fiche REDD+ (comme ICI/SSRTE)
  - Backend: `/api/redd/tracking/` (visit, visits, stats, practices-list)
  - Frontend Web: `/redd/tracking` (formulaire, historique, statistiques)
  - Mobile: `REDDTrackingFormScreen` accessible via `FarmerProfileScreen`
  - Onglet historique REDD+ dans le profil agriculteur (mobile)
- Section REDD+ page d'accueil web + mobile

### SSRTE/ICI
- SSRTE/ICI alertes USSD
- Dashboard SSRTE cooperatives

### Mobile Navigation (Corrige)
- Score REDD+ -> REDDGuide (etait USSDCarbon)
- Pratiques REDD+ -> REDDGuide (etait USSDFullSimulator)
- Fiche REDD+ accessible depuis FieldAgentDashboard

### Bug Fix Mobile v1.72.2 (27 Mars 2026)
- **Cause racine**: Ligne corrompue `creen;` (fragment de `HomeScreen;`) a la fin de `HomeScreen.js` (ligne 488)
- **Effet**: Erreur de syntaxe JS -> Metro bundler echoue -> `safeRequire` attrape l'erreur -> "Ecran indisponible - HomeScreen n'a pas pu etre charge"
- **Fix**: Suppression de la ligne corrompue
- **Build**: EAS v1.72.2 soumis

### Mobile Network Refactor v1.75.0 (28 Mars 2026)
- Remplace par v1.76.0

### Mobile Network Refactor v1.76.0 (28 Mars 2026)
- **Principe v1.76** : Ne JAMAIS faire confiance a `NetInfo.isInternetReachable` pour les messages d'erreur
- **`useRealConnectionStatus.js`** (NOUVEAU) : Hook reseau communaute 2025-2026
  - NetInfo.addEventListener comme trigger rapide uniquement (debounce 800ms)
  - Verification reelle : HEAD /api/health (8s) -> fallback HEAD https://1.1.1.1 (5s)
  - `checkNow()` : verification immediate, `resetAndRecheck()` : post-logout
- **`api.js`** : Plus de `import NetInfo` — classifyNetworkError utilise un vrai HEAD ping vers 1.1.1.1
  - healthCheck() utilise HEAD (plus rapide, pas de body)
  - Timeouts progressifs 25s/45s/65s, 3 retries avec backoff
  - flushConnections() envoie HEAD avec Connection: close pour reset OkHttp
- **`AuthContext.js`** : Utilise useRealConnectionStatus, appelle resetAndRecheck() au logout
- **`LoginScreen.js`** : Pre-check via checkNow() avant login, messages nuances (offline/serveur/timeout)

### Configuration URLs stables v1.76 (28 Mars 2026)
- Remplace toutes les URLs hardcodees `preview.emergentagent.com` par `https://api.greenlink-agritech.com` (Cloudflare Worker proxy permanent)
- Fichiers mis a jour : `eas.json` (3 profiles), `config.js`, `GeolocationService.js`
- Le Worker Cloudflare (`cloudflare-worker/worker.js`) garde l'URL backend comme cible proxy (mise a jour manuelle cote Cloudflare)

### Systeme d'Abonnements Cooperatives REDD+ (29 Mars 2026)
- **Backend** : Nouveaux modeles (`coop_subscription_models.py`) et API (`routes/coop_subscriptions.py`)
  - 3 plans : Starter (50K), Pro (120K), Enterprise (250K) FCFA/mois
  - Essai gratuit 6 mois avec acces Pro complet
  - Notifications automatiques 30/15/7 jours avant fin essai
  - Auto-upgrade Pro apres essai (sauf annulation)
  - Endpoints : GET /plans, GET /my-subscription, POST /choose-plan, POST /cancel
- **Frontend PricingSection** : 3 cartes plans REDD+, banner essai gratuit, toggle Mensuel/Annuel (-17%), section valeur REDD+ (Credits Carbone, EUDR, MRV, Paiements Resultats)
- **FAQ** : Nouvelle categorie REDD+ (4 questions), abonnements cooperatives mis a jour
- **CTA Homepage** : Message 6 mois essai gratuit + REDD+ + ARS 1000 + SSRTE
- **Tests** : 100% pass (21/21 backend, all frontend features verified)

### Refonte UI/UX Dashboard Cooperative (29 Mars 2026)
- **Design System** : Theme "Organic & Earthy" - vert foret profond (#1A3622), blanc os (#FAF9F6), or (#D4AF37), terre cuite (#C25E30)
- **Typographie** : DM Sans (titres), Manrope (corps), JetBrains Mono (code)
- **Refactoring** : Fichier monolithique de 920 lignes decoupe en 10 composants modulaires :
  - `DashboardHeader.jsx` - En-tete avec nom cooperative, certifications, navigation
  - `KPIStrip.jsx` - 4 KPIs principaux avec bordures colorees (Membres, Surface, CO2, Primes)
  - `QuickActionsPanel.jsx` - Actions rapides groupees par categories (Exploitation, Commerce, Carbone & REDD+, Conformite)
  - `RecentMembersCard.jsx` - Membres recents avec avatars
  - `ActivationWidget.jsx` - Suivi activations avec barre de progression
  - `ParcelsSection.jsx` - Gestion parcelles avec stats et actions
  - `FinancialCard.jsx` - Resume financier (FCFA)
  - `CommissionCardNew.jsx` - Taux de commission editable
  - `USSDPanel.jsx` - Panneau simulateur USSD
  - `AlertsBanner.jsx` - Alertes validation en attente
- **Layout** : Grille CSS 12 colonnes (8+4), responsive mobile
- **Animations** : Entrees en fondu avec decalage (gl-animate-in, gl-stagger)
- **Tests** : 100% pass (iteration 81 - tous composants, navigation, responsivite, theme)

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
- `GET /api/coop-subscriptions/plans` - Plans abonnement

## Fichiers Cles
- `/app/backend/routes/redd_tracking.py` - API fiche de suivi REDD+
- `/app/backend/routes/redd.py` - API MRV REDD+
- `/app/backend/routes/ussd.py` - Moteur USSD (>2400 lignes)
- `/app/frontend/src/pages/cooperative/Dashboard.jsx` - Orchestrateur dashboard (refactorise)
- `/app/frontend/src/pages/cooperative/components/` - 10 composants dashboard
- `/app/frontend/src/pages/farmer/USSDCarbonCalculator.jsx` - Calculateur web
- `/app/frontend/src/pages/cooperative/REDDTrackingPage.jsx` - Suivi REDD+ web
- `/app/mobile/greenlink-farmer/src/screens/redd/REDDGuideScreen.js`
- `/app/mobile/greenlink-farmer/src/screens/redd/REDDTrackingFormScreen.js`
- `/app/mobile/greenlink-farmer/src/AppContent.js` - Navigation mobile

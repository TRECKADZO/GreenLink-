# GreenLink Agritech - PRD

## Probleme Original
Plateforme agricole complete (React + FastAPI + Expo React Native + MongoDB) pour la Cote d'Ivoire.

## Architecture
- **Backend**: FastAPI (Python) + MongoDB Atlas (`greenlink_production`)
- **Frontend**: React (Vite) + Shadcn UI
- **Mobile**: Expo React Native v1.71.0
- **Proxy CDN**: Bunny CDN (frontend uniquement, NE proxy PAS les routes /api)

## Shortcode USSD: `*144*99#`

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
  - Backend: `/api/redd/tracking/` (visit, visits, stats, practices-list)
  - Frontend Web: `/redd/tracking` (formulaire, historique, statistiques)
  - Mobile: `REDDTrackingFormScreen` + `REDDGuideScreen` enregistres dans navigation
- Section REDD+ page d'accueil web + mobile

### SSRTE/ICI
- SSRTE/ICI alertes USSD
- Dashboard SSRTE cooperatives

### Mobile Navigation (Corrige)
- Score REDD+ -> REDDGuide (etait USSDCarbon)
- Pratiques REDD+ -> REDDGuide (etait USSDFullSimulator)
- Fiche REDD+ accessible depuis FieldAgentDashboard

## Backlog

### P2
- Configurer passerelle SMS reelle Orange CI / MTN (actuellement MOCK)
- Langues locales (Baoule/Dioula) dans l'app mobile

### P3
- Refactoriser ussd.py (>2200 lignes)
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

## Fichiers Cles
- `/app/backend/routes/redd_tracking.py` - API fiche de suivi REDD+
- `/app/backend/routes/redd.py` - API MRV REDD+
- `/app/backend/routes/ussd.py` - Moteur USSD (>2200 lignes)
- `/app/frontend/src/pages/farmer/USSDCarbonCalculator.jsx` - Calculateur web
- `/app/frontend/src/pages/cooperative/REDDTrackingPage.jsx` - Suivi REDD+ web
- `/app/mobile/greenlink-farmer/src/screens/redd/REDDGuideScreen.js`
- `/app/mobile/greenlink-farmer/src/screens/redd/REDDTrackingFormScreen.js`
- `/app/mobile/greenlink-farmer/src/AppContent.js` - Navigation mobile

# GreenLink Agritech - PRD

## Probleme original
Plateforme agritech Cote d'Ivoire - modules ARS 1000 pour certification cacao durable.

## Modules implementes

### PDC v2 - Stepper 3 Etapes / 8 Fiches (10 avril 2026)
- Carte interactive Garmin eTrex 20 avec GPS Tracking, drag & drop vertices, detection rectangle
- Bouton permanent "Ajouter arbre ici" avec formulaire rapide
- PDF officiel ReportLab, 8 fiches dynamiques, RBAC strict

### Migration PDC v1 -> v2 (11 avril 2026)
- Ancien systeme PDC supprime. Routes redirigees vers PDC v2.

### Workflow RBAC PDC v2 (11 avril 2026)
- Etape 1 lecture seule pour cooperative apres soumission agent. Bannieres contextuelles.

### Offline-First avec Cache Tuiles (11 avril 2026)
- Service Worker TILES_CACHE: Cache-First, 200Mo max, nettoyage LRU

### Code Quality Reviews (11 avril 2026)
Pass 1:
- Hardcoded secrets: tests migres vers os.environ.get()
- XSS: document.write() sanitise avec esc()
- Empty catch blocks: console.warn() dans offlineDB.js et offlineCooperativeApi.js
- Inline props: path options extraites en constantes (ParcelMapGarmin)

Pass 2:
- Hook ordering: Messages.jsx fetchConversations/fetchMessages declares avant useEffect
- Hook ordering: SSRTERealTimeDashboard handleWebSocketMessage declares avant connectWebSocket
- Empty catches: console.error/warn ajoute dans Orders, Notifications, Messages, Dashboard, SSRTE
- Switch case blocks: wraps en blocs {} pour eviter lint warnings (SSRTE)

### Core Platform
- Auth JWT, Dashboard multi-roles, Notifications, USSD, Score carbone, Marketplace

## Architecture
- Backend: FastAPI + MongoDB | Frontend: React + Tailwind + Shadcn + Leaflet + html2canvas
- Offline: Service Worker + IndexedDB + TILES_CACHE

## Backlog
- P1: Integration SMS reel (Orange CI / MTN)
- P1: Support langues locales (Baoule/Dioula)
- P2: Nettoyage donnees test/demo
- P3: Refactoring admin.py (get_realtime_dashboard 149 lignes, get_admin_stats 81 lignes)
- P3: Refactoring carbon_business_model.py (project_annual_revenue 88 lignes)
- P3: Split composants > 700 lignes (AgentMapLeaflet, Profile, BillingDashboard, CheckoutPage)
- P3: Extraire routing de App.js (109 imports)

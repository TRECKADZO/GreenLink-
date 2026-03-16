# GreenLink PRD - Updated March 16, 2026

## Original Problem Statement
Multi-persona agritech platform for Côte d'Ivoire (Cocoa, Coffee, Cashew supply chain).
Includes: Secure messaging, mobile integration, marketplace, cooperative management, EUDR compliance, carbon credits, SSRTE monitoring, field agent tools.

## Core Architecture
- **Backend**: FastAPI (Python) + MongoDB Atlas
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Mobile**: React Native (Expo)
- **Auth**: JWT + role-based (producteur, acheteur, cooperative, field_agent, admin, etc.)

## What's Been Implemented

### Session 17 - March 16, 2026

#### NEW: Offline-First Mode for Agent Terrain
- **Backend Sync Endpoints** (`/app/backend/routes/agent_search.py`):
  - `GET /api/agent/sync/download` - Downloads all farmers in agent's zone with parcels/SSRTE visits for IndexedDB cache
  - `POST /api/agent/sync/upload` - Uploads queued offline actions (parcel verifications, SSRTE visits) with idempotence check
  - `GET /api/agent/sync/status` - Returns last download/upload timestamps
  - Pydantic models: `OfflineAction`, `SyncUploadRequest`
- **Frontend IndexedDB Service** (`/app/frontend/src/services/offlineDB.js`):
  - 5 IndexedDB stores: `farmers`, `parcels`, `ssrte_visits`, `pending_actions`, `meta`
  - Indexed search by phone_number, village, full_name
  - Offline action queue with UUID-based offline_id
  - Full sync (download + upload) orchestration
  - Phone normalization and pattern matching for offline search
- **Frontend Offline Hook** (`/app/frontend/src/hooks/useOffline.js`):
  - Online/offline detection via navigator.onLine + event listeners
  - Auto-sync when coming back online (uploads pending actions + downloads fresh data)
  - Manual sync trigger
  - Cached farmer count, pending action count, last sync time tracking
- **Updated Agent Dashboard** (`/app/frontend/src/pages/agent/AgentTerrainDashboard.jsx`):
  - Sync bar: cache count, last sync time, manual sync button
  - Online/offline status indicator (Wifi/WifiOff badge)
  - First sync prompt when cache is empty
  - Search falls back to IndexedDB cache when offline or on network error
  - Farmer details view works offline from cached data
  - Offline search logs queued for later upload
- **npm package**: `idb v8.0.3` for IndexedDB access
- **Testing**: 15/15 backend tests, 100% frontend verified

### Session 16 - March 16, 2026 (Same day, earlier)

#### NEW: Secure Agent Terrain Search System
- Agent search by phone: `/api/agent/search?phone=...`
- Farmer full details: `/api/agent/farmer/{id}/details`
- Dashboard stats + Audit logs endpoints
- RBAC middleware (field_agent, cooperative, admin only)
- Zone-based filtering
- SSRTE/RGPD audit logging
- Frontend page at `/agent/terrain`, `/agent/search`
- MongoDB indexes on `audit_logs` and `coop_members.phone_number`

#### BUG FIX: Cooperative coop_id Mismatch
- Added `coop_id_query()` helper matching both string AND ObjectId types
- Fixed 5+ endpoints in cooperative.py

### Previous Sessions (Summary)
- Mobile app stabilization, Parcel verification system (full-stack)
- Static data fallbacks for production, QR code workflow overhaul
- Delete Account page, Cooperative dashboard corrections
- Messaging system, SSRTE agent dashboard, Carbon auditor
- Harvest marketplace, Role-based marketplace access

## Known Issues
- **QR Code**: Backend generation correct, user reported malicious redirect (may be old cached QR)
- **Web Registration White Page**: Fix implemented, needs user production verification
- **Add Parcel Form White Page**: P1 - needs investigation on AddParcelPage.jsx

## Upcoming Tasks (Prioritized)
- **(P0)** New APK/AAB build with all fixes
- **(P1)** Fix Add Parcel Form white page bug
- **(P1)** Add demo data for Marketplace Intrants and Marché Carbone
- **(P1)** Orange Money payment integration
- **(P2)** Baoulé/Dioula languages in mobile app
- **(P2)** Multi-channel notifications
- **(P2)** Real USSD integration
- **(P2)** Refactor cooperative.py into smaller modules
- **(P2)** Cloud storage migration (S3)

## Test Credentials
- **Super Admin**: klenakan.eric@gmail.com / 474Treckadzo
- **Cooperative**: coop-gagnoa@greenlink.ci / password
- **Test farmer phone**: 0701234567 (Kouassi Yao Jean)

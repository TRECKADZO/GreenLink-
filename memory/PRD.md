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

### Session 18 - March 16, 2026

#### QR Code → Phone Number Identification Migration (Complete)
**The QR code system has been fully replaced by phone number-based farmer identification.**

**Mobile App (React Native) Changes:**
- **New `FarmerSearchScreen.js`**: Full mobile search screen with:
  - Phone number input with auto-focus and phone-pad keyboard
  - Online/offline search with cache fallback
  - Sync bar (cache count, last sync time, sync button)
  - Farmer result card (info, parcels, verification status)
  - Action buttons: Voir profil, Ajouter parcelle, Visite SSRTE, Vérifier parcelle
  - Offline mode hint when searching locally
  - First sync prompt for initial data download
- **Updated `FieldAgentDashboard.js`**: QR Scanner stat card → "Recherches" with phone icon, navigates to FarmerSearch
- **Updated `BottomTabBar.js`**: "Scanner QR" → "Recherche Planteur" with search icon
- **Updated `SSRTEAgentDashboard.js`**: Quick action "Scanner QR" → "Chercher Planteur"
- **Updated `App.js`**: FarmerSearch route registered, added to SCREENS_WITH_TAB_BAR
- **Updated `index.js`**: FarmerSearchScreen exported

**Web Frontend:**
- Agent Terrain Dashboard fully responsive at 375px mobile viewport
- All features working on mobile: sync, search, results, full details

**Testing**: 32/32 backend, 100% frontend, mobile code reviewed

### Session 17 - March 16, 2026
#### Offline-First Mode for Agent Terrain
- Backend sync endpoints (download/upload/status)
- IndexedDB service with 5 stores, offline action queue
- Auto-sync + manual sync, online/offline detection
- 15/15 backend, 100% frontend

### Session 16 - March 16, 2026
#### Secure Agent Terrain Search System
- Agent search by phone, full details, dashboard stats, audit logs
- RBAC middleware, zone-based filtering, SSRTE/RGPD audit logging
- BUG FIX: cooperative coop_id mismatch (5+ endpoints)
- 17/17 backend, 100% frontend

### Previous Sessions (Summary)
- Mobile app stabilization, Parcel verification system (full-stack)
- Static data fallbacks, QR code workflow (now replaced), Delete Account page
- Cooperative dashboard corrections, Messaging system, SSRTE agent dashboard
- Carbon auditor, Harvest marketplace, Role-based marketplace access

## Known Issues
- **Web Registration White Page**: Fix implemented, needs user production verification
- **Add Parcel Form White Page**: P1 - needs investigation on AddParcelPage.jsx

## Upcoming Tasks (Prioritized)
- **(P0)** New APK/AAB build with all fixes (QR→Phone migration, offline-first, etc.)
- **(P1)** Fix Add Parcel Form white page bug
- **(P1)** Add demo data for Marketplace Intrants and Marché Carbone
- **(P1)** Orange Money payment integration
- **(P2)** Service Worker for PWA installable
- **(P2)** Baoulé/Dioula languages in mobile app
- **(P2)** Multi-channel notifications
- **(P2)** Real USSD integration
- **(P2)** Refactor cooperative.py into smaller modules
- **(P2)** Cloud storage migration (S3)

## Test Credentials
- **Super Admin**: klenakan.eric@gmail.com / 474Treckadzo
- **Cooperative**: coop-gagnoa@greenlink.ci / password
- **Test farmer phones**: 0701234567 (Kouassi Yao Jean), 0701111111 (Kouadio Yao)

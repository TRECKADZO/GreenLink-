# GreenLink PRD - Updated March 16, 2026

## Original Problem Statement
Multi-persona agritech platform for Côte d'Ivoire (Cocoa, Coffee, Cashew supply chain).

## Core Architecture
- **Backend**: FastAPI (Python) + MongoDB Atlas
- **Frontend**: React + Tailwind CSS + Shadcn/UI + **PWA (Service Worker)**
- **Mobile**: React Native (Expo) - v1.21.0
- **Auth**: JWT + role-based

## What's Been Implemented

### Session 19 - March 16, 2026

#### PWA Installable (Service Worker)
- **`manifest.json`**: PWA metadata (GreenLink Agent Terrain, standalone, start_url=/agent/terrain, icons 192+512px)
- **`service-worker.js`**: Network-First API caching, Cache-First assets, Background Sync, push notifications
- **`PWAInstallPrompt.jsx`**: Install banner with dismiss/localStorage persistence
- **`index.js`**: SW registration + SW sync message listener
- **`index.html`**: apple-mobile-web-app-capable, theme-color, manifest link, apple-touch-icon
- **`useOffline.js`**: SW Background Sync event listener (`sw-sync-available`)
- Testing: 8/8 backend, 100% frontend

#### Mobile Build v1.21.0 (APK + AAB)
- **Preview APK**: Build ID `e5e84a2b-83ef-4862-9a12-36312b9bcc1e` (in progress)
- **Production AAB**: Build ID `6f7142c8-cee5-4461-9c74-b9b1ef1c8f4c` (versionCode 17)
- Changes included: QR→Phone search, FarmerSearchScreen, offline-first, all bug fixes
- Camera description updated (removed QR code reference)
- EAS Build: https://expo.dev/accounts/treckadzo/projects/greenlink-farmer/builds

### Session 18 - QR Code → Phone Number Migration
- New FarmerSearchScreen, updated FieldAgentDashboard/BottomTabBar/SSRTEAgentDashboard
- 32/32 tests passed

### Session 17 - Offline-First Mode
- IndexedDB service (5 stores), sync endpoints, auto-sync + manual sync
- 15/15 tests passed

### Session 16 - Secure Agent Terrain Search
- Agent search API, RBAC, zone filtering, audit logging
- Fixed coop_id mismatch bug
- 17/17 tests passed

### Previous Sessions
- Mobile app stabilization, Parcel verification, Static data fallbacks
- QR code workflow (now replaced), Delete Account page
- Cooperative dashboard, Messaging, SSRTE, Carbon auditor, Marketplace

## Known Issues
- **Web Registration White Page**: Fix implemented, needs production verification
- **Add Parcel Form White Page**: P1 - needs investigation

## Upcoming Tasks
- **(P1)** Fix Add Parcel Form white page bug
- **(P1)** Demo data for Marketplace Intrants and Marché Carbone
- **(P1)** Orange Money payment integration
- **(P2)** Baoulé/Dioula languages, notifications, USSD
- **(P2)** Refactor cooperative.py, S3 migration

## Test Credentials
- **Super Admin**: klenakan.eric@gmail.com / 474Treckadzo
- **Cooperative**: coop-gagnoa@greenlink.ci / password
- **Test farmer phones**: 0701234567, 0701111111

## Mobile Build Links
- APK Preview: https://expo.dev/accounts/treckadzo/projects/greenlink-farmer/builds/e5e84a2b-83ef-4862-9a12-36312b9bcc1e
- AAB Production: https://expo.dev/accounts/treckadzo/projects/greenlink-farmer/builds/6f7142c8-cee5-4461-9c74-b9b1ef1c8f4c

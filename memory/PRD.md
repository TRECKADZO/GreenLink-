# GreenLink PRD - Updated March 16, 2026

## Original Problem Statement
Multi-persona agritech platform for Côte d'Ivoire (Cocoa, Coffee, Cashew supply chain).

## Core Architecture
- **Backend**: FastAPI (Python) + MongoDB Atlas
- **Frontend**: React + Tailwind CSS + Shadcn/UI + PWA (Service Worker)
- **Mobile**: React Native (Expo) - v1.21.1
- **Auth**: JWT + role-based

## What's Been Implemented

### Session 20 - March 16, 2026
#### Google Play Compliance Fix - Media Permissions
- Removed `READ_EXTERNAL_STORAGE` and `WRITE_EXTERNAL_STORAGE` from android permissions
- Added `expo-image-picker` plugin with `photosPermission: false` (camera-only)
- Version bumped to 1.21.1
- New builds: APK `2b789dcd`, AAB `c75271e1`

### Session 19 - PWA + Build v1.21.0
- Service Worker, manifest.json, PWA install prompt, Background Sync
- Mobile builds v1.21.0 launched

### Session 18 - QR → Phone Migration
- FarmerSearchScreen, updated FieldAgentDashboard/BottomTabBar/SSRTEAgentDashboard

### Session 17 - Offline-First Mode
- IndexedDB, sync endpoints, auto+manual sync

### Session 16 - Agent Terrain Search + coop_id fix
- Agent search API, RBAC, audit logging, coop_id bug fix

## Known Issues
- Web Registration White Page (production verification pending)
- Add Parcel Form White Page (P1)

## Upcoming Tasks
- (P1) Fix Add Parcel Form white page
- (P1) Demo data Marketplace Intrants / Marché Carbone
- (P1) Orange Money integration
- (P2) Languages, notifications, USSD, refactoring, S3

## Mobile Build Links (v1.21.1 - Permission fix)
- APK Preview: https://expo.dev/accounts/treckadzo/projects/greenlink-farmer/builds/2b789dcd-8535-4a2e-a61e-928b7f825e2d
- AAB Production: https://expo.dev/accounts/treckadzo/projects/greenlink-farmer/builds/c75271e1-672d-4e32-9629-377869ca29a3

## Test Credentials
- **Super Admin**: klenakan.eric@gmail.com / 474Treckadzo
- **Cooperative**: coop-gagnoa@greenlink.ci / password

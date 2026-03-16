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

### Session 16 - March 16, 2026

#### NEW: Secure Agent Terrain Search System (P0)
- **Backend** (`/app/backend/routes/agent_search.py`):
  - `GET /api/agent/search?phone=XXXXXXXXXX` - Search farmer by phone number
  - `GET /api/agent/farmer/{id}/details` - Full farmer profile (parcels, harvests, SSRTE visits)
  - `GET /api/agent/dashboard/stats` - Agent search statistics
  - `GET /api/agent/audit-logs` - SSRTE/RGPD audit trail
  - Phone normalization (local/international formats)
  - Zone-based filtering (agents see only their cooperative's farmers)
  - RBAC middleware (field_agent, cooperative, admin only)
  - Audit logging for every access
- **Frontend** (`/app/frontend/src/pages/agent/AgentTerrainDashboard.jsx`):
  - Search bar with phone number input
  - Farmer card with info, parcels, verification status
  - Full details view with parcels, harvests, SSRTE visits
  - Audit trail display
  - Routes: `/agent/terrain`, `/agent/search`
- **MongoDB indexes** on `audit_logs` and `coop_members.phone_number`
- **Testing**: 17/17 backend tests passed, frontend 100% verified

#### BUG FIX: Cooperative coop_id Mismatch (P0)
- Added `coop_id_query()` helper in `cooperative.py` to match both string AND ObjectId types
- Fixed: `get_coop_members`, `get_member_details`, `validate_member`, `add_member_parcel`, `get_member_parcels`
- Members now return full_name and phone_number correctly (previously None)
- Member detail endpoint no longer returns 404

### Previous Sessions (Summary)
- Mobile app stabilization (account creation, error handling)
- Parcel verification system (full-stack: backend, web, mobile)
- Static data fallbacks for production (crops, marketplace)
- QR code workflow overhaul (mobile scanner, post-scan menu)
- Delete Account page (Google Play compliance)
- Cooperative dashboard corrections
- Messaging system (web + mobile)
- SSRTE agent dashboard
- Carbon auditor system
- Harvest marketplace

## Known Issues
- **QR Code**: Backend generation is correct (`GREENLINK_FARMER:base64(json)`), user reported malicious redirect which may be from old cached QR
- **Web Registration White Page**: Fix implemented, needs user verification in production
- **Add Parcel Form White Page**: P1 - needs investigation on `AddParcelPage.jsx` submit handler

## Upcoming Tasks
- **(P0)** New APK/AAB build with all fixes
- **(P1)** Add demo data for "Marketplace Intrants" and "Marché Carbone"
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

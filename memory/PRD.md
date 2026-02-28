# GreenLink Agritech Platform - PRD

## Project Overview
Clone of Greenlink-agritech.com with expanded multi-profile functionality for the agricultural sector in Côte d'Ivoire.

## Core Problem Statement
Build a comprehensive agritech platform connecting:
- Farmers/Planters with carbon credits and mobile money payments
- Corporate buyers needing traceable, EUDR-compliant commodities  
- CSR companies seeking verified carbon credits
- Agricultural input suppliers with a B2B marketplace

## User Personas

### 1. Producteur/Agriculteur (Farmer)
- **Needs**: Simple USSD/SMS interface, carbon premium tracking, mobile money payments
- **Features**: Parcel declaration, harvest tracking, carbon score, payment requests
- **Key Routes**: `/farmer/dashboard`, `/farmer/ussd`

### 2. Acheteur Responsable (Responsible Buyer)
- **Needs**: Traceable commodities, EUDR compliance reports, carbon certificates
- **Features**: Order management, traceability reports, CSV/PDF export
- **Key Routes**: `/buyer/dashboard`, `/buyer/orders`

### 3. Entreprise RSE (CSR Company)
- **Needs**: Verified carbon credits, impact tracking, CSRD reporting
- **Features**: Carbon marketplace, impact dashboard, certificates
- **Key Routes**: `/rse/dashboard`, `/carbon-marketplace`

### 4. Fournisseur (Supplier)
- **Needs**: Product management, order handling, customer messaging
- **Features**: Full marketplace CRUD, dashboard analytics, notifications
- **Key Routes**: `/supplier/dashboard`, `/supplier/products`, `/supplier/orders`

### 5. Admin (Super Administrator)
- **Needs**: Platform management, partner management
- **Features**: Partner CRUD, platform statistics
- **Key Routes**: `/admin/dashboard`

## Technical Architecture

### Backend (FastAPI + MongoDB)
- **Auth**: JWT-based with phone/email login
- **Routes**:
  - `/api/auth/*` - Authentication
  - `/api/greenlink/*` - Farmer, Buyer, RSE endpoints
  - `/api/marketplace/*` - Supplier and marketplace endpoints
  - `/api/payments/*` - Orange Money payment integration
  - `/api/admin/*` - Admin management
  - `/api/partners` - Public partners list

### Frontend (React)
- **Components**: Shadcn UI library
- **Services**: Dedicated API clients (`greenlinkApi.js`, `marketplaceApi.js`)
- **Auth**: Context-based with localStorage persistence

## Implementation Status

### Completed (February 2026)
- [x] Landing page (clone of greenlink-agritech.com)
- [x] Authentication (email + phone, all 5 user types including admin)
- [x] Farmer dashboard with USSD simulator
- [x] Buyer dashboard with EUDR export
- [x] RSE dashboard with impact metrics and interactive map
- [x] Supplier dashboard with full marketplace
- [x] **SMS Notifications for farmers** (simulated - ready for Orange API)
- [x] **Carbon Premium Calculator** - Interactive calculator on homepage
- [x] **User Profile Menu** - Dropdown menu with role-specific navigation
- [x] **Marketplace Page** - B2B marketplace with filters, search, and ordering
- [x] **Product Image Upload** - Suppliers can upload photos (JPG/PNG/WebP, max 5MB)
- [x] **Shopping Cart System** - Full cart with add/update/remove/checkout
- [x] **Order Management** - Checkout page, order confirmation, buyer orders list
- [x] **Product Reviews & Ratings** - Users can rate and review products
- [x] **Wishlist/Favorites** - Save products for later
- [x] **Order Tracking** - Timeline-based order status tracking
- [x] **Supplier Notifications** - Notifications on new orders and payments
- [x] **Orange Money Integration (SIMULATION)** - Full payment flow with simulation mode
- [x] **Carbon Marketplace** - Dedicated page for carbon credits (accessible to all, purchase for RSE only)
- [x] **Partners Section** - Replaced "Nos membres actifs" with "Nos Partenaires" (Orange CI added)
- [x] **Admin Dashboard** - Super admin for managing partners
- [x] **Legal Pages** - Conditions, Confidentialité, Sécurité
- [x] **Removed Emergent Badge** - Watermark removed from footer

### Mocked/Simulated
- **Orange Money payments** - Simulation mode active (no real API keys yet)
- **USSD interface** - Web simulator, no telecom integration
- **SMS notifications** - Logged to console, ready for Orange API
- **Carbon credit certificates** - Text format, no PDF generation yet

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create account (supports admin type)
- `POST /api/auth/login` - Login (identifier field: email or phone)
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile

### Admin
- `GET /api/partners` - Get public partners (no auth)
- `GET /api/admin/partners` - Get all partners (admin only)
- `POST /api/admin/partners` - Create partner (admin only)
- `PUT /api/admin/partners/{id}` - Update partner (admin only)
- `DELETE /api/admin/partners/{id}` - Delete partner (admin only)
- `GET /api/admin/stats` - Platform statistics (admin only)

### Farmer (Greenlink)
- `POST /api/greenlink/parcels` - Declare parcel (auto SMS if score ≥7)
- `GET /api/greenlink/parcels/my-parcels` - Get my parcels
- `POST /api/greenlink/harvests` - Declare harvest
- `GET /api/greenlink/farmer/dashboard` - Dashboard stats
- `GET /api/greenlink/sms/history` - SMS notification history

### Marketplace
- `GET /api/marketplace/products` - List all products
- `POST /api/marketplace/products` - Create product (supplier)
- `GET /api/marketplace/products/{id}/reviews` - Get reviews
- `POST /api/marketplace/products/{id}/reviews` - Add review
- `GET /api/marketplace/wishlist` - Get wishlist
- `POST /api/marketplace/wishlist/add` - Add to wishlist
- `DELETE /api/marketplace/wishlist/remove/{id}` - Remove from wishlist

### Payments (Orange Money)
- `GET /api/payments/simulation-status` - Check if simulation mode
- `POST /api/payments/initiate` - Initiate payment
- `GET /api/payments/status/{ref}` - Get payment status
- `POST /api/payments/simulate/{token}` - Simulate payment (test mode)

## Database Collections
- `users` - All user types with profile fields (including admin)
- `parcels` - Farmer parcel declarations
- `harvests` - Harvest records
- `products` - Supplier products
- `orders` - Marketplace orders
- `payments` - Payment records
- `product_reviews` - Product ratings and reviews
- `wishlists` - User wishlists
- `partners` - Platform partners
- `coop_members` - Cooperative members
- `coop_lots` - Grouped sale lots for cooperatives
- `coop_distributions` - Carbon premium distributions
- `coop_agents` - Field agents for cooperatives

## Prioritized Backlog

### P0 (Critical) - COMPLETED
- ✅ Orange Money integration (simulation mode)
- ✅ Product reviews and ratings
- ✅ Wishlist functionality
- ✅ Order tracking
- ✅ Carbon Marketplace page
- ✅ Admin dashboard with partner management
- ✅ Legal pages (Conditions, Confidentialité, Sécurité)
- ✅ Mobile App Push Notifications integration
- ✅ Mobile App Background Sync integration
- ✅ Camera & Geolocation for parcel photos (mobile)
- ✅ Firebase Cloud Messaging (FCM) service with Expo fallback
- ✅ EAS Build configuration for production APK/IPA
- ✅ **Coopérative agricole profile** - Complete backend + frontend dashboard
- ✅ **Super Admin Strategic Dashboard** - High-value metrics for governments, World Bank, IMF, WTO, NGOs, Bourse Café-Cacao, international buyers

### P1 (High Priority)
- Real Orange Money API integration (requires merchant registration)
- Real USSD/SMS integration (Orange API)
- ✅ PDF certificate generation - **COMPLETED** (EUDR, Carbon, Distribution reports)
- ⚠️ Configure Firebase project and upload `google-services.json` for production FCM
- Mobile app for cooperative field agents

### P2 (Medium Priority)
- Product price history tracking
- CSV/PDF export for EUDR reports
- Multi-language support (Baoulé, Dioula, Sénoufo)

### P3 (Future)
- Production hardening
- Rate limiting and security audit
- ✅ Mobile app (React Native) - COMPLETED

## Test Credentials
```
Admin: klenakan.eric@gmail.com / 474Treckadzo
Buyer: buyer@test.com / password123
Farmer: farmer1@test.com / test123
RSE: rse1@test.com / test123
Supplier: supplier1@test.com / test123
Cooperative: coop-gagnoa@test.com / password123
```

## Known Limitations
- Orange Money is in SIMULATION MODE
- USSD is web-based simulation only
- SMS notifications are logged, not sent to real phones
- ✅ PDF reports now available for EUDR, Carbon, and Distributions

## Recent Changes (February 27, 2026)
1. **Carbon Marketplace** - New dedicated page at `/carbon-marketplace` accessible to all users
2. **Partners Section** - Replaced "Nos membres actifs" with "Nos Partenaires" (Orange CI)
3. **Admin Dashboard** - Super admin at `/admin/dashboard` for partner management
4. **Legal Pages** - Created `/conditions`, `/confidentialite`, `/securite`
5. **Removed Emergent Badge** - Watermark removed from footer
6. **Legal Acceptance at Registration** - Checkboxes for Terms & Privacy
7. **Account Deletion** - Users can delete their own account
8. **Mobile App (React Native)** - Complete farmer-focused mobile application
   - Location: `/app/mobile/greenlink-farmer/`
   - Features: Authentication, Parcels, Harvests, Payments, Notifications
   - Optimized for low connectivity
   - Offline mode support
   - USSD-like simple interface

## Recent Changes (December 2025)
9. **Push Notifications Integration** - Integrated push notifications into mobile app
   - Updated `App.js` with notification listeners and handlers
   - Backend endpoint `/api/greenlink/notifications/register-device` for device registration
   - Navigation to specific screens from notifications
   - Badge management and notification channels for Android
10. **Background Sync Integration** - App now syncs when coming to foreground
    - Automatic sync on app resume
    - Manual sync button in Profile screen
    - Sync status display with last sync time
11. **Improved Notifications Service** - Enhanced notification handling
    - Proper Expo Constants integration for project ID
    - Better error handling and logging
    - Platform-specific device registration
12. **EAS Build Configuration** - Production build setup for mobile app
    - `eas.json` configured for preview and production builds
    - `app.json` updated with all required plugins and permissions
    - NPM scripts for easy build commands
    - Complete README with build and distribution instructions

## Mobile App Build Instructions

### Quick Start (Development)
```bash
cd /app/mobile/greenlink-farmer
yarn install
npx expo start
```

### Production Build (APK for Android)
```bash
# Login to Expo (first time)
npx eas-cli login

# Build preview APK
yarn build:preview

# Build production APK
yarn build:android
```

### Distribution Options
1. **QR Code** - Scan with Expo Go app
2. **Direct APK link** - Share via WhatsApp/SMS
3. **Google Play Store** - Use `yarn submit:android`

## Files of Reference
- `/app/backend/routes/admin.py` - Admin and partners routes
- `/app/backend/routes/payments.py` - Orange Money integration
- `/app/backend/routes/greenlink.py` - Farmer endpoints including notifications
- `/app/backend/routes/cooperative.py` - Cooperative management endpoints
- `/app/backend/services/fcm_service.py` - Firebase Cloud Messaging service
- `/app/frontend/src/pages/rse/CarbonMarketplace.jsx` - Carbon marketplace
- `/app/frontend/src/pages/admin/Dashboard.jsx` - Admin dashboard
- `/app/frontend/src/pages/cooperative/Dashboard.jsx` - Cooperative dashboard
- `/app/frontend/src/pages/cooperative/MembersPage.jsx` - Members management
- `/app/frontend/src/pages/cooperative/LotsPage.jsx` - Grouped sales lots
- `/app/frontend/src/pages/cooperative/DistributionsPage.jsx` - Premium distributions
- `/app/frontend/src/pages/cooperative/ReportsPage.jsx` - EUDR compliance reports
- `/app/frontend/src/services/cooperativeApi.js` - Cooperative API service
- `/app/frontend/src/components/PartnersSection.jsx` - Partners display
- `/app/frontend/src/pages/ConditionsPage.jsx` - Terms page
- `/app/frontend/src/pages/ConfidentialitePage.jsx` - Privacy page
- `/app/frontend/src/pages/SecuritePage.jsx` - Security page
- `/app/mobile/greenlink-farmer/App.js` - Mobile app entry point with notifications
- `/app/mobile/greenlink-farmer/README.md` - Complete build and distribution guide
- `/app/mobile/greenlink-farmer/FIREBASE_SETUP.md` - Firebase/FCM configuration guide
- `/app/mobile/greenlink-farmer/eas.json` - EAS Build configuration
- `/app/mobile/greenlink-farmer/app.json` - Expo configuration with plugins
- `/app/mobile/greenlink-farmer/src/services/notifications.js` - Push notification service
- `/app/mobile/greenlink-farmer/src/services/sync.js` - Background sync service
- `/app/mobile/greenlink-farmer/src/screens/profile/ProfileScreen.js` - Profile with sync button

## Recent Changes (February 28, 2026) - PDF Report Generation & Mobile Cooperative
13. **PDF Report Generation for EUDR Compliance** - Cooperatives can now download official PDF reports
    - Backend service in `/app/backend/services/pdf_service.py`
    - Endpoints: `/api/cooperative/reports/eudr/pdf`, `/api/cooperative/reports/carbon/pdf`
    - **NEW: Individual Member Payment Receipt** - `/api/cooperative/members/{id}/receipt/pdf`
    - Uses `reportlab` library for professional PDF generation
    - EUDR compliance reports with cooperative info, compliance metrics, statistics
    - Carbon reports with CO2 capture data, environmental impact equivalents, SDG alignment
    - Distribution reports with beneficiary lists and payment status
    - **Individual payment receipts** with member info, amount, environmental impact, EUDR certification
    - Frontend integration with download buttons in ReportsPage.jsx
    - CSV export also available for data analysis

14. **Mobile App - Cooperative Agent Features (React Native)**
    - New screens for cooperative field agents in `/app/mobile/greenlink-farmer/src/screens/cooperative/`
    - **CoopDashboardScreen**: Overview with stats, quick actions, financial summary
    - **CoopMembersScreen**: Member list with search, filters, status badges
    - **CoopMemberDetailScreen**: Full member profile with parcels, carbon stats, payment history
    - **AddCoopMemberScreen**: Form to register new members with GDPR consent
    - **AddMemberParcelScreen**: Declare parcels with GPS capture using device location
    - **CoopReportsScreen**: View compliance data and download PDF reports on mobile
    - New API service `/app/mobile/greenlink-farmer/src/services/cooperativeApi.js`
    - PDF download with expo-file-system and expo-sharing for mobile devices
    - Added `expo-sharing` dependency for PDF sharing functionality

## Recent Changes (December 2025) - Cooperative Profile
11. **Coopérative agricole profile** - Complete agricultural cooperative management system
    - Backend routes in `/app/backend/routes/cooperative.py`
    - Dashboard with real-time statistics
    - Member management (CRUD, validation, CSV import)
    - Grouped sales lots management
    - Carbon premium distribution with simulated Orange Money payments
    - EUDR compliance reporting
    - Field agent management
    - Village-wise statistics

12. **Super Admin Strategic Dashboard** - High-value analytics for institutional stakeholders
    - Backend routes in `/app/backend/routes/admin_analytics.py`
    - Frontend in `/app/frontend/src/pages/admin/SuperAdminDashboard.jsx`
    - 7 strategic sections: Production, Sustainability, EUDR, Social Impact, Market, Macroeconomic, Cooperatives
    - Targets: Governments, World Bank, IMF, WTO, NGOs, Bourse Café-Cacao, Global buyers
    - Reports: Production, Carbon, Social Impact, Trade, EUDR Compliance, Regional
    - Export capabilities (CSV/PDF)
    - Period filters (month, quarter, year, all)
    - Dark theme professional design

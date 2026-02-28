# GreenLink PRD - Updated February 28, 2026

## Latest Updates - Feb 28, 2026

### 0. Profile Page ICI Edition - ✅ COMPLETED (NEW)
- **Purpose**: Permettre aux producteurs de visualiser et modifier leurs données ICI depuis leur profil

**Key Features Implemented:**
- Section "Informations du ménage (ICI)" intégrée à la page profil
- Édition complète des données ICI : département, village, genre, année de naissance, niveau d'éducation, taille ménage, nombre d'enfants
- Affichage de la classification de risque ICI avec score (0-100) et catégorie (1/2/3)
- Mise à jour automatique du profil ICI lors de la sauvegarde
- Style vert cohérent avec l'identité ICI

**Files Updated:**
- `/app/frontend/src/pages/Profile.jsx` - Section ICI complète

---

### 0.1 ICI Analytics Dashboard - ✅ COMPLETED
- **Source**: Rapport ICI 2024 + Catégorisation Gouvernement CI 2006
- **Purpose**: Métriques officielles travail des enfants, zones à risque, due diligence EUDR

**Key Features Implemented:**
- Dashboard travail des enfants avec 4 KPIs clés (26% en travail, 77% support, 44% sortis, 1.17M ménages)
- Catégorisation officielle des 51 départements en 3 catégories de risque
- Indicateurs impact social alignés ODD (8.7, 4.1, 1.1, 5)
- Programme cash transfers pour réduction travail enfants
- Évaluation risque travail forcé
- Package due diligence acheteur (conforme EUDR Art. 3)
- Données sur les tâches dangereuses (port charges 45%, outils tranchants 38%, longues heures 32%)

**API Endpoints:**
- `GET /api/ici-analytics/child-labor-dashboard` - Dashboard travail enfants
- `GET /api/ici-analytics/zone-categorization` - 3 catégories de zones
- `GET /api/ici-analytics/social-impact-indicators` - ODD alignment
- `GET /api/ici-analytics/cash-transfer-program` - Programme pilote
- `GET /api/ici-analytics/child-friendly-programs` - Clubs lecture, espaces enfants
- `GET /api/ici-analytics/forced-labor-risk` - Indicateurs travail forcé
- `GET /api/ici-analytics/buyer-due-diligence-package` - Package EUDR complet

**Files Created:**
- `/app/backend/routes/ici_analytics.py` - Backend API routes
- `/app/frontend/src/pages/admin/ICIAnalyticsDashboard.jsx` - Frontend dashboard
- Route `/admin/ici-analytics` in App.js

**Value Proposition:**
- Pour Gouvernements: Suivi protocole Harkin-Engel, ODD climat
- Pour UNICEF/OIT: Données officielles protection enfance
- Pour Acheteurs: Due diligence EUDR Art. 3 (déforestation + droits humains)
- Pour ONG: Impact mesurable des interventions

---

### 0.1. ICI Data Collection & Alerts System - ✅ COMPLETED (NEW)
- **Purpose**: Système de collecte de données terrain et alertes automatiques basé sur indicateurs ICI

**Key Features Implemented:**
- Collecte profils ICI producteurs (données démographiques, ménage, enfants, main-d'œuvre)
- Système SSRTE (Suivi et Remédiation du Travail des Enfants) - enregistrement visites terrain
- Classification automatique des zones à risque selon département
- Calcul automatique du score de risque (0-100) basé sur:
  - Enfants travaillant sur exploitation
  - Tâches dangereuses effectuées (Convention OIT 182)
  - Zone géographique (catégorie 1/2/3)
  - Formation sécurité reçue
- Génération automatique d'alertes (critique, haute, moyenne, basse)
- Dashboard d'alertes avec filtres et gestion (prise en charge, résolution)
- Métriques temps réel alimentées par les données collectées
- Génération de rapports hebdomadaires automatiques

**API Endpoints:**
- `POST /api/ici-data/farmers/{id}/ici-profile` - Créer/MAJ profil ICI producteur
- `GET /api/ici-data/farmers/{id}/ici-profile` - Obtenir profil ICI
- `POST /api/ici-data/ssrte/visit` - Enregistrer visite SSRTE
- `GET /api/ici-data/ssrte/visits` - Liste des visites SSRTE
- `GET /api/ici-data/alerts` - Liste des alertes avec stats
- `PUT /api/ici-data/alerts/{id}/acknowledge` - Prendre en charge alerte
- `PUT /api/ici-data/alerts/{id}/resolve` - Résoudre alerte
- `GET /api/ici-data/metrics/calculate` - Calculer métriques temps réel
- `GET /api/ici-data/reference/dangerous-tasks` - Référentiel tâches dangereuses
- `POST /api/ici-data/reports/weekly-summary` - Générer rapport hebdomadaire

**Collections MongoDB créées:**
- `ici_profiles` - Profils ICI des producteurs
- `ssrte_visits` - Visites SSRTE terrain
- `ici_alerts` - Alertes générées
- `ici_reports` - Rapports générés

**Files Created:**
- `/app/backend/routes/ici_data_collection.py` - Backend API routes
- `/app/frontend/src/pages/admin/ICIAlertsDashboard.jsx` - Frontend dashboard alertes
- Route `/admin/ici-alerts` in App.js

**Modèles de données mis à jour:**
- `auth_models.py` - Ajout champs ICI (department, village, date_naissance, genre, niveau_education, taille_menage, nombre_enfants)

---

### 1. Mobile Welcome Screen - ✅ COMPLETED
- New landing page for mobile app with hero section
- User type selection (Producteur/Coopérative) with direct navigation
- Stats display (5000+ Producteurs, 150+ Coopératives, 25K Hectares)
- Features showcase and CTA buttons
- Files: `/app/mobile/greenlink-farmer/src/screens/welcome/WelcomeScreen.js`

### 2. Terms & Privacy Links - ✅ COMPLETED
- Clickable links on mobile registration for Terms and Privacy Policy
- Modal popups with full legal text content
- Professional UI with read and close buttons
- Files: `/app/mobile/greenlink-farmer/src/screens/auth/RegisterScreen.js`

### 3. SMS OTP Integration - ✅ COMPLETED (Mock Mode)
- Orange CI SMS API integration service
- Ready for production with environment variables
- Mock mode for development/testing
- API endpoints: `/api/sms/send-otp`, `/api/sms/verify-otp`, `/api/sms/status`
- Files: `/app/backend/services/orange_sms.py`, `/app/backend/routes/sms.py`
- **Configuration Required**: `ORANGE_CLIENT_ID`, `ORANGE_CLIENT_SECRET` in `.env`

### 4. Order Tracking Route - ✅ COMPLETED
- Route `/order-tracking/:orderId` added to App.js
- Full tracking UI with timeline, shipment info, delivery address
- Supplier can update status and add shipment details

### 5. APK Build v1.2.0 (Build Code 7) - 🔄 IN PROGRESS
- Page d'accueil mobile ajoutée
- Liens conditions/confidentialité cliquables
- Build en cours sur Expo EAS

---

## Billing & Payment Tracking Module - ✅ COMPLETED (Feb 28, 2026)

### Module Summary
Complete billing and payment tracking system for Super Admin to manage carbon credit invoices and farmer distributions.

### Key Features
- **Invoice Management**: Create, send, and track carbon credit invoices
- **Payment Recording**: Record payments with multiple methods (bank transfer, wire, check, escrow, Orange Money)
- **Distribution Tracking**: Automatic distribution creation when invoices are paid
- **Financial Dashboard**: Overview with total invoiced, paid, pending, overdue amounts
- **Monthly Reports**: Detailed financial reports by period

### API Endpoints
- `GET /api/billing/dashboard` - Financial overview
- `POST /api/billing/invoices/create` - Create new invoice
- `GET /api/billing/invoices` - List invoices with filters
- `PUT /api/billing/invoices/{id}/send` - Mark invoice as sent
- `POST /api/billing/payments/record` - Record a payment
- `GET /api/billing/payments/history` - Payment history
- `GET /api/billing/distributions` - Farmer distributions

### Files Created
- `/app/backend/routes/billing.py` - Backend API routes
- `/app/frontend/src/pages/admin/BillingDashboard.jsx` - Frontend dashboard
- Route `/admin/billing` in App.js

---

## Carbon Credit Business Model - ✅ COMPLETED (Latest Feature)

### Business Model Summary
- **GreenLink Margin**: 25% of net revenue
- **Farmer Share**: 70% redistributed to farmers
- **Cooperative Share**: 5% for management
- **Cost Structure**: 30% (audits, verification, buffer, fees)

### Carbon Sequestration Rates (FAO Ex-Act based)
- Low shade (≤20 trees/ha): 1.5 t CO2/ha/year
- Medium shade (21-40 trees/ha): 3.0 t CO2/ha/year  
- High shade (41-80 trees/ha): 4.8 t CO2/ha/year
- Bonuses: organic (+0.5), soil residues (+0.3), cover crops (+0.4), biochar (+2.0)

### Market Pricing (2025-2026)
- Standard: 5-15 USD/t
- Verified (Verra VCS): 15-25 USD/t
- Premium (Gold Standard): 25-40 USD/t
- Biochar Enhanced: 40-60 USD/t

### Revenue Projections
| Phase | Farmers | Tonnes CO2 | Gross Revenue | GreenLink Margin |
|-------|---------|-----------|---------------|------------------|
| Pilot | 1,000 | 12,500 | 375,000 USD | 65,625 USD |
| Growth | 5,000 | 62,500 | 1,875,000 USD | 328,125 USD |
| Scale | 20,000 | 250,000 | 7,500,000 USD | 1,312,500 USD |
| Maturity | 50,000 | 625,000 | 18,750,000 USD | 3,281,250 USD |

### Files Created
- `/app/backend/carbon_business_model.py` - Core calculations
- `/app/backend/routes/carbon_sales.py` - API endpoints
- `/app/frontend/src/pages/admin/CarbonBusinessDashboard.jsx` - Dashboard UI

---

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
  - `/api/billing/*` - Invoice and payment management (NEW)
  - `/api/carbon/*` - Carbon credit sales and analytics

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
- ✅ Password Reset Feature - **COMPLETED** (forgot-password flow)
- ✅ Push Notifications for Carbon Premiums - **COMPLETED** (FCM integration)
- ⚠️ Configure Firebase project and upload `google-services.json` for production FCM
- ✅ Mobile app for cooperative field agents - **COMPLETED** (6 screens)

### P2 (Medium Priority)
- Product price history tracking
- ✅ CSV/PDF export for EUDR reports - **COMPLETED**
- Multi-language support (Baoulé, Dioula, Sénoufo)
- ✅ Advanced analytics dashboard - **COMPLETED**
- ✅ Order tracking with real-time updates - **COMPLETED**
- ✅ SMS OTP for secure payments - **COMPLETED**

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

- `/app/mobile/greenlink-farmer/src/screens/cooperative/` - Mobile cooperative screens
- `/app/mobile/greenlink-farmer/src/services/cooperativeApi.js` - Mobile cooperative API service

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

15. **Password Reset Feature (Mot de passe oublié)**
    - Backend endpoints: `/api/auth/forgot-password`, `/api/auth/verify-reset-code`, `/api/auth/reset-password`
    - 6-digit verification code system with 15-minute expiration
    - Simulation mode with code display for testing (production: SMS/Email)
    - Frontend page `/forgot-password` with 3-step wizard (request > verify > reset)
    - Mobile screen `ForgotPasswordScreen.js` with same 3-step flow
    - Link added to login pages on web and mobile

16. **Push Notifications for Carbon Premiums**
    - Extended FCM service with cooperative notifications in `/app/backend/services/fcm_service.py`
    - `notify_members_premium_available()`: Notifies all members when distribution is ready
    - `notify_coop_distribution_complete()`: Notifies cooperative admin on completion
    - Automatically triggered when executing distribution payments
    - Fallback to SMS queue for members not using the mobile app

17. **SMS OTP Verification System**
    - Backend endpoints in `/app/backend/routes/tracking.py`
    - `/api/tracking/otp/request`: Generate 6-digit OTP with 5-minute expiration
    - `/api/tracking/otp/verify`: Verify OTP and get verification token (10min validity)
    - `/api/tracking/otp/validate-token`: Validate token before sensitive operations
    - Simulation mode for testing (code displayed), production: SMS via Orange API
    - Secure payments and transfers for farmers with basic phones

18. **Real Order Tracking System**
    - Backend routes in `/app/backend/routes/tracking.py`
    - `/api/tracking/orders/{id}`: Detailed tracking with timeline, location, carrier info
    - `/api/tracking/orders/{id}/ship`: Add shipment info (carrier, tracking number)
    - `/api/tracking/orders/{id}/update`: Add tracking updates with location
    - `/api/tracking/supplier/orders`: Supplier order management view
    - Frontend page `/pages/OrderTracking.jsx`: Real-time tracking UI with timeline
    - Automatic notifications at each status change

19. **Advanced Analytics & Data Export**
    - Backend routes in `/app/backend/routes/analytics_advanced.py`
    - `/api/analytics/supplier/dashboard`: Full supplier analytics (revenue, orders, products, trends)
    - `/api/analytics/buyer/dashboard`: Buyer purchase analytics
    - `/api/analytics/export/orders`: CSV export of orders
    - `/api/analytics/export/products`: CSV export of product catalog
    - `/api/analytics/export/members`: CSV export for cooperatives
    - `/api/analytics/export/transactions`: Financial transactions export
    - `/api/analytics/platform/overview`: Platform-wide stats (super admin)
    - Frontend page `/pages/supplier/Analytics.jsx`: Interactive analytics dashboard

20. **Mobile Bottom Tab Navigation & Logout** - ✅ COMPLETED (Feb 28, 2026)
    - Professional bottom navigation bar component `/src/components/navigation/BottomTabBar.js`
    - MainLayout wrapper component for consistent app layout
    - Tab configuration for Farmer and Cooperative user types
    - 5 main tabs: Accueil, Parcelles/Membres, Action (central button), Paiements/Rapports, Profil
    - **Animations implemented**:
      - Bounce animation on tab selection
      - Slide-up effect on active tab
      - Badge pulse animation for notifications
      - Main button rotate animation on press
    - **Notification badges system**: Configurable via props with count display (99+ for large numbers)
    - Active tab indicator with icons and labels
    - Logout functionality on both web (Navbar) and mobile (ProfileScreen)
    - Safe area handling for iOS notch and Android navigation bar

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


## Recent Changes (February 28, 2026) - Business Model Implementation

23. **Subscription/Business Model System** - ✅ COMPLETED
    - Full subscription management system
    - Backend routes in `/app/backend/routes/subscriptions.py`
    - Models in `/app/backend/subscription_models.py`
    
    **Business Model:**
    | User Type | Plan | Price | Trial |
    |-----------|------|-------|-------|
    | Producteur | Gratuit | 0 FCFA | ❌ Gratuit à vie |
    | Coopérative | Gratuit | 0 FCFA | ❌ Gratuit à vie |
    | Acheteur | Starter | 49,000 FCFA/mois | ✅ 15 jours |
    | Fournisseur | Business | 29,000 FCFA/mois + 5% | ✅ 15 jours |
    | Entreprise RSE | Enterprise | Sur devis | ✅ 15 jours |
    
    **API Endpoints:**
    - `GET /api/subscriptions/plans` - Liste tous les plans
    - `GET /api/subscriptions/my-subscription` - Abonnement utilisateur
    - `GET /api/subscriptions/trial-status` - Status de la période d'essai
    - `POST /api/subscriptions/upgrade` - Mise à niveau du plan
    - `POST /api/subscriptions/cancel` - Annulation
    
    **Auto-création à l'inscription:**
    - Les abonnements sont créés automatiquement lors de l'inscription
    - Le plan est déterminé par le `user_type`
    - Les plans payants démarrent avec 15 jours d'essai gratuit

21. **Expo Push Notifications System** - ✅ COMPLETED
    - Full push notification system using Expo Push Service
    - Backend routes in `/app/backend/routes/notifications.py`
    - Mobile service in `/app/mobile/greenlink-farmer/src/services/notifications.js`
    
    **Notification Types:**
    - Primes carbone disponibles (quand une distribution est prête)
    - Confirmations de paiement Orange Money
    - Rappels hebdomadaires pour primes non récupérées
    - Annonces de la coopérative
    - Mises à jour parcelles/récoltes
    
    **Features:**
    - Enregistrement automatique des appareils
    - Préférences de notifications par utilisateur
    - Historique des notifications
    - Canaux Android (default, payments, reminders)
    - Queue SMS pour membres sans smartphone
    - Notification de test
    
    **API Endpoints:**
    - `POST /api/notifications/register-device`: Enregistre un appareil
    - `GET/PUT /api/notifications/preferences`: Gestion des préférences
    - `GET /api/notifications/history`: Historique des notifications
    - `POST /api/notifications/test`: Envoie une notification test
    - `POST /api/notifications/send-to-all-members`: Notifie tous les membres (coop)
    - `POST /api/notifications/trigger-weekly-reminders`: Lance les rappels (admin)
    
    **Mobile Screen:**
    - `NotificationPreferencesScreen.js`: Écran de préférences avec toggles

22. **Mobile App Version 1.1.0** - Ready for Production Build
    - Updated `app.json` with notification plugins
    - Updated `eas.json` for production build
    - Created `BUILD_GUIDE.md` with build instructions
    - Version bump: 1.0.0 → 1.1.0

## Build Instructions

### APK Production
```bash
cd /app/mobile/greenlink-farmer
npx eas-cli login  # First time only
npx eas-cli build --platform android --profile production
```

### OTA Updates (sans nouveau build)
```bash
npx eas-cli update --branch production --message "Description"
```

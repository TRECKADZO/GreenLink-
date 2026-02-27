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

## Prioritized Backlog

### P0 (Critical) - COMPLETED
- ✅ Orange Money integration (simulation mode)
- ✅ Product reviews and ratings
- ✅ Wishlist functionality
- ✅ Order tracking
- ✅ Carbon Marketplace page
- ✅ Admin dashboard with partner management
- ✅ Legal pages (Conditions, Confidentialité, Sécurité)

### P1 (High Priority)
- Real Orange Money API integration (requires merchant registration)
- Real USSD/SMS integration (Orange API)
- PDF certificate generation

### P2 (Medium Priority)
- Product price history tracking
- CSV/PDF export for EUDR reports
- Multi-language support (Baoulé, Dioula, Sénoufo)

### P3 (Future)
- Production hardening
- Rate limiting and security audit
- Mobile app (React Native)

## Test Credentials
```
Admin: klenakan.eric@gmail.com / 474Treckadzo
Buyer: buyer@test.com / password123
Farmer: farmer1@test.com / test123
RSE: rse1@test.com / test123
Supplier: supplier1@test.com / test123
```

## Known Limitations
- Orange Money is in SIMULATION MODE
- USSD is web-based simulation only
- SMS notifications are logged, not sent to real phones
- Certificates are text, not PDF

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

## Files of Reference
- `/app/backend/routes/admin.py` - Admin and partners routes
- `/app/backend/routes/payments.py` - Orange Money integration
- `/app/backend/routes/greenlink.py` - Farmer endpoints including notifications
- `/app/frontend/src/pages/rse/CarbonMarketplace.jsx` - Carbon marketplace
- `/app/frontend/src/pages/admin/Dashboard.jsx` - Admin dashboard
- `/app/frontend/src/components/PartnersSection.jsx` - Partners display
- `/app/frontend/src/pages/ConditionsPage.jsx` - Terms page
- `/app/frontend/src/pages/ConfidentialitePage.jsx` - Privacy page
- `/app/frontend/src/pages/SecuritePage.jsx` - Security page
- `/app/mobile/greenlink-farmer/App.js` - Mobile app entry point with notifications
- `/app/mobile/greenlink-farmer/src/services/notifications.js` - Push notification service
- `/app/mobile/greenlink-farmer/src/services/sync.js` - Background sync service
- `/app/mobile/greenlink-farmer/src/screens/profile/ProfileScreen.js` - Profile with sync button

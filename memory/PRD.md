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
- **Key Routes**: `/buyer/dashboard`

### 3. Entreprise RSE (CSR Company)
- **Needs**: Verified carbon credits, impact tracking, CSRD reporting
- **Features**: Carbon marketplace, impact dashboard, certificates
- **Key Routes**: `/rse/dashboard`

### 4. Fournisseur (Supplier)
- **Needs**: Product management, order handling, customer messaging
- **Features**: Full marketplace CRUD, dashboard analytics, notifications
- **Key Routes**: `/supplier/dashboard`, `/supplier/products`, `/supplier/orders`

## Technical Architecture

### Backend (FastAPI + MongoDB)
- **Auth**: JWT-based with phone/email login
- **Routes**:
  - `/api/auth/*` - Authentication
  - `/api/greenlink/*` - Farmer, Buyer, RSE endpoints
  - `/api/marketplace/*` - Supplier endpoints

### Frontend (React)
- **Components**: Shadcn UI library
- **Services**: Dedicated API clients (`greenlinkApi.js`, `marketplaceApi.js`)
- **Auth**: Context-based with localStorage persistence

## Implementation Status

### Completed (February 2026)
- [x] Landing page (clone of greenlink-agritech.com)
- [x] Authentication (email + phone, all 4 user types)
- [x] Farmer dashboard with USSD simulator
- [x] Buyer dashboard with EUDR export
- [x] RSE dashboard with impact metrics
- [x] **RSE Interactive Map** - Clickable map of Côte d'Ivoire with regional statistics
- [x] Supplier dashboard with full marketplace
- [x] Auth timing bug fixed in all dashboards
- [x] **SMS Notifications for farmers** (auto-send when carbon score ≥7)
- [x] **Carbon Premium Calculator** - Interactive calculator on homepage

### Mocked/Simulated
- Orange Money payments (backend simulation only)
- USSD interface (web simulator, no telecom integration)
- Carbon credit certificates (text format, no PDF)
- **SMS notifications** (simulated, stored in DB, ready for Orange API)

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login (email or phone)
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile

### Farmer (Greenlink)
- `POST /api/greenlink/parcels` - Declare parcel (auto SMS if score ≥7)
- `GET /api/greenlink/parcels/my-parcels` - Get my parcels
- `POST /api/greenlink/harvests` - Declare harvest
- `GET /api/greenlink/farmer/dashboard` - Dashboard stats
- `GET /api/greenlink/sms/history` - SMS notification history
- `POST /api/greenlink/sms/send-weekly-summary` - Send weekly summary SMS

### Buyer
- `POST /api/greenlink/buyer/orders` - Create order
- `GET /api/greenlink/buyer/orders` - Get orders
- `GET /api/greenlink/buyer/traceability/{order_id}` - EUDR report
- `GET /api/greenlink/buyer/dashboard` - Dashboard stats

### RSE
- `GET /api/greenlink/carbon-credits` - Marketplace
- `POST /api/greenlink/carbon-credits/purchase` - Buy credits
- `GET /api/greenlink/rse/impact-dashboard` - Impact metrics

### Supplier
- `POST /api/marketplace/products` - Create product
- `GET /api/marketplace/products/my-products` - My products
- `GET /api/marketplace/dashboard/stats` - Dashboard

## Database Collections
- `users` - All user types with profile fields
- `parcels` - Farmer parcel declarations
- `harvests` - Harvest records
- `buyer_orders` - Corporate buyer orders
- `carbon_credits` - Available credits
- `carbon_purchases` - Purchase records
- `products` - Supplier products
- `orders` - Marketplace orders
- `messages` - User messaging
- `notifications` - Push notifications

## Prioritized Backlog

### P0 (Critical)
- None - Core functionality complete

### P1 (High Priority)
- Real USSD/SMS integration (Orange API)
- PDF certificate generation
- Real mobile money integration

### P2 (Medium Priority)
- Interactive maps for RSE impact
- CSV/PDF export for EUDR reports
- Multi-language support (Baoulé, Dioula, Sénoufo)

### P3 (Future)
- Production hardening
- Rate limiting and security audit
- Mobile app (React Native)

## Test Credentials
```
Farmer: farmer1@test.com / test123
Buyer: buyer1@test.com / test123
RSE: rse1@test.com / test123
Supplier: supplier1@test.com / test123
```

## Known Limitations
- USSD is web-based simulation only
- Payments are mocked (no real money)
- Certificates are text, not PDF
- No real carbon credit verification (Verra/Gold Standard)

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
  - `/api/marketplace/*` - Supplier and marketplace endpoints
  - `/api/payments/*` - Orange Money payment integration

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

### Mocked/Simulated
- **Orange Money payments** - Simulation mode active (no real API keys yet)
- **USSD interface** - Web simulator, no telecom integration
- **SMS notifications** - Logged to console, ready for Orange API
- **Carbon credit certificates** - Text format, no PDF generation yet

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login (identifier field: email or phone)
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile

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

### Cart & Orders
- `GET /api/marketplace/cart` - Get cart
- `POST /api/marketplace/cart/add` - Add to cart
- `PUT /api/marketplace/cart/update` - Update quantity
- `DELETE /api/marketplace/cart/remove/{id}` - Remove item
- `POST /api/marketplace/cart/checkout` - Create orders
- `GET /api/marketplace/buyer/orders` - Get buyer orders
- `GET /api/marketplace/orders/{id}/tracking` - Get order tracking

### Payments (Orange Money)
- `GET /api/payments/simulation-status` - Check if simulation mode
- `POST /api/payments/initiate` - Initiate payment
- `GET /api/payments/status/{ref}` - Get payment status
- `POST /api/payments/simulate/{token}` - Simulate payment (test mode)
- `POST /api/payments/webhook` - Webhook for real payments

## Database Collections
- `users` - All user types with profile fields
- `parcels` - Farmer parcel declarations
- `harvests` - Harvest records
- `buyer_orders` - Corporate buyer orders
- `carbon_credits` - Available credits
- `carbon_purchases` - Purchase records
- `products` - Supplier products
- `orders` - Marketplace orders
- `payments` - Payment records
- `product_reviews` - Product ratings and reviews
- `wishlists` - User wishlists
- `order_tracking` - Order status history
- `notifications` - User notifications

## Prioritized Backlog

### P0 (Critical) - COMPLETED
- ✅ Orange Money integration (simulation mode)
- ✅ Product reviews and ratings
- ✅ Wishlist functionality
- ✅ Order tracking

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
Buyer: buyer@test.com / password123
Farmer: farmer1@test.com / test123
RSE: rse1@test.com / test123
Supplier: supplier1@test.com / test123
```

## Known Limitations
- Orange Money is in SIMULATION MODE (use `/api/payments/simulate/{token}?action=success`)
- USSD is web-based simulation only
- SMS notifications are logged, not sent to real phones
- Certificates are text, not PDF

## Recent Changes (February 27, 2026)
1. **Orange Money Payment Integration** - Full payment flow with simulation mode
   - `/app/backend/routes/payments.py` - New payment routes
   - `/app/frontend/src/pages/CheckoutPage.jsx` - Updated with Orange Money option
2. **Bug Fix** - Fixed React warning in CheckoutPage (navigate in useEffect)
3. **Bug Fix** - Fixed star rating z-index issue in product reviews

## Files of Reference
- `/app/backend/routes/payments.py` - Orange Money integration
- `/app/backend/routes/marketplace.py` - Marketplace features
- `/app/frontend/src/pages/CheckoutPage.jsx` - Checkout with Orange Money
- `/app/frontend/src/pages/MarketplacePage.jsx` - Products with reviews/wishlist
- `/app/frontend/src/pages/WishlistPage.jsx` - Wishlist page

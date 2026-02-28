import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { Toaster } from "./components/ui/sonner";
import { Toaster as ToasterUI } from "./components/ui/toaster";
import Home from "./pages/Home";
import Register from "./pages/Register";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import Profile from "./pages/Profile";
import CheckoutPage from "./pages/CheckoutPage";
import MarketplacePage from "./pages/MarketplacePage";
import WishlistPage from "./pages/WishlistPage";
import BuyerOrders from "./pages/buyer/BuyerOrders";
import OrderTracking from "./pages/OrderTracking";
import ConditionsPage from "./pages/ConditionsPage";
import ConfidentialitePage from "./pages/ConfidentialitePage";
import SecuritePage from "./pages/SecuritePage";
import FAQPage from "./pages/FAQPage";

// Supplier Routes
import SupplierDashboard from "./pages/supplier/Dashboard";
import MyProducts from "./pages/supplier/MyProducts";
import Marketplace from "./pages/supplier/Marketplace";
import Orders from "./pages/supplier/Orders";
import Messages from "./pages/supplier/Messages";
import Notifications from "./pages/supplier/Notifications";
import SupplierAnalytics from "./pages/supplier/Analytics";

// Farmer Routes
import FarmerDashboard from "./pages/farmer/Dashboard";
import USSDSimulator from "./pages/farmer/USSDSimulator";

// Buyer Routes
import BuyerDashboard from "./pages/buyer/Dashboard";

// RSE Routes
import RSEDashboard from "./pages/rse/Dashboard";
import CarbonMarketplace from "./pages/rse/CarbonMarketplace";

// Admin Routes
import AdminDashboard from "./pages/admin/Dashboard";
import SuperAdminDashboard from "./pages/admin/SuperAdminDashboard";
import CarbonBusinessDashboard from "./pages/admin/CarbonBusinessDashboard";
import BillingDashboard from "./pages/admin/BillingDashboard";
import PremiumAnalyticsDashboard from "./pages/admin/PremiumAnalyticsDashboard";
import ICIAnalyticsDashboard from "./pages/admin/ICIAnalyticsDashboard";
import ICIAlertsDashboard from "./pages/admin/ICIAlertsDashboard";

// Cooperative Routes
import CooperativeDashboard from "./pages/cooperative/Dashboard";
import CooperativeMembersPage from "./pages/cooperative/MembersPage";
import CooperativeLotsPage from "./pages/cooperative/LotsPage";
import CooperativeDistributionsPage from "./pages/cooperative/DistributionsPage";
import CooperativeReportsPage from "./pages/cooperative/ReportsPage";
import MemberParcelsPage from "./pages/cooperative/MemberParcelsPage";
import ImportMembersPage from "./pages/cooperative/ImportMembersPage";

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <CartProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/register" element={<Register />} />
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/marketplace" element={<MarketplacePage />} />
              <Route path="/wishlist" element={<WishlistPage />} />
              <Route path="/order-tracking/:orderId" element={<OrderTracking />} />
              <Route path="/conditions" element={<ConditionsPage />} />
              <Route path="/confidentialite" element={<ConfidentialitePage />} />
              <Route path="/securite" element={<SecuritePage />} />
              <Route path="/faq" element={<FAQPage />} />
              
              {/* Supplier/Fournisseur Routes */}
              <Route path="/supplier/dashboard" element={<SupplierDashboard />} />
              <Route path="/supplier/products" element={<MyProducts />} />
              <Route path="/supplier/marketplace" element={<Marketplace />} />
              <Route path="/supplier/orders" element={<Orders />} />
              <Route path="/supplier/messages" element={<Messages />} />
              <Route path="/supplier/notifications" element={<Notifications />} />
              <Route path="/supplier/analytics" element={<SupplierAnalytics />} />

              {/* Farmer/Producteur Routes */}
              <Route path="/farmer/dashboard" element={<FarmerDashboard />} />
              <Route path="/farmer/ussd" element={<USSDSimulator />} />

              {/* Buyer/Acheteur Routes */}
              <Route path="/buyer/dashboard" element={<BuyerDashboard />} />
              <Route path="/buyer/orders" element={<BuyerOrders />} />
              <Route path="/order-tracking/:orderId" element={<OrderTracking />} />

              {/* RSE/Enterprise Routes */}
              <Route path="/rse/dashboard" element={<RSEDashboard />} />
              <Route path="/rse/carbon-marketplace" element={<CarbonMarketplace />} />
              <Route path="/carbon-marketplace" element={<CarbonMarketplace />} />

              {/* Admin Routes */}
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/analytics" element={<SuperAdminDashboard />} />
              <Route path="/admin/strategic" element={<SuperAdminDashboard />} />
              <Route path="/admin/carbon-business" element={<CarbonBusinessDashboard />} />
              <Route path="/admin/billing" element={<BillingDashboard />} />
              <Route path="/admin/premium-analytics" element={<PremiumAnalyticsDashboard />} />
              <Route path="/admin/ici-analytics" element={<ICIAnalyticsDashboard />} />

              {/* Cooperative Routes */}
              <Route path="/cooperative/dashboard" element={<CooperativeDashboard />} />
              <Route path="/cooperative/members" element={<CooperativeMembersPage />} />
              <Route path="/cooperative/members/new" element={<CooperativeMembersPage />} />
              <Route path="/cooperative/members/import" element={<ImportMembersPage />} />
              <Route path="/cooperative/members/:memberId/parcels" element={<MemberParcelsPage />} />
              <Route path="/cooperative/lots" element={<CooperativeLotsPage />} />
              <Route path="/cooperative/lots/new" element={<CooperativeLotsPage />} />
              <Route path="/cooperative/distributions" element={<CooperativeDistributionsPage />} />
              <Route path="/cooperative/reports" element={<CooperativeReportsPage />} />
            </Routes>
          </BrowserRouter>
          <Toaster />
          <ToasterUI />
        </CartProvider>
      </AuthProvider>
    </div>
  );
}

export default App;

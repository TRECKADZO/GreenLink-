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
import DeleteAccountPage from "./pages/DeleteAccountPage";

// Supplier Routes
import SupplierDashboard from "./pages/supplier/Dashboard";
import MyProducts from "./pages/supplier/MyProducts";
import Marketplace from "./pages/supplier/Marketplace";
import Orders from "./pages/supplier/Orders";
import Messages from "./pages/supplier/Messages";
import Notifications from "./pages/supplier/Notifications";
import SupplierAnalytics from "./pages/supplier/Analytics";
import DeliverySettings from "./pages/supplier/DeliverySettings";

// Farmer Routes
import FarmerDashboard from "./pages/farmer/Dashboard";
import USSDCarbonCalculator from "./pages/farmer/USSDCarbonCalculator";
import CarbonPaymentsDashboard from "./pages/farmer/CarbonPaymentsDashboard";
import MyHarvestsPage from "./pages/farmer/MyHarvestsPage";
import CarbonScorePage from "./pages/farmer/CarbonScorePage";

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
import CooperativeComparison from "./pages/admin/CooperativeComparison";
import RealTimeDashboard from "./pages/admin/RealTimeDashboard";
import SSRTEAnalytics from "./pages/admin/SSRTEAnalytics";
import CarbonAuditorsPage from "./pages/admin/CarbonAuditorsPage";
import AuditMissionsPage from "./pages/admin/AuditMissionsPage";
import BadgeAnalyticsPage from "./pages/admin/BadgeAnalyticsPage";
import AgentMapDashboard from "./pages/admin/AgentMapDashboard";
import AgentMapLeaflet from "./pages/admin/AgentMapLeaflet";
import UsersManagement from "./pages/admin/UsersManagement";
import ContentManagement from "./pages/admin/ContentManagement";

// Auditor Routes
import AuditorDashboard from "./pages/auditor/AuditorDashboard";
import AuditorMissionPage from "./pages/auditor/AuditorMissionPage";
import AuditFormPage from "./pages/auditor/AuditFormPage";

// Cooperative Routes
import CooperativeDashboard from "./pages/cooperative/Dashboard";
import CooperativeMembersPage from "./pages/cooperative/MembersPage";
import CooperativeLotsPage from "./pages/cooperative/LotsPage";
import CooperativeDistributionsPage from "./pages/cooperative/DistributionsPage";
import CooperativeReportsPage from "./pages/cooperative/ReportsPage";
import MemberParcelsPage from "./pages/cooperative/MemberParcelsPage";
import ImportMembersPage from "./pages/cooperative/ImportMembersPage";
import AdminCarbonApprovals from "./pages/admin/AdminCarbonApprovals";
import QuotesManagement from "./pages/admin/QuotesManagement";
import AdminFarmerAssignment from "./pages/admin/AdminFarmerAssignment";
import CreateCarbonListing from "./pages/rse/CreateCarbonListing";
import CooperativeNotifications from "./pages/cooperative/Notifications";
import FieldAgentsPage from "./pages/cooperative/FieldAgentsPage";
import AddParcelPage from "./pages/cooperative/AddParcelPage";
import CarbonPremiumsPage from "./pages/cooperative/CarbonPremiumsPage";
import CarbonSubmissionsPage from "./pages/cooperative/CarbonSubmissionsPage";
import ParcelsVerificationPage from "./pages/cooperative/ParcelsVerificationPage";
import AgentProgressPage from "./pages/cooperative/AgentProgressPage";

// SSRTE Agent Routes
import SSRTEAgentDashboard from "./pages/ssrte/SSRTEAgentDashboard";
import SSRTERealTimeDashboard from "./pages/ssrte/SSRTERealTimeDashboard";

// Harvest Marketplace Routes
import HarvestMarketplace from "./pages/marketplace/HarvestMarketplace";
import CreateHarvestListing from "./pages/marketplace/CreateHarvestListing";
import MarketplaceHub from "./pages/MarketplaceHub";

// Buyer Dashboard
import BuyerMarketplaceDashboard from "./pages/buyer/BuyerDashboard";

// Messaging System
import MessagingPage from "./pages/messaging/MessagingPage";

// Auth Pages
import ActivateMember from "./pages/auth/ActivateMember";
import ActivateAgent from "./pages/auth/ActivateAgent";

// Agent Terrain
import AgentTerrainDashboard from "./pages/agent/AgentTerrainDashboard";
import PWAInstallPrompt from "./components/PWAInstallPrompt";

// Notifications (shared)
import NotificationsPage from "./pages/NotificationsPage";
import AdminNotifications from "./pages/admin/Notifications";

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
              <Route path="/activate-member" element={<ActivateMember />} />
              <Route path="/activate-agent" element={<ActivateAgent />} />
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
              <Route path="/delete-account" element={<DeleteAccountPage />} />
              
              {/* Supplier/Fournisseur Routes */}
              <Route path="/supplier/dashboard" element={<SupplierDashboard />} />
              <Route path="/supplier/products" element={<MyProducts />} />
              <Route path="/supplier/marketplace" element={<Marketplace />} />
              <Route path="/supplier/orders" element={<Orders />} />
              <Route path="/supplier/messages" element={<Messages />} />
              <Route path="/supplier/notifications" element={<Notifications />} />
              <Route path="/supplier/analytics" element={<SupplierAnalytics />} />
              <Route path="/supplier/delivery-settings" element={<DeliverySettings />} />

              {/* Farmer/Producteur Routes */}
              <Route path="/farmer/dashboard" element={<FarmerDashboard />} />
              <Route path="/farmer/prime-carbone" element={<USSDCarbonCalculator />} />
              <Route path="/farmer/carbon-payments" element={<CarbonPaymentsDashboard />} />
              <Route path="/farmer/my-harvests" element={<MyHarvestsPage />} />
              <Route path="/farmer/carbon-score" element={<CarbonScorePage />} />
              <Route path="/carbon-payments" element={<CarbonPaymentsDashboard />} />

              {/* Buyer/Acheteur Routes */}
              <Route path="/buyer/dashboard" element={<BuyerDashboard />} />
              <Route path="/buyer/orders" element={<BuyerOrders />} />
              <Route path="/order-tracking/:orderId" element={<OrderTracking />} />

              {/* RSE/Enterprise Routes */}
              <Route path="/rse/dashboard" element={<RSEDashboard />} />
              <Route path="/rse/carbon-marketplace" element={<CarbonMarketplace />} />
              <Route path="/carbon-marketplace" element={<CarbonMarketplace />} />
              <Route path="/carbon-marketplace/create" element={<CreateCarbonListing />} />

              {/* Admin Routes */}
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/analytics" element={<SuperAdminDashboard />} />
              <Route path="/admin/strategic" element={<SuperAdminDashboard />} />
              <Route path="/admin/carbon-business" element={<CarbonBusinessDashboard />} />
              <Route path="/admin/billing" element={<BillingDashboard />} />
              <Route path="/admin/premium-analytics" element={<PremiumAnalyticsDashboard />} />
              <Route path="/admin/ici-analytics" element={<ICIAnalyticsDashboard />} />
              <Route path="/admin/ici-alerts" element={<ICIAlertsDashboard />} />
              <Route path="/admin/cooperative-comparison" element={<CooperativeComparison />} />
              <Route path="/admin/realtime" element={<RealTimeDashboard />} />
              <Route path="/admin/ssrte-analytics" element={<SSRTEAnalytics />} />
              <Route path="/admin/notifications" element={<AdminNotifications />} />
              <Route path="/admin/carbon-auditors" element={<CarbonAuditorsPage />} />
              <Route path="/admin/audit-missions" element={<AuditMissionsPage />} />
              <Route path="/admin/badge-analytics" element={<BadgeAnalyticsPage />} />
              <Route path="/admin/agents-map" element={<AgentMapLeaflet />} />
              <Route path="/admin/geolocation" element={<AgentMapLeaflet />} />
              <Route path="/admin/agents-map-simple" element={<AgentMapDashboard />} />
              <Route path="/admin/users" element={<UsersManagement />} />
              <Route path="/admin/content" element={<ContentManagement />} />
              <Route path="/admin/carbon-approvals" element={<AdminCarbonApprovals />} />
              <Route path="/admin/quotes" element={<QuotesManagement />} />
              <Route path="/admin/farmer-assignment" element={<AdminFarmerAssignment />} />

              {/* Carbon Auditor Routes */}
              <Route path="/auditor/dashboard" element={<AuditorDashboard />} />
              <Route path="/auditor/mission/:missionId" element={<AuditorMissionPage />} />
              <Route path="/auditor/audit/:missionId/:parcelId" element={<AuditFormPage />} />
              <Route path="/auditor/missions" element={<AuditorDashboard />} />
              <Route path="/auditor/history" element={<AuditorDashboard />} />

              {/* Cooperative Routes */}
              <Route path="/cooperative/dashboard" element={<CooperativeDashboard />} />
              <Route path="/cooperative/members" element={<CooperativeMembersPage />} />
              <Route path="/cooperative/members/new" element={<CooperativeMembersPage />} />
              <Route path="/cooperative/members/import" element={<ImportMembersPage />} />
              <Route path="/cooperative/members/:memberId/parcels" element={<MemberParcelsPage />} />
              <Route path="/cooperative/parcels/new" element={<AddParcelPage />} />
              <Route path="/cooperative/add-parcel" element={<AddParcelPage />} />
              <Route path="/cooperative/parcels" element={<ParcelsVerificationPage />} />
              <Route path="/cooperative/parcels/verification" element={<ParcelsVerificationPage />} />
              <Route path="/cooperative/lots" element={<CooperativeLotsPage />} />
              <Route path="/cooperative/lots/new" element={<CooperativeLotsPage />} />
              <Route path="/cooperative/distributions" element={<CooperativeDistributionsPage />} />
              <Route path="/cooperative/reports" element={<CooperativeReportsPage />} />
              <Route path="/cooperative/carbon-premiums" element={<CarbonPremiumsPage />} />
              <Route path="/cooperative/carbon-submissions" element={<CarbonSubmissionsPage />} />
              <Route path="/cooperative/carbon-submit" element={<CreateCarbonListing />} />
              <Route path="/cooperative/notifications" element={<CooperativeNotifications />} />
              <Route path="/cooperative/agents" element={<FieldAgentsPage />} />
              <Route path="/cooperative/field-agents" element={<FieldAgentsPage />} />
              <Route path="/cooperative/agents-progress" element={<AgentProgressPage />} />

              {/* SSRTE Agent Routes */}
              <Route path="/ssrte/dashboard" element={<SSRTEAgentDashboard />} />
              <Route path="/agent/ssrte" element={<SSRTEAgentDashboard />} />
              <Route path="/agent/terrain" element={<AgentTerrainDashboard />} />
              <Route path="/agent/search" element={<AgentTerrainDashboard />} />
              <Route path="/ssrte/realtime" element={<SSRTERealTimeDashboard />} />
              <Route path="/ssrte/alerts" element={<SSRTERealTimeDashboard />} />

              {/* Shared Notifications */}
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/farmer/notifications" element={<NotificationsPage />} />
              <Route path="/rse/notifications" element={<NotificationsPage />} />
              <Route path="/buyer/notifications" element={<NotificationsPage />} />

              {/* Harvest Marketplace Routes */}
              <Route path="/marketplaces" element={<MarketplaceHub />} />
              <Route path="/marketplace/harvest" element={<HarvestMarketplace />} />
              <Route path="/harvest-marketplace" element={<HarvestMarketplace />} />
              <Route path="/bourse-recoltes" element={<HarvestMarketplace />} />
              <Route path="/marketplace/create-listing" element={<CreateHarvestListing />} />
              <Route path="/marketplace/my-listings" element={<HarvestMarketplace />} />

              {/* Buyer Dashboard */}
              <Route path="/buyer/marketplace" element={<BuyerMarketplaceDashboard />} />
              <Route path="/buyer/quotes" element={<BuyerMarketplaceDashboard />} />
              <Route path="/buyer/favorites" element={<BuyerMarketplaceDashboard />} />
              <Route path="/buyer/alerts" element={<BuyerMarketplaceDashboard />} />

              {/* Messaging System */}
              <Route path="/messages" element={<MessagingPage />} />
              <Route path="/messages/:conversationId" element={<MessagingPage />} />
            </Routes>
          </BrowserRouter>
          <Toaster />
          <ToasterUI />
          <PWAInstallPrompt />
        </CartProvider>
      </AuthProvider>
    </div>
  );
}

export default App;

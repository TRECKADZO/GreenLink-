import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { Toaster } from "./components/ui/sonner";
import Home from "./pages/Home";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import SupplierDashboard from "./pages/supplier/Dashboard";
import MyProducts from "./pages/supplier/MyProducts";
import Marketplace from "./pages/supplier/Marketplace";
import Orders from "./pages/supplier/Orders";
import Messages from "./pages/supplier/Messages";
import Notifications from "./pages/supplier/Notifications";

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/profile" element={<Profile />} />
            
            {/* Supplier Routes */}
            <Route path="/supplier/dashboard" element={<SupplierDashboard />} />
            <Route path="/supplier/products" element={<MyProducts />} />
            <Route path="/supplier/marketplace" element={<Marketplace />} />
            <Route path="/supplier/orders" element={<Orders />} />
            <Route path="/supplier/messages" element={<Messages />} />
            <Route path="/supplier/notifications" element={<Notifications />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </AuthProvider>
    </div>
  );
}

export default App;

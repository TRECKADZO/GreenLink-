import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sprout, 
  LogOut, 
  User, 
  ChevronDown,
  LayoutDashboard,
  Settings,
  Bell,
  Package,
  ShoppingCart,
  Leaf,
  Building2,
  Smartphone
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate('/');
  };

  // Get dashboard route based on user type
  const getDashboardRoute = () => {
    if (!user) return '/';
    switch (user.user_type) {
      case 'producteur': return '/farmer/dashboard';
      case 'acheteur': return '/buyer/dashboard';
      case 'entreprise_rse': return '/rse/dashboard';
      case 'fournisseur': return '/supplier/dashboard';
      default: return '/profile';
    }
  };

  // Get user type label in French
  const getUserTypeLabel = () => {
    if (!user) return '';
    switch (user.user_type) {
      case 'producteur': return 'Producteur';
      case 'acheteur': return 'Acheteur';
      case 'entreprise_rse': return 'Entreprise RSE';
      case 'fournisseur': return 'Fournisseur';
      default: return 'Utilisateur';
    }
  };

  // Get user type icon
  const getUserTypeIcon = () => {
    if (!user) return User;
    switch (user.user_type) {
      case 'producteur': return Leaf;
      case 'acheteur': return ShoppingCart;
      case 'entreprise_rse': return Building2;
      case 'fournisseur': return Package;
      default: return User;
    }
  };

  // Get menu items based on user type
  const getMenuItems = () => {
    if (!user) return [];
    
    const commonItems = [
      { icon: LayoutDashboard, label: 'Tableau de bord', route: getDashboardRoute() },
      { icon: User, label: 'Mon profil', route: '/profile' },
    ];

    switch (user.user_type) {
      case 'producteur':
        return [
          ...commonItems,
          { icon: Smartphone, label: 'Simulateur USSD', route: '/farmer/ussd' },
          { icon: Bell, label: 'Notifications SMS', route: '/farmer/dashboard#sms' },
        ];
      case 'acheteur':
        return [
          ...commonItems,
          { icon: ShoppingCart, label: 'Mes commandes', route: '/buyer/dashboard' },
        ];
      case 'entreprise_rse':
        return [
          ...commonItems,
          { icon: Leaf, label: 'Crédits carbone', route: '/rse/dashboard' },
        ];
      case 'fournisseur':
        return [
          ...commonItems,
          { icon: Package, label: 'Mes produits', route: '/supplier/products' },
          { icon: ShoppingCart, label: 'Commandes', route: '/supplier/orders' },
          { icon: Bell, label: 'Notifications', route: '/supplier/notifications' },
        ];
      default:
        return commonItems;
    }
  };

  const UserIcon = getUserTypeIcon();

  const scrollToMarketplace = () => {
    const element = document.getElementById('marketplace');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate('/#marketplace');
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 bg-[#2d5a4d]/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div 
          className="flex items-center gap-3 cursor-pointer" 
          onClick={() => navigate('/')}
        >
          <div className="w-10 h-10 bg-[#d4a574] rounded-lg flex items-center justify-center">
            <Sprout className="w-6 h-6 text-[#2d5a4d]" />
          </div>
          <div>
            <h1 className="text-white text-lg font-bold">GreenLink</h1>
            <p className="text-white/70 text-xs">Agriculture durable</p>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-6">
          <button 
            onClick={scrollToMarketplace}
            className="text-white/80 hover:text-white transition-colors font-medium"
          >
            Marketplace
          </button>
          <button 
            onClick={() => navigate('/#features')}
            className="text-white/80 hover:text-white transition-colors font-medium"
          >
            Services
          </button>
        </div>
        
        <div className="flex items-center gap-3">
          {user ? (
            <div className="relative" ref={menuRef}>
              {/* User Button */}
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-3 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-300"
                data-testid="user-menu-button"
              >
                <div className="w-8 h-8 rounded-full bg-[#d4a574] flex items-center justify-center">
                  <UserIcon className="w-4 h-4 text-[#2d5a4d]" />
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-white font-medium text-sm">{user.full_name}</p>
                  <p className="text-white/60 text-xs">{getUserTypeLabel()}</p>
                </div>
                <ChevronDown className={`w-4 h-4 text-white/70 transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* User Info Header */}
                  <div className="p-4 bg-gradient-to-r from-[#2d5a4d] to-[#1a4038]">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-[#d4a574] flex items-center justify-center">
                        <UserIcon className="w-6 h-6 text-[#2d5a4d]" />
                      </div>
                      <div>
                        <p className="text-white font-semibold">{user.full_name}</p>
                        <Badge className="bg-white/20 text-white text-xs mt-1">
                          {getUserTypeLabel()}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="py-2">
                    {getMenuItems().map((item, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          navigate(item.route);
                          setMenuOpen(false);
                        }}
                        className="w-full px-4 py-3 flex items-center gap-3 text-gray-700 hover:bg-gray-50 transition-colors"
                        data-testid={`menu-item-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <item.icon className="w-5 h-5 text-gray-400" />
                        <span className="font-medium">{item.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Logout */}
                  <div className="border-t border-gray-100 py-2">
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-3 flex items-center gap-3 text-red-600 hover:bg-red-50 transition-colors"
                      data-testid="logout-button"
                    >
                      <LogOut className="w-5 h-5" />
                      <span className="font-medium">Déconnexion</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <Button 
                variant="ghost" 
                className="text-white hover:text-white hover:bg-white/10 transition-all duration-300"
                onClick={() => navigate('/login')}
              >
                Se connecter
              </Button>
              <Button 
                className="bg-[#d4a574] hover:bg-[#c49564] text-[#2d5a4d] font-semibold transition-all duration-300"
                onClick={() => navigate('/register')}
              >
                S'inscrire
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sprout, LogOut, User, ChevronDown, LayoutDashboard,
  Bell, Package, ShoppingCart, Leaf, Building2, Smartphone,
  Recycle, Store, ArrowRight, MessageSquare, Menu, X
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import CartDrawer from './CartDrawer';

const Navbar = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { cart } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [marketplaceMenuOpen, setMarketplaceMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const marketplaceRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false);
      if (marketplaceRef.current && !marketplaceRef.current.contains(event.target)) setMarketplaceMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    setMobileMenuOpen(false);
    navigate('/');
  };

  const navTo = (route) => {
    navigate(route);
    setMobileMenuOpen(false);
    setMarketplaceMenuOpen(false);
  };

  const getDashboardRoute = () => {
    if (!user) return '/';
    switch (user.user_type) {
      case 'producteur': return '/farmer/dashboard';
      case 'acheteur': return '/buyer/dashboard';
      case 'entreprise_rse': return '/rse/dashboard';
      case 'fournisseur': return '/supplier/dashboard';
      case 'cooperative': return '/cooperative/dashboard';
      case 'admin': return '/admin/dashboard';
      default: return '/profile';
    }
  };

  const getUserTypeLabel = () => {
    if (!user) return '';
    const labels = {
      producteur: 'Producteur', acheteur: 'Acheteur', entreprise_rse: 'Entreprise RSE',
      fournisseur: 'Fournisseur', cooperative: 'Coopérative', admin: 'Administrateur'
    };
    return labels[user.user_type] || 'Utilisateur';
  };

  const getUserTypeIcon = () => {
    if (!user) return User;
    const icons = {
      producteur: Leaf, acheteur: ShoppingCart, entreprise_rse: Building2,
      fournisseur: Package, cooperative: Building2
    };
    return icons[user.user_type] || User;
  };

  const getMenuItems = () => {
    if (!user) return [];
    const common = [
      { icon: LayoutDashboard, label: 'Tableau de bord', route: getDashboardRoute() },
      { icon: User, label: 'Mon profil', route: '/profile' },
    ];
    const extras = {
      producteur: [{ icon: Smartphone, label: 'Simulateur USSD', route: '/farmer/ussd' }],
      acheteur: [{ icon: ShoppingCart, label: 'Mes commandes', route: '/buyer/dashboard' }],
      entreprise_rse: [{ icon: Leaf, label: 'Crédits carbone', route: '/rse/dashboard' }],
      fournisseur: [
        { icon: Package, label: 'Mes produits', route: '/supplier/products' },
        { icon: ShoppingCart, label: 'Commandes', route: '/supplier/orders' },
      ],
      cooperative: [
        { icon: User, label: 'Membres', route: '/cooperative/members' },
        { icon: Package, label: 'Ventes Groupées', route: '/cooperative/lots' },
      ],
    };
    return [...common, ...(extras[user.user_type] || [])];
  };

  const UserIcon = getUserTypeIcon();

  const marketplaceItems = [
    { icon: Leaf, label: 'Bourse des Récoltes', desc: 'Cacao, Café, Anacarde', route: '/marketplace/harvest', color: 'from-amber-500 to-orange-600', badge: 'NOUVEAU' },
    { icon: Package, label: 'Marketplace Intrants', desc: 'Engrais, Semences, Équipements', route: '/supplier/marketplace', color: 'from-emerald-500 to-teal-600' },
    // Carbon Marketplace only visible to RSE enterprises and admins
    ...(user && ['entreprise_rse', 'admin'].includes(user.user_type) ? [
      { icon: Recycle, label: 'Marché Carbone', desc: 'Crédits carbone certifiés', route: '/carbon-marketplace', color: 'from-blue-500 to-indigo-600', badge: 'RSE' },
    ] : []),
  ];

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 px-4 md:px-6 py-3 md:py-4 bg-[#2d5a4d]/95 backdrop-blur-sm" data-testid="navbar">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navTo('/')}>
            <div className="w-9 h-9 md:w-10 md:h-10 bg-[#d4a574] rounded-lg flex items-center justify-center shrink-0">
              <Sprout className="w-5 h-5 md:w-6 md:h-6 text-[#2d5a4d]" />
            </div>
            <div>
              <h1 className="text-white text-base md:text-lg font-bold leading-tight">GreenLink</h1>
              <p className="text-white/70 text-[10px] md:text-xs leading-tight">Agriculture durable</p>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-6">
            <div className="relative" ref={marketplaceRef}>
              <button 
                onClick={() => setMarketplaceMenuOpen(!marketplaceMenuOpen)}
                className="flex items-center gap-1 text-white/80 hover:text-white transition-colors font-medium"
              >
                <Store className="h-4 w-4" />
                Marketplaces
                <ChevronDown className={`h-4 w-4 transition-transform ${marketplaceMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {marketplaceMenuOpen && (
                <div className="absolute top-full left-0 mt-2 w-80 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50">
                  {marketplaceItems.map((item, i) => (
                    <button key={i} onClick={() => navTo(item.route)}
                      className="w-full p-4 hover:bg-white/5 transition-colors text-left group border-b border-slate-700 last:border-b-0">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 bg-gradient-to-br ${item.color} rounded-lg`}>
                          <item.icon className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-semibold">{item.label}</span>
                            {item.badge && <Badge className="bg-white/20 text-white text-xs">{item.badge}</Badge>}
                          </div>
                          <p className="text-slate-400 text-sm mt-1">{item.desc}</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-white transition-colors" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => navTo('/#features')} className="text-white/80 hover:text-white transition-colors font-medium">
              Services
            </button>
          </div>
          
          {/* Right actions */}
          <div className="flex items-center gap-1 md:gap-3">
            {user && (
              <button onClick={() => navTo('/messages')} className="p-2 rounded-lg hover:bg-white/10 transition-colors" data-testid="messages-button">
                <MessageSquare className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </button>
            )}

            <button onClick={() => setCartOpen(true)} className="relative p-2 rounded-lg hover:bg-white/10 transition-colors" data-testid="cart-button">
              <ShoppingCart className="w-5 h-5 md:w-6 md:h-6 text-white" />
              {cart.items_count > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 md:w-5 md:h-5 bg-[#d4a574] text-[#2d5a4d] text-[10px] md:text-xs font-bold rounded-full flex items-center justify-center">
                  {cart.items_count}
                </span>
              )}
            </button>

            {/* Desktop: user menu or auth buttons */}
            {user ? (
              <div className="relative hidden md:block" ref={menuRef}>
                <button onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-3 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all" data-testid="user-menu-button">
                  <div className="w-8 h-8 rounded-full bg-[#d4a574] flex items-center justify-center">
                    <UserIcon className="w-4 h-4 text-[#2d5a4d]" />
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className="text-white font-medium text-sm">{user.full_name}</p>
                    <p className="text-white/60 text-xs">{getUserTypeLabel()}</p>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-white/70 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden">
                    <div className="p-4 bg-gradient-to-r from-[#2d5a4d] to-[#1a4038]">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-[#d4a574] flex items-center justify-center">
                          <UserIcon className="w-6 h-6 text-[#2d5a4d]" />
                        </div>
                        <div>
                          <p className="text-white font-semibold">{user.full_name}</p>
                          <Badge className="bg-white/20 text-white text-xs mt-1">{getUserTypeLabel()}</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="py-2">
                      {getMenuItems().map((item, i) => (
                        <button key={i} onClick={() => { navigate(item.route); setMenuOpen(false); }}
                          className="w-full px-4 py-3 flex items-center gap-3 text-gray-700 hover:bg-gray-50 transition-colors"
                          data-testid={`menu-item-${item.label.toLowerCase().replace(/\s+/g, '-')}`}>
                          <item.icon className="w-5 h-5 text-gray-400" />
                          <span className="font-medium">{item.label}</span>
                        </button>
                      ))}
                    </div>
                    <div className="border-t border-gray-100 py-2">
                      <button onClick={handleLogout} className="w-full px-4 py-3 flex items-center gap-3 text-red-600 hover:bg-red-50 transition-colors" data-testid="logout-button">
                        <LogOut className="w-5 h-5" /><span className="font-medium">Déconnexion</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Button variant="ghost" className="text-white hover:text-white hover:bg-white/10" onClick={() => navigate('/login')}>Se connecter</Button>
                <Button className="bg-[#d4a574] hover:bg-[#c49564] text-[#2d5a4d] font-semibold" onClick={() => navigate('/register')}>S'inscrire</Button>
              </div>
            )}

            {/* Mobile: hamburger */}
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors" data-testid="mobile-menu-toggle">
              {mobileMenuOpen ? <X className="w-6 h-6 text-white" /> : <Menu className="w-6 h-6 text-white" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden" data-testid="mobile-menu">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute top-0 right-0 w-[85%] max-w-sm h-full bg-[#1a3a30] overflow-y-auto animate-in slide-in-from-right duration-300">
            {/* Mobile menu header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#d4a574] rounded-lg flex items-center justify-center">
                  <Sprout className="w-4 h-4 text-[#2d5a4d]" />
                </div>
                <span className="text-white font-bold">GreenLink</span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-lg hover:bg-white/10">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* User info (if logged in) */}
            {user && (
              <div className="p-4 bg-white/5 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#d4a574] flex items-center justify-center">
                    <UserIcon className="w-5 h-5 text-[#2d5a4d]" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{user.full_name}</p>
                    <Badge className="bg-white/15 text-white/80 text-xs mt-0.5">{getUserTypeLabel()}</Badge>
                  </div>
                </div>
              </div>
            )}

            <div className="p-3 space-y-1">
              {/* Marketplaces section */}
              <p className="text-white/40 text-xs font-semibold uppercase tracking-wider px-3 pt-3 pb-1">Marketplaces</p>
              {marketplaceItems.map((item, i) => (
                <button key={i} onClick={() => navTo(item.route)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white/10 transition-colors">
                  <div className={`p-1.5 bg-gradient-to-br ${item.color} rounded-lg`}>
                    <item.icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-left flex-1">
                    <span className="text-white text-sm font-medium">{item.label}</span>
                    <p className="text-white/50 text-xs">{item.desc}</p>
                  </div>
                </button>
              ))}

              {/* User menu items */}
              {user && (
                <>
                  <p className="text-white/40 text-xs font-semibold uppercase tracking-wider px-3 pt-4 pb-1">Mon espace</p>
                  {getMenuItems().map((item, i) => (
                    <button key={i} onClick={() => navTo(item.route)}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white/10 transition-colors">
                      <item.icon className="w-5 h-5 text-white/60" />
                      <span className="text-white text-sm font-medium">{item.label}</span>
                    </button>
                  ))}
                  <button onClick={() => navTo('/messages')}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white/10 transition-colors">
                    <MessageSquare className="w-5 h-5 text-white/60" />
                    <span className="text-white text-sm font-medium">Messagerie</span>
                  </button>
                </>
              )}

              {/* Services link */}
              <p className="text-white/40 text-xs font-semibold uppercase tracking-wider px-3 pt-4 pb-1">Infos</p>
              <button onClick={() => navTo('/#features')} className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white/10 transition-colors">
                <Sprout className="w-5 h-5 text-white/60" />
                <span className="text-white text-sm font-medium">Services</span>
              </button>
            </div>

            {/* Bottom auth section */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10 bg-[#1a3a30]">
              {user ? (
                <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-300 transition-colors" data-testid="mobile-logout-button">
                  <LogOut className="w-4 h-4" />
                  <span className="font-medium text-sm">Déconnexion</span>
                </button>
              ) : (
                <div className="space-y-2">
                  <Button className="w-full bg-[#d4a574] hover:bg-[#c49564] text-[#2d5a4d] font-semibold h-11" onClick={() => navTo('/register')}>
                    S'inscrire gratuitement
                  </Button>
                  <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10 h-11" onClick={() => navTo('/login')}>
                    Se connecter
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
};

export default Navbar;

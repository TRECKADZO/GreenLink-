import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  MessageSquare, 
  Bell, 
  User,
  Store
} from 'lucide-react';
import { Badge } from './ui/badge';

const SupplierSidebar = ({ unreadMessages = 0, unreadNotifications = 0 }) => {
  const menuItems = [
    { path: '/supplier/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
    { path: '/supplier/marketplace', icon: Store, label: 'Marketplace' },
    { path: '/supplier/products', icon: Package, label: 'Mes Produits' },
    { path: '/supplier/orders', icon: ShoppingCart, label: 'Commandes' },
    { path: '/supplier/messages', icon: MessageSquare, label: 'Messagerie', badge: unreadMessages },
    { path: '/supplier/notifications', icon: Bell, label: 'Notifications', badge: unreadNotifications },
    { path: '/profile', icon: User, label: 'Mon Profil' }
  ];

  return (
    <div className="w-64 bg-[#2d5a4d] min-h-screen fixed left-0 top-0 pt-20 px-4">
      <nav className="space-y-2">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-[#d4a574] text-[#2d5a4d] font-semibold'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="flex-1">{item.label}</span>
            {item.badge > 0 && (
              <Badge className="bg-red-500 text-white">{item.badge}</Badge>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default SupplierSidebar;
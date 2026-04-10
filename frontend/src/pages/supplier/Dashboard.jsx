import { tokenService } from "../../services/tokenService";
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import Navbar from '../../components/Navbar';
import SupplierSidebar from '../../components/SupplierSidebar';
import SubscriptionBanner from '../../components/SubscriptionBanner';
import { marketplaceApi } from '../../services/marketplaceApi';
import axios from 'axios';
import {
  Package,
  ShoppingCart,
  TrendingUp,
  Users,
  MessageSquare,
  AlertTriangle,
  DollarSign,
  Activity
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const SupplierDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);

  const fetchSubscription = useCallback(async () => {
    try {
      const token = tokenService.getToken();
      const { data } = await axios.get(`${API_URL}/api/subscriptions/my-subscription`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubscription(data.subscription);
    } catch (_err) {
      /* subscription fetch error */
    }
  }, []);

  const fetchDashboardStats = useCallback(async () => {
    try {
      const data = await marketplaceApi.getDashboardStats();
      setStats(data);
    } catch (_err) {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les statistiques',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.user_type !== 'fournisseur') {
      toast({
        title: 'Acces refuse',
        description: 'Cette page est reservee aux fournisseurs',
        variant: 'destructive'
      });
      navigate('/');
      return;
    }
    fetchDashboardStats();
    fetchSubscription();
  }, [user, authLoading, navigate, toast, fetchDashboardStats, fetchSubscription]);

  if (loading || !stats) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <SupplierSidebar />
        <div className="ml-64 pt-20 p-8">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <Activity className="w-12 h-12 text-[#2d5a4d] animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Chargement du tableau de bord...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Produits Actifs',
      value: stats.active_products,
      total: stats.total_products,
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Commandes',
      value: stats.pending_orders,
      subtitle: 'En attente',
      total: `${stats.total_orders} total`,
      icon: ShoppingCart,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    },
    {
      title: 'Revenu Total',
      value: `${stats.total_revenue.toLocaleString()} XOF`,
      subtitle: `${stats.monthly_revenue.toLocaleString()} ce mois`,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Clients',
      value: stats.total_customers,
      subtitle: 'Clients uniques',
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    }
  ];

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-700',
      confirmed: 'bg-blue-100 text-blue-700',
      preparing: 'bg-indigo-100 text-indigo-700',
      shipped: 'bg-purple-100 text-purple-700',
      delivered: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'En attente',
      confirmed: 'Confirmée',
      preparing: 'En préparation',
      shipped: 'Expédiée',
      delivered: 'Livrée',
      cancelled: 'Annulée'
    };
    return labels[status] || status;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <SupplierSidebar 
        unreadMessages={stats.unread_messages} 
        unreadNotifications={stats.unread_messages} 
      />
      
      <div className="ml-64 pt-20 p-8">
        {/* Subscription Banner */}
        <SubscriptionBanner subscription={subscription} />

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Tableau de Bord</h1>
          <p className="text-gray-600">Bienvenue sur votre espace fournisseur, {user?.full_name}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, index) => (
            <Card key={`stat-${index}`} className="p-6 hover:shadow-lg transition-shadow duration-200">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
              <h3 className="text-sm text-gray-600 mb-1">{stat.title}</h3>
              <p className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</p>
              {stat.subtitle && <p className="text-sm text-gray-500">{stat.subtitle}</p>}
              {stat.total && <p className="text-xs text-gray-400 mt-1">{stat.total}</p>}
            </Card>
          ))}
        </div>

        {/* Alerts */}
        {stats.low_stock_products > 0 && (
          <Card className="p-4 mb-8 border-l-4 border-orange-500 bg-orange-50">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <div>
                <p className="font-semibold text-orange-900">
                  Stock Faible: {stats.low_stock_products} produit(s)
                </p>
                <p className="text-sm text-orange-700">
                  Certains produits ont un stock inférieur à 10 unités
                </p>
              </div>
            </div>
          </Card>
        )}

        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Recent Orders */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Commandes Récentes</h2>
              <ShoppingCart className="w-5 h-5 text-gray-400" />
            </div>
            
            {stats.recent_orders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Aucune commande récente</p>
              </div>
            ) : (
              <div className="space-y-4">
                {stats.recent_orders.map((order, index) => (
                  <div 
                    key={`chart-${index}`} 
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => navigate(`/supplier/orders/${order.order_number}`)}
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{order.order_number}</p>
                      <p className="text-sm text-gray-600">{order.customer_name}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(order.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">
                        {order.total_amount.toLocaleString()} XOF
                      </p>
                      <Badge className={`text-xs mt-1 ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Top Products */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Produits les Plus Vendus</h2>
              <TrendingUp className="w-5 h-5 text-gray-400" />
            </div>
            
            {stats.top_products.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Aucune vente enregistrée</p>
              </div>
            ) : (
              <div className="space-y-4">
                {stats.top_products.map((product, index) => (
                  <div key={`order-${index}`} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 bg-[#2d5a4d] rounded-full flex items-center justify-center text-white font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{product.product_name}</p>
                        <p className="text-sm text-gray-600">{product.sales} ventes</p>
                      </div>
                    </div>
                    <p className="font-bold text-green-600">
                      {product.revenue.toLocaleString()} XOF
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Revenue Chart */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Revenus (7 derniers jours)</h2>
          <div className="flex items-end justify-between h-64 gap-4">
            {stats.revenue_chart.map((day, index) => {
              const maxRevenue = Math.max(...stats.revenue_chart.map(d => d.revenue));
              const height = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;
              
              return (
                <div key={`step-${index}`} className="flex-1 flex flex-col items-center">
                  <div className="w-full bg-gray-200 rounded-t-lg relative group">
                    <div 
                      className="w-full bg-gradient-to-t from-[#2d5a4d] to-[#4a8a7a] rounded-t-lg transition-all duration-300 hover:opacity-80"
                      style={{ height: `${height}%` || '2px' }}
                    >
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
                        {day.revenue.toLocaleString()} XOF
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">{day.date}</p>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SupplierDashboard;

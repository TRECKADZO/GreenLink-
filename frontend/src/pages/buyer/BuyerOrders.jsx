import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import Navbar from '../../components/Navbar';
import { marketplaceApi } from '../../services/marketplaceApi';
import { 
  ShoppingBag, 
  Package, 
  Truck, 
  CheckCircle,
  Clock,
  ArrowLeft,
  MapPin,
  Phone
} from 'lucide-react';

const statusConfig = {
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  confirmed: { label: 'Confirmée', color: 'bg-blue-100 text-blue-700', icon: Package },
  shipped: { label: 'En livraison', color: 'bg-purple-100 text-purple-700', icon: Truck },
  delivered: { label: 'Livrée', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  cancelled: { label: 'Annulée', color: 'bg-red-100 text-red-700', icon: Package }
};

const BuyerOrders = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login');
      return;
    }
    fetchOrders();
  }, [user, authLoading]);

  const fetchOrders = async () => {
    try {
      const data = await marketplaceApi.getBuyerOrders();
      setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-24 pb-12 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse space-y-4">
              {[1,2,3].map(i => (
                <Card key={i} className="p-6">
                  <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pt-24 pb-12 px-6">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>

          <div className="flex items-center gap-3 mb-8">
            <ShoppingBag className="w-8 h-8 text-[#2d5a4d]" />
            <h1 className="text-3xl font-bold text-gray-900">Mes Commandes</h1>
            <Badge className="bg-[#2d5a4d] text-white">{orders.length}</Badge>
          </div>

          {orders.length === 0 ? (
            <Card className="p-12 text-center">
              <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Aucune commande
              </h2>
              <p className="text-gray-600 mb-6">
                Vous n'avez pas encore passé de commande
              </p>
              <Button
                onClick={() => navigate('/#marketplace')}
                className="bg-[#2d5a4d] hover:bg-[#1a4038]"
              >
                Découvrir les produits
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                const status = statusConfig[order.status] || statusConfig.pending;
                const StatusIcon = status.icon;
                
                return (
                  <Card 
                    key={order._id} 
                    className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => setSelectedOrder(selectedOrder?._id === order._id ? null : order)}
                  >
                    {/* Order Header */}
                    <div className="p-6 border-b">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm text-gray-500 mb-1">
                            Commande #{order.order_number}
                          </p>
                          <p className="font-semibold text-gray-900">
                            {order.supplier_name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatDate(order.created_at)}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge className={status.color}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {status.label}
                          </Badge>
                          <p className="text-xl font-bold text-[#2d5a4d] mt-2">
                            {order.total_amount.toLocaleString()} FCFA
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Order Details (Expanded) */}
                    {selectedOrder?._id === order._id && (
                      <div className="p-6 bg-gray-50">
                        {/* Items */}
                        <h4 className="font-semibold text-gray-900 mb-3">Articles</h4>
                        <div className="space-y-2 mb-6">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-0">
                              <div>
                                <p className="font-medium text-gray-900">{item.product_name}</p>
                                <p className="text-sm text-gray-500">
                                  {item.quantity} x {item.unit_price.toLocaleString()} FCFA/{item.unit}
                                </p>
                              </div>
                              <p className="font-semibold text-gray-900">
                                {item.total.toLocaleString()} FCFA
                              </p>
                            </div>
                          ))}
                        </div>

                        {/* Delivery Info */}
                        <h4 className="font-semibold text-gray-900 mb-3">Livraison</h4>
                        <div className="bg-white rounded-lg p-4 space-y-2">
                          <div className="flex items-center gap-2 text-gray-600">
                            <MapPin className="w-4 h-4" />
                            <span>{order.delivery_address}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <Phone className="w-4 h-4" />
                            <span>{order.delivery_phone}</span>
                          </div>
                        </div>

                        {order.notes && (
                          <div className="mt-4">
                            <h4 className="font-semibold text-gray-900 mb-2">Notes</h4>
                            <p className="text-gray-600">{order.notes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BuyerOrders;

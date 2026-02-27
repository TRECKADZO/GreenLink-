import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import Navbar from '../../components/Navbar';
import SupplierSidebar from '../../components/SupplierSidebar';
import { marketplaceApi } from '../../services/marketplaceApi';
import { ShoppingCart, Package, Clock, CheckCircle, Truck, XCircle } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const Orders = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!user || user.user_type !== 'fournisseur') {
      navigate('/');
      return;
    }
    fetchOrders();
  }, [user]);

  const fetchOrders = async () => {
    try {
      const data = await marketplaceApi.getMyOrders();
      setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await marketplaceApi.updateOrderStatus(orderId, newStatus);
      toast({
        title: 'Succès',
        description: 'Statut de la commande mis à jour'
      });
      fetchOrders();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le statut',
        variant: 'destructive'
      });
    }
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: Clock,
      confirmed: CheckCircle,
      preparing: Package,
      shipped: Truck,
      delivered: CheckCircle,
      cancelled: XCircle
    };
    return icons[status] || Clock;
  };

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

  const filteredOrders = filter === 'all' 
    ? orders 
    : orders.filter(order => order.status === filter);

  const statusOptions = [
    { value: 'confirmed', label: 'Confirmer' },
    { value: 'preparing', label: 'En préparation' },
    { value: 'shipped', label: 'Expédier' },
    { value: 'delivered', label: 'Livrée' },
    { value: 'cancelled', label: 'Annuler' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <SupplierSidebar />
      
      <div className="ml-64 pt-20 p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Commandes</h1>
          <p className="text-gray-600">Gérez toutes vos commandes clients</p>
        </div>

        {/* Filters */}
        <Card className="p-4 mb-6">
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
              className={filter === 'all' ? 'bg-[#2d5a4d] hover:bg-[#1a4038]' : ''}
            >
              Toutes ({orders.length})
            </Button>
            <Button
              variant={filter === 'pending' ? 'default' : 'outline'}
              onClick={() => setFilter('pending')}
              className={filter === 'pending' ? 'bg-yellow-600 hover:bg-yellow-700' : ''}
            >
              En attente ({orders.filter(o => o.status === 'pending').length})
            </Button>
            <Button
              variant={filter === 'confirmed' ? 'default' : 'outline'}
              onClick={() => setFilter('confirmed')}
              className={filter === 'confirmed' ? 'bg-blue-600 hover:bg-blue-700' : ''}
            >
              Confirmées ({orders.filter(o => o.status === 'confirmed').length})
            </Button>
            <Button
              variant={filter === 'shipped' ? 'default' : 'outline'}
              onClick={() => setFilter('shipped')}
              className={filter === 'shipped' ? 'bg-purple-600 hover:bg-purple-700' : ''}
            >
              Expédiées ({orders.filter(o => o.status === 'shipped').length})
            </Button>
            <Button
              variant={filter === 'delivered' ? 'default' : 'outline'}
              onClick={() => setFilter('delivered')}
              className={filter === 'delivered' ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              Livrées ({orders.filter(o => o.status === 'delivered').length})
            </Button>
          </div>
        </Card>

        {/* Orders List */}
        {loading ? (
          <div className="text-center py-12">
            <ShoppingCart className="w-12 h-12 text-gray-400 animate-pulse mx-auto mb-4" />
            <p className="text-gray-600">Chargement des commandes...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <Card className="p-12 text-center">
            <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucune commande</h3>
            <p className="text-gray-600">
              {filter === 'all' 
                ? 'Vous n\'avez pas encore reçu de commande' 
                : `Aucune commande avec le statut "${getStatusLabel(filter)}"`
              }
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const StatusIcon = getStatusIcon(order.status);
              return (
                <Card key={order._id} className="p-6 hover:shadow-lg transition-shadow duration-200">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900">{order.order_number}</h3>
                        <Badge className={`flex items-center gap-1 ${getStatusColor(order.status)}`}>
                          <StatusIcon className="w-3 h-3" />
                          {getStatusLabel(order.status)}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        Client: <strong>{order.customer_name}</strong>
                      </p>
                      <p className="text-sm text-gray-600">
                        Tél: {order.customer_phone}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(order.created_at).toLocaleString('fr-FR')}
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-2xl font-bold text-[#2d5a4d]">
                        {order.total_amount.toLocaleString()} FCFA
                      </p>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Articles commandés:</h4>
                    <div className="space-y-2">
                      {order.items.map((item, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span className="text-gray-700">
                            {item.product_name} x {item.quantity}
                          </span>
                          <span className="font-semibold text-gray-900">
                            {item.total_price.toLocaleString()} FCFA
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Delivery Info */}
                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Livraison:</h4>
                    <p className="text-sm text-gray-600">{order.delivery_address}</p>
                    <p className="text-sm text-gray-600">{order.delivery_location}</p>
                    {order.notes && (
                      <p className="text-sm text-gray-500 mt-1 italic">Note: {order.notes}</p>
                    )}
                  </div>

                  {/* Status Change Actions */}
                  {order.status !== 'delivered' && order.status !== 'cancelled' && (
                    <div className="flex gap-2 flex-wrap">
                      {statusOptions
                        .filter(opt => {
                          if (order.status === 'pending') return ['confirmed', 'cancelled'].includes(opt.value);
                          if (order.status === 'confirmed') return ['preparing', 'cancelled'].includes(opt.value);
                          if (order.status === 'preparing') return ['shipped', 'cancelled'].includes(opt.value);
                          if (order.status === 'shipped') return ['delivered'].includes(opt.value);
                          return false;
                        })
                        .map(opt => (
                          <Button
                            key={opt.value}
                            size="sm"
                            variant={opt.value === 'cancelled' ? 'outline' : 'default'}
                            className={
                              opt.value === 'cancelled' 
                                ? 'text-red-600 hover:bg-red-50' 
                                : 'bg-[#2d5a4d] hover:bg-[#1a4038]'
                            }
                            onClick={() => handleStatusChange(order._id, opt.value)}
                          >
                            {opt.label}
                          </Button>
                        ))
                      }
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;
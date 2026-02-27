import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import Navbar from '../components/Navbar';
import { marketplaceApi } from '../services/marketplaceApi';
import { 
  Package, 
  Truck, 
  CheckCircle, 
  Clock,
  MapPin,
  Phone,
  ArrowLeft,
  Box
} from 'lucide-react';

const statusIcons = {
  pending: Clock,
  confirmed: Package,
  processing: Box,
  shipped: Truck,
  delivered: CheckCircle
};

const OrderTracking = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login');
      return;
    }
    fetchTracking();
  }, [user, authLoading, orderId]);

  const fetchTracking = async () => {
    try {
      const data = await marketplaceApi.getOrderTracking(orderId);
      setTracking(data);
    } catch (error) {
      setError('Impossible de charger le suivi de commande');
      console.error('Error fetching tracking:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleString('fr-FR', {
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
          <div className="max-w-3xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>
              <Card className="p-6">
                <div className="space-y-6">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className="flex gap-4">
                      <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-5 bg-gray-200 rounded w-1/3 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !tracking) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-24 pb-12 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {error || 'Commande non trouvée'}
            </h1>
            <Button onClick={() => navigate('/buyer/orders')} className="mt-4">
              Voir mes commandes
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pt-24 pb-12 px-6">
        <div className="max-w-3xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Truck className="w-8 h-8 text-[#2d5a4d]" />
              <h1 className="text-3xl font-bold text-gray-900">Suivi de commande</h1>
            </div>
            <p className="text-gray-600">
              Commande <span className="font-mono font-semibold">#{tracking.order_number}</span>
            </p>
          </div>

          {/* Timeline */}
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              État de la livraison
            </h2>

            <div className="relative">
              {/* Progress Line */}
              <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200">
                <div 
                  className="bg-[#2d5a4d] w-full transition-all duration-500"
                  style={{ 
                    height: `${(tracking.timeline.filter(t => t.completed).length - 1) / (tracking.timeline.length - 1) * 100}%` 
                  }}
                />
              </div>

              <div className="space-y-8">
                {tracking.timeline.map((step, index) => {
                  const Icon = statusIcons[step.status] || Package;
                  
                  return (
                    <div key={step.status} className="relative flex gap-4">
                      {/* Icon */}
                      <div 
                        className={`
                          relative z-10 w-10 h-10 rounded-full flex items-center justify-center
                          transition-all duration-300
                          ${step.completed 
                            ? step.current 
                              ? 'bg-[#2d5a4d] ring-4 ring-[#2d5a4d]/20' 
                              : 'bg-[#2d5a4d]'
                            : 'bg-gray-200'
                          }
                        `}
                      >
                        <Icon className={`w-5 h-5 ${step.completed ? 'text-white' : 'text-gray-400'}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 pb-2">
                        <div className="flex items-center gap-3">
                          <h3 className={`font-semibold ${step.completed ? 'text-gray-900' : 'text-gray-400'}`}>
                            {step.label}
                          </h3>
                          {step.current && (
                            <Badge className="bg-[#d4a574] text-[#2d5a4d] animate-pulse">
                              En cours
                            </Badge>
                          )}
                        </div>
                        <p className={`text-sm ${step.completed ? 'text-gray-600' : 'text-gray-400'}`}>
                          {step.description}
                        </p>
                        {step.timestamp && (
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDate(step.timestamp)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Delivery Info */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Informations de livraison
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Adresse de livraison</p>
                  <p className="font-medium text-gray-900">{tracking.delivery_address}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Téléphone</p>
                  <p className="font-medium text-gray-900">{tracking.delivery_phone}</p>
                </div>
              </div>

              {tracking.estimated_delivery && (
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Livraison estimée</p>
                    <p className="font-medium text-gray-900">{formatDate(tracking.estimated_delivery)}</p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Help */}
          <div className="mt-6 text-center">
            <p className="text-gray-600 mb-2">Un problème avec votre commande?</p>
            <Button variant="outline">
              Contacter le support
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderTracking;

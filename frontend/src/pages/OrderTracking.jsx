import { tokenService } from "../services/tokenService";
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { 
  Package, Truck, MapPin, CheckCircle, Clock, AlertCircle,
  Phone, Navigation, Calendar, ArrowLeft, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const OrderTracking = () => {
  const { orderId } = useParams();
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const getAuthHeaders = () => {
    const token = tokenService.getToken();
    return { Authorization: `Bearer ${token}` };
  };

  const fetchTracking = async () => {
    try {
      setRefreshing(true);
      const response = await axios.get(
        `${API_URL}/api/tracking/orders/${orderId}`,
        { headers: getAuthHeaders() }
      );
      setTracking(response.data);
    } catch (error) {
      console.error('Error fetching tracking:', error);
      toast.error('Impossible de charger le suivi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (orderId) {
      fetchTracking();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-500',
      confirmed: 'bg-blue-500',
      processing: 'bg-indigo-500',
      shipped: 'bg-purple-500',
      in_transit: 'bg-cyan-500',
      out_for_delivery: 'bg-orange-500',
      delivered: 'bg-green-500',
      cancelled: 'bg-red-500'
    };
    return colors[status] || 'bg-gray-500';
  };

  const getStatusIcon = (status, completed, current) => {
    if (completed && !current) {
      return <CheckCircle className="w-6 h-6 text-green-500" />;
    }
    if (current) {
      const icons = {
        pending: <Clock className="w-6 h-6 text-yellow-500" />,
        confirmed: <CheckCircle className="w-6 h-6 text-blue-500" />,
        processing: <Package className="w-6 h-6 text-indigo-500" />,
        shipped: <Truck className="w-6 h-6 text-purple-500" />,
        in_transit: <Navigation className="w-6 h-6 text-cyan-500" />,
        out_for_delivery: <Truck className="w-6 h-6 text-orange-500 animate-pulse" />,
        delivered: <CheckCircle className="w-6 h-6 text-green-500" />
      };
      return icons[status] || <Clock className="w-6 h-6 text-gray-500" />;
    }
    return <div className="w-6 h-6 rounded-full border-2 border-gray-300" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-[#2d5a4d] animate-spin mx-auto" />
          <p className="mt-4 text-gray-600">Chargement du suivi...</p>
        </div>
      </div>
    );
  }

  if (!tracking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Commande introuvable</h2>
          <p className="text-gray-600 mb-6">
            Cette commande n'existe pas ou vous n'avez pas accès à ses informations.
          </p>
          <Link to="/">
            <Button className="bg-[#2d5a4d] hover:bg-[#1a4038]">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour à l'accueil
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="text-[#2d5a4d] hover:underline flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTracking}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>

        {/* Order Info Card */}
        <Card className="p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Commande #{tracking.order_number}
              </h1>
              <p className="text-gray-500 mt-1">
                Créée le {new Date(tracking.created_at).toLocaleDateString('fr-FR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
            <div className={`px-4 py-2 rounded-full text-white font-medium ${getStatusColor(tracking.status)}`}>
              {tracking.timeline.find(t => t.current)?.label || tracking.status}
            </div>
          </div>

          {/* Shipment Info */}
          {tracking.shipment && tracking.shipment.carrier && (
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Truck className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-900">Informations d'expédition</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-700">Transporteur:</span>
                  <span className="ml-2 font-medium text-blue-900">{tracking.shipment.carrier}</span>
                </div>
                <div>
                  <span className="text-blue-700">N° suivi:</span>
                  <span className="ml-2 font-medium text-blue-900">{tracking.shipment.tracking_number}</span>
                </div>
                {tracking.shipment.estimated_delivery && (
                  <div className="col-span-2">
                    <span className="text-blue-700">Livraison estimée:</span>
                    <span className="ml-2 font-medium text-blue-900">{tracking.shipment.estimated_delivery}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Delivery Info */}
          {tracking.delivery && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-5 h-5 text-gray-600" />
                <span className="font-medium text-gray-900">Adresse de livraison</span>
              </div>
              <p className="text-gray-700">{tracking.delivery.address}</p>
              {tracking.delivery.city && (
                <p className="text-gray-600">{tracking.delivery.city}</p>
              )}
              {tracking.delivery.phone && (
                <div className="flex items-center gap-2 mt-2 text-gray-600">
                  <Phone className="w-4 h-4" />
                  {tracking.delivery.phone}
                </div>
              )}
              {tracking.delivery.instructions && (
                <p className="mt-2 text-sm text-gray-500 italic">
                  Instructions: {tracking.delivery.instructions}
                </p>
              )}
            </div>
          )}
        </Card>

        {/* Timeline */}
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Suivi de la commande</h2>
          
          <div className="relative">
            {tracking.timeline.map((step, index) => (
              <div key={step.status} className="flex items-start mb-8 last:mb-0">
                {/* Line connector */}
                {index < tracking.timeline.length - 1 && (
                  <div 
                    className={`absolute left-3 mt-8 w-0.5 h-16 ${
                      step.completed ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                    style={{ top: `${index * 80 + 24}px` }}
                  />
                )}
                
                {/* Icon */}
                <div className="relative z-10 flex-shrink-0">
                  {getStatusIcon(step.status, step.completed, step.current)}
                </div>
                
                {/* Content */}
                <div className="ml-4 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className={`font-medium ${
                      step.completed ? 'text-gray-900' : 'text-gray-400'
                    }`}>
                      {step.label}
                    </h3>
                    {step.timestamp && (
                      <span className="text-sm text-gray-500">
                        {new Date(step.timestamp).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    )}
                  </div>
                  {step.location && (
                    <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {step.location}
                    </p>
                  )}
                  {step.current && !step.timestamp && (
                    <p className="text-sm text-yellow-600 mt-1">En attente...</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Events */}
        {tracking.events && tracking.events.length > 0 && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Historique des mises à jour</h2>
            <div className="space-y-4">
              {tracking.events.slice(0, 10).map((event, index) => (
                <div key={`el-${index}`} className="flex items-start gap-3 pb-4 border-b border-gray-100 last:border-0">
                  <div className={`w-2 h-2 rounded-full mt-2 ${getStatusColor(event.status)}`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900 capitalize">
                        {event.status.replace(/_/g, ' ')}
                      </span>
                      <span className="text-sm text-gray-500">
                        {event.timestamp && new Date(event.timestamp).toLocaleString('fr-FR')}
                      </span>
                    </div>
                    {event.note && (
                      <p className="text-sm text-gray-600 mt-1">{event.note}</p>
                    )}
                    {event.location && (
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" />
                        {event.location}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Order Summary */}
        <Card className="p-6 mt-6">
          <div className="flex items-center justify-between text-gray-600">
            <span>{tracking.items_count} article(s)</span>
            <span className="text-xl font-bold text-[#2d5a4d]">
              {tracking.total_amount?.toLocaleString()} XOF
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default OrderTracking;

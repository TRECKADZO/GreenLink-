import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import Navbar from '../components/Navbar';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  Package, Truck, MapPin, CheckCircle, Clock, AlertCircle,
  Phone, Navigation, ArrowLeft, RefreshCcw, Send, Box
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const OrderTrackingPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [showShipForm, setShowShipForm] = useState(false);

  const [updateForm, setUpdateForm] = useState({
    status: '',
    location: '',
    note: ''
  });

  const [shipForm, setShipForm] = useState({
    carrier: '',
    tracking_number: '',
    shipping_method: 'standard',
    estimated_delivery: ''
  });

  useEffect(() => {
    if (orderId) {
      fetchTracking();
    }
  }, [orderId]);

  const fetchTracking = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/tracking/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTracking(response.data);
    } catch (error) {
      console.error('Error fetching tracking:', error);
      toast.error('Erreur lors du chargement du suivi');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTracking = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/tracking/orders/${orderId}/update`, updateForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Suivi mis à jour');
      setShowUpdateForm(false);
      setUpdateForm({ status: '', location: '', note: '' });
      fetchTracking();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la mise à jour');
    } finally {
      setUpdating(false);
    }
  };

  const handleAddShipment = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/tracking/orders/${orderId}/ship`, shipForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Informations d\'expédition ajoutées');
      setShowShipForm(false);
      setShipForm({ carrier: '', tracking_number: '', shipping_method: 'standard', estimated_delivery: '' });
      fetchTracking();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'ajout');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusIcon = (status, completed, current) => {
    if (completed && !current) return <CheckCircle className="w-6 h-6 text-green-500" />;
    if (current) return <Clock className="w-6 h-6 text-blue-500 animate-pulse" />;
    return <div className="w-6 h-6 rounded-full border-2 border-gray-300" />;
  };

  const formatDate = (date) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-24 flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2d5a4d]"></div>
        </div>
      </div>
    );
  }

  if (!tracking) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-24 px-6 max-w-4xl mx-auto text-center">
          <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Commande non trouvée</h1>
          <p className="text-gray-500 mb-6">Cette commande n'existe pas ou vous n'y avez pas accès.</p>
          <Button onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
        </div>
      </div>
    );
  }

  const isSupplier = user?.user_type === 'fournisseur';

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="pt-24 pb-12 px-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <Button variant="ghost" onClick={() => navigate(-1)} className="mb-2">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
              <h1 className="text-2xl font-bold text-gray-900">
                Suivi de commande #{tracking.order_number}
              </h1>
            </div>
            <Button variant="outline" onClick={fetchTracking}>
              <RefreshCcw className="w-4 h-4 mr-2" />
              Actualiser
            </Button>
          </div>

          {/* Status Card */}
          <Card className="bg-gradient-to-r from-[#2d5a4d] to-[#1a4038] text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-200 text-sm mb-1">Statut actuel</p>
                  <p className="text-2xl font-bold capitalize">
                    {tracking.timeline?.find(t => t.current)?.label || tracking.status}
                  </p>
                  {tracking.shipment?.estimated_delivery && (
                    <p className="text-green-200 text-sm mt-2">
                      Livraison estimée: {tracking.shipment.estimated_delivery}
                    </p>
                  )}
                </div>
                <Truck className="w-16 h-16 text-green-300 opacity-50" />
              </div>
            </CardContent>
          </Card>

          {/* Supplier Actions */}
          {isSupplier && (
            <div className="flex gap-2">
              {!tracking.shipment?.tracking_number && (
                <Button 
                  onClick={() => setShowShipForm(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Ajouter expédition
                </Button>
              )}
              <Button 
                onClick={() => setShowUpdateForm(true)}
                className="bg-[#2d5a4d] hover:bg-[#1a4038]"
              >
                <Navigation className="w-4 h-4 mr-2" />
                Mettre à jour le suivi
              </Button>
            </div>
          )}

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Progression de la commande
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {tracking.timeline?.map((step, index) => (
                  <div key={step.status} className="flex items-start mb-6 last:mb-0">
                    <div className="relative">
                      {getStatusIcon(step.status, step.completed, step.current)}
                      {index < tracking.timeline.length - 1 && (
                        <div 
                          className={`absolute left-3 top-8 w-0.5 h-12 ${
                            step.completed ? 'bg-green-500' : 'bg-gray-200'
                          }`}
                        />
                      )}
                    </div>
                    <div className="ml-4 flex-1">
                      <p className={`font-medium ${step.current ? 'text-blue-600' : step.completed ? 'text-gray-900' : 'text-gray-400'}`}>
                        {step.label}
                      </p>
                      {step.timestamp && (
                        <p className="text-sm text-gray-500">{formatDate(step.timestamp)}</p>
                      )}
                      {step.location && (
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {step.location}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Shipment Info */}
          {tracking.shipment && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  Informations d'expédition
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Transporteur</p>
                    <p className="font-medium">{tracking.shipment.carrier || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">N° de suivi</p>
                    <p className="font-medium font-mono">{tracking.shipment.tracking_number || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Méthode</p>
                    <Badge variant="secondary" className="capitalize">
                      {tracking.shipment.shipping_method}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Livraison estimée</p>
                    <p className="font-medium">{tracking.shipment.estimated_delivery || '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Delivery Address */}
          {tracking.delivery && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Adresse de livraison
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="font-medium">{tracking.delivery.address}</p>
                  <p className="text-gray-600">{tracking.delivery.city}</p>
                  {tracking.delivery.phone && (
                    <p className="flex items-center gap-2 text-gray-600">
                      <Phone className="w-4 h-4" />
                      {tracking.delivery.phone}
                    </p>
                  )}
                  {tracking.delivery.instructions && (
                    <p className="text-sm text-gray-500 italic">
                      "{tracking.delivery.instructions}"
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Events */}
          {tracking.events && tracking.events.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Historique des mises à jour</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tracking.events.map((event, index) => (
                    <div key={index} className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg">
                      <Box className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium capitalize">{event.status}</p>
                        {event.note && <p className="text-sm text-gray-600">{event.note}</p>}
                        {event.location && (
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {event.location}
                          </p>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">{formatDate(event.timestamp)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Update Form Modal */}
          {showUpdateForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <Card className="w-full max-w-md">
                <CardHeader>
                  <CardTitle>Mettre à jour le suivi</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUpdateTracking} className="space-y-4">
                    <div>
                      <Label>Nouveau statut</Label>
                      <select
                        className="w-full p-2 border rounded-md"
                        value={updateForm.status}
                        onChange={(e) => setUpdateForm({...updateForm, status: e.target.value})}
                        required
                      >
                        <option value="">Sélectionner...</option>
                        <option value="confirmed">Confirmée</option>
                        <option value="processing">En préparation</option>
                        <option value="shipped">Expédiée</option>
                        <option value="in_transit">En transit</option>
                        <option value="out_for_delivery">En livraison</option>
                        <option value="delivered">Livrée</option>
                      </select>
                    </div>
                    <div>
                      <Label>Localisation</Label>
                      <Input
                        value={updateForm.location}
                        onChange={(e) => setUpdateForm({...updateForm, location: e.target.value})}
                        placeholder="Ex: Abidjan, Cocody"
                      />
                    </div>
                    <div>
                      <Label>Note</Label>
                      <Input
                        value={updateForm.note}
                        onChange={(e) => setUpdateForm({...updateForm, note: e.target.value})}
                        placeholder="Information complémentaire..."
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button type="button" variant="outline" onClick={() => setShowUpdateForm(false)}>
                        Annuler
                      </Button>
                      <Button type="submit" disabled={updating} className="bg-[#2d5a4d]">
                        {updating ? 'Mise à jour...' : 'Mettre à jour'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Ship Form Modal */}
          {showShipForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <Card className="w-full max-w-md">
                <CardHeader>
                  <CardTitle>Ajouter les informations d'expédition</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddShipment} className="space-y-4">
                    <div>
                      <Label>Transporteur *</Label>
                      <Input
                        value={shipForm.carrier}
                        onChange={(e) => setShipForm({...shipForm, carrier: e.target.value})}
                        placeholder="Ex: DHL, Chronopost..."
                        required
                      />
                    </div>
                    <div>
                      <Label>Numéro de suivi *</Label>
                      <Input
                        value={shipForm.tracking_number}
                        onChange={(e) => setShipForm({...shipForm, tracking_number: e.target.value})}
                        placeholder="Ex: 1234567890"
                        required
                      />
                    </div>
                    <div>
                      <Label>Méthode d'expédition</Label>
                      <select
                        className="w-full p-2 border rounded-md"
                        value={shipForm.shipping_method}
                        onChange={(e) => setShipForm({...shipForm, shipping_method: e.target.value})}
                      >
                        <option value="standard">Standard</option>
                        <option value="express">Express</option>
                        <option value="same_day">Livraison jour même</option>
                      </select>
                    </div>
                    <div>
                      <Label>Date de livraison estimée</Label>
                      <Input
                        type="date"
                        value={shipForm.estimated_delivery}
                        onChange={(e) => setShipForm({...shipForm, estimated_delivery: e.target.value})}
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button type="button" variant="outline" onClick={() => setShowShipForm(false)}>
                        Annuler
                      </Button>
                      <Button type="submit" disabled={updating} className="bg-blue-600">
                        {updating ? 'Ajout...' : 'Ajouter'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderTrackingPage;

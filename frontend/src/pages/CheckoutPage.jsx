import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import Navbar from '../components/Navbar';
import { useToast } from '../hooks/use-toast';
import axios from 'axios';
import { 
  ShoppingCart, 
  MapPin, 
  Phone, 
  CreditCard,
  Truck,
  CheckCircle,
  Package,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Smartphone,
  XCircle
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CheckoutPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { cart, checkout, loading } = useCart();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    address: '',
    phone: user?.phone_number || '',
    payment_method: 'cash_on_delivery',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [simulationMode, setSimulationMode] = useState(true);

  // Check simulation mode on mount
  useEffect(() => {
    const checkSimulation = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/payments/simulation-status`);
        setSimulationMode(response.data.simulation_mode);
      } catch (error) {
        console.error('Error checking simulation status:', error);
      }
    };
    checkSimulation();
  }, []);

  // Handle payment return
  useEffect(() => {
    const ref = searchParams.get('ref');
    const status = searchParams.get('status');
    
    if (ref) {
      // Check payment status
      checkPaymentStatus(ref);
    }
  }, [searchParams]);

  const checkPaymentStatus = async (merchantRef) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/api/payments/status/${merchantRef}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setPaymentStatus(response.data);
      
      if (response.data.status === 'paid') {
        toast({
          title: 'Paiement réussi!',
          description: 'Votre paiement a été confirmé'
        });
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
    }
  };

  // Handle redirects in useEffect to avoid React warnings
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (cart.items.length === 0 && !orderSuccess && !paymentStatus && user) {
      navigate('/marketplace');
    }
  }, [cart.items.length, orderSuccess, paymentStatus, user, navigate]);

  // Early returns after hooks
  if (!user) {
    return null;
  }

  if (cart.items.length === 0 && !orderSuccess && !paymentStatus) {
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.address || !formData.phone) {
      toast({
        title: 'Informations manquantes',
        description: 'Veuillez remplir tous les champs obligatoires',
        variant: 'destructive'
      });
      return;
    }

    setSubmitting(true);
    try {
      // First create the orders
      const result = await checkout(formData);
      
      if (formData.payment_method === 'orange_money') {
        // Initiate Orange Money payment
        await initiateOrangeMoneyPayment(result);
      } else {
        // Cash on delivery - show success directly
        setOrderSuccess(result);
        toast({
          title: 'Commande confirmée!',
          description: `${result.total_orders} commande(s) créée(s) avec succès`
        });
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error.response?.data?.detail || 'Impossible de passer la commande',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const initiateOrangeMoneyPayment = async (checkoutResult) => {
    setPaymentProcessing(true);
    
    try {
      const token = localStorage.getItem('token');
      const orderIds = checkoutResult.orders.map(o => o._id);
      
      const response = await axios.post(
        `${API_URL}/api/payments/initiate`,
        {
          order_ids: orderIds,
          customer_phone: formData.phone,
          customer_email: user?.email
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const paymentData = response.data;
      
      if (paymentData.simulation_mode) {
        // In simulation mode, show simulation interface
        setPaymentStatus({
          status: 'pending_simulation',
          merchant_reference: paymentData.merchant_reference,
          amount: paymentData.amount,
          orders: checkoutResult.orders
        });
      } else {
        // In production, redirect to Orange Money payment page
        if (paymentData.payment_url) {
          window.location.href = paymentData.payment_url;
        }
      }
      
    } catch (error) {
      toast({
        title: 'Erreur de paiement',
        description: error.response?.data?.detail || 'Impossible d\'initier le paiement',
        variant: 'destructive'
      });
      setPaymentProcessing(false);
    }
  };

  const simulatePayment = async (action) => {
    if (!paymentStatus?.merchant_reference) return;
    
    setPaymentProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/api/payments/simulate/SIM_TOKEN?action=${action}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        setPaymentStatus({
          ...paymentStatus,
          status: 'paid',
          transaction_id: response.data.transaction_id
        });
        toast({
          title: 'Paiement simulé avec succès!',
          description: 'Le paiement a été confirmé'
        });
      } else {
        setPaymentStatus({
          ...paymentStatus,
          status: response.data.status
        });
        toast({
          title: 'Paiement échoué',
          description: response.data.message,
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error.response?.data?.detail || 'Erreur lors de la simulation',
        variant: 'destructive'
      });
    } finally {
      setPaymentProcessing(false);
    }
  };

  // Payment Simulation Interface
  if (paymentStatus?.status === 'pending_simulation') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-24 pb-12 px-6">
          <div className="max-w-lg mx-auto">
            <Card className="p-8">
              <div className="text-center mb-6">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-orange-100 flex items-center justify-center">
                  <Smartphone className="w-10 h-10 text-orange-500" />
                </div>
                <Badge className="bg-yellow-100 text-yellow-700 mb-2">Mode Simulation</Badge>
                <h1 className="text-2xl font-bold text-gray-900">
                  Paiement Orange Money
                </h1>
                <p className="text-gray-600 mt-2">
                  Simulez le paiement pour tester le flux complet
                </p>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-gray-600">Montant</span>
                  <span className="text-2xl font-bold text-orange-600">
                    {paymentStatus.amount?.toLocaleString()} XOF
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Téléphone</span>
                  <span className="font-medium">{formData.phone}</span>
                </div>
                <div className="flex justify-between items-center text-sm mt-2">
                  <span className="text-gray-500">Référence</span>
                  <span className="font-mono text-xs">{paymentStatus.merchant_reference}</span>
                </div>
              </div>

              <p className="text-sm text-gray-500 text-center mb-6">
                En production, vous seriez redirigé vers Orange Money pour entrer votre code PIN.
                Pour l'instant, choisissez le résultat du paiement :
              </p>

              <div className="space-y-3">
                <Button
                  onClick={() => simulatePayment('success')}
                  disabled={paymentProcessing}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-6"
                  data-testid="simulate-success-btn"
                >
                  {paymentProcessing ? (
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="w-5 h-5 mr-2" />
                  )}
                  Simuler Paiement Réussi
                </Button>
                
                <Button
                  onClick={() => simulatePayment('fail')}
                  disabled={paymentProcessing}
                  variant="outline"
                  className="w-full border-red-300 text-red-600 hover:bg-red-50 py-6"
                  data-testid="simulate-fail-btn"
                >
                  <XCircle className="w-5 h-5 mr-2" />
                  Simuler Échec
                </Button>
                
                <Button
                  onClick={() => {
                    setPaymentStatus(null);
                    setPaymentProcessing(false);
                  }}
                  variant="ghost"
                  className="w-full"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Retour
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Payment Success State (after simulation or real payment)
  if (paymentStatus?.status === 'paid') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-24 pb-12 px-6">
          <div className="max-w-2xl mx-auto">
            <Card className="p-8 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Paiement Confirmé!
              </h1>
              <p className="text-gray-600 mb-6">
                Votre paiement Orange Money a été traité avec succès.
              </p>
              
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-gray-500">Transaction</span>
                  <span className="font-mono text-sm">{paymentStatus.transaction_id}</span>
                </div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-gray-500">Montant</span>
                  <span className="font-bold text-[#2d5a4d]">
                    {paymentStatus.amount?.toLocaleString()} XOF
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Statut</span>
                  <Badge className="bg-green-100 text-green-700">Payé</Badge>
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => navigate('/marketplace')}
                  className="flex-1"
                >
                  Continuer mes achats
                </Button>
                <Button
                  onClick={() => navigate('/buyer/orders')}
                  className="flex-1 bg-[#2d5a4d] hover:bg-[#1a4038]"
                >
                  Voir mes commandes
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Success State (Cash on Delivery)
  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-24 pb-12 px-6">
          <div className="max-w-2xl mx-auto">
            <Card className="p-8 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Commande Confirmée!
              </h1>
              <p className="text-gray-600 mb-6">
                Merci pour votre commande. Vous recevrez une confirmation par SMS.
              </p>
              
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <h3 className="font-semibold text-gray-900 mb-4">Récapitulatif</h3>
                {orderSuccess.orders.map((order, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="text-left">
                      <p className="font-medium text-gray-900">#{order.order_number}</p>
                      <p className="text-sm text-gray-500">{order.supplier_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[#2d5a4d]">
                        {order.total_amount.toLocaleString()} XOF
                      </p>
                      <Badge className="bg-yellow-100 text-yellow-700">
                        Paiement à la livraison
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => navigate('/marketplace')}
                  className="flex-1"
                >
                  Continuer mes achats
                </Button>
                <Button
                  onClick={() => navigate('/buyer/orders')}
                  className="flex-1 bg-[#2d5a4d] hover:bg-[#1a4038]"
                >
                  Voir mes commandes
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pt-24 pb-12 px-6">
        <div className="max-w-6xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-6"
            data-testid="back-btn"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>

          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Finaliser la commande
          </h1>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Checkout Form */}
            <div className="lg:col-span-2">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Delivery Address */}
                <Card className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-[#2d5a4d]" />
                    Adresse de livraison
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="address">Adresse complète *</Label>
                      <Input
                        id="address"
                        data-testid="address-input"
                        placeholder="Ex: Cocody Angré 7ème tranche, près de la pharmacie..."
                        value={formData.address}
                        onChange={(e) => setFormData({...formData, address: e.target.value})}
                        className="mt-1"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Téléphone *</Label>
                      <Input
                        id="phone"
                        data-testid="phone-input"
                        placeholder="+225 07 00 00 00 00"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className="mt-1"
                        required
                      />
                    </div>
                  </div>
                </Card>

                {/* Payment Method */}
                <Card className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-[#2d5a4d]" />
                    Mode de paiement
                  </h2>
                  <div className="space-y-3">
                    {/* Cash on Delivery */}
                    <label 
                      className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        formData.payment_method === 'cash_on_delivery'
                          ? 'border-[#2d5a4d] bg-[#2d5a4d]/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      data-testid="payment-cash"
                    >
                      <input
                        type="radio"
                        name="payment"
                        value="cash_on_delivery"
                        checked={formData.payment_method === 'cash_on_delivery'}
                        onChange={(e) => setFormData({...formData, payment_method: e.target.value})}
                        className="w-5 h-5 text-[#2d5a4d]"
                      />
                      <Truck className="w-6 h-6 text-gray-600" />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">Paiement à la livraison</p>
                        <p className="text-sm text-gray-500">Payez en espèces à la réception</p>
                      </div>
                    </label>

                    {/* Orange Money */}
                    <label 
                      className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        formData.payment_method === 'orange_money'
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      data-testid="payment-orange-money"
                    >
                      <input
                        type="radio"
                        name="payment"
                        value="orange_money"
                        checked={formData.payment_method === 'orange_money'}
                        onChange={(e) => setFormData({...formData, payment_method: e.target.value})}
                        className="w-5 h-5 text-orange-500"
                      />
                      <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">OM</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">Orange Money</p>
                        <p className="text-sm text-gray-500">Paiement mobile sécurisé</p>
                      </div>
                      {simulationMode && (
                        <Badge className="bg-yellow-100 text-yellow-700 text-xs">
                          Mode Test
                        </Badge>
                      )}
                    </label>
                  </div>

                  {formData.payment_method === 'orange_money' && simulationMode && (
                    <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-yellow-700">
                          <strong>Mode simulation activé</strong>
                          <p className="mt-1">
                            Les paiements sont simulés pour les tests. En production, vous serez redirigé vers Orange Money.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>

                {/* Notes */}
                <Card className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Instructions (optionnel)
                  </h2>
                  <textarea
                    data-testid="notes-input"
                    placeholder="Instructions spéciales pour la livraison..."
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#2d5a4d] focus:border-transparent resize-none"
                    rows={3}
                  />
                </Card>

                <Button
                  type="submit"
                  data-testid="confirm-order-btn"
                  disabled={submitting || paymentProcessing}
                  className={`w-full font-semibold py-6 text-lg ${
                    formData.payment_method === 'orange_money' 
                      ? 'bg-orange-500 hover:bg-orange-600 text-white' 
                      : 'bg-[#d4a574] hover:bg-[#c49564] text-[#2d5a4d]'
                  }`}
                >
                  {submitting || paymentProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Traitement...
                    </>
                  ) : formData.payment_method === 'orange_money' ? (
                    <>
                      <Smartphone className="w-5 h-5 mr-2" />
                      Payer avec Orange Money
                    </>
                  ) : (
                    'Confirmer la commande'
                  )}
                </Button>
              </form>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="p-6 sticky top-24">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-[#2d5a4d]" />
                  Récapitulatif
                </h2>

                <div className="space-y-4 mb-6">
                  {cart.items.map((item) => (
                    <div key={item.product_id} className="flex gap-3">
                      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        {item.product.images?.length > 0 ? (
                          <img 
                            src={`${process.env.REACT_APP_BACKEND_URL}${item.product.images[0]}`}
                            alt={item.product.name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <Package className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">
                          {item.product.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {item.quantity} x {item.product.price.toLocaleString()} XOF
                        </p>
                      </div>
                      <p className="font-semibold text-gray-900 text-sm">
                        {item.item_total.toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-gray-600">
                    <span>Sous-total</span>
                    <span>{cart.total.toLocaleString()} XOF</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Livraison</span>
                    <span className="text-green-600">Gratuite</span>
                  </div>
                  <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t">
                    <span>Total</span>
                    <span className="text-[#2d5a4d]">{cart.total.toLocaleString()} XOF</span>
                  </div>
                </div>

                {/* Payment Method Indicator */}
                <div className="mt-4 p-3 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-2 text-sm">
                    {formData.payment_method === 'orange_money' ? (
                      <>
                        <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">OM</span>
                        </div>
                        <span className="text-gray-700">Orange Money</span>
                      </>
                    ) : (
                      <>
                        <Truck className="w-5 h-5 text-gray-600" />
                        <span className="text-gray-700">Paiement à la livraison</span>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;

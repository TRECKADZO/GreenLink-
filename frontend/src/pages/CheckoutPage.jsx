import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import Navbar from '../components/Navbar';
import { useToast } from '../hooks/use-toast';
import { 
  ShoppingCart, 
  MapPin, 
  Phone, 
  CreditCard,
  Truck,
  CheckCircle,
  Package,
  ArrowLeft
} from 'lucide-react';

const CheckoutPage = () => {
  const navigate = useNavigate();
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

  if (!user) {
    navigate('/login');
    return null;
  }

  if (cart.items.length === 0 && !orderSuccess) {
    navigate('/#marketplace');
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
      const result = await checkout(formData);
      setOrderSuccess(result);
      toast({
        title: 'Commande confirmée!',
        description: `${result.total_orders} commande(s) créée(s) avec succès`
      });
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

  // Success State
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
                    <p className="font-bold text-[#2d5a4d]">
                      {order.total_amount.toLocaleString()} FCFA
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => navigate('/#marketplace')}
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
                    <label 
                      className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        formData.payment_method === 'cash_on_delivery'
                          ? 'border-[#2d5a4d] bg-[#2d5a4d]/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
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
                      <div>
                        <p className="font-semibold text-gray-900">Paiement à la livraison</p>
                        <p className="text-sm text-gray-500">Payez en espèces à la réception</p>
                      </div>
                    </label>

                    <label 
                      className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        formData.payment_method === 'orange_money'
                          ? 'border-[#2d5a4d] bg-[#2d5a4d]/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value="orange_money"
                        checked={formData.payment_method === 'orange_money'}
                        onChange={(e) => setFormData({...formData, payment_method: e.target.value})}
                        className="w-5 h-5 text-[#2d5a4d]"
                      />
                      <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">OM</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Orange Money</p>
                        <p className="text-sm text-gray-500">Paiement mobile sécurisé</p>
                      </div>
                      <Badge className="ml-auto bg-orange-100 text-orange-700">Bientôt</Badge>
                    </label>
                  </div>
                </Card>

                {/* Notes */}
                <Card className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Instructions (optionnel)
                  </h2>
                  <textarea
                    placeholder="Instructions spéciales pour la livraison..."
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#2d5a4d] focus:border-transparent resize-none"
                    rows={3}
                  />
                </Card>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[#d4a574] hover:bg-[#c49564] text-[#2d5a4d] font-semibold py-6 text-lg"
                >
                  {submitting ? 'Traitement...' : 'Confirmer la commande'}
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
                          {item.quantity} x {item.product.price.toLocaleString()} FCFA
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
                    <span>{cart.total.toLocaleString()} FCFA</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Livraison</span>
                    <span className="text-green-600">Gratuite</span>
                  </div>
                  <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t">
                    <span>Total</span>
                    <span className="text-[#2d5a4d]">{cart.total.toLocaleString()} FCFA</span>
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

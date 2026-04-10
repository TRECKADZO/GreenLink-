import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import Navbar from '../components/Navbar';
import { marketplaceApi } from '../services/marketplaceApi';
import { useToast } from '../hooks/use-toast';
import { 
  Heart, 
  ShoppingCart, 
  Trash2, 
  Package,
  ArrowLeft,
  Star
} from 'lucide-react';

const WishlistPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { addToCart } = useCart();
  const { toast } = useToast();
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login');
      return;
    }
    fetchWishlist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const fetchWishlist = async () => {
    try {
      const data = await marketplaceApi.getWishlist();
      setWishlist(data);
    } catch (error) {
      /* error logged */
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (productId) => {
    try {
      await marketplaceApi.removeFromWishlist(productId);
      setWishlist(wishlist.filter(item => item.product_id !== productId));
      toast({ title: 'Retiré des favoris' });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de retirer le produit',
        variant: 'destructive'
      });
    }
  };

  const handleAddToCart = async (product) => {
    await addToCart(product._id, 1);
  };

  const renderStars = (rating) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-24 pb-12 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="animate-pulse space-y-4">
              {[1,2,3].map(i => (
                <Card key={`el-${i}`} className="p-6">
                  <div className="h-20 bg-gray-200 rounded"></div>
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
        <div className="max-w-6xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>

          <div className="flex items-center gap-3 mb-8">
            <Heart className="w-8 h-8 text-pink-500 fill-pink-500" />
            <h1 className="text-3xl font-bold text-gray-900">Mes Favoris</h1>
            <Badge className="bg-pink-100 text-pink-700">{wishlist.length}</Badge>
          </div>

          {wishlist.length === 0 ? (
            <Card className="p-12 text-center">
              <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Aucun favori
              </h2>
              <p className="text-gray-600 mb-6">
                Ajoutez des produits à vos favoris pour les retrouver facilement
              </p>
              <Button
                onClick={() => navigate('/marketplace')}
                className="bg-[#2d5a4d] hover:bg-[#1a4038]"
              >
                Découvrir les produits
              </Button>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {wishlist.map((item) => (
                <Card key={item._id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  {/* Product Image */}
                  <div className="relative h-48 bg-gradient-to-br from-[#2d5a4d]/10 to-[#d4a574]/10 flex items-center justify-center">
                    {item.product.images?.length > 0 ? (
                      <img 
                        src={item.product.images[0]?.startsWith('http') ? item.product.images[0] : `${process.env.REACT_APP_BACKEND_URL}${item.product.images[0]}`}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="w-16 h-16 text-[#2d5a4d]/30" />
                    )}
                    <button
                      onClick={() => handleRemove(item.product_id)}
                      className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-md hover:bg-red-50"
                    >
                      <Trash2 className="w-5 h-5 text-red-500" />
                    </button>
                    <Badge className="absolute top-3 left-3 bg-white text-[#2d5a4d]">
                      {item.product.category}
                    </Badge>
                  </div>

                  {/* Product Info */}
                  <div className="p-4">
                    <h3 className="font-bold text-gray-900 mb-1">{item.product.name}</h3>
                    
                    {renderStars(item.product.rating || 0)}

                    <p className="text-sm text-gray-500 my-2">{item.product.supplier_name}</p>

                    <p className="text-xl font-bold text-[#2d5a4d] mb-3">
                      {item.product.price.toLocaleString()} XOF
                      <span className="text-sm font-normal text-gray-500">/{item.product.unit}</span>
                    </p>

                    <Button 
                      className="w-full bg-[#d4a574] hover:bg-[#c49564] text-[#2d5a4d]"
                      onClick={() => handleAddToCart(item.product)}
                      disabled={item.product.stock_quantity === 0}
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      {item.product.stock_quantity > 0 ? 'Ajouter au panier' : 'Rupture de stock'}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WishlistPage;

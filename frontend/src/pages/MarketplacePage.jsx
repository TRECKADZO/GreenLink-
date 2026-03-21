import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../hooks/use-toast';
import { marketplaceApi } from '../services/marketplaceApi';
import { 
  Package, 
  Search, 
  ShoppingCart, 
  Star,
  Filter,
  Leaf,
  Truck,
  Shield,
  Heart,
  Eye,
  X,
  ArrowLeft
} from 'lucide-react';

const categories = [
  { value: '', label: 'Tous', icon: Package },
  { value: 'engrais', label: 'Engrais', icon: Leaf },
  { value: 'pesticides', label: 'Pesticides', icon: Shield },
  { value: 'semences', label: 'Semences', icon: Leaf },
  { value: 'outils', label: 'Outils', icon: Package },
  { value: 'equipements', label: 'Équipements', icon: Truck },
];

const MarketplacePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { toast } = useToast();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [wishlist, setWishlist] = useState([]);

  useEffect(() => {
    fetchProducts();
    if (user) {
      fetchWishlist();
    }
  }, [selectedCategory, sortBy, user]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const filters = {};
      if (selectedCategory) filters.category = selectedCategory;
      const data = await marketplaceApi.getProducts(filters);
      
      // Sort products
      let sortedData = [...data];
      switch (sortBy) {
        case 'price_low':
          sortedData.sort((a, b) => a.price - b.price);
          break;
        case 'price_high':
          sortedData.sort((a, b) => b.price - a.price);
          break;
        case 'rating':
          sortedData.sort((a, b) => (b.rating || 0) - (a.rating || 0));
          break;
        case 'newest':
        default:
          sortedData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      }
      
      setProducts(sortedData);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWishlist = async () => {
    try {
      const data = await marketplaceApi.getWishlist();
      setWishlist(data.map(item => item.product_id));
    } catch (error) {
      console.error('Error fetching wishlist:', error);
    }
  };

  const handleAddToCart = async (product) => {
    if (!user) {
      toast({
        title: 'Connexion requise',
        description: 'Veuillez vous connecter pour commander',
        variant: 'destructive'
      });
      navigate('/login');
      return;
    }
    await addToCart(product._id, 1);
  };

  const toggleWishlist = async (productId) => {
    if (!user) {
      toast({
        title: 'Connexion requise',
        description: 'Connectez-vous pour ajouter aux favoris',
        variant: 'destructive'
      });
      navigate('/login');
      return;
    }

    try {
      if (wishlist.includes(productId)) {
        await marketplaceApi.removeFromWishlist(productId);
        setWishlist(wishlist.filter(id => id !== productId));
        toast({ title: 'Retiré des favoris' });
      } else {
        await marketplaceApi.addToWishlist(productId);
        setWishlist([...wishlist, productId]);
        toast({ title: 'Ajouté aux favoris' });
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de modifier les favoris',
        variant: 'destructive'
      });
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCategoryIcon = (category) => {
    const cat = categories.find(c => c.value === category);
    return cat?.icon || Package;
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="pt-24 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Bouton Retour */}
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="mb-4 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Marketplace Intrants Agricoles
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Découvrez notre sélection d'engrais, pesticides, semences et équipements 
              auprès de fournisseurs certifiés en Côte d'Ivoire
            </p>
          </div>

          {/* Filters Bar */}
          <div className="bg-white rounded-xl shadow-sm p-4 mb-8">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Rechercher un produit..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 py-3 border-gray-200"
                />
              </div>

              {/* Category Filter */}
              <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0">
                {categories.map((cat) => (
                  <Button
                    key={cat.value}
                    variant={selectedCategory === cat.value ? 'default' : 'outline'}
                    onClick={() => setSelectedCategory(cat.value)}
                    className={`whitespace-nowrap ${
                      selectedCategory === cat.value 
                        ? 'bg-[#2d5a4d] text-white' 
                        : 'border-gray-200 text-gray-700'
                    }`}
                  >
                    <cat.icon className="w-4 h-4 mr-2" />
                    {cat.label}
                  </Button>
                ))}
              </div>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-gray-700"
              >
                <option value="newest">Plus récents</option>
                <option value="price_low">Prix croissant</option>
                <option value="price_high">Prix décroissant</option>
                <option value="rating">Meilleures notes</option>
              </select>
            </div>
          </div>

          {/* Results Count */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-gray-600">
              <strong>{filteredProducts.length}</strong> produits trouvés
            </p>
            {user && wishlist.length > 0 && (
              <Button
                variant="outline"
                onClick={() => navigate('/wishlist')}
                className="border-pink-300 text-pink-600"
              >
                <Heart className="w-4 h-4 mr-2 fill-pink-500" />
                Mes favoris ({wishlist.length})
              </Button>
            )}
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1,2,3,4,5,6,7,8].map(i => (
                <Card key={i} className="p-4 animate-pulse">
                  <div className="h-48 bg-gray-200 rounded-lg mb-4"></div>
                  <div className="h-5 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </Card>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-16">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun produit trouvé</h3>
              <p className="text-gray-600">Essayez avec d'autres critères de recherche</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product) => {
                const CategoryIcon = getCategoryIcon(product.category);
                const isInWishlist = wishlist.includes(product._id);
                
                return (
                  <Card 
                    key={product._id} 
                    className="group overflow-hidden hover:shadow-xl transition-all duration-300"
                  >
                    {/* Product Image */}
                    <div className="relative h-48 bg-gradient-to-br from-[#2d5a4d]/10 to-[#d4a574]/10 flex items-center justify-center">
                      {product.images?.length > 0 ? (
                        <img 
                          src={product.images[0]?.startsWith('http') ? product.images[0] : `${process.env.REACT_APP_BACKEND_URL}${product.images[0]}`}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <CategoryIcon className="w-16 h-16 text-[#2d5a4d]/30" />
                      )}
                      
                      {/* Wishlist Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWishlist(product._id);
                        }}
                        className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-md hover:scale-110 transition-transform"
                      >
                        <Heart className={`w-5 h-5 ${isInWishlist ? 'fill-pink-500 text-pink-500' : 'text-gray-400'}`} />
                      </button>

                      {/* Category Badge */}
                      <Badge className="absolute top-3 left-3 bg-white text-[#2d5a4d]">
                        {categories.find(c => c.value === product.category)?.label || product.category}
                      </Badge>

                      {/* Quick View */}
                      <button
                        onClick={() => setSelectedProduct(product)}
                        className="absolute bottom-3 right-3 p-2 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Eye className="w-5 h-5 text-gray-600" />
                      </button>
                    </div>

                    {/* Product Info */}
                    <div className="p-4">
                      <h3 className="font-bold text-gray-900 mb-1 truncate">
                        {product.name}
                      </h3>
                      
                      {/* Rating */}
                      <div className="flex items-center gap-2 mb-2">
                        {renderStars(product.rating || 0)}
                        <span className="text-sm text-gray-500">
                          ({product.reviews_count || 0} avis)
                        </span>
                      </div>

                      <p className="text-sm text-gray-500 mb-3">
                        {product.supplier_name}
                      </p>

                      {/* Price */}
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xl font-bold text-[#2d5a4d]">
                          {product.price.toLocaleString()}
                          <span className="text-sm font-normal text-gray-500 ml-1">
                            XOF/{product.unit}
                          </span>
                        </p>
                      </div>

                      {/* Stock */}
                      <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                        <span>Stock: {product.stock_quantity}</span>
                        {product.stock_quantity < 20 && (
                          <Badge className="bg-orange-100 text-orange-700">Stock limité</Badge>
                        )}
                      </div>

                      {/* Actions */}
                      <Button 
                        className="w-full bg-[#d4a574] hover:bg-[#c49564] text-[#2d5a4d]"
                        onClick={() => handleAddToCart(product)}
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Ajouter au panier
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal 
          product={selectedProduct} 
          onClose={() => setSelectedProduct(null)}
          onAddToCart={handleAddToCart}
          isInWishlist={wishlist.includes(selectedProduct._id)}
          onToggleWishlist={toggleWishlist}
        />
      )}
    </div>
  );
};

// Product Detail Modal Component
const ProductDetailModal = ({ product, onClose, onAddToCart, isInWishlist, onToggleWishlist }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    fetchReviews();
  }, [product._id]);

  const fetchReviews = async () => {
    try {
      const data = await marketplaceApi.getProductReviews(product._id);
      setReviews(data);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!user) {
      toast({
        title: 'Connexion requise',
        description: 'Connectez-vous pour laisser un avis',
        variant: 'destructive'
      });
      return;
    }

    if (!newReview.comment.trim()) {
      toast({
        title: 'Erreur',
        description: 'Veuillez écrire un commentaire',
        variant: 'destructive'
      });
      return;
    }

    setSubmitting(true);
    try {
      await marketplaceApi.addProductReview(product._id, newReview);
      toast({ title: 'Avis ajouté', description: 'Merci pour votre avis!' });
      setNewReview({ rating: 5, comment: '' });
      fetchReviews();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error.response?.data?.detail || 'Impossible d\'ajouter l\'avis',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating, interactive = false, onChange = null) => {
    return (
      <div className="flex items-center gap-1 relative z-10">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-5 h-5 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            } ${interactive ? 'cursor-pointer hover:scale-110 transition-transform relative z-20' : ''}`}
            onClick={(e) => {
              if (interactive && onChange) {
                e.stopPropagation();
                onChange(star);
              }
            }}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold text-gray-900">{product.name}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid md:grid-cols-2 gap-6 p-6">
            {/* Image */}
            <div className="relative">
              <div className="h-80 bg-gradient-to-br from-[#2d5a4d]/10 to-[#d4a574]/10 rounded-xl flex items-center justify-center">
                {product.images?.length > 0 ? (
                  <img 
                    src={product.images[0]?.startsWith('http') ? product.images[0] : `${process.env.REACT_APP_BACKEND_URL}${product.images[0]}`}
                    alt={product.name}
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  <Package className="w-24 h-24 text-[#2d5a4d]/30" />
                )}
              </div>
              <button
                onClick={() => onToggleWishlist(product._id)}
                className="absolute top-4 right-4 p-3 bg-white rounded-full shadow-lg"
              >
                <Heart className={`w-6 h-6 ${isInWishlist ? 'fill-pink-500 text-pink-500' : 'text-gray-400'}`} />
              </button>
            </div>

            {/* Info */}
            <div>
              <Badge className="bg-[#2d5a4d]/10 text-[#2d5a4d] mb-3">
                {product.category}
              </Badge>
              
              <div className="flex items-center gap-3 mb-4">
                {renderStars(product.rating || 0)}
                <span className="text-gray-500">({product.reviews_count || 0} avis)</span>
              </div>

              <p className="text-3xl font-bold text-[#2d5a4d] mb-2">
                {product.price.toLocaleString()} XOF
                <span className="text-lg font-normal text-gray-500">/{product.unit}</span>
              </p>

              <p className="text-gray-600 mb-4">{product.description}</p>

              <div className="space-y-2 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Fournisseur:</span>
                  <span className="font-medium">{product.supplier_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Stock disponible:</span>
                  <span className="font-medium">{product.stock_quantity} {product.unit}</span>
                </div>
              </div>

              <Button 
                className="w-full bg-[#d4a574] hover:bg-[#c49564] text-[#2d5a4d] py-6 text-lg"
                onClick={() => onAddToCart(product)}
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                Ajouter au panier
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-t">
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab('details')}
                className={`flex-1 py-4 text-center font-medium ${
                  activeTab === 'details' ? 'text-[#2d5a4d] border-b-2 border-[#2d5a4d]' : 'text-gray-500'
                }`}
              >
                Détails
              </button>
              <button
                onClick={() => setActiveTab('reviews')}
                className={`flex-1 py-4 text-center font-medium ${
                  activeTab === 'reviews' ? 'text-[#2d5a4d] border-b-2 border-[#2d5a4d]' : 'text-gray-500'
                }`}
              >
                Avis ({reviews.length})
              </button>
            </div>

            <div className="p-6">
              {activeTab === 'details' ? (
                <div className="prose prose-sm max-w-none">
                  <h4>Description</h4>
                  <p>{product.description}</p>
                  {product.specifications && Object.keys(product.specifications).length > 0 && (
                    <>
                      <h4>Spécifications</h4>
                      <ul>
                        {Object.entries(product.specifications).map(([key, value]) => (
                          <li key={key}><strong>{key}:</strong> {value}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              ) : (
                <div>
                  {/* Add Review Form */}
                  {user && (
                    <form onSubmit={handleSubmitReview} className="mb-6 p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-semibold mb-3">Laisser un avis</h4>
                      <div className="mb-3">
                        <label className="block text-sm text-gray-600 mb-1">Note</label>
                        {renderStars(newReview.rating, true, (rating) => 
                          setNewReview({ ...newReview, rating })
                        )}
                      </div>
                      <textarea
                        placeholder="Votre commentaire..."
                        value={newReview.comment}
                        onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                        className="w-full p-3 border rounded-lg mb-3"
                        rows={3}
                      />
                      <Button type="submit" disabled={submitting}>
                        {submitting ? 'Envoi...' : 'Publier l\'avis'}
                      </Button>
                    </form>
                  )}

                  {/* Reviews List */}
                  {reviews.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">
                      Aucun avis pour ce produit. Soyez le premier!
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {reviews.map((review) => (
                        <div key={review._id} className="border-b pb-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-[#2d5a4d] rounded-full flex items-center justify-center text-white font-bold">
                                {review.user_name?.charAt(0) || 'U'}
                              </div>
                              <span className="font-medium">{review.user_name}</span>
                            </div>
                            {renderStars(review.rating)}
                          </div>
                          <p className="text-gray-600">{review.comment}</p>
                          <p className="text-xs text-gray-400 mt-2">
                            {new Date(review.created_at).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketplacePage;

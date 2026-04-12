import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
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
  ArrowRight,
  Leaf,
  Truck,
  Shield
} from 'lucide-react';

const categories = [
  { value: '', label: 'Tous', icon: Package },
  { value: 'engrais', label: 'Engrais', icon: Leaf },
  { value: 'pesticides', label: 'Pesticides', icon: Shield },
  { value: 'semences', label: 'Semences', icon: Leaf },
  { value: 'outils', label: 'Outils', icon: Package },
  { value: 'equipements', label: 'Équipements', icon: Truck },
];

const MarketplaceSection = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { toast } = useToast();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showAll, setShowAll] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory]);

  const fetchProducts = async () => {
    try {
      const filters = {};
      if (selectedCategory) filters.category = selectedCategory;
      const data = await marketplaceApi.getProducts(filters);
      setProducts(data);
    } catch (error) {
      console.warn('[Marketplace] Load error:', error.message);
    } finally {
      setLoading(false);
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

  const handleViewProduct = (product) => {
    if (!user) {
      toast({
        title: 'Connexion requise',
        description: 'Connectez-vous pour voir les détails et commander',
      });
      navigate('/login');
      return;
    }
    // Navigate to product detail or show modal
    toast({
      title: product.name,
      description: `Prix: ${product.price.toLocaleString()} XOF/${product.unit}`
    });
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const displayedProducts = showAll ? filteredProducts : filteredProducts.slice(0, 6);

  const getCategoryIcon = (category) => {
    const cat = categories.find(c => c.value === category);
    return cat?.icon || Package;
  };

  return (
    <section className="py-20 bg-gradient-to-b from-white to-gray-50" id="marketplace">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge className="bg-[#2d5a4d]/10 text-[#2d5a4d] mb-4">
            <ShoppingCart className="w-4 h-4 mr-2" />
            Marketplace B2B
          </Badge>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Intrants Agricoles de Qualité
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Découvrez notre sélection d'engrais, pesticides, semences et équipements 
            auprès de fournisseurs certifiés en Côte d'Ivoire
          </p>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Rechercher un produit..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 py-6 text-lg border-gray-200 focus:border-[#2d5a4d] focus:ring-[#2d5a4d]"
            />
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map((cat) => (
              <Button
                key={cat.value}
                variant={selectedCategory === cat.value ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(cat.value)}
                className={`whitespace-nowrap ${
                  selectedCategory === cat.value 
                    ? 'bg-[#2d5a4d] text-white' 
                    : 'border-gray-200 text-gray-700 hover:border-[#2d5a4d] hover:text-[#2d5a4d]'
                }`}
              >
                <cat.icon className="w-4 h-4 mr-2" />
                {cat.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3,4,5,6].map(i => (
              <Card key={`el-${i}`} className="p-6 animate-pulse">
                <div className="h-40 bg-gray-200 rounded-lg mb-4"></div>
                <div className="h-6 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </Card>
            ))}
          </div>
        ) : displayedProducts.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun produit trouvé</h3>
            <p className="text-gray-600">Essayez avec d'autres critères de recherche</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedProducts.map((product) => {
              const CategoryIcon = getCategoryIcon(product.category);
              return (
                <Card 
                  key={product._id} 
                  className="group overflow-hidden hover:shadow-xl transition-all duration-300 border-gray-100"
                >
                  {/* Product Image / Placeholder */}
                  <div className="relative h-48 bg-gradient-to-br from-[#2d5a4d]/10 to-[#d4a574]/10 flex items-center justify-center">
                    <CategoryIcon className="w-20 h-20 text-[#2d5a4d]/30 group-hover:scale-110 transition-transform duration-300" />
                    <Badge className="absolute top-3 left-3 bg-white text-[#2d5a4d]">
                      {categories.find(c => c.value === product.category)?.label || product.category}
                    </Badge>
                    {product.stock_quantity < 20 && (
                      <Badge className="absolute top-3 right-3 bg-orange-100 text-orange-700">
                        Stock limité
                      </Badge>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="p-5">
                    <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-[#2d5a4d] transition-colors">
                      {product.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {product.description}
                    </p>

                    {/* Supplier */}
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-6 h-6 rounded-full bg-[#d4a574]/20 flex items-center justify-center">
                        <Package className="w-3 h-3 text-[#d4a574]" />
                      </div>
                      <span className="text-xs text-gray-500">{product.supplier_name}</span>
                    </div>

                    {/* Price and Stock */}
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-2xl font-bold text-[#2d5a4d]">
                          {product.price.toLocaleString()}
                          <span className="text-sm font-normal text-gray-500 ml-1">
                            XOF/{product.unit}
                          </span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">En stock</p>
                        <p className="font-semibold text-gray-900">{product.stock_quantity}</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button 
                        variant="outline"
                        className="flex-1 border-[#2d5a4d] text-[#2d5a4d] hover:bg-[#2d5a4d] hover:text-white"
                        onClick={() => handleViewProduct(product)}
                      >
                        Détails
                      </Button>
                      <Button 
                        className="flex-1 bg-[#d4a574] hover:bg-[#c49564] text-[#2d5a4d]"
                        onClick={() => handleAddToCart(product)}
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Commander
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Show More / View All */}
        {filteredProducts.length > 6 && (
          <div className="text-center mt-10">
            {!showAll ? (
              <Button
                size="lg"
                variant="outline"
                onClick={() => setShowAll(true)}
                className="border-[#2d5a4d] text-[#2d5a4d] hover:bg-[#2d5a4d] hover:text-white px-8"
              >
                Voir tous les produits ({filteredProducts.length})
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            ) : (
              <Button
                size="lg"
                variant="outline"
                onClick={() => setShowAll(false)}
                className="border-gray-300 text-gray-600"
              >
                Voir moins
              </Button>
            )}
          </div>
        )}

        {/* CTA for Suppliers */}
        <div className="mt-16 bg-gradient-to-r from-[#2d5a4d] to-[#1a4038] rounded-2xl p-8 md:p-12 text-center">
          <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Vous êtes fournisseur d'intrants agricoles ?
          </h3>
          <p className="text-white/80 mb-6 max-w-2xl mx-auto">
            Rejoignez notre marketplace et vendez vos produits à des milliers 
            d'agriculteurs en Côte d'Ivoire
          </p>
          <Button 
            size="lg"
            onClick={() => navigate('/register')}
            className="bg-[#d4a574] hover:bg-[#c49564] text-[#2d5a4d] font-semibold px-8"
          >
            Devenir fournisseur
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default MarketplaceSection;

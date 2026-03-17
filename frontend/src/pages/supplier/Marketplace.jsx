import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import Navbar from '../../components/Navbar';
import SupplierSidebar from '../../components/SupplierSidebar';
import { marketplaceApi } from '../../services/marketplaceApi';
import { Search, Filter, Package, Store } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const categories = [
  { value: '', label: 'Toutes' },
  { value: 'engrais', label: 'Engrais' },
  { value: 'pesticides', label: 'Pesticides' },
  { value: 'semences', label: 'Semences' },
  { value: 'outils', label: 'Outils' },
  { value: 'equipements', label: 'Équipements' }
];

const Marketplace = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory]);

  const fetchProducts = async () => {
    try {
      const filters = {};
      if (selectedCategory) filters.category = selectedCategory;
      const data = await marketplaceApi.getProducts(filters);
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isFournisseur = user?.user_type === 'fournisseur';

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      {isFournisseur && <SupplierSidebar />}
      
      <div className={`${isFournisseur ? 'md:ml-64' : ''} pt-20 p-4 sm:p-6 lg:p-8`}>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <Store className="w-7 h-7 sm:w-10 sm:h-10 text-[#2d5a4d]" />
              <h1 className="text-2xl sm:text-4xl font-bold text-gray-900">Marketplace</h1>
            </div>
            <p className="text-sm sm:text-base text-gray-600">Découvrez tous les intrants agricoles disponibles en Côte d'Ivoire</p>
          </div>

          {/* Filters */}
          <Card className="p-4 sm:p-6 mb-4 sm:mb-6">
            <div className="flex flex-col sm:grid sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Rechercher un produit..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-400 shrink-0" />
                <select
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          {/* Products Grid */}
          {loading ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-gray-400 animate-pulse mx-auto mb-4" />
              <p className="text-gray-600">Chargement des produits...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <Card className="p-12 text-center">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun produit trouvé</h3>
              <p className="text-gray-600">Essayez avec un autre terme de recherche ou catégorie</p>
            </Card>
          ) : (
            <>
              <div className="mb-4 text-gray-600">
                <strong>{filteredProducts.length}</strong> produit(s) disponible(s)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {filteredProducts.map((product) => (
                  <Card key={product._id} className="overflow-hidden hover:shadow-xl transition-all duration-200 hover:-translate-y-1">
                    <div className="h-48 bg-gradient-to-br from-[#f8f6f3] to-[#eee] flex items-center justify-center overflow-hidden">
                      {product.images && product.images.length > 0 ? (
                        <img 
                          src={product.images[0]} 
                          alt={product.name}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                        />
                      ) : null}
                      <div className={`w-full h-full items-center justify-center bg-gradient-to-br from-[#2d5a4d] to-[#4a8a7a] ${product.images && product.images.length > 0 ? 'hidden' : 'flex'}`}>
                        <Package className="w-20 h-20 text-white/20" />
                      </div>
                    </div>
                    <div className="p-5">
                      <Badge className="mb-3 bg-[#d4a574] text-[#2d5a4d]">
                        {product.category}
                      </Badge>
                      
                      <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                        {product.name}
                      </h3>
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {product.description}
                      </p>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Prix:</span>
                          <span className="font-bold text-[#2d5a4d]">
                            {product.price.toLocaleString()} XOF
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Fournisseur:</span>
                          <span className="font-medium text-gray-900 text-xs">
                            {product.supplier_name}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Stock:</span>
                          <span className={`font-semibold ${
                            product.stock_quantity < 10 ? 'text-orange-600' : 'text-green-600'
                          }`}>
                            {product.stock_quantity > 0 ? 'Disponible' : 'Rupture'}
                          </span>
                        </div>
                      </div>
                      
                      <Button 
                        className="w-full bg-[#2d5a4d] hover:bg-[#1a4038] text-white"
                        disabled={product.stock_quantity === 0}
                      >
                        {product.stock_quantity > 0 ? 'Voir détails' : 'Rupture de stock'}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Marketplace;
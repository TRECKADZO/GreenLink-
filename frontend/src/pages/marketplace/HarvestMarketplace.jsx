import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { 
  Search, Filter, MapPin, Award, TrendingUp, 
  Plus, Eye, MessageSquare, ChevronRight, Leaf,
  DollarSign, Package, Star, Calendar, Building2,
  Check, X, ArrowUpDown, RefreshCw, FileText,
  Globe, Shield, Truck, Send, ClipboardList, Heart,
  LayoutDashboard, ArrowLeft, Lock
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';

const CROP_IMAGES = {
  cacao: 'https://images.unsplash.com/photo-1573710661345-610f790e1218?w=400&q=80',
  cafe: 'https://images.unsplash.com/photo-1652211940752-fb61223427f6?w=400&q=80',
  anacarde: 'https://images.unsplash.com/photo-1594900689460-fdad3599342c?w=400&q=80'
};

const CERTIFICATION_COLORS = {
  fairtrade: 'bg-green-500/20 text-green-400 border-green-500/30',
  rainforest: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  utz: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  bio: 'bg-lime-500/20 text-lime-400 border-lime-500/30',
  eudr: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  organic: 'bg-teal-500/20 text-teal-400 border-teal-500/30'
};

const GRADE_COLORS = {
  grade_1: 'bg-yellow-500/20 text-yellow-400',
  grade_2: 'bg-slate-400/20 text-slate-300',
  grade_3: 'bg-orange-700/20 text-orange-400',
  specialty: 'bg-yellow-500/20 text-yellow-400',
  premium: 'bg-slate-400/20 text-slate-300',
  commercial: 'bg-orange-700/20 text-orange-400',
  w180: 'bg-yellow-500/20 text-yellow-400',
  w240: 'bg-slate-400/20 text-slate-300',
  w320: 'bg-orange-700/20 text-orange-400',
  w450: 'bg-amber-800/20 text-amber-600'
};

// Données démo statiques pour la Bourse des Récoltes
const DEMO_LISTINGS = [
  {
    listing_id: 'DEMO-001',
    crop_type: 'cacao',
    variety: 'Criollo',
    grade: 'premium',
    quantity_kg: 5000,
    price_per_kg: 1800,
    seller_name: 'Coopérative COOP-DALOA',
    location: 'Daloa',
    certifications: ['fairtrade', 'rainforest', 'bio'],
    eudr_compliant: true,
    harvest_date: '2026-02-15',
    images: ['https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400&h=300&fit=crop'],
    views_count: 12,
    description: 'Cacao premium de qualité supérieure, séché naturellement'
  },
  {
    listing_id: 'DEMO-002',
    crop_type: 'cafe',
    variety: 'Arabica',
    grade: 'specialty',
    quantity_kg: 2500,
    price_per_kg: 2200,
    seller_name: 'Coopérative COOP-MAN',
    location: 'Man',
    certifications: ['rainforest', 'bio'],
    eudr_compliant: true,
    harvest_date: '2026-02-20',
    images: ['https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&h=300&fit=crop'],
    views_count: 8,
    description: 'Café Arabica de montagne, notes fruitées'
  },
  {
    listing_id: 'DEMO-003',
    crop_type: 'anacarde',
    variety: 'RCN',
    grade: 'w240',
    quantity_kg: 25000,
    price_per_kg: 950,
    seller_name: 'Coopérative COOP-KORHOGO',
    location: 'Korhogo',
    certifications: ['fairtrade', 'eudr'],
    eudr_compliant: true,
    harvest_date: '2026-01-10',
    images: ['https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=400&h=300&fit=crop'],
    views_count: 15,
    description: 'Noix de cajou W240, calibre uniforme'
  },
  {
    listing_id: 'DEMO-004',
    crop_type: 'cacao',
    variety: 'Forastero',
    grade: 'grade_2',
    quantity_kg: 10000,
    price_per_kg: 1400,
    seller_name: 'Coopérative COOP-SOUBRE',
    location: 'Soubré',
    certifications: ['fairtrade'],
    eudr_compliant: true,
    harvest_date: '2026-02-01',
    images: ['https://images.unsplash.com/photo-1587132137056-bfbf0166836e?w=400&h=300&fit=crop'],
    views_count: 20,
    description: 'Cacao Forastero, bon rendement en beurre'
  },
  {
    listing_id: 'DEMO-005',
    crop_type: 'cafe',
    variety: 'Robusta',
    grade: 'grade_1',
    quantity_kg: 3500,
    price_per_kg: 1825,
    seller_name: 'Coopérative COOP-DANANE',
    location: 'Danané',
    certifications: ['bio'],
    eudr_compliant: false,
    harvest_date: '2026-02-25',
    images: ['https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&h=300&fit=crop'],
    views_count: 6,
    description: 'Robusta corsé, idéal pour espresso'
  },
  {
    listing_id: 'DEMO-006',
    crop_type: 'anacarde',
    variety: 'RCN',
    grade: 'w320',
    quantity_kg: 15000,
    price_per_kg: 875,
    seller_name: 'Coopérative COOP-BOUNDIALI',
    location: 'Boundiali',
    certifications: ['eudr'],
    eudr_compliant: true,
    harvest_date: '2026-01-20',
    images: ['https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop'],
    views_count: 9,
    description: 'Anacarde W320, qualité export'
  },
  {
    listing_id: 'DEMO-007',
    crop_type: 'cacao',
    variety: 'Trinitario',
    grade: 'premium',
    quantity_kg: 3000,
    price_per_kg: 2100,
    seller_name: 'Coopérative COOP-GAGNOA',
    location: 'Gagnoa',
    certifications: ['fairtrade', 'rainforest', 'bio'],
    eudr_compliant: true,
    harvest_date: '2026-02-10',
    images: ['https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400&h=300&fit=crop'],
    views_count: 18,
    description: 'Cacao Trinitario fin, arômes complexes'
  }
];

// Stats démo statiques
const DEMO_STATS = {
  total_listings: 7,
  total_quantity_kg: 64000,
  avg_price_cacao: 1767,
  avg_price_cafe: 2013,
  avg_price_anacarde: 913,
  active_sellers: 7
};

const HarvestMarketplace = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [cropFilter, setCropFilter] = useState('all');
  const [certFilter, setCertFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [selectedListing, setSelectedListing] = useState(null);
  const [showQuoteDialog, setShowQuoteDialog] = useState(false);
  const [favorites, setFavorites] = useState(new Set());
  const [quoteForm, setQuoteForm] = useState({
    company_name: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    quantity_requested_kg: '',
    delivery_location: '',
    delivery_date_preferred: '',
    incoterm_preferred: '',
    quality_requirements: '',
    certifications_required: [],
    additional_message: '',
    company_type: ''
  });

  // Vérification des rôles
  const isSeller = user && ['producteur', 'cooperative', 'farmer'].includes(user.user_type);
  const isBuyer = user && ['acheteur', 'buyer'].includes(user.user_type);

  useEffect(() => {
    fetchListings();
    fetchStats();
    fetchFavorites();
  }, [cropFilter, certFilter, sortBy]);

  const fetchFavorites = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const response = await axios.get(`${API_URL}/api/buyer/favorites`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const favIds = new Set(response.data.map(f => f.listing_id));
      setFavorites(favIds);
    } catch (error) {
      // User might not be logged in
    }
  };

  const handleToggleFavorite = async (e, listingId) => {
    e.stopPropagation();
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Connectez-vous pour ajouter aux favoris');
      return;
    }

    try {
      if (favorites.has(listingId)) {
        await axios.delete(`${API_URL}/api/buyer/favorites/${listingId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFavorites(prev => {
          const newSet = new Set(prev);
          newSet.delete(listingId);
          return newSet;
        });
        toast.success('Retiré des favoris');
      } else {
        await axios.post(`${API_URL}/api/buyer/favorites/${listingId}`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFavorites(prev => new Set([...prev, listingId]));
        toast.success('Ajouté aux favoris');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    }
  };

  const fetchListings = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (cropFilter && cropFilter !== 'all') params.append('crop_type', cropFilter);
      if (certFilter && certFilter !== 'all') params.append('certification', certFilter);
      params.append('sort_by', sortBy);
      
      const response = await axios.get(`${API_URL}/api/harvest-marketplace/listings?${params}`);
      const data = response.data || [];
      setListings(data);
    } catch (error) {
      console.error('Error fetching listings:', error);
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/harvest-marketplace/stats`);
      const data = response.data;
      setStats(data || { total_listings: 0, total_quantity_tons: 0, avg_price_per_kg: 0, active_sellers: 0 });
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats({ total_listings: 0, total_quantity_tons: 0, avg_price_per_kg: 0, active_sellers: 0 });
    }
  };

  const handleRequestQuote = async () => {
    if (!selectedListing || !quoteForm.company_name || !quoteForm.contact_email || !quoteForm.quantity_requested_kg) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/harvest-marketplace/quote-requests`, {
        listing_id: selectedListing.listing_id,
        ...quoteForm,
        quantity_requested_kg: parseFloat(quoteForm.quantity_requested_kg)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Demande de devis envoyée avec succès!');
      setShowQuoteDialog(false);
      setQuoteForm({
        company_name: '',
        contact_name: '',
        contact_email: '',
        contact_phone: '',
        quantity_requested_kg: '',
        delivery_location: '',
        delivery_date_preferred: '',
        incoterm_preferred: '',
        quality_requirements: '',
        certifications_required: [],
        additional_message: '',
        company_type: ''
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'envoi de la demande');
    }
  };

  const filteredListings = listings.filter(listing =>
    listing.seller_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    listing.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    listing.crop_type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR').format(price);
  };

  return (
    <div className="min-h-screen bg-slate-900" data-testid="harvest-marketplace">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-900/50 via-slate-900 to-emerald-900/50 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Bouton Retour */}
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="mb-4 text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <Package className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">
                    Bourse des Récoltes
                  </h1>
                  <p className="text-slate-400">
                    Cacao • Café • Anacarde — Côte d'Ivoire
                  </p>
                </div>
              </div>
            </div>
            {/* Menu vendeur - visible uniquement pour agriculteurs et coopératives */}
            {isSeller && (
              <div className="flex items-center gap-3">
                <Button 
                  onClick={() => navigate('/buyer/marketplace')}
                  variant="outline"
                  className="border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  Mon Espace
                </Button>
                <Button 
                  onClick={() => navigate('/marketplace/my-listings')}
                  variant="outline"
                  className="border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  Mes Annonces
                </Button>
                <Button 
                  onClick={() => navigate('/marketplace/create-listing')}
                  className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Publier ma Récolte
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div className="bg-slate-800/50 border-b border-slate-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{stats.total_active_listings}</p>
                <p className="text-xs text-slate-400">Annonces Actives</p>
              </div>
              {Object.entries(stats.stats_by_crop || {}).map(([crop, data]) => (
                <div key={crop} className="text-center">
                  <p className="text-xl font-bold text-amber-400">
                    {formatPrice(Math.round(data.avg_price || 0))}
                  </p>
                  <p className="text-xs text-slate-400">{crop} (FCFA/kg)</p>
                </div>
              ))}
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-400">{stats.conversion_rate}%</p>
                <p className="text-xs text-slate-400">Taux Conversion</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              placeholder="Rechercher par vendeur, localisation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-800 border-slate-700 text-white"
            />
          </div>
          <Select value={cropFilter} onValueChange={setCropFilter}>
            <SelectTrigger className="w-40 bg-slate-800 border-slate-700 text-white">
              <SelectValue placeholder="Culture" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              <SelectItem value="cacao">Cacao</SelectItem>
              <SelectItem value="cafe">Café</SelectItem>
              <SelectItem value="anacarde">Anacarde</SelectItem>
            </SelectContent>
          </Select>
          <Select value={certFilter} onValueChange={setCertFilter}>
            <SelectTrigger className="w-44 bg-slate-800 border-slate-700 text-white">
              <SelectValue placeholder="Certification" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              <SelectItem value="fairtrade">Fairtrade</SelectItem>
              <SelectItem value="rainforest">Rainforest Alliance</SelectItem>
              <SelectItem value="bio">Bio</SelectItem>
              <SelectItem value="eudr">EUDR Compliant</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40 bg-slate-800 border-slate-700 text-white">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Trier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">Plus récent</SelectItem>
              <SelectItem value="price_per_kg">Prix</SelectItem>
              <SelectItem value="quantity_kg">Quantité</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchListings} className="border-slate-700">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Listings Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500 mx-auto"></div>
            <p className="mt-4 text-slate-400">Chargement des annonces...</p>
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-slate-600 mx-auto mb-4" />
            <p className="text-xl text-slate-400">Aucune annonce trouvée</p>
            <p className="text-slate-500 mt-2">Soyez le premier à publier votre récolte!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map((listing) => (
              <Card 
                key={listing._id} 
                className="bg-slate-800 border-slate-700 hover:border-amber-500/50 transition-all cursor-pointer group overflow-hidden"
                onClick={() => setSelectedListing(listing)}
              >
                {/* Image Header */}
                <div className="relative h-40 overflow-hidden">
                  <img 
                    src={listing.photos?.[0] || CROP_IMAGES[listing.crop_type] || CROP_IMAGES.cacao}
                    alt={listing.crop_type}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
                  <div className="absolute top-3 left-3 flex gap-2">
                    <Badge className={`${GRADE_COLORS[listing.grade] || 'bg-slate-600'} capitalize`}>
                      {listing.grade?.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="absolute top-3 right-3 flex gap-2">
                    <button
                      onClick={(e) => handleToggleFavorite(e, listing.listing_id)}
                      className={`p-2 rounded-full transition-colors ${
                        favorites.has(listing.listing_id)
                          ? 'bg-red-500 text-white'
                          : 'bg-slate-900/80 text-slate-300 hover:text-red-400'
                      }`}
                    >
                      <Heart className={`h-4 w-4 ${favorites.has(listing.listing_id) ? 'fill-current' : ''}`} />
                    </button>
                    <Badge className="bg-slate-900/80 text-white capitalize">
                      {listing.crop_type}
                    </Badge>
                  </div>
                  <div className="absolute bottom-3 left-3 right-3">
                    <div className="flex flex-wrap gap-1">
                      {listing.certifications?.slice(0, 3).map(cert => (
                        <Badge key={cert} className={`${CERTIFICATION_COLORS[cert]} text-xs`}>
                          {cert}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <CardContent className="p-4">
                  {/* Seller Info */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{listing.seller_name}</p>
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {listing.department}
                      </p>
                    </div>
                  </div>

                  {/* Price & Quantity */}
                  <div className="flex justify-between items-end mb-4">
                    <div>
                      <p className="text-3xl font-bold text-amber-400">
                        {formatPrice(listing.price_per_kg)}
                      </p>
                      <p className="text-xs text-slate-400">FCFA / kg</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-white">
                        {formatPrice(listing.quantity_kg)} kg
                      </p>
                      <p className="text-xs text-slate-400">disponibles</p>
                    </div>
                  </div>

                  {/* Quality Metrics - International Standards */}
                  <div className="space-y-2 mb-4">
                    <div className="flex gap-2 flex-wrap">
                      {listing.eudr_compliant && (
                        <Badge className="bg-blue-600/20 text-blue-400 text-xs">
                          <Shield className="h-3 w-3 mr-1" />
                          EUDR
                        </Badge>
                      )}
                      {listing.child_labor_free && (
                        <Badge className="bg-green-600/20 text-green-400 text-xs">
                          ICI Certifié
                        </Badge>
                      )}
                      {listing.variety && (
                        <Badge className="bg-purple-600/20 text-purple-400 text-xs">
                          {listing.variety}
                        </Badge>
                      )}
                    </div>
                    {(listing.moisture_rate || listing.bean_count || listing.sca_score) && (
                      <div className="flex gap-4 p-2 rounded-lg bg-slate-700/30 text-xs">
                        {listing.moisture_rate && (
                          <div className="text-center">
                            <p className="font-medium text-white">{listing.moisture_rate}%</p>
                            <p className="text-slate-400">Humidité</p>
                          </div>
                        )}
                        {listing.bean_count && (
                          <div className="text-center">
                            <p className="font-medium text-white">{listing.bean_count}</p>
                            <p className="text-slate-400">Grainage</p>
                          </div>
                        )}
                        {listing.sca_score && (
                          <div className="text-center">
                            <p className="font-medium text-emerald-400">{listing.sca_score}</p>
                            <p className="text-slate-400">Score SCA</p>
                          </div>
                        )}
                        {listing.kor && (
                          <div className="text-center">
                            <p className="font-medium text-white">{listing.kor}</p>
                            <p className="text-slate-400">KOR</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex justify-between items-center text-sm text-slate-400 pt-3 border-t border-slate-700">
                    <span className="flex items-center gap-1">
                      <Eye className="h-4 w-4" /> {listing.views_count || 0}
                    </span>
                    <div className="flex items-center gap-2">
                      {/* Boutons réservés aux acheteurs connectés */}
                      {isBuyer ? (
                        <>
                          <Button 
                            size="sm"
                            variant="outline"
                            className="border-slate-600 text-slate-300 hover:text-emerald-400 hover:border-emerald-500"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/messages?listing=${listing.listing_id}&seller=${listing.seller_id}`);
                            }}
                          >
                            <MessageSquare className="h-3 w-3 mr-1" />
                            Contacter
                          </Button>
                          <Button 
                            size="sm"
                            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedListing(listing);
                              setShowQuoteDialog(true);
                            }}
                          >
                            <Send className="h-3 w-3 mr-1" />
                            Devis
                          </Button>
                        </>
                      ) : (
                        <Button 
                          size="sm"
                          variant="outline"
                          className="border-slate-600 text-slate-400"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!user) {
                              toast.info('Connectez-vous en tant qu\'acheteur pour demander un devis');
                              navigate('/login');
                            } else {
                              toast.info('Seuls les acheteurs peuvent demander des devis');
                            }
                          }}
                        >
                          <Lock className="h-3 w-3 mr-1" />
                          Devis (Acheteurs)
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Quote Request Dialog - Demande de Devis (comme RSE) */}
      <Dialog open={showQuoteDialog} onOpenChange={setShowQuoteDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-500" />
              Demander un Devis
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Remplissez ce formulaire pour recevoir un devis personnalisé du vendeur
            </DialogDescription>
          </DialogHeader>
          {selectedListing && (
            <div className="space-y-6">
              {/* Listing Summary */}
              <div className="p-4 rounded-lg bg-slate-700/50 border border-slate-600">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <Badge className="capitalize mb-2">{selectedListing.crop_type}</Badge>
                    <p className="text-white font-medium">{selectedListing.grade}</p>
                    {selectedListing.variety && (
                      <p className="text-sm text-slate-400">Variété: {selectedListing.variety}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-amber-400 font-bold text-xl">{formatPrice(selectedListing.price_per_kg)} FCFA/kg</p>
                    <p className="text-sm text-slate-400">{formatPrice(selectedListing.quantity_kg)} kg disponibles</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedListing.certifications?.map(cert => (
                    <Badge key={cert} className={`${CERTIFICATION_COLORS[cert]} text-xs`}>
                      {cert}
                    </Badge>
                  ))}
                  {selectedListing.eudr_compliant && (
                    <Badge className="bg-blue-600/20 text-blue-400 text-xs">EUDR Compliant</Badge>
                  )}
                </div>
              </div>

              {/* Company Information */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Informations Entreprise
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nom de l'entreprise *</Label>
                    <Input 
                      value={quoteForm.company_name}
                      onChange={(e) => setQuoteForm({...quoteForm, company_name: e.target.value})}
                      className="bg-slate-700 border-slate-600 mt-1"
                      placeholder="Ex: Cargill Côte d'Ivoire"
                    />
                  </div>
                  <div>
                    <Label>Type d'entreprise</Label>
                    <Select value={quoteForm.company_type} onValueChange={(v) => setQuoteForm({...quoteForm, company_type: v})}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 mt-1">
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="negociant">Négociant</SelectItem>
                        <SelectItem value="exportateur">Exportateur</SelectItem>
                        <SelectItem value="transformateur">Transformateur</SelectItem>
                        <SelectItem value="industriel">Industriel</SelectItem>
                        <SelectItem value="torrefacteur">Torréfacteur</SelectItem>
                        <SelectItem value="chocolatier">Chocolatier</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nom du contact *</Label>
                    <Input 
                      value={quoteForm.contact_name}
                      onChange={(e) => setQuoteForm({...quoteForm, contact_name: e.target.value})}
                      className="bg-slate-700 border-slate-600 mt-1"
                      placeholder="Jean Dupont"
                    />
                  </div>
                  <div>
                    <Label>Email *</Label>
                    <Input 
                      type="email"
                      value={quoteForm.contact_email}
                      onChange={(e) => setQuoteForm({...quoteForm, contact_email: e.target.value})}
                      className="bg-slate-700 border-slate-600 mt-1"
                      placeholder="contact@entreprise.com"
                    />
                  </div>
                </div>
                <div>
                  <Label>Téléphone</Label>
                  <Input 
                    value={quoteForm.contact_phone}
                    onChange={(e) => setQuoteForm({...quoteForm, contact_phone: e.target.value})}
                    className="bg-slate-700 border-slate-600 mt-1"
                    placeholder="+225 07 00 00 00 00"
                  />
                </div>
              </div>

              {/* Order Details */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Détails de la Commande
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Quantité souhaitée (kg) *</Label>
                    <Input 
                      type="number"
                      value={quoteForm.quantity_requested_kg}
                      onChange={(e) => setQuoteForm({...quoteForm, quantity_requested_kg: e.target.value})}
                      className="bg-slate-700 border-slate-600 mt-1"
                      max={selectedListing.quantity_kg}
                      placeholder="1000"
                    />
                  </div>
                  <div>
                    <Label>Incoterm préféré</Label>
                    <Select value={quoteForm.incoterm_preferred} onValueChange={(v) => setQuoteForm({...quoteForm, incoterm_preferred: v})}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 mt-1">
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EXW">EXW (Départ usine)</SelectItem>
                        <SelectItem value="FCA">FCA (Franco transporteur)</SelectItem>
                        <SelectItem value="FOB">FOB (Franco à bord)</SelectItem>
                        <SelectItem value="CIF">CIF (Coût, assurance, fret)</SelectItem>
                        <SelectItem value="DAP">DAP (Rendu au lieu)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Lieu de livraison</Label>
                    <Input 
                      value={quoteForm.delivery_location}
                      onChange={(e) => setQuoteForm({...quoteForm, delivery_location: e.target.value})}
                      className="bg-slate-700 border-slate-600 mt-1"
                      placeholder="Port d'Abidjan, Rotterdam..."
                    />
                  </div>
                  <div>
                    <Label>Date de livraison souhaitée</Label>
                    <Input 
                      type="date"
                      value={quoteForm.delivery_date_preferred}
                      onChange={(e) => setQuoteForm({...quoteForm, delivery_date_preferred: e.target.value})}
                      className="bg-slate-700 border-slate-600 mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Quality Requirements */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Exigences Qualité
                </h4>
                <Textarea 
                  value={quoteForm.quality_requirements}
                  onChange={(e) => setQuoteForm({...quoteForm, quality_requirements: e.target.value})}
                  className="bg-slate-700 border-slate-600"
                  placeholder="Spécifications qualité particulières (humidité max, grainage, certifications requises...)"
                  rows={3}
                />
              </div>

              {/* Additional Message */}
              <div>
                <Label>Message complémentaire</Label>
                <Textarea 
                  value={quoteForm.additional_message}
                  onChange={(e) => setQuoteForm({...quoteForm, additional_message: e.target.value})}
                  className="bg-slate-700 border-slate-600 mt-1"
                  placeholder="Informations supplémentaires, conditions particulières..."
                  rows={3}
                />
              </div>

              {/* Estimated Value */}
              {quoteForm.quantity_requested_kg && (
                <div className="p-4 rounded-lg bg-emerald-900/30 border border-emerald-700/50">
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-400">Valeur estimée (prix catalogue)</span>
                    <span className="text-2xl font-bold text-white">
                      {formatPrice(parseFloat(quoteForm.quantity_requested_kg) * selectedListing.price_per_kg)} FCFA
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Le vendeur vous enverra un devis personnalisé basé sur votre demande
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowQuoteDialog(false)} className="border-slate-600">
              Annuler
            </Button>
            <Button onClick={handleRequestQuote} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700">
              <Send className="h-4 w-4 mr-2" />
              Envoyer la demande
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HarvestMarketplace;

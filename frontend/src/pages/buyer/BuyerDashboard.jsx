import { tokenService } from "../../services/tokenService";
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  LayoutDashboard, FileText, Heart, Bell, TrendingUp,
  Package, Search, Filter, Plus, Eye, Clock, Check,
  X, AlertCircle, ChevronRight, RefreshCw, Star,
  MapPin, Award, DollarSign, BarChart3, Settings,
  Trash2, Edit, ToggleLeft, ToggleRight, Building2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Checkbox } from '../../components/ui/checkbox';
import { toast } from 'sonner';
import SubscriptionBanner from '../../components/SubscriptionBanner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CERTIFICATIONS = [
  { id: 'fairtrade', name: 'Fairtrade' },
  { id: 'rainforest', name: 'Rainforest Alliance' },
  { id: 'utz', name: 'UTZ' },
  { id: 'bio', name: 'Bio' },
  { id: 'eudr', name: 'EUDR' },
];

const DEPARTMENTS = [
  'Abidjan', 'Abengourou', 'Agboville', 'Bouaké', 'Daloa', 
  'Divo', 'Gagnoa', 'Man', 'San-Pédro', 'Soubré', 'Yamoussoukro'
];

const BuyerDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [matchingListings, setMatchingListings] = useState([]);
  const [marketInsights, setMarketInsights] = useState(null);
  const [showAlertDialog, setShowAlertDialog] = useState(false);
  const [trialStatus, setTrialStatus] = useState(null);
  const [activatingTrial, setActivatingTrial] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [alertForm, setAlertForm] = useState({
    name: '',
    crop_types: [],
    min_quantity_kg: '',
    max_price_per_kg: '',
    certifications_required: [],
    departments: [],
    eudr_required: false
  });

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${tokenService.getToken()}` }
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchDashboard();
    fetchTrialStatus();
    fetchSubscription();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSubscription = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/subscriptions/my-subscription`, getAuthHeaders());
      setSubscription(data.subscription);
    } catch (err) {
      console.error('Error fetching subscription:', err);
    }
  };

  const fetchTrialStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/buyer/trial-status`, getAuthHeaders());
      setTrialStatus(response.data);
    } catch (error) {
      console.error('Error fetching trial status:', error);
    }
  };

  const activateTrial = async () => {
    try {
      setActivatingTrial(true);
      const response = await axios.post(`${API_URL}/api/buyer/start-trial`, {}, getAuthHeaders());
      if (response.data.success) {
        toast.success('🎉 Essai gratuit activé! Profitez de 15 jours d\'accès complet.');
        fetchTrialStatus();
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'activation');
    } finally {
      setActivatingTrial(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (activeTab === 'quotes') fetchQuotes();
    if (activeTab === 'favorites') fetchFavorites();
    if (activeTab === 'alerts') {
      fetchAlerts();
      fetchMatchingListings();
    }
    if (activeTab === 'insights') fetchMarketInsights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/buyer/dashboard`, getAuthHeaders());
      setDashboard(response.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      toast.error('Erreur lors du chargement du tableau de bord');
    } finally {
      setLoading(false);
    }
  };

  const fetchQuotes = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/buyer/quotes`, getAuthHeaders());
      setQuotes(response.data);
    } catch (error) {
      console.error('Error fetching quotes:', error);
    }
  };

  const fetchFavorites = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/buyer/favorites`, getAuthHeaders());
      setFavorites(response.data);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  };

  const fetchAlerts = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/buyer/alerts`, getAuthHeaders());
      setAlerts(response.data);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  const fetchMatchingListings = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/buyer/matching-listings`, getAuthHeaders());
      setMatchingListings(response.data.matches || []);
    } catch (error) {
      console.error('Error fetching matching listings:', error);
    }
  };

  const fetchMarketInsights = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/buyer/market-insights`, getAuthHeaders());
      setMarketInsights(response.data);
    } catch (error) {
      console.error('Error fetching market insights:', error);
    }
  };

  const handleRemoveFavorite = async (listingId) => {
    try {
      await axios.delete(`${API_URL}/api/buyer/favorites/${listingId}`, getAuthHeaders());
      toast.success('Retiré des favoris');
      fetchFavorites();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleToggleAlert = async (alertId) => {
    try {
      await axios.put(`${API_URL}/api/buyer/alerts/${alertId}/toggle`, {}, getAuthHeaders());
      toast.success('Alerte mise à jour');
      fetchAlerts();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleDeleteAlert = async (alertId) => {
    try {
      await axios.delete(`${API_URL}/api/buyer/alerts/${alertId}`, getAuthHeaders());
      toast.success('Alerte supprimée');
      fetchAlerts();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleCreateAlert = async () => {
    if (!alertForm.name) {
      toast.error('Veuillez donner un nom à l\'alerte');
      return;
    }

    try {
      await axios.post(`${API_URL}/api/buyer/alerts`, {
        ...alertForm,
        min_quantity_kg: alertForm.min_quantity_kg ? parseFloat(alertForm.min_quantity_kg) : null,
        max_price_per_kg: alertForm.max_price_per_kg ? parseFloat(alertForm.max_price_per_kg) : null
      }, getAuthHeaders());
      toast.success('Alerte créée avec succès!');
      setShowAlertDialog(false);
      setAlertForm({
        name: '',
        crop_types: [],
        min_quantity_kg: '',
        max_price_per_kg: '',
        certifications_required: [],
        departments: [],
        eudr_required: false
      });
      fetchAlerts();
      fetchMatchingListings();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la création');
    }
  };

  const formatPrice = (price) => new Intl.NumberFormat('fr-FR').format(price);
  const formatDate = (date) => new Date(date).toLocaleDateString('fr-FR');

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-amber-500/20 text-amber-400',
      quoted: 'bg-emerald-500/20 text-emerald-400',
      reject: 'bg-red-500/20 text-red-400',
      request_info: 'bg-blue-500/20 text-blue-400'
    };
    const labels = {
      pending: 'En attente',
      quoted: 'Devis reçu',
      reject: 'Refusé',
      request_info: 'Info demandée'
    };
    return <Badge className={styles[status] || 'bg-slate-500/20'}>{labels[status] || status}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-slate-400">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900" data-testid="buyer-dashboard">
      {/* Trial Banner */}
      {trialStatus && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          {trialStatus.can_start_trial && (
            <Card className="bg-gradient-to-r from-emerald-600 to-teal-600 border-0 overflow-hidden">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                      <Star className="h-8 w-8 text-white" />
                    </div>
                    <div className="text-center md:text-left">
                      <h3 className="text-xl font-bold text-white">🎁 Offre Spéciale Acheteurs</h3>
                      <p className="text-emerald-100">Activez votre essai gratuit de 15 jours et accédez à toutes les fonctionnalités premium!</p>
                    </div>
                  </div>
                  <Button 
                    onClick={activateTrial}
                    disabled={activatingTrial}
                    className="bg-white text-emerald-700 hover:bg-emerald-50 font-semibold px-6"
                    data-testid="activate-trial-btn"
                  >
                    {activatingTrial ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Activation...
                      </>
                    ) : (
                      <>
                        <Star className="h-4 w-4 mr-2" />
                        Activer mon essai gratuit
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          
          {trialStatus.has_trial && trialStatus.is_active && (
            <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 border-0 overflow-hidden">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Clock className="h-6 w-6 text-white" />
                    <div>
                      <p className="text-white font-medium">
                        Essai gratuit: <span className="font-bold">{trialStatus.days_remaining} jours restants</span>
                      </p>
                      <p className="text-blue-200 text-sm">
                        Profitez de toutes les fonctionnalités premium jusqu'au {new Date(trialStatus.trial_end).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-white/20 text-white border-0">
                    <Star className="h-3 w-3 mr-1" />
                    Premium Trial
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}
          
          {trialStatus.has_trial && !trialStatus.is_active && (
            <Card className="bg-gradient-to-r from-amber-600 to-orange-600 border-0 overflow-hidden">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-6 w-6 text-white" />
                    <div>
                      <p className="text-white font-medium">Votre période d'essai est terminée</p>
                      <p className="text-amber-200 text-sm">Souscrivez pour continuer à profiter des fonctionnalités premium</p>
                    </div>
                  </div>
                  <Button className="bg-white text-amber-700 hover:bg-amber-50 font-semibold">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Souscrire maintenant
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Subscription Pricing Banner */}
      {subscription && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2">
          <SubscriptionBanner subscription={subscription} />
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900/50 via-slate-900 to-purple-900/50 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Building2 className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Espace Acheteur</h1>
                <p className="text-slate-400">Gérez vos demandes de devis, favoris et alertes</p>
              </div>
            </div>
            <Button 
              onClick={() => navigate('/marketplace/harvest')}
              className="bg-gradient-to-r from-amber-500 to-orange-600"
            >
              <Search className="h-4 w-4 mr-2" />
              Explorer le Marché
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      {dashboard && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4 text-center">
                <FileText className="h-6 w-6 text-blue-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{dashboard.stats.total_quote_requests}</p>
                <p className="text-xs text-slate-400">Demandes de devis</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4 text-center">
                <Clock className="h-6 w-6 text-amber-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{dashboard.stats.pending_quotes}</p>
                <p className="text-xs text-slate-400">En attente</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4 text-center">
                <Check className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{dashboard.stats.quotes_received}</p>
                <p className="text-xs text-slate-400">Devis reçus</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4 text-center">
                <Heart className="h-6 w-6 text-red-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{dashboard.stats.favorites_count}</p>
                <p className="text-xs text-slate-400">Favoris</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4 text-center">
                <Bell className="h-6 w-6 text-purple-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{dashboard.stats.active_alerts}</p>
                <p className="text-xs text-slate-400">Alertes actives</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4 text-center">
                <Package className="h-6 w-6 text-teal-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{dashboard.market.active_listings}</p>
                <p className="text-xs text-slate-400">Sur le marché</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-slate-800 border border-slate-700 mb-6">
            <TabsTrigger value="overview" className="data-[state=active]:bg-blue-600">
              <LayoutDashboard className="h-4 w-4 mr-2" />
              Aperçu
            </TabsTrigger>
            <TabsTrigger value="quotes" className="data-[state=active]:bg-blue-600">
              <FileText className="h-4 w-4 mr-2" />
              Mes Devis
            </TabsTrigger>
            <TabsTrigger value="favorites" className="data-[state=active]:bg-red-600">
              <Heart className="h-4 w-4 mr-2" />
              Favoris
            </TabsTrigger>
            <TabsTrigger value="alerts" className="data-[state=active]:bg-purple-600">
              <Bell className="h-4 w-4 mr-2" />
              Alertes
            </TabsTrigger>
            <TabsTrigger value="insights" className="data-[state=active]:bg-emerald-600">
              <BarChart3 className="h-4 w-4 mr-2" />
              Marché
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Quotes */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-400" />
                      Dernières Demandes
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => setActiveTab('quotes')}>
                      Voir tout <ChevronRight className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {dashboard?.recent_quotes?.length > 0 ? (
                    <div className="space-y-3">
                      {dashboard.recent_quotes.map((quote) => (
                        <div key={quote.quote_id} className="p-3 rounded-lg bg-slate-700/50 flex items-center justify-between">
                          <div>
                            <p className="text-white font-medium capitalize">{quote.crop_type}</p>
                            <p className="text-xs text-slate-400">
                              {formatPrice(quote.quantity_requested_kg)} kg • {formatDate(quote.created_at)}
                            </p>
                          </div>
                          {getStatusBadge(quote.status)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 text-center py-4">Aucune demande récente</p>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Actions Rapides</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    onClick={() => navigate('/marketplace/harvest')}
                    className="w-full justify-start bg-amber-600 hover:bg-amber-700"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Rechercher des Récoltes
                  </Button>
                  <Button 
                    onClick={() => {
                      setActiveTab('alerts');
                      setShowAlertDialog(true);
                    }}
                    className="w-full justify-start bg-purple-600 hover:bg-purple-700"
                  >
                    <Bell className="h-4 w-4 mr-2" />
                    Créer une Alerte
                  </Button>
                  <Button 
                    onClick={() => setActiveTab('insights')}
                    variant="outline"
                    className="w-full justify-start border-slate-600"
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Voir les Tendances du Marché
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Quotes Tab */}
          <TabsContent value="quotes">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Historique des Demandes de Devis</CardTitle>
              </CardHeader>
              <CardContent>
                {quotes.length > 0 ? (
                  <div className="space-y-4">
                    {quotes.map((quote) => (
                      <div key={quote.quote_id} className="p-4 rounded-lg bg-slate-700/50 border border-slate-600">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className="capitalize bg-amber-600">{quote.crop_type}</Badge>
                              {getStatusBadge(quote.status)}
                            </div>
                            <p className="text-white font-medium">{quote.seller_name}</p>
                            <p className="text-xs text-slate-400">Réf: {quote.quote_id}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-white">{formatPrice(quote.quantity_requested_kg)} kg</p>
                            <p className="text-xs text-slate-400">{formatDate(quote.created_at)}</p>
                          </div>
                        </div>
                        
                        {quote.listing_details && (
                          <div className="p-3 rounded bg-slate-800 mb-3">
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-slate-400">Grade</p>
                                <p className="text-white">{quote.listing_details.grade}</p>
                              </div>
                              <div>
                                <p className="text-slate-400">Prix actuel</p>
                                <p className="text-amber-400">{formatPrice(quote.listing_details.current_price)} FCFA/kg</p>
                              </div>
                              <div>
                                <p className="text-slate-400">Disponible</p>
                                <p className="text-white">{formatPrice(quote.listing_details.available_quantity)} kg</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {quote.status === 'quoted' && quote.quoted_price_per_kg && (
                          <div className="p-3 rounded bg-emerald-900/30 border border-emerald-700/50">
                            <div className="flex justify-between items-center">
                              <span className="text-emerald-400">Devis reçu</span>
                              <div className="text-right">
                                <p className="text-xl font-bold text-white">{formatPrice(quote.quoted_price_per_kg)} FCFA/kg</p>
                                <p className="text-sm text-emerald-400">Total: {formatPrice(quote.quoted_total)} FCFA</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400">Aucune demande de devis</p>
                    <Button 
                      onClick={() => navigate('/marketplace/harvest')}
                      className="mt-4 bg-amber-600"
                    >
                      Explorer le Marché
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Favorites Tab */}
          <TabsContent value="favorites">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Heart className="h-5 w-5 text-red-400" />
                  Mes Favoris
                </CardTitle>
              </CardHeader>
              <CardContent>
                {favorites.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {favorites.map((fav) => (
                      <div key={fav._id} className="p-4 rounded-lg bg-slate-700/50 border border-slate-600">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <Badge className="capitalize bg-amber-600 mb-2">{fav.listing?.crop_type || 'N/A'}</Badge>
                            <p className="text-white font-medium">{fav.listing?.seller_name}</p>
                            <p className="text-xs text-slate-400 flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {fav.listing?.department}
                            </p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleRemoveFavorite(fav.listing_id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        {fav.listing && (
                          <>
                            <div className="flex justify-between items-center mb-3">
                              <div>
                                <p className="text-2xl font-bold text-amber-400">{formatPrice(fav.listing.price_per_kg)}</p>
                                <p className="text-xs text-slate-400">FCFA/kg</p>
                              </div>
                              <div className="text-right">
                                <p className="text-white font-medium">{formatPrice(fav.listing.quantity_kg)} kg</p>
                                <p className="text-xs text-slate-400">disponibles</p>
                              </div>
                            </div>
                            
                            {fav.price_changed && (
                              <Badge className="bg-blue-600/20 text-blue-400 text-xs mb-2">
                                Prix modifié depuis l'ajout
                              </Badge>
                            )}
                            
                            {!fav.is_available && (
                              <Badge className="bg-red-600/20 text-red-400 text-xs">
                                Plus disponible
                              </Badge>
                            )}
                            
                            {fav.is_available && (
                              <Button 
                                onClick={() => navigate(`/marketplace/harvest`)}
                                className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700"
                                size="sm"
                              >
                                Demander un devis
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Heart className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400">Aucun favori</p>
                    <p className="text-xs text-slate-500 mt-1">Ajoutez des récoltes en favoris pour les retrouver facilement</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Alerts List */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Bell className="h-5 w-5 text-purple-400" />
                      Mes Alertes
                    </span>
                    <Button onClick={() => setShowAlertDialog(true)} size="sm" className="bg-purple-600">
                      <Plus className="h-4 w-4 mr-1" />
                      Nouvelle
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {alerts.length > 0 ? (
                    <div className="space-y-3">
                      {alerts.map((alert) => (
                        <div key={alert.alert_id} className="p-4 rounded-lg bg-slate-700/50 border border-slate-600">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="text-white font-medium">{alert.name}</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {alert.crop_types?.map(c => (
                                  <Badge key={c} className="bg-amber-600/20 text-amber-400 text-xs capitalize">{c}</Badge>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleToggleAlert(alert.alert_id)}
                              >
                                {alert.is_active ? (
                                  <ToggleRight className="h-5 w-5 text-emerald-400" />
                                ) : (
                                  <ToggleLeft className="h-5 w-5 text-slate-400" />
                                )}
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleDeleteAlert(alert.alert_id)}
                                className="text-red-400"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="text-xs text-slate-400 space-y-1">
                            {alert.max_price_per_kg && (
                              <p>Prix max: {formatPrice(alert.max_price_per_kg)} FCFA/kg</p>
                            )}
                            {alert.min_quantity_kg && (
                              <p>Quantité min: {formatPrice(alert.min_quantity_kg)} kg</p>
                            )}
                            {alert.certifications_required?.length > 0 && (
                              <p>Certifications: {alert.certifications_required.join(', ')}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Bell className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                      <p className="text-slate-400">Aucune alerte configurée</p>
                      <Button onClick={() => setShowAlertDialog(true)} className="mt-4 bg-purple-600">
                        Créer une alerte
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Matching Listings */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Star className="h-5 w-5 text-amber-400" />
                    Correspondances ({matchingListings.length})
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Récoltes correspondant à vos alertes actives
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {matchingListings.length > 0 ? (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto">
                      {matchingListings.map((listing) => (
                        <div key={listing.listing_id} className="p-3 rounded-lg bg-slate-700/50 border border-amber-600/30">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <Badge className="capitalize bg-amber-600 text-xs">{listing.crop_type}</Badge>
                              <p className="text-white font-medium mt-1">{listing.seller_name}</p>
                              <p className="text-xs text-slate-400">{listing.department}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-amber-400">{formatPrice(listing.price_per_kg)}</p>
                              <p className="text-xs text-slate-400">FCFA/kg</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-slate-300">{formatPrice(listing.quantity_kg)} kg</p>
                            <Badge className="bg-purple-600/20 text-purple-400 text-xs">
                              Alerte: {listing.matched_alert?.name}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 text-center py-4">
                      {alerts.length > 0 
                        ? 'Aucune récolte ne correspond à vos critères actuellement'
                        : 'Créez des alertes pour voir les correspondances'}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Market Insights Tab */}
          <TabsContent value="insights">
            {marketInsights ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Price by Crop */}
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-emerald-400" />
                      Prix par Culture
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(marketInsights.price_by_crop).map(([crop, data]) => (
                        <div key={crop} className="p-4 rounded-lg bg-slate-700/50">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-white font-medium capitalize">{crop}</p>
                            <Badge className="bg-slate-600">{data.listings_count} annonces</Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-slate-400">Moy.</p>
                              <p className="text-amber-400 font-bold">{formatPrice(Math.round(data.avg_price))}</p>
                            </div>
                            <div>
                              <p className="text-slate-400">Min</p>
                              <p className="text-emerald-400">{formatPrice(data.min_price)}</p>
                            </div>
                            <div>
                              <p className="text-slate-400">Max</p>
                              <p className="text-red-400">{formatPrice(data.max_price)}</p>
                            </div>
                          </div>
                          <p className="text-xs text-slate-400 mt-2">
                            Volume total: {formatPrice(data.total_volume)} kg
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Top Regions */}
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-red-400" />
                      Top Régions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {marketInsights.top_regions.map((region, idx) => (
                        <div key={region._id} className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30">
                          <div className="flex items-center gap-3">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-slate-400' : idx === 2 ? 'bg-orange-600' : 'bg-slate-600'
                            } text-white`}>
                              {idx + 1}
                            </span>
                            <span className="text-white">{region._id}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-white font-medium">{formatPrice(region.volume)} kg</p>
                            <p className="text-xs text-slate-400">{region.listings} annonces</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Top Certifications */}
                <Card className="bg-slate-800 border-slate-700 lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Award className="h-5 w-5 text-emerald-400" />
                      Certifications les Plus Courantes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-3">
                      {marketInsights.top_certifications.map((cert) => (
                        <div key={cert._id} className="px-4 py-3 rounded-lg bg-slate-700/50 border border-slate-600">
                          <p className="text-white font-medium capitalize">{cert._id}</p>
                          <p className="text-sm text-slate-400">{cert.count} annonces</p>
                          <p className="text-xs text-emerald-400">{formatPrice(cert.total_volume)} kg</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500 mx-auto"></div>
                <p className="mt-4 text-slate-400">Chargement des données du marché...</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Alert Dialog */}
      <Dialog open={showAlertDialog} onOpenChange={setShowAlertDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-purple-400" />
              Créer une Alerte
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Recevez une notification quand une récolte correspond à vos critères
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Nom de l'alerte *</Label>
              <Input 
                value={alertForm.name}
                onChange={(e) => setAlertForm({...alertForm, name: e.target.value})}
                className="bg-slate-700 border-slate-600 mt-1"
                placeholder="Ex: Cacao Grade I Fairtrade"
              />
            </div>

            <div>
              <Label>Types de culture</Label>
              <div className="flex gap-2 mt-2">
                {['cacao', 'cafe', 'anacarde'].map(crop => (
                  <Button
                    key={crop}
                    type="button"
                    variant={alertForm.crop_types.includes(crop) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setAlertForm({
                      ...alertForm,
                      crop_types: alertForm.crop_types.includes(crop)
                        ? alertForm.crop_types.filter(c => c !== crop)
                        : [...alertForm.crop_types, crop]
                    })}
                    className={alertForm.crop_types.includes(crop) ? 'bg-amber-600' : 'border-slate-600'}
                  >
                    {crop}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Prix max (FCFA/kg)</Label>
                <Input 
                  type="number"
                  value={alertForm.max_price_per_kg}
                  onChange={(e) => setAlertForm({...alertForm, max_price_per_kg: e.target.value})}
                  className="bg-slate-700 border-slate-600 mt-1"
                  placeholder="1500"
                />
              </div>
              <div>
                <Label>Quantité min (kg)</Label>
                <Input 
                  type="number"
                  value={alertForm.min_quantity_kg}
                  onChange={(e) => setAlertForm({...alertForm, min_quantity_kg: e.target.value})}
                  className="bg-slate-700 border-slate-600 mt-1"
                  placeholder="1000"
                />
              </div>
            </div>

            <div>
              <Label>Certifications requises</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {CERTIFICATIONS.map(cert => (
                  <Button
                    key={cert.id}
                    type="button"
                    variant={alertForm.certifications_required.includes(cert.id) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setAlertForm({
                      ...alertForm,
                      certifications_required: alertForm.certifications_required.includes(cert.id)
                        ? alertForm.certifications_required.filter(c => c !== cert.id)
                        : [...alertForm.certifications_required, cert.id]
                    })}
                    className={alertForm.certifications_required.includes(cert.id) ? 'bg-emerald-600' : 'border-slate-600'}
                  >
                    {cert.name}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={alertForm.eudr_required}
                onCheckedChange={(checked) => setAlertForm({...alertForm, eudr_required: checked})}
              />
              <Label>EUDR Compliant requis</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAlertDialog(false)} className="border-slate-600">
              Annuler
            </Button>
            <Button onClick={handleCreateAlert} className="bg-purple-600 hover:bg-purple-700">
              Créer l'alerte
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BuyerDashboard;

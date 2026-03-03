/**
 * MarketplaceAnalyticsTab - Métriques Avancées Bourse des Récoltes
 * Analytics de classe mondiale pour matières premières agricoles
 */
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  TrendingUp, TrendingDown, Minus, DollarSign, Package, Users,
  Award, Globe, BarChart3, PieChart, Activity, Zap, Target,
  AlertTriangle, CheckCircle, ArrowUpRight, ArrowDownRight,
  Wheat, Coffee, MoreHorizontal, RefreshCw, ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Progress } from '../../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const MarketplaceAnalyticsTab = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCrop, setSelectedCrop] = useState('cacao');

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/marketplace-analytics/dashboard`, getAuthHeaders());
      setData(response.data);
    } catch (error) {
      console.error('Error fetching marketplace analytics:', error);
      toast.error('Erreur lors du chargement des analytics');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => new Intl.NumberFormat('fr-FR').format(num || 0);
  const formatCurrency = (num) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(num || 0);

  const getTrendIcon = (value) => {
    if (value > 0) return <TrendingUp className="h-4 w-4 text-emerald-400" />;
    if (value < 0) return <TrendingDown className="h-4 w-4 text-red-400" />;
    return <Minus className="h-4 w-4 text-slate-400" />;
  };

  const getTrendColor = (value) => {
    if (value > 0) return 'text-emerald-400';
    if (value < 0) return 'text-red-400';
    return 'text-slate-400';
  };

  const getCropIcon = (crop) => {
    switch (crop?.toLowerCase()) {
      case 'cacao': return '🍫';
      case 'cafe':
      case 'café': return '☕';
      case 'anacarde': return '🥜';
      default: return '🌾';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-amber-500 mx-auto mb-4" />
          <p className="text-slate-400">Chargement des analytics marché...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
        <p className="text-slate-400">Impossible de charger les données</p>
        <Button onClick={fetchAnalytics} className="mt-4">Réessayer</Button>
      </div>
    );
  }

  const { executive_summary, market_indices, liquidity_metrics, certification_metrics, 
          participants_metrics, trends, international_benchmarks, quality_metrics } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-amber-500" />
            Bourse des Récoltes - Analytics
          </h2>
          <p className="text-slate-400 mt-1">Métriques temps réel du marché des matières premières agricoles</p>
        </div>
        <Button onClick={fetchAnalytics} variant="outline" className="border-slate-600 text-slate-300">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Executive Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card className="bg-gradient-to-br from-amber-600 to-orange-700 border-0">
          <CardContent className="p-4 text-center">
            <Package className="h-6 w-6 text-white/80 mx-auto mb-2" />
            <p className="text-3xl font-bold text-white">{executive_summary?.total_active_listings || 0}</p>
            <p className="text-xs text-white/70">Annonces Actives</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-emerald-600 to-teal-700 border-0">
          <CardContent className="p-4 text-center">
            <DollarSign className="h-6 w-6 text-white/80 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{executive_summary?.total_market_value_display || '0 FCFA'}</p>
            <p className="text-xs text-white/70">Valeur Marché</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 border-0">
          <CardContent className="p-4 text-center">
            <Wheat className="h-6 w-6 text-white/80 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{executive_summary?.total_volume_display || '0 T'}</p>
            <p className="text-xs text-white/70">Volume Total</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-600 to-pink-700 border-0">
          <CardContent className="p-4 text-center">
            <Activity className="h-6 w-6 text-white/80 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{liquidity_metrics?.conversion_rate_percent || 0}%</p>
            <p className="text-xs text-white/70">Taux Conversion</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-cyan-600 to-blue-700 border-0">
          <CardContent className="p-4 text-center">
            <Users className="h-6 w-6 text-white/80 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{participants_metrics?.active_buyers || 0}</p>
            <p className="text-xs text-white/70">Acheteurs Actifs</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-rose-600 to-red-700 border-0">
          <CardContent className="p-4 text-center">
            <Target className="h-6 w-6 text-white/80 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{executive_summary?.market_health_score || 0}</p>
            <p className="text-xs text-white/70">Score Santé</p>
          </CardContent>
        </Card>
      </div>

      {/* Key Insights */}
      {executive_summary?.key_insights?.length > 0 && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-4 flex-wrap">
              <Zap className="h-5 w-5 text-amber-400" />
              {executive_summary.key_insights.map((insight, idx) => (
                <Badge key={idx} className="bg-amber-500/20 text-amber-300 border-amber-500/30">
                  {insight}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Market Indices by Crop */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Globe className="h-5 w-5 text-amber-400" />
            Indices de Marché par Produit
          </CardTitle>
          <CardDescription className="text-slate-400">
            Prix, volumes et comparaison avec les cours internationaux
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedCrop} onValueChange={setSelectedCrop}>
            <TabsList className="bg-slate-700 mb-6">
              {Object.keys(market_indices || {}).map(crop => (
                <TabsTrigger 
                  key={crop} 
                  value={crop}
                  className="data-[state=active]:bg-amber-600"
                >
                  {getCropIcon(crop)} {crop.charAt(0).toUpperCase() + crop.slice(1)}
                </TabsTrigger>
              ))}
              {Object.keys(market_indices || {}).length === 0 && (
                <TabsTrigger value="empty" disabled>Aucune donnée</TabsTrigger>
              )}
            </TabsList>

            {Object.entries(market_indices || {}).map(([crop, indices]) => (
              <TabsContent key={crop} value={crop}>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  {/* Prix Moyen */}
                  <Card className="bg-slate-700/50 border-slate-600">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-400 text-sm">Prix Moyen</span>
                        <DollarSign className="h-4 w-4 text-emerald-400" />
                      </div>
                      <p className="text-2xl font-bold text-white">
                        {formatNumber(indices.avg_price_fcfa_kg)} <span className="text-sm text-slate-400">FCFA/kg</span>
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-sm">
                        <span className="text-slate-500">Min: {formatNumber(indices.min_price)}</span>
                        <span className="text-slate-600">|</span>
                        <span className="text-slate-500">Max: {formatNumber(indices.max_price)}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Volume */}
                  <Card className="bg-slate-700/50 border-slate-600">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-400 text-sm">Volume Disponible</span>
                        <Package className="h-4 w-4 text-blue-400" />
                      </div>
                      <p className="text-2xl font-bold text-white">
                        {indices.total_volume_tonnes} <span className="text-sm text-slate-400">tonnes</span>
                      </p>
                      <p className="text-sm text-slate-500 mt-2">
                        {indices.listings_count} annonce(s)
                      </p>
                    </CardContent>
                  </Card>

                  {/* Valeur Marché */}
                  <Card className="bg-slate-700/50 border-slate-600">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-400 text-sm">Valeur Marché</span>
                        <BarChart3 className="h-4 w-4 text-purple-400" />
                      </div>
                      <p className="text-2xl font-bold text-white">
                        {indices.total_market_value_millions} <span className="text-sm text-slate-400">M FCFA</span>
                      </p>
                      <p className="text-sm text-slate-500 mt-2">
                        Spread: {indices.price_spread_percent}%
                      </p>
                    </CardContent>
                  </Card>

                  {/* Prime/Décote International */}
                  <Card className="bg-slate-700/50 border-slate-600">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-400 text-sm">vs Cours International</span>
                        <Globe className="h-4 w-4 text-amber-400" />
                      </div>
                      <div className="flex items-center gap-2">
                        <p className={`text-2xl font-bold ${indices.international_comparison?.premium_percent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {indices.international_comparison?.premium_percent >= 0 ? '+' : ''}{indices.international_comparison?.premium_percent}%
                        </p>
                        {indices.international_comparison?.premium_percent >= 0 ? 
                          <ArrowUpRight className="h-5 w-5 text-emerald-400" /> : 
                          <ArrowDownRight className="h-5 w-5 text-red-400" />
                        }
                      </div>
                      <p className="text-sm text-slate-500 mt-2">
                        Réf: {formatNumber(indices.international_comparison?.intl_price_fcfa_kg)} FCFA/kg
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Liquidité & Trading */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-400" />
              Liquidité & Trading
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-700/50 rounded-lg p-4">
                <p className="text-slate-400 text-sm">Demandes de Devis</p>
                <p className="text-2xl font-bold text-white">{liquidity_metrics?.total_quote_requests || 0}</p>
                <p className="text-xs text-slate-500">+{liquidity_metrics?.quotes_this_week || 0} cette semaine</p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4">
                <p className="text-slate-400 text-sm">Devis en Attente</p>
                <p className="text-2xl font-bold text-amber-400">{liquidity_metrics?.pending_quotes || 0}</p>
                <p className="text-xs text-slate-500">{liquidity_metrics?.response_rate_percent || 0}% taux réponse</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">Taux de Conversion</span>
                  <span className="text-white">{liquidity_metrics?.conversion_rate_percent || 0}%</span>
                </div>
                <Progress value={liquidity_metrics?.conversion_rate_percent || 0} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">Taux de Réponse</span>
                  <span className="text-white">{liquidity_metrics?.response_rate_percent || 0}%</span>
                </div>
                <Progress value={liquidity_metrics?.response_rate_percent || 0} className="h-2" />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-700">
              <span className="text-slate-400">Vélocité Marché</span>
              <Badge className={`${
                liquidity_metrics?.market_velocity === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                liquidity_metrics?.market_velocity === 'moderate' ? 'bg-amber-500/20 text-amber-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {liquidity_metrics?.market_velocity === 'active' ? '🔥 Actif' :
                 liquidity_metrics?.market_velocity === 'moderate' ? '⚡ Modéré' : '❄️ Faible'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Certifications & Conformité */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-400" />
              Certifications & Conformité
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-700/50 rounded-lg p-4">
                <p className="text-slate-400 text-sm">Produits Certifiés</p>
                <p className="text-2xl font-bold text-white">{certification_metrics?.total_certified_listings || 0}</p>
                <p className="text-xs text-emerald-400">{certification_metrics?.certification_rate_percent || 0}% du marché</p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4">
                <p className="text-slate-400 text-sm">Conformité EUDR</p>
                <p className="text-2xl font-bold text-emerald-400">{certification_metrics?.eudr_compliance_rate || 0}%</p>
                <p className="text-xs text-slate-500">{certification_metrics?.eudr_compliant_count || 0} annonces</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-slate-400 mb-2">Répartition des Certifications</p>
              {Object.entries(certification_metrics?.by_certification || {}).map(([cert, count]) => (
                <div key={cert} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      cert === 'fairtrade' ? 'bg-blue-500' :
                      cert === 'rainforest' ? 'bg-emerald-500' :
                      cert === 'bio' ? 'bg-green-500' :
                      cert === 'eudr' ? 'bg-purple-500' :
                      cert === 'utz' ? 'bg-amber-500' : 'bg-slate-500'
                    }`} />
                    <span className="text-slate-300 text-sm capitalize">{cert}</span>
                  </div>
                  <span className="text-white font-medium">{count}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-700">
              <span className="text-slate-400">Potentiel Premium</span>
              <Badge className={`${
                certification_metrics?.premium_potential === 'high' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
              }`}>
                {certification_metrics?.premium_potential === 'high' ? '⭐ Élevé' : '📈 Moyen'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* International Benchmarks */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-400" />
            Références Internationales
          </CardTitle>
          <CardDescription className="text-slate-400">
            Cours mondiaux ICCO (Cacao), ICO (Café), AFI (Anacarde)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Cacao */}
            <div className="bg-gradient-to-br from-amber-900/30 to-orange-900/20 rounded-xl p-5 border border-amber-700/30">
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl">🍫</span>
                <Badge className="bg-amber-500/20 text-amber-300">ICCO</Badge>
              </div>
              <h4 className="text-lg font-semibold text-white mb-3">Cacao</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Prix ICCO</span>
                  <span className="text-white font-medium">${international_benchmarks?.cacao?.icco_daily_usd_tonne}/T</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Variation</span>
                  <span className={`font-medium flex items-center gap-1 ${international_benchmarks?.cacao?.icco_change_percent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {getTrendIcon(international_benchmarks?.cacao?.icco_change_percent)}
                    {international_benchmarks?.cacao?.icco_change_percent}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Équiv. Local</span>
                  <span className="text-amber-400 font-medium">{formatNumber(international_benchmarks?.cacao?.local_equivalent_fcfa_kg)} FCFA/kg</span>
                </div>
              </div>
            </div>

            {/* Café */}
            <div className="bg-gradient-to-br from-amber-800/30 to-yellow-900/20 rounded-xl p-5 border border-amber-600/30">
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl">☕</span>
                <Badge className="bg-yellow-500/20 text-yellow-300">ICO</Badge>
              </div>
              <h4 className="text-lg font-semibold text-white mb-3">Café</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Robusta London</span>
                  <span className="text-white font-medium">${international_benchmarks?.cafe?.robusta_london_usd_tonne}/T</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Variation</span>
                  <span className={`font-medium flex items-center gap-1 ${international_benchmarks?.cafe?.ico_change_percent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {getTrendIcon(international_benchmarks?.cafe?.ico_change_percent)}
                    {international_benchmarks?.cafe?.ico_change_percent}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Équiv. Local</span>
                  <span className="text-yellow-400 font-medium">{formatNumber(international_benchmarks?.cafe?.local_equivalent_fcfa_kg)} FCFA/kg</span>
                </div>
              </div>
            </div>

            {/* Anacarde */}
            <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/20 rounded-xl p-5 border border-green-700/30">
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl">🥜</span>
                <Badge className="bg-green-500/20 text-green-300">AFI</Badge>
              </div>
              <h4 className="text-lg font-semibold text-white mb-3">Anacarde</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Prix RCN</span>
                  <span className="text-white font-medium">${international_benchmarks?.anacarde?.afi_rcn_usd_tonne}/T</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Variation</span>
                  <span className={`font-medium flex items-center gap-1 ${international_benchmarks?.anacarde?.afi_change_percent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {getTrendIcon(international_benchmarks?.anacarde?.afi_change_percent)}
                    {international_benchmarks?.anacarde?.afi_change_percent}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Équiv. Local</span>
                  <span className="text-green-400 font-medium">{formatNumber(international_benchmarks?.anacarde?.local_equivalent_fcfa_kg)} FCFA/kg</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-700 flex items-center justify-between text-sm">
            <span className="text-slate-500">
              Taux de change: 1 USD = {international_benchmarks?.exchange_rate_usd_xof || 600} FCFA
            </span>
            <span className="text-slate-500">
              Dernière màj: {new Date(international_benchmarks?.last_updated).toLocaleString('fr-FR')}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Participants & Trends */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Participants */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-400" />
              Participants du Marché
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-white">{participants_metrics?.active_sellers || 0}</p>
                <p className="text-slate-400 text-sm">Vendeurs Actifs</p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-white">{participants_metrics?.active_buyers || 0}</p>
                <p className="text-slate-400 text-sm">Acheteurs Actifs</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Coopératives</span>
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">{participants_metrics?.seller_types?.cooperative || 0}</span>
                  <Badge className="bg-emerald-500/20 text-emerald-400 text-xs">
                    {participants_metrics?.cooperative_share || 0}%
                  </Badge>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Producteurs Individuels</span>
                <span className="text-white font-medium">{participants_metrics?.seller_types?.producer || 0}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-700">
                <span className="text-slate-400">Ratio Acheteurs/Vendeurs</span>
                <span className="text-amber-400 font-medium">{participants_metrics?.buyer_seller_ratio || 0}x</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trends */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
              Tendances
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-white">{trends?.new_listings_this_week || 0}</p>
                <p className="text-slate-400 text-sm">Nouvelles annonces (7j)</p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                <p className={`text-2xl font-bold ${trends?.week_over_week_change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {trends?.week_over_week_change >= 0 ? '+' : ''}{trends?.week_over_week_change || 0}%
                </p>
                <p className="text-slate-400 text-sm">vs semaine précédente</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Tendance Offre</span>
                <Badge className={`${
                  trends?.listing_trend === 'increasing' ? 'bg-emerald-500/20 text-emerald-400' :
                  trends?.listing_trend === 'decreasing' ? 'bg-red-500/20 text-red-400' :
                  'bg-slate-500/20 text-slate-400'
                }`}>
                  {trends?.listing_trend === 'increasing' ? '📈 En hausse' :
                   trends?.listing_trend === 'decreasing' ? '📉 En baisse' : '➡️ Stable'}
                </Badge>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-700">
                <span className="text-slate-400">Sentiment Marché</span>
                <Badge className={`${
                  trends?.market_sentiment === 'bullish' ? 'bg-emerald-500/20 text-emerald-400' :
                  trends?.market_sentiment === 'bearish' ? 'bg-red-500/20 text-red-400' :
                  'bg-amber-500/20 text-amber-400'
                }`}>
                  {trends?.market_sentiment === 'bullish' ? '🐂 Haussier' :
                   trends?.market_sentiment === 'bearish' ? '🐻 Baissier' : '⚖️ Neutre'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="text-center text-slate-500 text-sm">
        <p>Données mises à jour en temps réel • Standards ICCO, ICO, AFI</p>
      </div>
    </div>
  );
};

export default MarketplaceAnalyticsTab;

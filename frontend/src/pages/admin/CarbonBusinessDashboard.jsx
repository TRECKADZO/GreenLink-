import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { 
  TrendingUp, DollarSign, Leaf, Calculator, 
  Building2, Globe2, ArrowUpRight, Info, ChevronLeft
} from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Simple API helper with auth
const apiClient = {
  get: async (url) => {
    const token = localStorage.getItem('token');
    return axios.get(`${API_URL}${url}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
  }
};

const CarbonBusinessDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [projection, setProjection] = useState(null);
  const [marketPrices, setMarketPrices] = useState(null);
  const [loading, setLoading] = useState(true);
  const [projectionParams, setProjectionParams] = useState({
    numFarmers: 1000,
    avgHectares: 2.5,
    avgTrees: 48,
    priceUsd: 30
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [dashboardRes, pricesRes] = await Promise.all([
        apiClient.get('/api/carbon/analytics/dashboard'),
        apiClient.get('/api/carbon/market-prices')
      ]);
      setDashboard(dashboardRes.data);
      setMarketPrices(pricesRes.data);
      
      // Fetch default projection
      await fetchProjection(1000);
    } catch (error) {
      console.error('Error fetching carbon data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjection = async (numFarmers) => {
    try {
      const res = await apiClient.get(`/api/carbon/analytics/revenue-projection?num_farmers=${numFarmers}&avg_hectares=${projectionParams.avgHectares}&avg_trees=${projectionParams.avgTrees}&price_usd=${projectionParams.priceUsd}`);
      setProjection(res.data);
    } catch (error) {
      console.error('Error fetching projection:', error);
    }
  };

  const formatNumber = (num, decimals = 0) => {
    if (num === null || num === undefined) return '0';
    return new Intl.NumberFormat('fr-FR', { 
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals 
    }).format(num);
  };

  const formatCurrency = (amount, currency = 'FCFA') => {
    return `${formatNumber(amount)} ${currency}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2d5a4d]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Business Model Carbone</h1>
          <p className="text-gray-500">Revenus des crédits carbone et projections</p>
        </div>
        <Badge className="bg-green-100 text-green-700 px-4 py-2">
          <Leaf className="w-4 h-4 mr-2" />
          Marché Volontaire 2025-2026
        </Badge>
      </div>

      {/* Business Model Overview */}
      <Card className="bg-gradient-to-r from-[#2d5a4d] to-[#1a4038] text-white">
        <CardContent className="p-6">
          <div className="text-center mb-4">
            <p className="text-green-200 text-sm">Distribution du revenu brut</p>
          </div>
          <div className="grid md:grid-cols-5 gap-4">
            <div className="text-center p-3 bg-white/10 rounded-lg">
              <div className="text-2xl font-bold">27%</div>
              <div className="text-green-200 text-xs">Coûts</div>
              <div className="text-green-300 text-xs">(audits, vérif.)</div>
            </div>
            <div className="text-center p-3 bg-white/10 rounded-lg">
              <div className="text-2xl font-bold">~15%</div>
              <div className="text-green-200 text-xs">GreenLink</div>
              <div className="text-green-300 text-xs">(20% du net)</div>
            </div>
            <div className="text-center p-3 bg-white/10 rounded-lg">
              <div className="text-2xl font-bold">~55%</div>
              <div className="text-green-200 text-xs">Planteurs</div>
              <div className="text-green-300 text-xs">(75% du net)</div>
            </div>
            <div className="text-center p-3 bg-white/10 rounded-lg">
              <div className="text-2xl font-bold">~3%</div>
              <div className="text-green-200 text-xs">Coopératives</div>
              <div className="text-green-300 text-xs">(5% du net)</div>
            </div>
            <div className="text-center p-3 bg-green-500/30 rounded-lg border border-green-400">
              <div className="text-2xl font-bold">20-40</div>
              <div className="text-green-200 text-xs">USD/tonne</div>
              <div className="text-green-300 text-xs">(prix marché)</div>
            </div>
          </div>
          <div className="text-center mt-4">
            <p className="text-green-300 text-xs">Total = 27% (coûts) + 73% (net distribué) = 100% ✓</p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="projection" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="projection">Projections</TabsTrigger>
          <TabsTrigger value="market">Prix du Marché</TabsTrigger>
          <TabsTrigger value="current">Situation Actuelle</TabsTrigger>
        </TabsList>

        {/* Projections Tab */}
        <TabsContent value="projection" className="space-y-4">
          {/* Projection Calculator */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calculator className="w-5 h-5 mr-2 text-[#2d5a4d]" />
                Simulateur de Revenus
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-4 mb-6">
                <div>
                  <label className="text-sm font-medium text-gray-700">Nombre de planteurs</label>
                  <select 
                    className="w-full mt-1 p-2 border rounded-lg"
                    value={projectionParams.numFarmers}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setProjectionParams({...projectionParams, numFarmers: val});
                      fetchProjection(val);
                    }}
                  >
                    <option value={1000}>1,000 (Pilote)</option>
                    <option value={5000}>5,000 (Croissance)</option>
                    <option value={20000}>20,000 (Scale)</option>
                    <option value={50000}>50,000 (Maturité)</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Hectares/planteur</label>
                  <input 
                    type="number" 
                    className="w-full mt-1 p-2 border rounded-lg"
                    value={projectionParams.avgHectares}
                    onChange={(e) => setProjectionParams({...projectionParams, avgHectares: parseFloat(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Arbres/hectare</label>
                  <input 
                    type="number" 
                    className="w-full mt-1 p-2 border rounded-lg"
                    value={projectionParams.avgTrees}
                    onChange={(e) => setProjectionParams({...projectionParams, avgTrees: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Prix USD/t CO2</label>
                  <input 
                    type="number" 
                    className="w-full mt-1 p-2 border rounded-lg"
                    value={projectionParams.priceUsd}
                    onChange={(e) => setProjectionParams({...projectionParams, priceUsd: parseFloat(e.target.value)})}
                  />
                </div>
              </div>
              <Button 
                onClick={() => fetchProjection(projectionParams.numFarmers)}
                className="bg-[#2d5a4d] hover:bg-[#1a4038]"
              >
                Calculer
              </Button>
            </CardContent>
          </Card>

          {/* Projection Results */}
          {projection && (
            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Carbone Total</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatNumber(projection.carbon?.total_tonnes_co2)} t CO2/an
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {projection.carbon?.rate_per_ha} t/ha
                      </p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-lg">
                      <Leaf className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Revenu Brut</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatNumber(projection.revenue?.gross_usd)} USD
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {formatCurrency(projection.revenue?.gross_fcfa)}
                      </p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <DollarSign className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#2d5a4d] text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-200">Marge GreenLink (25%)</p>
                      <p className="text-2xl font-bold">
                        {formatNumber(projection.distribution?.greenlink_margin_usd)} USD
                      </p>
                      <p className="text-sm text-green-200 mt-1">
                        {formatCurrency(projection.distribution?.greenlink_margin_fcfa)}
                      </p>
                    </div>
                    <div className="p-3 bg-green-800 rounded-lg">
                      <TrendingUp className="w-6 h-6 text-green-300" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Growth Projections */}
          {projection?.projections && (
            <Card>
              <CardHeader>
                <CardTitle>Projections de Croissance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Phase</th>
                        <th className="text-right py-3 px-4">Planteurs</th>
                        <th className="text-right py-3 px-4">Tonnes CO2</th>
                        <th className="text-right py-3 px-4">Revenu Brut</th>
                        <th className="text-right py-3 px-4">Marge GreenLink</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(projection.projections).map(([key, data]) => (
                        <tr key={key} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">
                            {key.replace(/_/g, ' ').replace('year ', 'Année ')}
                          </td>
                          <td className="py-3 px-4 text-right">{formatNumber(data.farmers)}</td>
                          <td className="py-3 px-4 text-right">{formatNumber(data.tonnes_co2)}</td>
                          <td className="py-3 px-4 text-right">{formatNumber(data.gross_usd)} USD</td>
                          <td className="py-3 px-4 text-right font-bold text-green-600">
                            {formatNumber(data.greenlink_margin_usd)} USD
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Market Prices Tab */}
        <TabsContent value="market" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Quality Tiers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Leaf className="w-5 h-5 mr-2 text-green-600" />
                  Niveaux de Qualité
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {marketPrices?.quality_tiers?.map((tier, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{tier.quality_name}</p>
                        <p className="text-sm text-gray-500">{tier.price_range_usd}</p>
                      </div>
                      <Badge className={
                        tier.quality === 'biochar' ? 'bg-purple-100 text-purple-700' :
                        tier.quality === 'premium' ? 'bg-yellow-100 text-yellow-700' :
                        tier.quality === 'verified' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }>
                        {tier.default_price_usd} USD/t
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Buyer Types */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building2 className="w-5 h-5 mr-2 text-blue-600" />
                  Types d'Acheteurs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {marketPrices?.buyer_types?.map((buyer, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{buyer.type_name}</p>
                        <p className="text-sm text-gray-500">
                          Multiplicateur: {buyer.price_multiplier}x
                        </p>
                      </div>
                      <Badge className="bg-green-100 text-green-700">
                        ~{buyer.example_price_usd} USD/t
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Market Notes */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-start">
                <Info className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-2">Notes sur le marché carbone CI 2025-2026:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>{marketPrices?.notes?.fcpf_historical}</li>
                    <li>{marketPrices?.notes?.premium_potential}</li>
                    <li>Source: {marketPrices?.notes?.source}</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Current Status Tab */}
        <TabsContent value="current" className="space-y-4">
          <div className="grid md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Crédits Générés</p>
                    <p className="text-2xl font-bold">{dashboard?.credits?.total_generated || 0}</p>
                  </div>
                  <Leaf className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Tonnes CO2</p>
                    <p className="text-2xl font-bold">{formatNumber(dashboard?.credits?.total_tonnes)}</p>
                  </div>
                  <Globe2 className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Revenus Totaux</p>
                    <p className="text-2xl font-bold">{formatNumber(dashboard?.sales?.total_revenue_usd)} USD</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Disponible à la vente</p>
                    <p className="text-2xl font-bold">{formatNumber(dashboard?.credits?.available_for_sale)} t</p>
                  </div>
                  <ArrowUpRight className="w-8 h-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Business Model Info */}
          <Card>
            <CardHeader>
              <CardTitle>Modèle d'Affaires</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-600 font-medium">Marge GreenLink</p>
                  <p className="text-2xl font-bold text-green-700">{dashboard?.business_model?.greenlink_margin_rate}</p>
                  <p className="text-xs text-green-600 mt-1">Sur le revenu net après coûts</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-600 font-medium">Part Planteurs</p>
                  <p className="text-2xl font-bold text-blue-700">{dashboard?.business_model?.farmer_share_rate}</p>
                  <p className="text-xs text-blue-600 mt-1">Redistribué aux agriculteurs</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 font-medium">Taux de change</p>
                  <p className="text-2xl font-bold text-gray-700">1 USD = {dashboard?.business_model?.usd_to_fcfa} FCFA</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CarbonBusinessDashboard;

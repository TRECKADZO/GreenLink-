import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import Navbar from '../../components/Navbar';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  TrendingUp, Leaf, Globe2, DollarSign, Shield, Users, 
  BarChart3, Map, Award, Calendar, Download, RefreshCcw,
  Building2, Target, AlertTriangle, CheckCircle2, ChevronLeft
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const apiClient = {
  get: async (url) => {
    const token = localStorage.getItem('token');
    return axios.get(`${API_URL}${url}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
  }
};

const PremiumAnalyticsDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [analytics, setAnalytics] = useState({});
  const [selectedAnalytic, setSelectedAnalytic] = useState(null);

  const analyticsList = [
    { id: 1, name: 'Tendances Volumétriques', icon: TrendingUp, color: 'blue', endpoint: '1-volume-price-trends' },
    { id: 2, name: 'Pratiques Durables', icon: Leaf, color: 'green', endpoint: '2-sustainable-practices-adoption' },
    { id: 3, name: 'Scores Carbone', icon: Globe2, color: 'emerald', endpoint: '3-carbon-score-distribution' },
    { id: 4, name: 'Crédits & Primes', icon: DollarSign, color: 'yellow', endpoint: '4-carbon-credits-premiums' },
    { id: 5, name: 'Conformité EUDR', icon: Shield, color: 'purple', endpoint: '5-eudr-compliance-detailed' },
    { id: 6, name: 'Impact Économique', icon: Users, color: 'orange', endpoint: '6-economic-impact' },
    { id: 7, name: 'Résilience Climat', icon: AlertTriangle, color: 'red', endpoint: '7-climate-resilience' },
    { id: 8, name: 'Cartographie Carbone', icon: Map, color: 'cyan', endpoint: '8-carbon-potential-map' },
    { id: 9, name: 'Benchmarks Secteurs', icon: Award, color: 'pink', endpoint: '9-sector-benchmarks' },
    { id: 10, name: 'Prévisions 2030', icon: Calendar, color: 'indigo', endpoint: '10-macro-forecasts' },
  ];

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.user_type !== 'admin') {
      toast.error('Accès refusé', { description: 'Réservé aux administrateurs' });
      navigate('/');
      return;
    }
    fetchTopPriority();
  }, [user, authLoading]);

  const fetchTopPriority = async () => {
    try {
      const response = await apiClient.get('/api/premium-analytics/top-3-priority');
      setAnalytics({ top3: response.data });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytic = async (endpoint) => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/api/premium-analytics/${endpoint}`);
      setSelectedAnalytic(response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    return new Intl.NumberFormat('fr-FR').format(num);
  };

  if (loading && !analytics.top3) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-24 flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2d5a4d]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="pt-24 pb-12 px-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/admin')}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Retour
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Premium Analytics</h1>
                <p className="text-gray-500">10 Analytics institutionnels à haute valeur marchande</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Badge className="bg-purple-100 text-purple-700 px-4 py-2">
                <Building2 className="w-4 h-4 mr-2" />
                Données Institutionnelles
              </Badge>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export Complet
              </Button>
            </div>
          </div>

          {/* Top 3 Priority */}
          {analytics.top3 && (
            <Card className="bg-gradient-to-r from-[#2d5a4d] to-[#1a4038] text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Top 3 Analytics - Potentiel Immédiat 2026
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 bg-white/10 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-red-500">PRIORITÉ 1</Badge>
                      <span className="text-sm text-green-200">TRÈS ÉLEVÉE</span>
                    </div>
                    <p className="font-bold text-lg">Conformité EUDR</p>
                    <p className="text-green-200 text-sm mt-1">500K - 1M EUR potentiel</p>
                    <p className="text-xs text-green-300 mt-2">Obligation légale UE</p>
                  </div>
                  <div className="p-4 bg-white/10 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-orange-500">PRIORITÉ 2</Badge>
                      <span className="text-sm text-green-200">ÉLEVÉE</span>
                    </div>
                    <p className="font-bold text-lg">Crédits Carbone +40%</p>
                    <p className="text-green-200 text-sm mt-1">300K - 600K EUR potentiel</p>
                    <p className="text-xs text-green-300 mt-2">Demande RSE croissante</p>
                  </div>
                  <div className="p-4 bg-white/10 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-yellow-500 text-gray-900">PRIORITÉ 3</Badge>
                      <span className="text-sm text-green-200">MOYENNE-ÉLEVÉE</span>
                    </div>
                    <p className="font-bold text-lg">Pratiques Durables IA</p>
                    <p className="text-green-200 text-sm mt-1">200K - 400K EUR potentiel</p>
                    <p className="text-xs text-green-300 mt-2">Données uniques vérifiées</p>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-white/5 rounded-lg text-center">
                  <p className="text-green-200">Potentiel total 2026: <span className="font-bold text-white">1 - 2 Millions EUR</span></p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Analytics Grid */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4">10 Analytics Disponibles</h2>
            <div className="grid md:grid-cols-5 gap-3">
              {analyticsList.map((analytic) => {
                const Icon = analytic.icon;
                return (
                  <Card 
                    key={analytic.id}
                    className={`cursor-pointer hover:shadow-lg transition-all ${
                      selectedAnalytic?.analytic_id === String(analytic.id) ? 'ring-2 ring-[#2d5a4d]' : ''
                    }`}
                    onClick={() => fetchAnalytic(analytic.endpoint)}
                  >
                    <CardContent className="p-4 text-center">
                      <div className={`inline-flex p-3 rounded-lg bg-${analytic.color}-100 mb-2`}>
                        <Icon className={`w-6 h-6 text-${analytic.color}-600`} />
                      </div>
                      <p className="font-medium text-sm text-gray-900">{analytic.name}</p>
                      <Badge variant="outline" className="mt-2 text-xs">#{analytic.id}</Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Selected Analytic Detail */}
          {selectedAnalytic && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Analytic #{selectedAnalytic.analytic_id}: {selectedAnalytic.title}</span>
                  <Button variant="outline" size="sm" onClick={() => setSelectedAnalytic(null)}>
                    Fermer
                  </Button>
                </CardTitle>
                <p className="text-gray-500">{selectedAnalytic.description}</p>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="data">
                  <TabsList>
                    <TabsTrigger value="data">Données</TabsTrigger>
                    <TabsTrigger value="monetization">Monétisation</TabsTrigger>
                    <TabsTrigger value="anonymization">Anonymisation</TabsTrigger>
                  </TabsList>

                  <TabsContent value="data" className="mt-4">
                    {/* Formatted Data Display instead of raw JSON */}
                    <div className="space-y-4">
                      {/* Summary Card */}
                      {selectedAnalytic.summary && (
                        <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                          <h4 className="font-semibold text-emerald-800 mb-2">Résumé</h4>
                          {typeof selectedAnalytic.summary === 'string' ? (
                            <p className="text-emerald-700">{selectedAnalytic.summary}</p>
                          ) : (
                            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
                              {Object.entries(selectedAnalytic.summary).map(([key, value]) => (
                                <div key={key} className="text-center">
                                  <p className="text-xs text-emerald-600 uppercase tracking-wide">
                                    {key.replace(/_/g, ' ')}
                                  </p>
                                  <p className="font-bold text-emerald-800">
                                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Data Grid */}
                      {selectedAnalytic.data && (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {Object.entries(selectedAnalytic.data).map(([key, value]) => (
                            <div key={key} className="p-4 bg-gray-50 rounded-lg border">
                              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                                {key.replace(/_/g, ' ')}
                              </p>
                              <p className="font-semibold text-gray-900">
                                {typeof value === 'object' 
                                  ? Array.isArray(value) 
                                    ? value.length + ' éléments'
                                    : Object.keys(value).length + ' propriétés'
                                  : typeof value === 'number' 
                                    ? value.toLocaleString('fr-FR')
                                    : String(value)
                                }
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Metrics if available */}
                      {selectedAnalytic.metrics && (
                        <div className="mt-4">
                          <h4 className="font-semibold text-gray-800 mb-3">Métriques Clés</h4>
                          <div className="grid md:grid-cols-4 gap-3">
                            {Object.entries(selectedAnalytic.metrics).map(([key, value]) => (
                              <div key={key} className="p-3 bg-blue-50 rounded-lg text-center">
                                <p className="text-2xl font-bold text-blue-700">
                                  {typeof value === 'number' 
                                    ? value.toLocaleString('fr-FR') 
                                    : typeof value === 'object'
                                      ? Array.isArray(value) ? value.length : Object.keys(value).length
                                      : String(value)}
                                </p>
                                <p className="text-xs text-blue-600 capitalize">{key.replace(/_/g, ' ')}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Regions breakdown if available */}
                      {selectedAnalytic.by_region && (
                        <div className="mt-4">
                          <h4 className="font-semibold text-gray-800 mb-3">Par Région</h4>
                          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {Object.entries(selectedAnalytic.by_region).map(([region, data]) => (
                              <div key={region} className="p-3 bg-gray-50 rounded-lg border">
                                <p className="font-medium text-gray-900">{region}</p>
                                <p className="text-sm text-gray-600">
                                  {typeof data === 'object' 
                                    ? Object.entries(data).map(([k, v]) => `${k}: ${v}`).join(', ')
                                    : data
                                  }
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="monetization" className="mt-4">
                    {selectedAnalytic.monetization && (
                      <div className="grid md:grid-cols-3 gap-4">
                        {Object.entries(selectedAnalytic.monetization).map(([key, value]) => (
                          <div key={key} className="p-4 bg-green-50 rounded-lg">
                            <p className="text-sm text-gray-600 capitalize">{key.replace(/_/g, ' ')}</p>
                            <p className="font-bold text-green-700">
                              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="anonymization" className="mt-4">
                    {selectedAnalytic.anonymization && (
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-3">
                          <CheckCircle2 className="w-5 h-5 text-blue-600" />
                          <span className="font-medium text-blue-900">Garanties d'anonymisation</span>
                        </div>
                        <ul className="space-y-2">
                          {Object.entries(selectedAnalytic.anonymization).map(([key, value]) => (
                            <li key={key} className="flex items-center gap-2 text-sm">
                              <span className="text-gray-600 capitalize">{key.replace(/_/g, ' ')}:</span>
                              <span className="font-medium text-gray-900">
                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}

          {/* Value Proposition */}
          <Card>
            <CardHeader>
              <CardTitle>Proposition de Valeur par Type d'Acheteur</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <Building2 className="w-8 h-8 text-blue-600 mb-2" />
                  <p className="font-bold text-gray-900">Gouvernements</p>
                  <ul className="text-sm text-gray-600 mt-2 space-y-1">
                    <li>• Ministère Agriculture CI</li>
                    <li>• Planification NDC</li>
                    <li>• Suivi ODD 13, 15</li>
                  </ul>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <Globe2 className="w-8 h-8 text-green-600 mb-2" />
                  <p className="font-bold text-gray-900">Organisations Int.</p>
                  <ul className="text-sm text-gray-600 mt-2 space-y-1">
                    <li>• FAO, Banque Mondiale</li>
                    <li>• PNUE, UNFCCC</li>
                    <li>• Commission Européenne</li>
                  </ul>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <Leaf className="w-8 h-8 text-yellow-600 mb-2" />
                  <p className="font-bold text-gray-900">ONG</p>
                  <ul className="text-sm text-gray-600 mt-2 space-y-1">
                    <li>• WWF, Rainforest Alliance</li>
                    <li>• Solidaridad</li>
                    <li>• Programmes carbone</li>
                  </ul>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <DollarSign className="w-8 h-8 text-purple-600 mb-2" />
                  <p className="font-bold text-gray-900">Entreprises RSE</p>
                  <ul className="text-sm text-gray-600 mt-2 space-y-1">
                    <li>• Nestlé, Barry Callebaut</li>
                    <li>• Cargill, Olam</li>
                    <li>• Offsetting corporate</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PremiumAnalyticsDashboard;

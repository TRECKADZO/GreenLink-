import { tokenService } from "../../services/tokenService";
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import Navbar from '../../components/Navbar';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  AlertTriangle, Bell, CheckCircle2, Clock, Filter,
  Shield, Users, Eye, RefreshCcw, Search, ChevronRight,
  AlertCircle, XCircle, FileText, TrendingUp, Download, BarChart3, Radio
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const apiClient = {
  get: async (url) => {
    const token = tokenService.getToken();
    return axios.get(`${API_URL}${url}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
  },
  put: async (url, data) => {
    const token = tokenService.getToken();
    return axios.put(`${API_URL}${url}`, data, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
  },
  post: async (url, data) => {
    const token = tokenService.getToken();
    return axios.post(`${API_URL}${url}`, data, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
  }
};

const ICIAlertsDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('alerts');
  const [alerts, setAlerts] = useState([]);
  const [alertsStats, setAlertsStats] = useState({});
  const [metrics, setMetrics] = useState(null);
  const [ssrteVisits, setSsrteVisits] = useState([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (authLoading) return;
    if (!user || user.user_type !== 'admin') {
      toast.error('Accès refusé', { description: 'Réservé aux administrateurs' });
      navigate('/');
      return;
    }
    fetchAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [alertsRes, metricsRes, visitsRes] = await Promise.all([
        apiClient.get('/api/ici-data/alerts'),
        apiClient.get('/api/ici-data/metrics/calculate'),
        apiClient.get('/api/ici-data/ssrte/visits?limit=20')
      ]);
      setAlerts(alertsRes.data.alerts || []);
      setAlertsStats(alertsRes.data.stats || {});
      setMetrics(metricsRes.data);
      setSsrteVisits(visitsRes.data.visits || []);
    } catch (error) {
      /* error logged */
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeAlert = async (alertId) => {
    try {
      await apiClient.put(`/api/ici-data/alerts/${alertId}/acknowledge`);
      toast.success('Alerte prise en charge');
      fetchAllData();
    } catch (error) {
      toast.error('Erreur lors de la prise en charge');
    }
  };

  const resolveAlert = async (alertId) => {
    try {
      await apiClient.put(`/api/ici-data/alerts/${alertId}/resolve?resolution_note=Résolu via dashboard`);
      toast.success('Alerte résolue');
      fetchAllData();
    } catch (error) {
      toast.error('Erreur lors de la résolution');
    }
  };

  const generateWeeklyReport = async () => {
    try {
      await apiClient.post('/api/ici-data/reports/weekly-summary', {});
      toast.success('Rapport hebdomadaire généré et envoyé');
    } catch (error) {
      toast.error('Erreur lors de la génération du rapport');
    }
  };

  const exportCSV = async (type) => {
    try {
      const token = tokenService.getToken();
      const response = await axios.get(`${API_URL}/api/ici-export/${type}/csv`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Export CSV téléchargé');
    } catch (error) {
      toast.error('Erreur lors de l\'export');
    }
  };

  const exportFullJSON = async () => {
    try {
      const response = await apiClient.get('/api/ici-export/full-report/json');
      const dataStr = JSON.stringify(response.data, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport_ici_complet_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      toast.success('Rapport JSON téléchargé');
    } catch (error) {
      toast.error('Erreur lors de l\'export');
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-blue-500 text-white';
      default: return 'bg-slate-500 text-white';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return <XCircle className="w-4 h-4" />;
      case 'high': return <AlertTriangle className="w-4 h-4" />;
      case 'medium': return <AlertCircle className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filterStatus && alert.status !== filterStatus) return false;
    if (filterSeverity && alert.severity !== filterSeverity) return false;
    if (searchQuery && !alert.message.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Navbar />
        <div className="pt-24 flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      
      <div className="pt-24 pb-12 px-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <Shield className="w-6 h-6 text-red-400" />
                </div>
                <h1 className="text-2xl font-bold">Centre d'Alertes ICI</h1>
              </div>
              <p className="text-slate-400">Système de suivi et alertes travail des enfants</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button 
                variant="outline" 
                className="border-green-700 text-green-400 hover:bg-green-800/20"
                onClick={() => navigate('/admin/realtime')}
              >
                <Radio className="w-4 h-4 mr-2" />
                Temps Réel
              </Button>
              <Button 
                variant="outline" 
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
                onClick={() => navigate('/admin/cooperative-comparison')}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Comparatif
              </Button>
              <Button 
                variant="outline" 
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
                onClick={fetchAllData}
              >
                <RefreshCcw className="w-4 h-4 mr-2" />
                Actualiser
              </Button>
              <Button 
                className="bg-amber-500 text-white hover:bg-amber-600"
                onClick={generateWeeklyReport}
              >
                <FileText className="w-4 h-4 mr-2" />
                Générer Rapport
              </Button>
            </div>
          </div>

          {/* Alert Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-red-500/10 border-red-500/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <XCircle className="w-5 h-5 text-red-400" />
                  <Badge className="bg-red-500 text-white text-xs">CRITIQUE</Badge>
                </div>
                <p className="text-3xl font-bold text-red-400">{alertsStats.total_critical || 0}</p>
                <p className="text-xs text-slate-400">Alertes critiques</p>
              </CardContent>
            </Card>

            <Card className="bg-orange-500/10 border-orange-500/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <AlertTriangle className="w-5 h-5 text-orange-400" />
                  <Badge className="bg-orange-500 text-white text-xs">HAUTE</Badge>
                </div>
                <p className="text-3xl font-bold text-orange-400">{alertsStats.total_high || 0}</p>
                <p className="text-xs text-slate-400">Alertes hautes</p>
              </CardContent>
            </Card>

            <Card className="bg-blue-500/10 border-blue-500/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Bell className="w-5 h-5 text-blue-400" />
                  <Badge className="bg-blue-500/20 text-blue-400 text-xs">NOUVELLES</Badge>
                </div>
                <p className="text-3xl font-bold text-blue-400">{alertsStats.total_new || 0}</p>
                <p className="text-xs text-slate-400">Non traitées</p>
              </CardContent>
            </Card>

            <Card className="bg-green-500/10 border-green-500/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <Badge className="bg-green-500/20 text-green-400 text-xs">SSRTE</Badge>
                </div>
                <p className="text-3xl font-bold text-green-400">{metrics?.ssrte?.taux_couverture || 0}%</p>
                <p className="text-xs text-slate-400">Couverture SSRTE</p>
              </CardContent>
            </Card>
          </div>

          {/* Metrics Summary */}
          {metrics && (
            <Card className="bg-gradient-to-r from-slate-900 via-purple-900/20 to-slate-900 border-purple-500/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                  Métriques ICI en temps réel
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="p-3 bg-slate-800/50 rounded-lg">
                    <p className="text-slate-400 text-sm">Producteurs profilés</p>
                    <p className="text-2xl font-bold text-white">{metrics.couverture?.profils_ici_complets || 0}</p>
                    <p className="text-xs text-purple-400">{metrics.couverture?.taux_completion_profil || 0}% complétés</p>
                  </div>
                  <div className="p-3 bg-slate-800/50 rounded-lg">
                    <p className="text-slate-400 text-sm">Enfants identifiés</p>
                    <p className="text-2xl font-bold text-red-400">{metrics.travail_enfants?.total_enfants_identifies || 0}</p>
                    <p className="text-xs text-slate-500">{metrics.travail_enfants?.menages_avec_enfants_travaillant || 0} ménages</p>
                  </div>
                  <div className="p-3 bg-slate-800/50 rounded-lg">
                    <p className="text-slate-400 text-sm">Risque élevé</p>
                    <p className="text-2xl font-bold text-orange-400">{metrics.risques?.pourcentage_risque_eleve || 0}%</p>
                    <p className="text-xs text-slate-500">{metrics.risques?.distribution?.eleve || 0} producteurs</p>
                  </div>
                  <div className="p-3 bg-slate-800/50 rounded-lg">
                    <p className="text-slate-400 text-sm">Visites SSRTE (30j)</p>
                    <p className="text-2xl font-bold text-green-400">{metrics.ssrte?.visites_dernier_mois || 0}</p>
                    <p className="text-xs text-slate-500">{metrics.ssrte?.visites_totales || 0} total</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-slate-900 border-slate-800">
              <TabsTrigger value="alerts" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Alertes ({filteredAlerts.length})
              </TabsTrigger>
              <TabsTrigger value="ssrte" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">
                <Eye className="w-4 h-4 mr-2" />
                Visites SSRTE
              </TabsTrigger>
            </TabsList>

            {/* Tab: Alerts */}
            <TabsContent value="alerts" className="mt-6 space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    placeholder="Rechercher..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-slate-900 border-slate-700 text-white"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white text-sm"
                >
                  <option value="">Tous les statuts</option>
                  <option value="new">Nouvelles</option>
                  <option value="acknowledged">En cours</option>
                  <option value="resolved">Résolues</option>
                </select>
                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                  className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white text-sm"
                >
                  <option value="">Toutes sévérités</option>
                  <option value="critical">Critique</option>
                  <option value="high">Haute</option>
                  <option value="medium">Moyenne</option>
                  <option value="low">Basse</option>
                </select>
              </div>

              {/* Alerts List */}
              <div className="space-y-3">
                {filteredAlerts.length === 0 ? (
                  <Card className="bg-slate-900 border-slate-800">
                    <CardContent className="p-8 text-center">
                      <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
                      <p className="text-slate-400">Aucune alerte à afficher</p>
                    </CardContent>
                  </Card>
                ) : (
                  filteredAlerts.map((alert) => (
                    <Card 
                      key={alert.id} 
                      className={`bg-slate-900 border-l-4 ${
                        alert.severity === 'critical' ? 'border-l-red-500' :
                        alert.severity === 'high' ? 'border-l-orange-500' :
                        alert.severity === 'medium' ? 'border-l-yellow-500' :
                        'border-l-blue-500'
                      } border-slate-800`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1">
                            <div className={`p-2 rounded-lg ${
                              alert.severity === 'critical' ? 'bg-red-500/20' :
                              alert.severity === 'high' ? 'bg-orange-500/20' :
                              alert.severity === 'medium' ? 'bg-yellow-500/20' :
                              'bg-blue-500/20'
                            }`}>
                              {getSeverityIcon(alert.severity)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className={getSeverityColor(alert.severity)}>
                                  {alert.severity?.toUpperCase()}
                                </Badge>
                                <Badge className="bg-slate-700 text-slate-300">
                                  {alert.type?.replace('_', ' ')}
                                </Badge>
                                {alert.resolved && (
                                  <Badge className="bg-green-500/20 text-green-400">Résolu</Badge>
                                )}
                                {alert.acknowledged && !alert.resolved && (
                                  <Badge className="bg-blue-500/20 text-blue-400">En cours</Badge>
                                )}
                              </div>
                              <p className="text-white mb-1">{alert.message}</p>
                              <div className="flex items-center gap-4 text-xs text-slate-500">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatDate(alert.created_at)}
                                </span>
                                <span>ID: {alert.farmer_id?.slice(-8)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {!alert.acknowledged && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-blue-500 text-blue-400 hover:bg-blue-500/20"
                                onClick={() => acknowledgeAlert(alert.id)}
                              >
                                Prendre en charge
                              </Button>
                            )}
                            {alert.acknowledged && !alert.resolved && (
                              <Button
                                size="sm"
                                className="bg-green-500 text-white hover:bg-green-600"
                                onClick={() => resolveAlert(alert.id)}
                              >
                                Marquer résolu
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Tab: SSRTE Visits */}
            <TabsContent value="ssrte" className="mt-6">
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white text-lg">
                    <Eye className="w-5 h-5 text-green-400" />
                    Dernières visites SSRTE
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {ssrteVisits.length === 0 ? (
                    <p className="text-slate-400 text-center py-8">Aucune visite SSRTE enregistrée</p>
                  ) : (
                    <div className="space-y-3">
                      {ssrteVisits.map((visit, index) => (
                        <div 
                          key={visit.id || index}
                          className="p-4 bg-slate-800/50 rounded-lg flex items-center justify-between"
                        >
                          <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-lg ${
                              visit.niveau_risque === 'critique' ? 'bg-red-500/20' :
                              visit.niveau_risque === 'eleve' ? 'bg-orange-500/20' :
                              visit.niveau_risque === 'modere' ? 'bg-yellow-500/20' :
                              'bg-green-500/20'
                            }`}>
                              <Users className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="text-white font-medium">Producteur: {visit.farmer_id?.slice(-8)}</p>
                              <p className="text-slate-400 text-sm">{formatDate(visit.date_visite)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-sm text-slate-400">Enfants observés</p>
                              <p className={`font-bold ${visit.enfants_observes_travaillant > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                {visit.enfants_observes_travaillant}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-slate-400">Tâches dangereuses</p>
                              <p className={`font-bold ${visit.taches_dangereuses_count > 0 ? 'text-orange-400' : 'text-green-400'}`}>
                                {visit.taches_dangereuses_count}
                              </p>
                            </div>
                            <Badge className={`${
                              visit.niveau_risque === 'critique' ? 'bg-red-500' :
                              visit.niveau_risque === 'eleve' ? 'bg-orange-500' :
                              visit.niveau_risque === 'modere' ? 'bg-yellow-500 text-black' :
                              'bg-green-500'
                            }`}>
                              {visit.niveau_risque?.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Export Section */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Download className="w-5 h-5 text-green-400" />
                Exporter les données ICI
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-4">
                <Button 
                  variant="outline" 
                  className="border-slate-700 text-slate-300 hover:bg-slate-800 h-auto py-3"
                  onClick={() => exportCSV('alerts')}
                >
                  <div className="text-left">
                    <p className="font-medium">Alertes CSV</p>
                    <p className="text-xs text-slate-500">Toutes les alertes</p>
                  </div>
                </Button>
                <Button 
                  variant="outline" 
                  className="border-slate-700 text-slate-300 hover:bg-slate-800 h-auto py-3"
                  onClick={() => exportCSV('ssrte-visits')}
                >
                  <div className="text-left">
                    <p className="font-medium">Visites SSRTE CSV</p>
                    <p className="text-xs text-slate-500">Historique visites</p>
                  </div>
                </Button>
                <Button 
                  variant="outline" 
                  className="border-slate-700 text-slate-300 hover:bg-slate-800 h-auto py-3"
                  onClick={() => exportCSV('profiles')}
                >
                  <div className="text-left">
                    <p className="font-medium">Profils ICI CSV</p>
                    <p className="text-xs text-slate-500">Données producteurs</p>
                  </div>
                </Button>
                <Button 
                  className="bg-green-500 text-white hover:bg-green-600 h-auto py-3"
                  onClick={exportFullJSON}
                >
                  <div className="text-left">
                    <p className="font-medium">Rapport Complet JSON</p>
                    <p className="text-xs text-green-200">Toutes les données</p>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ICIAlertsDashboard;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import Navbar from '../../components/Navbar';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  Building2, Users, Eye, AlertTriangle, TrendingUp,
  Award, RefreshCcw, Download, BarChart3, MapPin,
  Trophy, Medal, Target, ChevronUp, ChevronDown, ChevronLeft
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

const CooperativeComparison = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.user_type !== 'admin') {
      toast.error('Accès refusé', { description: 'Réservé aux administrateurs' });
      navigate('/');
      return;
    }
    fetchData();
  }, [user, authLoading]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/api/ici-export/cooperatives/compare');
      setData(response.data);
    } catch (error) {
      console.error('Error fetching comparison data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (index) => {
    if (index === 0) return <Trophy className="w-5 h-5 text-yellow-400" />;
    if (index === 1) return <Medal className="w-5 h-5 text-gray-400" />;
    if (index === 2) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="w-5 h-5 text-slate-500 font-bold">{index + 1}</span>;
  };

  const getProgressColor = (value) => {
    if (value >= 80) return 'bg-green-500';
    if (value >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Navbar />
        <div className="pt-24 flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
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
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/admin')}
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Retour
              </Button>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <BarChart3 className="w-6 h-6 text-purple-400" />
                  </div>
                  <h1 className="text-2xl font-bold">Tableau Comparatif Coopératives</h1>
                </div>
                <p className="text-slate-400">Analyse comparative des performances ICI entre coopératives</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
              onClick={fetchData}
            >
              <RefreshCcw className="w-4 h-4 mr-2" />
              Actualiser
            </Button>
          </div>

          {/* National Averages */}
          {data?.national_averages && (
            <Card className="bg-gradient-to-r from-purple-900/30 via-slate-900 to-blue-900/30 border-purple-500/30">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-400" />
                  Moyennes Nationales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                    <p className="text-3xl font-bold text-white">{data.national_averages.avg_membres_par_coop}</p>
                    <p className="text-sm text-slate-400">Membres par coopérative</p>
                  </div>
                  <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                    <p className="text-3xl font-bold text-green-400">{data.national_averages.avg_taux_completion_ici}%</p>
                    <p className="text-sm text-slate-400">Taux moyen complétion ICI</p>
                  </div>
                  <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                    <p className="text-3xl font-bold text-blue-400">{data.national_averages.avg_visites_ssrte_par_coop}</p>
                    <p className="text-sm text-slate-400">Visites SSRTE par coopérative</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Rankings Summary */}
          {data?.rankings && (
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="bg-yellow-500/10 border-yellow-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Trophy className="w-8 h-8 text-yellow-400" />
                    <div>
                      <p className="text-sm text-yellow-400">Meilleur taux ICI</p>
                      <p className="text-lg font-bold text-white">{data.rankings.meilleur_taux_ici}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-blue-500/10 border-blue-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Eye className="w-8 h-8 text-blue-400" />
                    <div>
                      <p className="text-sm text-blue-400">Plus de visites SSRTE</p>
                      <p className="text-lg font-bold text-white">{data.rankings.plus_de_visites_ssrte}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Cooperatives Ranking Table */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-green-400" />
                  Classement des Coopératives ({data?.total_cooperatives || 0})
                </span>
                <Badge className="bg-slate-700 text-slate-300">
                  Trié par taux ICI
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data?.cooperatives?.map((coop, index) => (
                  <div 
                    key={coop.coop_id}
                    className={`p-4 rounded-lg ${
                      index === 0 ? 'bg-yellow-500/10 border border-yellow-500/30' :
                      index === 1 ? 'bg-slate-400/10 border border-slate-400/30' :
                      index === 2 ? 'bg-amber-600/10 border border-amber-600/30' :
                      'bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 flex items-center justify-center">
                          {getRankIcon(index)}
                        </div>
                        <div>
                          <p className="font-bold text-white">{coop.coop_name}</p>
                          <p className="text-xs text-slate-400">
                            <MapPin className="w-3 h-3 inline mr-1" />
                            {coop.region} • Code: {coop.coop_code}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {coop.metrics.alertes_actives > 0 && (
                          <Badge className="bg-red-500/20 text-red-400">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            {coop.metrics.alertes_actives} alertes
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Membres</p>
                        <p className="text-lg font-bold text-white">{coop.metrics.total_membres}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Taux ICI</p>
                        <div className="flex items-center gap-2">
                          <p className={`text-lg font-bold ${
                            coop.metrics.taux_completion_ici >= 80 ? 'text-green-400' :
                            coop.metrics.taux_completion_ici >= 50 ? 'text-amber-400' : 'text-red-400'
                          }`}>
                            {coop.metrics.taux_completion_ici}%
                          </p>
                          {index > 0 && data?.cooperatives?.[index - 1] && (
                            coop.metrics.taux_completion_ici > data.cooperatives[index - 1].metrics.taux_completion_ici
                              ? <ChevronUp className="w-4 h-4 text-green-400" />
                              : <ChevronDown className="w-4 h-4 text-red-400" />
                          )}
                        </div>
                        <Progress 
                          value={coop.metrics.taux_completion_ici} 
                          className={`h-1 mt-1 ${getProgressColor(coop.metrics.taux_completion_ici)}`}
                        />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Visites SSRTE</p>
                        <p className="text-lg font-bold text-blue-400">{coop.metrics.visites_ssrte}</p>
                        <p className="text-xs text-slate-500">{coop.metrics.taux_couverture_ssrte}% couverture</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Risque élevé</p>
                        <p className={`text-lg font-bold ${
                          coop.metrics.taux_risque_eleve > 30 ? 'text-red-400' :
                          coop.metrics.taux_risque_eleve > 10 ? 'text-amber-400' : 'text-green-400'
                        }`}>
                          {coop.metrics.producteurs_risque_eleve}
                        </p>
                        <p className="text-xs text-slate-500">{coop.metrics.taux_risque_eleve}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Profils ICI</p>
                        <p className="text-lg font-bold text-purple-400">{coop.metrics.profils_ici_complets}</p>
                      </div>
                    </div>
                  </div>
                ))}

                {(!data?.cooperatives || data.cooperatives.length === 0) && (
                  <p className="text-slate-500 text-center py-8">Aucune coopérative trouvée</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Export Options */}
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">Exporter les données</p>
                  <p className="text-sm text-slate-400">Télécharger le rapport comparatif</p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="border-slate-700 text-slate-300 hover:bg-slate-800"
                    onClick={() => {
                      const dataStr = JSON.stringify(data, null, 2);
                      const blob = new Blob([dataStr], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `comparatif_cooperatives_${new Date().toISOString().split('T')[0]}.json`;
                      a.click();
                    }}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    JSON
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CooperativeComparison;

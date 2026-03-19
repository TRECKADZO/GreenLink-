import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import Navbar from '../../components/Navbar';
import { toast } from 'sonner';
import { 
  Eye, Users, AlertTriangle, TrendingUp, TrendingDown,
  Calendar, BarChart3, PieChart, Activity, RefreshCcw,
  ChevronLeft, Download, Filter, Clock, Shield, Baby,
  Award, Building2
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const SSRTEAnalytics = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');
  const [dashboardData, setDashboardData] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !['admin', 'super_admin'].includes(user.user_type)) {
      toast.error('Accès non autorisé');
      navigate('/');
      return;
    }
    loadData();
  }, [user, authLoading, period, navigate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Charger le dashboard
      const dashboardRes = await fetch(`${API_URL}/api/ssrte/dashboard?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (dashboardRes.ok) {
        setDashboardData(await dashboardRes.json());
      }
      
      // Charger le leaderboard
      const leaderboardRes = await fetch(`${API_URL}/api/ssrte/leaderboard?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (leaderboardRes.ok) {
        setLeaderboard(await leaderboardRes.json());
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'critique': return 'bg-red-500';
      case 'eleve': return 'bg-orange-500';
      case 'modere': return 'bg-yellow-500';
      default: return 'bg-green-500';
    }
  };

  const formatChange = (value) => {
    if (value > 0) return { icon: TrendingUp, color: 'text-green-400', text: `+${value}%` };
    if (value < 0) return { icon: TrendingDown, color: 'text-red-400', text: `${value}%` };
    return { icon: Activity, color: 'text-slate-400', text: '0%' };
  };

  const KPICard = ({ title, value, subtitle, change, icon: Icon, color = 'blue' }) => {
    const changeInfo = formatChange(change);
    const ChangeIcon = changeInfo.icon;
    
    return (
      <Card className={`bg-gradient-to-br from-${color}-900/50 to-${color}-950/50 border-${color}-500/30`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Icon className={`w-5 h-5 text-${color}-400`} />
            {change !== undefined && (
              <div className={`flex items-center gap-1 ${changeInfo.color} text-xs`}>
                <ChangeIcon className="w-3 h-3" />
                {changeInfo.text}
              </div>
            )}
          </div>
          <p className={`text-3xl font-bold text-${color}-400`}>{value}</p>
          <p className="text-xs text-slate-400">{title}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
        </CardContent>
      </Card>
    );
  };

  if (loading && !dashboardData) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <Navbar />
        <div className="pt-24 flex items-center justify-center">
          <RefreshCcw className="w-8 h-8 text-emerald-400 animate-spin" />
        </div>
      </div>
    );
  }

  const kpis = dashboardData?.kpis || {};
  const riskDist = dashboardData?.risk_distribution || {};
  const trends = dashboardData?.trends || [];
  const dangerousTasks = dashboardData?.dangerous_tasks || [];
  const supportProvided = dashboardData?.support_provided || [];
  const livingConditions = dashboardData?.living_conditions || {};

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      
      <div className="pt-24 pb-12 px-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate(-1)}
                  className="text-slate-400 hover:text-white"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <Eye className="w-8 h-8 text-purple-400" />
                <h1 className="text-2xl font-bold">Analytics SSRTE</h1>
              </div>
              <p className="text-slate-400">
                Systeme de Suivi et Remediation du Travail des Enfants
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-32 bg-slate-900 border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">7 jours</SelectItem>
                  <SelectItem value="30d">30 jours</SelectItem>
                  <SelectItem value="90d">90 jours</SelectItem>
                  <SelectItem value="1y">1 an</SelectItem>
                  <SelectItem value="all">Tout</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                className="border-slate-700"
                onClick={loadData}
              >
                <RefreshCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* KPIs Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4" data-testid="ssrte-kpis">
            <Card className="bg-gradient-to-br from-purple-900/50 to-purple-950/50 border-purple-500/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Eye className="w-5 h-5 text-purple-400" />
                  {kpis.visits_change_percent !== undefined && (
                    <div className={`flex items-center gap-1 text-xs ${kpis.visits_change_percent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {kpis.visits_change_percent >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {kpis.visits_change_percent}%
                    </div>
                  )}
                </div>
                <p className="text-3xl font-bold text-purple-400">{kpis.total_visits || 0}</p>
                <p className="text-xs text-slate-400">Visites totales</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-900/50 to-blue-950/50 border-blue-500/30">
              <CardContent className="p-4">
                <Users className="w-5 h-5 text-blue-400 mb-2" />
                <p className="text-3xl font-bold text-blue-400">{kpis.unique_farmers_visited || 0}</p>
                <p className="text-xs text-slate-400">Producteurs visites</p>
                <p className="text-xs text-blue-400/70 mt-1">{kpis.coverage_rate}% couverture</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-900/50 to-red-950/50 border-red-500/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Baby className="w-5 h-5 text-red-400" />
                  {kpis.children_change_percent !== undefined && (
                    <div className={`flex items-center gap-1 text-xs ${kpis.children_change_percent <= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {kpis.children_change_percent <= 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                      {Math.abs(kpis.children_change_percent)}%
                    </div>
                  )}
                </div>
                <p className="text-3xl font-bold text-red-400">{kpis.total_children_identified || 0}</p>
                <p className="text-xs text-slate-400">Enfants identifies</p>
                <p className="text-xs text-red-400/70 mt-1">{kpis.visits_with_children_percent}% des visites</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-900/50 to-emerald-950/50 border-emerald-500/30">
              <CardContent className="p-4">
                <Shield className="w-5 h-5 text-emerald-400 mb-2" />
                <p className="text-3xl font-bold text-emerald-400">{kpis.coverage_rate || 0}%</p>
                <p className="text-xs text-slate-400">Taux de couverture</p>
                <p className="text-xs text-emerald-400/70 mt-1">{kpis.unique_farmers_visited}/{kpis.total_farmers}</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-cyan-900/50 to-cyan-950/50 border-cyan-500/30">
              <CardContent className="p-4">
                <Award className="w-5 h-5 text-cyan-400 mb-2" />
                <p className="text-3xl font-bold text-cyan-400">{livingConditions.scolarisation_rate || 0}%</p>
                <p className="text-xs text-slate-400">Taux scolarisation</p>
                <p className="text-xs text-cyan-400/70 mt-1">{livingConditions.children_scolarise || 0}/{livingConditions.total_children_registered || 0}</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-900/50 to-amber-950/50 border-amber-500/30">
              <CardContent className="p-4">
                <Activity className="w-5 h-5 text-amber-400 mb-2" />
                <p className="text-3xl font-bold text-amber-400">{livingConditions.avg_household_size || 0}</p>
                <p className="text-xs text-slate-400">Taille moy. menage</p>
                <p className="text-xs text-amber-400/70 mt-1">{livingConditions.avg_distance_ecole_km || 0} km ecole</p>
              </CardContent>
            </Card>
          </div>

          {/* Living Conditions Analysis */}
          <div className="grid md:grid-cols-3 gap-6" data-testid="ssrte-conditions">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-teal-400" />
                  Conditions de vie
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { key: 'precaires', label: 'Precaires', color: 'red' },
                  { key: 'moyennes', label: 'Moyennes', color: 'yellow' },
                  { key: 'bonnes', label: 'Bonnes', color: 'green' },
                  { key: 'tres_bonnes', label: 'Tres bonnes', color: 'emerald' }
                ].map(({ key, label, color }) => {
                  const count = livingConditions.conditions_distribution?.[key] || 0;
                  const total = Object.values(livingConditions.conditions_distribution || {}).reduce((a, b) => a + b, 0) || 1;
                  const pct = Math.round((count / total) * 100);
                  return (
                    <div key={key}>
                      <div className="flex justify-between mb-1 text-sm">
                        <span className={`text-${color}-400`}>{label}</span>
                        <span className="text-white font-medium">{count} ({pct}%)</span>
                      </div>
                      <Progress value={pct} className={`h-1.5 bg-slate-800 [&>div]:bg-${color}-500`} />
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-400" />
                  Acces services
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1 text-sm">
                    <span className="text-slate-300">Eau courante</span>
                    <span className="text-blue-400 font-bold">{livingConditions.eau_courante_percent || 0}%</span>
                  </div>
                  <Progress value={livingConditions.eau_courante_percent || 0} className="h-2 bg-slate-800 [&>div]:bg-blue-500" />
                </div>
                <div>
                  <div className="flex justify-between mb-1 text-sm">
                    <span className="text-slate-300">Electricite</span>
                    <span className="text-yellow-400 font-bold">{livingConditions.electricite_percent || 0}%</span>
                  </div>
                  <Progress value={livingConditions.electricite_percent || 0} className="h-2 bg-slate-800 [&>div]:bg-yellow-500" />
                </div>
                <div>
                  <div className="flex justify-between mb-1 text-sm">
                    <span className="text-slate-300">Scolarisation enfants</span>
                    <span className="text-emerald-400 font-bold">{livingConditions.scolarisation_rate || 0}%</span>
                  </div>
                  <Progress value={livingConditions.scolarisation_rate || 0} className="h-2 bg-slate-800 [&>div]:bg-emerald-500" />
                </div>
                <div className="pt-2 border-t border-slate-800 flex justify-between text-xs text-slate-400">
                  <span>Distance moy. ecole</span>
                  <span className="text-white font-medium">{livingConditions.avg_distance_ecole_km || 0} km</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Baby className="w-4 h-4 text-rose-400" />
                  Enfants enregistres
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-slate-800/50 text-center">
                    <p className="text-3xl font-bold text-white">{livingConditions.total_children_registered || 0}</p>
                    <p className="text-xs text-slate-400 mt-1">Total enfants documentes</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 rounded-lg bg-emerald-900/30 border border-emerald-700/30 text-center">
                      <p className="text-lg font-bold text-emerald-400">{livingConditions.children_scolarise || 0}</p>
                      <p className="text-xs text-slate-400">Scolarises</p>
                    </div>
                    <div className="p-2 rounded-lg bg-red-900/30 border border-red-700/30 text-center">
                      <p className="text-lg font-bold text-red-400">{livingConditions.children_travaillant || 0}</p>
                      <p className="text-xs text-slate-400">Travaillant</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Risk Distribution & Trends */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Risk Distribution */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-orange-400" />
                  Distribution des risques
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { level: 'critique', label: 'Critique', color: 'red' },
                  { level: 'eleve', label: 'Élevé', color: 'orange' },
                  { level: 'modere', label: 'Modéré', color: 'yellow' },
                  { level: 'faible', label: 'Faible', color: 'green' }
                ].map(({ level, label, color }) => {
                  const count = riskDist[level] || 0;
                  const total = Object.values(riskDist).reduce((a, b) => a + b, 0) || 1;
                  const percent = Math.round((count / total) * 100);
                  
                  return (
                    <div key={level}>
                      <div className="flex justify-between mb-1">
                        <span className={`text-${color}-400`}>{label}</span>
                        <span className="text-white font-bold">{count} ({percent}%)</span>
                      </div>
                      <Progress 
                        value={percent} 
                        className={`h-2 bg-slate-800 [&>div]:bg-${color}-500`}
                      />
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Trends Chart (simplified) */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-400" />
                  Tendance des visites
                </CardTitle>
              </CardHeader>
              <CardContent>
                {trends.length > 0 ? (
                  <div className="space-y-2">
                    {trends.slice(-7).map((t, i) => {
                      const maxVisits = Math.max(...trends.map(x => x.visits)) || 1;
                      const percent = (t.visits / maxVisits) * 100;
                      
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-slate-500 text-xs w-20 truncate">{t.date}</span>
                          <div className="flex-1 h-6 bg-slate-800 rounded overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-purple-600 to-blue-500 flex items-center px-2"
                              style={{ width: `${percent}%` }}
                            >
                              <span className="text-white text-xs font-bold">{t.visits}</span>
                            </div>
                          </div>
                          {t.critical > 0 && (
                            <Badge className="bg-red-500 text-xs">{t.critical}</Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-slate-500 text-center py-8">Aucune donnée disponible</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Dangerous Tasks & Support */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Dangerous Tasks */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  Tâches dangereuses fréquentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dangerousTasks.length > 0 ? (
                  <div className="space-y-2">
                    {dangerousTasks.map((task, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-slate-800/50 rounded">
                        <span className="text-slate-300 text-sm">{task.code}</span>
                        <Badge variant="outline" className="border-red-500/50 text-red-400">
                          {task.count} fois
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-center py-8">Aucune tâche enregistrée</p>
                )}
              </CardContent>
            </Card>

            {/* Support Provided */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-400" />
                  Support fourni
                </CardTitle>
              </CardHeader>
              <CardContent>
                {supportProvided.length > 0 ? (
                  <div className="space-y-2">
                    {supportProvided.map((support, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-slate-800/50 rounded">
                        <span className="text-slate-300 text-sm">{support.type}</span>
                        <Badge variant="outline" className="border-emerald-500/50 text-emerald-400">
                          {support.count} fois
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-center py-8">Aucun support enregistré</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Leaderboard */}
          {leaderboard && (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Top Agents */}
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Award className="w-5 h-5 text-yellow-400" />
                    Top Agents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {leaderboard.top_agents?.length > 0 ? (
                    <div className="space-y-2">
                      {leaderboard.top_agents.slice(0, 5).map((agent, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 bg-slate-800/50 rounded">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                            i === 0 ? 'bg-yellow-500 text-black' :
                            i === 1 ? 'bg-slate-400 text-black' :
                            i === 2 ? 'bg-orange-600 text-white' :
                            'bg-slate-700 text-slate-300'
                          }`}>
                            {i + 1}
                          </span>
                          <div className="flex-1">
                            <p className="text-white text-sm font-medium">{agent.agent_name}</p>
                            <p className="text-slate-500 text-xs">{agent.children_identified} enfants identifiés</p>
                          </div>
                          <Badge className="bg-purple-600">{agent.visits} visites</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-center py-8">Aucune donnée</p>
                  )}
                </CardContent>
              </Card>

              {/* Top Cooperatives */}
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-blue-400" />
                    Top Coopératives
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {leaderboard.top_cooperatives?.length > 0 ? (
                    <div className="space-y-2">
                      {leaderboard.top_cooperatives.slice(0, 5).map((coop, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 bg-slate-800/50 rounded">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                            i === 0 ? 'bg-yellow-500 text-black' :
                            i === 1 ? 'bg-slate-400 text-black' :
                            i === 2 ? 'bg-orange-600 text-white' :
                            'bg-slate-700 text-slate-300'
                          }`}>
                            {i + 1}
                          </span>
                          <div className="flex-1">
                            <p className="text-white text-sm font-medium">{coop.cooperative_name}</p>
                            <p className="text-slate-500 text-xs">{coop.farmers_visited} producteurs visités</p>
                          </div>
                          <Badge className="bg-blue-600">{coop.visits} visites</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-center py-8">Aucune donnée</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Recent Critical Visits */}
          {dashboardData?.recent_critical_visits?.length > 0 && (
            <Card className="bg-red-900/20 border-red-500/30">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  Visites critiques récentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {dashboardData.recent_critical_visits.map((visit, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                      <div>
                        <p className="text-white font-medium">{visit.farmer_name || 'Producteur'}</p>
                        <p className="text-slate-400 text-sm">
                          {visit.children_count} enfant(s) • {visit.dangerous_tasks?.length || 0} tâche(s) dangereuse(s)
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge className={getRiskColor(visit.risk_level)}>
                          {visit.risk_level?.toUpperCase()}
                        </Badge>
                        <p className="text-slate-500 text-xs mt-1">
                          {visit.date ? new Date(visit.date).toLocaleDateString('fr-FR') : 'N/A'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default SSRTEAnalytics;

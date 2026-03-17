import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, Users, MapPin, Leaf, Camera, 
  QrCode, TrendingUp, Award, ChevronRight,
  Home, Search, Phone, ClipboardCheck, Activity, 
  Target, Star, UserCircle, AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { toast } from 'sonner';
import Navbar from '../../components/Navbar';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const AgentTerrainDashboard = () => {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('dashboard');
  const [phone, setPhone] = useState('');
  const [searching, setSearching] = useState(false);
  const [farmer, setFarmer] = useState(null);

  const loadDashboard = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/field-agent/dashboard`, { headers: getAuthHeader() });
      if (res.ok) {
        setDashboard(await res.json());
      } else if (res.status === 403) {
        toast.error('Accès non autorisé');
      }
    } catch {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setSearching(true);
    setFarmer(null);
    try {
      const res = await fetch(`${API_URL}/api/agent/search?phone=${encodeURIComponent(phone.trim())}`, { headers: getAuthHeader() });
      const data = await res.json();
      if (data.found) {
        setFarmer(data.farmer);
        toast.success(`Planteur trouvé: ${data.farmer.full_name}`);
      } else {
        toast.error('Aucun planteur trouvé');
      }
    } catch {
      toast.error('Erreur réseau');
    }
    setSearching(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        <Navbar />
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600" />
        </div>
      </div>
    );
  }

  const info = dashboard?.agent_info || {};
  const perf = dashboard?.performance || {};
  const stats = dashboard?.statistics || {};
  const achievements = dashboard?.achievements || [];
  const activities = dashboard?.recent_activities || [];
  const risks = dashboard?.risk_distribution || {};

  const kpis = [
    { 
      label: 'Visites SSRTE', 
      value: stats.ssrte_visits?.total || 0,
      month: stats.ssrte_visits?.this_month || 0,
      target: stats.ssrte_visits?.target || 20,
      progress: stats.ssrte_visits?.progress || 0,
      icon: ClipboardCheck, color: 'text-emerald-500', bg: 'bg-emerald-50'
    },
    { 
      label: 'Membres Enregistrés', 
      value: stats.members_onboarded?.total || 0,
      target: stats.members_onboarded?.target || 10,
      progress: stats.members_onboarded?.progress || 0,
      icon: Users, color: 'text-blue-500', bg: 'bg-blue-50'
    },
    { 
      label: 'Parcelles Déclarées', 
      value: stats.parcels_declared?.total || 0,
      target: stats.parcels_declared?.target || 15,
      progress: stats.parcels_declared?.progress || 0,
      icon: MapPin, color: 'text-amber-500', bg: 'bg-amber-50'
    },
    { 
      label: 'Photos Géotag', 
      value: stats.geotagged_photos?.total || 0,
      target: stats.geotagged_photos?.target || 30,
      progress: stats.geotagged_photos?.progress || 0,
      icon: Camera, color: 'text-purple-500', bg: 'bg-purple-50'
    },
  ];

  const quickActions = [
    { label: 'Visite SSRTE', icon: ClipboardCheck, path: '/agent/ssrte', color: 'bg-emerald-600 hover:bg-emerald-700' },
    { label: 'Recherche Planteur', icon: Search, action: () => setTab('search'), color: 'bg-blue-600 hover:bg-blue-700' },
    { label: 'Scanner QR', icon: QrCode, path: '/agent/qr-scan', color: 'bg-purple-600 hover:bg-purple-700' },
  ];

  const riskColor = (level) => {
    switch(level) {
      case 'critique': return 'bg-red-100 text-red-700 border-red-200';
      case 'eleve': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'modere': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-green-100 text-green-700 border-green-200';
    }
  };

  const levelBadge = () => {
    const score = perf.score || 0;
    if (score >= 80) return { text: 'Expert', bg: 'bg-emerald-100 text-emerald-700', ring: 'ring-emerald-500' };
    if (score >= 50) return { text: 'Confirmé', bg: 'bg-amber-100 text-amber-700', ring: 'ring-amber-500' };
    return { text: 'Débutant', bg: 'bg-gray-100 text-gray-600', ring: 'ring-gray-400' };
  };

  const badge = levelBadge();

  return (
    <div className="min-h-screen bg-gray-50 pt-20" data-testid="agent-terrain-dashboard">
      <Navbar />

      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 text-white">
        <div className="max-w-5xl mx-auto px-4 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-14 h-14 rounded-full bg-white/20 flex items-center justify-center ring-2 ${badge.ring}`}>
                <Shield className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-lg font-bold" data-testid="agent-name">{info.name || 'Agent Terrain'}</h1>
                <p className="text-emerald-200 text-sm">{info.cooperative || 'Coopérative'} {info.zone ? `- ${info.zone}` : ''}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={`${badge.bg} px-3 py-1`} data-testid="agent-level">{badge.text}</Badge>
              <div className="text-center bg-white/10 rounded-lg px-4 py-2" data-testid="performance-score">
                <p className="text-2xl font-bold">{perf.score || 0}%</p>
                <p className="text-xs text-emerald-200">Performance</p>
              </div>
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10" onClick={() => navigate('/')}>
                <Home className="h-4 w-4 mr-1" /> Accueil
              </Button>
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10" onClick={() => navigate('/profile')}>
                <UserCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="max-w-5xl mx-auto px-4 mt-4">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1" data-testid="tab-navigation">
          {[
            { id: 'dashboard', label: 'Tableau de bord', icon: Activity },
            { id: 'search', label: 'Recherche', icon: Search },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              data-testid={`tab-${t.id}`}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
                tab === t.id ? 'bg-white shadow text-emerald-700' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        {tab === 'dashboard' && (
          <>
            {/* Quick Actions */}
            <div className="grid grid-cols-3 gap-3" data-testid="quick-actions">
              {quickActions.map((a, i) => (
                <Button
                  key={i}
                  className={`${a.color} text-white h-auto py-3 flex flex-col items-center gap-1`}
                  onClick={a.action || (() => navigate(a.path))}
                  data-testid={`quick-action-${i}`}
                >
                  <a.icon className="h-5 w-5" />
                  <span className="text-xs">{a.label}</span>
                </Button>
              ))}
            </div>

            {/* KPI Cards with Progress */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" data-testid="kpi-cards">
              {kpis.map((kpi, i) => (
                <Card key={i} className="border-0 shadow-sm" data-testid={`kpi-${i}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className={`p-2 rounded-lg ${kpi.bg}`}>
                        <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                      </div>
                      <span className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">{kpi.label}</p>
                    <Progress value={kpi.progress} className="h-1.5" />
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-gray-400">{kpi.month !== undefined ? `${kpi.month} ce mois` : ''}</span>
                      <span className="text-[10px] text-gray-400">Obj: {kpi.target}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Extra stats row */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-cyan-50">
                    <QrCode className="h-4 w-4 text-cyan-500" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-cyan-600">{stats.qr_scans || 0}</p>
                    <p className="text-xs text-gray-500">QR Scannés</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-red-600">{stats.children_identified || 0}</p>
                    <p className="text-xs text-gray-500">Enfants identifiés</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Risk distribution */}
            {(risks.critique > 0 || risks.eleve > 0 || risks.modere > 0 || risks.faible > 0) && (
              <Card className="border-0 shadow-sm" data-testid="risk-distribution">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Target className="h-4 w-4" /> Répartition des Risques
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="flex gap-2">
                    {Object.entries(risks).map(([level, count]) => (
                      <div key={level} className={`flex-1 text-center p-2 rounded-lg border ${riskColor(level)}`}>
                        <p className="font-bold text-lg">{count}</p>
                        <p className="text-[10px] capitalize">{level}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Achievements */}
            {achievements.length > 0 && (
              <Card className="border-0 shadow-sm" data-testid="achievements">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Award className="h-4 w-4 text-amber-500" /> Badges Débloqués ({achievements.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="flex flex-wrap gap-2">
                    {achievements.map((a) => (
                      <Badge key={a.id} className="bg-amber-50 text-amber-700 border-amber-200 px-3 py-1">
                        <Star className="h-3 w-3 mr-1" /> {a.name}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Activities */}
            {activities.length > 0 && (
              <Card className="border-0 shadow-sm" data-testid="recent-activities">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Activity className="h-4 w-4" /> Activités Récentes
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="space-y-2">
                    {activities.slice(0, 5).map((a, i) => (
                      <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                        <div className={`w-2 h-2 rounded-full ${
                          a.risk_level === 'critique' ? 'bg-red-500' :
                          a.risk_level === 'eleve' ? 'bg-orange-500' :
                          a.risk_level === 'modere' ? 'bg-amber-500' : 'bg-green-500'
                        }`} />
                        <div className="flex-1">
                          <p className="text-sm text-gray-700">{a.farmer_name}</p>
                          <p className="text-xs text-gray-400">
                            {a.children_count > 0 ? `${a.children_count} enfant(s) observé(s)` : 'RAS'}
                          </p>
                        </div>
                        <Badge className={riskColor(a.risk_level)} variant="outline">
                          {a.risk_level || 'faible'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    className="w-full mt-2 text-emerald-600 hover:text-emerald-700"
                    onClick={() => navigate('/agent/ssrte')}
                    data-testid="see-all-visits"
                  >
                    Voir toutes les visites <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {tab === 'search' && (
          <div className="space-y-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <form onSubmit={handleSearch} className="flex gap-3" data-testid="agent-search-form">
                  <div className="relative flex-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      data-testid="agent-search-input"
                      placeholder="Numéro de téléphone (ex: 0701234567)"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-10 h-12"
                    />
                  </div>
                  <Button type="submit" disabled={searching} className="bg-emerald-600 hover:bg-emerald-700 h-12 px-6" data-testid="agent-search-button">
                    <Search className="w-4 h-4 mr-2" />
                    {searching ? 'Recherche...' : 'Rechercher'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {farmer && (
              <Card className="border-0 shadow-sm border-l-4 border-l-emerald-500" data-testid="farmer-result-card">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                        <Leaf className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{farmer.full_name}</h3>
                        <p className="text-sm text-gray-500">{farmer.phone_number}</p>
                      </div>
                    </div>
                    <Badge className={farmer.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                      {farmer.is_active ? 'Actif' : 'Inactif'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="font-bold text-emerald-600">{farmer.parcels_count || 0}</p>
                      <p className="text-xs text-gray-500">Parcelles</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="font-bold text-blue-600">{farmer.total_hectares || 0} ha</p>
                      <p className="text-xs text-gray-500">Superficie</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="font-bold text-amber-600">{farmer.village || '-'}</p>
                      <p className="text-xs text-gray-500">Village</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentTerrainDashboard;

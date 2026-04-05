import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { MobileAppShell } from '../../components/MobileAppShell';
import { NotificationCenter } from '../../components/NotificationCenter';
import { greenlinkApi } from '../../services/greenlinkApi';
import { 
  Sprout, TrendingUp, DollarSign, MapPin, Award, Plus, Phone,
  MessageSquare, Send, Store, Leaf, Package, BarChart3, Home,
  ChevronRight, RefreshCw, Loader2, Clock
} from 'lucide-react';

const TABS = [
  { id: 'home', label: 'Accueil', icon: Home },
  { id: 'parcels', label: 'Parcelles', icon: MapPin },
  { id: 'harvests', label: 'Recoltes', icon: Package },
  { id: 'carbon', label: 'Carbone', icon: Award },
  { id: 'market', label: 'Boutique', icon: Store },
];

const FarmerDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [smsHistory, setSmsHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sendingSummary, setSendingSummary] = useState(false);
  const [activeTab, setActiveTab] = useState('home');

  useEffect(() => {
    if (authLoading) return;
    if (!user || !['producteur', 'producer', 'farmer'].includes(user.user_type)) {
      navigate('/');
      return;
    }
    fetchDashboard();
    fetchSmsHistory();
  }, [user, authLoading]);

  const fetchDashboard = async () => {
    try {
      const data = await greenlinkApi.getFarmerDashboard();
      setStats(data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSmsHistory = async () => {
    try {
      const data = await greenlinkApi.getSmsHistory();
      setSmsHistory(data.sms_history || []);
    } catch (error) {
      console.error('Error fetching SMS history:', error);
    }
  };

  const sendWeeklySummary = async () => {
    setSendingSummary(true);
    try {
      const result = await greenlinkApi.sendWeeklySummary();
      if (result.success) {
        // use sonner toast
      }
    } catch { /* silent */ }
    setSendingSummary(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchDashboard(), fetchSmsHistory()]);
    setRefreshing(false);
  };

  const handleTabChange = (tabId) => {
    switch (tabId) {
      case 'home': setActiveTab('home'); break;
      case 'parcels': navigate('/farmer/parcels/new'); break;
      case 'harvests': navigate('/farmer/my-harvests'); break;
      case 'carbon': navigate('/farmer/carbon-score'); break;
      case 'market': navigate('/marketplace'); break;
      default: setActiveTab(tabId);
    }
  };

  if (loading || !stats) {
    return (
      <MobileAppShell
        title="GreenLink"
        subtitle="Espace Planteur"
        headerGradient="from-green-600 to-emerald-600"
        statusBarColor="bg-green-700"
        tabs={TABS}
        activeTab="home"
        onTabChange={handleTabChange}
      >
        <div className="flex flex-col items-center justify-center py-20">
          <Sprout className="w-10 h-10 text-green-500 animate-pulse mb-3" />
          <p className="text-sm text-gray-400">Chargement...</p>
        </div>
      </MobileAppShell>
    );
  }

  const statCards = [
    { title: 'Parcelles', value: stats.total_parcelles || 0, sub: `${(stats.superficie_totale || 0).toFixed(1)} ha`, icon: MapPin, color: 'text-green-600', bg: 'bg-green-50' },
    { title: 'Score Carbone', value: `${(stats.score_carbone_moyen || 0).toFixed(1)}`, sub: `${(stats.credits_carbone || 0).toFixed(1)} CO2`, icon: Award, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Revenus', value: `${((stats.revenu_total || 0) / 1000).toFixed(0)}k`, sub: `+${(stats.prime_carbone || 0).toLocaleString()} F`, icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-50' },
    { title: 'Arbres', value: (stats.total_arbres || 0).toLocaleString(), sub: 'Impact env.', icon: Sprout, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  const quickActions = [
    { label: 'Parcelle', icon: Plus, color: 'bg-green-500', route: '/farmer/parcels/new' },
    { label: 'Recolte', icon: TrendingUp, color: 'bg-blue-500', route: '/farmer/harvests/new' },
    { label: 'Score', icon: Award, color: 'bg-emerald-500', route: '/farmer/carbon-score' },
    { label: 'Primes', icon: Leaf, color: 'bg-teal-500', route: '/farmer/carbon-payments' },
    { label: 'Boutique', icon: Store, color: 'bg-orange-500', route: '/marketplace' },
    { label: 'Bourse', icon: BarChart3, color: 'bg-cyan-500', route: '/marketplace/harvest' },
  ];

  return (
    <MobileAppShell
      title={`Bonjour ${user?.full_name?.split(' ')[0] || 'Planteur'}`}
      subtitle="Espace Planteur GreenLink"
      headerGradient="from-green-600 to-emerald-600"
      statusBarColor="bg-green-700"
      tabs={TABS}
      activeTab="home"
      onTabChange={handleTabChange}
      headerRight={
        <div className="flex items-center gap-2">
          <NotificationCenter />
        </div>
      }
      refreshing={refreshing}
    >
      <div className="p-4 space-y-5">

        {/* Refresh */}
        <button onClick={handleRefresh} className="flex items-center gap-2 text-xs text-gray-400 active:text-green-600 transition-colors">
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Actualiser
        </button>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {statCards.map((stat, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-2 rounded-xl ${stat.bg}`}>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </div>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{stat.title} - {stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 mb-3">Actions Rapides</h3>
          <div className="grid grid-cols-3 gap-3">
            {quickActions.map((action, i) => (
              <button
                key={i}
                onClick={() => navigate(action.route)}
                className="flex flex-col items-center gap-1.5 p-3 bg-white rounded-2xl shadow-sm border border-gray-100 active:scale-[0.95] transition-transform"
                data-testid={`quick-action-${action.label.toLowerCase()}`}
              >
                <div className={`w-10 h-10 rounded-xl ${action.color} flex items-center justify-center`}>
                  <action.icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-[11px] font-medium text-gray-700">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Harvests */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h3 className="text-sm font-bold text-gray-800">Recoltes Recentes</h3>
            <button onClick={() => navigate('/farmer/my-harvests')} className="text-xs text-green-600 font-medium flex items-center gap-0.5">
              Tout voir <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          
          {(stats.recoltes_recentes || []).length === 0 ? (
            <div className="text-center py-8 px-4">
              <TrendingUp className="w-10 h-10 mx-auto text-gray-200 mb-2" />
              <p className="text-sm text-gray-400">Aucune recolte declaree</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {(stats.recoltes_recentes || []).slice(0, 4).map((harvest, index) => (
                <div key={index} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      {harvest.quantity_kg} kg - Grade {harvest.quality_grade}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {new Date(harvest.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">
                      {harvest.total_amount?.toLocaleString()} F
                    </p>
                    {harvest.carbon_premium > 0 && (
                      <Badge className="bg-green-100 text-green-700 text-[9px] px-1.5 py-0">
                        +{harvest.carbon_premium?.toLocaleString()}F
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SMS Notifications */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-orange-500" />
              Notifications SMS
            </h3>
            <Button
              onClick={sendWeeklySummary}
              disabled={sendingSummary}
              size="sm"
              className="bg-orange-500 hover:bg-orange-600 text-white h-8 text-xs rounded-lg"
            >
              <Send className="w-3 h-3 mr-1" />
              {sendingSummary ? '...' : 'Resume'}
            </Button>
          </div>

          <div className="px-4 pb-2">
            <div className="bg-orange-50 rounded-xl p-3 mb-3">
              <p className="text-[10px] text-orange-700">
                SMS automatique quand votre score carbone atteint 7/10.
              </p>
            </div>
          </div>

          {smsHistory.length === 0 ? (
            <div className="text-center py-6 px-4">
              <MessageSquare className="w-8 h-8 mx-auto text-gray-200 mb-2" />
              <p className="text-xs text-gray-400">Aucun SMS</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {smsHistory.slice(0, 3).map((sms, index) => (
                <div key={index} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <Badge className={`text-[9px] px-1.5 py-0 ${
                      sms.template === 'carbon_premium_eligible' ? 'bg-green-100 text-green-700' :
                      sms.template === 'harvest_payment' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {sms.template === 'carbon_premium_eligible' ? 'Prime' :
                       sms.template === 'harvest_payment' ? 'Paiement' :
                       sms.template === 'weekly_summary' ? 'Resume' : sms.template}
                    </Badge>
                    <span className="text-[9px] text-gray-400">
                      {new Date(sms.created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-600 bg-gray-50 p-2 rounded-lg font-mono leading-relaxed">
                    {sms.message?.length > 120 ? sms.message.substring(0, 120) + '...' : sms.message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </MobileAppShell>
  );
};

export default FarmerDashboard;

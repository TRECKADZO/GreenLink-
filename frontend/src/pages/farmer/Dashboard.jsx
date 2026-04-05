import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useOffline } from '../../context/OfflineContext';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { MobileAppShell } from '../../components/MobileAppShell';
import { NotificationCenter } from '../../components/NotificationCenter';
import { greenlinkApi } from '../../services/greenlinkApi';
import { 
  Sprout, TrendingUp, DollarSign, MapPin, Award, Plus, Phone,
  MessageSquare, Send, Store, Leaf, Package, BarChart3, Home,
  ChevronRight, RefreshCw, Loader2, ShoppingCart, FileText,
  CheckCircle2, LogOut, AlertTriangle, Star, User, Bell,
  Grid3X3
} from 'lucide-react';

const TABS = [
  { id: 'home', label: 'Accueil', icon: Home },
  { id: 'dashboard', label: 'Tableau', icon: BarChart3 },
  { id: 'parcels', label: 'Parcelles', icon: MapPin },
  { id: 'carbon', label: 'Carbone', icon: Award },
  { id: 'more', label: 'Plus', icon: Grid3X3 },
];

// ========= ACCUEIL (Home) — like mobile USSD style =========
const FarmerHome = ({ user, stats, navigate, onTabChange }) => {
  const { isOnline, lastSync, pendingCount, syncAll, syncing } = useOffline();

  const carbonScore = stats?.score_carbone_moyen || 0;
  const scoreColor = carbonScore >= 7 ? 'text-emerald-500' : carbonScore >= 5 ? 'text-amber-500' : 'text-red-500';
  const scoreBg = carbonScore >= 7 ? 'border-emerald-400' : carbonScore >= 5 ? 'border-amber-400' : 'border-red-400';
  const scoreBarColor = carbonScore >= 7 ? 'bg-emerald-500' : carbonScore >= 5 ? 'bg-amber-500' : 'bg-red-500';

  const menuItems = [
    { num: '1', label: 'Mes Parcelles', sub: `${stats?.total_parcelles || 0} parcelle(s) declaree(s)`, icon: MapPin, color: 'bg-emerald-500', action: () => navigate('/farmer/parcels/new') },
    { num: '2', label: 'Mes Recoltes', sub: 'Suivez vos declarations', icon: Package, color: 'bg-amber-500', action: () => navigate('/farmer/my-harvests') },
    { num: '3', label: 'Declarer une Recolte', sub: 'Enregistrez votre production', icon: TrendingUp, color: 'bg-blue-500', action: () => navigate('/harvest-marketplace') },
    { num: '4', label: 'Marketplace Intrants', sub: 'Achetez intrants & equipements', icon: ShoppingCart, color: 'bg-orange-500', action: () => navigate('/marketplace'), highlight: true },
    { num: '5', label: 'Mon Score Carbone', sub: `Score: ${carbonScore.toFixed(1)}/10`, icon: Award, color: 'bg-teal-500', action: () => navigate('/farmer/carbon-score') },
    { num: '5b', label: 'Pratiques Durables', sub: 'Guide des 21 pratiques eligibles', icon: Leaf, color: 'bg-green-600', action: () => navigate('/guide-redd'), highlight: true },
    { num: '6', label: 'Mes Commandes', sub: 'Historique des achats', icon: FileText, color: 'bg-gray-500', action: () => navigate('/buyer/orders') },
    { num: '7', label: 'Primes Carbone', sub: 'Simulateur et paiements', icon: DollarSign, color: 'bg-purple-500', action: () => navigate('/farmer/carbon-payments') },
  ];

  return (
    <div className="space-y-4 p-4">
      {/* Greeting Card */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
            <Sprout className="w-7 h-7 text-green-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-400">Bonjour,</p>
            <p className="text-lg font-bold text-gray-900">{user?.full_name || 'Producteur'}</p>
          </div>
          <NotificationCenter />
        </div>
      </div>

      {/* Carbon Score Widget — like mobile */}
      <button onClick={() => navigate('/farmer/carbon-score')} className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 active:bg-gray-50 transition-colors text-left" data-testid="carbon-score-widget">
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-full border-4 ${scoreBg} flex items-center justify-center flex-shrink-0`}>
            <span className={`text-xl font-bold ${scoreColor}`}>{carbonScore.toFixed(1)}</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800">Score Carbone</p>
            <p className="text-xs text-gray-400">
              {carbonScore >= 7 ? 'Eligible aux primes' : 'Ameliorez vos pratiques'}
            </p>
            <div className="h-2 bg-gray-100 rounded-full mt-2 overflow-hidden">
              <div className={`h-full ${scoreBarColor} rounded-full transition-all`} style={{ width: `${Math.min(carbonScore * 10, 100)}%` }} />
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
        </div>
      </button>

      {/* REDD Score Widget */}
      <button onClick={() => navigate('/guide-redd')} className="w-full bg-emerald-50 rounded-2xl p-4 border-2 border-emerald-200 active:bg-emerald-100 transition-colors text-left flex items-center gap-3" data-testid="redd-widget">
        <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0">
          <Leaf className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-emerald-800">Pratiques Durables</p>
          <p className="text-[10px] text-emerald-600">21 pratiques evaluees - Programme Tai / BMC</p>
        </div>
        <Badge className="bg-emerald-500 text-white text-[9px]">Nouveau</Badge>
      </button>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-green-50 rounded-xl p-3 text-center border border-green-100">
          <MapPin className="w-5 h-5 mx-auto text-green-600 mb-1" />
          <p className="text-xl font-bold text-green-700">{stats?.total_parcelles || 0}</p>
          <p className="text-[9px] text-green-500">Parcelles</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100">
          <Sprout className="w-5 h-5 mx-auto text-blue-600 mb-1" />
          <p className="text-xl font-bold text-blue-700">{(stats?.superficie_totale || 0).toFixed(1)}</p>
          <p className="text-[9px] text-blue-500">Hectares</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-3 text-center border border-amber-100">
          <DollarSign className="w-5 h-5 mx-auto text-amber-600 mb-1" />
          <p className="text-xl font-bold text-amber-700">{(stats?.prime_carbone || 0).toLocaleString()}</p>
          <p className="text-[9px] text-amber-500">Prime (XOF)</p>
        </div>
      </div>

      {/* Menu Principal — USSD Style */}
      <div>
        <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Choisissez une option</p>
        <div className="space-y-2" data-testid="farmer-ussd-menu">
          {menuItems.map((item) => (
            <button
              key={item.num}
              onClick={item.action}
              className={`w-full flex items-center gap-3 p-3.5 rounded-xl text-left active:scale-[0.98] transition-transform ${
                item.highlight ? 'bg-emerald-50 border-2 border-emerald-200' : 'bg-white border border-gray-100 shadow-sm'
              }`}
              data-testid={`farmer-menu-${item.num}`}
            >
              <div className="w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">{item.num}</span>
              </div>
              <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center flex-shrink-0`}>
                <item.icon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                <p className="text-[10px] text-gray-400 truncate">{item.sub}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ========= TABLEAU DE BORD (Dashboard with detailed stats) =========
const FarmerDashboardTab = ({ stats, smsHistory, onSendSummary, sendingSummary, navigate }) => {
  const statCards = [
    { title: 'Parcelles', value: stats?.total_parcelles || 0, sub: `${(stats?.superficie_totale || 0).toFixed(1)} ha`, icon: MapPin, color: 'text-green-600', bg: 'bg-green-50' },
    { title: 'Score Carbone', value: `${(stats?.score_carbone_moyen || 0).toFixed(1)}`, sub: `${(stats?.credits_carbone || 0).toFixed(1)} CO2`, icon: Award, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Revenus', value: `${((stats?.revenu_total || 0) / 1000).toFixed(0)}k`, sub: `+${(stats?.prime_carbone || 0).toLocaleString()} F`, icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-50' },
    { title: 'Arbres', value: (stats?.total_arbres || 0).toLocaleString(), sub: 'Impact environnemental', icon: Sprout, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  return (
    <div className="p-4 space-y-5">
      <h2 className="text-base font-bold text-gray-800">Tableau de Bord</h2>

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

      {/* Recent Harvests */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h3 className="text-sm font-bold text-gray-800">Recoltes Recentes</h3>
          <button onClick={() => navigate('/farmer/my-harvests')} className="text-xs text-green-600 font-medium flex items-center gap-0.5">
            Tout voir <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        {(stats?.recoltes_recentes || []).length === 0 ? (
          <div className="text-center py-8 px-4">
            <TrendingUp className="w-10 h-10 mx-auto text-gray-200 mb-2" />
            <p className="text-sm text-gray-400">Aucune recolte declaree</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {(stats.recoltes_recentes || []).slice(0, 4).map((harvest, index) => (
              <div key={index} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{harvest.quantity_kg} kg - Grade {harvest.quality_grade}</p>
                  <p className="text-[10px] text-gray-400">{new Date(harvest.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{harvest.total_amount?.toLocaleString()} F</p>
                  {harvest.carbon_premium > 0 && (
                    <Badge className="bg-green-100 text-green-700 text-[9px] px-1.5 py-0">+{harvest.carbon_premium?.toLocaleString()}F</Badge>
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
            <MessageSquare className="w-4 h-4 text-orange-500" />Notifications SMS
          </h3>
          <Button onClick={onSendSummary} disabled={sendingSummary} size="sm" className="bg-orange-500 hover:bg-orange-600 text-white h-8 text-xs rounded-lg">
            <Send className="w-3 h-3 mr-1" />{sendingSummary ? '...' : 'Resume'}
          </Button>
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
                  <Badge className={`text-[9px] px-1.5 py-0 ${sms.template === 'carbon_premium_eligible' ? 'bg-green-100 text-green-700' : sms.template === 'harvest_payment' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                    {sms.template === 'carbon_premium_eligible' ? 'Prime' : sms.template === 'harvest_payment' ? 'Paiement' : sms.template === 'weekly_summary' ? 'Resume' : sms.template}
                  </Badge>
                  <span className="text-[9px] text-gray-400">{new Date(sms.created_at).toLocaleDateString('fr-FR')}</span>
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
  );
};

// ========= ONGLET PLUS =========
const FarmerMoreTab = ({ navigate }) => {
  const { logout } = useAuth();

  const sections = [
    {
      title: 'Mes Activites',
      items: [
        { label: 'Mes Parcelles', desc: 'Declarer et gerer mes parcelles', icon: MapPin, color: 'bg-emerald-500', route: '/farmer/parcels/new' },
        { label: 'Mes Recoltes', desc: 'Suivre mes declarations', icon: Package, color: 'bg-amber-500', route: '/farmer/my-harvests' },
        { label: 'Declarer une Recolte', desc: 'Enregistrer ma production', icon: TrendingUp, color: 'bg-blue-500', route: '/harvest-marketplace' },
        { label: 'Mes Commandes', desc: 'Historique de mes achats', icon: FileText, color: 'bg-gray-500', route: '/buyer/orders' },
      ]
    },
    {
      title: 'Marketplace & Primes',
      items: [
        { label: 'Boutique Intrants', desc: 'Acheter intrants et equipements', icon: ShoppingCart, color: 'bg-orange-500', route: '/marketplace' },
        { label: 'Primes Carbone', desc: 'Simulateur et paiements', icon: DollarSign, color: 'bg-purple-500', route: '/farmer/carbon-payments' },
        { label: 'Pratiques Durables', desc: '21 pratiques REDD+ evaluees', icon: Leaf, color: 'bg-green-600', route: '/guide-redd' },
      ]
    },
    {
      title: 'Mon Compte',
      items: [
        { label: 'Mon Profil', desc: 'Informations personnelles', icon: User, color: 'bg-blue-500', route: '/profile' },
        { label: 'Notifications', desc: 'Alertes et messages', icon: Bell, color: 'bg-orange-500', route: '/notifications' },
      ]
    },
  ];

  return (
    <div className="p-4 space-y-5" data-testid="farmer-more-tab">
      <h2 className="text-base font-bold text-gray-800">Plus</h2>

      {sections.map((section) => (
        <div key={section.title}>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{section.title}</p>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100 overflow-hidden">
            {section.items.map((item) => (
              <button key={item.label} onClick={() => navigate(item.route)}
                className="w-full flex items-center gap-3 p-4 text-left active:bg-gray-50 transition-colors"
                data-testid={`farmer-more-${item.label.toLowerCase().replace(/\s/g, '-')}`}>
                <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center flex-shrink-0`}>
                  <item.icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                  <p className="text-[10px] text-gray-400">{item.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      ))}

      <button onClick={logout}
        className="w-full flex items-center justify-center gap-2 p-4 bg-red-50 rounded-2xl text-red-500 text-sm font-medium active:bg-red-100 transition-colors border border-red-100"
        data-testid="farmer-logout">
        <LogOut className="w-4 h-4" />Deconnexion
      </button>
    </div>
  );
};

// ========= MAIN FARMER DASHBOARD =========
const FarmerDashboard = () => {
  const { user, loading: authLoading, logout } = useAuth();
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
    try { setStats(await greenlinkApi.getFarmerDashboard()); }
    catch (error) { console.error('Error:', error); }
    finally { setLoading(false); }
  };

  const fetchSmsHistory = async () => {
    try { const data = await greenlinkApi.getSmsHistory(); setSmsHistory(data.sms_history || []); }
    catch {}
  };

  const sendWeeklySummary = async () => {
    setSendingSummary(true);
    try { await greenlinkApi.sendWeeklySummary(); }
    catch {}
    setSendingSummary(false);
  };

  const handleTabChange = (tabId) => {
    switch (tabId) {
      case 'home': setActiveTab('home'); break;
      case 'dashboard': setActiveTab('dashboard'); break;
      case 'parcels': navigate('/farmer/parcels/new'); break;
      case 'carbon': navigate('/farmer/carbon-score'); break;
      case 'more': setActiveTab('more'); break;
      default: setActiveTab(tabId);
    }
  };

  if (loading || !stats) {
    return (
      <MobileAppShell title="GreenLink" subtitle="Espace Planteur" headerGradient="from-green-600 to-emerald-600" statusBarColor="bg-green-700" tabs={TABS} activeTab="home" onTabChange={handleTabChange}>
        <div className="flex flex-col items-center justify-center py-20">
          <Sprout className="w-10 h-10 text-green-500 animate-pulse mb-3" />
          <p className="text-sm text-gray-400">Chargement...</p>
        </div>
      </MobileAppShell>
    );
  }

  return (
    <MobileAppShell
      title={activeTab === 'home' ? null : 'Espace Planteur'}
      subtitle={activeTab === 'home' ? null : user?.full_name}
      headerGradient="from-green-600 to-emerald-600"
      statusBarColor="bg-green-700"
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={handleTabChange}
      headerRight={activeTab !== 'home' ? <NotificationCenter /> : null}
      refreshing={refreshing}
    >
      {activeTab === 'home' && (
        <FarmerHome user={user} stats={stats} navigate={navigate} onTabChange={setActiveTab} />
      )}

      {activeTab === 'dashboard' && (
        <FarmerDashboardTab stats={stats} smsHistory={smsHistory} onSendSummary={sendWeeklySummary} sendingSummary={sendingSummary} navigate={navigate} />
      )}

      {activeTab === 'more' && (
        <FarmerMoreTab navigate={navigate} />
      )}
    </MobileAppShell>
  );
};

export default FarmerDashboard;

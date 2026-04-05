import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, Users, MapPin, Leaf, Camera, FileText,
  Award, UserPlus, Search, Phone, ClipboardCheck, Activity, 
  Target, Star, AlertTriangle, Eye, Loader2, ArrowLeft,
  ChevronRight, User, CheckCircle2, Home, RefreshCw,
  BarChart3, Bell, Settings, LogOut
} from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { toast } from 'sonner';
import { MobileAppShell } from '../../components/MobileAppShell';
import { NotificationCenter } from '../../components/NotificationCenter';
import ICIProfileModal from '../cooperative/ICIProfileModal';
import SSRTEVisitModal from '../cooperative/SSRTEVisitModal';
import FarmerHistorySection from './FarmerHistorySection';
import { useAuth } from '../../context/AuthContext';
import { useOffline } from '../../context/OfflineContext';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const FARMER_FORMS = [
  { id: 'ici', label: 'Fiche ICI', desc: 'Evaluation initiale: famille, enfants, education', icon: FileText, color: 'bg-violet-500', lightBg: 'bg-violet-50', lightText: 'text-violet-700' },
  { id: 'ssrte', label: 'Visite SSRTE', desc: 'Observation travail enfants, risques, remediation', icon: ClipboardCheck, color: 'bg-cyan-500', lightBg: 'bg-cyan-50', lightText: 'text-cyan-700' },
  { id: 'redd', label: 'Fiche Environnementale', desc: '21 pratiques durables (agroforesterie, sols)', icon: Leaf, color: 'bg-emerald-500', lightBg: 'bg-emerald-50', lightText: 'text-emerald-700' },
  { id: 'parcels', label: 'Declaration Parcelles', desc: 'GPS, superficie, type de culture', icon: MapPin, color: 'bg-amber-500', lightBg: 'bg-amber-50', lightText: 'text-amber-700' },
  { id: 'photos', label: 'Photos Geolocalisees', desc: 'Photos terrain avec position GPS', icon: Camera, color: 'bg-pink-500', lightBg: 'bg-pink-50', lightText: 'text-pink-700' },
  { id: 'register', label: 'Enregistrer Membre', desc: 'Inscrire comme membre cooperative', icon: UserPlus, color: 'bg-blue-500', lightBg: 'bg-blue-50', lightText: 'text-blue-700' },
];

const TABS = [
  { id: 'home', label: 'Accueil', icon: Home },
  { id: 'dashboard', label: 'Tableau', icon: BarChart3 },
  { id: 'farmers', label: 'Planteurs', icon: Users },
  { id: 'inscriptions', label: 'Inscrire', icon: UserPlus },
  { id: 'search', label: 'Chercher', icon: Search },
];

// ========= ACCUEIL (Home) — like mobile =========
const HomeTab = ({ info, myFarmers, onTabChange, navigate }) => {
  const { isOnline, lastSync, pendingCount, syncAll, syncing } = useOffline();
  const { user, logout } = useAuth();

  const menuItems = [
    { num: '1', label: 'Mes Planteurs', sub: `${myFarmers.length} agriculteur(s) assignes`, icon: Users, color: 'bg-emerald-500', action: () => onTabChange('farmers') },
    { num: '2', label: 'Visites SSRTE', sub: 'Tableau de suivi des visites', icon: ClipboardCheck, color: 'bg-cyan-500', action: () => navigate('/agent/ssrte') },
    { num: '3', label: 'Inscrire un Planteur', sub: 'Enregistrement rapide', icon: UserPlus, color: 'bg-blue-500', action: () => onTabChange('inscriptions') },
    { num: '4', label: 'Declaration Parcelles', sub: 'GPS et verification terrain', icon: MapPin, color: 'bg-amber-500', action: () => navigate('/cooperative/parcels/verification') },
    { num: '5', label: 'Pratiques Durables', sub: 'Guide des 21 pratiques', icon: Leaf, color: 'bg-green-600', action: () => navigate('/guide-redd'), highlight: true },
    { num: '6', label: 'Rechercher Planteur', sub: 'Par numero de telephone', icon: Search, color: 'bg-gray-500', action: () => onTabChange('search') },
  ];

  const formatSync = () => {
    if (!lastSync) return 'Jamais synchronise';
    const d = new Date(lastSync);
    const diff = Math.floor((new Date() - d) / 60000);
    if (diff < 1) return "Sync a l'instant";
    if (diff < 60) return `Derniere sync: ${diff} min`;
    return `Sync: ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div className="space-y-4 p-4">
      {/* Greeting Card */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <Shield className="w-7 h-7 text-emerald-600" />
          </div>
          <div className="flex-1">
            <p className="text-lg font-bold text-gray-900">Bonjour, {user?.full_name?.split(' ')[0] || 'Agent'}</p>
            <p className="text-xs text-gray-400">{info?.cooperative || 'Agent Terrain GreenLink'}</p>
            <p className="text-xs text-gray-400">{info?.zone ? `Zone: ${info.zone}` : ''}</p>
          </div>
        </div>
      </div>

      {/* Sync Status */}
      <button
        onClick={syncing ? undefined : syncAll}
        className={`w-full rounded-xl p-3 flex items-center justify-between transition-colors ${
          !isOnline ? 'bg-amber-50 border border-amber-200' : pendingCount > 0 ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border border-gray-200'
        }`}
        data-testid="sync-status-home"
      >
        <div className="flex items-center gap-2">
          {syncing ? <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" /> :
           !isOnline ? <AlertTriangle className="w-4 h-4 text-amber-500" /> :
           <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          <span className={`text-xs font-medium ${!isOnline ? 'text-amber-700' : 'text-gray-600'}`}>
            {!isOnline ? 'Mode hors-ligne' : syncing ? 'Synchronisation...' : pendingCount > 0 ? `${pendingCount} action(s) en attente` : formatSync()}
          </span>
        </div>
        {isOnline && !syncing && (
          <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
        )}
      </button>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-cyan-50 rounded-xl p-3 text-center border border-cyan-100">
          <ClipboardCheck className="w-5 h-5 mx-auto text-cyan-600 mb-1" />
          <p className="text-xl font-bold text-cyan-700">{info?.stats?.ssrte || 0}</p>
          <p className="text-[9px] text-cyan-500">Visites</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100">
          <Users className="w-5 h-5 mx-auto text-emerald-600 mb-1" />
          <p className="text-xl font-bold text-emerald-700">{myFarmers.length}</p>
          <p className="text-[9px] text-emerald-500">Planteurs</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-3 text-center border border-amber-100">
          <MapPin className="w-5 h-5 mx-auto text-amber-600 mb-1" />
          <p className="text-xl font-bold text-amber-700">{info?.stats?.parcels || 0}</p>
          <p className="text-[9px] text-amber-500">Parcelles</p>
        </div>
      </div>

      {/* Menu Principal — USSD style */}
      <div>
        <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Choisissez une option</p>
        <div className="space-y-2" data-testid="agent-ussd-menu">
          {menuItems.map((item) => (
            <button
              key={item.num}
              onClick={item.action}
              className={`w-full flex items-center gap-3 p-3.5 rounded-xl text-left active:scale-[0.98] transition-transform ${
                item.highlight ? 'bg-emerald-50 border-2 border-emerald-200' : 'bg-white border border-gray-100 shadow-sm'
              }`}
              data-testid={`menu-item-${item.num}`}
            >
              {/* Number */}
              <div className="w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">{item.num}</span>
              </div>
              {/* Icon */}
              <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center flex-shrink-0`}>
                <item.icon className="w-5 h-5 text-white" />
              </div>
              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                <p className="text-[10px] text-gray-400 truncate">{item.sub}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={logout}
        className="w-full flex items-center justify-center gap-2 p-3 bg-gray-50 rounded-xl text-gray-400 text-sm hover:bg-red-50 hover:text-red-500 transition-colors"
        data-testid="agent-logout"
      >
        <LogOut className="w-4 h-4" />
        Deconnexion
      </button>
    </div>
  );
};

// ========= TABLEAU DE BORD (detailed KPIs) =========
const DashboardTab = ({ dashboard, myFarmers, onTabChange }) => {
  const stats = dashboard?.statistics || {};
  const risks = dashboard?.risk_distribution || {};
  const achievements = dashboard?.achievements || [];

  const kpis = [
    { label: 'Visites SSRTE', value: stats.ssrte_visits?.total || 0, target: stats.ssrte_visits?.target || 20, progress: stats.ssrte_visits?.progress || 0, thisMonth: stats.ssrte_visits?.this_month || 0, icon: ClipboardCheck, color: 'text-cyan-600', bg: 'bg-cyan-50' },
    { label: 'Membres Inscrits', value: stats.members_onboarded?.total || 0, target: stats.members_onboarded?.target || 10, progress: stats.members_onboarded?.progress || 0, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Parcelles Declarees', value: stats.parcels_declared?.total || 0, target: stats.parcels_declared?.target || 15, progress: stats.parcels_declared?.progress || 0, icon: MapPin, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Photos Geoloc.', value: stats.geotagged_photos?.total || 0, target: stats.geotagged_photos?.target || 30, progress: stats.geotagged_photos?.progress || 0, icon: Camera, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-base font-bold text-gray-800">Tableau de Bord</h2>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3" data-testid="dashboard-kpi-cards">
        {kpis.map((kpi, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2 rounded-xl ${kpi.bg}`}>
                <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
              </div>
              <span className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</span>
            </div>
            <p className="text-[11px] text-gray-500 mb-2">{kpi.label}</p>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${Math.min(kpi.progress, 100)}%` }} />
            </div>
            <p className="text-[9px] text-gray-400 mt-1 text-right">Obj: {kpi.target}{kpi.thisMonth != null ? ` | Ce mois: ${kpi.thisMonth}` : ''}</p>
          </div>
        ))}
      </div>

      {/* Alerts */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-red-50 rounded-2xl p-4 border border-red-100">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <div>
              <p className="text-xl font-bold text-red-600">{stats.children_identified || 0}</p>
              <p className="text-[10px] text-red-500">Enfants identifies</p>
            </div>
          </div>
        </div>
        <button onClick={() => onTabChange('farmers')} className="bg-cyan-50 rounded-2xl p-4 border border-cyan-100 text-left active:bg-cyan-100 transition-colors">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-500" />
            <div className="flex-1">
              <p className="text-xl font-bold text-cyan-600">{myFarmers.length}</p>
              <p className="text-[10px] text-cyan-500">Mes planteurs</p>
            </div>
            <ChevronRight className="w-4 h-4 text-cyan-400" />
          </div>
        </button>
      </div>

      {/* Risk Distribution */}
      {(risks.critique > 0 || risks.eleve > 0 || risks.modere > 0 || risks.faible > 0) && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="text-xs font-semibold text-gray-600 mb-3 flex items-center gap-2">
            <Target className="w-4 h-4" />Distribution des Risques
          </h3>
          <div className="flex gap-2">
            {Object.entries(risks).map(([level, count]) => {
              const colors = { critique: 'bg-red-500', eleve: 'bg-orange-500', modere: 'bg-amber-400', faible: 'bg-emerald-500' };
              return (
                <div key={level} className="flex-1 text-center">
                  <div className={`${colors[level]} text-white rounded-xl p-2 mb-1`}>
                    <p className="text-lg font-bold">{count}</p>
                  </div>
                  <p className="text-[9px] text-gray-500 capitalize">{level}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Badges */}
      {achievements.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="text-xs font-semibold text-gray-600 mb-3 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />Badges
          </h3>
          <div className="flex flex-wrap gap-2">
            {achievements.map(a => (
              <span key={a.id} className="bg-amber-50 text-amber-700 border border-amber-200 text-xs px-3 py-1.5 rounded-full flex items-center gap-1">
                <Star className="w-3 h-3" />{a.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ========= REGISTRATION FORM =========
const AgentRegistrationForm = () => {
  const [form, setForm] = useState({ nom_complet: '', telephone: '', cooperative_code: '', village: '', pin: '', hectares: '' });
  const [submitting, setSubmitting] = useState(false);
  const [recentRegs, setRecentRegs] = useState([]);
  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const loadRecent = async () => {
    try {
      const res = await fetch(`${API_URL}/api/ussd/registrations?limit=10`, { headers: getAuthHeader() });
      if (res.ok) { const data = await res.json(); setRecentRegs(data.registrations || []); }
    } catch {}
  };
  React.useEffect(() => { loadRecent(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nom_complet.trim() || !form.telephone.trim() || !form.pin || form.pin.length !== 4) {
      toast.error('Nom, telephone et PIN (4 chiffres) requis'); return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/ussd/register-by-agent`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeader() }, body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) { toast.success(`${form.nom_complet} inscrit!`); setForm({ nom_complet: '', telephone: '', cooperative_code: '', village: '', pin: '', hectares: '' }); loadRecent(); }
      else toast.error(data.detail || 'Erreur');
    } catch { toast.error('Erreur reseau'); }
    setSubmitting(false);
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-base font-bold text-gray-800">Inscrire un planteur</h2>
      <form onSubmit={handleSubmit} className="space-y-3" data-testid="agent-reg-form">
        <Input placeholder="Nom complet *" value={form.nom_complet} onChange={e => handleChange('nom_complet', e.target.value)} className="h-12 text-base rounded-xl" data-testid="agent-reg-name" />
        <Input placeholder="Telephone *" value={form.telephone} onChange={e => handleChange('telephone', e.target.value)} className="h-12 text-base rounded-xl" data-testid="agent-reg-phone" />
        <Input placeholder="Code cooperative (optionnel)" value={form.cooperative_code} onChange={e => handleChange('cooperative_code', e.target.value)} className="h-12 text-base rounded-xl" />
        <Input placeholder="Village" value={form.village} onChange={e => handleChange('village', e.target.value)} className="h-12 text-base rounded-xl" />
        <div className="grid grid-cols-2 gap-3">
          <Input placeholder="PIN 4 chiffres *" type="password" maxLength={4} value={form.pin} onChange={e => handleChange('pin', e.target.value.replace(/\D/g, '').slice(0, 4))} className="h-12 text-base rounded-xl" data-testid="agent-reg-pin" />
          <Input placeholder="Hectares" type="number" step="0.5" value={form.hectares} onChange={e => handleChange('hectares', e.target.value)} className="h-12 text-base rounded-xl" />
        </div>
        <Button type="submit" disabled={submitting} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-base font-semibold rounded-xl" data-testid="agent-reg-submit">
          {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Inscription...</> : <><UserPlus className="w-4 h-4 mr-2" />Inscrire</>}
        </Button>
      </form>
      {recentRegs.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 mb-2">Inscriptions recentes</h3>
          <div className="space-y-2">
            {recentRegs.slice(0, 5).map((r, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-gray-800">{r.full_name || r.nom_complet}</p>
                  <p className="text-xs text-gray-400">{r.phone_number}</p>
                </div>
                <span className="text-[10px] text-gray-400">{r.village}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ========= MAIN DASHBOARD =========
const AgentTerrainDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('home');

  const [myFarmers, setMyFarmers] = useState([]);
  const [farmersLoading, setFarmersLoading] = useState(false);
  const [selectedFarmer, setSelectedFarmer] = useState(null);
  const [farmerSearch, setFarmerSearch] = useState('');

  const [phone, setPhone] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState(null);

  const [showICIModal, setShowICIModal] = useState(false);
  const [showSSRTEModal, setShowSSRTEModal] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/field-agent/dashboard`, { headers: getAuthHeader() });
      if (res.ok) setDashboard(await res.json());
    } catch {} finally { setLoading(false); }
  }, []);

  const loadMyFarmers = useCallback(async () => {
    setFarmersLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/field-agent/my-farmers`, { headers: getAuthHeader() });
      if (res.ok) { const data = await res.json(); setMyFarmers(data.farmers || []); }
    } catch {} finally { setFarmersLoading(false); }
  }, []);

  useEffect(() => { loadDashboard(); loadMyFarmers(); }, [loadDashboard, loadMyFarmers]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadDashboard(), loadMyFarmers()]);
    setRefreshing(false);
  };

  const openFarmerProfile = (farmer) => { setSelectedFarmer(farmer); setTab('farmer-profile'); };

  const handleFormAction = (formId) => {
    if (!selectedFarmer) return;
    const farmerId = selectedFarmer.id || '';
    const farmerName = encodeURIComponent(selectedFarmer.full_name || '');
    const farmerPhone = encodeURIComponent(selectedFarmer.phone_number || '');

    switch (formId) {
      case 'ici': setShowICIModal(true); break;
      case 'ssrte': setShowSSRTEModal(true); break;
      case 'redd': navigate(`/redd/tracking?farmer=${farmerName}&phone=${farmerPhone}&id=${farmerId}`); break;
      case 'parcels': navigate(`/cooperative/parcels/new?farmer_id=${farmerId}&farmer_name=${farmerName}`); break;
      case 'photos': toast.info('Photos geolocalisees: utilisez la camera de votre appareil puis uploadez via le formulaire parcelle.'); break;
      case 'register': navigate(`/farmer/inscription?phone=${farmerPhone}&name=${farmerName}`); break;
      default: break;
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setSearching(true); setSearchResult(null);
    try {
      const res = await fetch(`${API_URL}/api/agent/search?phone=${encodeURIComponent(phone.trim())}`, { headers: getAuthHeader() });
      const data = await res.json();
      if (data.found) { setSearchResult(data.farmer); toast.success(`Trouve: ${data.farmer.full_name}`); }
      else toast.error('Aucun planteur trouve');
    } catch { toast.error('Erreur reseau'); }
    setSearching(false);
  };

  const filteredFarmers = myFarmers.filter(f => {
    if (!farmerSearch) return true;
    const s = farmerSearch.toLowerCase();
    return f.full_name?.toLowerCase().includes(s) || f.phone_number?.includes(s) || f.village?.toLowerCase().includes(s);
  });

  if (loading) {
    return (
      <MobileAppShell title="GreenLink Agent" tabs={TABS} activeTab="home" onTabChange={setTab}>
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-3" />
          <p className="text-sm text-gray-400">Chargement...</p>
        </div>
      </MobileAppShell>
    );
  }

  const info = dashboard?.agent_info || {};
  const perf = dashboard?.performance || {};
  const score = perf.score || 0;
  const badgeInfo = score >= 80 ? { text: 'Expert', bg: 'bg-emerald-500' } : score >= 50 ? { text: 'Confirme', bg: 'bg-amber-500' } : { text: 'Debutant', bg: 'bg-gray-400' };

  // Pass stats to homeTab
  const homeInfo = {
    ...info,
    stats: {
      ssrte: dashboard?.statistics?.ssrte_visits?.total || 0,
      parcels: dashboard?.statistics?.parcels_declared?.total || 0,
    }
  };

  return (
    <MobileAppShell
      title={tab === 'home' ? null : (info.name || user?.full_name || 'Agent Terrain')}
      subtitle={tab === 'home' ? null : (info.cooperative || '')}
      tabs={TABS}
      activeTab={tab === 'farmer-profile' ? 'farmers' : tab}
      onTabChange={(id) => { setTab(id); setSelectedFarmer(null); }}
      headerGradient="from-emerald-600 to-emerald-700"
      statusBarColor="bg-emerald-700"
      headerRight={tab !== 'home' ? (
        <div className="flex items-center gap-2">
          <NotificationCenter />
          <div className="flex flex-col items-center bg-white/15 rounded-xl px-3 py-1">
            <span className="text-xl font-bold leading-tight">{score}%</span>
            <span className={`text-[9px] ${badgeInfo.bg} text-white px-2 py-0.5 rounded-full -mt-0.5`}>{badgeInfo.text}</span>
          </div>
        </div>
      ) : null}
      refreshing={refreshing}
    >
      {/* === ACCUEIL === */}
      {tab === 'home' && (
        <HomeTab info={homeInfo} myFarmers={myFarmers} onTabChange={setTab} navigate={navigate} />
      )}

      {/* === TABLEAU DE BORD === */}
      {tab === 'dashboard' && (
        <DashboardTab dashboard={dashboard} myFarmers={myFarmers} onTabChange={setTab} />
      )}

      {/* === MES PLANTEURS === */}
      {tab === 'farmers' && (
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-800">Mes Planteurs</h2>
            <Badge className="bg-emerald-100 text-emerald-700">{myFarmers.length}</Badge>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Rechercher..." value={farmerSearch} onChange={e => setFarmerSearch(e.target.value)} className="pl-10 h-11 rounded-xl text-sm" data-testid="farmer-search-input" />
          </div>
          {farmersLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-emerald-500" /></div>
          ) : filteredFarmers.length > 0 ? (
            <div className="space-y-2" data-testid="farmers-list">
              {filteredFarmers.map(f => {
                const comp = f.completion || { completed: 0, total: 6, percentage: 0 };
                return (
                  <button key={f.id} onClick={() => openFarmerProfile(f)} className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3 active:bg-gray-50 transition-colors text-left" data-testid={`farmer-card-${f.id}`}>
                    <div className="w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center relative flex-shrink-0">
                      <Leaf className="h-5 w-5 text-emerald-600" />
                      {comp.percentage === 100 && (
                        <div className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center ring-2 ring-white">
                          <CheckCircle2 className="h-2.5 w-2.5 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{f.full_name}</p>
                      <p className="text-xs text-gray-400 truncate">{f.phone_number} {f.village ? `- ${f.village}` : ''}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[100px]">
                          <div className={`h-full rounded-full ${comp.percentage >= 80 ? 'bg-emerald-500' : comp.percentage >= 40 ? 'bg-amber-500' : 'bg-gray-300'}`} style={{ width: `${comp.percentage}%` }} />
                        </div>
                        <span className="text-[9px] text-gray-400">{comp.completed}/{comp.total}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto text-gray-200 mb-3" />
              <p className="text-gray-400 text-sm">{farmerSearch ? 'Aucun resultat' : 'Aucun planteur assigne'}</p>
            </div>
          )}
        </div>
      )}

      {/* === PROFIL PLANTEUR === */}
      {tab === 'farmer-profile' && selectedFarmer && (
        <div className="p-4 space-y-3" data-testid="farmer-profile-view">
          <button onClick={() => { setTab('farmers'); setSelectedFarmer(null); }} className="flex items-center gap-1 text-gray-400 text-sm active:text-gray-600">
            <ArrowLeft className="w-4 h-4" />Retour
          </button>

          {/* Farmer Header */}
          <div className={`rounded-2xl p-4 shadow-sm border ${selectedFarmer.completion?.percentage === 100 ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-100'}`} data-testid="farmer-header-card">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <User className="h-7 w-7 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-bold text-gray-900 truncate" data-testid="farmer-name">{selectedFarmer.full_name}</h2>
                <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                  {selectedFarmer.phone_number && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{selectedFarmer.phone_number}</span>}
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{selectedFarmer.village || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Progress */}
            <div className="mt-3 pt-3 border-t border-gray-200/50">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-gray-500">Progression des fiches</span>
                <span className={`text-xs font-bold ${selectedFarmer.completion?.percentage === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {selectedFarmer.completion?.percentage || 0}%
                </span>
              </div>
              <Progress value={selectedFarmer.completion?.percentage || 0} className="h-2" />

              {/* Mini status dots */}
              <div className="flex items-center justify-between mt-2">
                {FARMER_FORMS.map(form => {
                  const isDone = selectedFarmer.forms_status?.[form.id]?.completed;
                  return (
                    <div key={form.id} className="flex flex-col items-center gap-0.5">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${isDone ? 'bg-emerald-500' : 'bg-gray-200'}`}>
                        {isDone ? <CheckCircle2 className="w-3 h-3 text-white" /> : <form.icon className="w-2.5 h-2.5 text-gray-400" />}
                      </div>
                      <span className={`text-[7px] uppercase ${isDone ? 'text-emerald-600 font-bold' : 'text-gray-400'}`}>{form.id}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {selectedFarmer.completion?.percentage === 100 && (
              <div className="mt-3 p-2.5 bg-emerald-100/50 rounded-xl flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-600" />
                <div>
                  <p className="text-xs font-bold text-emerald-700">Toutes les fiches sont completes !</p>
                  <p className="text-[10px] text-emerald-600">Donnees pretes pour verification</p>
                </div>
              </div>
            )}
          </div>

          {/* Forms List — Sequential steps */}
          <h3 className="text-xs font-semibold text-gray-500 px-1">Fiches a remplir</h3>
          <div className="space-y-2" data-testid="farmer-forms-list">
            {FARMER_FORMS.map((form, index) => {
              const status = selectedFarmer.forms_status?.[form.id];
              const isDone = status?.completed;
              return (
                <button key={form.id} onClick={() => handleFormAction(form.id)}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-xl text-left active:scale-[0.98] transition-transform ${isDone ? 'bg-emerald-50 border-2 border-emerald-200' : 'bg-white border border-gray-100 shadow-sm'}`}
                  data-testid={`form-${form.id}`}
                >
                  {/* Step number */}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${isDone ? 'bg-emerald-500' : 'bg-gray-200'}`}>
                    {isDone ? <CheckCircle2 className="w-3.5 h-3.5 text-white" /> : <span className="text-xs font-bold text-gray-500">{index + 1}</span>}
                  </div>
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isDone ? 'bg-emerald-500' : form.color}`}>
                    <form.icon className="w-5 h-5 text-white" />
                  </div>
                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${isDone ? 'text-emerald-700' : 'text-gray-800'}`}>{form.label}</p>
                    <p className="text-[10px] text-gray-400 truncate">{form.desc}</p>
                    {status?.count > 0 && <span className="text-[9px] text-emerald-600 font-medium">{status.count} enregistrement(s)</span>}
                  </div>
                  <ChevronRight className={`w-4 h-4 flex-shrink-0 ${isDone ? 'text-emerald-400' : 'text-gray-300'}`} />
                </button>
              );
            })}
          </div>

          {/* History */}
          <FarmerHistorySection farmer={selectedFarmer} />
        </div>
      )}

      {/* === RECHERCHE === */}
      {tab === 'search' && (
        <div className="p-4 space-y-4">
          <h2 className="text-base font-bold text-gray-800">Rechercher un planteur</h2>
          <form onSubmit={handleSearch} className="space-y-3" data-testid="agent-search-form">
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Numero de telephone" value={phone} onChange={e => setPhone(e.target.value)} className="pl-10 h-12 rounded-xl text-base" data-testid="agent-search-input" />
            </div>
            <Button type="submit" disabled={searching} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-base" data-testid="agent-search-button">
              <Search className="w-4 h-4 mr-2" />{searching ? 'Recherche...' : 'Rechercher'}
            </Button>
          </form>
          {searchResult && (
            <button onClick={() => openFarmerProfile(searchResult)} className="w-full bg-white rounded-2xl p-4 shadow-sm border-l-4 border-emerald-500 flex items-center gap-3 active:bg-gray-50 text-left" data-testid="search-result-card">
              <div className="w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center">
                <Leaf className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{searchResult.full_name}</p>
                <p className="text-xs text-gray-400">{searchResult.phone_number} - {searchResult.village || 'N/A'}</p>
              </div>
              <Eye className="w-4 h-4 text-emerald-500" />
            </button>
          )}
        </div>
      )}

      {/* === INSCRIPTIONS === */}
      {tab === 'inscriptions' && <AgentRegistrationForm />}

      {/* Modals */}
      <ICIProfileModal open={showICIModal} onOpenChange={setShowICIModal} farmer={selectedFarmer} onSaved={() => loadMyFarmers()} />
      <SSRTEVisitModal open={showSSRTEModal} onOpenChange={setShowSSRTEModal} farmer={selectedFarmer} onSaved={() => loadMyFarmers()} />
    </MobileAppShell>
  );
};

export default AgentTerrainDashboard;

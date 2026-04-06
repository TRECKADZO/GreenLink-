import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Shield, Users, MapPin, Leaf, Camera, FileText,
  Award, UserPlus, Search, Phone, ClipboardCheck,
  Target, Star, AlertTriangle, Eye, Loader2, ArrowLeft,
  ChevronRight, User, CheckCircle2, Home, RefreshCw,
  BarChart3, LogOut, MoreHorizontal, Bell, Settings,
  Compass, Grid3X3, HardDrive, Trash2, Database
} from 'lucide-react';
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
import USSDSimulator from '../../components/USSDSimulator';
import { useAuth } from '../../context/AuthContext';
import { useOffline } from '../../context/OfflineContext';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const FARMER_FORMS = [
  { id: 'ici', label: 'Fiche ICI', desc: 'Evaluation initiale: famille, enfants, education', icon: FileText, color: 'bg-violet-500' },
  { id: 'ssrte', label: 'Visite SSRTE', desc: 'Observation travail enfants, risques, remediation', icon: ClipboardCheck, color: 'bg-cyan-500' },
  { id: 'redd', label: 'Fiche Environnementale', desc: '21 pratiques durables (agroforesterie, sols)', icon: Leaf, color: 'bg-emerald-500' },
  { id: 'parcels', label: 'Declaration Parcelles', desc: 'GPS, superficie, type de culture', icon: MapPin, color: 'bg-amber-500' },
  { id: 'photos', label: 'Photos Geolocalisees', desc: 'Photos terrain avec position GPS', icon: Camera, color: 'bg-pink-500' },
  { id: 'register', label: 'Enregistrer Membre', desc: 'Inscrire comme membre cooperative', icon: UserPlus, color: 'bg-blue-500' },
];

const TABS = [
  { id: 'home', label: 'Accueil', icon: Home },
  { id: 'dashboard', label: 'Tableau', icon: BarChart3 },
  { id: 'farmers', label: 'Planteurs', icon: Users },
  { id: 'inscriptions', label: 'Inscrire', icon: UserPlus },
  { id: 'more', label: 'Plus', icon: Grid3X3 },
];

// ========= ACCUEIL =========
const HomeTab = ({ info, myFarmers, onTabChange, navigate, onShowUSSD }) => {
  const { isOnline, lastSync, pendingCount, syncAll, syncing } = useOffline();
  const { user, logout } = useAuth();

  const menuItems = [
    { num: '1', label: 'Mes Planteurs', sub: `${myFarmers.length} agriculteur(s) — Toutes les fiches`, icon: Users, color: 'bg-emerald-500', action: () => onTabChange('farmers') },
    { num: '2', label: 'Inscrire un Planteur', sub: 'Enregistrement rapide', icon: UserPlus, color: 'bg-blue-500', action: () => onTabChange('inscriptions') },
    { num: '3', label: 'Pratiques Durables', sub: 'Guide des 21 pratiques', icon: Leaf, color: 'bg-green-600', action: () => navigate('/guide-redd'), highlight: true },
    { num: '4', label: 'Simulateur USSD', sub: 'Calcul prime carbone *144*99#', icon: Phone, color: 'bg-purple-600', action: () => onShowUSSD() },
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
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <Shield className="w-7 h-7 text-emerald-600" />
          </div>
          <div className="flex-1">
            <p className="text-lg font-bold text-gray-900">Bonjour, {user?.full_name?.split(' ')[0] || 'Agent'}</p>
            <p className="text-xs text-gray-400">{info?.cooperative || 'Agent Terrain GreenLink'}</p>
            {info?.zone && <p className="text-xs text-gray-400">Zone: {info.zone}</p>}
          </div>
        </div>
        {/* Sync inline compact */}
        <button onClick={syncing ? undefined : syncAll}
          className={`mt-3 w-full rounded-lg px-3 py-1.5 flex items-center justify-between transition-colors ${!isOnline ? 'bg-amber-50' : pendingCount > 0 ? 'bg-blue-50' : 'bg-gray-50'}`}
          data-testid="sync-status-home">
          <div className="flex items-center gap-1.5">
            {syncing ? <RefreshCw className="w-3 h-3 text-blue-500 animate-spin" /> : !isOnline ? <AlertTriangle className="w-3 h-3 text-amber-500" /> : <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
            <span className={`text-[10px] font-medium ${!isOnline ? 'text-amber-700' : 'text-gray-500'}`}>
              {!isOnline ? 'Hors-ligne' : syncing ? 'Sync...' : pendingCount > 0 ? `${pendingCount} en attente` : formatSync()}
            </span>
          </div>
          {isOnline && !syncing && <RefreshCw className="w-3 h-3 text-gray-400" />}
        </button>
      </div>

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

      <div>
        <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Choisissez une option</p>
        <div className="space-y-2" data-testid="agent-ussd-menu">
          {menuItems.map((item) => (
            <button key={item.num} onClick={item.action}
              className={`w-full flex items-center gap-3 p-3.5 rounded-xl text-left active:scale-[0.98] transition-transform ${item.highlight ? 'bg-emerald-50 border-2 border-emerald-200' : 'bg-white border border-gray-100 shadow-sm'}`}
              data-testid={`menu-item-${item.num}`}>
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

// ========= TABLEAU DE BORD =========
const DashboardTab = ({ dashboard, myFarmers, onTabChange }) => {
  const stats = dashboard?.statistics || {};
  const risks = dashboard?.risk_distribution || {};
  const achievements = dashboard?.achievements || [];
  const kpis = [
    { label: 'Visites SSRTE', value: stats.ssrte_visits?.total || 0, target: stats.ssrte_visits?.target || 20, progress: stats.ssrte_visits?.progress || 0, icon: ClipboardCheck, color: 'text-cyan-600', bg: 'bg-cyan-50' },
    { label: 'Membres Inscrits', value: stats.members_onboarded?.total || 0, target: stats.members_onboarded?.target || 10, progress: stats.members_onboarded?.progress || 0, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Parcelles', value: stats.parcels_declared?.total || 0, target: stats.parcels_declared?.target || 15, progress: stats.parcels_declared?.progress || 0, icon: MapPin, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Photos Geoloc.', value: stats.geotagged_photos?.total || 0, target: stats.geotagged_photos?.target || 30, progress: stats.geotagged_photos?.progress || 0, icon: Camera, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-base font-bold text-gray-800">Tableau de Bord</h2>
      <div className="grid grid-cols-2 gap-3" data-testid="dashboard-kpi-cards">
        {kpis.map((kpi, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2 rounded-xl ${kpi.bg}`}><kpi.icon className={`w-4 h-4 ${kpi.color}`} /></div>
              <span className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</span>
            </div>
            <p className="text-[11px] text-gray-500 mb-2">{kpi.label}</p>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${Math.min(kpi.progress, 100)}%` }} />
            </div>
            <p className="text-[9px] text-gray-400 mt-1 text-right">Obj: {kpi.target}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-red-50 rounded-2xl p-4 border border-red-100">
          <AlertTriangle className="w-5 h-5 text-red-500 mb-1" />
          <p className="text-xl font-bold text-red-600">{stats.children_identified || 0}</p>
          <p className="text-[10px] text-red-500">Enfants identifies</p>
        </div>
        <button onClick={() => onTabChange('farmers')} className="bg-cyan-50 rounded-2xl p-4 border border-cyan-100 text-left active:bg-cyan-100">
          <Users className="w-5 h-5 text-cyan-500 mb-1" />
          <p className="text-xl font-bold text-cyan-600">{myFarmers.length}</p>
          <p className="text-[10px] text-cyan-500">Mes planteurs</p>
        </button>
      </div>
      {(risks.critique > 0 || risks.eleve > 0 || risks.modere > 0 || risks.faible > 0) && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="text-xs font-semibold text-gray-600 mb-3 flex items-center gap-2"><Target className="w-4 h-4" />Distribution des Risques</h3>
          <div className="flex gap-2">
            {Object.entries(risks).map(([level, count]) => {
              const colors = { critique: 'bg-red-500', eleve: 'bg-orange-500', modere: 'bg-amber-400', faible: 'bg-emerald-500' };
              return (<div key={level} className="flex-1 text-center"><div className={`${colors[level]} text-white rounded-xl p-2 mb-1`}><p className="text-lg font-bold">{count}</p></div><p className="text-[9px] text-gray-500 capitalize">{level}</p></div>);
            })}
          </div>
        </div>
      )}
      {achievements.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="text-xs font-semibold text-gray-600 mb-3 flex items-center gap-2"><Award className="w-4 h-4 text-amber-500" />Badges</h3>
          <div className="flex flex-wrap gap-2">
            {achievements.map(a => (<span key={a.id} className="bg-amber-50 text-amber-700 border border-amber-200 text-xs px-3 py-1.5 rounded-full flex items-center gap-1"><Star className="w-3 h-3" />{a.name}</span>))}
          </div>
        </div>
      )}
    </div>
  );
};

// ========= ONGLET PLUS =========
const StorageIndicator = () => {
  const [storage, setStorage] = useState(null);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    estimateStorage();
  }, []);

  const estimateStorage = async () => {
    try {
      // Use StorageManager API if available
      if (navigator.storage && navigator.storage.estimate) {
        const est = await navigator.storage.estimate();
        const usedMB = (est.usage || 0) / (1024 * 1024);
        const quotaMB = (est.quota || 0) / (1024 * 1024);
        setStorage({ usedMB, quotaMB, percentage: quotaMB > 0 ? (usedMB / quotaMB) * 100 : 0 });
      } else {
        setStorage({ usedMB: 0, quotaMB: 0, percentage: 0, unsupported: true });
      }
    } catch {
      setStorage({ usedMB: 0, quotaMB: 0, percentage: 0, error: true });
    }
  };

  const clearCache = async () => {
    if (!window.confirm('Supprimer toutes les donnees hors-ligne ? Les donnees en attente de synchronisation seront perdues.')) return;
    setClearing(true);
    try {
      const dbs = await window.indexedDB.databases?.() || [];
      for (const dbInfo of dbs) {
        if (dbInfo.name) window.indexedDB.deleteDatabase(dbInfo.name);
      }
      await estimateStorage();
      toast.success('Cache hors-ligne vide');
    } catch {
      toast.error('Erreur lors du nettoyage');
    }
    setClearing(false);
  };

  if (!storage) return null;

  const formatSize = (mb) => mb < 1 ? `${(mb * 1024).toFixed(0)} Ko` : `${mb.toFixed(1)} Mo`;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4" data-testid="storage-indicator">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
          <Database className="w-5 h-5 text-slate-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-800">Stockage hors-ligne</p>
          <p className="text-[10px] text-gray-400">
            {storage.unsupported ? 'Non disponible' : storage.error ? 'Erreur' : `${formatSize(storage.usedMB)} utilise`}
          </p>
        </div>
        <button
          onClick={clearCache}
          disabled={clearing}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-500 text-xs font-medium active:bg-red-100 transition-colors disabled:opacity-50"
          data-testid="clear-cache-btn"
        >
          {clearing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
          <span>Vider</span>
        </button>
      </div>
      {!storage.unsupported && !storage.error && (
        <div>
          <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
            <span>{formatSize(storage.usedMB)}</span>
            <span>{formatSize(storage.quotaMB)}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${storage.percentage > 80 ? 'bg-red-500' : storage.percentage > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.min(storage.percentage, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const MoreTab = ({ navigate, onTabChange }) => {
  const { user, logout } = useAuth();

  const sections = [
    {
      title: 'Outils Terrain',
      items: [
        { label: 'Tableau SSRTE', desc: 'Suivi des visites SSRTE', icon: ClipboardCheck, color: 'bg-cyan-500', route: '/agent/ssrte' },
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
    <div className="p-4 space-y-5" data-testid="more-tab">
      <h2 className="text-base font-bold text-gray-800">Plus</h2>

      {sections.map((section) => (
        <div key={section.title}>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{section.title}</p>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100 overflow-hidden">
            {section.items.map((item) => (
              <button key={item.label} onClick={() => item.action ? item.action() : navigate(item.route)}
                className="w-full flex items-center gap-3 p-4 text-left active:bg-gray-50 transition-colors"
                data-testid={`more-${item.label.toLowerCase().replace(/\s/g, '-')}`}>
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

      <StorageIndicator />

      <button onClick={logout}
        className="w-full flex items-center justify-center gap-2 p-4 bg-red-50 rounded-2xl text-red-500 text-sm font-medium active:bg-red-100 transition-colors border border-red-100"
        data-testid="agent-logout">
        <LogOut className="w-4 h-4" />Deconnexion
      </button>
    </div>
  );
};

// ========= INSCRIPTION =========
const AgentRegistrationForm = () => {
  const { isOnline, queueAction } = useOffline();
  const { user } = useAuth();
  const agentId = user?.id || user?._id || '';
  const [form, setForm] = useState({ nom_complet: '', telephone: '', cooperative_code: '', village: '', pin: '', hectares: '' });
  const [submitting, setSubmitting] = useState(false);
  const [recentRegs, setRecentRegs] = useState([]);
  const [offlineRegs, setOfflineRegs] = useState([]);
  const handleChange = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const loadRecent = async () => {
    try {
      const storedUser = localStorage.getItem('user');
      const userId = storedUser ? JSON.parse(storedUser)._id : '';
      const r = await fetch(`${API_URL}/api/ussd/registrations?limit=10${userId ? `&agent_id=${userId}` : ''}`, { headers: getAuthHeader() });
      if (r.ok) { const d = await r.json(); setRecentRegs(d.registrations || []); }
    } catch {}
  };

  // Load offline registrations from localStorage
  const loadOfflineRegs = () => {
    try {
      const stored = localStorage.getItem('offline_registrations');
      if (stored) setOfflineRegs(JSON.parse(stored));
    } catch {}
  };

  const saveOfflineReg = (reg) => {
    const updated = [reg, ...offlineRegs].slice(0, 20);
    setOfflineRegs(updated);
    localStorage.setItem('offline_registrations', JSON.stringify(updated));
  };

  React.useEffect(() => { loadRecent(); loadOfflineRegs(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nom_complet.trim() || !form.telephone.trim() || !form.pin || form.pin.length !== 4) {
      toast.error('Nom, telephone et PIN (4 chiffres) requis');
      return;
    }
    setSubmitting(true);

    if (isOnline) {
      try {
        const r = await fetch(`${API_URL}/api/ussd/register-web`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
          body: JSON.stringify({ ...form, agent_id: agentId })
        });
        const d = await r.json();
        if (r.ok) {
          toast.success(`${form.nom_complet} inscrit!`);
          setForm({ nom_complet: '', telephone: '', cooperative_code: '', village: '', pin: '', hectares: '' });
          loadRecent();
        } else {
          toast.error(d.detail || 'Erreur');
        }
      } catch {
        // Network failed even though we thought we were online — queue offline
        await queueAction({
          action_type: 'register_farmer',
          data: { ...form },
        });
        saveOfflineReg({ full_name: form.nom_complet, phone_number: form.telephone, village: form.village, offline: true, created_at: new Date().toISOString() });
        toast.success(`${form.nom_complet} sauvegarde hors-ligne (sync auto)`);
        setForm({ nom_complet: '', telephone: '', cooperative_code: '', village: '', pin: '', hectares: '' });
      }
    } else {
      // Offline mode — queue for later sync
      await queueAction({
        action_type: 'register_farmer',
        data: { ...form },
      });
      saveOfflineReg({ full_name: form.nom_complet, phone_number: form.telephone, village: form.village, offline: true, created_at: new Date().toISOString() });
      toast.success(`${form.nom_complet} sauvegarde hors-ligne (sync auto au retour en ligne)`);
      setForm({ nom_complet: '', telephone: '', cooperative_code: '', village: '', pin: '', hectares: '' });
    }
    setSubmitting(false);
  };

  const allRegs = [...offlineRegs.map(r => ({ ...r, _offline: true })), ...recentRegs.filter(r => !offlineRegs.some(o => o.phone_number === r.phone_number))];

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-base font-bold text-gray-800">Inscrire un planteur</h2>
      {!isOnline && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2 text-xs text-amber-700" data-testid="offline-reg-banner">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>Mode hors-ligne — Les inscriptions seront synchronisees au retour en ligne</span>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-3" data-testid="agent-reg-form">
        <Input placeholder="Nom complet *" value={form.nom_complet} onChange={e => handleChange('nom_complet', e.target.value)} className="h-12 text-base rounded-xl" data-testid="agent-reg-name" />
        <Input placeholder="Telephone *" value={form.telephone} onChange={e => handleChange('telephone', e.target.value)} className="h-12 text-base rounded-xl" data-testid="agent-reg-phone" />
        <Input placeholder="Village" value={form.village} onChange={e => handleChange('village', e.target.value)} className="h-12 text-base rounded-xl" />
        <div className="grid grid-cols-2 gap-3">
          <Input placeholder="PIN 4 chiffres *" type="password" maxLength={4} value={form.pin} onChange={e => handleChange('pin', e.target.value.replace(/\D/g, '').slice(0, 4))} className="h-12 text-base rounded-xl" data-testid="agent-reg-pin" />
          <Input placeholder="Hectares" type="number" step="0.5" value={form.hectares} onChange={e => handleChange('hectares', e.target.value)} className="h-12 text-base rounded-xl" />
        </div>
        <p className="text-[10px] text-gray-400 px-1">L'agriculteur sera automatiquement inscrit dans votre cooperative</p>
        <Button type="submit" disabled={submitting} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-base font-semibold rounded-xl" data-testid="agent-reg-submit">
          {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Inscription...</> : <><UserPlus className="w-4 h-4 mr-2" />{isOnline ? 'Inscrire' : 'Sauvegarder (hors-ligne)'}</>}
        </Button>
      </form>
      {allRegs.length > 0 && (
        <div><h3 className="text-sm font-semibold text-gray-500 mb-2">Recentes</h3>
          <div className="space-y-2">{allRegs.slice(0, 5).map((r, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div>
                <p className="text-sm font-medium text-gray-800">{r.full_name || r.nom_complet}</p>
                <p className="text-xs text-gray-400">{r.phone_number}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400">{r.village}</span>
                {r._offline && <Badge className="bg-amber-100 text-amber-700 text-[8px] px-1.5">En attente</Badge>}
              </div>
            </div>
          ))}</div>
        </div>
      )}
    </div>
  );
};

// ========= PHOTOS GEOLOCALISEES =========
const PhotosPanel = ({ farmer, onClose }) => {
  const { queueAction } = useOffline();
  const [photos, setPhotos] = useState([]);
  const [gpsStatus, setGpsStatus] = useState('idle');
  const [currentGps, setCurrentGps] = useState(null);
  const fileRef = React.useRef(null);

  React.useEffect(() => {
    setGpsStatus('loading');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { setCurrentGps({ lat: pos.coords.latitude, lng: pos.coords.longitude, acc: Math.round(pos.coords.accuracy) }); setGpsStatus('ok'); },
        () => setGpsStatus('error'),
        { enableHighAccuracy: true, timeout: 15000 }
      );
    } else { setGpsStatus('error'); }
  }, []);

  const handleCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPhotos(prev => [...prev, {
        data: reader.result,
        name: file.name,
        gps: currentGps,
        timestamp: new Date().toISOString(),
        farmer_id: farmer.id,
        farmer_name: farmer.full_name,
      }]);
      toast.success('Photo capturee');
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (photos.length === 0) { toast.error('Aucune photo'); return; }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/agent/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          farmer_id: farmer.id,
          farmer_name: farmer.full_name,
          photos: photos.map(p => ({ gps: p.gps, timestamp: p.timestamp, name: p.name })),
        }),
      });
      if (res.ok) { toast.success(`${photos.length} photo(s) enregistree(s)`); onClose(); }
      else throw new Error();
    } catch {
      await queueAction({
        action_type: 'photos_geolocalisees',
        farmer_id: farmer.id,
        data: { farmer_name: farmer.full_name, photos: photos.map(p => ({ gps: p.gps, timestamp: p.timestamp, name: p.name })) },
      });
      toast.success('Photos sauvegardees hors-ligne');
      onClose();
    }
  };

  return (
    <div className="p-4 space-y-4" data-testid="photos-panel">
      <button onClick={onClose} className="flex items-center gap-1 text-gray-400 text-sm"><ArrowLeft className="w-4 h-4" />Retour au profil</button>
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <h2 className="text-base font-bold text-gray-800 mb-1">Photos Geolocalisees</h2>
        <p className="text-xs text-gray-400 mb-3">Planteur: <strong>{farmer.full_name}</strong></p>
        <div className={`flex items-center gap-2 p-2 rounded-lg text-xs mb-3 ${gpsStatus === 'ok' ? 'bg-emerald-50 text-emerald-700' : gpsStatus === 'error' ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-500'}`}>
          <MapPin className="w-3.5 h-3.5" />
          {gpsStatus === 'loading' && 'Localisation GPS...'}
          {gpsStatus === 'ok' && `GPS: ${currentGps.lat.toFixed(5)}, ${currentGps.lng.toFixed(5)} (±${currentGps.acc}m)`}
          {gpsStatus === 'error' && 'GPS indisponible'}
        </div>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleCapture} className="hidden" />
        <Button onClick={() => fileRef.current?.click()} className="w-full h-12 bg-pink-500 hover:bg-pink-600 rounded-xl text-base" data-testid="capture-photo-btn">
          <Camera className="w-5 h-5 mr-2" />Prendre une photo
        </Button>
      </div>
      {photos.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500">{photos.length} photo(s) capturee(s)</p>
          <div className="grid grid-cols-3 gap-2">
            {photos.map((p, i) => (
              <div key={i} className="relative rounded-xl overflow-hidden border border-gray-200 aspect-square">
                <img src={p.data} alt="" className="w-full h-full object-cover" />
                {p.gps && <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-[8px] text-white px-1.5 py-0.5"><MapPin className="w-2.5 h-2.5 inline mr-0.5" />{p.gps.lat.toFixed(4)}, {p.gps.lng.toFixed(4)}</div>}
              </div>
            ))}
          </div>
          <Button onClick={handleSave} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-base" data-testid="save-photos-btn">
            <CheckCircle2 className="w-4 h-4 mr-2" />Enregistrer ({photos.length} photo{photos.length > 1 ? 's' : ''})
          </Button>
        </div>
      )}
    </div>
  );
};

// ========= MAIN =========
const AgentTerrainDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
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
  const [showPhotosPanel, setShowPhotosPanel] = useState(false);
  const [ssrteFlowActive, setSsrteFlowActive] = useState(false);
  const [showUSSDSimulator, setShowUSSDSimulator] = useState(false);

  // Handle navigation state from SSRTE dashboard "Nouvelle Visite" button
  useEffect(() => {
    if (location.state?.action === 'ssrte') {
      setTab('farmers');
      setSsrteFlowActive(true);
      toast.info('Sélectionnez un planteur pour la visite SSRTE');
      // Clear the state to avoid re-triggering
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const loadDashboard = useCallback(async () => {
    try { const r = await fetch(`${API_URL}/api/field-agent/dashboard`, { headers: getAuthHeader() }); if (r.ok) setDashboard(await r.json()); } catch {} finally { setLoading(false); }
  }, []);
  const loadMyFarmers = useCallback(async () => {
    setFarmersLoading(true);
    try { const r = await fetch(`${API_URL}/api/field-agent/my-farmers`, { headers: getAuthHeader() }); if (r.ok) { const d = await r.json(); setMyFarmers(d.farmers || []); } } catch {} finally { setFarmersLoading(false); }
  }, []);
  useEffect(() => { loadDashboard(); loadMyFarmers(); }, [loadDashboard, loadMyFarmers]);

  const openFarmerProfile = (farmer) => {
    setSelectedFarmer(farmer);
    // If SSRTE flow is active, directly open the SSRTE modal
    if (ssrteFlowActive) {
      setSsrteFlowActive(false);
      setShowSSRTEModal(true);
      setTab('farmer-profile');
    } else {
      setTab('farmer-profile');
    }
  };
  const handleFormAction = (formId) => {
    if (!selectedFarmer) return;
    const fId = selectedFarmer.id || '', fName = encodeURIComponent(selectedFarmer.full_name || ''), fPhone = encodeURIComponent(selectedFarmer.phone_number || '');
    switch (formId) {
      case 'ici': setShowICIModal(true); break;
      case 'ssrte': setShowSSRTEModal(true); break;
      case 'redd': navigate(`/redd/tracking?farmer=${fName}&phone=${fPhone}&id=${fId}`); break;
      case 'parcels': navigate(`/cooperative/parcels/new?farmer_id=${fId}&farmer_name=${fName}`); break;
      case 'photos': setShowPhotosPanel(true); break;
      case 'register': navigate(`/farmer/inscription?phone=${fPhone}&name=${fName}`); break;
      default: break;
    }
  };
  const handleSearch = async (e) => {
    e.preventDefault(); if (!phone.trim()) return;
    setSearching(true); setSearchResult(null);
    try { const r = await fetch(`${API_URL}/api/agent/search?phone=${encodeURIComponent(phone.trim())}`, { headers: getAuthHeader() }); const d = await r.json(); if (d.found) { setSearchResult(d.farmer); toast.success(`Trouve: ${d.farmer.full_name}`); } else toast.error('Aucun planteur trouve'); } catch { toast.error('Recherche impossible — verifiez votre connexion'); }
    setSearching(false);
  };
  const filteredFarmers = myFarmers.filter(f => { if (!farmerSearch) return true; const s = farmerSearch.toLowerCase(); return f.full_name?.toLowerCase().includes(s) || f.phone_number?.includes(s) || f.village?.toLowerCase().includes(s); });

  if (loading) {
    return (<MobileAppShell title="GreenLink Agent" tabs={TABS} activeTab="home" onTabChange={setTab}><div className="flex flex-col items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-3" /><p className="text-sm text-gray-400">Chargement...</p></div></MobileAppShell>);
  }

  const info = { ...dashboard?.agent_info, stats: { ssrte: dashboard?.statistics?.ssrte_visits?.total || 0, parcels: dashboard?.statistics?.parcels_declared?.total || 0 } };
  const perf = dashboard?.performance || {};
  const score = perf.score || 0;
  const badgeInfo = score >= 80 ? { text: 'Expert', bg: 'bg-emerald-500' } : score >= 50 ? { text: 'Confirme', bg: 'bg-amber-500' } : { text: 'Debutant', bg: 'bg-gray-400' };

  return (
    <MobileAppShell
      title={tab === 'home' ? null : (info.name || user?.full_name || 'Agent Terrain')}
      subtitle={tab === 'home' ? null : (info.cooperative || '')}
      tabs={TABS}
      activeTab={['farmer-profile', 'search'].includes(tab) ? (tab === 'search' ? 'more' : 'farmers') : tab}
      onTabChange={(id) => { setTab(id); setSelectedFarmer(null); }}
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
      {tab === 'home' && <HomeTab info={info} myFarmers={myFarmers} onTabChange={setTab} navigate={navigate} onShowUSSD={() => setShowUSSDSimulator(true)} />}
      {tab === 'dashboard' && <DashboardTab dashboard={dashboard} myFarmers={myFarmers} onTabChange={setTab} />}
      {tab === 'more' && <MoreTab navigate={navigate} onTabChange={setTab} />}
      {tab === 'inscriptions' && <AgentRegistrationForm />}

      {/* Recherche (accessible via Plus > Rechercher) */}
      {tab === 'search' && (
        <div className="p-4 space-y-4">
          <button onClick={() => setTab('more')} className="flex items-center gap-1 text-gray-400 text-sm"><ArrowLeft className="w-4 h-4" />Retour</button>
          <h2 className="text-base font-bold text-gray-800">Rechercher un planteur</h2>
          <form onSubmit={handleSearch} className="space-y-3" data-testid="agent-search-form">
            <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><Input placeholder="Numero de telephone" value={phone} onChange={e => setPhone(e.target.value)} className="pl-10 h-12 rounded-xl text-base" data-testid="agent-search-input" /></div>
            <Button type="submit" disabled={searching} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-base" data-testid="agent-search-button"><Search className="w-4 h-4 mr-2" />{searching ? 'Recherche...' : 'Rechercher'}</Button>
          </form>
          {searchResult && (
            <button onClick={() => openFarmerProfile(searchResult)} className="w-full bg-white rounded-2xl p-4 shadow-sm border-l-4 border-emerald-500 flex items-center gap-3 active:bg-gray-50 text-left" data-testid="search-result-card">
              <div className="w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center"><Leaf className="h-5 w-5 text-emerald-600" /></div>
              <div className="flex-1"><p className="text-sm font-semibold">{searchResult.full_name}</p><p className="text-xs text-gray-400">{searchResult.phone_number}</p></div>
              <Eye className="w-4 h-4 text-emerald-500" />
            </button>
          )}
        </div>
      )}

      {/* Planteurs */}
      {tab === 'farmers' && (
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between"><h2 className="text-base font-bold text-gray-800">Mes Planteurs</h2><Badge className="bg-emerald-100 text-emerald-700">{myFarmers.length}</Badge></div>
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /><Input placeholder="Rechercher..." value={farmerSearch} onChange={e => setFarmerSearch(e.target.value)} className="pl-10 h-11 rounded-xl text-sm" data-testid="farmer-search-input" /></div>
          {farmersLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-emerald-500" /></div> : filteredFarmers.length > 0 ? (
            <div className="space-y-2" data-testid="farmers-list">{filteredFarmers.map(f => {
              const comp = f.completion || { completed: 0, total: 6, percentage: 0 };
              return (
                <button key={f.id} onClick={() => openFarmerProfile(f)} className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3 active:bg-gray-50 text-left" data-testid={`farmer-card-${f.id}`}>
                  <div className="w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center relative flex-shrink-0"><Leaf className="h-5 w-5 text-emerald-600" />{comp.percentage === 100 && <div className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center ring-2 ring-white"><CheckCircle2 className="h-2.5 w-2.5 text-white" /></div>}</div>
                  <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-gray-900 truncate">{f.full_name}</p><p className="text-xs text-gray-400 truncate">{f.phone_number} {f.village ? `- ${f.village}` : ''}</p>
                    <div className="flex items-center gap-2 mt-1.5"><div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[100px]"><div className={`h-full rounded-full ${comp.percentage >= 80 ? 'bg-emerald-500' : comp.percentage >= 40 ? 'bg-amber-500' : 'bg-gray-300'}`} style={{ width: `${comp.percentage}%` }} /></div><span className="text-[9px] text-gray-400">{comp.completed}/{comp.total}</span></div></div>
                  <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                </button>);
            })}</div>
          ) : <div className="text-center py-12"><Users className="w-12 h-12 mx-auto text-gray-200 mb-3" /><p className="text-gray-400 text-sm">{farmerSearch ? 'Aucun resultat' : 'Aucun planteur'}</p></div>}
        </div>
      )}

      {/* Profil Planteur ou Panel Photos */}
      {tab === 'farmer-profile' && selectedFarmer && (
        showPhotosPanel ? (
          <PhotosPanel farmer={selectedFarmer} onClose={() => setShowPhotosPanel(false)} />
        ) : (
        <div className="p-4 space-y-3" data-testid="farmer-profile-view">
          <button onClick={() => { setTab('farmers'); setSelectedFarmer(null); }} className="flex items-center gap-1 text-gray-400 text-sm"><ArrowLeft className="w-4 h-4" />Retour</button>
          <div className={`rounded-2xl p-4 shadow-sm border ${selectedFarmer.completion?.percentage === 100 ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-100'}`}>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0"><User className="h-7 w-7 text-emerald-600" /></div>
              <div className="flex-1 min-w-0"><h2 className="text-base font-bold text-gray-900 truncate" data-testid="farmer-name">{selectedFarmer.full_name}</h2><div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">{selectedFarmer.phone_number && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{selectedFarmer.phone_number}</span>}<span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{selectedFarmer.village || 'N/A'}</span></div></div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-200/50">
              <div className="flex items-center justify-between mb-1.5"><span className="text-xs text-gray-500">Progression</span><span className={`text-xs font-bold ${selectedFarmer.completion?.percentage === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>{selectedFarmer.completion?.percentage || 0}%</span></div>
              <Progress value={selectedFarmer.completion?.percentage || 0} className="h-2" />
              <div className="flex items-center justify-between mt-2">
                {FARMER_FORMS.map(f => { const isDone = selectedFarmer.forms_status?.[f.id]?.completed; return (<div key={f.id} className="flex flex-col items-center gap-0.5"><div className={`w-5 h-5 rounded-full flex items-center justify-center ${isDone ? 'bg-emerald-500' : 'bg-gray-200'}`}>{isDone ? <CheckCircle2 className="w-3 h-3 text-white" /> : <f.icon className="w-2.5 h-2.5 text-gray-400" />}</div><span className={`text-[7px] uppercase ${isDone ? 'text-emerald-600 font-bold' : 'text-gray-400'}`}>{f.id}</span></div>); })}
              </div>
            </div>
          </div>
          <h3 className="text-xs font-semibold text-gray-500 px-1">Fiches a remplir</h3>
          <div className="space-y-2" data-testid="farmer-forms-list">
            {FARMER_FORMS.map((form, index) => {
              const status = selectedFarmer.forms_status?.[form.id]; const isDone = status?.completed;
              return (<button key={form.id} onClick={() => handleFormAction(form.id)} className={`w-full flex items-center gap-3 p-3.5 rounded-xl text-left active:scale-[0.98] transition-transform ${isDone ? 'bg-emerald-50 border-2 border-emerald-200' : 'bg-white border border-gray-100 shadow-sm'}`} data-testid={`form-${form.id}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${isDone ? 'bg-emerald-500' : 'bg-gray-200'}`}>{isDone ? <CheckCircle2 className="w-3.5 h-3.5 text-white" /> : <span className="text-xs font-bold text-gray-500">{index + 1}</span>}</div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isDone ? 'bg-emerald-500' : form.color}`}><form.icon className="w-5 h-5 text-white" /></div>
                <div className="flex-1 min-w-0"><p className={`text-sm font-semibold ${isDone ? 'text-emerald-700' : 'text-gray-800'}`}>{form.label}</p><p className="text-[10px] text-gray-400 truncate">{form.desc}</p>{status?.count > 0 && <span className="text-[9px] text-emerald-600 font-medium">{status.count} enreg.</span>}</div>
                <ChevronRight className={`w-4 h-4 flex-shrink-0 ${isDone ? 'text-emerald-400' : 'text-gray-300'}`} />
              </button>);
            })}
          </div>
          <FarmerHistorySection farmer={selectedFarmer} />
        </div>
        )
      )}

      <ICIProfileModal open={showICIModal} onOpenChange={setShowICIModal} farmer={selectedFarmer} onSaved={() => loadMyFarmers()} />
      <SSRTEVisitModal open={showSSRTEModal} onOpenChange={setShowSSRTEModal} farmer={selectedFarmer} onSaved={() => loadMyFarmers()} />

      {/* Simulateur USSD - Calcul prime carbone */}
      {showUSSDSimulator && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" data-testid="ussd-simulator-overlay">
          <div className="w-full max-w-md max-h-[90vh] overflow-auto">
            <USSDSimulator 
              title="Simulateur USSD *144*99#" 
              onClose={() => setShowUSSDSimulator(false)} 
              members={myFarmers.map(f => ({
                id: f._id || f.id,
                full_name: f.full_name,
                phone_number: f.phone_number
              }))} 
            />
          </div>
        </div>
      )}
    </MobileAppShell>
  );
};

export default AgentTerrainDashboard;

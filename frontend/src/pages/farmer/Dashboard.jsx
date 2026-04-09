import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useOffline } from '../../context/OfflineContext';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { MobileAppShell } from '../../components/MobileAppShell';
import { NotificationCenter } from '../../components/NotificationCenter';
import { greenlinkApi } from '../../services/greenlinkApi';
import { toast } from 'sonner';
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
    { num: '1', label: 'Mes Parcelles', sub: `${stats?.total_parcelles || 0} parcelle(s) declaree(s)`, icon: MapPin, color: 'bg-emerald-500', action: () => onTabChange('parcels') },
    { num: '2', label: 'Mon PDC', sub: 'Plan de Developpement Cacaoyer', icon: FileText, color: 'bg-green-700', action: () => navigate('/farmer/pdc') },
    { num: '3', label: 'Mes Recoltes', sub: 'Suivez vos declarations', icon: Package, color: 'bg-amber-500', action: () => navigate('/farmer/my-harvests') },
    { num: '4', label: 'Declarer une Recolte', sub: 'Enregistrez votre production', icon: TrendingUp, color: 'bg-blue-500', action: () => navigate('/harvest-marketplace') },
    { num: '5', label: 'Marketplace Intrants', sub: 'Achetez intrants & equipements', icon: ShoppingCart, color: 'bg-orange-500', action: () => navigate('/marketplace'), highlight: true },
    { num: '6', label: 'Mon Score Carbone', sub: `Score: ${carbonScore.toFixed(1)}/10`, icon: Award, color: 'bg-teal-500', action: () => navigate('/farmer/carbon-score') },
    { num: '6b', label: 'Pratiques Durables', sub: 'Guide des 21 pratiques eligibles', icon: Leaf, color: 'bg-green-600', action: () => navigate('/guide-redd'), highlight: true },
    { num: '7', label: 'Mes Commandes', sub: 'Historique des achats', icon: FileText, color: 'bg-gray-500', action: () => navigate('/buyer/orders') },
    { num: '8', label: 'Primes Carbone', sub: 'Simulateur et paiements', icon: DollarSign, color: 'bg-purple-500', action: () => navigate('/farmer/carbon-payments') },
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
const FarmerMoreTab = ({ navigate, stats, onTabChange }) => {
  const { logout } = useAuth();

  // Progression badge calculation
  const progressItems = [
    { label: 'Profil', done: true },
    { label: 'Parcelles', done: (stats?.total_parcels || 0) > 0 },
    { label: 'Recoltes', done: (stats?.total_harvests || 0) > 0 },
    { label: 'Score Carbone', done: (stats?.carbon_score || 0) > 0 },
    { label: 'Commande', done: (stats?.total_orders || 0) > 0 },
    { label: 'Pratiques REDD', done: (stats?.redd_evaluated || 0) > 0 },
  ];
  const doneCount = progressItems.filter(i => i.done).length;
  const totalCount = progressItems.length;
  const progressPct = Math.round((doneCount / totalCount) * 100);

  const sections = [
    {
      title: 'Mes Activites',
      items: [
        { label: 'Mes Parcelles', desc: 'Declarer et gerer mes parcelles', icon: MapPin, color: 'bg-emerald-500', action: () => onTabChange('parcels') },
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

      {/* Progression Badge */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4" data-testid="farmer-progress-badge">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-emerald-600" />
            <span className="text-sm font-bold text-emerald-800">Ma Progression</span>
          </div>
          <span className="text-lg font-black text-emerald-700">{progressPct}%</span>
        </div>
        <div className="w-full bg-emerald-200 rounded-full h-2.5 mb-3">
          <div className="bg-emerald-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {progressItems.map((item) => (
            <span key={item.label}
              className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${
                item.done ? 'bg-emerald-500 text-white' : 'bg-white text-gray-400 border border-gray-200'
              }`}>
              {item.done ? <CheckCircle2 className="w-3 h-3" /> : <span className="w-3 h-3 rounded-full border border-gray-300 inline-block" />}
              {item.label}
            </span>
          ))}
        </div>
        <p className="text-[10px] text-emerald-600 mt-2">{doneCount}/{totalCount} etapes completees</p>
      </div>

      {sections.map((section) => (
        <div key={section.title}>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{section.title}</p>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100 overflow-hidden">
            {section.items.map((item) => (
              <button key={item.label} onClick={() => item.action ? item.action() : navigate(item.route)}
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

// ========= PARCELLES (Farmer's parcels tab) =========
const DEPARTMENTS_FARMER = [
  'Abidjan', 'Abengourou', 'Aboisso', 'Adzope', 'Agboville',
  'Bangolo', 'Bouafle', 'Bouake', 'Daloa', 'Divo',
  'Gagnoa', 'Korhogo', 'Man', 'San-Pedro', 'Soubre',
  'Yamoussoukro', 'Autre'
];
const CROP_TYPES_FARMER = [
  { id: 'cacao', label: 'Cacao' }, { id: 'cafe', label: 'Cafe' },
  { id: 'anacarde', label: 'Anacarde' }, { id: 'hevea', label: 'Hevea' },
  { id: 'palmier', label: 'Palmier' },
];
const CERTIFICATIONS_FARMER = [
  { id: '', label: 'Aucune' }, { id: 'Rainforest Alliance', label: 'Rainforest Alliance' },
  { id: 'UTZ', label: 'UTZ Certified' }, { id: 'Fairtrade', label: 'Fairtrade' }, { id: 'Bio', label: 'Bio' },
];
const estimateCouvertureFarmer = (grands, moyens, petits, areaHa) => {
  const g = parseInt(grands) || 0, m = parseInt(moyens) || 0, p = parseInt(petits) || 0;
  const area = Math.max(parseFloat(areaHa) || 0.01, 0.01) * 10000;
  return Math.min(100, Math.round(((g * 90) + (m * 30) + (p * 10)) / area * 1000) / 10);
};

const FarmerParcelsTab = ({ navigate }) => {
  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    location: '', village: '', department: '', crop_type: 'cacao', certification: '',
    area_hectares: '', arbres_grands: '', arbres_moyens: '', arbres_petits: '',
    couverture_ombragee: '', planting_year: '', notes: '',
    has_shade_trees: false, uses_organic_fertilizer: false, has_erosion_control: false,
  });
  const API_URL = process.env.REACT_APP_BACKEND_URL;
  const getToken = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

  const setField = (k, v) => {
    const next = { ...form, [k]: v };
    if (['arbres_grands', 'arbres_moyens', 'arbres_petits', 'area_hectares'].includes(k)) {
      const est = estimateCouvertureFarmer(next.arbres_grands, next.arbres_moyens, next.arbres_petits, next.area_hectares);
      if (est > 0) next.couverture_ombragee = String(est);
    }
    setForm(next);
  };

  const totalTrees = (parseInt(form.arbres_grands) || 0) + (parseInt(form.arbres_moyens) || 0) + (parseInt(form.arbres_petits) || 0);

  const fetchParcels = async () => {
    try {
      const res = await fetch(`${API_URL}/api/greenlink/parcels/my-parcels`, { headers: getToken() });
      if (res.ok) setParcels(await res.json());
    } catch (err) { console.error('Error:', err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchParcels(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.area_hectares || !form.location) {
      toast.error('Veuillez remplir la localisation et la superficie');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        location: form.location,
        village: form.village,
        department: form.department,
        region: form.department,
        crop_type: form.crop_type,
        certification: form.certification,
        area_hectares: parseFloat(form.area_hectares) || 0,
        arbres_grands: parseInt(form.arbres_grands) || 0,
        arbres_moyens: parseInt(form.arbres_moyens) || 0,
        arbres_petits: parseInt(form.arbres_petits) || 0,
        couverture_ombragee: parseFloat(form.couverture_ombragee) || 0,
        planting_year: parseInt(form.planting_year) || null,
        notes: form.notes,
        has_shade_trees: form.has_shade_trees,
        uses_organic_fertilizer: form.uses_organic_fertilizer,
        has_erosion_control: form.has_erosion_control,
      };
      const res = await fetch(`${API_URL}/api/greenlink/parcels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getToken() },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        toast.success('Parcelle declaree avec succes');
        setShowForm(false);
        setForm({ location: '', village: '', department: '', crop_type: 'cacao', certification: '', area_hectares: '', arbres_grands: '', arbres_moyens: '', arbres_petits: '', couverture_ombragee: '', planting_year: '', notes: '', has_shade_trees: false, uses_organic_fertilizer: false, has_erosion_control: false });
        setLoading(true);
        fetchParcels();
      } else {
        const err = await res.json();
        toast.error(err.detail || 'Erreur lors de la declaration');
      }
    } catch { toast.error('Erreur de connexion'); }
    finally { setSubmitting(false); }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'verified': return { text: 'Verifiee', bg: 'bg-emerald-100 text-emerald-700' };
      case 'rejected': return { text: 'Rejetee', bg: 'bg-red-100 text-red-700' };
      default: return { text: 'En attente', bg: 'bg-amber-100 text-amber-700' };
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-green-500 animate-spin mb-3" />
        <p className="text-sm text-gray-400">Chargement des parcelles...</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4" data-testid="farmer-parcels-tab">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-gray-800">Mes Parcelles</h2>
        <Button onClick={() => setShowForm(!showForm)} size="sm" className="bg-emerald-600 hover:bg-emerald-700 h-8 text-xs" data-testid="add-parcel-btn">
          <Plus className="w-3.5 h-3.5 mr-1" />{showForm ? 'Annuler' : 'Nouvelle Parcelle'}
        </Button>
      </div>

      {/* Add Parcel Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-200 space-y-3" data-testid="add-parcel-form">
          <p className="text-sm font-semibold text-emerald-800">Declarer une parcelle</p>

          {/* Localisation section */}
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-2">Localisation</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">Nom parcelle *</label>
              <input value={form.location} onChange={e => setField('location', e.target.value)} placeholder="Parcelle Nord" className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 outline-none" data-testid="parcel-location" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Village</label>
              <input value={form.village} onChange={e => setField('village', e.target.value)} placeholder="Ex: Kossou" className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-emerald-400 outline-none" data-testid="parcel-village" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500">Departement</label>
            <select value={form.department} onChange={e => setField('department', e.target.value)} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-emerald-400 outline-none" data-testid="parcel-department">
              <option value="">-- Choisir --</option>
              {DEPARTMENTS_FARMER.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {/* Caracteristiques section */}
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-2">Caracteristiques</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">Superficie (ha) *</label>
              <input type="number" step="0.1" value={form.area_hectares} onChange={e => setField('area_hectares', e.target.value)} placeholder="3.5" className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-emerald-400 outline-none" data-testid="parcel-area" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Culture *</label>
              <select value={form.crop_type} onChange={e => setField('crop_type', e.target.value)} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-emerald-400 outline-none" data-testid="parcel-crop">
                {CROP_TYPES_FARMER.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">Certification</label>
              <select value={form.certification} onChange={e => setField('certification', e.target.value)} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-emerald-400 outline-none" data-testid="parcel-certification">
                {CERTIFICATIONS_FARMER.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Annee de plantation</label>
              <input type="number" value={form.planting_year} onChange={e => setField('planting_year', e.target.value)} placeholder="2015" className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-emerald-400 outline-none" data-testid="parcel-year" />
            </div>
          </div>

          {/* Arbres par strate */}
          <div className="border-t pt-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Arbres ombrages par strate</p>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <p className="text-[10px] text-gray-400 mb-1 text-center">Strate 3 (&gt;30m)</p>
                <input type="number" min="0" value={form.arbres_grands} onChange={e => setField('arbres_grands', e.target.value)} placeholder="0" className="w-full px-2 py-2 rounded-xl border border-gray-200 text-sm text-center focus:border-emerald-400 outline-none" data-testid="parcel-arbres-grands" />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 mb-1 text-center">Strate 2 (5-30m)</p>
                <input type="number" min="0" value={form.arbres_moyens} onChange={e => setField('arbres_moyens', e.target.value)} placeholder="0" className="w-full px-2 py-2 rounded-xl border border-gray-200 text-sm text-center focus:border-emerald-400 outline-none" data-testid="parcel-arbres-moyens" />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 mb-1 text-center">Strate 1 (3-5m)</p>
                <input type="number" min="0" value={form.arbres_petits} onChange={e => setField('arbres_petits', e.target.value)} placeholder="0" className="w-full px-2 py-2 rounded-xl border border-gray-200 text-sm text-center focus:border-emerald-400 outline-none" data-testid="parcel-arbres-petits" />
              </div>
            </div>
            {totalTrees > 0 && <p className="text-xs text-emerald-600 mt-1.5 font-medium">Total: {totalTrees} arbres</p>}
          </div>

          {/* Couverture ombragee */}
          <div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">Couverture ombragee (%)</label>
              {parseFloat(form.couverture_ombragee) > 0 && (
                <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">Auto-calcul</span>
              )}
            </div>
            <input type="number" min="0" max="100" step="0.5" value={form.couverture_ombragee} onChange={e => setField('couverture_ombragee', e.target.value)} placeholder="0" className="w-24 mt-1 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:border-emerald-400 outline-none" data-testid="parcel-couverture" />
          </div>

          {/* Pratiques durables */}
          <div className="border-t pt-3 space-y-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pratiques durables</p>
            {[
              { key: 'has_shade_trees', label: 'Arbres ombrageurs (agroforesterie)' },
              { key: 'uses_organic_fertilizer', label: 'Engrais organique / compost' },
              { key: 'has_erosion_control', label: 'Controle de l\'erosion' },
            ].map(p => (
              <label key={p.key} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form[p.key]} onChange={e => setField(p.key, e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                <span className="text-xs text-gray-700">{p.label}</span>
              </label>
            ))}
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-gray-500">Notes / Observations</label>
            <textarea value={form.notes} onChange={e => setField('notes', e.target.value)} placeholder="Observations sur la parcelle..." rows={2} className="w-full mt-1 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:border-emerald-400 outline-none resize-none" data-testid="parcel-notes" />
          </div>

          <Button type="submit" disabled={submitting} className="w-full bg-emerald-600 hover:bg-emerald-700 h-11 rounded-xl" data-testid="submit-parcel-btn">
            {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Declaration...</> : <><Plus className="w-4 h-4 mr-2" />Declarer ma parcelle</>}
          </Button>
        </form>
      )}

      {parcels.length === 0 && !showForm ? (
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
          <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-600">Aucune parcelle declaree</p>
          <p className="text-xs text-gray-400 mt-1 mb-4">Declarez votre premiere parcelle pour commencer</p>
          <Button onClick={() => setShowForm(true)} className="bg-emerald-600 hover:bg-emerald-700" data-testid="add-first-parcel-btn">
            <Plus className="w-4 h-4 mr-2" />Declarer une parcelle
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-green-50 rounded-xl p-3 text-center border border-green-100">
              <p className="text-xl font-bold text-green-700">{parcels.length}</p>
              <p className="text-[9px] text-green-500">Parcelles</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100">
              <p className="text-xl font-bold text-blue-700">{parcels.reduce((s, p) => s + (p.superficie || 0), 0).toFixed(1)}</p>
              <p className="text-[9px] text-blue-500">Hectares</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100">
              <p className="text-xl font-bold text-emerald-700">{parcels.filter(p => p.statut_verification === 'verified').length}</p>
              <p className="text-[9px] text-emerald-500">Verifiees</p>
            </div>
          </div>

          {/* Parcels List */}
          {parcels.map((parcel) => {
            const badge = getStatusBadge(parcel.statut_verification);
            return (
              <div key={parcel.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100" data-testid={`parcel-${parcel.id}`}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-800 truncate">{parcel.nom || parcel.localisation || 'Parcelle'}</p>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${badge.bg}`}>{badge.text}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{parcel.village || parcel.region || 'N/A'}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[10px] text-gray-500"><strong>{parcel.superficie || 0}</strong> ha</span>
                      <span className="text-[10px] text-gray-500"><strong>{parcel.type_culture || 'cacao'}</strong></span>
                      {parcel.nombre_arbres > 0 && <span className="text-[10px] text-gray-500"><strong>{parcel.nombre_arbres}</strong> arbres</span>}
                      {parcel.score_carbone > 0 && (
                        <span className="text-[10px] text-emerald-600 font-medium">Score: {parcel.score_carbone}/10</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
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
      case 'parcels': setActiveTab('parcels'); break;
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

      {activeTab === 'parcels' && (
        <FarmerParcelsTab navigate={navigate} />
      )}

      {activeTab === 'more' && (
        <FarmerMoreTab navigate={navigate} stats={stats} onTabChange={setActiveTab} />
      )}
    </MobileAppShell>
  );
};

export default FarmerDashboard;

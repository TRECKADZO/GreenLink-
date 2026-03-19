import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, Users, MapPin, Leaf, Camera, FileText,
  Award, UserPlus, Search, Phone, ClipboardCheck, Activity, 
  Target, Star, AlertTriangle, Eye, Loader2, ArrowLeft,
  ChevronRight, User, CheckCircle2, Circle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { toast } from 'sonner';
import Navbar from '../../components/Navbar';
import ICIProfileModal from '../cooperative/ICIProfileModal';
import SSRTEVisitModal from '../cooperative/SSRTEVisitModal';
import FarmerHistorySection from './FarmerHistorySection';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const MENU_ITEMS = [
  { id: 'dashboard', label: 'Tableau de bord', icon: Activity, color: 'text-emerald-600' },
  { id: 'farmers', label: 'Mes Agriculteurs', icon: Users, color: 'text-cyan-600' },
  { id: 'search', label: 'Recherche planteur', icon: Search, color: 'text-gray-600' },
];

const FARMER_FORMS = [
  { id: 'ici', label: 'Fiche ICI', desc: 'Evaluation initiale: famille, enfants, education, pratiques', icon: FileText, color: 'bg-violet-50 text-violet-700 border-violet-200' },
  { id: 'ssrte', label: 'Visite SSRTE', desc: 'Visite terrain: observation travail enfants, risques, remediation', icon: ClipboardCheck, color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  { id: 'parcels', label: 'Declaration parcelles', desc: 'GPS, superficie, type de culture', icon: MapPin, color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'photos', label: 'Photos geolocalisees', desc: 'Photos terrain avec position GPS', icon: Camera, color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'register', label: 'Enregistrement membre', desc: 'Inscrire ce producteur comme membre', icon: UserPlus, color: 'bg-blue-50 text-blue-700 border-blue-200' },
];

const AgentTerrainDashboard = () => {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('dashboard');

  // Farmers
  const [myFarmers, setMyFarmers] = useState([]);
  const [farmersLoading, setFarmersLoading] = useState(false);
  const [selectedFarmer, setSelectedFarmer] = useState(null);
  const [farmerSearch, setFarmerSearch] = useState('');

  // Search by phone
  const [phone, setPhone] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState(null);

  // ICI Modal
  const [showICIModal, setShowICIModal] = useState(false);
  // SSRTE Modal
  const [showSSRTEModal, setShowSSRTEModal] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/field-agent/dashboard`, { headers: getAuthHeader() });
      if (res.ok) setDashboard(await res.json());
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  const loadMyFarmers = useCallback(async () => {
    setFarmersLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/field-agent/my-farmers`, { headers: getAuthHeader() });
      if (res.ok) {
        const data = await res.json();
        setMyFarmers(data.farmers || []);
      }
    } catch { /* silent */ } finally { setFarmersLoading(false); }
  }, []);

  useEffect(() => { loadDashboard(); loadMyFarmers(); }, [loadDashboard, loadMyFarmers]);

  const openFarmerProfile = (farmer) => {
    setSelectedFarmer(farmer);
    setTab('farmer-profile');
  };

  const handleFormAction = (formId) => {
    if (!selectedFarmer) return;
    if (formId === 'ici') {
      setShowICIModal(true);
    } else if (formId === 'ssrte') {
      setShowSSRTEModal(true);
    } else {
      toast.info(`${formId} - Fonctionnalite disponible sur l'application mobile`);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setSearching(true);
    setSearchResult(null);
    try {
      const res = await fetch(`${API_URL}/api/agent/search?phone=${encodeURIComponent(phone.trim())}`, { headers: getAuthHeader() });
      const data = await res.json();
      if (data.found) {
        setSearchResult(data.farmer);
        toast.success(`Planteur trouve: ${data.farmer.full_name}`);
      } else {
        toast.error('Aucun planteur trouve avec ce numero');
      }
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
    { label: 'Visites SSRTE', value: stats.ssrte_visits?.total || 0, month: stats.ssrte_visits?.this_month || 0, target: stats.ssrte_visits?.target || 20, progress: stats.ssrte_visits?.progress || 0, icon: ClipboardCheck, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: 'Membres', value: stats.members_onboarded?.total || 0, target: stats.members_onboarded?.target || 10, progress: stats.members_onboarded?.progress || 0, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Parcelles', value: stats.parcels_declared?.total || 0, target: stats.parcels_declared?.target || 15, progress: stats.parcels_declared?.progress || 0, icon: MapPin, color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'Photos', value: stats.geotagged_photos?.total || 0, target: stats.geotagged_photos?.target || 30, progress: stats.geotagged_photos?.progress || 0, icon: Camera, color: 'text-purple-500', bg: 'bg-purple-50' },
  ];

  const riskColor = (level) => {
    switch(level) {
      case 'critique': return 'bg-red-100 text-red-700 border-red-200';
      case 'eleve': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'modere': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-green-100 text-green-700 border-green-200';
    }
  };

  const score = perf.score || 0;
  const badge = score >= 80 ? { text: 'Expert', bg: 'bg-emerald-100 text-emerald-700', ring: 'ring-emerald-500' }
    : score >= 50 ? { text: 'Confirme', bg: 'bg-amber-100 text-amber-700', ring: 'ring-amber-500' }
    : { text: 'Debutant', bg: 'bg-gray-100 text-gray-600', ring: 'ring-gray-400' };

  return (
    <div className="min-h-screen bg-gray-50 pt-20" data-testid="agent-terrain-dashboard">
      <Navbar />

      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-14 h-14 rounded-full bg-white/20 flex items-center justify-center ring-2 ${badge.ring}`}>
                <Shield className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-lg font-bold" data-testid="agent-name">{info.name || 'Agent Terrain'}</h1>
                <p className="text-emerald-200 text-sm">{info.cooperative || 'Cooperative'} {info.zone ? `- ${info.zone}` : ''}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={`${badge.bg} px-3 py-1`}>{badge.text}</Badge>
              <div className="text-center bg-white/10 rounded-lg px-4 py-2">
                <p className="text-2xl font-bold">{score}%</p>
                <p className="text-xs text-emerald-200">Performance</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Sidebar */}
          <div className="lg:w-56 flex-shrink-0">
            <Card className="border-0 shadow-sm sticky top-24">
              <CardContent className="p-2">
                <nav className="space-y-1" data-testid="agent-sidebar-menu">
                  {MENU_ITEMS.map(item => (
                    <button key={item.id} onClick={() => { setTab(item.id); setSelectedFarmer(null); }} data-testid={`menu-${item.id}`}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        (tab === item.id || (item.id === 'farmers' && tab === 'farmer-profile'))
                          ? 'bg-emerald-50 text-emerald-700 shadow-sm' : 'text-gray-600 hover:bg-gray-50'
                      }`}>
                      <item.icon className={`h-4 w-4 ${(tab === item.id || (item.id === 'farmers' && tab === 'farmer-profile')) ? 'text-emerald-600' : item.color}`} />
                      {item.label}
                      {item.id === 'farmers' && <Badge className="ml-auto bg-emerald-100 text-emerald-700 text-[10px] px-1.5">{myFarmers.length}</Badge>}
                    </button>
                  ))}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="flex-1 space-y-4">

            {/* === TABLEAU DE BORD === */}
            {tab === 'dashboard' && (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" data-testid="kpi-cards">
                  {kpis.map((kpi, i) => (
                    <Card key={i} className="border-0 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className={`p-2 rounded-lg ${kpi.bg}`}><kpi.icon className={`h-4 w-4 ${kpi.color}`} /></div>
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

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-red-50"><AlertTriangle className="h-4 w-4 text-red-500" /></div>
                      <div><p className="text-xl font-bold text-red-600">{stats.children_identified || 0}</p><p className="text-xs text-gray-500">Enfants identifies</p></div>
                    </CardContent>
                  </Card>
                  <Card className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setTab('farmers')}>
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-cyan-50"><Users className="h-4 w-4 text-cyan-500" /></div>
                      <div className="flex-1"><p className="text-xl font-bold text-cyan-600">{myFarmers.length}</p><p className="text-xs text-gray-500">Fermiers assignes</p></div>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </CardContent>
                  </Card>
                </div>

                {(risks.critique > 0 || risks.eleve > 0 || risks.modere > 0 || risks.faible > 0) && (
                  <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2"><Target className="h-4 w-4" />Repartition des Risques</CardTitle></CardHeader>
                    <CardContent className="pb-4">
                      <div className="flex gap-2">
                        {Object.entries(risks).map(([level, count]) => (
                          <div key={level} className={`flex-1 text-center p-2 rounded-lg border ${riskColor(level)}`}>
                            <p className="font-bold text-lg">{count}</p><p className="text-[10px] capitalize">{level}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {achievements.length > 0 && (
                  <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Award className="h-4 w-4 text-amber-500" />Badges</CardTitle></CardHeader>
                    <CardContent className="pb-4"><div className="flex flex-wrap gap-2">{achievements.map(a => <Badge key={a.id} className="bg-amber-50 text-amber-700 border-amber-200 px-3 py-1"><Star className="h-3 w-3 mr-1" />{a.name}</Badge>)}</div></CardContent>
                  </Card>
                )}

                {activities.length > 0 && (
                  <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Activity className="h-4 w-4" />Activites Recentes</CardTitle></CardHeader>
                    <CardContent className="pb-4"><div className="space-y-2">
                      {activities.slice(0, 5).map((a, i) => (
                        <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                          <div className={`w-2 h-2 rounded-full ${a.risk_level === 'critique' ? 'bg-red-500' : a.risk_level === 'eleve' ? 'bg-orange-500' : 'bg-green-500'}`} />
                          <div className="flex-1"><p className="text-sm text-gray-700">{a.farmer_name}</p><p className="text-xs text-gray-400">{a.children_count > 0 ? `${a.children_count} enfant(s)` : 'RAS'}</p></div>
                          <Badge className={riskColor(a.risk_level)} variant="outline">{a.risk_level || 'faible'}</Badge>
                        </div>
                      ))}
                    </div></CardContent>
                  </Card>
                )}
              </>
            )}

            {/* === MES AGRICULTEURS (liste) === */}
            {tab === 'farmers' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-800">Mes Agriculteurs ({myFarmers.length})</h2>
                </div>
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input placeholder="Rechercher par nom, telephone ou village..." value={farmerSearch} onChange={e => setFarmerSearch(e.target.value)} className="pl-10" data-testid="farmer-search-input" />
                </div>
                {farmersLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-emerald-600" /></div>
                ) : filteredFarmers.length > 0 ? (
                  <div className="grid gap-3" data-testid="farmers-list">
                    {filteredFarmers.map(f => {
                      const comp = f.completion || { completed: 0, total: 5, percentage: 0 };
                      const progressColor = comp.percentage >= 80 ? 'bg-emerald-500' : comp.percentage >= 40 ? 'bg-amber-500' : 'bg-gray-300';
                      return (
                      <Card key={f.id} className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group" onClick={() => openFarmerProfile(f)} data-testid={`farmer-card-${f.id}`}>
                        <CardContent className="p-4 flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center relative">
                            <Leaf className="h-6 w-6 text-emerald-600" />
                            {comp.percentage === 100 && (
                              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center ring-2 ring-white">
                                <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors">{f.full_name}</h3>
                            <div className="flex items-center gap-3 text-sm text-gray-500">
                              {f.phone_number && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{f.phone_number}</span>}
                              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{f.village || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[140px]">
                                <div className={`h-full rounded-full transition-all ${progressColor}`} style={{ width: `${comp.percentage}%` }} />
                              </div>
                              <span className="text-[10px] font-medium text-gray-400">{comp.completed}/{comp.total}</span>
                            </div>
                          </div>
                          <div className="text-right hidden sm:block">
                            <p className="text-sm font-medium text-gray-700">{f.parcels_count || 0} parcelle(s)</p>
                            <p className={`text-xs font-medium mt-1 ${comp.percentage === 100 ? 'text-emerald-600' : comp.percentage > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                              {comp.percentage === 100 ? 'Complet' : comp.percentage > 0 ? `${comp.percentage}%` : 'A faire'}
                            </p>
                          </div>
                          <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-emerald-500 transition-colors" />
                        </CardContent>
                      </Card>
                      );
                    })}
                  </div>
                ) : (
                  <Card><CardContent className="py-12 text-center">
                    <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500">{farmerSearch ? 'Aucun resultat' : 'Aucun fermier assigne'}</p>
                    <p className="text-sm text-gray-400 mt-1">Contactez votre cooperative pour l'attribution.</p>
                  </CardContent></Card>
                )}
              </div>
            )}

            {/* === PROFIL AGRICULTEUR (toutes les fiches) === */}
            {tab === 'farmer-profile' && selectedFarmer && (
              <div className="space-y-4" data-testid="farmer-profile-view">
                <Button variant="ghost" size="sm" onClick={() => { setTab('farmers'); setSelectedFarmer(null); }} className="text-gray-500 hover:text-gray-700 -ml-2">
                  <ArrowLeft className="h-4 w-4 mr-1" />Retour a la liste
                </Button>

                {/* Farmer Header Card */}
                <Card className="border-0 shadow-sm border-l-4 border-l-emerald-500" data-testid="farmer-header-card">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                        <User className="h-8 w-8 text-emerald-600" />
                      </div>
                      <div className="flex-1">
                        <h2 className="text-xl font-bold text-gray-900" data-testid="farmer-name">{selectedFarmer.full_name}</h2>
                        <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                          {selectedFarmer.phone_number && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{selectedFarmer.phone_number}</span>}
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{selectedFarmer.village || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-emerald-600">{selectedFarmer.parcels_count || 0}</p>
                        <p className="text-xs text-gray-500">parcelle(s)</p>
                      </div>
                    </div>
                    {selectedFarmer.parcels?.length > 0 && (
                      <div className="mt-3 pt-3 border-t flex flex-wrap gap-2">
                        {selectedFarmer.parcels.map((p, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{p.area_hectares} ha - {p.crop_type || 'cacao'} {p.carbon_score > 0 ? `(Score: ${p.carbon_score})` : ''}</Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Overall Completion Progress */}
                {selectedFarmer.completion && (
                  <Card className="border-0 shadow-sm" data-testid="farmer-completion-card">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Progression globale</span>
                        <span className={`text-sm font-bold ${selectedFarmer.completion.percentage === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {selectedFarmer.completion.percentage}%
                        </span>
                      </div>
                      <Progress value={selectedFarmer.completion.percentage} className="h-2" />
                      <p className="text-xs text-gray-400 mt-1">{selectedFarmer.completion.completed} / {selectedFarmer.completion.total} fiches completees</p>
                    </CardContent>
                  </Card>
                )}

                {/* All Available Forms */}
                <h3 className="font-semibold text-gray-700 text-sm px-1">Fiches a remplir pour {selectedFarmer.full_name}</h3>
                <div className="grid gap-3" data-testid="farmer-forms-list">
                  {FARMER_FORMS.map(form => {
                    const status = selectedFarmer.forms_status?.[form.id];
                    const isDone = status?.completed;
                    return (
                    <Card key={form.id} className={`border shadow-sm hover:shadow-md transition-all cursor-pointer group ${isDone ? 'border-emerald-200 bg-emerald-50/30' : form.color}`} onClick={() => handleFormAction(form.id)} data-testid={`form-${form.id}`}>
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${isDone ? 'bg-emerald-100' : 'bg-white/80'}`}>
                          <form.icon className={`h-6 w-6 ${isDone ? 'text-emerald-600' : ''}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-sm">{form.label}</h4>
                            {isDone && <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] px-1.5 py-0">Complete</Badge>}
                          </div>
                          <p className="text-xs opacity-75 mt-0.5">{form.desc}</p>
                          {status?.count > 0 && <p className="text-[10px] text-emerald-600 font-medium mt-1">{status.count} enregistrement(s)</p>}
                        </div>
                        {isDone ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        ) : (
                          <Circle className="h-5 w-5 text-gray-300 group-hover:text-gray-400 transition-colors" />
                        )}
                      </CardContent>
                    </Card>
                    );
                  })}
                </div>

                {/* Historique ICI + SSRTE */}
                <FarmerHistorySection farmer={selectedFarmer} />
              </div>
            )}

            {/* === RECHERCHE PLANTEUR === */}
            {tab === 'search' && (
              <div className="space-y-4">
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-gray-700 mb-3">Rechercher un planteur par numero de telephone</h3>
                    <form onSubmit={handleSearch} className="flex gap-3" data-testid="agent-search-form">
                      <div className="relative flex-1">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input placeholder="Numero (ex: 0701234567)" value={phone} onChange={e => setPhone(e.target.value)} className="pl-10 h-12" data-testid="agent-search-input" />
                      </div>
                      <Button type="submit" disabled={searching} className="bg-emerald-600 hover:bg-emerald-700 h-12 px-6" data-testid="agent-search-button">
                        <Search className="w-4 h-4 mr-2" />{searching ? '...' : 'Rechercher'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
                {searchResult && (
                  <Card className="border-0 shadow-sm border-l-4 border-l-emerald-500 cursor-pointer hover:shadow-md transition-shadow" onClick={() => openFarmerProfile(searchResult)} data-testid="search-result-card">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center"><Leaf className="h-6 w-6 text-emerald-600" /></div>
                        <div className="flex-1">
                          <h3 className="font-semibold">{searchResult.full_name}</h3>
                          <p className="text-sm text-gray-500">{searchResult.phone_number} - {searchResult.village || 'N/A'}</p>
                        </div>
                        <Button variant="outline" className="text-emerald-700 border-emerald-200">
                          <Eye className="h-4 w-4 mr-1" />Ouvrir les fiches
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ICI Modal */}
      <ICIProfileModal open={showICIModal} onOpenChange={setShowICIModal} farmer={selectedFarmer} onSaved={() => loadMyFarmers()} />
      {/* SSRTE Visit Modal */}
      <SSRTEVisitModal open={showSSRTEModal} onOpenChange={setShowSSRTEModal} farmer={selectedFarmer} onSaved={() => loadMyFarmers()} />
    </div>
  );
};

export default AgentTerrainDashboard;

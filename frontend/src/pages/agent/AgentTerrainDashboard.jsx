import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, Users, MapPin, Leaf, Camera, FileText, Baby,
  TrendingUp, Award, ChevronRight, ChevronLeft, UserPlus,
  Home, Search, Phone, ClipboardCheck, Activity, 
  Target, Star, UserCircle, AlertTriangle, Eye, Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import Navbar from '../../components/Navbar';
import ICIProfileModal from '../cooperative/ICIProfileModal';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const MENU_ITEMS = [
  { id: 'dashboard', label: 'Tableau de bord', icon: Activity, color: 'text-emerald-600' },
  { id: 'ssrte', label: 'Visites SSRTE', icon: ClipboardCheck, color: 'text-cyan-600' },
  { id: 'ici', label: 'Visite ICI', icon: FileText, color: 'text-violet-600' },
  { id: 'members', label: 'Enregistrement membres', icon: UserPlus, color: 'text-blue-600' },
  { id: 'parcels', label: 'Declaration parcelles', icon: MapPin, color: 'text-amber-600' },
  { id: 'photos', label: 'Photos geolocalisees', icon: Camera, color: 'text-purple-600' },
  { id: 'children', label: 'Suivi travail enfants', icon: Baby, color: 'text-red-600' },
  { id: 'search', label: 'Recherche planteur', icon: Search, color: 'text-gray-600' },
];

const AgentTerrainDashboard = () => {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('dashboard');
  const [phone, setPhone] = useState('');
  const [searching, setSearching] = useState(false);
  const [farmer, setFarmer] = useState(null);

  // My assigned farmers
  const [myFarmers, setMyFarmers] = useState([]);
  const [farmersLoading, setFarmersLoading] = useState(false);

  // ICI Modal
  const [showICIModal, setShowICIModal] = useState(false);
  const [iciFarmer, setICIFarmer] = useState(null);

  const loadDashboard = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/field-agent/dashboard`, { headers: getAuthHeader() });
      if (res.ok) {
        setDashboard(await res.json());
      } else if (res.status === 403) {
        toast.error('Acces non autorise');
      }
    } catch {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMyFarmers = useCallback(async () => {
    setFarmersLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/field-agent/my-farmers`, { headers: getAuthHeader() });
      if (res.ok) {
        const data = await res.json();
        setMyFarmers(data.farmers || []);
      }
    } catch {
      // silent
    } finally {
      setFarmersLoading(false);
    }
  }, []);

  useEffect(() => { loadDashboard(); loadMyFarmers(); }, [loadDashboard, loadMyFarmers]);

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
        toast.success(`Planteur trouve: ${data.farmer.full_name}`);
      } else {
        toast.error('Aucun planteur trouve');
      }
    } catch {
      toast.error('Erreur reseau');
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
    { label: 'Visites SSRTE', value: stats.ssrte_visits?.total || 0, month: stats.ssrte_visits?.this_month || 0, target: stats.ssrte_visits?.target || 20, progress: stats.ssrte_visits?.progress || 0, icon: ClipboardCheck, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: 'Membres Enregistres', value: stats.members_onboarded?.total || 0, target: stats.members_onboarded?.target || 10, progress: stats.members_onboarded?.progress || 0, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Parcelles Declarees', value: stats.parcels_declared?.total || 0, target: stats.parcels_declared?.target || 15, progress: stats.parcels_declared?.progress || 0, icon: MapPin, color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'Photos Geotag', value: stats.geotagged_photos?.total || 0, target: stats.geotagged_photos?.target || 30, progress: stats.geotagged_photos?.progress || 0, icon: Camera, color: 'text-purple-500', bg: 'bg-purple-50' },
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
    if (score >= 50) return { text: 'Confirme', bg: 'bg-amber-100 text-amber-700', ring: 'ring-amber-500' };
    return { text: 'Debutant', bg: 'bg-gray-100 text-gray-600', ring: 'ring-gray-400' };
  };

  const badge = levelBadge();

  // Farmers list component used in ICI and Children tabs
  const FarmersList = ({ onAction, actionLabel, actionIcon: ActionIcon }) => (
    <div className="space-y-2" data-testid="farmers-list">
      {farmersLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-cyan-600" /></div>
      ) : myFarmers.length > 0 ? (
        myFarmers.map(f => (
          <Card key={f.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Leaf className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">{f.full_name}</p>
                  <p className="text-xs text-gray-500">{f.village} {f.phone_number && `| ${f.phone_number}`}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{f.parcels_count || 0} parcelles</span>
                <Button size="sm" variant="outline" className="text-cyan-700 border-cyan-200" onClick={() => onAction(f)} data-testid={`farmer-action-${f.id}`}>
                  {ActionIcon && <ActionIcon className="h-3 w-3 mr-1" />}{actionLabel}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <Card><CardContent className="py-8 text-center text-gray-400 text-sm">
          Aucun fermier assigne. Contactez votre cooperative.
        </CardContent></Card>
      )}
    </div>
  );

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
              <Badge className={`${badge.bg} px-3 py-1`} data-testid="agent-level">{badge.text}</Badge>
              <div className="text-center bg-white/10 rounded-lg px-4 py-2" data-testid="performance-score">
                <p className="text-2xl font-bold">{perf.score || 0}%</p>
                <p className="text-xs text-emerald-200">Performance</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Sidebar Menu */}
          <div className="lg:w-64 flex-shrink-0">
            <Card className="border-0 shadow-sm sticky top-24">
              <CardContent className="p-2">
                <nav className="space-y-1" data-testid="agent-sidebar-menu">
                  {MENU_ITEMS.map(item => (
                    <button
                      key={item.id}
                      onClick={() => setTab(item.id)}
                      data-testid={`menu-${item.id}`}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        tab === item.id
                          ? 'bg-emerald-50 text-emerald-700 shadow-sm'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <item.icon className={`h-4 w-4 ${tab === item.id ? 'text-emerald-600' : item.color}`} />
                      {item.label}
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
                    <Card key={i} className="border-0 shadow-sm" data-testid={`kpi-${i}`}>
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
                      <div>
                        <p className="text-xl font-bold text-red-600">{stats.children_identified || 0}</p>
                        <p className="text-xs text-gray-500">Enfants identifies</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-cyan-50"><Users className="h-4 w-4 text-cyan-500" /></div>
                      <div>
                        <p className="text-xl font-bold text-cyan-600">{myFarmers.length}</p>
                        <p className="text-xs text-gray-500">Fermiers assignes</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {(risks.critique > 0 || risks.eleve > 0 || risks.modere > 0 || risks.faible > 0) && (
                  <Card className="border-0 shadow-sm" data-testid="risk-distribution">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2"><Target className="h-4 w-4" /> Repartition des Risques</CardTitle></CardHeader>
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

                {achievements.length > 0 && (
                  <Card className="border-0 shadow-sm" data-testid="achievements">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2"><Award className="h-4 w-4 text-amber-500" /> Badges</CardTitle></CardHeader>
                    <CardContent className="pb-4">
                      <div className="flex flex-wrap gap-2">
                        {achievements.map(a => <Badge key={a.id} className="bg-amber-50 text-amber-700 border-amber-200 px-3 py-1"><Star className="h-3 w-3 mr-1" />{a.name}</Badge>)}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {activities.length > 0 && (
                  <Card className="border-0 shadow-sm" data-testid="recent-activities">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2"><Activity className="h-4 w-4" /> Activites Recentes</CardTitle></CardHeader>
                    <CardContent className="pb-4">
                      <div className="space-y-2">
                        {activities.slice(0, 5).map((a, i) => (
                          <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                            <div className={`w-2 h-2 rounded-full ${a.risk_level === 'critique' ? 'bg-red-500' : a.risk_level === 'eleve' ? 'bg-orange-500' : a.risk_level === 'modere' ? 'bg-amber-500' : 'bg-green-500'}`} />
                            <div className="flex-1">
                              <p className="text-sm text-gray-700">{a.farmer_name}</p>
                              <p className="text-xs text-gray-400">{a.children_count > 0 ? `${a.children_count} enfant(s)` : 'RAS'}</p>
                            </div>
                            <Badge className={riskColor(a.risk_level)} variant="outline">{a.risk_level || 'faible'}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* === VISITES SSRTE === */}
            {tab === 'ssrte' && (
              <div className="space-y-4">
                <Card className="border-0 shadow-sm">
                  <CardHeader><CardTitle className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-cyan-600" />Visites SSRTE</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500 mb-4">Gerez vos visites de suivi et de remediation du travail des enfants.</p>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="text-center p-3 bg-cyan-50 rounded-lg"><p className="text-2xl font-bold text-cyan-700">{stats.ssrte_visits?.total || 0}</p><p className="text-xs text-cyan-600">Total visites</p></div>
                      <div className="text-center p-3 bg-emerald-50 rounded-lg"><p className="text-2xl font-bold text-emerald-700">{stats.ssrte_visits?.this_month || 0}</p><p className="text-xs text-emerald-600">Ce mois</p></div>
                      <div className="text-center p-3 bg-amber-50 rounded-lg"><p className="text-2xl font-bold text-amber-700">{stats.ssrte_visits?.target || 20}</p><p className="text-xs text-amber-600">Objectif</p></div>
                    </div>
                    <Button className="w-full bg-cyan-600 hover:bg-cyan-700" onClick={() => navigate('/agent/ssrte')} data-testid="go-ssrte-dashboard">
                      <ClipboardCheck className="h-4 w-4 mr-2" />Ouvrir le tableau SSRTE
                    </Button>
                  </CardContent>
                </Card>
                <h3 className="font-semibold text-gray-700 text-sm">Mes fermiers assignes</h3>
                <FarmersList onAction={(f) => navigate('/agent/ssrte')} actionLabel="Visiter" actionIcon={ClipboardCheck} />
              </div>
            )}

            {/* === VISITE ICI === */}
            {tab === 'ici' && (
              <div className="space-y-4">
                <Card className="border-0 shadow-sm">
                  <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-violet-600" />Visite ICI - Fiche Producteur</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500 mb-4">Remplissez la fiche ICI (Indice Composite de l'Enfant) pour chaque producteur. Enregistrez les informations familiales, les enfants du menage et les pratiques agricoles.</p>
                  </CardContent>
                </Card>
                <h3 className="font-semibold text-gray-700 text-sm">Selectionner un fermier pour la visite ICI</h3>
                <FarmersList onAction={(f) => { setICIFarmer(f); setShowICIModal(true); }} actionLabel="Visite ICI" actionIcon={FileText} />
              </div>
            )}

            {/* === ENREGISTREMENT MEMBRES === */}
            {tab === 'members' && (
              <div className="space-y-4">
                <Card className="border-0 shadow-sm">
                  <CardHeader><CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-blue-600" />Enregistrement Membres</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500 mb-4">Enregistrez de nouveaux membres dans votre cooperative. Les membres enregistres pourront activer leur compte sur l'application mobile.</p>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="text-center p-3 bg-blue-50 rounded-lg"><p className="text-2xl font-bold text-blue-700">{stats.members_onboarded?.total || 0}</p><p className="text-xs text-blue-600">Membres enregistres</p></div>
                      <div className="text-center p-3 bg-blue-50 rounded-lg"><p className="text-2xl font-bold text-blue-700">{stats.members_onboarded?.target || 10}</p><p className="text-xs text-blue-600">Objectif</p></div>
                    </div>
                    <Progress value={stats.members_onboarded?.progress || 0} className="h-2 mb-4" />
                  </CardContent>
                </Card>
                <h3 className="font-semibold text-gray-700 text-sm">Mes fermiers assignes ({myFarmers.length})</h3>
                <FarmersList onAction={(f) => toast.info(`Fiche de ${f.full_name}`)} actionLabel="Voir" actionIcon={Eye} />
              </div>
            )}

            {/* === DECLARATION PARCELLES === */}
            {tab === 'parcels' && (
              <div className="space-y-4">
                <Card className="border-0 shadow-sm">
                  <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5 text-amber-600" />Declaration de Parcelles</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500 mb-4">Declarez et verifiez les parcelles de cacao de vos fermiers assignes. Enregistrez les coordonnees GPS, la superficie et le type de culture.</p>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="text-center p-3 bg-amber-50 rounded-lg"><p className="text-2xl font-bold text-amber-700">{stats.parcels_declared?.total || 0}</p><p className="text-xs text-amber-600">Parcelles declarees</p></div>
                      <div className="text-center p-3 bg-amber-50 rounded-lg"><p className="text-2xl font-bold text-amber-700">{stats.parcels_declared?.target || 15}</p><p className="text-xs text-amber-600">Objectif</p></div>
                    </div>
                    <Progress value={stats.parcels_declared?.progress || 0} className="h-2 mb-4" />
                  </CardContent>
                </Card>
                <h3 className="font-semibold text-gray-700 text-sm">Fermiers et leurs parcelles</h3>
                {farmersLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-amber-600" /></div>
                ) : myFarmers.length > 0 ? myFarmers.map(f => (
                  <Card key={f.id} className="border-0 shadow-sm">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Leaf className="h-4 w-4 text-emerald-600" />
                          <span className="font-medium text-sm">{f.full_name}</span>
                          <span className="text-xs text-gray-400">{f.village}</span>
                        </div>
                        <Badge variant="outline">{f.parcels_count || 0} parcelle(s)</Badge>
                      </div>
                      {f.parcels?.length > 0 && (
                        <div className="space-y-1 ml-6">
                          {f.parcels.map((p, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs text-gray-500">
                              <MapPin className="h-3 w-3" />
                              <span>{p.area_hectares} ha - {p.crop_type || 'cacao'}</span>
                              {p.carbon_score > 0 && <Badge className="bg-green-50 text-green-700 text-[10px]">Score: {p.carbon_score}</Badge>}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )) : (
                  <Card><CardContent className="py-8 text-center text-gray-400 text-sm">Aucun fermier assigne</CardContent></Card>
                )}
              </div>
            )}

            {/* === PHOTOS GEOLOCALISEES === */}
            {tab === 'photos' && (
              <div className="space-y-4">
                <Card className="border-0 shadow-sm">
                  <CardHeader><CardTitle className="flex items-center gap-2"><Camera className="h-5 w-5 text-purple-600" />Photos Geolocalisees</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500 mb-4">Prenez des photos geolocalisees des parcelles et des conditions de travail. Ces photos servent de preuves pour le systeme de tracabilite carbone.</p>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="text-center p-3 bg-purple-50 rounded-lg"><p className="text-2xl font-bold text-purple-700">{stats.geotagged_photos?.total || 0}</p><p className="text-xs text-purple-600">Photos prises</p></div>
                      <div className="text-center p-3 bg-purple-50 rounded-lg"><p className="text-2xl font-bold text-purple-700">{stats.geotagged_photos?.target || 30}</p><p className="text-xs text-purple-600">Objectif</p></div>
                    </div>
                    <Progress value={stats.geotagged_photos?.progress || 0} className="h-2 mb-4" />
                    <p className="text-xs text-gray-400">Utilisez l'application mobile pour prendre des photos geolocalisees directement sur le terrain.</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* === SUIVI TRAVAIL ENFANTS === */}
            {tab === 'children' && (
              <div className="space-y-4">
                <Card className="border-0 shadow-sm border-l-4 border-l-red-500">
                  <CardHeader><CardTitle className="flex items-center gap-2"><Baby className="h-5 w-5 text-red-600" />Suivi du Travail des Enfants</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500 mb-4">Suivez et documentez les cas de travail des enfants dans les exploitations. Ce suivi est essentiel pour le SSRTE et la conformite aux normes internationales.</p>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="text-center p-3 bg-red-50 rounded-lg"><p className="text-2xl font-bold text-red-700">{stats.children_identified || 0}</p><p className="text-xs text-red-600">Enfants identifies</p></div>
                      <div className="text-center p-3 bg-amber-50 rounded-lg">
                        <p className="text-2xl font-bold text-amber-700">{(risks.critique || 0) + (risks.eleve || 0)}</p>
                        <p className="text-xs text-amber-600">Cas a risque</p>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-700">{(risks.faible || 0) + (risks.modere || 0)}</p>
                        <p className="text-xs text-green-600">Cas resolus/faibles</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <h3 className="font-semibold text-gray-700 text-sm">Ouvrir la Fiche ICI pour documenter les enfants</h3>
                <FarmersList onAction={(f) => { setICIFarmer(f); setShowICIModal(true); }} actionLabel="Fiche ICI" actionIcon={FileText} />
              </div>
            )}

            {/* === RECHERCHE PLANTEUR === */}
            {tab === 'search' && (
              <div className="space-y-4">
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <form onSubmit={handleSearch} className="flex gap-3" data-testid="agent-search-form">
                      <div className="relative flex-1">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input data-testid="agent-search-input" placeholder="Numero de telephone (ex: 0701234567)" value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-10 h-12" />
                      </div>
                      <Button type="submit" disabled={searching} className="bg-emerald-600 hover:bg-emerald-700 h-12 px-6" data-testid="agent-search-button">
                        <Search className="w-4 h-4 mr-2" />{searching ? 'Recherche...' : 'Rechercher'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
                {farmer && (
                  <Card className="border-0 shadow-sm border-l-4 border-l-emerald-500" data-testid="farmer-result-card">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center"><Leaf className="h-5 w-5 text-emerald-600" /></div>
                          <div>
                            <h3 className="font-semibold">{farmer.full_name}</h3>
                            <p className="text-sm text-gray-500">{farmer.phone_number}</p>
                          </div>
                        </div>
                        <Badge className={farmer.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>{farmer.is_active ? 'Actif' : 'Inactif'}</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="bg-gray-50 rounded-lg p-2"><p className="font-bold text-emerald-600">{farmer.parcels_count || 0}</p><p className="text-xs text-gray-500">Parcelles</p></div>
                        <div className="bg-gray-50 rounded-lg p-2"><p className="font-bold text-blue-600">{farmer.total_hectares || 0} ha</p><p className="text-xs text-gray-500">Superficie</p></div>
                        <div className="bg-gray-50 rounded-lg p-2"><p className="font-bold text-amber-600">{farmer.village || '-'}</p><p className="text-xs text-gray-500">Village</p></div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ICI Profile Modal */}
      <ICIProfileModal
        open={showICIModal}
        onOpenChange={setShowICIModal}
        farmer={iciFarmer}
        onSaved={() => { loadMyFarmers(); }}
      />
    </div>
  );
};

export default AgentTerrainDashboard;

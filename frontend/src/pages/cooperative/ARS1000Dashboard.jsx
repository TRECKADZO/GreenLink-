import { tokenService } from "../../services/tokenService";
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import {
  Shield, FileText, Package, TreePine, AlertTriangle,
  CheckCircle2, Clock, Search, ChevronRight, Plus,
  BarChart3, Loader2, Eye, PenLine, ArrowLeft,
  Award, Leaf, ClipboardCheck, Scale, MessageSquareWarning,
  XCircle, ArrowUpRight, Filter, BookOpen, Sprout, Droplets,
  Download, Wheat, Trash2, Edit, ShieldCheck, TrendingUp, Lightbulb, User
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { GuideEspeces, CalendrierPepiniere, DiagnosticParcelle, ProtectionEnvironnementale } from '../shared/AgroforesterieModules';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const getToken = () => tokenService.getToken();
const authHeaders = () => ({ 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' });

// ============= TABS =============
const TABS = [
  { id: 'recoltes', label: 'Recoltes', icon: Wheat },
  { id: 'agroforesterie', label: 'Agroforesterie', icon: TreePine },
  { id: 'especes', label: 'Guide Especes', icon: BookOpen },
  { id: 'diagnostic', label: 'Diagnostic', icon: Search },
  { id: 'protection', label: 'Protection Env.', icon: Droplets },
  { id: 'registres', label: 'Registres', icon: Scale },
];

// ============= CERTIFICATION TAB =============
const CertificationTab = ({ dashboard, onRefresh }) => {
  if (!dashboard) return <div className="flex justify-center py-12"><Loader2 className="animate-spin w-8 h-8 text-green-600" /></div>;
  
  const { certification, niveau_suggere, niveau_info, stats } = dashboard;
  const niveauColors = { non_certifie: 'bg-gray-100 text-gray-700', bronze: 'bg-amber-100 text-amber-800', argent: 'bg-slate-100 text-slate-700', or: 'bg-yellow-100 text-yellow-800' };
  const niveauLabels = { non_certifie: 'Non certifié', bronze: 'Bronze', argent: 'Argent', or: 'Or' };

  return (
    <div className="space-y-6" data-testid="certification-tab">
      {/* Niveau actuel */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Niveau de Certification ARS 1000</h3>
          <Badge className={niveauColors[certification.niveau] || niveauColors.non_certifie}>
            {niveauLabels[certification.niveau] || 'Non certifié'}
          </Badge>
        </div>
        
        {/* Progression vers le prochain niveau */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-green-50 rounded-xl p-4 border border-green-100">
            <p className="text-xs text-green-600 font-medium mb-1">Conformité ARS 1000-1 (PDC)</p>
            <p className="text-2xl font-bold text-green-800">{stats.conformite_ars1}%</p>
            <div className="h-2 bg-green-200 rounded-full mt-2">
              <div className="h-full bg-green-600 rounded-full transition-all" style={{ width: `${Math.min(stats.conformite_ars1, 100)}%` }} />
            </div>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <p className="text-xs text-blue-600 font-medium mb-1">Conformité ARS 1000-2 (Qualité)</p>
            <p className="text-2xl font-bold text-blue-800">{stats.conformite_ars2}%</p>
            <div className="h-2 bg-blue-200 rounded-full mt-2">
              <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${Math.min(stats.conformite_ars2, 100)}%` }} />
            </div>
          </div>
          <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
            <p className="text-xs text-purple-600 font-medium mb-1">Conformité Globale</p>
            <p className="text-2xl font-bold text-purple-800">{stats.conformite_global}%</p>
            <div className="h-2 bg-purple-200 rounded-full mt-2">
              <div className="h-full bg-purple-600 rounded-full transition-all" style={{ width: `${Math.min(stats.conformite_global, 100)}%` }} />
            </div>
          </div>
        </div>

        {/* Niveaux de certification */}
        <div className="border-t pt-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">Niveaux de certification</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { key: 'bronze', label: 'Bronze', ars1: '38%', ars2: '78%', color: 'amber' },
              { key: 'argent', label: 'Argent', ars1: '90%', ars2: '100%', color: 'slate' },
              { key: 'or', label: 'Or', ars1: '100%', ars2: '100%', color: 'yellow' },
            ].map(n => (
              <div key={n.key} className={`rounded-xl p-3 border-2 ${niveau_suggere === n.key ? 'border-green-500 bg-green-50' : 'border-gray-100 bg-gray-50'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Award className={`w-4 h-4 ${niveau_suggere === n.key ? 'text-green-600' : 'text-gray-400'}`} />
                  <span className="text-sm font-bold">{n.label}</span>
                  {niveau_suggere === n.key && <Badge className="bg-green-100 text-green-700 text-[10px]">Suggéré</Badge>}
                </div>
                <p className="text-xs text-gray-500">ARS 1000-1: {n.ars1}</p>
                <p className="text-xs text-gray-500">ARS 1000-2: {n.ars2}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total PDC', value: stats.total_pdcs, icon: FileText, color: 'green' },
          { label: 'Total Lots', value: stats.total_lots, icon: Package, color: 'blue' },
          { label: 'Arbres Ombrage', value: stats.total_arbres_ombrage, icon: TreePine, color: 'emerald' },
          { label: 'NC ouvertes', value: stats.nc_ouvertes, icon: AlertTriangle, color: stats.nc_ouvertes > 0 ? 'red' : 'gray' },
        ].map((kpi, i) => (
          <div key={`el-${i}`} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <kpi.icon className={`w-4 h-4 text-${kpi.color}-500`} />
              <span className="text-xs text-gray-500">{kpi.label}</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Score Ombrage ARS 1000 */}
      {(stats.score_ombrage_moyen > 0 || stats.nombre_especes > 0) && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm" data-testid="cert-shade-score">
          <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Leaf className="w-5 h-5 text-emerald-500" /> Score Ombrage ARS 1000
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`rounded-xl p-4 border ${stats.score_ombrage_moyen >= 60 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
              <p className="text-xs font-medium mb-1 text-gray-600">Score Moyen</p>
              <p className={`text-3xl font-bold ${stats.score_ombrage_moyen >= 60 ? 'text-emerald-700' : 'text-amber-700'}`}>{stats.score_ombrage_moyen}/100</p>
              <div className="h-2 bg-white/60 rounded-full mt-2 overflow-hidden">
                <div className={`h-full rounded-full ${stats.score_ombrage_moyen >= 60 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${stats.score_ombrage_moyen}%` }} />
              </div>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <p className="text-xs text-blue-600 font-medium mb-1">Especes Identifiees</p>
              <p className="text-3xl font-bold text-blue-800">{stats.nombre_especes}</p>
              <p className="text-xs text-blue-500 mt-1">{stats.nombre_especes >= 3 ? 'Min 3 requis (conforme)' : 'Min 3 requis'}</p>
            </div>
            <div className="bg-teal-50 rounded-xl p-4 border border-teal-100">
              <p className="text-xs text-teal-600 font-medium mb-1">PDC Conformes Ombrage</p>
              <p className="text-3xl font-bold text-teal-800">{stats.pdc_conformes_ombrage || 0}</p>
              <p className="text-xs text-teal-500 mt-1">sur {stats.total_pdcs} PDC</p>
            </div>
          </div>
        </div>
      )}

      {/* Audits */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h3 className="text-base font-bold text-gray-900 mb-4">Cycle d'Audit</h3>
        {certification.cycle_audit && certification.cycle_audit.length > 0 ? (
          <div className="space-y-3">
            {certification.cycle_audit.map((a, i) => (
              <div key={`el-${i}`} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <ClipboardCheck className="w-5 h-5 text-blue-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{a.type_audit}</p>
                  <p className="text-xs text-gray-500">{a.date_audit} - {a.auditeur}</p>
                </div>
                <Badge className={a.decision === 'favorable' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                  {a.decision}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-6">Aucun audit enregistré</p>
        )}
      </div>
    </div>
  );
};

// ============= PDC TAB (v2 - Enriched Dashboard) =============
const PDCTab = () => {
  const navigate = useNavigate();
  const [pdcStats, setPdcStats] = useState(null);
  const [pdcs, setPdcs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, listRes] = await Promise.all([
          fetch(`${API_URL}/api/pdc-v2/stats/overview`, { headers: authHeaders() }),
          fetch(`${API_URL}/api/pdc-v2/list?limit=10`, { headers: authHeaders() }),
        ]);
        if (statsRes.ok) setPdcStats(await statsRes.json());
        if (listRes.ok) {
          const data = await listRes.json();
          setPdcs(data.pdcs || []);
        }
      } catch (e) { console.error('PDC load error:', e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin w-8 h-8 text-green-600" /></div>;

  const statusColors = {
    brouillon: 'bg-gray-100 text-gray-600',
    etape1_en_cours: 'bg-blue-100 text-blue-700',
    etape1_complete: 'bg-cyan-100 text-cyan-700',
    etape2_en_cours: 'bg-purple-100 text-purple-700',
    etape2_complete: 'bg-indigo-100 text-indigo-700',
    etape3_en_cours: 'bg-amber-100 text-amber-700',
    valide: 'bg-emerald-100 text-emerald-700',
  };

  return (
    <div className="space-y-4" data-testid="pdc-tab">
      {/* Stats overview */}
      {pdcStats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Total PDC', value: pdcStats.total, color: 'green' },
            { label: 'Brouillons', value: pdcStats.brouillons, color: 'gray' },
            { label: 'Etape 1', value: pdcStats.etape1_complete, color: 'blue' },
            { label: 'Etape 2-3', value: (pdcStats.etape2_en_cours || 0) + (pdcStats.etape3_en_cours || 0), color: 'purple' },
            { label: 'Valides', value: pdcStats.valides, color: 'emerald' },
          ].map((s, i) => (
            <div key={`el-${i}`} className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm text-center">
              <p className={`text-2xl font-bold text-${s.color}-700`}>{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Quick access */}
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-gray-900">Derniers PDC</h3>
        <Button size="sm" onClick={() => navigate('/cooperative/pdc-v2')} className="bg-[#1A3622] hover:bg-[#112417] text-white" data-testid="pdc-v2-open-btn">
          <FileText className="w-4 h-4 mr-1" /> Voir tous les PDC
        </Button>
      </div>

      {/* PDC list */}
      {pdcs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Aucun PDC. Commencez par creer un PDC pour vos planteurs.</p>
          <Button size="sm" onClick={() => navigate('/cooperative/pdc-v2')} className="mt-3 bg-[#1A3622] hover:bg-[#112417] text-white">
            <Plus className="w-4 h-4 mr-1" /> Nouveau PDC
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {pdcs.map(p => (
            <div
              key={p.id}
              className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => navigate(`/cooperative/pdc-v2/${p.id}`)}
              data-testid={`pdc-item-${p.id}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm text-gray-900">{p.farmer_name || 'Planteur'}</p>
                  <p className="text-xs text-gray-400">Etape {p.current_step}/3 - Mis a jour {p.updated_at ? new Date(p.updated_at).toLocaleDateString('fr-FR') : '-'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={statusColors[p.statut] || 'bg-gray-100 text-gray-600'}>
                    {p.statut?.replace(/_/g, ' ')}
                  </Badge>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============= LOTS / TRACEABILITE TAB =============
const LotsTab = () => {
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const loadLots = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/ars1000/lots`, { headers: authHeaders() });
      const data = await res.json();
      setLots(data.lots || []);
    } catch (e) { /* error */ }
    finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/ars1000/lots/stats/overview`, { headers: authHeaders() });
      setStats(await res.json());
    } catch (e) { /* error */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadLots(); loadStats(); }, [loadLots, loadStats]);

  const handleGenerateRapport = async (lotId) => {
    try {
      await fetch(`${API_URL}/api/ars1000/lots/${lotId}/rapport-essai`, { method: 'POST', headers: authHeaders() });
      toast.success('Rapport d\'essai généré');
      loadLots();
    } catch (e) {
      toast.error('Erreur lors de la génération');
    }
  };

  const handleDownloadRapportEssai = async (lotId, lotCode) => {
    try {
      toast.info('Génération du rapport d\'essai PDF...');
      const res = await fetch(`${API_URL}/api/ars1000/pdf/rapport-essai/${lotId}`, { headers: { 'Authorization': `Bearer ${getToken()}` } });
      if (!res.ok) throw new Error('Erreur lors de la génération');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Rapport_Essai_${lotCode || 'lot'}_${new Date().toISOString().slice(0,10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Rapport d\'essai téléchargé');
    } catch (e) {
      toast.error(e.message || 'Erreur téléchargement');
    }
  };

  const handleDownloadTracabilite = async (lotId, lotCode) => {
    try {
      toast.info('Génération de la fiche traçabilité PDF...');
      const res = await fetch(`${API_URL}/api/ars1000/pdf/tracabilite/${lotId}`, { headers: { 'Authorization': `Bearer ${getToken()}` } });
      if (!res.ok) throw new Error('Erreur lors de la génération');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Tracabilite_${lotCode || 'lot'}_${new Date().toISOString().slice(0,10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Fiche traçabilité téléchargée');
    } catch (e) {
      toast.error(e.message || 'Erreur téléchargement');
    }
  };

  return (
    <div className="space-y-4" data-testid="lots-tab">
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Lots', value: stats.total_lots },
            { label: 'Conformes', value: stats.lots_conformes },
            { label: 'Poids Total (kg)', value: stats.poids_total_kg?.toLocaleString() },
            { label: 'Score Qualité Moy.', value: `${stats.score_qualite_moyen}%` },
          ].map((s, i) => (
            <div key={`el-${i}`} className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm text-center">
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-gray-900">Registre des Lots</h3>
        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => setShowCreate(!showCreate)} data-testid="create-lot-btn">
          <Plus className="w-4 h-4 mr-1" /> Nouveau Lot
        </Button>
      </div>

      {showCreate && <CreateLotForm onSuccess={() => { setShowCreate(false); loadLots(); loadStats(); }} />}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin w-8 h-8 text-green-600" /></div>
      ) : lots.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Aucun lot enregistré</p>
        </div>
      ) : (
        <div className="space-y-2">
          {lots.map(lot => (
            <div key={lot.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm" data-testid={`lot-item-${lot.id}`}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-sm text-gray-900">{lot.lot_code}</p>
                    <Badge className={lot.controles_qualite?.conforme_global ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                      {lot.controles_qualite?.conforme_global ? 'Conforme' : 'Non conforme'}
                    </Badge>
                    <Badge className="bg-gray-100 text-gray-600">{lot.statut}</Badge>
                  </div>
                  <p className="text-xs text-gray-500">
                    {lot.poids_total_kg} kg - {lot.campagne} - {lot.origine_village}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Score qualité: {lot.controles_qualite?.score_qualite_global || 0}% | 
                    Grade: {lot.controles_qualite?.epreuve_coupe?.grade || 'N/A'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleDownloadRapportEssai(lot.id, lot.lot_code)} data-testid={`download-rapport-${lot.id}`}>
                    <Download className="w-3.5 h-3.5 mr-1" /> Rapport
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDownloadTracabilite(lot.id, lot.lot_code)} data-testid={`download-tracabilite-${lot.id}`}>
                    <Download className="w-3.5 h-3.5 mr-1" /> Traçabilité
                  </Button>
                  {!lot.rapport_essai && (
                    <Button size="sm" variant="outline" onClick={() => handleGenerateRapport(lot.id)} data-testid={`generate-rapport-${lot.id}`}>
                      <FileText className="w-3.5 h-3.5 mr-1" /> Générer
                    </Button>
                  )}
                  {lot.rapport_essai && (
                    <Badge className="bg-green-100 text-green-700"><CheckCircle2 className="w-3 h-3 mr-1" /> Rapport généré</Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============= CREATE LOT FORM =============
const CreateLotForm = ({ onSuccess }) => {
  const [form, setForm] = useState({
    poids_total_kg: '',
    origine_village: '',
    campagne: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
    humidite: '',
    tamisage: '',
    corps_etrangers: '',
    moisies_pct: '',
    ardoisees_pct: '',
    insectes_pct: '',
    fermentation: 'bonne',
    segregation: true,
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body = {
        poids_total_kg: parseFloat(form.poids_total_kg) || 0,
        origine_village: form.origine_village,
        campagne: form.campagne,
        segregation_physique: form.segregation,
        controles_qualite: {
          humidite: { taux_humidite: parseFloat(form.humidite) || 0 },
          tamisage: { taux_debris: parseFloat(form.tamisage) || 0 },
          corps_etrangers: { taux_corps_etrangers: parseFloat(form.corps_etrangers) || 0 },
          epreuve_coupe: {
            nombre_feves: 300,
            moisies_pct: parseFloat(form.moisies_pct) || 0,
            ardoisees_pct: parseFloat(form.ardoisees_pct) || 0,
            insectes_germees_pct: parseFloat(form.insectes_pct) || 0,
          },
          fermentation: { type_fermentation: form.fermentation },
        },
      };
      const res = await fetch(`${API_URL}/api/ars1000/lots`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Erreur');
      toast.success('Lot créé avec succès');
      onSuccess();
    } catch (e) {
      toast.error('Erreur lors de la création du lot');
    } finally {
      setSubmitting(false);
    }
  };

  const InputField = ({ label, field, type = 'text', suffix = '' }) => (
    <div>
      <label className="text-xs text-gray-600 font-medium block mb-1">{label}</label>
      <Input
        type={type}
        value={form[field]}
        onChange={(e) => setForm({ ...form, [field]: e.target.value })}
        className="text-sm"
        data-testid={`lot-${field}`}
      />
      {suffix && <span className="text-[10px] text-gray-400">{suffix}</span>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-green-100 p-4 shadow-sm space-y-4" data-testid="create-lot-form">
      <h4 className="font-semibold text-sm text-gray-900">Nouveau Lot - Contrôles Qualité</h4>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <InputField label="Poids total (kg)" field="poids_total_kg" type="number" />
        <InputField label="Village d'origine" field="origine_village" />
        <InputField label="Campagne" field="campagne" />
      </div>
      <p className="text-xs font-semibold text-gray-700 border-t pt-3">Contrôles ARS 1000-2</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <InputField label="Humidité (%)" field="humidite" type="number" suffix="Max 8%" />
        <InputField label="Tamisage - débris (%)" field="tamisage" type="number" suffix="Max 1.5%" />
        <InputField label="Corps étrangers (%)" field="corps_etrangers" type="number" suffix="Max 0.75%" />
        <InputField label="Fèves moisies (%)" field="moisies_pct" type="number" suffix="Épreuve coupe" />
        <InputField label="Fèves ardoisées (%)" field="ardoisees_pct" type="number" suffix="Épreuve coupe" />
        <InputField label="Insectes/germées (%)" field="insectes_pct" type="number" suffix="Épreuve coupe" />
      </div>
      <div>
        <label className="text-xs text-gray-600 font-medium block mb-1">Fermentation</label>
        <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full" value={form.fermentation} onChange={(e) => setForm({ ...form, fermentation: e.target.value })} data-testid="lot-fermentation">
          <option value="bonne">Bonne fermentation</option>
          <option value="satisfaisante">Satisfaisante</option>
          <option value="sous-grade">Sous-grade</option>
        </select>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={submitting} className="bg-green-600 hover:bg-green-700 text-white" data-testid="submit-lot-btn">
          {submitting ? <Loader2 className="animate-spin w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
          Enregistrer le Lot
        </Button>
      </div>
    </form>
  );
};

// ============= AGROFORESTERIE TAB =============
const AgroforesterieTab = () => {
  const [stats, setStats] = useState(null);
  const [diagnostic, setDiagnostic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [diagLoading, setDiagLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('overview');

  const loadData = useCallback(async () => {
    try {
      const [statsRes, diagRes] = await Promise.all([
        fetch(`${API_URL}/api/ars1000/certification/arbres-ombrage/stats`, { headers: authHeaders() }),
        fetch(`${API_URL}/api/ars1000/agroforesterie/diagnostic/cooperative`, { headers: authHeaders() }),
      ]);
      setStats(await statsRes.json());
      if (diagRes.ok) setDiagnostic(await diagRes.json());
    } catch (e) { /* error */ }
    finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const nonConformes = (diagnostic?.diagnostics || []).filter(d => !d.conforme);
  const conformes = (diagnostic?.diagnostics || []).filter(d => d.conforme);

  return (
    <div className="space-y-4" data-testid="agroforesterie-tab">
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin w-8 h-8 text-green-600" /></div>
      ) : (
        <>
          {/* Sub-tab navigation */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {[
              { id: 'overview', label: 'Vue globale', icon: TreePine },
              { id: 'diagnostic', label: 'Diagnostic par planteur', icon: Search },
              { id: 'alertes', label: `Alertes (${nonConformes.length})`, icon: AlertTriangle },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveSubTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all ${activeSubTab === tab.id ? 'bg-white shadow-sm text-green-700' : 'text-gray-500 hover:text-gray-700'}`}
                data-testid={`agro-subtab-${tab.id}`}>
                <tab.icon className="w-3.5 h-3.5" />{tab.label}
              </button>
            ))}
          </div>

          {/* ============== VUE GLOBALE ============== */}
          {activeSubTab === 'overview' && (
            <div className="space-y-4">
              {/* Score cooperatif */}
              {diagnostic && (
                <div className="rounded-2xl p-5 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${diagnostic.score_moyen >= 80 ? 'bg-green-500' : diagnostic.score_moyen >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}>
                        <span className="text-xl font-bold text-white">{diagnostic.score_moyen}%</span>
                      </div>
                      <div>
                        <p className="font-bold text-lg text-gray-900">Score Agroforesterie Cooperatif</p>
                        <p className="text-sm text-gray-600">{diagnostic.total_pdcs} planteur(s) analyses</p>
                      </div>
                    </div>
                  </div>

                  {/* Conformes vs Non-conformes */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-white rounded-xl p-4 text-center border border-green-100">
                      <CheckCircle2 className="w-6 h-6 text-green-600 mx-auto mb-1" />
                      <p className="text-2xl font-bold text-green-700">{diagnostic.conformes}</p>
                      <p className="text-xs text-gray-500">Conformes</p>
                      {diagnostic.total_pdcs > 0 && <p className="text-[10px] text-green-600 font-medium">{Math.round((diagnostic.conformes / diagnostic.total_pdcs) * 100)}%</p>}
                    </div>
                    <div className="bg-white rounded-xl p-4 text-center border border-red-100">
                      <AlertTriangle className="w-6 h-6 text-red-500 mx-auto mb-1" />
                      <p className="text-2xl font-bold text-red-600">{diagnostic.non_conformes}</p>
                      <p className="text-xs text-gray-500">Non-conformes</p>
                      {diagnostic.total_pdcs > 0 && <p className="text-[10px] text-red-500 font-medium">{Math.round((diagnostic.non_conformes / diagnostic.total_pdcs) * 100)}%</p>}
                    </div>
                  </div>

                  {/* Barre de conformite visuelle */}
                  {diagnostic.total_pdcs > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
                        <span>Taux de conformite</span>
                        <span className="font-bold text-green-700">{Math.round((diagnostic.conformes / diagnostic.total_pdcs) * 100)}%</span>
                      </div>
                      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-1000" style={{ width: `${(diagnostic.conformes / diagnostic.total_pdcs) * 100}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Stats arbres (existant) */}
              {stats && (
                <div className={`rounded-2xl p-5 border-2 ${stats.conforme_agroforesterie ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                  <div className="flex items-center gap-3 mb-3">
                    {stats.conforme_agroforesterie ? <CheckCircle2 className="w-6 h-6 text-green-600" /> : <AlertTriangle className="w-6 h-6 text-amber-600" />}
                    <div>
                      <p className="font-bold">{stats.conforme_agroforesterie ? 'Ombrage Conforme ARS 1000' : 'Ombrage Non conforme'}</p>
                      <p className="text-xs text-gray-500">Inventaire central arbres d'ombrage</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-white/80 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-gray-900">{stats.total_arbres}</p>
                      <p className="text-xs text-gray-500">Total arbres</p>
                    </div>
                    <div className={`bg-white/80 rounded-lg p-3 text-center ${stats.conformite_details?.densite_ok ? '' : 'ring-2 ring-red-300'}`}>
                      <p className="text-xl font-bold text-gray-900">{stats.densite_par_ha}</p>
                      <p className="text-xs text-gray-500">Densite/ha</p>
                      <p className="text-[10px] text-gray-400">Requis: 25-40</p>
                    </div>
                    <div className={`bg-white/80 rounded-lg p-3 text-center ${stats.conformite_details?.especes_ok ? '' : 'ring-2 ring-red-300'}`}>
                      <p className="text-xl font-bold text-gray-900">{stats.nombre_especes}</p>
                      <p className="text-xs text-gray-500">Especes</p>
                      <p className="text-[10px] text-gray-400">Requis: min 3</p>
                    </div>
                    <div className="bg-white/80 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-gray-900">{stats.superficie_totale_ha || 0}</p>
                      <p className="text-xs text-gray-500">Superficie (ha)</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {[
                      { label: 'Strate haute', val: stats.strate_haute, color: 'text-green-800' },
                      { label: 'Strate moyenne', val: stats.strate_moyenne, color: 'text-green-700' },
                      { label: 'Strate basse', val: stats.strate_basse, color: 'text-green-600' },
                    ].map(s => (
                      <div key={s.label} className="bg-white/60 rounded-lg p-2 text-center">
                        <p className={`text-sm font-bold ${s.color}`}>{s.val}</p>
                        <p className="text-[10px] text-gray-500">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 space-y-1">
                    {stats.conformite_details && Object.entries({
                      'Densite (25-40 arbres/ha)': stats.conformite_details.densite_ok,
                      'Especes (min 3)': stats.conformite_details.especes_ok,
                      'Strates (3 niveaux)': stats.conformite_details.strates_ok,
                    }).map(([label, ok]) => (
                      <div key={label} className="flex items-center gap-2 text-sm">
                        {ok ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-500" />}
                        <span className={ok ? 'text-green-800' : 'text-red-700'}>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top problemes frequents */}
              {diagnostic?.problemes_frequents?.length > 0 && (
                <div className="bg-white rounded-xl border border-amber-200 p-4">
                  <h4 className="font-semibold text-gray-900 text-sm mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" /> Problemes les plus frequents
                  </h4>
                  <div className="space-y-2">
                    {diagnostic.problemes_frequents.map((p, i) => (
                      <div key={`el-${i}`} className="flex items-center justify-between bg-amber-50 rounded-lg px-3 py-2">
                        <p className="text-xs text-amber-800 flex-1">{p.probleme}...</p>
                        <Badge className="bg-amber-200 text-amber-800 text-[10px] ml-2">{p.count} planteur(s)</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ajout arbres + especes */}
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-gray-900">Inventaire des Arbres</h3>
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => setShowAdd(!showAdd)} data-testid="add-arbre-btn">
                  <Plus className="w-4 h-4 mr-1" /> Ajouter
                </Button>
              </div>
              {showAdd && <AddArbreForm onSuccess={() => { setShowAdd(false); loadData(); }} />}
              {stats?.especes && stats.especes.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {stats.especes.map((esp, i) => (
                    <Badge key={`el-${i}`} className="bg-green-100 text-green-700">{esp}</Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ============== DIAGNOSTIC PAR PLANTEUR ============== */}
          {activeSubTab === 'diagnostic' && (
            <div className="space-y-3" data-testid="agro-diagnostic-tab">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 text-sm">Diagnostic individuel des planteurs</h3>
                <Badge className="bg-gray-100 text-gray-600 text-[10px]">{(diagnostic?.diagnostics || []).length} planteur(s)</Badge>
              </div>
              {(diagnostic?.diagnostics || []).length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <TreePine className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Aucun PDC avec donnees agroforesterie</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(diagnostic?.diagnostics || []).map((diag, i) => (
                    <DiagnosticFarmerCard key={diag.pdc_id || i} diag={diag} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ============== ALERTES NON-CONFORMES ============== */}
          {activeSubTab === 'alertes' && (
            <div className="space-y-3" data-testid="agro-alertes-tab">
              {nonConformes.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <p className="font-semibold text-green-700">Tous les planteurs sont conformes !</p>
                  <p className="text-sm text-gray-500 mt-1">Aucune alerte agroforesterie</p>
                </div>
              ) : (
                <>
                  <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <p className="font-bold text-red-800">{nonConformes.length} planteur(s) necessitent une intervention</p>
                    </div>
                    <p className="text-xs text-red-600">Ces planteurs ne respectent pas les criteres ARS 1000 d'agroforesterie. Une visite terrain est recommandee.</p>
                  </div>
                  {nonConformes.map((diag, i) => (
                    <DiagnosticFarmerCard key={diag.pdc_id || i} diag={diag} alert />
                  ))}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Carte diagnostic par planteur
const DiagnosticFarmerCard = ({ diag, alert }) => {
  const [expanded, setExpanded] = useState(false);
  const scoreColor = diag.score >= 80 ? 'text-green-600' : diag.score >= 50 ? 'text-amber-600' : 'text-red-600';
  const scoreBg = diag.score >= 80 ? 'bg-green-100' : diag.score >= 50 ? 'bg-amber-100' : 'bg-red-100';
  const criteres = diag.criteres || {};
  const recs = diag.recommandations || [];
  const nbFailed = Object.values(criteres).filter(c => !c.conforme).length;

  return (
    <div className={`rounded-xl border-2 overflow-hidden transition-all ${alert ? 'border-red-200 bg-red-50/30' : diag.conforme ? 'border-green-100 bg-white' : 'border-amber-200 bg-amber-50/30'}`} data-testid={`diag-farmer-${diag.pdc_id}`}>
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50/50 transition-colors">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${scoreBg}`}>
          <span className={`text-sm font-bold ${scoreColor}`}>{diag.score}%</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900 truncate">{diag.farmer_name || 'Planteur'}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {diag.conforme ? (
              <Badge className="bg-green-100 text-green-700 text-[9px]">Conforme</Badge>
            ) : (
              <Badge className="bg-red-100 text-red-700 text-[9px]">Non conforme</Badge>
            )}
            {nbFailed > 0 && <span className="text-[10px] text-gray-400">{nbFailed} critere(s) echoue(s)</span>}
          </div>
        </div>
        <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>

      {expanded && (
        <div className="px-3 pb-3 border-t border-gray-100 pt-3 space-y-3">
          {/* Criteres ARS 1000 */}
          <div>
            <p className="text-[10px] text-gray-400 font-medium mb-1.5">CRITERES ARS 1000 AGROFORESTERIE</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {Object.entries(criteres).map(([key, crit]) => (
                <div key={key} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs ${crit.conforme ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                  {crit.conforme ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 text-green-600" /> : <XCircle className="w-3.5 h-3.5 flex-shrink-0 text-red-500" />}
                  <span className="flex-1">{crit.label}</span>
                  <span className="font-medium text-[10px]">{crit.valeur}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recommandations */}
          {recs.length > 0 && (
            <div>
              <p className="text-[10px] text-gray-400 font-medium mb-1.5">RECOMMANDATIONS</p>
              <div className="space-y-1">
                {recs.map((rec, i) => (
                  <div key={`el-${i}`} className="flex items-start gap-2 bg-amber-50 rounded-lg px-2.5 py-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800">{rec}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============= ADD ARBRE FORM =============
const AddArbreForm = ({ onSuccess }) => {
  const [form, setForm] = useState({ espece: '', nombre: '', strate: 'haute', hauteur_m: '', diametre_cm: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/ars1000/certification/arbres-ombrage`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          espece: form.espece,
          nombre: parseInt(form.nombre) || 0,
          strate: form.strate,
          hauteur_m: parseFloat(form.hauteur_m) || null,
          diametre_cm: parseFloat(form.diametre_cm) || null,
        }),
      });
      if (!res.ok) throw new Error('Erreur');
      toast.success('Arbres ajoutés');
      onSuccess();
    } catch (e) {
      toast.error('Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-green-100 p-4 shadow-sm space-y-3" data-testid="add-arbre-form">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div>
          <label className="text-xs text-gray-600 font-medium block mb-1">Espèce</label>
          <Input value={form.espece} onChange={(e) => setForm({ ...form, espece: e.target.value })} placeholder="Ex: Fraké" data-testid="arbre-espece" />
        </div>
        <div>
          <label className="text-xs text-gray-600 font-medium block mb-1">Nombre</label>
          <Input type="number" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} data-testid="arbre-nombre" />
        </div>
        <div>
          <label className="text-xs text-gray-600 font-medium block mb-1">Strate</label>
          <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full" value={form.strate} onChange={(e) => setForm({ ...form, strate: e.target.value })} data-testid="arbre-strate">
            <option value="haute">Haute</option>
            <option value="moyenne">Moyenne</option>
            <option value="basse">Basse</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-600 font-medium block mb-1">Hauteur (m)</label>
          <Input type="number" value={form.hauteur_m} onChange={(e) => setForm({ ...form, hauteur_m: e.target.value })} data-testid="arbre-hauteur" />
        </div>
        <div>
          <label className="text-xs text-gray-600 font-medium block mb-1">Diamètre (cm)</label>
          <Input type="number" value={form.diametre_cm} onChange={(e) => setForm({ ...form, diametre_cm: e.target.value })} data-testid="arbre-diametre" />
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={submitting} size="sm" className="bg-green-600 hover:bg-green-700 text-white" data-testid="submit-arbre-btn">
          {submitting ? <Loader2 className="animate-spin w-4 h-4" /> : 'Enregistrer'}
        </Button>
      </div>
    </form>
  );
};

// ============= RECOLTES TAB =============
const GRADE_COLORS_CHART = ['#16a34a', '#2563eb', '#d97706', '#dc2626'];
const GRADE_LABELS = { A: 'Excellente', B: 'Bonne', C: 'Acceptable', D: 'Insuffisante' };

const RecoltesAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/api/ars1000/recoltes/analytics`, { headers: authHeaders() });
        if (res.ok) setAnalytics(await res.json());
      } catch (e) { console.error('Analytics load error:', e); }
      finally { setLoading(false); }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="animate-spin w-6 h-6 text-green-600" /></div>;
  if (!analytics) return null;

  const gradeData = (analytics.distribution_grades || []).map(g => ({
    name: `Grade ${g.grade}`, value: g.count, kg: g.total_kg,
    label: GRADE_LABELS[g.grade] || g.grade
  }));

  return (
    <div className="space-y-4 mb-6" data-testid="recoltes-analytics">
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp className="w-5 h-5 text-green-600" />
        <h3 className="font-bold text-gray-900">Tableau de bord analytique</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Volume par campagne */}
        {analytics.volume_par_campagne?.length > 0 && (
          <div className="bg-white rounded-xl border p-4 shadow-sm">
            <p className="text-xs font-bold text-gray-600 mb-3">Volume par campagne (kg)</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={analytics.volume_par_campagne}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="campagne" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => [`${v} kg`, 'Volume']} />
                <Bar dataKey="total_kg" fill="#16a34a" radius={[4, 4, 0, 0]} name="Total kg" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Distribution grades */}
        {gradeData.length > 0 && (
          <div className="bg-white rounded-xl border p-4 shadow-sm">
            <p className="text-xs font-bold text-gray-600 mb-3">Distribution des grades qualité</p>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={gradeData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {gradeData.map((_, i) => <Cell key={`el-${i}`} fill={GRADE_COLORS_CHART[i % GRADE_COLORS_CHART.length]} />)}
                </Pie>
                <Tooltip formatter={(v, name, props) => [`${v} décl. (${props.payload.kg} kg)`, props.payload.label]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Evolution mensuelle */}
        {analytics.evolution_mensuelle?.length > 0 && (
          <div className="bg-white rounded-xl border p-4 shadow-sm">
            <p className="text-xs font-bold text-gray-600 mb-3">Evolution mensuelle</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={analytics.evolution_mensuelle}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="mois" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line yAxisId="left" type="monotone" dataKey="total_kg" stroke="#16a34a" strokeWidth={2} name="Volume (kg)" dot={{ r: 3 }} />
                <Line yAxisId="right" type="monotone" dataKey="avg_qualite" stroke="#2563eb" strokeWidth={2} name="Qualité (%)" dot={{ r: 3 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Qualité par parcelle */}
        {analytics.qualite_par_parcelle?.length > 0 && (
          <div className="bg-white rounded-xl border p-4 shadow-sm">
            <p className="text-xs font-bold text-gray-600 mb-3">Qualité moyenne par parcelle</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={analytics.qualite_par_parcelle.slice(0, 8)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                <YAxis dataKey="parcelle" type="category" tick={{ fontSize: 9 }} width={80} />
                <Tooltip formatter={(v) => [`${v}%`, 'Qualité']} />
                <Bar dataKey="avg_qualite" fill="#2563eb" radius={[0, 4, 4, 0]} name="Qualité %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Top planteurs */}
      {analytics.top_planteurs?.length > 0 && (
        <div className="bg-white rounded-xl border p-4 shadow-sm">
          <p className="text-xs font-bold text-gray-600 mb-3">Top 10 Planteurs (par volume validé)</p>
          <div className="space-y-2">
            {analytics.top_planteurs.map((p, i) => (
              <div key={`el-${i}`} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                <span className="text-xs font-bold text-gray-400 w-5">#{i + 1}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{p.nom}</p>
                  <p className="text-[10px] text-gray-500">{p.count} déclarations | Qualité moy: {p.avg_qualite}%</p>
                </div>
                <span className="text-sm font-bold text-green-700">{Math.round(p.total_kg)} kg</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const RecoltesTab = () => {
  const [declarations, setDeclarations] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [rejectId, setRejectId] = useState(null);
  const [rejectMotif, setRejectMotif] = useState('');

  const loadDeclarations = useCallback(async () => {
    try {
      const params = filter ? `?statut=${filter}` : '';
      const res = await fetch(`${API_URL}/api/ars1000/recoltes/declarations${params}`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setDeclarations(data.declarations || []);
        setStats(data.stats || {});
      }
    } catch (e) { /* error */ }
    finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => { loadDeclarations(); }, [loadDeclarations]);

  const handleValidate = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/ars1000/recoltes/declarations/${id}/validate`, { method: 'PUT', headers: authHeaders() });
      if (res.ok) { toast.success('Déclaration validée'); loadDeclarations(); }
      else { const d = await res.json(); toast.error(d.detail || 'Erreur'); }
    } catch (e) { toast.error('Erreur réseau'); }
  };

  const handleReject = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/ars1000/recoltes/declarations/${id}/reject`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ motif: rejectMotif }) });
      if (res.ok) { toast.success('Déclaration rejetée'); setRejectId(null); setRejectMotif(''); loadDeclarations(); }
      else { const d = await res.json(); toast.error(d.detail || 'Erreur'); }
    } catch (e) { toast.error('Erreur réseau'); }
  };

  const gradeColors = { A: 'bg-green-100 text-green-700', B: 'bg-blue-100 text-blue-700', C: 'bg-amber-100 text-amber-700', D: 'bg-red-100 text-red-700' };
  const statutColors = { en_attente: 'bg-amber-100 text-amber-700', validee: 'bg-green-100 text-green-700', rejetee: 'bg-red-100 text-red-700' };
  const statutLabels = { en_attente: 'En attente', validee: 'Validée', rejetee: 'Rejetée' };
  const PRIX_GRADE = { A: 1250, B: 1100, C: 900, D: 700 };

  // Calculs enrichis
  const revenuEstime = declarations.filter(d => d.statut === 'validee').reduce((sum, d) => {
    const grade = d.grade_ferme?.grade || 'D';
    return sum + ((d.quantite_kg || 0) * (PRIX_GRADE[grade] || 700));
  }, 0);
  const gradeDistribution = declarations.reduce((acc, d) => {
    const g = d.grade_ferme?.grade || '?';
    acc[g] = (acc[g] || 0) + 1;
    return acc;
  }, {});
  const alertesQualite = declarations.filter(d =>
    d.grade_ferme?.grade === 'D' || d.controle_qualite?.corps_etrangers || d.controle_qualite?.feves_moisies
  );

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin w-8 h-8 text-green-600" /></div>;

  return (
    <div className="space-y-6" data-testid="recoltes-tab">
      {/* Analytics Dashboard */}
      <RecoltesAnalytics />

      {/* Stats enrichies */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white rounded-xl border p-4 shadow-sm">
          <p className="text-xs text-gray-500">En attente</p>
          <p className="text-2xl font-bold text-amber-600">{stats.en_attente || 0}</p>
          <p className="text-[10px] text-gray-400">{Math.round(stats.total_kg_attente || 0)} kg</p>
        </div>
        <div className="bg-white rounded-xl border p-4 shadow-sm">
          <p className="text-xs text-gray-500">Validees</p>
          <p className="text-2xl font-bold text-green-600">{stats.validee || 0}</p>
          <p className="text-[10px] text-gray-400">{Math.round(stats.total_kg_valide || 0)} kg</p>
        </div>
        <div className="bg-white rounded-xl border p-4 shadow-sm">
          <p className="text-xs text-gray-500">Rejetees</p>
          <p className="text-2xl font-bold text-red-600">{stats.rejetee || 0}</p>
        </div>
        <div className="bg-white rounded-xl border p-4 shadow-sm">
          <p className="text-xs text-gray-500">Total kg</p>
          <p className="text-2xl font-bold text-gray-900">{Math.round(stats.total_kg || 0)}</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 p-4 shadow-sm" data-testid="revenu-estime-card">
          <p className="text-xs text-green-700 font-medium">Revenu estime</p>
          <p className="text-xl font-bold text-green-800">{(revenuEstime / 1000000).toFixed(1)}M</p>
          <p className="text-[10px] text-green-600">{revenuEstime.toLocaleString()} FCFA</p>
        </div>
        <div className={`rounded-xl border p-4 shadow-sm ${alertesQualite.length > 0 ? 'bg-red-50 border-red-200' : 'bg-white'}`} data-testid="alertes-qualite-card">
          <p className="text-xs text-gray-500">Alertes qualite</p>
          <p className={`text-2xl font-bold ${alertesQualite.length > 0 ? 'text-red-600' : 'text-gray-400'}`}>{alertesQualite.length}</p>
          <p className="text-[10px] text-gray-400">Grade D / defauts</p>
        </div>
      </div>

      {/* Prix indicatif par grade */}
      <div className="bg-white rounded-xl border p-4 shadow-sm">
        <p className="text-xs font-bold text-gray-600 mb-2">Prix indicatif par grade (FCFA/kg) et distribution</p>
        <div className="flex flex-wrap gap-3">
          {Object.entries(PRIX_GRADE).map(([grade, prix]) => (
            <div key={grade} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${gradeColors[grade]}`}>
              <span className="font-bold">Grade {grade}</span>
              <span className="text-sm">{prix} FCFA/kg</span>
              <Badge className="bg-white/50 text-[10px]">{gradeDistribution[grade] || 0} decl.</Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Alertes qualite */}
      {alertesQualite.length > 0 && (
        <div className="bg-red-50 rounded-xl border-2 border-red-200 p-4" data-testid="alertes-qualite-section">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <p className="font-bold text-red-800 text-sm">{alertesQualite.length} declaration(s) avec problemes qualite</p>
          </div>
          <div className="space-y-1">
            {alertesQualite.slice(0, 5).map(d => (
              <div key={d.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-1.5 text-xs">
                <span className="font-medium">{d.farmer_name}</span>
                <div className="flex items-center gap-2">
                  <Badge className={gradeColors[d.grade_ferme?.grade]}>Grade {d.grade_ferme?.grade}</Badge>
                  {d.controle_qualite?.corps_etrangers && <Badge className="bg-red-200 text-red-800 text-[9px]">Corps etrangers</Badge>}
                  {d.controle_qualite?.feves_moisies && <Badge className="bg-red-200 text-red-800 text-[9px]">Moisies</Badge>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        {['', 'en_attente', 'validee', 'rejetee'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            data-testid={`filter-recolte-${f || 'all'}`}
          >
            {f === '' ? 'Toutes' : statutLabels[f]}
          </button>
        ))}
      </div>

      {/* Liste */}
      <div className="space-y-3">
        {declarations.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Aucune déclaration de récolte</p>
        ) : declarations.map(d => (
          <div key={d.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm" data-testid={`declaration-${d.id}`}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-semibold text-sm text-gray-900">{d.farmer_name || 'Planteur'}</p>
                <p className="text-xs text-gray-500">{d.parcelle_nom} | {d.campagne} | {d.date_recolte}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={gradeColors[d.grade_ferme?.grade] || 'bg-gray-100'}>Grade {d.grade_ferme?.grade}</Badge>
                <Badge className={statutColors[d.statut]}>{statutLabels[d.statut]}</Badge>
              </div>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-2 text-xs mb-2">
              <div><span className="text-gray-400">Quantité:</span> <b>{Math.round(d.quantite_kg)} kg</b></div>
              <div><span className="text-gray-400">Type:</span> <b>{d.type_cacao === 'feves_sechees' ? 'Fèves séchées' : d.type_cacao === 'feves_fraiches' ? 'Fèves fraîches' : 'Cabosses'}</b></div>
              <div><span className="text-gray-400">Séchage:</span> <b>{d.methode_sechage}</b></div>
              <div><span className="text-gray-400">Fermentation:</span> <b>{d.duree_fermentation_jours}j</b></div>
              <div><span className="text-gray-400">Qualité:</span> <b>{d.grade_ferme?.pourcentage}%</b></div>
            </div>
            {/* Détails contrôle qualité */}
            <div className="bg-gray-50 rounded-lg p-2 mb-2">
              <p className="text-[10px] font-bold text-gray-500 mb-1">Contrôle qualité ferme</p>
              <div className="flex flex-wrap gap-2 text-[10px]">
                <span className={d.controle_qualite?.humidite_estimee === 'humide' ? 'text-red-600' : 'text-green-600'}>Humidité: {d.controle_qualite?.humidite_estimee}</span>
                <span className={d.controle_qualite?.fermentation === 'mauvaise' ? 'text-red-600' : 'text-green-600'}>Fermentation: {d.controle_qualite?.fermentation}</span>
                {d.controle_qualite?.corps_etrangers && <span className="text-red-600">Corps étrangers</span>}
                {d.controle_qualite?.feves_moisies && <span className="text-red-600">Fèves moisies</span>}
                {d.controle_qualite?.feves_germees && <span className="text-red-600">Fèves germées</span>}
              </div>
            </div>
            {d.motif_rejet && <p className="text-xs text-red-600 mb-2">Motif de rejet: {d.motif_rejet}</p>}
            {/* Actions */}
            {d.statut === 'en_attente' && (
              <div className="flex items-center gap-2">
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleValidate(d.id)} data-testid={`validate-recolte-${d.id}`}>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Valider
                </Button>
                {rejectId === d.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input placeholder="Motif de rejet..." value={rejectMotif} onChange={(e) => setRejectMotif(e.target.value)} className="h-8 text-xs flex-1" data-testid={`reject-motif-${d.id}`} />
                    <Button size="sm" variant="destructive" onClick={() => handleReject(d.id)} data-testid={`confirm-reject-${d.id}`}>Confirmer</Button>
                    <Button size="sm" variant="ghost" onClick={() => setRejectId(null)}>Annuler</Button>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" className="text-red-600 border-red-200" onClick={() => setRejectId(d.id)} data-testid={`reject-recolte-${d.id}`}>
                    <XCircle className="w-3.5 h-3.5 mr-1" /> Rejeter
                  </Button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};


// ============= REGISTRES TAB (Réclamations, Risques, Impartialité) =============
const RegistresTab = ({ dashboard, onRefresh }) => {
  const cert = dashboard?.certification;
  const [showNC, setShowNC] = useState(false);
  const [showRec, setShowRec] = useState(false);
  const [showRisque, setShowRisque] = useState(false);
  const [showImpartialite, setShowImpartialite] = useState(false);
  const [declarations, setDeclarations] = useState([]);

  const [ncForm, setNcForm] = useState({ description: '', type: 'mineure', exigence_ref: '', actions_correctives: '' });
  const [recForm, setRecForm] = useState({ objet: '', description: '', plaignant: '', priorite: 'moyenne' });
  const [risqueForm, setRisqueForm] = useState({ activite: '', risque_identifie: '', causes: '', consequences: '', probabilite: 3, gravite: 3, mesures_attenuation: '' });
  const [impForm, setImpForm] = useState({ signataire_nom: '', signataire_fonction: '', conflits_interets: '', mesures_preventives: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadImpartialite(); }, []);

  const loadImpartialite = async () => {
    try {
      const res = await fetch(`${API_URL}/api/ars1000/certification/impartialite`, { headers: authHeaders() });
      if (res.ok) { const d = await res.json(); setDeclarations(d.declarations || []); }
    } catch (e) { console.error('Impartialite load error:', e); }
  };

  const handleAddNC = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try {
      await fetch(`${API_URL}/api/ars1000/certification/non-conformite`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(ncForm) });
      toast.success('Non-conformité ajoutée'); setShowNC(false);
      setNcForm({ description: '', type: 'mineure', exigence_ref: '', actions_correctives: '' });
      if (onRefresh) onRefresh();
    } catch (e) { toast.error('Erreur'); }
    finally { setSubmitting(false); }
  };

  const handleAddRec = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try {
      await fetch(`${API_URL}/api/ars1000/certification/reclamation`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(recForm) });
      toast.success('Réclamation enregistrée'); setShowRec(false);
      setRecForm({ objet: '', description: '', plaignant: '', priorite: 'moyenne' });
      if (onRefresh) onRefresh();
    } catch (e) { toast.error('Erreur'); }
    finally { setSubmitting(false); }
  };

  const handleAddRisque = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try {
      await fetch(`${API_URL}/api/ars1000/certification/risque`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(risqueForm) });
      toast.success('Risque enregistré'); setShowRisque(false);
      setRisqueForm({ activite: '', risque_identifie: '', causes: '', consequences: '', probabilite: 3, gravite: 3, mesures_attenuation: '' });
      if (onRefresh) onRefresh();
    } catch (e) { toast.error('Erreur'); }
    finally { setSubmitting(false); }
  };

  const handleAddImpartialite = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try {
      await fetch(`${API_URL}/api/ars1000/certification/impartialite`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(impForm) });
      toast.success('Déclaration d\'impartialité enregistrée'); setShowImpartialite(false);
      setImpForm({ signataire_nom: '', signataire_fonction: '', conflits_interets: '', mesures_preventives: '' });
      loadImpartialite();
    } catch (e) { toast.error('Erreur'); }
    finally { setSubmitting(false); }
  };

  const handleRecStatus = async (recId, statut, actions = '') => {
    try {
      const res = await fetch(`${API_URL}/api/ars1000/certification/reclamation/${recId}/status`, {
        method: 'PUT', headers: authHeaders(), body: JSON.stringify({ statut, actions_prises: actions })
      });
      if (res.ok) { toast.success('Statut mis à jour'); if (onRefresh) onRefresh(); }
      else { toast.error('Erreur'); }
    } catch (e) { toast.error('Erreur réseau'); }
  };

  const handleDeleteRec = async (recId) => {
    if (!window.confirm('Supprimer cette réclamation ?')) return;
    try {
      const res = await fetch(`${API_URL}/api/ars1000/certification/reclamation/${recId}`, { method: 'DELETE', headers: authHeaders() });
      if (res.ok) { toast.success('Réclamation supprimée'); if (onRefresh) onRefresh(); }
      else { toast.error('Erreur'); }
    } catch (e) { toast.error('Erreur réseau'); }
  };

  const handleRisqueStatus = async (risqueId, statut) => {
    try {
      const res = await fetch(`${API_URL}/api/ars1000/certification/risque/${risqueId}/status`, {
        method: 'PUT', headers: authHeaders(), body: JSON.stringify({ statut })
      });
      if (res.ok) { toast.success('Statut risque mis à jour'); if (onRefresh) onRefresh(); }
      else { toast.error('Erreur'); }
    } catch (e) { toast.error('Erreur réseau'); }
  };

  const handleDeleteRisque = async (risqueId) => {
    if (!window.confirm('Supprimer ce risque ?')) return;
    try {
      const res = await fetch(`${API_URL}/api/ars1000/certification/risque/${risqueId}`, { method: 'DELETE', headers: authHeaders() });
      if (res.ok) { toast.success('Risque supprimé'); if (onRefresh) onRefresh(); }
      else { toast.error('Erreur'); }
    } catch (e) { toast.error('Erreur réseau'); }
  };

  const recStatutColors = { ouverte: 'bg-red-100 text-red-700', en_cours: 'bg-amber-100 text-amber-700', resolue: 'bg-green-100 text-green-700', fermee: 'bg-gray-100 text-gray-600' };
  const risqueStatutColors = { identifie: 'bg-red-100 text-red-700', en_traitement: 'bg-amber-100 text-amber-700', attenue: 'bg-green-100 text-green-700', ferme: 'bg-gray-100 text-gray-600' };
  const prioriteColors = { basse: 'bg-gray-100 text-gray-600', moyenne: 'bg-blue-100 text-blue-700', haute: 'bg-red-100 text-red-700' };

  return (
    <div className="space-y-6" data-testid="registres-tab">
      {/* Stats rapides */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border p-4 shadow-sm">
          <p className="text-xs text-gray-500">Non-conformites</p>
          <p className="text-2xl font-bold text-amber-600">{cert?.non_conformites?.length || 0}</p>
          <p className="text-[10px] text-gray-400">{(cert?.non_conformites || []).filter(nc => nc.type === 'majeure').length} majeure(s)</p>
        </div>
        <div className="bg-white rounded-xl border p-4 shadow-sm">
          <p className="text-xs text-gray-500">Reclamations ouvertes</p>
          <p className="text-2xl font-bold text-blue-600">{(cert?.reclamations || []).filter(r => r.statut === 'ouverte' || !r.statut).length}</p>
          <p className="text-[10px] text-gray-400">{(cert?.reclamations || []).filter(r => r.priorite === 'haute').length} haute priorite</p>
        </div>
        <div className="bg-white rounded-xl border p-4 shadow-sm">
          <p className="text-xs text-gray-500">Risques actifs</p>
          <p className="text-2xl font-bold text-purple-600">{(cert?.risques || []).filter(r => r.statut !== 'ferme' && r.statut !== 'attenue').length}</p>
          <p className="text-[10px] text-gray-400">sur {(cert?.risques || []).length} total</p>
        </div>
        <div className="bg-white rounded-xl border p-4 shadow-sm">
          <p className="text-xs text-gray-500">Declarations impartialite</p>
          <p className="text-2xl font-bold text-green-600">{declarations.length}</p>
        </div>
      </div>

      {/* Matrice de risques visuelle */}
      {(cert?.risques || []).length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm" data-testid="matrice-risques">
          <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-3"><Shield className="w-5 h-5 text-purple-500" /> Matrice de Risques (Probabilite x Gravite)</h3>
          <div className="overflow-x-auto">
            <div className="grid grid-cols-6 gap-0.5 min-w-[400px]" style={{ gridTemplateColumns: '60px repeat(5, 1fr)' }}>
              {/* Header row */}
              <div className="text-[9px] text-gray-400 text-right pr-1 font-medium flex items-end justify-end pb-1">Prob./Grav.</div>
              {[1,2,3,4,5].map(g => (
                <div key={g} className="text-[10px] text-center font-bold text-gray-500 pb-1">G{g}</div>
              ))}
              {/* Rows: probability 5 to 1 */}
              {[5,4,3,2,1].map(p => (
                <React.Fragment key={p}>
                  <div className="text-[10px] text-right pr-1 font-bold text-gray-500 flex items-center justify-end">P{p}</div>
                  {[1,2,3,4,5].map(g => {
                    const level = p * g;
                    const bg = level >= 15 ? 'bg-red-500' : level >= 8 ? 'bg-amber-400' : level >= 4 ? 'bg-yellow-300' : 'bg-green-300';
                    const risquesInCell = (cert?.risques || []).filter(r => (r.probabilite || 3) === p && (r.gravite || 3) === g);
                    return (
                      <div key={g} className={`${bg} rounded-md h-10 flex items-center justify-center relative`} title={`P${p}xG${g}=${level}`}>
                        {risquesInCell.length > 0 && (
                          <div className="w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center">
                            <span className="text-[10px] font-bold text-gray-800">{risquesInCell.length}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 mt-3 text-[10px]">
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-green-300" /> Faible</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-yellow-300" /> Modere</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-amber-400" /> Eleve</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-red-500" /> Critique</div>
          </div>
        </div>
      )}

      {/* Non-conformités */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-500" /> Non-Conformités</h3>
          <Button size="sm" variant="outline" onClick={() => setShowNC(!showNC)} data-testid="add-nc-btn"><Plus className="w-4 h-4 mr-1" /> Ajouter</Button>
        </div>
        {showNC && (
          <form onSubmit={handleAddNC} className="space-y-3 mb-4 p-3 bg-amber-50 rounded-lg border border-amber-100" data-testid="nc-form">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input placeholder="Description" value={ncForm.description} onChange={(e) => setNcForm({ ...ncForm, description: e.target.value })} data-testid="nc-description" />
              <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm" value={ncForm.type} onChange={(e) => setNcForm({ ...ncForm, type: e.target.value })} data-testid="nc-type">
                <option value="mineure">Mineure</option>
                <option value="majeure">Majeure</option>
              </select>
              <Input placeholder="Référence exigence" value={ncForm.exigence_ref} onChange={(e) => setNcForm({ ...ncForm, exigence_ref: e.target.value })} />
              <Input placeholder="Actions correctives" value={ncForm.actions_correctives} onChange={(e) => setNcForm({ ...ncForm, actions_correctives: e.target.value })} />
            </div>
            <Button type="submit" size="sm" disabled={submitting} className="bg-amber-600 hover:bg-amber-700 text-white" data-testid="submit-nc-btn">Enregistrer</Button>
          </form>
        )}
        {cert?.non_conformites?.length > 0 ? cert.non_conformites.map((nc, i) => (
          <div key={`el-${i}`} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-2">
            <XCircle className={`w-5 h-5 flex-shrink-0 ${nc.type === 'majeure' ? 'text-red-500' : 'text-amber-500'}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{nc.description}</p>
              <p className="text-xs text-gray-500">{nc.exigence_ref} - {nc.date_detection}</p>
            </div>
            <Badge className={nc.statut === 'resolue' ? 'bg-green-100 text-green-700' : nc.type === 'majeure' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}>
              {nc.statut || nc.type}
            </Badge>
          </div>
        )) : <p className="text-sm text-gray-400 text-center py-4">Aucune non-conformité</p>}
      </div>

      {/* Réclamations */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900 flex items-center gap-2"><MessageSquareWarning className="w-5 h-5 text-blue-500" /> Réclamations</h3>
          <Button size="sm" variant="outline" onClick={() => setShowRec(!showRec)} data-testid="add-rec-btn"><Plus className="w-4 h-4 mr-1" /> Ajouter</Button>
        </div>
        {showRec && (
          <form onSubmit={handleAddRec} className="space-y-3 mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100" data-testid="rec-form">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input placeholder="Objet" value={recForm.objet} onChange={(e) => setRecForm({ ...recForm, objet: e.target.value })} data-testid="rec-objet" />
              <Input placeholder="Plaignant" value={recForm.plaignant} onChange={(e) => setRecForm({ ...recForm, plaignant: e.target.value })} />
              <Input placeholder="Description" value={recForm.description} onChange={(e) => setRecForm({ ...recForm, description: e.target.value })} className="md:col-span-2" />
              <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm" value={recForm.priorite} onChange={(e) => setRecForm({ ...recForm, priorite: e.target.value })} data-testid="rec-priorite">
                <option value="basse">Basse</option>
                <option value="moyenne">Moyenne</option>
                <option value="haute">Haute</option>
              </select>
            </div>
            <Button type="submit" size="sm" disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="submit-rec-btn">Enregistrer</Button>
          </form>
        )}
        {cert?.reclamations?.length > 0 ? cert.reclamations.map((rec, i) => (
          <div key={`el-${i}`} className="p-3 bg-gray-50 rounded-lg mb-2" data-testid={`rec-item-${rec.id}`}>
            <div className="flex items-start gap-3">
              <MessageSquareWarning className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium">{rec.objet}</p>
                  <Badge className={prioriteColors[rec.priorite] || prioriteColors.moyenne}>{rec.priorite}</Badge>
                </div>
                <p className="text-xs text-gray-600 mb-1">{rec.description}</p>
                <p className="text-xs text-gray-400">{rec.plaignant} - {rec.date_reclamation}</p>
                {rec.actions_prises && <p className="text-xs text-green-600 mt-1">Actions: {rec.actions_prises}</p>}
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge className={recStatutColors[rec.statut || 'ouverte']}>{rec.statut || 'ouverte'}</Badge>
                <div className="flex gap-1 mt-1">
                  {(rec.statut === 'ouverte' || !rec.statut) && (
                    <button onClick={() => handleRecStatus(rec.id, 'en_cours')} className="text-[10px] text-blue-600 hover:underline" data-testid={`rec-encours-${rec.id}`}>En cours</button>
                  )}
                  {rec.statut === 'en_cours' && (
                    <button onClick={() => handleRecStatus(rec.id, 'resolue')} className="text-[10px] text-green-600 hover:underline" data-testid={`rec-resolve-${rec.id}`}>Résoudre</button>
                  )}
                  <button onClick={() => handleDeleteRec(rec.id)} className="text-[10px] text-red-400 hover:underline" data-testid={`rec-delete-${rec.id}`}>Suppr.</button>
                </div>
              </div>
            </div>
          </div>
        )) : <p className="text-sm text-gray-400 text-center py-4">Aucune réclamation</p>}
      </div>

      {/* Risques & Impartialité */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900 flex items-center gap-2"><Scale className="w-5 h-5 text-purple-500" /> Risques & Impartialité</h3>
          <Button size="sm" variant="outline" onClick={() => setShowRisque(!showRisque)} data-testid="add-risque-btn"><Plus className="w-4 h-4 mr-1" /> Ajouter risque</Button>
        </div>
        {showRisque && (
          <form onSubmit={handleAddRisque} className="space-y-3 mb-4 p-3 bg-purple-50 rounded-lg border border-purple-100" data-testid="risque-form">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input placeholder="Activité" value={risqueForm.activite} onChange={(e) => setRisqueForm({ ...risqueForm, activite: e.target.value })} data-testid="risque-activite" />
              <Input placeholder="Risque identifié" value={risqueForm.risque_identifie} onChange={(e) => setRisqueForm({ ...risqueForm, risque_identifie: e.target.value })} />
              <Input placeholder="Causes" value={risqueForm.causes} onChange={(e) => setRisqueForm({ ...risqueForm, causes: e.target.value })} />
              <Input placeholder="Mesures d'atténuation" value={risqueForm.mesures_attenuation} onChange={(e) => setRisqueForm({ ...risqueForm, mesures_attenuation: e.target.value })} />
            </div>
            <div className="flex gap-3">
              <div><label className="text-xs text-gray-600">Probabilité (1-5)</label>
                <Input type="number" min={1} max={5} value={risqueForm.probabilite} onChange={(e) => setRisqueForm({ ...risqueForm, probabilite: parseInt(e.target.value) || 1 })} /></div>
              <div><label className="text-xs text-gray-600">Gravité (1-5)</label>
                <Input type="number" min={1} max={5} value={risqueForm.gravite} onChange={(e) => setRisqueForm({ ...risqueForm, gravite: parseInt(e.target.value) || 1 })} /></div>
            </div>
            <Button type="submit" size="sm" disabled={submitting} className="bg-purple-600 hover:bg-purple-700 text-white" data-testid="submit-risque-btn">Enregistrer</Button>
          </form>
        )}
        {cert?.risques?.length > 0 ? cert.risques.map((r, i) => (
          <div key={`el-${i}`} className="p-3 bg-gray-50 rounded-lg mb-2" data-testid={`risque-item-${r.id}`}>
            <div className="flex items-start gap-3">
              <Scale className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{r.activite}: {r.risque_identifie}</p>
                <p className="text-xs text-gray-500">Score: {r.score} (P:{r.probabilite} x G:{r.gravite}) | {r.mesures_attenuation}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge className={r.score >= 15 ? 'bg-red-100 text-red-700' : r.score >= 9 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}>
                  {r.score >= 15 ? 'Critique' : r.score >= 9 ? 'Modéré' : 'Faible'}
                </Badge>
                <Badge className={risqueStatutColors[r.statut || 'identifie']}>{r.statut || 'identifié'}</Badge>
                <div className="flex gap-1 mt-1">
                  {(!r.statut || r.statut === 'identifie') && (
                    <button onClick={() => handleRisqueStatus(r.id, 'en_traitement')} className="text-[10px] text-purple-600 hover:underline">Traiter</button>
                  )}
                  {r.statut === 'en_traitement' && (
                    <button onClick={() => handleRisqueStatus(r.id, 'attenue')} className="text-[10px] text-green-600 hover:underline">Atténué</button>
                  )}
                  <button onClick={() => handleDeleteRisque(r.id)} className="text-[10px] text-red-400 hover:underline">Suppr.</button>
                </div>
              </div>
            </div>
          </div>
        )) : <p className="text-sm text-gray-400 text-center py-4">Aucun risque enregistré</p>}
      </div>

      {/* Déclaration d'impartialité */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900 flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-green-500" /> Déclarations d'Impartialité</h3>
          <Button size="sm" variant="outline" onClick={() => setShowImpartialite(!showImpartialite)} data-testid="add-impartialite-btn"><Plus className="w-4 h-4 mr-1" /> Nouvelle</Button>
        </div>
        {showImpartialite && (
          <form onSubmit={handleAddImpartialite} className="space-y-3 mb-4 p-3 bg-green-50 rounded-lg border border-green-100" data-testid="impartialite-form">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input placeholder="Nom du signataire" value={impForm.signataire_nom} onChange={(e) => setImpForm({ ...impForm, signataire_nom: e.target.value })} data-testid="imp-nom" />
              <Input placeholder="Fonction" value={impForm.signataire_fonction} onChange={(e) => setImpForm({ ...impForm, signataire_fonction: e.target.value })} data-testid="imp-fonction" />
              <Input placeholder="Conflits d'intérêts identifiés (si aucun: Aucun)" value={impForm.conflits_interets} onChange={(e) => setImpForm({ ...impForm, conflits_interets: e.target.value })} className="md:col-span-2" data-testid="imp-conflits" />
              <Input placeholder="Mesures préventives" value={impForm.mesures_preventives} onChange={(e) => setImpForm({ ...impForm, mesures_preventives: e.target.value })} className="md:col-span-2" data-testid="imp-mesures" />
            </div>
            <p className="text-xs text-gray-500 italic">Je m'engage à exercer mes activités en toute impartialité et à signaler tout conflit d'intérêts.</p>
            <Button type="submit" size="sm" disabled={submitting} className="bg-green-600 hover:bg-green-700 text-white" data-testid="submit-impartialite-btn">Signer la déclaration</Button>
          </form>
        )}
        {declarations.length > 0 ? declarations.map((d, i) => (
          <div key={`el-${i}`} className="flex items-center gap-3 p-3 bg-green-50/50 rounded-lg mb-2 border border-green-100" data-testid={`imp-item-${d.id}`}>
            <ShieldCheck className="w-5 h-5 text-green-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">{d.signataire_nom} - {d.signataire_fonction}</p>
              <p className="text-xs text-gray-500">Conflits: {d.conflits_interets || 'Aucun'}</p>
              {d.mesures_preventives && <p className="text-xs text-gray-400">Mesures: {d.mesures_preventives}</p>}
            </div>
            <Badge className="bg-green-100 text-green-700">{d.date_signature?.slice(0, 10)}</Badge>
          </div>
        )) : <p className="text-sm text-gray-400 text-center py-4">Aucune déclaration d'impartialité</p>}
      </div>
    </div>
  );
};

// ======== DIAGNOSTIC CONFORMITE PDC ========
const DiagnosticConformitePDC = () => {
  const navigate = useNavigate();
  const [pdcs, setPdcs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/api/pdc-v2/list?limit=100`, { headers: authHeaders() });
        if (res.ok) {
          const data = await res.json();
          setPdcs(data.pdcs || []);
        }
      } catch { /* error */ }
      finally { setLoading(false); }
    };
    load();
  }, []);

  // PDC v2 fiche checks (8 fiches across 3 steps)
  const ficheChecks = [
    { key: 'f1_producteur', label: 'F1: Producteur', check: (p) => {
      const f1 = p.step1?.fiche1 || {};
      return !!(f1.producteur?.nom || (f1.membres_menage && f1.membres_menage.length > 0));
    }},
    { key: 'f2_exploitation', label: 'F2: Exploitation', check: (p) => {
      const f2 = p.step1?.fiche2 || {};
      return !!(f2.cultures?.length > 0 || f2.arbres?.length > 0 || (f2.carte_parcelle?.polygon?.length > 0));
    }},
    { key: 'f2_arbres', label: 'F2: Arbres ombrage', check: (p) => {
      const f2 = p.step1?.fiche2 || {};
      return !!(f2.arbres?.length > 0 || f2.carte_parcelle?.arbres_ombrage?.length > 0);
    }},
    { key: 'f3_cacaoyere', label: 'F3: Cacaoyere', check: (p) => {
      const f3 = p.step1?.fiche3 || {};
      return !!(f3.etat_cacaoyere?.dispositif_plantation || f3.maladies?.length > 0 || f3.etat_sol?.position);
    }},
    { key: 'f4_socioeco', label: 'F4: Socio-economique', check: (p) => {
      const f4 = p.step1?.fiche4 || {};
      return !!(f4.epargne?.length > 0 || f4.production_cacao?.length > 0 || f4.main_oeuvre?.length > 0);
    }},
    { key: 'f5_analyse', label: 'F5: Analyse', check: (p) => {
      const f5 = p.step2?.fiche5 || {};
      return !!(f5.analyses?.length > 0);
    }},
    { key: 'f6_planification', label: 'F6: Planification', check: (p) => {
      const f6 = p.step3?.fiche6 || {};
      return !!(f6.axes?.length > 0);
    }},
    { key: 'f7_programme', label: 'F7: Programme', check: (p) => {
      const f7 = p.step3?.fiche7 || {};
      return !!(f7.actions?.length > 0);
    }},
  ];

  const pdcsWithScore = pdcs.map(p => {
    const checks = ficheChecks.map(fc => ({ ...fc, ok: fc.check(p) }));
    const score = Math.round((checks.filter(c => c.ok).length / checks.length) * 100);
    return { ...p, ficheChecks: checks, ficheScore: score };
  });

  const avgScore = pdcsWithScore.length > 0 ? Math.round(pdcsWithScore.reduce((s, p) => s + p.ficheScore, 0) / pdcsWithScore.length) : 0;
  const complete = pdcsWithScore.filter(p => p.ficheScore === 100).length;
  const incomplete = pdcsWithScore.filter(p => p.ficheScore < 100).length;

  const ficheGlobal = ficheChecks.map(fc => ({
    ...fc,
    pct: pdcs.length > 0 ? Math.round((pdcs.filter(p => fc.check(p)).length / pdcs.length) * 100) : 0,
  }));

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin w-8 h-8 text-green-600" /></div>;

  return (
    <div className="space-y-5" data-testid="diagnostic-conformite-pdc">
      <div className="rounded-2xl p-5 bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200">
        <div className="flex items-center gap-4 mb-4">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${avgScore >= 80 ? 'bg-green-500' : avgScore >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}>
            <span className="text-2xl font-bold text-white">{avgScore}%</span>
          </div>
          <div>
            <p className="font-bold text-lg text-gray-900">Diagnostic Conformite PDC</p>
            <p className="text-sm text-gray-600">Taux de remplissage moyen des 8 fiches PDC v2</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-3 text-center border border-indigo-100">
            <p className="text-xl font-bold text-indigo-700">{pdcs.length}</p>
            <p className="text-[10px] text-gray-500">PDC Total</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center border border-green-100">
            <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto mb-0.5" />
            <p className="text-xl font-bold text-green-700">{complete}</p>
            <p className="text-[10px] text-gray-500">100% complets</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center border border-amber-100">
            <AlertTriangle className="w-5 h-5 text-amber-500 mx-auto mb-0.5" />
            <p className="text-xl font-bold text-amber-600">{incomplete}</p>
            <p className="text-[10px] text-gray-500">Incomplets</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-5 shadow-sm">
        <h3 className="font-bold text-sm text-gray-900 mb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-indigo-500" /> Remplissage par Fiche (tous planteurs)</h3>
        <div className="space-y-2">
          {ficheGlobal.map(f => {
            const barColor = f.pct >= 80 ? '#10b981' : f.pct >= 50 ? '#f59e0b' : f.pct >= 25 ? '#f97316' : '#ef4444';
            return (
              <div key={f.key} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-32 flex-shrink-0">{f.label}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${f.pct}%`, backgroundColor: barColor }} />
                </div>
                <span className="text-xs font-bold w-10 text-right" style={{ color: barColor }}>{f.pct}%</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl border p-5 shadow-sm">
        <h3 className="font-bold text-sm text-gray-900 mb-3 flex items-center gap-2"><User className="w-4 h-4 text-purple-500" /> Diagnostic par Planteur</h3>
        <div className="space-y-2">
          {pdcsWithScore.sort((a, b) => a.ficheScore - b.ficheScore).map((p) => {
            const scoreColor = p.ficheScore >= 80 ? 'text-green-600' : p.ficheScore >= 50 ? 'text-amber-600' : 'text-red-600';
            const scoreBg = p.ficheScore >= 80 ? 'bg-green-100' : p.ficheScore >= 50 ? 'bg-amber-100' : 'bg-red-100';
            const filled = p.ficheChecks.filter(c => c.ok).length;
            const nom = p.farmer_name || 'Planteur';
            const prenoms = '';
            return (
              <details key={p.id} className={`rounded-xl border overflow-hidden ${p.ficheScore < 50 ? 'border-red-200' : 'border-gray-100'}`} data-testid={`pdc-diag-${p.id}`}>
                <summary className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${scoreBg}`}>
                    <span className={`text-xs font-bold ${scoreColor}`}>{p.ficheScore}%</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">{nom}</p>
                    <p className="text-[10px] text-gray-400">{filled}/{ficheChecks.length} fiches | Etape {p.current_step || 1}/3 | {p.statut}</p>
                  </div>
                  <Badge className={p.statut === 'valide' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}>{p.statut?.replace(/_/g, ' ')}</Badge>
                </summary>
                <div className="px-3 pb-3 border-t pt-2">
                  <div className="grid grid-cols-2 gap-1 mb-2">
                    {p.ficheChecks.map(c => (
                      <div key={c.key} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] ${c.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {c.ok ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {c.label}
                      </div>
                    ))}
                  </div>
                  <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => navigate(`/cooperative/pdc-v2/${p.id}`)} data-testid={`pdc-goto-${p.id}`}>
                    <Eye className="w-3 h-3 mr-1" /> Voir le PDC
                  </Button>
                </div>
              </details>
            );
          })}
          {pdcsWithScore.length === 0 && <p className="text-center text-gray-400 text-sm py-6">Aucun PDC</p>}
        </div>
      </div>
    </div>
  );
};



// ============= MAIN PAGE =============
export default function ARS1000Dashboard() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'recoltes';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [certDashboard, setCertDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadCertification = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/ars1000/certification/dashboard`, { headers: authHeaders() });
      if (res.ok) setCertDashboard(await res.json());
    } catch (e) { /* error */ }
    finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadCertification(); }, [loadCertification]);

  return (
    <div className="min-h-screen bg-gray-50" data-testid="ars1000-dashboard">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-600 to-emerald-500 flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Certification ARS 1000</h1>
                <p className="text-xs text-gray-500">Cacao Durable - {user?.coop_name || user?.full_name}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => window.history.back()} data-testid="back-btn">
              <ArrowLeft className="w-4 h-4 mr-1" /> Retour
            </Button>
          </div>
          {/* Tabs */}
          <div className="flex gap-1 mt-3 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-green-600 text-white'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
                data-testid={`tab-${tab.id}`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'recoltes' && <RecoltesTab />}
        {activeTab === 'agroforesterie' && <AgroforesterieTab />}
        {activeTab === 'especes' && <GuideEspeces />}
        {activeTab === 'diagnostic' && <DiagnosticConformitePDC />}
        {activeTab === 'protection' && <ProtectionEnvironnementale />}
        {activeTab === 'registres' && <RegistresTab dashboard={certDashboard} onRefresh={loadCertification} />}
      </div>
    </div>
  );
}

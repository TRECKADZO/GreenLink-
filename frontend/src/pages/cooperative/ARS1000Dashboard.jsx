import React, { useState, useEffect, useCallback } from 'react';
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
  XCircle, ArrowUpRight, Filter
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const getToken = () => localStorage.getItem('token');
const authHeaders = () => ({ 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' });

// ============= TABS =============
const TABS = [
  { id: 'certification', label: 'Certification', icon: Shield },
  { id: 'pdc', label: 'Tous les PDC', icon: FileText },
  { id: 'lots', label: 'Traçabilité', icon: Package },
  { id: 'agroforesterie', label: 'Agroforesterie', icon: TreePine },
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
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <kpi.icon className={`w-4 h-4 text-${kpi.color}-500`} />
              <span className="text-xs text-gray-500">{kpi.label}</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Audits */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h3 className="text-base font-bold text-gray-900 mb-4">Cycle d'Audit</h3>
        {certification.cycle_audit && certification.cycle_audit.length > 0 ? (
          <div className="space-y-3">
            {certification.cycle_audit.map((a, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
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

// ============= PDC TAB =============
const PDCTab = ({ onRefresh }) => {
  const [pdcs, setPdcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [stats, setStats] = useState(null);

  const loadPDCs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('statut', statusFilter);
      const res = await fetch(`${API_URL}/api/ars1000/pdc/cooperative/all?${params}`, { headers: authHeaders() });
      const data = await res.json();
      setPdcs(data.pdcs || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/ars1000/pdc/cooperative/stats`, { headers: authHeaders() });
      setStats(await res.json());
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { loadPDCs(); loadStats(); }, [loadPDCs, loadStats]);

  const handleValidate = async (pdcId) => {
    try {
      await fetch(`${API_URL}/api/ars1000/pdc/${pdcId}/validate`, { method: 'POST', headers: authHeaders() });
      toast.success('PDC validé avec succès');
      loadPDCs(); loadStats();
    } catch (e) {
      toast.error('Erreur lors de la validation');
    }
  };

  const statusColors = {
    brouillon: 'bg-gray-100 text-gray-600',
    soumis: 'bg-blue-100 text-blue-700',
    valide: 'bg-green-100 text-green-700',
    archive: 'bg-red-100 text-red-600',
  };

  return (
    <div className="space-y-4" data-testid="pdc-tab">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Total', value: stats.total, color: 'gray' },
            { label: 'Brouillons', value: stats.brouillons, color: 'gray' },
            { label: 'Soumis', value: stats.soumis, color: 'blue' },
            { label: 'Validés', value: stats.valides, color: 'green' },
            { label: 'Conformité moy.', value: `${stats.pourcentage_conformite_moyen}%`, color: 'purple' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm text-center">
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Rechercher un planteur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            data-testid="pdc-search"
          />
        </div>
        <select
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          data-testid="pdc-status-filter"
        >
          <option value="">Tous les statuts</option>
          <option value="brouillon">Brouillon</option>
          <option value="soumis">Soumis</option>
          <option value="valide">Validé</option>
        </select>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin w-8 h-8 text-green-600" /></div>
      ) : pdcs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Aucun PDC enregistré</p>
          <p className="text-gray-400 text-xs mt-1">Les planteurs peuvent créer leur PDC depuis leur espace</p>
        </div>
      ) : (
        <div className="space-y-2">
          {pdcs.map(pdc => (
            <div key={pdc.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow" data-testid={`pdc-item-${pdc.id}`}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-gray-900 text-sm">
                      {pdc.identification?.nom} {pdc.identification?.prenoms}
                    </p>
                    <Badge className={statusColors[pdc.statut] || statusColors.brouillon}>
                      {pdc.statut}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500">
                    {pdc.identification?.village} - {pdc.parcelles?.length || 0} parcelle(s) - Conformité: {pdc.pourcentage_conformite}%
                  </p>
                  <div className="h-1.5 bg-gray-100 rounded-full mt-2 w-48">
                    <div
                      className={`h-full rounded-full transition-all ${pdc.pourcentage_conformite >= 80 ? 'bg-green-500' : pdc.pourcentage_conformite >= 50 ? 'bg-amber-500' : 'bg-red-400'}`}
                      style={{ width: `${Math.min(pdc.pourcentage_conformite, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {pdc.statut === 'soumis' && (
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleValidate(pdc.id)} data-testid={`validate-pdc-${pdc.id}`}>
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Valider
                    </Button>
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
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/ars1000/lots/stats/overview`, { headers: authHeaders() });
      setStats(await res.json());
    } catch (e) { console.error(e); }
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
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm text-center">
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
                  {!lot.rapport_essai && (
                    <Button size="sm" variant="outline" onClick={() => handleGenerateRapport(lot.id)} data-testid={`generate-rapport-${lot.id}`}>
                      <FileText className="w-3.5 h-3.5 mr-1" /> Rapport
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
  const [arbres, setArbres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [statsRes, arbresRes] = await Promise.all([
        fetch(`${API_URL}/api/ars1000/certification/arbres-ombrage/stats`, { headers: authHeaders() }),
        fetch(`${API_URL}/api/ars1000/certification/arbres-ombrage?limit=50`, { headers: authHeaders() }),
      ]);
      setStats(await statsRes.json());
      const ad = await arbresRes.json();
      setArbres(ad.arbres || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <div className="space-y-4" data-testid="agroforesterie-tab">
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin w-8 h-8 text-green-600" /></div>
      ) : (
        <>
          {/* Conformity Status */}
          {stats && (
            <div className={`rounded-2xl p-5 border-2 ${stats.conforme_agroforesterie ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
              <div className="flex items-center gap-3 mb-3">
                {stats.conforme_agroforesterie ? (
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                ) : (
                  <AlertTriangle className="w-8 h-8 text-amber-600" />
                )}
                <div>
                  <p className="font-bold text-lg">{stats.conforme_agroforesterie ? 'Conforme ARS 1000' : 'Non conforme'}</p>
                  <p className="text-sm text-gray-600">Agroforesterie - Arbres d'ombrage</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                <div className="bg-white/80 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-gray-900">{stats.total_arbres}</p>
                  <p className="text-xs text-gray-500">Total arbres</p>
                </div>
                <div className={`bg-white/80 rounded-lg p-3 text-center ${stats.conformite_details?.densite_ok ? '' : 'ring-2 ring-red-300'}`}>
                  <p className="text-xl font-bold text-gray-900">{stats.densite_par_ha}</p>
                  <p className="text-xs text-gray-500">Densité/ha</p>
                  <p className="text-[10px] text-gray-400">Requis: 25-40</p>
                </div>
                <div className={`bg-white/80 rounded-lg p-3 text-center ${stats.conformite_details?.especes_ok ? '' : 'ring-2 ring-red-300'}`}>
                  <p className="text-xl font-bold text-gray-900">{stats.nombre_especes}</p>
                  <p className="text-xs text-gray-500">Espèces</p>
                  <p className="text-[10px] text-gray-400">Requis: min 3</p>
                </div>
                <div className="bg-white/80 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-gray-900">{stats.superficie_totale_ha || 0}</p>
                  <p className="text-xs text-gray-500">Superficie (ha)</p>
                </div>
              </div>

              {/* 3 Strates */}
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="bg-white/60 rounded-lg p-2 text-center">
                  <p className="text-sm font-bold text-green-800">{stats.strate_haute}</p>
                  <p className="text-[10px] text-gray-500">Strate haute</p>
                </div>
                <div className="bg-white/60 rounded-lg p-2 text-center">
                  <p className="text-sm font-bold text-green-700">{stats.strate_moyenne}</p>
                  <p className="text-[10px] text-gray-500">Strate moyenne</p>
                </div>
                <div className="bg-white/60 rounded-lg p-2 text-center">
                  <p className="text-sm font-bold text-green-600">{stats.strate_basse}</p>
                  <p className="text-[10px] text-gray-500">Strate basse</p>
                </div>
              </div>

              {/* Conformity checklist */}
              <div className="mt-3 space-y-1">
                {stats.conformite_details && Object.entries({
                  'Densité (25-40 arbres/ha)': stats.conformite_details.densite_ok,
                  'Espèces (min 3)': stats.conformite_details.especes_ok,
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

          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">Inventaire des Arbres</h3>
            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => setShowAdd(!showAdd)} data-testid="add-arbre-btn">
              <Plus className="w-4 h-4 mr-1" /> Ajouter
            </Button>
          </div>

          {showAdd && <AddArbreForm onSuccess={() => { setShowAdd(false); loadData(); }} />}

          {/* Species list */}
          {stats?.especes && stats.especes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {stats.especes.map((esp, i) => (
                <Badge key={i} className="bg-green-100 text-green-700">{esp}</Badge>
              ))}
            </div>
          )}
        </>
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

// ============= REGISTRES TAB (Réclamations, Risques) =============
const RegistresTab = ({ dashboard }) => {
  const cert = dashboard?.certification;
  const [showNC, setShowNC] = useState(false);
  const [showRec, setShowRec] = useState(false);
  const [showRisque, setShowRisque] = useState(false);

  const [ncForm, setNcForm] = useState({ description: '', type: 'mineure', exigence_ref: '', actions_correctives: '' });
  const [recForm, setRecForm] = useState({ objet: '', description: '', plaignant: '', priorite: 'moyenne' });
  const [risqueForm, setRisqueForm] = useState({ activite: '', risque_identifie: '', causes: '', consequences: '', probabilite: 3, gravite: 3, mesures_attenuation: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleAddNC = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch(`${API_URL}/api/ars1000/certification/non-conformite`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(ncForm) });
      toast.success('Non-conformité ajoutée');
      setShowNC(false);
      setNcForm({ description: '', type: 'mineure', exigence_ref: '', actions_correctives: '' });
    } catch (e) { toast.error('Erreur'); }
    finally { setSubmitting(false); }
  };

  const handleAddRec = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch(`${API_URL}/api/ars1000/certification/reclamation`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(recForm) });
      toast.success('Réclamation enregistrée');
      setShowRec(false);
    } catch (e) { toast.error('Erreur'); }
    finally { setSubmitting(false); }
  };

  const handleAddRisque = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch(`${API_URL}/api/ars1000/certification/risque`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(risqueForm) });
      toast.success('Risque enregistré');
      setShowRisque(false);
    } catch (e) { toast.error('Erreur'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-6" data-testid="registres-tab">
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
          <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-2">
            <XCircle className={`w-5 h-5 ${nc.type === 'majeure' ? 'text-red-500' : 'text-amber-500'}`} />
            <div className="flex-1">
              <p className="text-sm font-medium">{nc.description}</p>
              <p className="text-xs text-gray-500">{nc.exigence_ref} - {nc.date_detection}</p>
            </div>
            <Badge className={nc.type === 'majeure' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}>{nc.type}</Badge>
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
            </div>
            <Button type="submit" size="sm" disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="submit-rec-btn">Enregistrer</Button>
          </form>
        )}
        {cert?.reclamations?.length > 0 ? cert.reclamations.map((rec, i) => (
          <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-2">
            <MessageSquareWarning className="w-5 h-5 text-blue-500" />
            <div className="flex-1">
              <p className="text-sm font-medium">{rec.objet}</p>
              <p className="text-xs text-gray-500">{rec.plaignant} - {rec.date_reclamation}</p>
            </div>
            <Badge className="bg-blue-100 text-blue-700">{rec.statut || 'ouverte'}</Badge>
          </div>
        )) : <p className="text-sm text-gray-400 text-center py-4">Aucune réclamation</p>}
      </div>

      {/* Risques */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900 flex items-center gap-2"><Scale className="w-5 h-5 text-purple-500" /> Risques & Impartialité</h3>
          <Button size="sm" variant="outline" onClick={() => setShowRisque(!showRisque)} data-testid="add-risque-btn"><Plus className="w-4 h-4 mr-1" /> Ajouter</Button>
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
              <div>
                <label className="text-xs text-gray-600">Probabilité (1-5)</label>
                <Input type="number" min={1} max={5} value={risqueForm.probabilite} onChange={(e) => setRisqueForm({ ...risqueForm, probabilite: parseInt(e.target.value) })} />
              </div>
              <div>
                <label className="text-xs text-gray-600">Gravité (1-5)</label>
                <Input type="number" min={1} max={5} value={risqueForm.gravite} onChange={(e) => setRisqueForm({ ...risqueForm, gravite: parseInt(e.target.value) })} />
              </div>
            </div>
            <Button type="submit" size="sm" disabled={submitting} className="bg-purple-600 hover:bg-purple-700 text-white" data-testid="submit-risque-btn">Enregistrer</Button>
          </form>
        )}
        {cert?.risques?.length > 0 ? cert.risques.map((r, i) => (
          <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-2">
            <Scale className="w-5 h-5 text-purple-500" />
            <div className="flex-1">
              <p className="text-sm font-medium">{r.activite}: {r.risque_identifie}</p>
              <p className="text-xs text-gray-500">Score: {r.score} | {r.mesures_attenuation}</p>
            </div>
            <Badge className={r.score >= 15 ? 'bg-red-100 text-red-700' : r.score >= 9 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}>
              {r.score >= 15 ? 'Critique' : r.score >= 9 ? 'Modéré' : 'Faible'}
            </Badge>
          </div>
        )) : <p className="text-sm text-gray-400 text-center py-4">Aucun risque enregistré</p>}
      </div>
    </div>
  );
};


// ============= MAIN PAGE =============
export default function ARS1000Dashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('certification');
  const [certDashboard, setCertDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadCertification = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/ars1000/certification/dashboard`, { headers: authHeaders() });
      if (res.ok) setCertDashboard(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
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
        {activeTab === 'certification' && <CertificationTab dashboard={certDashboard} onRefresh={loadCertification} />}
        {activeTab === 'pdc' && <PDCTab onRefresh={loadCertification} />}
        {activeTab === 'lots' && <LotsTab />}
        {activeTab === 'agroforesterie' && <AgroforesterieTab />}
        {activeTab === 'registres' && <RegistresTab dashboard={certDashboard} />}
      </div>
    </div>
  );
}

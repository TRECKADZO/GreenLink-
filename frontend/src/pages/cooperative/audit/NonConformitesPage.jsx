import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { tokenService } from '../../../services/tokenService';
import { toast } from 'sonner';
import {
  AlertTriangle, Loader2, Home, ChevronRight, Plus,
  CheckCircle2, Clock, XCircle, Edit3
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const NonConformitesPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [ncs, setNcs] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(searchParams.get('create') === '1');
  const [editNC, setEditNC] = useState(null);
  const [filterStatut, setFilterStatut] = useState('');
  const [filterType, setFilterType] = useState('');
  const [sessionId, setSessionId] = useState('');

  useEffect(() => { loadSession(); }, []);
  useEffect(() => { if (sessionId) loadNCs(); }, [sessionId, filterStatut, filterType]);

  const loadSession = async () => {
    try {
      const token = tokenService.getToken();
      const res = await fetch(`${API}/api/audit/sessions`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.sessions?.length > 0) setSessionId(data.sessions[0].session_id);
      else setLoading(false);
    } catch { setLoading(false); }
  };

  const loadNCs = async () => {
    try {
      const token = tokenService.getToken();
      const params = new URLSearchParams({ session_id: sessionId });
      if (filterStatut) params.append('statut', filterStatut);
      if (filterType) params.append('type_nc', filterType);
      const res = await fetch(`${API}/api/audit/non-conformites?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setNcs(data.non_conformites || []);
      setStats(data.stats || {});
    } catch {
      toast.error('Erreur chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (form) => {
    try {
      const token = tokenService.getToken();
      const res = await fetch(`${API}/api/audit/non-conformites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, audit_session_id: sessionId }),
      });
      if (!res.ok) throw new Error('Erreur');
      toast.success('Non-conformite creee');
      setShowCreate(false);
      loadNCs();
    } catch { toast.error('Erreur creation'); }
  };

  const handleUpdate = async (ncId, updateData) => {
    try {
      const token = tokenService.getToken();
      const res = await fetch(`${API}/api/audit/non-conformites/${ncId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(updateData),
      });
      if (!res.ok) throw new Error('Erreur');
      toast.success('NC mise a jour');
      setEditNC(null);
      loadNCs();
    } catch { toast.error('Erreur mise a jour'); }
  };

  const statColors = { ouvert: 'bg-red-50 text-red-800 border-red-200', en_cours: 'bg-amber-50 text-amber-800 border-amber-200', resolu: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
  const statLabels = { ouvert: 'Ouvert', en_cours: 'En cours', resolu: 'Resolu' };

  return (
    <div className="min-h-screen bg-[#FAF9F6]" data-testid="nc-page">
      <div className="bg-[#1A3622] relative overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-6 relative">
          <div className="flex items-center gap-2 text-white/50 text-xs mb-3">
            <button onClick={() => navigate('/cooperative/dashboard')} className="hover:text-white"><Home className="h-3.5 w-3.5" /></button>
            <ChevronRight className="h-3 w-3" />
            <button onClick={() => navigate('/cooperative/audit')} className="hover:text-white">Audit</button>
            <ChevronRight className="h-3 w-3" />
            <span className="text-white/80">Non-conformites</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/cooperative/audit')} className="w-8 h-8 rounded-md bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors" data-testid="btn-retour"><ChevronRight className="h-4 w-4 text-white rotate-180" /></button>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">Non-conformites & Plan d'actions</h1>
                <p className="text-sm text-white/60 mt-1">Suivi des NC et actions correctives</p>
              </div>
            </div>
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-white text-[#1A3622] rounded-md text-sm font-medium hover:bg-white/90" data-testid="btn-create-nc">
              <Plus className="h-4 w-4" /> Nouvelle NC
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-8">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6" data-testid="nc-kpis">
          <MiniStat label="Total" value={stats.total || 0} />
          <MiniStat label="Ouvertes" value={stats.ouvertes || 0} color="text-red-600" bg="bg-red-50" />
          <MiniStat label="En cours" value={stats.en_cours || 0} color="text-amber-600" bg="bg-amber-50" />
          <MiniStat label="Resolues" value={stats.resolues || 0} color="text-emerald-600" bg="bg-emerald-50" />
          <MiniStat label="Majeures" value={stats.majeures || 0} color="text-red-800" bg="bg-red-50" />
          <MiniStat label="Mineures" value={stats.mineures || 0} color="text-blue-800" bg="bg-blue-50" />
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-6">
          <select value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)} className="px-3 py-1.5 text-xs border border-[#E5E5E0] rounded-md bg-white" data-testid="filter-statut">
            <option value="">Tous statuts</option>
            <option value="ouvert">Ouvert</option>
            <option value="en_cours">En cours</option>
            <option value="resolu">Resolu</option>
          </select>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-3 py-1.5 text-xs border border-[#E5E5E0] rounded-md bg-white" data-testid="filter-type">
            <option value="">Tous types</option>
            <option value="Majeure">Majeure</option>
            <option value="Mineure">Mineure</option>
          </select>
        </div>

        {/* NC List */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-[#1A3622]" /></div>
        ) : ncs.length === 0 ? (
          <div className="bg-white border border-[#E5E5E0] rounded-md p-12 text-center" data-testid="empty-nc">
            <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-4" strokeWidth={1} />
            <h3 className="text-lg font-semibold text-[#1A3622] mb-2">Aucune non-conformite</h3>
            <p className="text-sm text-[#6B7280]">Toutes les exigences sont conformes ou n'ont pas encore ete evaluees.</p>
          </div>
        ) : (
          <div className="space-y-3" data-testid="nc-list">
            {ncs.map(nc => (
              <div key={nc.nc_id} className={`border rounded-md overflow-hidden ${statColors[nc.statut] || 'bg-white border-[#E5E5E0]'}`} data-testid={`nc-${nc.nc_number}`}>
                <div className="px-5 py-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold bg-white/70 px-2 py-0.5 rounded">NC-{nc.nc_number}</span>
                      <span className="text-xs font-medium">Clause {nc.clause}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${nc.type_nc === 'Majeure' ? 'bg-red-200 text-red-800' : 'bg-blue-200 text-blue-800'}`}>
                        {nc.type_nc}
                      </span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/50">
                        {statLabels[nc.statut] || nc.statut}
                      </span>
                    </div>
                    <button onClick={() => setEditNC(nc)} className="p-1 rounded hover:bg-white/50" data-testid={`btn-edit-nc-${nc.nc_number}`}>
                      <Edit3 className="h-3.5 w-3.5 text-[#6B7280]" />
                    </button>
                  </div>
                  <p className="text-xs text-[#374151] mb-2">{nc.constatation}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px] text-[#6B7280]">
                    {nc.cause_profonde && <div><strong>Cause:</strong> {nc.cause_profonde}</div>}
                    {nc.corrections && <div><strong>Corrections:</strong> {nc.corrections}</div>}
                    {nc.actions_correctives && <div><strong>Actions:</strong> {nc.actions_correctives}</div>}
                    {nc.responsable && <div><strong>Responsable:</strong> {nc.responsable}</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && <NCModal mode="create" initialData={{ clause: searchParams.get('clause') || '', norme: searchParams.get('norme') || 'ARS 1000-1', constatation: searchParams.get('constatation') || '' }} onSubmit={handleCreate} onClose={() => setShowCreate(false)} />}
      {editNC && <NCModal mode="edit" initialData={editNC} onSubmit={(data) => handleUpdate(editNC.nc_id, data)} onClose={() => setEditNC(null)} />}
    </div>
  );
};

const NCModal = ({ mode, initialData, onSubmit, onClose }) => {
  const [form, setForm] = useState({
    clause: initialData?.clause || '',
    norme: initialData?.norme || 'ARS 1000-1',
    constatation: initialData?.constatation || '',
    type_nc: initialData?.type_nc || 'Mineure',
    cause_profonde: initialData?.cause_profonde || '',
    corrections: initialData?.corrections || '',
    actions_correctives: initialData?.actions_correctives || '',
    responsable: initialData?.responsable || '',
    date_resolution_prevue: initialData?.date_resolution_prevue || '',
    statut: initialData?.statut || 'ouvert',
    date_resolution: initialData?.date_resolution || '',
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-testid="nc-modal">
      <div className="bg-white rounded-md w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-[#E5E5E0] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#1A3622]">{mode === 'create' ? 'Nouvelle non-conformite' : 'Modifier NC'}</h3>
          <button onClick={onClose} className="text-[#6B7280] hover:text-[#111827] text-xl">&times;</button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Fld label="Clause" value={form.clause} onChange={(v) => setForm({...form, clause: v})} testid="input-nc-clause" />
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">Type</label>
              <select value={form.type_nc} onChange={(e) => setForm({...form, type_nc: e.target.value})} className="w-full px-3 py-2 text-sm border border-[#E5E5E0] rounded-md" data-testid="select-nc-type">
                <option value="Majeure">Majeure</option>
                <option value="Mineure">Mineure</option>
              </select>
            </div>
          </div>
          <TxtArea label="Constatation" value={form.constatation} onChange={(v) => setForm({...form, constatation: v})} testid="input-nc-constatation" />
          <TxtArea label="Cause profonde" value={form.cause_profonde} onChange={(v) => setForm({...form, cause_profonde: v})} testid="input-nc-cause" />
          <TxtArea label="Corrections" value={form.corrections} onChange={(v) => setForm({...form, corrections: v})} testid="input-nc-corrections" />
          <TxtArea label="Actions correctives" value={form.actions_correctives} onChange={(v) => setForm({...form, actions_correctives: v})} testid="input-nc-actions" />
          <div className="grid grid-cols-2 gap-3">
            <Fld label="Responsable" value={form.responsable} onChange={(v) => setForm({...form, responsable: v})} testid="input-nc-responsable" />
            <Fld label="Date resolution prevue" value={form.date_resolution_prevue} type="date" onChange={(v) => setForm({...form, date_resolution_prevue: v})} testid="input-nc-date" />
          </div>
          {mode === 'edit' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">Statut</label>
                <select value={form.statut} onChange={(e) => setForm({...form, statut: e.target.value})} className="w-full px-3 py-2 text-sm border border-[#E5E5E0] rounded-md" data-testid="select-nc-statut">
                  <option value="ouvert">Ouvert</option>
                  <option value="en_cours">En cours</option>
                  <option value="resolu">Resolu</option>
                </select>
              </div>
              <Fld label="Date resolution" value={form.date_resolution} type="date" onChange={(v) => setForm({...form, date_resolution: v})} testid="input-nc-date-res" />
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm border border-[#E5E5E0] rounded-md hover:bg-[#F3F4F6]">Annuler</button>
            <button type="submit" className="flex-1 px-4 py-2 text-sm bg-[#1A3622] text-white rounded-md hover:bg-[#112417]" data-testid="btn-submit-nc">{mode === 'create' ? 'Creer' : 'Enregistrer'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Fld = ({ label, value, onChange, type = 'text', testid }) => (
  <div>
    <label className="block text-xs font-medium text-[#374151] mb-1">{label}</label>
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#E5E5E0] rounded-md focus:outline-none focus:border-[#1A3622]" data-testid={testid} />
  </div>
);

const TxtArea = ({ label, value, onChange, testid }) => (
  <div>
    <label className="block text-xs font-medium text-[#374151] mb-1">{label}</label>
    <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2} className="w-full px-3 py-2 text-xs border border-[#E5E5E0] rounded-md resize-none" data-testid={testid} />
  </div>
);

const MiniStat = ({ label, value, color = "text-[#111827]", bg = "bg-white" }) => (
  <div className={`${bg} border border-[#E5E5E0] rounded-md px-3 py-2`}>
    <p className="text-[9px] uppercase font-bold text-[#9CA3AF]">{label}</p>
    <p className={`text-sm font-bold ${color}`}>{value}</p>
  </div>
);

export default NonConformitesPage;

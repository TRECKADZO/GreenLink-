import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { tokenService } from '../../../services/tokenService';
import { toast } from 'sonner';
import {
  GraduationCap, Plus, Search, Loader2, Home, ChevronRight,
  CheckCircle2, Clock, XCircle, Users, Eye, FileText
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const STATUT_STYLES = {
  completee: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  planifiee: 'bg-amber-50 text-amber-700 border-amber-200',
  en_retard: 'bg-red-50 text-red-700 border-red-200',
};
const STATUT_LABELS = { completee: 'Completee', planifiee: 'Planifiee', en_retard: 'En retard' };

const SessionsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState({});
  const [themes, setThemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(searchParams.get('create') === '1');
  const [filterStatut, setFilterStatut] = useState('');
  const [filterTheme, setFilterTheme] = useState('');
  const [search, setSearch] = useState('');
  const [programmeId, setProgrammeId] = useState('');

  useEffect(() => { loadInit(); }, []);
  useEffect(() => { if (programmeId !== null) loadSessions(); }, [filterStatut, filterTheme, search]);

  const loadInit = async () => {
    try {
      const token = tokenService.getToken();
      const [thRes, progRes] = await Promise.all([
        fetch(`${API}/api/formation/themes`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/formation/programmes`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const thData = await thRes.json();
      const progData = await progRes.json();
      setThemes(thData.themes || []);
      if (progData.programmes?.length > 0) setProgrammeId(progData.programmes[0].programme_id);
      await loadSessions();
    } catch { setLoading(false); }
  };

  const loadSessions = async () => {
    setLoading(true);
    try {
      const token = tokenService.getToken();
      const params = new URLSearchParams();
      if (filterStatut) params.append('statut', filterStatut);
      if (filterTheme) params.append('theme_code', filterTheme);
      if (search) params.append('search', search);
      const res = await fetch(`${API}/api/formation/sessions?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setSessions(data.sessions || []);
      setStats(data.stats || {});
    } catch { toast.error('Erreur'); }
    finally { setLoading(false); }
  };

  const handleCreate = async (form) => {
    try {
      const token = tokenService.getToken();
      const res = await fetch(`${API}/api/formation/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, programme_id: programmeId }),
      });
      if (!res.ok) throw new Error('Erreur');
      toast.success('Session creee');
      setShowCreate(false);
      loadSessions();
    } catch { toast.error('Erreur creation'); }
  };

  const handleComplete = async (sessionId) => {
    try {
      const token = tokenService.getToken();
      await fetch(`${API}/api/formation/sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ statut: 'completee' }),
      });
      toast.success('Session marquee completee');
      loadSessions();
    } catch { toast.error('Erreur'); }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6]" data-testid="sessions-page">
      <div className="bg-[#1A3622] relative overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-6 relative">
          <div className="flex items-center gap-2 text-white/50 text-xs mb-3">
            <button onClick={() => navigate('/cooperative/dashboard')} className="hover:text-white"><Home className="h-3.5 w-3.5" /></button>
            <ChevronRight className="h-3 w-3" />
            <button onClick={() => navigate('/cooperative/formation')} className="hover:text-white">Formation</button>
            <ChevronRight className="h-3 w-3" />
            <span className="text-white/80">Sessions</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Sessions de Formation</h1>
              <p className="text-sm text-white/60 mt-1">{stats.total || 0} session(s) | {stats.total_participants || 0} participant(s)</p>
            </div>
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-white text-[#1A3622] rounded-md text-sm font-medium hover:bg-white/90" data-testid="btn-create-session">
              <Plus className="h-4 w-4" /> Nouvelle session
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-8">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6" data-testid="filters">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher..." className="w-full pl-9 pr-4 py-2 text-sm border border-[#E5E5E0] rounded-md bg-white focus:outline-none focus:border-[#1A3622]" data-testid="search-input" />
          </div>
          <select value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)} className="px-3 py-2 text-sm border border-[#E5E5E0] rounded-md bg-white" data-testid="filter-statut">
            <option value="">Tous statuts</option>
            <option value="planifiee">Planifiee</option>
            <option value="completee">Completee</option>
            <option value="en_retard">En retard</option>
          </select>
          <select value={filterTheme} onChange={(e) => setFilterTheme(e.target.value)} className="px-3 py-2 text-sm border border-[#E5E5E0] rounded-md bg-white" data-testid="filter-theme">
            <option value="">Tous themes</option>
            {themes.map(t => <option key={t.code} value={t.code}>{t.titre}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-[#1A3622]" /></div>
        ) : sessions.length === 0 ? (
          <div className="bg-white border border-[#E5E5E0] rounded-md p-12 text-center" data-testid="empty-state">
            <GraduationCap className="h-12 w-12 text-[#D4AF37] mx-auto mb-4" strokeWidth={1} />
            <h3 className="text-lg font-semibold text-[#1A3622] mb-2">Aucune session</h3>
            <p className="text-sm text-[#6B7280] mb-4">Creez votre premiere session de formation.</p>
            <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-[#1A3622] text-white rounded-md text-sm font-medium hover:bg-[#112417]">
              <Plus className="h-4 w-4" /> Creer une session
            </button>
          </div>
        ) : (
          <div className="space-y-3" data-testid="sessions-list">
            {sessions.map(s => (
              <div key={s.session_id} className={`border rounded-md overflow-hidden bg-white ${s.statut === 'en_retard' ? 'border-red-200' : 'border-[#E5E5E0]'}`} data-testid={`session-${s.session_id?.slice(0, 8)}`}>
                <div className="px-5 py-4 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-[#1A3622] truncate">{s.theme_titre}</h3>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${STATUT_STYLES[s.statut] || 'bg-gray-50 text-gray-600'}`}>{STATUT_LABELS[s.statut] || s.statut}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-[#6B7280]">
                      {s.clause_ref && <span>Clause {s.clause_ref}</span>}
                      {s.date_session && <span>Date: {s.date_session}</span>}
                      {s.lieu && <span>Lieu: {s.lieu}</span>}
                      {s.formateur && <span>Formateur: {s.formateur}</span>}
                      <span><Users className="h-3 w-3 inline" /> {(s.participants || []).length} participant(s)</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 ml-3">
                    {s.statut !== 'completee' && (
                      <button onClick={() => handleComplete(s.session_id)} className="p-1.5 rounded hover:bg-emerald-50 text-emerald-600" title="Marquer completee" data-testid={`btn-complete-${s.session_id?.slice(0, 8)}`}>
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                    )}
                    <button onClick={() => navigate(`/cooperative/formation/pv?session=${s.session_id}`)} className="p-1.5 rounded hover:bg-[#E8F0EA]" title="PV & Presence" data-testid={`btn-pv-${s.session_id?.slice(0, 8)}`}>
                      <FileText className="h-4 w-4 text-[#1A3622]" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && <CreateSessionModal themes={themes} onSubmit={handleCreate} onClose={() => setShowCreate(false)} />}
    </div>
  );
};

const CreateSessionModal = ({ themes, onSubmit, onClose }) => {
  const [form, setForm] = useState({
    theme_code: '', theme_titre: '', date_session: new Date().toISOString().slice(0, 10),
    lieu: '', formateur: '', public_cible: '', contenu: '', duree_heures: 2, clause_ref: '', notes: '',
  });

  const handleThemeChange = (code) => {
    const theme = themes.find(t => t.code === code);
    setForm({
      ...form,
      theme_code: code,
      theme_titre: theme?.titre || '',
      clause_ref: theme?.clause || '',
      public_cible: theme?.public_cible || '',
      contenu: theme?.description || '',
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-testid="create-session-modal">
      <div className="bg-white rounded-md w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-[#E5E5E0] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#1A3622]">Nouvelle session de formation</h3>
          <button onClick={onClose} className="text-[#6B7280] hover:text-[#111827] text-xl">&times;</button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1">Theme obligatoire ARS 1000</label>
            <select value={form.theme_code} onChange={(e) => handleThemeChange(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#E5E5E0] rounded-md" data-testid="select-theme">
              <option value="">-- Choisir un theme --</option>
              {themes.map(t => <option key={t.code} value={t.code}>{t.titre} (clause {t.clause})</option>)}
              <option value="CUSTOM">Autre theme (personnalise)</option>
            </select>
          </div>
          {form.theme_code === 'CUSTOM' && <Fld label="Titre du theme" value={form.theme_titre} onChange={(v) => setForm({...form, theme_titre: v})} testid="input-theme-titre" />}
          <div className="grid grid-cols-2 gap-3">
            <Fld label="Date" value={form.date_session} type="date" onChange={(v) => setForm({...form, date_session: v})} testid="input-date" />
            <Fld label="Duree (heures)" value={form.duree_heures} type="number" onChange={(v) => setForm({...form, duree_heures: parseFloat(v) || 0})} testid="input-duree" />
          </div>
          <Fld label="Lieu" value={form.lieu} onChange={(v) => setForm({...form, lieu: v})} testid="input-lieu" />
          <Fld label="Formateur" value={form.formateur} onChange={(v) => setForm({...form, formateur: v})} testid="input-formateur" />
          <Fld label="Public cible" value={form.public_cible} onChange={(v) => setForm({...form, public_cible: v})} testid="input-public" />
          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1">Contenu</label>
            <textarea value={form.contenu} onChange={(e) => setForm({...form, contenu: e.target.value})} rows={3} className="w-full px-3 py-2 text-xs border border-[#E5E5E0] rounded-md resize-none" data-testid="input-contenu" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm border border-[#E5E5E0] rounded-md hover:bg-[#F3F4F6]">Annuler</button>
            <button type="submit" className="flex-1 px-4 py-2 text-sm bg-[#1A3622] text-white rounded-md hover:bg-[#112417]" data-testid="btn-submit-session">Creer</button>
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

export default SessionsPage;

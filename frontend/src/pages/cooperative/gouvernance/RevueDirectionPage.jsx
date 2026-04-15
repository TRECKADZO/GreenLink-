import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tokenService } from '../../../services/tokenService';
import { toast } from 'sonner';
import {
  ClipboardCheck, Loader2, Home, ChevronRight, Plus,
  Download, CheckCircle2, Clock
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const RevueDirectionPage = () => {
  const navigate = useNavigate();
  const [revues, setRevues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [moduleData, setModuleData] = useState({});

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      const token = tokenService.getToken();
      const [revRes, dashRes] = await Promise.all([
        fetch(`${API}/api/gouvernance/revue-direction`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/gouvernance/dashboard`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setRevues((await revRes.json()).revues || []);
      const dashData = await dashRes.json();
      setModuleData(dashData.module_data || {});
    } catch { toast.error('Erreur'); }
    finally { setLoading(false); }
  };

  const handleCreate = async (form) => {
    try {
      const token = tokenService.getToken();
      const res = await fetch(`${API}/api/gouvernance/revue-direction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Erreur');
      toast.success('Revue de direction creee');
      setShowCreate(false);
      loadAll();
    } catch { toast.error('Erreur'); }
  };

  const handleValider = async (revueId) => {
    try {
      const token = tokenService.getToken();
      await fetch(`${API}/api/gouvernance/revue-direction/${revueId}/valider`, {
        method: 'PUT', headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Revue validee');
      loadAll();
    } catch { toast.error('Erreur'); }
  };

  const handleExportPDF = async (revueId) => {
    try {
      const token = tokenService.getToken();
      const res = await fetch(`${API}/api/gouvernance/revue-direction/${revueId}/pdf`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Erreur');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `revue_direction.pdf`; a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF telecharge');
    } catch { toast.error('Erreur'); }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6]" data-testid="revue-direction-page">
      <div className="bg-[#1A3622] relative overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-6 relative">
          <div className="flex items-center gap-2 text-white/50 text-xs mb-3">
            <button onClick={() => navigate('/cooperative/dashboard')} className="hover:text-white"><Home className="h-3.5 w-3.5" /></button>
            <ChevronRight className="h-3 w-3" />
            <button onClick={() => navigate('/cooperative/gouvernance')} className="hover:text-white">Gouvernance</button>
            <ChevronRight className="h-3 w-3" />
            <span className="text-white/80">Revue de Direction</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/cooperative/gouvernance')} className="w-8 h-8 rounded-md bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors" data-testid="btn-retour"><ChevronRight className="h-4 w-4 text-white rotate-180" /></button>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">Revue de Direction</h1>
                <p className="text-sm text-white/60 mt-1">Clause 9.3 (Majeure) - Entrees & Sorties conformes ARS 1000</p>
              </div>
            </div>
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-white text-[#1A3622] rounded-md text-sm font-medium hover:bg-white/90" data-testid="btn-create-revue">
              <Plus className="h-4 w-4" /> Nouvelle revue
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-8">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-[#1A3622]" /></div>
        ) : revues.length === 0 ? (
          <div className="bg-white border border-[#E5E5E0] rounded-md p-12 text-center" data-testid="empty-revue">
            <ClipboardCheck className="h-12 w-12 text-[#D4AF37] mx-auto mb-4" strokeWidth={1} />
            <h3 className="text-lg font-semibold text-[#1A3622] mb-2">Aucune revue de direction</h3>
            <p className="text-sm text-[#6B7280] mb-4">La revue de direction annuelle est une exigence Majeure (clause 9.3).</p>
            <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-[#1A3622] text-white rounded-md text-sm font-medium hover:bg-[#112417]">
              <Plus className="h-4 w-4" /> Creer la premiere revue
            </button>
          </div>
        ) : (
          <div className="space-y-4" data-testid="revues-list">
            {revues.map(r => (
              <div key={r.revue_id} className="bg-white border border-[#E5E5E0] rounded-md overflow-hidden" data-testid={`revue-${r.revue_id?.slice(0, 8)}`}>
                <div className="px-5 py-4 border-b border-[#E5E5E0] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-[#1A3622]">{r.titre}</h3>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${r.statut === 'validee' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {r.statut === 'validee' ? 'Validee' : 'Brouillon'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {r.statut !== 'validee' && (
                      <button onClick={() => handleValider(r.revue_id)} className="flex items-center gap-1 px-2 py-1 bg-emerald-600 text-white rounded text-[10px] font-medium hover:bg-emerald-700" data-testid={`btn-valider-${r.revue_id?.slice(0, 8)}`}>
                        <CheckCircle2 className="h-3 w-3" /> Valider
                      </button>
                    )}
                    <button onClick={() => handleExportPDF(r.revue_id)} className="flex items-center gap-1 px-2 py-1 bg-[#1A3622] text-white rounded text-[10px] font-medium hover:bg-[#112417]" data-testid={`btn-pdf-${r.revue_id?.slice(0, 8)}`}>
                      <Download className="h-3 w-3" /> PDF
                    </button>
                  </div>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[10px] text-[#6B7280] mb-4">
                    <div><strong>Date:</strong> {r.date_revue}</div>
                    <div><strong>Par:</strong> {r.created_by}</div>
                    <div><strong>Participants:</strong> {r.participants}</div>
                    {r.sorties?.prochaine_revue && <div><strong>Prochaine:</strong> {r.sorties.prochaine_revue}</div>}
                  </div>

                  {/* Entrees */}
                  <Section title="Elements d'entree" data={r.entrees} />
                  {/* Donnees modules */}
                  <Section title="Donnees des modules" data={r.donnees_modules} />
                  {/* Sorties */}
                  <Section title="Elements de sortie" data={r.sorties} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && <CreateRevueModal moduleData={moduleData} onSubmit={handleCreate} onClose={() => setShowCreate(false)} />}
    </div>
  );
};

const Section = ({ title, data }) => {
  if (!data) return null;
  const entries = Object.entries(data).filter(([, v]) => v);
  if (entries.length === 0) return null;

  return (
    <div className="mb-3">
      <p className="text-[10px] tracking-[0.05em] uppercase font-bold text-[#9CA3AF] mb-1">{title}</p>
      <div className="bg-[#F9FAFB] rounded p-3 space-y-1">
        {entries.map(([k, v]) => (
          <div key={k} className="text-[10px]">
            <span className="font-semibold text-[#374151]">{k.replace(/_/g, ' ')}:</span>{' '}
            <span className="text-[#6B7280]">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const CreateRevueModal = ({ moduleData, onSubmit, onClose }) => {
  const [form, setForm] = useState({
    titre: 'Revue de direction annuelle', date_revue: new Date().toISOString().slice(0, 10), participants: '',
    actions_precedentes: '', resultats_audit: '', retour_parties_prenantes: '', performance_processus: '',
    non_conformites: '', resultats_surveillance: '', changements_contexte: '', opportunites_amelioration: '',
    donnees_pdc: '', donnees_tracabilite: '', donnees_formation: '', donnees_audit: '',
    decisions: '', actions_correctives: '', besoins_ressources: '', objectifs_prochaine_periode: '',
    plan_actions: '', prochaine_revue: '',
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-testid="create-revue-modal">
      <div className="bg-white rounded-md w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-[#E5E5E0] flex items-center justify-between sticky top-0 bg-white z-10">
          <h3 className="text-sm font-semibold text-[#1A3622]">Nouvelle revue de direction (clause 9.3)</h3>
          <button onClick={onClose} className="text-[#6B7280] hover:text-[#111827] text-xl">&times;</button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="p-5 space-y-5">
          {/* General */}
          <div className="grid grid-cols-2 gap-3">
            <Fld label="Titre" value={form.titre} onChange={(v) => setForm({...form, titre: v})} testid="input-titre" />
            <Fld label="Date" type="date" value={form.date_revue} onChange={(v) => setForm({...form, date_revue: v})} testid="input-date" />
          </div>
          <Fld label="Participants" value={form.participants} onChange={(v) => setForm({...form, participants: v})} testid="input-participants" />

          {/* Entrees */}
          <div>
            <p className="text-[10px] tracking-[0.05em] uppercase font-bold text-[#D4AF37] mb-2">Elements d'entree (9.3)</p>
            <div className="space-y-2">
              <TArea label="Actions des revues precedentes" value={form.actions_precedentes} onChange={(v) => setForm({...form, actions_precedentes: v})} testid="input-actions-prec" />
              <TArea label="Resultats d'audit" value={form.resultats_audit} onChange={(v) => setForm({...form, resultats_audit: v})} testid="input-resultats-audit" placeholder={moduleData.audit_summary || ''} />
              <TArea label="Non-conformites" value={form.non_conformites} onChange={(v) => setForm({...form, non_conformites: v})} testid="input-nc" placeholder={moduleData.nc_summary || ''} />
              <TArea label="Retour parties prenantes" value={form.retour_parties_prenantes} onChange={(v) => setForm({...form, retour_parties_prenantes: v})} testid="input-retour" />
              <TArea label="Opportunites d'amelioration" value={form.opportunites_amelioration} onChange={(v) => setForm({...form, opportunites_amelioration: v})} testid="input-opportunites" />
            </div>
          </div>

          {/* Donnees modules - auto-filled */}
          <div>
            <p className="text-[10px] tracking-[0.05em] uppercase font-bold text-[#065F46] mb-2">Donnees des modules (pre-remplies)</p>
            <div className="bg-[#F9FAFB] rounded p-3 space-y-1 text-[10px] text-[#374151] mb-2">
              {moduleData.pdc_summary && <p>PDC: {moduleData.pdc_summary}</p>}
              {moduleData.trace_summary && <p>Tracabilite: {moduleData.trace_summary}</p>}
              {moduleData.formation_summary && <p>Formation: {moduleData.formation_summary}</p>}
              {moduleData.audit_detail && <p>Audit: {moduleData.audit_detail}</p>}
            </div>
          </div>

          {/* Sorties */}
          <div>
            <p className="text-[10px] tracking-[0.05em] uppercase font-bold text-[#1A3622] mb-2">Elements de sortie (9.3)</p>
            <div className="space-y-2">
              <TArea label="Decisions" value={form.decisions} onChange={(v) => setForm({...form, decisions: v})} testid="input-decisions" />
              <TArea label="Actions correctives" value={form.actions_correctives} onChange={(v) => setForm({...form, actions_correctives: v})} testid="input-actions-corr" />
              <TArea label="Besoins en ressources" value={form.besoins_ressources} onChange={(v) => setForm({...form, besoins_ressources: v})} testid="input-ressources" />
              <TArea label="Objectifs prochaine periode" value={form.objectifs_prochaine_periode} onChange={(v) => setForm({...form, objectifs_prochaine_periode: v})} testid="input-objectifs" />
              <TArea label="Plan d'actions" value={form.plan_actions} onChange={(v) => setForm({...form, plan_actions: v})} testid="input-plan" />
              <Fld label="Date prochaine revue" type="date" value={form.prochaine_revue} onChange={(v) => setForm({...form, prochaine_revue: v})} testid="input-prochaine" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm border border-[#E5E5E0] rounded-md hover:bg-[#F3F4F6]">Annuler</button>
            <button type="submit" className="flex-1 px-4 py-2 text-sm bg-[#1A3622] text-white rounded-md hover:bg-[#112417]" data-testid="btn-submit-revue">Creer la revue</button>
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

const TArea = ({ label, value, onChange, testid, placeholder }) => (
  <div>
    <label className="block text-xs font-medium text-[#374151] mb-1">{label}</label>
    <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2} placeholder={placeholder} className="w-full px-3 py-2 text-xs border border-[#E5E5E0] rounded-md resize-none" data-testid={testid} />
  </div>
);

export default RevueDirectionPage;

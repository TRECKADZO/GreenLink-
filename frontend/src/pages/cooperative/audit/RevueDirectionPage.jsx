import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tokenService } from '../../../services/tokenService';
import { toast } from 'sonner';
import {
  FileText, Loader2, Home, ChevronRight, Plus, Calendar, Users
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const RevueDirectionPage = () => {
  const navigate = useNavigate();
  const [revues, setRevues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [sessionId, setSessionId] = useState('');

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      const token = tokenService.getToken();
      const [sessRes, revRes] = await Promise.all([
        fetch(`${API}/api/audit/sessions`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/audit/revue-direction`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const sessData = await sessRes.json();
      const revData = await revRes.json();
      if (sessData.sessions?.length > 0) setSessionId(sessData.sessions[0].session_id);
      setRevues(revData.revues || []);
    } catch {
      toast.error('Erreur chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (form) => {
    try {
      const token = tokenService.getToken();
      const res = await fetch(`${API}/api/audit/revue-direction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, audit_session_id: sessionId }),
      });
      if (!res.ok) throw new Error('Erreur');
      toast.success('Revue de direction creee');
      setShowCreate(false);
      loadAll();
    } catch { toast.error('Erreur creation'); }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6]" data-testid="revue-page">
      <div className="bg-[#1A3622] relative overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-6 relative">
          <div className="flex items-center gap-2 text-white/50 text-xs mb-3">
            <button onClick={() => navigate('/cooperative/dashboard')} className="hover:text-white"><Home className="h-3.5 w-3.5" /></button>
            <ChevronRight className="h-3 w-3" />
            <button onClick={() => navigate('/cooperative/audit')} className="hover:text-white">Audit</button>
            <ChevronRight className="h-3 w-3" />
            <span className="text-white/80">Revue de direction</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/cooperative/audit')} className="w-8 h-8 rounded-md bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors" data-testid="btn-retour"><ChevronRight className="h-4 w-4 text-white rotate-180" /></button>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">Revue de Direction</h1>
                <p className="text-sm text-white/60 mt-1">Clause 9.3 - PV de revue annuelle</p>
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
            <FileText className="h-12 w-12 text-[#D4AF37] mx-auto mb-4" strokeWidth={1} />
            <h3 className="text-lg font-semibold text-[#1A3622] mb-2">Aucune revue de direction</h3>
            <p className="text-sm text-[#6B7280] mb-4">La revue de direction est exigee par la clause 9.3 de l'ARS 1000.</p>
            <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-[#1A3622] text-white rounded-md text-sm font-medium hover:bg-[#112417]">
              <Plus className="h-4 w-4" /> Creer la premiere revue
            </button>
          </div>
        ) : (
          <div className="space-y-4" data-testid="revue-list">
            {revues.map(r => (
              <div key={r.revue_id} className="bg-white border border-[#E5E5E0] rounded-md overflow-hidden" data-testid={`revue-${r.revue_id?.slice(0, 8)}`}>
                <div className="px-5 py-4 border-b border-[#E5E5E0] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-[#1A3622]" />
                    <div>
                      <p className="text-sm font-semibold text-[#1A3622]">Revue du {r.date_revue || 'N/A'}</p>
                      <p className="text-[10px] text-[#6B7280]">Par {r.created_by || 'N/A'}</p>
                    </div>
                  </div>
                </div>
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Block label="Participants" text={r.participants} icon={Users} />
                  <Block label="Points examines" text={r.points_examines} />
                  <Block label="Decisions" text={r.decisions} />
                  <Block label="Actions" text={r.actions} />
                  {r.prochaine_revue && <Block label="Prochaine revue" text={r.prochaine_revue} />}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && <RevueModal onSubmit={handleCreate} onClose={() => setShowCreate(false)} />}
    </div>
  );
};

const Block = ({ label, text, icon: Icon }) => (
  <div>
    <div className="flex items-center gap-1 mb-1">
      {Icon && <Icon className="h-3 w-3 text-[#6B7280]" />}
      <p className="text-[10px] font-bold uppercase text-[#9CA3AF]">{label}</p>
    </div>
    <p className="text-xs text-[#374151] whitespace-pre-line">{text || '-'}</p>
  </div>
);

const RevueModal = ({ onSubmit, onClose }) => {
  const [form, setForm] = useState({
    date_revue: new Date().toISOString().slice(0, 10),
    participants: '', points_examines: '', decisions: '', actions: '', prochaine_revue: '',
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-testid="revue-modal">
      <div className="bg-white rounded-md w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-[#E5E5E0] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#1A3622]">Nouvelle revue de direction</h3>
          <button onClick={onClose} className="text-[#6B7280] hover:text-[#111827] text-xl">&times;</button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="p-5 space-y-3">
          <Fld label="Date de revue" value={form.date_revue} type="date" onChange={(v) => setForm({...form, date_revue: v})} testid="input-date-revue" />
          <TArea label="Participants" value={form.participants} onChange={(v) => setForm({...form, participants: v})} testid="input-participants" placeholder="Noms et fonctions des participants..." />
          <TArea label="Points examines" value={form.points_examines} onChange={(v) => setForm({...form, points_examines: v})} testid="input-points" placeholder="Resultats d'audit, NC, indicateurs..." />
          <TArea label="Decisions" value={form.decisions} onChange={(v) => setForm({...form, decisions: v})} testid="input-decisions" placeholder="Decisions prises par la direction..." />
          <TArea label="Actions" value={form.actions} onChange={(v) => setForm({...form, actions: v})} testid="input-actions" placeholder="Actions a mener, responsables, delais..." />
          <Fld label="Prochaine revue" value={form.prochaine_revue} type="date" onChange={(v) => setForm({...form, prochaine_revue: v})} testid="input-prochaine" />
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm border border-[#E5E5E0] rounded-md hover:bg-[#F3F4F6]">Annuler</button>
            <button type="submit" className="flex-1 px-4 py-2 text-sm bg-[#1A3622] text-white rounded-md hover:bg-[#112417]" data-testid="btn-submit-revue">Enregistrer</button>
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
    <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} placeholder={placeholder} className="w-full px-3 py-2 text-xs border border-[#E5E5E0] rounded-md resize-none" data-testid={testid} />
  </div>
);

export default RevueDirectionPage;

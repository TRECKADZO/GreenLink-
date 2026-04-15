import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tokenService } from '../../../services/tokenService';
import { toast } from 'sonner';
import {
  Users, Loader2, Home, ChevronRight, CheckCircle2, XCircle,
  Edit3, Download, Save
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const OrganigrammePage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editPoste, setEditPoste] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const token = tokenService.getToken();
      const res = await fetch(`${API}/api/gouvernance/organigramme`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Erreur');
      setData(await res.json());
    } catch { toast.error('Erreur chargement'); }
    finally { setLoading(false); }
  };

  const handleSave = async (code, form) => {
    try {
      const token = tokenService.getToken();
      const res = await fetch(`${API}/api/gouvernance/organigramme/${code}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code_poste: code, ...form }),
      });
      if (!res.ok) throw new Error('Erreur');
      toast.success('Poste mis a jour');
      setEditPoste(null);
      load();
    } catch { toast.error('Erreur sauvegarde'); }
  };

  const handleExportPDF = async () => {
    try {
      const token = tokenService.getToken();
      const res = await fetch(`${API}/api/gouvernance/organigramme/pdf`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Erreur');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'organigramme_smcd.pdf';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF telecharge');
    } catch { toast.error('Erreur export'); }
  };

  if (loading) return <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#1A3622]" /></div>;

  const organigramme = data?.organigramme || [];
  const stats = data?.stats || {};
  const direction = organigramme.filter(p => p.niveau === 'Direction');
  const operationnel = organigramme.filter(p => p.niveau === 'Operationnel');

  return (
    <div className="min-h-screen bg-[#FAF9F6]" data-testid="organigramme-page">
      <div className="bg-[#1A3622] relative overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-6 relative">
          <div className="flex items-center gap-2 text-white/50 text-xs mb-3">
            <button onClick={() => navigate('/cooperative/dashboard')} className="hover:text-white"><Home className="h-3.5 w-3.5" /></button>
            <ChevronRight className="h-3 w-3" />
            <button onClick={() => navigate('/cooperative/gouvernance')} className="hover:text-white">Gouvernance</button>
            <ChevronRight className="h-3 w-3" />
            <span className="text-white/80">Organigramme</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/cooperative/gouvernance')} className="w-8 h-8 rounded-md bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors" data-testid="btn-retour"><ChevronRight className="h-4 w-4 text-white rotate-180" /></button>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">Organigramme & Roles</h1>
                <p className="text-sm text-white/60 mt-1">Clause 5.3 | {stats.pourvus || 0}/{stats.total || 7} postes pourvus</p>
              </div>
            </div>
            <button onClick={handleExportPDF} className="flex items-center gap-2 px-4 py-2 bg-white text-[#1A3622] rounded-md text-sm font-medium hover:bg-white/90" data-testid="btn-export-pdf">
              <Download className="h-4 w-4" /> Export PDF
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-8">
        {/* Progress */}
        <div className="bg-white border border-[#E5E5E0] rounded-md p-5 mb-6" data-testid="progress">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#1A3622]">Postes pourvus</span>
            <span className="text-sm font-bold text-[#1A3622]">{stats.pourvus}/{stats.total}</span>
          </div>
          <div className="w-full bg-[#F3F4F6] rounded-full h-3 overflow-hidden">
            <div className="h-full rounded-full bg-[#065F46] transition-all duration-700" style={{ width: `${stats.total > 0 ? (stats.pourvus / stats.total) * 100 : 0}%` }} />
          </div>
        </div>

        {/* Direction Level */}
        <div className="mb-6">
          <p className="text-[10px] tracking-[0.1em] uppercase font-bold text-[#9CA3AF] mb-3 px-1">Direction</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {direction.map(p => <PosteCard key={p.code} poste={p} onEdit={() => setEditPoste(p)} />)}
          </div>
        </div>

        {/* Operationnel Level */}
        <div>
          <p className="text-[10px] tracking-[0.1em] uppercase font-bold text-[#9CA3AF] mb-3 px-1">Operationnel</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {operationnel.map(p => <PosteCard key={p.code} poste={p} onEdit={() => setEditPoste(p)} />)}
          </div>
        </div>
      </div>

      {editPoste && <EditPosteModal poste={editPoste} onSave={handleSave} onClose={() => setEditPoste(null)} />}
    </div>
  );
};

const PosteCard = ({ poste, onEdit }) => (
  <div className={`border rounded-md overflow-hidden ${poste.pourvu ? 'border-emerald-200 bg-emerald-50/20' : 'border-red-200 bg-red-50/20'}`} data-testid={`poste-${poste.code}`}>
    <div className="p-5">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {poste.pourvu ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-red-400" />}
            <h3 className="text-xs font-semibold text-[#1A3622]">{poste.titre}</h3>
          </div>
          <p className="text-[10px] text-[#6B7280]">Clause {poste.clause}</p>
        </div>
        <button onClick={onEdit} className="p-1 rounded hover:bg-white/50" data-testid={`btn-edit-${poste.code}`}>
          <Edit3 className="h-3.5 w-3.5 text-[#6B7280]" />
        </button>
      </div>
      <p className="text-[10px] text-[#6B7280] mb-3 line-clamp-2">{poste.description}</p>
      {poste.pourvu ? (
        <div className="bg-white rounded px-3 py-2 border border-[#E5E5E0]">
          <p className="text-xs font-medium text-[#111827]">{poste.titulaire_nom}</p>
          {poste.titulaire_telephone && <p className="text-[10px] text-[#6B7280]">{poste.titulaire_telephone}</p>}
          {poste.date_prise_poste && <p className="text-[10px] text-[#6B7280]">Depuis: {poste.date_prise_poste}</p>}
        </div>
      ) : (
        <div className="bg-red-50 rounded px-3 py-2 border border-red-200">
          <p className="text-[10px] font-bold text-red-700">POSTE VACANT</p>
        </div>
      )}
    </div>
  </div>
);

const EditPosteModal = ({ poste, onSave, onClose }) => {
  const [form, setForm] = useState({
    titulaire_nom: poste.titulaire_nom || '',
    titulaire_email: poste.titulaire_email || '',
    titulaire_telephone: poste.titulaire_telephone || '',
    date_prise_poste: poste.date_prise_poste || '',
    notes: poste.notes || '',
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-testid="edit-poste-modal">
      <div className="bg-white rounded-md w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-[#E5E5E0]">
          <h3 className="text-sm font-semibold text-[#1A3622]">{poste.titre}</h3>
          <p className="text-[10px] text-[#6B7280]">Clause {poste.clause}</p>
        </div>
        <div className="p-5 space-y-3">
          <div className="bg-[#F9FAFB] rounded p-3 mb-2">
            <p className="text-[10px] font-bold uppercase text-[#9CA3AF] mb-1">Responsabilites</p>
            <ul className="text-[10px] text-[#374151] space-y-0.5">
              {poste.responsabilites?.map((r, i) => <li key={i}>- {r}</li>)}
            </ul>
          </div>
          <Fld label="Nom du titulaire" value={form.titulaire_nom} onChange={(v) => setForm({...form, titulaire_nom: v})} testid="input-nom" />
          <div className="grid grid-cols-2 gap-3">
            <Fld label="Email" value={form.titulaire_email} onChange={(v) => setForm({...form, titulaire_email: v})} testid="input-email" />
            <Fld label="Telephone" value={form.titulaire_telephone} onChange={(v) => setForm({...form, titulaire_telephone: v})} testid="input-tel" />
          </div>
          <Fld label="Date prise de poste" type="date" value={form.date_prise_poste} onChange={(v) => setForm({...form, date_prise_poste: v})} testid="input-date" />
          <Fld label="Notes" value={form.notes} onChange={(v) => setForm({...form, notes: v})} testid="input-notes" />
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm border border-[#E5E5E0] rounded-md hover:bg-[#F3F4F6]">Annuler</button>
            <button onClick={() => onSave(poste.code, form)} className="flex-1 px-4 py-2 text-sm bg-[#1A3622] text-white rounded-md hover:bg-[#112417] flex items-center justify-center gap-2" data-testid="btn-save-poste">
              <Save className="h-3.5 w-3.5" /> Enregistrer
            </button>
          </div>
        </div>
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

export default OrganigrammePage;

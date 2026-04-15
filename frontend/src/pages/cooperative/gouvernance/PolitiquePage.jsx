import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tokenService } from '../../../services/tokenService';
import { toast } from 'sonner';
import {
  FileText, Loader2, Home, ChevronRight, Plus, Edit3,
  CheckCircle2, Send, Clock
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const PolitiquePage = () => {
  const navigate = useNavigate();
  const [politiques, setPolitiques] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editPol, setEditPol] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const token = tokenService.getToken();
      const res = await fetch(`${API}/api/gouvernance/politique`, { headers: { Authorization: `Bearer ${token}` } });
      setPolitiques((await res.json()).politiques || []);
    } catch { toast.error('Erreur'); }
    finally { setLoading(false); }
  };

  const handleCreate = async (form) => {
    try {
      const token = tokenService.getToken();
      const res = await fetch(`${API}/api/gouvernance/politique`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Erreur');
      toast.success('Politique creee');
      setShowCreate(false);
      load();
    } catch { toast.error('Erreur'); }
  };

  const handleUpdate = async (id, updateData) => {
    try {
      const token = tokenService.getToken();
      await fetch(`${API}/api/gouvernance/politique/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(updateData),
      });
      toast.success('Politique mise a jour');
      setEditPol(null);
      load();
    } catch { toast.error('Erreur'); }
  };

  const handleDiffuser = async (id) => {
    try {
      const token = tokenService.getToken();
      await fetch(`${API}/api/gouvernance/politique/${id}/diffuser`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Politique diffusee aux membres');
      load();
    } catch { toast.error('Erreur'); }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6]" data-testid="politique-page">
      <div className="bg-[#1A3622] relative overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-6 relative">
          <div className="flex items-center gap-2 text-white/50 text-xs mb-3">
            <button onClick={() => navigate('/cooperative/dashboard')} className="hover:text-white"><Home className="h-3.5 w-3.5" /></button>
            <ChevronRight className="h-3 w-3" />
            <button onClick={() => navigate('/cooperative/gouvernance')} className="hover:text-white">Gouvernance</button>
            <ChevronRight className="h-3 w-3" />
            <span className="text-white/80">Politique de Management</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Politique de Management</h1>
              <p className="text-sm text-white/60 mt-1">Clauses 5.1 & 5.2 - Leadership & Politique</p>
            </div>
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-white text-[#1A3622] rounded-md text-sm font-medium hover:bg-white/90" data-testid="btn-create-politique">
              <Plus className="h-4 w-4" /> Nouvelle politique
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-8">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-[#1A3622]" /></div>
        ) : politiques.length === 0 ? (
          <div className="bg-white border border-[#E5E5E0] rounded-md p-12 text-center" data-testid="empty-state">
            <FileText className="h-12 w-12 text-[#D4AF37] mx-auto mb-4" strokeWidth={1} />
            <h3 className="text-lg font-semibold text-[#1A3622] mb-2">Aucune politique definie</h3>
            <p className="text-sm text-[#6B7280] mb-4">La politique de management est exigee par les clauses 5.1 et 5.2.</p>
            <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-[#1A3622] text-white rounded-md text-sm font-medium hover:bg-[#112417]">
              <Plus className="h-4 w-4" /> Creer la politique
            </button>
          </div>
        ) : (
          <div className="space-y-4" data-testid="politiques-list">
            {politiques.map(pol => (
              <div key={pol.politique_id} className="bg-white border border-[#E5E5E0] rounded-md overflow-hidden" data-testid={`pol-${pol.politique_id?.slice(0, 8)}`}>
                <div className="px-5 py-4 border-b border-[#E5E5E0] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-[#1A3622]">{pol.titre}</h3>
                    <StatusBadge status={pol.statut} diffusee={pol.diffusee} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setEditPol(pol)} className="p-1.5 rounded hover:bg-[#F3F4F6]" data-testid={`btn-edit-${pol.politique_id?.slice(0, 8)}`}>
                      <Edit3 className="h-3.5 w-3.5 text-[#6B7280]" />
                    </button>
                    {!pol.diffusee && pol.statut === 'validee' && (
                      <button onClick={() => handleDiffuser(pol.politique_id)} className="flex items-center gap-1 px-2 py-1 bg-[#1A3622] text-white rounded text-[10px] font-medium hover:bg-[#112417]" data-testid={`btn-diffuser-${pol.politique_id?.slice(0, 8)}`}>
                        <Send className="h-3 w-3" /> Diffuser
                      </button>
                    )}
                  </div>
                </div>
                <div className="p-5">
                  <div className="prose prose-xs max-w-none text-xs text-[#374151] whitespace-pre-line mb-3">
                    {pol.contenu || 'Contenu non defini.'}
                  </div>
                  <div className="flex flex-wrap gap-4 text-[10px] text-[#6B7280]">
                    {pol.date_validation && <span>Validee le: {pol.date_validation}</span>}
                    {pol.validee_par && <span>Par: {pol.validee_par}</span>}
                    {pol.pv_ag_reference && <span>PV AG: {pol.pv_ag_reference}</span>}
                    {pol.diffusee && <span className="text-emerald-600 font-bold">Diffusee ({pol.accuses_reception} accuses)</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && <PolitiqueModal mode="create" onSubmit={handleCreate} onClose={() => setShowCreate(false)} />}
      {editPol && <PolitiqueModal mode="edit" initialData={editPol} onSubmit={(data) => handleUpdate(editPol.politique_id, data)} onClose={() => setEditPol(null)} />}
    </div>
  );
};

const StatusBadge = ({ status, diffusee }) => {
  if (diffusee) return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">Diffusee</span>;
  if (status === 'validee') return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">Validee</span>;
  return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Brouillon</span>;
};

const PolitiqueModal = ({ mode, initialData, onSubmit, onClose }) => {
  const [form, setForm] = useState({
    titre: initialData?.titre || 'Politique de Management du Cacao Durable',
    contenu: initialData?.contenu || '',
    statut: initialData?.statut || 'brouillon',
    date_validation: initialData?.date_validation || '',
    validee_par: initialData?.validee_par || '',
    pv_ag_reference: initialData?.pv_ag_reference || '',
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-testid="politique-modal">
      <div className="bg-white rounded-md w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-[#E5E5E0] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#1A3622]">{mode === 'create' ? 'Nouvelle politique' : 'Modifier la politique'}</h3>
          <button onClick={onClose} className="text-[#6B7280] hover:text-[#111827] text-xl">&times;</button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="p-5 space-y-4">
          <Fld label="Titre" value={form.titre} onChange={(v) => setForm({...form, titre: v})} testid="input-titre" />
          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1">Contenu de la politique</label>
            <textarea value={form.contenu} onChange={(e) => setForm({...form, contenu: e.target.value})} rows={8} className="w-full px-3 py-2 text-xs border border-[#E5E5E0] rounded-md resize-none" data-testid="input-contenu"
              placeholder="La cooperative s'engage a produire un cacao durable conforme a l'ARS 1000..." />
          </div>
          {mode === 'edit' && (
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">Statut</label>
              <select value={form.statut} onChange={(e) => setForm({...form, statut: e.target.value})} className="w-full px-3 py-2 text-sm border border-[#E5E5E0] rounded-md" data-testid="select-statut">
                <option value="brouillon">Brouillon</option>
                <option value="validee">Validee</option>
              </select>
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            <Fld label="Date validation" type="date" value={form.date_validation} onChange={(v) => setForm({...form, date_validation: v})} testid="input-date" />
            <Fld label="Validee par" value={form.validee_par} onChange={(v) => setForm({...form, validee_par: v})} testid="input-validee-par" />
            <Fld label="Ref PV AG" value={form.pv_ag_reference} onChange={(v) => setForm({...form, pv_ag_reference: v})} testid="input-pv-ag" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm border border-[#E5E5E0] rounded-md hover:bg-[#F3F4F6]">Annuler</button>
            <button type="submit" className="flex-1 px-4 py-2 text-sm bg-[#1A3622] text-white rounded-md hover:bg-[#112417]" data-testid="btn-submit-politique">Enregistrer</button>
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

export default PolitiquePage;

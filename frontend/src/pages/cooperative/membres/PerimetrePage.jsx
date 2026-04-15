import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tokenService } from '../../../services/tokenService';
import { toast } from 'sonner';
import {
  Shield, Loader2, Home, ChevronRight, Plus, CheckCircle2, MapPin
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const PerimetrePage = () => {
  const navigate = useNavigate();
  const [perimetres, setPerimetres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const token = tokenService.getToken();
      const res = await fetch(`${API}/api/membres/perimetre`, { headers: { Authorization: `Bearer ${token}` } });
      setPerimetres((await res.json()).perimetres || []);
    } catch { toast.error('Erreur'); }
    finally { setLoading(false); }
  };

  const handleCreate = async (form) => {
    try {
      const token = tokenService.getToken();
      const res = await fetch(`${API}/api/membres/perimetre`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Erreur');
      toast.success('Perimetre enregistre');
      setShowCreate(false);
      load();
    } catch { toast.error('Erreur'); }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6]" data-testid="perimetre-page">
      <div className="bg-[#1A3622]">
        <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-6">
          <div className="flex items-center gap-2 text-white/50 text-xs mb-3">
            <button onClick={() => navigate('/cooperative/dashboard')} className="hover:text-white"><Home className="h-3.5 w-3.5" /></button>
            <ChevronRight className="h-3 w-3" />
            <button onClick={() => navigate('/cooperative/membres')} className="hover:text-white">Membres</button>
            <ChevronRight className="h-3 w-3" />
            <span className="text-white/80">Perimetre SM</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/cooperative/membres')} className="w-8 h-8 rounded-md bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors" data-testid="btn-retour"><ChevronRight className="h-4 w-4 text-white rotate-180" /></button>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">Perimetre d'Application du SM</h1>
                <p className="text-sm text-white/60 mt-1">Clause 4.3 - Limites et applicabilite du systeme de management</p>
              </div>
            </div>
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-white text-[#1A3622] rounded-md text-sm font-medium hover:bg-white/90" data-testid="btn-create-perimetre">
              <Plus className="h-4 w-4" /> Definir le perimetre
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-8">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-[#1A3622]" /></div>
        ) : perimetres.length === 0 ? (
          <div className="bg-white border border-[#E5E5E0] rounded-md p-12 text-center" data-testid="empty-state">
            <MapPin className="h-12 w-12 text-[#D4AF37] mx-auto mb-4" strokeWidth={1} />
            <h3 className="text-lg font-semibold text-[#1A3622] mb-2">Aucun perimetre defini</h3>
            <p className="text-sm text-[#6B7280] mb-4">Le perimetre est exige par la clause 4.3 de l'ARS 1000.</p>
            <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-[#1A3622] text-white rounded-md text-sm font-medium hover:bg-[#112417]">
              <Plus className="h-4 w-4" /> Definir
            </button>
          </div>
        ) : (
          <div className="space-y-4" data-testid="perimetres-list">
            {perimetres.map((p, i) => (
              <div key={p.perimetre_id} className="bg-white border border-[#E5E5E0] rounded-md overflow-hidden" data-testid={`perimetre-${i}`}>
                <div className="px-5 py-4 border-b border-[#E5E5E0] flex items-center gap-2">
                  <Shield className="h-4 w-4 text-[#1A3622]" />
                  <h3 className="text-sm font-semibold text-[#1A3622]">Perimetre SM</h3>
                  {i === 0 && <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">Actuel</span>}
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <Stat label="Producteurs" value={p.producteurs_inclus} />
                    <Stat label="Superficie" value={`${p.superficie_totale_ha || 0} ha`} />
                    <Stat label="Valide par" value={p.valide_par || '-'} />
                    <Stat label="Date" value={p.date_validation || '-'} />
                  </div>
                  {p.description && <p className="text-xs text-[#374151] mb-2">{p.description}</p>}
                  {p.exclusions && (
                    <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded">
                      <p className="text-[10px] font-bold text-amber-800">Exclusions:</p>
                      <p className="text-xs text-amber-700">{p.exclusions}</p>
                    </div>
                  )}
                  {p.auto_stats && (
                    <div className="mt-3 flex gap-4 text-[10px] text-[#6B7280]">
                      <span>Membres valides: {p.auto_stats.total_membres_valides}</span>
                      <span>Hectares totaux: {p.auto_stats.total_hectares}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && <CreatePerimetreModal onSubmit={handleCreate} onClose={() => setShowCreate(false)} />}
    </div>
  );
};

const Stat = ({ label, value }) => (
  <div>
    <p className="text-[10px] font-bold uppercase text-[#9CA3AF]">{label}</p>
    <p className="text-sm font-bold text-[#111827]">{value}</p>
  </div>
);

const CreatePerimetreModal = ({ onSubmit, onClose }) => {
  const [form, setForm] = useState({
    description: 'Perimetre couvrant l\'ensemble des producteurs membres actifs de la cooperative et leurs parcelles de cacaoculture.',
    producteurs_inclus: 0, parcelles_incluses: 0, exclusions: '',
    date_validation: new Date().toISOString().slice(0, 10), valide_par: '',
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-testid="perimetre-modal">
      <div className="bg-white rounded-md w-full max-w-lg">
        <div className="px-5 py-4 border-b border-[#E5E5E0] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#1A3622]">Definir le perimetre SM</h3>
          <button onClick={onClose} className="text-[#6B7280] hover:text-[#111827] text-xl">&times;</button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1">Description du perimetre</label>
            <textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} rows={3} className="w-full px-3 py-2 text-xs border border-[#E5E5E0] rounded-md resize-none" data-testid="input-desc" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Fld label="Producteurs inclus" type="number" value={form.producteurs_inclus} onChange={(v) => setForm({...form, producteurs_inclus: parseInt(v) || 0})} testid="input-prod" />
            <Fld label="Parcelles incluses" type="number" value={form.parcelles_incluses} onChange={(v) => setForm({...form, parcelles_incluses: parseInt(v) || 0})} testid="input-parc" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1">Exclusions</label>
            <textarea value={form.exclusions} onChange={(e) => setForm({...form, exclusions: e.target.value})} rows={2} placeholder="Producteurs ou parcelles exclus du perimetre..." className="w-full px-3 py-2 text-xs border border-[#E5E5E0] rounded-md resize-none" data-testid="input-exclusions" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Fld label="Date validation" type="date" value={form.date_validation} onChange={(v) => setForm({...form, date_validation: v})} testid="input-date" />
            <Fld label="Valide par" value={form.valide_par} onChange={(v) => setForm({...form, valide_par: v})} testid="input-valide-par" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm border border-[#E5E5E0] rounded-md hover:bg-[#F3F4F6]">Annuler</button>
            <button type="submit" className="flex-1 px-4 py-2 text-sm bg-[#1A3622] text-white rounded-md hover:bg-[#112417]" data-testid="btn-submit-perimetre">Enregistrer</button>
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

export default PerimetrePage;

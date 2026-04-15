import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tokenService } from '../../../services/tokenService';
import { toast } from 'sonner';
import {
  AlertTriangle, Shield, Loader2, Home, ChevronRight, Plus,
  ArrowRight, CheckCircle2, TrendingUp, XCircle
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const NIVEAU_COLORS = {
  Critique: 'bg-red-600 text-white',
  Eleve: 'bg-red-100 text-red-800',
  Moyen: 'bg-amber-100 text-amber-800',
  Faible: 'bg-emerald-100 text-emerald-800',
};

const RisquesDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [risques, setRisques] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showMitigation, setShowMitigation] = useState(null);
  const [categories, setCategories] = useState([]);
  const [niveaux, setNiveaux] = useState({ probabilite: [], impact: [] });

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    const token = tokenService.getToken();
    try {
      const [dashRes, regRes, catRes, nivRes] = await Promise.all([
        fetch(`${API}/api/risques/dashboard`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/risques/registre`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/risques/reference/categories`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/risques/reference/niveaux`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setData(await dashRes.json());
      const regData = await regRes.json();
      setRisques(regData.risques || []);
      setStats(regData.stats || {});
      setCategories((await catRes.json()).categories || []);
      setNiveaux(await nivRes.json());
    } catch { toast.error('Erreur chargement'); }
    finally { setLoading(false); }
  };

  const handleCreate = async (form) => {
    try {
      const token = tokenService.getToken();
      const res = await fetch(`${API}/api/risques/registre`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Erreur');
      toast.success('Risque enregistre');
      setShowCreate(false);
      loadAll();
    } catch { toast.error('Erreur'); }
  };

  const handleAddMitigation = async (risqueId, form) => {
    try {
      const token = tokenService.getToken();
      const res = await fetch(`${API}/api/risques/registre/${risqueId}/mitigation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ risque_id: risqueId, ...form }),
      });
      if (!res.ok) throw new Error('Erreur');
      toast.success('Action ajoutee');
      setShowMitigation(null);
      loadAll();
    } catch { toast.error('Erreur'); }
  };

  if (loading) return <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#1A3622]" /></div>;

  const kpis = data?.kpis || {};

  return (
    <div className="min-h-screen bg-[#FAF9F6]" data-testid="risques-dashboard">
      <div className="bg-[#1A3622]">
        <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-6">
          <div className="flex items-center gap-2 text-white/50 text-xs mb-3">
            <button onClick={() => navigate('/cooperative/dashboard')} className="hover:text-white" data-testid="nav-home"><Home className="h-3.5 w-3.5" /></button>
            <ChevronRight className="h-3 w-3" />
            <span className="text-white/80">Risques & Durabilite</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight" data-testid="page-title">Risques & Durabilite</h1>
              <p className="text-sm text-white/60 mt-1">Clauses 6.1 & 6.2 - Registre, matrice et plan de mitigation</p>
            </div>
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-white text-[#1A3622] rounded-md text-sm font-medium hover:bg-white/90" data-testid="btn-create-risque">
              <Plus className="h-4 w-4" /> Nouveau risque
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-8">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-8" data-testid="kpi-strip">
          <MiniStat label="Total" value={kpis.total || 0} />
          <MiniStat label="Critiques" value={kpis.critiques || 0} color="text-red-600" bg="bg-red-50" />
          <MiniStat label="Eleves" value={kpis.eleves || 0} color="text-red-500" bg="bg-red-50" />
          <MiniStat label="Ouverts" value={kpis.ouverts || 0} color="text-amber-600" bg="bg-amber-50" />
          <MiniStat label="Mitigees" value={kpis.mitigees || 0} color="text-emerald-600" bg="bg-emerald-50" />
          <MiniStat label="Indicateurs" value={kpis.indicateurs || 0} />
        </div>

        {/* Matrice par categorie */}
        {data?.par_categorie?.length > 0 && (
          <div className="bg-white border border-[#E5E5E0] rounded-md overflow-hidden mb-6" data-testid="matrice-categories">
            <div className="px-5 py-4 border-b border-[#E5E5E0]">
              <h3 className="text-sm font-semibold text-[#1A3622]">Risques par categorie</h3>
            </div>
            <div className="p-5">
              <div className="space-y-2">
                {data.par_categorie.map((c, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-32 text-xs font-medium text-[#374151]">{c.categorie}</div>
                    <div className="flex-1 bg-[#F3F4F6] rounded-full h-5 relative overflow-hidden">
                      <div className="h-full rounded-full" style={{
                        width: `${Math.min(100, c.score_moyen / 25 * 100)}%`,
                        backgroundColor: c.critiques > 0 ? '#C25E30' : c.score_moyen >= 9 ? '#D4AF37' : '#065F46',
                      }} />
                      <span className="absolute inset-0 flex items-center justify-end pr-3 text-[10px] font-bold text-[#374151]">
                        {c.count} risque(s) | score moy. {c.score_moyen}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Registre des risques */}
        <div className="bg-white border border-[#E5E5E0] rounded-md overflow-hidden" data-testid="registre-risques">
          <div className="px-5 py-4 border-b border-[#E5E5E0]">
            <h3 className="text-sm font-semibold text-[#1A3622]">Registre des risques ({stats.total || 0})</h3>
          </div>
          {risques.length === 0 ? (
            <div className="p-12 text-center" data-testid="empty-state">
              <Shield className="h-12 w-12 text-[#D4AF37] mx-auto mb-4" strokeWidth={1} />
              <h3 className="text-lg font-semibold text-[#1A3622] mb-2">Aucun risque identifie</h3>
              <p className="text-sm text-[#6B7280] mb-4">Identifiez les risques de durabilite conformement aux clauses 6.1 et 6.2.</p>
              <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-[#1A3622] text-white rounded-md text-sm font-medium hover:bg-[#112417]">
                <Plus className="h-4 w-4" /> Premier risque
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[#E5E5E0]">
              {risques.map(r => (
                <div key={r.risque_id} className="px-5 py-4" data-testid={`risque-${r.risque_id?.slice(0, 8)}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${NIVEAU_COLORS[r.niveau] || 'bg-gray-100 text-gray-600'}`}>{r.niveau}</span>
                      <h4 className="text-xs font-semibold text-[#1A3622]">{r.titre}</h4>
                      <span className="text-[9px] text-[#6B7280] bg-[#F3F4F6] px-1.5 py-0.5 rounded">{r.categorie}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[#6B7280]">Score: <strong>{r.score}</strong></span>
                      <button onClick={() => setShowMitigation(r)} className="p-1 rounded hover:bg-[#E8F0EA]" title="Plan de mitigation" data-testid={`btn-mitigation-${r.risque_id?.slice(0, 8)}`}>
                        <Plus className="h-3.5 w-3.5 text-[#1A3622]" />
                      </button>
                    </div>
                  </div>
                  {r.description && <p className="text-[10px] text-[#6B7280] mb-2">{r.description}</p>}
                  <div className="flex gap-4 text-[10px] text-[#6B7280]">
                    <span>Prob: {r.probabilite}</span>
                    <span>Impact: {r.impact}</span>
                    {r.zone && <span>Zone: {r.zone}</span>}
                    <span>Statut: {r.statut}</span>
                  </div>
                  {r.mitigations?.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {r.mitigations.map((m, i) => (
                        <div key={i} className="flex items-center gap-2 px-2 py-1 bg-[#E8F0EA] rounded text-[10px]">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600 flex-shrink-0" />
                          <span className="text-[#374151]">{m.action}</span>
                          {m.responsable && <span className="text-[#6B7280]">({m.responsable})</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCreate && <CreateRisqueModal categories={categories} niveaux={niveaux} onSubmit={handleCreate} onClose={() => setShowCreate(false)} />}
      {showMitigation && <MitigationModal risque={showMitigation} onSubmit={handleAddMitigation} onClose={() => setShowMitigation(null)} />}
    </div>
  );
};

const CreateRisqueModal = ({ categories, niveaux, onSubmit, onClose }) => {
  const [form, setForm] = useState({ titre: '', categorie: 'ENVIRONNEMENT', description: '', probabilite: 'Possible', impact: 'Modere', zone: '', cause_racine: '' });
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-testid="create-risque-modal">
      <div className="bg-white rounded-md w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-[#E5E5E0] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#1A3622]">Nouveau risque</h3>
          <button onClick={onClose} className="text-[#6B7280] hover:text-[#111827] text-xl">&times;</button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); if (!form.titre) { toast.error('Titre requis'); return; } onSubmit(form); }} className="p-5 space-y-3">
          <Fld label="Titre du risque *" value={form.titre} onChange={(v) => setForm({...form, titre: v})} testid="input-titre" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">Categorie</label>
              <select value={form.categorie} onChange={(e) => setForm({...form, categorie: e.target.value})} className="w-full px-3 py-2 text-sm border border-[#E5E5E0] rounded-md" data-testid="select-categorie">
                {categories.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
            </div>
            <Fld label="Zone" value={form.zone} onChange={(v) => setForm({...form, zone: v})} testid="input-zone" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} rows={2} className="w-full px-3 py-2 text-xs border border-[#E5E5E0] rounded-md resize-none" data-testid="input-desc" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">Probabilite</label>
              <select value={form.probabilite} onChange={(e) => setForm({...form, probabilite: e.target.value})} className="w-full px-3 py-2 text-sm border border-[#E5E5E0] rounded-md" data-testid="select-prob">
                {(niveaux.probabilite || []).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">Impact</label>
              <select value={form.impact} onChange={(e) => setForm({...form, impact: e.target.value})} className="w-full px-3 py-2 text-sm border border-[#E5E5E0] rounded-md" data-testid="select-impact">
                {(niveaux.impact || []).map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1">Cause racine</label>
            <textarea value={form.cause_racine} onChange={(e) => setForm({...form, cause_racine: e.target.value})} rows={2} className="w-full px-3 py-2 text-xs border border-[#E5E5E0] rounded-md resize-none" data-testid="input-cause" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm border border-[#E5E5E0] rounded-md hover:bg-[#F3F4F6]">Annuler</button>
            <button type="submit" className="flex-1 px-4 py-2 text-sm bg-[#1A3622] text-white rounded-md hover:bg-[#112417]" data-testid="btn-submit-risque">Enregistrer</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const MitigationModal = ({ risque, onSubmit, onClose }) => {
  const [form, setForm] = useState({ action: '', responsable: '', echeance: '', ressources: '' });
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-testid="mitigation-modal">
      <div className="bg-white rounded-md w-full max-w-md">
        <div className="px-5 py-4 border-b border-[#E5E5E0]">
          <h3 className="text-sm font-semibold text-[#1A3622]">Plan de mitigation</h3>
          <p className="text-[10px] text-[#6B7280]">Risque: {risque.titre}</p>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); if (!form.action) { toast.error('Action requise'); return; } onSubmit(risque.risque_id, form); }} className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1">Action de mitigation *</label>
            <textarea value={form.action} onChange={(e) => setForm({...form, action: e.target.value})} rows={2} className="w-full px-3 py-2 text-xs border border-[#E5E5E0] rounded-md resize-none" data-testid="input-action" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Fld label="Responsable" value={form.responsable} onChange={(v) => setForm({...form, responsable: v})} testid="input-responsable" />
            <Fld label="Echeance" type="date" value={form.echeance} onChange={(v) => setForm({...form, echeance: v})} testid="input-echeance" />
          </div>
          <Fld label="Ressources" value={form.ressources} onChange={(v) => setForm({...form, ressources: v})} testid="input-ressources" />
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm border border-[#E5E5E0] rounded-md hover:bg-[#F3F4F6]">Annuler</button>
            <button type="submit" className="flex-1 px-4 py-2 text-sm bg-[#1A3622] text-white rounded-md hover:bg-[#112417]" data-testid="btn-submit-mitigation">Ajouter</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const MiniStat = ({ label, value, color = "text-[#111827]", bg = "bg-white" }) => (
  <div className={`${bg} border border-[#E5E5E0] rounded-md px-3 py-2`}>
    <p className="text-[9px] uppercase font-bold text-[#9CA3AF]">{label}</p>
    <p className={`text-sm font-bold ${color}`}>{value}</p>
  </div>
);

const Fld = ({ label, value, onChange, type = 'text', testid }) => (
  <div>
    <label className="block text-xs font-medium text-[#374151] mb-1">{label}</label>
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#E5E5E0] rounded-md focus:outline-none focus:border-[#1A3622]" data-testid={testid} />
  </div>
);

export default RisquesDashboard;

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { tokenService } from '../../../services/tokenService';
import { toast } from 'sonner';
import { StableInput, StableSelect, StableTextarea } from '../../../components/StableInput';
import {
  AlertTriangle, Shield, Loader2, Home, ChevronRight, Plus,
  CheckCircle2, XCircle, Download, Eye, EyeOff, Target
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const EFR_COLORS = { vert: 'bg-emerald-100 text-emerald-800 border-emerald-300', jaune: 'bg-amber-100 text-amber-800 border-amber-300', rouge: 'bg-red-100 text-red-800 border-red-300' };
const EFR_DOT = { vert: 'bg-emerald-500', jaune: 'bg-amber-500', rouge: 'bg-red-500' };
const NR_BG = { I: 'bg-emerald-500', II: 'bg-emerald-300', III: 'bg-amber-400', IV: 'bg-orange-500', V: 'bg-red-600' };
const PRIO_LABELS = { 1: 'Faible', 2: 'Moyen', 3: 'Fort' };
const M_LABELS = { A: 'Tres pertinente', B: 'Pertinente', C: 'Peu pertinente', D: 'Tres peu pertinente', E: 'Pas pertinente' };

const RisquesDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [risques, setRisques] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [echelles, setEchelles] = useState({});
  const [categories, setCategories] = useState([]);
  const [expanded, setExpanded] = useState(null);

  const loadAll = useCallback(async () => {
    const token = tokenService.getToken();
    try {
      const [dashRes, regRes, catRes, echRes] = await Promise.all([
        fetch(`${API}/api/risques/dashboard`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/risques/registre`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/risques/reference/categories`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/risques/reference/echelles`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setData(await dashRes.json());
      const regData = await regRes.json();
      setRisques(regData.risques || []);
      setStats(regData.stats || {});
      setCategories((await catRes.json()).categories || []);
      setEchelles(await echRes.json());
    } catch (e) { console.error('Load error:', e); toast.error('Erreur chargement'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

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
    } catch (e) { console.error('Create error:', e); toast.error('Erreur creation'); }
  };

  const handleExport = async () => {
    try {
      const token = tokenService.getToken();
      const res = await fetch(`${API}/api/risques/export/excel`, { headers: { Authorization: `Bearer ${token}` } });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'cartographie_risques_ars1000.xlsx'; a.click();
    } catch (e) { console.error('Export error:', e); toast.error('Erreur export'); }
  };

  if (loading) return <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#1A3622]" /></div>;

  const kpis = data?.kpis || {};
  const matrice = data?.matrice_5x5 || [[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]];
  const efr = data?.repartition_efr || {};

  return (
    <div className="min-h-screen bg-[#FAF9F6]" data-testid="risques-dashboard">
      {/* Header */}
      <div className="bg-[#1A3622]">
        <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-6">
          <div className="flex items-center gap-2 text-white/50 text-xs mb-3">
            <button onClick={() => navigate('/cooperative/dashboard')} className="hover:text-white" data-testid="nav-home"><Home className="h-3.5 w-3.5" /></button>
            <ChevronRight className="h-3 w-3" />
            <span className="text-white/80">Risques & Durabilite</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/cooperative/dashboard')} className="w-8 h-8 rounded-md bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors" data-testid="btn-retour"><ChevronRight className="h-4 w-4 text-white rotate-180" /></button>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight" data-testid="page-title">Cartographie des Risques</h1>
                <p className="text-sm text-white/60 mt-1">ARS 1000-1 Clause 6.1 - Processus en 5 etapes</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 bg-white/10 text-white rounded-md text-sm hover:bg-white/20" data-testid="btn-export"><Download className="h-4 w-4" /> Export Excel</button>
              <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-white text-[#1A3622] rounded-md text-sm font-medium hover:bg-white/90" data-testid="btn-create-risque"><Plus className="h-4 w-4" /> Nouveau risque</button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-8 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3" data-testid="kpi-strip">
          <KPI label="Total" value={kpis.total || 0} />
          <KPI label="Critiques (rouge)" value={kpis.critiques || 0} color="text-red-600" bg="bg-red-50" />
          <KPI label="Eleves (IV-V)" value={kpis.eleves || 0} color="text-orange-600" bg="bg-orange-50" />
          <KPI label="Ouverts" value={kpis.ouverts || 0} color="text-amber-600" bg="bg-amber-50" />
          <KPI label="En mitigation" value={kpis.mitigees || 0} color="text-emerald-600" bg="bg-emerald-50" />
          <KPI label="Indicateurs" value={kpis.indicateurs || 0} />
        </div>

        {/* Matrice 5x5 + EFR */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Matrice G x F */}
          <div className="bg-white border border-[#E5E5E0] rounded-md overflow-hidden" data-testid="matrice-gxf">
            <div className="px-5 py-3 border-b border-[#E5E5E0] bg-[#F9FAFB]">
              <h3 className="text-xs font-bold text-[#1A3622] uppercase">Etape 1-2 : Matrice G x F (Niveau de Risque)</h3>
            </div>
            <div className="p-4">
              <div className="flex items-end gap-1">
                <div className="w-8 text-[8px] font-bold text-[#6B7280] text-center" style={{writingMode:'vertical-rl', transform:'rotate(180deg)', height:100}}>GRAVITE</div>
                <div className="flex-1">
                  {[5,4,3,2,1].map(g => (
                    <div key={g} className="flex items-center gap-1 mb-1">
                      <div className="w-6 text-[9px] font-bold text-[#6B7280] text-right">{g}</div>
                      {[1,2,3,4,5].map(f => {
                        const nr = g * f;
                        const count = matrice[g-1]?.[f-1] || 0;
                        const bg = nr >= 9 ? 'bg-red-500' : nr >= 7 ? 'bg-orange-400' : nr >= 5 ? 'bg-amber-400' : nr >= 3 ? 'bg-emerald-300' : 'bg-emerald-500';
                        return (
                          <div key={f} className={`flex-1 h-10 ${bg} rounded-sm flex flex-col items-center justify-center transition-all ${count > 0 ? 'ring-2 ring-[#1A3622]' : 'opacity-60'}`}>
                            <span className="text-[8px] font-bold text-white/90">{nr}</span>
                            {count > 0 && <span className="text-[10px] font-black text-white">{count}</span>}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                  <div className="flex items-center gap-1 mt-1">
                    <div className="w-6" />
                    {[1,2,3,4,5].map(f => <div key={f} className="flex-1 text-center text-[9px] font-bold text-[#6B7280]">{f}</div>)}
                  </div>
                  <p className="text-center text-[8px] font-bold text-[#6B7280] mt-1">FREQUENCE</p>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-3 text-[8px] flex-wrap">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-emerald-500" /> I: Tres faible</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-emerald-300" /> II: Faible</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-amber-400" /> III: Peu faible</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-orange-400" /> IV: Fort</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-500" /> V: Tres fort</span>
              </div>
            </div>
          </div>

          {/* Repartition EFR */}
          <div className="bg-white border border-[#E5E5E0] rounded-md overflow-hidden" data-testid="repartition-efr">
            <div className="px-5 py-3 border-b border-[#E5E5E0] bg-[#F9FAFB]">
              <h3 className="text-xs font-bold text-[#1A3622] uppercase">Etape 4-5 : Evaluation Finale (EFR) et Decision</h3>
            </div>
            <div className="p-5 space-y-4">
              {[
                { key: 'vert', label: 'Maitrise pertinente', desc: 'Aucune action supplementaire', color: 'bg-emerald-500', count: efr.vert || 0 },
                { key: 'jaune', label: 'Mesures complementaires', desc: 'Actions simples envisageables', color: 'bg-amber-400', count: efr.jaune || 0 },
                { key: 'rouge', label: 'Action immediate', desc: 'Ressources necessaires sans delai', color: 'bg-red-500', count: efr.rouge || 0 },
              ].map(item => {
                const total = (efr.vert || 0) + (efr.jaune || 0) + (efr.rouge || 0);
                const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
                return (
                  <div key={item.key}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${item.color}`} />
                        <span className="text-xs font-semibold text-[#374151]">{item.label}</span>
                      </div>
                      <span className="text-sm font-bold text-[#1A3622]">{item.count}</span>
                    </div>
                    <div className="h-2.5 bg-[#F3F4F6] rounded-full overflow-hidden">
                      <div className={`h-full ${item.color} rounded-full transition-all`} style={{width: `${pct}%`}} />
                    </div>
                    <p className="text-[9px] text-[#9CA3AF] mt-0.5">{item.desc}</p>
                  </div>
                );
              })}
              <div className="mt-3 p-3 bg-[#F9FAFB] rounded-md border border-[#E5E5E0]">
                <p className="text-[9px] font-bold text-[#1A3622] mb-1">Echelle M (Mesure de prevention)</p>
                <div className="grid grid-cols-5 gap-1 text-[8px] text-center">
                  {['A','B','C','D','E'].map(m => (
                    <div key={m} className="px-1 py-1 rounded bg-white border border-[#E5E5E0]">
                      <span className="font-bold">{m}</span><br/>
                      <span className="text-[7px] text-[#6B7280]">{M_LABELS[m]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Registre Cartographie */}
        <div className="bg-white border border-[#E5E5E0] rounded-md overflow-hidden" data-testid="registre-risques">
          <div className="px-5 py-4 border-b border-[#E5E5E0] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#1A3622]">Cartographie des Risques ({stats.total || 0})</h3>
          </div>
          {risques.length === 0 ? (
            <div className="p-12 text-center" data-testid="empty-state">
              <Shield className="h-12 w-12 text-[#D4AF37] mx-auto mb-4" strokeWidth={1} />
              <h3 className="text-lg font-semibold text-[#1A3622] mb-2">Aucun risque identifie</h3>
              <p className="text-sm text-[#6B7280] mb-4">Identifiez les risques conformement a la clause 6.1 ARS 1000-1.</p>
              <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-[#1A3622] text-white rounded-md text-sm font-medium hover:bg-[#112417]"><Plus className="h-4 w-4" /> Premier risque</button>
            </div>
          ) : (
            <div className="divide-y divide-[#E5E5E0]">
              {risques.map(r => (
                <div key={r.risque_id} className="px-5 py-4" data-testid={`risque-${r.risque_id?.slice(0, 8)}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${EFR_COLORS[r.efr_decision] || EFR_COLORS.jaune}`}>EFR: {(r.efr_decision || '').toUpperCase()}</span>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded text-white ${NR_BG[r.nr_code] || 'bg-gray-400'}`}>NR {r.nr_code}: {r.nr || r.score}</span>
                      <h4 className="text-xs font-semibold text-[#1A3622]">{r.titre}</h4>
                      {r.categorie && <span className="text-[8px] text-[#6B7280] bg-[#F3F4F6] px-1.5 py-0.5 rounded">{r.categorie}</span>}
                    </div>
                    <button onClick={() => setExpanded(expanded === r.risque_id ? null : r.risque_id)} className="p-1 rounded hover:bg-[#E8F0EA]" data-testid={`btn-expand-${r.risque_id?.slice(0, 8)}`}>
                      {expanded === r.risque_id ? <EyeOff className="h-3.5 w-3.5 text-[#6B7280]" /> : <Eye className="h-3.5 w-3.5 text-[#1A3622]" />}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-3 text-[9px] text-[#6B7280]">
                    <span>G={r.gravite} F={r.frequence}</span>
                    <span>M={r.mesure_m_code} ({M_LABELS[r.mesure_m_code] || '?'})</span>
                    <span>Priorite: {PRIO_LABELS[r.priorite] || r.priorite}</span>
                    {r.contexte && <span>Contexte: {r.contexte}</span>}
                    <span>Statut: {r.statut}</span>
                  </div>
                  {r.danger && <p className="text-[9px] text-[#6B7280] mt-1">Danger: {r.danger}</p>}

                  {expanded === r.risque_id && (
                    <div className="mt-3 space-y-2 border-t border-[#E5E5E0] pt-3">
                      {r.description && <Detail label="Description" value={r.description} />}
                      {r.causes && <Detail label="Causes" value={r.causes} />}
                      {r.mesure_prevention && <Detail label="Mesure prevention existante" value={`${r.mesure_prevention} (M=${r.mesure_m_code})`} />}
                      {r.efr_decision_texte && <Detail label="Decision EFR" value={r.efr_decision_texte} />}
                      {(r.objectif_g > 0 || r.objectif_f > 0) && <Detail label="Objectifs" value={`G cible: ${r.objectif_g}, F cible: ${r.objectif_f}`} />}
                      {r.actions?.length > 0 && (
                        <div className="mt-1">
                          <p className="text-[9px] font-bold text-[#1A3622] mb-1">Actions de traitement:</p>
                          {r.actions.map((a, i) => (
                            <div key={`act-${i}`} className="flex items-center gap-2 px-2 py-1 bg-[#E8F0EA] rounded text-[9px] mb-1">
                              <Target className="h-3 w-3 text-emerald-600 flex-shrink-0" />
                              <span>{a.libelle}</span>
                              {a.responsable && <span className="text-[#6B7280]">| {a.responsable}</span>}
                              {a.echeance && <span className="text-[#6B7280]">| {a.echeance}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                      {r.mitigations?.length > 0 && (
                        <div className="mt-1">
                          <p className="text-[9px] font-bold text-[#1A3622] mb-1">Mitigations:</p>
                          {r.mitigations.map((m, i) => (
                            <div key={`mit-${i}`} className="flex items-center gap-2 px-2 py-1 bg-[#F0FDF4] rounded text-[9px] mb-1">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600 flex-shrink-0" />
                              <span>{m.action}</span>
                              {m.responsable && <span className="text-[#6B7280]">({m.responsable})</span>}
                            </div>
                          ))}
                        </div>
                      )}
                      {r.evaluation?.critere && <Detail label="Critere efficacite" value={r.evaluation.critere} />}
                      {r.evaluation?.efficace && <Detail label="Efficace?" value={r.evaluation.efficace} />}
                      {r.surveillance?.methode && <Detail label="Surveillance" value={`${r.surveillance.methode} - ${r.surveillance.responsable || ''} - ${r.surveillance.echeance || ''}`} />}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCreate && <CreateRisqueModal categories={categories} echelles={echelles} onSubmit={handleCreate} onClose={() => setShowCreate(false)} />}
    </div>
  );
};

// ============= CREATE MODAL =============
const CreateRisqueModal = ({ categories, echelles, onSubmit, onClose }) => {
  const [form, setForm] = useState({
    contexte: '', libelle_enjeu: '', titre: '', categorie: 'ENVIRONNEMENT', danger: '', description: '',
    gravite: 3, frequence: 3, mesure_prevention: '', mesure_m_code: 'C', priorite: 2, causes: '',
    actions: [], surveillance: { methode: '', responsable: '', echeance: '' },
    objectif_g: 0, objectif_f: 0,
    evaluation: { critere: '', methode: '', responsable: '', date: '', enregistrements: '', efficace: '', decision: '' },
  });
  const up = useCallback((k, v) => setForm(prev => ({ ...prev, [k]: v })), []);
  const nr = form.gravite * form.frequence;

  const addAction = () => up('actions', [...form.actions, { libelle: '', responsable: '', contributeur: '', echeance: '' }]);
  const updateAction = (i, k, v) => {
    const list = [...form.actions];
    list[i] = { ...list[i], [k]: v };
    up('actions', list);
  };
  const removeAction = (i) => up('actions', form.actions.filter((_, idx) => idx !== i));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-testid="create-risque-modal">
      <div className="bg-white rounded-md w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-[#E5E5E0] flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h3 className="text-sm font-semibold text-[#1A3622]">Nouveau risque - ARS 1000-1 Ch. 6.1</h3>
            <p className="text-[9px] text-[#6B7280]">Cartographie des risques du SMCD</p>
          </div>
          <button onClick={onClose} className="text-[#6B7280] hover:text-[#111827] text-xl">&times;</button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); if (!form.titre) { toast.error('Titre requis'); return; } onSubmit(form); }} className="p-5 space-y-4">
          {/* Contexte & Identification */}
          <Section title="Identification du risque">
            <div className="grid grid-cols-2 gap-3">
              <StableSelect label="Contexte" value={form.contexte} onChange={v => up('contexte', v)} testid="input-contexte"
                options={[{v:'',l:'Choisir...'},{v:'ENJEUX',l:'Questions pertinentes (Enjeux)'},{v:'FAIBLESSES',l:'Faiblesses analyse 4.1'},{v:'MENACES',l:'Menaces analyse 4.1'},{v:'PLANTATION',l:'Plantation'},{v:'TRANSPORT',l:'Transport'},{v:'STOCKAGE',l:'Stockage'},{v:'ADMINISTRATION',l:'Administration'}]} />
              <StableInput label="Enjeu / Activite" value={form.libelle_enjeu} onChange={v => up('libelle_enjeu', v)} testid="input-enjeu" placeholder="Ex: Epandage produits agrochimiques" />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <StableInput label="Danger (source du risque) *" value={form.danger} onChange={v => up('danger', v)} testid="input-danger" placeholder="Ex: Produits chimiques" />
              <StableInput label="Risque / Menace *" value={form.titre} onChange={v => up('titre', v)} testid="input-titre" placeholder="Ex: Intoxication et irruption cutanee" />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <StableSelect label="Categorie" value={form.categorie} onChange={v => up('categorie', v)} testid="select-categorie"
                options={categories.map(c => ({v: c.code, l: c.label}))} />
              <StableTextarea label="Description" value={form.description} onChange={v => up('description', v)} testid="input-desc" placeholder="Details supplementaires..." />
            </div>
          </Section>

          {/* Etape 1: Notation */}
          <Section title="Etape 1-2 : Notation du Niveau de Risque (NR = G x F)">
            <div className="grid grid-cols-3 gap-3">
              <StableSelect label="Gravite (G)" value={String(form.gravite)} onChange={v => up('gravite', parseInt(v))} testid="select-gravite"
                options={[{v:'1',l:'1 - Negligeable'},{v:'2',l:'2 - Mineure'},{v:'3',l:'3 - Moderee'},{v:'4',l:'4 - Majeure'},{v:'5',l:'5 - Critique'}]} />
              <StableSelect label="Frequence (F)" value={String(form.frequence)} onChange={v => up('frequence', parseInt(v))} testid="select-frequence"
                options={[{v:'1',l:'1 - Rare'},{v:'2',l:'2 - Peu probable'},{v:'3',l:'3 - Possible'},{v:'4',l:'4 - Probable'},{v:'5',l:'5 - Quasi certain'}]} />
              <div>
                <label className="block text-[10px] font-medium text-[#374151] mb-1">NR = G x F</label>
                <div className={`w-full px-3 py-2 text-sm font-bold text-white rounded-md text-center ${nr >= 9 ? 'bg-red-600' : nr >= 7 ? 'bg-orange-500' : nr >= 5 ? 'bg-amber-500' : nr >= 3 ? 'bg-emerald-400' : 'bg-emerald-600'}`}>{nr}</div>
              </div>
            </div>
          </Section>

          {/* Etape 3: Mesure de prevention */}
          <Section title="Etape 3 : Mesure de prevention existante">
            <StableInput label="Libelle de la mesure" value={form.mesure_prevention} onChange={v => up('mesure_prevention', v)} testid="input-mesure" placeholder="Ex: Sensibilisation et formation, port EPI" />
            <div className="grid grid-cols-2 gap-3 mt-2">
              <StableSelect label="Appreciation (M)" value={form.mesure_m_code} onChange={v => up('mesure_m_code', v)} testid="select-m"
                options={[{v:'A',l:'A - Tres pertinente (0.1-0.2)'},{v:'B',l:'B - Pertinente (0.3-0.4)'},{v:'C',l:'C - Peu pertinente (0.5-0.6)'},{v:'D',l:'D - Tres peu pertinente (0.6-0.7)'},{v:'E',l:'E - Pas pertinente (0.7-1)'}]} />
              <StableSelect label="Priorite de traitement" value={String(form.priorite)} onChange={v => up('priorite', parseInt(v))} testid="select-prio"
                options={[{v:'1',l:'1 - Faible'},{v:'2',l:'2 - Moyen'},{v:'3',l:'3 - Fort'}]} />
            </div>
          </Section>

          {/* Causes & Actions */}
          <Section title="Causes et Actions de traitement">
            <StableTextarea label="Causes (determination des causes)" value={form.causes} onChange={v => up('causes', v)} testid="input-causes" placeholder="Ex: Absence de protection ou d'EPI" />
            <div className="flex items-center justify-between mt-3 mb-1">
              <p className="text-[10px] font-bold text-[#374151]">Actions a realiser ({form.actions.length})</p>
              <button type="button" onClick={addAction} className="text-[9px] px-2 py-1 bg-[#1A3622] text-white rounded hover:bg-[#112417]" data-testid="btn-add-action"><Plus className="h-3 w-3 inline mr-1" />Ajouter</button>
            </div>
            {form.actions.map((a, i) => (
              <div key={`action-${i}`} className="grid grid-cols-4 gap-2 mb-2 bg-[#F9FAFB] p-2 rounded border border-[#E5E5E0]">
                <StableInput label="Action" value={a.libelle} onChange={v => updateAction(i, 'libelle', v)} testid={`action-lib-${i}`} />
                <StableInput label="Responsable" value={a.responsable} onChange={v => updateAction(i, 'responsable', v)} testid={`action-resp-${i}`} />
                <StableInput label="Contributeur" value={a.contributeur} onChange={v => updateAction(i, 'contributeur', v)} testid={`action-contrib-${i}`} />
                <div className="flex gap-1 items-end">
                  <StableInput label="Echeance" value={a.echeance} onChange={v => updateAction(i, 'echeance', v)} testid={`action-ech-${i}`} placeholder="Fin 2025" />
                  <button type="button" onClick={() => removeAction(i)} className="p-1.5 text-red-500 hover:bg-red-50 rounded mb-0.5"><XCircle className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            ))}
          </Section>

          {/* Surveillance & Objectifs */}
          <Section title="Surveillance et Objectifs">
            <div className="grid grid-cols-3 gap-3">
              <StableInput label="Methode surveillance" value={form.surveillance.methode} onChange={v => up('surveillance', {...form.surveillance, methode: v})} testid="input-surv-methode" placeholder="Ex: Rapports d'application" />
              <StableInput label="Responsable" value={form.surveillance.responsable} onChange={v => up('surveillance', {...form.surveillance, responsable: v})} testid="input-surv-resp" />
              <StableInput label="Echeance" value={form.surveillance.echeance} onChange={v => up('surveillance', {...form.surveillance, echeance: v})} testid="input-surv-ech" placeholder="Chaque 6 mois" />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <StableSelect label="Objectif G (gravite cible)" value={String(form.objectif_g)} onChange={v => up('objectif_g', parseInt(v))} testid="select-obj-g"
                options={[{v:'0',l:'Non defini'},{v:'1',l:'1'},{v:'2',l:'2'},{v:'3',l:'3'},{v:'4',l:'4'},{v:'5',l:'5'}]} />
              <StableSelect label="Objectif F (frequence cible)" value={String(form.objectif_f)} onChange={v => up('objectif_f', parseInt(v))} testid="select-obj-f"
                options={[{v:'0',l:'Non defini'},{v:'1',l:'1'},{v:'2',l:'2'},{v:'3',l:'3'},{v:'4',l:'4'},{v:'5',l:'5'}]} />
            </div>
          </Section>

          <div className="flex gap-3 pt-3 border-t border-[#E5E5E0]">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 text-sm border border-[#E5E5E0] rounded-md hover:bg-[#F3F4F6]">Annuler</button>
            <button type="submit" className="flex-1 px-4 py-2.5 text-sm bg-[#1A3622] text-white rounded-md hover:bg-[#112417] font-medium" data-testid="btn-submit-risque">Enregistrer le risque</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============= UI HELPERS =============
const Section = ({ title, children }) => (
  <div className="border border-[#E5E5E0] rounded-md overflow-hidden">
    <div className="px-4 py-2 bg-[#F9FAFB] border-b border-[#E5E5E0]">
      <p className="text-[10px] font-bold text-[#1A3622] uppercase tracking-wide">{title}</p>
    </div>
    <div className="p-4">{children}</div>
  </div>
);

const KPI = ({ label, value, color = "text-[#111827]", bg = "bg-white" }) => (
  <div className={`${bg} border border-[#E5E5E0] rounded-md px-3 py-2`}>
    <p className="text-[9px] uppercase font-bold text-[#9CA3AF]">{label}</p>
    <p className={`text-sm font-bold ${color}`}>{value}</p>
  </div>
);

const Detail = ({ label, value }) => (
  <div className="text-[9px]"><span className="font-bold text-[#1A3622]">{label}:</span> <span className="text-[#374151]">{value}</span></div>
);

export default RisquesDashboard;

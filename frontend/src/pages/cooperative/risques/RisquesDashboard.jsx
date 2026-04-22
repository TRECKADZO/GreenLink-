import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { tokenService } from '../../../services/tokenService';
import { toast } from 'sonner';
import { StableInput, StableSelect, StableTextarea } from '../../../components/StableInput';
import {
  AlertTriangle, Shield, Loader2, Home, ChevronRight, Plus,
  CheckCircle2, XCircle, Download, Eye, EyeOff, Target, ClipboardList, ArrowRight
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
  const [showAutoDiag, setShowAutoDiag] = useState(false);

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
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setShowAutoDiag(true)} className="flex items-center gap-2 px-3 py-2 bg-[#D4AF37] text-[#1A3622] rounded-md text-sm font-medium hover:bg-[#C49B2F]" data-testid="btn-auto-diag"><ClipboardList className="h-4 w-4" /> Auto-Diagnostic</button>
              <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 bg-white/10 text-white rounded-md text-sm hover:bg-white/20" data-testid="btn-export"><Download className="h-4 w-4" /> Excel</button>
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
      {showAutoDiag && <AutoDiagnosticModal onClose={() => setShowAutoDiag(false)} onFinish={() => { setShowAutoDiag(false); loadAll(); }} />}
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

// ============= AUTO-DIAGNOSTIC MODAL =============
const THEME_LABELS = { TRACABILITE: 'Tracabilite', AGROCHIMIQUES: 'Agrochimiques & SST', ENVIRONNEMENT: 'Environnement & Climat', SOCIAL: 'Social & Droits', ECONOMIQUE: 'Economique & Productivite' };
const THEME_COLORS = { TRACABILITE: 'bg-blue-500', AGROCHIMIQUES: 'bg-orange-500', ENVIRONNEMENT: 'bg-emerald-500', SOCIAL: 'bg-purple-500', ECONOMIQUE: 'bg-amber-500' };

const AutoDiagnosticModal = ({ onClose, onFinish }) => {
  const [questions, setQuestions] = useState([]);
  const [themes, setThemes] = useState({});
  const [reponses, setReponses] = useState({});
  const [step, setStep] = useState('questionnaire'); // questionnaire | resultats
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [activeTheme, setActiveTheme] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [loadingCompare, setLoadingCompare] = useState(false);

  const handleCompare = async () => {
    if (!result?.diagnostic_id) return;
    setLoadingCompare(true);
    try {
      const token = tokenService.getToken();
      const res = await fetch(`${API}/api/risques/auto-diagnostic/${result.diagnostic_id}/comparer`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.has_previous) {
        toast.info("Aucun diagnostic precedent pour cette cooperative — la comparaison sera disponible apres un prochain diagnostic.");
        setLoadingCompare(false);
        return;
      }
      setComparison(data);
    } catch {
      toast.error('Erreur lors de la comparaison');
    } finally {
      setLoadingCompare(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const token = tokenService.getToken();
        const res = await fetch(`${API}/api/risques/auto-diagnostic/questions`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const d = await res.json();
          setQuestions(d.questions || []);
          setThemes(d.par_theme || {});
          setActiveTheme(Object.keys(d.par_theme || {})[0] || null);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const token = tokenService.getToken();
      const res = await fetch(`${API}/api/risques/auto-diagnostic/evaluer`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(reponses),
      });
      if (res.ok) {
        const d = await res.json();
        setResult(d.diagnostic);
        setStep('resultats');
      }
    } catch (e) { toast.error('Erreur'); }
    finally { setSubmitting(false); }
  };

  const handleGenerate = async () => {
    if (!result) return;
    setGenerating(true);
    try {
      const token = tokenService.getToken();
      const res = await fetch(`${API}/api/risques/auto-diagnostic/generer-risques?diagnostic_id=${result.diagnostic_id}`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json();
        toast.success(`${d.risques_crees} fiche(s) risque creee(s) dans la cartographie`);
        onFinish();
      }
    } catch (e) { toast.error('Erreur'); }
    finally { setGenerating(false); }
  };

  const themeKeys = Object.keys(themes);
  const answered = Object.keys(reponses).length;
  const total = questions.length;
  const pctAnswered = total > 0 ? Math.round((answered / total) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-testid="auto-diagnostic-modal">
      <div className="bg-white rounded-md w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E5E5E0] flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-[#1A3622]">Auto-Diagnostic des Risques</h3>
            <p className="text-[9px] text-[#6B7280]">Questionnaire adapte ARS 1000 — Repondez Oui/Non pour identifier vos risques</p>
          </div>
          <button onClick={onClose} className="text-[#6B7280] hover:text-[#111827] text-xl">&times;</button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#1A3622]" /></div>
        ) : step === 'questionnaire' ? (
          <>
            {/* Progress */}
            <div className="px-5 py-3 border-b border-[#E5E5E0] bg-[#F9FAFB]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-[#6B7280]">{answered}/{total} questions repondues</span>
                <span className="text-[10px] font-bold text-[#1A3622]">{pctAnswered}%</span>
              </div>
              <div className="h-2 bg-[#E5E5E0] rounded-full"><div className="h-full bg-[#1A3622] rounded-full transition-all" style={{width:`${pctAnswered}%`}} /></div>
            </div>

            {/* Theme tabs */}
            <div className="px-5 pt-3 flex gap-1 flex-wrap">
              {themeKeys.map(t => {
                const qs = themes[t] || [];
                const answeredInTheme = qs.filter(q => reponses[q.id]).length;
                return (
                  <button key={t} onClick={() => setActiveTheme(t)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-medium transition-all ${activeTheme === t ? 'bg-[#1A3622] text-white' : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E5E0]'}`}>
                    <span className={`w-2 h-2 rounded-full ${THEME_COLORS[t] || 'bg-gray-400'}`} />
                    {THEME_LABELS[t] || t}
                    <span className="opacity-60">{answeredInTheme}/{qs.length}</span>
                  </button>
                );
              })}
            </div>

            {/* Questions */}
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
              {(themes[activeTheme] || []).map((q) => (
                <div key={q.id} className={`border rounded-md p-3 transition-all ${reponses[q.id] ? 'border-[#1A3622] bg-[#F0FDF4]' : 'border-[#E5E5E0] bg-white'}`} data-testid={`question-${q.id}`}>
                  <p className="text-xs text-[#374151] mb-2">{q.question}</p>
                  <div className="flex gap-2">
                    <button onClick={() => setReponses(prev => ({...prev, [q.id]: 'oui'}))}
                      className={`px-4 py-1.5 rounded text-xs font-medium transition-all ${reponses[q.id] === 'oui' ? 'bg-[#1A3622] text-white' : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E5E0]'}`}>
                      Oui
                    </button>
                    <button onClick={() => setReponses(prev => ({...prev, [q.id]: 'non'}))}
                      className={`px-4 py-1.5 rounded text-xs font-medium transition-all ${reponses[q.id] === 'non' ? 'bg-[#1A3622] text-white' : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E5E0]'}`}>
                      Non
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-[#E5E5E0] flex items-center justify-between flex-shrink-0">
              <button onClick={onClose} className="px-4 py-2 text-sm border border-[#E5E5E0] rounded-md hover:bg-[#F3F4F6]">Annuler</button>
              <button onClick={handleSubmit} disabled={answered === 0 || submitting} className="flex items-center gap-2 px-5 py-2 text-sm bg-[#1A3622] text-white rounded-md hover:bg-[#112417] disabled:opacity-50 font-medium" data-testid="btn-evaluer">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ArrowRight className="h-4 w-4" /> Evaluer ({answered}/{total})</>}
              </button>
            </div>
          </>
        ) : (
          /* RESULTATS */
          <div className="flex-1 overflow-y-auto">
            {result && (
              <div className="p-5 space-y-4">
                {/* Score global */}
                <div className={`rounded-md p-4 border-2 ${result.score_global >= 70 ? 'bg-emerald-50 border-emerald-200' : result.score_global >= 40 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center ${result.score_global >= 70 ? 'bg-emerald-500' : result.score_global >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}>
                      <span className="text-xl font-bold text-white">{result.score_global}%</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#1A3622]">Score Global</p>
                      <p className="text-xs text-[#6B7280]">{result.total_risques} risque(s) identifie(s) sur {result.total_questions} questions</p>
                    </div>
                  </div>
                </div>

                {/* Score par theme */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.entries(result.score_par_theme || {}).map(([theme, s]) => (
                    <div key={theme} className="border border-[#E5E5E0] rounded-md p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`w-2 h-2 rounded-full ${THEME_COLORS[theme] || 'bg-gray-400'}`} />
                        <p className="text-[10px] font-bold text-[#374151]">{THEME_LABELS[theme] || theme}</p>
                      </div>
                      <p className={`text-lg font-bold ${s.score >= 70 ? 'text-emerald-600' : s.score >= 40 ? 'text-amber-600' : 'text-red-600'}`}>{s.score}%</p>
                      <p className="text-[9px] text-[#9CA3AF]">{s.a_risque} risque(s) / {s.total}</p>
                    </div>
                  ))}
                </div>

                {/* Risques identifies */}
                {result.risques_identifies?.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-[#1A3622] mb-2">Risques identifies ({result.risques_identifies.length})</p>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {result.risques_identifies.map((r, i) => (
                        <div key={`ri-${i}`} className="border border-[#E5E5E0] rounded-md p-3 bg-red-50/30">
                          <div className="flex items-center gap-2 mb-1">
                            <AlertTriangle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                            <p className="text-xs font-semibold text-[#374151]">{r.titre}</p>
                          </div>
                          <p className="text-[9px] text-[#6B7280] mb-1">G={r.gravite_suggeree} F={r.frequence_suggeree} | {r.categorie}</p>
                          <div className="space-y-0.5">
                            {(r.actions_suggerees || []).slice(0, 2).map((a, j) => (
                              <p key={`a-${j}`} className="text-[9px] text-emerald-700 flex items-center gap-1"><Target className="h-2.5 w-2.5 flex-shrink-0" />{a}</p>
                            ))}
                            {(r.actions_suggerees || []).length > 2 && <p className="text-[9px] text-[#9CA3AF]">+{r.actions_suggerees.length - 2} autre(s) action(s)</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2 border-t border-[#E5E5E0] flex-wrap">
                  <button onClick={onClose} className="flex-1 min-w-[100px] px-4 py-2.5 text-sm border border-[#E5E5E0] rounded-md hover:bg-[#F3F4F6]">Fermer</button>
                  <button
                    onClick={async () => {
                      try {
                        const token = tokenService.getToken();
                        const res = await fetch(`${API}/api/risques/auto-diagnostic/${result.diagnostic_id}/pdf`, { headers: { Authorization: `Bearer ${token}` } });
                        if (!res.ok) throw new Error();
                        const blob = await res.blob();
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url; a.download = `auto_diagnostic_${result.diagnostic_id.slice(0,8)}.pdf`; a.click();
                        URL.revokeObjectURL(url);
                        toast.success('PDF telecharge');
                      } catch { toast.error('Erreur export PDF'); }
                    }}
                    className="flex-1 min-w-[100px] px-4 py-2.5 text-sm bg-[#D4AF37] text-[#1A3622] rounded-md hover:bg-[#C49B2F] font-medium"
                    data-testid="btn-export-diagnostic-pdf"
                  >
                    Exporter PDF
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const token = tokenService.getToken();
                        const res = await fetch(`${API}/api/risques/auto-diagnostic/${result.diagnostic_id}/excel`, { headers: { Authorization: `Bearer ${token}` } });
                        if (!res.ok) throw new Error();
                        const blob = await res.blob();
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url; a.download = `auto_diagnostic_${result.diagnostic_id.slice(0,8)}.xlsx`; a.click();
                        URL.revokeObjectURL(url);
                        toast.success('Excel telecharge');
                      } catch { toast.error('Erreur export Excel'); }
                    }}
                    className="flex-1 min-w-[100px] px-4 py-2.5 text-sm bg-emerald-600 text-white rounded-md hover:bg-emerald-700 font-medium"
                    data-testid="btn-export-diagnostic-excel"
                  >
                    Exporter Excel
                  </button>
                  <button
                    onClick={handleCompare}
                    disabled={loadingCompare}
                    className="flex-1 min-w-[100px] px-4 py-2.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium disabled:opacity-50"
                    data-testid="btn-compare-diagnostic"
                  >
                    {loadingCompare ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Comparer avec precedent'}
                  </button>
                  {result.risques_identifies?.length > 0 && (
                    <button onClick={handleGenerate} disabled={generating} className="flex-1 min-w-[150px] px-4 py-2.5 text-sm bg-[#1A3622] text-white rounded-md hover:bg-[#112417] font-medium disabled:opacity-50" data-testid="btn-generer-risques">
                      {generating ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : `Generer ${result.risques_identifies.length} fiche(s) risque`}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {comparison && <ComparisonModal comparison={comparison} onClose={() => setComparison(null)} />}
    </div>
  );
};

const ComparisonModal = ({ comparison, onClose }) => {
  const { current, previous, score_delta, progression, nouveaux, resolus, persistants, themes } = comparison;
  const deltaColor = progression === 'amelioration' ? 'text-emerald-600' : (progression === 'degradation' ? 'text-red-600' : 'text-gray-600');
  const arrow = progression === 'amelioration' ? '▲' : (progression === 'degradation' ? '▼' : '=');

  const fmtDate = (s) => s ? new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4" data-testid="comparison-modal">
      <div className="bg-white rounded-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b sticky top-0 bg-white flex items-center justify-between z-10">
          <div>
            <h3 className="text-lg font-bold text-[#1A3622]">Comparaison des diagnostics</h3>
            <p className="text-xs text-gray-500">Progression entre 2 auto-evaluations ARS 1000</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none" data-testid="btn-close-comparison">×</button>
        </div>

        <div className="p-6 space-y-5">
          {/* Scores side-by-side */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 border rounded-lg p-4">
              <p className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">Diagnostic precedent</p>
              <p className="text-xs text-gray-600 mt-1">{fmtDate(previous.created_at)}</p>
              <p className="text-3xl font-bold text-gray-700 mt-2">{previous.score_global}%</p>
              <p className="text-xs text-gray-500 mt-1">{previous.total_risques} risque(s) sur {previous.total_questions} questions</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <p className="text-[10px] uppercase tracking-wide text-emerald-700 font-semibold">Diagnostic actuel</p>
              <p className="text-xs text-emerald-700 mt-1">{fmtDate(current.created_at)}</p>
              <p className="text-3xl font-bold text-emerald-800 mt-2">{current.score_global}%</p>
              <p className="text-xs text-emerald-700 mt-1">{current.total_risques} risque(s) sur {current.total_questions} questions</p>
            </div>
          </div>

          {/* Delta banner */}
          <div className={`border rounded-lg p-4 text-center ${progression === 'amelioration' ? 'bg-emerald-50 border-emerald-200' : (progression === 'degradation' ? 'bg-red-50 border-red-200' : 'bg-gray-50')}`}>
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Evolution du score global</p>
            <p className={`text-4xl font-bold mt-1 ${deltaColor}`} data-testid="score-delta">
              {arrow} {score_delta > 0 ? '+' : ''}{score_delta} pts
            </p>
            <p className="text-sm text-gray-600 mt-1 capitalize">
              {progression === 'amelioration' ? 'Progression positive de la cooperative' :
               progression === 'degradation' ? 'Regression — attention a corriger rapidement' : 'Score stable'}
            </p>
          </div>

          {/* Risks breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3" data-testid="risques-nouveaux">
              <p className="text-xs font-bold text-red-700 uppercase">🆕 Nouveaux ({nouveaux.length})</p>
              <p className="text-[10px] text-red-600 mt-1">Risques apparus depuis le dernier diagnostic</p>
              <ul className="mt-2 space-y-1 text-xs text-red-900 max-h-40 overflow-y-auto">
                {nouveaux.length === 0 ? <li className="italic text-gray-500">Aucun</li> : nouveaux.map((r, i) => (
                  <li key={`new-${i}-${r.question}`} className="border-l-2 border-red-400 pl-2">{r.titre}</li>
                ))}
              </ul>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3" data-testid="risques-resolus">
              <p className="text-xs font-bold text-emerald-700 uppercase">✓ Resolus ({resolus.length})</p>
              <p className="text-[10px] text-emerald-600 mt-1">Risques corriges depuis le dernier diagnostic</p>
              <ul className="mt-2 space-y-1 text-xs text-emerald-900 max-h-40 overflow-y-auto">
                {resolus.length === 0 ? <li className="italic text-gray-500">Aucun</li> : resolus.map((r, i) => (
                  <li key={`res-${i}-${r.question}`} className="border-l-2 border-emerald-400 pl-2">{r.titre}</li>
                ))}
              </ul>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3" data-testid="risques-persistants">
              <p className="text-xs font-bold text-amber-700 uppercase">⚠ Persistants ({persistants.length})</p>
              <p className="text-[10px] text-amber-600 mt-1">Risques encore presents</p>
              <ul className="mt-2 space-y-1 text-xs text-amber-900 max-h-40 overflow-y-auto">
                {persistants.length === 0 ? <li className="italic text-gray-500">Aucun</li> : persistants.map((r, i) => (
                  <li key={`per-${i}-${r.question}`} className="border-l-2 border-amber-400 pl-2">{r.titre}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Themes table */}
          <div>
            <h4 className="text-sm font-bold text-[#1A3622] mb-2">Progression par theme</h4>
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-[#F5F7F2] text-[#1A3622]">
                  <tr>
                    <th className="text-left px-3 py-2">Theme</th>
                    <th className="text-right px-3 py-2">Precedent</th>
                    <th className="text-right px-3 py-2">Actuel</th>
                    <th className="text-right px-3 py-2">Delta</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(themes).map(([theme, t]) => (
                    <tr key={theme} className="border-t hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium">{theme}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{t.score_previous}%</td>
                      <td className="px-3 py-2 text-right font-semibold">{t.score_current}%</td>
                      <td className={`px-3 py-2 text-right font-bold ${t.delta > 0 ? 'text-emerald-600' : (t.delta < 0 ? 'text-red-600' : 'text-gray-400')}`}>
                        {t.delta > 0 ? '+' : ''}{t.delta}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="px-6 py-3 border-t bg-gray-50 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm border rounded-md hover:bg-gray-100">Fermer</button>
        </div>
      </div>
    </div>
  );
};

export default RisquesDashboard;

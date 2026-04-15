import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tokenService } from '../../services/tokenService';
import { toast } from 'sonner';
import {
  Play, Loader2, Home, ChevronRight, CheckCircle2, XCircle,
  Minus, ArrowRight, ArrowLeft, Download, AlertTriangle, Award,
  Plus, Clock, Shield
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const CONF_STYLES = {
  C: { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700', label: 'Conforme' },
  NC: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700', label: 'Non conforme' },
  NA: { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700', label: 'Non applicable' },
};

const SimulationAuditPage = () => {
  const navigate = useNavigate();
  const [simulations, setSimulations] = useState([]);
  const [activeSim, setActiveSim] = useState(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showResult, setShowResult] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => { loadList(); }, []);

  const loadList = async () => {
    try {
      const token = tokenService.getToken();
      const res = await fetch(`${API}/api/simulation-audit/list`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setSimulations(data.simulations || []);
    } catch { toast.error('Erreur'); }
    finally { setLoading(false); }
  };

  const startSimulation = async (form) => {
    try {
      const token = tokenService.getToken();
      const res = await fetch(`${API}/api/simulation-audit/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      setActiveSim(data.simulation);
      setCurrentIdx(0);
      setShowCreate(false);
      toast.success('Simulation demarree');
      loadList();
    } catch { toast.error('Erreur'); }
  };

  const loadSimulation = async (simId) => {
    try {
      const token = tokenService.getToken();
      const res = await fetch(`${API}/api/simulation-audit/${simId}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setActiveSim(data.simulation);
      // Find first unevaluated
      const idx = (data.simulation?.evaluations || []).findIndex(e => !e.conformite);
      setCurrentIdx(idx >= 0 ? idx : 0);
    } catch { toast.error('Erreur'); }
  };

  const evaluateClause = async (conformite, observations) => {
    if (!activeSim) return;
    const ev = activeSim.evaluations[currentIdx];
    setSaving(true);
    try {
      const token = tokenService.getToken();
      const res = await fetch(`${API}/api/simulation-audit/${activeSim.simulation_id}/evaluate`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ clause_id: ev.clause_id, conformite, observations }),
      });
      const data = await res.json();
      // Update local state
      const updated = { ...activeSim };
      updated.evaluations[currentIdx].conformite = conformite;
      updated.evaluations[currentIdx].observations = observations;
      updated.score = data.score;
      setActiveSim(updated);
      // Auto-advance
      if (currentIdx < activeSim.evaluations.length - 1) {
        setCurrentIdx(currentIdx + 1);
      }
    } catch { toast.error('Erreur sauvegarde'); }
    finally { setSaving(false); }
  };

  const completeSimulation = async () => {
    try {
      const token = tokenService.getToken();
      const res = await fetch(`${API}/api/simulation-audit/${activeSim.simulation_id}/complete`, {
        method: 'PUT', headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setShowResult(data.resultat);
      loadList();
    } catch { toast.error('Erreur'); }
  };

  const downloadPDF = async (simId) => {
    try {
      const token = tokenService.getToken();
      const res = await fetch(`${API}/api/simulation-audit/${simId}/rapport/pdf`, { headers: { Authorization: `Bearer ${token}` } });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'rapport_simulation_audit.pdf'; a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF telecharge');
    } catch { toast.error('Erreur'); }
  };

  // ─── RESULT VIEW ───
  if (showResult) {
    const r = showResult;
    const vColors = { FAVORABLE: 'text-emerald-600 bg-emerald-50 border-emerald-200', 'FAVORABLE AVEC RESERVES': 'text-amber-600 bg-amber-50 border-amber-200', DEFAVORABLE: 'text-red-600 bg-red-50 border-red-200' };
    return (
      <div className="min-h-screen bg-[#FAF9F6]" data-testid="simulation-result">
        <Header navigate={navigate} />
        <div className="max-w-[900px] mx-auto px-6 py-8">
          {/* Verdict */}
          <div className={`border rounded-md p-8 text-center mb-8 ${vColors[r.verdict] || vColors.DEFAVORABLE}`} data-testid="verdict-card">
            <Award className="h-12 w-12 mx-auto mb-3" strokeWidth={1} />
            <p className="text-2xl font-bold mb-2" data-testid="verdict-text">{r.verdict}</p>
            <p className="text-sm">{r.verdict_detail}</p>
          </div>

          {/* Score */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8" data-testid="result-kpis">
            <MiniStat label="Score" value={`${r.score}%`} color={r.score >= 80 ? 'text-emerald-600' : 'text-amber-600'} />
            <MiniStat label="Evaluees" value={`${r.evaluees}/${r.total_clauses}`} />
            <MiniStat label="Conformes" value={r.conformes} color="text-emerald-600" />
            <MiniStat label="NC Majeures" value={r.nc_majeures} color="text-red-600" />
            <MiniStat label="NC Mineures" value={r.nc_mineures} color="text-amber-600" />
          </div>

          {/* Recommandations */}
          {r.recommandations?.length > 0 && (
            <div className="bg-white border border-[#E5E5E0] rounded-md overflow-hidden mb-6" data-testid="recommandations">
              <div className="px-5 py-4 border-b border-[#E5E5E0]">
                <h3 className="text-sm font-semibold text-[#1A3622]">Recommandations ({r.recommandations.length})</h3>
              </div>
              <div className="divide-y divide-[#E5E5E0]">
                {r.recommandations.map((rec, i) => (
                  <div key={i} className="px-5 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono font-bold text-[#1A3622]">{rec.clause}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${rec.type === 'Majeure' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{rec.type}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${rec.priorite === 'haute' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>Priorite {rec.priorite}</span>
                    </div>
                    <p className="text-xs text-[#374151]">{rec.recommandation}</p>
                    {rec.observations && <p className="text-[10px] text-[#6B7280] mt-1">Obs: {rec.observations}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => { setShowResult(null); setActiveSim(null); }} className="flex-1 px-4 py-2 text-sm border border-[#E5E5E0] rounded-md hover:bg-[#F3F4F6]">Retour</button>
            <button onClick={() => downloadPDF(activeSim.simulation_id)} className="flex-1 px-4 py-2 text-sm bg-[#1A3622] text-white rounded-md hover:bg-[#112417] flex items-center justify-center gap-2" data-testid="btn-download-pdf">
              <Download className="h-4 w-4" /> Rapport PDF
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── ACTIVE SIMULATION ───
  if (activeSim) {
    const evaluations = activeSim.evaluations || [];
    const current = evaluations[currentIdx];
    const evaluated = evaluations.filter(e => e.conformite).length;
    const progress = Math.round(evaluated / evaluations.length * 100);

    return (
      <div className="min-h-screen bg-[#FAF9F6]" data-testid="simulation-active">
        <Header navigate={navigate} />
        <div className="max-w-[900px] mx-auto px-6 py-6">
          {/* Progress */}
          <div className="bg-white border border-[#E5E5E0] rounded-md p-4 mb-6" data-testid="sim-progress">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#1A3622]">Progression: {evaluated}/{evaluations.length} clauses</span>
              <span className="text-sm font-bold text-[#1A3622]">Score: {activeSim.score || 0}%</span>
            </div>
            <div className="w-full bg-[#F3F4F6] rounded-full h-2.5 overflow-hidden">
              <div className="h-full rounded-full bg-[#065F46] transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            {/* Mini clause indicators */}
            <div className="flex gap-0.5 mt-3 flex-wrap">
              {evaluations.map((e, i) => (
                <button key={i} onClick={() => setCurrentIdx(i)} className={`w-5 h-5 rounded text-[8px] font-bold flex items-center justify-center transition-all ${
                  i === currentIdx ? 'ring-2 ring-[#1A3622] ring-offset-1' : ''
                } ${e.conformite === 'C' ? 'bg-emerald-500 text-white' : e.conformite === 'NC' ? 'bg-red-500 text-white' : e.conformite === 'NA' ? 'bg-amber-400 text-white' : 'bg-[#E5E5E0] text-[#6B7280]'}`}
                  data-testid={`clause-dot-${i}`}>
                  {i + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Current Clause */}
          {current && <ClauseCard clause={current} index={currentIdx} total={evaluations.length} onEvaluate={evaluateClause} saving={saving} />}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <button onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))} disabled={currentIdx === 0} className="flex items-center gap-2 px-4 py-2 text-sm border border-[#E5E5E0] rounded-md hover:bg-[#F3F4F6] disabled:opacity-30" data-testid="btn-prev">
              <ArrowLeft className="h-3.5 w-3.5" /> Precedent
            </button>
            <div className="flex gap-2">
              {evaluated === evaluations.length && (
                <button onClick={completeSimulation} className="px-5 py-2 text-sm bg-[#D4AF37] text-white rounded-md hover:bg-[#B8941F] font-medium flex items-center gap-2" data-testid="btn-complete">
                  <Award className="h-4 w-4" /> Voir le resultat
                </button>
              )}
              <button onClick={() => { setActiveSim(null); loadList(); }} className="px-4 py-2 text-sm border border-[#E5E5E0] rounded-md hover:bg-[#F3F4F6]" data-testid="btn-quit">Quitter</button>
            </div>
            <button onClick={() => setCurrentIdx(Math.min(evaluations.length - 1, currentIdx + 1))} disabled={currentIdx === evaluations.length - 1} className="flex items-center gap-2 px-4 py-2 text-sm border border-[#E5E5E0] rounded-md hover:bg-[#F3F4F6] disabled:opacity-30" data-testid="btn-next">
              Suivant <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── LIST VIEW ───
  return (
    <div className="min-h-screen bg-[#FAF9F6]" data-testid="simulation-list">
      <Header navigate={navigate} />
      <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-semibold text-[#1A3622]">Simulations d'audit</h2>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-[#1A3622] text-white rounded-md text-sm font-medium hover:bg-[#112417]" data-testid="btn-new-sim">
            <Play className="h-4 w-4" /> Nouvelle simulation
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-[#1A3622]" /></div>
        ) : simulations.length === 0 ? (
          <div className="bg-white border border-[#E5E5E0] rounded-md p-16 text-center" data-testid="empty-state">
            <Shield className="h-16 w-16 text-[#D4AF37] mx-auto mb-4" strokeWidth={1} />
            <h3 className="text-lg font-bold text-[#1A3622] mb-2">Simulation d'Audit Blanc</h3>
            <p className="text-sm text-[#6B7280] mb-6 max-w-md mx-auto">Jouez un audit blanc interactif, clause par clause. Evaluez chaque exigence et obtenez un verdict avec des recommandations.</p>
            <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1A3622] text-white rounded-md text-sm font-medium hover:bg-[#112417]">
              <Play className="h-4 w-4" /> Demarrer
            </button>
          </div>
        ) : (
          <div className="space-y-3" data-testid="sim-list">
            {simulations.map(s => (
              <div key={s.simulation_id} className="bg-white border border-[#E5E5E0] rounded-md px-5 py-4 flex items-center justify-between" data-testid={`sim-${s.simulation_id?.slice(0, 8)}`}>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-[#1A3622]">{s.titre}</p>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${s.statut === 'termine' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {s.statut === 'termine' ? 'Termine' : 'En cours'}
                    </span>
                    {s.score > 0 && <span className="text-xs font-bold text-[#1A3622]">{s.score}%</span>}
                  </div>
                  <p className="text-[10px] text-[#6B7280]">{s.auditeur && `Auditeur: ${s.auditeur} | `}Date: {s.created_at?.slice(0, 10)}</p>
                  {s.resultat && (
                    <p className={`text-[10px] font-bold mt-1 ${s.resultat.verdict === 'FAVORABLE' ? 'text-emerald-600' : s.resultat.verdict?.includes('RESERVES') ? 'text-amber-600' : 'text-red-600'}`}>
                      Verdict: {s.resultat.verdict}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {s.statut === 'en_cours' && (
                    <button onClick={() => loadSimulation(s.simulation_id)} className="px-3 py-1.5 bg-[#1A3622] text-white rounded-md text-xs font-medium hover:bg-[#112417] flex items-center gap-1" data-testid={`btn-resume-${s.simulation_id?.slice(0, 8)}`}>
                      <Play className="h-3 w-3" /> Reprendre
                    </button>
                  )}
                  {s.statut === 'termine' && (
                    <>
                      <button onClick={() => { loadSimulation(s.simulation_id).then(() => setShowResult(s.resultat)); setActiveSim(s); setShowResult(s.resultat); }} className="px-3 py-1.5 bg-[#E8F0EA] text-[#1A3622] rounded-md text-xs font-medium" data-testid={`btn-results-${s.simulation_id?.slice(0, 8)}`}>
                        Resultats
                      </button>
                      <button onClick={() => downloadPDF(s.simulation_id)} className="p-1.5 rounded hover:bg-[#F3F4F6]" data-testid={`btn-pdf-${s.simulation_id?.slice(0, 8)}`}>
                        <Download className="h-4 w-4 text-[#1A3622]" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && <CreateModal onSubmit={startSimulation} onClose={() => setShowCreate(false)} />}
    </div>
  );
};

const ClauseCard = ({ clause, index, total, onEvaluate, saving }) => {
  const [obs, setObs] = useState(clause.observations || '');
  const style = clause.conformite ? CONF_STYLES[clause.conformite] : null;

  return (
    <div className={`border rounded-md overflow-hidden ${style ? `${style.bg} ${style.border}` : 'bg-white border-[#E5E5E0]'}`} data-testid="clause-card">
      <div className="px-5 py-4 border-b border-[#E5E5E0]/50">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-[#1A3622] bg-white/70 px-2 py-0.5 rounded">{clause.clause_id}</span>
            <span className="text-[10px] font-bold text-[#6B7280]">{clause.section}</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${clause.type === 'Majeure' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{clause.type}</span>
          </div>
          <span className="text-xs text-[#9CA3AF]">{index + 1} / {total}</span>
        </div>
        <h3 className="text-sm font-semibold text-[#1A3622]">{clause.titre}</h3>
      </div>
      <div className="p-5 bg-white/50">
        {/* Display the exigence info from reference */}
        <div className="mb-4">
          <p className="text-[10px] font-bold uppercase text-[#9CA3AF] mb-1">Module lie</p>
          <p className="text-xs text-[#6B7280] capitalize">{clause.module?.replace(/_/g, ' ')}</p>
        </div>

        {/* Observations */}
        <div className="mb-4">
          <label className="block text-[10px] font-bold uppercase text-[#9CA3AF] mb-1">Observations</label>
          <textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} placeholder="Notes de l'auditeur..." className="w-full px-3 py-2 text-xs border border-[#E5E5E0] rounded-md resize-none bg-white" data-testid="input-observations" />
        </div>

        {/* Evaluation buttons */}
        <div className="flex gap-3" data-testid="eval-buttons">
          <button onClick={() => onEvaluate('C', obs)} disabled={saving} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-md text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors" data-testid="btn-conforme">
            <CheckCircle2 className="h-4 w-4" /> Conforme
          </button>
          <button onClick={() => onEvaluate('NC', obs)} disabled={saving} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors" data-testid="btn-non-conforme">
            <XCircle className="h-4 w-4" /> Non conforme
          </button>
          <button onClick={() => onEvaluate('NA', obs)} disabled={saving} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 text-white rounded-md text-sm font-medium hover:bg-amber-600 disabled:opacity-50 transition-colors" data-testid="btn-na">
            <Minus className="h-4 w-4" /> NA
          </button>
        </div>
      </div>
    </div>
  );
};

const Header = ({ navigate }) => (
  <div className="bg-[#1A3622]">
    <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-6">
      <div className="flex items-center gap-2 text-white/50 text-xs mb-3">
        <button onClick={() => navigate('/cooperative/dashboard')} className="hover:text-white"><Home className="h-3.5 w-3.5" /></button>
        <ChevronRight className="h-3 w-3" />
        <button onClick={() => navigate('/cooperative/ars1000-readiness')} className="hover:text-white">Readiness</button>
        <ChevronRight className="h-3 w-3" />
        <span className="text-white/80">Simulation d'Audit</span>
      </div>
      <h1 className="text-xl font-bold text-white tracking-tight" data-testid="page-title">Simulation d'Audit Blanc ARS 1000</h1>
      <p className="text-sm text-white/60 mt-1">Evaluez chaque clause, obtenez un verdict et des recommandations</p>
    </div>
  </div>
);

const CreateModal = ({ onSubmit, onClose }) => {
  const [form, setForm] = useState({ titre: "Simulation d'audit ARS 1000", auditeur: '' });
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-testid="create-sim-modal">
      <div className="bg-white rounded-md w-full max-w-md">
        <div className="px-5 py-4 border-b border-[#E5E5E0] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#1A3622]">Demarrer une simulation</h3>
          <button onClick={onClose} className="text-[#6B7280] hover:text-[#111827] text-xl">&times;</button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="p-5 space-y-3">
          <Fld label="Titre" value={form.titre} onChange={(v) => setForm({...form, titre: v})} testid="input-titre" />
          <Fld label="Auditeur simulant" value={form.auditeur} onChange={(v) => setForm({...form, auditeur: v})} testid="input-auditeur" />
          <p className="text-[10px] text-[#6B7280]">17 clauses seront evaluees couvrant Organisation, Gouvernance, Formation, PDC, Tracabilite, Audit, Social et Environnement.</p>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm border border-[#E5E5E0] rounded-md hover:bg-[#F3F4F6]">Annuler</button>
            <button type="submit" className="flex-1 px-4 py-2 text-sm bg-[#1A3622] text-white rounded-md hover:bg-[#112417] flex items-center justify-center gap-2" data-testid="btn-start-sim">
              <Play className="h-4 w-4" /> Demarrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const MiniStat = ({ label, value, color = 'text-[#111827]' }) => (
  <div className="bg-white border border-[#E5E5E0] rounded-md p-3 text-center">
    <p className="text-[9px] uppercase font-bold text-[#9CA3AF]">{label}</p>
    <p className={`text-lg font-bold ${color}`}>{value}</p>
  </div>
);

const Fld = ({ label, value, onChange, testid }) => (
  <div>
    <label className="block text-xs font-medium text-[#374151] mb-1">{label}</label>
    <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#E5E5E0] rounded-md focus:outline-none focus:border-[#1A3622]" data-testid={testid} />
  </div>
);

export default SimulationAuditPage;

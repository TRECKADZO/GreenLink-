import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tokenService } from '../../../services/tokenService';
import { toast } from 'sonner';
import {
  ClipboardCheck, Shield, AlertTriangle, TrendingUp,
  Loader2, Home, ChevronRight, Plus, CheckCircle2, XCircle,
  Clock, FileText, BarChart3, ArrowRight
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const AuditDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => { loadDashboard(); }, []);

  const loadDashboard = async () => {
    try {
      const token = tokenService.getToken();
      const res = await fetch(`${API}/api/audit/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erreur');
      setData(await res.json());
    } catch {
      toast.error('Erreur chargement du dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async (form) => {
    try {
      const token = tokenService.getToken();
      const res = await fetch(`${API}/api/audit/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Erreur');
      toast.success('Session d\'audit creee');
      setShowCreate(false);
      loadDashboard();
    } catch {
      toast.error('Erreur creation');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#1A3622]" />
      </div>
    );
  }

  if (!data?.has_session) {
    return (
      <div className="min-h-screen bg-[#FAF9F6]" data-testid="audit-dashboard">
        <HeaderBar navigate={navigate} />
        <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-16 text-center">
          <ClipboardCheck className="h-16 w-16 text-[#D4AF37] mx-auto mb-4" strokeWidth={1} />
          <h2 className="text-xl font-bold text-[#1A3622] mb-2">Aucune session d'audit</h2>
          <p className="text-sm text-[#6B7280] mb-6">Creez votre premiere session pour commencer l'audit interne ARS 1000.</p>
          <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1A3622] text-white rounded-md text-sm font-medium hover:bg-[#112417]" data-testid="btn-create-first-session">
            <Plus className="h-4 w-4" /> Creer une session d'audit
          </button>
          {showCreate && <CreateSessionModal onSubmit={handleCreateSession} onClose={() => setShowCreate(false)} />}
        </div>
      </div>
    );
  }

  const g = data.global || {};
  const nc = data.non_conformites || {};
  const session = data.session || {};
  const sections = data.par_section || [];
  const ars1 = data.resultats?.["ARS 1000-1"] || {};
  const ars2 = data.resultats?.["ARS 1000-2"] || {};

  return (
    <div className="min-h-screen bg-[#FAF9F6]" data-testid="audit-dashboard">
      <HeaderBar navigate={navigate} session={session} onNewSession={() => setShowCreate(true)} />

      <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-8">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8" data-testid="audit-kpis">
          <KPICard icon={ClipboardCheck} label="Exigences" value={g.total || 0} />
          <KPICard icon={CheckCircle2} label="Conformes" value={g.conformes || 0} color="text-emerald-600" />
          <KPICard icon={XCircle} label="Non-conformes" value={g.non_conformes || 0} color="text-red-600" />
          <KPICard icon={TrendingUp} label="Taux conform." value={`${g.taux_conformite || 0}%`} color={g.taux_conformite >= 80 ? "text-emerald-600" : "text-amber-600"} />
          <KPICard icon={AlertTriangle} label="NC ouvertes" value={nc.ouvertes || 0} color="text-red-600" />
        </div>

        {/* Resultats ARS 1000-1 & ARS 1000-2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8" data-testid="resultats-normes">
          <NormeCard norme="ARS 1000-1" stats={ars1} />
          <NormeCard norme="ARS 1000-2" stats={ars2} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Par section */}
          <div className="lg:col-span-8">
            <div className="bg-white border border-[#E5E5E0] rounded-md overflow-hidden" data-testid="sections-card">
              <div className="px-5 py-4 border-b border-[#E5E5E0]">
                <h3 className="text-sm font-semibold text-[#1A3622]">Conformite par section</h3>
              </div>
              <div className="divide-y divide-[#E5E5E0]">
                {sections.length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm text-[#6B7280]">Aucune donnee. Commencez l'audit.</div>
                ) : sections.map((s, i) => (
                  <div key={i} className="px-5 py-3 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[#111827] truncate">{s.section}</p>
                      <p className="text-[10px] text-[#6B7280]">{s.norme} | {s.conformes}C / {s.non_conformes}NC sur {s.total}</p>
                    </div>
                    <div className="w-32 bg-[#F3F4F6] rounded-full h-2 overflow-hidden">
                      <div className="h-full rounded-full" style={{
                        width: `${s.taux}%`,
                        backgroundColor: s.taux >= 80 ? '#065F46' : s.taux >= 50 ? '#D4AF37' : '#C25E30',
                      }} />
                    </div>
                    <span className="text-xs font-bold text-[#374151] w-10 text-right">{s.taux}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Actions rapides */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white border border-[#E5E5E0] rounded-md overflow-hidden" data-testid="audit-quick-actions">
              <div className="px-5 py-4 border-b border-[#E5E5E0]">
                <h3 className="text-sm font-semibold text-[#1A3622]">Actions</h3>
              </div>
              <div className="p-4 space-y-2">
                <ActionBtn label="Checklist d'audit" onClick={() => navigate('/cooperative/audit/checklist')} testid="btn-checklist" />
                <ActionBtn label="Non-conformites" onClick={() => navigate('/cooperative/audit/non-conformites')} testid="btn-nc" />
                <ActionBtn label="Rapports d'audit" onClick={() => navigate('/cooperative/audit/reports')} testid="btn-reports" />
                <ActionBtn label="Revue de direction" onClick={() => navigate('/cooperative/audit/revue')} testid="btn-revue" />
              </div>
            </div>

            {/* NC Summary */}
            <div className="bg-white border border-[#E5E5E0] rounded-md overflow-hidden" data-testid="nc-summary">
              <div className="px-5 py-4 border-b border-[#E5E5E0]">
                <h3 className="text-sm font-semibold text-[#1A3622]">Non-conformites</h3>
              </div>
              <div className="p-5 space-y-3">
                <StatRow label="Ouvertes" value={nc.ouvertes || 0} color="text-red-600" />
                <StatRow label="En cours" value={nc.en_cours || 0} color="text-amber-600" />
                <StatRow label="Resolues" value={nc.resolues || 0} color="text-emerald-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {showCreate && <CreateSessionModal onSubmit={handleCreateSession} onClose={() => setShowCreate(false)} />}
    </div>
  );
};

const HeaderBar = ({ navigate, session, onNewSession }) => (
  <div className="bg-[#1A3622] relative overflow-hidden">
    <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-6 relative">
      <div className="flex items-center gap-2 text-white/50 text-xs mb-3">
        <button onClick={() => navigate('/cooperative/dashboard')} className="hover:text-white" data-testid="nav-coop-dashboard"><Home className="h-3.5 w-3.5" /></button>
        <ChevronRight className="h-3 w-3" />
        <span className="text-white/80">Audit & Conformite</span>
      </div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight" data-testid="audit-title">Audit & Conformite</h1>
          <p className="text-sm text-white/60 mt-1">
            {session?.titre ? `${session.titre} | ${session.campagne} | ${session.niveau_certification}` : 'Module d\'audit interne ARS 1000'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Checklist', path: '/cooperative/audit/checklist', testid: 'nav-checklist' },
            { label: 'Non-conformites', path: '/cooperative/audit/non-conformites', testid: 'nav-nc' },
            { label: 'Rapports', path: '/cooperative/audit/reports', testid: 'nav-reports' },
            { label: 'Revue direction', path: '/cooperative/audit/revue', testid: 'nav-revue' },
          ].map(item => (
            <button key={item.path} onClick={() => navigate(item.path)} className="px-3 py-1.5 text-xs font-medium rounded-md bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-colors border border-white/10" data-testid={item.testid}>
              {item.label}
            </button>
          ))}
          {onNewSession && (
            <button onClick={onNewSession} className="px-3 py-1.5 text-xs font-medium rounded-md bg-white text-[#1A3622] hover:bg-white/90" data-testid="btn-new-session">
              <Plus className="h-3 w-3 inline mr-1" />Nouvelle session
            </button>
          )}
        </div>
      </div>
    </div>
  </div>
);

const KPICard = ({ icon: Icon, label, value, color = "text-[#111827]" }) => (
  <div className="bg-white border border-[#E5E5E0] rounded-md p-5" data-testid={`kpi-${label.toLowerCase().replace(/[\s.]+/g, '-')}`}>
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-md bg-[#E8F0EA] flex items-center justify-center">
        <Icon className="h-4 w-4 text-[#1A3622]" strokeWidth={1.5} />
      </div>
      <div>
        <p className="text-[10px] tracking-[0.05em] uppercase font-bold text-[#6B7280]">{label}</p>
        <p className={`text-lg font-bold ${color}`}>{value}</p>
      </div>
    </div>
  </div>
);

const NormeCard = ({ norme, stats }) => {
  const applicable = (stats.total || 0) - (stats.na || 0);
  const progress = stats.taux_conformite || 0;
  return (
    <div className="bg-white border border-[#E5E5E0] rounded-md p-5" data-testid={`norme-card-${norme.replace(/\s+/g, '-')}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[#1A3622]">{norme}</h3>
        <span className="text-lg font-bold" style={{ color: progress >= 80 ? '#065F46' : progress >= 50 ? '#92400E' : '#C25E30' }}>
          {progress}%
        </span>
      </div>
      <div className="w-full bg-[#F3F4F6] rounded-full h-2.5 mb-3">
        <div className="h-full rounded-full transition-all duration-700" style={{
          width: `${progress}%`,
          backgroundColor: progress >= 80 ? '#065F46' : progress >= 50 ? '#D4AF37' : '#C25E30',
        }} />
      </div>
      <div className="grid grid-cols-4 gap-2 text-center">
        <MiniStat label="Total" value={stats.total || 0} />
        <MiniStat label="C" value={stats.conformes || 0} color="text-emerald-600" />
        <MiniStat label="NC" value={stats.non_conformes || 0} color="text-red-600" />
        <MiniStat label="NA" value={stats.na || 0} color="text-amber-600" />
      </div>
    </div>
  );
};

const MiniStat = ({ label, value, color = "text-[#374151]" }) => (
  <div>
    <p className="text-[9px] uppercase font-bold text-[#9CA3AF]">{label}</p>
    <p className={`text-sm font-bold ${color}`}>{value}</p>
  </div>
);

const StatRow = ({ label, value, color }) => (
  <div className="flex items-center justify-between">
    <span className="text-xs text-[#374151]">{label}</span>
    <span className={`text-sm font-bold ${color}`}>{value}</span>
  </div>
);

const ActionBtn = ({ label, onClick, testid }) => (
  <button onClick={onClick} className="w-full flex items-center justify-between px-3 py-2.5 rounded-md text-left hover:bg-[#F3F4F6] transition-colors group" data-testid={testid}>
    <span className="text-xs font-medium text-[#374151]">{label}</span>
    <ArrowRight className="h-3.5 w-3.5 text-[#9CA3AF] group-hover:text-[#1A3622]" strokeWidth={1.5} />
  </button>
);

const CreateSessionModal = ({ onSubmit, onClose }) => {
  const [form, setForm] = useState({
    titre: 'Audit interne ARS 1000', campagne: '2025-2026', auditeur: '',
    date_debut: new Date().toISOString().slice(0, 10), niveau_certification: 'Bronze', notes: '',
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-testid="create-session-modal">
      <div className="bg-white rounded-md w-full max-w-lg">
        <div className="px-5 py-4 border-b border-[#E5E5E0] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#1A3622]">Nouvelle session d'audit</h3>
          <button onClick={onClose} className="text-[#6B7280] hover:text-[#111827] text-xl">&times;</button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="p-5 space-y-4">
          <Field label="Titre" value={form.titre} onChange={(v) => setForm({...form, titre: v})} testid="input-titre" />
          <Field label="Auditeur" value={form.auditeur} onChange={(v) => setForm({...form, auditeur: v})} testid="input-auditeur" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Campagne" value={form.campagne} onChange={(v) => setForm({...form, campagne: v})} testid="input-campagne" />
            <Field label="Date de debut" value={form.date_debut} type="date" onChange={(v) => setForm({...form, date_debut: v})} testid="input-date" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1">Niveau de certification</label>
            <select value={form.niveau_certification} onChange={(e) => setForm({...form, niveau_certification: e.target.value})}
              className="w-full px-3 py-2 text-sm border border-[#E5E5E0] rounded-md" data-testid="select-niveau">
              <option value="Bronze">Bronze</option>
              <option value="Argent">Argent</option>
              <option value="Or">Or</option>
            </select>
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

const Field = ({ label, value, onChange, type = 'text', testid }) => (
  <div>
    <label className="block text-xs font-medium text-[#374151] mb-1">{label}</label>
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 text-sm border border-[#E5E5E0] rounded-md focus:outline-none focus:border-[#1A3622]" data-testid={testid} />
  </div>
);

export default AuditDashboard;

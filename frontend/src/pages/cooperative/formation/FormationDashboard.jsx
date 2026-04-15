import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tokenService } from '../../../services/tokenService';
import { toast } from 'sonner';
import {
  GraduationCap, Users, AlertTriangle, CheckCircle2, Clock,
  Loader2, Home, ChevronRight, Plus, ArrowRight, FileText, XCircle
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const FormationDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const token = tokenService.getToken();
      const res = await fetch(`${API}/api/formation/dashboard`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Erreur');
      setData(await res.json());
    } catch { toast.error('Erreur chargement'); }
    finally { setLoading(false); }
  };

  const createProgramme = async () => {
    try {
      const token = tokenService.getToken();
      const res = await fetch(`${API}/api/formation/programmes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ titre: 'Programme annuel de formation', campagne: '2025-2026' }),
      });
      if (!res.ok) throw new Error('Erreur');
      toast.success('Programme cree avec themes obligatoires');
      load();
    } catch { toast.error('Erreur creation'); }
  };

  if (loading) return <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#1A3622]" /></div>;

  const kpis = data?.kpis || {};
  const themes = data?.theme_coverage || [];
  const alertes = data?.alertes || [];

  return (
    <div className="min-h-screen bg-[#FAF9F6]" data-testid="formation-dashboard">
      <div className="bg-[#1A3622] relative overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-6 relative">
          <div className="flex items-center gap-2 text-white/50 text-xs mb-3">
            <button onClick={() => navigate('/cooperative/dashboard')} className="hover:text-white" data-testid="nav-home"><Home className="h-3.5 w-3.5" /></button>
            <ChevronRight className="h-3 w-3" />
            <span className="text-white/80">Formation & Sensibilisation</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight" data-testid="page-title">Formation & Sensibilisation</h1>
              <p className="text-sm text-white/60 mt-1">Clauses 7.3, 7.4, 12.2-12.10, 13.1-13.5</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Programme', path: '/cooperative/formation/programme', testid: 'nav-programme' },
                { label: 'Sessions', path: '/cooperative/formation/sessions', testid: 'nav-sessions' },
                { label: 'PV & Presence', path: '/cooperative/formation/pv', testid: 'nav-pv' },
                { label: 'Attestations', path: '/cooperative/formation/attestations', testid: 'nav-attestations' },
              ].map(item => (
                <button key={item.path} onClick={() => navigate(item.path)} className="px-3 py-1.5 text-xs font-medium rounded-md bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-colors border border-white/10" data-testid={item.testid}>{item.label}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-8">
        {!data?.has_programme ? (
          <div className="text-center py-16">
            <GraduationCap className="h-16 w-16 text-[#D4AF37] mx-auto mb-4" strokeWidth={1} />
            <h2 className="text-xl font-bold text-[#1A3622] mb-2">Aucun programme de formation</h2>
            <p className="text-sm text-[#6B7280] mb-6">Creez le programme annuel pour pre-remplir les 12 themes obligatoires ARS 1000.</p>
            <button onClick={createProgramme} className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1A3622] text-white rounded-md text-sm font-medium hover:bg-[#112417]" data-testid="btn-create-programme">
              <Plus className="h-4 w-4" /> Creer le programme annuel
            </button>
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-8" data-testid="kpi-strip">
              <KPI label="Sessions" value={kpis.total_sessions || 0} icon={GraduationCap} />
              <KPI label="Completees" value={kpis.completees || 0} icon={CheckCircle2} color="text-emerald-600" />
              <KPI label="Planifiees" value={kpis.planifiees || 0} icon={Clock} color="text-amber-600" />
              <KPI label="En retard" value={kpis.en_retard || 0} icon={XCircle} color="text-red-600" />
              <KPI label="Participants" value={kpis.total_participants || 0} icon={Users} />
              <KPI label="PV generes" value={kpis.total_pv || 0} icon={FileText} />
              <KPI label="Couverture" value={`${kpis.taux_couverture || 0}%`} icon={CheckCircle2} color={kpis.taux_couverture >= 80 ? "text-emerald-600" : "text-amber-600"} />
            </div>

            {/* Alertes */}
            {alertes.length > 0 && (
              <div className="space-y-2 mb-6" data-testid="alertes">
                {alertes.slice(0, 5).map((a, i) => (
                  <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-md border ${a.severity === 'error' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                    <AlertTriangle className={`h-4 w-4 flex-shrink-0 ${a.severity === 'error' ? 'text-red-600' : 'text-amber-600'}`} />
                    <span className={`text-sm ${a.severity === 'error' ? 'text-red-800' : 'text-amber-800'}`}>{a.message}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Theme coverage */}
              <div className="lg:col-span-8">
                <div className="bg-white border border-[#E5E5E0] rounded-md overflow-hidden" data-testid="theme-coverage">
                  <div className="px-5 py-4 border-b border-[#E5E5E0] flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-[#1A3622]">Couverture des themes obligatoires ({kpis.themes_complets || 0}/{kpis.themes_total || 12})</h3>
                    <button onClick={() => navigate('/cooperative/formation/sessions')} className="text-xs text-[#1A3622] hover:underline" data-testid="btn-voir-sessions">Voir tout</button>
                  </div>
                  <div className="divide-y divide-[#E5E5E0]">
                    {themes.map((t, i) => (
                      <div key={t.code} className="px-5 py-3 flex items-center gap-4">
                        <StatusDot status={t.statut} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-[#111827] truncate">{t.titre}</p>
                          <p className="text-[10px] text-[#6B7280]">Clause {t.clause} | {t.sessions} session(s) | {t.participants} participant(s)</p>
                        </div>
                        <StatusBadge status={t.statut} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-white border border-[#E5E5E0] rounded-md overflow-hidden" data-testid="quick-actions">
                  <div className="px-5 py-4 border-b border-[#E5E5E0]">
                    <h3 className="text-sm font-semibold text-[#1A3622]">Actions rapides</h3>
                  </div>
                  <div className="p-4 space-y-2">
                    <ActionBtn label="Nouvelle session" onClick={() => navigate('/cooperative/formation/sessions?create=1')} testid="btn-new-session" />
                    <ActionBtn label="PV & Presence" onClick={() => navigate('/cooperative/formation/pv')} testid="btn-pv" />
                    <ActionBtn label="Attestations" onClick={() => navigate('/cooperative/formation/attestations')} testid="btn-attestations" />
                    <ActionBtn label="Exporter Excel" onClick={() => {
                      const token = tokenService.getToken();
                      window.open(`${API}/api/formation/export/excel?token=${token}`, '_blank');
                    }} testid="btn-export" />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const KPI = ({ label, value, icon: Icon, color = "text-[#111827]" }) => (
  <div className="bg-white border border-[#E5E5E0] rounded-md p-4" data-testid={`kpi-${label.toLowerCase().replace(/[\s.]+/g, '-')}`}>
    <div className="flex items-center gap-2">
      <Icon className={`h-4 w-4 ${color}`} strokeWidth={1.5} />
      <div>
        <p className="text-[9px] uppercase font-bold text-[#9CA3AF]">{label}</p>
        <p className={`text-sm font-bold ${color}`}>{value}</p>
      </div>
    </div>
  </div>
);

const StatusDot = ({ status }) => {
  const colors = { complete: 'bg-emerald-500', planifie: 'bg-amber-400', en_cours: 'bg-amber-400', non_planifie: 'bg-red-400' };
  return <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${colors[status] || 'bg-gray-300'}`} />;
};

const StatusBadge = ({ status }) => {
  const styles = { complete: 'bg-emerald-50 text-emerald-700', planifie: 'bg-amber-50 text-amber-700', en_cours: 'bg-amber-50 text-amber-700', non_planifie: 'bg-red-50 text-red-700' };
  const labels = { complete: 'Complete', planifie: 'Planifie', en_cours: 'En cours', non_planifie: 'Non planifie' };
  return <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${styles[status] || 'bg-gray-100 text-gray-600'}`}>{labels[status] || status}</span>;
};

const ActionBtn = ({ label, onClick, testid }) => (
  <button onClick={onClick} className="w-full flex items-center justify-between px-3 py-2.5 rounded-md text-left hover:bg-[#F3F4F6] transition-colors group" data-testid={testid}>
    <span className="text-xs font-medium text-[#374151]">{label}</span>
    <ArrowRight className="h-3.5 w-3.5 text-[#9CA3AF] group-hover:text-[#1A3622]" strokeWidth={1.5} />
  </button>
);

export default FormationDashboard;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tokenService } from '../../../services/tokenService';
import { toast } from 'sonner';
import {
  Building2, Users, Shield, AlertTriangle, CheckCircle2,
  Loader2, Home, ChevronRight, ArrowRight, FileText, TrendingUp
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const GouvernanceDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const token = tokenService.getToken();
      const res = await fetch(`${API}/api/gouvernance/dashboard`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Erreur');
      setData(await res.json());
    } catch { toast.error('Erreur chargement'); }
    finally { setLoading(false); }
  };

  if (loading) return <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#1A3622]" /></div>;

  const kpis = data?.kpis || {};
  const alertes = data?.alertes || [];
  const moduleData = data?.module_data || {};
  const derniereRevue = data?.derniere_revue;

  return (
    <div className="min-h-screen bg-[#FAF9F6]" data-testid="gouvernance-dashboard">
      <div className="bg-[#1A3622] relative overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-6 relative">
          <div className="flex items-center gap-2 text-white/50 text-xs mb-3">
            <button onClick={() => navigate('/cooperative/dashboard')} className="hover:text-white" data-testid="nav-home"><Home className="h-3.5 w-3.5" /></button>
            <ChevronRight className="h-3 w-3" />
            <span className="text-white/80">Gouvernance & Direction</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-3" data-testid="page-title">
                <button onClick={() => navigate('/cooperative/dashboard')} className="w-8 h-8 rounded-md bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors" data-testid="btn-retour"><ChevronRight className="h-4 w-4 text-white rotate-180" /></button>
                Gouvernance & Direction
              </h1>
              <p className="text-sm text-white/60 mt-1">Clauses 5.1, 5.2, 5.3, 9.3 ARS 1000</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Organigramme', path: '/cooperative/gouvernance/organigramme', testid: 'nav-organigramme' },
                { label: 'Politique', path: '/cooperative/gouvernance/politique', testid: 'nav-politique' },
                { label: 'Revue direction', path: '/cooperative/gouvernance/revue', testid: 'nav-revue' },
              ].map(item => (
                <button key={item.path} onClick={() => navigate(item.path)} className="px-3 py-1.5 text-xs font-medium rounded-md bg-white/10 text-white/80 hover:bg-white/20 transition-colors border border-white/10" data-testid={item.testid}>{item.label}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-8">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8" data-testid="kpi-strip">
          <KPI icon={Users} label="Postes pourvus" value={`${kpis.postes_pourvus || 0}/${kpis.postes_total || 7}`} sub={`${kpis.taux_postes || 0}%`} color={kpis.taux_postes >= 80 ? "text-emerald-600" : "text-amber-600"} />
          <KPI icon={FileText} label="Politiques" value={kpis.politiques || 0} sub={`${kpis.politiques_validees || 0} validee(s)`} />
          <KPI icon={Shield} label="Revues" value={kpis.revues || 0} sub={`${kpis.revues_validees || 0} validee(s)`} />
          <KPI icon={TrendingUp} label="Conformite gouvernance" value={`${kpis.conformite_globale || 0}%`} color={kpis.conformite_globale >= 80 ? "text-emerald-600" : kpis.conformite_globale >= 50 ? "text-amber-600" : "text-red-600"} />
        </div>

        {/* Alertes */}
        {alertes.length > 0 && (
          <div className="space-y-2 mb-6" data-testid="alertes">
            {alertes.map((a, i) => (
              <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-md border ${a.severity === 'error' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                <AlertTriangle className={`h-4 w-4 flex-shrink-0 ${a.severity === 'error' ? 'text-red-600' : 'text-amber-600'}`} />
                <span className={`text-sm ${a.severity === 'error' ? 'text-red-800' : 'text-amber-800'}`}>{a.message}</span>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Module data cards */}
          <div className="lg:col-span-8 space-y-6">
            {/* Donnees des modules */}
            <div className="bg-white border border-[#E5E5E0] rounded-md overflow-hidden" data-testid="module-data">
              <div className="px-5 py-4 border-b border-[#E5E5E0]">
                <h3 className="text-sm font-semibold text-[#1A3622]">Donnees des modules (auto-collectees)</h3>
              </div>
              <div className="p-5 space-y-3">
                {[
                  { label: 'PDC', value: moduleData.pdc_summary, icon: FileText },
                  { label: 'Tracabilite', value: moduleData.trace_summary, icon: Shield },
                  { label: 'Formation', value: moduleData.formation_summary, icon: Users },
                  { label: 'Audit', value: moduleData.audit_summary, icon: CheckCircle2 },
                ].map((m, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5 bg-[#F9FAFB] rounded">
                    <m.icon className="h-4 w-4 text-[#1A3622] flex-shrink-0" strokeWidth={1.5} />
                    <div>
                      <p className="text-[10px] font-bold uppercase text-[#9CA3AF]">{m.label}</p>
                      <p className="text-xs text-[#374151]">{m.value || 'Aucune donnee'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Derniere revue */}
            {derniereRevue && (
              <div className="bg-white border border-[#E5E5E0] rounded-md overflow-hidden" data-testid="derniere-revue">
                <div className="px-5 py-4 border-b border-[#E5E5E0]">
                  <h3 className="text-sm font-semibold text-[#1A3622]">Derniere revue de direction</h3>
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-[#111827]">{derniereRevue.titre}</p>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${derniereRevue.statut === 'validee' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {derniereRevue.statut === 'validee' ? 'Validee' : 'Brouillon'}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#6B7280]">Date: {derniereRevue.date_revue} | Par: {derniereRevue.created_by}</p>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white border border-[#E5E5E0] rounded-md overflow-hidden" data-testid="quick-actions">
              <div className="px-5 py-4 border-b border-[#E5E5E0]">
                <h3 className="text-sm font-semibold text-[#1A3622]">Actions</h3>
              </div>
              <div className="p-4 space-y-2">
                <ActionBtn label="Organigramme & Roles" onClick={() => navigate('/cooperative/gouvernance/organigramme')} testid="btn-organigramme" />
                <ActionBtn label="Politique de management" onClick={() => navigate('/cooperative/gouvernance/politique')} testid="btn-politique" />
                <ActionBtn label="Revue de direction" onClick={() => navigate('/cooperative/gouvernance/revue')} testid="btn-revue" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const KPI = ({ icon: Icon, label, value, sub, color = "text-[#111827]" }) => (
  <div className="bg-white border border-[#E5E5E0] rounded-md p-5" data-testid={`kpi-${label.toLowerCase().replace(/[\s\/&]+/g, '-')}`}>
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-md bg-[#E8F0EA] flex items-center justify-center"><Icon className="h-4 w-4 text-[#1A3622]" strokeWidth={1.5} /></div>
      <div>
        <p className="text-[10px] tracking-[0.05em] uppercase font-bold text-[#6B7280]">{label}</p>
        <p className={`text-lg font-bold ${color}`}>{value}</p>
        {sub && <p className="text-[10px] text-[#6B7280]">{sub}</p>}
      </div>
    </div>
  </div>
);

const ActionBtn = ({ label, onClick, testid }) => (
  <button onClick={onClick} className="w-full flex items-center justify-between px-3 py-2.5 rounded-md text-left hover:bg-[#F3F4F6] transition-colors group" data-testid={testid}>
    <span className="text-xs font-medium text-[#374151]">{label}</span>
    <ArrowRight className="h-3.5 w-3.5 text-[#9CA3AF] group-hover:text-[#1A3622]" strokeWidth={1.5} />
  </button>
);

export default GouvernanceDashboard;

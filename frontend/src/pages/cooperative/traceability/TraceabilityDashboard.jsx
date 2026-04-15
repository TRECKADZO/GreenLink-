import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tokenService } from '../../../services/tokenService';
import { toast } from 'sonner';
import {
  Package, Shield, AlertTriangle, TrendingUp, Loader2,
  ArrowRight, CheckCircle2, XCircle, Clock, BarChart3,
  Home, ChevronRight
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const TraceabilityDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const token = tokenService.getToken();
      const res = await fetch(`${API}/api/traceability/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erreur');
      const json = await res.json();
      setData(json);
    } catch {
      toast.error('Erreur chargement du dashboard tracabilite');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#1A3622]" />
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const parEtape = data?.par_etape || [];
  const alertes = data?.alertes || [];
  const recentEvents = data?.recent_events || [];

  return (
    <div className="min-h-screen bg-[#FAF9F6]" data-testid="traceability-dashboard">
      {/* Header */}
      <div className="bg-[#1A3622] relative overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-6 relative">
          <div className="flex items-center gap-2 text-white/50 text-xs mb-3">
            <button onClick={() => navigate('/cooperative/dashboard')} className="hover:text-white transition-colors" data-testid="nav-coop-dashboard">
              <Home className="h-3.5 w-3.5" />
            </button>
            <ChevronRight className="h-3 w-3" />
            <span className="text-white/80">Tracabilite ARS 1000-2</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/cooperative/dashboard')} className="w-8 h-8 rounded-md bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors" data-testid="btn-retour">
                <ChevronRight className="h-4 w-4 text-white rotate-180" />
              </button>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight" data-testid="trace-title">
                  Tracabilite du Cacao
                </h1>
                <p className="text-sm text-white/60 mt-1">Conformite ARS 1000-2 - Clauses 11 a 16</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Flux du Cacao', path: '/cooperative/traceability/flow', testid: 'nav-flow' },
                { label: 'Segregation', path: '/cooperative/traceability/segregation', testid: 'nav-segregation' },
                { label: 'Rapports', path: '/cooperative/traceability/reports', testid: 'nav-reports' },
                { label: 'Objectifs', path: '/cooperative/traceability/objectives', testid: 'nav-objectives' },
              ].map(item => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="px-3 py-1.5 text-xs font-medium rounded-md bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-colors border border-white/10"
                  data-testid={item.testid}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-8">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8" data-testid="kpi-strip">
          <KPICard icon={Package} label="Total Lots" value={kpis.total_lots || 0} />
          <KPICard icon={Shield} label="Lots Certifies" value={kpis.lots_certifies || 0} accent="#065F46" />
          <KPICard icon={CheckCircle2} label="Taux Conformite" value={`${kpis.taux_conformite || 0}%`} accent="#065F46" />
          <KPICard icon={TrendingUp} label="Volume Total" value={`${(kpis.volume_total_kg || 0).toLocaleString('fr-FR')} kg`} />
        </div>

        {/* Alertes */}
        {alertes.length > 0 && (
          <div className="mb-6 space-y-2" data-testid="alertes-section">
            {alertes.slice(0, 5).map((a, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-md">
                <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
                <span className="text-sm text-red-800">{a.message}</span>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Repartition par etape */}
          <div className="lg:col-span-8">
            <div className="bg-white border border-[#E5E5E0] rounded-md overflow-hidden" data-testid="etapes-card">
              <div className="px-5 py-4 border-b border-[#E5E5E0]">
                <h3 className="text-sm font-semibold text-[#1A3622]">Repartition par etape</h3>
              </div>
              <div className="p-5">
                <div className="space-y-3">
                  {parEtape.map((e, i) => (
                    <div key={e.etape} className="flex items-center gap-4">
                      <div className="w-40 text-xs font-medium text-[#374151] truncate">{e.label}</div>
                      <div className="flex-1 bg-[#F3F4F6] rounded-full h-6 relative overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${kpis.total_lots > 0 ? Math.max(4, (e.lots / kpis.total_lots) * 100) : 0}%`,
                            backgroundColor: i < 3 ? '#1A3622' : i < 5 ? '#D4AF37' : '#C25E30',
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-end pr-3">
                          <span className="text-[10px] font-bold text-[#374151]">{e.lots} lots / {e.quantite_kg.toLocaleString('fr-FR')} kg</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Evenements recents */}
            <div className="bg-white border border-[#E5E5E0] rounded-md overflow-hidden mt-6" data-testid="recent-events">
              <div className="px-5 py-4 border-b border-[#E5E5E0]">
                <h3 className="text-sm font-semibold text-[#1A3622]">Evenements recents</h3>
              </div>
              <div className="divide-y divide-[#E5E5E0]">
                {recentEvents.length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm text-[#6B7280]">
                    Aucun evenement enregistre. Commencez par creer un lot.
                  </div>
                ) : (
                  recentEvents.map((evt, i) => (
                    <div key={i} className="px-5 py-3 flex items-center justify-between hover:bg-[#F9FAFB] transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${evt.event?.conforme ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <div>
                          <p className="text-xs font-medium text-[#111827]">
                            {evt.lot_code} - {evt.event?.etape_label}
                          </p>
                          <p className="text-[10px] text-[#6B7280]">{evt.farmer_name}</p>
                        </div>
                      </div>
                      <span className="text-[10px] text-[#9CA3AF]">
                        {evt.event?.date_evenement ? new Date(evt.event.date_evenement).toLocaleDateString('fr-FR') : ''}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            {/* Quick Stats */}
            <div className="bg-white border border-[#E5E5E0] rounded-md overflow-hidden" data-testid="quick-stats">
              <div className="px-5 py-4 border-b border-[#E5E5E0]">
                <h3 className="text-sm font-semibold text-[#1A3622]">Statistiques rapides</h3>
              </div>
              <div className="p-5 space-y-4">
                <StatRow label="Lots en cours" value={kpis.lots_en_cours || 0} icon={Clock} />
                <StatRow label="Non conformes" value={kpis.lots_non_conformes || 0} icon={XCircle} color="text-red-600" />
                <StatRow label="Certifies ARS" value={`${kpis.taux_certification || 0}%`} icon={Shield} color="text-emerald-600" />
              </div>
            </div>

            {/* Actions rapides */}
            <div className="bg-white border border-[#E5E5E0] rounded-md overflow-hidden" data-testid="quick-actions">
              <div className="px-5 py-4 border-b border-[#E5E5E0]">
                <h3 className="text-sm font-semibold text-[#1A3622]">Actions rapides</h3>
              </div>
              <div className="p-4 space-y-2">
                <ActionButton label="Nouveau lot" onClick={() => navigate('/cooperative/traceability/flow')} testid="btn-new-lot" />
                <ActionButton label="Verifier segregation" onClick={() => navigate('/cooperative/traceability/segregation')} testid="btn-check-segregation" />
                <ActionButton label="Exporter rapport" onClick={() => navigate('/cooperative/traceability/reports')} testid="btn-export-report" />
                <ActionButton label="Voir objectifs ARS" onClick={() => navigate('/cooperative/traceability/objectives')} testid="btn-objectives" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const KPICard = ({ icon: Icon, label, value, accent }) => (
  <div className="bg-white border border-[#E5E5E0] rounded-md p-5" data-testid={`kpi-${label.toLowerCase().replace(/\s+/g, '-')}`}>
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-md bg-[#E8F0EA] flex items-center justify-center">
        <Icon className="h-4 w-4 text-[#1A3622]" strokeWidth={1.5} />
      </div>
      <div>
        <p className="text-[10px] tracking-[0.05em] uppercase font-bold text-[#6B7280]">{label}</p>
        <p className="text-lg font-bold text-[#111827]" style={accent ? { color: accent } : {}}>{value}</p>
      </div>
    </div>
  </div>
);

const StatRow = ({ label, value, icon: Icon, color = 'text-[#1A3622]' }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <Icon className={`h-3.5 w-3.5 ${color}`} strokeWidth={1.5} />
      <span className="text-xs text-[#374151]">{label}</span>
    </div>
    <span className={`text-sm font-bold ${color}`}>{value}</span>
  </div>
);

const ActionButton = ({ label, onClick, testid }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center justify-between px-3 py-2.5 rounded-md text-left hover:bg-[#F3F4F6] transition-colors group"
    data-testid={testid}
  >
    <span className="text-xs font-medium text-[#374151]">{label}</span>
    <ArrowRight className="h-3.5 w-3.5 text-[#9CA3AF] group-hover:text-[#1A3622] transition-colors" strokeWidth={1.5} />
  </button>
);

export default TraceabilityDashboard;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tokenService } from '../../../services/tokenService';
import { toast } from 'sonner';
import {
  Users, UserPlus, AlertTriangle, CheckCircle2, Clock,
  Loader2, Home, ChevronRight, ArrowRight, XCircle, MapPin
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const MembresDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const token = tokenService.getToken();
      const res = await fetch(`${API}/api/membres/dashboard`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Erreur');
      setData(await res.json());
    } catch { toast.error('Erreur chargement'); }
    finally { setLoading(false); }
  };

  if (loading) return <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#1A3622]" /></div>;

  const kpis = data?.kpis || {};
  const villages = data?.par_village || [];
  const perimetre = data?.perimetre;

  return (
    <div className="min-h-screen bg-[#FAF9F6]" data-testid="membres-dashboard">
      <div className="bg-[#1A3622]">
        <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-6">
          <div className="flex items-center gap-2 text-white/50 text-xs mb-3">
            <button onClick={() => navigate('/cooperative/dashboard')} className="hover:text-white" data-testid="nav-home"><Home className="h-3.5 w-3.5" /></button>
            <ChevronRight className="h-3 w-3" />
            <span className="text-white/80">Membres & Enregistrement</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight" data-testid="page-title">Membres & Enregistrement</h1>
              <p className="text-sm text-white/60 mt-1">Clauses 4.2.2, 4.2.3, 4.3 ARS 1000</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Registre', path: '/cooperative/membres/registre', testid: 'nav-registre' },
                { label: 'Adhesion', path: '/cooperative/membres/adhesion', testid: 'nav-adhesion' },
                { label: 'Perimetre SM', path: '/cooperative/membres/perimetre', testid: 'nav-perimetre' },
              ].map(item => (
                <button key={item.path} onClick={() => navigate(item.path)} className="px-3 py-1.5 text-xs font-medium rounded-md bg-white/10 text-white/80 hover:bg-white/20 transition-colors border border-white/10" data-testid={item.testid}>{item.label}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-8">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-8" data-testid="kpi-strip">
          <KPI label="Total" value={kpis.total || 0} icon={Users} />
          <KPI label="Actifs" value={kpis.valides || 0} icon={CheckCircle2} color="text-emerald-600" />
          <KPI label="En cours" value={kpis.en_cours || 0} icon={Clock} color="text-amber-600" />
          <KPI label="A valider" value={kpis.en_attente_validation || 0} icon={AlertTriangle} color="text-orange-600" />
          <KPI label="Retraits" value={kpis.retrait || 0} icon={XCircle} color="text-[#6B7280]" />
          <KPI label="Hommes" value={kpis.hommes || 0} icon={Users} />
          <KPI label="Femmes" value={kpis.femmes || 0} icon={Users} color="text-purple-600" />
          <KPI label="Hectares" value={kpis.total_hectares || 0} icon={MapPin} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Villages */}
          <div className="lg:col-span-8">
            <div className="bg-white border border-[#E5E5E0] rounded-md overflow-hidden" data-testid="villages-card">
              <div className="px-5 py-4 border-b border-[#E5E5E0]">
                <h3 className="text-sm font-semibold text-[#1A3622]">Repartition par village</h3>
              </div>
              <div className="p-5">
                {villages.length === 0 ? (
                  <p className="text-xs text-[#6B7280] text-center py-4">Aucun membre enregistre via le nouveau processus ARS 1000.</p>
                ) : (
                  <div className="space-y-2">
                    {villages.map((v, i) => (
                      <div key={i} className="flex items-center gap-4">
                        <div className="w-28 text-xs font-medium text-[#374151] truncate">{v.village}</div>
                        <div className="flex-1 bg-[#F3F4F6] rounded-full h-5 relative overflow-hidden">
                          <div className="h-full rounded-full bg-[#1A3622] transition-all duration-700" style={{ width: `${kpis.total > 0 ? Math.max(4, (v.count / kpis.total) * 100) : 0}%` }} />
                          <span className="absolute inset-0 flex items-center justify-end pr-3 text-[10px] font-bold text-[#374151]">{v.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Perimetre SM */}
            {perimetre && (
              <div className="bg-white border border-[#E5E5E0] rounded-md overflow-hidden mt-6" data-testid="perimetre-card">
                <div className="px-5 py-4 border-b border-[#E5E5E0]">
                  <h3 className="text-sm font-semibold text-[#1A3622]">Perimetre d'application du SM (clause 4.3)</h3>
                </div>
                <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div><span className="text-[10px] font-bold text-[#9CA3AF] block">Producteurs</span>{perimetre.producteurs_inclus}</div>
                  <div><span className="text-[10px] font-bold text-[#9CA3AF] block">Superficie</span>{perimetre.superficie_totale_ha} ha</div>
                  <div><span className="text-[10px] font-bold text-[#9CA3AF] block">Valide par</span>{perimetre.valide_par || '-'}</div>
                  <div><span className="text-[10px] font-bold text-[#9CA3AF] block">Date</span>{perimetre.date_validation || '-'}</div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white border border-[#E5E5E0] rounded-md overflow-hidden" data-testid="quick-actions">
              <div className="px-5 py-4 border-b border-[#E5E5E0]"><h3 className="text-sm font-semibold text-[#1A3622]">Actions</h3></div>
              <div className="p-4 space-y-2">
                <ActionBtn label="Nouvelle adhesion" onClick={() => navigate('/cooperative/membres/adhesion')} testid="btn-adhesion" />
                <ActionBtn label="Base de donnees" onClick={() => navigate('/cooperative/membres/registre')} testid="btn-registre" />
                <ActionBtn label="Perimetre SM" onClick={() => navigate('/cooperative/membres/perimetre')} testid="btn-perimetre" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const KPI = ({ label, value, icon: Icon, color = "text-[#111827]" }) => (
  <div className="bg-white border border-[#E5E5E0] rounded-md p-3">
    <div className="flex items-center gap-2">
      <Icon className={`h-3.5 w-3.5 ${color}`} strokeWidth={1.5} />
      <div>
        <p className="text-[9px] uppercase font-bold text-[#9CA3AF]">{label}</p>
        <p className={`text-sm font-bold ${color}`}>{value}</p>
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

export default MembresDashboard;

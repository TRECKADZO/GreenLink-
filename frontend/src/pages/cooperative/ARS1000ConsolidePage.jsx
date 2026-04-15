import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tokenService } from '../../services/tokenService';
import { toast } from 'sonner';
import {
  Shield, Loader2, Home, ChevronRight, Download,
  CheckCircle2, AlertTriangle, Clock, ArrowRight,
  Users, GraduationCap, Building2, FileText, Package, ClipboardCheck
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const MODULE_ICONS = {
  membres: Users,
  gouvernance: Building2,
  formation: GraduationCap,
  pdc: FileText,
  tracabilite: Package,
  audit: ClipboardCheck,
};

const MODULE_PATHS = {
  membres: '/cooperative/membres',
  gouvernance: '/cooperative/gouvernance',
  formation: '/cooperative/formation',
  pdc: '/cooperative/pdc-v2',
  tracabilite: '/cooperative/traceability',
  audit: '/cooperative/audit',
};

const ARS1000ConsolidePage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const token = tokenService.getToken();
      const res = await fetch(`${API}/api/ars1000-consolide/dashboard`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Erreur');
      setData(await res.json());
    } catch { toast.error('Erreur chargement'); }
    finally { setLoading(false); }
  };

  const handleExportPDF = async () => {
    try {
      const token = tokenService.getToken();
      const res = await fetch(`${API}/api/ars1000-consolide/export/pdf`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Erreur');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'readiness_ars1000.pdf'; a.click();
      URL.revokeObjectURL(url);
      toast.success('Rapport telecharge');
    } catch { toast.error('Erreur export'); }
  };

  if (loading) return <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#1A3622]" /></div>;

  const scoreGlobal = data?.score_global || 0;
  const readiness = data?.readiness || '';
  const readinessColor = data?.readiness_color || 'amber';
  const modules = data?.modules || {};
  const actions = data?.actions_prioritaires || [];

  const colorMap = { emerald: { bg: 'bg-emerald-600', text: 'text-emerald-600', light: 'bg-emerald-50' }, amber: { bg: 'bg-amber-500', text: 'text-amber-600', light: 'bg-amber-50' }, red: { bg: 'bg-red-500', text: 'text-red-600', light: 'bg-red-50' } };
  const rc = colorMap[readinessColor] || colorMap.amber;

  return (
    <div className="min-h-screen bg-[#FAF9F6]" data-testid="ars1000-consolide">
      {/* Header */}
      <div className="bg-[#1A3622]">
        <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-6">
          <div className="flex items-center gap-2 text-white/50 text-xs mb-3">
            <button onClick={() => navigate('/cooperative/dashboard')} className="hover:text-white" data-testid="nav-home"><Home className="h-3.5 w-3.5" /></button>
            <ChevronRight className="h-3 w-3" />
            <span className="text-white/80">Readiness ARS 1000</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight" data-testid="page-title">Readiness ARS 1000</h1>
              <p className="text-sm text-white/60 mt-1">Score de conformite consolide - 6 modules</p>
            </div>
            <button onClick={handleExportPDF} className="flex items-center gap-2 px-4 py-2 bg-white text-[#1A3622] rounded-md text-sm font-medium hover:bg-white/90" data-testid="btn-export-pdf">
              <Download className="h-4 w-4" /> Rapport PDF
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-8">
        {/* Score global */}
        <div className={`${rc.light} border border-[#E5E5E0] rounded-md p-6 md:p-8 mb-8`} data-testid="score-global">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="relative w-24 h-24">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#E5E5E0" strokeWidth="8" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke={readinessColor === 'emerald' ? '#065F46' : readinessColor === 'amber' ? '#D4AF37' : '#C25E30'} strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={`${scoreGlobal * 2.64} 264`} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-2xl font-bold ${rc.text}`} data-testid="score-value">{scoreGlobal}%</span>
                </div>
              </div>
              <div>
                <p className="text-[10px] tracking-[0.1em] uppercase font-bold text-[#6B7280]">Readiness ARS 1000</p>
                <p className={`text-xl font-bold ${rc.text}`} data-testid="readiness-label">{readiness}</p>
                <p className="text-xs text-[#6B7280] mt-1">Base sur {Object.keys(modules).length} modules strategiques</p>
              </div>
            </div>
            <div className="flex gap-3">
              {scoreGlobal >= 80 && <StatusChip icon={CheckCircle2} label="Pret pour l'audit" color="emerald" />}
              {scoreGlobal >= 50 && scoreGlobal < 80 && <StatusChip icon={Clock} label="En progression" color="amber" />}
              {scoreGlobal < 50 && <StatusChip icon={AlertTriangle} label="Actions requises" color="red" />}
            </div>
          </div>
        </div>

        {/* Modules grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8" data-testid="modules-grid">
          {Object.entries(modules).map(([key, mod]) => (
            <ModuleCard key={key} moduleKey={key} mod={mod} navigate={navigate} />
          ))}
        </div>

        {/* Actions prioritaires */}
        {actions.length > 0 && (
          <div className="bg-white border border-[#E5E5E0] rounded-md overflow-hidden" data-testid="actions-prioritaires">
            <div className="px-5 py-4 border-b border-[#E5E5E0]">
              <h3 className="text-sm font-semibold text-[#1A3622]">Actions prioritaires pour l'audit</h3>
            </div>
            <div className="divide-y divide-[#E5E5E0]">
              {actions.map((a, i) => (
                <button key={i} onClick={() => navigate(MODULE_PATHS[a.module_key] || '/cooperative/dashboard')}
                  className="w-full px-5 py-3 flex items-center gap-4 hover:bg-[#F9FAFB] transition-colors text-left group" data-testid={`action-${i}`}>
                  <span className="w-6 h-6 rounded-full bg-[#E8F0EA] flex items-center justify-center text-[10px] font-bold text-[#1A3622] flex-shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[#111827]">{a.action}</p>
                    <p className="text-[10px] text-[#6B7280]">{a.module}</p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-[#9CA3AF] group-hover:text-[#1A3622] flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ModuleCard = ({ moduleKey, mod, navigate }) => {
  const Icon = MODULE_ICONS[moduleKey] || Shield;
  const path = MODULE_PATHS[moduleKey] || '/cooperative/dashboard';
  const score = mod.score || 0;
  const barColor = score >= 80 ? '#065F46' : score >= 50 ? '#D4AF37' : '#C25E30';

  return (
    <button onClick={() => navigate(path)} className="bg-white border border-[#E5E5E0] rounded-md overflow-hidden text-left hover:border-[#1A3622]/30 transition-colors group" data-testid={`module-${moduleKey}`}>
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-[#E8F0EA] flex items-center justify-center">
              <Icon className="h-4 w-4 text-[#1A3622]" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#1A3622]">{mod.titre}</p>
              <p className="text-[9px] text-[#9CA3AF]">{mod.clauses}</p>
            </div>
          </div>
          <span className="text-lg font-bold" style={{ color: barColor }}>{score}%</span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-[#F3F4F6] rounded-full h-2 mb-3 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${score}%`, backgroundColor: barColor }} />
        </div>

        {/* Indicateurs */}
        <div className="space-y-1.5">
          {mod.indicateurs?.map((ind, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-[10px] text-[#6B7280]">{ind.label}</span>
              <span className="text-[10px] font-bold text-[#374151]">{ind.valeur} / {ind.cible}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        {mod.actions?.length > 0 && (
          <div className="mt-3 pt-2 border-t border-[#E5E5E0]">
            {mod.actions.slice(0, 2).map((a, i) => (
              <p key={i} className="text-[10px] text-red-600 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 flex-shrink-0" /> {a}
              </p>
            ))}
          </div>
        )}
      </div>
    </button>
  );
};

const StatusChip = ({ icon: Icon, label, color }) => {
  const styles = { emerald: 'bg-emerald-100 text-emerald-700', amber: 'bg-amber-100 text-amber-700', red: 'bg-red-100 text-red-700' };
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md ${styles[color]}`}>
      <Icon className="h-3.5 w-3.5" />
      <span className="text-xs font-bold">{label}</span>
    </div>
  );
};

export default ARS1000ConsolidePage;

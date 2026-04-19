import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { tokenService } from '../../../services/tokenService';
import {
  Shield, Users, GraduationCap, Building2, FileText, Package,
  ClipboardCheck, AlertTriangle, Play, Loader2, ChevronRight,
  CheckCircle2, Clock, XCircle, ShieldCheck, Boxes
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const MODULE_CONFIG = [
  { key: 'readiness', title: 'Readiness ARS 1000', path: '/cooperative/ars1000-readiness', icon: Shield, apiPath: null, color: '#D4AF37' },
  { key: 'conformite', title: 'Conformite Globale', path: '/cooperative/ars1000', icon: ShieldCheck, apiPath: null, color: '#065F46' },
  { key: 'pdc', title: 'Tous les PDC', path: '/cooperative/pdc-v2', icon: FileText, apiPath: '/api/pdc-v2/stats/overview', color: '#1A3622' },
  { key: 'lots', title: 'Tracabilite Lots', path: '/cooperative/ars1000?tab=registres', icon: Boxes, apiPath: '/api/ars1000/lots/stats', color: '#065F46' },
  { key: 'membres', title: 'Membres', path: '/cooperative/membres', icon: Users, apiPath: '/api/membres/dashboard', color: '#065F46' },
  { key: 'gouvernance', title: 'Gouvernance', path: '/cooperative/gouvernance', icon: Building2, apiPath: '/api/gouvernance/dashboard', color: '#1A3622' },
  { key: 'formation', title: 'Formation', path: '/cooperative/formation', icon: GraduationCap, apiPath: '/api/formation/dashboard', color: '#065F46' },
  { key: 'risques', title: 'Risques & Durabilite', path: '/cooperative/risques', icon: AlertTriangle, apiPath: '/api/risques/dashboard', color: '#C25E30' },
  { key: 'audit', title: 'Audit & NC', path: '/cooperative/audit', icon: ClipboardCheck, apiPath: '/api/audit/dashboard', color: '#7C3AED' },
  { key: 'simulation', title: 'Simulation Audit', path: '/cooperative/simulation-audit', icon: Play, apiPath: null, color: '#D4AF37' },
];

export const ModulesARSGrid = () => {
  const navigate = useNavigate();
  const [moduleData, setModuleData] = useState({});
  const [loading, setLoading] = useState(true);

  const loadModules = useCallback(async () => {
    const token = tokenService.getToken();
    const results = {};

    // Load readiness score
    try {
      const res = await fetch(`${API}/api/ars1000-consolide/dashboard`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const d = await res.json();
        results.readiness = { score: d.score_global, label: d.readiness };
      }
    } catch (e) { console.error('Readiness fetch error:', e); }

    // Load individual modules in parallel
    const fetches = MODULE_CONFIG.filter(m => m.apiPath).map(async (mod) => {
      try {
        const res = await fetch(`${API}${mod.apiPath}`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const d = await res.json();
          results[mod.key] = extractKPI(mod.key, d);
        }
      } catch (e) { console.error(`Module ${mod.key} fetch error:`, e); }
    });

    await Promise.all(fetches);
    setModuleData(results);
    setLoading(false);
  }, []);

  useEffect(() => { loadModules(); }, [loadModules]);

  const extractKPI = (key, data) => {
    switch (key) {
      case 'certification': {
        const cert = data.certification || {};
        return { primary: cert.niveau || 'N/A', label: 'niveau', secondary: `${data.stats?.total_pdcs || 0} PDC` };
      }
      case 'pdc': return { primary: data.total || 0, label: 'PDC', secondary: `${data.valides || 0} valides` };
      case 'lots': return { primary: data.total || 0, label: 'lots', secondary: `${data.certifies || 0} certifies` };
      case 'membres': return { primary: data.kpis?.valides || 0, label: 'actifs', secondary: `${data.kpis?.total || 0} total` };
      case 'gouvernance': return { primary: `${data.kpis?.conformite_globale || 0}%`, label: 'conformite', secondary: `${data.kpis?.postes_pourvus || 0}/${data.kpis?.postes_total || 7} postes` };
      case 'formation': return { primary: data.kpis?.completees || 0, label: 'sessions', secondary: `${data.kpis?.taux_couverture || 0}% couverture` };
      case 'risques': return { primary: data.kpis?.total || 0, label: 'risques', secondary: `${data.kpis?.critiques || 0} critiques` };
      case 'audit': {
        const g = data.global || {};
        return { primary: `${g.taux_conformite || 0}%`, label: 'conformite', secondary: `${g.non_conformes || 0} NC` };
      }
      default: return { primary: '-', label: '', secondary: '' };
    }
  };

  return (
    <div data-testid="modules-ars-grid">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] tracking-[0.1em] uppercase font-bold text-[#9CA3AF]">Modules ARS 1000</p>
        <button onClick={() => navigate('/cooperative/ars1000-readiness')} className="text-[10px] text-[#1A3622] hover:underline font-medium" data-testid="btn-voir-readiness">
          Score global <ChevronRight className="h-3 w-3 inline" />
        </button>
      </div>

      {/* Readiness score bar */}
      {moduleData.readiness && (
        <button onClick={() => navigate('/cooperative/ars1000-readiness')} className="w-full bg-white border border-[#E5E5E0] rounded-md p-4 mb-4 hover:border-[#D4AF37]/50 transition-colors text-left" data-testid="readiness-bar">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-[#D4AF37]" strokeWidth={1.5} />
              <span className="text-xs font-semibold text-[#1A3622]">Readiness ARS 1000</span>
            </div>
            <span className="text-lg font-bold" style={{ color: moduleData.readiness.score >= 80 ? '#065F46' : moduleData.readiness.score >= 50 ? '#D4AF37' : '#C25E30' }}>
              {moduleData.readiness.score}%
            </span>
          </div>
          <div className="w-full bg-[#F3F4F6] rounded-full h-2 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-1000" style={{
              width: `${moduleData.readiness.score}%`,
              backgroundColor: moduleData.readiness.score >= 80 ? '#065F46' : moduleData.readiness.score >= 50 ? '#D4AF37' : '#C25E30',
            }} />
          </div>
          <p className="text-[10px] text-[#6B7280] mt-1">{moduleData.readiness.label}</p>
        </button>
      )}

      {/* Module cards grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {MODULE_CONFIG.filter(m => m.key !== 'readiness').map(mod => {
          const d = moduleData[mod.key];
          return (
            <button key={mod.key} onClick={() => navigate(mod.path)}
              className="bg-white border border-[#E5E5E0] rounded-md p-3 text-left hover:border-[#1A3622]/30 transition-colors group"
              data-testid={`module-card-${mod.key}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ backgroundColor: `${mod.color}15` }}>
                  <mod.icon className="h-3.5 w-3.5" style={{ color: mod.color }} strokeWidth={1.5} />
                </div>
                <span className="text-[10px] font-semibold text-[#374151] group-hover:text-[#1A3622] transition-colors">{mod.title}</span>
              </div>
              {d ? (
                <div>
                  <p className="text-sm font-bold text-[#111827]">{d.primary} <span className="text-[9px] font-normal text-[#9CA3AF]">{d.label}</span></p>
                  <p className="text-[9px] text-[#6B7280]">{d.secondary}</p>
                </div>
              ) : (
                <p className="text-[9px] text-[#9CA3AF]">{loading ? 'Chargement...' : 'Acceder'}</p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

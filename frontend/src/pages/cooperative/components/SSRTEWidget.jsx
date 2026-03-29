import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, AlertTriangle, Users, Eye, Lock, ChevronRight } from 'lucide-react';

const RiskBadge = ({ level, count, color, bg }) => (
  <div className={`p-2.5 rounded-md ${bg} text-center`}>
    <p className={`gl-heading text-lg font-bold ${color}`} data-testid={`ssrte-risk-${level}`}>{count}</p>
    <p className="text-[9px] tracking-[0.08em] uppercase font-bold text-[#6B7280] mt-0.5">{level}</p>
  </div>
);

export const SSRTEWidget = ({ ssrte, ici, features }) => {
  const navigate = useNavigate();
  const isLocked = !ssrte;
  const hasReports = ssrte?.has_full_reports;

  if (isLocked) {
    return (
      <div className="bg-white border border-[#E5E5E0] rounded-md overflow-hidden gl-animate-in gl-stagger-4" data-testid="ssrte-widget-locked">
        <div className="px-5 py-4 border-b border-[#E5E5E0]">
          <h3 className="gl-heading text-sm font-semibold text-[#1A3622] tracking-tight flex items-center gap-2">
            <Shield className="h-4 w-4" strokeWidth={1.5} />
            SSRTE & ICI
          </h3>
        </div>
        <div className="p-8 text-center">
          <Lock className="h-8 w-8 mx-auto mb-3 text-[#D4AF37]" strokeWidth={1.5} />
          <p className="text-sm font-medium text-[#374151]">Acces SSRTE non disponible</p>
          <p className="text-xs text-[#9CA3AF] mt-1">Passez au plan Starter pour les alertes SSRTE basiques</p>
          <button
            onClick={() => navigate('/#pricing')}
            className="mt-3 text-xs font-semibold text-[#1A3622] hover:underline flex items-center gap-1 mx-auto"
          >
            Voir les plans <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  }

  const totalRisk = (ssrte.risk_distribution.critique || 0) + (ssrte.risk_distribution.eleve || 0) +
                    (ssrte.risk_distribution.modere || 0) + (ssrte.risk_distribution.faible || 0);
  const criticalCount = (ssrte.risk_distribution.critique || 0) + (ssrte.risk_distribution.eleve || 0);

  return (
    <div className="bg-white border border-[#E5E5E0] rounded-md overflow-hidden gl-animate-in gl-stagger-4" data-testid="ssrte-widget">
      <div className="px-5 py-4 border-b border-[#E5E5E0] flex items-center justify-between">
        <div>
          <h3 className="gl-heading text-sm font-semibold text-[#1A3622] tracking-tight flex items-center gap-2">
            <Shield className="h-4 w-4" strokeWidth={1.5} />
            SSRTE & ICI
          </h3>
          <p className="text-[11px] text-[#6B7280] mt-0.5">
            Suivi travail des enfants — {ssrte.total_visits} visite(s)
          </p>
        </div>
        <button
          onClick={() => navigate('/cooperative/ssrte')}
          className="text-xs text-[#6B7280] hover:text-[#1A3622] font-medium transition-colors flex items-center gap-1"
          data-testid="ssrte-view-details"
        >
          <Eye className="h-3 w-3" strokeWidth={1.5} />
          Details
        </button>
      </div>
      <div className="p-5">
        {/* Top KPIs */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="p-3 bg-[#FAF9F6] rounded-md border border-[#E5E5E0] text-center">
            <p className="gl-heading text-2xl font-bold text-[#111827]" data-testid="ssrte-total-visits">{ssrte.total_visits}</p>
            <p className="text-[10px] tracking-[0.05em] uppercase font-bold text-[#6B7280] mt-0.5">Visites</p>
          </div>
          <div className={`p-3 rounded-md text-center ${criticalCount > 0 ? 'bg-[#C25E30]/5 border border-[#C25E30]/20' : 'bg-[#E8F0EA] border border-[#1A3622]/10'}`}>
            <p className={`gl-heading text-2xl font-bold ${criticalCount > 0 ? 'text-[#C25E30]' : 'text-[#1A3622]'}`} data-testid="ssrte-children">{ssrte.children_identified}</p>
            <p className="text-[10px] tracking-[0.05em] uppercase font-bold text-[#6B7280] mt-0.5">Enfants</p>
          </div>
          <div className="p-3 bg-[#FAF9F6] rounded-md border border-[#E5E5E0] text-center">
            <p className="gl-heading text-2xl font-bold text-[#111827]" data-testid="ssrte-coverage">{ssrte.coverage_rate}%</p>
            <p className="text-[10px] tracking-[0.05em] uppercase font-bold text-[#6B7280] mt-0.5">Couverture</p>
          </div>
        </div>

        {/* Risk Distribution */}
        <div className="mb-5">
          <p className="text-[10px] tracking-[0.08em] uppercase font-bold text-[#9CA3AF] mb-2">Niveaux de Risque</p>
          <div className="grid grid-cols-4 gap-2">
            <RiskBadge level="Critique" count={ssrte.risk_distribution.critique} color="text-[#B91C1C]" bg="bg-[#FEE2E2]" />
            <RiskBadge level="Eleve" count={ssrte.risk_distribution.eleve} color="text-[#C25E30]" bg="bg-[#C25E30]/5" />
            <RiskBadge level="Modere" count={ssrte.risk_distribution.modere} color="text-[#D4AF37]" bg="bg-[#FEF3C7]" />
            <RiskBadge level="Faible" count={ssrte.risk_distribution.faible} color="text-[#1A3622]" bg="bg-[#E8F0EA]" />
          </div>
        </div>

        {/* Coverage bar */}
        <div className="mb-5">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-[#6B7280] font-medium">Producteurs visites ({ssrte.unique_farmers_visited})</span>
            <span className="gl-mono font-medium text-[#1A3622]">{ssrte.coverage_rate}%</span>
          </div>
          <div className="w-full bg-[#F3F4F6] rounded-full h-1.5">
            <div className="h-1.5 rounded-full bg-[#1A3622] transition-all duration-500" style={{ width: `${Math.min(ssrte.coverage_rate, 100)}%` }} />
          </div>
        </div>

        {/* ICI Remediation (Pro+) */}
        {hasReports && ici && (
          <div className="p-3 bg-[#FAF9F6] rounded-md border border-[#E5E5E0]">
            <p className="text-[10px] tracking-[0.08em] uppercase font-bold text-[#9CA3AF] mb-2">Remediation ICI</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="gl-heading text-lg font-bold text-[#111827]" data-testid="ici-total-cases">{ici.total_cases}</p>
                <p className="text-[9px] text-[#6B7280] uppercase font-bold">Cas</p>
              </div>
              <div className="text-center">
                <p className="gl-heading text-lg font-bold text-[#1A3622]" data-testid="ici-resolved">{ici.resolved}</p>
                <p className="text-[9px] text-[#6B7280] uppercase font-bold">Resolus</p>
              </div>
              <div className="text-center">
                <p className="gl-heading text-lg font-bold text-[#D4AF37]" data-testid="ici-in-progress">{ici.in_progress}</p>
                <p className="text-[9px] text-[#6B7280] uppercase font-bold">En cours</p>
              </div>
            </div>
            {ici.total_cases > 0 && (
              <div className="mt-2">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#6B7280]">Taux remediation</span>
                  <span className="gl-mono font-medium text-[#1A3622]">{ici.resolution_rate}%</span>
                </div>
                <div className="w-full bg-[#F3F4F6] rounded-full h-1.5">
                  <div className="h-1.5 rounded-full bg-[#1A3622] transition-all duration-500" style={{ width: `${ici.resolution_rate}%` }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Upgrade prompt if no reports */}
        {!hasReports && (
          <div className="p-3 bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-md">
            <p className="text-[11px] text-[#92400E] leading-relaxed">
              <AlertTriangle className="h-3.5 w-3.5 inline mr-1" strokeWidth={1.5} />
              Passez au <strong>Pro</strong> pour les rapports SSRTE/ICI complets et le suivi de remediation.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

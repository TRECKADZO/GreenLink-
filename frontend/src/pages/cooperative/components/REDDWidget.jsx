import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Leaf, TreePine, TrendingUp, Eye, Lock, ChevronRight } from 'lucide-react';

const LevelBar = ({ label, count, total, color }) => {
  const pct = total > 0 ? Math.round(count / total * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-[#6B7280] w-24 truncate">{label}</span>
      <div className="flex-1 bg-[#F3F4F6] rounded-full h-1.5">
        <div className={`h-1.5 rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="gl-mono text-[10px] text-[#6B7280] w-6 text-right">{count}</span>
    </div>
  );
};

const PracticeBar = ({ label, pct }) => (
  <div className="space-y-1">
    <div className="flex justify-between text-[10px]">
      <span className="text-[#374151] font-medium">{label}</span>
      <span className="gl-mono text-[#1A3622] font-bold">{pct}%</span>
    </div>
    <div className="w-full bg-[#F3F4F6] rounded-full h-1.5">
      <div className="h-1.5 rounded-full bg-[#1A3622] transition-all duration-500" style={{ width: `${pct}%` }} />
    </div>
  </div>
);

export const REDDWidget = ({ redd }) => {
  const navigate = useNavigate();

  if (!redd) {
    return (
      <div className="bg-white border border-[#E5E5E0] rounded-md overflow-hidden gl-animate-in gl-stagger-3" data-testid="redd-widget-empty">
        <div className="px-5 py-4 border-b border-[#E5E5E0]">
          <h3 className="gl-heading text-sm font-semibold text-[#1A3622] tracking-tight flex items-center gap-2">
            <Leaf className="h-4 w-4" strokeWidth={1.5} />
            Durabilite & MRV
          </h3>
        </div>
        <div className="p-8 text-center">
          <TreePine className="h-8 w-8 mx-auto mb-3 text-[#9CA3AF]" strokeWidth={1.5} />
          <p className="text-sm font-medium text-[#374151]">Aucune donnee de suivi</p>
          <p className="text-xs text-[#9CA3AF] mt-1">Les donnees apparaitront apres les premieres visites terrain</p>
        </div>
      </div>
    );
  }

  const totalLevels = Object.values(redd.level_distribution || {}).reduce((a, b) => a + b, 0);
  const isAdvanced = redd?.is_advanced;
  const levels = [
    { label: 'Excellence', key: 'Excellence', color: 'bg-[#1A3622]' },
    { label: 'Avance', key: 'Avance', color: 'bg-[#065F46]' },
    { label: 'Intermediaire', key: 'Intermediaire', color: 'bg-[#D4AF37]' },
    { label: 'Debutant', key: 'Debutant', color: 'bg-[#C25E30]' },
    { label: 'Non conforme', key: 'Non conforme', color: 'bg-[#9CA3AF]' },
  ];

  return (
    <div className="bg-white border border-[#E5E5E0] rounded-md overflow-hidden gl-animate-in gl-stagger-3" data-testid="redd-widget">
      <div className="px-5 py-4 border-b border-[#E5E5E0] flex items-center justify-between">
        <div>
          <h3 className="gl-heading text-sm font-semibold text-[#1A3622] tracking-tight flex items-center gap-2">
            <Leaf className="h-4 w-4" strokeWidth={1.5} />
            Durabilite & MRV
          </h3>
          <p className="text-[11px] text-[#6B7280] mt-0.5">
            {isAdvanced ? 'Monitoring avance' : 'Vue simplifiee'} — {redd.total_visits} visite(s) terrain
          </p>
        </div>
        <button
          onClick={() => navigate('/cooperative/mrv')}
          className="text-xs text-[#6B7280] hover:text-[#1A3622] font-medium transition-colors flex items-center gap-1"
          data-testid="redd-view-details"
        >
          <Eye className="h-3 w-3" strokeWidth={1.5} />
          Details
        </button>
      </div>
      <div className="p-5">
        {/* Primary KPIs */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="p-3 bg-[#E8F0EA] rounded-md text-center">
            <p className="gl-heading text-2xl font-bold text-[#1A3622]" data-testid="redd-avg-score">{redd.avg_score}</p>
            <p className="text-[10px] tracking-[0.05em] uppercase font-bold text-[#6B7280] mt-0.5">Score Moyen /10</p>
          </div>
          <div className="p-3 bg-[#FAF9F6] rounded-md border border-[#E5E5E0] text-center">
            <p className="gl-heading text-2xl font-bold text-[#111827]" data-testid="redd-visits">{redd.total_visits}</p>
            <p className="text-[10px] tracking-[0.05em] uppercase font-bold text-[#6B7280] mt-0.5">Visites Terrain</p>
          </div>
          <div className="p-3 bg-[#FAF9F6] rounded-md border border-[#E5E5E0] text-center">
            <p className="gl-heading text-2xl font-bold text-[#111827]" data-testid="redd-farmers">{redd.farmers_assessed}</p>
            <p className="text-[10px] tracking-[0.05em] uppercase font-bold text-[#6B7280] mt-0.5">Producteurs</p>
          </div>
        </div>

        {/* Level distribution */}
        {isAdvanced && totalLevels > 0 && (
          <div className="mb-5">
            <p className="text-[10px] tracking-[0.08em] uppercase font-bold text-[#9CA3AF] mb-2">Distribution Niveaux</p>
            <div className="space-y-1.5">
              {levels.map(l => (
                <LevelBar key={l.key} label={l.label} count={redd.level_distribution[l.key] || 0} total={totalLevels} color={l.color} />
              ))}
            </div>
          </div>
        )}

        {/* Practices adoption */}
        {isAdvanced && Object.keys(redd.practices_adoption || {}).length > 0 && (
          <div>
            <p className="text-[10px] tracking-[0.08em] uppercase font-bold text-[#9CA3AF] mb-2">Adoption des Pratiques</p>
            <div className="space-y-2.5">
              {Object.entries(redd.practices_adoption).map(([label, data]) => (
                <PracticeBar key={label} label={label} pct={data.pct} />
              ))}
            </div>
          </div>
        )}

        {/* Conformity */}
        {redd.avg_conformity > 0 && (
          <div className="mt-4 p-3 bg-[#FAF9F6] rounded-md border border-[#E5E5E0]">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-[#6B7280] font-medium">Conformite moyenne</span>
              <span className="gl-mono font-medium text-[#1A3622]">{redd.avg_conformity}%</span>
            </div>
            <div className="w-full bg-[#F3F4F6] rounded-full h-1.5">
              <div className="h-1.5 rounded-full bg-[#1A3622] transition-all duration-500" style={{ width: `${redd.avg_conformity}%` }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

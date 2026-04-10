import React from 'react';
import { DollarSign } from 'lucide-react';

const formatFCFA = (val) => {
  if (!val) return '0';
  return val.toLocaleString('fr-FR');
};

export const FinancialCard = ({ financial }) => {
  const rate = financial?.distribution_rate || 0;

  const items = [
    { label: 'Primes Recues', value: financial?.total_premiums_received, color: 'text-[#1A3622]', bg: 'bg-[#E8F0EA]' },
    { label: 'Distribue', value: financial?.total_premiums_distributed, color: 'text-[#1A3622]', bg: 'bg-[#E8F0EA]' },
    { label: 'En Attente', value: financial?.pending_distribution, color: 'text-[#C25E30]', bg: 'bg-[#C25E30]/5' },
  ];

  return (
    <div className="bg-white border border-[#E5E5E0] rounded-md overflow-hidden gl-animate-in gl-stagger-5" data-testid="financial-card">
      <div className="px-5 py-4 border-b border-[#E5E5E0]">
        <h3 className="gl-heading text-sm font-semibold text-[#1A3622] tracking-tight flex items-center gap-2">
          <DollarSign className="h-4 w-4" strokeWidth={1.5} />
          Resume Financier
        </h3>
      </div>
      <div className="p-5">
        <div className="grid grid-cols-3 gap-3 mb-5">
          {items.map((item, i) => (
            <div key={`el-${i}`} className={`p-3 rounded-md ${item.bg} text-center`}>
              <p className="text-[10px] tracking-[0.06em] uppercase font-bold text-[#6B7280] mb-1">{item.label}</p>
              <p className={`gl-heading text-lg font-bold ${item.color}`}>
                {formatFCFA(item.value)}
              </p>
              <p className="text-[10px] text-[#9CA3AF] mt-0.5">FCFA</p>
            </div>
          ))}
        </div>
        {rate > 0 && (
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-[#6B7280] font-medium">Taux de distribution</span>
              <span className="gl-mono text-xs font-medium text-[#1A3622]">{rate}%</span>
            </div>
            <div className="w-full bg-[#F3F4F6] rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full bg-[#1A3622] transition-all duration-700 ease-out"
                style={{ width: `${rate}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

import React from 'react';
import { Users, MapPin, TrendingUp, DollarSign } from 'lucide-react';

const formatXOF = (val) => {
  if (!val) return '0';
  return val.toLocaleString('fr-FR');
};

const KPICard = ({ icon: Icon, label, value, sub, accent, delay, onClick, testId }) => (
  <button
    onClick={onClick}
    className={`gl-animate-in ${delay} bg-white border border-[#E5E5E0] rounded-md p-5 text-left w-full group transition-all duration-200 hover:border-[#1A3622]/20 relative overflow-hidden`}
    data-testid={testId}
  >
    <div className={`absolute top-0 left-0 right-0 h-[2px] ${accent}`} />
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs tracking-[0.06em] uppercase font-bold text-[#6B7280] mb-2">{label}</p>
        <p className="gl-heading text-2xl md:text-3xl font-bold text-[#111827] tracking-tight leading-none">
          {value}
        </p>
        {sub && <p className="text-xs text-[#6B7280] mt-1.5">{sub}</p>}
      </div>
      <div className="w-9 h-9 rounded-md bg-[#F3F4F6] flex items-center justify-center opacity-60 group-hover:opacity-100 transition-opacity">
        <Icon className="h-4.5 w-4.5 text-[#374151]" strokeWidth={1.5} />
      </div>
    </div>
  </button>
);

export const KPIStrip = ({ members, parcelles, financial, navigate }) => {
  const kpis = [
    {
      icon: Users,
      label: 'Membres Actifs',
      value: `${members?.active || 0}`,
      sub: `sur ${members?.total || 0} membres`,
      accent: 'bg-[#1A3622]',
      delay: 'gl-stagger-1',
      onClick: () => navigate('/cooperative/members'),
      testId: 'kpi-active-members',
    },
    {
      icon: MapPin,
      label: 'Superficie Totale',
      value: `${parcelles?.superficie_totale?.toFixed(1) || '0'} ha`,
      sub: `${parcelles?.total || 0} parcelles`,
      accent: 'bg-[#D4AF37]',
      delay: 'gl-stagger-2',
      onClick: () => navigate('/cooperative/parcels/new'),
      testId: 'kpi-total-surface',
    },
    {
      icon: TrendingUp,
      label: 'CO\u2082 Capture',
      value: `${parcelles?.co2_total?.toFixed(1) || '0'} t`,
      sub: `Score moyen ${parcelles?.score_carbone_moyen?.toFixed(1) || '0'}/10`,
      accent: 'bg-[#C25E30]',
      delay: 'gl-stagger-3',
      onClick: () => navigate('/cooperative/mrv'),
      testId: 'kpi-co2-captured',
    },
    {
      icon: DollarSign,
      label: 'Primes a Distribuer',
      value: `${formatXOF(financial?.pending_distribution)}`,
      sub: 'FCFA',
      accent: 'bg-[#D4AF37]',
      delay: 'gl-stagger-4',
      onClick: () => navigate('/cooperative/distributions'),
      testId: 'kpi-pending-premiums',
    },
  ];

  return (
    <div className="max-w-[1400px] mx-auto px-6 md:px-8 -mt-6 relative z-10">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <KPICard key={`el-${i}`} {...kpi} />
        ))}
      </div>
    </div>
  );
};

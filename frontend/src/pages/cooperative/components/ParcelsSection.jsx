import React from 'react';
import { MapPin, Leaf, TrendingUp, CheckCircle, Plus, Clock, FileText } from 'lucide-react';

export const ParcelsSection = ({ parcelles, navigate }) => {
  const stats = [
    { icon: MapPin, value: parcelles?.total || 0, label: 'Parcelles', color: 'text-[#1A3622]' },
    { icon: Leaf, value: `${parcelles?.superficie_totale?.toFixed(1) || 0}`, label: 'Hectares', color: 'text-[#065F46]' },
    { icon: TrendingUp, value: `${parcelles?.score_carbone_moyen?.toFixed(1) || 0}/10`, label: 'Score Carbone', color: 'text-[#C25E30]' },
    { icon: CheckCircle, value: `${parcelles?.co2_total?.toFixed(1) || 0}`, label: 'Tonnes CO\u2082', color: 'text-[#1A3622]' },
  ];

  const actions = [
    { icon: Plus, label: 'Enregistrer', path: '/cooperative/parcels/new', accent: true },
    { icon: MapPin, label: 'Toutes les Parcelles', path: '/cooperative/parcels' },
    { icon: Clock, label: 'Verification', path: '/cooperative/parcels/verification' },
    { icon: FileText, label: 'Rapport EUDR', path: '/cooperative/reports' },
  ];

  return (
    <div className="bg-white border border-[#E5E5E0] rounded-md overflow-hidden gl-animate-in gl-stagger-4" data-testid="parcels-section">
      <div className="px-5 py-4 border-b border-[#E5E5E0] flex items-center justify-between">
        <div>
          <h3 className="gl-heading text-sm font-semibold text-[#1A3622] tracking-tight flex items-center gap-2">
            <MapPin className="h-4 w-4" strokeWidth={1.5} />
            Gestion des Parcelles
          </h3>
          <p className="text-[11px] text-[#6B7280] mt-0.5">Parcelles des planteurs membres</p>
        </div>
        <button
          onClick={() => navigate('/cooperative/parcels/new')}
          className="bg-[#1A3622] text-white text-xs font-medium px-3 py-1.5 rounded-md hover:bg-[#112417] transition-colors flex items-center gap-1.5"
          data-testid="btn-new-parcel"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
          Nouvelle
        </button>
      </div>
      <div className="p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {stats.map((s, i) => (
            <div key={`el-${i}`} className="p-3 bg-[#FAF9F6] rounded-md border border-[#E5E5E0] text-center">
              <s.icon className={`h-5 w-5 mx-auto mb-1.5 ${s.color}`} strokeWidth={1.5} />
              <p className="gl-heading text-xl font-bold text-[#111827]">{s.value}</p>
              <p className="text-[10px] tracking-[0.05em] uppercase font-bold text-[#9CA3AF] mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {actions.map((a) => (
            <button
              key={a.path}
              onClick={() => navigate(a.path)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                a.accent
                  ? 'bg-[#E8F0EA] text-[#1A3622] hover:bg-[#d6e8da]'
                  : 'bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E5E0]'
              }`}
              data-testid={`parcel-action-${a.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <a.icon className="h-3.5 w-3.5" strokeWidth={1.5} />
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  Plus, Users, Shield, Target, Package, Store,
  DollarSign, Leaf, FileText, TreePine, AlertTriangle,
  UserCircle, Clock, Smartphone, ChevronDown, Gift, BarChart3
} from 'lucide-react';

const categories = [
  {
    title: 'Exploitation',
    items: [
      { icon: Plus, label: 'Parcelle', path: '/cooperative/parcels/new', color: 'text-[#1A3622]' },
      { icon: Users, label: 'Membres', path: '/cooperative/members', color: 'text-[#1A3622]' },
      { icon: Shield, label: 'Agents', path: '/cooperative/agents', color: 'text-[#1A3622]' },
      { icon: Target, label: 'Progression', path: '/cooperative/agents-progress', color: 'text-[#1A3622]' },
    ],
  },
  {
    title: 'Commerce',
    items: [
      { icon: Package, label: 'Ventes', path: '/cooperative/lots', color: 'text-[#92400E]' },
      { icon: Store, label: 'Recoltes', path: '/cooperative/harvests', color: 'text-[#92400E]' },
      { icon: Package, label: 'Intrants', path: '/marketplace', color: 'text-[#92400E]' },
      { icon: Clock, label: 'Commandes', path: '/buyer/orders', color: 'text-[#92400E]' },
    ],
  },
  {
    title: 'Carbone & Durabilite',
    items: [
      { icon: DollarSign, label: 'Primes', path: '/cooperative/carbon-premiums', color: 'text-[#065F46]' },
      { icon: BarChart3, label: 'Analytiques', path: '/cooperative/carbon-analytics', color: 'text-[#065F46]' },
      { icon: Leaf, label: 'MRV & Suivi', path: '/cooperative/mrv', color: 'text-[#065F46]' },
      { icon: DollarSign, label: 'Distributions', path: '/cooperative/distributions', color: 'text-[#065F46]' },
    ],
  },
  {
    title: 'Conformite',
    items: [
      { icon: FileText, label: 'EUDR', path: '/cooperative/reports', color: 'text-[#6B7280]' },
      { icon: TreePine, label: 'Naturalisation', path: '/cooperative/parcels/verification', color: 'text-[#6B7280]' },
      { icon: AlertTriangle, label: 'SSRTE / ICI', path: '/cooperative/ssrte', color: 'text-[#6B7280]' },
      { icon: UserCircle, label: 'Inscriptions', path: '/cooperative/inscriptions', color: 'text-[#6B7280]' },
      { icon: Target, label: 'Ecarts', path: '/cooperative/ecarts', color: 'text-[#DC2626]' },
    ],
  },
  {
    title: 'Reseau',
    items: [
      { icon: Gift, label: 'Parrainage', path: '/cooperative/referral', color: 'text-[#7C3AED]' },
    ],
  },
];

export const QuickActionsPanel = ({ navigate, onToggleSimulator }) => {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="bg-white border border-[#E5E5E0] rounded-md overflow-hidden gl-animate-in gl-stagger-5" data-testid="quick-actions-panel">
      <div className="px-5 py-4 border-b border-[#E5E5E0] flex items-center justify-between">
        <h3 className="gl-heading text-sm font-semibold text-[#1A3622] tracking-tight">Actions Rapides</h3>
        <button onClick={() => setExpanded(!expanded)} className="text-[#6B7280] hover:text-[#1A3622] transition-colors" data-testid="toggle-quick-actions">
          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${expanded ? '' : '-rotate-90'}`} strokeWidth={1.5} />
        </button>
      </div>
      {expanded && (
        <div className="p-4 space-y-4">
          {categories.map((cat) => (
            <div key={cat.title}>
              <p className="text-[10px] tracking-[0.1em] uppercase font-bold text-[#9CA3AF] mb-2 px-1">{cat.title}</p>
              <div className="grid grid-cols-2 gap-1.5">
                {cat.items.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-md text-left hover:bg-[#F3F4F6] transition-colors group"
                    data-testid={`qa-${item.label.toLowerCase().replace(/[\s\/+]+/g, '-')}`}
                  >
                    <item.icon className={`h-3.5 w-3.5 ${item.color} opacity-60 group-hover:opacity-100 transition-opacity`} strokeWidth={1.5} />
                    <span className="text-xs font-medium text-[#374151] truncate">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="pt-2 border-t border-[#E5E5E0]">
            <button
              onClick={onToggleSimulator}
              className="flex items-center gap-2 w-full px-3 py-2.5 rounded-md bg-[#111827] hover:bg-[#1F2937] transition-colors"
              data-testid="quick-action-ussd-simulator"
            >
              <Smartphone className="h-3.5 w-3.5 text-[#10B981]" strokeWidth={1.5} />
              <span className="text-xs font-medium text-[#10B981]">Simulateur USSD</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

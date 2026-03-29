import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Clock, ChevronRight, Zap } from 'lucide-react';

const PLAN_COLORS = {
  coop_trial: { bg: 'bg-[#D4AF37]/10', border: 'border-[#D4AF37]/30', text: 'text-[#92400E]', badge: 'bg-[#D4AF37] text-white' },
  coop_starter: { bg: 'bg-[#F3F4F6]', border: 'border-[#E5E5E0]', text: 'text-[#374151]', badge: 'bg-[#6B7280] text-white' },
  coop_pro: { bg: 'bg-[#E8F0EA]', border: 'border-[#1A3622]/20', text: 'text-[#1A3622]', badge: 'bg-[#1A3622] text-white' },
  coop_enterprise: { bg: 'bg-[#1A3622]/5', border: 'border-[#1A3622]/30', text: 'text-[#1A3622]', badge: 'bg-[#1A3622] text-white' },
};

export const SubscriptionBanner = ({ subscription }) => {
  const navigate = useNavigate();
  if (!subscription) return null;

  const { plan, plan_name, is_trial, days_remaining, is_active, status } = subscription;
  const colors = PLAN_COLORS[plan] || PLAN_COLORS.coop_trial;
  const showUpgrade = plan === 'coop_starter' || (is_trial && days_remaining < 60);

  return (
    <div className={`${colors.bg} border ${colors.border} rounded-md p-4 flex flex-col sm:flex-row sm:items-center gap-3 gl-animate-in`} data-testid="subscription-banner">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={`w-9 h-9 rounded-md ${colors.badge} flex items-center justify-center flex-shrink-0`}>
          <Crown className="h-4 w-4" strokeWidth={1.5} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`gl-heading text-sm font-bold ${colors.text}`}>{plan_name}</span>
            {is_trial && (
              <span className="text-[9px] tracking-[0.1em] uppercase font-bold text-[#D4AF37] bg-[#D4AF37]/15 px-1.5 py-0.5 rounded-sm">Essai</span>
            )}
            {!is_active && status === 'expired' && (
              <span className="text-[9px] tracking-[0.1em] uppercase font-bold text-[#C25E30] bg-[#C25E30]/10 px-1.5 py-0.5 rounded-sm">Expire</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Clock className="h-3 w-3 text-[#9CA3AF]" strokeWidth={1.5} />
            <span className="text-[11px] text-[#6B7280]">
              {is_trial ? `${days_remaining} jours restants sur l'essai gratuit` :
               is_active ? `${days_remaining} jours restants` : 'Abonnement expire'}
            </span>
          </div>
        </div>
      </div>
      {showUpgrade && (
        <button
          onClick={() => navigate('/#pricing')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#1A3622] text-white text-xs font-semibold hover:bg-[#112417] transition-colors flex-shrink-0"
          data-testid="upgrade-plan-btn"
        >
          <Zap className="h-3.5 w-3.5" strokeWidth={2} />
          Mise a niveau
          <ChevronRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
};

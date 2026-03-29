import React from 'react';
import { AlertTriangle } from 'lucide-react';

export const AlertsBanner = ({ pendingValidation, navigate }) => {
  if (!pendingValidation || pendingValidation <= 0) return null;

  return (
    <div className="bg-[#FEF3C7] border border-[#F59E0B]/20 rounded-md p-4 flex items-center gap-4 gl-animate-in gl-stagger-6" data-testid="alerts-banner">
      <div className="w-9 h-9 rounded-md bg-[#F59E0B]/10 flex items-center justify-center flex-shrink-0">
        <AlertTriangle className="h-4.5 w-4.5 text-[#92400E]" strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#92400E]">
          {pendingValidation} membre(s) en attente de validation
        </p>
        <p className="text-xs text-[#92400E]/70 mt-0.5">
          Validez-les pour qu'ils puissent contribuer aux lots
        </p>
      </div>
      <button
        onClick={() => navigate('/cooperative/members?status=pending_validation')}
        className="flex-shrink-0 bg-[#92400E] text-white text-xs font-semibold px-4 py-2 rounded-md hover:bg-[#78350F] transition-colors"
        data-testid="validate-members-btn"
      >
        Valider
      </button>
    </div>
  );
};

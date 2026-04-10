import React from 'react';
import { X } from 'lucide-react';
import USSDSimulator from '../../../components/USSDSimulator';

export const USSDPanel = ({ show, simulatorMembers, onClose }) => {
  if (!show) return null;

  const steps = [
    'Selectionnez un de vos membres dans la liste',
    'Cliquez "Composer *144*99#" pour demarrer',
    'Utilisez les boutons rapides ou tapez votre reponse',
    'Testez inscription, estimation, demande de versement',
  ];

  return (
    <div className="bg-[#111827] border border-[#374151] rounded-md overflow-hidden gl-animate-in" data-testid="ussd-panel">
      <div className="px-5 py-4 border-b border-[#374151] flex items-center justify-between">
        <h3 className="gl-mono text-sm font-medium text-[#10B981]">Simulateur USSD *144*99#</h3>
        <button onClick={onClose} className="text-[#6B7280] hover:text-white transition-colors" data-testid="close-ussd-btn">
          <X className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>
      <div className="p-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <USSDSimulator title="Simulateur USSD *144*99#" onClose={onClose} members={simulatorMembers} />
          </div>
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-white">Comment utiliser</h4>
            <p className="text-xs text-[#9CA3AF] leading-relaxed">
              Ce simulateur reproduit l'experience USSD *144*99# telle que vos planteurs la vivent.
            </p>
            <div className="space-y-2 mt-3">
              {steps.map((text, i) => (
                <div key={`el-${i}`} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#10B981]/20 text-[#10B981] gl-mono text-[10px] flex items-center justify-center font-bold">
                    {i + 1}
                  </span>
                  <p className="text-xs text-[#D1D5DB] leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { Users, UserCheck, UserX, KeyRound, Send, Loader2 } from 'lucide-react';

const MiniStat = ({ icon: Icon, value, label, colorClass, testId }) => (
  <div className="text-center p-3 bg-[#FAF9F6] rounded-md border border-[#E5E5E0]">
    <Icon className={`h-4 w-4 mx-auto mb-1.5 ${colorClass}`} strokeWidth={1.5} />
    <p className="gl-heading text-lg font-bold text-[#111827]" data-testid={testId}>{value}</p>
    <p className="text-[10px] tracking-[0.05em] uppercase font-bold text-[#9CA3AF]">{label}</p>
  </div>
);

export const ActivationWidget = ({ activationStats, sendingReminder, handleSendReminder, navigate }) => {
  if (!activationStats) return null;

  const rate = activationStats.activation_rate || 0;
  const barColor = rate >= 75 ? '#1A3622' : rate >= 40 ? '#D4AF37' : '#C25E30';

  return (
    <div className="bg-white border border-[#E5E5E0] rounded-md overflow-hidden gl-animate-in gl-stagger-3" data-testid="activation-widget">
      <div className="px-5 py-4 border-b border-[#E5E5E0] flex items-center justify-between">
        <div>
          <h3 className="gl-heading text-sm font-semibold text-[#1A3622] tracking-tight flex items-center gap-2">
            <UserCheck className="h-4 w-4" strokeWidth={1.5} />
            Suivi des Activations
          </h3>
          <p className="text-[11px] text-[#6B7280] mt-0.5">Taux : {rate}% des membres actives</p>
        </div>
        <button
          onClick={() => navigate('/cooperative/members')}
          className="text-xs text-[#6B7280] hover:text-[#1A3622] font-medium transition-colors"
        >
          Voir tous
        </button>
      </div>
      <div className="p-5">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
          <MiniStat icon={Users} value={activationStats.total_members} label="Total" colorClass="text-[#6B7280]" testId="activation-total" />
          <MiniStat icon={UserCheck} value={activationStats.activated_count} label="Actives" colorClass="text-[#1A3622]" testId="activation-activated" />
          <MiniStat icon={UserX} value={activationStats.pending_count} label="En attente" colorClass="text-[#D4AF37]" testId="activation-pending" />
          <MiniStat icon={KeyRound} value={activationStats.pin_configured_count} label="PIN" colorClass="text-[#065F46]" testId="activation-pin" />
          <div className="text-center p-3 bg-[#FAF9F6] rounded-md border border-[#E5E5E0]">
            <p className="gl-heading text-lg font-bold text-[#111827]" data-testid="activation-code">{activationStats.code_planteur_count}</p>
            <p className="text-[10px] tracking-[0.05em] uppercase font-bold text-[#9CA3AF] mt-1.5">Code Planteur</p>
          </div>
        </div>

        <div className="mb-5">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-[#6B7280] font-medium">Progression</span>
            <span className="gl-mono text-xs font-medium" style={{ color: barColor }}>{rate}%</span>
          </div>
          <div className="w-full bg-[#F3F4F6] rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${rate}%`, backgroundColor: barColor }}
            />
          </div>
        </div>

        {activationStats.pending_activation?.length > 0 && (
          <div>
            <p className="text-[10px] tracking-[0.08em] uppercase font-bold text-[#9CA3AF] mb-2">
              En attente d'activation ({activationStats.pending_count})
            </p>
            <div className="space-y-1.5 max-h-44 overflow-y-auto">
              {activationStats.pending_activation.slice(0, 5).map((m) => (
                <div key={m.id} className="flex items-center justify-between p-2.5 rounded-md bg-[#FAF9F6] border border-[#E5E5E0]" data-testid={`pending-member-${m.id}`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-[#FEF3C7] flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-[#92400E]">{m.full_name?.charAt(0) || '?'}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[#111827] truncate">{m.full_name}</p>
                      <p className="text-[10px] text-[#9CA3AF]">{m.phone_number} — {m.village}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {m.code_planteur && (
                      <span className="gl-mono text-[10px] text-[#1A3622] bg-[#E8F0EA] px-1.5 py-0.5 rounded-sm">{m.code_planteur}</span>
                    )}
                    {!m.pin_configured && (
                      <span className="text-[9px] tracking-wider uppercase font-bold text-[#C25E30] bg-[#C25E30]/10 px-1.5 py-0.5 rounded-sm">Sans PIN</span>
                    )}
                    <button
                      disabled={sendingReminder === m.id}
                      onClick={() => handleSendReminder(m.id, m.full_name)}
                      className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-[#E8F0EA] transition-colors disabled:opacity-40"
                      title="Envoyer un rappel SMS"
                      data-testid={`reminder-btn-${m.id}`}
                    >
                      {sendingReminder === m.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-[#6B7280]" />
                      ) : (
                        <Send className="h-3.5 w-3.5 text-[#1A3622]" strokeWidth={1.5} />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {activationStats.pending_count > 5 && (
              <button
                onClick={() => navigate('/cooperative/members')}
                className="text-xs text-[#1A3622] font-medium mt-3 hover:underline"
              >
                Voir les {activationStats.pending_count - 5} autres...
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

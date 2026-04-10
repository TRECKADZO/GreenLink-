import React from 'react';
import { Users, Clock, ChevronRight } from 'lucide-react';

export const RecentMembersCard = ({ recentMembers, pendingValidation, navigate }) => {
  return (
    <div className="bg-white border border-[#E5E5E0] rounded-md overflow-hidden gl-animate-in gl-stagger-6" data-testid="recent-members-card">
      <div className="px-5 py-4 border-b border-[#E5E5E0] flex items-center justify-between">
        <div>
          <h3 className="gl-heading text-sm font-semibold text-[#1A3622] tracking-tight">Membres Recents</h3>
          {pendingValidation > 0 && (
            <p className="text-[10px] text-[#C25E30] font-medium mt-0.5">{pendingValidation} en attente</p>
          )}
        </div>
        <button
          onClick={() => navigate('/cooperative/members')}
          className="text-xs text-[#6B7280] hover:text-[#1A3622] font-medium transition-colors"
          data-testid="view-all-members-btn"
        >
          Voir tout
        </button>
      </div>
      <div className="p-4">
        {recentMembers?.length > 0 ? (
          <div className="space-y-2">
            {recentMembers.map((member, index) => (
              <div
                key={`el-${index}`}
                className="flex items-center justify-between p-3 rounded-md hover:bg-[#F3F4F6] transition-colors group"
                data-testid={`recent-member-${index}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#E8F0EA] flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-[#1A3622]">
                      {(member.full_name || member.name)?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#111827] truncate">{member.full_name || member.name}</p>
                    <p className="text-[11px] text-[#9CA3AF]">{member.village}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[#D4AF37]">
                  <Clock className="h-3 w-3" strokeWidth={1.5} />
                  <span className="text-[10px] font-semibold tracking-wide uppercase">Nouveau</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Users className="h-8 w-8 mx-auto mb-2 text-[#E5E5E0]" strokeWidth={1.5} />
            <p className="text-xs text-[#9CA3AF]">Aucun membre recent</p>
            <button
              onClick={() => navigate('/cooperative/members/new')}
              className="text-xs text-[#1A3622] font-medium mt-2 hover:underline"
            >
              Ajouter votre premier membre
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

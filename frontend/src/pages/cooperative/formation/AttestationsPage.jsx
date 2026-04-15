import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tokenService } from '../../../services/tokenService';
import { toast } from 'sonner';
import {
  Award, Loader2, Home, ChevronRight, Download, Search, Users
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const AttestationsPage = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchMember, setSearchMember] = useState('');
  const [memberHistory, setMemberHistory] = useState(null);

  useEffect(() => { loadSessions(); }, []);

  const loadSessions = async () => {
    try {
      const token = tokenService.getToken();
      const res = await fetch(`${API}/api/formation/sessions?statut=completee`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch { toast.error('Erreur'); }
    finally { setLoading(false); }
  };

  const downloadAttestation = async (sessionId, participantId, name) => {
    try {
      const token = tokenService.getToken();
      const res = await fetch(`${API}/api/formation/attestation/${sessionId}/${participantId}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erreur');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attestation_${name.replace(/\s+/g, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Attestation telechargee');
    } catch { toast.error('Erreur telechargement'); }
  };

  const searchHistory = async () => {
    if (!searchMember.trim()) return;
    try {
      const token = tokenService.getToken();
      const res = await fetch(`${API}/api/formation/member/${encodeURIComponent(searchMember)}/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setMemberHistory(data);
    } catch { toast.error('Erreur recherche'); }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6]" data-testid="attestations-page">
      <div className="bg-[#1A3622] relative overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-6 relative">
          <div className="flex items-center gap-2 text-white/50 text-xs mb-3">
            <button onClick={() => navigate('/cooperative/dashboard')} className="hover:text-white"><Home className="h-3.5 w-3.5" /></button>
            <ChevronRight className="h-3 w-3" />
            <button onClick={() => navigate('/cooperative/formation')} className="hover:text-white">Formation</button>
            <ChevronRight className="h-3 w-3" />
            <span className="text-white/80">Attestations & Suivi</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Attestations & Suivi Individuel</h1>
          <p className="text-sm text-white/60 mt-1">Telechargement d'attestations et historique par membre</p>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-8">
        {/* Member search */}
        <div className="bg-white border border-[#E5E5E0] rounded-md p-5 mb-6" data-testid="member-search">
          <h3 className="text-sm font-semibold text-[#1A3622] mb-3">Rechercher l'historique d'un membre</h3>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
              <input type="text" value={searchMember} onChange={(e) => setSearchMember(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchHistory()}
                placeholder="Nom du producteur/travailleur..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-[#E5E5E0] rounded-md focus:outline-none focus:border-[#1A3622]" data-testid="input-search-member" />
            </div>
            <button onClick={searchHistory} className="px-4 py-2 bg-[#1A3622] text-white rounded-md text-sm font-medium hover:bg-[#112417]" data-testid="btn-search-member">
              Rechercher
            </button>
          </div>

          {memberHistory && (
            <div className="mt-4" data-testid="member-history">
              <h4 className="text-xs font-semibold text-[#1A3622] mb-2">Historique de {memberHistory.member} ({memberHistory.formations?.length || 0} formation(s))</h4>
              {memberHistory.formations?.length === 0 ? (
                <p className="text-xs text-[#6B7280]">Aucune formation trouvee.</p>
              ) : (
                <div className="space-y-2">
                  {memberHistory.formations.map((f, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 bg-[#F9FAFB] rounded border border-[#E5E5E0]">
                      <div>
                        <p className="text-xs font-medium text-[#111827]">{f.theme_titre}</p>
                        <p className="text-[10px] text-[#6B7280]">{f.date_session} | {f.lieu} | {f.formateur}</p>
                      </div>
                      {f.participant?.participant_id && (
                        <button onClick={() => downloadAttestation(f.session_id, f.participant.participant_id, `${f.participant.prenom}_${f.participant.nom}`)}
                          className="p-1.5 rounded hover:bg-[#E8F0EA]" title="Telecharger attestation" data-testid={`btn-attestation-${i}`}>
                          <Download className="h-3.5 w-3.5 text-[#1A3622]" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sessions with participants */}
        <div className="bg-white border border-[#E5E5E0] rounded-md overflow-hidden" data-testid="sessions-attestations">
          <div className="px-5 py-4 border-b border-[#E5E5E0]">
            <h3 className="text-sm font-semibold text-[#1A3622]">Sessions completees - Attestations disponibles</h3>
          </div>
          {loading ? (
            <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin text-[#1A3622] mx-auto" /></div>
          ) : sessions.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#6B7280]">Aucune session completee.</div>
          ) : (
            <div className="divide-y divide-[#E5E5E0]">
              {sessions.map(s => (
                <SessionAttestations key={s.session_id} session={s} onDownload={downloadAttestation} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SessionAttestations = ({ session, onDownload }) => {
  const [expanded, setExpanded] = useState(false);
  const parts = session.participants || [];

  return (
    <div>
      <button onClick={() => setExpanded(!expanded)} className="w-full px-5 py-3 flex items-center justify-between hover:bg-[#F9FAFB] text-left" data-testid={`session-toggle-${session.session_id?.slice(0, 8)}`}>
        <div>
          <p className="text-xs font-medium text-[#111827]">{session.theme_titre}</p>
          <p className="text-[10px] text-[#6B7280]">{session.date_session} | {parts.length} participant(s)</p>
        </div>
        <span className="text-xs text-[#6B7280]">{expanded ? 'Fermer' : 'Voir'}</span>
      </button>
      {expanded && parts.length > 0 && (
        <div className="px-5 pb-3">
          <div className="space-y-1">
            {parts.map((p, i) => (
              <div key={p.participant_id || i} className="flex items-center justify-between px-3 py-2 bg-[#F9FAFB] rounded">
                <div className="flex items-center gap-2">
                  <Users className="h-3 w-3 text-[#6B7280]" />
                  <span className="text-xs text-[#374151]">{p.prenom} {p.nom} ({p.role})</span>
                </div>
                <button onClick={() => onDownload(session.session_id, p.participant_id, `${p.prenom}_${p.nom}`)}
                  className="flex items-center gap-1 px-2 py-1 bg-[#E8F0EA] text-[#1A3622] rounded text-[10px] font-medium hover:bg-[#D1E5D5]"
                  data-testid={`btn-dl-${p.participant_id?.slice(0, 8)}`}>
                  <Download className="h-3 w-3" /> Attestation
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AttestationsPage;

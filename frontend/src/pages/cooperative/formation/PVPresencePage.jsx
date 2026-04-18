import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { tokenService } from '../../../services/tokenService';
import { toast } from 'sonner';
import {
  FileText, Users, Plus, Loader2, Home, ChevronRight,
  Download, UserPlus, Printer
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const PVPresencePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddParticipant, setShowAddParticipant] = useState(false);

  const preselectedSessionId = searchParams.get('session');

  useEffect(() => { loadSessions(); }, []);

  const loadSessions = async () => {
    try {
      const token = tokenService.getToken();
      const res = await fetch(`${API}/api/formation/sessions`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setSessions(data.sessions || []);
      if (preselectedSessionId) {
        const s = (data.sessions || []).find(s => s.session_id === preselectedSessionId);
        if (s) { setSelectedSession(s); loadParticipants(s.session_id); }
      }
    } catch { toast.error('Erreur'); }
    finally { setLoading(false); }
  };

  const loadParticipants = async (sessionId) => {
    try {
      const token = tokenService.getToken();
      const res = await fetch(`${API}/api/formation/sessions/${sessionId}/participants`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setParticipants(data.participants || []);
    } catch (e) { console.error('Participants load error:', e); }
  };

  const handleSelectSession = (s) => {
    setSelectedSession(s);
    setParticipants(s.participants || []);
    loadParticipants(s.session_id);
  };

  const handleAddParticipant = async (form) => {
    try {
      const token = tokenService.getToken();
      const res = await fetch(`${API}/api/formation/sessions/${selectedSession.session_id}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify([form]),
      });
      if (!res.ok) throw new Error('Erreur');
      toast.success('Participant ajoute');
      setShowAddParticipant(false);
      loadParticipants(selectedSession.session_id);
    } catch { toast.error('Erreur ajout'); }
  };

  const handleDownloadPV = async () => {
    try {
      const token = tokenService.getToken();
      const res = await fetch(`${API}/api/formation/sessions/${selectedSession.session_id}/pv/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erreur');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pv_${selectedSession.theme_titre?.replace(/\s+/g, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PV telecharge');
    } catch { toast.error('Erreur export PV'); }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6]" data-testid="pv-page">
      <div className="bg-[#1A3622] relative overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-6 relative">
          <div className="flex items-center gap-2 text-white/50 text-xs mb-3">
            <button onClick={() => navigate('/cooperative/dashboard')} className="hover:text-white"><Home className="h-3.5 w-3.5" /></button>
            <ChevronRight className="h-3 w-3" />
            <button onClick={() => navigate('/cooperative/formation')} className="hover:text-white">Formation</button>
            <ChevronRight className="h-3 w-3" />
            <span className="text-white/80">PV & Listes de Presence</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-3">
            <button onClick={() => navigate('/cooperative/formation')} className="w-8 h-8 rounded-md bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors" data-testid="btn-retour"><ChevronRight className="h-4 w-4 text-white rotate-180" /></button>
            PV & Listes de Presence
          </h1>
          <p className="text-sm text-white/60 mt-1">Conformes aux clauses 7.3 & 7.4</p>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Session selector */}
          <div className="lg:col-span-4">
            <div className="bg-white border border-[#E5E5E0] rounded-md overflow-hidden" data-testid="session-list">
              <div className="px-5 py-4 border-b border-[#E5E5E0]">
                <h3 className="text-sm font-semibold text-[#1A3622]">Sessions ({sessions.length})</h3>
              </div>
              <div className="divide-y divide-[#E5E5E0] max-h-[600px] overflow-y-auto">
                {loading ? (
                  <div className="p-6 text-center"><Loader2 className="h-6 w-6 animate-spin text-[#1A3622] mx-auto" /></div>
                ) : sessions.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#6B7280]">Aucune session</div>
                ) : sessions.map(s => (
                  <button key={s.session_id} onClick={() => handleSelectSession(s)}
                    className={`w-full text-left px-4 py-3 hover:bg-[#F9FAFB] transition-colors ${selectedSession?.session_id === s.session_id ? 'bg-[#E8F0EA]' : ''}`}
                    data-testid={`select-session-${s.session_id?.slice(0, 8)}`}>
                    <p className="text-xs font-medium text-[#111827] truncate">{s.theme_titre}</p>
                    <p className="text-[10px] text-[#6B7280]">{s.date_session} | {(s.participants || []).length} part.</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* PV content */}
          <div className="lg:col-span-8">
            {!selectedSession ? (
              <div className="bg-white border border-[#E5E5E0] rounded-md p-12 text-center">
                <FileText className="h-12 w-12 text-[#D4AF37] mx-auto mb-4" strokeWidth={1} />
                <p className="text-sm text-[#6B7280]">Selectionnez une session pour voir le PV et la liste de presence.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Session info */}
                <div className="bg-white border border-[#E5E5E0] rounded-md overflow-hidden" data-testid="session-info">
                  <div className="px-5 py-4 border-b border-[#E5E5E0] flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-[#1A3622]">{selectedSession.theme_titre}</h3>
                    <div className="flex gap-2">
                      <button onClick={() => window.print()} className="flex items-center gap-2 px-3 py-1.5 border border-[#E5E5E0] text-[#1A3622] rounded-md text-xs font-medium hover:bg-[#F3F4F6]" data-testid="btn-print-pv">
                        <Printer className="h-3.5 w-3.5" /> Imprimer
                      </button>
                      <button onClick={handleDownloadPV} className="flex items-center gap-2 px-3 py-1.5 bg-[#1A3622] text-white rounded-md text-xs font-medium hover:bg-[#112417]" data-testid="btn-download-pv">
                        <Download className="h-3.5 w-3.5" /> PDF
                      </button>
                    </div>
                  </div>
                  <div className="p-5 grid grid-cols-2 md:grid-cols-3 gap-3 text-xs text-[#374151]">
                    <div><span className="text-[10px] font-bold text-[#9CA3AF] block">Date</span>{selectedSession.date_session}</div>
                    <div><span className="text-[10px] font-bold text-[#9CA3AF] block">Lieu</span>{selectedSession.lieu || '-'}</div>
                    <div><span className="text-[10px] font-bold text-[#9CA3AF] block">Formateur</span>{selectedSession.formateur || '-'}</div>
                    <div><span className="text-[10px] font-bold text-[#9CA3AF] block">Public cible</span>{selectedSession.public_cible || '-'}</div>
                    <div><span className="text-[10px] font-bold text-[#9CA3AF] block">Clause ARS</span>{selectedSession.clause_ref || '-'}</div>
                    <div><span className="text-[10px] font-bold text-[#9CA3AF] block">Duree</span>{selectedSession.duree_heures || 0}h</div>
                  </div>
                  {selectedSession.contenu && (
                    <div className="px-5 pb-4">
                      <span className="text-[10px] font-bold text-[#9CA3AF] block mb-1">Resume / Objectifs</span>
                      <p className="text-xs text-[#374151]">{selectedSession.contenu}</p>
                    </div>
                  )}
                </div>

                {/* Plan de formation */}
                {(selectedSession.contenu_formation || []).length > 0 && (
                  <div className="bg-white border border-[#D4AF37] rounded-md overflow-hidden print-section" data-testid="plan-formation">
                    <div className="px-5 py-3 bg-[#FFF9E6] border-b border-[#D4AF37]">
                      <h3 className="text-sm font-semibold text-[#92400E]">Plan de Formation du Formateur</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-[#E5E5E0] bg-[#FFF9E6]">
                            <th className="px-4 py-2 text-left text-[10px] font-bold uppercase text-[#92400E] w-10">N</th>
                            <th className="px-4 py-2 text-left text-[10px] font-bold uppercase text-[#92400E]">Module / Objectif</th>
                            <th className="px-4 py-2 text-left text-[10px] font-bold uppercase text-[#92400E]">Contenu detaille</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E5E5E0]">
                          {selectedSession.contenu_formation.map((m, i) => (
                            <tr key={`plan-${i}`} className={i % 2 === 0 ? 'bg-white' : 'bg-[#FFFDF0]'}>
                              <td className="px-4 py-2 text-xs font-bold text-[#D4AF37]">{i + 1}</td>
                              <td className="px-4 py-2 text-xs font-medium text-[#1A3622]">{m.titre}</td>
                              <td className="px-4 py-2 text-xs text-[#374151]">{m.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Participants list */}
                <div className="bg-white border border-[#E5E5E0] rounded-md overflow-hidden print-section" data-testid="participants-list">
                  <div className="px-5 py-4 border-b border-[#E5E5E0] flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-[#1A3622]">Liste de presence ({participants.length})</h3>
                    <button onClick={() => setShowAddParticipant(true)} className="flex items-center gap-1 px-3 py-1.5 bg-[#E8F0EA] text-[#1A3622] rounded-md text-xs font-medium hover:bg-[#D1E5D5] no-print" data-testid="btn-add-participant">
                      <UserPlus className="h-3.5 w-3.5" /> Ajouter
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[#E5E5E0] bg-[#F9FAFB]">
                          <th className="px-4 py-2 text-left text-[10px] font-bold uppercase text-[#6B7280]">N</th>
                          <th className="px-4 py-2 text-left text-[10px] font-bold uppercase text-[#6B7280]">Nom</th>
                          <th className="px-4 py-2 text-left text-[10px] font-bold uppercase text-[#6B7280]">Prenom</th>
                          <th className="px-4 py-2 text-left text-[10px] font-bold uppercase text-[#6B7280]">Role</th>
                          <th className="px-4 py-2 text-left text-[10px] font-bold uppercase text-[#6B7280]">Tel</th>
                          <th className="px-4 py-2 text-left text-[10px] font-bold uppercase text-[#6B7280]">Signature</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E5E0]">
                        {participants.length === 0 ? (
                          <tr><td colSpan={6} className="px-4 py-6 text-center text-xs text-[#6B7280]">Aucun participant</td></tr>
                        ) : participants.map((p, i) => (
                          <tr key={p.participant_id || i} className="hover:bg-[#F9FAFB]">
                            <td className="px-4 py-2 text-xs">{i + 1}</td>
                            <td className="px-4 py-2 text-xs font-medium">{p.nom}</td>
                            <td className="px-4 py-2 text-xs">{p.prenom}</td>
                            <td className="px-4 py-2 text-xs">{p.role}</td>
                            <td className="px-4 py-2 text-xs">{p.telephone}</td>
                            <td className="px-4 py-2 text-xs">{p.signature ? 'Oui' : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Signature block */}
                <div className="bg-white border border-[#E5E5E0] rounded-md overflow-hidden print-section" data-testid="signature-block">
                  <div className="px-5 py-3 border-b border-[#E5E5E0] bg-[#F9FAFB]">
                    <h3 className="text-sm font-semibold text-[#1A3622]">Validation et Signatures</h3>
                  </div>
                  <div className="p-5 grid grid-cols-3 gap-6">
                    <div className="text-center">
                      <p className="text-xs font-bold text-[#1A3622] mb-1">Formateur</p>
                      <p className="text-[10px] text-[#6B7280] mb-8">{selectedSession.formateur || '________________'}</p>
                      <div className="border-b border-[#374151] mx-4 mb-1" />
                      <p className="text-[9px] text-[#9CA3AF]">Signature</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-[#1A3622] mb-1">Responsable SMCD</p>
                      <p className="text-[10px] text-[#6B7280] mb-8">________________</p>
                      <div className="border-b border-[#374151] mx-4 mb-1" />
                      <p className="text-[9px] text-[#9CA3AF]">Signature</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-[#1A3622] mb-1">Cachet Cooperative</p>
                      <p className="text-[10px] text-[#6B7280] mb-8">&nbsp;</p>
                      <div className="border-b border-[#374151] mx-4 mb-1" />
                      <p className="text-[9px] text-[#9CA3AF]">Cachet</p>
                    </div>
                  </div>
                  <div className="px-5 pb-4 text-center">
                    <p className="text-[9px] text-[#9CA3AF]">Date: {selectedSession.date_session} | Total participants: {participants.length}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showAddParticipant && <AddParticipantModal onSubmit={handleAddParticipant} onClose={() => setShowAddParticipant(false)} />}
    </div>
  );
};

const AddParticipantModal = ({ onSubmit, onClose }) => {
  const [form, setForm] = useState({ nom: '', prenom: '', role: 'Producteur', telephone: '', signature: true });
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-testid="add-participant-modal">
      <div className="bg-white rounded-md w-full max-w-md">
        <div className="px-5 py-4 border-b border-[#E5E5E0] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#1A3622]">Ajouter un participant</h3>
          <button onClick={onClose} className="text-[#6B7280] hover:text-[#111827] text-xl">&times;</button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); if (!form.nom) { toast.error('Nom requis'); return; } onSubmit(form); }} className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Fld label="Nom *" value={form.nom} onChange={(v) => setForm({...form, nom: v})} testid="input-nom" />
            <Fld label="Prenom" value={form.prenom} onChange={(v) => setForm({...form, prenom: v})} testid="input-prenom" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">Role</label>
              <select value={form.role} onChange={(e) => setForm({...form, role: e.target.value})} className="w-full px-3 py-2 text-sm border border-[#E5E5E0] rounded-md" data-testid="select-role">
                <option>Producteur</option>
                <option>Travailleur</option>
                <option>Direction</option>
                <option>Resp. SMCD</option>
                <option>Coach formateur</option>
                <option>Jeune</option>
                <option>Femme</option>
              </select>
            </div>
            <Fld label="Telephone" value={form.telephone} onChange={(v) => setForm({...form, telephone: v})} testid="input-tel" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.signature} onChange={(e) => setForm({...form, signature: e.target.checked})} id="sig" className="rounded border-[#E5E5E0]" data-testid="checkbox-signature" />
            <label htmlFor="sig" className="text-xs text-[#374151]">Signature de presence</label>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm border border-[#E5E5E0] rounded-md hover:bg-[#F3F4F6]">Annuler</button>
            <button type="submit" className="flex-1 px-4 py-2 text-sm bg-[#1A3622] text-white rounded-md hover:bg-[#112417]" data-testid="btn-submit-participant">Ajouter</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Fld = ({ label, value, onChange, type = 'text', testid }) => (
  <div>
    <label className="block text-xs font-medium text-[#374151] mb-1">{label}</label>
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#E5E5E0] rounded-md focus:outline-none focus:border-[#1A3622]" data-testid={testid} />
  </div>
);

export default PVPresencePage;

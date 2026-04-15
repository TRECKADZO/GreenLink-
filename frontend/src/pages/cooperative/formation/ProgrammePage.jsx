import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tokenService } from '../../../services/tokenService';
import { toast } from 'sonner';
import {
  BookOpen, Loader2, Home, ChevronRight, Plus, CheckCircle2,
  Clock, XCircle
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const ProgrammePage = () => {
  const navigate = useNavigate();
  const [programme, setProgramme] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const token = tokenService.getToken();
      const res = await fetch(`${API}/api/formation/programmes`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.programmes?.length > 0) setProgramme(data.programmes[0]);
    } catch { toast.error('Erreur'); }
    finally { setLoading(false); }
  };

  const createProgramme = async () => {
    try {
      const token = tokenService.getToken();
      const res = await fetch(`${API}/api/formation/programmes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ titre: 'Programme annuel de formation', campagne: '2025-2026', objectifs: 'Former 100% des producteurs sur les themes obligatoires ARS 1000' }),
      });
      if (!res.ok) throw new Error('Erreur');
      toast.success('Programme cree');
      load();
    } catch { toast.error('Erreur'); }
  };

  if (loading) return <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#1A3622]" /></div>;

  const themes = programme?.themes || [];
  const complets = themes.filter(t => t.statut === 'complete').length;

  return (
    <div className="min-h-screen bg-[#FAF9F6]" data-testid="programme-page">
      <div className="bg-[#1A3622] relative overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-6 relative">
          <div className="flex items-center gap-2 text-white/50 text-xs mb-3">
            <button onClick={() => navigate('/cooperative/dashboard')} className="hover:text-white"><Home className="h-3.5 w-3.5" /></button>
            <ChevronRight className="h-3 w-3" />
            <button onClick={() => navigate('/cooperative/formation')} className="hover:text-white">Formation</button>
            <ChevronRight className="h-3 w-3" />
            <span className="text-white/80">Programme Annuel</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/cooperative/formation')} className="w-8 h-8 rounded-md bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors" data-testid="btn-retour"><ChevronRight className="h-4 w-4 text-white rotate-180" /></button>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">Programme Annuel de Formation</h1>
                <p className="text-sm text-white/60 mt-1">{programme ? `${programme.campagne} | ${complets}/${themes.length} themes completes` : 'Aucun programme'}</p>
              </div>
            </div>
            {programme && (
              <button onClick={() => navigate('/cooperative/formation/sessions?create=1')} className="flex items-center gap-2 px-4 py-2 bg-white text-[#1A3622] rounded-md text-sm font-medium hover:bg-white/90" data-testid="btn-new-session">
                <Plus className="h-4 w-4" /> Planifier une session
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-8">
        {!programme ? (
          <div className="text-center py-16">
            <BookOpen className="h-16 w-16 text-[#D4AF37] mx-auto mb-4" strokeWidth={1} />
            <h2 className="text-xl font-bold text-[#1A3622] mb-2">Aucun programme annuel</h2>
            <p className="text-sm text-[#6B7280] mb-6">Creez le programme pour pre-remplir les 12 themes obligatoires.</p>
            <button onClick={createProgramme} className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1A3622] text-white rounded-md text-sm font-medium hover:bg-[#112417]" data-testid="btn-create-programme">
              <Plus className="h-4 w-4" /> Creer le programme
            </button>
          </div>
        ) : (
          <>
            {/* Progress bar */}
            <div className="bg-white border border-[#E5E5E0] rounded-md p-5 mb-6" data-testid="progress-bar">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#1A3622]">Progression globale</span>
                <span className="text-sm font-bold text-[#1A3622]">{complets}/{themes.length}</span>
              </div>
              <div className="w-full bg-[#F3F4F6] rounded-full h-3 overflow-hidden">
                <div className="h-full rounded-full bg-[#065F46] transition-all duration-700" style={{ width: `${themes.length > 0 ? (complets / themes.length) * 100 : 0}%` }} />
              </div>
            </div>

            {/* Themes grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="themes-grid">
              {themes.map((t, i) => (
                <div key={t.code} className={`border rounded-md overflow-hidden ${t.statut === 'complete' ? 'border-emerald-200 bg-emerald-50/30' : t.statut === 'en_cours' ? 'border-amber-200 bg-amber-50/30' : 'border-[#E5E5E0] bg-white'}`} data-testid={`theme-${t.code}`}>
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-[#1A3622]">{t.titre}</p>
                        <p className="text-[10px] text-[#6B7280] mt-0.5">Clause {t.clause}</p>
                      </div>
                      {t.statut === 'complete' ? <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" /> :
                       t.statut === 'en_cours' ? <Clock className="h-4 w-4 text-amber-600 flex-shrink-0" /> :
                       <XCircle className="h-4 w-4 text-red-400 flex-shrink-0" />}
                    </div>
                    <p className="text-[10px] text-[#6B7280] mb-3">{t.description || ''}</p>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-[#6B7280]">{t.sessions_count || 0} session(s) | {t.participants_count || 0} part.</span>
                      <span className={`font-bold px-1.5 py-0.5 rounded ${t.statut === 'complete' ? 'bg-emerald-100 text-emerald-700' : t.statut === 'en_cours' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                        {t.statut === 'complete' ? 'Complete' : t.statut === 'en_cours' ? 'En cours' : 'A planifier'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ProgrammePage;

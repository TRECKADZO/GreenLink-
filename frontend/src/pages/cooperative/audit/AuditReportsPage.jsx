import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tokenService } from '../../../services/tokenService';
import { toast } from 'sonner';
import {
  FileText, FileSpreadsheet, Download, Loader2, Home,
  ChevronRight, BarChart3
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const AuditReportsPage = () => {
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState('');
  const [sessions, setSessions] = useState([]);
  const [resultats, setResultats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState('');

  useEffect(() => { loadSessions(); }, []);
  useEffect(() => { if (sessionId) loadResultats(); }, [sessionId]);

  const loadSessions = async () => {
    try {
      const token = tokenService.getToken();
      const res = await fetch(`${API}/api/audit/sessions`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setSessions(data.sessions || []);
      if (data.sessions?.length > 0) setSessionId(data.sessions[0].session_id);
      else setLoading(false);
    } catch { setLoading(false); }
  };

  const loadResultats = async () => {
    setLoading(true);
    try {
      const token = tokenService.getToken();
      const res = await fetch(`${API}/api/audit/sessions/${sessionId}/resultats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setResultats(data);
    } catch {
      toast.error('Erreur chargement resultats');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    setExporting(format);
    try {
      const token = tokenService.getToken();
      const res = await fetch(`${API}/api/audit/sessions/${sessionId}/export/${format}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erreur');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_ars1000.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Rapport ${format.toUpperCase()} telecharge`);
    } catch {
      toast.error(`Erreur export ${format}`);
    } finally {
      setExporting('');
    }
  };

  const res = resultats?.resultats || {};
  const ncs = resultats?.tableau_nc || [];

  return (
    <div className="min-h-screen bg-[#FAF9F6]" data-testid="audit-reports-page">
      <div className="bg-[#1A3622] relative overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-6 relative">
          <div className="flex items-center gap-2 text-white/50 text-xs mb-3">
            <button onClick={() => navigate('/cooperative/dashboard')} className="hover:text-white"><Home className="h-3.5 w-3.5" /></button>
            <ChevronRight className="h-3 w-3" />
            <button onClick={() => navigate('/cooperative/audit')} className="hover:text-white">Audit</button>
            <ChevronRight className="h-3 w-3" />
            <span className="text-white/80">Rapports</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Rapports d'Audit</h1>
              <p className="text-sm text-white/60 mt-1">Resultats et exports pour auditeurs ARS 1000</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleExport('excel')} disabled={!!exporting || !sessionId} className="flex items-center gap-2 px-4 py-2 bg-[#065F46] text-white rounded-md text-sm font-medium hover:bg-[#064E3B] disabled:opacity-50" data-testid="btn-export-excel">
                {exporting === 'excel' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />} Excel
              </button>
              <button onClick={() => handleExport('pdf')} disabled={!!exporting || !sessionId} className="flex items-center gap-2 px-4 py-2 bg-white text-[#1A3622] rounded-md text-sm font-medium hover:bg-white/90 disabled:opacity-50" data-testid="btn-export-pdf">
                {exporting === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-8">
        {/* Session selector */}
        {sessions.length > 1 && (
          <div className="mb-6">
            <select value={sessionId} onChange={(e) => setSessionId(e.target.value)} className="px-3 py-2 text-sm border border-[#E5E5E0] rounded-md bg-white" data-testid="select-session">
              {sessions.map(s => <option key={s.session_id} value={s.session_id}>{s.titre} - {s.campagne}</option>)}
            </select>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-[#1A3622]" /></div>
        ) : !resultats ? (
          <div className="text-center py-12 text-sm text-[#6B7280]">Aucune session d'audit disponible.</div>
        ) : (
          <>
            {/* Resultats table (like Excel sheet) */}
            <div className="bg-white border border-[#E5E5E0] rounded-md overflow-hidden mb-8" data-testid="resultats-table">
              <div className="px-5 py-4 border-b border-[#E5E5E0] flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-[#1A3622]" />
                <h3 className="text-sm font-semibold text-[#1A3622]">Resultats d'audit</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#E5E5E0] bg-[#F9FAFB]">
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase text-[#6B7280]"></th>
                      <th className="px-4 py-3 text-center text-[10px] font-bold uppercase text-[#6B7280]" colSpan={2}>ARS 1000-1</th>
                      <th className="px-4 py-3 text-center text-[10px] font-bold uppercase text-[#6B7280]" colSpan={2}>ARS 1000-2</th>
                    </tr>
                    <tr className="border-b border-[#E5E5E0] bg-[#F9FAFB]">
                      <th className="px-4 py-2 text-left text-[10px] font-bold uppercase text-[#6B7280]"></th>
                      <th className="px-4 py-2 text-center text-[10px] font-bold text-[#6B7280]">Nombre</th>
                      <th className="px-4 py-2 text-center text-[10px] font-bold text-[#6B7280]">Taux (%)</th>
                      <th className="px-4 py-2 text-center text-[10px] font-bold text-[#6B7280]">Nombre</th>
                      <th className="px-4 py-2 text-center text-[10px] font-bold text-[#6B7280]">Taux (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[#E5E5E0] bg-emerald-50">
                      <td className="px-4 py-3 text-xs font-medium text-emerald-800">Conformes</td>
                      <td className="px-4 py-3 text-xs text-center font-bold text-emerald-800">{res["ARS 1000-1"]?.conformes?.nombre || 0}</td>
                      <td className="px-4 py-3 text-xs text-center text-emerald-700">{res["ARS 1000-1"]?.conformes?.taux || 0}%</td>
                      <td className="px-4 py-3 text-xs text-center font-bold text-emerald-800">{res["ARS 1000-2"]?.conformes?.nombre || 0}</td>
                      <td className="px-4 py-3 text-xs text-center text-emerald-700">{res["ARS 1000-2"]?.conformes?.taux || 0}%</td>
                    </tr>
                    <tr className="border-b border-[#E5E5E0] bg-red-50">
                      <td className="px-4 py-3 text-xs font-medium text-red-800">Non-conformes</td>
                      <td className="px-4 py-3 text-xs text-center font-bold text-red-800">{res["ARS 1000-1"]?.non_conformes?.nombre || 0}</td>
                      <td className="px-4 py-3 text-xs text-center text-red-700">{res["ARS 1000-1"]?.non_conformes?.taux || 0}%</td>
                      <td className="px-4 py-3 text-xs text-center font-bold text-red-800">{res["ARS 1000-2"]?.non_conformes?.nombre || 0}</td>
                      <td className="px-4 py-3 text-xs text-center text-red-700">{res["ARS 1000-2"]?.non_conformes?.taux || 0}%</td>
                    </tr>
                    <tr className="bg-[#E8F0EA]">
                      <td className="px-4 py-3 text-xs font-bold text-[#1A3622]">Pourcentage de conformite</td>
                      <td className="px-4 py-3 text-xs text-center" colSpan={2}>
                        <span className="text-lg font-bold text-[#1A3622]">{res["ARS 1000-1"]?.pourcentage_conformite || 0}%</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-center" colSpan={2}>
                        <span className="text-lg font-bold text-[#1A3622]">{res["ARS 1000-2"]?.pourcentage_conformite || 0}%</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* NC Table */}
            <div className="bg-white border border-[#E5E5E0] rounded-md overflow-hidden" data-testid="nc-table">
              <div className="px-5 py-4 border-b border-[#E5E5E0]">
                <h3 className="text-sm font-semibold text-[#1A3622]">Tableau des non-conformites</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#E5E5E0] bg-[#F9FAFB]">
                      <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-[#6B7280]">N</th>
                      <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-[#6B7280]">Clause</th>
                      <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-[#6B7280]">Constatation</th>
                      <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-[#6B7280]">Type</th>
                      <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-[#6B7280]">Cause</th>
                      <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-[#6B7280]">Actions</th>
                      <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-[#6B7280]">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E5E0]">
                    {ncs.length === 0 ? (
                      <tr><td colSpan={7} className="px-4 py-6 text-center text-xs text-[#6B7280]">Aucune NC</td></tr>
                    ) : ncs.map(nc => (
                      <tr key={nc.nc_id} className="hover:bg-[#F9FAFB]">
                        <td className="px-3 py-2 text-xs font-mono">{nc.nc_number}</td>
                        <td className="px-3 py-2 text-xs">{nc.clause}</td>
                        <td className="px-3 py-2 text-xs max-w-[200px] truncate">{nc.constatation}</td>
                        <td className="px-3 py-2"><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${nc.type_nc === 'Majeure' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{nc.type_nc}</span></td>
                        <td className="px-3 py-2 text-xs max-w-[150px] truncate">{nc.cause_profonde}</td>
                        <td className="px-3 py-2 text-xs max-w-[150px] truncate">{nc.actions_correctives}</td>
                        <td className="px-3 py-2"><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${nc.statut === 'resolu' ? 'bg-emerald-100 text-emerald-700' : nc.statut === 'en_cours' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{nc.statut}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AuditReportsPage;

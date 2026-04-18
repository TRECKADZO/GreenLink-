import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tokenService } from '../../../services/tokenService';
import { toast } from 'sonner';
import {
  FileText, Download, Loader2, Home, ChevronRight,
  FileSpreadsheet, BarChart3, Users, Package
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const ReportsPage = () => {
  const navigate = useNavigate();
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState('');

  useEffect(() => { loadReportData(); }, []);

  const loadReportData = async () => {
    try {
      const token = tokenService.getToken();
      const res = await fetch(`${API}/api/traceability/reports/audit-data`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erreur');
      setReportData(await res.json());
    } catch {
      toast.error('Erreur chargement des donnees');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    setExporting(format);
    try {
      const token = tokenService.getToken();
      const res = await fetch(`${API}/api/traceability/reports/export/${format}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erreur');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tracabilite_ars1000.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Rapport ${format.toUpperCase()} telecharge`);
    } catch {
      toast.error(`Erreur export ${format}`);
    } finally {
      setExporting('');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#1A3622]" />
      </div>
    );
  }

  const resume = reportData?.resume || {};
  const parProducteur = reportData?.par_producteur || [];
  const parEtape = reportData?.par_etape || [];

  return (
    <div className="min-h-screen bg-[#FAF9F6]" data-testid="reports-page">
      {/* Header */}
      <div className="bg-[#1A3622] relative overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-6 relative">
          <div className="flex items-center gap-2 text-white/50 text-xs mb-3">
            <button onClick={() => navigate('/cooperative/dashboard')} className="hover:text-white"><Home className="h-3.5 w-3.5" /></button>
            <ChevronRight className="h-3 w-3" />
            <button onClick={() => navigate('/cooperative/traceability')} className="hover:text-white">Tracabilite</button>
            <ChevronRight className="h-3 w-3" />
            <span className="text-white/80">Rapports & Audits</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/cooperative/traceability')} className="w-8 h-8 rounded-md bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors" data-testid="btn-retour"><ChevronRight className="h-4 w-4 text-white rotate-180" /></button>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">Rapports & Audits</h1>
                <p className="text-sm text-white/60 mt-1">Generation de rapports pour les auditeurs ARS 1000</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleExport('excel')}
                disabled={!!exporting}
                className="flex items-center gap-2 px-4 py-2 bg-[#065F46] text-white rounded-md text-sm font-medium hover:bg-[#064E3B] transition-colors disabled:opacity-50"
                data-testid="btn-export-excel"
              >
                {exporting === 'excel' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                Export Excel
              </button>
              <button
                onClick={() => handleExport('pdf')}
                disabled={!!exporting}
                className="flex items-center gap-2 px-4 py-2 bg-white text-[#1A3622] rounded-md text-sm font-medium hover:bg-white/90 transition-colors disabled:opacity-50"
                data-testid="btn-export-pdf"
              >
                {exporting === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                Export PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-8">
        {/* Resume KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8" data-testid="report-kpis">
          <ReportKPI label="Total Lots" value={resume.total_lots || 0} />
          <ReportKPI label="Certifies" value={resume.lots_certifies || 0} />
          <ReportKPI label="Conformes" value={resume.lots_conformes || 0} />
          <ReportKPI label="Non conformes" value={resume.lots_non_conformes || 0} color="text-red-600" />
          <ReportKPI label="Volume (kg)" value={(resume.volume_total_kg || 0).toLocaleString('fr-FR')} />
          <ReportKPI label="Taux conform." value={`${resume.taux_conformite || 0}%`} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Par Producteur */}
          <div className="bg-white border border-[#E5E5E0] rounded-md overflow-hidden" data-testid="report-by-farmer">
            <div className="px-5 py-4 border-b border-[#E5E5E0] flex items-center gap-2">
              <Users className="h-4 w-4 text-[#1A3622]" strokeWidth={1.5} />
              <h3 className="text-sm font-semibold text-[#1A3622]">Par Producteur</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E5E5E0] bg-[#F9FAFB]">
                    <th className="px-4 py-2 text-left text-[10px] font-bold uppercase text-[#6B7280]">Producteur</th>
                    <th className="px-4 py-2 text-left text-[10px] font-bold uppercase text-[#6B7280]">Lots</th>
                    <th className="px-4 py-2 text-left text-[10px] font-bold uppercase text-[#6B7280]">Volume</th>
                    <th className="px-4 py-2 text-left text-[10px] font-bold uppercase text-[#6B7280]">Certif.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E0]">
                  {parProducteur.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-6 text-center text-xs text-[#6B7280]">Aucune donnee</td></tr>
                  ) : parProducteur.map((p, i) => (
                    <tr key={p.farmer || `prod-${i}`} className="hover:bg-[#F9FAFB]">
                      <td className="px-4 py-2 text-xs text-[#111827]">{p.farmer}</td>
                      <td className="px-4 py-2 text-xs text-[#374151]">{p.lots}</td>
                      <td className="px-4 py-2 text-xs text-[#374151]">{(p.volume_kg || 0).toLocaleString('fr-FR')} kg</td>
                      <td className="px-4 py-2 text-xs text-[#374151]">{p.certifie}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Par Etape */}
          <div className="bg-white border border-[#E5E5E0] rounded-md overflow-hidden" data-testid="report-by-etape">
            <div className="px-5 py-4 border-b border-[#E5E5E0] flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-[#1A3622]" strokeWidth={1.5} />
              <h3 className="text-sm font-semibold text-[#1A3622]">Par Etape</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E5E5E0] bg-[#F9FAFB]">
                    <th className="px-4 py-2 text-left text-[10px] font-bold uppercase text-[#6B7280]">Etape</th>
                    <th className="px-4 py-2 text-left text-[10px] font-bold uppercase text-[#6B7280]">Lots</th>
                    <th className="px-4 py-2 text-left text-[10px] font-bold uppercase text-[#6B7280]">Volume</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E0]">
                  {parEtape.length === 0 ? (
                    <tr><td colSpan={3} className="px-4 py-6 text-center text-xs text-[#6B7280]">Aucune donnee</td></tr>
                  ) : parEtape.map((e, i) => (
                    <tr key={e.label || `etape-${i}`} className="hover:bg-[#F9FAFB]">
                      <td className="px-4 py-2 text-xs text-[#111827]">{e.label}</td>
                      <td className="px-4 py-2 text-xs text-[#374151]">{e.lots}</td>
                      <td className="px-4 py-2 text-xs text-[#374151]">{(e.volume_kg || 0).toLocaleString('fr-FR')} kg</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ReportKPI = ({ label, value, color = 'text-[#111827]' }) => (
  <div className="bg-white border border-[#E5E5E0] rounded-md p-4">
    <p className="text-[10px] tracking-[0.05em] uppercase font-bold text-[#6B7280]">{label}</p>
    <p className={`text-lg font-bold ${color} mt-1`}>{value}</p>
  </div>
);

export default ReportsPage;

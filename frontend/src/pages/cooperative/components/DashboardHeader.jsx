import React, { useState } from 'react';
import { Building2, Home, UserCircle, Plus, FileDown, Loader2, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { NotificationCenter } from '../../../components/NotificationCenter';
import { useOffline } from '../../../context/OfflineContext';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const DashboardHeader = ({ coopInfo, user, navigate }) => {
  const name = coopInfo?.name || user?.coop_name || 'Cooperative';
  const code = coopInfo?.code || user?.coop_code || 'N/A';
  const certs = coopInfo?.certifications || [];
  const [exporting, setExporting] = useState(false);
  const { isOnline, syncing, pendingCount, lastSync, syncAll } = useOffline();

  const formatSync = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);
    const diff = Math.floor((new Date() - d) / 60000);
    if (diff < 1) return "Sync a l'instant";
    if (diff < 60) return `Sync il y a ${diff}min`;
    return `Sync ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/cooperative/pdf/dashboard-report`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erreur export');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dashboard_${name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Rapport PDF telecharge');
    } catch {
      toast.error('Erreur lors de l\'export PDF');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="bg-[#1A3622] relative overflow-hidden" data-testid="dashboard-header">
      <div className="absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M20 20.5V18H0v-2h20v-2H0v-2h20v-2H0V8h20V6H0V4h20V2H0V0h22v20h2V0h2v20h2V0h2v20h2V0h2v20h2V0h2v22H20v-1.5z\' fill=\'%23ffffff\' fill-opacity=\'1\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")',
      }} />
      <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-6 md:py-8 relative">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="gl-animate-in">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-md bg-white/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-white" strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="gl-heading text-xl md:text-2xl font-bold text-white tracking-tight" data-testid="coop-name">
                  {name}
                </h1>
                <p className="text-sm text-white/50 gl-mono">{code}</p>
              </div>
            </div>
            {certs.length > 0 && (
              <div className="flex gap-2 mt-3 ml-[52px]">
                {certs.map((cert, i) => (
                  <span key={i} className="text-[10px] tracking-[0.08em] uppercase font-bold text-[#D4AF37] bg-[#D4AF37]/10 border border-[#D4AF37]/20 px-2.5 py-1 rounded-sm">
                    {cert}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 gl-animate-in gl-stagger-2">
            {/* Sync Status Indicator */}
            <button
              onClick={syncing ? undefined : syncAll}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs transition-colors ${
                !isOnline
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : syncing
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    : pendingCount > 0
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-pointer hover:bg-emerald-500/30'
                      : 'bg-white/5 text-white/50 border border-white/10'
              }`}
              data-testid="sync-status-indicator"
              title={isOnline ? 'Cliquer pour synchroniser' : 'Mode hors-ligne'}
            >
              {syncing ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : isOnline ? (
                <Wifi className="w-3 h-3" />
              ) : (
                <WifiOff className="w-3 h-3" />
              )}
              <span>
                {syncing ? 'Sync...' : !isOnline ? 'Hors-ligne' : pendingCount > 0 ? `${pendingCount} en attente` : formatSync(lastSync) || 'En ligne'}
              </span>
            </button>
            <Button
              onClick={handleExportPDF}
              disabled={exporting}
              variant="ghost"
              size="sm"
              className="text-[#D4AF37] hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 border border-[#D4AF37]/30"
              title="Exporter le rapport PDF"
              data-testid="export-pdf-btn"
            >
              {exporting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <FileDown className="h-4 w-4 mr-1.5" strokeWidth={1.5} />}
              Export PDF
            </Button>
            <NotificationCenter />
            <Button
              onClick={() => navigate('/')}
              variant="ghost"
              size="sm"
              className="text-white/70 hover:text-white hover:bg-white/10"
              data-testid="home-btn"
            >
              <Home className="h-4 w-4 mr-1.5" strokeWidth={1.5} />
              Accueil
            </Button>
            <Button
              onClick={() => navigate('/profile')}
              variant="ghost"
              size="sm"
              className="text-white/70 hover:text-white hover:bg-white/10"
              data-testid="profile-btn"
            >
              <UserCircle className="h-4 w-4 mr-1.5" strokeWidth={1.5} />
              Profil
            </Button>
            <Button
              onClick={() => navigate('/cooperative/members/new')}
              size="sm"
              className="bg-white text-[#1A3622] hover:bg-white/90 font-semibold"
              data-testid="add-member-btn"
            >
              <Plus className="h-4 w-4 mr-1.5" strokeWidth={2} />
              Ajouter Membre
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

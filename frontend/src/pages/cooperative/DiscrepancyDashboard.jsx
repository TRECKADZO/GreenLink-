import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../../components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '../../components/ui/dialog';
import {
  AlertTriangle, ChevronLeft, Filter, Search, Eye,
  CheckCircle, XCircle, ShieldAlert, TrendingDown, BarChart3,
  ArrowUpRight, ArrowDownRight, Minus, MessageSquare, Loader2,
  Download, FileText
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CLASSIFICATION_COLORS = {
  faible: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', badge: 'bg-green-100 text-green-800' },
  moyen: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-800' },
  important: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', badge: 'bg-red-100 text-red-800' },
};

const STATUT_LABELS = {
  corrige_auto: { label: 'Corrige auto', color: 'bg-green-100 text-green-700' },
  en_attente_validation: { label: 'En attente', color: 'bg-amber-100 text-amber-700' },
  verification_renforcee: { label: 'Verif. renforcee', color: 'bg-red-100 text-red-700' },
  valide: { label: 'Valide', color: 'bg-blue-100 text-blue-700' },
  rejete: { label: 'Rejete', color: 'bg-gray-100 text-gray-700' },
};

const EcartIcon = ({ classification }) => {
  if (classification === 'important') return <AlertTriangle className="h-5 w-5 text-red-500" />;
  if (classification === 'moyen') return <ShieldAlert className="h-5 w-5 text-amber-500" />;
  return <CheckCircle className="h-5 w-5 text-green-500" />;
};

export default function DiscrepancyDashboard() {
  const navigate = useNavigate();
  const [ecarts, setEcarts] = useState([]);
  const [stats, setStats] = useState({ faible: {count:0}, moyen: {count:0}, important: {count:0} });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedEcart, setSelectedEcart] = useState(null);
  const [showValidateDialog, setShowValidateDialog] = useState(false);
  const [validateComment, setValidateComment] = useState('');
  const [validating, setValidating] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchEcarts = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      let url = `${API_URL}/api/ecarts/cooperative?limit=50`;
      if (filter) url += `&classification=${filter}`;
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await r.json();
      setEcarts(data.ecarts || []);
      setStats(data.stats || {});
      setTotal(data.total || 0);
    } catch (err) {
      toast.error('Erreur de chargement');
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchEcarts(); }, [fetchEcarts]);

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const token = localStorage.getItem('token');
      let url = `${API_URL}/api/ecarts/export/pdf`;
      if (filter) url += `?classification=${filter}`;
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error('Erreur export');
      const blob = await r.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `GreenLink_Ecarts_${new Date().toISOString().slice(0,10)}.pdf`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success('Rapport PDF telecharge');
    } catch { toast.error('Erreur lors de l\'export PDF'); }
    setExporting(false);
  };

  const filteredEcarts = ecarts.filter(e => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (e.farmer_name || '').toLowerCase().includes(s) ||
           (e.parcelle_location || '').toLowerCase().includes(s);
  });

  const handleValidate = async (action) => {
    if (!selectedEcart) return;
    setValidating(true);
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(`${API_URL}/api/ecarts/${selectedEcart.id}/validate`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action, commentaire: validateComment })
      });
      if (!r.ok) throw new Error('Erreur');
      toast.success(`Ecart ${action === 'valider' ? 'valide' : action === 'rejeter' ? 'rejete' : 'en verification renforcee'}`);
      setShowValidateDialog(false);
      setSelectedEcart(null);
      setValidateComment('');
      fetchEcarts();
    } catch { toast.error('Erreur de validation'); }
    setValidating(false);
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6" data-testid="discrepancy-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Gestion des Ecarts</h1>
            <p className="text-sm text-gray-500">{total} ecart(s) enregistre(s) — Campagne 2025-2026</p>
          </div>
        </div>
        <Button onClick={handleExportPDF} disabled={exporting || total === 0}
          variant="outline" className="gap-2" data-testid="export-pdf-btn">
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          <span className="hidden sm:inline">Exporter PDF</span>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { key: 'faible', label: 'Faibles', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
          { key: 'moyen', label: 'Moyens', icon: ShieldAlert, color: 'text-amber-600', bg: 'bg-amber-50' },
          { key: 'important', label: 'Importants', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
        ].map(s => (
          <Card key={s.key} className={`p-4 ${s.bg} cursor-pointer transition-all hover:shadow-md ${filter === s.key ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`}
            onClick={() => setFilter(filter === s.key ? '' : s.key)} data-testid={`stat-${s.key}`}>
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={`h-4 w-4 ${s.color}`} />
              <span className="text-xs font-medium text-gray-600">{s.label}</span>
            </div>
            <p className={`text-2xl font-bold ${s.color}`}>{stats[s.key]?.count || 0}</p>
            {stats[s.key]?.perte_prime > 0 && (
              <p className="text-[10px] text-gray-500 mt-1">
                <TrendingDown className="inline h-3 w-3 mr-0.5" />
                {Math.round(stats[s.key].perte_prime).toLocaleString()} XOF
              </p>
            )}
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Rechercher par planteur ou parcelle..." value={search}
            onChange={e => setSearch(e.target.value)} className="pl-9" data-testid="search-ecarts" />
        </div>
        {filter && (
          <Button variant="outline" size="sm" onClick={() => setFilter('')}>
            <XCircle className="h-4 w-4 mr-1" /> Effacer
          </Button>
        )}
      </div>

      {/* Records */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>
      ) : filteredEcarts.length === 0 ? (
        <Card className="p-8 text-center">
          <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Aucun ecart enregistre</p>
          <p className="text-sm text-gray-400 mt-1">Les ecarts apparaitront ici apres les verifications terrain</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredEcarts.map(ecart => {
            const cls = CLASSIFICATION_COLORS[ecart.classification_globale] || CLASSIFICATION_COLORS.faible;
            const statut = STATUT_LABELS[ecart.statut] || STATUT_LABELS.corrige_auto;
            return (
              <Card key={ecart.id} className={`p-4 ${cls.bg} ${cls.border} border cursor-pointer hover:shadow-md transition-all`}
                onClick={() => { setSelectedEcart(ecart); setShowValidateDialog(true); }}
                data-testid={`ecart-card-${ecart.id}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <EcartIcon classification={ecart.classification_globale} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900 text-sm">{ecart.farmer_name}</p>
                        <Badge className={cls.badge + ' text-[10px]'}>{ecart.classification_globale}</Badge>
                        <Badge className={statut.color + ' text-[10px]'}>{statut.label}</Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{ecart.parcelle_location} — {formatDate(ecart.created_at)}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {ecart.ecarts?.slice(0, 3).map((e, i) => (
                          <span key={i} className="inline-flex items-center gap-1 text-[10px] bg-white/70 px-2 py-0.5 rounded border">
                            {e.ecart_pct > 30 ? <ArrowUpRight className="h-3 w-3 text-red-500" /> :
                             e.ecart_pct > 15 ? <ArrowUpRight className="h-3 w-3 text-amber-500" /> :
                             <Minus className="h-3 w-3 text-green-500" />}
                            {e.label}: <strong>{e.ecart_pct}%</strong>
                          </span>
                        ))}
                        {ecart.nb_ecarts > 3 && <span className="text-[10px] text-gray-400">+{ecart.nb_ecarts - 3} autre(s)</span>}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-500">Prime estimee</p>
                    <p className="text-sm font-bold text-gray-900">{Math.round(ecart.prime_estimee_apres || 0).toLocaleString()} <span className="text-[10px] font-normal">XOF</span></p>
                    {ecart.prime_estimee_avant !== ecart.prime_estimee_apres && (
                      <p className="text-[10px] text-red-500 line-through">{Math.round(ecart.prime_estimee_avant || 0).toLocaleString()} XOF</p>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail / Validate Dialog */}
      <Dialog open={showValidateDialog} onOpenChange={setShowValidateDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedEcart && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <EcartIcon classification={selectedEcart.classification_globale} />
                  Detail de l'ecart — {selectedEcart.farmer_name}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Info */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-gray-500">Parcelle:</span><p className="font-medium">{selectedEcart.parcelle_location}</p></div>
                  <div><span className="text-gray-500">Agent:</span><p className="font-medium">{selectedEcart.agent_name}</p></div>
                  <div><span className="text-gray-500">Date:</span><p className="font-medium">{formatDate(selectedEcart.created_at)}</p></div>
                  <div><span className="text-gray-500">Classification:</span>
                    <Badge className={CLASSIFICATION_COLORS[selectedEcart.classification_globale]?.badge}>{selectedEcart.classification_globale}</Badge>
                  </div>
                </div>

                {/* Ecarts detail table */}
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-2 text-xs font-medium text-gray-500">Donnee</th>
                        <th className="text-right p-2 text-xs font-medium text-gray-500">Declare</th>
                        <th className="text-right p-2 text-xs font-medium text-gray-500">Mesure</th>
                        <th className="text-right p-2 text-xs font-medium text-gray-500">Ecart</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {selectedEcart.ecarts?.map((e, i) => {
                        const cls = CLASSIFICATION_COLORS[e.classification] || CLASSIFICATION_COLORS.faible;
                        return (
                          <tr key={i} className={cls.bg}>
                            <td className="p-2 font-medium">{e.label}</td>
                            <td className="p-2 text-right">{typeof e.declare === 'number' ? e.declare.toLocaleString() : e.declare}</td>
                            <td className="p-2 text-right font-semibold">{typeof e.mesure === 'number' ? e.mesure.toLocaleString() : e.mesure}</td>
                            <td className={`p-2 text-right font-bold ${cls.text}`}>{e.ecart_pct}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Prime impact */}
                <Card className="p-3 bg-gray-50">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Impact sur la prime:</span>
                    <span className="font-semibold">{selectedEcart.impact_prime}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm mt-1">
                    <span className="text-gray-600">Prime avant:</span>
                    <span>{Math.round(selectedEcart.prime_estimee_avant || 0).toLocaleString()} XOF</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Prime apres:</span>
                    <span className="font-bold text-gray-900">{Math.round(selectedEcart.prime_estimee_apres || 0).toLocaleString()} XOF</span>
                  </div>
                </Card>

                {/* Agent comment */}
                {selectedEcart.commentaire_agent && (
                  <div className="flex gap-2 text-sm">
                    <MessageSquare className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                    <p className="text-gray-600 italic">"{selectedEcart.commentaire_agent}"</p>
                  </div>
                )}

                {/* Validate actions (only for pending) */}
                {(selectedEcart.statut === 'en_attente_validation' || selectedEcart.statut === 'verification_renforcee') && (
                  <div className="border-t pt-3 space-y-3">
                    <Label>Commentaire de la cooperative (optionnel)</Label>
                    <Input value={validateComment} onChange={e => setValidateComment(e.target.value)}
                      placeholder="Commentaire..." data-testid="validate-comment" />
                    <div className="flex gap-2">
                      <Button onClick={() => handleValidate('valider')} disabled={validating}
                        className="flex-1 bg-green-600 hover:bg-green-700" data-testid="btn-validate-accept">
                        {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                        Valider
                      </Button>
                      <Button onClick={() => handleValidate('rejeter')} disabled={validating}
                        variant="outline" className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                        data-testid="btn-validate-reject">
                        <XCircle className="h-4 w-4 mr-1" /> Rejeter
                      </Button>
                      {selectedEcart.classification_globale === 'important' && (
                        <Button onClick={() => handleValidate('verification_renforcee')} disabled={validating}
                          variant="outline" className="flex-1" data-testid="btn-validate-reinforce">
                          <ShieldAlert className="h-4 w-4 mr-1" /> Renforcer
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

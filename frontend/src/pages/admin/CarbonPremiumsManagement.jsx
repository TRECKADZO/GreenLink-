import { tokenService } from "../../services/tokenService";
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../../components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import {
  ArrowLeft, Leaf, Clock, CheckCircle, XCircle, Banknote, RefreshCw,
  ChevronDown, ChevronUp, Phone, MapPin, TreePine, Users, TrendingUp,
  Settings, Building2, Percent, Save
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const statusConfig = {
  pending: { label: 'En attente', color: 'bg-amber-100 text-amber-800', icon: Clock },
  approved: { label: 'Approuvee', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  paid: { label: 'Payee', color: 'bg-emerald-100 text-emerald-800', icon: Banknote },
  rejected: { label: 'Rejetee', color: 'bg-red-100 text-red-800', icon: XCircle },
};

const formatXOF = (amount) => {
  if (!amount && amount !== 0) return '0 XOF';
  return new Intl.NumberFormat('fr-FR').format(Math.round(amount)) + ' XOF';
};

const CarbonPremiumsManagement = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [config, setConfig] = useState(null);
  const [requests, setRequests] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [newRate, setNewRate] = useState('');
  const [savingRate, setSavingRate] = useState(false);

  const token = tokenService.getToken();
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/admin/carbon-premiums/stats`, { headers });
      if (res.ok) setStats(await res.json());
    } catch (e) { console.error('Stats error', e); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/admin/carbon-premiums/config`, { headers });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setNewRate(String(data.taux_par_hectare || 5000));
      }
    } catch (e) { console.error('Config error', e); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchRequests = useCallback(async () => {
    try {
      const statusParam = filter !== 'all' ? `?status=${filter}` : '';
      const res = await fetch(`${API}/api/admin/carbon-premiums/requests${statusParam}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
        setTotal(data.total || 0);
      }
    } catch (e) { console.error('Requests error', e); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchConfig(), fetchRequests()]);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchStats, fetchConfig, fetchRequests]);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => { fetchRequests(); }, [filter, fetchRequests]);

  const handleApprove = async (id) => {
    setActionLoading(id);
    try {
      const res = await fetch(`${API}/api/admin/carbon-premiums/requests/${id}/validate`, {
        method: 'PUT', headers, body: JSON.stringify({ action: 'approve' })
      });
      if (res.ok) { toast.success('Demande approuvee'); loadAll(); }
      else { const err = await res.json(); toast.error(err.detail || 'Erreur'); }
    } catch (e) { toast.error('Erreur reseau'); }
    setActionLoading(null);
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setActionLoading(rejectTarget);
    try {
      const res = await fetch(`${API}/api/admin/carbon-premiums/requests/${rejectTarget}/validate`, {
        method: 'PUT', headers, body: JSON.stringify({ action: 'reject', rejection_reason: rejectReason })
      });
      if (res.ok) {
        toast.success('Demande rejetee');
        setRejectDialogOpen(false); setRejectTarget(null); setRejectReason('');
        loadAll();
      } else { const err = await res.json(); toast.error(err.detail || 'Erreur'); }
    } catch (e) { toast.error('Erreur reseau'); }
    setActionLoading(null);
  };

  const handlePay = async (id) => {
    if (!window.confirm('Confirmer le paiement Orange Money ?')) return;
    setActionLoading(id);
    try {
      const res = await fetch(`${API}/api/admin/carbon-premiums/requests/${id}/pay`, { method: 'PUT', headers });
      if (res.ok) { const data = await res.json(); toast.success(`Paiement: ${formatXOF(data.farmer_payment?.amount)}`); loadAll(); }
      else { const err = await res.json(); toast.error(err.detail || 'Erreur paiement'); }
    } catch (e) { toast.error('Erreur reseau'); }
    setActionLoading(null);
  };

  const handleSaveRate = async () => {
    const rate = parseFloat(newRate);
    if (!rate || rate <= 0) { toast.error('Taux invalide'); return; }
    setSavingRate(true);
    try {
      const res = await fetch(`${API}/api/admin/carbon-premiums/config/rate`, {
        method: 'PUT', headers, body: JSON.stringify({ taux_par_hectare: rate })
      });
      if (res.ok) {
        toast.success(`Taux mis a jour: ${rate.toLocaleString('fr-FR')} XOF`);
        setShowConfigDialog(false);
        fetchConfig();
      } else { const err = await res.json(); toast.error(err.detail || 'Erreur'); }
    } catch (e) { toast.error('Erreur reseau'); }
    setSavingRate(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-500"></div>
      </div>
    );
  }

  const rep = config?.repartition || {};

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100" data-testid="carbon-premiums-management">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/dashboard')} className="text-slate-400 hover:text-white" data-testid="back-btn">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Leaf className="w-7 h-7 text-emerald-400" />
            <div>
              <h1 className="text-xl font-bold text-white">Gestion Primes Carbone</h1>
              <p className="text-sm text-slate-400">Ventilation RSE et paiements</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowConfigDialog(true)} className="border-slate-700 text-slate-300 hover:bg-slate-800" data-testid="config-btn">
              <Settings className="w-4 h-4 mr-2" />Taux: {config?.taux_par_hectare?.toLocaleString('fr-FR')} XOF
            </Button>
            <Button variant="outline" size="sm" onClick={loadAll} className="border-slate-700 text-slate-300 hover:bg-slate-800" data-testid="refresh-btn">
              <RefreshCw className="w-4 h-4 mr-2" />Actualiser
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Formula Banner (Admin only) */}
        <Card className="bg-slate-900/60 border-slate-700">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider font-medium">Formule RSE (confidentielle)</p>
            <p className="text-sm text-slate-300">RSE = Score x <span className="text-emerald-400 font-bold">{config?.taux_par_hectare?.toLocaleString('fr-FR')} XOF</span> x Hectares</p>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <Badge className="bg-red-900/30 text-red-300 border-red-700/30">{rep.frais_pct || 30}% Frais</Badge>
              <span className="text-slate-600">|</span>
              <Badge className="bg-emerald-900/30 text-emerald-300 border-emerald-700/30">{rep.distributable_pct || 70}% Distribue :</Badge>
              <Badge className="bg-blue-900/30 text-blue-300 border-blue-700/30">{rep.greenlink_pct || 25}% GreenLink</Badge>
              <Badge className="bg-purple-900/30 text-purple-300 border-purple-700/30">{rep.cooperative_pct || 5}% Coop</Badge>
              <Badge className="bg-amber-900/30 text-amber-300 border-amber-700/30">{rep.paysan_pct || 70}% Paysan</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="stats-grid">
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10"><Clock className="w-5 h-5 text-amber-400" /></div>
                <div>
                  <p className="text-sm text-slate-400">En attente</p>
                  <p className="text-2xl font-bold text-amber-400" data-testid="stat-pending">{stats?.demandes_en_attente || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10"><CheckCircle className="w-5 h-5 text-blue-400" /></div>
                <div>
                  <p className="text-sm text-slate-400">Approuvees</p>
                  <p className="text-2xl font-bold text-blue-400" data-testid="stat-approved">{stats?.demandes_approuvees || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10"><Banknote className="w-5 h-5 text-emerald-400" /></div>
                <div>
                  <p className="text-sm text-slate-400">Payees</p>
                  <p className="text-2xl font-bold text-emerald-400" data-testid="stat-paid">{stats?.demandes_payees || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10"><XCircle className="w-5 h-5 text-red-400" /></div>
                <div>
                  <p className="text-sm text-slate-400">Rejetees</p>
                  <p className="text-2xl font-bold text-red-400" data-testid="stat-rejected">{stats?.demandes_rejetees || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Financial Breakdown (Admin sees full RSE) */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
            <CardContent className="p-3">
              <p className="text-[10px] text-slate-500 uppercase">RSE Total</p>
              <p className="text-lg font-bold text-white" data-testid="total-rse">{formatXOF(stats?.total_rse)}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-900/20 to-slate-900 border-red-800/20">
            <CardContent className="p-3">
              <p className="text-[10px] text-red-400/60 uppercase">Frais (30%)</p>
              <p className="text-lg font-bold text-red-300" data-testid="total-frais">{formatXOF(stats?.total_frais)}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-900/20 to-slate-900 border-blue-800/20">
            <CardContent className="p-3">
              <p className="text-[10px] text-blue-400/60 uppercase">GreenLink (25%)</p>
              <p className="text-lg font-bold text-blue-300" data-testid="total-greenlink">{formatXOF(stats?.total_greenlink)}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-900/20 to-slate-900 border-purple-800/20">
            <CardContent className="p-3">
              <p className="text-[10px] text-purple-400/60 uppercase">Cooperatives (5%)</p>
              <p className="text-lg font-bold text-purple-300" data-testid="total-coops">{formatXOF(stats?.total_paye_cooperatives)}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-900/20 to-slate-900 border-emerald-800/20">
            <CardContent className="p-3">
              <p className="text-[10px] text-emerald-400/60 uppercase">Paysans (70%)</p>
              <p className="text-lg font-bold text-emerald-300" data-testid="total-farmers">{formatXOF(stats?.total_paye_planteurs)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter + Requests Table */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-white">Demandes de paiement ({total})</CardTitle>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-44 bg-slate-800 border-slate-700 text-slate-200" data-testid="filter-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="all">Toutes</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="approved">Approuvees</SelectItem>
                  <SelectItem value="paid">Payees</SelectItem>
                  <SelectItem value="rejected">Rejetees</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {requests.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Leaf className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>Aucune demande {filter !== 'all' ? `avec statut "${filter}"` : ''}</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {requests.map((req) => {
                  const cfg = statusConfig[req.status] || statusConfig.pending;
                  const StatusIcon = cfg.icon;
                  const isExpanded = expandedId === req.id;
                  return (
                    <div key={req.id} className="hover:bg-slate-800/40 transition-colors" data-testid={`request-row-${req.id}`}>
                      <div className="px-4 py-3 flex items-center gap-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : req.id)}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-white truncate">{req.farmer_name}</span>
                            <Badge className={`${cfg.color} text-xs`}><StatusIcon className="w-3 h-3 mr-1" />{cfg.label}</Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-slate-400">
                            <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{req.farmer_phone}</span>
                            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{req.coop_name || '-'}</span>
                            <span className="flex items-center gap-1"><TreePine className="w-3 h-3" />{req.parcels_count} parcelle(s)</span>
                            <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" />Score: {req.average_carbon_score}/10</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-slate-500">RSE: {formatXOF(req.rse_total)}</p>
                          <p className="font-bold text-emerald-400">Paysan: {formatXOF(req.farmer_amount)}</p>
                          <p className="text-xs text-purple-400">Coop: {formatXOF(req.coop_commission)}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {req.status === 'pending' && (
                            <>
                              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={(e) => { e.stopPropagation(); handleApprove(req.id); }} disabled={actionLoading === req.id} data-testid={`approve-btn-${req.id}`}>
                                <CheckCircle className="w-4 h-4 mr-1" />Approuver
                              </Button>
                              <Button size="sm" variant="outline" className="border-red-700 text-red-400 hover:bg-red-900/30" onClick={(e) => { e.stopPropagation(); setRejectTarget(req.id); setRejectDialogOpen(true); }} disabled={actionLoading === req.id} data-testid={`reject-btn-${req.id}`}>
                                <XCircle className="w-4 h-4 mr-1" />Rejeter
                              </Button>
                            </>
                          )}
                          {req.status === 'approved' && (
                            <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white" onClick={(e) => { e.stopPropagation(); handlePay(req.id); }} disabled={actionLoading === req.id} data-testid={`pay-btn-${req.id}`}>
                              <Banknote className="w-4 h-4 mr-1" />Payer OM
                            </Button>
                          )}
                          {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="px-4 pb-4 bg-slate-800/30 border-t border-slate-800" data-testid={`request-detail-${req.id}`}>
                          {/* RSE Breakdown */}
                          <div className="grid grid-cols-5 gap-2 py-3 text-xs">
                            <div className="bg-slate-800/60 rounded p-2 text-center">
                              <p className="text-slate-500">RSE Total</p>
                              <p className="font-bold text-white">{formatXOF(req.rse_total)}</p>
                            </div>
                            <div className="bg-red-900/20 rounded p-2 text-center">
                              <p className="text-red-400/60">Frais 30%</p>
                              <p className="font-bold text-red-300">{formatXOF(req.frais)}</p>
                            </div>
                            <div className="bg-blue-900/20 rounded p-2 text-center">
                              <p className="text-blue-400/60">GreenLink 25%</p>
                              <p className="font-bold text-blue-300">{formatXOF(req.greenlink_share)}</p>
                            </div>
                            <div className="bg-purple-900/20 rounded p-2 text-center">
                              <p className="text-purple-400/60">Coop 5%</p>
                              <p className="font-bold text-purple-300">{formatXOF(req.coop_commission)}</p>
                            </div>
                            <div className="bg-emerald-900/20 rounded p-2 text-center">
                              <p className="text-emerald-400/60">Paysan 70%</p>
                              <p className="font-bold text-emerald-300">{formatXOF(req.farmer_amount)}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-2 text-sm">
                            <div><span className="text-slate-500">Surface</span><p className="font-medium text-white">{req.total_area_hectares} ha</p></div>
                            <div><span className="text-slate-500">Score moyen</span><p className="font-medium text-white">{req.average_carbon_score}/10</p></div>
                            <div><span className="text-slate-500">Taux applique</span><p className="font-medium text-white">{req.taux_par_hectare?.toLocaleString('fr-FR')} XOF</p></div>
                            <div><span className="text-slate-500">Via</span><p className="font-medium text-white uppercase">{req.requested_via}</p></div>
                          </div>
                          {req.parcels && req.parcels.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs font-medium text-slate-400 mb-2">Parcelles</p>
                              <table className="w-full text-sm">
                                <thead><tr className="text-slate-500 border-b border-slate-700">
                                  <th className="text-left py-1 pr-4">Village</th>
                                  <th className="text-right py-1 pr-4">Surface (ha)</th>
                                  <th className="text-right py-1 pr-4">Score</th>
                                  <th className="text-right py-1">Part paysan</th>
                                </tr></thead>
                                <tbody>
                                  {req.parcels.map((p, i) => (
                                    <tr key={`el-${i}`} className="border-b border-slate-800/50">
                                      <td className="py-1 pr-4 text-white">{p.village || '-'}</td>
                                      <td className="py-1 pr-4 text-right text-slate-300">{p.area_hectares}</td>
                                      <td className="py-1 pr-4 text-right text-slate-300">{p.carbon_score}/10</td>
                                      <td className="py-1 text-right text-emerald-400">{formatXOF(p.prime)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Rejeter la demande</DialogTitle>
            <DialogDescription className="text-slate-400">Indiquez le motif du rejet.</DialogDescription>
          </DialogHeader>
          <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Motif du rejet..." className="bg-slate-800 border-slate-700 text-white" data-testid="reject-reason-input" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectDialogOpen(false)} className="text-slate-400">Annuler</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleReject} disabled={actionLoading} data-testid="confirm-reject-btn">Confirmer le rejet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Config Dialog - Change Rate */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Settings className="w-5 h-5 text-emerald-400" />Configuration du taux</DialogTitle>
            <DialogDescription className="text-slate-400">Modifier le taux XOF par point de score par hectare.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
              <p className="text-xs text-slate-500 uppercase">Repartition RSE</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between"><span className="text-red-300">Frais</span><span className="text-white font-medium">30%</span></div>
                <div className="flex justify-between"><span className="text-slate-300">Distribue</span><span className="text-white font-medium">70%</span></div>
                <div className="flex justify-between"><span className="text-blue-300">GreenLink</span><span className="text-white font-medium">25%</span></div>
                <div className="flex justify-between"><span className="text-purple-300">Cooperative</span><span className="text-white font-medium">5%</span></div>
                <div className="flex justify-between"><span className="text-emerald-300">Paysan</span><span className="text-white font-medium">70%</span></div>
              </div>
            </div>
            <div>
              <label className="text-sm text-slate-400 block mb-1">Taux par score/hectare (XOF)</label>
              <Input type="number" value={newRate} onChange={(e) => setNewRate(e.target.value)} className="bg-slate-800 border-slate-700 text-white" data-testid="rate-input" />
              <p className="text-xs text-slate-500 mt-1">Formule: score x {parseInt(newRate || 0).toLocaleString('fr-FR')} XOF x hectares</p>
              <p className="text-xs text-slate-500">Ex: score 7.5, 3ha = {(7.5 * parseFloat(newRate || 0) * 3).toLocaleString('fr-FR')} XOF RSE total, paysan = {Math.round(7.5 * parseFloat(newRate || 0) * 3 * 0.70 * 0.70).toLocaleString('fr-FR')} XOF</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowConfigDialog(false)} className="text-slate-400">Annuler</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSaveRate} disabled={savingRate} data-testid="save-rate-btn">
              <Save className="w-4 h-4 mr-2" />{savingRate ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CarbonPremiumsManagement;

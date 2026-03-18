import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/use-toast';
import Navbar from '../../components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '../../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  FileText, CheckCircle2, XCircle, Clock, Users, Search,
  Eye, Shield, Ban, Trash2, Power, ChevronLeft, ChevronRight,
  Loader2, AlertTriangle, Building2, Percent, DollarSign
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const QuotesManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('quotes');
  const [quotes, setQuotes] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [stats, setStats] = useState({});
  const [accountStats, setAccountStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Detail / Action dialogs
  const [detailDialog, setDetailDialog] = useState({ open: false, quote: null });
  const [actionDialog, setActionDialog] = useState({ open: false, type: '', target: null });
  const [adminNote, setAdminNote] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [commissionRate, setCommissionRate] = useState('');
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [duration, setDuration] = useState('365');
  const [actionReason, setActionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchQuotes = useCallback(async () => {
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const { data } = await axios.get(`${API_URL}/api/admin/quotes`, { headers, params });
      setQuotes(data.quotes || []);
      setStats(data.stats || {});
    } catch (err) {
      console.error('Error fetching quotes:', err);
    }
  }, [statusFilter]);

  const fetchAccounts = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/admin/devis-accounts`, { headers });
      setAccounts(data.accounts || []);
      setAccountStats(data.stats || {});
    } catch (err) {
      console.error('Error fetching accounts:', err);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchQuotes(), fetchAccounts()]);
      setLoading(false);
    };
    load();
  }, [fetchQuotes, fetchAccounts]);

  const handleQuoteAction = async (quoteId, action) => {
    setProcessing(true);
    try {
      const body = {
        action,
        admin_note: adminNote || null,
        custom_price_xof: customPrice ? parseInt(customPrice) : null,
        commission_rate: commissionRate ? parseFloat(commissionRate) : null,
        billing_cycle: billingCycle || 'monthly',
        subscription_duration_days: duration ? parseInt(duration) : 365,
      };
      await axios.put(`${API_URL}/api/admin/quotes/${quoteId}`, body, { headers });
      toast({ title: action === 'approve' ? 'Devis approuve' : 'Devis refuse', description: 'Action effectuee avec succes' });
      setDetailDialog({ open: false, quote: null });
      setActionDialog({ open: false, type: '', target: null });
      setAdminNote('');
      setCustomPrice('');
      setCommissionRate('');
      setBillingCycle('monthly');
      await Promise.all([fetchQuotes(), fetchAccounts()]);
    } catch (err) {
      toast({ title: 'Erreur', description: err.response?.data?.detail || 'Erreur lors du traitement', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleAccountAction = async (userId, action) => {
    setProcessing(true);
    try {
      await axios.put(`${API_URL}/api/admin/accounts/${userId}/action`, { action, reason: actionReason || null }, { headers });
      toast({ title: 'Action effectuee', description: `Compte ${action === 'activate' ? 'active' : action === 'suspend' ? 'suspendu' : 'supprime'}` });
      setActionDialog({ open: false, type: '', target: null });
      setActionReason('');
      await fetchAccounts();
    } catch (err) {
      toast({ title: 'Erreur', description: err.response?.data?.detail || 'Erreur', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (s) => {
    const map = {
      pending: { color: 'bg-amber-100 text-amber-700 border-amber-200', label: 'En attente', icon: Clock },
      approved: { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Approuve', icon: CheckCircle2 },
      rejected: { color: 'bg-red-100 text-red-700 border-red-200', label: 'Refuse', icon: XCircle },
      cancelled: { color: 'bg-gray-100 text-gray-500 border-gray-200', label: 'Annule', icon: XCircle },
    };
    const cfg = map[s] || map.pending;
    const Icon = cfg.icon;
    return <Badge className={`${cfg.color} border gap-1`}><Icon className="h-3 w-3" />{cfg.label}</Badge>;
  };

  const getAccountBadge = (s) => {
    const map = {
      active: { color: 'bg-emerald-100 text-emerald-700', label: 'Actif' },
      trial: { color: 'bg-blue-100 text-blue-700', label: 'Essai' },
      suspended: { color: 'bg-red-100 text-red-700', label: 'Suspendu' },
      expired: { color: 'bg-gray-100 text-gray-600', label: 'Expire' },
      pending_quote: { color: 'bg-amber-100 text-amber-700', label: 'Devis en attente' },
      deleted: { color: 'bg-gray-200 text-gray-500', label: 'Supprime' },
    };
    const cfg = map[s] || { color: 'bg-gray-100 text-gray-600', label: s || 'Inconnu' };
    return <Badge className={cfg.color}>{cfg.label}</Badge>;
  };

  const filteredQuotes = quotes.filter(q =>
    !searchTerm || (q.company_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (q.user_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAccounts = accounts.filter(a =>
    !searchTerm || (a.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" data-testid="quotes-management-page">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="h-6 w-6 text-emerald-600" />
              Gestion des Devis & Abonnements
            </h1>
            <p className="text-sm text-gray-500 mt-1">Gerez les demandes de devis et les comptes fournisseurs</p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Devis en attente', value: stats.pending || 0, color: 'text-amber-600', bg: 'bg-amber-50', icon: Clock },
            { label: 'Devis approuves', value: stats.approved || 0, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle2 },
            { label: 'Devis refuses', value: stats.rejected || 0, color: 'text-red-600', bg: 'bg-red-50', icon: XCircle },
            { label: 'Comptes actifs', value: accountStats.active || 0, color: 'text-blue-600', bg: 'bg-blue-50', icon: Users },
            { label: 'Comptes suspendus', value: accountStats.suspended || 0, color: 'text-gray-600', bg: 'bg-gray-100', icon: Ban },
          ].map((kpi, i) => (
            <Card key={i} className={`border-0 shadow-sm ${kpi.bg}`}>
              <CardContent className="p-4 flex items-center gap-3">
                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                <div>
                  <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
                  <p className="text-[11px] text-gray-500">{kpi.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <Button variant={activeTab === 'quotes' ? 'default' : 'outline'} size="sm" onClick={() => setActiveTab('quotes')} data-testid="tab-quotes">
            <FileText className="h-4 w-4 mr-1" /> Devis ({stats.pending || 0} en attente)
          </Button>
          <Button variant={activeTab === 'accounts' ? 'default' : 'outline'} size="sm" onClick={() => setActiveTab('accounts')} data-testid="tab-accounts">
            <Users className="h-4 w-4 mr-1" /> Comptes sur devis
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-4 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Rechercher..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" data-testid="quotes-search" />
        </div>

        {/* QUOTES TAB */}
        {activeTab === 'quotes' && (
          <div>
            {/* Status filter */}
            <div className="flex gap-2 mb-4">
              {[
                { value: '', label: 'Tous' },
                { value: 'pending', label: 'En attente' },
                { value: 'approved', label: 'Approuves' },
                { value: 'rejected', label: 'Refuses' },
              ].map(f => (
                <Button key={f.value} variant={statusFilter === f.value ? 'default' : 'ghost'} size="sm" onClick={() => setStatusFilter(f.value)}>
                  {f.label}
                </Button>
              ))}
            </div>

            {filteredQuotes.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-12 text-center">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Aucun devis {statusFilter === 'pending' ? 'en attente' : ''}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3" data-testid="quotes-list">
                {filteredQuotes.map(q => (
                  <Card key={q.id} className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => setDetailDialog({ open: true, quote: q })} data-testid={`quote-${q.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-emerald-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{q.company_name}</h3>
                            <p className="text-sm text-gray-500">{q.contact_name} | {q.user_type}</p>
                            <p className="text-xs text-gray-400 mt-1">{q.description?.substring(0, 100)}{q.description?.length > 100 ? '...' : ''}</p>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end gap-1">
                          {getStatusBadge(q.status)}
                          <span className="text-[10px] text-gray-400">{q.submitted_at ? new Date(q.submitted_at).toLocaleDateString('fr-FR') : ''}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ACCOUNTS TAB */}
        {activeTab === 'accounts' && (
          <div className="grid gap-3" data-testid="devis-accounts-list">
            {filteredAccounts.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-12 text-center">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Aucun compte sur devis</p>
                </CardContent>
              </Card>
            ) : (
              filteredAccounts.map(a => (
                <Card key={a.id} className="border-0 shadow-sm" data-testid={`account-${a.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                          <Users className="h-5 w-5 text-gray-500" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm">{a.name}</h3>
                          <p className="text-xs text-gray-500">{a.email || a.phone} | {a.user_type}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getAccountBadge(a.subscription_status)}
                        <div className="flex gap-1 ml-2">
                          {a.subscription_status !== 'active' && a.subscription_status !== 'deleted' && (
                            <Button size="sm" variant="outline" className="h-8 text-emerald-600 hover:bg-emerald-50 border-emerald-200" onClick={() => setActionDialog({ open: true, type: 'activate', target: a })} data-testid={`activate-btn-${a.id}`}>
                              <Power className="h-3.5 w-3.5 mr-1" />Activer
                            </Button>
                          )}
                          {a.subscription_status !== 'suspended' && a.subscription_status !== 'deleted' && (
                            <Button size="sm" variant="outline" className="h-8 text-amber-600 hover:bg-amber-50 border-amber-200" onClick={() => setActionDialog({ open: true, type: 'suspend', target: a })} data-testid={`suspend-btn-${a.id}`}>
                              <Ban className="h-3.5 w-3.5 mr-1" />Suspendre
                            </Button>
                          )}
                          {a.subscription_status !== 'deleted' && (
                            <Button size="sm" variant="outline" className="h-8 text-red-600 hover:bg-red-50 border-red-200" onClick={() => setActionDialog({ open: true, type: 'delete', target: a })} data-testid={`delete-btn-${a.id}`}>
                              <Trash2 className="h-3.5 w-3.5 mr-1" />Supprimer
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      {/* QUOTE DETAIL DIALOG */}
      <Dialog open={detailDialog.open} onOpenChange={(o) => !o && setDetailDialog({ open: false, quote: null })}>
        <DialogContent className="max-w-lg" data-testid="quote-detail-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-emerald-600" /> Detail du devis</DialogTitle>
          </DialogHeader>
          {detailDialog.quote && (() => {
            const q = detailDialog.quote;
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-gray-500">Entreprise:</span> <span className="font-medium">{q.company_name}</span></div>
                  <div><span className="text-gray-500">Contact:</span> <span className="font-medium">{q.contact_name}</span></div>
                  <div><span className="text-gray-500">Email:</span> <span className="font-medium">{q.contact_email || '-'}</span></div>
                  <div><span className="text-gray-500">Telephone:</span> <span className="font-medium">{q.contact_phone || q.user_phone || '-'}</span></div>
                  <div><span className="text-gray-500">Type:</span> <span className="font-medium">{q.business_type}</span></div>
                  <div><span className="text-gray-500">Facturation:</span> <span className="font-medium">{q.billing_preference}</span></div>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">Description:</span>
                  <p className="mt-1 text-gray-800 bg-gray-50 rounded-lg p-3">{q.description}</p>
                </div>
                {q.target_regions?.length > 0 && (
                  <div className="text-sm">
                    <span className="text-gray-500">Regions ciblees:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {q.target_regions.map((r, i) => <Badge key={i} variant="outline" className="text-xs">{r}</Badge>)}
                    </div>
                  </div>
                )}
                {q.needs && <div className="text-sm"><span className="text-gray-500">Besoins:</span> <p className="text-gray-800">{q.needs}</p></div>}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Statut:</span> {getStatusBadge(q.status)}
                </div>

                {q.status === 'pending' && (
                  <div className="border-t pt-4 space-y-3">
                    <h4 className="font-semibold text-sm">Tarification du devis</h4>

                    {/* Montant abonnement + cycle */}
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 font-medium">Montant abonnement (XOF) *</label>
                        <Input type="number" placeholder="Ex: 50000" value={customPrice} onChange={e => setCustomPrice(e.target.value)} data-testid="custom-price-input" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 font-medium">Cycle de facturation</label>
                        <Select value={billingCycle} onValueChange={setBillingCycle}>
                          <SelectTrigger data-testid="billing-cycle-select"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="monthly">Mensuel</SelectItem>
                            <SelectItem value="quarterly">Trimestriel</SelectItem>
                            <SelectItem value="yearly">Annuel</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 font-medium">Duree (jours)</label>
                        <Input type="number" placeholder="365" value={duration} onChange={e => setDuration(e.target.value)} data-testid="duration-input" />
                      </div>
                    </div>

                    {/* Commission fournisseur (affiché seulement pour fournisseur) */}
                    {(q.user_type === 'fournisseur' || q.business_type === 'intrants' || q.business_type === 'semences' || q.business_type === 'equipements') && (
                      <div className="bg-blue-50 rounded-lg p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <Percent className="h-4 w-4 text-blue-600" />
                          <label className="text-xs text-blue-700 font-semibold">Commission sur chaque vente (fournisseur)</label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input type="number" step="0.5" min="0" max="100" placeholder="Ex: 5" value={commissionRate} onChange={e => setCommissionRate(e.target.value)} className="max-w-[120px]" data-testid="commission-rate-input" />
                          <span className="text-sm text-blue-700 font-medium">%</span>
                          <span className="text-xs text-blue-500">(recommande: 3 a 5%)</span>
                        </div>
                      </div>
                    )}

                    {/* Recapitulatif */}
                    {customPrice && (
                      <div className="bg-emerald-50 rounded-lg p-3 text-sm">
                        <p className="font-semibold text-emerald-800 mb-1">Recapitulatif du devis :</p>
                        <p className="text-emerald-700">
                          Abonnement : <strong>{parseInt(customPrice).toLocaleString('fr-FR')} XOF / {billingCycle === 'monthly' ? 'mois' : billingCycle === 'quarterly' ? 'trimestre' : 'an'}</strong>
                        </p>
                        {commissionRate && parseFloat(commissionRate) > 0 && (
                          <p className="text-emerald-700">Commission sur ventes : <strong>{commissionRate}%</strong></p>
                        )}
                        <p className="text-emerald-700">Duree : <strong>{duration || 365} jours</strong></p>
                      </div>
                    )}

                    <div>
                      <label className="text-xs text-gray-500">Note admin</label>
                      <Textarea placeholder="Note optionnelle..." value={adminNote} onChange={e => setAdminNote(e.target.value)} rows={2} data-testid="admin-note-input" />
                    </div>
                    <div className="flex gap-2">
                      <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" disabled={processing || !customPrice} onClick={() => handleQuoteAction(q.id, 'approve')} data-testid="approve-quote-btn">
                        {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle2 className="h-4 w-4 mr-1" /> Approuver</>}
                      </Button>
                      <Button variant="outline" className="flex-1 text-red-600 border-red-200 hover:bg-red-50" disabled={processing} onClick={() => handleQuoteAction(q.id, 'reject')} data-testid="reject-quote-btn">
                        <XCircle className="h-4 w-4 mr-1" /> Refuser
                      </Button>
                    </div>
                  </div>
                )}
                {q.admin_note && q.status !== 'pending' && (
                  <div className="bg-blue-50 rounded-lg p-3 text-sm">
                    <span className="text-blue-700 font-medium">Note admin:</span> <span className="text-blue-800">{q.admin_note}</span>
                  </div>
                )}
                {q.status === 'approved' && q.custom_price_xof && (
                  <div className="bg-emerald-50 rounded-lg p-3 text-sm space-y-1">
                    <p className="font-semibold text-emerald-800">Tarification approuvee :</p>
                    <p className="text-emerald-700">Abonnement : <strong>{q.custom_price_xof.toLocaleString('fr-FR')} XOF / {q.billing_cycle === 'monthly' ? 'mois' : q.billing_cycle === 'quarterly' ? 'trimestre' : q.billing_cycle === 'yearly' ? 'an' : 'mois'}</strong></p>
                    {q.commission_rate > 0 && <p className="text-emerald-700">Commission sur ventes : <strong>{q.commission_rate}%</strong></p>}
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ACCOUNT ACTION DIALOG */}
      <Dialog open={actionDialog.open} onOpenChange={(o) => !o && setActionDialog({ open: false, type: '', target: null })}>
        <DialogContent data-testid="account-action-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionDialog.type === 'activate' && <><Power className="h-5 w-5 text-emerald-600" /> Activer le compte</>}
              {actionDialog.type === 'suspend' && <><Ban className="h-5 w-5 text-amber-600" /> Suspendre le compte</>}
              {actionDialog.type === 'delete' && <><Trash2 className="h-5 w-5 text-red-600" /> Supprimer le compte</>}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.target && `${actionDialog.target.name} (${actionDialog.target.email || actionDialog.target.phone})`}
            </DialogDescription>
          </DialogHeader>
          {actionDialog.type !== 'activate' && (
            <div>
              <label className="text-sm text-gray-600">Raison</label>
              <Textarea placeholder="Indiquez la raison..." value={actionReason} onChange={e => setActionReason(e.target.value)} rows={3} data-testid="action-reason-input" />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog({ open: false, type: '', target: null })}>Annuler</Button>
            <Button
              className={actionDialog.type === 'delete' ? 'bg-red-600 hover:bg-red-700' : actionDialog.type === 'suspend' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'}
              disabled={processing}
              onClick={() => handleAccountAction(actionDialog.target.id, actionDialog.type)}
              data-testid="confirm-action-btn"
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuotesManagement;

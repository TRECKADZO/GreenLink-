import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import Navbar from '../../components/Navbar';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  FileText, DollarSign, Users, TrendingUp, Clock, AlertCircle,
  Plus, Send, CheckCircle, XCircle, ArrowUpRight, ArrowDownRight,
  Calendar, Building2, Receipt, CreditCard, Download, RefreshCcw,
  ChevronLeft
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const apiClient = {
  get: async (url) => {
    const token = localStorage.getItem('token');
    return axios.get(`${API_URL}${url}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
  },
  post: async (url, data) => {
    const token = localStorage.getItem('token');
    return axios.post(`${API_URL}${url}`, data, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
  },
  put: async (url, data) => {
    const token = localStorage.getItem('token');
    return axios.put(`${API_URL}${url}`, data, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
  }
};

const BillingDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [distributions, setDistributions] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  
  const [invoiceForm, setInvoiceForm] = useState({
    buyer_name: '',
    buyer_email: '',
    buyer_address: '',
    buyer_tax_id: '',
    description: '',
    tonnes_co2: 0,
    price_per_tonne_usd: 30,
    payment_terms_days: 30,
    notes: ''
  });
  
  const [paymentForm, setPaymentForm] = useState({
    amount_usd: 0,
    payment_method: 'bank_transfer',
    payment_reference: '',
    notes: ''
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.user_type !== 'admin') {
      toast.error('Accès refusé', { description: 'Réservé aux administrateurs' });
      navigate('/');
      return;
    }
    fetchAllData();
  }, [user, authLoading]);

  const fetchAllData = async () => {
    try {
      const [dashboardRes, invoicesRes, distributionsRes, paymentsRes] = await Promise.all([
        apiClient.get('/api/billing/dashboard'),
        apiClient.get('/api/billing/invoices'),
        apiClient.get('/api/billing/distributions'),
        apiClient.get('/api/billing/payments/history')
      ]);
      setDashboard(dashboardRes.data);
      setInvoices(invoicesRes.data.invoices || []);
      setDistributions(distributionsRes.data.distributions || []);
      setPaymentHistory(paymentsRes.data.payments || []);
    } catch (error) {
      console.error('Error fetching billing data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num, decimals = 0) => {
    if (num === null || num === undefined) return '0';
    return new Intl.NumberFormat('fr-FR', { 
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals 
    }).format(num);
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { color: 'bg-gray-100 text-gray-700', label: 'Brouillon' },
      sent: { color: 'bg-blue-100 text-blue-700', label: 'Envoyée' },
      partial: { color: 'bg-yellow-100 text-yellow-700', label: 'Partiel' },
      paid: { color: 'bg-green-100 text-green-700', label: 'Payée' },
      overdue: { color: 'bg-red-100 text-red-700', label: 'En retard' },
      cancelled: { color: 'bg-gray-100 text-gray-700', label: 'Annulée' },
      pending: { color: 'bg-orange-100 text-orange-700', label: 'En attente' },
      processing: { color: 'bg-blue-100 text-blue-700', label: 'En cours' },
      completed: { color: 'bg-green-100 text-green-700', label: 'Terminé' }
    };
    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-700', label: status };
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/api/billing/invoices/create', invoiceForm);
      toast.success('Facture créée avec succès');
      setShowInvoiceForm(false);
      setInvoiceForm({
        buyer_name: '', buyer_email: '', buyer_address: '', buyer_tax_id: '',
        description: '', tonnes_co2: 0, price_per_tonne_usd: 30, payment_terms_days: 30, notes: ''
      });
      fetchAllData();
    } catch (error) {
      toast.error('Erreur lors de la création', { description: error.response?.data?.detail });
    }
  };

  const handleSendInvoice = async (invoiceId) => {
    try {
      await apiClient.put(`/api/billing/invoices/${invoiceId}/send`);
      toast.success('Facture marquée comme envoyée');
      fetchAllData();
    } catch (error) {
      toast.error('Erreur', { description: error.response?.data?.detail });
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    try {
      await apiClient.post('/api/billing/payments/record', {
        invoice_id: selectedInvoice._id,
        ...paymentForm
      });
      toast.success('Paiement enregistré avec succès');
      setShowPaymentForm(false);
      setSelectedInvoice(null);
      setPaymentForm({ amount_usd: 0, payment_method: 'bank_transfer', payment_reference: '', notes: '' });
      fetchAllData();
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement', { description: error.response?.data?.detail });
    }
  };

  const handleProcessDistribution = async (distributionId) => {
    try {
      await apiClient.post(`/api/billing/distributions/${distributionId}/process`);
      toast.success('Distribution en cours de traitement');
      fetchAllData();
    } catch (error) {
      toast.error('Erreur', { description: error.response?.data?.detail });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-24 flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2d5a4d]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="pt-24 pb-12 px-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/admin')}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Retour
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Facturation & Paiements</h1>
                <p className="text-gray-500">Gestion des factures carbone et distribution aux planteurs</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => setShowInvoiceForm(true)}
                className="bg-[#2d5a4d] hover:bg-[#1a4038]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle Facture
              </Button>
              <Button variant="outline" onClick={fetchAllData}>
                <RefreshCcw className="w-4 h-4 mr-2" />
                Actualiser
              </Button>
            </div>
          </div>

          {/* Overview Cards */}
          <div className="grid md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Facturé</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatNumber(dashboard?.overview?.total_invoiced_usd)} USD
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatNumber(dashboard?.overview?.total_invoiced_fcfa)} FCFA
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Encaissé</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatNumber(dashboard?.overview?.total_paid_usd)} USD
                    </p>
                    <p className="text-xs text-gray-400">
                      Taux: {dashboard?.overview?.collection_rate}%
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">En Attente</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {formatNumber(dashboard?.overview?.total_pending_usd)} USD
                    </p>
                  </div>
                  <div className="p-3 bg-orange-100 rounded-lg">
                    <Clock className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">En Retard</p>
                    <p className="text-2xl font-bold text-red-600">
                      {formatNumber(dashboard?.overview?.total_overdue_usd)} USD
                    </p>
                  </div>
                  <div className="p-3 bg-red-100 rounded-lg">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* GreenLink Revenue & Distributions */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="bg-gradient-to-br from-[#2d5a4d] to-[#1a4038] text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-200 text-sm">Marge GreenLink</p>
                    <p className="text-3xl font-bold">
                      {formatNumber(dashboard?.greenlink_revenue?.total_margin_usd)} USD
                    </p>
                    <p className="text-green-300 text-sm">
                      {formatNumber(dashboard?.greenlink_revenue?.total_margin_fcfa)} FCFA
                    </p>
                  </div>
                  <TrendingUp className="w-12 h-12 text-green-300 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Distributions aux Planteurs</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatNumber(dashboard?.distributions?.distributed_fcfa)} FCFA
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-orange-600">
                        En attente: {formatNumber(dashboard?.distributions?.pending_fcfa)} FCFA
                      </span>
                      <span className="text-xs text-gray-400">
                        ({dashboard?.distributions?.distribution_rate}% distribué)
                      </span>
                    </div>
                  </div>
                  <Users className="w-10 h-10 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="invoices" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="invoices" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Factures ({invoices.length})
              </TabsTrigger>
              <TabsTrigger value="payments" className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Paiements
              </TabsTrigger>
              <TabsTrigger value="distributions" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Distributions ({distributions.length})
              </TabsTrigger>
            </TabsList>

            {/* Invoices Tab */}
            <TabsContent value="invoices">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Liste des Factures</span>
                    <div className="flex gap-2 text-sm font-normal">
                      <Badge className="bg-gray-100 text-gray-700">
                        Brouillon: {dashboard?.invoice_counts?.draft || 0}
                      </Badge>
                      <Badge className="bg-blue-100 text-blue-700">
                        Envoyées: {dashboard?.invoice_counts?.sent || 0}
                      </Badge>
                      <Badge className="bg-green-100 text-green-700">
                        Payées: {dashboard?.invoice_counts?.paid || 0}
                      </Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {invoices.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
                      <p>Aucune facture créée</p>
                      <Button 
                        className="mt-4 bg-[#2d5a4d] hover:bg-[#1a4038]"
                        onClick={() => setShowInvoiceForm(true)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Créer une facture
                      </Button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b text-left">
                            <th className="py-3 px-2 text-sm font-medium text-gray-500">N° Facture</th>
                            <th className="py-3 px-2 text-sm font-medium text-gray-500">Acheteur</th>
                            <th className="py-3 px-2 text-sm font-medium text-gray-500">Description</th>
                            <th className="py-3 px-2 text-sm font-medium text-gray-500 text-right">Montant</th>
                            <th className="py-3 px-2 text-sm font-medium text-gray-500 text-right">Payé</th>
                            <th className="py-3 px-2 text-sm font-medium text-gray-500">Échéance</th>
                            <th className="py-3 px-2 text-sm font-medium text-gray-500">Statut</th>
                            <th className="py-3 px-2 text-sm font-medium text-gray-500">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoices.map((invoice) => (
                            <tr key={invoice._id} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-2 font-medium">{invoice.invoice_number}</td>
                              <td className="py-3 px-2">
                                <div>
                                  <p className="font-medium text-sm">{invoice.buyer_name}</p>
                                  <p className="text-xs text-gray-500">{invoice.buyer_email}</p>
                                </div>
                              </td>
                              <td className="py-3 px-2 text-sm text-gray-600">
                                {invoice.items?.[0]?.description}
                                <span className="text-xs text-gray-400 ml-1">
                                  ({invoice.items?.[0]?.quantity} t CO2)
                                </span>
                              </td>
                              <td className="py-3 px-2 text-right">
                                <p className="font-medium">{formatNumber(invoice.total_usd)} USD</p>
                                <p className="text-xs text-gray-500">{formatNumber(invoice.total_fcfa)} FCFA</p>
                              </td>
                              <td className="py-3 px-2 text-right">
                                <p className={`font-medium ${invoice.amount_paid_usd > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                  {formatNumber(invoice.amount_paid_usd)} USD
                                </p>
                              </td>
                              <td className="py-3 px-2 text-sm">{formatDate(invoice.due_date)}</td>
                              <td className="py-3 px-2">{getStatusBadge(invoice.status)}</td>
                              <td className="py-3 px-2">
                                <div className="flex gap-1">
                                  {invoice.status === 'draft' && (
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => handleSendInvoice(invoice._id)}
                                      title="Marquer comme envoyée"
                                    >
                                      <Send className="w-3 h-3" />
                                    </Button>
                                  )}
                                  {['sent', 'partial', 'overdue'].includes(invoice.status) && (
                                    <Button 
                                      size="sm" 
                                      className="bg-green-600 hover:bg-green-700"
                                      onClick={() => {
                                        setSelectedInvoice(invoice);
                                        setPaymentForm({...paymentForm, amount_usd: invoice.amount_due_usd});
                                        setShowPaymentForm(true);
                                      }}
                                      title="Enregistrer un paiement"
                                    >
                                      <DollarSign className="w-3 h-3" />
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Payments Tab */}
            <TabsContent value="payments">
              <Card>
                <CardHeader>
                  <CardTitle>Historique des Paiements</CardTitle>
                </CardHeader>
                <CardContent>
                  {paymentHistory.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <CreditCard className="w-16 h-16 mx-auto mb-4 opacity-30" />
                      <p>Aucun paiement enregistré</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {paymentHistory.map((payment, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-4">
                            <div className="p-2 bg-green-100 rounded-lg">
                              <ArrowDownRight className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                              <p className="font-medium">{payment.buyer_name}</p>
                              <p className="text-sm text-gray-500">
                                Facture: {payment.invoice_number} | Réf: {payment.reference}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-600">+{formatNumber(payment.amount_usd)} USD</p>
                            <p className="text-xs text-gray-500">{formatDate(payment.date)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Distributions Tab */}
            <TabsContent value="distributions">
              <Card>
                <CardHeader>
                  <CardTitle>Distributions aux Planteurs</CardTitle>
                </CardHeader>
                <CardContent>
                  {distributions.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
                      <p>Aucune distribution en cours</p>
                      <p className="text-sm text-gray-400 mt-2">
                        Les distributions sont créées automatiquement lorsqu'une facture est payée
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {distributions.map((dist) => (
                        <div key={dist._id} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <p className="font-medium">Distribution #{dist._id?.slice(-8)}</p>
                              <p className="text-sm text-gray-500">
                                {dist.farmer_count} planteurs | {formatDate(dist.created_at)}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              {getStatusBadge(dist.status)}
                              {dist.status === 'pending' && (
                                <Button 
                                  size="sm" 
                                  className="bg-[#2d5a4d] hover:bg-[#1a4038]"
                                  onClick={() => handleProcessDistribution(dist._id)}
                                >
                                  Lancer la distribution
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div className="p-3 bg-gray-50 rounded">
                              <p className="text-gray-500">Total à distribuer</p>
                              <p className="font-bold">{formatNumber(dist.farmers_share_fcfa)} FCFA</p>
                            </div>
                            <div className="p-3 bg-green-50 rounded">
                              <p className="text-gray-500">Planteurs payés</p>
                              <p className="font-bold text-green-600">{dist.farmers_paid || 0}</p>
                            </div>
                            <div className="p-3 bg-orange-50 rounded">
                              <p className="text-gray-500">En attente</p>
                              <p className="font-bold text-orange-600">{dist.farmers_pending || 0}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Invoice Form Modal */}
          {showInvoiceForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Nouvelle Facture Carbone</span>
                    <Button variant="ghost" size="sm" onClick={() => setShowInvoiceForm(false)}>
                      <XCircle className="w-5 h-5" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateInvoice} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label>Nom de l'acheteur *</Label>
                        <Input
                          value={invoiceForm.buyer_name}
                          onChange={(e) => setInvoiceForm({...invoiceForm, buyer_name: e.target.value})}
                          placeholder="Ex: Nestlé Côte d'Ivoire"
                          required
                        />
                      </div>
                      <div>
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={invoiceForm.buyer_email}
                          onChange={(e) => setInvoiceForm({...invoiceForm, buyer_email: e.target.value})}
                          placeholder="contact@entreprise.com"
                        />
                      </div>
                      <div>
                        <Label>Adresse</Label>
                        <Input
                          value={invoiceForm.buyer_address}
                          onChange={(e) => setInvoiceForm({...invoiceForm, buyer_address: e.target.value})}
                          placeholder="Adresse de facturation"
                        />
                      </div>
                      <div>
                        <Label>N° Fiscal (NIF)</Label>
                        <Input
                          value={invoiceForm.buyer_tax_id}
                          onChange={(e) => setInvoiceForm({...invoiceForm, buyer_tax_id: e.target.value})}
                          placeholder="Numéro d'identification fiscale"
                        />
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <Label className="text-base font-semibold">Détails de la vente carbone</Label>
                    </div>

                    <div>
                      <Label>Description *</Label>
                      <Input
                        value={invoiceForm.description}
                        onChange={(e) => setInvoiceForm({...invoiceForm, description: e.target.value})}
                        placeholder="Ex: Crédits carbone certifiés Gold Standard - Cacao CI"
                        required
                      />
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <Label>Tonnes CO2 *</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          value={invoiceForm.tonnes_co2}
                          onChange={(e) => setInvoiceForm({...invoiceForm, tonnes_co2: parseFloat(e.target.value)})}
                          required
                        />
                      </div>
                      <div>
                        <Label>Prix/tonne (USD) *</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={invoiceForm.price_per_tonne_usd}
                          onChange={(e) => setInvoiceForm({...invoiceForm, price_per_tonne_usd: parseFloat(e.target.value)})}
                          required
                        />
                      </div>
                      <div>
                        <Label>Délai de paiement (jours)</Label>
                        <Input
                          type="number"
                          min="1"
                          value={invoiceForm.payment_terms_days}
                          onChange={(e) => setInvoiceForm({...invoiceForm, payment_terms_days: parseInt(e.target.value)})}
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">Total estimé:</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatNumber(invoiceForm.tonnes_co2 * invoiceForm.price_per_tonne_usd)} USD
                      </p>
                      <p className="text-sm text-gray-500">
                        ≈ {formatNumber(invoiceForm.tonnes_co2 * invoiceForm.price_per_tonne_usd * 655)} FCFA
                      </p>
                    </div>

                    <div>
                      <Label>Notes</Label>
                      <textarea
                        className="w-full p-2 border rounded-md"
                        rows={3}
                        value={invoiceForm.notes}
                        onChange={(e) => setInvoiceForm({...invoiceForm, notes: e.target.value})}
                        placeholder="Notes additionnelles..."
                      />
                    </div>

                    <div className="flex gap-2 justify-end">
                      <Button type="button" variant="outline" onClick={() => setShowInvoiceForm(false)}>
                        Annuler
                      </Button>
                      <Button type="submit" className="bg-[#2d5a4d] hover:bg-[#1a4038]">
                        <Plus className="w-4 h-4 mr-2" />
                        Créer la facture
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Payment Form Modal */}
          {showPaymentForm && selectedInvoice && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <Card className="w-full max-w-md">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Enregistrer un Paiement</span>
                    <Button variant="ghost" size="sm" onClick={() => setShowPaymentForm(false)}>
                      <XCircle className="w-5 h-5" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Facture: {selectedInvoice.invoice_number}</p>
                    <p className="font-medium">{selectedInvoice.buyer_name}</p>
                    <p className="text-sm">Restant dû: <span className="font-bold text-orange-600">{formatNumber(selectedInvoice.amount_due_usd)} USD</span></p>
                  </div>

                  <form onSubmit={handleRecordPayment} className="space-y-4">
                    <div>
                      <Label>Montant reçu (USD) *</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={paymentForm.amount_usd}
                        onChange={(e) => setPaymentForm({...paymentForm, amount_usd: parseFloat(e.target.value)})}
                        required
                      />
                    </div>

                    <div>
                      <Label>Méthode de paiement</Label>
                      <select
                        className="w-full p-2 border rounded-md"
                        value={paymentForm.payment_method}
                        onChange={(e) => setPaymentForm({...paymentForm, payment_method: e.target.value})}
                      >
                        <option value="bank_transfer">Virement bancaire</option>
                        <option value="wire">Virement SWIFT</option>
                        <option value="check">Chèque</option>
                        <option value="escrow">Escrow</option>
                        <option value="orange_money">Orange Money</option>
                      </select>
                    </div>

                    <div>
                      <Label>Référence de paiement *</Label>
                      <Input
                        value={paymentForm.payment_reference}
                        onChange={(e) => setPaymentForm({...paymentForm, payment_reference: e.target.value})}
                        placeholder="Ex: VIR-2025-001234"
                        required
                      />
                    </div>

                    <div>
                      <Label>Notes</Label>
                      <Input
                        value={paymentForm.notes}
                        onChange={(e) => setPaymentForm({...paymentForm, notes: e.target.value})}
                        placeholder="Notes optionnelles"
                      />
                    </div>

                    <div className="flex gap-2 justify-end">
                      <Button type="button" variant="outline" onClick={() => setShowPaymentForm(false)}>
                        Annuler
                      </Button>
                      <Button type="submit" className="bg-green-600 hover:bg-green-700">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Enregistrer le paiement
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BillingDashboard;

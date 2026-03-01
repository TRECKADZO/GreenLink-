import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Wallet, Users, TrendingUp, Download, Search,
  ChevronLeft, CheckCircle, Clock, AlertCircle,
  Banknote, MapPin, Leaf, Send, FileText, History
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CarbonPremiumsPage = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [premiums, setPremiums] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [activeTab, setActiveTab] = useState('premiums');

  useEffect(() => {
    fetchPremiums();
    fetchPaymentHistory();
  }, []);

  const fetchPremiums = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/cooperative/carbon-premiums/members`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setPremiums(data);
    } catch (error) {
      console.error('Error fetching premiums:', error);
      toast.error('Erreur lors du chargement des primes');
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentHistory = async () => {
    try {
      const response = await fetch(`${API_URL}/api/cooperative/carbon-premiums/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setPaymentHistory(data.payments || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const handlePayMember = async () => {
    if (!selectedMember) return;
    
    setProcessingPayment(true);
    try {
      const response = await fetch(
        `${API_URL}/api/cooperative/carbon-premiums/pay?member_id=${selectedMember.member_id}`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      if (!response.ok) throw new Error('Erreur de paiement');
      
      const result = await response.json();
      toast.success(`${result.message} - SMS envoyé!`);
      setShowPaymentModal(false);
      setSelectedMember(null);
      fetchPremiums();
      fetchPaymentHistory();
    } catch (error) {
      toast.error('Erreur lors du paiement');
    } finally {
      setProcessingPayment(false);
    }
  };

  const exportCSV = () => {
    window.open(`${API_URL}/api/cooperative/carbon-premiums/export-csv?token=${token}`, '_blank');
    toast.success('Export CSV en cours...');
  };

  const downloadMonthlyReport = () => {
    const now = new Date();
    window.open(`${API_URL}/api/cooperative/carbon-premiums/report-pdf?month=${now.getMonth() + 1}&year=${now.getFullYear()}`, '_blank');
    toast.success('Téléchargement du rapport PDF...');
  };

  const formatFCFA = (amount) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const filteredMembers = premiums?.members?.filter(member =>
    member.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    member.village?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900" data-testid="carbon-premiums-page">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/cooperative/dashboard')}
                className="text-white hover:bg-white/10"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Retour
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <Wallet className="h-6 w-6" />
                  <h1 className="text-xl font-bold">Primes Carbone</h1>
                </div>
                <p className="text-sm text-emerald-100">
                  Gestion des paiements aux planteurs
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline"
                className="border-white text-white hover:bg-white/10"
                onClick={exportCSV}
              >
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <Button 
                variant="outline"
                className="border-white text-white hover:bg-white/10"
                onClick={downloadMonthlyReport}
              >
                <FileText className="h-4 w-4 mr-2" />
                Rapport PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                  <Users className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {premiums?.summary?.eligible_members || 0}
                  </p>
                  <p className="text-xs text-gray-400">Membres éligibles</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <MapPin className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {premiums?.summary?.total_hectares || 0} ha
                  </p>
                  <p className="text-xs text-gray-400">Surface auditée</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 rounded-lg">
                  <Banknote className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {formatFCFA(premiums?.summary?.total_premium_fcfa || 0)}
                  </p>
                  <p className="text-xs text-gray-400">Prime totale</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <Leaf className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {formatFCFA(premiums?.summary?.rate_per_hectare || 50000)}/ha
                  </p>
                  <p className="text-xs text-gray-400">Taux de base</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="bg-gray-800 border-gray-700">
            <TabsTrigger value="premiums" className="data-[state=active]:bg-emerald-600">
              <Wallet className="h-4 w-4 mr-2" />
              Primes à payer
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-emerald-600">
              <History className="h-4 w-4 mr-2" />
              Historique ({paymentHistory.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="premiums">
            {/* Info Banner */}
            <Card className="bg-emerald-900/30 border-emerald-700/50 mb-6">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-emerald-400 mt-0.5" />
                  <div>
                    <p className="text-emerald-300 font-medium">Calcul des primes carbone</p>
                    <p className="text-sm text-emerald-200/70">
                      Prime = Surface (ha) × Taux ({formatFCFA(premiums?.summary?.rate_per_hectare || 50000)}/ha) × Score carbone (%) 
                      <br />
                      Bonus +20% si score ≥ 8/10 | Score minimum requis: {premiums?.summary?.min_score_required || 6}/10
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher un planteur..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 bg-gray-800 border-gray-700 text-white"
                />
              </div>
            </div>

        {/* Members Table */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-400" />
              Primes par Planteur
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Planteur</th>
                    <th className="text-center py-3 px-4 text-gray-400 font-medium">Village</th>
                    <th className="text-center py-3 px-4 text-gray-400 font-medium">Parcelles</th>
                    <th className="text-center py-3 px-4 text-gray-400 font-medium">Surface</th>
                    <th className="text-center py-3 px-4 text-gray-400 font-medium">Score</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">Prime</th>
                    <th className="text-center py-3 px-4 text-gray-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((member) => (
                    <tr key={member.member_id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-white font-medium">{member.full_name}</p>
                          <p className="text-xs text-gray-400">{member.phone_number}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center text-gray-300">
                        {member.village || '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant="outline" className="border-blue-500/50 text-blue-400">
                          {member.audited_parcels} auditée(s)
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center text-white">
                        {member.total_hectares} ha
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`font-medium ${
                          member.average_score >= 8 ? 'text-green-400' :
                          member.average_score >= 6 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {member.average_score}/10
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {member.premium_fcfa > 0 ? (
                          <div>
                            <p className="text-emerald-400 font-bold">
                              {formatFCFA(member.premium_fcfa)}
                            </p>
                            <p className="text-xs text-gray-400">
                              ~{member.premium_eur}€
                            </p>
                          </div>
                        ) : (
                          <span className="text-gray-500">Non éligible</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {member.premium_fcfa > 0 && (
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => {
                              setSelectedMember(member);
                              setShowPaymentModal(true);
                            }}
                          >
                            <Send className="h-4 w-4 mr-1" />
                            Payer
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filteredMembers.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  Aucun membre trouvé
                </div>
              )}
            </div>
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="history">
            {/* Payment History */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <History className="h-5 w-5 text-emerald-400" />
                  Historique des Paiements
                </CardTitle>
              </CardHeader>
              <CardContent>
                {paymentHistory.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="text-left py-3 px-4 text-gray-400 font-medium">Date</th>
                          <th className="text-left py-3 px-4 text-gray-400 font-medium">Bénéficiaire</th>
                          <th className="text-center py-3 px-4 text-gray-400 font-medium">Téléphone</th>
                          <th className="text-right py-3 px-4 text-gray-400 font-medium">Montant</th>
                          <th className="text-center py-3 px-4 text-gray-400 font-medium">Référence</th>
                          <th className="text-center py-3 px-4 text-gray-400 font-medium">Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paymentHistory.map((payment) => (
                          <tr key={payment.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                            <td className="py-3 px-4 text-gray-300 text-sm">
                              {formatDate(payment.created_at)}
                            </td>
                            <td className="py-3 px-4">
                              <p className="text-white font-medium">{payment.member_name}</p>
                            </td>
                            <td className="py-3 px-4 text-center text-gray-400 text-sm">
                              {payment.phone_number}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <p className="text-emerald-400 font-bold">{formatFCFA(payment.amount_fcfa)}</p>
                              <p className="text-xs text-gray-500">~{payment.amount_eur}€</p>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <code className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-300">
                                {payment.payment_ref}
                              </code>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <Badge className={payment.status === 'completed' 
                                ? 'bg-green-500/20 text-green-400 border-green-500/50' 
                                : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'}>
                                {payment.status === 'completed' ? '✓ Payé' : '⏳ En cours'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aucun paiement effectué pour le moment</p>
                    <p className="text-sm mt-2">Les paiements apparaîtront ici après validation</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Payment Confirmation Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>Confirmer le paiement</DialogTitle>
            <DialogDescription className="text-gray-400">
              Vous allez initier un paiement Orange Money
            </DialogDescription>
          </DialogHeader>
          
          {selectedMember && (
            <div className="space-y-4 py-4">
              <div className="bg-gray-700/50 rounded-lg p-4">
                <p className="text-sm text-gray-400">Bénéficiaire</p>
                <p className="text-lg font-bold">{selectedMember.full_name}</p>
                <p className="text-sm text-gray-400">{selectedMember.phone_number}</p>
              </div>
              
              <div className="bg-emerald-900/30 rounded-lg p-4 border border-emerald-700/50">
                <p className="text-sm text-emerald-400">Montant de la prime</p>
                <p className="text-2xl font-bold text-emerald-400">
                  {formatFCFA(selectedMember.premium_fcfa)}
                </p>
                <p className="text-sm text-gray-400">
                  Pour {selectedMember.total_hectares} ha auditées (score moyen: {selectedMember.average_score}/10)
                </p>
              </div>
              
              <div className="text-xs text-gray-500">
                ⚠️ Note: L'intégration Orange Money est en cours. Le paiement sera simulé.
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowPaymentModal(false)}
              className="border-gray-600"
            >
              Annuler
            </Button>
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleInitiatePayment}
              disabled={processingPayment}
            >
              {processingPayment ? 'Traitement...' : 'Confirmer le paiement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CarbonPremiumsPage;

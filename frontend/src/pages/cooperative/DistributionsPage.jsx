import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { offlineCooperativeApi as cooperativeApi } from '../../services/offlineCooperativeApi';
import { 
  DollarSign, ChevronLeft, CheckCircle, Clock,
  Users, Send, AlertCircle, Wallet, ChevronDown, ChevronUp,
  Percent, Scale
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import { toast } from 'sonner';

const DistributionsPage = () => {
  const navigate = useNavigate();
  const [distributions, setDistributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showExecuteModal, setShowExecuteModal] = useState(false);
  const [selectedDistribution, setSelectedDistribution] = useState(null);
  const [executing, setExecuting] = useState(false);
  const [expandedDist, setExpandedDist] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchDistributions = async () => {
    try {
      setLoading(true);
      const data = await cooperativeApi.getDistributionsHistory();
      setDistributions(data);
    } catch (error) {
      console.error('Error fetching distributions:', error);
      toast.error('Erreur lors du chargement des distributions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDistributions();
  }, []);

  const toggleDetail = async (distId) => {
    if (expandedDist === distId) {
      setExpandedDist(null);
      return;
    }
    setExpandedDist(distId);
    setLoadingDetail(true);
    try {
      const data = await cooperativeApi.getDistributionDetail(distId);
      setDetailData(data);
    } catch (error) {
      toast.error('Erreur lors du chargement du détail');
      setDetailData(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleExecutePayments = async () => {
    setExecuting(true);
    try {
      const result = await cooperativeApi.executeDistributionPayments(selectedDistribution.id);
      toast.success(`${result.successful} paiements exécutés avec succès`);
      setShowExecuteModal(false);
      fetchDistributions();
    } catch (error) {
      console.error('Error executing payments:', error);
      toast.error('Erreur lors de l\'exécution des paiements');
    } finally {
      setExecuting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Complété</Badge>;
      case 'pending_payment':
        return <Badge className="bg-amber-100 text-amber-800"><Clock className="h-3 w-3 mr-1" />En attente</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const totalDistributed = distributions.reduce((sum, d) => 
    d.status === 'completed' ? sum + (d.amount_distributed || 0) : sum, 0
  );
  const totalPending = distributions.reduce((sum, d) => 
    d.status === 'pending_payment' ? sum + (d.amount_distributed || 0) : sum, 0
  );

  return (
    <div className="min-h-screen bg-gray-50" data-testid="distributions-page">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/cooperative/dashboard')}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Retour
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Distributions de Primes</h1>
              <p className="text-sm text-gray-500">Historique des redistributions aux membres</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Distribué</p>
                <p className="text-xl font-bold text-green-600">
                  {totalDistributed.toLocaleString()} XOF
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">En Attente</p>
                <p className="text-xl font-bold text-amber-600">
                  {totalPending.toLocaleString()} XOF
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Distributions</p>
                <p className="text-xl font-bold text-blue-600">
                  {distributions.length}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Distributions List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        ) : distributions.length > 0 ? (
          <div className="grid gap-4">
            {distributions.map((dist) => (
              <Card key={dist.id} className="hover:shadow-md transition-shadow" data-testid={`distribution-card-${dist.id}`}>
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <DollarSign className="h-5 w-5 text-green-600" />
                        <h3 className="font-semibold text-lg text-gray-900">{dist.lot_name}</h3>
                        {getStatusBadge(dist.status)}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div>
                          <p className="text-sm text-gray-500">Prime Totale</p>
                          <p className="font-medium">{(dist.total_premium || 0).toLocaleString()} XOF</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Commission</p>
                          <p className="font-medium">{(dist.commission_amount || 0).toLocaleString()} XOF</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Distribué</p>
                          <p className="font-medium text-green-600">{(dist.amount_distributed || 0).toLocaleString()} XOF</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Bénéficiaires</p>
                          <p className="font-medium flex items-center">
                            <Users className="h-4 w-4 mr-1" />
                            {dist.beneficiaries_count}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      {dist.status === 'pending_payment' && (
                        <Button 
                          onClick={() => {
                            setSelectedDistribution(dist);
                            setShowExecuteModal(true);
                          }}
                          className="bg-green-600 hover:bg-green-700"
                          data-testid={`execute-distribution-${dist.id}`}
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Exécuter Paiements
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleDetail(dist.id)}
                        data-testid={`detail-distribution-${dist.id}`}
                      >
                        <Users className="h-4 w-4 mr-2" />
                        Détail par Agriculteur
                        {expandedDist === dist.id ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
                      </Button>
                    </div>
                  </div>

                  {/* Farmer Detail Breakdown */}
                  {expandedDist === dist.id && (
                    <div className="border-t mt-4 pt-4">
                      {loadingDetail ? (
                        <div className="py-4 text-center text-gray-400 text-sm">Chargement...</div>
                      ) : detailData && detailData.distributions?.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm" data-testid="distribution-detail-table">
                            <thead>
                              <tr className="text-left text-xs text-gray-500 bg-gray-50 border-b">
                                <th className="py-2 px-3">Agriculteur</th>
                                <th className="py-2 px-3 text-center">Parcelles</th>
                                <th className="py-2 px-3 text-right">Surface (ha)</th>
                                <th className="py-2 px-3 text-right">Tonnage (kg)</th>
                                <th className="py-2 px-3 text-right">% Contribution</th>
                                <th className="py-2 px-3 text-right">Montant (XOF)</th>
                                <th className="py-2 px-3 text-center">Paiement</th>
                              </tr>
                            </thead>
                            <tbody>
                              {detailData.distributions.map((d, idx) => (
                                <tr key={idx} className="border-b last:border-0 hover:bg-gray-50">
                                  <td className="py-2 px-3 font-medium text-gray-900">{d.nom_membre || 'Inconnu'}</td>
                                  <td className="py-2 px-3 text-center">{d.nombre_parcelles || 0}</td>
                                  <td className="py-2 px-3 text-right">{d.superficie_totale || 0}</td>
                                  <td className="py-2 px-3 text-right">{(d.tonnage_contribution_kg || 0).toLocaleString()}</td>
                                  <td className="py-2 px-3 text-right">{d.contribution_pct || 0}%</td>
                                  <td className="py-2 px-3 text-right font-bold text-green-700">{(d.amount || 0).toLocaleString()}</td>
                                  <td className="py-2 px-3 text-center">
                                    {d.payment_status === 'completed' ? (
                                      <Badge className="bg-green-100 text-green-700 text-xs">Payé</Badge>
                                    ) : (
                                      <Badge className="bg-amber-100 text-amber-700 text-xs">En attente</Badge>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="font-bold bg-gray-50 border-t-2">
                                <td className="py-2 px-3">Total ({detailData.distributions.length})</td>
                                <td className="py-2 px-3 text-center">{detailData.distributions.reduce((s, d) => s + (d.nombre_parcelles || 0), 0)}</td>
                                <td className="py-2 px-3 text-right">{detailData.distributions.reduce((s, d) => s + (d.superficie_totale || 0), 0).toFixed(1)}</td>
                                <td className="py-2 px-3 text-right">{detailData.distributions.reduce((s, d) => s + (d.tonnage_contribution_kg || 0), 0).toLocaleString()}</td>
                                <td className="py-2 px-3 text-right">100%</td>
                                <td className="py-2 px-3 text-right text-green-700">{(detailData.amount_distributed || 0).toLocaleString()}</td>
                                <td></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      ) : (
                        <div className="py-4 text-center text-gray-400 text-sm">Aucun détail disponible</div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">Aucune distribution</h3>
              <p className="text-gray-500 mb-4">
                Finalisez un lot de vente pour créer une distribution
              </p>
              <Button onClick={() => navigate('/cooperative/lots')}>
                Voir les Lots
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Execute Payments Modal */}
      <Dialog open={showExecuteModal} onOpenChange={setShowExecuteModal}>
        <DialogContent data-testid="execute-payments-modal">
          <DialogHeader>
            <DialogTitle>Exécuter les Paiements Orange Money</DialogTitle>
            <DialogDescription>
              Cette action va déclencher les paiements vers les comptes Orange Money des bénéficiaires.
            </DialogDescription>
          </DialogHeader>
          {selectedDistribution && (
            <div className="py-4">
              <div className="p-4 bg-amber-50 rounded-lg mb-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium">Mode Simulation</p>
                    <p>Les paiements sont simulés. En production, les fonds seront transférés via Orange Money Business.</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Montant à distribuer</span>
                  <span className="font-bold text-green-600">
                    {(selectedDistribution.amount_distributed || 0).toLocaleString()} XOF
                  </span>
                </div>
                <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Nombre de bénéficiaires</span>
                  <span className="font-bold">{selectedDistribution.beneficiaries_count}</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExecuteModal(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleExecutePayments} 
              disabled={executing}
              className="bg-green-600 hover:bg-green-700"
            >
              {executing ? 'Exécution...' : 'Confirmer et Exécuter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DistributionsPage;

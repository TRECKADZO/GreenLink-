import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cooperativeApi } from '../../services/cooperativeApi';
import { 
  Package, Plus, ChevronLeft, ChevronDown, ChevronUp, Leaf, Users,
  DollarSign, CheckCircle, Clock, TrendingUp,
  Scale, FileCheck, TreePine, MapPin
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';

const LotsPage = () => {
  const navigate = useNavigate();
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [selectedLot, setSelectedLot] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [newLot, setNewLot] = useState({
    lot_name: '',
    target_tonnage: '',
    product_type: 'cacao',
    certification: '',
    min_carbon_score: 6.0,
    description: ''
  });

  const [saleData, setSaleData] = useState({
    buyer_name: '',
    actual_tonnage: '',
    price_per_kg: '',
    carbon_premium_per_kg: ''
  });

  const [expandedLot, setExpandedLot] = useState(null);
  const [contributors, setContributors] = useState([]);
  const [loadingContributors, setLoadingContributors] = useState(false);

  const [showDistributeModal, setShowDistributeModal] = useState(false);
  const [distributeLot, setDistributeLot] = useState(null);
  const [distributePreview, setDistributePreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [distributing, setDistributing] = useState(false);

  const toggleContributors = async (lotId) => {
    if (expandedLot === lotId) {
      setExpandedLot(null);
      return;
    }
    setExpandedLot(lotId);
    setLoadingContributors(true);
    try {
      const data = await cooperativeApi.getLotContributors(lotId);
      setContributors(data.contributors || []);
    } catch (error) {
      toast.error('Erreur lors du chargement des contributeurs');
      setContributors([]);
    } finally {
      setLoadingContributors(false);
    }
  };

  const fetchLots = async () => {
    try {
      setLoading(true);
      const data = await cooperativeApi.getLots(statusFilter || null);
      setLots(data);
    } catch (error) {
      console.error('Error fetching lots:', error);
      toast.error('Erreur lors du chargement des lots');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLots();
  }, [statusFilter]);

  const handleCreateLot = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const result = await cooperativeApi.createLot({
        ...newLot,
        target_tonnage: parseFloat(newLot.target_tonnage),
        min_carbon_score: parseFloat(newLot.min_carbon_score)
      });
      toast.success(`Lot créé avec ${result.eligible_farmers} agriculteurs éligibles`);
      setShowCreateModal(false);
      setNewLot({
        lot_name: '',
        target_tonnage: '',
        product_type: 'cacao',
        certification: '',
        min_carbon_score: 6.0,
        description: ''
      });
      fetchLots();
    } catch (error) {
      console.error('Error creating lot:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de la création du lot');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinalizeSale = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await cooperativeApi.finalizeLotSale(selectedLot.id, {
        buyer_name: saleData.buyer_name,
        actual_tonnage: parseFloat(saleData.actual_tonnage),
        price_per_kg: parseFloat(saleData.price_per_kg),
        carbon_premium_per_kg: parseFloat(saleData.carbon_premium_per_kg)
      });
      toast.success('Vente finalisée avec succès');
      setShowFinalizeModal(false);
      fetchLots();
    } catch (error) {
      console.error('Error finalizing sale:', error);
      toast.error('Erreur lors de la finalisation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDistributePreview = async (lot) => {
    setDistributeLot(lot);
    setShowDistributeModal(true);
    setLoadingPreview(true);
    setDistributePreview(null);
    try {
      const data = await cooperativeApi.getLotContributors(lot.id);
      const totalTonnage = (data.contributors || []).reduce((s, c) => s + (c.estimated_tonnage_kg || 0), 0);
      const totalPremium = (lot.actual_tonnage || 0) * 1000 * (lot.carbon_premium_per_kg || 0);
      const commissionRate = 0.10;
      const commission = totalPremium * commissionRate;
      const distributable = totalPremium - commission;
      
      const breakdown = (data.contributors || []).map(c => {
        const sharePct = totalTonnage > 0 ? (c.estimated_tonnage_kg || 0) / totalTonnage : 0;
        return {
          ...c,
          share_pct: sharePct,
          amount: Math.round(distributable * sharePct)
        };
      });
      
      setDistributePreview({
        contributors: breakdown,
        total_premium: totalPremium,
        commission,
        commission_rate: commissionRate,
        distributable,
        total_tonnage: totalTonnage
      });
    } catch (error) {
      toast.error('Erreur lors du chargement de la prévisualisation');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleConfirmDistribute = async () => {
    if (!distributeLot) return;
    setDistributing(true);
    try {
      const result = await cooperativeApi.distributeLotPremiums(distributeLot.id);
      toast.success(`Distribution créée pour ${result.beneficiaries_count} bénéficiaires`);
      setShowDistributeModal(false);
      navigate('/cooperative/distributions');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la distribution');
    } finally {
      setDistributing(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'open':
        return <Badge className="bg-blue-100 text-blue-800">Ouvert</Badge>;
      case 'negotiating':
        return <Badge className="bg-amber-100 text-amber-800">En négociation</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Complété</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" data-testid="lots-page">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
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
                <h1 className="text-xl font-bold text-gray-900">Ventes Groupées</h1>
                <p className="text-sm text-gray-500">Gérez vos lots de vente collective</p>
              </div>
            </div>
            <Button onClick={() => setShowCreateModal(true)} data-testid="create-lot-btn">
              <Plus className="h-4 w-4 mr-2" />
              Créer un Lot
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex gap-2">
          <Button 
            variant={statusFilter === '' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('')}
          >
            Tous
          </Button>
          <Button 
            variant={statusFilter === 'open' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('open')}
          >
            Ouverts
          </Button>
          <Button 
            variant={statusFilter === 'completed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('completed')}
          >
            Complétés
          </Button>
        </div>
      </div>

      {/* Lots List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        ) : lots.length > 0 ? (
          <div className="grid gap-4">
            {lots.map((lot) => (
              <Card key={lot.id} className="hover:shadow-md transition-shadow" data-testid={`lot-card-${lot.id}`}>
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Package className="h-5 w-5 text-green-600" />
                        <h3 className="font-semibold text-lg text-gray-900">{lot.lot_name}</h3>
                        {getStatusBadge(lot.status)}
                        {lot.certification && (
                          <Badge variant="outline" className="text-green-700">
                            <FileCheck className="h-3 w-3 mr-1" />
                            {lot.certification}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div className="flex items-center gap-2">
                          <Scale className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-500">Tonnage</p>
                            <p className="font-medium">
                              {lot.actual_tonnage || lot.target_tonnage} T
                              {lot.actual_tonnage === 0 && <span className="text-xs text-gray-400"> (cible)</span>}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Leaf className="h-4 w-4 text-green-500" />
                          <div>
                            <p className="text-sm text-gray-500">Score Carbone</p>
                            <p className="font-medium">{lot.score_carbone_moyen}/10</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-blue-500" />
                          <div>
                            <p className="text-sm text-gray-500">Contributeurs</p>
                            <p className="font-medium">{lot.contributors_count}</p>
                          </div>
                        </div>
                        {lot.total_value > 0 && (
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-amber-500" />
                            <div>
                              <p className="text-sm text-gray-500">Valeur</p>
                              <p className="font-medium">{lot.total_value.toLocaleString()} XOF</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {lot.buyer_name && (
                        <div className="mt-3 p-2 bg-green-50 rounded flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-green-800">
                            Vendu à: <strong>{lot.buyer_name}</strong>
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      {lot.status === 'open' && (
                        <Button 
                          onClick={() => {
                            setSelectedLot(lot);
                            setSaleData({
                              buyer_name: '',
                              actual_tonnage: lot.target_tonnage?.toString() || '',
                              price_per_kg: '',
                              carbon_premium_per_kg: ''
                            });
                            setShowFinalizeModal(true);
                          }}
                          data-testid={`finalize-lot-${lot.id}`}
                        >
                          <TrendingUp className="h-4 w-4 mr-2" />
                          Finaliser Vente
                        </Button>
                      )}
                      {lot.status === 'completed' && (
                        <Button 
                          variant="outline"
                          onClick={() => handleDistributePreview(lot)}
                          data-testid={`distribute-lot-${lot.id}`}
                        >
                          <DollarSign className="h-4 w-4 mr-2" />
                          Distribuer Primes
                        </Button>
                      )}
                      <Button 
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleContributors(lot.id)}
                        data-testid={`contributors-${lot.id}`}
                      >
                        <Users className="h-4 w-4 mr-2" />
                        Contributeurs
                        {expandedLot === lot.id ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
                      </Button>
                    </div>
                  </div>

                  {/* Contributors Section */}
                  {expandedLot === lot.id && (
                    <div className="border-t mt-3 pt-3">
                      <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                        <TreePine className="h-4 w-4 text-green-600" />
                        Tonnages par agriculteur
                      </h4>
                      {loadingContributors ? (
                        <div className="py-4 text-center text-gray-400 text-sm">Chargement...</div>
                      ) : contributors.length === 0 ? (
                        <div className="py-4 text-center text-gray-400 text-sm">Aucun contributeur eligible</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left text-xs text-gray-500 border-b">
                                <th className="py-2 px-2">Agriculteur</th>
                                <th className="py-2 px-2 text-center">Parcelles</th>
                                <th className="py-2 px-2 text-right">Surface (ha)</th>
                                <th className="py-2 px-2 text-right">Tonnage est. (kg)</th>
                                <th className="py-2 px-2 text-right">Arbres</th>
                                <th className="py-2 px-2 text-center">Score</th>
                              </tr>
                            </thead>
                            <tbody>
                              {contributors.map((c, idx) => (
                                <tr key={idx} className="border-b last:border-0 hover:bg-gray-50">
                                  <td className="py-2 px-2 font-medium text-gray-900">{c.farmer_name}</td>
                                  <td className="py-2 px-2 text-center">{c.parcels_count}</td>
                                  <td className="py-2 px-2 text-right">{c.total_hectares}</td>
                                  <td className="py-2 px-2 text-right font-semibold text-green-700">{c.estimated_tonnage_kg?.toLocaleString()}</td>
                                  <td className="py-2 px-2 text-right">{c.nombre_arbres}</td>
                                  <td className="py-2 px-2 text-center">
                                    <Badge className={`text-xs ${c.avg_carbon_score >= 7 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                      {c.avg_carbon_score}
                                    </Badge>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="font-bold text-gray-800 border-t-2">
                                <td className="py-2 px-2">Total ({contributors.length})</td>
                                <td className="py-2 px-2 text-center">{contributors.reduce((s, c) => s + c.parcels_count, 0)}</td>
                                <td className="py-2 px-2 text-right">{contributors.reduce((s, c) => s + c.total_hectares, 0).toFixed(1)}</td>
                                <td className="py-2 px-2 text-right text-green-700">{contributors.reduce((s, c) => s + c.estimated_tonnage_kg, 0).toLocaleString()}</td>
                                <td className="py-2 px-2 text-right">{contributors.reduce((s, c) => s + c.nombre_arbres, 0)}</td>
                                <td className="py-2 px-2"></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
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
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">Aucun lot</h3>
              <p className="text-gray-500 mb-4">
                Créez un lot pour regrouper les récoltes de vos membres
              </p>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Créer un lot
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Lot Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-lg" data-testid="create-lot-modal">
          <DialogHeader>
            <DialogTitle>Créer un Lot de Vente</DialogTitle>
            <DialogDescription>
              Regroupez les récoltes de vos membres pour une vente collective
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateLot}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="lot_name">Nom du Lot *</Label>
                <Input
                  id="lot_name"
                  value={newLot.lot_name}
                  onChange={(e) => setNewLot({...newLot, lot_name: e.target.value})}
                  placeholder="Ex: Cacao Premium Février 2026"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="target_tonnage">Tonnage Cible (T) *</Label>
                  <Input
                    id="target_tonnage"
                    type="number"
                    step="0.1"
                    value={newLot.target_tonnage}
                    onChange={(e) => setNewLot({...newLot, target_tonnage: e.target.value})}
                    placeholder="50"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="product_type">Type de Produit</Label>
                  <Select 
                    value={newLot.product_type} 
                    onValueChange={(value) => setNewLot({...newLot, product_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cacao">Cacao</SelectItem>
                      <SelectItem value="cafe">Café</SelectItem>
                      <SelectItem value="anacarde">Anacarde</SelectItem>
                      <SelectItem value="hevea">Hévéa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="certification">Certification</Label>
                  <Select 
                    value={newLot.certification} 
                    onValueChange={(value) => setNewLot({...newLot, certification: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rainforest">Rainforest Alliance</SelectItem>
                      <SelectItem value="utz">UTZ Certified</SelectItem>
                      <SelectItem value="fairtrade">Fairtrade</SelectItem>
                      <SelectItem value="organic">Bio/Organic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="min_carbon_score">Score Carbone Min. *</Label>
                  <Input
                    id="min_carbon_score"
                    type="number"
                    step="0.5"
                    min="1"
                    max="10"
                    value={newLot.min_carbon_score}
                    onChange={(e) => setNewLot({...newLot, min_carbon_score: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newLot.description}
                  onChange={(e) => setNewLot({...newLot, description: e.target.value})}
                  placeholder="Détails du lot..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Création...' : 'Créer le Lot'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Finalize Sale Modal */}
      <Dialog open={showFinalizeModal} onOpenChange={setShowFinalizeModal}>
        <DialogContent data-testid="finalize-sale-modal">
          <DialogHeader>
            <DialogTitle>Finaliser la Vente</DialogTitle>
            <DialogDescription>
              Enregistrez les détails de la vente pour le lot: {selectedLot?.lot_name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFinalizeSale}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="buyer_name">Acheteur *</Label>
                <Input
                  id="buyer_name"
                  value={saleData.buyer_name}
                  onChange={(e) => setSaleData({...saleData, buyer_name: e.target.value})}
                  placeholder="Ex: Nestlé Côte d'Ivoire"
                  required
                />
              </div>
              <div>
                <Label htmlFor="actual_tonnage">Tonnage Réel (T) *</Label>
                <Input
                  id="actual_tonnage"
                  type="number"
                  step="0.1"
                  value={saleData.actual_tonnage}
                  onChange={(e) => setSaleData({...saleData, actual_tonnage: e.target.value})}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price_per_kg">Prix/kg (XOF) *</Label>
                  <Input
                    id="price_per_kg"
                    type="number"
                    value={saleData.price_per_kg}
                    onChange={(e) => setSaleData({...saleData, price_per_kg: e.target.value})}
                    placeholder="1200"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="carbon_premium_per_kg">Prime Carbone/kg (XOF) *</Label>
                  <Input
                    id="carbon_premium_per_kg"
                    type="number"
                    value={saleData.carbon_premium_per_kg}
                    onChange={(e) => setSaleData({...saleData, carbon_premium_per_kg: e.target.value})}
                    placeholder="50"
                    required
                  />
                </div>
              </div>
              {saleData.actual_tonnage && saleData.price_per_kg && (
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-800">
                    <strong>Valeur totale:</strong>{' '}
                    {(parseFloat(saleData.actual_tonnage || 0) * 1000 * parseFloat(saleData.price_per_kg || 0)).toLocaleString()} XOF
                  </p>
                  <p className="text-sm text-green-800 mt-1">
                    <strong>Primes carbone:</strong>{' '}
                    {(parseFloat(saleData.actual_tonnage || 0) * 1000 * parseFloat(saleData.carbon_premium_per_kg || 0)).toLocaleString()} XOF
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowFinalizeModal(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Finalisation...' : 'Finaliser'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Distribution Preview Modal */}
      <Dialog open={showDistributeModal} onOpenChange={setShowDistributeModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="distribute-preview-modal">
          <DialogHeader>
            <DialogTitle>Prévisualisation de la Distribution</DialogTitle>
            <DialogDescription>
              Répartition proportionnelle des primes pour : {distributeLot?.lot_name}
            </DialogDescription>
          </DialogHeader>

          {loadingPreview ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : distributePreview ? (
            <div className="space-y-4 py-2">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Prime Totale</p>
                  <p className="font-bold text-lg">{(distributePreview.total_premium || 0).toLocaleString()} XOF</p>
                </div>
                <div className="p-3 bg-amber-50 rounded-lg">
                  <p className="text-xs text-gray-500">Commission Coop ({(distributePreview.commission_rate * 100).toFixed(0)}%)</p>
                  <p className="font-bold text-lg text-amber-700">{(distributePreview.commission || 0).toLocaleString()} XOF</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg col-span-2">
                  <p className="text-xs text-gray-500">Montant à Distribuer</p>
                  <p className="font-bold text-xl text-green-700">{(distributePreview.distributable || 0).toLocaleString()} XOF</p>
                </div>
              </div>

              {/* Farmer Breakdown Table */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Répartition par Agriculteur ({distributePreview.contributors?.length || 0})
                </h4>
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm" data-testid="distribution-breakdown-table">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 bg-gray-50 border-b">
                        <th className="py-2 px-3">Agriculteur</th>
                        <th className="py-2 px-3 text-right">Tonnage (kg)</th>
                        <th className="py-2 px-3 text-right">% du Lot</th>
                        <th className="py-2 px-3 text-right">Montant (XOF)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(distributePreview.contributors || []).map((c, idx) => (
                        <tr key={idx} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="py-2 px-3 font-medium">{c.farmer_name || 'Inconnu'}</td>
                          <td className="py-2 px-3 text-right">{(c.estimated_tonnage_kg || 0).toLocaleString()}</td>
                          <td className="py-2 px-3 text-right">{((c.share_pct || 0) * 100).toFixed(1)}%</td>
                          <td className="py-2 px-3 text-right font-bold text-green-700">{(c.amount || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-bold bg-gray-50 border-t-2">
                        <td className="py-2 px-3">Total</td>
                        <td className="py-2 px-3 text-right">{(distributePreview.total_tonnage || 0).toLocaleString()}</td>
                        <td className="py-2 px-3 text-right">100%</td>
                        <td className="py-2 px-3 text-right text-green-700">{(distributePreview.distributable || 0).toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-400">Aucune donnée disponible</div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDistributeModal(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleConfirmDistribute}
              disabled={distributing || !distributePreview}
              className="bg-green-600 hover:bg-green-700"
              data-testid="confirm-distribute-btn"
            >
              {distributing ? 'Distribution...' : 'Confirmer la Distribution'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LotsPage;

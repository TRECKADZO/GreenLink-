import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cooperativeApi } from '../../services/cooperativeApi';
import { 
  Package, Plus, ChevronLeft, Leaf, Users,
  DollarSign, CheckCircle, Clock, TrendingUp,
  Scale, FileCheck
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

  const handleDistribute = async (lotId) => {
    try {
      const result = await cooperativeApi.distributeLotPremiums(lotId);
      toast.success(`Distribution créée pour ${result.beneficiaries_count} bénéficiaires`);
      navigate('/cooperative/distributions');
    } catch (error) {
      console.error('Error distributing:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de la distribution');
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
                          onClick={() => handleDistribute(lot.id)}
                          data-testid={`distribute-lot-${lot.id}`}
                        >
                          <DollarSign className="h-4 w-4 mr-2" />
                          Distribuer Primes
                        </Button>
                      )}
                    </div>
                  </div>
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
    </div>
  );
};

export default LotsPage;

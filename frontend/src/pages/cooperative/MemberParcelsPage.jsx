import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { offlineCooperativeApi as cooperativeApi } from '../../services/offlineCooperativeApi';
import { 
  MapPin, Plus, ChevronLeft, Leaf, Trash2,
  Navigation, CheckCircle, FileText, Scale, TreePine
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Label } from '../../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { toast } from 'sonner';

const MemberParcelsPage = () => {
  const { memberId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [newParcel, setNewParcel] = useState({
    location: '',
    village: '',
    area_hectares: '',
    crop_type: 'cacao',
    gps_lat: '',
    gps_lng: '',
    certification: '',
    arbres_grands: '',
    arbres_moyens: '',
    arbres_petits: '',
    couverture_ombragee: ''
  });

  const fetchParcels = async () => {
    try {
      setLoading(true);
      const result = await cooperativeApi.getMemberParcels(memberId);
      setData(result);
    } catch (error) {
      /* error logged */
      toast.error('Erreur lors du chargement des parcelles');
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchParcels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId]);

  const handleAddParcel = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const result = await cooperativeApi.addMemberParcel(memberId, {
        ...newParcel,
        area_hectares: parseFloat(newParcel.area_hectares),
        gps_lat: newParcel.gps_lat ? parseFloat(newParcel.gps_lat) : null,
        gps_lng: newParcel.gps_lng ? parseFloat(newParcel.gps_lng) : null,
        certification: newParcel.certification || null,
        arbres_grands: newParcel.arbres_grands ? parseInt(newParcel.arbres_grands) : null,
        arbres_moyens: newParcel.arbres_moyens ? parseInt(newParcel.arbres_moyens) : null,
        arbres_petits: newParcel.arbres_petits ? parseInt(newParcel.arbres_petits) : null,
        couverture_ombragee: newParcel.couverture_ombragee ? parseFloat(newParcel.couverture_ombragee) : null
      });
      toast.success(`Parcelle ajoutée! Score carbone: ${result.score_carbone || result.carbon_score}/10`);
      setShowAddModal(false);
      setNewParcel({
        location: '',
        village: '',
        area_hectares: '',
        crop_type: 'cacao',
        gps_lat: '',
        gps_lng: '',
        certification: '',
        arbres_grands: '',
        arbres_moyens: '',
        arbres_petits: '',
        couverture_ombragee: ''
      });
      fetchParcels();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'ajout');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteParcel = async (parcelId) => {
    if (!confirm('Supprimer cette parcelle?')) return;
    try {
      await cooperativeApi.deleteMemberParcel(memberId, parcelId);
      toast.success('Parcelle supprimée');
      fetchParcels();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setNewParcel({
            ...newParcel,
            gps_lat: position.coords.latitude.toFixed(6),
            gps_lng: position.coords.longitude.toFixed(6)
          });
          toast.success('Position GPS capturée');
        },
        (error) => {
          toast.error('Impossible d\'obtenir la position GPS');
        }
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" data-testid="member-parcels-page">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/cooperative/members')}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Retour
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Parcelles de {data?.nom_membre || data?.member_name}
                </h1>
                <p className="text-sm text-gray-500">
                  {data?.total_parcelles || data?.total_parcels} parcelles • {data?.superficie_totale || data?.total_hectares} ha • {data?.co2_total || data?.total_co2} T CO₂
                </p>
              </div>
            </div>
            <Button onClick={() => setShowAddModal(true)} data-testid="add-parcel-btn">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter Parcelle
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <MapPin className="h-8 w-8 mx-auto text-green-600 mb-2" />
              <p className="text-2xl font-bold">{data?.total_parcelles || 0}</p>
              <p className="text-sm text-gray-500">Parcelles</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Scale className="h-8 w-8 mx-auto text-blue-600 mb-2" />
              <p className="text-2xl font-bold">{data?.superficie_totale || 0}</p>
              <p className="text-sm text-gray-500">Hectares</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Leaf className="h-8 w-8 mx-auto text-emerald-600 mb-2" />
              <p className="text-2xl font-bold">{data?.score_carbone_moyen || 0}/10</p>
              <p className="text-sm text-gray-500">Score Carbone</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-8 w-8 mx-auto text-teal-600 mb-2" />
              <p className="text-2xl font-bold">{data?.co2_total || 0}</p>
              <p className="text-sm text-gray-500">Tonnes CO₂</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Parcels List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {data?.parcelles?.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.parcelles.map((parcel) => (
              <Card key={parcel.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                        <MapPin className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{parcel.localisation}</h3>
                        <p className="text-sm text-gray-500">{parcel.village}</p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDeleteParcel(parcel.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="p-2 bg-gray-50 rounded">
                      <p className="text-xs text-gray-500">Surface</p>
                      <p className="font-medium">{parcel.superficie} ha</p>
                    </div>
                    <div className="p-2 bg-gray-50 rounded">
                      <p className="text-xs text-gray-500">Culture</p>
                      <p className="font-medium capitalize">{parcel.type_culture}</p>
                    </div>
                    <div className="p-2 bg-emerald-50 rounded">
                      <p className="text-xs text-emerald-600">Score Carbone</p>
                      <p className="font-medium text-emerald-700">{parcel.score_carbone}/10</p>
                    </div>
                    <div className="p-2 bg-teal-50 rounded">
                      <p className="text-xs text-teal-600">CO₂ Capturé</p>
                      <p className="font-medium text-teal-700">{parcel.co2_capture} T</p>
                    </div>
                  </div>

                  {/* Arbres ombragés par strate */}
                  {(parcel.nombre_arbres > 0 || parcel.arbres_strate1 > 0 || parcel.arbres_strate2 > 0 || parcel.arbres_strate3 > 0) && (
                    <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-100" data-testid={`parcel-trees-${parcel.id}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <TreePine className="h-4 w-4 text-green-700" />
                        <p className="text-xs font-semibold text-green-800">Arbres ombragés — {parcel.nombre_arbres || ((parcel.arbres_strate1 || 0) + (parcel.arbres_strate2 || 0) + (parcel.arbres_strate3 || 0))} total</p>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-1.5 bg-white rounded border border-green-200">
                          <p className="text-lg font-bold text-green-800">{parcel.arbres_strate3 || 0}</p>
                          <p className="text-[10px] text-green-600 font-medium">Strate 3</p>
                          <p className="text-[9px] text-gray-400">&gt;30m</p>
                        </div>
                        <div className="p-1.5 bg-white rounded border border-green-200">
                          <p className="text-lg font-bold text-green-700">{parcel.arbres_strate2 || 0}</p>
                          <p className="text-[10px] text-green-600 font-medium">Strate 2</p>
                          <p className="text-[9px] text-gray-400">5-30m</p>
                        </div>
                        <div className="p-1.5 bg-white rounded border border-green-200">
                          <p className="text-lg font-bold text-green-600">{parcel.arbres_strate1 || 0}</p>
                          <p className="text-[10px] text-green-600 font-medium">Strate 1</p>
                          <p className="text-[9px] text-gray-400">3-5m</p>
                        </div>
                      </div>
                      {parcel.couverture_ombragee > 0 && (
                        <div className="mt-2 flex items-center justify-between text-xs">
                          <span className="text-green-700">Couverture ombragée</span>
                          <span className="font-semibold text-green-800">{parcel.couverture_ombragee}%</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="mt-3 flex items-center gap-2">
                    {parcel.certification && (
                      <Badge className="bg-amber-100 text-amber-800">
                        <FileText className="h-3 w-3 mr-1" />
                        {parcel.certification}
                      </Badge>
                    )}
                    {parcel.coordonnees_gps && (
                      <Badge className="bg-blue-100 text-blue-800">
                        <Navigation className="h-3 w-3 mr-1" />
                        GPS
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">Aucune parcelle</h3>
              <p className="text-gray-500 mb-4">
                Ajoutez la première parcelle de ce membre
              </p>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter une parcelle
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Parcel Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-lg" data-testid="add-parcel-modal">
          <DialogHeader>
            <DialogTitle>Ajouter une Parcelle</DialogTitle>
            <DialogDescription>
              Enregistrez une nouvelle parcelle pour ce membre
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddParcel}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="location">Nom/ID Parcelle *</Label>
                  <Input
                    id="location"
                    value={newParcel.location}
                    onChange={(e) => setNewParcel({...newParcel, location: e.target.value})}
                    placeholder="Ex: Parcelle Nord"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="village">Village *</Label>
                  <Input
                    id="village"
                    value={newParcel.village}
                    onChange={(e) => setNewParcel({...newParcel, village: e.target.value})}
                    placeholder="Ex: Gagnoa Centre"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="area_hectares">Surface (hectares) *</Label>
                  <Input
                    id="area_hectares"
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={newParcel.area_hectares}
                    onChange={(e) => setNewParcel({...newParcel, area_hectares: e.target.value})}
                    placeholder="2.5"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="crop_type">Culture</Label>
                  <Select 
                    value={newParcel.crop_type} 
                    onValueChange={(value) => setNewParcel({...newParcel, crop_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cacao">Cacao</SelectItem>
                      <SelectItem value="cafe">Café</SelectItem>
                      <SelectItem value="anacarde">Anacarde</SelectItem>
                      <SelectItem value="hevea">Hévéa</SelectItem>
                      <SelectItem value="palmier">Palmier à huile</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="certification">Certification (optionnel)</Label>
                <Select 
                  value={newParcel.certification} 
                  onValueChange={(value) => setNewParcel({...newParcel, certification: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Aucune" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Aucune</SelectItem>
                    <SelectItem value="Rainforest Alliance">Rainforest Alliance</SelectItem>
                    <SelectItem value="UTZ">UTZ Certified</SelectItem>
                    <SelectItem value="Fairtrade">Fairtrade</SelectItem>
                    <SelectItem value="Bio">Bio / Organic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <TreePine className="h-4 w-4 text-green-600" />
                  <Label className="font-semibold">Arbres ombrages (optionnel)</Label>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-2">
                  <div>
                    <Label className="text-xs text-gray-500">Strate 3 (&gt;30m)</Label>
                    <Input type="number" min="0" value={newParcel.arbres_grands} onChange={(e) => setNewParcel({...newParcel, arbres_grands: e.target.value})} placeholder="0" data-testid="modal-arbres-strate3" />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Strate 2 (5-30m)</Label>
                    <Input type="number" min="0" value={newParcel.arbres_moyens} onChange={(e) => setNewParcel({...newParcel, arbres_moyens: e.target.value})} placeholder="0" data-testid="modal-arbres-strate2" />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Strate 1 (3-5m)</Label>
                    <Input type="number" min="0" value={newParcel.arbres_petits} onChange={(e) => setNewParcel({...newParcel, arbres_petits: e.target.value})} placeholder="0" data-testid="modal-arbres-strate1" />
                  </div>
                </div>
                <div className="max-w-[200px]">
                  <Label className="text-xs text-gray-500">Couverture ombragee (%)</Label>
                  <Input type="number" min="0" max="100" step="0.5" value={newParcel.couverture_ombragee} onChange={(e) => setNewParcel({...newParcel, couverture_ombragee: e.target.value})} placeholder="Ex: 40" data-testid="modal-couverture" />
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <Label>Coordonnées GPS (optionnel)</Label>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={getCurrentLocation}
                  >
                    <Navigation className="h-4 w-4 mr-1" />
                    Capturer GPS
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Input
                      placeholder="Latitude"
                      value={newParcel.gps_lat}
                      onChange={(e) => setNewParcel({...newParcel, gps_lat: e.target.value})}
                    />
                  </div>
                  <div>
                    <Input
                      placeholder="Longitude"
                      value={newParcel.gps_lng}
                      onChange={(e) => setNewParcel({...newParcel, gps_lng: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Ajout...' : 'Ajouter Parcelle'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MemberParcelsPage;

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { offlineCooperativeApi as cooperativeApi } from '../../services/offlineCooperativeApi';
import { 
  MapPin, ChevronLeft, Leaf, Navigation, Users, User, TreePine
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { toast } from 'sonner';

// Liste des départements de Côte d'Ivoire
const DEPARTMENTS = [
  'Abidjan', 'Abengourou', 'Aboisso', 'Adzopé', 'Agboville',
  'Agnibilékrou', 'Bangolo', 'Béoumi', 'Biankouma', 'Bloléquin',
  'Bocanda', 'Bondoukou', 'Bongouanou', 'Botro', 'Bouaflé',
  'Bouaké', 'Bouna', 'Boundiali', 'Buyo', 'Dabakala',
  'Dabou', 'Daloa', 'Danané', 'Daoukro', 'Didiévi',
  'Dimbokro', 'Divo', 'Doropo', 'Duékoué', 'Facobly',
  'Ferkessédougou', 'Fresco', 'Gagnoa', 'Grand-Bassam', 'Grand-Lahou',
  'Guéyo', 'Guiglo', 'Guitry', 'Issia', 'Jacqueville',
  'Kani', 'Katiola', 'Kong', 'Korhogo', 'Kouibly',
  'Kounahiri', 'Koun-Fao', 'Lakota', 'Man', 'Mankono',
  'Mbahiakro', 'Méagui', 'Minignan', 'Nassian', 'Niakaramadougou',
  'Odienné', 'Oumé', 'Ouangolodougou', 'Prikro', 'Sakassou',
  'San-Pédro', 'Sandégué', 'Sassandra', 'Séguéla', 'Sikensi',
  'Sinfra', 'Sipilou', 'Soubré', 'Tabou', 'Taabo',
  'Tanda', 'Tengrela', 'Tiassalé', 'Tiébissou', 'Touba',
  'Toulepleu', 'Toumodi', 'Transua', 'Vavoua', 'Yamoussoukro',
  'Zouan-Hounien', 'Zoukougbeu', 'Zuénoula'
];

const AddParcelPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetFarmerId = searchParams.get('farmer_id') || '';
  const presetFarmerName = decodeURIComponent(searchParams.get('farmer_name') || '');
  const isFromAgent = !!presetFarmerId;

  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(!isFromAgent);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    member_id: presetFarmerId,
    location: '',
    village: '',
    department: '',
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

  // Auto-estimate shade cover from tree counts
  const estimateCouverture = (data) => {
    const g = parseInt(data.arbres_grands) || 0;
    const m = parseInt(data.arbres_moyens) || 0;
    const p = parseInt(data.arbres_petits) || 0;
    const area = Math.max(parseFloat(data.area_hectares) || 0.01, 0.01) * 10000;
    const totalCrown = (g * 90) + (m * 30) + (p * 10);
    return Math.min(100, Math.round((totalCrown / area) * 1000) / 10);
  };

  const handleFieldChange = (field, value) => {
    const next = { ...formData, [field]: value };
    if (['arbres_grands', 'arbres_moyens', 'arbres_petits', 'area_hectares'].includes(field)) {
      const est = estimateCouverture(next);
      if (est > 0) next.couverture_ombragee = String(est);
    }
    setFormData(next);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!isFromAgent) {
      const fetchMembers = async () => {
        try {
          const data = await cooperativeApi.getMembers({ status: 'active' });
          setMembers(data.members || []);
        } catch (error) {
          /* error logged */
          toast.error('Erreur lors du chargement des membres');
        } finally {
          setLoadingMembers(false);
        }
      };
      fetchMembers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFromAgent]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.member_id) {
      toast.error('Veuillez sélectionner un agriculteur');
      return;
    }
    
    if (!formData.location || !formData.village || !formData.area_hectares) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setSubmitting(true);
    try {
      const result = await cooperativeApi.addMemberParcel(formData.member_id, {
        location: formData.location,
        village: `${formData.village}${formData.department ? ', ' + formData.department : ''}`,
        area_hectares: parseFloat(formData.area_hectares),
        crop_type: formData.crop_type,
        gps_lat: formData.gps_lat ? parseFloat(formData.gps_lat) : null,
        gps_lng: formData.gps_lng ? parseFloat(formData.gps_lng) : null,
        certification: formData.certification || null,
        arbres_grands: formData.arbres_grands ? parseInt(formData.arbres_grands) : null,
        arbres_moyens: formData.arbres_moyens ? parseInt(formData.arbres_moyens) : null,
        arbres_petits: formData.arbres_petits ? parseInt(formData.arbres_petits) : null,
        couverture_ombragee: formData.couverture_ombragee ? parseFloat(formData.couverture_ombragee) : null
      });
      
      toast.success(`Parcelle ajoutée avec succès! Score carbone: ${result.score_carbone || result.carbon_score}/10`);
      navigate(`/cooperative/members/${formData.member_id}/parcels`);
    } catch (error) {
      /* error logged */
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'ajout de la parcelle');
    } finally {
      setSubmitting(false);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      toast.info('Obtention de la position GPS...');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData,
            gps_lat: position.coords.latitude.toFixed(6),
            gps_lng: position.coords.longitude.toFixed(6)
          });
          toast.success('Position GPS capturée');
        },
        (error) => {
          toast.error('Impossible d\'obtenir la position GPS');
        }
      );
    } else {
      toast.error('La géolocalisation n\'est pas supportée par ce navigateur');
    }
  };

  const selectedMember = members.find(m => m.id === formData.member_id);

  return (
    <div className="min-h-screen bg-gray-50" data-testid="add-parcel-page">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-700 to-green-600 text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate(-1)}
              className="text-white hover:bg-white/10"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Retour
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <MapPin className="h-6 w-6" />
                <h1 className="text-xl font-bold">Nouvelle Parcelle</h1>
              </div>
              <p className="text-sm text-green-100">Enregistrez une parcelle pour un membre</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Leaf className="h-5 w-5 text-green-600" />
              Informations de la parcelle
            </CardTitle>
            <CardDescription>
              Tous les champs marqués d'un * sont obligatoires
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Member Selection */}
              {isFromAgent ? (
                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                  <Label className="text-emerald-800 font-semibold flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Agriculteur
                  </Label>
                  <p className="mt-1 text-base font-bold text-emerald-900">{presetFarmerName}</p>
                  <p className="text-xs text-emerald-600 mt-0.5">Parcelle liee automatiquement a cet agriculteur</p>
                </div>
              ) : (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <Label htmlFor="member_id" className="text-blue-800 font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Agriculteur / Membre *
                </Label>
                <Select 
                  value={formData.member_id} 
                  onValueChange={(value) => setFormData({...formData, member_id: value})}
                >
                  <SelectTrigger className="mt-2 bg-white" data-testid="member-select">
                    <SelectValue placeholder={loadingMembers ? "Chargement..." : "Sélectionnez un membre"} />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.full_name} - {member.village}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedMember && (
                  <p className="mt-2 text-sm text-blue-600">
                    Membre sélectionné: <strong>{selectedMember.full_name}</strong> ({selectedMember.phone_number})
                  </p>
                )}
              </div>
              )}

              {/* Location and Village */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="location">Nom/Identifiant de la parcelle *</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    placeholder="Ex: Parcelle Nord, Zone A"
                    required
                    data-testid="parcel-location-input"
                  />
                </div>
                <div>
                  <Label htmlFor="village">Village *</Label>
                  <Input
                    id="village"
                    value={formData.village}
                    onChange={(e) => setFormData({...formData, village: e.target.value})}
                    placeholder="Ex: Kossou, Bouaflé"
                    required
                    data-testid="parcel-village-input"
                  />
                </div>
              </div>

              {/* Department */}
              <div>
                <Label htmlFor="department">Département</Label>
                <Select 
                  value={formData.department} 
                  onValueChange={(value) => setFormData({...formData, department: value})}
                >
                  <SelectTrigger data-testid="department-select">
                    <SelectValue placeholder="Sélectionnez un département" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {DEPARTMENTS.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Area and Crop Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="area_hectares">Superficie (hectares) *</Label>
                  <Input
                    id="area_hectares"
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={formData.area_hectares}
                    onChange={(e) => handleFieldChange('area_hectares', e.target.value)}
                    placeholder="Ex: 2.5"
                    required
                    data-testid="parcel-area-input"
                  />
                </div>
                <div>
                  <Label htmlFor="crop_type">Type de culture *</Label>
                  <Select 
                    value={formData.crop_type} 
                    onValueChange={(value) => setFormData({...formData, crop_type: value})}
                  >
                    <SelectTrigger data-testid="crop-type-select">
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

              {/* Certification */}
              <div>
                <Label htmlFor="certification">Certification (optionnel)</Label>
                <Select 
                  value={formData.certification} 
                  onValueChange={(value) => setFormData({...formData, certification: value === 'none' ? '' : value})}
                >
                  <SelectTrigger data-testid="certification-select">
                    <SelectValue placeholder="Sélectionnez une certification" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucune</SelectItem>
                    <SelectItem value="Rainforest Alliance">Rainforest Alliance</SelectItem>
                    <SelectItem value="UTZ">UTZ Certified</SelectItem>
                    <SelectItem value="Fairtrade">Fairtrade</SelectItem>
                    <SelectItem value="Bio">Bio / Agriculture Biologique</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* GPS Coordinates */}
              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <TreePine className="h-5 w-5 text-green-600" />
                  <Label className="text-base font-semibold">Arbres ombrages par strate (optionnel)</Label>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  Renseignez le nombre d'arbres par strate pour ameliorer le calcul du score carbone
                </p>
                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div>
                    <Label htmlFor="arbres_grands" className="text-sm text-gray-600">Strate 3 (&gt;30m)</Label>
                    <Input
                      id="arbres_grands"
                      type="number"
                      min="0"
                      value={formData.arbres_grands}
                      onChange={(e) => handleFieldChange('arbres_grands', e.target.value)}
                      placeholder="0"
                      data-testid="arbres-strate3-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="arbres_moyens" className="text-sm text-gray-600">Strate 2 (5-30m)</Label>
                    <Input
                      id="arbres_moyens"
                      type="number"
                      min="0"
                      value={formData.arbres_moyens}
                      onChange={(e) => handleFieldChange('arbres_moyens', e.target.value)}
                      placeholder="0"
                      data-testid="arbres-strate2-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="arbres_petits" className="text-sm text-gray-600">Strate 1 (3-5m)</Label>
                    <Input
                      id="arbres_petits"
                      type="number"
                      min="0"
                      value={formData.arbres_petits}
                      onChange={(e) => handleFieldChange('arbres_petits', e.target.value)}
                      placeholder="0"
                      data-testid="arbres-strate1-input"
                    />
                  </div>
                </div>
                {(formData.arbres_grands || formData.arbres_moyens || formData.arbres_petits) && (
                  <div className="text-sm text-green-700 bg-green-50 px-3 py-1.5 rounded mb-3">
                    Total: <strong>{(parseInt(formData.arbres_grands || 0) + parseInt(formData.arbres_moyens || 0) + parseInt(formData.arbres_petits || 0))}</strong> arbres
                  </div>
                )}
                <div className="max-w-xs">
                  <div className="flex items-center gap-2 mb-1">
                    <Label htmlFor="couverture_ombragee" className="text-sm text-gray-600">Couverture ombragee (%)</Label>
                    {parseFloat(formData.couverture_ombragee) > 0 && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">Auto-calcul</span>
                    )}
                  </div>
                  <Input
                    id="couverture_ombragee"
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={formData.couverture_ombragee}
                    onChange={(e) => handleFieldChange('couverture_ombragee', e.target.value)}
                    placeholder="Ex: 40"
                    data-testid="couverture-ombragee-input"
                  />
                </div>
              </div>

              {/* GPS Coordinates */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base">Coordonnées GPS (optionnel)</Label>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={getCurrentLocation}
                  >
                    <Navigation className="h-4 w-4 mr-1" />
                    Capturer ma position
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="gps_lat" className="text-sm text-gray-500">Latitude</Label>
                    <Input
                      id="gps_lat"
                      value={formData.gps_lat}
                      onChange={(e) => setFormData({...formData, gps_lat: e.target.value})}
                      placeholder="Ex: 6.827623"
                      data-testid="gps-lat-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="gps_lng" className="text-sm text-gray-500">Longitude</Label>
                    <Input
                      id="gps_lng"
                      value={formData.gps_lng}
                      onChange={(e) => setFormData({...formData, gps_lng: e.target.value})}
                      placeholder="Ex: -5.282031"
                      data-testid="gps-lng-input"
                    />
                  </div>
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-start gap-2">
                  <Leaf className="h-5 w-5 text-green-600 mt-0.5" />
                  <p className="text-sm text-green-800">
                    Le <strong>score carbone</strong> est calcule en fonction de la superficie, 
                    des certifications et du <strong>nombre d'arbres ombrages</strong>. Plus vous avez d'arbres, 
                    plus le score est eleve.
                  </p>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-4 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => navigate(-1)}
                >
                  Annuler
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={submitting}
                  data-testid="submit-parcel-btn"
                >
                  {submitting ? 'Enregistrement...' : 'Enregistrer la parcelle'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AddParcelPage;

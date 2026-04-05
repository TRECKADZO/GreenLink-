import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { offlineCooperativeApi as cooperativeApi } from '../../services/offlineCooperativeApi';
import { 
  MapPin, ChevronLeft, Leaf, Navigation, Users, User
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
    certification: ''
  });

  useEffect(() => {
    if (!isFromAgent) {
      const fetchMembers = async () => {
        try {
          const data = await cooperativeApi.getMembers({ status: 'active' });
          setMembers(data.members || []);
        } catch (error) {
          console.error('Error fetching members:', error);
          toast.error('Erreur lors du chargement des membres');
        } finally {
          setLoadingMembers(false);
        }
      };
      fetchMembers();
    }
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
        certification: formData.certification || null
      });
      
      toast.success(`Parcelle ajoutée avec succès! Score carbone: ${result.score_carbone || result.carbon_score}/10`);
      navigate(`/cooperative/members/${formData.member_id}/parcels`);
    } catch (error) {
      console.error('Error adding parcel:', error);
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
                    onChange={(e) => setFormData({...formData, area_hectares: e.target.value})}
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
                    Le <strong>score carbone</strong> sera calculé automatiquement en fonction de la superficie 
                    et des certifications. Les parcelles certifiées obtiennent un bonus de score.
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

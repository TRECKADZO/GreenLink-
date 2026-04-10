import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  MapPin, CheckCircle, XCircle, ChevronLeft, Camera, Navigation, 
  Leaf, TreeDeciduous, Droplets, AlertTriangle, Save, Upload,
  Trash2, Eye, RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Switch } from '../../components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AuditFormPage = () => {
  const { missionId, parcelId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  
  const [parcel, setParcel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [gettingLocation, setGettingLocation] = useState(false);
  
  const [formData, setFormData] = useState({
    actual_area_hectares: '',
    shade_trees_count: '',
    shade_trees_density: '',
    organic_practices: false,
    soil_cover: false,
    composting: false,
    erosion_control: false,
    crop_health: '',
    gps_lat: '',
    gps_lng: '',
    observations: '',
    recommendation: '',
    rejection_reason: ''
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const fetchParcelDetails = async () => {
      try {
        // Fetch mission parcels to get parcel details
        const response = await fetch(`${API_URL}/api/carbon-auditor/mission/${missionId}/parcels`);
        const data = await response.json();
        const parcelData = data.parcels?.find(p => p.id === parcelId);
        
        if (parcelData) {
          setParcel(parcelData);
          setFormData(prev => ({
            ...prev,
            actual_area_hectares: parcelData.area_hectares?.toString() || '',
            gps_lat: parcelData.gps_lat?.toString() || '',
            gps_lng: parcelData.gps_lng?.toString() || ''
          }));
        }
      } catch (error) {
        /* error logged */
        toast.error('Erreur lors du chargement de la parcelle');
      } finally {
        setLoading(false);
      }
    };

    if (missionId && parcelId) {
      fetchParcelDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missionId, parcelId]);

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      setGettingLocation(true);
      toast.info('Obtention de la position GPS...');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            gps_lat: position.coords.latitude.toFixed(6),
            gps_lng: position.coords.longitude.toFixed(6)
          }));
          toast.success('Position GPS capturée');
          setGettingLocation(false);
        },
        (error) => {
          toast.error('Impossible d\'obtenir la position GPS');
          setGettingLocation(false);
        },
        { enableHighAccuracy: true }
      );
    } else {
      toast.error('Géolocalisation non supportée');
    }
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    if (photos.length + files.length > 5) {
      toast.error('Maximum 5 photos autorisées');
      return;
    }
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotos(prev => [...prev, {
          uri: reader.result,
          name: file.name,
          timestamp: new Date().toISOString()
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.actual_area_hectares || !formData.shade_trees_density || !formData.crop_health || !formData.recommendation) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    
    if (formData.recommendation === 'rejected' && !formData.rejection_reason) {
      toast.error('Veuillez indiquer la raison du rejet');
      return;
    }
    
    if (photos.length === 0) {
      toast.error('Au moins une photo est requise');
      return;
    }

    setSubmitting(true);
    try {
      const auditData = {
        parcel_id: parcelId,
        actual_area_hectares: parseFloat(formData.actual_area_hectares),
        shade_trees_count: parseInt(formData.shade_trees_count) || 0,
        shade_trees_density: formData.shade_trees_density,
        organic_practices: formData.organic_practices,
        soil_cover: formData.soil_cover,
        composting: formData.composting,
        erosion_control: formData.erosion_control,
        crop_health: formData.crop_health,
        photos: photos.map(p => p.uri),
        gps_lat: formData.gps_lat ? parseFloat(formData.gps_lat) : null,
        gps_lng: formData.gps_lng ? parseFloat(formData.gps_lng) : null,
        observations: formData.observations,
        recommendation: formData.recommendation,
        rejection_reason: formData.rejection_reason || null
      };

      const response = await fetch(
        `${API_URL}/api/carbon-auditor/audit/submit?auditor_id=${user.id}&mission_id=${missionId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(auditData)
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Erreur lors de la soumission');
      }

      const result = await response.json();
      toast.success(`Audit soumis! Score carbone calculé: ${result.carbon_score}/10`);
      navigate(`/auditor/mission/${missionId}`);
    } catch (error) {
      /* error logged */
      toast.error(error.message || 'Erreur lors de la soumission de l\'audit');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900" data-testid="audit-form-page">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate(`/auditor/mission/${missionId}`)}
              className="text-white hover:bg-white/10"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Retour
            </Button>
            <div>
              <h1 className="text-xl font-bold">Audit de Parcelle</h1>
              <p className="text-emerald-100">{parcel?.location} - {parcel?.farmer_name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Parcel Info Card */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-white flex items-center gap-2">
                <Leaf className="h-5 w-5 text-emerald-400" />
                Informations de la parcelle
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="p-3 bg-gray-700/50 rounded-lg">
                  <p className="text-gray-400">Village</p>
                  <p className="font-medium text-white">{parcel?.village}</p>
                </div>
                <div className="p-3 bg-gray-700/50 rounded-lg">
                  <p className="text-gray-400">Superficie déclarée</p>
                  <p className="font-medium text-white">{parcel?.area_hectares} ha</p>
                </div>
                <div className="p-3 bg-gray-700/50 rounded-lg">
                  <p className="text-gray-400">Culture</p>
                  <p className="font-medium text-white capitalize">{parcel?.crop_type}</p>
                </div>
                <div className="p-3 bg-emerald-500/10 rounded-lg">
                  <p className="text-emerald-400">Score déclaré</p>
                  <p className="font-medium text-emerald-300">{parcel?.carbon_score || '-'}/10</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Verification Fields */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Vérification terrain</CardTitle>
              <CardDescription className="text-gray-400">
                Remplissez les données observées sur le terrain
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Actual Area */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Superficie réelle (ha) *</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.actual_area_hectares}
                    onChange={(e) => setFormData({...formData, actual_area_hectares: e.target.value})}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="Ex: 2.5"
                    required
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Nombre d'arbres d'ombrage</Label>
                  <Input
                    type="number"
                    value={formData.shade_trees_count}
                    onChange={(e) => setFormData({...formData, shade_trees_count: e.target.value})}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="Ex: 45"
                  />
                </div>
              </div>

              {/* Shade Trees Density */}
              <div>
                <Label className="text-gray-300">Densité des arbres d'ombrage *</Label>
                <Select
                  value={formData.shade_trees_density}
                  onValueChange={(value) => setFormData({...formData, shade_trees_density: value})}
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Sélectionnez la densité" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="low">Faible (≤20 arbres/ha)</SelectItem>
                    <SelectItem value="medium">Moyenne (21-40 arbres/ha)</SelectItem>
                    <SelectItem value="high">Élevée (41+ arbres/ha)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sustainable Practices */}
              <div className="pt-4 border-t border-gray-700">
                <Label className="text-gray-300 mb-3 block">Pratiques durables observées</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Leaf className="h-4 w-4 text-green-400" />
                      <span className="text-white text-sm">Agriculture biologique</span>
                    </div>
                    <Switch
                      checked={formData.organic_practices}
                      onCheckedChange={(checked) => setFormData({...formData, organic_practices: checked})}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <TreeDeciduous className="h-4 w-4 text-green-400" />
                      <span className="text-white text-sm">Couverture du sol</span>
                    </div>
                    <Switch
                      checked={formData.soil_cover}
                      onCheckedChange={(checked) => setFormData({...formData, soil_cover: checked})}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Droplets className="h-4 w-4 text-green-400" />
                      <span className="text-white text-sm">Compostage</span>
                    </div>
                    <Switch
                      checked={formData.composting}
                      onCheckedChange={(checked) => setFormData({...formData, composting: checked})}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-green-400" />
                      <span className="text-white text-sm">Contrôle érosion</span>
                    </div>
                    <Switch
                      checked={formData.erosion_control}
                      onCheckedChange={(checked) => setFormData({...formData, erosion_control: checked})}
                    />
                  </div>
                </div>
              </div>

              {/* Crop Health */}
              <div>
                <Label className="text-gray-300">État de santé des cultures *</Label>
                <Select
                  value={formData.crop_health}
                  onValueChange={(value) => setFormData({...formData, crop_health: value})}
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Évaluez l'état des cultures" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="excellent">Excellent</SelectItem>
                    <SelectItem value="good">Bon</SelectItem>
                    <SelectItem value="average">Moyen</SelectItem>
                    <SelectItem value="poor">Mauvais</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* GPS Capture */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Navigation className="h-5 w-5 text-blue-400" />
                Position GPS
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <Label className="text-gray-300">Latitude</Label>
                  <Input
                    value={formData.gps_lat}
                    onChange={(e) => setFormData({...formData, gps_lat: e.target.value})}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="Ex: 6.827623"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Longitude</Label>
                  <Input
                    value={formData.gps_lng}
                    onChange={(e) => setFormData({...formData, gps_lng: e.target.value})}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="Ex: -5.282031"
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={getCurrentLocation}
                disabled={gettingLocation}
                className="w-full border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
              >
                {gettingLocation ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Navigation className="h-4 w-4 mr-2" />
                )}
                Capturer ma position actuelle
              </Button>
            </CardContent>
          </Card>

          {/* Photos */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Camera className="h-5 w-5 text-amber-400" />
                Photos de la parcelle *
              </CardTitle>
              <CardDescription className="text-gray-400">
                Prenez au moins 1 photo de la parcelle (max 5)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-4 mb-4">
                {photos.map((photo, index) => (
                  <div key={`el-${index}`} className="relative group">
                    <img
                      src={photo.uri}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute top-1 right-1 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-3 w-3 text-white" />
                    </button>
                  </div>
                ))}
                {photos.length < 5 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-24 border-2 border-dashed border-gray-600 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-emerald-500/50 hover:text-emerald-400 transition-colors"
                  >
                    <Camera className="h-6 w-6 mb-1" />
                    <span className="text-xs">Ajouter</span>
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </CardContent>
          </Card>

          {/* Observations */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Observations</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.observations}
                onChange={(e) => setFormData({...formData, observations: e.target.value})}
                className="bg-gray-700 border-gray-600 text-white min-h-[100px]"
                placeholder="Notes et observations sur la parcelle..."
              />
            </CardContent>
          </Card>

          {/* Recommendation */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Décision d'audit *</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({...formData, recommendation: 'approved', rejection_reason: ''})}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    formData.recommendation === 'approved'
                      ? 'border-green-500 bg-green-500/20'
                      : 'border-gray-600 hover:border-green-500/50'
                  }`}
                >
                  <CheckCircle className={`h-8 w-8 mx-auto mb-2 ${
                    formData.recommendation === 'approved' ? 'text-green-400' : 'text-gray-500'
                  }`} />
                  <p className={`text-sm font-medium ${
                    formData.recommendation === 'approved' ? 'text-green-400' : 'text-gray-400'
                  }`}>Approuvé</p>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({...formData, recommendation: 'needs_review'})}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    formData.recommendation === 'needs_review'
                      ? 'border-amber-500 bg-amber-500/20'
                      : 'border-gray-600 hover:border-amber-500/50'
                  }`}
                >
                  <AlertTriangle className={`h-8 w-8 mx-auto mb-2 ${
                    formData.recommendation === 'needs_review' ? 'text-amber-400' : 'text-gray-500'
                  }`} />
                  <p className={`text-sm font-medium ${
                    formData.recommendation === 'needs_review' ? 'text-amber-400' : 'text-gray-400'
                  }`}>À revoir</p>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({...formData, recommendation: 'rejected'})}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    formData.recommendation === 'rejected'
                      ? 'border-red-500 bg-red-500/20'
                      : 'border-gray-600 hover:border-red-500/50'
                  }`}
                >
                  <XCircle className={`h-8 w-8 mx-auto mb-2 ${
                    formData.recommendation === 'rejected' ? 'text-red-400' : 'text-gray-500'
                  }`} />
                  <p className={`text-sm font-medium ${
                    formData.recommendation === 'rejected' ? 'text-red-400' : 'text-gray-400'
                  }`}>Rejeté</p>
                </button>
              </div>

              {formData.recommendation === 'rejected' && (
                <div>
                  <Label className="text-gray-300">Raison du rejet *</Label>
                  <Textarea
                    value={formData.rejection_reason}
                    onChange={(e) => setFormData({...formData, rejection_reason: e.target.value})}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="Expliquez pourquoi la parcelle est rejetée..."
                    required
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit Buttons */}
          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1 border-gray-600 text-gray-300"
              onClick={() => navigate(`/auditor/mission/${missionId}`)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              disabled={submitting}
            >
              {submitting ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {submitting ? 'Soumission...' : 'Soumettre l\'audit'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuditFormPage;

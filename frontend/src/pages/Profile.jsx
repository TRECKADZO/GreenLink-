import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import Navbar from '../components/Navbar';
import { 
  User, 
  Phone, 
  Sprout, 
  Building2, 
  Package, 
  LogOut, 
  Edit, 
  Save, 
  Trash2,
  AlertTriangle,
  Shield,
  Users,
  Baby,
  GraduationCap,
  MapPin,
  Calendar,
  RefreshCcw
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Profile = () => {
  const { user, logout, updateProfile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [iciProfile, setIciProfile] = useState(null);
  const [loadingIci, setLoadingIci] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    // Producteur
    farm_location: '',
    farm_size: '',
    crops: '',
    // Acheteur
    company_name: '',
    purchase_volume: '',
    // Entreprise RSE
    company_name_rse: '',
    sector: '',
    carbon_goals: '',
    // Fournisseur
    supplier_company: '',
    products_offered: '',
    // ICI Data
    department: '',
    village: '',
    genre: '',
    date_naissance: '',
    niveau_education: '',
    taille_menage: '',
    nombre_enfants: ''
  });

  // Update form data when user is loaded
  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        farm_location: user.farm_location || '',
        farm_size: user.farm_size || '',
        crops: user.crops?.join(', ') || '',
        company_name: user.company_name || '',
        purchase_volume: user.purchase_volume || '',
        company_name_rse: user.company_name_rse || '',
        sector: user.sector || '',
        carbon_goals: user.carbon_goals || '',
        supplier_company: user.supplier_company || '',
        products_offered: user.products_offered?.join(', ') || '',
        department: user.department || '',
        village: user.village || '',
        genre: user.genre || '',
        date_naissance: user.date_naissance || '',
        niveau_education: user.niveau_education || '',
        taille_menage: user.taille_menage || '',
        nombre_enfants: user.nombre_enfants || ''
      });
    }
  }, [user]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  // Fetch ICI profile for producers
  useEffect(() => {
    if (user?.user_type === 'producteur' && user?._id) {
      fetchIciProfile();
    }
  }, [user]);

  const fetchIciProfile = async () => {
    setLoadingIci(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/ici-data/farmers/${user._id}/ici-profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIciProfile(response.data);
    } catch (error) {
      console.log('No ICI profile found or error:', error);
    } finally {
      setLoadingIci(false);
    }
  };

  if (!user) {
    navigate('/login');
    return null;
  }

  // Show loading state while auth is initializing
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2d5a4d] mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du profil...</p>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleSave = async () => {
    setLoading(true);
    
    const updateData = {
      full_name: formData.full_name
    };

    if (user.user_type === 'producteur') {
      updateData.farm_location = formData.farm_location;
      updateData.farm_size = formData.farm_size ? parseFloat(formData.farm_size) : null;
      updateData.crops = formData.crops ? formData.crops.split(',').map(c => c.trim()).filter(c => c) : [];
      // ICI Data
      updateData.department = formData.department;
      updateData.village = formData.village;
      updateData.genre = formData.genre;
      updateData.date_naissance = formData.date_naissance;
      updateData.niveau_education = formData.niveau_education;
      updateData.taille_menage = formData.taille_menage ? parseInt(formData.taille_menage) : null;
      updateData.nombre_enfants = formData.nombre_enfants ? parseInt(formData.nombre_enfants) : null;
    } else if (user.user_type === 'acheteur') {
      updateData.company_name = formData.company_name;
      updateData.purchase_volume = formData.purchase_volume;
    } else if (user.user_type === 'entreprise_rse') {
      updateData.company_name_rse = formData.company_name_rse;
      updateData.sector = formData.sector;
      updateData.carbon_goals = formData.carbon_goals;
    } else if (user.user_type === 'fournisseur') {
      updateData.supplier_company = formData.supplier_company;
      updateData.products_offered = formData.products_offered ? formData.products_offered.split(',').map(p => p.trim()).filter(p => p) : [];
    }

    const result = await updateProfile(updateData);
    
    // Update ICI profile if producer
    if (user.user_type === 'producteur' && result.success) {
      try {
        const token = localStorage.getItem('token');
        await axios.post(`${API_URL}/api/ici-data/farmers/${user._id}/ici-profile`, {
          genre: formData.genre || null,
          date_naissance: formData.date_naissance || null,
          niveau_education: formData.niveau_education || null,
          taille_menage: formData.taille_menage ? parseInt(formData.taille_menage) : null,
          household_children: formData.nombre_enfants ? {
            total_enfants: parseInt(formData.nombre_enfants)
          } : null,
          consent_rgpd: true
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchIciProfile(); // Refresh ICI profile
      } catch (error) {
        console.log('ICI profile update error:', error);
      }
    }

    setLoading(false);

    if (result.success) {
      toast({
        title: 'Profil mis à jour',
        description: 'Vos informations ont été enregistrées avec succès'
      });
      setEditing(false);
    } else {
      toast({
        title: 'Erreur',
        description: result.error,
        variant: 'destructive'
      });
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'SUPPRIMER') {
      toast({
        title: 'Confirmation invalide',
        description: 'Veuillez taper SUPPRIMER pour confirmer',
        variant: 'destructive'
      });
      return;
    }

    setDeleting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/auth/account`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast({
        title: 'Compte supprimé',
        description: 'Votre compte a été supprimé définitivement'
      });
      
      logout();
      navigate('/');
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error.response?.data?.detail || 'Impossible de supprimer le compte',
        variant: 'destructive'
      });
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const getUserTypeIcon = () => {
    switch (user.user_type) {
      case 'producteur': return <Sprout className="w-6 h-6" />;
      case 'acheteur': return <Building2 className="w-6 h-6" />;
      case 'entreprise_rse': return <Building2 className="w-6 h-6" />;
      case 'fournisseur': return <Package className="w-6 h-6" />;
      case 'admin': return <Shield className="w-6 h-6" />;
      default: return <User className="w-6 h-6" />;
    }
  };

  const getUserTypeLabel = () => {
    switch (user.user_type) {
      case 'producteur': return 'Producteur';
      case 'acheteur': return 'Acheteur';
      case 'entreprise_rse': return 'Entreprise RSE';
      case 'fournisseur': return 'Fournisseur';
      case 'admin': return 'Administrateur';
      default: return user.user_type;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-6 py-12 mt-20">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Mon Profil</h1>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Se déconnecter
          </Button>
        </div>

        <Card className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8 pb-6 border-b">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-gradient-to-br from-[#2d5a4d] to-[#1a4038] rounded-full flex items-center justify-center text-white">
                {getUserTypeIcon()}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{user.full_name}</h2>
                <Badge className="bg-[#2d5a4d] text-white mt-2">
                  {getUserTypeLabel()}
                </Badge>
              </div>
            </div>
            
            {!editing ? (
              <Button
                onClick={() => setEditing(true)}
                className="bg-[#2d5a4d] hover:bg-[#1a4038] text-white"
              >
                <Edit className="w-4 h-4 mr-2" />
                Modifier
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setEditing(false)}
                  disabled={loading}
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={loading}
                  className="bg-[#2d5a4d] hover:bg-[#1a4038] text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            )}
          </div>

          {/* Basic Info */}
          <div className="space-y-6">
            <div>
              <Label>Nom complet</Label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                disabled={!editing}
              />
            </div>

            <div>
              <Label>Numéro de téléphone</Label>
              <Input value={user.phone_number || 'Non renseigné'} disabled />
              <p className="text-xs text-gray-500 mt-1">Le numéro de téléphone ne peut pas être modifié</p>
            </div>

            <div>
              <Label>Email</Label>
              <Input value={user.email || 'Non renseigné'} disabled />
              <p className="text-xs text-gray-500 mt-1">L'email ne peut pas être modifié</p>
            </div>

            {/* Producteur Fields */}
            {user.user_type === 'producteur' && (
              <>
                <div>
                  <Label>Localisation de la ferme</Label>
                  <Input
                    placeholder="Exemple: Bouaflé, Daloa"
                    value={formData.farm_location}
                    onChange={(e) => setFormData({ ...formData, farm_location: e.target.value })}
                    disabled={!editing}
                  />
                </div>
                <div>
                  <Label>Taille de la ferme (hectares)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="Exemple: 5.5"
                    value={formData.farm_size}
                    onChange={(e) => setFormData({ ...formData, farm_size: e.target.value })}
                    disabled={!editing}
                  />
                </div>
                <div>
                  <Label>Cultures</Label>
                  <Input
                    placeholder="Exemple: Cacao, Café, Anacarde (séparés par des virgules)"
                    value={formData.crops}
                    onChange={(e) => setFormData({ ...formData, crops: e.target.value })}
                    disabled={!editing}
                  />
                </div>

                {/* ICI Data Section */}
                <div className="mt-8 pt-6 border-t border-green-200">
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="w-5 h-5 text-green-600" />
                    <h3 className="text-lg font-semibold text-green-800">Informations du ménage (ICI)</h3>
                    <Badge className="bg-green-100 text-green-700 text-xs">Pour le suivi ODD</Badge>
                  </div>
                  
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200 space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Département */}
                      <div>
                        <Label className="flex items-center gap-1 text-green-700">
                          <MapPin className="w-3 h-3" />
                          Département
                        </Label>
                        <Input
                          placeholder="Ex: Soubré, Man, Daloa"
                          value={formData.department}
                          onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                          disabled={!editing}
                          className="mt-1"
                        />
                      </div>

                      {/* Village */}
                      <div>
                        <Label className="flex items-center gap-1 text-green-700">
                          <MapPin className="w-3 h-3" />
                          Village/Localité
                        </Label>
                        <Input
                          placeholder="Nom du village"
                          value={formData.village}
                          onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                          disabled={!editing}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Genre */}
                      <div>
                        <Label className="flex items-center gap-1 text-green-700">
                          <User className="w-3 h-3" />
                          Genre
                        </Label>
                        <select
                          className="w-full mt-1 p-2 border rounded-md text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                          value={formData.genre}
                          onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                          disabled={!editing}
                        >
                          <option value="">-- Sélectionner --</option>
                          <option value="homme">Homme</option>
                          <option value="femme">Femme</option>
                        </select>
                      </div>

                      {/* Année de naissance */}
                      <div>
                        <Label className="flex items-center gap-1 text-green-700">
                          <Calendar className="w-3 h-3" />
                          Année de naissance
                        </Label>
                        <select
                          className="w-full mt-1 p-2 border rounded-md text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                          value={formData.date_naissance}
                          onChange={(e) => setFormData({ ...formData, date_naissance: e.target.value })}
                          disabled={!editing}
                        >
                          <option value="">-- Sélectionner --</option>
                          {Array.from({ length: 70 }, (_, i) => 2006 - i).map(year => (
                            <option key={year} value={`${year}-01-01`}>{year}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                      {/* Niveau d'éducation */}
                      <div>
                        <Label className="flex items-center gap-1 text-green-700">
                          <GraduationCap className="w-3 h-3" />
                          Niveau d'éducation
                        </Label>
                        <select
                          className="w-full mt-1 p-2 border rounded-md text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                          value={formData.niveau_education}
                          onChange={(e) => setFormData({ ...formData, niveau_education: e.target.value })}
                          disabled={!editing}
                        >
                          <option value="">-- Sélectionner --</option>
                          <option value="aucun">Aucun</option>
                          <option value="primaire">Primaire</option>
                          <option value="secondaire">Secondaire</option>
                          <option value="superieur">Supérieur</option>
                        </select>
                      </div>

                      {/* Taille du ménage */}
                      <div>
                        <Label className="flex items-center gap-1 text-green-700">
                          <Users className="w-3 h-3" />
                          Taille du ménage
                        </Label>
                        <Input
                          type="number"
                          min="1"
                          max="20"
                          placeholder="Ex: 5"
                          value={formData.taille_menage}
                          onChange={(e) => setFormData({ ...formData, taille_menage: e.target.value })}
                          disabled={!editing}
                          className="mt-1"
                        />
                      </div>

                      {/* Nombre d'enfants */}
                      <div>
                        <Label className="flex items-center gap-1 text-green-700">
                          <Baby className="w-3 h-3" />
                          Enfants (&lt;18 ans)
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          max="15"
                          placeholder="Ex: 3"
                          value={formData.nombre_enfants}
                          onChange={(e) => setFormData({ ...formData, nombre_enfants: e.target.value })}
                          disabled={!editing}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <p className="text-xs text-green-700 bg-green-100 p-2 rounded">
                      Ces informations permettent de suivre les indicateurs de développement durable (ODD) et d'améliorer l'accompagnement des producteurs.
                    </p>
                  </div>
                </div>

                {/* ICI Risk Status */}
                {iciProfile && iciProfile.zone_risque && (
                  <div className="mt-4 p-4 rounded-lg border" style={{
                    backgroundColor: iciProfile.zone_risque.niveau_risque === 'ÉLEVÉ' ? '#fef2f2' :
                                    iciProfile.zone_risque.niveau_risque === 'MODÉRÉ' ? '#fffbeb' : '#f0fdf4',
                    borderColor: iciProfile.zone_risque.niveau_risque === 'ÉLEVÉ' ? '#fecaca' :
                                 iciProfile.zone_risque.niveau_risque === 'MODÉRÉ' ? '#fde68a' : '#bbf7d0'
                  }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-800">Classification ICI</h4>
                        <p className="text-sm text-gray-600">
                          Zone: {iciProfile.zone_risque.categorie?.replace('_', ' ').toUpperCase()}
                        </p>
                      </div>
                      <Badge className={`${
                        iciProfile.zone_risque.niveau_risque === 'ÉLEVÉ' ? 'bg-red-500' :
                        iciProfile.zone_risque.niveau_risque === 'MODÉRÉ' ? 'bg-amber-500' :
                        iciProfile.zone_risque.niveau_risque === 'FAIBLE' ? 'bg-green-500' : 'bg-gray-500'
                      } text-white`}>
                        Risque {iciProfile.zone_risque.niveau_risque}
                      </Badge>
                    </div>
                    {iciProfile.risk_score !== undefined && (
                      <p className="text-xs text-gray-500 mt-2">Score de risque: {iciProfile.risk_score}/100</p>
                    )}
                  </div>
                )}

                {/* Informations du compte */}
              </>
            )}

            {/* Acheteur Fields */}
            {user.user_type === 'acheteur' && (
              <>
                <div>
                  <Label>Nom de l'entreprise</Label>
                  <Input
                    placeholder="Exemple: SARL AgriTech"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    disabled={!editing}
                  />
                </div>
                <div>
                  <Label>Volume d'achat</Label>
                  <Input
                    placeholder="Exemple: 100 tonnes/an"
                    value={formData.purchase_volume}
                    onChange={(e) => setFormData({ ...formData, purchase_volume: e.target.value })}
                    disabled={!editing}
                  />
                </div>
              </>
            )}

            {/* Entreprise RSE Fields */}
            {user.user_type === 'entreprise_rse' && (
              <>
                <div>
                  <Label>Nom de l'entreprise</Label>
                  <Input
                    placeholder="Exemple: Green Corp"
                    value={formData.company_name_rse}
                    onChange={(e) => setFormData({ ...formData, company_name_rse: e.target.value })}
                    disabled={!editing}
                  />
                </div>
                <div>
                  <Label>Secteur d'activité</Label>
                  <Input
                    placeholder="Exemple: Industrie, Services, etc."
                    value={formData.sector}
                    onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                    disabled={!editing}
                  />
                </div>
                <div>
                  <Label>Objectifs carbone</Label>
                  <Textarea
                    placeholder="Décrivez vos objectifs de réduction carbone..."
                    value={formData.carbon_goals}
                    onChange={(e) => setFormData({ ...formData, carbon_goals: e.target.value })}
                    disabled={!editing}
                    rows={4}
                  />
                </div>
              </>
            )}

            {/* Fournisseur Fields */}
            {user.user_type === 'fournisseur' && (
              <>
                <div>
                  <Label>Nom de l'entreprise</Label>
                  <Input
                    placeholder="Exemple: AgriSupply SARL"
                    value={formData.supplier_company}
                    onChange={(e) => setFormData({ ...formData, supplier_company: e.target.value })}
                    disabled={!editing}
                  />
                </div>
                <div>
                  <Label>Produits offerts</Label>
                  <Textarea
                    placeholder="Exemple: Engrais, Pesticides, Outils (séparés par des virgules)"
                    value={formData.products_offered}
                    onChange={(e) => setFormData({ ...formData, products_offered: e.target.value })}
                    disabled={!editing}
                    rows={4}
                  />
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Additional Info Card */}
        <Card className="p-6 mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations du compte</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Date de création</p>
              <p className="font-medium">{new Date(user.created_at).toLocaleDateString('fr-FR')}</p>
            </div>
            <div>
              <p className="text-gray-600">Statut</p>
              <Badge className={user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                {user.is_active ? 'Actif' : 'Inactif'}
              </Badge>
            </div>
            {user.legal_acceptance && (
              <>
                <div>
                  <p className="text-gray-600">Conditions acceptées</p>
                  <p className="font-medium text-green-600">✓ Acceptées</p>
                </div>
                <div>
                  <p className="text-gray-600">Date d'acceptation</p>
                  <p className="font-medium">
                    {user.legal_acceptance.acceptedAt 
                      ? new Date(user.legal_acceptance.acceptedAt).toLocaleDateString('fr-FR')
                      : new Date(user.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Danger Zone - Delete Account */}
        <Card className="p-6 mt-6 border-red-200 bg-red-50">
          <h3 className="text-lg font-semibold text-red-800 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Zone de danger
          </h3>
          <p className="text-sm text-red-700 mb-4">
            La suppression de votre compte est irréversible. Toutes vos données seront définitivement effacées.
          </p>
          <Button
            variant="outline"
            onClick={() => setShowDeleteModal(true)}
            className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
            data-testid="delete-account-btn"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Supprimer mon compte
          </Button>
        </Card>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Supprimer votre compte?
              </h2>
              <p className="text-gray-600 text-sm">
                Cette action est <strong>irréversible</strong>. Toutes vos données, commandes, 
                et informations seront définitivement supprimées.
              </p>
            </div>

            <div className="mb-6">
              <Label className="text-sm text-gray-700">
                Tapez <strong>SUPPRIMER</strong> pour confirmer
              </Label>
              <Input
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="SUPPRIMER"
                className="mt-2"
                data-testid="delete-confirmation-input"
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmation('');
                }}
                className="flex-1"
                disabled={deleting}
              >
                Annuler
              </Button>
              <Button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmation !== 'SUPPRIMER' || deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                data-testid="confirm-delete-btn"
              >
                {deleting ? 'Suppression...' : 'Supprimer définitivement'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Profile;

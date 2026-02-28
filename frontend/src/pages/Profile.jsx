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
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Profile = () => {
  const { user, logout, updateProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    // Producteur
    farm_location: user?.farm_location || '',
    farm_size: user?.farm_size || '',
    crops: user?.crops?.join(', ') || '',
    // Acheteur
    company_name: user?.company_name || '',
    purchase_volume: user?.purchase_volume || '',
    // Entreprise RSE
    company_name_rse: user?.company_name_rse || '',
    sector: user?.sector || '',
    carbon_goals: user?.carbon_goals || '',
    // Fournisseur
    supplier_company: user?.supplier_company || '',
    products_offered: user?.products_offered?.join(', ') || ''
  });

  if (!user) {
    navigate('/login');
    return null;
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

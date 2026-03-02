import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import Navbar from '../../components/Navbar';
import { useToast } from '../../hooks/use-toast';
import axios from 'axios';
import { 
  Shield, 
  Users, 
  Package, 
  Settings,
  Plus,
  Trash2,
  Edit,
  Save,
  X,
  Handshake,
  Building2,
  BarChart3,
  Globe,
  DollarSign,
  Leaf,
  Bell,
  Activity,
  Award,
  Baby,
  CreditCard,
  Target
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    logo: '',
    type: 'technology',
    color: 'bg-blue-500',
    website: ''
  });

  const partnerTypes = [
    { value: 'payment', label: 'Paiement' },
    { value: 'certification', label: 'Certification' },
    { value: 'logistics', label: 'Logistique' },
    { value: 'technology', label: 'Technologie' },
    { value: 'finance', label: 'Finance' },
    { value: 'government', label: 'Gouvernement' }
  ];

  const colors = [
    { value: 'bg-orange-500', label: 'Orange' },
    { value: 'bg-blue-500', label: 'Bleu' },
    { value: 'bg-green-500', label: 'Vert' },
    { value: 'bg-purple-500', label: 'Violet' },
    { value: 'bg-red-500', label: 'Rouge' },
    { value: 'bg-yellow-500', label: 'Jaune' },
    { value: 'bg-gray-700', label: 'Gris' }
  ];

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.user_type !== 'admin') {
      toast({
        title: 'Accès refusé',
        description: 'Vous devez être administrateur pour accéder à cette page',
        variant: 'destructive'
      });
      navigate('/');
      return;
    }
    fetchPartners();
  }, [user, authLoading]);

  const fetchPartners = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/admin/partners`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPartners(response.data);
    } catch (error) {
      console.error('Error fetching partners:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    try {
      if (editingId) {
        await axios.put(`${API_URL}/api/admin/partners/${editingId}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast({ title: 'Partenaire modifié' });
      } else {
        await axios.post(`${API_URL}/api/admin/partners`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast({ title: 'Partenaire ajouté' });
      }
      
      setShowForm(false);
      setEditingId(null);
      setFormData({ name: '', description: '', logo: '', type: 'technology', color: 'bg-blue-500', website: '' });
      fetchPartners();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error.response?.data?.detail || 'Une erreur est survenue',
        variant: 'destructive'
      });
    }
  };

  const handleEdit = (partner) => {
    setFormData({
      name: partner.name,
      description: partner.description,
      logo: partner.logo || '',
      type: partner.type,
      color: partner.color || 'bg-blue-500',
      website: partner.website || ''
    });
    setEditingId(partner._id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce partenaire?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/admin/partners/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast({ title: 'Partenaire supprimé' });
      fetchPartners();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le partenaire',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-24 pb-12 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="animate-pulse">
              <div className="h-10 bg-gray-200 rounded w-1/3 mb-8"></div>
              <div className="grid gap-4">
                {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-200 rounded"></div>)}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="pt-24 pb-12 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Shield className="w-10 h-10 text-[#2d5a4d]" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Administration</h1>
                <p className="text-gray-600">Gestion de la plateforme GreenLink</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                onClick={() => navigate('/admin/analytics')}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Centre de Données Stratégiques
              </Button>
              <Button 
                onClick={() => navigate('/admin/premium-analytics')}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
              >
                <Globe className="w-4 h-4 mr-2" />
                Premium Analytics
              </Button>
              <Button 
                onClick={() => navigate('/admin/billing')}
                className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Facturation & Paiements
              </Button>
              <Button 
                onClick={() => navigate('/admin/carbon-auditors')}
                className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700"
                data-testid="carbon-auditors-btn"
              >
                <Leaf className="w-4 h-4 mr-2" />
                Auditeurs Carbone
              </Button>
              <Badge className="bg-red-100 text-red-700">Super Admin</Badge>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Handshake className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Partenaires</p>
                  <p className="text-2xl font-bold">{partners.length}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Utilisateurs</p>
                  <p className="text-2xl font-bold">-</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Package className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Produits</p>
                  <p className="text-2xl font-bold">-</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Building2 className="w-8 h-8 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-600">Entreprises</p>
                  <p className="text-2xl font-bold">-</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Partners Management */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Handshake className="w-5 h-5" />
                Gestion des Partenaires
              </h2>
              <Button 
                onClick={() => {
                  setShowForm(true);
                  setEditingId(null);
                  setFormData({ name: '', description: '', logo: '', type: 'technology', color: 'bg-blue-500', website: '' });
                }}
                className="bg-[#2d5a4d] hover:bg-[#1a4038]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un Partenaire
              </Button>
            </div>

            {/* Form */}
            {showForm && (
              <Card className="p-6 mb-6 border-2 border-[#2d5a4d]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">
                    {editingId ? 'Modifier le Partenaire' : 'Nouveau Partenaire'}
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Nom du partenaire *</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        placeholder="Ex: Orange Côte d'Ivoire"
                        required
                      />
                    </div>
                    <div>
                      <Label>Type</Label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({...formData, type: e.target.value})}
                        className="w-full p-2 border rounded-md"
                      >
                        {partnerTypes.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Input
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        placeholder="Ex: Partenaire Paiement Mobile"
                      />
                    </div>
                    <div>
                      <Label>Site web</Label>
                      <Input
                        value={formData.website}
                        onChange={(e) => setFormData({...formData, website: e.target.value})}
                        placeholder="https://..."
                      />
                    </div>
                    <div>
                      <Label>URL du Logo (optionnel)</Label>
                      <Input
                        value={formData.logo}
                        onChange={(e) => setFormData({...formData, logo: e.target.value})}
                        placeholder="https://..."
                      />
                    </div>
                    <div>
                      <Label>Couleur (si pas de logo)</Label>
                      <select
                        value={formData.color}
                        onChange={(e) => setFormData({...formData, color: e.target.value})}
                        className="w-full p-2 border rounded-md"
                      >
                        {colors.map(c => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                      Annuler
                    </Button>
                    <Button type="submit" className="bg-[#2d5a4d] hover:bg-[#1a4038]">
                      <Save className="w-4 h-4 mr-2" />
                      {editingId ? 'Enregistrer' : 'Ajouter'}
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            {/* Partners List */}
            {partners.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Handshake className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Aucun partenaire ajouté</p>
              </div>
            ) : (
              <div className="space-y-3">
                {partners.map((partner) => (
                  <div 
                    key={partner._id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      {partner.logo ? (
                        <img src={partner.logo} alt={partner.name} className="w-12 h-12 object-contain" />
                      ) : (
                        <div className={`w-12 h-12 ${partner.color} rounded-full flex items-center justify-center`}>
                          <span className="text-white font-bold">
                            {partner.name.split(' ').map(w => w[0]).join('').slice(0,2)}
                          </span>
                        </div>
                      )}
                      <div>
                        <h4 className="font-semibold text-gray-900">{partner.name}</h4>
                        <p className="text-sm text-gray-600">{partner.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge>{partner.type}</Badge>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(partner)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDelete(partner._id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

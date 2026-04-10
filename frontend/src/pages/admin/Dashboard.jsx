import { tokenService } from "../../services/tokenService";
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
  Target,
  MapPin,
  AlertTriangle,
  FileText,
  Banknote
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [partners, setPartners] = useState([]);
  const [stats, setStats] = useState({
    total_users: 0,
    total_products: 0,
    total_orders: 0,
    total_partners: 0,
    users_by_type: {}
  });
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  /* Auto-refresh stats toutes les 60s */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!user || user.user_type !== 'admin') return;
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchStats = async () => {
    try {
      const token = tokenService.getToken();
      const response = await axios.get(`${API_URL}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      /* error logged */
    }
  };

  const fetchPartners = async () => {
    try {
      const token = tokenService.getToken();
      const response = await axios.get(`${API_URL}/api/admin/partners`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPartners(response.data);
    } catch (error) {
      /* error logged */
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = tokenService.getToken();
    
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
      const token = tokenService.getToken();
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
                {[1,2,3].map(i => <div key={`el-${i}`} className="h-24 bg-gray-200 rounded"></div>)}
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

          {/* Quick Navigation Menu */}
          <div className="bg-white rounded-xl p-4 border shadow-sm mb-6">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Accès Rapide aux Modules</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-2">
              <button
                onClick={() => navigate('/admin/realtime')}
                className="flex flex-col items-center gap-1 p-3 bg-gray-50 hover:bg-emerald-50 rounded-lg transition group"
              >
                <Activity className="w-5 h-5 text-emerald-600 group-hover:text-emerald-700" />
                <span className="text-xs text-gray-600 group-hover:text-emerald-700">Temps Réel</span>
              </button>
              <button
                onClick={() => navigate('/admin/notifications')}
                className="flex flex-col items-center gap-1 p-3 bg-gray-50 hover:bg-amber-50 rounded-lg transition group"
              >
                <Bell className="w-5 h-5 text-amber-600 group-hover:text-amber-700" />
                <span className="text-xs text-gray-600 group-hover:text-amber-700">Notifications</span>
              </button>
              <button
                onClick={() => navigate('/admin/ssrte-analytics')}
                className="flex flex-col items-center gap-1 p-3 bg-gray-50 hover:bg-blue-50 rounded-lg transition group"
              >
                <Baby className="w-5 h-5 text-blue-600 group-hover:text-blue-700" />
                <span className="text-xs text-gray-600 group-hover:text-blue-700">SSRTE</span>
              </button>
              <button
                onClick={() => navigate('/admin/ici-analytics')}
                className="flex flex-col items-center gap-1 p-3 bg-gray-50 hover:bg-purple-50 rounded-lg transition group"
              >
                <Shield className="w-5 h-5 text-purple-600 group-hover:text-purple-700" />
                <span className="text-xs text-gray-600 group-hover:text-purple-700">ICI Analytics</span>
              </button>
              <button
                onClick={() => navigate('/admin/carbon-business')}
                className="flex flex-col items-center gap-1 p-3 bg-gray-50 hover:bg-green-50 rounded-lg transition group"
              >
                <Leaf className="w-5 h-5 text-green-600 group-hover:text-green-700" />
                <span className="text-xs text-gray-600 group-hover:text-green-700">Business Carbone</span>
              </button>
              <button
                onClick={() => navigate('/admin/carbon-approvals')}
                className="flex flex-col items-center gap-1 p-3 bg-gray-50 hover:bg-emerald-50 rounded-lg transition group"
                data-testid="carbon-approvals-btn"
              >
                <Leaf className="w-5 h-5 text-emerald-600 group-hover:text-emerald-700" />
                <span className="text-xs text-gray-600 group-hover:text-emerald-700">Approbations</span>
              </button>
              <button
                onClick={() => navigate('/admin/cooperative-comparison')}
                className="flex flex-col items-center gap-1 p-3 bg-gray-50 hover:bg-cyan-50 rounded-lg transition group"
              >
                <Building2 className="w-5 h-5 text-cyan-600 group-hover:text-cyan-700" />
                <span className="text-xs text-gray-600 group-hover:text-cyan-700">Comparaison</span>
              </button>
              <button
                onClick={() => navigate('/admin/billing')}
                className="flex flex-col items-center gap-1 p-3 bg-gray-50 hover:bg-rose-50 rounded-lg transition group"
              >
                <CreditCard className="w-5 h-5 text-rose-600 group-hover:text-rose-700" />
                <span className="text-xs text-gray-600 group-hover:text-rose-700">Facturation</span>
              </button>
              <button
                onClick={() => navigate('/admin/badge-analytics')}
                className="flex flex-col items-center gap-1 p-3 bg-gray-50 hover:bg-yellow-50 rounded-lg transition group"
              >
                <Award className="w-5 h-5 text-yellow-600 group-hover:text-yellow-700" />
                <span className="text-xs text-gray-600 group-hover:text-yellow-700">Badges</span>
              </button>
              <button
                onClick={() => navigate('/admin/premium-analytics')}
                className="flex flex-col items-center gap-1 p-3 bg-gray-50 hover:bg-indigo-50 rounded-lg transition group"
              >
                <BarChart3 className="w-5 h-5 text-indigo-600 group-hover:text-indigo-700" />
                <span className="text-xs text-gray-600 group-hover:text-indigo-700">10 Analytics</span>
              </button>
              <button
                onClick={() => navigate('/admin/audit-missions')}
                className="flex flex-col items-center gap-1 p-3 bg-gray-50 hover:bg-teal-50 rounded-lg transition group"
              >
                <Target className="w-5 h-5 text-teal-600 group-hover:text-teal-700" />
                <span className="text-xs text-gray-600 group-hover:text-teal-700">Missions</span>
              </button>
              <button
                onClick={() => navigate('/admin/agents-map')}
                className="flex flex-col items-center gap-1 p-3 bg-gray-50 hover:bg-sky-50 rounded-lg transition group"
                data-testid="agents-map-btn"
              >
                <MapPin className="w-5 h-5 text-sky-600 group-hover:text-sky-700" />
                <span className="text-xs text-gray-600 group-hover:text-sky-700">Carte Agents</span>
              </button>
              <button
                onClick={() => navigate('/ssrte/realtime')}
                className="flex flex-col items-center gap-1 p-3 bg-gray-50 hover:bg-red-50 rounded-lg transition group"
                data-testid="ssrte-realtime-btn"
              >
                <AlertTriangle className="w-5 h-5 text-red-600 group-hover:text-red-700" />
                <span className="text-xs text-gray-600 group-hover:text-red-700">Alertes Live</span>
              </button>
              <button
                onClick={() => navigate('/admin/users')}
                className="flex flex-col items-center gap-1 p-3 bg-gray-50 hover:bg-violet-50 rounded-lg transition group"
                data-testid="users-management-btn"
              >
                <Users className="w-5 h-5 text-violet-600 group-hover:text-violet-700" />
                <span className="text-xs text-gray-600 group-hover:text-violet-700">Utilisateurs</span>
              </button>
              <button
                onClick={() => navigate('/admin/content')}
                className="flex flex-col items-center gap-1 p-3 bg-gray-50 hover:bg-pink-50 rounded-lg transition group"
                data-testid="content-management-btn"
              >
                <FileText className="w-5 h-5 text-pink-600 group-hover:text-pink-700" />
                <span className="text-xs text-gray-600 group-hover:text-pink-700">Contenu</span>
              </button>
              <button
                onClick={() => navigate('/admin/quotes')}
                className="flex flex-col items-center gap-1 p-3 bg-gray-50 hover:bg-amber-50 rounded-lg transition group"
                data-testid="quotes-management-btn"
              >
                <FileText className="w-5 h-5 text-amber-600 group-hover:text-amber-700" />
                <span className="text-xs text-gray-600 group-hover:text-amber-700">Devis</span>
              </button>
              <button
                onClick={() => navigate('/admin/farmer-assignment')}
                className="flex flex-col items-center gap-1 p-3 bg-gray-50 hover:bg-blue-50 rounded-lg transition group"
                data-testid="farmer-assignment-btn"
              >
                <Users className="w-5 h-5 text-blue-600 group-hover:text-blue-700" />
                <span className="text-xs text-gray-600 group-hover:text-blue-700">Attribution</span>
              </button>
              <button
                onClick={() => navigate('/admin/carbon-premiums')}
                className="flex flex-col items-center gap-1 p-3 bg-gray-50 hover:bg-emerald-50 rounded-lg transition group"
                data-testid="carbon-premiums-btn"
              >
                <Banknote className="w-5 h-5 text-emerald-600 group-hover:text-emerald-700" />
                <span className="text-xs text-gray-600 group-hover:text-emerald-700">Primes Carbone</span>
              </button>
            </div>
          </div>

          {/* Stats Cards Row */}
          <div className="grid md:grid-cols-4 gap-4 mb-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Utilisateurs</p>
                  <p className="text-2xl font-bold">{stats.total_users}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Building2 className="w-8 h-8 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-600">Cooperatives</p>
                  <p className="text-2xl font-bold">{stats.total_cooperatives || 0}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-emerald-600" />
                <div>
                  <p className="text-sm text-gray-600">Planteurs inscrits</p>
                  <p className="text-2xl font-bold">{stats.total_members || 0}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <MapPin className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Agents Terrain</p>
                  <p className="text-2xl font-bold">{stats.total_agents || 0}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Platform Metrics */}
          <div className="grid md:grid-cols-4 gap-4 mb-4">
            <Card className="p-4 border-l-4 border-l-green-500">
              <div className="flex items-center gap-3">
                <MapPin className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Parcelles</p>
                  <p className="text-2xl font-bold">{stats.total_parcelles || 0}</p>
                  <p className="text-xs text-gray-400">{stats.total_hectares || 0} ha | {stats.parcels_verified || 0} verifiees</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 border-l-4 border-l-teal-500">
              <div className="flex items-center gap-3">
                <Leaf className="w-8 h-8 text-teal-600" />
                <div>
                  <p className="text-sm text-gray-600">Visites REDD+</p>
                  <p className="text-2xl font-bold">{stats.total_redd_visits || 0}</p>
                  <p className="text-xs text-gray-400">{stats.total_co2_tonnes || 0}t CO2 | Score moy. {stats.avg_redd_score || 0}/10</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 border-l-4 border-l-cyan-500">
              <div className="flex items-center gap-3">
                <Baby className="w-8 h-8 text-cyan-600" />
                <div>
                  <p className="text-sm text-gray-600">Visites SSRTE</p>
                  <p className="text-2xl font-bold">{stats.total_ssrte_visits || 0}</p>
                  <p className="text-xs text-red-400">{stats.ssrte_high_risk || 0} cas risque eleve/critique</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 border-l-4 border-l-amber-500">
              <div className="flex items-center gap-3">
                <Package className="w-8 h-8 text-amber-600" />
                <div>
                  <p className="text-sm text-gray-600">Recoltes</p>
                  <p className="text-2xl font-bold">{stats.total_harvests || 0}</p>
                  <p className="text-xs text-gray-400">{stats.harvests_pending || 0} en attente | {stats.harvests_validated || 0} validees</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Additional metrics row */}
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
                <Globe className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Inscriptions USSD</p>
                  <p className="text-2xl font-bold">{stats.total_registrations || 0}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-emerald-600" />
                <div>
                  <p className="text-sm text-gray-600">Listings Marketplace</p>
                  <p className="text-2xl font-bold">{stats.total_listings || 0}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Banknote className="w-8 h-8 text-rose-600" />
                <div>
                  <p className="text-sm text-gray-600">Demandes paiement</p>
                  <p className="text-2xl font-bold">{stats.payment_requests || 0}</p>
                  <p className="text-xs text-amber-500">{stats.payment_pending || 0} en attente</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Users by Type Breakdown */}
          <Card className="p-4 mb-6">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Répartition des Utilisateurs</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {Object.entries(stats.users_by_type || {}).map(([type, count]) => (
                <div key={type} className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-[#2d5a4d]">{count}</p>
                  <p className="text-xs text-gray-600 capitalize">{type.replace(/_/g, ' ')}</p>
                </div>
              ))}
            </div>
          </Card>

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

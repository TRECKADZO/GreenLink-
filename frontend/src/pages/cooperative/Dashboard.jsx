import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { cooperativeApi } from '../../services/cooperativeApi';
import { 
  Users, MapPin, Leaf, DollarSign, Package, 
  TrendingUp, FileText, Plus, ChevronRight,
  CheckCircle, Clock, AlertTriangle, Building2,
  Shield, Store, Home, UserCircle,
  TreePine, Pencil, Save, X, Loader2, Target, Smartphone,
  UserCheck, UserX, KeyRound, Send
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { NotificationCenter } from '../../components/NotificationCenter';
import USSDSimulator from '../../components/USSDSimulator';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CommissionCard = ({ coop_info, onUpdated }) => {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ratePercent, setRatePercent] = useState(((coop_info?.commission_rate || 0.10) * 100).toFixed(0));

  const handleSave = async () => {
    const val = parseFloat(ratePercent);
    if (isNaN(val) || val < 0 || val > 100) {
      toast.error('Le taux doit etre entre 0% et 100%');
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/cooperative/settings/commission-rate`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ commission_rate: val / 100 }),
      });
      if (res.ok) {
        toast.success('Taux de commission mis a jour');
        setEditing(false);
        onUpdated?.();
      } else {
        const d = await res.json();
        toast.error(d.detail || 'Erreur');
      }
    } catch {
      toast.error('Erreur reseau');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Commission</CardTitle>
          {!editing && (
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)} data-testid="edit-commission-btn">
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-3" data-testid="commission-edit-form">
            <div className="flex items-center justify-center gap-2">
              <input
                type="number" min="0" max="100" step="1" value={ratePercent}
                onChange={e => setRatePercent(e.target.value)}
                className="w-24 text-3xl font-bold text-center border-b-2 border-green-500 bg-transparent outline-none"
                data-testid="commission-rate-input"
              />
              <span className="text-2xl font-bold text-gray-400">%</span>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => { setEditing(false); setRatePercent(((coop_info?.commission_rate || 0.10) * 100).toFixed(0)); }}>
                <X className="h-3.5 w-3.5 mr-1" />Annuler
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700" data-testid="save-commission-btn">
                {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                Enregistrer
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-4xl font-bold text-green-600" data-testid="commission-rate-display">
              {((coop_info?.commission_rate || 0.10) * 100).toFixed(0)}%
            </p>
            <p className="text-sm text-gray-500 mt-1">Taux de commission</p>
          </div>
        )}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600">
            Cette commission est prelevee sur les primes carbone avant redistribution aux membres.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSimulator, setShowSimulator] = useState(false);
  const [activationStats, setActivationStats] = useState(null);
  const [sendingReminder, setSendingReminder] = useState(null);
  const [simulatorMembers, setSimulatorMembers] = useState([]);

  const loadDashboard = async () => {
    try {
      const data = await cooperativeApi.getDashboard();
      setDashboardData(data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      toast.error('Erreur lors du chargement du dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadActivationStats = async () => {
    try {
      const stats = await cooperativeApi.getActivationStats();
      setActivationStats(stats);
    } catch (error) {
      console.error('Error fetching activation stats:', error);
    }
  };

  const loadSimulatorMembers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/cooperative/members?limit=200`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSimulatorMembers((data.members || []).filter(m => m.phone_number));
      }
    } catch (error) {
      console.error('Error fetching members for simulator:', error);
    }
  };

  const handleSendReminder = async (memberId, memberName) => {
    setSendingReminder(memberId);
    try {
      await cooperativeApi.sendActivationReminder(memberId);
      toast.success(`Rappel envoyé à ${memberName}`);
      loadActivationStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'envoi du rappel');
    } finally {
      setSendingReminder(null);
    }
  };

  useEffect(() => {
    loadDashboard();
    loadActivationStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const { coop_info, members, parcelles, lots, financial, recent_members, agents } = dashboardData || {};

  const stats = [
    {
      title: 'Membres Actifs',
      value: members?.active || 0,
      total: members?.total || 0,
      icon: Users,
      color: 'bg-blue-500',
      link: '/cooperative/members'
    },
    {
      title: 'Agents Terrain',
      value: agents?.active || 0,
      total: agents?.total || 0,
      icon: Shield,
      color: 'bg-cyan-500',
      link: '/cooperative/agents'
    },
    {
      title: 'Parcelles',
      value: parcelles?.total || 0,
      subtitle: `${parcelles?.superficie_totale || 0} ha`,
      icon: MapPin,
      color: 'bg-green-500',
      link: '/cooperative/parcels/new'
    },
    {
      title: 'Score Carbone Moyen',
      value: parcelles?.score_carbone_moyen?.toFixed(1) || '0',
      subtitle: '/10',
      icon: Leaf,
      color: 'bg-emerald-500'
    },
    {
      title: 'CO₂ Capturé',
      value: parcelles?.co2_total?.toFixed(1) || '0',
      subtitle: 'tonnes',
      icon: TrendingUp,
      color: 'bg-teal-500'
    },
    {
      title: 'Lots Actifs',
      value: lots?.active || 0,
      subtitle: `${lots?.completed || 0} complétés`,
      icon: Package,
      color: 'bg-amber-500',
      link: '/cooperative/lots'
    },
    {
      title: 'Primes à Distribuer',
      value: `${(financial?.pending_distribution || 0).toLocaleString()}`,
      subtitle: 'XOF',
      icon: DollarSign,
      color: 'bg-purple-500',
      link: '/cooperative/distributions'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50" data-testid="cooperative-dashboard">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-700 to-green-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <Building2 className="h-8 w-8" />
                <h1 className="text-2xl font-bold" data-testid="coop-name">
                  {coop_info?.name || user?.coop_name || 'Coopérative'}
                </h1>
              </div>
              <p className="mt-1 text-green-100">
                Code: {coop_info?.code || user?.coop_code || 'N/A'}
              </p>
              {coop_info?.certifications?.length > 0 && (
                <div className="flex gap-2 mt-2">
                  {coop_info.certifications.map((cert, i) => (
                    <Badge key={i} variant="secondary" className="bg-white/20 text-white border-0">
                      {cert}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-4 md:mt-0 flex flex-wrap gap-2 items-center">
              <NotificationCenter />
              <Button 
                onClick={() => navigate('/')}
                variant="outline"
                className="border-white text-white hover:bg-white/10"
                data-testid="home-btn"
              >
                <Home className="h-4 w-4 mr-2" />
                Accueil
              </Button>
              <Button 
                onClick={() => navigate('/profile')}
                variant="outline"
                className="border-white text-white hover:bg-white/10"
                data-testid="profile-btn"
              >
                <UserCircle className="h-4 w-4 mr-2" />
                Profil
              </Button>
              <Button 
                onClick={() => navigate('/cooperative/members/new')}
                className="bg-white text-green-700 hover:bg-green-50"
                data-testid="add-member-btn"
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter Membre
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {stats.map((stat, index) => (
            <Card 
              key={index} 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => stat.link && navigate(stat.link)}
              data-testid={`stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <CardContent className="p-4">
                <div className={`${stat.color} w-10 h-10 rounded-lg flex items-center justify-center mb-3`}>
                  <stat.icon className="h-5 w-5 text-white" />
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {stat.value}
                  {stat.total && <span className="text-sm text-gray-500">/{stat.total}</span>}
                </p>
                {stat.subtitle && (
                  <p className="text-sm text-gray-500">{stat.subtitle}</p>
                )}
                <p className="text-xs text-gray-600 mt-1">{stat.title}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Actions Rapides</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-between bg-green-500/10 border-green-500/50 hover:bg-green-500/20"
                onClick={() => navigate('/cooperative/parcels/new')}
                data-testid="quick-action-new-parcel"
              >
                <span className="flex items-center text-green-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Enregistrer une Parcelle
                </span>
                <ChevronRight className="h-4 w-4 text-green-700" />
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-between"
                onClick={() => navigate('/cooperative/members')}
                data-testid="quick-action-members"
              >
                <span className="flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  Gérer les Membres
                </span>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-between"
                onClick={() => navigate('/cooperative/lots')}
                data-testid="quick-action-lots"
              >
                <span className="flex items-center">
                  <Package className="h-4 w-4 mr-2" />
                  Ventes Groupées
                </span>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-between"
                onClick={() => navigate('/cooperative/distributions')}
                data-testid="quick-action-distributions"
              >
                <span className="flex items-center">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Distributions
                </span>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-between bg-emerald-500/10 border-emerald-500/50 hover:bg-emerald-500/20"
                onClick={() => navigate('/cooperative/carbon-premiums')}
                data-testid="quick-action-carbon-premiums"
              >
                <span className="flex items-center text-emerald-400">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Primes Carbone
                </span>
                <ChevronRight className="h-4 w-4 text-emerald-400" />
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-between bg-teal-50 border-teal-200 hover:bg-teal-100"
                onClick={() => navigate('/cooperative/carbon-submissions')}
                data-testid="quick-action-carbon-submissions"
              >
                <span className="flex items-center text-teal-700">
                  <Leaf className="h-4 w-4 mr-2" />
                  Declarer Tonnage Carbone
                </span>
                <ChevronRight className="h-4 w-4 text-teal-700" />
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-between"
                onClick={() => navigate('/cooperative/reports')}
                data-testid="quick-action-reports"
              >
                <span className="flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  Rapports EUDR
                </span>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-between bg-green-50 border-green-300 hover:bg-green-100"
                onClick={() => navigate('/cooperative/parcels/verification')}
                data-testid="quick-action-naturalisation"
              >
                <span className="flex items-center text-green-700">
                  <TreePine className="h-4 w-4 mr-2" />
                  Naturalisation
                </span>
                <ChevronRight className="h-4 w-4 text-green-700" />
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-between bg-amber-50 border-amber-200 hover:bg-amber-100"
                onClick={() => navigate('/marketplace/harvest')}
                data-testid="quick-action-harvest-marketplace"
              >
                <span className="flex items-center text-amber-700">
                  <Store className="h-4 w-4 mr-2" />
                  Bourse des Récoltes
                </span>
                <ChevronRight className="h-4 w-4 text-amber-700" />
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-between bg-cyan-50 border-cyan-200 hover:bg-cyan-100"
                onClick={() => navigate('/cooperative/agents')}
                data-testid="quick-action-agents"
              >
                <span className="flex items-center text-cyan-700">
                  <Shield className="h-4 w-4 mr-2" />
                  Agents Terrain
                </span>
                <ChevronRight className="h-4 w-4 text-cyan-700" />
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-between bg-indigo-50 border-indigo-200 hover:bg-indigo-100"
                onClick={() => navigate('/cooperative/agents-progress')}
                data-testid="quick-action-agents-progress"
              >
                <span className="flex items-center text-indigo-700">
                  <Target className="h-4 w-4 mr-2" />
                  Progression Agents
                </span>
                <ChevronRight className="h-4 w-4 text-indigo-700" />
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-between bg-violet-50 border-violet-200 hover:bg-violet-100"
                onClick={() => navigate('/cooperative/inscriptions')}
                data-testid="quick-action-inscriptions-ussd"
              >
                <span className="flex items-center text-violet-700">
                  <UserCircle className="h-4 w-4 mr-2" />
                  Inscriptions USSD/Web
                </span>
                <ChevronRight className="h-4 w-4 text-violet-700" />
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-between bg-orange-50 border-orange-200 hover:bg-orange-100"
                onClick={() => navigate('/marketplace')}
                data-testid="quick-action-marketplace-intrants"
              >
                <span className="flex items-center text-orange-700">
                  <Package className="h-4 w-4 mr-2" />
                  Marketplace Intrants
                </span>
                <ChevronRight className="h-4 w-4 text-orange-700" />
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-between bg-violet-50 border-violet-200 hover:bg-violet-100"
                onClick={() => navigate('/buyer/orders')}
                data-testid="quick-action-orders"
              >
                <span className="flex items-center text-violet-700">
                  <Clock className="h-4 w-4 mr-2" />
                  Suivi Commandes
                </span>
                <ChevronRight className="h-4 w-4 text-violet-700" />
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-between bg-gray-800 border-gray-700 hover:bg-gray-700"
                onClick={() => {
                  setShowSimulator(!showSimulator);
                  if (!showSimulator && simulatorMembers.length === 0) loadSimulatorMembers();
                }}
                data-testid="quick-action-ussd-simulator"
              >
                <span className="flex items-center text-emerald-400">
                  <Smartphone className="h-4 w-4 mr-2" />
                  Simulateur USSD
                </span>
                <ChevronRight className="h-4 w-4 text-emerald-400" />
              </Button>
            </CardContent>
          </Card>

          {/* Recent Members */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Membres Récents</CardTitle>
                <CardDescription>
                  {members?.pending_validation || 0} en attente de validation
                </CardDescription>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/cooperative/members')}
              >
                Voir tout
              </Button>
            </CardHeader>
            <CardContent>
              {recent_members?.length > 0 ? (
                <div className="space-y-3">
                  {recent_members.map((member, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      data-testid={`recent-member-${index}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                          <span className="text-green-700 font-medium">
                            {member.name?.charAt(0) || '?'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{member.name}</p>
                          <p className="text-sm text-gray-500">{member.village}</p>
                        </div>
                      </div>
                      <Badge variant="outline">
                        <Clock className="h-3 w-3 mr-1" />
                        Nouveau
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>Aucun membre pour le moment</p>
                  <Button 
                    variant="link" 
                    onClick={() => navigate('/cooperative/members/new')}
                    className="mt-2"
                  >
                    Ajouter votre premier membre
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gestion des Parcelles - Section dédiée */}
          
          {/* Activation Tracking Widget */}
          {activationStats && (
            <Card className="lg:col-span-3 border-2 border-blue-200 bg-blue-50/20" data-testid="activation-widget">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-blue-600" />
                    Suivi des Activations
                  </CardTitle>
                  <CardDescription>
                    Taux d'activation : {activationStats.activation_rate}% des membres ont activé leur compte
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/cooperative/members')}
                >
                  Voir tous les membres
                </Button>
              </CardHeader>
              <CardContent>
                {/* Stats cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
                  <div className="text-center p-3 bg-white rounded-lg border border-blue-100">
                    <Users className="h-6 w-6 mx-auto mb-1 text-blue-600" />
                    <p className="text-xl font-bold text-gray-900" data-testid="activation-total">{activationStats.total_members}</p>
                    <p className="text-xs text-gray-500">Total Membres</p>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg border border-green-200">
                    <UserCheck className="h-6 w-6 mx-auto mb-1 text-green-600" />
                    <p className="text-xl font-bold text-green-700" data-testid="activation-activated">{activationStats.activated_count}</p>
                    <p className="text-xs text-gray-500">Activés</p>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg border border-amber-200">
                    <UserX className="h-6 w-6 mx-auto mb-1 text-amber-600" />
                    <p className="text-xl font-bold text-amber-700" data-testid="activation-pending">{activationStats.pending_count}</p>
                    <p className="text-xs text-gray-500">En attente</p>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg border border-emerald-200">
                    <KeyRound className="h-6 w-6 mx-auto mb-1 text-emerald-600" />
                    <p className="text-xl font-bold text-emerald-700" data-testid="activation-pin">{activationStats.pin_configured_count}</p>
                    <p className="text-xs text-gray-500">PIN configuré</p>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
                    <p className="text-xl font-bold text-blue-700" data-testid="activation-code">{activationStats.code_planteur_count}</p>
                    <p className="text-xs text-gray-500">Code Planteur</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-5">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Progression des activations</span>
                    <span className="font-medium text-blue-700">{activationStats.activation_rate}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="h-3 rounded-full transition-all duration-500"
                      style={{
                        width: `${activationStats.activation_rate}%`,
                        background: activationStats.activation_rate >= 75 ? '#16a34a' : activationStats.activation_rate >= 40 ? '#d97706' : '#dc2626'
                      }}
                    />
                  </div>
                </div>

                {/* Pending members list */}
                {activationStats.pending_activation?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                      Membres en attente d'activation ({activationStats.pending_count})
                    </h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {activationStats.pending_activation.slice(0, 5).map((m) => (
                        <div key={m.id} className="flex items-center justify-between p-2 bg-white rounded-lg border" data-testid={`pending-member-${m.id}`}>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                              <span className="text-amber-700 font-medium text-sm">{m.full_name?.charAt(0) || '?'}</span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{m.full_name}</p>
                              <p className="text-xs text-gray-500">{m.phone_number} - {m.village}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {m.code_planteur && (
                              <span className="text-xs font-mono text-green-700 bg-green-50 px-1.5 py-0.5 rounded">{m.code_planteur}</span>
                            )}
                            {!m.pin_configured && (
                              <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">Sans PIN</Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={sendingReminder === m.id}
                              onClick={() => handleSendReminder(m.id, m.full_name)}
                              title="Envoyer un rappel SMS"
                              data-testid={`reminder-btn-${m.id}`}
                            >
                              {sendingReminder === m.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Send className="h-3.5 w-3.5 text-blue-600" />
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    {activationStats.pending_count > 5 && (
                      <Button variant="link" size="sm" className="mt-2" onClick={() => navigate('/cooperative/members')}>
                        Voir les {activationStats.pending_count - 5} autres membres en attente...
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="lg:col-span-3 border-2 border-green-200 bg-green-50/30">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-green-600" />
                  Gestion des Parcelles des Planteurs
                </CardTitle>
                <CardDescription>
                  Enregistrez et gérez les parcelles de vos membres producteurs
                </CardDescription>
              </div>
              <Button 
                onClick={() => navigate('/cooperative/parcels/new')}
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle Parcelle
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-white rounded-lg border border-green-200">
                  <MapPin className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <p className="text-2xl font-bold text-gray-900">{parcelles?.total || 0}</p>
                  <p className="text-sm text-gray-500">Parcelles Totales</p>
                </div>
                <div className="text-center p-4 bg-white rounded-lg border border-green-200">
                  <Leaf className="h-8 w-8 mx-auto mb-2 text-emerald-600" />
                  <p className="text-2xl font-bold text-gray-900">{parcelles?.superficie_totale?.toFixed(1) || 0}</p>
                  <p className="text-sm text-gray-500">Hectares Cultivés</p>
                </div>
                <div className="text-center p-4 bg-white rounded-lg border border-green-200">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 text-teal-600" />
                  <p className="text-2xl font-bold text-gray-900">{parcelles?.score_carbone_moyen?.toFixed(1) || 0}/10</p>
                  <p className="text-sm text-gray-500">Score Carbone Moyen</p>
                </div>
                <div className="text-center p-4 bg-white rounded-lg border border-green-200">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <p className="text-2xl font-bold text-gray-900">{parcelles?.co2_total?.toFixed(1) || 0}</p>
                  <p className="text-sm text-gray-500">Tonnes CO₂ Capturées</p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-3">
                <Button 
                  variant="outline" 
                  className="border-green-300 text-green-700 hover:bg-green-100"
                  onClick={() => navigate('/cooperative/parcels/new')}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Enregistrer une Parcelle
                </Button>
                <Button 
                  variant="outline"
                  className="border-gray-300"
                  onClick={() => navigate('/cooperative/parcels')}
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Toutes les Parcelles
                </Button>
                <Button 
                  variant="outline"
                  className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                  onClick={() => navigate('/cooperative/parcels/verification')}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  En attente de vérification
                </Button>
                <Button 
                  variant="outline"
                  className="border-gray-300"
                  onClick={() => navigate('/cooperative/reports')}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Rapport EUDR Parcelles
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Financial Summary */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Résumé Financier</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-600">Primes Reçues</p>
                  <p className="text-xl font-bold text-green-700">
                    {(financial?.total_premiums_received || 0).toLocaleString()} XOF
                  </p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-600">Distribué</p>
                  <p className="text-xl font-bold text-blue-700">
                    {(financial?.total_premiums_distributed || 0).toLocaleString()} XOF
                  </p>
                </div>
                <div className="text-center p-4 bg-amber-50 rounded-lg">
                  <p className="text-sm text-amber-600">En Attente</p>
                  <p className="text-xl font-bold text-amber-700">
                    {(financial?.pending_distribution || 0).toLocaleString()} XOF
                  </p>
                </div>
              </div>
              {financial?.distribution_rate > 0 && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Taux de distribution</span>
                    <span>{financial.distribution_rate}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${financial.distribution_rate}%` }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Commission masquee */}
        </div>

        {/* Alerts Section */}
        {members?.pending_validation > 0 && (
          <Card className="mt-6 border-amber-200 bg-amber-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <div className="flex-1">
                  <p className="font-medium text-amber-800">
                    {members.pending_validation} membre(s) en attente de validation
                  </p>
                  <p className="text-sm text-amber-600">
                    Validez les nouveaux membres pour qu'ils puissent contribuer aux lots
                  </p>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => navigate('/cooperative/members?status=pending_validation')}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  Valider
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* USSD Simulator Panel */}
        {showSimulator && (
          <div className="mt-6">
            <Card className="bg-gray-900 border-gray-700">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <USSDSimulator title="Simulateur USSD *144*99#" onClose={() => setShowSimulator(false)} members={simulatorMembers} />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-white">Comment utiliser le simulateur</h3>
                    <p className="text-sm text-gray-400">
                      Ce simulateur reproduit l'experience USSD *144*99# telle que vos planteurs la vivent sur leur telephone.
                      Utilisez-le pour former vos agents ou verifier les flux.
                    </p>
                    <div className="space-y-2 mt-4">
                      {[
                        { step: '1', text: 'Selectionnez un de vos membres dans la liste' },
                        { step: '2', text: 'Cliquez "Composer *144*99#" pour demarrer' },
                        { step: '3', text: 'Utilisez les boutons rapides ou tapez votre reponse' },
                        { step: '4', text: 'Testez l\'inscription, l\'estimation simple/detaillee, la demande de versement' },
                      ].map((item) => (
                        <div key={item.step} className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs flex items-center justify-center font-bold">{item.step}</span>
                          <p className="text-sm text-gray-300">{item.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

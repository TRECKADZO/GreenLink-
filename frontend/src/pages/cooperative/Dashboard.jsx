import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { cooperativeApi } from '../../services/cooperativeApi';
import { 
  Users, MapPin, Leaf, DollarSign, Package, 
  TrendingUp, FileText, Plus, ChevronRight,
  CheckCircle, Clock, AlertTriangle, Building2,
  ClipboardCheck, QrCode, Shield
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
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

    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const { coop_info, members, parcels, lots, financial, recent_members } = dashboardData || {};

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
      title: 'Parcelles',
      value: parcels?.total_count || 0,
      subtitle: `${parcels?.total_hectares || 0} ha`,
      icon: MapPin,
      color: 'bg-green-500',
      link: '/cooperative/parcels'
    },
    {
      title: 'Score Carbone Moyen',
      value: parcels?.average_carbon_score?.toFixed(1) || '0',
      subtitle: '/10',
      icon: Leaf,
      color: 'bg-emerald-500'
    },
    {
      title: 'CO₂ Capturé',
      value: parcels?.total_co2_tonnes?.toFixed(1) || '0',
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
      subtitle: 'FCFA',
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
            <div className="mt-4 md:mt-0 flex gap-2">
              <Button 
                onClick={() => navigate('/cooperative/ssrte')}
                className="bg-amber-500 text-white hover:bg-amber-600"
                data-testid="ssrte-btn"
              >
                <ClipboardCheck className="h-4 w-4 mr-2" />
                Suivi SSRTE
              </Button>
              <Button 
                onClick={() => navigate('/cooperative/members/new')}
                className="bg-white text-green-700 hover:bg-green-50"
                data-testid="add-member-btn"
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter Membre
              </Button>
              <Button 
                onClick={() => navigate('/cooperative/lots/new')}
                variant="outline"
                className="border-white text-white hover:bg-white/10"
                data-testid="create-lot-btn"
              >
                <Package className="h-4 w-4 mr-2" />
                Créer Lot
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
                className="w-full justify-between bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                onClick={() => navigate('/cooperative/qrcodes')}
                data-testid="quick-action-qrcodes"
              >
                <span className="flex items-center text-emerald-700">
                  <QrCode className="h-4 w-4 mr-2" />
                  QR Codes Membres
                </span>
                <ChevronRight className="h-4 w-4 text-emerald-700" />
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
                    {(financial?.total_premiums_received || 0).toLocaleString()} FCFA
                  </p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-600">Distribué</p>
                  <p className="text-xl font-bold text-blue-700">
                    {(financial?.total_premiums_distributed || 0).toLocaleString()} FCFA
                  </p>
                </div>
                <div className="text-center p-4 bg-amber-50 rounded-lg">
                  <p className="text-sm text-amber-600">En Attente</p>
                  <p className="text-xl font-bold text-amber-700">
                    {(financial?.pending_distribution || 0).toLocaleString()} FCFA
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

          {/* Commission Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Commission</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-4xl font-bold text-green-600">
                  {((coop_info?.commission_rate || 0.10) * 100).toFixed(0)}%
                </p>
                <p className="text-sm text-gray-500 mt-1">Taux de commission</p>
              </div>
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600">
                  Cette commission est prélevée sur les primes carbone avant redistribution aux membres.
                </p>
              </div>
            </CardContent>
          </Card>
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
      </div>
    </div>
  );
};

export default Dashboard;

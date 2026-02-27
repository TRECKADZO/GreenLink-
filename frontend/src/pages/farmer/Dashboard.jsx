import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import Navbar from '../../components/Navbar';
import { greenlinkApi } from '../../services/greenlinkApi';
import { 
  Sprout, 
  TrendingUp, 
  DollarSign, 
  MapPin,
  Award,
  Plus,
  Smartphone,
  CheckCircle
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const FarmerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.user_type !== 'producteur') {
      navigate('/');
      return;
    }
    fetchDashboard();
  }, [user]);

  const fetchDashboard = async () => {
    try {
      const data = await greenlinkApi.getFarmerDashboard();
      setStats(data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-6 py-12 pt-24">
          <div className="text-center py-12">
            <Sprout className="w-12 h-12 text-green-600 animate-pulse mx-auto mb-4" />
            <p className="text-gray-600">Chargement...</p>
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Mes Parcelles',
      value: stats.total_parcels,
      subtitle: `${stats.total_area_hectares.toFixed(1)} hectares`,
      icon: MapPin,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Score Carbone Moyen',
      value: `${stats.average_carbon_score.toFixed(1)}/10`,
      subtitle: `${stats.total_carbon_credits.toFixed(1)} crédits CO₂`,
      icon: Award,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Revenus Total',
      value: `${stats.total_revenue.toLocaleString()} F`,
      subtitle: `+${stats.carbon_premium_earned.toLocaleString()} F prime`,
      icon: DollarSign,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100'
    },
    {
      title: 'Arbres Plantés',
      value: stats.total_trees.toLocaleString(),
      subtitle: 'Impact environnemental',
      icon: Sprout,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-6 py-12 pt-24">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Sprout className="w-10 h-10 text-green-600" />
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Bienvenue {user?.full_name}</h1>
              <p className="text-gray-600">Votre espace planteur GreenLink</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Button 
            className="h-20 bg-green-600 hover:bg-green-700 text-white text-lg"
            onClick={() => navigate('/farmer/parcels/new')}
          >
            <Plus className="w-6 h-6 mr-2" />
            Déclarer une Parcelle
          </Button>
          <Button 
            className="h-20 bg-blue-600 hover:bg-blue-700 text-white text-lg"
            onClick={() => navigate('/farmer/harvests/new')}
          >
            <TrendingUp className="w-6 h-6 mr-2" />
            Déclarer une Récolte
          </Button>
          <Button 
            className="h-20 bg-amber-600 hover:bg-amber-700 text-white text-lg"
            onClick={() => navigate('/farmer/ussd')}
          >
            <Smartphone className="w-6 h-6 mr-2" />
            Accès USSD/SMS
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, index) => (
            <Card key={index} className="p-6 bg-white hover:shadow-xl transition-shadow duration-200">
              <div className={`p-3 rounded-lg ${stat.bgColor} w-fit mb-4`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <h3 className="text-sm text-gray-600 mb-1">{stat.title}</h3>
              <p className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.subtitle}</p>
            </Card>
          ))}
        </div>

        {/* Carbon Premium Info */}
        {stats.average_carbon_score >= 7 && (
          <Card className="p-6 mb-8 border-l-4 border-green-500 bg-green-50">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-green-600 mt-1" />
              <div>
                <h3 className="font-bold text-green-900 mb-1">
                  🎉 Prime Carbone Active!
                </h3>
                <p className="text-green-800">
                  Votre score carbone de <strong>{stats.average_carbon_score.toFixed(1)}/10</strong> vous donne droit à une prime de <strong>10%</strong> sur toutes vos ventes!
                </p>
                <p className="text-sm text-green-700 mt-2">
                  Vous avez déjà gagné <strong>{stats.carbon_premium_earned.toLocaleString()} FCFA</strong> en primes carbone.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Recent Harvests */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Récoltes Récentes</h2>
          
          {stats.recent_harvests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Aucune récolte déclarée</p>
            </div>
          ) : (
            <div className="space-y-4">
              {stats.recent_harvests.map((harvest, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-semibold text-gray-900">
                      {harvest.quantity_kg} kg - Grade {harvest.quality_grade}
                    </p>
                    <p className="text-sm text-gray-600">
                      {new Date(harvest.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">
                      {harvest.total_amount.toLocaleString()} FCFA
                    </p>
                    {harvest.carbon_premium > 0 && (
                      <Badge className="bg-green-100 text-green-700 text-xs">
                        +{harvest.carbon_premium.toLocaleString()}F prime
                      </Badge>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {harvest.payment_status === 'paid' ? '✓ Payé' : 'En attente'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default FarmerDashboard;
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
  CheckCircle,
  MessageSquare,
  Send,
  Store,
  Leaf
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const FarmerDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState(null);
  const [smsHistory, setSmsHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingSummary, setSendingSummary] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.user_type !== 'producteur') {
      navigate('/');
      return;
    }
    fetchDashboard();
    fetchSmsHistory();
  }, [user, authLoading]);

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

  const fetchSmsHistory = async () => {
    try {
      const data = await greenlinkApi.getSmsHistory();
      setSmsHistory(data.sms_history || []);
    } catch (error) {
      console.error('Error fetching SMS history:', error);
    }
  };

  const sendWeeklySummary = async () => {
    setSendingSummary(true);
    try {
      const result = await greenlinkApi.sendWeeklySummary();
      if (result.success) {
        toast({
          title: 'SMS envoyé!',
          description: 'Votre résumé hebdomadaire a été envoyé par SMS'
        });
        fetchSmsHistory(); // Refresh SMS history
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'envoyer le SMS',
        variant: 'destructive'
      });
    } finally {
      setSendingSummary(false);
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Button 
            className="h-20 bg-green-600 hover:bg-green-700 text-white text-lg"
            onClick={() => navigate('/farmer/parcels/new')}
            data-testid="action-new-parcel"
          >
            <Plus className="w-6 h-6 mr-2" />
            Déclarer une Parcelle
          </Button>
          <Button 
            className="h-20 bg-blue-600 hover:bg-blue-700 text-white text-lg"
            onClick={() => navigate('/farmer/harvests/new')}
            data-testid="action-new-harvest"
          >
            <TrendingUp className="w-6 h-6 mr-2" />
            Déclarer une Récolte
          </Button>
          <Button 
            className="h-20 bg-amber-600 hover:bg-amber-700 text-white text-lg"
            onClick={() => navigate('/marketplace/harvest')}
            data-testid="action-harvest-marketplace"
          >
            <Store className="w-6 h-6 mr-2" />
            Bourse des Récoltes
          </Button>
          <Button 
            className="h-20 bg-teal-600 hover:bg-teal-700 text-white text-lg"
            onClick={() => navigate('/carbon-marketplace')}
            data-testid="action-carbon-marketplace"
          >
            <Leaf className="w-6 h-6 mr-2" />
            Marché Carbone
          </Button>
          <Button 
            className="h-20 bg-slate-600 hover:bg-slate-700 text-white text-lg"
            onClick={() => navigate('/farmer/ussd')}
            data-testid="action-ussd"
          >
            <Smartphone className="w-6 h-6 mr-2" />
            USSD/SMS
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
                  Vous avez déjà gagné <strong>{stats.carbon_premium_earned.toLocaleString()} XOF</strong> en primes carbone.
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
                      {harvest.total_amount.toLocaleString()} XOF
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

        {/* SMS Notifications Section */}
        <Card className="p-6 mt-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-6 h-6 text-orange-600" />
              <h2 className="text-xl font-bold text-gray-900">Notifications SMS</h2>
            </div>
            <Button 
              onClick={sendWeeklySummary}
              disabled={sendingSummary}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              <Send className="w-4 h-4 mr-2" />
              {sendingSummary ? 'Envoi...' : 'Envoyer Résumé'}
            </Button>
          </div>
          
          <div className="bg-orange-50 border-l-4 border-orange-400 p-4 mb-4 rounded-r-lg">
            <p className="text-sm text-orange-800">
              <strong>Notifications automatiques:</strong> Vous recevez un SMS quand votre parcelle atteint un score carbone ≥ 7/10 (éligible à la prime).
            </p>
          </div>

          {smsHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Aucun SMS envoyé</p>
            </div>
          ) : (
            <div className="space-y-3">
              {smsHistory.slice(0, 5).map((sms, index) => (
                <div 
                  key={index}
                  className="p-4 bg-gray-50 rounded-lg border-l-4 border-orange-400"
                >
                  <div className="flex items-start justify-between mb-2">
                    <Badge className={`text-xs ${
                      sms.template === 'carbon_premium_eligible' ? 'bg-green-100 text-green-700' :
                      sms.template === 'harvest_payment' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {sms.template === 'carbon_premium_eligible' ? 'Prime Carbone' :
                       sms.template === 'harvest_payment' ? 'Paiement' :
                       sms.template === 'weekly_summary' ? 'Résumé' : sms.template}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {new Date(sms.created_at).toLocaleString('fr-FR')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-800 font-mono bg-white p-2 rounded border">
                    {sms.message}
                  </p>
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
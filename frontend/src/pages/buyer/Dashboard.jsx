import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import Navbar from '../../components/Navbar';
import SubscriptionBanner from '../../components/SubscriptionBanner';
import { greenlinkApi } from '../../services/greenlinkApi';
import axios from 'axios';
import { 
  ShoppingCart, 
  Leaf, 
  CheckCircle, 
  Download,
  FileText,
  BarChart3
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const BuyerDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.user_type !== 'acheteur') {
      navigate('/');
      return;
    }
    fetchData();
    fetchSubscription();
  }, [user, authLoading]);

  const fetchSubscription = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${API_URL}/api/subscriptions/my-subscription`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubscription(data.subscription);
    } catch (err) {
      console.error('Error fetching subscription:', err);
    }
  };

  const fetchData = async () => {
    try {
      const [dashboardData, ordersData] = await Promise.all([
        greenlinkApi.getBuyerDashboard(),
        greenlinkApi.getBuyerOrders()
      ]);
      setStats(dashboardData);
      setOrders(ordersData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportEUDR = async (orderId) => {
    try {
      const report = await greenlinkApi.getTraceabilityReport(orderId);
      
      // Convert to CSV
      const csvContent = generateEUDRCSV(report);
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `EUDR_Report_${orderId}_${Date.now()}.csv`;
      a.click();
      
      toast({
        title: 'Export réussi',
        description: 'Rapport EUDR téléchargé'
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'exporter le rapport',
        variant: 'destructive'
      });
    }
  };

  const generateEUDRCSV = (report) => {
    let csv = 'EUDR Compliance Report\n\n';
    csv += `Order ID,${report.order_id}\n`;
    csv += `Generated At,${report.generated_at}\n`;
    csv += `Total Quantity (kg),${report.total_quantity_kg}\n`;
    csv += `Average Carbon Score,${report.average_carbon_score}\n`;
    csv += `EUDR Compliant,${report.eudr_compliant ? 'YES' : 'NO'}\n`;
    csv += `Blockchain Hash,${report.blockchain_hash}\n\n`;
    
    csv += 'Parcels Details\n';
    csv += 'ID,Location,Area (ha),Carbon Score,Practices\n';
    report.parcels.forEach(p => {
      csv += `${p.id},${p.location},${p.area},${p.carbon_score},"${p.practices.join(', ')}"\n`;
    });
    
    csv += '\nFarmers\n';
    csv += 'Name,Phone\n';
    report.farmers.forEach(f => {
      csv += `${f.name},${f.phone}\n`;
    });
    
    return csv;
  };

  if (loading || !stats) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-6 py-12 pt-24">
          <div className="text-center py-12">
            <BarChart3 className="w-12 h-12 text-blue-600 animate-pulse mx-auto mb-4" />
            <p className="text-gray-600">Chargement...</p>
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Commandes Total',
      value: stats.total_orders,
      subtitle: `${stats.active_orders} actives`,
      icon: ShoppingCart,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Quantité Achetée',
      value: `${(stats.total_quantity_purchased_kg / 1000).toFixed(1)}t`,
      subtitle: 'Tonnes de cacao/anacarde',
      icon: Leaf,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Offset Carbone',
      value: `${stats.total_carbon_offset_tonnes.toFixed(1)}t`,
      subtitle: 'CO₂ compensé',
      icon: CheckCircle,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100'
    },
    {
      title: 'Conformité EUDR',
      value: `${stats.eudr_compliance_rate.toFixed(1)}%`,
      subtitle: 'Taux de conformité',
      icon: FileText,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-6 py-12 pt-24">
        {/* Subscription Banner */}
        <SubscriptionBanner subscription={subscription} />

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Tableau de Bord Acheteur</h1>
          <p className="text-gray-600">Traçabilité & Conformité EUDR</p>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, index) => (
            <Card key={index} className="p-6 hover:shadow-xl transition-shadow">
              <div className={`p-3 rounded-lg ${stat.bgColor} w-fit mb-4`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <h3 className="text-sm text-gray-600 mb-1">{stat.title}</h3>
              <p className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.subtitle}</p>
            </Card>
          ))}
        </div>

        {/* EUDR Compliance Badge */}
        {stats.eudr_compliance_rate >= 90 && (
          <Card className="p-6 mb-8 border-l-4 border-green-500 bg-green-50">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <h3 className="font-bold text-green-900 text-lg">
                  ✓ Conformité EUDR Excellente
                </h3>
                <p className="text-green-800">
                  {stats.eudr_compliance_rate.toFixed(1)}% de vos achats sont conformes aux règlements EUDR. 
                  Traçabilité complète disponible pour tous vos lots.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Orders with EUDR Export */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Mes Commandes & Rapports EUDR</h2>
          
          {orders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Aucune commande</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div 
                  key={order._id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="font-semibold text-gray-900">
                        {order.crop_type} - {order.quantity_needed_kg}kg
                      </p>
                      <Badge className={`${
                        order.status === 'completed' ? 'bg-green-100 text-green-700' :
                        order.status === 'matched' ? 'bg-blue-100 text-blue-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {order.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      Livraison: {order.delivery_location}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Créé le {new Date(order.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/buyer/traceability/${order._id}`)}
                      className="text-blue-600 border-blue-600 hover:bg-blue-50"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Traçabilité
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportEUDR(order._id)}
                      className="text-green-600 border-green-600 hover:bg-green-50"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export EUDR
                    </Button>
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

export default BuyerDashboard;
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import Navbar from '../../components/Navbar';
import { 
  Activity, 
  Wallet, 
  MapPin, 
  Users, 
  Phone, 
  RefreshCw,
  TrendingUp,
  CheckCircle2,
  Clock,
  XCircle,
  Leaf,
  Building2,
  ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const RealtimeDashboard = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/realtime-dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const result = await response.json();
        setData(result);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
    
    // Auto-refresh every 30 seconds
    let interval;
    if (autoRefresh) {
      interval = setInterval(fetchData, 30000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [fetchData, autoRefresh]);

  const formatFCFA = (amount) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  };

  const formatTime = (isoString) => {
    if (!isoString) return 'N/A';
    return new Date(isoString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-6 py-8 pt-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate('/admin')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Activity className="w-8 h-8 text-emerald-600" />
                Tableau de Bord Temps Réel
              </h1>
              <p className="text-gray-600 mt-1">
                Activité USSD, paiements et métriques régionales
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500">
              Dernière MAJ: {lastUpdate?.toLocaleTimeString('fr-FR')}
            </div>
            <Button 
              variant={autoRefresh ? "default" : "outline"}
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? "bg-emerald-600" : ""}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
              {autoRefresh ? 'Auto' : 'Manuel'}
            </Button>
            <Button onClick={fetchData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualiser
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-6 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm">Coopératives</p>
                <p className="text-3xl font-bold">{data?.totals?.cooperatives || 0}</p>
              </div>
              <Building2 className="w-10 h-10 opacity-80" />
            </div>
          </Card>
          
          <Card className="p-6 bg-gradient-to-br from-amber-500 to-amber-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm">Producteurs</p>
                <p className="text-3xl font-bold">{data?.totals?.farmers || 0}</p>
              </div>
              <Users className="w-10 h-10 opacity-80" />
            </div>
          </Card>
          
          <Card className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Auditeurs</p>
                <p className="text-3xl font-bold">{data?.totals?.auditors || 0}</p>
              </div>
              <Leaf className="w-10 h-10 opacity-80" />
            </div>
          </Card>
          
          <Card className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Parcelles</p>
                <p className="text-3xl font-bold">{data?.totals?.parcels || 0}</p>
              </div>
              <MapPin className="w-10 h-10 opacity-80" />
            </div>
          </Card>
        </div>

        <Tabs defaultValue="ussd" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white shadow-sm">
            <TabsTrigger value="ussd" className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              USSD/SMS
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              Paiements
            </TabsTrigger>
            <TabsTrigger value="regions" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Régions
            </TabsTrigger>
            <TabsTrigger value="audits" className="flex items-center gap-2">
              <Leaf className="w-4 h-4" />
              Audits
            </TabsTrigger>
          </TabsList>

          {/* USSD Tab */}
          <TabsContent value="ussd">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Phone className="w-5 h-5 text-orange-600" />
                  Activité USSD
                </h3>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-orange-50 rounded-lg text-center">
                    <p className="text-3xl font-bold text-orange-600">{data?.ussd?.requests_today || 0}</p>
                    <p className="text-sm text-orange-700">Aujourd'hui</p>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg text-center">
                    <p className="text-3xl font-bold text-orange-600">{data?.ussd?.requests_week || 0}</p>
                    <p className="text-sm text-orange-700">Cette semaine</p>
                  </div>
                </div>

                <h4 className="font-medium text-gray-700 mb-2">Commandes populaires</h4>
                <div className="space-y-2">
                  {Object.entries(data?.ussd?.by_command || {}).map(([cmd, count]) => (
                    <div key={cmd} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <code className="font-mono text-sm bg-gray-200 px-2 py-1 rounded">{cmd}</code>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                  {Object.keys(data?.ussd?.by_command || {}).length === 0 && (
                    <p className="text-gray-500 text-sm">Aucune commande récente</p>
                  )}
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-600" />
                  Requêtes en Attente
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border-l-4 border-amber-500">
                    <div>
                      <p className="font-medium text-amber-900">Parcelles à valider</p>
                      <p className="text-sm text-amber-700">Via SMS PARCELLE</p>
                    </div>
                    <Badge className="bg-amber-500 text-white text-lg px-4">
                      {data?.ussd?.pending_requests?.parcels || 0}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                    <div>
                      <p className="font-medium text-green-900">Récoltes déclarées</p>
                      <p className="text-sm text-green-700">Via SMS RECOLTE</p>
                    </div>
                    <Badge className="bg-green-500 text-white text-lg px-4">
                      {data?.ussd?.pending_requests?.harvests || 0}
                    </Badge>
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  className="w-full mt-4"
                  onClick={() => navigate('/admin/ussd-requests')}
                >
                  Voir toutes les requêtes
                </Button>
              </Card>
            </div>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments">
            <div className="grid md:grid-cols-3 gap-6 mb-6">
              <Card className="p-6 bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
                <div className="flex items-center gap-3 mb-2">
                  <Wallet className="w-6 h-6 text-emerald-600" />
                  <span className="font-medium text-emerald-900">Total ce mois</span>
                </div>
                <p className="text-2xl font-bold text-emerald-700">
                  {formatFCFA(data?.payments?.month_total || 0)}
                </p>
                <p className="text-sm text-emerald-600 mt-1">
                  {data?.payments?.month_count || 0} paiements
                </p>
              </Card>
              
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                  <span className="font-medium">Aujourd'hui</span>
                </div>
                <p className="text-2xl font-bold">{data?.payments?.today || 0}</p>
                <p className="text-sm text-gray-600">paiements</p>
              </Card>
              
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Activity className="w-6 h-6 text-purple-600" />
                  <span className="font-medium">Montant moyen</span>
                </div>
                <p className="text-2xl font-bold">{formatFCFA(data?.payments?.avg_amount || 0)}</p>
                <p className="text-sm text-gray-600">par paiement</p>
              </Card>
            </div>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Derniers Paiements</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Membre</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Montant</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Référence</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Statut</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(data?.payments?.recent || []).map((payment) => (
                      <tr key={payment.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{payment.member_name}</td>
                        <td className="px-4 py-3 text-emerald-600 font-semibold">
                          {formatFCFA(payment.amount)}
                        </td>
                        <td className="px-4 py-3 font-mono text-sm text-gray-500">
                          {payment.payment_ref?.slice(0, 15)}...
                        </td>
                        <td className="px-4 py-3">
                          <Badge 
                            className={
                              payment.status === 'completed' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-amber-100 text-amber-700'
                            }
                          >
                            {payment.status === 'completed' ? (
                              <><CheckCircle2 className="w-3 h-3 mr-1" /> Payé</>
                            ) : (
                              <><Clock className="w-3 h-3 mr-1" /> En attente</>
                            )}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-sm">
                          {formatTime(payment.created_at)}
                        </td>
                      </tr>
                    ))}
                    {(data?.payments?.recent || []).length === 0 && (
                      <tr>
                        <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                          Aucun paiement récent
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* Regions Tab */}
          <TabsContent value="regions">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-emerald-600" />
                  Parcelles par Région
                </h3>
                
                <div className="space-y-3">
                  {(data?.regions?.parcels || []).map((region) => (
                    <div key={region.region} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{region.region}</span>
                        <Badge variant="outline">{region.parcels} parcelles</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>{region.area_ha} ha</span>
                        <span className="flex items-center gap-1">
                          <Leaf className="w-4 h-4 text-emerald-500" />
                          Score: {region.avg_score}/10
                        </span>
                      </div>
                    </div>
                  ))}
                  {(data?.regions?.parcels || []).length === 0 && (
                    <p className="text-gray-500 text-center py-4">Aucune donnée régionale</p>
                  )}
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  Coopératives par Région
                </h3>
                
                <div className="space-y-2">
                  {Object.entries(data?.regions?.cooperatives || {}).map(([region, count]) => (
                    <div key={region} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <span className="font-medium text-blue-900">{region}</span>
                      <Badge className="bg-blue-500">{count}</Badge>
                    </div>
                  ))}
                  {Object.keys(data?.regions?.cooperatives || {}).length === 0 && (
                    <p className="text-gray-500 text-center py-4">Aucune coopérative</p>
                  )}
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Audits Tab */}
          <TabsContent value="audits">
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Activité Audits</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-emerald-50 rounded-lg text-center">
                    <p className="text-3xl font-bold text-emerald-600">{data?.audits?.today || 0}</p>
                    <p className="text-sm text-emerald-700">Aujourd'hui</p>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-lg text-center">
                    <p className="text-3xl font-bold text-emerald-600">{data?.audits?.week || 0}</p>
                    <p className="text-sm text-emerald-700">Cette semaine</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 md:col-span-2">
                <h3 className="text-lg font-semibold mb-4">Par Recommandation</h3>
                <div className="flex flex-wrap gap-4">
                  {Object.entries(data?.audits?.by_status || {}).map(([status, count]) => {
                    const colors = {
                      'approved': 'bg-green-100 text-green-700 border-green-300',
                      'needs_review': 'bg-amber-100 text-amber-700 border-amber-300',
                      'rejected': 'bg-red-100 text-red-700 border-red-300'
                    };
                    const icons = {
                      'approved': <CheckCircle2 className="w-5 h-5" />,
                      'needs_review': <Clock className="w-5 h-5" />,
                      'rejected': <XCircle className="w-5 h-5" />
                    };
                    return (
                      <div 
                        key={status} 
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${colors[status] || 'bg-gray-100'}`}
                      >
                        {icons[status]}
                        <div>
                          <p className="font-semibold text-lg">{count}</p>
                          <p className="text-sm capitalize">{status.replace('_', ' ')}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default RealtimeDashboard;

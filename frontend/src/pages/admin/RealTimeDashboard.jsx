import { tokenService } from "../../services/tokenService";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import Navbar from '../../components/Navbar';
import { toast } from 'sonner';
import { 
  Activity, AlertTriangle, Bell, CheckCircle2, Clock, 
  RefreshCcw, Shield, Users, Wifi, WifiOff, 
  TrendingUp, Download, BarChart3, Eye, Zap, Radio, ChevronLeft
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const WS_URL = API_URL?.replace('https://', 'wss://').replace('http://', 'ws://');

const RealTimeDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [connected, setConnected] = useState(false);
  const [stats, setStats] = useState(null);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const pollingRef = useRef(null);

  // Connexion WebSocket ou fallback vers polling
  const connectWebSocket = useCallback(() => {
    if (!user) return;

    const token = tokenService.getToken();
    if (!token) return;

    // Try WebSocket first
    try {
      const wsUrl = `${WS_URL}/ws/dashboard?token=${token}&channels=alerts,stats,ssrte`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setConnected(true);
        setConnectionAttempts(0);
        toast.success('Connexion temps réel établie');
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (e) {
          /* error logged */
        }
      };

      wsRef.current.onclose = (event) => {
        setConnected(false);
        // Fallback to polling
        if (event.code !== 1000) {
          startPolling();
        }
      };

      wsRef.current.onerror = (error) => {
        /* error logged */
        setConnected(false);
        startPolling();
      };

    } catch (error) {
      /* error logged */
      startPolling();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Fallback polling
  const startPolling = () => {
    if (pollingRef.current) return;
    
    const pollData = async () => {
      try {
        const token = tokenService.getToken();
        const response = await fetch(`${API_URL}/api/ws/broadcast-stats`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.stats) {
            setStats(data.stats);
            setLastUpdate(new Date());
            setConnected(true);
          }
        }
      } catch (error) {
        /* error logged */
      }
    };

    // Initial poll
    pollData();
    
    // Poll every 30 seconds
    pollingRef.current = setInterval(pollData, 30000);
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const handleWebSocketMessage = (message) => {
    const { type, data, timestamp } = message;

    switch (type) {
      case 'initial_data':
        setStats(message.stats);
        setLastUpdate(new Date(timestamp));
        break;

      case 'stats_update':
        setStats(data);
        setLastUpdate(new Date(timestamp));
        break;

      case 'new_alert':
        setRecentAlerts(prev => [data, ...prev.slice(0, 9)]);
        toast.warning('Nouvelle alerte ICI', {
          description: data.message?.slice(0, 50)
        });
        break;

      case 'alert_updated':
      case 'alert_resolved':
        // Rafraîchir les stats
        requestStats();
        break;

      case 'heartbeat':
        setLastUpdate(new Date(timestamp));
        break;

      case 'pong':
        // Réponse au ping
        break;

      default:
        // silenced in production;
    }
  };

  const requestStats = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'get_stats' }));
    }
  };

  const requestAlerts = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'get_alerts' }));
    }
  };

  // Télécharger rapport PDF
  const downloadPDF = async (type) => {
    try {
      const token = tokenService.getToken();
      const response = await fetch(`${API_URL}/api/pdf-reports/${type}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport_${type}_${new Date().toISOString().split('T')[0]}.pdf`;
      a.click();
      toast.success('Rapport PDF téléchargé');
    } catch (error) {
      toast.error('Erreur lors du téléchargement');
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.user_type !== 'admin') {
      toast.error('Accès refusé');
      navigate('/');
      return;
    }
    connectWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounting');
      }
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, connectWebSocket, navigate]);

  const formatTime = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      
      <div className="pt-24 pb-12 px-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/admin')}
                className="text-white hover:bg-white/10"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Retour
              </Button>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg ${connected ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                    <Radio className={`w-6 h-6 ${connected ? 'text-green-400 animate-pulse' : 'text-red-400'}`} />
                  </div>
                  <h1 className="text-2xl font-bold">Dashboard Temps Réel</h1>
                  <Badge className={connected ? 'bg-green-500' : 'bg-red-500'}>
                    {connected ? (
                      <><Wifi className="w-3 h-3 mr-1" /> EN DIRECT</>
                    ) : (
                      <><WifiOff className="w-3 h-3 mr-1" /> DÉCONNECTÉ</>
                    )}
                </Badge>
              </div>
              <p className="text-slate-400">
                Statistiques et alertes ICI en temps réel
                {lastUpdate && (
                  <span className="ml-2 text-xs text-slate-500">
                    Dernière MAJ: {formatTime(lastUpdate)}
                  </span>
                )}
              </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="border-purple-700 text-purple-400 hover:bg-purple-800/20"
                onClick={() => navigate('/admin/ssrte-analytics')}
              >
                <Eye className="w-4 h-4 mr-2" />
                Analytics SSRTE
              </Button>
              <Button 
                variant="outline" 
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
                onClick={() => navigate('/admin/ici-alerts')}
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Centre Alertes
              </Button>
              <Button 
                variant="outline" 
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
                onClick={requestStats}
                disabled={!connected}
              >
                <RefreshCcw className="w-4 h-4 mr-2" />
                Rafraîchir
              </Button>
            </div>
          </div>

          {/* Connection Status Banner */}
          {!connected && (
            <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <WifiOff className="w-5 h-5 text-red-400" />
                <div>
                  <p className="text-red-400 font-medium">Connexion temps réel perdue</p>
                  <p className="text-red-400/70 text-sm">
                    Tentative de reconnexion... ({connectionAttempts}/5)
                  </p>
                </div>
              </div>
              <Button 
                size="sm" 
                className="bg-red-500 hover:bg-red-600"
                onClick={() => {
                  setConnectionAttempts(0);
                  connectWebSocket();
                }}
              >
                Reconnecter
              </Button>
            </div>
          )}

          {/* Live Stats Grid */}
          {stats && (
            <>
              {/* Overview Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-900/50 to-blue-950/50 border-blue-500/30">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Users className="w-5 h-5 text-blue-400" />
                      <Zap className={`w-4 h-4 ${connected ? 'text-green-400 animate-pulse' : 'text-slate-600'}`} />
                    </div>
                    <p className="text-3xl font-bold text-blue-400">
                      {stats.overview?.total_farmers?.toLocaleString() || 0}
                    </p>
                    <p className="text-xs text-slate-400">Producteurs</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-900/50 to-green-950/50 border-green-500/30">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Shield className="w-5 h-5 text-green-400" />
                      <Zap className={`w-4 h-4 ${connected ? 'text-green-400 animate-pulse' : 'text-slate-600'}`} />
                    </div>
                    <p className="text-3xl font-bold text-green-400">
                      {stats.overview?.total_ici_profiles?.toLocaleString() || 0}
                    </p>
                    <p className="text-xs text-slate-400">Profils ICI</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-900/50 to-purple-950/50 border-purple-500/30">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Eye className="w-5 h-5 text-purple-400" />
                      <Zap className={`w-4 h-4 ${connected ? 'text-green-400 animate-pulse' : 'text-slate-600'}`} />
                    </div>
                    <p className="text-3xl font-bold text-purple-400">
                      {stats.overview?.total_ssrte_visits?.toLocaleString() || 0}
                    </p>
                    <p className="text-xs text-slate-400">Visites SSRTE</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-red-900/50 to-red-950/50 border-red-500/30">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                      <Zap className={`w-4 h-4 ${connected ? 'text-green-400 animate-pulse' : 'text-slate-600'}`} />
                    </div>
                    <p className="text-3xl font-bold text-red-400">
                      {stats.alerts?.unresolved || 0}
                    </p>
                    <p className="text-xs text-slate-400">Alertes actives</p>
                  </CardContent>
                </Card>
              </div>

              {/* Alerts Summary */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Alert Severity Breakdown */}
                <Card className="bg-slate-900 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Bell className="w-5 h-5 text-red-400" />
                      Alertes par sévérité
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span className="text-slate-300">Critiques</span>
                      </div>
                      <span className="text-2xl font-bold text-red-400">
                        {stats.alerts?.critical || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                        <span className="text-slate-300">Hautes</span>
                      </div>
                      <span className="text-2xl font-bold text-orange-400">
                        {stats.alerts?.high || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <span className="text-slate-300">Nouvelles</span>
                      </div>
                      <span className="text-2xl font-bold text-yellow-400">
                        {stats.alerts?.new || 0}
                      </span>
                    </div>
                    <Progress 
                      value={stats.alerts?.unresolved > 0 ? 
                        (stats.alerts?.critical / stats.alerts?.unresolved) * 100 : 0} 
                      className="h-2 bg-slate-800"
                    />
                    <p className="text-xs text-slate-500 text-center">
                      {stats.alerts?.critical || 0} critiques sur {stats.alerts?.unresolved || 0} non résolues
                    </p>
                  </CardContent>
                </Card>

                {/* Risk Distribution */}
                <Card className="bg-slate-900 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-purple-400" />
                      Distribution des risques
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-red-400">Risque élevé</span>
                          <span className="text-red-400 font-bold">
                            {stats.risk_distribution?.high || 0} ({stats.risk_distribution?.high_percentage || 0}%)
                          </span>
                        </div>
                        <Progress 
                          value={stats.risk_distribution?.high_percentage || 0} 
                          className="h-3 bg-slate-800 [&>div]:bg-red-500"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-yellow-400">Risque modéré</span>
                          <span className="text-yellow-400 font-bold">
                            {stats.risk_distribution?.medium || 0}
                          </span>
                        </div>
                        <Progress 
                          value={
                            stats.overview?.total_ici_profiles > 0 ?
                            (stats.risk_distribution?.medium / stats.overview?.total_ici_profiles) * 100 : 0
                          } 
                          className="h-3 bg-slate-800 [&>div]:bg-yellow-500"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-green-400">Risque faible</span>
                          <span className="text-green-400 font-bold">
                            {stats.risk_distribution?.low || 0}
                          </span>
                        </div>
                        <Progress 
                          value={
                            stats.overview?.total_ici_profiles > 0 ?
                            (stats.risk_distribution?.low / stats.overview?.total_ici_profiles) * 100 : 0
                          } 
                          className="h-3 bg-slate-800 [&>div]:bg-green-500"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* SSRTE Coverage */}
              <Card className="bg-gradient-to-r from-slate-900 via-emerald-900/20 to-slate-900 border-emerald-500/30">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Eye className="w-5 h-5 text-emerald-400" />
                    Couverture SSRTE
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <p className="text-4xl font-bold text-emerald-400">
                        {stats.ssrte_coverage?.percentage || 0}%
                      </p>
                      <p className="text-slate-400">Taux de couverture</p>
                    </div>
                    <div className="text-center">
                      <p className="text-4xl font-bold text-white">
                        {stats.ssrte_coverage?.visited?.toLocaleString() || 0}
                      </p>
                      <p className="text-slate-400">Producteurs visités</p>
                    </div>
                    <div className="text-center">
                      <p className="text-4xl font-bold text-slate-400">
                        {stats.ssrte_coverage?.total?.toLocaleString() || 0}
                      </p>
                      <p className="text-slate-400">Total producteurs</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Progress 
                      value={stats.ssrte_coverage?.percentage || 0} 
                      className="h-4 bg-slate-800 [&>div]:bg-gradient-to-r [&>div]:from-emerald-500 [&>div]:to-green-400"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Connection Info */}
              {stats.connections && (
                <Card className="bg-slate-900/50 border-slate-800">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Activity className="w-5 h-5 text-green-400" />
                        <span className="text-slate-400">
                          {stats.connections.total_users} utilisateur(s) connecté(s) • 
                          {stats.connections.total_connections} connexion(s) active(s)
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {Object.entries(stats.connections.channels || {}).map(([channel, count]) => (
                          <Badge key={channel} variant="outline" className="border-slate-700">
                            {channel}: {count}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Recent Alerts Feed */}
          {recentAlerts.length > 0 && (
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Bell className="w-5 h-5 text-red-400 animate-pulse" />
                  Alertes récentes (flux temps réel)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recentAlerts.map((alert, index) => (
                    <div 
                      key={alert.id || index}
                      className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg animate-fade-in"
                    >
                      <div className={`w-2 h-2 rounded-full ${getSeverityColor(alert.severity)} animate-pulse`}></div>
                      <div className="flex-1">
                        <p className="text-white text-sm">{alert.message}</p>
                        <p className="text-slate-500 text-xs">
                          {alert.type?.replace('_', ' ')} • {formatTime(alert.created_at)}
                        </p>
                      </div>
                      <Badge className={getSeverityColor(alert.severity)}>
                        {alert.severity?.toUpperCase()}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Export Buttons */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Download className="w-5 h-5 text-green-400" />
                Télécharger les rapports PDF
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <Button 
                  className="bg-emerald-600 hover:bg-emerald-700 h-auto py-4"
                  onClick={() => downloadPDF('ici-complete')}
                >
                  <div className="text-left">
                    <p className="font-bold">Rapport ICI Complet</p>
                    <p className="text-xs text-emerald-200">Toutes les statistiques et analytics</p>
                  </div>
                </Button>
                <Button 
                  className="bg-red-600 hover:bg-red-700 h-auto py-4"
                  onClick={() => downloadPDF('ici-alerts')}
                >
                  <div className="text-left">
                    <p className="font-bold">Rapport Alertes</p>
                    <p className="text-xs text-red-200">Liste des alertes actives</p>
                  </div>
                </Button>
                <Button 
                  className="bg-purple-600 hover:bg-purple-700 h-auto py-4"
                  onClick={() => downloadPDF('ici-ssrte')}
                >
                  <div className="text-left">
                    <p className="font-bold">Rapport SSRTE</p>
                    <p className="text-xs text-purple-200">Historique des visites terrain</p>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RealTimeDashboard;

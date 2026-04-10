import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { ScrollArea } from '../../components/ui/scroll-area';
import { toast } from 'sonner';
import {
  AlertTriangle, Baby, Shield, Bell, Wifi, WifiOff,
  Clock, MapPin, User, Activity, Volume2, VolumeX,
  Maximize2, Minimize2, RefreshCw, Trash2
} from 'lucide-react';

const SSRTERealTimeDashboard = () => {
  const { token, user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState({ visits: 0, cases: 0, critical: 0 });
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const audioRef = useRef(null);

  // Initialiser le son d'alerte
  useEffect(() => {
    audioRef.current = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU' + 
      'FvT18AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const playAlertSound = useCallback(() => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }, [soundEnabled]);

  const connectWebSocket = useCallback(() => {
    if (!token) return;

    const API_URL = process.env.REACT_APP_BACKEND_URL;
    const wsUrl = API_URL.replace('https://', 'wss://').replace('http://', 'ws://');
    
    try {
      wsRef.current = new WebSocket(`${wsUrl}/ws/dashboard?token=${token}&channels=ssrte,alerts,stats`);

      wsRef.current.onopen = () => {
        setConnected(true);
        toast.success('Connecté au flux temps réel');
        // [WS] Connected to real-time dashboard');
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
        // [WS] Disconnected:', event.code, event.reason);
        
        // Reconnexion automatique après 5 secondes
        if (event.code !== 1000) {
          reconnectTimeoutRef.current = setTimeout(() => {
            // [WS] Attempting reconnection...');
            connectWebSocket();
          }, 5000);
        }
      };

      wsRef.current.onerror = (error) => {
        /* error logged */
        setConnected(false);
      };
    } catch (error) {
      /* error logged */
    }
  }, [token, handleWebSocketMessage]);

  const handleWebSocketMessage = useCallback((message) => {
    const { type, priority, data, timestamp } = message;

    switch (type) {
      case 'connection_established':
        // [WS] Connection confirmed');
        break;

      case 'ssrte_case_critical':
      case 'new_ssrte_case':
        // Nouvelle alerte cas SSRTE
        const caseAlert = {
          id: `case-${Date.now()}`,
          type: 'case',
          priority: priority || (data.severity_score >= 8 ? 'critical' : 'high'),
          title: data.severity_score >= 8 ? '🚨 CAS CRITIQUE' : '⚠️ Nouveau Cas',
          childName: data.child_name,
          childAge: data.child_age,
          memberName: data.member_name,
          laborType: data.labor_type,
          severityScore: data.severity_score,
          timestamp: timestamp || new Date().toISOString(),
          read: false
        };
        
        setAlerts(prev => [caseAlert, ...prev].slice(0, 50));
        setStats(prev => ({ 
          ...prev, 
          cases: prev.cases + 1,
          critical: data.severity_score >= 8 ? prev.critical + 1 : prev.critical
        }));
        
        // Notification toast et son
        if (data.severity_score >= 8) {
          playAlertSound();
          toast.error(`🚨 CAS CRITIQUE: ${data.child_name} (${data.child_age} ans)`, {
            duration: 10000,
            description: `Sévérité: ${data.severity_score}/10 - ${data.member_name}`
          });
        } else {
          toast.warning(`⚠️ Nouveau cas: ${data.child_name}`, {
            duration: 5000
          });
        }
        break;

      case 'new_ssrte_visit':
        // Nouvelle visite à risque
        if (priority === 'high' || data.children_at_risk > 0) {
          const visitAlert = {
            id: `visit-${Date.now()}`,
            type: 'visit',
            priority: 'high',
            title: '⚠️ Visite à Risque',
            memberName: data.member_name,
            childrenCount: data.children_count,
            childrenAtRisk: data.children_at_risk,
            agentName: data.agent_name,
            timestamp: timestamp || new Date().toISOString(),
            read: false
          };
          
          setAlerts(prev => [visitAlert, ...prev].slice(0, 50));
          setStats(prev => ({ ...prev, visits: prev.visits + 1 }));
          
          toast.warning(`Visite à risque: ${data.member_name}`, {
            description: `${data.children_at_risk} enfant(s) à risque détecté(s)`
          });
        }
        break;

      case 'stats_update':
        // Mise à jour des statistiques
        if (data) {
          setStats(prev => ({
            ...prev,
            ...data
          }));
        }
        break;

      case 'heartbeat':
        // Heartbeat - confirme que la connexion est active
        break;

      default:
        // [WS] Unknown message type:', type);
    }
  }, [playAlertSound]);

  useEffect(() => {
    connectWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounting');
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connectWebSocket]);

  const markAsRead = (alertId) => {
    setAlerts(prev => prev.map(a => 
      a.id === alertId ? { ...a, read: true } : a
    ));
  };

  const clearAlerts = () => {
    setAlerts([]);
    setStats({ visits: 0, cases: 0, critical: 0 });
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const getLaborTypeLabel = (type) => {
    const labels = {
      'worst_forms': 'Pire Forme',
      'hazardous': 'Dangereux',
      'light_work': 'Léger',
      'none': 'Aucun'
    };
    return labels[type] || type;
  };

  const unreadCount = alerts.filter(a => !a.read).length;

  return (
    <div 
      className={`min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 ${fullscreen ? 'fixed inset-0 z-50' : ''}`}
      data-testid="ssrte-realtime-dashboard"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-cyan-500" />
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white">
                Alertes SSRTE Temps Réel
              </h1>
              <p className="text-sm text-slate-400">
                Surveillance en direct des cas de travail des enfants
              </p>
            </div>
          </div>
          
          {/* Status connexion */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
            connected ? 'bg-emerald-900/50 border border-emerald-700/50' : 'bg-rose-900/50 border border-rose-700/50'
          }`}>
            {connected ? (
              <>
                <Wifi className="h-4 w-4 text-emerald-400" />
                <span className="text-emerald-400 text-sm font-medium">Connecté</span>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-rose-400" />
                <span className="text-rose-400 text-sm font-medium">Déconnecté</span>
              </>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={soundEnabled ? 'text-cyan-400' : 'text-slate-500'}
          >
            {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFullscreen(!fullscreen)}
            className="text-slate-400"
          >
            {fullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAlerts}
            className="text-slate-400"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={connectWebSocket}
            className="text-slate-400"
            disabled={connected}
          >
            <RefreshCw className={`h-5 w-5 ${!connected ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Session Active</p>
                <p className="text-2xl font-bold text-white">{alerts.length}</p>
              </div>
              <Bell className="h-8 w-8 text-cyan-500" />
            </div>
            <p className="text-xs text-cyan-400 mt-1">{unreadCount} non lu(s)</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Visites Risque</p>
                <p className="text-2xl font-bold text-orange-400">{stats.visits}</p>
              </div>
              <Activity className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Nouveaux Cas</p>
                <p className="text-2xl font-bold text-amber-400">{stats.cases}</p>
              </div>
              <Baby className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-rose-900/30 border-rose-700/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-rose-400">Cas Critiques</p>
                <p className="text-3xl font-bold text-rose-400">{stats.critical}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-rose-500 animate-pulse" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Feed */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-white flex items-center gap-2">
            <Bell className="h-5 w-5 text-cyan-500" />
            Flux d'Alertes en Direct
          </CardTitle>
          <CardDescription className="text-slate-400">
            Les alertes arrivent automatiquement - aucun rafraîchissement nécessaire
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] pr-4">
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Shield className="h-16 w-16 mb-4 opacity-30" />
                <p className="text-lg">En attente d'alertes...</p>
                <p className="text-sm mt-2">Les nouvelles alertes SSRTE apparaîtront ici en temps réel</p>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    onClick={() => markAsRead(alert.id)}
                    className={`p-4 rounded-lg border transition-all cursor-pointer ${
                      alert.priority === 'critical' 
                        ? 'bg-rose-900/30 border-rose-700/50 hover:bg-rose-900/50' 
                        : alert.priority === 'high'
                        ? 'bg-orange-900/20 border-orange-700/30 hover:bg-orange-900/40'
                        : 'bg-slate-700/30 border-slate-600/30 hover:bg-slate-700/50'
                    } ${!alert.read ? 'ring-2 ring-cyan-500/50' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {alert.type === 'case' ? (
                          <div className={`p-2 rounded-full ${
                            alert.severityScore >= 8 ? 'bg-rose-600' : 'bg-orange-600'
                          }`}>
                            <Baby className="h-5 w-5 text-white" />
                          </div>
                        ) : (
                          <div className="p-2 rounded-full bg-amber-600">
                            <AlertTriangle className="h-5 w-5 text-white" />
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{alert.title}</span>
                            {!alert.read && (
                              <Badge className="bg-cyan-600 text-xs">Nouveau</Badge>
                            )}
                          </div>
                          
                          {alert.type === 'case' ? (
                            <div className="mt-1">
                              <p className="text-white font-medium">
                                {alert.childName} ({alert.childAge} ans)
                              </p>
                              <p className="text-sm text-slate-400 flex items-center gap-2 mt-1">
                                <User className="h-3 w-3" />
                                {alert.memberName}
                              </p>
                              <div className="flex items-center gap-3 mt-2">
                                <Badge className={`${
                                  alert.laborType === 'worst_forms' ? 'bg-rose-600' :
                                  alert.laborType === 'hazardous' ? 'bg-orange-600' : 'bg-amber-600'
                                }`}>
                                  {getLaborTypeLabel(alert.laborType)}
                                </Badge>
                                <span className={`font-bold ${
                                  alert.severityScore >= 8 ? 'text-rose-400' : 
                                  alert.severityScore >= 5 ? 'text-orange-400' : 'text-amber-400'
                                }`}>
                                  Sévérité: {alert.severityScore}/10
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="mt-1">
                              <p className="text-white font-medium">{alert.memberName}</p>
                              <p className="text-sm text-slate-400 mt-1">
                                {alert.childrenAtRisk} enfant(s) à risque sur {alert.childrenCount}
                              </p>
                              {alert.agentName && (
                                <p className="text-xs text-slate-500 mt-1">
                                  Agent: {alert.agentName}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-slate-400 text-sm">
                          <Clock className="h-3 w-3" />
                          {formatTime(alert.timestamp)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default SSRTERealTimeDashboard;

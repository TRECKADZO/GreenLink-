import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import {
  MapPin, Users, Wifi, WifiOff, Battery, Navigation,
  RefreshCw, Maximize2, Minimize2, Filter, Clock,
  Activity, User, Building, AlertTriangle
} from 'lucide-react';

const AgentMapDashboard = () => {
  const { token, user } = useAuth();
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [stats, setStats] = useState({ online: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const wsRef = useRef(null);
  const mapRef = useRef(null);
  
  const API_URL = process.env.REACT_APP_BACKEND_URL;

  // Charger les positions des agents
  const loadAgents = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/agents/geo/agents`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { online_only: false }
      });
      setAgents(response.data);
      
      const online = response.data.filter(a => a.is_online).length;
      setStats({ online, total: response.data.length });
    } catch (error) {
      console.error('Error loading agents:', error);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API_URL, token]);

  // Connexion WebSocket pour mises à jour temps réel
  const connectWebSocket = useCallback(() => {
    if (!token) return;

    const wsUrl = API_URL.replace('https://', 'wss://').replace('http://', 'ws://');
    
    try {
      wsRef.current = new WebSocket(`${wsUrl}/ws/dashboard?token=${token}&channels=geo,alerts`);

      wsRef.current.onopen = () => {
        setConnected(true);
        toast.success('Carte connectée en temps réel');
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (e) {
          console.error('[WS] Parse error:', e);
        }
      };

      wsRef.current.onclose = () => {
        setConnected(false);
        // Reconnexion automatique
        setTimeout(connectWebSocket, 5000);
      };

      wsRef.current.onerror = () => {
        setConnected(false);
      };
    } catch (error) {
      console.error('[WS] Connection error:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API_URL, token]);

  const handleWebSocketMessage = useCallback((message) => {
    const { type, data } = message;

    if (type === 'agent_location_update') {
      // Mettre à jour la position de l'agent
      setAgents(prev => {
        const idx = prev.findIndex(a => a.agent_id === data.agent_id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx],
            latitude: data.latitude,
            longitude: data.longitude,
            accuracy: data.accuracy,
            battery_level: data.battery_level,
            is_online: true,
            last_update: data.timestamp
          };
          return updated;
        } else {
          // Nouvel agent
          return [...prev, {
            agent_id: data.agent_id,
            agent_name: data.agent_name,
            agent_type: data.agent_type,
            latitude: data.latitude,
            longitude: data.longitude,
            accuracy: data.accuracy,
            battery_level: data.battery_level,
            is_online: true,
            last_update: data.timestamp
          }];
        }
      });
      
      setStats(prev => ({ ...prev, online: prev.online + (prev.online === prev.total ? 0 : 1) }));
    }
    
    if (type === 'agent_offline') {
      setAgents(prev => prev.map(a => 
        a.agent_id === data.agent_id ? { ...a, is_online: false } : a
      ));
      setStats(prev => ({ ...prev, online: Math.max(0, prev.online - 1) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadAgents();
    connectWebSocket();
    
    // Rafraîchir toutes les 30 secondes
    const interval = setInterval(loadAgents, 30000);
    
    return () => {
      clearInterval(interval);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadAgents, connectWebSocket]);

  const getAgentTypeLabel = (type) => {
    const labels = {
      'field_agent': 'Agent Terrain',
      'carbon_auditor': 'Auditeur Carbone',
      'ssrte_agent': 'Agent SSRTE'
    };
    return labels[type] || type;
  };

  const getAgentTypeColor = (type) => {
    const colors = {
      'field_agent': 'bg-blue-500',
      'carbon_auditor': 'bg-emerald-500',
      'ssrte_agent': 'bg-cyan-500'
    };
    return colors[type] || 'bg-slate-500';
  };

  const getBatteryColor = (level) => {
    if (level === null || level === undefined) return 'text-slate-500';
    if (level >= 50) return 'text-emerald-500';
    if (level >= 20) return 'text-amber-500';
    return 'text-rose-500';
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatTimeSince = (timestamp) => {
    if (!timestamp) return 'N/A';
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    const diffMin = Math.floor(diffMs / 60000);
    
    if (diffMin < 1) return 'À l\'instant';
    if (diffMin < 60) return `Il y a ${diffMin} min`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    return `Il y a ${Math.floor(diffHours / 24)}j`;
  };

  const filteredAgents = agents.filter(a => {
    if (filterType === 'all') return true;
    if (filterType === 'online') return a.is_online;
    return a.agent_type === filterType;
  });

  // Centrer la carte sur la Côte d'Ivoire
  const mapCenter = { lat: 7.539989, lng: -5.547080 };

  return (
    <div 
      className={`min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 ${fullscreen ? 'fixed inset-0 z-50' : ''}`}
      data-testid="agent-map-dashboard"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-8 w-8 text-emerald-500" />
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white">
                Carte des Agents Terrain
              </h1>
              <p className="text-sm text-slate-400">
                Géolocalisation en temps réel
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
                <span className="text-emerald-400 text-sm font-medium">Live</span>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-rose-400" />
                <span className="text-rose-400 text-sm font-medium">Hors ligne</span>
              </>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px] bg-slate-800 border-slate-700 text-white">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filtrer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les agents</SelectItem>
              <SelectItem value="online">En ligne uniquement</SelectItem>
              <SelectItem value="field_agent">Agents Terrain</SelectItem>
              <SelectItem value="carbon_auditor">Auditeurs Carbone</SelectItem>
              <SelectItem value="ssrte_agent">Agents SSRTE</SelectItem>
            </SelectContent>
          </Select>
          
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
            onClick={loadAgents}
            className="text-slate-400"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Agents Suivis</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-emerald-900/30 border-emerald-700/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-400">En Ligne</p>
                <p className="text-2xl font-bold text-emerald-400">{stats.online}</p>
              </div>
              <Activity className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Hors Ligne</p>
                <p className="text-2xl font-bold text-slate-400">{stats.total - stats.online}</p>
              </div>
              <WifiOff className="h-8 w-8 text-slate-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Couverture</p>
                <p className="text-2xl font-bold text-white">
                  {stats.total > 0 ? Math.round((stats.online / stats.total) * 100) : 0}%
                </p>
              </div>
              <MapPin className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Map Container */}
        <div className="lg:col-span-2">
          <Card className="bg-slate-800/50 border-slate-700 h-[600px]">
            <CardContent className="p-0 h-full relative">
              {/* Placeholder Map - En production, intégrer Leaflet ou Mapbox */}
              <div 
                ref={mapRef}
                className="w-full h-full bg-slate-700 rounded-lg flex items-center justify-center relative overflow-hidden"
              >
                {/* Fond de carte stylisé */}
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute inset-0" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.2'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                  }} />
                </div>
                
                {/* Marqueurs des agents */}
                <div className="absolute inset-0 p-4">
                  <div className="relative w-full h-full">
                    {filteredAgents.map((agent, idx) => {
                      // Position relative pour simulation (à remplacer par vraies coordonnées)
                      const x = ((agent.longitude + 10) / 20) * 100;
                      const y = ((15 - agent.latitude) / 15) * 100;
                      
                      return (
                        <div
                          key={agent.agent_id}
                          className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all hover:scale-125 ${
                            selectedAgent?.agent_id === agent.agent_id ? 'scale-125 z-20' : 'z-10'
                          }`}
                          style={{ left: `${Math.min(95, Math.max(5, x))}%`, top: `${Math.min(95, Math.max(5, y))}%` }}
                          onClick={() => setSelectedAgent(agent)}
                        >
                          <div className={`relative`}>
                            <div className={`w-8 h-8 rounded-full ${getAgentTypeColor(agent.agent_type)} flex items-center justify-center shadow-lg ${
                              agent.is_online ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-800' : 'opacity-50'
                            }`}>
                              <User className="h-4 w-4 text-white" />
                            </div>
                            {agent.is_online && (
                              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {/* Légende */}
                <div className="absolute bottom-4 left-4 bg-slate-800/90 p-3 rounded-lg">
                  <p className="text-xs text-slate-400 mb-2">Légende</p>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span className="text-xs text-white">Agent Terrain</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                      <span className="text-xs text-white">Auditeur Carbone</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-cyan-500"></div>
                      <span className="text-xs text-white">Agent SSRTE</span>
                    </div>
                  </div>
                </div>
                
                {/* Note */}
                <div className="absolute top-4 right-4 bg-amber-900/80 px-3 py-2 rounded-lg">
                  <p className="text-xs text-amber-300 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Carte de simulation
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Agent List */}
        <div className="lg:col-span-1">
          <Card className="bg-slate-800/50 border-slate-700 h-[600px] flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                Agents ({filteredAgents.length})
              </CardTitle>
              <CardDescription className="text-slate-400">
                Cliquez sur un agent pour voir les détails
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              <div className="space-y-2">
                {filteredAgents.length === 0 ? (
                  <div className="text-center py-10 text-slate-400">
                    <MapPin className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p>Aucun agent trouvé</p>
                  </div>
                ) : (
                  filteredAgents.map((agent) => (
                    <div
                      key={agent.agent_id}
                      onClick={() => setSelectedAgent(agent)}
                      className={`p-3 rounded-lg cursor-pointer transition-all ${
                        selectedAgent?.agent_id === agent.agent_id 
                          ? 'bg-slate-600 ring-2 ring-emerald-500' 
                          : 'bg-slate-700/50 hover:bg-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full ${getAgentTypeColor(agent.agent_type)} flex items-center justify-center ${
                            !agent.is_online && 'opacity-50'
                          }`}>
                            <User className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="text-white font-medium">{agent.agent_name}</p>
                            <p className="text-xs text-slate-400">{getAgentTypeLabel(agent.agent_type)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {agent.is_online ? (
                            <Badge className="bg-emerald-600 text-xs">En ligne</Badge>
                          ) : (
                            <Badge className="bg-slate-600 text-xs">Hors ligne</Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-2 flex items-center gap-4 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTimeSince(agent.last_update)}
                        </span>
                        {agent.battery_level !== null && (
                          <span className={`flex items-center gap-1 ${getBatteryColor(agent.battery_level)}`}>
                            <Battery className="h-3 w-3" />
                            {agent.battery_level}%
                          </span>
                        )}
                        {agent.cooperative_name && (
                          <span className="flex items-center gap-1">
                            <Building className="h-3 w-3" />
                            {agent.cooperative_name}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Selected Agent Detail Modal */}
      {selectedAgent && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-30">
          <Card className="bg-slate-800 border-slate-700 shadow-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full ${getAgentTypeColor(selectedAgent.agent_type)} flex items-center justify-center`}>
                    <User className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-white">{selectedAgent.agent_name}</CardTitle>
                    <CardDescription className="text-slate-400">
                      {getAgentTypeLabel(selectedAgent.agent_type)}
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedAgent(null)}
                  className="text-slate-400"
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2 rounded bg-slate-700/50">
                    <p className="text-xs text-slate-400">Latitude</p>
                    <p className="text-white font-mono">{selectedAgent.latitude?.toFixed(6)}</p>
                  </div>
                  <div className="p-2 rounded bg-slate-700/50">
                    <p className="text-xs text-slate-400">Longitude</p>
                    <p className="text-white font-mono">{selectedAgent.longitude?.toFixed(6)}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-2 rounded bg-slate-700/50">
                  <span className="text-slate-400 text-sm">Statut</span>
                  {selectedAgent.is_online ? (
                    <Badge className="bg-emerald-600">En ligne</Badge>
                  ) : (
                    <Badge className="bg-slate-600">Hors ligne</Badge>
                  )}
                </div>
                
                <div className="flex items-center justify-between p-2 rounded bg-slate-700/50">
                  <span className="text-slate-400 text-sm">Dernière MAJ</span>
                  <span className="text-white">{formatTime(selectedAgent.last_update)}</span>
                </div>
                
                {selectedAgent.battery_level !== null && (
                  <div className="flex items-center justify-between p-2 rounded bg-slate-700/50">
                    <span className="text-slate-400 text-sm">Batterie</span>
                    <span className={`font-bold ${getBatteryColor(selectedAgent.battery_level)}`}>
                      {selectedAgent.battery_level}%
                    </span>
                  </div>
                )}
                
                {selectedAgent.accuracy && (
                  <div className="flex items-center justify-between p-2 rounded bg-slate-700/50">
                    <span className="text-slate-400 text-sm">Précision GPS</span>
                    <span className="text-white">±{Math.round(selectedAgent.accuracy)}m</span>
                  </div>
                )}
                
                {selectedAgent.cooperative_name && (
                  <div className="flex items-center justify-between p-2 rounded bg-slate-700/50">
                    <span className="text-slate-400 text-sm">Coopérative</span>
                    <span className="text-white">{selectedAgent.cooperative_name}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AgentMapDashboard;

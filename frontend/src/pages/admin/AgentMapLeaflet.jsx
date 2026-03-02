import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polygon, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';
import {
  MapPin, Users, Wifi, WifiOff, Battery,
  RefreshCw, Maximize2, Minimize2, Filter, Clock,
  Activity, User, Building, Layers, Map as MapIcon,
  Route, Bell, Send, AlertTriangle, Play, Pause, SkipBack, SkipForward, FastForward
} from 'lucide-react';

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icons by agent type
const createCustomIcon = (color, isOnline) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 3px solid ${isOnline ? '#10b981' : '#64748b'};
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        ${isOnline ? 'animation: pulse 2s infinite;' : 'opacity: 0.6;'}
      ">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
        </svg>
      </div>
      ${isOnline ? '<div style="position:absolute;top:-2px;right:-2px;width:10px;height:10px;background:#10b981;border-radius:50%;border:2px solid white;"></div>' : ''}
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
};

// Agent type colors
const agentColors = {
  'field_agent': '#3b82f6',     // Blue
  'carbon_auditor': '#10b981',  // Green
  'ssrte_agent': '#06b6d4',     // Cyan
  'admin': '#8b5cf6',           // Purple
  'cooperative': '#f59e0b'      // Amber
};

// Principales villes et régions de Côte d'Ivoire avec coordonnées
const ivoireRegions = [
  { name: 'Abidjan', lat: 5.3600, lng: -4.0083, type: 'capitale' },
  { name: 'Yamoussoukro', lat: 6.8276, lng: -5.2893, type: 'capitale_politique' },
  { name: 'Bouaké', lat: 7.6881, lng: -5.0308, type: 'ville' },
  { name: 'Daloa', lat: 6.8774, lng: -6.4502, type: 'ville' },
  { name: 'Korhogo', lat: 9.4580, lng: -5.6297, type: 'ville' },
  { name: 'San-Pédro', lat: 4.7392, lng: -6.6361, type: 'ville' },
  { name: 'Man', lat: 7.4125, lng: -7.5536, type: 'ville' },
  { name: 'Gagnoa', lat: 6.1319, lng: -5.9506, type: 'ville' },
  { name: 'Divo', lat: 5.8372, lng: -5.3572, type: 'ville' },
  { name: 'Soubré', lat: 5.7847, lng: -6.5931, type: 'ville' },
  { name: 'Abengourou', lat: 6.7297, lng: -3.4964, type: 'ville' },
  { name: 'Bondoukou', lat: 8.0400, lng: -2.8000, type: 'ville' },
  { name: 'Séguéla', lat: 7.9611, lng: -6.6731, type: 'ville' },
  { name: 'Odienné', lat: 9.5000, lng: -7.5667, type: 'ville' },
  { name: 'Sassandra', lat: 4.9500, lng: -6.0833, type: 'ville' }
];

// Component to handle map center updates
const MapController = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  return null;
};

const AgentMapLeaflet = () => {
  const { token, user } = useAuth();
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [stats, setStats] = useState({ online: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [mapCenter, setMapCenter] = useState([7.539989, -5.547080]); // Centre Côte d'Ivoire
  const [mapZoom, setMapZoom] = useState(7);
  const [showRegions, setShowRegions] = useState(true);
  const [showZones, setShowZones] = useState(true);
  const [coverageZones, setCoverageZones] = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);
  const [trajectories, setTrajectories] = useState([]);
  const [showTrajectories, setShowTrajectories] = useState(false);
  const [showProximityPanel, setShowProximityPanel] = useState(false);
  const [proximityRadius, setProximityRadius] = useState(10);
  const [proximityMessage, setProximityMessage] = useState('');
  
  // État pour le replay de trajectoire
  const [showReplayPanel, setShowReplayPanel] = useState(false);
  const [selectedTrajectory, setSelectedTrajectory] = useState(null);
  const [replayIndex, setReplayIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState(1); // 1x, 2x, 4x
  const replayIntervalRef = useRef(null);
  
  const wsRef = useRef(null);
  
  const API_URL = process.env.REACT_APP_BACKEND_URL;

  // Charger les trajectoires
  const loadTrajectories = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/agents/geo/trajectories`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { hours: 24 }
      });
      setTrajectories(response.data.trajectories || []);
    } catch (error) {
      console.error('Error loading trajectories:', error);
    }
  }, [API_URL, token]);

  // Charger les zones de couverture
  const loadCoverageZones = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/zones/coverage`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCoverageZones(response.data.zones || []);
    } catch (error) {
      console.error('Error loading coverage zones:', error);
    }
  }, [API_URL, token]);

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
  }, [API_URL, token]);

  // Connexion WebSocket
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
          if (message.type === 'agent_location_update') {
            const data = message.data;
            setAgents(prev => {
              const idx = prev.findIndex(a => a.agent_id === data.agent_id);
              if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = { ...updated[idx], ...data, is_online: true };
                return updated;
              }
              return [...prev, { ...data, is_online: true }];
            });
          }
          if (message.type === 'agent_offline') {
            setAgents(prev => prev.map(a => 
              a.agent_id === message.data.agent_id ? { ...a, is_online: false } : a
            ));
          }
        } catch (e) {
          console.error('[WS] Parse error:', e);
        }
      };

      wsRef.current.onclose = () => {
        setConnected(false);
        setTimeout(connectWebSocket, 5000);
      };

      wsRef.current.onerror = () => setConnected(false);
    } catch (error) {
      console.error('[WS] Connection error:', error);
    }
  }, [API_URL, token]);

  useEffect(() => {
    loadAgents();
    loadCoverageZones();
    loadTrajectories();
    connectWebSocket();
    const interval = setInterval(loadAgents, 30000);
    
    return () => {
      clearInterval(interval);
      if (wsRef.current) wsRef.current.close();
    };
  }, [loadAgents, loadCoverageZones, loadTrajectories, connectWebSocket]);

  const getAgentTypeLabel = (type) => {
    const labels = {
      'field_agent': 'Agent Terrain',
      'carbon_auditor': 'Auditeur Carbone',
      'ssrte_agent': 'Agent SSRTE',
      'admin': 'Administrateur',
      'cooperative': 'Coopérative'
    };
    return labels[type] || type;
  };

  const getBatteryColor = (level) => {
    if (level === null || level === undefined) return 'text-slate-500';
    if (level >= 50) return 'text-emerald-500';
    if (level >= 20) return 'text-amber-500';
    return 'text-rose-500';
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

  const centerOnAgent = (agent) => {
    setSelectedAgent(agent);
    setMapCenter([agent.latitude, agent.longitude]);
    setMapZoom(12);
  };

  // Envoyer une alerte de proximité
  const sendProximityAlert = async () => {
    if (!selectedAgent) {
      toast.error('Sélectionnez d\'abord un agent sur la carte');
      return;
    }
    
    try {
      const response = await axios.post(
        `${API_URL}/api/agents/geo/proximity/alert`,
        null,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            latitude: selectedAgent.latitude,
            longitude: selectedAgent.longitude,
            radius_km: proximityRadius,
            message: proximityMessage || `Alerte: Intervention requise près de ${selectedAgent.agent_name}`
          }
        }
      );
      
      if (response.data.success) {
        toast.success(`Alerte envoyée à ${response.data.agents_notified} agent(s)`);
        setShowProximityPanel(false);
        setProximityMessage('');
      }
    } catch (error) {
      console.error('Error sending proximity alert:', error);
      toast.error('Erreur lors de l\'envoi de l\'alerte');
    }
  };

  // Couleurs des trajectoires par agent
  const trajectoryColors = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
    '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'
  ];

  // ========== REPLAY FUNCTIONS ==========
  
  // Démarrer le replay d'une trajectoire
  const startReplay = (trajectory) => {
    setSelectedTrajectory(trajectory);
    setReplayIndex(0);
    setShowReplayPanel(true);
    setIsPlaying(false);
    if (trajectory.polyline && trajectory.polyline.length > 0) {
      setMapCenter(trajectory.polyline[0]);
      setMapZoom(13);
    }
    toast.info(`Mode replay activé pour ${trajectory.agent_name}`);
  };

  // Jouer/Pause le replay
  const togglePlayPause = () => {
    if (!selectedTrajectory || !selectedTrajectory.polyline) return;
    
    if (isPlaying) {
      // Pause
      if (replayIntervalRef.current) {
        clearInterval(replayIntervalRef.current);
        replayIntervalRef.current = null;
      }
      setIsPlaying(false);
    } else {
      // Play
      setIsPlaying(true);
      const interval = 1000 / replaySpeed; // Ajuster selon la vitesse
      
      replayIntervalRef.current = setInterval(() => {
        setReplayIndex(prev => {
          const nextIndex = prev + 1;
          if (nextIndex >= selectedTrajectory.polyline.length) {
            clearInterval(replayIntervalRef.current);
            replayIntervalRef.current = null;
            setIsPlaying(false);
            toast.success('Replay terminé');
            return prev;
          }
          // Centrer la carte sur la position actuelle
          if (selectedTrajectory.polyline[nextIndex]) {
            setMapCenter(selectedTrajectory.polyline[nextIndex]);
          }
          return nextIndex;
        });
      }, interval);
    }
  };

  // Arrêter le replay
  const stopReplay = () => {
    if (replayIntervalRef.current) {
      clearInterval(replayIntervalRef.current);
      replayIntervalRef.current = null;
    }
    setIsPlaying(false);
    setShowReplayPanel(false);
    setSelectedTrajectory(null);
    setReplayIndex(0);
    setMapZoom(7);
    setMapCenter([7.539989, -5.547080]);
  };

  // Changer la vitesse de replay
  const cycleSpeed = () => {
    const speeds = [1, 2, 4];
    const currentIdx = speeds.indexOf(replaySpeed);
    const nextSpeed = speeds[(currentIdx + 1) % speeds.length];
    setReplaySpeed(nextSpeed);
    
    // Si en cours de lecture, redémarrer avec la nouvelle vitesse
    if (isPlaying && replayIntervalRef.current) {
      clearInterval(replayIntervalRef.current);
      const interval = 1000 / nextSpeed;
      replayIntervalRef.current = setInterval(() => {
        setReplayIndex(prev => {
          const nextIndex = prev + 1;
          if (nextIndex >= selectedTrajectory.polyline.length) {
            clearInterval(replayIntervalRef.current);
            replayIntervalRef.current = null;
            setIsPlaying(false);
            return prev;
          }
          if (selectedTrajectory.polyline[nextIndex]) {
            setMapCenter(selectedTrajectory.polyline[nextIndex]);
          }
          return nextIndex;
        });
      }, interval);
    }
  };

  // Aller à un point spécifique
  const goToPoint = (index) => {
    if (!selectedTrajectory || !selectedTrajectory.polyline) return;
    const clampedIndex = Math.max(0, Math.min(index, selectedTrajectory.polyline.length - 1));
    setReplayIndex(clampedIndex);
    if (selectedTrajectory.polyline[clampedIndex]) {
      setMapCenter(selectedTrajectory.polyline[clampedIndex]);
    }
  };

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (replayIntervalRef.current) {
        clearInterval(replayIntervalRef.current);
      }
    };
  }, []);

  // ========== END REPLAY FUNCTIONS ==========

  return (
    <div 
      className={`min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 ${fullscreen ? 'fixed inset-0 z-50' : ''}`}
      data-testid="agent-map-leaflet"
    >
      {/* Inject CSS for marker animation */}
      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        @keyframes replayPulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
          50% { transform: scale(1.1); }
          70% { box-shadow: 0 0 0 15px rgba(59, 130, 246, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
        .leaflet-container { background: #1e293b; border-radius: 0.5rem; }
        .replay-marker { z-index: 1000 !important; }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-8 w-8 text-emerald-500" />
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white">
                Carte des Agents - Côte d'Ivoire
              </h1>
              <p className="text-sm text-slate-400">
                Géolocalisation temps réel sur carte OpenStreetMap
              </p>
            </div>
          </div>
          
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

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setShowTrajectories(!showTrajectories); if (!showTrajectories) loadTrajectories(); }}
            className={showTrajectories ? 'text-orange-400' : 'text-slate-400'}
            title="Trajectoires 24h"
          >
            <Route className="h-5 w-5" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowProximityPanel(!showProximityPanel)}
            className={showProximityPanel ? 'text-rose-400' : 'text-slate-400'}
            title="Alerte de proximité"
          >
            <Bell className="h-5 w-5" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowZones(!showZones)}
            className={showZones ? 'text-emerald-400' : 'text-slate-400'}
            title="Zones de couverture"
          >
            <MapIcon className="h-5 w-5" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowRegions(!showRegions)}
            className={showRegions ? 'text-blue-400' : 'text-slate-400'}
            title="Villes de référence"
          >
            <Layers className="h-5 w-5" />
          </Button>
          
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
          
          <Button variant="ghost" size="sm" onClick={() => setFullscreen(!fullscreen)} className="text-slate-400">
            {fullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
          </Button>
          
          <Button variant="ghost" size="sm" onClick={() => { loadAgents(); loadCoverageZones(); }} className="text-slate-400">
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
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
                <p className="text-xs text-slate-400">Zones</p>
                <p className="text-2xl font-bold text-amber-400">{coverageZones.length}</p>
              </div>
              <MapIcon className="h-8 w-8 text-amber-500" />
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
              <MapPin className="h-8 w-8 text-cyan-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Map & Agent List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Map */}
        <div className="lg:col-span-2">
          <Card className="bg-slate-800/50 border-slate-700 overflow-hidden">
            <CardContent className="p-0 h-[600px]">
              <MapContainer
                center={mapCenter}
                zoom={mapZoom}
                style={{ height: '100%', width: '100%' }}
                zoomControl={true}
              >
                <MapController center={mapCenter} zoom={mapZoom} />
                
                {/* OpenStreetMap Tiles */}
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {/* Villes de référence */}
                {showRegions && ivoireRegions.map((region, idx) => (
                  <Circle
                    key={idx}
                    center={[region.lat, region.lng]}
                    radius={region.type === 'capitale' ? 15000 : region.type === 'capitale_politique' ? 12000 : 8000}
                    pathOptions={{
                      color: region.type === 'capitale' ? '#f59e0b' : region.type === 'capitale_politique' ? '#8b5cf6' : '#64748b',
                      fillColor: region.type === 'capitale' ? '#f59e0b' : region.type === 'capitale_politique' ? '#8b5cf6' : '#64748b',
                      fillOpacity: 0.1,
                      weight: 1
                    }}
                  >
                    <Popup>
                      <div className="text-center">
                        <strong>{region.name}</strong>
                        <br />
                        <span className="text-xs text-gray-500">
                          {region.type === 'capitale' ? 'Capitale économique' : 
                           region.type === 'capitale_politique' ? 'Capitale politique' : 'Ville'}
                        </span>
                      </div>
                    </Popup>
                  </Circle>
                ))}
                
                {/* Zones de couverture des coopératives */}
                {showZones && coverageZones.map((zone, idx) => (
                  <Polygon
                    key={`zone-${idx}`}
                    positions={zone.coordinates.map(c => [c.lat, c.lng])}
                    pathOptions={{
                      color: zone.color,
                      fillColor: zone.color,
                      fillOpacity: selectedZone?.name === zone.name ? 0.4 : 0.2,
                      weight: selectedZone?.name === zone.name ? 3 : 2,
                      dashArray: zone.cooperative_id ? null : '5, 5'
                    }}
                    eventHandlers={{
                      click: () => setSelectedZone(zone),
                      mouseover: (e) => e.target.setStyle({ fillOpacity: 0.4 }),
                      mouseout: (e) => e.target.setStyle({ fillOpacity: selectedZone?.name === zone.name ? 0.4 : 0.2 })
                    }}
                  >
                    <Popup>
                      <div className="min-w-[220px]">
                        <div className="font-bold text-lg" style={{ color: zone.color }}>{zone.name}</div>
                        <div className="text-sm text-gray-600">{zone.region} • {zone.department}</div>
                        <hr className="my-2" />
                        {zone.cooperative_name ? (
                          <div className="text-sm">
                            <div className="flex items-center gap-1 mb-1">
                              <Building className="h-3 w-3" />
                              <strong>{zone.cooperative_name}</strong>
                            </div>
                            <div className="text-xs text-gray-500 space-y-1">
                              <div>👨‍🌾 {zone.farmers_count || 0} producteurs</div>
                              <div>👷 {zone.agents_count || 0} agents terrain</div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-orange-600 italic">
                            Zone non assignée
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Polygon>
                ))}
                
                {/* Trajectoires des agents (24h) */}
                {showTrajectories && trajectories.map((traj, idx) => (
                  <Polyline
                    key={`traj-${traj.agent_id}`}
                    positions={traj.polyline}
                    pathOptions={{
                      color: trajectoryColors[idx % trajectoryColors.length],
                      weight: 3,
                      opacity: selectedTrajectory?.agent_id === traj.agent_id ? 1 : 0.5,
                      dashArray: null
                    }}
                  >
                    <Popup>
                      <div className="min-w-[200px]">
                        <div className="font-bold">{traj.agent_name}</div>
                        <div className="text-xs text-gray-600">{traj.agent_type}</div>
                        <hr className="my-1" />
                        <div className="text-xs space-y-1">
                          <div>📍 {traj.points_count} points</div>
                          <div>📏 {traj.total_distance_km} km parcourus</div>
                          <div>🕐 Dernières 24h</div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); startReplay(traj); }}
                          className="mt-2 w-full flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                        >
                          <Play className="h-3 w-3" />
                          Replay du parcours
                        </button>
                      </div>
                    </Popup>
                  </Polyline>
                ))}
                
                {/* Marqueur de position actuelle pendant le replay */}
                {showReplayPanel && selectedTrajectory && selectedTrajectory.polyline && selectedTrajectory.polyline[replayIndex] && (
                  <Marker
                    position={selectedTrajectory.polyline[replayIndex]}
                    icon={L.divIcon({
                      className: 'replay-marker',
                      html: `
                        <div style="
                          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
                          width: 24px;
                          height: 24px;
                          border-radius: 50%;
                          border: 3px solid white;
                          box-shadow: 0 4px 15px rgba(59, 130, 246, 0.5);
                          animation: replayPulse 1s infinite;
                        "></div>
                      `,
                      iconSize: [24, 24],
                      iconAnchor: [12, 12]
                    })}
                  >
                    <Popup>
                      <div className="text-xs">
                        <strong>Position {replayIndex + 1}/{selectedTrajectory.polyline.length}</strong>
                        <div className="text-gray-500">
                          {selectedTrajectory.polyline[replayIndex][0].toFixed(4)}, {selectedTrajectory.polyline[replayIndex][1].toFixed(4)}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                )}
                
                {/* Ligne de trajectoire partielle pendant le replay (portion déjà parcourue) */}
                {showReplayPanel && selectedTrajectory && selectedTrajectory.polyline && replayIndex > 0 && (
                  <Polyline
                    positions={selectedTrajectory.polyline.slice(0, replayIndex + 1)}
                    pathOptions={{
                      color: '#22c55e',
                      weight: 4,
                      opacity: 1,
                      dashArray: null
                    }}
                  />
                )}
                
                {/* Cercle de rayon de proximité si panel ouvert */}
                {showProximityPanel && selectedAgent && (
                  <Circle
                    center={[selectedAgent.latitude, selectedAgent.longitude]}
                    radius={proximityRadius * 1000}
                    pathOptions={{
                      color: '#ef4444',
                      fillColor: '#ef4444',
                      fillOpacity: 0.1,
                      weight: 2,
                      dashArray: '5, 5'
                    }}
                  />
                )}
                
                {/* Marqueurs des agents */}
                {filteredAgents.map((agent) => (
                  <Marker
                    key={agent.agent_id}
                    position={[agent.latitude, agent.longitude]}
                    icon={createCustomIcon(agentColors[agent.agent_type] || '#64748b', agent.is_online)}
                    eventHandlers={{
                      click: () => setSelectedAgent(agent)
                    }}
                  >
                    <Popup>
                      <div className="min-w-[200px]">
                        <div className="font-bold text-lg">{agent.agent_name}</div>
                        <div className="text-sm text-gray-600">{getAgentTypeLabel(agent.agent_type)}</div>
                        <hr className="my-2" />
                        <div className="text-xs space-y-1">
                          <div><strong>Statut:</strong> {agent.is_online ? '🟢 En ligne' : '🔴 Hors ligne'}</div>
                          <div><strong>Position:</strong> {agent.latitude.toFixed(4)}, {agent.longitude.toFixed(4)}</div>
                          {agent.battery_level && <div><strong>Batterie:</strong> {agent.battery_level}%</div>}
                          {agent.accuracy && <div><strong>Précision:</strong> ±{Math.round(agent.accuracy)}m</div>}
                          <div><strong>MAJ:</strong> {formatTimeSince(agent.last_update)}</div>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </CardContent>
          </Card>
          
          {/* Légende */}
          <div className="mt-2 flex flex-wrap gap-4 bg-slate-800/50 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-blue-500"></div>
              <span className="text-xs text-slate-300">Agent Terrain</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-emerald-500"></div>
              <span className="text-xs text-slate-300">Auditeur Carbone</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-cyan-500"></div>
              <span className="text-xs text-slate-300">Agent SSRTE</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-emerald-500 bg-transparent"></div>
              <span className="text-xs text-slate-300">En ligne</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-slate-500 bg-transparent opacity-50"></div>
              <span className="text-xs text-slate-300">Hors ligne</span>
            </div>
            <div className="border-l border-slate-600 pl-4 ml-2">
              <span className="text-xs text-slate-400">Zones:</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-emerald-500/30 border border-emerald-500"></div>
              <span className="text-xs text-slate-300">Assignée</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border border-dashed border-slate-400"></div>
              <span className="text-xs text-slate-300">Non assignée</span>
            </div>
          </div>
          
          {/* Zone info on hover */}
          {selectedZone && (
            <div className="mt-2 p-2 rounded bg-slate-700/80">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: selectedZone.color }}></div>
                <span className="text-sm text-white font-medium">{selectedZone.name}</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {selectedZone.cooperative_name || 'Non assignée'} • {selectedZone.farmers_count || 0} producteurs
              </p>
            </div>
          )}
        </div>

        {/* Agent List */}
        <div className="lg:col-span-1">
          <Card className="bg-slate-800/50 border-slate-700 h-[650px] flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                Agents ({filteredAgents.length})
              </CardTitle>
              <CardDescription className="text-slate-400">
                Cliquez pour centrer sur la carte
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
                      onClick={() => centerOnAgent(agent)}
                      className={`p-3 rounded-lg cursor-pointer transition-all ${
                        selectedAgent?.agent_id === agent.agent_id 
                          ? 'bg-slate-600 ring-2 ring-emerald-500' 
                          : 'bg-slate-700/50 hover:bg-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center"
                            style={{ 
                              backgroundColor: agentColors[agent.agent_type] || '#64748b',
                              opacity: agent.is_online ? 1 : 0.5
                            }}
                          >
                            <User className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="text-white font-medium">{agent.agent_name}</p>
                            <p className="text-xs text-slate-400">{getAgentTypeLabel(agent.agent_type)}</p>
                          </div>
                        </div>
                        {agent.is_online ? (
                          <Badge className="bg-emerald-600 text-xs">En ligne</Badge>
                        ) : (
                          <Badge className="bg-slate-600 text-xs">Hors ligne</Badge>
                        )}
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
                      </div>
                      
                      <div className="mt-1 text-xs text-slate-500 font-mono">
                        {agent.latitude.toFixed(4)}, {agent.longitude.toFixed(4)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Panel Alerte de Proximité */}
      {showProximityPanel && (
        <div className="fixed bottom-4 left-4 z-30 w-80">
          <Card className="bg-slate-800 border-slate-700 shadow-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-rose-500" />
                  Alerte de Proximité
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowProximityPanel(false)}
                  className="text-slate-400"
                >
                  ✕
                </Button>
              </div>
              <CardDescription className="text-slate-400">
                Envoyer une alerte à tous les agents dans un rayon
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedAgent ? (
                <div className="text-center py-4 text-slate-400">
                  <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Sélectionnez un agent sur la carte comme centre de l'alerte</p>
                </div>
              ) : (
                <>
                  <div className="p-2 rounded bg-slate-700/50">
                    <p className="text-xs text-slate-400">Centre de l'alerte</p>
                    <p className="text-white font-medium">{selectedAgent.agent_name}</p>
                    <p className="text-xs text-slate-500 font-mono">
                      {selectedAgent.latitude.toFixed(4)}, {selectedAgent.longitude.toFixed(4)}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm text-slate-400">Rayon (km)</label>
                    <Input
                      type="number"
                      value={proximityRadius}
                      onChange={(e) => setProximityRadius(Number(e.target.value))}
                      min={1}
                      max={100}
                      className="bg-slate-700 border-slate-600 text-white mt-1"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm text-slate-400">Message (optionnel)</label>
                    <Input
                      value={proximityMessage}
                      onChange={(e) => setProximityMessage(e.target.value)}
                      placeholder="Intervention urgente requise..."
                      className="bg-slate-700 border-slate-600 text-white mt-1"
                    />
                  </div>
                  
                  <Button
                    onClick={sendProximityAlert}
                    className="w-full bg-rose-600 hover:bg-rose-700"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Envoyer l'alerte
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Panel de Contrôle du Replay */}
      {showReplayPanel && selectedTrajectory && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-40 w-[90%] max-w-2xl">
          <Card className="bg-slate-800/95 border-slate-700 shadow-2xl backdrop-blur-sm">
            <CardContent className="p-4">
              {/* Header du replay */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: trajectoryColors[trajectories.findIndex(t => t.agent_id === selectedTrajectory.agent_id) % trajectoryColors.length] || '#3b82f6' }}
                  >
                    <Route className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{selectedTrajectory.agent_name}</p>
                    <p className="text-xs text-slate-400">
                      {selectedTrajectory.total_distance_km} km • {selectedTrajectory.points_count} points
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-600">
                    Replay {replaySpeed}x
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={stopReplay}
                    className="text-slate-400 hover:text-white"
                  >
                    ✕
                  </Button>
                </div>
              </div>

              {/* Barre de progression */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span>Point {replayIndex + 1} / {selectedTrajectory.polyline?.length || 0}</span>
                  <span>
                    {selectedTrajectory.polyline?.length > 0 
                      ? Math.round((replayIndex / (selectedTrajectory.polyline.length - 1)) * 100) 
                      : 0}%
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="range"
                    min={0}
                    max={(selectedTrajectory.polyline?.length || 1) - 1}
                    value={replayIndex}
                    onChange={(e) => goToPoint(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    style={{
                      background: `linear-gradient(to right, #22c55e 0%, #22c55e ${(replayIndex / ((selectedTrajectory.polyline?.length || 1) - 1)) * 100}%, #334155 ${(replayIndex / ((selectedTrajectory.polyline?.length || 1) - 1)) * 100}%, #334155 100%)`
                    }}
                  />
                </div>
              </div>

              {/* Contrôles de lecture */}
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => goToPoint(0)}
                  className="text-slate-400 hover:text-white"
                  title="Début"
                >
                  <SkipBack className="h-5 w-5" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => goToPoint(Math.max(0, replayIndex - 5))}
                  className="text-slate-400 hover:text-white"
                  title="-5 points"
                >
                  <FastForward className="h-5 w-5 rotate-180" />
                </Button>
                
                <Button
                  onClick={togglePlayPause}
                  className={`w-14 h-14 rounded-full ${isPlaying ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  {isPlaying ? (
                    <Pause className="h-6 w-6 text-white" />
                  ) : (
                    <Play className="h-6 w-6 text-white ml-1" />
                  )}
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => goToPoint(Math.min((selectedTrajectory.polyline?.length || 1) - 1, replayIndex + 5))}
                  className="text-slate-400 hover:text-white"
                  title="+5 points"
                >
                  <FastForward className="h-5 w-5" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => goToPoint((selectedTrajectory.polyline?.length || 1) - 1)}
                  className="text-slate-400 hover:text-white"
                  title="Fin"
                >
                  <SkipForward className="h-5 w-5" />
                </Button>
                
                <div className="border-l border-slate-600 pl-2 ml-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={cycleSpeed}
                    className="text-slate-400 hover:text-white font-mono"
                    title="Changer la vitesse"
                  >
                    {replaySpeed}x
                  </Button>
                </div>
              </div>

              {/* Coordonnées actuelles */}
              {selectedTrajectory.polyline && selectedTrajectory.polyline[replayIndex] && (
                <div className="mt-3 text-center">
                  <p className="text-xs text-slate-500 font-mono">
                    📍 {selectedTrajectory.polyline[replayIndex][0].toFixed(5)}, {selectedTrajectory.polyline[replayIndex][1].toFixed(5)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AgentMapLeaflet;

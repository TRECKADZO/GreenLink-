import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User, MapPin, Phone, FileText, Shield, Clock, Leaf, AlertTriangle, ChevronRight, Activity, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import Navbar from '../../components/Navbar';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const AgentTerrainDashboard = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [searching, setSearching] = useState(false);
  const [farmer, setFarmer] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [showDetails, setShowDetails] = useState(false);
  const [farmerDetails, setFarmerDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const res = await fetch(`${API_URL}/api/agent/dashboard/stats`, { headers: getAuthHeader() });
      if (res.ok) setStats(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoadingStats(false); }
  }, []);

  const loadAuditLogs = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/agent/audit-logs?limit=10`, { headers: getAuthHeader() });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
      }
    } catch (e) { console.error(e); }
  }, []);

  React.useEffect(() => {
    loadStats();
    loadAuditLogs();
  }, [loadStats, loadAuditLogs]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!phone.trim()) {
      toast.error('Veuillez saisir un numéro de téléphone');
      return;
    }

    setSearching(true);
    setFarmer(null);
    setNotFound(false);
    setShowDetails(false);

    try {
      const res = await fetch(`${API_URL}/api/agent/search?phone=${encodeURIComponent(phone.trim())}`, {
        headers: getAuthHeader()
      });

      if (res.status === 403) {
        toast.error('Accès non autorisé. Seuls les agents terrain peuvent effectuer cette recherche.');
        return;
      }

      const data = await res.json();
      if (data.found) {
        setFarmer(data.farmer);
        toast.success(`Planteur trouvé: ${data.farmer.full_name}`);
        loadAuditLogs();
      } else {
        setNotFound(true);
        toast.error(data.message || 'Aucun planteur trouvé');
      }
    } catch (error) {
      toast.error('Erreur de connexion au serveur');
    } finally {
      setSearching(false);
    }
  };

  const viewFullDetails = async (farmerId) => {
    setLoadingDetails(true);
    try {
      const res = await fetch(`${API_URL}/api/agent/farmer/${farmerId}/details`, {
        headers: getAuthHeader()
      });
      if (res.ok) {
        setFarmerDetails(await res.json());
        setShowDetails(true);
      } else {
        toast.error('Impossible de charger la fiche complète');
      }
    } catch (e) {
      toast.error('Erreur réseau');
    } finally {
      setLoadingDetails(false);
    }
  };

  const verificationColor = (status) => {
    switch(status) {
      case 'verified': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'needs_correction': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const verificationLabel = (status) => {
    switch(status) {
      case 'verified': return 'Vérifiée';
      case 'rejected': return 'Rejetée';
      case 'needs_correction': return 'Correction requise';
      default: return 'En attente';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950" data-testid="agent-terrain-dashboard">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Shield className="w-6 h-6 text-emerald-400" />
              Recherche Agent Terrain
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Recherchez un planteur par son numéro de téléphone
            </p>
          </div>
          {stats && (
            <div className="hidden md:flex items-center gap-3">
              <div className="text-center px-3 py-1 bg-slate-800 rounded-lg">
                <p className="text-emerald-400 font-bold text-lg">{stats.farmers_in_zone}</p>
                <p className="text-slate-500 text-xs">Planteurs</p>
              </div>
              <div className="text-center px-3 py-1 bg-slate-800 rounded-lg">
                <p className="text-blue-400 font-bold text-lg">{stats.total_searches}</p>
                <p className="text-slate-500 text-xs">Recherches</p>
              </div>
            </div>
          )}
        </div>

        {/* Search Bar */}
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <form onSubmit={handleSearch} className="flex gap-3" data-testid="agent-search-form">
              <div className="relative flex-1">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  data-testid="agent-search-input"
                  placeholder="Numéro de téléphone (ex: 0701234567)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 h-12 text-base"
                />
              </div>
              <Button
                data-testid="agent-search-button"
                type="submit"
                disabled={searching}
                className="bg-emerald-600 hover:bg-emerald-700 h-12 px-6"
              >
                <Search className="w-4 h-4 mr-2" />
                {searching ? 'Recherche...' : 'Rechercher'}
              </Button>
            </form>
            <p className="text-slate-600 text-xs mt-2 flex items-center gap-1">
              <Shield className="w-3 h-3" />
              Accès sécurisé - Chaque recherche est enregistrée pour audit SSRTE
            </p>
          </CardContent>
        </Card>

        {/* Not found */}
        {notFound && (
          <Card className="bg-slate-900 border-amber-800/50" data-testid="search-not-found">
            <CardContent className="p-6 text-center">
              <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
              <p className="text-white font-medium">Aucun planteur trouvé</p>
              <p className="text-slate-400 text-sm mt-1">
                Ce numéro n'existe pas dans votre périmètre de couverture
              </p>
            </CardContent>
          </Card>
        )}

        {/* Farmer Result */}
        {farmer && !showDetails && (
          <Card className="bg-slate-900 border-emerald-800/50" data-testid="farmer-result-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <User className="w-5 h-5 text-emerald-400" />
                  {farmer.full_name}
                </CardTitle>
                <Badge className={farmer.is_active ? 'bg-emerald-900 text-emerald-300' : 'bg-red-900 text-red-300'}>
                  {farmer.is_active ? 'Actif' : 'Inactif'}
                </Badge>
              </div>
              <CardDescription className="text-slate-400">
                {farmer.cooperative_name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <InfoItem icon={Phone} label="Téléphone" value={farmer.phone_number} />
                <InfoItem icon={MapPin} label="Village" value={farmer.village || 'Non renseigné'} />
                <InfoItem icon={FileText} label="CNI" value={farmer.cni_number || 'Non renseigné'} />
                <InfoItem icon={Leaf} label="Parcelles" value={`${farmer.parcels_count} parcelle(s)`} />
                <InfoItem icon={MapPin} label="Superficie" value={`${farmer.total_hectares} ha`} />
                <InfoItem icon={Shield} label="Consentement" value={farmer.consent_given ? 'Donné' : 'Non donné'} />
              </div>

              {/* Parcels summary */}
              {farmer.parcels && farmer.parcels.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-slate-300 text-sm font-semibold mb-2 flex items-center gap-2">
                    <Leaf className="w-4 h-4 text-emerald-400" />
                    Parcelles ({farmer.parcels.length})
                  </h3>
                  <div className="space-y-2">
                    {farmer.parcels.slice(0, 3).map((p) => (
                      <div key={p.id} className="flex items-center justify-between bg-slate-800 rounded-lg p-3">
                        <div>
                          <p className="text-white text-sm">{p.village || p.location}</p>
                          <p className="text-slate-500 text-xs">{p.area_hectares} ha - {p.crop_type}</p>
                        </div>
                        <Badge className={verificationColor(p.verification_status)}>
                          {verificationLabel(p.verification_status)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                data-testid="view-full-details-button"
                className="w-full bg-emerald-600 hover:bg-emerald-700 mt-3"
                onClick={() => viewFullDetails(farmer.id)}
                disabled={loadingDetails}
              >
                <Eye className="w-4 h-4 mr-2" />
                {loadingDetails ? 'Chargement...' : 'Voir la fiche complète'}
                <ChevronRight className="w-4 h-4 ml-auto" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Full Details View */}
        {showDetails && farmerDetails && (
          <div className="space-y-4" data-testid="farmer-full-details">
            <Button
              variant="ghost"
              className="text-slate-400 hover:text-white"
              onClick={() => setShowDetails(false)}
            >
              Retour aux résultats
            </Button>

            {/* Header card */}
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white">{farmerDetails.full_name}</h2>
                    <p className="text-emerald-400 text-sm">{farmerDetails.cooperative_name}</p>
                    <p className="text-slate-500 text-xs mt-1">ID: {farmerDetails.id}</p>
                  </div>
                  <Badge className={farmerDetails.status === 'active' ? 'bg-emerald-900 text-emerald-300' : 'bg-amber-900 text-amber-300'}>
                    {farmerDetails.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <InfoItem icon={Phone} label="Téléphone" value={farmerDetails.phone_number} />
                  <InfoItem icon={MapPin} label="Village" value={farmerDetails.village} />
                  <InfoItem icon={FileText} label="Département" value={farmerDetails.department || 'N/A'} />
                  <InfoItem icon={Shield} label="CNI" value={farmerDetails.cni_number || 'N/A'} />
                </div>
              </CardContent>
            </Card>

            {/* Stats KPI */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Parcelles" value={farmerDetails.parcels_count} color="text-emerald-400" />
              <StatCard label="Superficie" value={`${farmerDetails.total_hectares} ha`} color="text-blue-400" />
              <StatCard label="Prime totale" value={`${farmerDetails.total_premium_earned} FCFA`} color="text-amber-400" />
              <StatCard label="Visites SSRTE" value={farmerDetails.ssrte_visits_count} color="text-purple-400" />
            </div>

            {/* Parcels */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Leaf className="w-4 h-4 text-emerald-400" />
                  Parcelles ({farmerDetails.parcels?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {farmerDetails.parcels?.length > 0 ? farmerDetails.parcels.map((p) => (
                  <div key={p.id} className="bg-slate-800 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm font-medium">{p.village || p.location}</p>
                      <p className="text-slate-500 text-xs">{p.area_hectares} ha - {p.crop_type} | CO2: {p.co2_captured_tonnes}t</p>
                      {p.gps_coordinates && (
                        <p className="text-slate-600 text-xs">GPS: {p.gps_coordinates.lat}, {p.gps_coordinates.lng}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <Badge className={verificationColor(p.verification_status)}>
                        {verificationLabel(p.verification_status)}
                      </Badge>
                      <p className="text-slate-500 text-xs mt-1">Score: {p.carbon_score}/10</p>
                    </div>
                  </div>
                )) : (
                  <p className="text-slate-500 text-sm text-center py-4">Aucune parcelle enregistrée</p>
                )}
              </CardContent>
            </Card>

            {/* Harvests */}
            {farmerDetails.harvests?.length > 0 && (
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white text-base">Récoltes ({farmerDetails.harvests.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {farmerDetails.harvests.map((h) => (
                    <div key={h.id} className="bg-slate-800 rounded-lg p-3 flex justify-between">
                      <div>
                        <p className="text-white text-sm">{h.crop_type} - {h.quantity_kg} kg</p>
                        <p className="text-slate-500 text-xs">{h.date}</p>
                      </div>
                      <p className="text-amber-400 text-sm font-medium">{h.carbon_premium} FCFA</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* SSRTE Visits */}
            {farmerDetails.ssrte_visits?.length > 0 && (
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white text-base">Visites SSRTE ({farmerDetails.ssrte_visits.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {farmerDetails.ssrte_visits.map((v) => (
                    <div key={v.id} className="bg-slate-800 rounded-lg p-3 flex justify-between">
                      <div>
                        <p className="text-white text-sm">Agent: {v.agent_name}</p>
                        <p className="text-slate-500 text-xs">{v.visit_date}</p>
                      </div>
                      <Badge className={v.risk_level === 'high' ? 'bg-red-900 text-red-300' : 'bg-emerald-900 text-emerald-300'}>
                        {v.risk_level || v.status}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Audit Trail */}
        {auditLogs.length > 0 && !showDetails && (
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <Activity className="w-4 h-4 text-slate-400" />
                Historique d'accès récent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {auditLogs.slice(0, 5).map((log, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-slate-800 last:border-0">
                    <div className={`w-2 h-2 rounded-full ${
                      log.action === 'SEARCH_SUCCESS' ? 'bg-emerald-400' :
                      log.action === 'ACCESS_DENIED' ? 'bg-red-400' :
                      log.action === 'SEARCH_NOT_FOUND' ? 'bg-amber-400' : 'bg-blue-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-300 text-xs truncate">{log.details}</p>
                      <p className="text-slate-600 text-xs">{log.target_phone}</p>
                    </div>
                    <p className="text-slate-600 text-xs whitespace-nowrap">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString('fr-FR', {hour:'2-digit', minute:'2-digit'}) : ''}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

const InfoItem = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-2">
    <Icon className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
    <div>
      <p className="text-slate-500 text-xs">{label}</p>
      <p className="text-white text-sm">{value}</p>
    </div>
  </div>
);

const StatCard = ({ label, value, color }) => (
  <Card className="bg-slate-900 border-slate-800">
    <CardContent className="p-4 text-center">
      <p className={`${color} font-bold text-xl`}>{value}</p>
      <p className="text-slate-500 text-xs">{label}</p>
    </CardContent>
  </Card>
);

export default AgentTerrainDashboard;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Checkbox } from '../../components/ui/checkbox';
import Navbar from '../../components/Navbar';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  Users, ClipboardCheck, AlertTriangle, Search, Plus,
  Eye, Baby, Shield, CheckCircle2, XCircle, MapPin,
  Calendar, FileText, Send, RefreshCcw, ChevronRight,
  Wifi, WifiOff, CloudOff, Upload, Download, ChevronLeft,
  Phone, Filter, Bell
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const apiClient = {
  get: async (url) => {
    const token = localStorage.getItem('token');
    return axios.get(`${API_URL}${url}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
  },
  post: async (url, data) => {
    const token = localStorage.getItem('token');
    return axios.post(`${API_URL}${url}`, data, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
  }
};

// Liste des tâches dangereuses (Convention OIT 182)
const TACHES_DANGEREUSES = [
  { code: "TD1", nom: "Port de charges lourdes", description: "Porter des charges > 20kg" },
  { code: "TD2", nom: "Utilisation outils tranchants", description: "Machettes, couteaux sans protection" },
  { code: "TD3", nom: "Manipulation pesticides", description: "Contact avec produits chimiques" },
  { code: "TD4", nom: "Longues heures de travail", description: "> 6h/jour pour < 15 ans" },
  { code: "TD5", nom: "Travail de nuit", description: "Travail après 18h" },
  { code: "TD6", nom: "Brûlage des champs", description: "Exposition fumée/feu" },
  { code: "TD7", nom: "Grimpée arbres dangereux", description: "Sans équipement sécurité" },
  { code: "TD8", nom: "Transport charges animaux", description: "Risque accidents" }
];

// Types de support
const TYPES_SUPPORT = [
  "Kit scolaire distribué",
  "Certificat de naissance aidé",
  "Inscription école facilitée",
  "Formation professionnelle",
  "Sensibilisation famille",
  "Suivi psychosocial",
  "Aide alimentaire",
  "Référencement services sociaux"
];

const CooperativeSSRTEDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('new-visit');
  const [members, setMembers] = useState([]);
  const [visits, setVisits] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineVisits, setOfflineVisits] = useState([]);
  const [syncing, setSyncing] = useState(false);

  // Form state for new SSRTE visit
  const [visitForm, setVisitForm] = useState({
    taille_menage: 0,
    nombre_enfants: 0,
    liste_enfants: [],
    conditions_vie: 'moyennes',
    eau_courante: false,
    electricite: false,
    distance_ecole_km: '',
    enfants_observes_travaillant: 0,
    taches_dangereuses_observees: [],
    support_fourni: [],
    kit_scolaire_distribue: false,
    certificat_naissance_aide: false,
    niveau_risque: 'faible',
    recommandations: '',
    visite_suivi_requise: false,
    observations: ''
  });

  const addChildToForm = () => {
    setVisitForm(prev => ({
      ...prev,
      liste_enfants: [...prev.liste_enfants, { prenom: '', sexe: 'Garcon', age: 0, scolarise: false, travaille_exploitation: false }]
    }));
  };

  const updateChildInForm = (index, field, value) => {
    setVisitForm(prev => {
      const updated = [...prev.liste_enfants];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, liste_enfants: updated };
    });
  };

  const removeChildFromForm = (index) => {
    setVisitForm(prev => ({
      ...prev,
      liste_enfants: prev.liste_enfants.filter((_, i) => i !== index)
    }));
  };

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Load offline visits from localStorage
    const savedOffline = localStorage.getItem('ssrte_offline_visits');
    if (savedOffline) {
      setOfflineVisits(JSON.parse(savedOffline));
    }
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && offlineVisits.length > 0) {
      toast.info('Connexion rétablie', { 
        description: `${offlineVisits.length} visite(s) en attente de synchronisation`,
        action: {
          label: 'Synchroniser',
          onClick: syncOfflineData
        }
      });
    }
  }, [isOnline]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.user_type !== 'cooperative') {
      toast.error('Accès refusé', { description: 'Réservé aux coopératives' });
      navigate('/');
      return;
    }
    fetchData();
  }, [user, authLoading]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [membersRes, visitsRes] = await Promise.all([
        apiClient.get('/api/cooperative/members'),
        apiClient.get('/api/ici-data/ssrte/visits?limit=50')
      ]);
      setMembers(membersRes.data.members || []);
      setVisits(visitsRes.data.visits || []);
      
      // Save members locally for offline use
      localStorage.setItem('ssrte_members_cache', JSON.stringify(membersRes.data.members || []));
    } catch (error) {
      console.error('Error fetching data:', error);
      // Try to load from cache if offline
      if (!isOnline) {
        const cachedMembers = localStorage.getItem('ssrte_members_cache');
        if (cachedMembers) {
          setMembers(JSON.parse(cachedMembers));
          toast.info('Mode hors-ligne', { description: 'Données chargées depuis le cache' });
        }
      } else {
        toast.error('Erreur lors du chargement des données');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitVisit = async () => {
    if (!selectedMember) {
      toast.error('Veuillez sélectionner un producteur');
      return;
    }

    if (!visitForm.taille_menage || parseInt(visitForm.taille_menage) < 1) {
      toast.error('Veuillez renseigner la taille du menage');
      return;
    }

    setSubmitting(true);
    
    const visitData = {
      farmer_id: selectedMember._id || selectedMember.id,
      date_visite: new Date().toISOString(),
      taille_menage: parseInt(visitForm.taille_menage) || 0,
      nombre_enfants: parseInt(visitForm.nombre_enfants) || 0,
      liste_enfants: visitForm.liste_enfants,
      conditions_vie: visitForm.conditions_vie,
      eau_courante: visitForm.eau_courante,
      electricite: visitForm.electricite,
      distance_ecole_km: visitForm.distance_ecole_km ? parseFloat(visitForm.distance_ecole_km) : null,
      enfants_observes_travaillant: parseInt(visitForm.enfants_observes_travaillant) || 0,
      taches_dangereuses_observees: visitForm.taches_dangereuses_observees,
      support_fourni: visitForm.support_fourni,
      kit_scolaire_distribue: visitForm.kit_scolaire_distribue,
      certificat_naissance_aide: visitForm.certificat_naissance_aide,
      niveau_risque: visitForm.niveau_risque,
      recommandations: visitForm.recommandations.split('\n').filter(r => r.trim()),
      visite_suivi_requise: visitForm.visite_suivi_requise,
      observations: visitForm.observations || null,
      offline_id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      offline_recorded_at: new Date().toISOString()
    };

    // If offline, save locally
    if (!isOnline) {
      const newOfflineVisits = [...offlineVisits, visitData];
      setOfflineVisits(newOfflineVisits);
      localStorage.setItem('ssrte_offline_visits', JSON.stringify(newOfflineVisits));
      
      toast.success('Visite sauvegardée hors-ligne', {
        description: `Sera synchronisée quand la connexion sera rétablie`,
        icon: <CloudOff className="w-4 h-4" />
      });
      
      // Reset form
      resetForm();
      setSubmitting(false);
      return;
    }

    try {
      await apiClient.post('/api/ici-data/ssrte/visit', visitData);
      
      toast.success('Visite SSRTE enregistrée', {
        description: `Producteur: ${selectedMember.full_name || selectedMember.name}`
      });

      resetForm();
      fetchData();
      setActiveTab('history');
    } catch (error) {
      console.error('Error submitting visit:', error);
      
      // If network error, save offline
      if (!error.response) {
        const newOfflineVisits = [...offlineVisits, visitData];
        setOfflineVisits(newOfflineVisits);
        localStorage.setItem('ssrte_offline_visits', JSON.stringify(newOfflineVisits));
        
        toast.warning('Connexion perdue - Visite sauvegardée localement', {
          description: 'Sera synchronisée automatiquement'
        });
        resetForm();
      } else {
        toast.error('Erreur lors de l\'enregistrement', {
          description: error.response?.data?.detail || 'Veuillez réessayer'
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setVisitForm({
      taille_menage: 0,
      nombre_enfants: 0,
      liste_enfants: [],
      conditions_vie: 'moyennes',
      eau_courante: false,
      electricite: false,
      distance_ecole_km: '',
      enfants_observes_travaillant: 0,
      taches_dangereuses_observees: [],
      support_fourni: [],
      kit_scolaire_distribue: false,
      certificat_naissance_aide: false,
      niveau_risque: 'faible',
      recommandations: '',
      visite_suivi_requise: false,
      observations: ''
    });
    setSelectedMember(null);
  };

  const syncOfflineData = async () => {
    if (offlineVisits.length === 0) {
      toast.info('Aucune donnée à synchroniser');
      return;
    }

    setSyncing(true);
    try {
      const response = await apiClient.post('/api/ici-export/offline/sync', {
        visits: offlineVisits,
        sync_timestamp: new Date().toISOString()
      });
      
      toast.success(`${response.data.synced_count} visite(s) synchronisée(s)`, {
        description: response.data.errors_count > 0 ? `${response.data.errors_count} erreur(s)` : 'Toutes les données sont à jour'
      });
      
      // Clear offline storage
      setOfflineVisits([]);
      localStorage.removeItem('ssrte_offline_visits');
      
      // Refresh data
      fetchData();
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Erreur de synchronisation', {
        description: 'Réessayez plus tard'
      });
    } finally {
      setSyncing(false);
    }
  };

  const toggleTacheDangereuse = (code) => {
    setVisitForm(prev => ({
      ...prev,
      taches_dangereuses_observees: prev.taches_dangereuses_observees.includes(code)
        ? prev.taches_dangereuses_observees.filter(t => t !== code)
        : [...prev.taches_dangereuses_observees, code]
    }));
  };

  const toggleSupport = (support) => {
    setVisitForm(prev => ({
      ...prev,
      support_fourni: prev.support_fourni.includes(support)
        ? prev.support_fourni.filter(s => s !== support)
        : [...prev.support_fourni, support]
    }));
  };

  const filteredMembers = members.filter(m => 
    (m.full_name || m.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.phone_number || m.phone || '').includes(searchQuery)
  );

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Navbar />
        <div className="pt-24 flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      
      <div className="pt-24 pb-12 px-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/cooperative/dashboard')}
                className="text-white hover:bg-white/10"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Retour
              </Button>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <ClipboardCheck className="w-6 h-6 text-green-400" />
                  </div>
                  <h1 className="text-2xl font-bold">Suivi SSRTE Terrain</h1>
                  {/* Online Status Indicator */}
                  <Badge className={`${isOnline ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'}`}>
                  {isOnline ? (
                    <><Wifi className="w-3 h-3 mr-1" /> En ligne</>
                  ) : (
                    <><WifiOff className="w-3 h-3 mr-1" /> Hors ligne</>
                  )}
                </Badge>
              </div>
              <p className="text-slate-400">Système de Suivi et Remédiation du Travail des Enfants</p>
              </div>
            </div>
            <div className="flex gap-2">
              {/* Offline Sync Button */}
              {offlineVisits.length > 0 && (
                <Button 
                  className="bg-orange-500 text-white hover:bg-orange-600"
                  onClick={syncOfflineData}
                  disabled={!isOnline || syncing}
                >
                  {syncing ? (
                    <>Synchronisation...</>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Sync ({offlineVisits.length})
                    </>
                  )}
                </Button>
              )}
              <Button 
                variant="outline" 
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
                onClick={fetchData}
                disabled={!isOnline}
              >
                <RefreshCcw className="w-4 h-4 mr-2" />
                Actualiser
              </Button>
            </div>
          </div>

          {/* Offline Alert */}
          {!isOnline && (
            <Card className="bg-orange-500/10 border-orange-500/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <CloudOff className="w-6 h-6 text-orange-400" />
                  <div>
                    <p className="font-medium text-orange-400">Mode hors-ligne actif</p>
                    <p className="text-sm text-slate-400">
                      Les visites seront sauvegardées localement et synchronisées automatiquement à la reconnexion.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pending Sync Alert */}
          {offlineVisits.length > 0 && isOnline && (
            <Card className="bg-blue-500/10 border-blue-500/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Upload className="w-6 h-6 text-blue-400" />
                    <div>
                      <p className="font-medium text-blue-400">{offlineVisits.length} visite(s) en attente</p>
                      <p className="text-sm text-slate-400">Cliquez sur "Sync" pour envoyer les données au serveur</p>
                    </div>
                  </div>
                  <Button 
                    className="bg-blue-500 text-white hover:bg-blue-600"
                    onClick={syncOfflineData}
                    disabled={syncing}
                  >
                    {syncing ? 'Synchronisation...' : 'Synchroniser maintenant'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-4">
                <Users className="w-5 h-5 text-blue-400 mb-2" />
                <p className="text-2xl font-bold text-white">{members.length}</p>
                <p className="text-xs text-slate-400">Producteurs membres</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-4">
                <Eye className="w-5 h-5 text-green-400 mb-2" />
                <p className="text-2xl font-bold text-white">{visits.length}</p>
                <p className="text-xs text-slate-400">Visites SSRTE</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-4">
                <AlertTriangle className="w-5 h-5 text-orange-400 mb-2" />
                <p className="text-2xl font-bold text-white">
                  {visits.filter(v => v.enfants_observes_travaillant > 0).length}
                </p>
                <p className="text-xs text-slate-400">Cas identifiés</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-4">
                <CheckCircle2 className="w-5 h-5 text-purple-400 mb-2" />
                <p className="text-2xl font-bold text-white">
                  {visits.filter(v => v.support_fourni?.length > 0).length}
                </p>
                <p className="text-xs text-slate-400">Avec support</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-slate-900 border-slate-800">
              <TabsTrigger value="new-visit" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle Visite
              </TabsTrigger>
              <TabsTrigger value="history" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400">
                <FileText className="w-4 h-4 mr-2" />
                Historique ({visits.length})
              </TabsTrigger>
            </TabsList>

            {/* Tab: New Visit */}
            <TabsContent value="new-visit" className="mt-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Left: Member Selection */}
                <Card className="bg-slate-900 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-white text-lg flex items-center gap-2">
                      <Users className="w-5 h-5 text-blue-400" />
                      1. Sélectionner le producteur
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <Input
                        placeholder="Rechercher par nom ou téléphone..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-slate-800 border-slate-700 text-white"
                      />
                    </div>

                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {filteredMembers.length === 0 ? (
                        <p className="text-slate-500 text-center py-4">Aucun membre trouvé</p>
                      ) : (
                        filteredMembers.map((member) => (
                          <div
                            key={member._id || member.id}
                            onClick={() => setSelectedMember(member)}
                            className={`p-3 rounded-lg cursor-pointer transition-colors ${
                              selectedMember?._id === member._id || selectedMember?.id === member.id
                                ? 'bg-green-500/20 border border-green-500/50'
                                : 'bg-slate-800/50 hover:bg-slate-700/50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-white">{member.full_name || member.name}</p>
                                <p className="text-xs text-slate-400">{member.phone_number || member.phone}</p>
                              </div>
                              {(selectedMember?._id === member._id || selectedMember?.id === member.id) && (
                                <CheckCircle2 className="w-5 h-5 text-green-400" />
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {selectedMember && (
                      <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <p className="text-sm text-green-400">Producteur sélectionné:</p>
                        <p className="font-bold text-white">{selectedMember.full_name || selectedMember.name}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Right: Visit Form */}
                <Card className="bg-slate-900 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-white text-lg flex items-center gap-2">
                      <ClipboardCheck className="w-5 h-5 text-green-400" />
                      2. Remplir le rapport de visite
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    {/* Informations du menage */}
                    <div className="p-3 bg-slate-800/50 rounded-lg space-y-3">
                      <p className="text-sm font-semibold text-blue-400 flex items-center gap-2">
                        <Users className="w-4 h-4" /> Informations du menage
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-slate-400 text-xs">Taille du menage *</Label>
                          <Input type="number" min="1" placeholder="Ex: 6"
                            value={visitForm.taille_menage || ''}
                            onChange={(e) => setVisitForm({...visitForm, taille_menage: e.target.value})}
                            className="mt-1 bg-slate-800 border-slate-700 text-white" data-testid="ssrte-dash-taille" />
                        </div>
                        <div>
                          <Label className="text-slate-400 text-xs">Nombre d'enfants</Label>
                          <Input type="number" min="0" placeholder="Ex: 3"
                            value={visitForm.nombre_enfants || ''}
                            onChange={(e) => setVisitForm({...visitForm, nombre_enfants: e.target.value})}
                            className="mt-1 bg-slate-800 border-slate-700 text-white" data-testid="ssrte-dash-enfants" />
                        </div>
                      </div>
                    </div>

                    {/* Details des enfants */}
                    <div className="p-3 bg-slate-800/50 rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-violet-400">Details des enfants</p>
                        <Button variant="outline" size="sm" onClick={addChildToForm}
                          className="border-slate-600 text-slate-300 hover:bg-slate-700 h-7 text-xs" data-testid="ssrte-dash-add-child">
                          <Plus className="w-3 h-3 mr-1" /> Ajouter
                        </Button>
                      </div>
                      {visitForm.liste_enfants.length === 0 && (
                        <p className="text-xs text-slate-500 text-center py-2">Cliquez "Ajouter" pour enregistrer les enfants</p>
                      )}
                      {visitForm.liste_enfants.map((child, i) => (
                        <div key={i} className="p-2 bg-slate-900 rounded-lg space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-400 font-medium">Enfant {i + 1}</span>
                            <button onClick={() => removeChildFromForm(i)} className="text-red-400 hover:text-red-300">
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <Input placeholder="Prenom" value={child.prenom}
                              onChange={(e) => updateChildInForm(i, 'prenom', e.target.value)}
                              className="bg-slate-800 border-slate-700 text-white text-xs h-8" />
                            <Input type="number" min="0" max="17" placeholder="Age" value={child.age || ''}
                              onChange={(e) => updateChildInForm(i, 'age', parseInt(e.target.value) || 0)}
                              className="bg-slate-800 border-slate-700 text-white text-xs h-8" />
                            <select value={child.sexe} onChange={(e) => updateChildInForm(i, 'sexe', e.target.value)}
                              className="bg-slate-800 border border-slate-700 rounded-md text-white text-xs h-8 px-2">
                              <option value="Garcon">Garcon</option>
                              <option value="Fille">Fille</option>
                            </select>
                          </div>
                          <div className="flex gap-4">
                            <div className="flex items-center gap-1.5">
                              <Checkbox checked={child.scolarise} onCheckedChange={(v) => updateChildInForm(i, 'scolarise', v)} className="border-slate-600" />
                              <Label className="text-xs text-slate-300">Scolarise</Label>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Checkbox checked={child.travaille_exploitation} onCheckedChange={(v) => updateChildInForm(i, 'travaille_exploitation', v)} className="border-red-600" />
                              <Label className="text-xs text-red-400">Travaille</Label>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Conditions de vie */}
                    <div className="p-3 bg-slate-800/50 rounded-lg space-y-3">
                      <p className="text-sm font-semibold text-teal-400">Conditions de vie</p>
                      <div className="flex flex-wrap gap-2">
                        {[{v:'precaires',l:'Precaires'},{v:'moyennes',l:'Moyennes'},{v:'bonnes',l:'Bonnes'},{v:'tres_bonnes',l:'Tres bonnes'}].map(c => (
                          <button key={c.v} onClick={() => setVisitForm({...visitForm, conditions_vie: c.v})}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              visitForm.conditions_vie === c.v
                                ? 'bg-teal-500/20 border border-teal-500/50 text-teal-300'
                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            }`}>{c.l}</button>
                        ))}
                      </div>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                          <Checkbox checked={visitForm.eau_courante} onCheckedChange={(v) => setVisitForm({...visitForm, eau_courante: v})} className="border-slate-600" />
                          <Label className="text-xs text-slate-300">Eau courante</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox checked={visitForm.electricite} onCheckedChange={(v) => setVisitForm({...visitForm, electricite: v})} className="border-slate-600" />
                          <Label className="text-xs text-slate-300">Electricite</Label>
                        </div>
                      </div>
                      <div>
                        <Label className="text-slate-400 text-xs">Distance ecole (km)</Label>
                        <Input type="number" step="0.1" min="0" placeholder="Ex: 2.5"
                          value={visitForm.distance_ecole_km}
                          onChange={(e) => setVisitForm({...visitForm, distance_ecole_km: e.target.value})}
                          className="mt-1 bg-slate-800 border-slate-700 text-white max-w-[180px]" data-testid="ssrte-dash-distance" />
                      </div>
                    </div>

                    {/* Enfants observés */}
                    <div>
                      <Label className="text-slate-300 flex items-center gap-2">
                        <Baby className="w-4 h-4 text-red-400" />
                        Enfants observés travaillant
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        max="20"
                        value={visitForm.enfants_observes_travaillant}
                        onChange={(e) => setVisitForm({...visitForm, enfants_observes_travaillant: e.target.value})}
                        className="mt-1 bg-slate-800 border-slate-700 text-white"
                      />
                    </div>

                    {/* Niveau de risque */}
                    <div>
                      <Label className="text-slate-300 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-orange-400" />
                        Niveau de risque évalué
                      </Label>
                      <select
                        value={visitForm.niveau_risque}
                        onChange={(e) => setVisitForm({...visitForm, niveau_risque: e.target.value})}
                        className="w-full mt-1 p-2 bg-slate-800 border border-slate-700 rounded-md text-white"
                      >
                        <option value="faible">Faible</option>
                        <option value="modere">Modéré</option>
                        <option value="eleve">Élevé</option>
                        <option value="critique">Critique</option>
                      </select>
                    </div>

                    {/* Tâches dangereuses */}
                    <div>
                      <Label className="text-slate-300 mb-2 block">Tâches dangereuses observées</Label>
                      <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                        {TACHES_DANGEREUSES.map((tache) => (
                          <div
                            key={tache.code}
                            onClick={() => toggleTacheDangereuse(tache.code)}
                            className={`p-2 rounded cursor-pointer text-xs transition-colors ${
                              visitForm.taches_dangereuses_observees.includes(tache.code)
                                ? 'bg-red-500/20 border border-red-500/50 text-red-300'
                                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
                            }`}
                          >
                            {tache.nom}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Support fourni */}
                    <div>
                      <Label className="text-slate-300 mb-2 block">Support fourni</Label>
                      <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                        {TYPES_SUPPORT.map((support) => (
                          <div
                            key={support}
                            onClick={() => toggleSupport(support)}
                            className={`p-2 rounded cursor-pointer text-xs transition-colors ${
                              visitForm.support_fourni.includes(support)
                                ? 'bg-green-500/20 border border-green-500/50 text-green-300'
                                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
                            }`}
                          >
                            {support}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Checkboxes */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={visitForm.visite_suivi_requise}
                          onCheckedChange={(checked) => setVisitForm({...visitForm, visite_suivi_requise: checked})}
                          className="border-slate-600"
                        />
                        <Label className="text-sm text-slate-300">Visite de suivi requise</Label>
                      </div>
                    </div>

                    {/* Recommandations */}
                    <div>
                      <Label className="text-slate-300">Recommandations (une par ligne)</Label>
                      <textarea
                        value={visitForm.recommandations}
                        onChange={(e) => setVisitForm({...visitForm, recommandations: e.target.value})}
                        placeholder="Inscrire les enfants à l'école&#10;Fournir équipement de protection&#10;..."
                        className="w-full mt-1 p-2 bg-slate-800 border border-slate-700 rounded-md text-white text-sm h-20 resize-none"
                      />
                    </div>

                    {/* Observations */}
                    <div>
                      <Label className="text-slate-300">Observations</Label>
                      <textarea
                        value={visitForm.observations}
                        onChange={(e) => setVisitForm({...visitForm, observations: e.target.value})}
                        placeholder="Notes et observations generales..."
                        className="w-full mt-1 p-2 bg-slate-800 border border-slate-700 rounded-md text-white text-sm h-16 resize-none"
                        data-testid="ssrte-dash-observations"
                      />
                    </div>

                    {/* Submit Button */}
                    <Button
                      onClick={handleSubmitVisit}
                      disabled={!selectedMember || submitting}
                      className="w-full bg-green-500 text-white hover:bg-green-600"
                    >
                      {submitting ? (
                        <>Enregistrement...</>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Enregistrer la visite SSRTE
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Tab: History */}
            <TabsContent value="history" className="mt-6">
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Historique des visites SSRTE</CardTitle>
                </CardHeader>
                <CardContent>
                  {visits.length === 0 ? (
                    <p className="text-slate-500 text-center py-8">Aucune visite enregistrée</p>
                  ) : (
                    <div className="space-y-3">
                      {visits.map((visit, index) => (
                        <div
                          key={visit.id || index}
                          className="p-4 bg-slate-800/50 rounded-lg"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${
                                visit.niveau_risque === 'critique' ? 'bg-red-500/20' :
                                visit.niveau_risque === 'eleve' ? 'bg-orange-500/20' :
                                visit.niveau_risque === 'modere' ? 'bg-yellow-500/20' :
                                'bg-green-500/20'
                              }`}>
                                <Eye className="w-4 h-4 text-white" />
                              </div>
                              <div>
                                <p className="text-white font-medium">
                                  Producteur: {visit.farmer_id?.slice(-8) || 'N/A'}
                                </p>
                                <p className="text-xs text-slate-400">
                                  <Calendar className="w-3 h-3 inline mr-1" />
                                  {formatDate(visit.date_visite)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={`${
                                visit.niveau_risque === 'critique' ? 'bg-red-500' :
                                visit.niveau_risque === 'eleve' ? 'bg-orange-500' :
                                visit.niveau_risque === 'modere' ? 'bg-yellow-500 text-black' :
                                'bg-green-500'
                              }`}>
                                {visit.niveau_risque?.toUpperCase() || 'N/A'}
                              </Badge>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t border-slate-700">
                            <div>
                              <p className="text-xs text-slate-500">Enfants observés</p>
                              <p className={`font-bold ${visit.enfants_observes_travaillant > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                {visit.enfants_observes_travaillant || 0}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">Tâches dangereuses</p>
                              <p className={`font-bold ${visit.taches_dangereuses_count > 0 ? 'text-orange-400' : 'text-green-400'}`}>
                                {visit.taches_dangereuses_count || 0}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">Supports fournis</p>
                              <p className="font-bold text-blue-400">
                                {visit.support_fourni?.length || 0}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default CooperativeSSRTEDashboard;

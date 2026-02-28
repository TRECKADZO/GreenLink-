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
  Wifi, WifiOff, CloudOff, Upload, Download
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

  // Form state for new SSRTE visit
  const [visitForm, setVisitForm] = useState({
    enfants_observes_travaillant: 0,
    taches_dangereuses_observees: [],
    support_fourni: [],
    kit_scolaire_distribue: false,
    certificat_naissance_aide: false,
    niveau_risque: 'faible',
    recommandations: '',
    visite_suivi_requise: false,
    notes: ''
  });

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
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitVisit = async () => {
    if (!selectedMember) {
      toast.error('Veuillez sélectionner un producteur');
      return;
    }

    setSubmitting(true);
    try {
      const visitData = {
        farmer_id: selectedMember._id || selectedMember.id,
        date_visite: new Date().toISOString(),
        enfants_observes_travaillant: parseInt(visitForm.enfants_observes_travaillant) || 0,
        taches_dangereuses_observees: visitForm.taches_dangereuses_observees,
        support_fourni: visitForm.support_fourni,
        kit_scolaire_distribue: visitForm.kit_scolaire_distribue,
        certificat_naissance_aide: visitForm.certificat_naissance_aide,
        niveau_risque: visitForm.niveau_risque,
        recommandations: visitForm.recommandations.split('\n').filter(r => r.trim()),
        visite_suivi_requise: visitForm.visite_suivi_requise
      };

      await apiClient.post('/api/ici-data/ssrte/visit', visitData);
      
      toast.success('Visite SSRTE enregistrée', {
        description: `Producteur: ${selectedMember.full_name || selectedMember.name}`
      });

      // Reset form
      setVisitForm({
        enfants_observes_travaillant: 0,
        taches_dangereuses_observees: [],
        support_fourni: [],
        kit_scolaire_distribue: false,
        certificat_naissance_aide: false,
        niveau_risque: 'faible',
        recommandations: '',
        visite_suivi_requise: false,
        notes: ''
      });
      setSelectedMember(null);
      
      // Refresh visits list
      fetchData();
      setActiveTab('history');
    } catch (error) {
      console.error('Error submitting visit:', error);
      toast.error('Erreur lors de l\'enregistrement', {
        description: error.response?.data?.detail || 'Veuillez réessayer'
      });
    } finally {
      setSubmitting(false);
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
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <ClipboardCheck className="w-6 h-6 text-green-400" />
                </div>
                <h1 className="text-2xl font-bold">Suivi SSRTE Terrain</h1>
              </div>
              <p className="text-slate-400">Système de Suivi et Remédiation du Travail des Enfants</p>
            </div>
            <Button 
              variant="outline" 
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
              onClick={fetchData}
            >
              <RefreshCcw className="w-4 h-4 mr-2" />
              Actualiser
            </Button>
          </div>

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
                  <CardContent className="space-y-4">
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

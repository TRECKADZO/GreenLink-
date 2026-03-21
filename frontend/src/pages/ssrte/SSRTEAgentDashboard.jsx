import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { Checkbox } from '../../components/ui/checkbox';
import { toast } from 'sonner';
import {
  Users, ClipboardList, AlertTriangle, Baby, Shield, Award,
  Plus, Search, MapPin, Calendar, Clock, ChevronRight,
  CheckCircle, XCircle, Eye, TrendingUp, Home, FileText
} from 'lucide-react';
import { NotificationCenter } from '../../components/NotificationCenter';

const SSRTEAgentDashboard = () => {
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [visits, setVisits] = useState([]);
  const [cases, setCases] = useState([]);
  const [members, setMembers] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const API_URL = process.env.REACT_APP_BACKEND_URL;
  
  // Create axios instance with auth header
  const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  // Form states
  const [showVisitForm, setShowVisitForm] = useState(false);
  const [showCaseForm, setShowCaseForm] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [visitForm, setVisitForm] = useState({
    member_id: '',
    household_size: '',
    children_count: '',
    children_details: [],
    living_conditions: 'average',
    has_piped_water: false,
    has_electricity: false,
    distance_to_school_km: '',
    observations: ''
  });

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  const loadData = async () => {
    setLoading(true);
    try {
      const requests = [
        apiClient.get('/api/ssrte/stats/overview').catch(() => ({ data: {} })),
        apiClient.get('/api/ssrte/visits?limit=50').catch(() => ({ data: { visits: [] } })),
        apiClient.get('/api/ssrte/cases?limit=50').catch(() => ({ data: { cases: [] } })),
        apiClient.get('/api/cooperative/members?limit=200').catch(() => ({ data: { members: [] } }))
      ];
      const [statsRes, visitsRes, casesRes, membersRes] = await Promise.all(requests);
      
      setStats(statsRes.data);
      setVisits(visitsRes.data.visits || []);
      setCases(casesRes.data.cases || []);
      setMembers(membersRes.data.members || membersRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erreur de chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitVisit = async (e) => {
    e.preventDefault();
    try {
      const response = await apiClient.post('/api/ssrte/visits/create', {
        ...visitForm,
        household_size: parseInt(visitForm.household_size),
        children_count: parseInt(visitForm.children_count),
        distance_to_school_km: visitForm.distance_to_school_km ? parseFloat(visitForm.distance_to_school_km) : null
      });
      
      toast.success('Visite enregistrée avec succès');
      setShowVisitForm(false);
      setVisitForm({
        member_id: '',
        household_size: '',
        children_count: '',
        children_details: [],
        living_conditions: 'average',
        has_piped_water: false,
        has_electricity: false,
        distance_to_school_km: '',
        observations: ''
      });
      
      // Si risque détecté, proposer de créer un cas
      if (response.data.niveau_risque === 'critique' || response.data.niveau_risque === 'eleve') {
        setSelectedVisit(response.data);
        setShowCaseForm(true);
        toast.warning('Risque élevé détecté - Veuillez documenter le cas');
      }
      
      loadData();
    } catch (error) {
      console.error('Error submitting visit:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'enregistrement');
    }
  };

  const addChildDetail = () => {
    setVisitForm({
      ...visitForm,
      children_details: [
        ...visitForm.children_details,
        { age: '', gender: 'M', in_school: true, works_on_farm: false, tasks: [] }
      ]
    });
  };

  const updateChildDetail = (index, field, value) => {
    const newDetails = [...visitForm.children_details];
    newDetails[index][field] = value;
    setVisitForm({ ...visitForm, children_details: newDetails });
  };

  const removeChildDetail = (index) => {
    const newDetails = visitForm.children_details.filter((_, i) => i !== index);
    setVisitForm({ ...visitForm, children_details: newDetails });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-6" data-testid="ssrte-agent-dashboard">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => window.history.back()}
              className="text-slate-400 hover:text-white hover:bg-slate-700 mb-2"
              data-testid="back-btn"
            >
              <ChevronRight className="h-4 w-4 mr-1 rotate-180" />
              Retour
            </Button>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
              <Shield className="h-8 w-8 text-cyan-500" />
              Agent SSRTE
            </h1>
            <p className="text-slate-400 mt-1">
              Système de Suivi et Remédiation du Travail des Enfants
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <NotificationCenter />
            <Button 
              onClick={() => setShowVisitForm(true)}
              className="bg-cyan-600 hover:bg-cyan-700"
              data-testid="new-visit-btn"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle Visite
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Visites Total</p>
                <p className="text-2xl font-bold text-white">{stats?.visits?.total || 0}</p>
              </div>
              <ClipboardList className="h-8 w-8 text-cyan-500" />
            </div>
            <p className="text-xs text-cyan-400 mt-1">Ce mois: {stats?.visits?.monthly || 0}</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Haut Risque</p>
                <p className="text-2xl font-bold text-orange-400">{stats?.visits?.high_risk || 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
            <p className="text-xs text-slate-400 mt-1">{stats?.visits?.risk_rate || 0}% des visites</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Cas Identifiés</p>
                <p className="text-2xl font-bold text-rose-400">{stats?.cases?.total || 0}</p>
              </div>
              <Baby className="h-8 w-8 text-rose-500" />
            </div>
            <p className="text-xs text-slate-400 mt-1">{stats?.cases?.hazardous || 0} dangereux</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">En Cours</p>
                <p className="text-2xl font-bold text-amber-400">{stats?.cases?.in_progress || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-amber-500" />
            </div>
            <p className="text-xs text-slate-400 mt-1">Remédiations actives</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Cas Résolus</p>
                <p className="text-2xl font-bold text-emerald-400">{stats?.cases?.resolved || 0}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-emerald-500" />
            </div>
            <p className="text-xs text-slate-400 mt-1">{stats?.rates?.resolution || 0}% résolution</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Remédiations</p>
                <p className="text-2xl font-bold text-blue-400">{stats?.remediations?.total || 0}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-xs text-slate-400 mt-1">{stats?.remediations?.completed || 0} terminées</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-slate-800 border-slate-700">
          <TabsTrigger value="dashboard" className="data-[state=active]:bg-cyan-600">
            Tableau de Bord
          </TabsTrigger>
          <TabsTrigger value="visits" className="data-[state=active]:bg-cyan-600">
            Visites ({visits.length})
          </TabsTrigger>
          <TabsTrigger value="cases" className="data-[state=active]:bg-cyan-600">
            Cas ({cases.length})
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Visits */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-cyan-500" />
                  Dernières Visites
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {visits.slice(0, 5).map((visit) => (
                    <div 
                      key={visit.id} 
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors cursor-pointer"
                      onClick={() => setActiveTab('visits')}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          visit.niveau_risque === 'critique' || visit.niveau_risque === 'eleve' ? 'bg-rose-500' : 'bg-emerald-500'
                        }`} />
                        <div>
                          <p className="text-white font-medium">{visit.nom_membre || 'Producteur'}</p>
                          <p className="text-xs text-slate-400">
                            {visit.enfants_observes} enfants • {visit.taille_menage} personnes
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={visit.niveau_risque === 'critique' || visit.niveau_risque === 'eleve' ? 'destructive' : 'secondary'}>
                          {visit.niveau_risque === 'critique' || visit.niveau_risque === 'eleve' ? 'Risque' : 'OK'}
                        </Badge>
                        <p className="text-xs text-slate-400 mt-1">
                          {visit.date_visite ? new Date(visit.date_visite).toLocaleDateString('fr-FR') : '-'}
                        </p>
                      </div>
                    </div>
                  ))}
                  {visits.length === 0 && (
                    <p className="text-slate-400 text-center py-4">Aucune visite enregistrée</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Active Cases */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Cas Actifs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {cases.filter(c => c.status !== 'resolved' && c.status !== 'closed').slice(0, 5).map((caseItem) => (
                    <div 
                      key={caseItem.id} 
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Baby className={`h-5 w-5 ${
                          caseItem.severity_score >= 8 ? 'text-rose-500' : 
                          caseItem.severity_score >= 5 ? 'text-orange-500' : 'text-amber-500'
                        }`} />
                        <div>
                          <p className="text-white font-medium">{caseItem.child_name}</p>
                          <p className="text-xs text-slate-400">
                            {caseItem.child_age} ans • {caseItem.labor_type}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={`
                          ${caseItem.status === 'identified' ? 'bg-rose-600' : ''}
                          ${caseItem.status === 'in_progress' ? 'bg-amber-600' : ''}
                        `}>
                          {caseItem.status === 'identified' ? 'Nouveau' : 
                           caseItem.status === 'in_progress' ? 'En cours' : caseItem.status}
                        </Badge>
                        <p className="text-xs text-slate-400 mt-1">
                          Sévérité: {caseItem.severity_score}/10
                        </p>
                      </div>
                    </div>
                  ))}
                  {cases.filter(c => c.status !== 'resolved').length === 0 && (
                    <p className="text-slate-400 text-center py-4">Aucun cas actif</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Performance */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                  Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-400">Taux de prévalence</span>
                    <span className="text-white">{stats?.rates?.prevalence || 0}%</span>
                  </div>
                  <Progress value={stats?.rates?.prevalence || 0} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-400">Taux de résolution</span>
                    <span className="text-emerald-400">{stats?.rates?.resolution || 0}%</span>
                  </div>
                  <Progress value={stats?.rates?.resolution || 0} className="h-2 [&>div]:bg-emerald-500" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-400">Remédiations complétées</span>
                    <span className="text-blue-400">{stats?.remediations?.completion_rate || 0}%</span>
                  </div>
                  <Progress value={stats?.remediations?.completion_rate || 0} className="h-2 [&>div]:bg-blue-500" />
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Actions Rapides</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full justify-start bg-slate-700 hover:bg-slate-600"
                  onClick={() => setShowVisitForm(true)}
                >
                  <Home className="h-4 w-4 mr-3 text-cyan-500" />
                  Nouvelle visite ménage
                </Button>
                <Button 
                  className="w-full justify-start bg-slate-700 hover:bg-slate-600"
                  onClick={() => setActiveTab('cases')}
                >
                  <Baby className="h-4 w-4 mr-3 text-orange-500" />
                  Voir tous les cas
                </Button>
                <Button 
                  className="w-full justify-start bg-slate-700 hover:bg-slate-600"
                  onClick={() => window.open('/api/ssrte/reports/csv/' + (user?.cooperative_id || ''), '_blank')}
                >
                  <FileText className="h-4 w-4 mr-3 text-emerald-500" />
                  Exporter rapport CSV
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Visits Tab */}
        <TabsContent value="visits">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Historique des Visites</CardTitle>
              <CardDescription className="text-slate-400">
                Toutes les visites de ménages effectuées
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left p-3 text-slate-400 font-medium">Producteur</th>
                      <th className="text-left p-3 text-slate-400 font-medium">Ménage</th>
                      <th className="text-left p-3 text-slate-400 font-medium">Enfants</th>
                      <th className="text-left p-3 text-slate-400 font-medium">Risque</th>
                      <th className="text-left p-3 text-slate-400 font-medium">Date</th>
                      <th className="text-left p-3 text-slate-400 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visits.map((visit) => (
                      <tr key={visit.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                        <td className="p-3 text-white">{visit.nom_membre}</td>
                        <td className="p-3 text-slate-300">{visit.taille_menage} pers.</td>
                        <td className="p-3">
                          <span className="text-white">{visit.enfants_observes}</span>
                          {visit.enfants_a_risque > 0 && (
                            <span className="text-rose-400 ml-1">({visit.enfants_a_risque} à risque)</span>
                          )}
                        </td>
                        <td className="p-3">
                          <Badge variant={visit.niveau_risque === 'critique' || visit.niveau_risque === 'eleve' ? 'destructive' : 'secondary'}>
                            {visit.niveau_risque === 'critique' ? 'Critique' : visit.niveau_risque === 'eleve' ? 'Élevé' : 'Faible'}
                          </Badge>
                        </td>
                        <td className="p-3 text-slate-300">
                          {visit.date_visite ? new Date(visit.date_visite).toLocaleDateString('fr-FR') : '-'}
                        </td>
                        <td className="p-3">
                          <Button variant="ghost" size="sm" className="text-cyan-400">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {visits.length === 0 && (
                  <p className="text-slate-400 text-center py-8">Aucune visite enregistrée</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cases Tab */}
        <TabsContent value="cases">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Cas de Travail des Enfants</CardTitle>
              <CardDescription className="text-slate-400">
                Suivi des cas identifiés et remédiations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left p-3 text-slate-400 font-medium">Enfant</th>
                      <th className="text-left p-3 text-slate-400 font-medium">Âge/Genre</th>
                      <th className="text-left p-3 text-slate-400 font-medium">Type</th>
                      <th className="text-left p-3 text-slate-400 font-medium">Sévérité</th>
                      <th className="text-left p-3 text-slate-400 font-medium">Statut</th>
                      <th className="text-left p-3 text-slate-400 font-medium">Remédiation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cases.map((caseItem) => (
                      <tr key={caseItem.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                        <td className="p-3">
                          <p className="text-white font-medium">{caseItem.child_name}</p>
                          <p className="text-xs text-slate-400">{caseItem.member_name}</p>
                        </td>
                        <td className="p-3 text-slate-300">
                          {caseItem.child_age} ans • {caseItem.child_gender === 'M' ? 'Garçon' : 'Fille'}
                        </td>
                        <td className="p-3">
                          <Badge className={`
                            ${caseItem.labor_type === 'worst_forms' ? 'bg-rose-600' : ''}
                            ${caseItem.labor_type === 'hazardous' ? 'bg-orange-600' : ''}
                            ${caseItem.labor_type === 'light_work' ? 'bg-amber-600' : ''}
                          `}>
                            {caseItem.labor_type === 'worst_forms' ? 'Pire forme' : 
                             caseItem.labor_type === 'hazardous' ? 'Dangereux' : 
                             caseItem.labor_type === 'light_work' ? 'Léger' : caseItem.labor_type}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                              caseItem.severity_score >= 8 ? 'bg-rose-600' :
                              caseItem.severity_score >= 5 ? 'bg-orange-600' : 'bg-amber-600'
                            }`}>
                              {caseItem.severity_score}
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge className={`
                            ${caseItem.status === 'identified' ? 'bg-rose-600' : ''}
                            ${caseItem.status === 'in_progress' ? 'bg-amber-600' : ''}
                            ${caseItem.status === 'resolved' ? 'bg-emerald-600' : ''}
                            ${caseItem.status === 'closed' ? 'bg-slate-600' : ''}
                          `}>
                            {caseItem.status === 'identified' ? 'Identifié' :
                             caseItem.status === 'in_progress' ? 'En cours' :
                             caseItem.status === 'resolved' ? 'Résolu' : 'Fermé'}
                          </Badge>
                        </td>
                        <td className="p-3">
                          {caseItem.has_remediation ? (
                            <CheckCircle className="h-5 w-5 text-emerald-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-slate-500" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {cases.length === 0 && (
                  <p className="text-slate-400 text-center py-8">Aucun cas enregistré</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New Visit Modal */}
      {showVisitForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="bg-slate-800 border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="text-white">Nouvelle Visite de Ménage</CardTitle>
              <CardDescription className="text-slate-400">
                Enregistrer une visite SSRTE chez un producteur
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitVisit} className="space-y-4">
                {/* Member Selection */}
                <div className="space-y-2">
                  <Label className="text-white">Producteur visité *</Label>
                  <Select 
                    value={visitForm.member_id} 
                    onValueChange={(v) => setVisitForm({...visitForm, member_id: v})}
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Sélectionner un producteur" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.full_name} - {m.village || m.department || 'N/A'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white">Taille du ménage *</Label>
                    <Input
                      type="number"
                      min="1"
                      className="bg-slate-700 border-slate-600 text-white"
                      value={visitForm.household_size}
                      onChange={(e) => setVisitForm({...visitForm, household_size: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Nombre d'enfants *</Label>
                    <Input
                      type="number"
                      min="0"
                      className="bg-slate-700 border-slate-600 text-white"
                      value={visitForm.children_count}
                      onChange={(e) => setVisitForm({...visitForm, children_count: e.target.value})}
                      required
                    />
                  </div>
                </div>

                {/* Children Details */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-white">Détails des enfants</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addChildDetail}>
                      <Plus className="h-4 w-4 mr-1" /> Ajouter
                    </Button>
                  </div>
                  {visitForm.children_details.map((child, index) => (
                    <div key={index} className="p-3 rounded-lg bg-slate-700/50 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-white text-sm">Enfant {index + 1}</span>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => removeChildDetail(index)}
                          className="text-rose-400 hover:text-rose-300"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <Input
                          type="number"
                          placeholder="Âge"
                          className="bg-slate-600 border-slate-500 text-white"
                          value={child.age}
                          onChange={(e) => updateChildDetail(index, 'age', e.target.value)}
                        />
                        <Select
                          value={child.gender}
                          onValueChange={(v) => updateChildDetail(index, 'gender', v)}
                        >
                          <SelectTrigger className="bg-slate-600 border-slate-500 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="M">Garçon</SelectItem>
                            <SelectItem value="F">Fille</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-2">
                          <Checkbox 
                            checked={child.in_school}
                            onCheckedChange={(v) => updateChildDetail(index, 'in_school', v)}
                          />
                          <span className="text-xs text-slate-300">Scolarisé</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox 
                          checked={child.works_on_farm}
                          onCheckedChange={(v) => updateChildDetail(index, 'works_on_farm', v)}
                        />
                        <span className="text-sm text-slate-300">Travaille sur l'exploitation</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Living Conditions */}
                <div className="space-y-2">
                  <Label className="text-white">Conditions de vie</Label>
                  <Select 
                    value={visitForm.living_conditions}
                    onValueChange={(v) => setVisitForm({...visitForm, living_conditions: v})}
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="good">Bonnes</SelectItem>
                      <SelectItem value="average">Moyennes</SelectItem>
                      <SelectItem value="poor">Précaires</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="water"
                      checked={visitForm.has_piped_water}
                      onCheckedChange={(v) => setVisitForm({...visitForm, has_piped_water: v})}
                    />
                    <Label htmlFor="water" className="text-slate-300">Eau courante</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="electricity"
                      checked={visitForm.has_electricity}
                      onCheckedChange={(v) => setVisitForm({...visitForm, has_electricity: v})}
                    />
                    <Label htmlFor="electricity" className="text-slate-300">Électricité</Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-white">Distance à l'école (km)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    className="bg-slate-700 border-slate-600 text-white"
                    value={visitForm.distance_to_school_km}
                    onChange={(e) => setVisitForm({...visitForm, distance_to_school_km: e.target.value})}
                    placeholder="Ex: 2.5"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white">Observations</Label>
                  <Textarea
                    className="bg-slate-700 border-slate-600 text-white"
                    value={visitForm.observations}
                    onChange={(e) => setVisitForm({...visitForm, observations: e.target.value})}
                    placeholder="Notes et observations..."
                    rows={3}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="submit" className="flex-1 bg-cyan-600 hover:bg-cyan-700">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Enregistrer la Visite
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowVisitForm(false)}
                    className="border-slate-600"
                  >
                    Annuler
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SSRTEAgentDashboard;

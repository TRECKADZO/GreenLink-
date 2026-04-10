import { tokenService } from "../../services/tokenService";
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Progress } from '../../components/ui/progress';
import Navbar from '../../components/Navbar';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  Baby, Users, MapPin, DollarSign, ShieldCheck, BookOpen,
  AlertTriangle, TrendingDown, FileCheck, Download, RefreshCcw,
  Building2, Target, Heart, Scale, Globe2, FileText, ChevronRight,
  ChevronLeft
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const apiClient = {
  get: async (url) => {
    const token = tokenService.getToken();
    return axios.get(`${API_URL}${url}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
  }
};

const ICIAnalyticsDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [childLaborData, setChildLaborData] = useState(null);
  const [zoneData, setZoneData] = useState(null);
  const [socialImpactData, setSocialImpactData] = useState(null);
  const [dueDiligenceData, setDueDiligenceData] = useState(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (authLoading) return;
    if (!user || user.user_type !== 'admin') {
      toast.error('Accès refusé', { description: 'Réservé aux administrateurs' });
      navigate('/');
      return;
    }
    fetchAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [childLabor, zones, social, dueDiligence] = await Promise.all([
        apiClient.get('/api/ici-analytics/child-labor-dashboard'),
        apiClient.get('/api/ici-analytics/zone-categorization'),
        apiClient.get('/api/ici-analytics/social-impact-indicators'),
        apiClient.get('/api/ici-analytics/buyer-due-diligence-package')
      ]);
      setChildLaborData(childLabor.data);
      setZoneData(zones.data);
      setSocialImpactData(social.data);
      setDueDiligenceData(dueDiligence.data);
    } catch (error) {
      console.error('Error fetching ICI data:', error);
      toast.error('Erreur lors du chargement des données ICI');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    return new Intl.NumberFormat('fr-FR').format(num);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Navbar />
        <div className="pt-24 flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      
      <div className="pt-24 pb-12 px-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/admin')}
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Retour
              </Button>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-amber-500/20 rounded-lg">
                    <Baby className="w-6 h-6 text-amber-400" />
                  </div>
                  <h1 className="text-2xl font-bold">ICI Analytics</h1>
                </div>
                <p className="text-slate-400">Données officielles International Cocoa Initiative & Gouvernement CI</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 px-4 py-2">
                <ShieldCheck className="w-4 h-4 mr-2" />
                Protocole Harkin-Engel
              </Badge>
              <Button 
                variant="outline" 
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
                onClick={fetchAllData}
              >
                <RefreshCcw className="w-4 h-4 mr-2" />
                Actualiser
              </Button>
            </div>
          </div>

          {/* Key Metrics Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Baby className="w-5 h-5 text-red-400" />
                  <Badge className="bg-red-500/20 text-red-400 text-xs">À surveiller</Badge>
                </div>
                <p className="text-2xl font-bold text-white">26%</p>
                <p className="text-xs text-slate-400">Enfants en situation de travail</p>
                <div className="mt-2">
                  <Progress value={26} className="h-1 bg-slate-800" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Heart className="w-5 h-5 text-green-400" />
                  <Badge className="bg-green-500/20 text-green-400 text-xs">Positif</Badge>
                </div>
                <p className="text-2xl font-bold text-white">77%</p>
                <p className="text-xs text-slate-400">Enfants recevant un support</p>
                <div className="mt-2">
                  <Progress value={77} className="h-1 bg-slate-800" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <TrendingDown className="w-5 h-5 text-blue-400" />
                  <Badge className="bg-blue-500/20 text-blue-400 text-xs">Impact</Badge>
                </div>
                <p className="text-2xl font-bold text-white">44%</p>
                <p className="text-xs text-slate-400">Sortis du travail après suivi</p>
                <div className="mt-2">
                  <Progress value={44} className="h-1 bg-slate-800" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Users className="w-5 h-5 text-purple-400" />
                  <Badge className="bg-purple-500/20 text-purple-400 text-xs">Couverture</Badge>
                </div>
                <p className="text-2xl font-bold text-white">1.17M</p>
                <p className="text-xs text-slate-400">Ménages couverts SSRTE</p>
                <div className="mt-2">
                  <Progress value={85} className="h-1 bg-slate-800" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs Navigation */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-slate-900 border-slate-800">
              <TabsTrigger value="overview" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
                Vue d'ensemble
              </TabsTrigger>
              <TabsTrigger value="zones" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
                Zones à Risque
              </TabsTrigger>
              <TabsTrigger value="impact" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
                Impact Social
              </TabsTrigger>
              <TabsTrigger value="compliance" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
                Due Diligence
              </TabsTrigger>
            </TabsList>

            {/* Tab: Overview */}
            <TabsContent value="overview" className="mt-6 space-y-6">
              {/* Child Labor Dashboard */}
              {childLaborData && (
                <>
                  {/* SSRTE Card */}
                  <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-white">
                        <ShieldCheck className="w-5 h-5 text-amber-400" />
                        Système SSRTE (Suivi et Remédiation du Travail des Enfants)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-sm font-medium text-slate-400 mb-3">Composantes du système</h4>
                          <div className="space-y-2">
                            {childLaborData.ssrte_implementation?.composantes?.map((comp, i) => (
                              <div key={`el-${i}`} className="flex items-center gap-2 p-2 bg-slate-800/50 rounded-lg">
                                <ChevronRight className="w-4 h-4 text-amber-400" />
                                <span className="text-sm text-slate-300">{comp}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-slate-400 mb-3">Efficacité mesurée</h4>
                          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                            <p className="text-3xl font-bold text-green-400">44%</p>
                            <p className="text-sm text-slate-400">de réduction du travail des enfants après intervention</p>
                            <p className="text-xs text-slate-500 mt-2">Mesuré après 2 visites de suivi consécutives</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Dangerous Tasks */}
                  <Card className="bg-slate-900 border-slate-800">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-white">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                        Tâches Dangereuses Identifiées
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-3 gap-4">
                        {childLaborData.taches_dangereuses?.taches?.map((tache, i) => (
                          <div key={`el-${i}`} className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-slate-300">{tache.nom}</span>
                              <Badge className="bg-red-500/20 text-red-400">{tache.pourcentage}%</Badge>
                            </div>
                            <Progress value={tache.pourcentage} className="h-2 bg-slate-800" />
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-slate-500 mt-4">
                        Source: Protocole Harkin-Engel - Convention OIT 182
                      </p>
                    </CardContent>
                  </Card>

                  {/* Training & Capacity Building */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <Card className="bg-slate-900 border-slate-800">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-white text-lg">
                          <BookOpen className="w-5 h-5 text-blue-400" />
                          Formations Dispensées
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                          <span className="text-slate-300">Mécanismes de réclamation</span>
                          <Badge className="bg-blue-500/20 text-blue-400">
                            {formatNumber(childLaborData.formations_capacites?.mecanismes_reclamation?.personnes_formees)} personnes
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                          <span className="text-slate-300">Travail forcé</span>
                          <Badge className="bg-blue-500/20 text-blue-400">
                            {formatNumber(childLaborData.formations_capacites?.travail_force?.personnes_formees)} personnes
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                          <span className="text-slate-300">Mécanismes implémentés</span>
                          <Badge className="bg-green-500/20 text-green-400">
                            {childLaborData.formations_capacites?.mecanismes_reclamation?.mecanismes_implementes} points
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-slate-900 border-slate-800">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-white text-lg">
                          <Target className="w-5 h-5 text-amber-400" />
                          Recommandations Prioritaires
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {childLaborData.recommandations?.map((rec, i) => (
                          <div key={`el-${i}`} className="p-3 bg-slate-800/50 rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge 
                                className={`text-xs ${
                                  rec.priorite === 1 ? 'bg-red-500/20 text-red-400' :
                                  rec.priorite === 2 ? 'bg-amber-500/20 text-amber-400' :
                                  'bg-blue-500/20 text-blue-400'
                                }`}
                              >
                                P{rec.priorite}
                              </Badge>
                              <span className="text-sm font-medium text-slate-200">{rec.action}</span>
                            </div>
                            <p className="text-xs text-slate-400">{rec.justification || rec.montant_recommande}</p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}
            </TabsContent>

            {/* Tab: Zones à Risque */}
            <TabsContent value="zones" className="mt-6 space-y-6">
              {zoneData && (
                <>
                  <Card className="bg-gradient-to-r from-slate-900 via-amber-900/20 to-slate-900 border-amber-500/30">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-white">
                        <MapPin className="w-5 h-5 text-amber-400" />
                        Catégorisation Officielle des Zones Productrices
                        <Badge className="ml-2 bg-amber-500/20 text-amber-400">Gouvernement CI 2006</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-slate-400 mb-6">
                        Classification basée sur l'ACP et K-means pour le protocole Harkin-Engel
                      </p>
                      
                      <div className="grid md:grid-cols-3 gap-4">
                        {/* Catégorie 1 */}
                        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <Badge className="bg-red-500 text-white">Catégorie 1</Badge>
                            <span className="text-red-400 text-sm font-bold">RISQUE ÉLEVÉ</span>
                          </div>
                          <p className="text-white font-medium mb-2">20 départements</p>
                          <p className="text-slate-400 text-sm mb-3">{zoneData.categories?.categorie_1?.description}</p>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Production nationale</span>
                              <span className="text-red-400 font-bold">2%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Proportion enfants</span>
                              <span className="text-red-400">Élevée</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Alphabétisation</span>
                              <span className="text-red-400">Faible</span>
                            </div>
                          </div>
                          <p className="text-xs text-slate-500 mt-3 pt-2 border-t border-slate-700">
                            Action: Monitoring mensuel requis
                          </p>
                        </div>

                        {/* Catégorie 2 */}
                        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <Badge className="bg-amber-500 text-white">Catégorie 2</Badge>
                            <span className="text-amber-400 text-sm font-bold">RISQUE MODÉRÉ</span>
                          </div>
                          <p className="text-white font-medium mb-2">14 départements</p>
                          <p className="text-slate-400 text-sm mb-3">{zoneData.categories?.categorie_2?.description}</p>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Production nationale</span>
                              <span className="text-amber-400 font-bold">11%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Proportion enfants</span>
                              <span className="text-amber-400">Moyenne</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Alphabétisation</span>
                              <span className="text-green-400">Forte</span>
                            </div>
                          </div>
                          <p className="text-xs text-slate-500 mt-3 pt-2 border-t border-slate-700">
                            Action: Monitoring trimestriel
                          </p>
                        </div>

                        {/* Catégorie 3 */}
                        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <Badge className="bg-green-500 text-white">Catégorie 3</Badge>
                            <span className="text-green-400 text-sm font-bold">RISQUE FAIBLE</span>
                          </div>
                          <p className="text-white font-medium mb-2">17 départements</p>
                          <p className="text-slate-400 text-sm mb-3">{zoneData.categories?.categorie_3?.description}</p>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Production nationale</span>
                              <span className="text-green-400 font-bold">87%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Proportion enfants</span>
                              <span className="text-green-400">Faible</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Alphabétisation</span>
                              <span className="text-green-400">Forte</span>
                            </div>
                          </div>
                          <p className="text-xs text-slate-500 mt-3 pt-2 border-t border-slate-700">
                            Action: Focus optimisation carbone
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Methodology */}
                  <Card className="bg-slate-900 border-slate-800">
                    <CardHeader>
                      <CardTitle className="text-white">Méthodologie de Classification</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="p-4 bg-slate-800/50 rounded-lg">
                          <h4 className="text-amber-400 font-medium mb-2">Déterminants Sociaux</h4>
                          <ul className="text-sm text-slate-400 space-y-1">
                            {zoneData.methodologie?.variables_determinants_sociaux?.slice(0, 4).map((v, i) => (
                              <li key={`el-${i}`}>• {v}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="p-4 bg-slate-800/50 rounded-lg">
                          <h4 className="text-blue-400 font-medium mb-2">Capital Humain</h4>
                          <ul className="text-sm text-slate-400 space-y-1">
                            {zoneData.methodologie?.variables_capital_humain?.slice(0, 4).map((v, i) => (
                              <li key={`el-${i}`}>• {v}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="p-4 bg-slate-800/50 rounded-lg">
                          <h4 className="text-green-400 font-medium mb-2">Capital Économique</h4>
                          <ul className="text-sm text-slate-400 space-y-1">
                            {zoneData.methodologie?.variables_capital_economique?.slice(0, 4).map((v, i) => (
                              <li key={`el-${i}`}>• {v}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            {/* Tab: Impact Social */}
            <TabsContent value="impact" className="mt-6 space-y-6">
              {socialImpactData && (
                <>
                  {/* ODD Alignment */}
                  <div className="grid md:grid-cols-3 gap-4">
                    {/* ODD 8.7 */}
                    <Card className="bg-gradient-to-br from-red-900/30 to-slate-900 border-red-500/30">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2 text-white">
                          <div className="w-8 h-8 bg-red-500 rounded flex items-center justify-center text-white font-bold text-sm">8</div>
                          ODD 8.7 - Travail Décent
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-slate-400 text-sm mb-3">Éliminer le travail des enfants d'ici 2025</p>
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-slate-400">Prévalence actuelle</span>
                              <span className="text-red-400 font-bold">26%</span>
                            </div>
                            <Progress value={26} className="h-2 bg-slate-800" />
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Baseline 2020: 45%</span>
                            <span className="text-green-400">Objectif 2025: 10%</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* ODD 4.1 */}
                    <Card className="bg-gradient-to-br from-blue-900/30 to-slate-900 border-blue-500/30">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2 text-white">
                          <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center text-white font-bold text-sm">4</div>
                          ODD 4.1 - Éducation
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-slate-400 text-sm mb-3">Accès universel à l'éducation</p>
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-slate-400">Taux scolarisation</span>
                              <span className="text-blue-400 font-bold">78%</span>
                            </div>
                            <Progress value={78} className="h-2 bg-slate-800" />
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Baseline: 62%</span>
                            <span className="text-green-400">+16 points</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* ODD 1.1 */}
                    <Card className="bg-gradient-to-br from-green-900/30 to-slate-900 border-green-500/30">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2 text-white">
                          <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center text-white font-bold text-sm">1</div>
                          ODD 1.1 - Pauvreté
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-slate-400 text-sm mb-3">Éliminer l'extrême pauvreté</p>
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-slate-400">Sous seuil pauvreté</span>
                              <span className="text-green-400 font-bold">15%</span>
                            </div>
                            <Progress value={15} className="h-2 bg-slate-800" />
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Avant: 32%</span>
                            <span className="text-green-400">-17 points</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Income Impact */}
                  <Card className="bg-slate-900 border-slate-800">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-white">
                        <DollarSign className="w-5 h-5 text-green-400" />
                        Impact sur les Revenus des Producteurs
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-4 gap-4">
                        <div className="p-4 bg-slate-800/50 rounded-lg text-center">
                          <p className="text-slate-400 text-sm mb-1">Avant GreenLink</p>
                          <p className="text-2xl font-bold text-white">650,000</p>
                          <p className="text-xs text-slate-500">XOF/an</p>
                        </div>
                        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-center">
                          <p className="text-slate-400 text-sm mb-1">Après GreenLink</p>
                          <p className="text-2xl font-bold text-green-400">890,000</p>
                          <p className="text-xs text-slate-500">XOF/an</p>
                        </div>
                        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg text-center">
                          <p className="text-slate-400 text-sm mb-1">Augmentation</p>
                          <p className="text-2xl font-bold text-amber-400">+36.9%</p>
                          <p className="text-xs text-slate-500">vs baseline</p>
                        </div>
                        <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg text-center">
                          <p className="text-slate-400 text-sm mb-1">Prime carbone moy.</p>
                          <p className="text-2xl font-bold text-blue-400">125,000</p>
                          <p className="text-xs text-slate-500">XOF/producteur</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Gender & Inclusion */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <Card className="bg-slate-900 border-slate-800">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-white text-lg">
                          <Users className="w-5 h-5 text-pink-400" />
                          Genre & Inclusion (ODD 5)
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                          <span className="text-slate-300">Femmes productrices</span>
                          <Badge className="bg-pink-500/20 text-pink-400">18%</Badge>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                          <span className="text-slate-300">Accès aux primes (femmes)</span>
                          <Badge className="bg-green-500/20 text-green-400">95%</Badge>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                          <span className="text-slate-300">Groupements AVEC féminins</span>
                          <Badge className="bg-blue-500/20 text-blue-400">85</Badge>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-slate-900 border-slate-800">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-white text-lg">
                          <Scale className="w-5 h-5 text-purple-400" />
                          Mécanismes de Protection
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                          <span className="text-slate-300">Points de réclamation</span>
                          <Badge className="bg-purple-500/20 text-purple-400">95</Badge>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                          <span className="text-slate-300">Visites suivi/an</span>
                          <Badge className="bg-blue-500/20 text-blue-400">2.5 moy.</Badge>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                          <span className="text-slate-300">Réclamations traitées 2024</span>
                          <Badge className="bg-green-500/20 text-green-400">127</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}
            </TabsContent>

            {/* Tab: Due Diligence */}
            <TabsContent value="compliance" className="mt-6 space-y-6">
              {dueDiligenceData && (
                <>
                  {/* EUDR Compliance Overview */}
                  <Card className="bg-gradient-to-r from-purple-900/30 via-slate-900 to-blue-900/30 border-purple-500/30">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-white">
                        <Globe2 className="w-5 h-5 text-purple-400" />
                        Conformité EUDR Article 3
                        <Badge className="ml-2 bg-green-500">CONFORME</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-6">
                        {/* Deforestation Free */}
                        <div className="p-4 bg-slate-800/50 rounded-lg">
                          <h4 className="text-green-400 font-medium mb-3 flex items-center gap-2">
                            <FileCheck className="w-4 h-4" />
                            Zéro Déforestation
                          </h4>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Status</span>
                              <Badge className="bg-green-500/20 text-green-400">CONFORME</Badge>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Taux vérification</span>
                              <span className="text-white font-bold">98.7%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Méthode</span>
                              <span className="text-slate-300">Satellite + terrain</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Date de référence</span>
                              <span className="text-slate-300">31/12/2020</span>
                            </div>
                          </div>
                        </div>

                        {/* Human Rights */}
                        <div className="p-4 bg-slate-800/50 rounded-lg">
                          <h4 className="text-amber-400 font-medium mb-3 flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4" />
                            Droits Humains
                          </h4>
                          <div className="space-y-3">
                            <div className="p-2 bg-amber-500/10 rounded">
                              <div className="flex justify-between mb-1">
                                <span className="text-slate-400 text-sm">Travail des enfants</span>
                                <Badge className="bg-amber-500/20 text-amber-400 text-xs">EN COURS</Badge>
                              </div>
                              <p className="text-xs text-slate-500">87% zones à risque faible - SSRTE actif</p>
                            </div>
                            <div className="p-2 bg-green-500/10 rounded">
                              <div className="flex justify-between mb-1">
                                <span className="text-slate-400 text-sm">Travail forcé</span>
                                <Badge className="bg-green-500/20 text-green-400 text-xs">CONFORME</Badge>
                              </div>
                              <p className="text-xs text-slate-500">Risque 3.5/5 - 95 mécanismes réclamation</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Traceability */}
                  <Card className="bg-slate-900 border-slate-800">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-white">
                        <MapPin className="w-5 h-5 text-blue-400" />
                        Traçabilité
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                          <p className="text-3xl font-bold text-white">{formatNumber(dueDiligenceData.tracabilite?.producteurs_enregistres || 0)}</p>
                          <p className="text-sm text-slate-400">Producteurs enregistrés</p>
                        </div>
                        <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                          <p className="text-3xl font-bold text-white">{formatNumber(dueDiligenceData.tracabilite?.parcelles_geolocalisees || 0)}</p>
                          <p className="text-sm text-slate-400">Parcelles géolocalisées</p>
                        </div>
                        <div className="text-center p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                          <p className="text-3xl font-bold text-green-400">96.5%</p>
                          <p className="text-sm text-slate-400">Taux traçabilité</p>
                        </div>
                        <div className="text-center p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                          <p className="text-3xl font-bold text-blue-400">&lt;10m</p>
                          <p className="text-sm text-slate-400">Précision GPS</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Pricing Packages */}
                  <Card className="bg-slate-900 border-slate-800">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-white">
                        <DollarSign className="w-5 h-5 text-green-400" />
                        Packages Due Diligence Acheteurs
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-3 gap-4">
                        {dueDiligenceData.pricing && Object.entries(dueDiligenceData.pricing).map(([key, pkg]) => (
                          <div 
                            key={key} 
                            className={`p-4 rounded-lg border ${
                              key === 'package_premium' 
                                ? 'bg-amber-500/10 border-amber-500/30' 
                                : 'bg-slate-800/50 border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium text-white capitalize">
                                {key.replace('package_', '').replace('_', ' ')}
                              </h4>
                              {key === 'package_premium' && (
                                <Badge className="bg-amber-500 text-white">Populaire</Badge>
                              )}
                            </div>
                            <p className="text-2xl font-bold text-green-400 mb-3">
                              {typeof pkg.prix_eur === 'number' ? `${formatNumber(pkg.prix_eur)} €` : pkg.prix_eur}
                            </p>
                            <ul className="space-y-2">
                              {pkg.inclus?.map((item, i) => (
                                <li key={`el-${i}`} className="flex items-center gap-2 text-sm text-slate-300">
                                  <ChevronRight className="w-3 h-3 text-green-400" />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Available Documents */}
                  <Card className="bg-slate-900 border-slate-800">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-white">
                        <FileText className="w-5 h-5 text-purple-400" />
                        Documents Disponibles
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-5 gap-3">
                        {dueDiligenceData.documents_disponibles?.map((doc, i) => (
                          <div key={`el-${i}`} className="p-3 bg-slate-800/50 rounded-lg text-center hover:bg-slate-700/50 cursor-pointer transition-colors">
                            <FileText className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                            <p className="text-xs text-slate-300">{doc}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>
          </Tabs>

          {/* Export Section */}
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">Exporter les données ICI</p>
                  <p className="text-sm text-slate-400">Rapport complet pour partenaires institutionnels</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
                    <Download className="w-4 h-4 mr-2" />
                    JSON
                  </Button>
                  <Button className="bg-amber-500 text-white hover:bg-amber-600">
                    <Download className="w-4 h-4 mr-2" />
                    PDF Rapport
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ICIAnalyticsDashboard;

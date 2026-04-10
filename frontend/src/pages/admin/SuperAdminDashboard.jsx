import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyticsApi } from '../../services/analyticsApi';
import MarketplaceAnalyticsTab from '../../components/admin/MarketplaceAnalyticsTab';
import USSDSimulator from '../../components/USSDSimulator';
import OnboardingDashboard from '../../components/admin/OnboardingDashboard';
import CooperativeNetworkTab from './CooperativeNetworkTab';
import { 
  BarChart3, Globe, Leaf, Users, DollarSign, 
  TrendingUp, FileText, Download, Building2,
  MapPin, Shield, Scale, Target, Briefcase,
  ArrowUpRight, ArrowDownRight, RefreshCw,
  ChevronRight, Calendar, Filter, Bell, Activity,
  Award, Baby, CreditCard, Package, Store, ShoppingBag,
  TreePine, Sprout, Eye, Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner';

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('year');
  const [activeTab, setActiveTab] = useState('overview');
  const [marketplaceStats, setMarketplaceStats] = useState(null);
  const [reddImpact, setReddImpact] = useState(null);
  const [reddLoading, setReddLoading] = useState(false);
  const [ars1000Data, setArs1000Data] = useState(null);
  const [ars1000Loading, setArs1000Loading] = useState(false);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const data = await analyticsApi.getDashboard(period);
      setDashboardData(data);
    } catch (error) {
      /* error logged */
      toast.error('Erreur lors du chargement des analytics');
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const fetchMarketplaceStats = async () => {
      try {
        const response = await analyticsApi.getMarketplaceStats();
        setMarketplaceStats(response);
      } catch (error) {
        /* error logged */
      }
    };
    fetchMarketplaceStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (activeTab === 'redd-impact' && !reddImpact) {
      const fetchRedd = async () => {
        setReddLoading(true);
        try {
          const data = await analyticsApi.getReddImpact();
          setReddImpact(data);
        } catch (error) {
          /* error logged */
          toast.error('Erreur lors du chargement des données environnementales');
        } finally {
          setReddLoading(false);
        }
      };
      fetchRedd();
    }
    if (activeTab === 'ars1000' && !ars1000Data) {
      const fetchArs = async () => {
        setArs1000Loading(true);
        try {
          const data = await analyticsApi.getArs1000Stats();
          setArs1000Data(data);
        } catch (error) {
          /* error logged */
        } finally {
          setArs1000Loading(false);
        }
      };
      fetchArs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleExport = async (reportType) => {
    try {
      const result = await analyticsApi.exportCSV(reportType);
      toast.success(`Export ${reportType} initié`);
    } catch (error) {
      toast.error('Erreur lors de l\'export');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="mt-4 text-slate-400">Chargement des données stratégiques...</p>
        </div>
      </div>
    );
  }

  const { production, sustainability, eudr_compliance, social_impact, market, macroeconomic, cooperatives, carbon_auditors, ssrte_monitoring, ici_alerts, carbon_premiums } = dashboardData || {};

  return (
    <div className="min-h-screen bg-slate-900" data-testid="super-admin-dashboard">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/admin/dashboard')}
                  className="text-slate-400 hover:text-white hover:bg-slate-700"
                  data-testid="back-button"
                >
                  <ArrowUpRight className="h-4 w-4 rotate-[225deg]" />
                  Retour
                </Button>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    Centre de Données Stratégiques
                  </h1>
                  <p className="text-slate-400 text-sm">
                    GreenLink Agritech • Côte d'Ivoire
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-40 bg-slate-800 border-slate-700 text-white">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">30 jours</SelectItem>
                  <SelectItem value="quarter">Trimestre</SelectItem>
                  <SelectItem value="year">Année</SelectItem>
                  <SelectItem value="all">Tout</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                onClick={fetchDashboard}
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualiser
              </Button>
              <Button 
                onClick={() => handleExport('production')}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Download className="h-4 w-4 mr-2" />
                Exporter
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Target Audience Badges */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-wrap gap-2">
          <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/30">
            <Globe className="h-3 w-3 mr-1" />
            Banque Mondiale
          </Badge>
          <Badge className="bg-purple-600/20 text-purple-400 border-purple-600/30">
            <Building2 className="h-3 w-3 mr-1" />
            FMI
          </Badge>
          <Badge className="bg-amber-600/20 text-amber-400 border-amber-600/30">
            <Scale className="h-3 w-3 mr-1" />
            OMC
          </Badge>
          <Badge className="bg-emerald-600/20 text-emerald-400 border-emerald-600/30">
            <Leaf className="h-3 w-3 mr-1" />
            ONG Environnement
          </Badge>
          <Badge className="bg-rose-600/20 text-rose-400 border-rose-600/30">
            <Briefcase className="h-3 w-3 mr-1" />
            Bourse Café-Cacao
          </Badge>
          <Badge className="bg-cyan-600/20 text-cyan-400 border-cyan-600/30">
            <Target className="h-3 w-3 mr-1" />
            Acheteurs Internationaux
          </Badge>
        </div>
      </div>

      {/* Quick Navigation Menu */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <h3 className="text-sm font-medium text-slate-400 mb-3">Accès Rapide</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <button
              onClick={() => navigate('/admin/realtime')}
              className="flex items-center gap-2 p-3 bg-slate-700/50 hover:bg-emerald-600/20 rounded-lg transition text-left group"
            >
              <Activity className="w-5 h-5 text-emerald-400 group-hover:text-emerald-300" />
              <span className="text-sm text-slate-300 group-hover:text-white">Temps Réel</span>
            </button>
            <button
              onClick={() => navigate('/admin/notifications')}
              className="flex items-center gap-2 p-3 bg-slate-700/50 hover:bg-amber-600/20 rounded-lg transition text-left group"
            >
              <Bell className="w-5 h-5 text-amber-400 group-hover:text-amber-300" />
              <span className="text-sm text-slate-300 group-hover:text-white">Notifications</span>
            </button>
            <button
              onClick={() => navigate('/admin/ssrte-analytics')}
              className="flex items-center gap-2 p-3 bg-slate-700/50 hover:bg-blue-600/20 rounded-lg transition text-left group"
            >
              <Baby className="w-5 h-5 text-blue-400 group-hover:text-blue-300" />
              <span className="text-sm text-slate-300 group-hover:text-white">SSRTE Analytics</span>
            </button>
            <button
              onClick={() => navigate('/admin/ici-analytics')}
              className="flex items-center gap-2 p-3 bg-slate-700/50 hover:bg-purple-600/20 rounded-lg transition text-left group"
            >
              <Shield className="w-5 h-5 text-purple-400 group-hover:text-purple-300" />
              <span className="text-sm text-slate-300 group-hover:text-white">ICI Analytics</span>
            </button>
            <button
              onClick={() => navigate('/admin/carbon-business')}
              className="flex items-center gap-2 p-3 bg-slate-700/50 hover:bg-green-600/20 rounded-lg transition text-left group"
            >
              <Leaf className="w-5 h-5 text-green-400 group-hover:text-green-300" />
              <span className="text-sm text-slate-300 group-hover:text-white">Business Carbone</span>
            </button>
            <button
              onClick={() => navigate('/admin/cooperative-comparison')}
              className="flex items-center gap-2 p-3 bg-slate-700/50 hover:bg-cyan-600/20 rounded-lg transition text-left group"
            >
              <Building2 className="w-5 h-5 text-cyan-400 group-hover:text-cyan-300" />
              <span className="text-sm text-slate-300 group-hover:text-white">Comparaison Coop</span>
            </button>
            <button
              onClick={() => navigate('/admin/billing')}
              className="flex items-center gap-2 p-3 bg-slate-700/50 hover:bg-rose-600/20 rounded-lg transition text-left group"
            >
              <CreditCard className="w-5 h-5 text-rose-400 group-hover:text-rose-300" />
              <span className="text-sm text-slate-300 group-hover:text-white">Facturation</span>
            </button>
            <button
              onClick={() => navigate('/admin/badge-analytics')}
              className="flex items-center gap-2 p-3 bg-slate-700/50 hover:bg-yellow-600/20 rounded-lg transition text-left group"
            >
              <Award className="w-5 h-5 text-yellow-400 group-hover:text-yellow-300" />
              <span className="text-sm text-slate-300 group-hover:text-white">Badges Auditeurs</span>
            </button>
            <button
              onClick={() => navigate('/admin/premium-analytics')}
              className="flex items-center gap-2 p-3 bg-slate-700/50 hover:bg-indigo-600/20 rounded-lg transition text-left group"
            >
              <BarChart3 className="w-5 h-5 text-indigo-400 group-hover:text-indigo-300" />
              <span className="text-sm text-slate-300 group-hover:text-white">10 Analytics Premium</span>
            </button>
            <button
              onClick={() => navigate('/admin/audit-missions')}
              className="flex items-center gap-2 p-3 bg-slate-700/50 hover:bg-teal-600/20 rounded-lg transition text-left group"
            >
              <Target className="w-5 h-5 text-teal-400 group-hover:text-teal-300" />
              <span className="text-sm text-slate-300 group-hover:text-white">Missions Audit</span>
            </button>
            <button
              onClick={() => navigate('/marketplace/harvest')}
              className="flex items-center gap-2 p-3 bg-slate-700/50 hover:bg-amber-600/20 rounded-lg transition text-left group"
            >
              <Package className="w-5 h-5 text-amber-400 group-hover:text-amber-300" />
              <span className="text-sm text-slate-300 group-hover:text-white">Bourse Récoltes</span>
            </button>
            <button
              onClick={() => navigate('/admin/carbon-approvals')}
              className="flex items-center gap-2 p-3 bg-slate-700/50 hover:bg-teal-600/20 rounded-lg transition text-left group"
            >
              <Shield className="w-5 h-5 text-teal-400 group-hover:text-teal-300" />
              <span className="text-sm text-slate-300 group-hover:text-white">Approbation Carbone</span>
            </button>
            <button
              onClick={() => navigate('/cooperative/inscriptions')}
              className="flex items-center gap-2 p-3 bg-slate-700/50 hover:bg-violet-600/20 rounded-lg transition text-left group"
              data-testid="admin-inscriptions-ussd-btn"
            >
              <Users className="w-5 h-5 text-violet-400 group-hover:text-violet-300" />
              <span className="text-sm text-slate-300 group-hover:text-white">Inscriptions USSD/Web</span>
            </button>
            <button
              onClick={() => navigate('/carbon-marketplace')}
              className="flex items-center gap-2 p-3 bg-slate-700/50 hover:bg-emerald-600/20 rounded-lg transition text-left group"
            >
              <Store className="w-5 h-5 text-emerald-400 group-hover:text-emerald-300" />
              <span className="text-sm text-slate-300 group-hover:text-white">Marché Carbone</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-800 border-slate-700 flex-wrap">
            <TabsTrigger value="overview" className="data-[state=active]:bg-emerald-600">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="production" className="data-[state=active]:bg-emerald-600">Production</TabsTrigger>
            <TabsTrigger value="carbon" className="data-[state=active]:bg-emerald-600">Carbone & EUDR</TabsTrigger>
            <TabsTrigger value="audit" className="data-[state=active]:bg-emerald-600">Audit & SSRTE</TabsTrigger>
            <TabsTrigger value="social" className="data-[state=active]:bg-emerald-600">Impact Social</TabsTrigger>
            <TabsTrigger value="market" className="data-[state=active]:bg-emerald-600">Marché & Commerce</TabsTrigger>
            <TabsTrigger value="marketplace" className="data-[state=active]:bg-amber-600">Bourse Recoltes</TabsTrigger>
            <TabsTrigger value="ussd" className="data-[state=active]:bg-violet-600">USSD</TabsTrigger>
            <TabsTrigger value="redd-impact" className="data-[state=active]:bg-green-600" data-testid="redd-impact-tab">Impact Environnemental</TabsTrigger>
            <TabsTrigger value="onboarding" className="data-[state=active]:bg-cyan-600">Onboarding</TabsTrigger>
            <TabsTrigger value="coop-network" className="data-[state=active]:bg-teal-600" data-testid="coop-network-tab-trigger">Réseau Coopératives</TabsTrigger>
            <TabsTrigger value="ars1000" className="data-[state=active]:bg-lime-600" data-testid="ars1000-tab-trigger">ARS 1000</TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <MetricCard
                title="Agriculteurs"
                value={production?.total_farmers || 0}
                icon={Users}
                color="blue"
                trend="+12%"
              />
              <MetricCard
                title="Hectares"
                value={production?.total_hectares || 0}
                suffix="ha"
                icon={MapPin}
                color="green"
                trend="+8%"
              />
              <MetricCard
                title="CO₂ Capturé"
                value={sustainability?.total_co2_captured_tonnes || 0}
                suffix="T"
                icon={Leaf}
                color="emerald"
                trend="+15%"
              />
              <MetricCard
                title="Crédits Carbone"
                value={sustainability?.carbon_credits_generated || 0}
                icon={Target}
                color="teal"
              />
              <MetricCard
                title="Conformité EUDR"
                value={eudr_compliance?.eudr_compliance_rate || 0}
                suffix="%"
                icon={Shield}
                color="amber"
              />
              <MetricCard
                title="Volume Marché"
                value={formatCurrency(market?.total_volume_xof || 0)}
                icon={DollarSign}
                color="purple"
                trend="+23%"
              />
            </div>

            {/* Main Dashboard Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Production Overview */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-emerald-500" />
                    Production Nationale
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Volumes par filière agricole
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(production?.production_by_crop_kg || {}).map(([crop, volume]) => (
                      <div key={crop} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-300">{crop}</span>
                          <span className="text-white font-medium">{formatWeight(volume)}</span>
                        </div>
                        <Progress 
                          value={Math.min((volume / 100000) * 100, 100)} 
                          className="h-2 bg-slate-700"
                        />
                      </div>
                    ))}
                    {Object.keys(production?.production_by_crop_kg || {}).length === 0 && (
                      <p className="text-slate-500 text-center py-4">Aucune donnée de production</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Carbon & Sustainability */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Leaf className="h-5 w-5 text-emerald-500" />
                    Impact Environnemental
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Métriques carbone et durabilité
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-emerald-900/30 border border-emerald-700/30">
                      <p className="text-emerald-400 text-sm">CO₂ Capturé</p>
                      <p className="text-2xl font-bold text-white">
                        {sustainability?.total_co2_captured_tonnes || 0} T
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-teal-900/30 border border-teal-700/30">
                      <p className="text-teal-400 text-sm">Crédits Vendus</p>
                      <p className="text-2xl font-bold text-white">
                        {sustainability?.carbon_credits_sold || 0}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-green-900/30 border border-green-700/30">
                      <p className="text-green-400 text-sm">Revenus Carbone</p>
                      <p className="text-2xl font-bold text-white">
                        {formatCurrency(sustainability?.carbon_revenue_xof || 0)}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-lime-900/30 border border-lime-700/30">
                      <p className="text-lime-400 text-sm">Zéro Déforestation</p>
                      <p className="text-2xl font-bold text-white">
                        {sustainability?.deforestation_free_rate || 0}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Social Impact */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-500" />
                    Impact Social
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Développement rural et inclusion
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Bénéficiaires directs</span>
                      <span className="text-white font-bold">{social_impact?.total_beneficiaries || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Femmes agricultrices</span>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold">{social_impact?.gender_equality_rate || 0}%</span>
                        <Badge className="bg-pink-600/20 text-pink-400">Égalité</Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Jeunes (-35 ans)</span>
                      <span className="text-white font-bold">{social_impact?.youth_participation_rate || 0}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Inclusion financière</span>
                      <span className="text-white font-bold">{social_impact?.financial_inclusion_rate || 0}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Augmentation revenus</span>
                      <div className="flex items-center gap-2">
                        <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                        <span className="text-emerald-400 font-bold">+{social_impact?.income_increase_vs_2023 || 0}%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* EUDR Compliance */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Shield className="h-5 w-5 text-amber-500" />
                    Conformité EUDR
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Réglementation européenne anti-déforestation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-slate-400">Taux de conformité</span>
                        <span className="text-emerald-400 font-bold">{eudr_compliance?.eudr_compliance_rate || 0}%</span>
                      </div>
                      <Progress 
                        value={eudr_compliance?.eudr_compliance_rate || 0} 
                        className="h-3 bg-slate-700"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-slate-400">Géolocalisation</span>
                        <span className="text-blue-400 font-bold">{eudr_compliance?.geolocation_rate || 0}%</span>
                      </div>
                      <Progress 
                        value={eudr_compliance?.geolocation_rate || 0} 
                        className="h-3 bg-slate-700"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="p-3 rounded-lg bg-emerald-900/30 border border-emerald-700/30 text-center">
                        <p className="text-emerald-400 text-xs">Alertes Déforestation</p>
                        <p className="text-2xl font-bold text-white">{eudr_compliance?.deforestation_alerts || 0}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-amber-900/30 border border-amber-700/30 text-center">
                        <p className="text-amber-400 text-xs">Prêt Export UE</p>
                        <p className="text-2xl font-bold text-white">{eudr_compliance?.export_ready_percentage || 0}%</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Macroeconomic Indicators */}
            <Card className="bg-gradient-to-r from-slate-800 to-slate-900 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-purple-500" />
                  Indicateurs Macroéconomiques
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Impact sur l'économie nationale • Pour FMI, Banque Mondiale, Gouvernement
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  <div className="p-4 rounded-lg bg-slate-800/50 text-center">
                    <p className="text-slate-400 text-xs">Contribution PIB Agricole</p>
                    <p className="text-xl font-bold text-white">{macroeconomic?.contribution_pib_agricole || '0%'}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-800/50 text-center">
                    <p className="text-slate-400 text-xs">Devises Générées</p>
                    <p className="text-xl font-bold text-emerald-400">${macroeconomic?.devises_generees_usd || 0}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-800/50 text-center">
                    <p className="text-slate-400 text-xs">Emplois Secteur</p>
                    <p className="text-xl font-bold text-blue-400">{macroeconomic?.emploi_secteur_agricole || 0}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-800/50 text-center">
                    <p className="text-slate-400 text-xs">Investissements</p>
                    <p className="text-xl font-bold text-purple-400">{formatCurrency(macroeconomic?.investissements_recus_xof || 0)}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-800/50 text-center">
                    <p className="text-slate-400 text-xs">Croissance Secteur</p>
                    <p className="text-xl font-bold text-amber-400">+{macroeconomic?.taux_croissance_secteur || 0}%</p>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-800/50 text-center">
                    <p className="text-slate-400 text-xs">Balance Commerciale</p>
                    <p className="text-xl font-bold text-green-400">{macroeconomic?.balance_commerciale_impact || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Other tabs would follow similar patterns */}
          <TabsContent value="production">
            <ProductionTab data={production} />
          </TabsContent>

          <TabsContent value="carbon">
            <CarbonTab sustainability={sustainability} eudr={eudr_compliance} />
          </TabsContent>

          <TabsContent value="social">
            <SocialTab data={social_impact} cooperatives={cooperatives} />
          </TabsContent>

          <TabsContent value="market">
            <MarketTab data={market} />
          </TabsContent>

          <TabsContent value="audit">
            <AuditSSRTETab 
              auditors={carbon_auditors} 
              ssrte={ssrte_monitoring} 
              alerts={ici_alerts}
              premiums={carbon_premiums}
            />
          </TabsContent>

          <TabsContent value="marketplace">
            <MarketplaceAnalyticsTab />
          </TabsContent>

          <TabsContent value="ussd">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Simulateur USSD *144*99#</h3>
                <p className="text-sm text-slate-400 mb-4">
                  Testez le flux USSD en temps reel. Entrez un numero de telephone existant ou nouveau pour simuler l'experience d'un planteur.
                </p>
                <USSDSimulator title="Simulateur Admin" />
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white mb-2">Guide des flux</h3>
                <div className="space-y-3">
                  {[
                    { title: 'Inscription', desc: 'Option 2 → Nom → Code Coop → Village → PIN → Confirmation', color: 'border-violet-500/50 bg-violet-500/10' },
                    { title: 'Estimation Simple', desc: 'Option 1 → Connexion → Estimer → Simple → 5 questions → Resultat', color: 'border-emerald-500/50 bg-emerald-500/10' },
                    { title: 'Estimation Detaillee', desc: 'Option 1 → Connexion → Estimer → Detaillee → 9 questions → Resultat', color: 'border-blue-500/50 bg-blue-500/10' },
                    { title: 'Demande Versement', desc: 'Menu principal → Option 2 → Confirmation → Envoi Super Admin', color: 'border-amber-500/50 bg-amber-500/10' },
                    { title: 'Mon Profil', desc: 'Menu principal → Option 5 → Affiche nom, coop, parcelles, score', color: 'border-cyan-500/50 bg-cyan-500/10' },
                  ].map((flow, i) => (
                    <div key={`el-${i}`} className={`border rounded-lg p-3 ${flow.color}`}>
                      <p className="text-sm font-medium text-white">{flow.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{flow.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="redd-impact">
            <ReddImpactTab data={reddImpact} loading={reddLoading} />
          </TabsContent>

          <TabsContent value="onboarding">
            <OnboardingDashboard />
          </TabsContent>

          <TabsContent value="coop-network">
            <CooperativeNetworkTab />
          </TabsContent>

          <TabsContent value="ars1000">
            <ARS1000Tab data={ars1000Data} loading={ars1000Loading} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// Helper Components
const MetricCard = ({ title, value, suffix = '', icon: Icon, color, trend }) => {
  const colorClasses = {
    blue: 'from-blue-600 to-blue-700',
    green: 'from-green-600 to-green-700',
    emerald: 'from-emerald-600 to-emerald-700',
    teal: 'from-teal-600 to-teal-700',
    amber: 'from-amber-600 to-amber-700',
    purple: 'from-purple-600 to-purple-700',
  };

  return (
    <Card className="bg-slate-800 border-slate-700 hover:border-slate-600 transition-colors">
      <CardContent className="p-4">
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center mb-3`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <p className="text-2xl font-bold text-white">
          {typeof value === 'number' ? value.toLocaleString() : value}
          {suffix && <span className="text-sm text-slate-400 ml-1">{suffix}</span>}
        </p>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-slate-400">{title}</p>
          {trend && (
            <span className="text-xs text-emerald-400 flex items-center">
              <ArrowUpRight className="h-3 w-3" />
              {trend}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const ProductionTab = ({ data }) => (
  <div className="space-y-6">
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">Détails Production par Filière</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {['Cacao', 'Café', 'Anacarde'].map((crop) => (
            <div key={crop} className="p-6 rounded-xl bg-slate-900/50 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">{crop}</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Volume</span>
                  <span className="text-white">{data?.production_by_crop_kg?.[crop] || 0} kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Surface</span>
                  <span className="text-white">{Math.round((data?.total_hectares || 0) / 3)} ha</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Rendement</span>
                  <span className="text-emerald-400">{data?.average_yield_kg_per_ha || 0} kg/ha</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
);

const CarbonTab = ({ sustainability, eudr }) => {
  const riskColor = (level) => {
    const colors = { faible: 'text-emerald-400', moyen: 'text-amber-400', eleve: 'text-red-400' };
    return colors[level] || 'text-slate-400';
  };
  const riskBg = (level) => {
    const colors = { faible: 'bg-emerald-500/20 border-emerald-500/30', moyen: 'bg-amber-500/20 border-amber-500/30', eleve: 'bg-red-500/20 border-red-500/30' };
    return colors[level] || 'bg-slate-500/20';
  };
  const scoreColor = (score) => score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';

  return (
  <div className="space-y-6">
    {/* Row 1: Score Global + Carbone */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="bg-gradient-to-br from-emerald-900/40 to-slate-800 border-emerald-700/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-400" />
            Score EUDR Global
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-2">
            <p className="text-5xl font-bold" style={{ color: scoreColor(eudr?.eudr_compliance_rate || 0) }}>
              {eudr?.eudr_compliance_rate || 0}%
            </p>
            <p className={`text-sm font-semibold mt-2 ${riskColor(eudr?.risk_level)}`}>
              Risque {eudr?.risk_level?.toUpperCase() || 'N/A'}
            </p>
            <p className="text-slate-500 text-xs mt-1">Reglement (UE) 2023/1115</p>
          </div>
          {/* ESG Mini Summary */}
          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-700">
            <div className="text-center">
              <p className="text-xs text-slate-400">Env.</p>
              <p className="text-sm font-bold text-emerald-400">{Math.round(eudr?.esg_summary?.environmental_score || 0)}%</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-400">Social</p>
              <p className="text-sm font-bold text-blue-400">{Math.round(eudr?.esg_summary?.social_score || 0)}%</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-400">Gouv.</p>
              <p className="text-sm font-bold text-violet-400">{Math.round(eudr?.esg_summary?.governance_score || 0)}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Leaf className="h-5 w-5 text-emerald-500" />
            Marche Carbone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-3 rounded-lg bg-emerald-900/20 border border-emerald-700/30 mb-3">
            <p className="text-emerald-400 text-xs">Revenus Carbone Totaux</p>
            <p className="text-2xl font-bold text-white">{formatCurrency(sustainability?.carbon_revenue_xof || 0)}</p>
            <p className="text-slate-400 text-xs mt-1">{sustainability?.carbon_revenue_usd || 0} USD</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded-lg bg-slate-700/50">
              <p className="text-slate-400 text-xs">Generes</p>
              <p className="text-lg font-bold text-white">{sustainability?.carbon_credits_generated || 0}</p>
            </div>
            <div className="p-2 rounded-lg bg-slate-700/50">
              <p className="text-slate-400 text-xs">Vendus</p>
              <p className="text-lg font-bold text-emerald-400">{sustainability?.carbon_credits_sold || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-500" />
            Geolocalisation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-3">
            <p className="text-3xl font-bold" style={{ color: scoreColor(eudr?.geolocation_rate || 0) }}>
              {eudr?.geolocation_rate || 0}%
            </p>
            <p className="text-slate-400 text-xs">{eudr?.geolocated_parcels || 0} / {eudr?.total_parcels || 0} parcelles</p>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center px-2 py-1 rounded bg-emerald-900/20">
              <span className="text-xs text-emerald-300">Polygones GPS</span>
              <span className="text-sm font-bold text-emerald-400">{eudr?.geo_polygon_count || 0}</span>
            </div>
            <div className="flex justify-between items-center px-2 py-1 rounded bg-blue-900/20">
              <span className="text-xs text-blue-300">Points GPS</span>
              <span className="text-sm font-bold text-blue-400">{eudr?.geo_point_count || 0}</span>
            </div>
            <div className="flex justify-between items-center px-2 py-1 rounded bg-red-900/20">
              <span className="text-xs text-red-300">Sans GPS</span>
              <span className="text-sm font-bold text-red-400">{eudr?.geo_none_count || 0}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    {/* Row 2: Risk Matrix */}
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-sm flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-amber-500" />
          Matrice d'Evaluation des Risques EUDR
        </CardTitle>
        <p className="text-slate-400 text-xs mt-1">Evaluation multi-dimensionnelle ponderee - Article 10</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {(eudr?.risk_dimensions || []).map((dim, i) => (
            <div key={`el-${i}`} className="flex items-center gap-3">
              <span className="text-xs text-slate-400 w-32 flex-shrink-0">{dim.name}</span>
              <div className="flex-1 bg-slate-700 rounded-full h-3 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${dim.score}%`, backgroundColor: scoreColor(dim.score) }} />
              </div>
              <span className="text-xs text-slate-500 w-12">({dim.weight}%)</span>
              <span className="text-sm font-bold w-12 text-right" style={{ color: scoreColor(dim.score) }}>
                {Math.round(dim.score)}%
              </span>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-4 pt-3 border-t border-slate-700">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">SSRTE:</span>
            <span className="text-sm font-bold text-white">{eudr?.ssrte_visits_total || 0} visites</span>
            {eudr?.ssrte_high_risk > 0 && (
              <Badge className="bg-red-500/20 text-red-400 text-xs">{eudr?.ssrte_high_risk} a risque</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">ICI:</span>
            <span className="text-sm font-bold text-white">{eudr?.ici_profiles_total || 0} profils</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Verification:</span>
            <span className="text-sm font-bold text-white">{eudr?.verified_parcels || 0} verifiees</span>
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Row 3: Per-Cooperative + Certifications */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-500" />
            Conformite par Cooperative
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {(eudr?.per_cooperative || []).map((coop, i) => (
              <div key={`el-${i}`} className={`p-3 rounded-lg border ${riskBg(coop.risk)}`}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-semibold text-white">{coop.name}</span>
                  <span className={`text-xs font-bold uppercase ${riskColor(coop.risk)}`}>{coop.risk}</span>
                </div>
                <div className="flex gap-3 text-xs text-slate-400">
                  <span>{coop.members} membres</span>
                  <span>{coop.parcels} parcelles</span>
                  <span>GPS: {coop.geo_rate}%</span>
                  <span>SSRTE: {coop.child_labor_free}%</span>
                </div>
              </div>
            ))}
            {(!eudr?.per_cooperative || eudr.per_cooperative.length === 0) && (
              <p className="text-slate-500 text-sm text-center py-4">Aucune donnee cooperative</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500" />
            Certifications & Export
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 mb-4">
            {Object.entries(eudr?.certification_coverage || {}).map(([cert, count]) => (
              <div key={cert} className="flex items-center justify-between p-2 rounded-lg bg-slate-700/30">
                <span className="text-slate-300 text-sm capitalize">{cert.replace(/_/g, ' ')}</span>
                <Badge className="bg-emerald-600/20 text-emerald-400 text-xs">{count} parcelles</Badge>
              </div>
            ))}
          </div>
          <div className="p-3 rounded-lg bg-amber-900/20 border border-amber-700/30">
            <div className="flex justify-between items-center">
              <span className="text-amber-300 text-sm">Pret pour export UE</span>
              <span className="text-xl font-bold text-amber-400">{eudr?.export_ready_percentage || 0}%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
  );
};

const SocialTab = ({ data, cooperatives }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="bg-gradient-to-br from-pink-900/30 to-slate-800 border-pink-700/30">
        <CardHeader>
          <CardTitle className="text-white">Égalité des Genres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <p className="text-5xl font-bold text-pink-400">{data?.gender_equality_rate || 0}%</p>
            <p className="text-slate-400 mt-2">Femmes agricultrices</p>
            <p className="text-white text-lg mt-1">{data?.women_farmers || 0} femmes</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-blue-900/30 to-slate-800 border-blue-700/30">
        <CardHeader>
          <CardTitle className="text-white">Jeunesse</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <p className="text-5xl font-bold text-blue-400">{data?.youth_participation_rate || 0}%</p>
            <p className="text-slate-400 mt-2">Agriculteurs -35 ans</p>
            <p className="text-white text-lg mt-1">{data?.youth_farmers_under_35 || 0} jeunes</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-emerald-900/30 to-slate-800 border-emerald-700/30">
        <CardHeader>
          <CardTitle className="text-white">Inclusion Financière</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <p className="text-5xl font-bold text-emerald-400">{data?.financial_inclusion_rate || 0}%</p>
            <p className="text-slate-400 mt-2">Accès services bancaires</p>
            <p className="text-white text-lg mt-1">{data?.farmers_with_bank_account || 0} agriculteurs</p>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);

const MarketTab = ({ data }) => (
  <div className="space-y-6">
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">Prix Moyens par Produit (XOF/kg)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(data?.average_prices_xof_per_kg || {}).map(([product, price]) => (
            <div key={product} className="p-4 rounded-lg bg-slate-700/30 text-center">
              <p className="text-slate-400 text-xs capitalize">{product.replace('_', ' ')}</p>
              <p className="text-2xl font-bold text-white">{price}</p>
              <p className="text-emerald-400 text-xs">XOF/kg</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">Destinations Export</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(data?.export_destinations || {}).map(([region, percentage]) => (
            <div key={region} className="p-4 rounded-lg bg-slate-700/30">
              <p className="text-slate-400 text-sm capitalize">{region.replace('_', ' ')}</p>
              <p className="text-3xl font-bold text-white">{percentage}%</p>
              <Progress value={percentage} className="h-2 mt-2 bg-slate-600" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
);

// Helper functions
const formatCurrency = (value) => {
  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(1)}Mds`;
  } else if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K`;
  }
  return value.toLocaleString();
};

const formatWeight = (value) => {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)} T`;
  }
  return `${value} kg`;
};

// NEW: Audit & SSRTE Tab Component
const AuditSSRTETab = ({ auditors, ssrte, alerts, premiums }) => (
  <div className="space-y-6">
    {/* Row 1: Key Metrics */}
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      <div className="p-4 rounded-xl bg-gradient-to-br from-teal-900/50 to-slate-800 border border-teal-700/30">
        <p className="text-teal-400 text-xs font-medium">Auditeurs Carbone</p>
        <p className="text-3xl font-bold text-white">{auditors?.total_auditors || 0}</p>
        <p className="text-slate-400 text-xs mt-1">{auditors?.dual_role_agents || 0} double casquette</p>
      </div>
      <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-900/50 to-slate-800 border border-emerald-700/30">
        <p className="text-emerald-400 text-xs font-medium">Audits Complétés</p>
        <p className="text-3xl font-bold text-white">{auditors?.total_audits_completed || 0}</p>
        <p className="text-slate-400 text-xs mt-1">{auditors?.audits_in_progress || 0} en cours</p>
      </div>
      <div className="p-4 rounded-xl bg-gradient-to-br from-blue-900/50 to-slate-800 border border-blue-700/30">
        <p className="text-blue-400 text-xs font-medium">Visites SSRTE</p>
        <p className="text-3xl font-bold text-white">{ssrte?.total_ssrte_visits || 0}</p>
        <p className="text-slate-400 text-xs mt-1">{ssrte?.households_monitored || 0} ménages</p>
      </div>
      <div className="p-4 rounded-xl bg-gradient-to-br from-amber-900/50 to-slate-800 border border-amber-700/30">
        <p className="text-amber-400 text-xs font-medium">Enfants Identifiés</p>
        <p className="text-3xl font-bold text-white">{ssrte?.children_identified || 0}</p>
        <p className="text-slate-400 text-xs mt-1">{ssrte?.support_provided_count || 0} supports fournis</p>
      </div>
      <div className="p-4 rounded-xl bg-gradient-to-br from-rose-900/50 to-slate-800 border border-rose-700/30">
        <p className="text-rose-400 text-xs font-medium">Alertes Actives</p>
        <p className="text-3xl font-bold text-white">{alerts?.active_alerts || 0}</p>
        <p className="text-slate-400 text-xs mt-1">{alerts?.resolved_alerts || 0} résolues</p>
      </div>
      <div className="p-4 rounded-xl bg-gradient-to-br from-green-900/50 to-slate-800 border border-green-700/30">
        <p className="text-green-400 text-xs font-medium">Primes Distribuées</p>
        <p className="text-3xl font-bold text-white">{formatCurrency(premiums?.total_amount_distributed_xof || 0)}</p>
        <p className="text-slate-400 text-xs mt-1">{premiums?.beneficiaries_count || 0} bénéficiaires</p>
      </div>
    </div>

    {/* Row 2: Auditors & Missions */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-500" />
            Badges des Auditeurs
          </CardTitle>
          <CardDescription className="text-slate-400">
            Gamification et progression des auditeurs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🌱</span>
                <span className="text-slate-300">Débutant</span>
              </div>
              <Badge className="bg-slate-600/50 text-slate-300">{auditors?.auditors_by_badge?.debutant || 0}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-amber-900/20 border border-amber-700/30">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🥉</span>
                <span className="text-amber-300">Bronze (10+ audits)</span>
              </div>
              <Badge className="bg-amber-600/50 text-amber-300">{auditors?.auditors_by_badge?.bronze || 0}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-500/20 border border-slate-400/30">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🥈</span>
                <span className="text-slate-300">Argent (50+ audits)</span>
              </div>
              <Badge className="bg-slate-500/50 text-slate-200">{auditors?.auditors_by_badge?.argent || 0}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-900/20 border border-yellow-600/30">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🥇</span>
                <span className="text-yellow-300">Or (100+ audits)</span>
              </div>
              <Badge className="bg-yellow-600/50 text-yellow-200">{auditors?.auditors_by_badge?.or || 0}</Badge>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-700">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Taux d'approbation</span>
              <span className="text-emerald-400 font-bold">{auditors?.approval_rate || 0}%</span>
            </div>
            <Progress value={auditors?.approval_rate || 0} className="h-2 mt-2 bg-slate-700" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Baby className="h-5 w-5 text-blue-500" />
            Distribution des Risques SSRTE
          </CardTitle>
          <CardDescription className="text-slate-400">
            Classification ICI des ménages visités
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-rose-400">Critique</span>
                <span className="text-white">{ssrte?.risk_distribution?.critical || 0}</span>
              </div>
              <Progress 
                value={(ssrte?.risk_distribution?.critical || 0) / Math.max((ssrte?.total_ssrte_visits || 1), 1) * 100} 
                className="h-2 bg-slate-700 [&>div]:bg-rose-500"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-orange-400">Élevé</span>
                <span className="text-white">{ssrte?.risk_distribution?.high || 0}</span>
              </div>
              <Progress 
                value={(ssrte?.risk_distribution?.high || 0) / Math.max((ssrte?.total_ssrte_visits || 1), 1) * 100} 
                className="h-2 bg-slate-700 [&>div]:bg-orange-500"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-amber-400">Modéré</span>
                <span className="text-white">{ssrte?.risk_distribution?.moderate || 0}</span>
              </div>
              <Progress 
                value={(ssrte?.risk_distribution?.moderate || 0) / Math.max((ssrte?.total_ssrte_visits || 1), 1) * 100} 
                className="h-2 bg-slate-700 [&>div]:bg-amber-500"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-emerald-400">Faible</span>
                <span className="text-white">{ssrte?.risk_distribution?.low || 0}</span>
              </div>
              <Progress 
                value={(ssrte?.risk_distribution?.low || 0) / Math.max((ssrte?.total_ssrte_visits || 1), 1) * 100} 
                className="h-2 bg-slate-700 [&>div]:bg-emerald-500"
              />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-700 grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-slate-400 text-xs">Couverture SSRTE</p>
              <p className="text-2xl font-bold text-blue-400">{ssrte?.coverage_rate || 0}%</p>
            </div>
            <div className="text-center">
              <p className="text-slate-400 text-xs">Taux Remédiation</p>
              <p className="text-2xl font-bold text-emerald-400">{ssrte?.remediation_rate || 0}%</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    {/* Row 3: Alerts & Premiums */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Bell className="h-5 w-5 text-rose-500" />
            Alertes par Sévérité
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-rose-900/30 border border-rose-700/30 text-center">
              <p className="text-rose-400 text-xs">Critiques</p>
              <p className="text-3xl font-bold text-white">{alerts?.alerts_by_severity?.critical || 0}</p>
            </div>
            <div className="p-4 rounded-lg bg-orange-900/30 border border-orange-700/30 text-center">
              <p className="text-orange-400 text-xs">Hautes</p>
              <p className="text-3xl font-bold text-white">{alerts?.alerts_by_severity?.high || 0}</p>
            </div>
            <div className="p-4 rounded-lg bg-amber-900/30 border border-amber-700/30 text-center">
              <p className="text-amber-400 text-xs">Moyennes</p>
              <p className="text-3xl font-bold text-white">{alerts?.alerts_by_severity?.medium || 0}</p>
            </div>
            <div className="p-4 rounded-lg bg-emerald-900/30 border border-emerald-700/30 text-center">
              <p className="text-emerald-400 text-xs">Basses</p>
              <p className="text-3xl font-bold text-white">{alerts?.alerts_by_severity?.low || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-green-500" />
            Primes Carbone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-green-900/20 border border-green-700/30">
              <p className="text-green-400 text-sm">Total Distribué</p>
              <p className="text-3xl font-bold text-white">{formatCurrency(premiums?.total_amount_distributed_xof || 0)} FCFA</p>
              <p className="text-slate-400 text-xs mt-1">
                Moyenne: {formatCurrency(premiums?.average_premium_xof || 0)} FCFA/bénéficiaire
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 rounded-lg bg-slate-700/50 text-center">
                <p className="text-xs text-orange-400">Orange Money</p>
                <p className="text-lg font-bold text-white">{premiums?.payment_methods?.orange_money || 0}</p>
              </div>
              <div className="p-2 rounded-lg bg-slate-700/50 text-center">
                <p className="text-xs text-blue-400">Virement</p>
                <p className="text-lg font-bold text-white">{premiums?.payment_methods?.bank_transfer || 0}</p>
              </div>
              <div className="p-2 rounded-lg bg-slate-700/50 text-center">
                <p className="text-xs text-slate-400">Espèces</p>
                <p className="text-lg font-bold text-white">{premiums?.payment_methods?.cash || 0}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);

// NEW: Marketplace Tab - Bourse des Récoltes
const MarketplaceTab = ({ data }) => {
  if (!data) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 text-slate-600 mx-auto mb-4" />
        <p className="text-slate-400">Chargement des données du marketplace...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="p-4 rounded-xl bg-gradient-to-br from-amber-900/50 to-slate-800 border border-amber-700/30">
          <p className="text-amber-400 text-xs font-medium">Annonces Actives</p>
          <p className="text-3xl font-bold text-white">{data.overview?.total_listings || 0}</p>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-900/50 to-slate-800 border border-emerald-700/30">
          <p className="text-emerald-400 text-xs font-medium">Volume Total</p>
          <p className="text-3xl font-bold text-white">{data.overview?.total_volume_tonnes || 0} T</p>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-blue-900/50 to-slate-800 border border-blue-700/30">
          <p className="text-blue-400 text-xs font-medium">Valeur Marché</p>
          <p className="text-2xl font-bold text-white">{formatCurrency(data.overview?.total_value_xof || 0)}</p>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-purple-900/50 to-slate-800 border border-purple-700/30">
          <p className="text-purple-400 text-xs font-medium">Prix Moyen</p>
          <p className="text-2xl font-bold text-white">{formatCurrency(data.overview?.avg_price_per_kg || 0)}/kg</p>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-rose-900/50 to-slate-800 border border-rose-700/30">
          <p className="text-rose-400 text-xs font-medium">Offres Reçues</p>
          <p className="text-3xl font-bold text-white">
            {Object.values(data.offers_by_status || {}).reduce((sum, s) => sum + (s.count || 0), 0)}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-teal-900/50 to-slate-800 border border-teal-700/30">
          <p className="text-teal-400 text-xs font-medium">Taux Conversion</p>
          <p className="text-3xl font-bold text-white">
            {data.offers_by_status?.accept ? 
              Math.round((data.offers_by_status.accept.count / 
                Object.values(data.offers_by_status).reduce((sum, s) => sum + (s.count || 0), 1)) * 100) 
              : 0}%
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Certification */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Award className="h-5 w-5 text-emerald-500" />
              Volume par Certification
            </CardTitle>
            <CardDescription className="text-slate-400">
              Répartition des récoltes certifiées
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(data.by_certification || []).map((cert, idx) => (
                <div key={`el-${idx}`} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-300 capitalize">{cert._id?.replace('_', ' ')}</span>
                    <span className="text-white font-medium">
                      {(cert.volume_kg / 1000).toFixed(1)} T • {formatCurrency(cert.value_xof)}
                    </span>
                  </div>
                  <Progress 
                    value={Math.min((cert.volume_kg / (data.overview?.total_volume_kg || 1)) * 100, 100)} 
                    className="h-2 bg-slate-700"
                  />
                </div>
              ))}
              {(!data.by_certification || data.by_certification.length === 0) && (
                <p className="text-slate-500 text-center py-4">Aucune donnée de certification</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* By Department */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <MapPin className="h-5 w-5 text-red-500" />
              Top 10 Départements
            </CardTitle>
            <CardDescription className="text-slate-400">
              Volume par zone géographique
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(data.by_department || []).slice(0, 10).map((dept, idx) => (
                <div key={`el-${idx}`} className="flex items-center justify-between p-2 rounded-lg bg-slate-700/30">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 w-5">{idx + 1}.</span>
                    <span className="text-slate-300">{dept._id}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-medium">{(dept.volume_kg / 1000).toFixed(1)} T</p>
                    <p className="text-xs text-slate-500">{dept.listings} annonces</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Sellers & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Sellers */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-500" />
              Top Vendeurs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(data.top_sellers || []).map((seller, idx) => (
                <div key={`el-${idx}`} className="flex items-center gap-3 p-3 rounded-lg bg-slate-700/30">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                    idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-slate-400' : idx === 2 ? 'bg-orange-600' : 'bg-slate-600'
                  }`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">{seller.seller_name}</p>
                    <p className="text-xs text-slate-500 capitalize">{seller.seller_type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-amber-400 font-bold">{formatCurrency(seller.total_value)}</p>
                    <p className="text-xs text-slate-500">{(seller.total_volume / 1000).toFixed(1)} T</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quotes Status */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-purple-500" />
              Statut des Demandes de Devis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-amber-900/30 border border-amber-700/30 text-center">
                <p className="text-amber-400 text-xs">En attente</p>
                <p className="text-3xl font-bold text-white">{data.quotes_by_status?.pending?.count || 0}</p>
                <p className="text-xs text-slate-500">{formatCurrency(data.quotes_by_status?.pending?.value || 0)}</p>
              </div>
              <div className="p-4 rounded-lg bg-emerald-900/30 border border-emerald-700/30 text-center">
                <p className="text-emerald-400 text-xs">Devis envoyés</p>
                <p className="text-3xl font-bold text-white">{data.quotes_by_status?.quoted?.count || 0}</p>
                <p className="text-xs text-slate-500">{formatCurrency(data.quotes_by_status?.quoted?.value || 0)}</p>
              </div>
              <div className="p-4 rounded-lg bg-rose-900/30 border border-rose-700/30 text-center">
                <p className="text-rose-400 text-xs">Refusées</p>
                <p className="text-3xl font-bold text-white">{data.quotes_by_status?.reject?.count || 0}</p>
                <p className="text-xs text-slate-500">{formatCurrency(data.quotes_by_status?.reject?.value || 0)}</p>
              </div>
              <div className="p-4 rounded-lg bg-blue-900/30 border border-blue-700/30 text-center">
                <p className="text-blue-400 text-xs">Info demandée</p>
                <p className="text-3xl font-bold text-white">{data.quotes_by_status?.request_info?.count || 0}</p>
                <p className="text-xs text-slate-500">{formatCurrency(data.quotes_by_status?.request_info?.value || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-gradient-to-r from-amber-900/30 to-slate-800 border-amber-700/30">
        <CardContent className="py-6">
          <div className="flex flex-wrap gap-4 justify-center">
            <Button 
              onClick={() => window.location.href = '/marketplace/harvest'}
              className="bg-amber-600 hover:bg-amber-700"
            >
              <Store className="h-4 w-4 mr-2" />
              Voir la Bourse
            </Button>
            <Button 
              variant="outline"
              className="border-amber-600 text-amber-400 hover:bg-amber-600/20"
            >
              <Download className="h-4 w-4 mr-2" />
              Exporter Rapport
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// REDD+ Impact National Tab for international partners
const ReddImpactTab = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
        <p className="ml-4 text-slate-400">Chargement des métriques environnementales...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-16">
        <TreePine className="h-12 w-12 text-slate-600 mx-auto mb-4" />
        <p className="text-slate-400">Aucune donnée environnementale disponible</p>
      </div>
    );
  }

  const { carbon_impact, conformite, social_impact, mrv_national, cooperatives, investor_metrics } = data;

  return (
    <div className="space-y-6" data-testid="redd-impact-content">
      {/* Header Banner */}
      <Card className="bg-gradient-to-r from-green-900/60 to-emerald-900/40 border-green-700/40">
        <CardContent className="py-5">
          <div className="flex items-center gap-3 mb-2">
            <TreePine className="h-6 w-6 text-green-400" />
            <h2 className="text-xl font-bold text-white">Impact Environnemental National</h2>
            <Badge className="bg-green-600/30 text-green-300 border-green-500/40">Partenaires Internationaux</Badge>
          </div>
          <p className="text-slate-400 text-sm">
            Données agrégées pour les bailleurs, investisseurs carbone et organismes de certification.
            Dernière mise à jour : {data.generated_at ? new Date(data.generated_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
          </p>
        </CardContent>
      </Card>

      {/* Row 1: Key Impact Numbers */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4" data-testid="redd-kpi-row">
        <div className="p-4 rounded-xl bg-gradient-to-br from-green-900/50 to-slate-800 border border-green-700/30">
          <p className="text-green-400 text-xs font-medium">CO₂ Séquestré</p>
          <p className="text-2xl font-bold text-white" data-testid="redd-co2-tonnes">{carbon_impact?.total_co2_tonnes || 0} <span className="text-sm text-slate-400">T</span></p>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-900/50 to-slate-800 border border-emerald-700/30">
          <p className="text-emerald-400 text-xs font-medium">Hectares Couverts</p>
          <p className="text-2xl font-bold text-white">{carbon_impact?.total_hectares_couverts || 0} <span className="text-sm text-slate-400">ha</span></p>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-teal-900/50 to-slate-800 border border-teal-700/30">
          <p className="text-teal-400 text-xs font-medium">Score Carbone Moy.</p>
          <p className="text-2xl font-bold text-white">{carbon_impact?.avg_carbon_score || 0}<span className="text-sm text-slate-400">/10</span></p>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-lime-900/50 to-slate-800 border border-lime-700/30">
          <p className="text-lime-400 text-xs font-medium">Forêt Équivalente</p>
          <p className="text-2xl font-bold text-white">{carbon_impact?.foret_equivalente_ha || 0} <span className="text-sm text-slate-400">ha</span></p>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-blue-900/50 to-slate-800 border border-blue-700/30">
          <p className="text-blue-400 text-xs font-medium">Coopératives</p>
          <p className="text-2xl font-bold text-white">{cooperatives?.total_cooperatives || 0}</p>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-amber-900/50 to-slate-800 border border-amber-700/30">
          <p className="text-amber-400 text-xs font-medium">Agents Terrain</p>
          <p className="text-2xl font-bold text-white">{cooperatives?.total_field_agents || 0}</p>
        </div>
      </div>

      {/* Row 2: Carbon Revenue + Investor Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Leaf className="h-5 w-5 text-green-500" />
              Revenus Carbone
            </CardTitle>
            <CardDescription className="text-slate-400">Projection annuelle et valeur du pipeline</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-4 rounded-lg bg-green-900/20 border border-green-700/30">
                <p className="text-green-400 text-xs">Revenu Annuel Estimé</p>
                <p className="text-2xl font-bold text-white" data-testid="redd-annual-revenue">{formatCurrency(carbon_impact?.annual_revenue_xof || 0)} <span className="text-sm text-green-400">XOF</span></p>
              </div>
              <div className="p-4 rounded-lg bg-emerald-900/20 border border-emerald-700/30">
                <p className="text-emerald-400 text-xs">Pipeline Vérifiable</p>
                <p className="text-2xl font-bold text-white">{investor_metrics?.pipeline_credits_tonnes || 0} <span className="text-sm text-emerald-400">T CO₂</span></p>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-700/30">
              <p className="text-slate-400 text-xs mb-1">Prix carbone actuel</p>
              <p className="text-lg font-bold text-amber-400">{(investor_metrics?.carbon_price_xof_per_tonne || 0).toLocaleString('fr-FR')} XOF/tonne</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-amber-500" />
              Projection 5 Ans
            </CardTitle>
            <CardDescription className="text-slate-400">Croissance estimée +15%/an</CardDescription>
          </CardHeader>
          <CardContent data-testid="redd-projection-table">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left text-slate-400 py-2 px-2">Année</th>
                    <th className="text-right text-slate-400 py-2 px-2">CO₂ (T)</th>
                    <th className="text-right text-slate-400 py-2 px-2">Revenus XOF</th>
                    <th className="text-right text-slate-400 py-2 px-2">Hectares</th>
                  </tr>
                </thead>
                <tbody>
                  {(carbon_impact?.five_year_projection || []).map((row, i) => (
                    <tr key={`el-${i}`} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                      <td className="py-2 px-2 text-white font-medium">{row.year}</td>
                      <td className="py-2 px-2 text-right text-emerald-400">{row.tonnes_co2?.toLocaleString('fr-FR')}</td>
                      <td className="py-2 px-2 text-right text-amber-400">{formatCurrency(row.revenue_xof)}</td>
                      <td className="py-2 px-2 text-right text-slate-300">{row.hectares?.toLocaleString('fr-FR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 p-3 rounded-lg bg-amber-900/20 border border-amber-700/30">
              <p className="text-amber-300 text-xs">ROI moyen par coopérative</p>
              <p className="text-lg font-bold text-white">{(investor_metrics?.roi_per_coop_xof || 0).toLocaleString('fr-FR')} <span className="text-sm text-amber-400">XOF</span></p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Conformité + Social Impact */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conformité & Certifications */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-500" />
              Conformité & Certifications
            </CardTitle>
            <CardDescription className="text-slate-400">EUDR et Certification Qualite</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="flex justify-between mb-2">
                <span className="text-slate-400 text-sm">Conformité EUDR</span>
                <span className="text-amber-400 font-bold">{conformite?.eudr_compliance_rate || 0}%</span>
              </div>
              <Progress value={conformite?.eudr_compliance_rate || 0} className="h-3 bg-slate-700" />
              <p className="text-xs text-slate-500 mt-1">{conformite?.eudr_verified_parcels || 0} / {conformite?.eudr_total_parcels || 0} parcelles vérifiées</p>
            </div>
            <div>
              <p className="text-slate-400 text-sm mb-3">Distribution Certification ({conformite?.ars_total_assessed || 0} évalués)</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-amber-900/20 border border-amber-600/30 text-center">
                  <p className="text-amber-400 text-xs">Bon</p>
                  <p className="text-2xl font-bold text-white">{conformite?.ars_distribution?.bronze || 0}</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-500/20 border border-slate-400/30 text-center">
                  <p className="text-slate-300 text-xs">Tres Bon</p>
                  <p className="text-2xl font-bold text-white">{conformite?.ars_distribution?.argent || 0}</p>
                </div>
                <div className="p-3 rounded-lg bg-yellow-900/20 border border-yellow-600/30 text-center">
                  <p className="text-yellow-400 text-xs">Excellent</p>
                  <p className="text-2xl font-bold text-white">{conformite?.ars_distribution?.or || 0}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Impact Social SSRTE/ICI */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Baby className="h-5 w-5 text-blue-500" />
              Impact Social (SSRTE / ICI)
            </CardTitle>
            <CardDescription className="text-slate-400">Protection de l'enfance et remédiation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 rounded-lg bg-blue-900/20 border border-blue-700/30">
                <p className="text-blue-400 text-xs">Visites SSRTE</p>
                <p className="text-2xl font-bold text-white">{social_impact?.total_ssrte_visits || 0}</p>
              </div>
              <div className="p-3 rounded-lg bg-rose-900/20 border border-rose-700/30">
                <p className="text-rose-400 text-xs">Enfants Identifiés</p>
                <p className="text-2xl font-bold text-white">{social_impact?.children_identified || 0}</p>
              </div>
            </div>
            <p className="text-slate-400 text-xs mb-2">Répartition des risques</p>
            <div className="space-y-2">
              {[
                { label: 'Critique', key: 'critique', color: 'bg-rose-500', text: 'text-rose-400' },
                { label: 'Élevé', key: 'eleve', color: 'bg-orange-500', text: 'text-orange-400' },
                { label: 'Modéré', key: 'modere', color: 'bg-amber-500', text: 'text-amber-400' },
                { label: 'Faible', key: 'faible', color: 'bg-emerald-500', text: 'text-emerald-400' },
              ].map(r => {
                const count = social_impact?.risk_distribution?.[r.key] || 0;
                const total = social_impact?.total_ssrte_visits || 1;
                return (
                  <div key={r.key} className="flex items-center gap-2">
                    <span className={`text-xs w-16 ${r.text}`}>{r.label}</span>
                    <div className="flex-1 bg-slate-700 rounded-full h-2 overflow-hidden">
                      <div className={`h-full rounded-full ${r.color}`} style={{ width: `${(count / total) * 100}%` }} />
                    </div>
                    <span className="text-xs text-slate-400 w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-700">
              <div className="text-center">
                <p className="text-xs text-slate-500">Cas ICI</p>
                <p className="text-lg font-bold text-white">{social_impact?.ici_total_cases || 0}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500">Résolus</p>
                <p className="text-lg font-bold text-emerald-400">{social_impact?.ici_resolved || 0}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500">Taux Résolution</p>
                <p className="text-lg font-bold text-blue-400">{social_impact?.ici_resolution_rate || 0}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 4: MRV National */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Eye className="h-5 w-5 text-teal-500" />
            MRV National — Suivi Environnemental
          </CardTitle>
          <CardDescription className="text-slate-400">Mesure, Reporting & Vérification des pratiques durables</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="p-3 rounded-lg bg-teal-900/20 border border-teal-700/30 text-center">
              <p className="text-teal-400 text-xs">Visites Terrain</p>
              <p className="text-2xl font-bold text-white">{mrv_national?.total_redd_visits || 0}</p>
            </div>
            <div className="p-3 rounded-lg bg-green-900/20 border border-green-700/30 text-center">
              <p className="text-green-400 text-xs">Zones Couvertes</p>
              <p className="text-2xl font-bold text-white">{mrv_national?.zones_covered || 0}</p>
            </div>
            <div className="p-3 rounded-lg bg-emerald-900/20 border border-emerald-700/30 text-center">
              <p className="text-emerald-400 text-xs">Score Conformité Moy.</p>
              <p className="text-2xl font-bold text-white">{mrv_national?.avg_conformity_score || 0}</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-900/20 border border-blue-700/30 text-center">
              <p className="text-blue-400 text-xs">Couverture MRV</p>
              <p className="text-2xl font-bold text-white">{mrv_national?.mrv_coverage_rate || 0}%</p>
            </div>
          </div>

          {/* Practices Adoption by Category */}
          {Object.keys(mrv_national?.practices_adoption_by_category || {}).length > 0 && (
            <div className="mb-4">
              <p className="text-slate-400 text-sm mb-3">Adoption des pratiques par catégorie</p>
              <div className="space-y-2">
                {Object.entries(mrv_national.practices_adoption_by_category).sort((a, b) => b[1] - a[1]).map(([cat, count]) => {
                  const maxCount = Math.max(...Object.values(mrv_national.practices_adoption_by_category), 1);
                  return (
                    <div key={cat} className="flex items-center gap-2">
                      <span className="text-xs text-slate-300 w-40 truncate capitalize">{cat.replace(/_/g, ' ')}</span>
                      <div className="flex-1 bg-slate-700 rounded-full h-2.5 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400" style={{ width: `${(count / maxCount) * 100}%` }} />
                      </div>
                      <span className="text-xs text-slate-400 w-8 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Monthly Trends */}
          {(mrv_national?.monthly_visit_trends || []).length > 0 && (
            <div>
              <p className="text-slate-400 text-sm mb-3">Tendances mensuelles des visites</p>
              <div className="flex items-end gap-1 h-24">
                {mrv_national.monthly_visit_trends.map((m, i) => {
                  const maxV = Math.max(...mrv_national.monthly_visit_trends.map(t => t.visits), 1);
                  const height = (m.visits / maxV) * 100;
                  return (
                    <div key={`el-${i}`} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] text-slate-500">{m.visits}</span>
                      <div className="w-full rounded-t bg-gradient-to-t from-green-600 to-emerald-400" style={{ height: `${Math.max(height, 4)}%` }} />
                      <span className="text-[9px] text-slate-600 -rotate-45 origin-top-left">{m.month?.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Row 5: Parcelles Assessment */}
      <Card className="bg-gradient-to-r from-slate-800 to-green-900/20 border-green-700/30">
        <CardContent className="py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Sprout className="h-6 w-6 text-green-400" />
              <div>
                <p className="text-white font-semibold">Couverture d'Évaluation des Parcelles</p>
                <p className="text-slate-400 text-sm">{carbon_impact?.parcels_assessed || 0} parcelles évaluées sur {carbon_impact?.total_parcels || 0}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-48">
                <Progress value={carbon_impact?.total_parcels ? (carbon_impact.parcels_assessed / carbon_impact.total_parcels) * 100 : 0} className="h-3 bg-slate-700" />
              </div>
              <span className="text-green-400 font-bold text-lg">
                {carbon_impact?.total_parcels ? Math.round((carbon_impact.parcels_assessed / carbon_impact.total_parcels) * 100) : 0}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ======== ARS 1000 TAB ========
const ARS1000Tab = ({ data, loading }) => {
  if (loading || !data) {
    return (
      <div className="text-center py-12">
        <Sprout className="h-12 w-12 text-lime-500 mx-auto mb-4 animate-pulse" />
        <p className="text-slate-400">Chargement des metriques ARS 1000...</p>
      </div>
    );
  }

  const { pdc, recoltes, certifications, reclamations, agroforesterie, top_cooperatives } = data;
  const ficheLabels = {
    identification: 'F1: Identification',
    epargne: 'F1: Epargne',
    menage_detail: 'F2: Menage',
    exploitation: 'F3: Exploitation',
    cultures: 'F3: Cultures',
    inventaire_arbres: 'F4: Inventaire',
    arbres_ombrage_resume: 'F5: Ombrage',
    materiel_detail: 'F6: Materiel',
    matrice_strategique_detail: 'F7: Strategie',
    programme_annuel: 'F7: Programme',
  };

  const statusColors = {
    brouillon: 'bg-slate-500/20 text-slate-400',
    en_cours: 'bg-blue-500/20 text-blue-400',
    visite_terrain: 'bg-amber-500/20 text-amber-400',
    complete_agent: 'bg-cyan-500/20 text-cyan-400',
    valide: 'bg-emerald-500/20 text-emerald-400',
  };

  const gradeColors = { A: 'text-emerald-400', B: 'text-blue-400', C: 'text-amber-400', D: 'text-red-400' };

  return (
    <div className="space-y-6" data-testid="ars1000-tab">
      {/* Row 1: Key ARS 1000 Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="p-4 rounded-xl bg-gradient-to-br from-lime-900/50 to-slate-800 border border-lime-700/30">
          <p className="text-lime-400 text-xs font-medium">PDC Total</p>
          <p className="text-3xl font-bold text-white">{pdc?.total || 0}</p>
          <p className="text-slate-400 text-xs mt-1">{pdc?.visites_terrain || 0} visites terrain</p>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-900/50 to-slate-800 border border-emerald-700/30">
          <p className="text-emerald-400 text-xs font-medium">Conformite Moy.</p>
          <p className="text-3xl font-bold" style={{ color: (pdc?.conformite_moyenne || 0) >= 80 ? '#10b981' : (pdc?.conformite_moyenne || 0) >= 50 ? '#f59e0b' : '#ef4444' }}>
            {pdc?.conformite_moyenne || 0}%
          </p>
          <p className="text-slate-400 text-xs mt-1">Min {pdc?.conformite_min || 0}% / Max {pdc?.conformite_max || 0}%</p>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-amber-900/50 to-slate-800 border border-amber-700/30">
          <p className="text-amber-400 text-xs font-medium">Declarations Recolte</p>
          <p className="text-3xl font-bold text-white">{recoltes?.total_declarations || 0}</p>
          <p className="text-slate-400 text-xs mt-1">{recoltes?.total_kg_validated || 0} kg valides</p>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-yellow-900/50 to-slate-800 border border-yellow-700/30">
          <p className="text-yellow-400 text-xs font-medium">Certifications</p>
          <p className="text-3xl font-bold text-white">{certifications?.total || 0}</p>
          <div className="flex gap-1 mt-1">
            {Object.entries(certifications?.by_level || {}).map(([lvl, count]) => (
              <Badge key={lvl} className={`text-[9px] ${lvl === 'or' ? 'bg-yellow-600/30 text-yellow-300' : lvl === 'argent' ? 'bg-slate-500/30 text-slate-300' : 'bg-amber-600/30 text-amber-300'}`}>
                {lvl}: {count}
              </Badge>
            ))}
          </div>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-green-900/50 to-slate-800 border border-green-700/30">
          <p className="text-green-400 text-xs font-medium">Arbres Inventories</p>
          <p className="text-3xl font-bold text-white">{agroforesterie?.total_arbres_inventories || 0}</p>
          <p className="text-slate-400 text-xs mt-1">{agroforesterie?.total_ombrage || 0} ombrage</p>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-rose-900/50 to-slate-800 border border-rose-700/30">
          <p className="text-rose-400 text-xs font-medium">Reclamations</p>
          <p className="text-3xl font-bold text-white">{reclamations?.total || 0}</p>
          <p className="text-slate-400 text-xs mt-1">{reclamations?.by_status?.ouverte || 0} ouvertes</p>
        </div>
      </div>

      {/* Row 2: PDC Deep Dive */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conformity Distribution */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Shield className="h-5 w-5 text-lime-500" />
              Distribution Conformite PDC
            </CardTitle>
            <CardDescription className="text-slate-400">Repartition qualitative des PDC ARS 1000-1</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: 'Excellent (80%+)', key: 'excellent', color: 'bg-emerald-500', textColor: 'text-emerald-400' },
                { label: 'Bon (60-79%)', key: 'bon', color: 'bg-blue-500', textColor: 'text-blue-400' },
                { label: 'Moyen (40-59%)', key: 'moyen', color: 'bg-amber-500', textColor: 'text-amber-400' },
                { label: 'Faible (<40%)', key: 'faible', color: 'bg-red-500', textColor: 'text-red-400' },
              ].map(({ label, key, color, textColor }) => {
                const count = pdc?.distribution?.[key] || 0;
                const pct = pdc?.total > 0 ? Math.round((count / pdc.total) * 100) : 0;
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span className={`text-xs w-28 flex-shrink-0 ${textColor}`}>{label}</span>
                    <div className="flex-1 bg-slate-700 rounded-full h-4 overflow-hidden">
                      <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-sm font-bold text-white w-12 text-right">{count}</span>
                    <span className="text-xs text-slate-500 w-10">({pct}%)</span>
                  </div>
                );
              })}
            </div>
            {/* PDC Status breakdown */}
            <div className="mt-4 pt-4 border-t border-slate-700">
              <p className="text-xs text-slate-400 mb-2">Par statut</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(pdc?.by_status || {}).map(([st, count]) => (
                  <Badge key={st} className={`text-[10px] ${statusColors[st] || 'bg-slate-500/20 text-slate-400'}`}>
                    {st.replace('_', ' ')}: {count}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fiche Completion Heatmap */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              Taux de Remplissage par Fiche
            </CardTitle>
            <CardDescription className="text-slate-400">% de PDC ayant complete chaque fiche (7 fiches ARS 1000-1)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(pdc?.fiches_completion_pct || {}).map(([key, pct]) => {
                const barColor = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : pct >= 25 ? '#f97316' : '#ef4444';
                return (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 w-28 flex-shrink-0">{ficheLabels[key] || key}</span>
                    <div className="flex-1 bg-slate-700 rounded-full h-3 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                    </div>
                    <span className="text-xs font-bold w-12 text-right" style={{ color: barColor }}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Recoltes + Top Coops */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recoltes Quality */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Package className="h-5 w-5 text-amber-500" />
              Qualite des Recoltes (ARS 1000-2)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {Object.entries(recoltes?.by_status || {}).map(([st, count]) => (
                <div key={st} className={`p-3 rounded-lg border text-center ${st === 'validee' ? 'bg-emerald-900/20 border-emerald-700/30' : st === 'rejetee' ? 'bg-red-900/20 border-red-700/30' : 'bg-blue-900/20 border-blue-700/30'}`}>
                  <p className={`text-xs ${st === 'validee' ? 'text-emerald-400' : st === 'rejetee' ? 'text-red-400' : 'text-blue-400'}`}>{st}</p>
                  <p className="text-2xl font-bold text-white">{count}</p>
                </div>
              ))}
            </div>
            <div className="pt-3 border-t border-slate-700">
              <p className="text-xs text-slate-400 mb-2">Distribution par Grade</p>
              <div className="flex flex-wrap gap-3">
                {Object.entries(recoltes?.grade_distribution || {}).sort().map(([grade, count]) => (
                  <div key={grade} className="flex items-center gap-2 bg-slate-700/50 rounded-lg px-3 py-2">
                    <span className={`text-lg font-bold ${gradeColors[grade] || 'text-slate-300'}`}>{grade}</span>
                    <span className="text-sm text-white">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Cooperatives */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Building2 className="h-5 w-5 text-teal-500" />
              Top Cooperatives (par PDC)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {(top_cooperatives || []).length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-4">Aucune donnee</p>
              ) : (top_cooperatives || []).map((coop, i) => (
                <div key={`el-${i}`} className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30 border border-slate-600/30">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-slate-500 w-6">#{i + 1}</span>
                    <div>
                      <p className="text-sm font-semibold text-white">{coop.name}</p>
                      <p className="text-[10px] text-slate-400">{coop.pdc_count} PDC</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold" style={{ color: coop.avg_conformite >= 80 ? '#10b981' : coop.avg_conformite >= 50 ? '#f59e0b' : '#ef4444' }}>
                      {coop.avg_conformite}%
                    </p>
                    <p className="text-[9px] text-slate-500">conformite moy.</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Reclamations summary */}
      <Card className="bg-gradient-to-r from-slate-800 to-slate-900 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Activity className="h-5 w-5 text-rose-500" />
            Registre Reclamations, Risques et Impartialite
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Ouvertes', key: 'ouverte', color: 'from-blue-900/50 border-blue-700/30', text: 'text-blue-400' },
              { label: 'En cours', key: 'en_cours', color: 'from-amber-900/50 border-amber-700/30', text: 'text-amber-400' },
              { label: 'Resolues', key: 'resolue', color: 'from-emerald-900/50 border-emerald-700/30', text: 'text-emerald-400' },
              { label: 'Fermees', key: 'fermee', color: 'from-slate-700/50 border-slate-600/30', text: 'text-slate-400' },
            ].map(({ label, key, color, text }) => (
              <div key={key} className={`p-4 rounded-xl bg-gradient-to-br ${color} to-slate-800 border text-center`}>
                <p className={`${text} text-xs font-medium`}>{label}</p>
                <p className="text-3xl font-bold text-white">{reclamations?.by_status?.[key] || 0}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};



export default SuperAdminDashboard;

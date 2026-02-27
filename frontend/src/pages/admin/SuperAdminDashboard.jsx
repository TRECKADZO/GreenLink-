import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyticsApi } from '../../services/analyticsApi';
import { 
  BarChart3, Globe, Leaf, Users, DollarSign, 
  TrendingUp, FileText, Download, Building2,
  MapPin, Shield, Scale, Target, Briefcase,
  ArrowUpRight, ArrowDownRight, RefreshCw,
  ChevronRight, Calendar, Filter
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

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const data = await analyticsApi.getDashboard(period);
      setDashboardData(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Erreur lors du chargement des analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [period]);

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

  const { production, sustainability, eudr_compliance, social_impact, market, macroeconomic, cooperatives } = dashboardData || {};

  return (
    <div className="min-h-screen bg-slate-900" data-testid="super-admin-dashboard">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
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

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="overview" className="data-[state=active]:bg-emerald-600">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="production" className="data-[state=active]:bg-emerald-600">Production</TabsTrigger>
            <TabsTrigger value="carbon" className="data-[state=active]:bg-emerald-600">Carbone & EUDR</TabsTrigger>
            <TabsTrigger value="social" className="data-[state=active]:bg-emerald-600">Impact Social</TabsTrigger>
            <TabsTrigger value="market" className="data-[state=active]:bg-emerald-600">Marché & Commerce</TabsTrigger>
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
                value={formatCurrency(market?.total_volume_fcfa || 0)}
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
                        {formatCurrency(sustainability?.carbon_revenue_fcfa || 0)}
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
                    <p className="text-xl font-bold text-purple-400">{formatCurrency(macroeconomic?.investissements_recus_fcfa || 0)}</p>
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

const CarbonTab = ({ sustainability, eudr }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Leaf className="h-5 w-5 text-emerald-500" />
            Marché Carbone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-emerald-900/20 border border-emerald-700/30">
              <p className="text-emerald-400 text-sm">Revenus Carbone Totaux</p>
              <p className="text-3xl font-bold text-white">
                {formatCurrency(sustainability?.carbon_revenue_fcfa || 0)}
              </p>
              <p className="text-slate-400 text-sm mt-1">
                ≈ ${sustainability?.carbon_revenue_usd || 0} USD
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-slate-700/50">
                <p className="text-slate-400 text-xs">Crédits Générés</p>
                <p className="text-xl font-bold text-white">{sustainability?.carbon_credits_generated || 0}</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-700/50">
                <p className="text-slate-400 text-xs">Crédits Vendus</p>
                <p className="text-xl font-bold text-emerald-400">{sustainability?.carbon_credits_sold || 0}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Shield className="h-5 w-5 text-amber-500" />
            Certifications EUDR
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(eudr?.certification_coverage || {}).map(([cert, count]) => (
              <div key={cert} className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30">
                <span className="text-slate-300 capitalize">{cert.replace('_', ' ')}</span>
                <Badge className="bg-emerald-600/20 text-emerald-400">{count} parcelles</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);

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
        <CardTitle className="text-white">Prix Moyens par Produit (FCFA/kg)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(data?.average_prices_fcfa_per_kg || {}).map(([product, price]) => (
            <div key={product} className="p-4 rounded-lg bg-slate-700/30 text-center">
              <p className="text-slate-400 text-xs capitalize">{product.replace('_', ' ')}</p>
              <p className="text-2xl font-bold text-white">{price}</p>
              <p className="text-emerald-400 text-xs">FCFA/kg</p>
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

export default SuperAdminDashboard;

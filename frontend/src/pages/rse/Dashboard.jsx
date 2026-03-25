import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import Navbar from '../../components/Navbar';
import InteractiveMap from '../../components/InteractiveMap';
import SubscriptionBanner from '../../components/SubscriptionBanner';
import { greenlinkApi } from '../../services/greenlinkApi';
import axios from 'axios';
import {
  Leaf, Users, TreePine, MapPin, Award, TrendingUp, Download,
  Heart, Building2, Map, PieChart, DollarSign, ShoppingCart,
  Shield, AlertTriangle, Eye, CheckCircle2, Globe, BarChart3,
  FileCheck, Baby, Scale, Target, Layers
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// ESG Score Ring Component
const ScoreRing = ({ score, label, color, size = 80 }) => {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(score, 100) / 100) * circumference;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#1e293b" strokeWidth="6" />
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color}
          strokeWidth="6" strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" className="transition-all duration-1000" />
      </svg>
      <span className="text-2xl font-bold text-white absolute" style={{ marginTop: size/2 - 14 }}>{Math.round(score)}</span>
      <span className="text-xs text-slate-400 mt-1">{label}</span>
    </div>
  );
};

// Progress bar small component
const MiniProgress = ({ value, max, color = 'bg-emerald-500', label }) => {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-400">{label}</span>
        <span className="text-white font-medium">{Math.round(pct)}%</span>
      </div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

const RSEDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [impact, setImpact] = useState(null);
  const [credits, setCredits] = useState([]);
  const [distrib, setDistrib] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !['entreprise_rse', 'admin'].includes(user.user_type)) {
      navigate('/');
      return;
    }
    fetchData();
    fetchSubscription();
    fetchStats();
  }, [user, authLoading]);

  const fetchSubscription = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${API_URL}/api/subscriptions/my-subscription`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubscription(data.subscription);
    } catch (err) {
      console.error('Error fetching subscription:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${API_URL}/api/rse/dashboard-stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(data);
    } catch (err) {
      console.error('Error fetching RSE stats:', err);
    }
  };

  const fetchData = async () => {
    try {
      const [impactData, creditsData, distribData] = await Promise.all([
        greenlinkApi.getRSEImpactDashboard(),
        greenlinkApi.getCarbonCredits(),
        axios.get(`${API_URL}/api/carbon-listings/distribution-summary`).then(r => r.data).catch(() => null)
      ]);
      setImpact(impactData);
      setCredits(creditsData);
      setDistrib(distribData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportImpactReport = () => {
    if (!impact) return;
    const reportData = {
      company: user.company_name_rse || user.full_name,
      date: new Date().toLocaleDateString('fr-FR'),
      ...impact
    };
    const reportText = `
RAPPORT D'IMPACT RSE - ${reportData.company}
Genere le ${reportData.date}

RESUME EXECUTIF
Offset Carbone Total: ${reportData.total_co2_offset_tonnes} tonnes CO2
Agriculteurs Impactes: ${reportData.total_farmers_impacted} producteurs
Femmes Beneficiaires: ${reportData.women_farmers_percentage}%
Arbres Plantes: ${reportData.total_trees_planted.toLocaleString()}
Regions Couvertes: ${reportData.regions_covered.join(', ')}
${stats ? `
SCORE ESG: ${stats.esg_score.global}/100
- Environnemental: ${stats.esg_score.environmental}/100
- Social: ${stats.esg_score.social}/100
- Gouvernance: ${stats.esg_score.governance}/100

CONFORMITE EUDR
- Taux de conformite: ${stats.eudr_compliance.compliance_rate}%
- Parcelles geolocalises: ${stats.eudr_compliance.geolocated_parcels}/${stats.eudr_compliance.total_parcels}
- Parcelles verifiees: ${stats.eudr_compliance.verified_parcels}

MONITORING TRAVAIL DES ENFANTS
- Fiches ICI completees: ${stats.child_labor_monitoring.total_ici_forms}
- Visites SSRTE: ${stats.child_labor_monitoring.total_ssrte_visits}
- Enfants surveilles: ${stats.child_labor_monitoring.children_monitored}
` : ''}
Rapport certifie GreenLink CI
www.greenlink-agritech.com
    `;
    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Impact_RSE_${Date.now()}.txt`;
    a.click();
    toast({ title: 'Export reussi', description: 'Rapport d\'impact telecharge' });
  };

  if (loading || !impact) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Navbar />
        <div className="max-w-7xl mx-auto px-6 py-12 pt-24">
          <div className="text-center py-12">
            <Leaf className="w-12 h-12 text-emerald-500 animate-pulse mx-auto mb-4" />
            <p className="text-slate-400">Chargement de votre impact...</p>
          </div>
        </div>
      </div>
    );
  }

  const esg = stats?.esg_score;
  const eudr = stats?.eudr_compliance;
  const childLabor = stats?.child_labor_monitoring;
  const trace = stats?.traceability;
  const carbonMkt = stats?.carbon_market;
  const myImpact = stats?.my_impact;

  return (
    <div className="min-h-screen bg-slate-950" data-testid="rse-dashboard">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pt-24">
        <SubscriptionBanner subscription={subscription} />

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white" data-testid="dashboard-title">
                Impact RSE Dashboard
              </h1>
              <p className="text-slate-400 text-sm">{user?.company_name_rse || user?.full_name}</p>
            </div>
          </div>
          <Button
            onClick={exportImpactReport}
            data-testid="export-report-btn"
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Rapport CSRD
          </Button>
        </div>

        {/* ESG Score + Quick Stats */}
        {esg && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6" data-testid="esg-section">
            {/* ESG Score Card */}
            <Card className="bg-slate-900 border-slate-800 p-6 lg:col-span-1">
              <h3 className="text-sm font-medium text-slate-400 mb-4 flex items-center gap-2">
                <Target className="w-4 h-4" /> Score ESG Global
              </h3>
              <div className="flex justify-center relative" data-testid="esg-global-score">
                <ScoreRing score={esg.global} label="" color="#10b981" size={120} />
              </div>
              <p className="text-center text-xs text-slate-500 mt-3">sur 100 points</p>
              <div className="mt-4 space-y-3">
                <MiniProgress value={esg.environmental} max={100} color="bg-emerald-500" label="Environnemental" />
                <MiniProgress value={esg.social} max={100} color="bg-blue-500" label="Social" />
                <MiniProgress value={esg.governance} max={100} color="bg-purple-500" label="Gouvernance" />
              </div>
            </Card>

            {/* Impact Cards */}
            <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="bg-slate-900 border-slate-800 p-4" data-testid="stat-co2">
                <div className="p-2 rounded-lg bg-emerald-500/10 w-fit mb-2">
                  <Leaf className="w-5 h-5 text-emerald-400" />
                </div>
                <p className="text-xs text-slate-500">CO2 Compense</p>
                <p className="text-2xl font-bold text-white">{impact.total_co2_offset_tonnes}</p>
                <p className="text-xs text-slate-500">tonnes</p>
              </Card>
              <Card className="bg-slate-900 border-slate-800 p-4" data-testid="stat-farmers">
                <div className="p-2 rounded-lg bg-blue-500/10 w-fit mb-2">
                  <Users className="w-5 h-5 text-blue-400" />
                </div>
                <p className="text-xs text-slate-500">Agriculteurs</p>
                <p className="text-2xl font-bold text-white">{trace?.total_farmers || impact.total_farmers_impacted}</p>
                <p className="text-xs text-slate-500">producteurs actifs</p>
              </Card>
              <Card className="bg-slate-900 border-slate-800 p-4" data-testid="stat-hectares">
                <div className="p-2 rounded-lg bg-amber-500/10 w-fit mb-2">
                  <Layers className="w-5 h-5 text-amber-400" />
                </div>
                <p className="text-xs text-slate-500">Hectares traces</p>
                <p className="text-2xl font-bold text-white">{trace?.total_hectares?.toLocaleString() || 0}</p>
                <p className="text-xs text-slate-500">ha</p>
              </Card>
              <Card className="bg-slate-900 border-slate-800 p-4" data-testid="stat-trees">
                <div className="p-2 rounded-lg bg-teal-500/10 w-fit mb-2">
                  <TreePine className="w-5 h-5 text-teal-400" />
                </div>
                <p className="text-xs text-slate-500">Arbres Plantes</p>
                <p className="text-2xl font-bold text-white">{impact.total_trees_planted.toLocaleString()}</p>
                <p className="text-xs text-slate-500">arbres</p>
              </Card>

              {/* EUDR Compliance Card */}
              {eudr && (
                <Card className="bg-slate-900 border-slate-800 p-4 col-span-2" data-testid="eudr-compliance-card">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-medium text-white">Conformite EUDR</h3>
                  </div>
                  <div className="space-y-2">
                    <MiniProgress value={eudr.compliance_rate} max={100} color="bg-emerald-500" label="Deforestation-free" />
                    <MiniProgress value={eudr.geolocation_rate} max={100} color="bg-blue-500" label="Geolocalisation" />
                    <MiniProgress value={eudr.verification_rate} max={100} color="bg-purple-500" label="Verification terrain" />
                  </div>
                  <div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    {eudr.verified_parcels} parcelles verifiees sur {eudr.total_parcels}
                  </div>
                </Card>
              )}

              {/* Child Labor Monitoring */}
              {childLabor && (
                <Card className="bg-slate-900 border-slate-800 p-4 col-span-2" data-testid="child-labor-card">
                  <div className="flex items-center gap-2 mb-3">
                    <Baby className="w-4 h-4 text-blue-400" />
                    <h3 className="text-sm font-medium text-white">Monitoring Travail Enfants</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-800 rounded-lg p-2">
                      <p className="text-lg font-bold text-white">{childLabor.total_ici_forms}</p>
                      <p className="text-xs text-slate-500">Fiches ICI</p>
                    </div>
                    <div className="bg-slate-800 rounded-lg p-2">
                      <p className="text-lg font-bold text-white">{childLabor.total_ssrte_visits}</p>
                      <p className="text-xs text-slate-500">Visites SSRTE</p>
                    </div>
                    <div className="bg-slate-800 rounded-lg p-2">
                      <p className="text-lg font-bold text-white">{childLabor.children_monitored}</p>
                      <p className="text-xs text-slate-500">Enfants suivis</p>
                    </div>
                  </div>
                  {childLabor.total_alerts > 0 && (
                    <div className="flex items-center gap-2 mt-3">
                      <MiniProgress
                        value={childLabor.resolved_alerts}
                        max={childLabor.total_alerts}
                        color="bg-green-500"
                        label={`Alertes resolues: ${childLabor.resolved_alerts}/${childLabor.total_alerts}`}
                      />
                    </div>
                  )}
                  {childLabor.high_risk_cases > 0 && (
                    <div className="flex items-center gap-2 mt-2 text-xs">
                      <AlertTriangle className="w-3 h-3 text-red-400" />
                      <span className="text-red-400">{childLabor.high_risk_cases} cas a haut risque identifies</span>
                    </div>
                  )}
                </Card>
              )}
            </div>
          </div>
        )}

        {/* My Investment + Carbon Market */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* My investment */}
          {myImpact && (
            <Card className="bg-slate-900 border-slate-800 p-6" data-testid="my-impact-card">
              <h3 className="text-sm font-medium text-slate-400 mb-4 flex items-center gap-2">
                <DollarSign className="w-4 h-4" /> Mon Investissement Impact
              </h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-3xl font-bold text-emerald-400">{myImpact.total_tonnes_offset}</p>
                  <p className="text-xs text-slate-500 mt-1">Tonnes CO2</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-white">{myImpact.total_investment_xof.toLocaleString()}</p>
                  <p className="text-xs text-slate-500 mt-1">XOF investi</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-blue-400">{myImpact.purchases_count}</p>
                  <p className="text-xs text-slate-500 mt-1">Achats</p>
                </div>
              </div>
            </Card>
          )}

          {/* Carbon market summary */}
          {carbonMkt && (
            <Card className="bg-slate-900 border-slate-800 p-6" data-testid="carbon-market-card">
              <h3 className="text-sm font-medium text-slate-400 mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" /> Marche Carbone
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-400">{carbonMkt.available_credits}</p>
                  <p className="text-xs text-slate-500">Credits disponibles</p>
                </div>
                <div className="bg-slate-800 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-white">{carbonMkt.total_tonnes_available.toLocaleString()}</p>
                  <p className="text-xs text-slate-500">Tonnes CO2</p>
                </div>
              </div>
              {carbonMkt.credit_types?.length > 0 && (
                <div className="mt-4 space-y-2">
                  {carbonMkt.credit_types.map((ct, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">{ct.type}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">{ct.tonnes}t</span>
                        <Badge className="bg-slate-700 text-slate-300 text-xs">{ct.count}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {carbonMkt.avg_price_per_tonne > 0 && (
                <p className="text-xs text-slate-500 mt-3">
                  Prix moyen: {carbonMkt.avg_price_per_tonne.toLocaleString()} XOF/t
                  {carbonMkt.min_price > 0 && carbonMkt.max_price > 0 && (
                    <span> ({carbonMkt.min_price.toLocaleString()} - {carbonMkt.max_price.toLocaleString()})</span>
                  )}
                </p>
              )}
            </Card>
          )}
        </div>

        {/* Supply Chain Traceability */}
        {trace && (
          <Card className="bg-slate-900 border-slate-800 p-6 mb-6" data-testid="traceability-card">
            <h3 className="text-sm font-medium text-slate-400 mb-4 flex items-center gap-2">
              <Globe className="w-4 h-4" /> Tracabilite Chaine d'Approvisionnement
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-slate-800 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-white">{trace.total_cooperatives}</p>
                <p className="text-xs text-slate-500">Cooperatives</p>
              </div>
              <div className="bg-slate-800 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-white">{trace.total_farmers.toLocaleString()}</p>
                <p className="text-xs text-slate-500">Producteurs</p>
              </div>
              <div className="bg-slate-800 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-white">{trace.total_parcels.toLocaleString()}</p>
                <p className="text-xs text-slate-500">Parcelles</p>
              </div>
              <div className="bg-slate-800 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-white">{trace.total_hectares.toLocaleString()}</p>
                <p className="text-xs text-slate-500">Hectares</p>
              </div>
              <div className="bg-slate-800 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-emerald-400">{trace.certified_parcels}</p>
                <p className="text-xs text-slate-500">Certifiees</p>
              </div>
            </div>
            {Object.keys(trace.certifications || {}).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {Object.entries(trace.certifications).map(([cert, count]) => (
                  <Badge key={cert} className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {cert}: {count}
                  </Badge>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Interactive Map Section */}
        <Card className="bg-slate-900 border-slate-800 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Map className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-white">Carte d'Impact Territorial</h2>
            </div>
            <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {impact.regions_covered.length} regions actives
            </Badge>
          </div>
          <InteractiveMap
            activeRegions={impact.regions_covered}
            onRegionClick={(region) => {
              toast({ title: `Region: ${region}`, description: 'Donnees de la region chargees' });
            }}
          />
        </Card>

        {/* Monthly Trend */}
        <Card className="bg-slate-900 border-slate-800 p-6 mb-6">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            Evolution Mensuelle
          </h2>
          <div className="space-y-3">
            {impact.monthly_breakdown.map((month, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-28 text-xs text-slate-400 font-medium truncate">{month.month}</div>
                <div className="flex-1 bg-slate-800 rounded-full h-6 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 flex items-center justify-end pr-2"
                    style={{
                      width: `${Math.min((month.co2_offset / Math.max(...impact.monthly_breakdown.map(m => m.co2_offset), 1)) * 100, 100)}%`
                    }}
                  >
                    {month.co2_offset > 0 && (
                      <span className="text-white text-xs font-bold">{month.co2_offset}t</span>
                    )}
                  </div>
                </div>
                <div className="w-28 text-right">
                  <p className="text-xs font-semibold text-slate-300">{month.investment.toLocaleString()} F</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Impact Stories */}
        <Card className="bg-slate-900 border-slate-800 p-6 mb-6">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-400" />
            Histoires d'Impact
          </h2>
          <div className="space-y-3">
            {impact.impact_stories.map((story, index) => (
              <div key={index} className="p-4 bg-slate-800 rounded-xl border-l-4 border-emerald-500">
                <div className="flex items-start gap-3">
                  <Award className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-white text-sm">{story.farmer} - {story.location}</p>
                    <p className="text-slate-400 text-sm italic mt-1">"{story.story}"</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Distribution Model - Admin Only */}
        {distrib && user?.user_type === 'admin' && (
          <Card className="bg-slate-900 border-slate-800 p-6 mb-6" data-testid="distribution-section">
            <div className="flex items-center gap-3 mb-6">
              <PieChart className="w-5 h-5 text-emerald-400" />
              <div>
                <h2 className="text-lg font-bold text-white">Repartition des Primes Carbone</h2>
                <p className="text-xs text-slate-500">{distrib.total_projects} projets approuves</p>
              </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <div className="bg-slate-800 rounded-xl p-3 text-center">
                <p className="text-xs text-slate-500">Revenu Total</p>
                <p className="text-xl font-bold text-white">{(distrib.total_revenue / 1000000).toFixed(1)}M</p>
                <p className="text-xs text-slate-500">XOF</p>
              </div>
              <div className="bg-slate-800 rounded-xl p-3 text-center">
                <p className="text-xs text-slate-500">Tonnes CO2</p>
                <p className="text-xl font-bold text-white">{distrib.total_tonnes_co2?.toLocaleString()}</p>
              </div>
              <div className="bg-slate-800 rounded-xl p-3 text-center">
                <p className="text-xs text-slate-500">Prix Moyen</p>
                <p className="text-xl font-bold text-white">{distrib.avg_price_per_tonne?.toLocaleString()}</p>
                <p className="text-xs text-slate-500">XOF/tonne</p>
              </div>
              <div className="bg-emerald-500/10 rounded-xl p-3 text-center border border-emerald-500/20">
                <p className="text-xs text-emerald-400">Aux Agriculteurs</p>
                <p className="text-xl font-bold text-emerald-400">{(distrib.distribution.farmer.amount / 1000000).toFixed(1)}M</p>
                <p className="text-xs text-emerald-400">XOF (49% du total)</p>
              </div>
            </div>
            <div className="flex h-8 rounded-full overflow-hidden mb-4">
              <div className="bg-emerald-600 flex items-center justify-center" style={{width: '100%'}}>
                <span className="text-white text-xs font-bold">Credits carbone vendus</span>
              </div>
            </div>
          </Card>
        )}

        {/* Marketplace Credits Carbone */}
        <Card className="bg-slate-900 border-slate-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white">Marketplace Credits Carbone</h2>
            <Button
              variant="outline"
              onClick={() => navigate('/rse/carbon-marketplace')}
              className="text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
              data-testid="view-marketplace-btn"
            >
              Voir Tous les Credits
            </Button>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {credits.slice(0, 3).map((credit) => (
              <Card key={credit._id} className="bg-slate-800 border-slate-700 p-4 hover:border-emerald-500/30 transition-all">
                <Badge className="mb-2 bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  {credit.verification_standard}
                </Badge>
                <h3 className="font-bold text-white text-sm mb-1">{credit.credit_type}</h3>
                <p className="text-xs text-slate-400 mb-3 line-clamp-2">{credit.project_description}</p>
                <div className="space-y-1 mb-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Quantite:</span>
                    <span className="text-white font-medium">{credit.quantity_tonnes_co2}t CO2</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Prix/tonne:</span>
                    <span className="text-emerald-400 font-medium">{credit.price_per_tonne.toLocaleString()} F</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Vintage:</span>
                    <span className="text-white font-medium">{credit.vintage_year}</span>
                  </div>
                </div>
                <Button
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-sm"
                  onClick={() => navigate(`/rse/purchase/${credit._id}`)}
                >
                  Acheter
                </Button>
              </Card>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default RSEDashboard;

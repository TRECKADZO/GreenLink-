import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Leaf, TreePine, Sun, Recycle, Droplets, Sprout, Award,
  MapPin, Loader2, Clock, CheckCircle, Banknote, XCircle, Phone,
  TrendingUp, AlertTriangle, ChevronDown, ChevronUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  Legend, Cell
} from 'recharts';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const PRACTICE_LABELS = {
  compostage: { label: 'Compostage', icon: Recycle },
  absence_pesticides: { label: 'Sans pesticides', icon: Leaf },
  gestion_dechets: { label: 'Gestion dechets', icon: Recycle },
  protection_cours_eau: { label: 'Protection eau', icon: Droplets },
  agroforesterie: { label: 'Agroforesterie', icon: Sprout },
};

const getScoreThreshold = (score) => {
  if (score >= 8) return { label: 'Excellent', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', fill: '#059669' };
  if (score >= 6) return { label: 'Tres Bon', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', fill: '#16a34a' };
  if (score >= 4) return { label: 'Bon', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', fill: '#d97706' };
  if (score >= 2) return { label: 'En Progression', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', fill: '#ea580c' };
  return { label: 'Insuffisant', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', fill: '#dc2626' };
};

const DECOMPO_LABELS = {
  base: 'Base', densite_arbres: 'Arbres', couverture_ombragee: 'Ombrage',
  brulage: 'Brulage', engrais_chimique: 'Engrais', pratiques_ecologiques: 'Pratiques Eco',
  redd_practices: 'REDD+', age_cacaoyers: 'Age', surface: 'Surface', certification: 'Certification',
};

const DECOMPO_MAX = {
  base: 1.0, densite_arbres: 2.0, couverture_ombragee: 1.5,
  brulage: 0.5, engrais_chimique: 0.3, pratiques_ecologiques: 1.2,
  redd_practices: 2.5, age_cacaoyers: 0.5, surface: 0.3, certification: 0.2,
};

const CarbonScorePage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [premiumData, setPremiumData] = useState(null);
  const [expandedParcel, setExpandedParcel] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [scoreRes, premiumRes] = await Promise.all([
          fetch(`${API_URL}/api/greenlink/carbon/my-score`, { headers: getAuthHeader() }),
          fetch(`${API_URL}/api/farmer/carbon-premiums/my-requests`, { headers: getAuthHeader() })
        ]);
        const scoreJson = await scoreRes.json();
        setData(scoreJson);
        if (premiumRes.ok) {
          setPremiumData(await premiumRes.json());
        }
      } catch (err) {
        toast.error('Erreur lors du chargement du score carbone');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0f4f0] flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  const score = data?.average_score || 0;
  const breakdown = data?.breakdown || {};
  const recommendations = data?.recommendations || [];
  const parcels = data?.parcels || [];
  const threshold = getScoreThreshold(score);

  // Estimate prime per parcel (simplified formula)
  const PRICE_CO2 = 15000;
  const parcelsWithPrime = parcels.map((p, i) => {
    const cs = p.carbon_score || 0;
    const co2_per_ha = 2 + (cs / 10) * 6;
    const co2 = Math.round(p.area_hectares * co2_per_ha * 100) / 100;
    const gross = co2 * PRICE_CO2;
    const net = gross * 0.70;
    const farmer_share = Math.round(net * 0.70);
    return { ...p, co2, prime_xof: farmer_share, rank: i + 1 };
  }).sort((a, b) => b.carbon_score - a.carbon_score);

  // Bar chart data
  const barData = parcelsWithPrime.map(p => ({
    name: (p.village || `Parcelle ${p.rank}`).substring(0, 14),
    score: p.carbon_score,
    fill: getScoreThreshold(p.carbon_score).fill,
  }));

  // Radar chart data from breakdown
  const radarData = [
    { critere: 'Base', valeur: breakdown.base || 0, max: 3.0, fullMark: 3.0 },
    { critere: 'Arbres', valeur: breakdown.arbres || 0, max: 2.0, fullMark: 2.0 },
    { critere: 'Ombrage', valeur: breakdown.ombrage || 0, max: 2.0, fullMark: 2.0 },
    { critere: 'Pratiques', valeur: breakdown.pratiques || 0, max: 2.5, fullMark: 2.5 },
    { critere: 'Surface', valeur: breakdown.surface || 0, max: 0.5, fullMark: 0.5 },
  ];

  const totalPrime = parcelsWithPrime.reduce((s, p) => s + p.prime_xof, 0);
  const totalCO2 = parcelsWithPrime.reduce((s, p) => s + p.co2, 0);

  const tabs = [
    { id: 'overview', label: 'Vue generale' },
    { id: 'charts', label: 'Graphiques' },
    { id: 'ranking', label: 'Classement' },
  ];

  return (
    <div className="min-h-screen bg-[#f0f4f0]" data-testid="farmer-carbon-score-page">
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/farmer/dashboard')} data-testid="back-btn">
            <ArrowLeft className="h-4 w-4 mr-1" /> Retour
          </Button>
          <h1 className="text-xl font-bold text-gray-900">Mon Score Carbone</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 bg-white rounded-xl p-1 shadow-sm border" data-testid="tabs">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex-1 text-xs font-medium py-2 px-3 rounded-lg transition-all ${
                activeTab === t.id ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'
              }`}
              data-testid={`tab-${t.id}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab: Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Score Gauge */}
              <Card className={`lg:col-span-1 ${threshold.border} border-2`} data-testid="score-gauge">
                <CardContent className="pt-6 pb-5 text-center">
                  <div className={`w-28 h-28 rounded-full border-8 ${threshold.border} mx-auto flex flex-col items-center justify-center mb-3`}>
                    <span className={`text-3xl font-extrabold ${threshold.color}`}>{score.toFixed(1)}</span>
                    <span className="text-xs text-gray-400">/10</span>
                  </div>
                  <Badge className={`${threshold.bg} ${threshold.color} text-xs px-3 py-1`}>
                    {threshold.label}
                  </Badge>
                  <p className="text-xs text-gray-500 mt-2">
                    {score >= 7 ? 'Eligible aux primes carbone' : `+${(7 - score).toFixed(1)} pts pour etre eligible`}
                  </p>
                  <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t">
                    <div>
                      <p className="text-base font-bold text-emerald-600">{totalCO2.toFixed(1)}</p>
                      <p className="text-[10px] text-gray-400">tCO2/an</p>
                    </div>
                    <div>
                      <p className="text-base font-bold text-amber-600">{totalPrime.toLocaleString('fr-FR')}</p>
                      <p className="text-[10px] text-gray-400">XOF primes</p>
                    </div>
                    <div>
                      <p className="text-base font-bold text-blue-600">{parcels.length}</p>
                      <p className="text-[10px] text-gray-400">Parcelles</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Breakdown bars */}
              <Card className="lg:col-span-2" data-testid="breakdown-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Decomposition du score</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: 'Base', value: breakdown.base || 3, max: 3, color: 'bg-gray-400' },
                    { label: 'Arbres', value: breakdown.arbres || 0, max: 2, color: 'bg-emerald-500', detail: `${data?.total_trees || 0} arbres` },
                    { label: 'Ombrage', value: breakdown.ombrage || 0, max: 2, color: 'bg-green-500', detail: `${data?.avg_shade_cover || 0}%` },
                    { label: 'Pratiques', value: breakdown.pratiques || 0, max: 2.5, color: 'bg-indigo-500', detail: `${data?.practices_count || 0}/5` },
                    { label: 'Surface', value: breakdown.surface || 0, max: 0.5, color: 'bg-amber-500', detail: `${data?.total_area || 0} ha` },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-20 text-xs">
                        <p className="font-medium text-gray-700">{item.label}</p>
                        {item.detail && <p className="text-[10px] text-gray-400">{item.detail}</p>}
                      </div>
                      <div className="flex-1">
                        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${item.color} transition-all duration-700`}
                            style={{ width: `${item.max > 0 ? (item.value / item.max) * 100 : 0}%` }} />
                        </div>
                      </div>
                      <span className="text-xs font-bold text-gray-700 w-12 text-right">{item.value}/{item.max}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 border-t">
                    <span className="font-bold text-gray-700 text-sm">Total</span>
                    <span className={`text-lg font-extrabold ${threshold.color}`}>{score.toFixed(1)} / 10</span>
                  </div>

                  {/* Tree strata */}
                  {data?.arbre_categories && data.arbre_categories.total > 0 && (
                    <div className="pt-3 border-t">
                      <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <TreePine className="h-3.5 w-3.5 text-emerald-600" /> Repartition par strate
                      </h4>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: 'S1 (3-5m)', value: data.arbre_categories.petits_lt_8m, color: 'amber' },
                          { label: 'S2 (5-30m)', value: data.arbre_categories.moyens_8_12m, color: 'green' },
                          { label: 'S3 (>30m)', value: data.arbre_categories.grands_gt_12m, color: 'emerald' },
                        ].map((s, i) => (
                          <div key={i} className={`text-center p-2 rounded-lg bg-${s.color}-50 border border-${s.color}-200`}>
                            <p className={`text-lg font-bold text-${s.color}-600`}>{s.value}</p>
                            <p className="text-[10px] text-gray-500">{s.label}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Practices */}
            {data?.practices_list?.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-gray-900 mb-2">Pratiques actives</h2>
                <div className="flex flex-wrap gap-2">
                  {data.practices_list.map(p => {
                    const practice = PRACTICE_LABELS[p] || { label: p, icon: Leaf };
                    const Icon = practice.icon;
                    return (
                      <Badge key={p} className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 gap-1.5 text-xs">
                        <Icon className="h-3 w-3" /> {practice.label}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {recommendations.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-gray-900 mb-2">Recommandations</h2>
                <div className="space-y-2">
                  {recommendations.map((rec, idx) => (
                    <Card key={idx}>
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          rec.priority === 'haute' ? 'bg-amber-100' : rec.priority === 'moyenne' ? 'bg-indigo-100' : 'bg-gray-100'
                        }`}>
                          {rec.type === 'arbres' || rec.type === 'arbres_grands' ? <TreePine className="h-4 w-4 text-amber-600" /> :
                           rec.type === 'ombrage' ? <Sun className="h-4 w-4 text-indigo-600" /> :
                           <Leaf className="h-4 w-4 text-gray-600" />}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 text-xs">{rec.title}</p>
                          <p className="text-[11px] text-gray-500">{rec.description}</p>
                        </div>
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                          +{rec.potential_gain} pts
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Premium Requests */}
            {premiumData && (
              <div data-testid="premium-requests-section">
                <h2 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-emerald-600" /> Mes Demandes de Prime
                </h2>
                {premiumData.parcelles_admissibles > 0 && premiumData.peut_demander && (
                  <Card className="border-emerald-200 bg-emerald-50 mb-2">
                    <CardContent className="p-3 flex items-center gap-3">
                      <Phone className="h-4 w-4 text-emerald-700" />
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-emerald-800">
                          {premiumData.parcelles_admissibles} parcelle(s) admissible(s)
                        </p>
                        <p className="text-[11px] text-emerald-600">Composez *144*99# puis 2 &rarr; 1</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
                {premiumData.requests?.length > 0 ? (
                  <div className="space-y-2">
                    {premiumData.requests.map((req) => {
                      const statusMap = {
                        pending: { label: 'En attente', icon: Clock, color: 'bg-amber-100 text-amber-800', border: 'border-amber-200' },
                        approved: { label: 'Approuvee', icon: CheckCircle, color: 'bg-blue-100 text-blue-800', border: 'border-blue-200' },
                        paid: { label: 'Payee', icon: Banknote, color: 'bg-emerald-100 text-emerald-800', border: 'border-emerald-200' },
                        rejected: { label: 'Rejetee', icon: XCircle, color: 'bg-red-100 text-red-800', border: 'border-red-200' },
                      };
                      const cfg = statusMap[req.status] || statusMap.pending;
                      const StatusIcon = cfg.icon;
                      return (
                        <Card key={req.id} className={`${cfg.border} border`} data-testid={`premium-request-${req.id}`}>
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between mb-2">
                              <Badge className={`${cfg.color} gap-1 text-xs`}><StatusIcon className="h-3 w-3" />{cfg.label}</Badge>
                              <span className="text-[11px] text-gray-400">
                                {req.requested_at ? new Date(req.requested_at).toLocaleDateString('fr-FR') : ''}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-center">
                              <div>
                                <p className="text-sm font-bold text-emerald-700">{(req.farmer_amount || 0).toLocaleString('fr-FR')}</p>
                                <p className="text-[10px] text-gray-500">XOF</p>
                              </div>
                              <div>
                                <p className="text-sm font-bold text-gray-600">{req.parcels_count}</p>
                                <p className="text-[10px] text-gray-500">Parcelle(s)</p>
                              </div>
                              <div>
                                <p className="text-sm font-bold text-blue-600">{req.average_carbon_score}/10</p>
                                <p className="text-[10px] text-gray-500">Score</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-3 text-center text-xs text-gray-500">
                      Aucune demande. {score >= 6 ? 'Composez *144*99# (2→1).' : `Score min requis: 6.0 (actuel: ${score.toFixed(1)})`}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab: Charts */}
        {activeTab === 'charts' && (
          <div className="space-y-4">
            {parcels.length > 0 ? (
              <>
                {/* Bar Chart */}
                <Card data-testid="farmer-bar-chart">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-emerald-600" />
                      Comparaison des Scores par Parcelle
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={barData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" height={55} />
                        <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v) => [`${v}/10`, 'Score']} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                        <Bar dataKey="score" radius={[4, 4, 0, 0]} maxBarSize={40}>
                          {barData.map((entry, idx) => (
                            <Cell key={idx} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Radar Chart */}
                <Card data-testid="farmer-radar-chart">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Leaf className="h-4 w-4 text-emerald-600" />
                      Profil Carbone (Radar)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                        <PolarGrid stroke="#d1d5db" />
                        <PolarAngleAxis dataKey="critere" tick={{ fontSize: 12, fill: '#374151' }} />
                        <PolarRadiusAxis angle={90} domain={[0, 'auto']} tick={{ fontSize: 9 }} />
                        <Radar name="Mon score" dataKey="valeur" stroke="#059669" fill="#059669" fillOpacity={0.3} strokeWidth={2} />
                        <Radar name="Maximum" dataKey="max" stroke="#d1d5db" fill="none" strokeDasharray="4 4" />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Tooltip formatter={(v) => [typeof v === 'number' ? v.toFixed(2) : v, '']} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Prime estimation bar */}
                <Card data-testid="farmer-prime-chart">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Banknote className="h-4 w-4 text-amber-600" />
                      Estimation Prime par Parcelle (XOF)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart
                        data={parcelsWithPrime.map(p => ({
                          name: (p.village || `Parcelle ${p.rank}`).substring(0, 14),
                          prime: p.prime_xof,
                        }))}
                        margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" height={55} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                        <Tooltip formatter={(v) => [`${v.toLocaleString('fr-FR')} XOF`, 'Prime']} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                        <Bar dataKey="prime" fill="#d97706" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                    <p className="text-[11px] text-gray-400 text-center mt-2">
                      Total estime: <strong className="text-amber-700">{totalPrime.toLocaleString('fr-FR')} XOF</strong> | CO2: {totalCO2.toFixed(1)} t/an
                    </p>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-gray-500 text-sm">
                  <TreePine className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  Aucune parcelle enregistree pour afficher les graphiques.
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Tab: Ranking */}
        {activeTab === 'ranking' && (
          <div className="space-y-2">
            {parcelsWithPrime.length > 0 ? (
              parcelsWithPrime.map((p) => {
                const pt = getScoreThreshold(p.carbon_score);
                const isExpanded = expandedParcel === p.id;
                return (
                  <Card key={p.id || p.rank} data-testid={`farmer-parcel-${p.rank}`}>
                    <CardContent
                      className="p-3 cursor-pointer"
                      onClick={() => setExpandedParcel(isExpanded ? null : p.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                          p.rank === 1 ? 'bg-amber-100 text-amber-700' :
                          p.rank === 2 ? 'bg-gray-100 text-gray-600' :
                          p.rank === 3 ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-50 text-gray-400'
                        }`}>
                          {p.rank}
                        </div>
                        <MapPin className="h-3.5 w-3.5 text-gray-400" />
                        <div className="flex-1">
                          <p className="text-xs font-medium text-gray-900">{p.village || `Parcelle ${p.rank}`}</p>
                          <p className="text-[10px] text-gray-400">
                            {p.area_hectares} ha | {(p.nombre_arbres || (p.arbres_petits + p.arbres_moyens + p.arbres_grands))} arbres | {p.couverture_ombragee}% ombre
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge className={`${pt.bg} ${pt.color} font-bold text-xs`}>{(p.carbon_score || 0).toFixed(1)}</Badge>
                          <p className="text-[10px] text-amber-600 font-semibold mt-0.5">{p.prime_xof.toLocaleString('fr-FR')} F</p>
                        </div>
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                      </div>
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-[10px] text-gray-500 mb-1">Estimation annuelle</p>
                            <div className="grid grid-cols-2 gap-2 text-center">
                              <div className="bg-green-50 rounded-lg p-2">
                                <p className="text-xs font-bold text-green-700">{p.co2} t</p>
                                <p className="text-[9px] text-gray-400">CO2/an</p>
                              </div>
                              <div className="bg-amber-50 rounded-lg p-2">
                                <p className="text-xs font-bold text-amber-700">{p.prime_xof.toLocaleString('fr-FR')}</p>
                                <p className="text-[9px] text-gray-400">XOF</p>
                              </div>
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-500 mb-1">Arbres par strate</p>
                            <div className="grid grid-cols-3 gap-1 text-center">
                              <div className="bg-amber-50 rounded p-1">
                                <p className="text-xs font-bold text-amber-600">{p.arbres_petits}</p>
                                <p className="text-[8px]">S1</p>
                              </div>
                              <div className="bg-green-50 rounded p-1">
                                <p className="text-xs font-bold text-green-600">{p.arbres_moyens}</p>
                                <p className="text-[8px]">S2</p>
                              </div>
                              <div className="bg-emerald-50 rounded p-1">
                                <p className="text-xs font-bold text-emerald-600">{p.arbres_grands}</p>
                                <p className="text-[8px]">S3</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <Card>
                <CardContent className="p-6 text-center text-gray-500 text-sm">
                  Aucune parcelle enregistree.
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CarbonScorePage;

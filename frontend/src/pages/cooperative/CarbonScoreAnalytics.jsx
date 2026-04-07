import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Leaf, TreePine, TrendingUp, Award, MapPin, Loader2,
  Banknote, BarChart3, Target, ChevronDown, ChevronUp, AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  PieChart, Pie, Cell, Legend
} from 'recharts';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const NIVEAU_CONFIG = {
  Excellent: { color: '#059669', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  'Tres Bon': { color: '#16a34a', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  Bon: { color: '#d97706', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  'En Progression': { color: '#ea580c', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  Insuffisant: { color: '#dc2626', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
};

const PIE_COLORS = ['#059669', '#16a34a', '#d97706', '#ea580c', '#dc2626'];

const DECOMPO_LABELS = {
  base: 'Base',
  densite_arbres: 'Arbres',
  couverture_ombragee: 'Ombrage',
  brulage: 'Brulage',
  engrais_chimique: 'Engrais',
  pratiques_ecologiques: 'Pratiques Eco',
  redd_practices: 'REDD+',
  age_cacaoyers: 'Age cacaoyers',
  surface: 'Surface',
  certification: 'Certification',
};

const DECOMPO_MAX = {
  base: 1.0, densite_arbres: 2.0, couverture_ombragee: 1.5,
  brulage: 0.5, engrais_chimique: 0.3, pratiques_ecologiques: 1.2,
  redd_practices: 2.5, age_cacaoyers: 0.5, surface: 0.3, certification: 0.2,
};

const CarbonScoreAnalytics = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedParcel, setExpandedParcel] = useState(null);
  const [sortBy, setSortBy] = useState('rang');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_URL}/api/cooperative/carbon-analytics`, {
          headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
        });
        if (!res.ok) throw new Error('Erreur chargement');
        const json = await res.json();
        setData(json);
      } catch (err) {
        toast.error('Erreur lors du chargement des analytiques carbone');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0f4f0] flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!data || !data.parcelles?.length) {
    return (
      <div className="min-h-screen bg-[#f0f4f0]">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <Button variant="ghost" size="sm" onClick={() => navigate('/cooperative/dashboard')} data-testid="back-btn">
            <ArrowLeft className="h-4 w-4 mr-1" /> Retour
          </Button>
          <Card className="mt-6">
            <CardContent className="p-12 text-center">
              <TreePine className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Aucune parcelle enregistree. Ajoutez des parcelles pour voir les analytiques carbone.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const { resume, distribution, decomposition_moyenne, parcelles } = data;

  // Bar chart data - top 20 parcels
  const barData = parcelles.slice(0, 20).map(p => ({
    name: (p.nom_parcelle || p.village || `#${p.rang}`).substring(0, 12),
    score: p.score,
    fill: (NIVEAU_CONFIG[p.niveau] || NIVEAU_CONFIG.Insuffisant).color,
  }));

  // Radar chart data
  const radarData = Object.entries(decomposition_moyenne)
    .filter(([k]) => k !== 'base' && k !== 'arbres_total' && k !== 'densite_ponderee_ha' && k !== 'pratiques_adoptees')
    .map(([k, v]) => ({
      critere: DECOMPO_LABELS[k] || k,
      valeur: Math.max(v, 0),
      max: DECOMPO_MAX[k] || 1,
      fullMark: DECOMPO_MAX[k] || 1,
    }));

  // Pie chart data
  const pieData = [
    { name: 'Excellent', value: distribution.excellent },
    { name: 'Tres Bon', value: distribution.tres_bon },
    { name: 'Bon', value: distribution.bon },
    { name: 'En Progression', value: distribution.en_progression },
    { name: 'Insuffisant', value: distribution.insuffisant },
  ].filter(d => d.value > 0);

  const sortedParcels = [...parcelles].sort((a, b) => {
    if (sortBy === 'score_desc') return b.score - a.score;
    if (sortBy === 'score_asc') return a.score - b.score;
    if (sortBy === 'prime') return b.prime_farmer_xof - a.prime_farmer_xof;
    if (sortBy === 'co2') return b.co2_tonnes - a.co2_tonnes;
    return a.rang - b.rang;
  });

  return (
    <div className="min-h-screen bg-[#f0f4f0]" data-testid="carbon-analytics-page">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/cooperative/dashboard')} data-testid="back-btn">
            <ArrowLeft className="h-4 w-4 mr-1" /> Retour
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Analytiques Score Carbone</h1>
            <p className="text-sm text-gray-500">{resume.total_parcelles} parcelles analysees</p>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Score Moyen', value: `${resume.score_moyen}/10`, icon: Award, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'CO2 Capture/an', value: `${resume.total_co2_tonnes.toLocaleString('fr-FR')} t`, icon: Leaf, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Prime Agriculteurs', value: `${resume.total_prime_farmer_xof.toLocaleString('fr-FR')} F`, icon: Banknote, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Commission Coop', value: `${resume.total_prime_coop_xof.toLocaleString('fr-FR')} F`, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
          ].map((kpi, i) => (
            <Card key={i} data-testid={`kpi-${i}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-8 h-8 rounded-lg ${kpi.bg} flex items-center justify-center`}>
                    <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                  </div>
                  <span className="text-xs text-gray-500">{kpi.label}</span>
                </div>
                <p className={`text-lg font-bold ${kpi.color}`}>{kpi.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Bar Chart - Scores par parcelle */}
          <Card className="lg:col-span-2" data-testid="bar-chart-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-emerald-600" />
                Scores par Parcelle
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" height={60} />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(val) => [`${val}/10`, 'Score']}
                    contentStyle={{ borderRadius: 8, border: '1px solid #d1d5db', fontSize: 12 }}
                  />
                  <Bar dataKey="score" radius={[4, 4, 0, 0]} maxBarSize={36}>
                    {barData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Distribution Pie */}
          <Card data-testid="distribution-chart-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="h-4 w-4 text-emerald-600" />
                Distribution des Niveaux
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%" cy="45%"
                    innerRadius={50} outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {pieData.map((entry, idx) => {
                      const colorIdx = ['Excellent', 'Tres Bon', 'Bon', 'En Progression', 'Insuffisant'].indexOf(entry.name);
                      return <Cell key={idx} fill={PIE_COLORS[colorIdx >= 0 ? colorIdx : 4]} />;
                    })}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [`${v} parcelle(s)`, '']} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Radar Chart - Decomposition */}
        <Card className="mb-6" data-testid="radar-chart-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Leaf className="h-4 w-4 text-emerald-600" />
              Decomposition Moyenne du Score (Radar)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col lg:flex-row items-center gap-6">
              <ResponsiveContainer width="100%" height={320}>
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                  <PolarGrid stroke="#d1d5db" />
                  <PolarAngleAxis dataKey="critere" tick={{ fontSize: 11, fill: '#374151' }} />
                  <PolarRadiusAxis angle={90} domain={[0, 'auto']} tick={{ fontSize: 9 }} />
                  <Radar name="Score moyen" dataKey="valeur" stroke="#059669" fill="#059669" fillOpacity={0.25} strokeWidth={2} />
                  <Radar name="Maximum" dataKey="max" stroke="#d1d5db" fill="none" strokeDasharray="4 4" strokeWidth={1} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => [v.toFixed(2), '']} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Ranking Table */}
        <Card data-testid="ranking-table-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                Classement des Parcelles
              </CardTitle>
              <select
                className="text-xs border rounded-lg px-2 py-1.5 bg-white"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                data-testid="sort-select"
              >
                <option value="rang">Rang (score desc.)</option>
                <option value="score_asc">Score croissant</option>
                <option value="prime">Prime estimee</option>
                <option value="co2">CO2 capture</option>
              </select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="ranking-table">
                <thead>
                  <tr className="border-b bg-gray-50/80">
                    <th className="text-left px-4 py-2.5 font-medium text-gray-500 w-12">#</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-500">Parcelle</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-500 hidden md:table-cell">Producteur</th>
                    <th className="text-center px-4 py-2.5 font-medium text-gray-500">Score</th>
                    <th className="text-right px-4 py-2.5 font-medium text-gray-500 hidden sm:table-cell">CO2 (t/an)</th>
                    <th className="text-right px-4 py-2.5 font-medium text-gray-500">Prime (XOF)</th>
                    <th className="text-center px-4 py-2.5 font-medium text-gray-500 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedParcels.map((p) => {
                    const cfg = NIVEAU_CONFIG[p.niveau] || NIVEAU_CONFIG.Insuffisant;
                    const isExpanded = expandedParcel === p.id;
                    return (
                      <React.Fragment key={p.id}>
                        <tr
                          className="border-b hover:bg-gray-50/50 cursor-pointer transition-colors"
                          onClick={() => setExpandedParcel(isExpanded ? null : p.id)}
                          data-testid={`parcel-row-${p.id}`}
                        >
                          <td className="px-4 py-3 font-mono text-gray-400 text-xs">{p.rang}</td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900 text-xs">{p.nom_parcelle || p.village}</div>
                            <div className="text-[11px] text-gray-400">{p.superficie_ha} ha | {p.total_arbres} arbres</div>
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-xs hidden md:table-cell">{p.producteur}</td>
                          <td className="px-4 py-3 text-center">
                            <Badge className={`${cfg.bg} ${cfg.text} ${cfg.border} border font-bold text-xs`}>
                              {p.score}/10
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right text-xs text-gray-600 hidden sm:table-cell">{p.co2_tonnes}</td>
                          <td className="px-4 py-3 text-right font-semibold text-xs text-amber-700">
                            {p.prime_farmer_xof.toLocaleString('fr-FR')} F
                          </td>
                          <td className="px-4 py-3 text-center">
                            {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr data-testid={`parcel-detail-${p.id}`}>
                            <td colSpan={7} className="px-4 py-4 bg-gray-50/80">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Decomposition */}
                                <div>
                                  <h4 className="text-xs font-semibold text-gray-700 mb-2">Decomposition du score</h4>
                                  <div className="space-y-1.5">
                                    {Object.entries(p.decomposition || {}).filter(([k]) =>
                                      DECOMPO_LABELS[k] && typeof p.decomposition[k] === 'number'
                                    ).map(([k, v]) => (
                                      <div key={k} className="flex items-center gap-2">
                                        <span className="text-[11px] text-gray-500 w-24 truncate">{DECOMPO_LABELS[k]}</span>
                                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                          <div
                                            className="h-full rounded-full bg-emerald-500 transition-all"
                                            style={{ width: `${DECOMPO_MAX[k] > 0 ? Math.max(0, (v / DECOMPO_MAX[k]) * 100) : 0}%` }}
                                          />
                                        </div>
                                        <span className="text-[11px] font-mono text-gray-600 w-12 text-right">
                                          {v >= 0 ? `+${v}` : v}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                {/* Recommandations + Info */}
                                <div>
                                  <h4 className="text-xs font-semibold text-gray-700 mb-2">Recommandations</h4>
                                  {p.recommandations?.length > 0 ? (
                                    <div className="space-y-1">
                                      {p.recommandations.map((r, i) => (
                                        <div key={i} className="flex items-start gap-2 text-[11px] text-gray-600">
                                          <AlertTriangle className="h-3 w-3 text-amber-500 mt-0.5 flex-shrink-0" />
                                          <span>{r}</span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-[11px] text-emerald-600 flex items-center gap-1">
                                      <Award className="h-3 w-3" /> Aucune recommandation - pratiques exemplaires
                                    </p>
                                  )}
                                  <div className="mt-3 pt-3 border-t grid grid-cols-3 gap-2 text-center">
                                    <div>
                                      <p className="text-xs font-bold text-green-700">{p.couverture_ombragee}%</p>
                                      <p className="text-[10px] text-gray-400">Ombrage</p>
                                    </div>
                                    <div>
                                      <p className="text-xs font-bold text-blue-700">{p.co2_tonnes} t</p>
                                      <p className="text-[10px] text-gray-400">CO2/an</p>
                                    </div>
                                    <div>
                                      <Badge className={`text-[10px] ${
                                        p.statut_verification === 'verified' ? 'bg-emerald-100 text-emerald-700' :
                                        p.statut_verification === 'rejected' ? 'bg-red-100 text-red-700' :
                                        'bg-gray-100 text-gray-600'
                                      }`}>
                                        {p.statut_verification === 'verified' ? 'Verifie' :
                                         p.statut_verification === 'rejected' ? 'Rejete' : 'En attente'}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Footer info */}
        <p className="text-[11px] text-gray-400 text-center mt-4">
          Prix de reference: {resume.prix_tonne_co2_xof?.toLocaleString('fr-FR')} XOF/tonne CO2 |
          Part agriculteur: 70% du net | Commission cooperative: 5% du net | Frais plateforme: 30%
        </p>
      </div>
    </div>
  );
};

export default CarbonScoreAnalytics;

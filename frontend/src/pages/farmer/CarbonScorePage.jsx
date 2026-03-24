import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Leaf, TreePine, Sun, Recycle, Droplets, Sprout, Award, MapPin, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { toast } from 'sonner';
import Navbar from '../../components/Navbar';

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
  if (score >= 8) return { label: 'Excellent', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' };
  if (score >= 7) return { label: 'Tres bien', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' };
  if (score >= 5) return { label: 'Bien', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' };
  if (score >= 3) return { label: 'A ameliorer', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' };
  return { label: 'Faible', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' };
};

const CarbonScorePage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchScore = async () => {
      try {
        const res = await fetch(`${API_URL}/api/greenlink/carbon/my-score`, { headers: getAuthHeader() });
        const json = await res.json();
        setData(json);
      } catch (err) {
        toast.error('Erreur lors du chargement du score carbone');
      } finally {
        setLoading(false);
      }
    };
    fetchScore();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex justify-center items-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </div>
    );
  }

  const score = data?.average_score || 0;
  const breakdown = data?.breakdown || {};
  const recommendations = data?.recommendations || [];
  const parcels = data?.parcels || [];
  const threshold = getScoreThreshold(score);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/farmer/dashboard')} data-testid="back-btn">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Retour
          </Button>
          <h1 className="text-xl font-bold text-gray-900">Mon Score Carbone</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Score Gauge */}
          <Card className={`lg:col-span-1 ${threshold.border} border-2`}>
            <CardContent className="pt-8 pb-6 text-center">
              <div className={`w-32 h-32 rounded-full border-8 ${threshold.border} mx-auto flex flex-col items-center justify-center mb-4`}>
                <span className={`text-4xl font-extrabold ${threshold.color}`}>{score.toFixed(1)}</span>
                <span className="text-sm text-gray-400">/10</span>
              </div>
              <Badge className={`${threshold.bg} ${threshold.color} text-sm px-4 py-1`}>
                {threshold.label}
              </Badge>
              <p className="text-sm text-gray-500 mt-3">
                {score >= 7 ? 'Eligible aux primes carbone' : `+${(7 - score).toFixed(1)} pts pour etre eligible`}
              </p>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 mt-6 pt-4 border-t">
                <div>
                  <p className="text-lg font-bold text-emerald-600">{(data?.total_credits || 0).toFixed(1)}</p>
                  <p className="text-xs text-gray-400">tCO2</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-amber-600">{(data?.total_premium || 0).toLocaleString()}</p>
                  <p className="text-xs text-gray-400">XOF primes</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-blue-600">{data?.parcels_count || 0}</p>
                  <p className="text-xs text-gray-400">Parcelles</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Breakdown */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Décomposition du score</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: 'Base', value: breakdown.base || 3, max: 3, color: 'bg-gray-400', detail: 'Score initial' },
                { label: 'Arbres', value: breakdown.arbres || 0, max: 2, color: 'bg-emerald-500', detail: `${data?.total_trees || 0} arbres (pondéré: ${data?.weighted_density || 0}/ha)` },
                { label: 'Ombrage', value: breakdown.ombrage || 0, max: 2, color: 'bg-green-500', detail: `${data?.avg_shade_cover || 0}%` },
                { label: 'Pratiques', value: breakdown.pratiques || 0, max: 2.5, color: 'bg-indigo-500', detail: `${data?.practices_count || 0}/5` },
                { label: 'Surface', value: breakdown.surface || 0, max: 0.5, color: 'bg-amber-500', detail: `${data?.total_area || 0} ha` },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-24 text-sm">
                    <p className="font-medium text-gray-700">{item.label}</p>
                    <p className="text-xs text-gray-400">{item.detail}</p>
                  </div>
                  <div className="flex-1">
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${item.color} transition-all duration-700`}
                        style={{ width: `${item.max > 0 ? (item.value / item.max) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-bold text-gray-700 w-14 text-right">{item.value}/{item.max}</span>
                </div>
              ))}
              <div className="flex justify-between pt-3 border-t mt-2">
                <span className="font-bold text-gray-700">Total</span>
                <span className={`text-xl font-extrabold ${threshold.color}`}>{score.toFixed(1)} / 10</span>
              </div>

              {/* Tree categories visualization */}
              {data?.arbre_categories && data.arbre_categories.total > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <TreePine className="h-4 w-4 text-emerald-600" />
                    Répartition des arbres par taille (biomasse)
                  </h4>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="text-center p-3 rounded-lg bg-amber-50 border border-amber-200">
                      <p className="text-2xl font-bold text-amber-600">{data.arbre_categories.petits_lt_8m}</p>
                      <p className="text-xs text-amber-700 font-medium">Petits {'<'} 8m</p>
                      <p className="text-[10px] text-gray-400">Coeff. x0.3</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-green-50 border border-green-200">
                      <p className="text-2xl font-bold text-green-600">{data.arbre_categories.moyens_8_12m}</p>
                      <p className="text-xs text-green-700 font-medium">Moyens 8-12m</p>
                      <p className="text-[10px] text-gray-400">Coeff. x0.7</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                      <p className="text-2xl font-bold text-emerald-600">{data.arbre_categories.grands_gt_12m}</p>
                      <p className="text-xs text-emerald-700 font-medium">Grands {'>'} 12m</p>
                      <p className="text-[10px] text-gray-400">Coeff. x1.0</p>
                    </div>
                  </div>
                  {/* Biomass bar */}
                  <div className="flex h-3 rounded-full overflow-hidden bg-gray-100">
                    {data.arbre_categories.petits_lt_8m > 0 && (
                      <div className="bg-amber-400 h-full" style={{ flex: data.arbre_categories.petits_lt_8m }} />
                    )}
                    {data.arbre_categories.moyens_8_12m > 0 && (
                      <div className="bg-green-500 h-full" style={{ flex: data.arbre_categories.moyens_8_12m }} />
                    )}
                    {data.arbre_categories.grands_gt_12m > 0 && (
                      <div className="bg-emerald-600 h-full" style={{ flex: data.arbre_categories.grands_gt_12m }} />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Biomasse pondérée : <strong className="text-emerald-700">{data.arbre_categories.biomasse_ponderee}</strong> (densité : {data.weighted_density}/ha)
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Practices */}
        {(data?.practices_list?.length > 0) && (
          <div className="mt-6">
            <h2 className="text-base font-bold text-gray-900 mb-3">Pratiques actives</h2>
            <div className="flex flex-wrap gap-2">
              {data.practices_list.map(p => {
                const practice = PRACTICE_LABELS[p] || { label: p, icon: Leaf };
                const Icon = practice.icon;
                return (
                  <Badge key={p} className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 gap-1.5">
                    <Icon className="h-3.5 w-3.5" />
                    {practice.label}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="mt-6">
            <h2 className="text-base font-bold text-gray-900 mb-3">Recommandations</h2>
            <div className="space-y-2">
              {recommendations.map((rec, idx) => (
                <Card key={idx}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      rec.priority === 'haute' ? 'bg-amber-100' : rec.priority === 'moyenne' ? 'bg-indigo-100' : 'bg-gray-100'
                    }`}>
                      {rec.type === 'arbres' ? <TreePine className="h-5 w-5 text-amber-600" /> :
                       rec.type === 'ombrage' ? <Sun className="h-5 w-5 text-indigo-600" /> :
                       <Leaf className="h-5 w-5 text-gray-600" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 text-sm">{rec.title}</p>
                      <p className="text-xs text-gray-500">{rec.description}</p>
                    </div>
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                      +{rec.potential_gain} pts
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Parcels */}
        {parcels.length > 0 && (
          <div className="mt-6">
            <h2 className="text-base font-bold text-gray-900 mb-3">Scores par parcelle</h2>
            <div className="space-y-2">
              {parcels.map((p, idx) => {
                const pt = getScoreThreshold(p.carbon_score);
                return (
                  <Card key={p.id || idx}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${pt.color.replace('text-', 'bg-')}`} />
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{p.village || `Parcelle ${idx + 1}`}</p>
                        <p className="text-xs text-gray-400">
                          {p.area_hectares} ha
                          {p.nombre_arbres > 0 ? ` | ${p.nombre_arbres} arbres` : ''}
                          {p.couverture_ombragee > 0 ? ` | ${p.couverture_ombragee}% ombre` : ''}
                        </p>
                      </div>
                      <Badge className={`${pt.bg} ${pt.color} font-bold`}>
                        {(p.carbon_score || 0).toFixed(1)}
                      </Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CarbonScorePage;

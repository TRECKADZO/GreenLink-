import { tokenService } from "../../services/tokenService";
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import Navbar from '../../components/Navbar';
import { toast } from 'sonner';
import axios from 'axios';
import {
  TreePine, Leaf, Shield, Users, BarChart3,
  RefreshCcw, ArrowLeft, Sprout, Droplets,
  FileCheck, CheckCircle2, XCircle, AlertTriangle,
  Award, TrendingUp, Download, MapPin
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const MRVDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [summary, setSummary] = useState(null);
  const [farmers, setFarmers] = useState([]);
  const [loading, setLoading] = useState(true);

  const downloadPDF = async () => {
    try {
      const token = tokenService.getToken();
      const res = await axios.get(`${API}/api/redd/pdf/mrv-report`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `GreenLink_MRV_Suivi_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Rapport PDF telecharge');
    } catch (err) {
      toast.error('Erreur lors du telechargement PDF');
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = tokenService.getToken();
      const headers = { Authorization: `Bearer ${token}` };

      // All cooperatives have free access - no subscription check needed
      const [sumRes, farmRes] = await Promise.all([
        axios.get(`${API}/api/redd/mrv/summary`, { headers }),
        axios.get(`${API}/api/redd/mrv/farmers?limit=100`, { headers }),
      ]);
      setSummary(sumRes.data);
      setFarmers(farmRes.data.farmers || []);
    } catch (err) {
      toast.error('Erreur de chargement MRV');
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (user) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Navbar />
        <div className="pt-24 flex justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500" />
        </div>
      </div>
    );
  }

  if (!user || (user.user_type !== 'cooperative' && user.user_type !== 'admin')) {
    navigate('/login');
    return null;
  }

  const reddLevelColor = (level) => {
    const map = {
      Excellence: 'bg-emerald-500 text-white',
      Avance: 'bg-blue-500 text-white',
      Intermediaire: 'bg-amber-500 text-white',
      Debutant: 'bg-orange-500 text-white',
      'Non conforme': 'bg-red-500 text-white',
    };
    return map[level] || 'bg-slate-600 text-white';
  };

  const arsColor = (level) => {
    const map = { Or: 'text-yellow-400', Argent: 'text-slate-300', Bronze: 'text-orange-400' };
    return map[level] || 'text-slate-500';
  };

  const PracticeBar = ({ label, pct, count, total, color }) => (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-300">{label}</span>
        <span className="text-slate-400">{count}/{total} ({pct}%)</span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <div className="pt-24 pb-12 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-slate-400 hover:text-white hover:bg-white/5">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="p-2.5 bg-emerald-500/20 rounded-xl">
                <BarChart3 className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold" data-testid="mrv-title">Dashboard MRV & Suivi</h1>
                <p className="text-xs text-slate-400">Monitoring, Rapportage, Verification</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={downloadPDF} className="border-emerald-600 text-emerald-400 hover:bg-emerald-500/10" data-testid="mrv-download-pdf">
                <Download className={`w-4 h-4 mr-1`} /> Export PDF
              </Button>
              <Button variant="outline" size="sm" onClick={fetchData} className="border-slate-700 text-slate-300 hover:bg-slate-800" data-testid="mrv-refresh">
                <RefreshCcw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Actualiser
              </Button>
            </div>
          </div>

          {loading || !summary ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500" />
            </div>
          ) : (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3" data-testid="mrv-kpi-grid">
                <Card className="bg-slate-900 border-slate-800">
                  <CardContent className="p-3">
                    <Users className="w-4 h-4 text-blue-400 mb-1" />
                    <p className="text-xl font-bold">{summary.total_farmers}</p>
                    <p className="text-[10px] text-slate-400">Planteurs</p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-900 border-slate-800">
                  <CardContent className="p-3">
                    <MapPin className="w-4 h-4 text-green-400 mb-1" />
                    <p className="text-xl font-bold">{summary.total_hectares}</p>
                    <p className="text-[10px] text-slate-400">Hectares</p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-900 border-slate-800">
                  <CardContent className="p-3">
                    <TreePine className="w-4 h-4 text-emerald-400 mb-1" />
                    <p className="text-xl font-bold">{summary.total_arbres?.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400">Arbres</p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-900 border-slate-800">
                  <CardContent className="p-3">
                    <TrendingUp className="w-4 h-4 text-amber-400 mb-1" />
                    <p className="text-xl font-bold">{summary.avg_score_carbone}/10</p>
                    <p className="text-[10px] text-slate-400">Score Carbone</p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-900 border-slate-800">
                  <CardContent className="p-3">
                    <Leaf className="w-4 h-4 text-emerald-400 mb-1" />
                    <p className="text-xl font-bold">{summary.avg_score_redd}/10</p>
                    <p className="text-[10px] text-slate-400">Score Carbone</p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-900 border-slate-800">
                  <CardContent className="p-3">
                    <Award className="w-4 h-4 text-yellow-400 mb-1" />
                    <p className="text-xl font-bold">{summary.ars_distribution?.Or || 0}</p>
                    <p className="text-[10px] text-slate-400">Excellent</p>
                  </CardContent>
                </Card>
              </div>

              {/* Practice Adoption + Level Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Practice Adoption */}
                <Card className="bg-slate-900 border-slate-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-white text-base flex items-center gap-2">
                      <Sprout className="w-4 h-4 text-green-400" />
                      Adoption des Pratiques Durables
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4" data-testid="mrv-practices-adoption">
                    {summary.practices_adoption && Object.keys(summary.practices_adoption).length > 0 ? (
                      <>
                        <PracticeBar label="Agroforesterie" pct={summary.practices_adoption.agroforesterie?.pct || 0} count={summary.practices_adoption.agroforesterie?.count || 0} total={summary.total_farmers} color="bg-emerald-500" />
                        <PracticeBar label="Compostage/Paillage" pct={summary.practices_adoption.compost?.pct || 0} count={summary.practices_adoption.compost?.count || 0} total={summary.total_farmers} color="bg-amber-500" />
                        <PracticeBar label="Couverture vegetale" pct={summary.practices_adoption.couverture_sol?.pct || 0} count={summary.practices_adoption.couverture_sol?.count || 0} total={summary.total_farmers} color="bg-teal-500" />
                        <PracticeBar label="Zero brulage" pct={summary.practices_adoption.zero_brulage?.pct || 0} count={summary.practices_adoption.zero_brulage?.count || 0} total={summary.total_farmers} color="bg-blue-500" />
                        <PracticeBar label="Sans engrais chimiques" pct={summary.practices_adoption.zero_engrais?.pct || 0} count={summary.practices_adoption.zero_engrais?.count || 0} total={summary.total_farmers} color="bg-violet-500" />
                      </>
                    ) : (
                      <p className="text-slate-500 text-sm py-4 text-center">Aucune donnee disponible</p>
                    )}
                  </CardContent>
                </Card>

                {/* Level Distribution */}
                <Card className="bg-slate-900 border-slate-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-white text-base flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-blue-400" />
                      Distribution Niveaux Durabilite
                    </CardTitle>
                  </CardHeader>
                  <CardContent data-testid="mrv-redd-distribution">
                    {summary.redd_level_distribution ? (
                      <div className="space-y-3">
                        {[
                          { label: 'Excellence', key: 'excellence', color: 'bg-emerald-500', textColor: 'text-emerald-400' },
                          { label: 'Avance', key: 'avance', color: 'bg-blue-500', textColor: 'text-blue-400' },
                          { label: 'Intermediaire', key: 'intermediaire', color: 'bg-amber-500', textColor: 'text-amber-400' },
                          { label: 'Debutant', key: 'debutant', color: 'bg-orange-500', textColor: 'text-orange-400' },
                          { label: 'Non conforme', key: 'non_conforme', color: 'bg-red-500', textColor: 'text-red-400' },
                        ].map(({ label, key, color, textColor }) => {
                          const count = summary.redd_level_distribution[key] || 0;
                          const pct = summary.total_farmers ? Math.round(count / summary.total_farmers * 100) : 0;
                          return (
                            <div key={key} className="flex items-center gap-3">
                              <span className={`text-xs w-28 ${textColor}`}>{label}</span>
                              <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs text-slate-400 w-12 text-right">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-slate-500 text-sm py-4 text-center">Aucune donnee</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Farmers Table */}
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white text-base flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-400" />
                      Donnees MRV par Planteur
                    </CardTitle>
                    <Badge className="bg-slate-700 text-slate-300">{farmers.length} planteurs</Badge>
                  </div>
                </CardHeader>
                <CardContent data-testid="mrv-farmers-table">
                  {farmers.length === 0 ? (
                    <div className="text-center py-12">
                      <FileCheck className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                      <p className="text-slate-500">Aucune donnee MRV disponible</p>
                      <p className="text-xs text-slate-600 mt-1">Les donnees apparaitront apres que les planteurs utilisent le USSD *144*99#</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-700">
                            <th className="text-left py-2 px-2 text-slate-400 text-xs font-medium">Planteur</th>
                            <th className="text-center py-2 px-2 text-slate-400 text-xs font-medium">Ha</th>
                            <th className="text-center py-2 px-2 text-slate-400 text-xs font-medium">Arbres</th>
                            <th className="text-center py-2 px-2 text-slate-400 text-xs font-medium">Carbone</th>
                            <th className="text-center py-2 px-2 text-slate-400 text-xs font-medium">Niveau</th>
                            <th className="text-center py-2 px-2 text-slate-400 text-xs font-medium">Qualite</th>
                            <th className="text-left py-2 px-2 text-slate-400 text-xs font-medium">Pratiques</th>
                          </tr>
                        </thead>
                        <tbody>
                          {farmers.map((f, idx) => (
                            <tr key={f.farmer_id || idx} className="border-b border-slate-800/50 hover:bg-slate-800/30" data-testid={`mrv-farmer-row-${idx}`}>
                              <td className="py-2 px-2">
                                <p className="text-white text-xs font-medium">{f.farmer_name || 'N/A'}</p>
                                <p className="text-[10px] text-slate-500">{f.phone}</p>
                              </td>
                              <td className="text-center py-2 px-2 text-xs text-slate-300">{f.hectares}</td>
                              <td className="text-center py-2 px-2 text-xs text-slate-300">{f.arbres_total}</td>
                              <td className="text-center py-2 px-2">
                                <span className="text-xs font-medium text-amber-400">{f.score_carbone}/10</span>
                              </td>
                              <td className="text-center py-2 px-2">
                                <Badge className={`text-[10px] ${reddLevelColor(f.redd_level)}`}>{f.redd_score}</Badge>
                              </td>
                              <td className="text-center py-2 px-2">
                                <span className={`text-xs font-medium ${arsColor(f.ars_level)}`}>{f.ars_level || '-'}</span>
                              </td>
                              <td className="py-2 px-2">
                                <div className="flex flex-wrap gap-1">
                                  {f.practices?.slice(0, 3).map((p, i) => (
                                    <Badge key={`el-${i}`} variant="outline" className="text-[9px] border-slate-600 text-slate-400 px-1 py-0">{p}</Badge>
                                  ))}
                                  {f.practices?.length > 3 && <span className="text-[10px] text-slate-500">+{f.practices.length - 3}</span>}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex flex-wrap gap-3 justify-center">
                <Button onClick={() => navigate('/guide-redd')} variant="outline" className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10" data-testid="mrv-guide-btn">
                  <Leaf className="w-4 h-4 mr-2" /> Guide Pratiques Durables
                </Button>
                <Button onClick={() => navigate('/cooperative/ssrte')} variant="outline" className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10" data-testid="mrv-ssrte-btn">
                  <Shield className="w-4 h-4 mr-2" /> Alertes SSRTE/ICI
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MRVDashboard;

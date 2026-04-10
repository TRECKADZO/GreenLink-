import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Trophy, Medal, Award, Users, TrendingUp, Download,
  ChevronRight, BarChart3, Target, Star, Crown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const BadgeAnalyticsPage = () => {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch(`${API_URL}/api/carbon-auditor/admin/analytics/badges`);
        const data = await response.json();
        setAnalytics(data);
      } catch (error) {
        console.error('Error fetching analytics:', error);
        toast.error('Erreur lors du chargement des analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const downloadCertificate = async (auditorId, auditorName) => {
    try {
      const response = await fetch(`${API_URL}/api/carbon-auditor/auditor/${auditorId}/badge-certificate`);
      if (!response.ok) {
        throw new Error('Certificat non disponible');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificat_${auditorName.replace(/\s+/g, '_')}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Certificat téléchargé');
    } catch (error) {
      toast.error(error.message);
    }
  };

  const getBadgeIcon = (badge) => {
    switch(badge) {
      case 'gold': return '🥇';
      case 'silver': return '🥈';
      case 'bronze': return '🥉';
      case 'starter': return '🌱';
      default: return '🔒';
    }
  };

  const getBadgeColor = (badge) => {
    switch(badge) {
      case 'gold': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'silver': return 'bg-gray-400/20 text-gray-300 border-gray-400/50';
      case 'bronze': return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
      case 'starter': return 'bg-green-500/20 text-green-400 border-green-500/50';
      default: return 'bg-gray-600/20 text-gray-500 border-gray-600/50';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900" data-testid="badge-analytics-page">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-600 to-yellow-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                className="text-white hover:bg-white/20"
                onClick={() => navigate('/admin/carbon-auditors')}
              >
                ← Retour
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Trophy className="h-8 w-8" />
                  Analytics Badges Auditeurs
                </h1>
                <p className="text-amber-100">Suivi de la gamification et performances</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 rounded-lg">
                  <Users className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{analytics?.total_auditors || 0}</p>
                  <p className="text-xs text-gray-400">Total auditeurs</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <Target className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{analytics?.active_auditors || 0}</p>
                  <p className="text-xs text-gray-400">Actifs</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{analytics?.monthly_stats?.current_month_audits || 0}</p>
                  <p className="text-xs text-gray-400">Audits ce mois</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${analytics?.monthly_stats?.growth_rate >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {analytics?.monthly_stats?.growth_rate >= 0 ? '+' : ''}{analytics?.monthly_stats?.growth_rate || 0}%
                  </p>
                  <p className="text-xs text-gray-400">vs mois dernier</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Badge Distribution */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Medal className="h-5 w-5 text-amber-400" />
                Distribution des Badges
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Gold */}
                <div className="flex items-center gap-4">
                  <span className="text-3xl">🥇</span>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-yellow-400 font-medium">Or</span>
                      <span className="text-white">{analytics?.badge_distribution?.gold || 0}</span>
                    </div>
                    <Progress 
                      value={(analytics?.badge_distribution?.gold || 0) / Math.max(analytics?.total_auditors || 1, 1) * 100} 
                      className="h-2 bg-gray-700"
                    />
                  </div>
                </div>

                {/* Silver */}
                <div className="flex items-center gap-4">
                  <span className="text-3xl">🥈</span>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-300 font-medium">Argent</span>
                      <span className="text-white">{analytics?.badge_distribution?.silver || 0}</span>
                    </div>
                    <Progress 
                      value={(analytics?.badge_distribution?.silver || 0) / Math.max(analytics?.total_auditors || 1, 1) * 100} 
                      className="h-2 bg-gray-700"
                    />
                  </div>
                </div>

                {/* Bronze */}
                <div className="flex items-center gap-4">
                  <span className="text-3xl">🥉</span>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-orange-400 font-medium">Bronze</span>
                      <span className="text-white">{analytics?.badge_distribution?.bronze || 0}</span>
                    </div>
                    <Progress 
                      value={(analytics?.badge_distribution?.bronze || 0) / Math.max(analytics?.total_auditors || 1, 1) * 100} 
                      className="h-2 bg-gray-700"
                    />
                  </div>
                </div>

                {/* Starter */}
                <div className="flex items-center gap-4">
                  <span className="text-3xl">🌱</span>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-green-400 font-medium">Débutant</span>
                      <span className="text-white">{analytics?.badge_distribution?.starter || 0}</span>
                    </div>
                    <Progress 
                      value={(analytics?.badge_distribution?.starter || 0) / Math.max(analytics?.total_auditors || 1, 1) * 100} 
                      className="h-2 bg-gray-700"
                    />
                  </div>
                </div>

                {/* None */}
                <div className="flex items-center gap-4">
                  <span className="text-3xl">🔒</span>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-500 font-medium">Aucun</span>
                      <span className="text-white">{analytics?.badge_distribution?.none || 0}</span>
                    </div>
                    <Progress 
                      value={(analytics?.badge_distribution?.none || 0) / Math.max(analytics?.total_auditors || 1, 1) * 100} 
                      className="h-2 bg-gray-700"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Badge Requirements */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-400" />
                Niveaux de Badge
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics?.badge_requirements && Object.entries(analytics.badge_requirements).map(([badge, info]) => (
                  <div key={badge} className={`p-3 rounded-lg border ${getBadgeColor(badge)}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getBadgeIcon(badge)}</span>
                        <div>
                          <p className="font-medium capitalize">{badge === 'starter' ? 'Débutant' : badge}</p>
                          <p className="text-xs opacity-80">{info.description}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="border-current">
                        {info.min_audits}+ audits
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Leaderboard */}
        <Card className="bg-gray-800 border-gray-700 mt-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-400" />
              Classement des Auditeurs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Rang</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Auditeur</th>
                    <th className="text-center py-3 px-4 text-gray-400 font-medium">Badge</th>
                    <th className="text-center py-3 px-4 text-gray-400 font-medium">Audits</th>
                    <th className="text-center py-3 px-4 text-gray-400 font-medium">Taux</th>
                    <th className="text-center py-3 px-4 text-gray-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics?.leaderboard?.map((auditor, index) => (
                    <tr key={auditor.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                      <td className="py-3 px-4">
                        <span className={`text-lg ${index < 3 ? 'font-bold' : ''}`}>
                          {index === 0 ? '🏆' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-white font-medium">{auditor.full_name}</p>
                          <p className="text-xs text-gray-400">{auditor.email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-2xl">{getBadgeIcon(auditor.badge)}</span>
                        <p className="text-xs text-gray-400">{auditor.badge_label}</p>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-white font-bold">{auditor.total_audits}</span>
                        <p className="text-xs text-green-400">({auditor.approved_audits} ✓)</p>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`font-medium ${auditor.approval_rate >= 80 ? 'text-green-400' : auditor.approval_rate >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {auditor.approval_rate}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {auditor.badge && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-amber-500/50 text-amber-400 hover:bg-amber-500/20"
                            onClick={() => downloadCertificate(auditor.id, auditor.full_name)}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Certificat
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BadgeAnalyticsPage;

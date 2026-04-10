import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Shield, MapPin, CheckCircle, Clock, XCircle, 
  Target, BarChart3, Calendar, FileCheck, ChevronRight,
  Leaf, Camera, Navigation, AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AuditorDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const fetchDashboard = async () => {
      // Use _id or id (depends on how data is stored)
      const userId = user?.id || user?._id;
      if (!userId) return;
      try {
        const response = await fetch(`${API_URL}/api/carbon-auditor/dashboard/${userId}`);
        const data = await response.json();
        setDashboard(data);
      } catch (error) {
        console.error('Error fetching dashboard:', error);
        toast.error('Erreur lors du chargement du dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900" data-testid="auditor-dashboard">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
              <Shield className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Bonjour, {dashboard?.auditor?.full_name || 'Auditeur'}</h1>
              <p className="text-emerald-100">Auditeur Carbone GreenLink</p>
              {dashboard?.auditor?.certifications?.length > 0 && (
                <div className="flex gap-2 mt-2">
                  {dashboard.auditor.certifications.map((cert, i) => (
                    <Badge key={`el-${i}`} className="bg-white/20 text-white">
                      {cert}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                  <FileCheck className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{dashboard?.stats?.total_audits || 0}</p>
                  <p className="text-xs text-gray-400">Audits totaux</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{dashboard?.stats?.approved || 0}</p>
                  <p className="text-xs text-gray-400">Approuvés</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <XCircle className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{dashboard?.stats?.rejected || 0}</p>
                  <p className="text-xs text-gray-400">Rejetés</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{dashboard?.stats?.approval_rate || 0}%</p>
                  <p className="text-xs text-gray-400">Taux approbation</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Progress */}
        <Card className="bg-gray-800 border-gray-700 mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-white flex items-center gap-2">
              <Calendar className="h-5 w-5 text-emerald-400" />
              Progression ce mois
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400">Audits effectués</span>
              <span className="text-white font-medium">{dashboard?.stats?.monthly_audits || 0} / 20</span>
            </div>
            <Progress 
              value={((dashboard?.stats?.monthly_audits || 0) / 20) * 100} 
              className="h-2 bg-gray-700"
            />
            <p className="text-xs text-gray-500 mt-2">Objectif mensuel: 20 audits</p>
          </CardContent>
        </Card>

        {/* Badge Progress Card */}
        <Card className="bg-gradient-to-r from-amber-900/30 to-yellow-900/30 border-amber-700/50 mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-amber-300 flex items-center gap-2">
              <span className="text-2xl">🏆</span>
              Badge Auditeur
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              {/* Current Badge */}
              <div className="text-center">
                <div className="text-4xl mb-2">
                  {dashboard?.auditor?.badge === 'gold' ? '🥇' :
                   dashboard?.auditor?.badge === 'silver' ? '🥈' :
                   dashboard?.auditor?.badge === 'bronze' ? '🥉' :
                   dashboard?.auditor?.badge === 'starter' ? '🌱' : '🔒'}
                </div>
                <p className="text-amber-200 font-medium">
                  {dashboard?.auditor?.badge_label || 'Aucun badge'}
                </p>
              </div>
              
              {/* Progress to next badge */}
              {dashboard?.badge_progress?.next_badge && (
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-sm">Prochain badge</span>
                    <span className="text-amber-400 text-sm font-medium">
                      {dashboard.badge_progress.next_badge === 'bronze' ? '🥉 Bronze' :
                       dashboard.badge_progress.next_badge === 'silver' ? '🥈 Argent' :
                       dashboard.badge_progress.next_badge === 'gold' ? '🥇 Or' : ''}
                    </span>
                  </div>
                  <Progress 
                    value={dashboard.badge_progress.progress_percent} 
                    className="h-3 bg-gray-700"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Encore {dashboard.badge_progress.audits_needed} audit(s) pour atteindre le prochain niveau
                  </p>
                </div>
              )}
              
              {!dashboard?.badge_progress?.next_badge && dashboard?.auditor?.badge === 'gold' && (
                <div className="flex-1 text-center">
                  <p className="text-amber-200">🎉 Niveau maximum atteint!</p>
                  <p className="text-gray-400 text-sm mt-1">Vous êtes un Auditeur Or</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pending Missions */}
        <Card className="bg-gray-800 border-gray-700 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-400" />
                Missions en cours
              </span>
              <Badge className="bg-blue-500/20 text-blue-400">
                {dashboard?.missions_count || 0} mission(s)
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboard?.pending_missions?.length > 0 ? (
              <div className="space-y-3">
                {dashboard.pending_missions.map((mission) => (
                  <div 
                    key={mission.id}
                    className="p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer"
                    onClick={() => navigate(`/auditor/mission/${mission.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-white">{mission.cooperative_name}</h4>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                          <span className="flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            {mission.parcels_count} parcelles
                          </span>
                          <span className="flex items-center">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {mission.parcels_audited} auditées
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <Progress 
                            value={(mission.parcels_audited / mission.parcels_count) * 100} 
                            className="w-24 h-2 bg-gray-600"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            {Math.round((mission.parcels_audited / mission.parcels_count) * 100)}%
                          </p>
                        </div>
                        <Badge className={
                          mission.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                          mission.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-green-500/20 text-green-400'
                        }>
                          {mission.status === 'pending' ? 'En attente' :
                           mission.status === 'in_progress' ? 'En cours' : 'Terminé'}
                        </Badge>
                        <ChevronRight className="h-5 w-5 text-gray-500" />
                      </div>
                    </div>
                    {mission.deadline && (
                      <div className="mt-2 flex items-center text-xs text-amber-400">
                        <Clock className="h-3 w-3 mr-1" />
                        Échéance: {new Date(mission.deadline).toLocaleDateString('fr-FR')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Target className="h-12 w-12 mx-auto mb-3 text-gray-600" />
                <p className="text-gray-400">Aucune mission en cours</p>
                <p className="text-sm text-gray-500">Les nouvelles missions apparaîtront ici</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Actions rapides</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button 
                variant="outline" 
                className="h-auto py-4 flex flex-col items-center gap-2 border-gray-600 text-gray-300 hover:bg-emerald-500/10 hover:border-emerald-500/50 hover:text-emerald-400"
                onClick={() => navigate('/auditor/missions')}
              >
                <Target className="h-6 w-6" />
                <span className="text-sm">Mes Missions</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-4 flex flex-col items-center gap-2 border-gray-600 text-gray-300 hover:bg-emerald-500/10 hover:border-emerald-500/50 hover:text-emerald-400"
                onClick={() => navigate('/auditor/history')}
              >
                <FileCheck className="h-6 w-6" />
                <span className="text-sm">Historique</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-4 flex flex-col items-center gap-2 border-gray-600 text-gray-300 hover:bg-emerald-500/10 hover:border-emerald-500/50 hover:text-emerald-400"
              >
                <Camera className="h-6 w-6" />
                <span className="text-sm">Photos</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-4 flex flex-col items-center gap-2 border-gray-600 text-gray-300 hover:bg-emerald-500/10 hover:border-emerald-500/50 hover:text-emerald-400"
              >
                <BarChart3 className="h-6 w-6" />
                <span className="text-sm">Statistiques</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
          <div className="flex items-start gap-3">
            <Leaf className="h-5 w-5 text-emerald-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-emerald-400">Rappel Audit Carbone</h4>
              <p className="text-sm text-gray-400 mt-1">
                Vérifiez toujours : superficie réelle, densité des arbres d'ombrage, pratiques durables 
                (compostage, couverture du sol), et prenez des photos géolocalisées de chaque parcelle.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditorDashboard;

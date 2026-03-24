import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  Users, Building2, MapPin, TreePine, Shield,
  ChevronRight, RefreshCw, Loader2, ArrowDown,
  UserPlus, Smartphone, Globe, CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const FunnelBar = ({ label, count, maxCount, color }) => {
  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
  return (
    <div className="flex items-center gap-3" data-testid={`funnel-bar-${label.toLowerCase().replace(/\s/g, '-')}`}>
      <div className="w-40 text-right">
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <div className="flex-1 h-8 bg-slate-800 rounded-lg overflow-hidden relative">
        <div
          className="h-full rounded-lg transition-all duration-700 ease-out flex items-center px-3"
          style={{ width: `${Math.max(pct, 8)}%`, backgroundColor: color }}
        >
          <span className="text-xs font-bold text-white whitespace-nowrap">{count}</span>
        </div>
      </div>
      <div className="w-12 text-right">
        <span className="text-xs text-slate-500">{pct.toFixed(0)}%</span>
      </div>
    </div>
  );
};

const OnboardingDashboard = () => {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/admin/analytics/onboarding`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setData(await res.json());
      } else {
        toast.error('Erreur de chargement');
      }
    } catch {
      toast.error('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const { summary, funnel, cooperatives } = data;
  const maxFunnel = Math.max(...funnel.map(f => f.count), 1);

  return (
    <div className="space-y-6" data-testid="onboarding-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Tableau de bord Onboarding</h2>
          <p className="text-sm text-slate-400">Vue d'ensemble du deploiement GreenLink</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}
          className="border-slate-600 text-slate-300 hover:bg-slate-700" data-testid="onboarding-refresh-btn">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Actualiser
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Cooperatives', value: summary.cooperatives, icon: Building2, color: 'text-emerald-400 bg-emerald-500/10' },
          { label: 'Agents terrain', value: summary.agents, icon: Shield, color: 'text-blue-400 bg-blue-500/10' },
          { label: 'Producteurs', value: summary.producteurs, icon: TreePine, color: 'text-violet-400 bg-violet-500/10' },
          { label: 'Total utilisateurs', value: summary.total_users, icon: Users, color: 'text-amber-400 bg-amber-500/10' },
        ].map((card, i) => (
          <Card key={i} className="bg-slate-800/50 border-slate-700" data-testid={`onboarding-card-${i}`}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.color}`}>
                <card.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{card.value}</p>
                <p className="text-xs text-slate-400">{card.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Funnel */}
      <Card className="bg-slate-800/50 border-slate-700" data-testid="onboarding-funnel">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white flex items-center gap-2">
            <ArrowDown className="w-4 h-4 text-emerald-400" />
            Entonnoir de conversion
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {funnel.map((step, i) => (
            <React.Fragment key={i}>
              <FunnelBar
                label={step.label}
                count={step.count}
                maxCount={maxFunnel}
                color={step.color}
              />
              {i < funnel.length - 1 && (
                <div className="flex justify-center">
                  <ChevronRight className="w-4 h-4 text-slate-600 rotate-90" />
                </div>
              )}
            </React.Fragment>
          ))}
        </CardContent>
      </Card>

      {/* Inscriptions stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4 text-center">
            <Smartphone className="w-6 h-6 text-blue-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{summary.ussd_via?.ussd || 0}</p>
            <p className="text-xs text-slate-400">Inscriptions USSD</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4 text-center">
            <Globe className="w-6 h-6 text-purple-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{summary.ussd_via?.web || 0}</p>
            <p className="text-xs text-slate-400">Inscriptions Web</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{summary.verified_parcels}/{summary.total_parcels}</p>
            <p className="text-xs text-slate-400">Parcelles verifiees</p>
          </CardContent>
        </Card>
      </div>

      {/* Cooperatives breakdown */}
      <Card className="bg-slate-800/50 border-slate-700" data-testid="onboarding-coop-table">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-400" />
            Cooperatives - Details deploiement ({cooperatives.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-2.5 px-4 text-xs text-slate-400 font-medium">Cooperative</th>
                  <th className="text-left py-2.5 px-4 text-xs text-slate-400 font-medium">Code</th>
                  <th className="text-center py-2.5 px-4 text-xs text-slate-400 font-medium">Agents</th>
                  <th className="text-center py-2.5 px-4 text-xs text-slate-400 font-medium">Membres</th>
                  <th className="text-center py-2.5 px-4 text-xs text-slate-400 font-medium">Parcelles</th>
                  <th className="text-center py-2.5 px-4 text-xs text-slate-400 font-medium">Verifiees</th>
                  <th className="text-left py-2.5 px-4 text-xs text-slate-400 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                {cooperatives.map((coop, i) => {
                  const progress = coop.parcels > 0 
                    ? Math.round((coop.verified_parcels / coop.parcels) * 100)
                    : 0;
                  return (
                    <tr key={coop.id} className="border-b border-slate-700/50 hover:bg-slate-700/20" data-testid={`coop-row-${i}`}>
                      <td className="py-2.5 px-4">
                        <p className="text-sm text-white font-medium">{coop.name}</p>
                        {coop.region && coop.region !== '-' && (
                          <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" /> {coop.region}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        <Badge className="bg-slate-700 text-emerald-300 text-xs">{coop.code}</Badge>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className={`text-sm font-medium ${coop.agents > 0 ? 'text-blue-400' : 'text-slate-500'}`}>{coop.agents}</span>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className={`text-sm font-medium ${coop.members > 0 ? 'text-violet-400' : 'text-slate-500'}`}>{coop.members}</span>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className={`text-sm font-medium ${coop.parcels > 0 ? 'text-amber-400' : 'text-slate-500'}`}>{coop.parcels}</span>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className={`text-sm font-medium ${coop.verified_parcels > 0 ? 'text-cyan-400' : 'text-slate-500'}`}>{coop.verified_parcels}</span>
                      </td>
                      <td className="py-2.5 px-4">
                        {coop.verified_parcels > 0 ? (
                          <Badge className="bg-emerald-500/20 text-emerald-400 text-xs">{progress}% verifie</Badge>
                        ) : coop.parcels > 0 ? (
                          <Badge className="bg-amber-500/20 text-amber-400 text-xs">En cours</Badge>
                        ) : coop.members > 0 ? (
                          <Badge className="bg-blue-500/20 text-blue-400 text-xs">Inscrits</Badge>
                        ) : (
                          <Badge className="bg-slate-600 text-slate-400 text-xs">Nouveau</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingDashboard;

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { offlineCooperativeApi as cooperativeApi } from '../../services/offlineCooperativeApi';
import {
  Users, ChevronLeft, Shield, ChevronDown, ChevronUp,
  CheckCircle, XCircle, Target, TrendingUp, Search, Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Progress } from '../../components/ui/progress';
import { toast } from 'sonner';

const FORM_LABELS = {
  register: 'Inscription',
  ici: 'Fiche ICI',
  ssrte: 'Visite SSRTE',
  parcels: 'Parcelles',
  photos: 'Photos'
};

const FormBadge = ({ done, label }) => (
  <span
    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
      done ? 'bg-emerald-100 text-emerald-700' : 'bg-red-50 text-red-600'
    }`}
    data-testid={`form-badge-${label.toLowerCase().replace(/\s+/g, '-')}`}
  >
    {done ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
    {label}
  </span>
);

const AgentProgressPage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedAgent, setExpandedAgent] = useState(null);

  const fetchProgress = useCallback(async () => {
    try {
      setLoading(true);
      const result = await cooperativeApi.getAgentsProgress();
      setData(result);
    } catch (err) {
      toast.error('Erreur lors du chargement des progressions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProgress(); }, [fetchProgress]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" data-testid="agents-progress-loading">
        <Loader2 className="h-10 w-10 animate-spin text-cyan-600" />
      </div>
    );
  }

  const { agents = [], summary = {} } = data || {};

  const filteredAgents = agents.filter(a => {
    if (!search) return true;
    const s = search.toLowerCase();
    return a.full_name?.toLowerCase().includes(s) || a.zone?.toLowerCase().includes(s);
  });

  return (
    <div className="min-h-screen bg-gray-50" data-testid="agents-progress-page">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-700 to-cyan-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/cooperative/dashboard')} className="text-white hover:bg-white/10">
                <ChevronLeft className="h-4 w-4 mr-1" />Retour
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <Target className="h-6 w-6" />
                  <h1 className="text-xl font-bold">Progression des Agents</h1>
                </div>
                <p className="text-sm text-cyan-100">Suivi des formulaires par agent et fermier</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card data-testid="summary-total-agents">
            <CardContent className="p-4 text-center">
              <Shield className="h-8 w-8 mx-auto mb-2 text-cyan-600" />
              <p className="text-2xl font-bold">{summary.total_agents}</p>
              <p className="text-xs text-gray-500">Agents</p>
            </CardContent>
          </Card>
          <Card data-testid="summary-total-farmers">
            <CardContent className="p-4 text-center">
              <Users className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <p className="text-2xl font-bold">{summary.total_farmers}</p>
              <p className="text-xs text-gray-500">Fermiers Assignes</p>
            </CardContent>
          </Card>
          <Card data-testid="summary-farmers-5-5">
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-600" />
              <p className="text-2xl font-bold text-emerald-600">{summary.farmers_5_5}</p>
              <p className="text-xs text-gray-500">Fermiers a 5/5</p>
            </CardContent>
          </Card>
          <Card data-testid="summary-avg-progress">
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-amber-600" />
              <p className="text-2xl font-bold text-amber-600">{summary.average_progress}%</p>
              <p className="text-xs text-gray-500">Progression Moyenne</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Search + Agent List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Rechercher un agent..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
            data-testid="agent-search-input"
          />
        </div>

        {filteredAgents.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Shield className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>Aucun agent trouve</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAgents.map(agent => (
              <Card key={agent.id} className="overflow-hidden" data-testid={`agent-card-${agent.id}`}>
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedAgent(expandedAgent === agent.id ? null : agent.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-cyan-100 flex items-center justify-center">
                      <Shield className="h-5 w-5 text-cyan-700" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{agent.full_name}</p>
                      <p className="text-sm text-gray-500">{agent.zone || 'Zone non definie'} | {agent.phone_number}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-medium">{agent.assigned_count} fermier(s)</p>
                      <div className="flex items-center gap-2">
                        <Progress value={agent.progress_percent} className="w-24 h-2" />
                        <span className="text-xs font-medium text-gray-600">{agent.progress_percent}%</span>
                      </div>
                    </div>
                    <Badge className={agent.farmers_5_5 === agent.assigned_count && agent.assigned_count > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                      {agent.farmers_5_5}/{agent.assigned_count} complets
                    </Badge>
                    {expandedAgent === agent.id ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                  </div>
                </div>

                {/* Expanded: Farmer Details */}
                {expandedAgent === agent.id && (
                  <div className="border-t bg-gray-50/50 p-4" data-testid={`agent-farmers-${agent.id}`}>
                    {agent.farmers.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">Aucun fermier assigne</p>
                    ) : (
                      <div className="space-y-2">
                        <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 px-3 pb-1 border-b">
                          <span className="col-span-3">Fermier</span>
                          <span className="col-span-2">Village</span>
                          <span className="col-span-5">Formulaires</span>
                          <span className="col-span-2 text-right">Statut</span>
                        </div>
                        {agent.farmers.map(f => (
                          <div key={f.id} className={`grid grid-cols-12 gap-2 items-center px-3 py-2 rounded-lg ${f.completed === 5 ? 'bg-emerald-50' : 'bg-white'}`} data-testid={`farmer-row-${f.id}`}>
                            <div className="col-span-3">
                              <p className="text-sm font-medium text-gray-900 truncate">{f.full_name}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-xs text-gray-500 truncate">{f.village || '-'}</p>
                            </div>
                            <div className="col-span-5 flex flex-wrap gap-1">
                              {Object.entries(f.forms).map(([key, done]) => (
                                <FormBadge key={key} done={done} label={FORM_LABELS[key] || key} />
                              ))}
                            </div>
                            <div className="col-span-2 text-right">
                              <Badge className={f.completed === 5 ? 'bg-emerald-600 text-white' : f.completed >= 3 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}>
                                {f.completed}/5
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentProgressPage;

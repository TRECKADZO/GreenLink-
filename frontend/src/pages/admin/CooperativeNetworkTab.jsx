import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import {
  Users, Building2, GitBranch, Network, Search,
  TrendingUp, MapPin, Calendar, Copy, Check,
  ChevronDown, ChevronUp, Link2, Unlink, Shield,
  ArrowRight, RefreshCw, Sparkles, Globe, Hash
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CooperativeNetworkTab = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all, sponsors, affiliated, orphan
  const [expandedNode, setExpandedNode] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);
  const [generatingCode, setGeneratingCode] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/cooperative-referral/admin/network-full`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(res.data);
    } catch (err) {
      console.error('Erreur chargement réseau:', err);
      toast.error('Erreur lors du chargement du réseau');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredNodes = useMemo(() => {
    if (!data?.nodes) return [];
    let nodes = [...data.nodes];

    if (search) {
      const q = search.toLowerCase();
      nodes = nodes.filter(n =>
        (n.coop_name || '').toLowerCase().includes(q) ||
        (n.referral_code || '').toLowerCase().includes(q) ||
        (n.region || '').toLowerCase().includes(q) ||
        (n.email || '').toLowerCase().includes(q)
      );
    }

    if (filter === 'sponsors') nodes = nodes.filter(n => n.is_sponsor);
    else if (filter === 'affiliated') nodes = nodes.filter(n => n.is_affiliated);
    else if (filter === 'orphan') nodes = nodes.filter(n => !n.is_affiliated && !n.is_sponsor);

    return nodes;
  }, [data, search, filter]);

  const copyCode = async (code) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1500);
  };

  const generateCode = async (coopId) => {
    setGeneratingCode(coopId);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/api/cooperative-referral/admin/generate-code/${coopId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Code ${res.data.referral_code} généré`);
      fetchData();
    } catch (err) {
      toast.error('Erreur lors de la génération');
    } finally {
      setGeneratingCode(null);
    }
  };

  const removeAffiliation = async (coopId, coopName) => {
    if (!window.confirm(`Retirer l'affiliation de ${coopName} ?`)) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/cooperative-referral/admin/remove-affiliation/${coopId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Affiliation supprimée');
      fetchData();
    } catch (err) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const getAffiliatesOf = (sponsorId) => {
    if (!data?.nodes) return [];
    return data.nodes.filter(n => n.sponsor_id === sponsorId);
  };

  const getSponsorOf = (node) => {
    if (!node.sponsor_id || !data?.nodes) return null;
    return data.nodes.find(n => n.id === node.sponsor_id);
  };

  const formatDate = (iso) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!data) return null;
  const { stats } = data;

  return (
    <div className="space-y-6" data-testid="coop-network-tab">

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          label="Total Coopératives"
          value={stats.total_cooperatives}
          icon={Building2}
          color="bg-gradient-to-br from-slate-700 to-slate-800"
          accent="text-slate-300"
        />
        <KPICard
          label="Coopératives Affiliées"
          value={stats.affiliated_cooperatives}
          suffix={`/ ${stats.total_cooperatives}`}
          icon={Link2}
          color="bg-gradient-to-br from-emerald-700 to-emerald-800"
          accent="text-emerald-300"
          sub={`${stats.affiliation_rate}%`}
        />
        <KPICard
          label="Parrains Actifs"
          value={stats.active_sponsors}
          icon={Shield}
          color="bg-gradient-to-br from-amber-700 to-amber-800"
          accent="text-amber-300"
        />
        <KPICard
          label="Membres du Réseau"
          value={stats.total_members_in_network}
          icon={Users}
          color="bg-gradient-to-br from-blue-700 to-blue-800"
          accent="text-blue-300"
        />
      </div>

      {/* Network Visualization + Top Sponsors Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Network Tree Visual */}
        <Card className="lg:col-span-2 bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <Network className="w-5 h-5 text-emerald-400" />
              Arbre du Réseau de Parrainage
            </CardTitle>
            <CardDescription className="text-slate-400">
              Visualisation des liens entre coopératives parrains et affiliées
            </CardDescription>
          </CardHeader>
          <CardContent>
            <NetworkTree
              nodes={data.nodes}
              edges={data.edges}
              onNodeClick={setExpandedNode}
              expandedNode={expandedNode}
            />
          </CardContent>
        </Card>

        {/* Top Sponsors */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <Sparkles className="w-5 h-5 text-amber-400" />
              Top Parrains
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.top_sponsors.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-6">Aucun parrain actif</p>
            ) : (
              data.top_sponsors.map((s, i) => (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50 border border-slate-700/50">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-amber-500/20 text-amber-400' : i === 1 ? 'bg-slate-400/20 text-slate-300' : 'bg-orange-500/20 text-orange-400'}`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{s.coop_name}</p>
                    <p className="text-slate-500 text-xs">{s.region || 'N/R'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-emerald-400 font-bold text-sm">{s.affiliates_count}</p>
                    <p className="text-slate-500 text-[10px] uppercase tracking-wider">affiliés</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Region Distribution + Growth Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Regions */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <Globe className="w-5 h-5 text-cyan-400" />
              Répartition Régionale
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-2">
              {data.region_distribution.map((r) => {
                const pct = Math.round((r.count / stats.total_cooperatives) * 100);
                return (
                  <div key={r.region} className="flex items-center gap-3">
                    <span className="text-slate-400 text-xs w-32 truncate">{r.region}</span>
                    <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-white text-xs font-mono w-8 text-right">{r.count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Growth Timeline */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              Croissance du Réseau
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.growth_timeline.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">Pas encore de données</p>
            ) : (
              <div className="space-y-3">
                {data.growth_timeline.map((g) => {
                  const maxCount = Math.max(...data.growth_timeline.map(t => t.count));
                  const pct = maxCount > 0 ? Math.round((g.count / maxCount) * 100) : 0;
                  const [year, month] = g.month.split('-');
                  const monthNames = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
                  const label = `${monthNames[parseInt(month)-1]} ${year}`;
                  return (
                    <div key={g.month} className="flex items-center gap-3">
                      <span className="text-slate-400 text-xs w-20">{label}</span>
                      <div className="flex-1 h-6 bg-slate-700 rounded overflow-hidden relative">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 rounded transition-all flex items-center justify-end pr-2"
                          style={{ width: `${Math.max(pct, 10)}%` }}
                        >
                          <span className="text-[10px] font-bold text-white">{g.count}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Affiliations */}
      {data.recent_affiliations.length > 0 && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <Calendar className="w-5 h-5 text-violet-400" />
              Affiliations Récentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {data.recent_affiliations.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/60 border border-slate-700/50 rounded-full"
                >
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-white text-xs font-medium">{r.coop_name}</span>
                  {r.region && <span className="text-slate-500 text-[10px]">{r.region}</span>}
                  <span className="text-slate-600 text-[10px]">{formatDate(r.affiliated_at)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Full Cooperatives List */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <CardTitle className="text-white flex items-center gap-2 text-base">
                <Building2 className="w-5 h-5 text-slate-400" />
                Toutes les Coopératives ({filteredNodes.length})
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-500" />
                <Input
                  placeholder="Rechercher..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9 bg-slate-900 border-slate-700 text-white text-sm w-52"
                  data-testid="coop-network-search"
                />
              </div>
              <div className="flex gap-1">
                {[
                  { key: 'all', label: 'Toutes' },
                  { key: 'sponsors', label: 'Parrains' },
                  { key: 'affiliated', label: 'Affiliées' },
                  { key: 'orphan', label: 'Isolées' },
                ].map(f => (
                  <Button
                    key={f.key}
                    variant="ghost"
                    size="sm"
                    onClick={() => setFilter(f.key)}
                    className={`text-xs h-8 ${filter === f.key ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30' : 'text-slate-400 hover:text-white'}`}
                    data-testid={`filter-${f.key}`}
                  >
                    {f.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredNodes.map((node) => {
              const affiliates = getAffiliatesOf(node.id);
              const sponsor = getSponsorOf(node);
              const isExpanded = expandedNode === node.id;

              return (
                <div key={node.id} className="border border-slate-700/50 rounded-lg overflow-hidden" data-testid={`coop-row-${node.id}`}>
                  <div
                    className="flex items-center gap-3 p-3 bg-slate-900/40 hover:bg-slate-900/60 cursor-pointer transition-colors"
                    onClick={() => setExpandedNode(isExpanded ? null : node.id)}
                  >
                    {/* Status indicator */}
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${node.is_sponsor ? 'bg-amber-400' : node.is_affiliated ? 'bg-emerald-400' : 'bg-slate-600'}`} />

                    {/* Name + Region */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-medium truncate">{node.coop_name}</span>
                        {node.is_sponsor && (
                          <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px] px-1.5 py-0">
                            Parrain ({node.affiliates_count})
                          </Badge>
                        )}
                        {node.is_affiliated && (
                          <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] px-1.5 py-0">
                            Affiliée
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        {node.region && <span className="text-slate-500 text-[11px] flex items-center gap-1"><MapPin className="w-3 h-3" />{node.region}</span>}
                        <span className="text-slate-600 text-[11px]">{node.members_count} membres</span>
                      </div>
                    </div>

                    {/* Referral Code */}
                    <div className="flex items-center gap-2">
                      {node.referral_code ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); copyCode(node.referral_code); }}
                          className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 border border-slate-700 rounded text-xs font-mono text-emerald-400 hover:bg-slate-700 transition-colors"
                          data-testid={`copy-code-${node.id}`}
                        >
                          {copiedCode === node.referral_code ? <Check className="w-3 h-3" /> : <Hash className="w-3 h-3" />}
                          {node.referral_code}
                        </button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 border-slate-600 text-slate-400"
                          onClick={(e) => { e.stopPropagation(); generateCode(node.id); }}
                          disabled={generatingCode === node.id}
                          data-testid={`gen-code-${node.id}`}
                        >
                          {generatingCode === node.id ? <RefreshCw className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
                          Générer
                        </Button>
                      )}
                    </div>

                    {/* Expand arrow */}
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-4 py-3 bg-slate-900/20 border-t border-slate-700/30 space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="text-slate-500 block">Email</span>
                          <span className="text-white">{node.email || '-'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Téléphone</span>
                          <span className="text-white">{node.phone || '-'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Code Coopérative</span>
                          <span className="text-white font-mono">{node.coop_code || '-'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Créée le</span>
                          <span className="text-white">{formatDate(node.created_at)}</span>
                        </div>
                      </div>

                      {/* Sponsor info */}
                      {sponsor && (
                        <div className="p-2.5 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                          <span className="text-emerald-500 text-[10px] uppercase tracking-wider font-bold block mb-1">Parrainée par</span>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Shield className="w-4 h-4 text-emerald-400" />
                              <span className="text-white text-sm">{sponsor.coop_name}</span>
                              <span className="text-slate-500 text-xs">({node.sponsor_referral_code})</span>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs h-7"
                              onClick={() => removeAffiliation(node.id, node.coop_name)}
                              data-testid={`remove-aff-${node.id}`}
                            >
                              <Unlink className="w-3 h-3 mr-1" />
                              Retirer
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Affiliates */}
                      {affiliates.length > 0 && (
                        <div className="p-2.5 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                          <span className="text-amber-500 text-[10px] uppercase tracking-wider font-bold block mb-1.5">
                            Coopératives Parrainées ({affiliates.length})
                          </span>
                          <div className="space-y-1">
                            {affiliates.map(a => (
                              <div key={a.id} className="flex items-center gap-2 text-xs">
                                <ArrowRight className="w-3 h-3 text-amber-500/50" />
                                <span className="text-white">{a.coop_name}</span>
                                <span className="text-slate-600">{a.region || ''}</span>
                                <span className="text-slate-600">{formatDate(a.affiliated_at)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};


// === Sub-components ===

const KPICard = ({ label, value, suffix, icon: Icon, color, accent, sub }) => (
  <div className={`${color} rounded-xl p-4 border border-white/5`}>
    <div className="flex items-center justify-between mb-2">
      <Icon className={`w-5 h-5 ${accent}`} />
      {sub && <span className={`text-xs font-bold ${accent}`}>{sub}</span>}
    </div>
    <p className="text-2xl font-bold text-white">
      {value}
      {suffix && <span className="text-sm font-normal text-white/40 ml-1">{suffix}</span>}
    </p>
    <p className="text-[11px] text-white/50 mt-1 uppercase tracking-wider">{label}</p>
  </div>
);


const NetworkTree = ({ nodes, edges, onNodeClick, expandedNode }) => {
  // Build tree: roots = sponsors without a sponsor + isolated nodes
  const sponsorNodes = nodes.filter(n => n.is_sponsor && !n.is_affiliated);
  const affiliatedOnly = nodes.filter(n => n.is_affiliated && !n.is_sponsor);
  const bothSponsorAndAffiliated = nodes.filter(n => n.is_sponsor && n.is_affiliated);
  const isolated = nodes.filter(n => !n.is_sponsor && !n.is_affiliated);

  // Organize: roots -> their affiliates
  const getChildren = (parentId) => nodes.filter(n => n.sponsor_id === parentId);

  if (sponsorNodes.length === 0 && bothSponsorAndAffiliated.length === 0) {
    return (
      <div className="text-center py-12">
        <Network className="w-10 h-10 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-500 text-sm">Aucun lien de parrainage dans le réseau</p>
        <p className="text-slate-600 text-xs mt-1">Les coopératives doivent partager leurs codes pour créer des liens</p>
      </div>
    );
  }

  const renderNode = (node, depth = 0) => {
    const children = getChildren(node.id);
    const isActive = expandedNode === node.id;

    return (
      <div key={node.id} className={`${depth > 0 ? 'ml-6 border-l-2 border-slate-700/50 pl-4' : ''}`}>
        <div
          className={`flex items-center gap-2.5 py-2 px-3 rounded-lg cursor-pointer transition-all
            ${isActive ? 'bg-emerald-500/10 border border-emerald-500/30' : 'hover:bg-slate-700/30'}`}
          onClick={() => onNodeClick(isActive ? null : node.id)}
        >
          {/* Node icon */}
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
            ${node.is_sponsor ? 'bg-amber-500/20 text-amber-400 ring-2 ring-amber-500/30' : 'bg-emerald-500/20 text-emerald-400'}`}>
            {node.is_sponsor ? <Shield className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
          </div>

          {/* Name */}
          <div className="min-w-0 flex-1">
            <p className="text-white text-sm font-medium truncate">{node.coop_name}</p>
            <div className="flex items-center gap-2">
              {node.region && <span className="text-slate-500 text-[10px]">{node.region}</span>}
              {node.referral_code && <span className="text-emerald-500/60 text-[10px] font-mono">{node.referral_code}</span>}
            </div>
          </div>

          {/* Affiliates count */}
          {children.length > 0 && (
            <Badge className="bg-slate-700 text-slate-300 border-slate-600 text-[10px]">
              {children.length} affilié{children.length > 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        {/* Children */}
        {children.length > 0 && (
          <div className="mt-1">
            {children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-1 max-h-[400px] overflow-y-auto pr-2">
      {/* Root sponsors */}
      {sponsorNodes.map(root => renderNode(root, 0))}
      {bothSponsorAndAffiliated.map(root => renderNode(root, 0))}

      {/* Show count of isolated cooperatives */}
      {isolated.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-700/30">
          <p className="text-slate-500 text-xs flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-slate-600" />
            {isolated.length} coopérative{isolated.length > 1 ? 's' : ''} sans lien de parrainage
          </p>
        </div>
      )}
    </div>
  );
};

export default CooperativeNetworkTab;

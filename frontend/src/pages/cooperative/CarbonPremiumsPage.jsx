import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Wallet, Users, TrendingUp, Download, Search,
  ChevronLeft, CheckCircle, Clock, AlertCircle,
  Banknote, MapPin, Leaf, FileText, History,
  XCircle, Phone, ArrowRight, RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const statusConfig = {
  pending: { label: 'En attente', color: 'bg-amber-500/20 text-amber-400 border-amber-500/50', icon: Clock },
  approved: { label: 'Approuvee', color: 'bg-blue-500/20 text-blue-400 border-blue-500/50', icon: CheckCircle },
  paid: { label: 'Payee', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50', icon: Banknote },
  rejected: { label: 'Rejetee', color: 'bg-red-500/20 text-red-400 border-red-500/50', icon: XCircle },
};

const formatXOF = (amount) => {
  if (!amount && amount !== 0) return '0 XOF';
  return new Intl.NumberFormat('fr-FR').format(amount) + ' XOF';
};

const CarbonPremiumsPage = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [adminData, setAdminData] = useState(null);
  const [membersData, setMembersData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('suivi');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const headers = { 'Authorization': `Bearer ${token}` };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [adminRes, membersRes] = await Promise.all([
        fetch(`${API_URL}/api/cooperative/carbon-premiums/admin-requests`, { headers }),
        fetch(`${API_URL}/api/cooperative/carbon-premiums/members`, { headers })
      ]);
      if (adminRes.ok) setAdminData(await adminRes.json());
      if (membersRes.ok) setMembersData(await membersRes.json());
    } catch (error) {
      /* error logged */
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData]);

  const stats = adminData?.stats || {};
  const requests = adminData?.requests || [];
  const members = membersData?.members || [];
  const summary = membersData?.summary || {};

  const filteredRequests = requests.filter(r => {
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchesSearch = !search || r.farmer_name?.toLowerCase().includes(search.toLowerCase()) || r.farmer_phone?.includes(search);
    return matchesStatus && matchesSearch;
  });

  const filteredMembers = members.filter(m =>
    !search || m.nom_complet?.toLowerCase().includes(search.toLowerCase()) || m.village?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900" data-testid="carbon-premiums-page">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/cooperative/dashboard')} className="text-white hover:bg-white/10" data-testid="back-btn">
                <ChevronLeft className="h-4 w-4 mr-1" />Retour
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <Wallet className="h-6 w-6" />
                  <h1 className="text-xl font-bold">Primes Carbone</h1>
                </div>
                <p className="text-sm text-emerald-100">Suivi des paiements geres par le Super Admin</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="border-white text-white hover:bg-white/10" onClick={fetchData} data-testid="refresh-btn">
              <RefreshCw className="h-4 w-4 mr-2" />Actualiser
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Info Banner - New Workflow */}
        <Card className="bg-emerald-900/30 border-emerald-700/50 mb-6">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-emerald-300 font-medium">Nouveau flux de distribution</p>
                <p className="text-sm text-emerald-200/70">
                  Les primes carbone sont maintenant gerees par le Super Admin. Le processus est :
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-emerald-200/60">
                  <Badge className="bg-emerald-800/50 text-emerald-300 border-emerald-600/30">1. Verification terrain</Badge>
                  <ArrowRight className="h-3 w-3" />
                  <Badge className="bg-emerald-800/50 text-emerald-300 border-emerald-600/30">2. Score &ge; 6.0 = Admissible</Badge>
                  <ArrowRight className="h-3 w-3" />
                  <Badge className="bg-emerald-800/50 text-emerald-300 border-emerald-600/30">3. Demande USSD (*144*99#)</Badge>
                  <ArrowRight className="h-3 w-3" />
                  <Badge className="bg-emerald-800/50 text-emerald-300 border-emerald-600/30">4. Validation Super Admin</Badge>
                  <ArrowRight className="h-3 w-3" />
                  <Badge className="bg-emerald-800/50 text-emerald-300 border-emerald-600/30">5. Paiement Orange Money</Badge>
                </div>
                <p className="text-xs text-emerald-200/50 mt-2">Votre cooperative recoit automatiquement 5% de commission sur chaque paiement valide.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6" data-testid="stats-grid">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 rounded-lg"><Clock className="h-5 w-5 text-amber-400" /></div>
                <div>
                  <p className="text-2xl font-bold text-amber-400" data-testid="stat-pending">{stats.en_attente || 0}</p>
                  <p className="text-xs text-gray-400">En attente</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-lg"><Banknote className="h-5 w-5 text-emerald-400" /></div>
                <div>
                  <p className="text-2xl font-bold text-emerald-400" data-testid="stat-paid">{stats.payees || 0}</p>
                  <p className="text-xs text-gray-400">Payees</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg"><Wallet className="h-5 w-5 text-blue-400" /></div>
                <div>
                  <p className="text-2xl font-bold text-blue-400" data-testid="stat-farmer-total">{formatXOF(stats.total_paye_planteurs)}</p>
                  <p className="text-xs text-gray-400">Paye aux planteurs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg"><TrendingUp className="h-5 w-5 text-purple-400" /></div>
                <div>
                  <p className="text-2xl font-bold text-purple-400" data-testid="stat-coop-commission">{formatXOF(stats.total_commissions_coop)}</p>
                  <p className="text-xs text-gray-400">Commission coop (5%)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-gray-800 border-gray-700 mb-4">
            <TabsTrigger value="suivi" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <History className="h-4 w-4 mr-2" />Suivi des demandes ({requests.length})
            </TabsTrigger>
            <TabsTrigger value="eligibles" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <Users className="h-4 w-4 mr-2" />Membres eligibles ({summary.eligible_members || 0})
            </TabsTrigger>
          </TabsList>

          {/* Tab: Suivi des demandes */}
          <TabsContent value="suivi">
            {/* Search + Filter */}
            <div className="flex gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Rechercher un planteur..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-gray-800 border-gray-700 text-white" data-testid="search-input" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40 bg-gray-800 border-gray-700 text-gray-200" data-testid="status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="approved">Approuvees</SelectItem>
                  <SelectItem value="paid">Payees</SelectItem>
                  <SelectItem value="rejected">Rejetees</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filteredRequests.length > 0 ? (
              <div className="space-y-3">
                {filteredRequests.map((req) => {
                  const cfg = statusConfig[req.status] || statusConfig.pending;
                  const StatusIcon = cfg.icon;
                  return (
                    <Card key={req.id} className="bg-gray-800 border-gray-700" data-testid={`request-card-${req.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">{req.farmer_name}</span>
                            <Badge className={cfg.color}><StatusIcon className="h-3 w-3 mr-1" />{cfg.label}</Badge>
                          </div>
                          <span className="text-xs text-gray-500">{req.requested_at ? new Date(req.requested_at).toLocaleDateString('fr-FR') : ''}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
                          <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{req.farmer_phone}</span>
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{req.parcels_count} parcelle(s)</span>
                          <span className="flex items-center gap-1"><Leaf className="h-3 w-3" />Score: {req.average_carbon_score}/10</span>
                          <span className="text-xs uppercase">{req.requested_via}</span>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                          <div className="bg-gray-700/30 rounded-lg p-2 text-center">
                            <p className="text-emerald-400 font-bold">{formatXOF(req.farmer_amount)}</p>
                            <p className="text-[10px] text-gray-500">Montant planteur</p>
                          </div>
                        </div>
                        {req.status === 'paid' && req.farmer_transaction_id && (
                          <div className="mt-3 pt-2 border-t border-gray-700 text-xs text-gray-400 flex items-center gap-2">
                            <CheckCircle className="h-3 w-3 text-emerald-400" />
                            Ref. planteur: <span className="font-mono text-gray-300">{req.farmer_transaction_id}</span>
                            {req.coop_transaction_id && (<><span className="mx-1">|</span>Ref. coop: <span className="font-mono text-gray-300">{req.coop_transaction_id}</span></>)}
                            {req.paid_at && <span className="ml-auto">{new Date(req.paid_at).toLocaleDateString('fr-FR')}</span>}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="py-12 text-center">
                  <Wallet className="h-10 w-10 mx-auto mb-3 text-gray-600" />
                  <p className="text-gray-400">Aucune demande de prime{statusFilter !== 'all' ? ` avec statut "${statusFilter}"` : ''}</p>
                  <p className="text-sm text-gray-500 mt-1">Les planteurs admissibles peuvent faire leur demande via USSD *144*99#</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab: Membres eligibles */}
          <TabsContent value="eligibles">
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Rechercher un membre..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-gray-800 border-gray-700 text-white" />
              </div>
            </div>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-white flex items-center gap-2 text-base">
                  <Users className="h-5 w-5 text-emerald-400" />
                  Eligibilite des membres ({summary.eligible_members || 0}/{summary.total_members || 0})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700 text-gray-400">
                        <th className="text-left py-3 px-4">Planteur</th>
                        <th className="text-center py-3 px-4">Village</th>
                        <th className="text-center py-3 px-4">Parcelles</th>
                        <th className="text-center py-3 px-4">Surface</th>
                        <th className="text-center py-3 px-4">Score</th>
                        <th className="text-right py-3 px-4">Prime estimee</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMembers.map((member) => (
                        <tr key={member.member_id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                          <td className="py-3 px-4">
                            <p className="text-white font-medium">{member.nom_complet || member.full_name}</p>
                            <p className="text-xs text-gray-400">{member.telephone || member.phone_number}</p>
                          </td>
                          <td className="py-3 px-4 text-center text-gray-300">{member.village || '-'}</td>
                          <td className="py-3 px-4 text-center">
                            <Badge variant="outline" className="border-blue-500/50 text-blue-400">{member.audited_parcels} auditee(s)</Badge>
                          </td>
                          <td className="py-3 px-4 text-center text-white">{member.superficie_totale} ha</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`font-medium ${member.average_score >= 8 ? 'text-green-400' : member.average_score >= 6 ? 'text-yellow-400' : 'text-red-400'}`}>
                              {member.average_score}/10
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {member.premium_xof > 0 ? (
                              <span className="text-emerald-400 font-bold">{formatXOF(member.premium_xof)}</span>
                            ) : (
                              <span className="text-gray-500">Non eligible</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredMembers.length === 0 && (
                    <div className="text-center py-8 text-gray-400">Aucun membre trouve</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CarbonPremiumsPage;

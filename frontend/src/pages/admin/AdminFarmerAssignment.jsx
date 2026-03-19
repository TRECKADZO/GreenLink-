import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import Navbar from '../../components/Navbar';
import { Users, UserCheck, Search, ArrowRight, Check, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminFarmerAssignment = () => {
  const [agents, setAgents] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [selectedFarmers, setSelectedFarmers] = useState([]);
  const [farmerSearch, setFarmerSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [agRes, fmRes] = await Promise.all([
        axios.get(`${API_URL}/api/admin/agents`, { headers }),
        axios.get(`${API_URL}/api/admin/all-farmers`, { headers }),
      ]);
      setAgents(agRes.data.agents || []);
      setFarmers(fmRes.data.farmers || []);
    } catch (err) {
      toast.error('Erreur de chargement');
    } finally { setLoading(false); }
  };

  const toggleFarmer = (fid) => {
    setSelectedFarmers(prev =>
      prev.includes(fid) ? prev.filter(id => id !== fid) : [...prev, fid]
    );
  };

  const handleAssign = async () => {
    if (!selectedAgent || selectedFarmers.length === 0) {
      toast.error('Selectionnez un agent et au moins un agriculteur');
      return;
    }
    setAssigning(true);
    try {
      const { data } = await axios.post(`${API_URL}/api/admin/assign-farmers-to-agent`, {
        agent_id: selectedAgent.id,
        farmer_ids: selectedFarmers,
      }, { headers });
      toast.success(data.message);
      setSelectedFarmers([]);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur');
    } finally { setAssigning(false); }
  };

  const filteredFarmers = farmers.filter(f => {
    if (!farmerSearch) return true;
    const s = farmerSearch.toLowerCase();
    return f.full_name?.toLowerCase().includes(s) || f.phone_number?.includes(s) || f.village?.toLowerCase().includes(s);
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Navbar />
        <div className="max-w-7xl mx-auto px-6 py-12 pt-24 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto" />
          <p className="text-slate-400 mt-4">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950" data-testid="admin-farmer-assignment">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pt-24">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <UserCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Attribution Agriculteurs - Agents</h1>
            <p className="text-slate-400 text-sm">Assigner n'importe quel agriculteur a un agent terrain</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Agents List */}
          <div className="lg:col-span-4">
            <Card className="bg-slate-900 border-slate-800 p-4">
              <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" /> Agents Terrain ({agents.length})
              </h2>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {agents.map(agent => (
                  <div
                    key={agent.id}
                    onClick={() => setSelectedAgent(agent)}
                    data-testid={`agent-card-${agent.id}`}
                    className={`p-3 rounded-xl cursor-pointer border transition-all ${
                      selectedAgent?.id === agent.id
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <p className="text-white font-medium text-sm">{agent.full_name}</p>
                    <p className="text-slate-500 text-xs">{agent.phone_number}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className="bg-slate-800 text-slate-300 text-xs">{agent.cooperative_name}</Badge>
                      <Badge className="bg-emerald-500/10 text-emerald-400 text-xs">
                        {agent.assigned_farmers_count} fermier(s)
                      </Badge>
                    </div>
                  </div>
                ))}
                {agents.length === 0 && (
                  <p className="text-slate-500 text-center py-8">Aucun agent</p>
                )}
              </div>
            </Card>
          </div>

          {/* Arrow */}
          <div className="hidden lg:flex lg:col-span-1 items-center justify-center">
            <ArrowRight className="w-8 h-8 text-slate-600" />
          </div>

          {/* Farmers List */}
          <div className="lg:col-span-7">
            <Card className="bg-slate-900 border-slate-800 p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" /> Agriculteurs ({farmers.length})
                </h2>
                {selectedFarmers.length > 0 && (
                  <Badge className="bg-blue-500/10 text-blue-400">{selectedFarmers.length} selectionne(s)</Badge>
                )}
              </div>

              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <Input
                  placeholder="Rechercher par nom, telephone, village..."
                  value={farmerSearch}
                  onChange={(e) => setFarmerSearch(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white pl-10"
                  data-testid="farmer-search-input"
                />
              </div>

              {/* Farmers */}
              <div className="space-y-1 max-h-[50vh] overflow-y-auto">
                {filteredFarmers.map(f => {
                  const isSelected = selectedFarmers.includes(f.id);
                  return (
                    <div
                      key={f.id}
                      onClick={() => toggleFarmer(f.id)}
                      data-testid={`farmer-row-${f.id}`}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                        isSelected ? 'bg-emerald-500/10 border border-emerald-500/30' : 'hover:bg-slate-800'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'
                      }`}>
                        {isSelected && <Check className="w-4 h-4 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{f.full_name}</p>
                        <p className="text-slate-500 text-xs">{f.phone_number} - {f.village || 'N/A'}</p>
                      </div>
                      <Badge className={`text-xs shrink-0 ${
                        f.cooperative_name === 'Non-membre'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {f.cooperative_name}
                      </Badge>
                    </div>
                  );
                })}
                {filteredFarmers.length === 0 && (
                  <p className="text-slate-500 text-center py-8">Aucun agriculteur trouve</p>
                )}
              </div>

              {/* Assign Button */}
              {selectedAgent && selectedFarmers.length > 0 && (
                <div className="mt-4 p-4 bg-slate-800 rounded-xl border border-slate-700">
                  <p className="text-slate-300 text-sm mb-3">
                    Assigner <span className="font-bold text-emerald-400">{selectedFarmers.length} agriculteur(s)</span> a{' '}
                    <span className="font-bold text-blue-400">{selectedAgent.full_name}</span>
                  </p>
                  <Button
                    onClick={handleAssign}
                    disabled={assigning}
                    data-testid="assign-btn"
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
                  >
                    {assigning ? 'Attribution en cours...' : `Confirmer l'attribution`}
                  </Button>
                </div>
              )}

              {!selectedAgent && (
                <div className="mt-4 p-4 bg-blue-500/5 rounded-xl border border-blue-500/20 text-center">
                  <p className="text-blue-400 text-sm">Selectionnez d'abord un agent terrain dans la liste de gauche</p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminFarmerAssignment;

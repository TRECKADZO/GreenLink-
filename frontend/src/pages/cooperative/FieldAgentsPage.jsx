import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cooperativeApi } from '../../services/cooperativeApi';
import { 
  Users, Plus, Search, Phone, MapPin, ChevronLeft, 
  Shield, CheckCircle, Clock, UserCheck, Trash2, Eye
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';

const FieldAgentsPage = () => {
  const navigate = useNavigate();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [newAgent, setNewAgent] = useState({
    full_name: '',
    phone_number: '',
    email: '',
    zone: '',
    village_coverage: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const data = await cooperativeApi.getAgents();
      setAgents(data);
    } catch (error) {
      console.error('Error fetching agents:', error);
      toast.error('Erreur lors du chargement des agents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const handleAddAgent = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const agentData = {
        ...newAgent,
        village_coverage: newAgent.village_coverage 
          ? newAgent.village_coverage.split(',').map(v => v.trim()).filter(v => v)
          : []
      };
      await cooperativeApi.createAgent(agentData);
      toast.success('Agent ajouté avec succès! Il peut maintenant activer son compte via l\'application mobile.');
      setShowAddModal(false);
      setNewAgent({
        full_name: '',
        phone_number: '',
        email: '',
        zone: '',
        village_coverage: ''
      });
      fetchAgents();
    } catch (error) {
      console.error('Error adding agent:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'ajout de l\'agent');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAgents = agents.filter(agent => 
    agent.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    agent.phone_number?.includes(search) ||
    agent.zone?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (agent) => {
    if (agent.account_activated) {
      return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Activé</Badge>;
    }
    return <Badge className="bg-amber-100 text-amber-800"><Clock className="h-3 w-3 mr-1" />En attente</Badge>;
  };

  return (
    <div className="min-h-screen bg-gray-50" data-testid="field-agents-page">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-600 to-cyan-500 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/cooperative/dashboard')}
                className="text-white hover:bg-white/10"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Retour
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <Shield className="h-6 w-6" />
                  <h1 className="text-xl font-bold">Agents Terrain</h1>
                </div>
                <p className="text-sm text-cyan-100">{agents.length} agent(s) enregistré(s)</p>
              </div>
            </div>
            <Button 
              onClick={() => setShowAddModal(true)} 
              className="bg-white text-cyan-600 hover:bg-cyan-50"
              data-testid="add-agent-btn"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouvel Agent
            </Button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Rechercher par nom, téléphone ou zone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            data-testid="search-agents-input"
          />
        </div>
      </div>

      {/* Agents List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
          </div>
        ) : filteredAgents.length > 0 ? (
          <div className="grid gap-4">
            {filteredAgents.map((agent) => (
              <Card key={agent.id} className="hover:shadow-md transition-shadow" data-testid={`agent-card-${agent.id}`}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-cyan-100 flex items-center justify-center">
                        <Shield className="h-6 w-6 text-cyan-700" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{agent.full_name}</h3>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <span className="flex items-center">
                            <Phone className="h-3 w-3 mr-1" />
                            {agent.phone_number}
                          </span>
                          <span className="flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            {agent.zone}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden md:block">
                        <p className="text-sm font-medium">{agent.members_onboarded || 0} membres</p>
                        <p className="text-xs text-gray-500">{agent.ssrte_visits_count || 0} visites SSRTE</p>
                      </div>
                      {getStatusBadge(agent)}
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setSelectedAgent(agent);
                          setShowDetailsModal(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">Aucun agent trouvé</h3>
              <p className="text-gray-500 mb-4">
                {search ? 'Essayez de modifier votre recherche' : 'Commencez par ajouter des agents terrain'}
              </p>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un agent
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Agent Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent data-testid="add-agent-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-cyan-600" />
              Ajouter un Agent Terrain
            </DialogTitle>
            <DialogDescription>
              L'agent pourra activer son compte via l'application mobile avec son numéro de téléphone.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddAgent}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="full_name">Nom complet *</Label>
                <Input
                  id="full_name"
                  value={newAgent.full_name}
                  onChange={(e) => setNewAgent({...newAgent, full_name: e.target.value})}
                  placeholder="Ex: Koné Ibrahim"
                  required
                  data-testid="agent-name-input"
                />
              </div>
              <div>
                <Label htmlFor="phone_number">Téléphone *</Label>
                <Input
                  id="phone_number"
                  value={newAgent.phone_number}
                  onChange={(e) => setNewAgent({...newAgent, phone_number: e.target.value})}
                  placeholder="+225 07 XX XX XX XX"
                  required
                  data-testid="agent-phone-input"
                />
              </div>
              <div>
                <Label htmlFor="email">Email (optionnel)</Label>
                <Input
                  id="email"
                  type="email"
                  value={newAgent.email}
                  onChange={(e) => setNewAgent({...newAgent, email: e.target.value})}
                  placeholder="agent@email.com"
                  data-testid="agent-email-input"
                />
              </div>
              <div>
                <Label htmlFor="zone">Zone d'intervention *</Label>
                <Input
                  id="zone"
                  value={newAgent.zone}
                  onChange={(e) => setNewAgent({...newAgent, zone: e.target.value})}
                  placeholder="Ex: Gagnoa Nord"
                  required
                  data-testid="agent-zone-input"
                />
              </div>
              <div>
                <Label htmlFor="village_coverage">Villages couverts (séparés par virgule)</Label>
                <Input
                  id="village_coverage"
                  value={newAgent.village_coverage}
                  onChange={(e) => setNewAgent({...newAgent, village_coverage: e.target.value})}
                  placeholder="Ex: Kossou, Bouaflé, Sinfra"
                  data-testid="agent-villages-input"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                Annuler
              </Button>
              <Button 
                type="submit" 
                disabled={submitting} 
                className="bg-cyan-600 hover:bg-cyan-700"
                data-testid="submit-agent-btn"
              >
                {submitting ? 'Ajout...' : 'Ajouter'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Agent Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-lg" data-testid="agent-details-modal">
          <DialogHeader>
            <DialogTitle>Détails de l'Agent</DialogTitle>
          </DialogHeader>
          {selectedAgent && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-cyan-100 flex items-center justify-center">
                  <Shield className="h-8 w-8 text-cyan-700" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{selectedAgent.full_name}</h3>
                  <p className="text-gray-500">{selectedAgent.phone_number}</p>
                  {getStatusBadge(selectedAgent)}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Zone</p>
                  <p className="font-medium">{selectedAgent.zone}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{selectedAgent.email || 'Non renseigné'}</p>
                </div>
                <div className="p-3 bg-cyan-50 rounded-lg">
                  <p className="text-sm text-cyan-600">Membres enregistrés</p>
                  <p className="font-medium text-cyan-800">{selectedAgent.members_onboarded || 0}</p>
                </div>
                <div className="p-3 bg-cyan-50 rounded-lg">
                  <p className="text-sm text-cyan-600">Visites SSRTE</p>
                  <p className="font-medium text-cyan-800">{selectedAgent.ssrte_visits_count || 0}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg col-span-2">
                  <p className="text-sm text-gray-500">Villages couverts</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedAgent.village_coverage?.length > 0 ? (
                      selectedAgent.village_coverage.map((village, i) => (
                        <Badge key={i} variant="secondary">{village}</Badge>
                      ))
                    ) : (
                      <span className="text-gray-400">Aucun village spécifié</span>
                    )}
                  </div>
                </div>
              </div>

              {!selectedAgent.account_activated && (
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                  <p className="text-sm text-amber-800">
                    <strong>En attente d'activation:</strong> L'agent doit télécharger l'application GreenLink 
                    et utiliser son numéro de téléphone pour activer son compte.
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FieldAgentsPage;

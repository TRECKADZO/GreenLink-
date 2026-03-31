import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Target, Plus, Search, ChevronLeft, CheckCircle, Clock, 
  Users, MapPin, Calendar, Eye, Shield, Building2, Filter
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Checkbox } from '../../components/ui/checkbox';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AuditMissionsPage = () => {
  const navigate = useNavigate();
  const [missions, setMissions] = useState([]);
  const [auditors, setAuditors] = useState([]);
  const [cooperatives, setCooperatives] = useState([]);
  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedMission, setSelectedMission] = useState(null);
  const [step, setStep] = useState(1);
  const [selectedParcels, setSelectedParcels] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  
  const [newMission, setNewMission] = useState({
    auditor_id: '',
    cooperative_id: '',
    deadline: '',
    notes: ''
  });

  const fetchMissions = async () => {
    try {
      const response = await fetch(`${API_URL}/api/carbon-auditor/admin/missions`);
      const data = await response.json();
      setMissions(data.missions || []);
    } catch (error) {
      console.error('Error fetching missions:', error);
    }
  };

  const fetchAuditors = async () => {
    try {
      const response = await fetch(`${API_URL}/api/carbon-auditor/admin/auditors`);
      const data = await response.json();
      setAuditors(data.auditors || []);
    } catch (error) {
      console.error('Error fetching auditors:', error);
    }
  };

  const fetchCooperatives = async () => {
    try {
      const response = await fetch(`${API_URL}/api/cooperative/list`);
      const data = await response.json();
      setCooperatives(data.cooperatives || []);
    } catch (error) {
      console.error('Error fetching cooperatives:', error);
    }
  };

  const fetchParcels = async (coopId) => {
    if (!coopId) return;
    try {
      const response = await fetch(`${API_URL}/api/cooperative/${coopId}/parcels-for-audit`);
      const data = await response.json();
      setParcels(data.parcels || []);
    } catch (error) {
      console.error('Error fetching parcels:', error);
      setParcels([]);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchMissions(), fetchAuditors(), fetchCooperatives()]);
      setLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (newMission.cooperative_id) {
      fetchParcels(newMission.cooperative_id);
      setSelectedParcels([]);
    }
  }, [newMission.cooperative_id]);

  const handleCreateMission = async () => {
    if (!newMission.auditor_id || !newMission.cooperative_id || selectedParcels.length === 0) {
      toast.error('Veuillez sélectionner un auditeur, une coopérative et au moins une parcelle');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/carbon-auditor/admin/missions/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auditor_id: newMission.auditor_id,
          cooperative_id: newMission.cooperative_id,
          parcel_ids: selectedParcels,
          deadline: newMission.deadline || null,
          notes: newMission.notes || null
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Erreur création mission');
      }

      const result = await response.json();
      toast.success(`Mission créée avec ${result.parcels_to_audit} parcelles à auditer`);
      setShowCreateModal(false);
      resetForm();
      fetchMissions();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setNewMission({ auditor_id: '', cooperative_id: '', deadline: '', notes: '' });
    setSelectedParcels([]);
    setStep(1);
    setParcels([]);
  };

  const toggleParcel = (parcelId) => {
    setSelectedParcels(prev => 
      prev.includes(parcelId) 
        ? prev.filter(id => id !== parcelId)
        : [...prev, parcelId]
    );
  };

  const selectAllParcels = () => {
    if (selectedParcels.length === parcels.length) {
      setSelectedParcels([]);
    } else {
      setSelectedParcels(parcels.map(p => p.id));
    }
  };

  const filteredMissions = missions.filter(mission => {
    const matchesSearch = mission.cooperative_name?.toLowerCase().includes(search.toLowerCase()) ||
                          mission.auditor_name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || mission.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-amber-500/20 text-amber-400"><Clock className="h-3 w-3 mr-1" />En attente</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-500/20 text-blue-400"><Target className="h-3 w-3 mr-1" />En cours</Badge>;
      case 'completed':
        return <Badge className="bg-green-500/20 text-green-400"><CheckCircle className="h-3 w-3 mr-1" />Terminé</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900" data-testid="audit-missions-page">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/admin/carbon-auditors')}
                className="text-white hover:bg-white/10"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Retour
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <Target className="h-6 w-6" />
                  <h1 className="text-xl font-bold">Missions d'Audit</h1>
                </div>
                <p className="text-sm text-blue-100">{missions.length} mission(s) créée(s)</p>
              </div>
            </div>
            <Button 
              onClick={() => setShowCreateModal(true)} 
              className="bg-white text-blue-600 hover:bg-blue-50"
              data-testid="create-mission-btn"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle Mission
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher par coopérative ou auditeur..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-700 text-white"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] bg-gray-800 border-gray-700 text-white">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="in_progress">En cours</SelectItem>
              <SelectItem value="completed">Terminé</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Missions List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredMissions.length > 0 ? (
          <div className="grid gap-4">
            {filteredMissions.map((mission) => (
              <Card 
                key={mission.id} 
                className="bg-gray-800 border-gray-700 hover:border-blue-500/50 transition-colors cursor-pointer"
                onClick={() => {
                  setSelectedMission(mission);
                  setShowDetailsModal(true);
                }}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        <Target className="h-6 w-6 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{mission.cooperative_name}</h3>
                        <div className="flex items-center gap-3 text-sm text-gray-400">
                          <span className="flex items-center">
                            <Shield className="h-3 w-3 mr-1" />
                            {mission.auditor_name}
                          </span>
                          <span className="flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            {mission.parcels_count} parcelles
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-32">
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>Progression</span>
                          <span>{mission.parcels_audited}/{mission.parcels_count}</span>
                        </div>
                        <Progress 
                          value={(mission.parcels_audited / mission.parcels_count) * 100} 
                          className="h-2 bg-gray-700"
                        />
                      </div>
                      {getStatusBadge(mission.status)}
                      {mission.deadline && (
                        <div className="text-xs text-gray-400 flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(mission.deadline).toLocaleDateString('fr-FR')}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="py-12 text-center">
              <Target className="h-12 w-12 mx-auto mb-4 text-gray-600" />
              <h3 className="text-lg font-medium text-white mb-1">Aucune mission trouvée</h3>
              <p className="text-gray-400 mb-4">
                Créez une mission pour assigner des parcelles à auditer
              </p>
              <Button onClick={() => setShowCreateModal(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Créer une mission
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Mission Modal */}
      <Dialog open={showCreateModal} onOpenChange={(open) => { if (!open) resetForm(); setShowCreateModal(open); }}>
        <DialogContent className="max-w-2xl bg-gray-800 border-gray-700 text-white" data-testid="create-mission-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Target className="h-5 w-5 text-blue-400" />
              Nouvelle Mission d'Audit
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Étape {step}/2 - {step === 1 ? 'Sélection auditeur et coopérative' : 'Sélection des parcelles'}
            </DialogDescription>
          </DialogHeader>

          {step === 1 && (
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-gray-300">Auditeur Carbone *</Label>
                <Select 
                  value={newMission.auditor_id} 
                  onValueChange={(value) => setNewMission({...newMission, auditor_id: value})}
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white mt-1">
                    <SelectValue placeholder="Sélectionnez un auditeur" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {auditors.map((auditor) => (
                      <SelectItem key={auditor.id} value={auditor.id}>
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-emerald-400" />
                          {auditor.full_name}
                          {auditor.pending_missions > 0 && (
                            <Badge className="ml-2 bg-amber-500/20 text-amber-400 text-xs">
                              {auditor.pending_missions} en cours
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-gray-300">Coopérative *</Label>
                <Select 
                  value={newMission.cooperative_id} 
                  onValueChange={(value) => setNewMission({...newMission, cooperative_id: value})}
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white mt-1">
                    <SelectValue placeholder="Sélectionnez une coopérative" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {cooperatives.map((coop) => (
                      <SelectItem key={coop.id} value={coop.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-blue-400" />
                          {coop.name || coop.coop_name || coop.full_name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-gray-300">Date limite (optionnel)</Label>
                <Input
                  type="date"
                  value={newMission.deadline}
                  onChange={(e) => setNewMission({...newMission, deadline: e.target.value})}
                  className="bg-gray-700 border-gray-600 text-white mt-1"
                />
              </div>

              <div>
                <Label className="text-gray-300">Notes (optionnel)</Label>
                <Textarea
                  value={newMission.notes}
                  onChange={(e) => setNewMission({...newMission, notes: e.target.value})}
                  className="bg-gray-700 border-gray-600 text-white mt-1"
                  placeholder="Instructions spéciales pour l'auditeur..."
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="py-4">
              <div className="flex items-center justify-between mb-4">
                <Label className="text-gray-300">Parcelles à auditer *</Label>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={selectAllParcels}
                  className="border-gray-600 text-gray-300"
                >
                  {selectedParcels.length === parcels.length ? 'Désélectionner tout' : 'Sélectionner tout'}
                </Button>
              </div>
              
              {parcels.length > 0 ? (
                <div className="max-h-[300px] overflow-y-auto space-y-2">
                  {parcels.map((parcel) => (
                    <div 
                      key={parcel.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedParcels.includes(parcel.id)
                          ? 'bg-blue-500/20 border-blue-500'
                          : 'bg-gray-700/50 border-gray-600 hover:border-gray-500'
                      }`}
                      onClick={() => toggleParcel(parcel.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox 
                          checked={selectedParcels.includes(parcel.id)}
                          className="border-gray-500"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-white">{parcel.location}</p>
                          <p className="text-sm text-gray-400">
                            {parcel.village} • {parcel.area_hectares} ha • {parcel.farmer_name}
                          </p>
                        </div>
                        {parcel.carbon_score && (
                          <Badge className="bg-emerald-500/20 text-emerald-400">
                            Score: {parcel.carbon_score}/10
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Aucune parcelle disponible pour cette coopérative</p>
                </div>
              )}

              <div className="mt-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
                <p className="text-blue-300 text-sm">
                  <strong>{selectedParcels.length}</strong> parcelle(s) sélectionnée(s) sur {parcels.length}
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            {step === 2 && (
              <Button 
                variant="outline" 
                onClick={() => setStep(1)}
                className="border-gray-600 text-gray-300"
              >
                Retour
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={() => { resetForm(); setShowCreateModal(false); }}
              className="border-gray-600 text-gray-300"
            >
              Annuler
            </Button>
            {step === 1 ? (
              <Button 
                onClick={() => setStep(2)}
                disabled={!newMission.auditor_id || !newMission.cooperative_id}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Suivant
              </Button>
            ) : (
              <Button 
                onClick={handleCreateMission}
                disabled={submitting || selectedParcels.length === 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {submitting ? 'Création...' : `Créer la mission (${selectedParcels.length} parcelles)`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mission Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-lg bg-gray-800 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Détails de la Mission</DialogTitle>
          </DialogHeader>
          {selectedMission && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Target className="h-7 w-7 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{selectedMission.cooperative_name}</h3>
                  {getStatusBadge(selectedMission.status)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-700/50 rounded-lg">
                  <p className="text-sm text-gray-400">Auditeur</p>
                  <p className="font-medium text-white">{selectedMission.auditor_name}</p>
                </div>
                <div className="p-3 bg-gray-700/50 rounded-lg">
                  <p className="text-sm text-gray-400">Parcelles</p>
                  <p className="font-medium text-white">{selectedMission.parcels_audited}/{selectedMission.parcels_count}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-400 mb-2">Progression</p>
                <Progress 
                  value={(selectedMission.parcels_audited / selectedMission.parcels_count) * 100} 
                  className="h-3 bg-gray-700"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {Math.round((selectedMission.parcels_audited / selectedMission.parcels_count) * 100)}% complété
                </p>
              </div>

              {selectedMission.deadline && (
                <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
                  <p className="text-amber-300 text-sm flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    Échéance: {new Date(selectedMission.deadline).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              )}

              {selectedMission.notes && (
                <div className="p-3 bg-gray-700/50 rounded-lg">
                  <p className="text-sm text-gray-400">Notes</p>
                  <p className="text-white">{selectedMission.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuditMissionsPage;

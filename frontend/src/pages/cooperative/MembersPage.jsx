import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { cooperativeApi } from '../../services/cooperativeApi';
import { 
  Users, Plus, Search, Filter, CheckCircle, 
  Clock, Phone, MapPin, ChevronLeft, Eye,
  Upload, UserCheck, AlertCircle, Layers,
  UserX, KeyRound, Send, Loader2
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
  DialogTrigger,
  DialogFooter,
} from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';

const MembersPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [members, setMembers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [newMember, setNewMember] = useState({
    full_name: '',
    phone_number: '',
    village: '',
    department: '',
    zone: '',
    cni_number: '',
    consent_given: true,
    pin_code: '',
    hectares: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [createdMemberInfo, setCreatedMemberInfo] = useState(null);
  const [activationStats, setActivationStats] = useState(null);
  const [sendingReminder, setSendingReminder] = useState(null);

  // Liste des 51 départements de Côte d'Ivoire
  const DEPARTEMENTS = [
    { code: "ABEN", nom: "Abengourou", zone: "Est" },
    { code: "ABID", nom: "Abidjan", zone: "Sud" },
    { code: "ABOI", nom: "Aboisso", zone: "Sud-Est" },
    { code: "ADIA", nom: "Adiaké", zone: "Sud-Est" },
    { code: "ADZO", nom: "Adzopé", zone: "Sud-Est" },
    { code: "AGBO", nom: "Agboville", zone: "Sud" },
    { code: "AGNI", nom: "Agnibilékro", zone: "Est" },
    { code: "ALEP", nom: "Alépé", zone: "Sud-Est" },
    { code: "BANG", nom: "Bangolo", zone: "Ouest" },
    { code: "BEOU", nom: "Béoumi", zone: "Centre" },
    { code: "BIAN", nom: "Biankouma", zone: "Ouest" },
    { code: "BOCA", nom: "Bocanda", zone: "Centre" },
    { code: "BOND", nom: "Bondoukou", zone: "Nord-Est" },
    { code: "BONG", nom: "Bongouanou", zone: "Centre-Est" },
    { code: "BOUA", nom: "Bouaflé", zone: "Centre-Ouest" },
    { code: "BOUK", nom: "Bouaké", zone: "Centre" },
    { code: "DABA", nom: "Dabakala", zone: "Nord" },
    { code: "DABO", nom: "Dabou", zone: "Sud" },
    { code: "DANA", nom: "Danané", zone: "Ouest" },
    { code: "DAOU", nom: "Daoukro", zone: "Centre-Est" },
    { code: "DIMB", nom: "Dimbokro", zone: "Centre" },
    { code: "DALO", nom: "Daloa", zone: "Centre-Ouest" },
    { code: "DIVO", nom: "Divo", zone: "Sud" },
    { code: "DOUE", nom: "Duékoué", zone: "Ouest" },
    { code: "GAGN", nom: "Gagnoa", zone: "Centre-Ouest" },
    { code: "BASS", nom: "Grand-Bassam", zone: "Sud" },
    { code: "LAHO", nom: "Grand-Lahou", zone: "Sud" },
    { code: "GUIG", nom: "Guiglo", zone: "Ouest" },
    { code: "ISSI", nom: "Issia", zone: "Centre-Ouest" },
    { code: "JACQ", nom: "Jacqueville", zone: "Sud" },
    { code: "LAKO", nom: "Lakota", zone: "Sud-Ouest" },
    { code: "MAN", nom: "Man", zone: "Ouest" },
    { code: "MANK", nom: "Mankono", zone: "Nord" },
    { code: "MBAH", nom: "M'Bahiakro", zone: "Centre" },
    { code: "OUME", nom: "Oumé", zone: "Centre-Ouest" },
    { code: "SAKA", nom: "Sakassou", zone: "Centre" },
    { code: "SANP", nom: "San-Pédro", zone: "Sud-Ouest" },
    { code: "SASS", nom: "Sassandra", zone: "Sud-Ouest" },
    { code: "SEGU", nom: "Séguéla", zone: "Nord-Ouest" },
    { code: "SINF", nom: "Sinfra", zone: "Centre-Ouest" },
    { code: "SOUB", nom: "Soubré", zone: "Sud-Ouest" },
    { code: "TABO", nom: "Tabou", zone: "Sud-Ouest" },
    { code: "TAND", nom: "Tanda", zone: "Nord-Est" },
    { code: "TIAS", nom: "Tiassalé", zone: "Sud" },
    { code: "TOUL", nom: "Touleupleu", zone: "Ouest" },
    { code: "TIEB", nom: "Tiébissou", zone: "Centre" },
    { code: "TOUB", nom: "Touba", zone: "Nord-Ouest" },
    { code: "TOUM", nom: "Toumodi", zone: "Centre" },
    { code: "VAVO", nom: "Vavoua", zone: "Centre-Ouest" },
    { code: "YAMO", nom: "Yamoussoukro", zone: "Centre" },
    { code: "ZUEN", nom: "Zuénoula", zone: "Centre-Ouest" },
  ];

  // Get unique zones for filtering
  const zones = [...new Set(DEPARTEMENTS.map(d => d.zone))].sort();
  
  // Filter departments by selected zone
  const filteredDepartements = newMember.zone 
    ? DEPARTEMENTS.filter(d => d.zone === newMember.zone)
    : DEPARTEMENTS;

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      
      const data = await cooperativeApi.getMembers(params);
      setMembers(data.members);
      setTotal(data.total);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast.error('Erreur lors du chargement des membres');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
    loadActivationStats();
  }, [statusFilter]);

  const loadActivationStats = async () => {
    try {
      const stats = await cooperativeApi.getActivationStats();
      setActivationStats(stats);
    } catch (error) {
      console.error('Error fetching activation stats:', error);
    }
  };

  const handleSendReminder = async (memberId, memberName) => {
    setSendingReminder(memberId);
    try {
      await cooperativeApi.sendActivationReminder(memberId);
      toast.success(`Rappel envoyé à ${memberName}`);
      loadActivationStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'envoi');
    } finally {
      setSendingReminder(null);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchMembers();
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMember.pin_code || newMember.pin_code.length !== 4 || !/^\d{4}$/.test(newMember.pin_code)) {
      toast.error('Le code PIN à 4 chiffres est obligatoire');
      return;
    }
    setSubmitting(true);
    try {
      const result = await cooperativeApi.createMember({
        ...newMember,
        hectares: newMember.hectares ? parseFloat(newMember.hectares) : null
      });
      setShowAddModal(false);
      setCreatedMemberInfo({
        name: newMember.full_name,
        phone: newMember.phone_number,
        code_planteur: result.code_planteur,
        pin_configured: result.pin_configured
      });
      setNewMember({
        full_name: '',
        phone_number: '',
        village: '',
        department: '',
        zone: '',
        cni_number: '',
        consent_given: true,
        pin_code: '',
        hectares: ''
      });
      fetchMembers();
      toast.success('Membre ajouté avec succès');
    } catch (error) {
      console.error('Error adding member:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'ajout du membre');
    } finally {
      setSubmitting(false);
    }
  };

  const handleValidateMember = async (memberId) => {
    try {
      await cooperativeApi.validateMember(memberId);
      toast.success('Membre validé avec succès');
      fetchMembers();
    } catch (error) {
      console.error('Error validating member:', error);
      toast.error('Erreur lors de la validation');
    }
  };

  const handleViewDetails = async (memberId) => {
    try {
      const details = await cooperativeApi.getMemberDetails(memberId);
      setSelectedMember(details);
      setShowDetailsModal(true);
    } catch (error) {
      console.error('Error fetching member details:', error);
      toast.error('Erreur lors du chargement des détails');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Actif</Badge>;
      case 'pending_validation':
        return <Badge className="bg-amber-100 text-amber-800"><Clock className="h-3 w-3 mr-1" />En attente</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" data-testid="members-page">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/cooperative/dashboard')}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Retour
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Gestion des Membres</h1>
                <p className="text-sm text-gray-500">{total} membres au total</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate('/cooperative/members/import')}>
                <Upload className="h-4 w-4 mr-2" />
                Importer CSV
              </Button>
              <Button onClick={() => setShowAddModal(true)} data-testid="add-member-modal-btn">
                <Plus className="h-4 w-4 mr-2" />
                Nouveau Membre
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher par nom ou téléphone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                data-testid="search-members-input"
              />
            </div>
            <Button type="submit" variant="secondary">
              Rechercher
            </Button>
          </form>
          <div className="flex gap-2">
            <Button 
              variant={statusFilter === '' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('')}
            >
              Tous
            </Button>
            <Button 
              variant={statusFilter === 'active' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('active')}
            >
              Actifs
            </Button>
            <Button 
              variant={statusFilter === 'pending_validation' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('pending_validation')}
            >
              En attente
            </Button>
          </div>
        </div>
      </div>

      {/* Activation Stats Banner */}
      {activationStats && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4" data-testid="activation-stats-banner">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="flex items-center gap-2 p-3 bg-white rounded-lg border">
              <Users className="h-5 w-5 text-blue-600 flex-shrink-0" />
              <div>
                <p className="text-lg font-bold text-gray-900">{activationStats.total_members}</p>
                <p className="text-xs text-gray-500">Total</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-green-200">
              <UserCheck className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="text-lg font-bold text-green-700">{activationStats.activated_count}</p>
                <p className="text-xs text-gray-500">Activés</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-amber-200">
              <UserX className="h-5 w-5 text-amber-600 flex-shrink-0" />
              <div>
                <p className="text-lg font-bold text-amber-700">{activationStats.pending_count}</p>
                <p className="text-xs text-gray-500">Non activés</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-emerald-200">
              <KeyRound className="h-5 w-5 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="text-lg font-bold text-emerald-700">{activationStats.pin_configured_count}</p>
                <p className="text-xs text-gray-500">PIN USSD</p>
              </div>
            </div>
            <div className="p-3 bg-white rounded-lg border">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-500">Taux d'activation</span>
                <span className="font-semibold text-blue-700">{activationStats.activation_rate}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: `${activationStats.activation_rate}%`,
                    background: activationStats.activation_rate >= 75 ? '#16a34a' : activationStats.activation_rate >= 40 ? '#d97706' : '#dc2626'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Members List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        ) : members.length > 0 ? (
          <div className="grid gap-4">
            {members.map((member) => (
              <Card key={member.id} className="hover:shadow-md transition-shadow" data-testid={`member-card-${member.id}`}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                        <span className="text-green-700 font-bold text-lg">
                          {member.full_name?.charAt(0) || '?'}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{member.full_name}</h3>
                        <div className="flex items-center gap-3 text-sm text-gray-500 flex-wrap">
                          <span className="flex items-center">
                            <Phone className="h-3 w-3 mr-1" />
                            {member.phone_number}
                          </span>
                          <span className="flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            {member.village}
                          </span>
                          {member.code_planteur && (
                            <span className="text-green-700 font-mono text-xs bg-green-50 px-1.5 py-0.5 rounded">
                              {member.code_planteur}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden md:block">
                        <p className="text-sm font-medium">{member.nombre_parcelles || 0} parcelles</p>
                        <p className="text-xs text-gray-500">{member.superficie_totale || 0} ha</p>
                      </div>
                      <div className="text-right hidden md:block">
                        <p className="text-sm font-medium">Score: {member.score_carbone_moyen || 0}/10</p>
                      </div>
                      {getStatusBadge(member.status)}
                      {!member.pin_configured && (
                        <Badge variant="outline" className="text-xs text-orange-600 border-orange-300 hidden md:flex">
                          <KeyRound className="h-3 w-3 mr-1" />Sans PIN
                        </Badge>
                      )}
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate(`/cooperative/members/${member.id}/parcels`)}
                          title="Gérer les parcelles"
                        >
                          <Layers className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleViewDetails(member.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {member.status === 'pending_validation' && (
                          <Button 
                            size="sm"
                            onClick={() => handleValidateMember(member.id)}
                            data-testid={`validate-member-${member.id}`}
                          >
                            <UserCheck className="h-4 w-4 mr-1" />
                            Valider
                          </Button>
                        )}
                        {activationStats?.pending_activation?.some(p => p.id === member.id) && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-blue-600 border-blue-300 hover:bg-blue-50"
                            disabled={sendingReminder === member.id}
                            onClick={() => handleSendReminder(member.id, member.full_name)}
                            title="Envoyer un rappel SMS d'activation"
                            data-testid={`reminder-btn-${member.id}`}
                          >
                            {sendingReminder === member.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">Aucun membre trouvé</h3>
              <p className="text-gray-500 mb-4">
                {search || statusFilter ? 'Essayez de modifier vos filtres' : 'Commencez par ajouter des membres à votre coopérative'}
              </p>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un membre
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Member Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent data-testid="add-member-modal">
          <DialogHeader>
            <DialogTitle>Ajouter un Membre</DialogTitle>
            <DialogDescription>
              Enregistrez un nouveau membre dans votre coopérative
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddMember}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="full_name">Nom complet *</Label>
                <Input
                  id="full_name"
                  value={newMember.full_name}
                  onChange={(e) => setNewMember({...newMember, full_name: e.target.value})}
                  placeholder="Ex: Kouassi Yao Jean"
                  required
                  data-testid="member-name-input"
                />
              </div>
              <div>
                <Label htmlFor="phone_number">Téléphone *</Label>
                <Input
                  id="phone_number"
                  value={newMember.phone_number}
                  onChange={(e) => setNewMember({...newMember, phone_number: e.target.value})}
                  placeholder="+225 07 XX XX XX XX"
                  required
                  data-testid="member-phone-input"
                />
              </div>
              
              {/* Zone et Département */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Zone</Label>
                  <select
                    className="w-full p-2 border rounded-md text-sm"
                    value={newMember.zone}
                    onChange={(e) => setNewMember({ ...newMember, zone: e.target.value, department: '' })}
                    data-testid="member-zone-select"
                  >
                    <option value="">Toutes les zones</option>
                    {zones.map(zone => (
                      <option key={zone} value={zone}>{zone}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-sm">Département *</Label>
                  <select
                    className="w-full p-2 border rounded-md text-sm"
                    value={newMember.department}
                    onChange={(e) => {
                      const dept = DEPARTEMENTS.find(d => d.code === e.target.value);
                      setNewMember({ 
                        ...newMember, 
                        department: e.target.value,
                        zone: dept ? dept.zone : newMember.zone
                      });
                    }}
                    required
                    data-testid="member-department-select"
                  >
                    <option value="">-- Sélectionner --</option>
                    {filteredDepartements.map(dept => (
                      <option key={dept.code} value={dept.code}>
                        {dept.nom} ({dept.zone})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="village">Village *</Label>
                <Input
                  id="village"
                  value={newMember.village}
                  onChange={(e) => setNewMember({...newMember, village: e.target.value})}
                  placeholder="Ex: Gagnoa Centre"
                  required
                  data-testid="member-village-input"
                />
              </div>
              <div>
                <Label htmlFor="hectares">Superficie approximative (hectares)</Label>
                <Input
                  id="hectares"
                  type="number"
                  step="0.1"
                  min="0"
                  value={newMember.hectares}
                  onChange={(e) => setNewMember({...newMember, hectares: e.target.value})}
                  placeholder="Ex: 2.5"
                  data-testid="member-hectares-input"
                />
              </div>
              <div>
                <Label htmlFor="cni_number">Numéro CNI (optionnel)</Label>
                <Input
                  id="cni_number"
                  value={newMember.cni_number}
                  onChange={(e) => setNewMember({...newMember, cni_number: e.target.value})}
                  placeholder="CI-XXXX-XXXXXX"
                  data-testid="member-cni-input"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="consent"
                  checked={newMember.consent_given}
                  onChange={(e) => setNewMember({...newMember, consent_given: e.target.checked})}
                  className="rounded"
                />
                <Label htmlFor="consent" className="text-sm">
                  Le membre consent à l'enregistrement de ses données
                </Label>
              </div>
              <div>
                <Label htmlFor="pin_code">Code PIN USSD (4 chiffres) *</Label>
                <Input
                  id="pin_code"
                  type="password"
                  maxLength={4}
                  value={newMember.pin_code}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setNewMember({...newMember, pin_code: v});
                  }}
                  placeholder="Ex: 1234"
                  required
                  data-testid="member-pin-input"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Ce PIN permettra au planteur d'utiliser le service USSD *144*88#
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={submitting} data-testid="submit-member-btn">
                {submitting ? 'Ajout...' : 'Ajouter'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Created Member Success Dialog */}
      <Dialog open={!!createdMemberInfo} onOpenChange={() => setCreatedMemberInfo(null)}>
        <DialogContent data-testid="member-created-success-modal">
          <DialogHeader>
            <DialogTitle className="text-green-700 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" /> Membre enregistré avec succès
            </DialogTitle>
          </DialogHeader>
          {createdMemberInfo && (
            <div className="space-y-4 py-2">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-600 mb-1">Code Planteur</p>
                <p className="text-2xl font-bold text-green-800 tracking-wider" data-testid="created-member-code">
                  {createdMemberInfo.code_planteur}
                </p>
                <p className="text-xs text-gray-500 mt-2">Conservez ce code, il identifie le planteur</p>
              </div>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Nom :</span> {createdMemberInfo.name}</p>
                <p><span className="font-medium">Téléphone :</span> {createdMemberInfo.phone}</p>
                <p>
                  <span className="font-medium">PIN USSD :</span>{' '}
                  {createdMemberInfo.pin_configured ? (
                    <Badge variant="outline" className="text-green-700 border-green-300">Configuré</Badge>
                  ) : (
                    <Badge variant="outline" className="text-orange-700 border-orange-300">Non configuré</Badge>
                  )}
                </p>
              </div>
              {!createdMemberInfo.pin_configured && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                  Le planteur devra configurer son PIN lors de sa première connexion USSD (*144*88#).
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setCreatedMemberInfo(null)} data-testid="close-success-modal-btn">
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Member Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-lg" data-testid="member-details-modal">
          <DialogHeader>
            <DialogTitle>Détails du Membre</DialogTitle>
          </DialogHeader>
          {selectedMember && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-green-700 font-bold text-2xl">
                    {selectedMember.full_name?.charAt(0) || '?'}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{selectedMember.full_name}</h3>
                  <p className="text-gray-500">{selectedMember.phone_number}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Département</p>
                  <p className="font-medium">{selectedMember.department || 'Non renseigné'}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Zone</p>
                  <p className="font-medium">{selectedMember.zone || 'Non renseigné'}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Village</p>
                  <p className="font-medium">{selectedMember.village}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">CNI</p>
                  <p className="font-medium">{selectedMember.cni_number || 'Non renseigné'}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Parcelles</p>
                  <p className="font-medium">{selectedMember.parcels?.length || 0}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Primes totales</p>
                  <p className="font-medium">{(selectedMember.total_premium_earned || 0).toLocaleString()} XOF</p>
                </div>
              </div>

              {selectedMember.parcels?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Parcelles</h4>
                  <div className="space-y-2">
                    {selectedMember.parcels.map((parcel, i) => (
                      <div key={i} className="p-2 bg-green-50 rounded flex justify-between">
                        <span>{parcel.localisation || parcel.location}</span>
                        <span className="text-sm text-gray-600">
                          {parcel.superficie || parcel.area_hectares} ha | Score: {parcel.score_carbone || parcel.carbon_score}/10
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MembersPage;

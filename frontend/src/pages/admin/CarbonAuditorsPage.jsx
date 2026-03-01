import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, Plus, Search, Phone, MapPin, ChevronLeft, 
  CheckCircle, Clock, UserCheck, Eye, Mail, Award,
  Target, BarChart3, Calendar, FileCheck, Users
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

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CarbonAuditorsPage = () => {
  const navigate = useNavigate();
  const [auditors, setAuditors] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedAuditor, setSelectedAuditor] = useState(null);
  const [newAuditor, setNewAuditor] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    password: '',
    zone_coverage: '',
    certifications: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchAuditors = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/carbon-auditor/admin/auditors`);
      const data = await response.json();
      setAuditors(data.auditors || []);
    } catch (error) {
      console.error('Error fetching auditors:', error);
      toast.error('Erreur lors du chargement des auditeurs');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/carbon-auditor/admin/stats/overview`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchAuditors();
    fetchStats();
  }, []);

  const handleAddAuditor = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const auditorData = {
        ...newAuditor,
        zone_coverage: newAuditor.zone_coverage 
          ? newAuditor.zone_coverage.split(',').map(z => z.trim()).filter(z => z)
          : [],
        certifications: newAuditor.certifications
          ? newAuditor.certifications.split(',').map(c => c.trim()).filter(c => c)
          : []
      };
      
      const response = await fetch(`${API_URL}/api/carbon-auditor/admin/auditors/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(auditorData)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Erreur création');
      }
      
      toast.success('Auditeur carbone créé avec succès!');
      setShowAddModal(false);
      setNewAuditor({
        full_name: '',
        email: '',
        phone_number: '',
        password: '',
        zone_coverage: '',
        certifications: ''
      });
      fetchAuditors();
      fetchStats();
    } catch (error) {
      console.error('Error adding auditor:', error);
      toast.error(error.message || 'Erreur lors de la création');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAuditors = auditors.filter(auditor => 
    auditor.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    auditor.email?.toLowerCase().includes(search.toLowerCase()) ||
    auditor.phone_number?.includes(search)
  );

  return (
    <div className="min-h-screen bg-gray-900" data-testid="carbon-auditors-page">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/admin/dashboard')}
                className="text-white hover:bg-white/10"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Retour
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <Shield className="h-6 w-6" />
                  <h1 className="text-xl font-bold">Auditeurs Carbone</h1>
                </div>
                <p className="text-sm text-emerald-100">Gestion des auditeurs GreenLink</p>
              </div>
            </div>
            <Button 
              onClick={() => setShowAddModal(true)} 
              className="bg-white text-emerald-600 hover:bg-emerald-50"
              data-testid="add-auditor-btn"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouvel Auditeur
            </Button>
            <Button 
              onClick={() => navigate('/admin/audit-missions')} 
              variant="outline"
              className="border-white text-white hover:bg-white/10"
              data-testid="missions-btn"
            >
              <Target className="h-4 w-4 mr-2" />
              Missions
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 rounded-lg">
                    <Users className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.auditors?.total || 0}</p>
                    <p className="text-xs text-gray-400">Auditeurs actifs</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Target className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.missions?.pending || 0}</p>
                    <p className="text-xs text-gray-400">Missions en attente</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <FileCheck className="h-5 w-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.audits?.total || 0}</p>
                    <p className="text-xs text-gray-400">Audits complétés</p>
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
                    <p className="text-2xl font-bold text-white">{stats.audits?.approval_rate || 0}%</p>
                    <p className="text-xs text-gray-400">Taux approbation</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Rechercher par nom, email ou téléphone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-gray-800 border-gray-700 text-white"
            data-testid="search-auditors-input"
          />
        </div>
      </div>

      {/* Auditors List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
          </div>
        ) : filteredAuditors.length > 0 ? (
          <div className="grid gap-4">
            {filteredAuditors.map((auditor) => (
              <Card key={auditor.id} className="bg-gray-800 border-gray-700 hover:border-emerald-500/50 transition-colors" data-testid={`auditor-card-${auditor.id}`}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <Shield className="h-6 w-6 text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{auditor.full_name}</h3>
                        <div className="flex items-center gap-3 text-sm text-gray-400">
                          <span className="flex items-center">
                            <Mail className="h-3 w-3 mr-1" />
                            {auditor.email}
                          </span>
                          <span className="flex items-center">
                            <Phone className="h-3 w-3 mr-1" />
                            {auditor.phone_number}
                          </span>
                        </div>
                        {auditor.certifications?.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {auditor.certifications.map((cert, i) => (
                              <Badge key={i} variant="outline" className="text-xs border-emerald-500/50 text-emerald-400">
                                {cert}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden md:block">
                        <p className="text-sm font-medium text-white">{auditor.audits_completed || 0} audits</p>
                        <p className="text-xs text-gray-400">{auditor.pending_missions || 0} missions en cours</p>
                      </div>
                      <Badge className={auditor.is_active ? "bg-emerald-500/20 text-emerald-400" : "bg-gray-500/20 text-gray-400"}>
                        {auditor.is_active ? <><CheckCircle className="h-3 w-3 mr-1" />Actif</> : "Inactif"}
                      </Badge>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-gray-400 hover:text-white"
                        onClick={() => {
                          setSelectedAuditor(auditor);
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
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="py-12 text-center">
              <Shield className="h-12 w-12 mx-auto mb-4 text-gray-600" />
              <h3 className="text-lg font-medium text-white mb-1">Aucun auditeur trouvé</h3>
              <p className="text-gray-400 mb-4">
                {search ? 'Essayez de modifier votre recherche' : 'Commencez par ajouter des auditeurs carbone'}
              </p>
              <Button onClick={() => setShowAddModal(true)} className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un auditeur
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Auditor Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white" data-testid="add-auditor-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Shield className="h-5 w-5 text-emerald-400" />
              Nouvel Auditeur Carbone
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Créez un compte auditeur rattaché à GreenLink pour la vérification des parcelles.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddAuditor}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="full_name" className="text-gray-300">Nom complet *</Label>
                <Input
                  id="full_name"
                  value={newAuditor.full_name}
                  onChange={(e) => setNewAuditor({...newAuditor, full_name: e.target.value})}
                  placeholder="Ex: Kouassi Jean-Marc"
                  required
                  className="bg-gray-700 border-gray-600 text-white"
                  data-testid="auditor-name-input"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email" className="text-gray-300">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newAuditor.email}
                    onChange={(e) => setNewAuditor({...newAuditor, email: e.target.value})}
                    placeholder="auditeur@greenlink.ci"
                    required
                    className="bg-gray-700 border-gray-600 text-white"
                    data-testid="auditor-email-input"
                  />
                </div>
                <div>
                  <Label htmlFor="phone_number" className="text-gray-300">Téléphone *</Label>
                  <Input
                    id="phone_number"
                    value={newAuditor.phone_number}
                    onChange={(e) => setNewAuditor({...newAuditor, phone_number: e.target.value})}
                    placeholder="+225 07 XX XX XX XX"
                    required
                    className="bg-gray-700 border-gray-600 text-white"
                    data-testid="auditor-phone-input"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="password" className="text-gray-300">Mot de passe *</Label>
                <Input
                  id="password"
                  type="password"
                  value={newAuditor.password}
                  onChange={(e) => setNewAuditor({...newAuditor, password: e.target.value})}
                  placeholder="Minimum 6 caractères"
                  required
                  className="bg-gray-700 border-gray-600 text-white"
                  data-testid="auditor-password-input"
                />
              </div>
              <div>
                <Label htmlFor="zone_coverage" className="text-gray-300">Zones couvertes (séparées par virgule)</Label>
                <Input
                  id="zone_coverage"
                  value={newAuditor.zone_coverage}
                  onChange={(e) => setNewAuditor({...newAuditor, zone_coverage: e.target.value})}
                  placeholder="Ex: Gagnoa, Daloa, Soubré"
                  className="bg-gray-700 border-gray-600 text-white"
                  data-testid="auditor-zones-input"
                />
              </div>
              <div>
                <Label htmlFor="certifications" className="text-gray-300">Certifications (séparées par virgule)</Label>
                <Input
                  id="certifications"
                  value={newAuditor.certifications}
                  onChange={(e) => setNewAuditor({...newAuditor, certifications: e.target.value})}
                  placeholder="Ex: Verra VCS, Gold Standard, Rainforest Alliance"
                  className="bg-gray-700 border-gray-600 text-white"
                  data-testid="auditor-certifications-input"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)} className="border-gray-600 text-gray-300">
                Annuler
              </Button>
              <Button 
                type="submit" 
                disabled={submitting} 
                className="bg-emerald-600 hover:bg-emerald-700"
                data-testid="submit-auditor-btn"
              >
                {submitting ? 'Création...' : 'Créer l\'auditeur'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Auditor Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-lg bg-gray-800 border-gray-700 text-white" data-testid="auditor-details-modal">
          <DialogHeader>
            <DialogTitle className="text-white">Détails de l'Auditeur</DialogTitle>
          </DialogHeader>
          {selectedAuditor && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Shield className="h-8 w-8 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{selectedAuditor.full_name}</h3>
                  <p className="text-gray-400">{selectedAuditor.email}</p>
                  <Badge className={selectedAuditor.is_active ? "bg-emerald-500/20 text-emerald-400 mt-1" : "bg-gray-500/20 text-gray-400 mt-1"}>
                    {selectedAuditor.is_active ? "Actif" : "Inactif"}
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-700/50 rounded-lg">
                  <p className="text-sm text-gray-400">Téléphone</p>
                  <p className="font-medium text-white">{selectedAuditor.phone_number}</p>
                </div>
                <div className="p-3 bg-gray-700/50 rounded-lg">
                  <p className="text-sm text-gray-400">Missions en cours</p>
                  <p className="font-medium text-white">{selectedAuditor.pending_missions || 0}</p>
                </div>
                <div className="p-3 bg-emerald-500/10 rounded-lg">
                  <p className="text-sm text-emerald-400">Audits complétés</p>
                  <p className="font-medium text-emerald-300">{selectedAuditor.audits_completed || 0}</p>
                </div>
                <div className="p-3 bg-emerald-500/10 rounded-lg">
                  <p className="text-sm text-emerald-400">Parcelles validées</p>
                  <p className="font-medium text-emerald-300">{selectedAuditor.parcels_validated || 0}</p>
                </div>
              </div>

              <div className="p-3 bg-gray-700/50 rounded-lg">
                <p className="text-sm text-gray-400 mb-2">Zones couvertes</p>
                <div className="flex flex-wrap gap-1">
                  {selectedAuditor.zone_coverage?.length > 0 ? (
                    selectedAuditor.zone_coverage.map((zone, i) => (
                      <Badge key={i} variant="secondary" className="bg-gray-600 text-gray-200">{zone}</Badge>
                    ))
                  ) : (
                    <span className="text-gray-500">Aucune zone spécifiée</span>
                  )}
                </div>
              </div>

              <div className="p-3 bg-gray-700/50 rounded-lg">
                <p className="text-sm text-gray-400 mb-2">Certifications</p>
                <div className="flex flex-wrap gap-1">
                  {selectedAuditor.certifications?.length > 0 ? (
                    selectedAuditor.certifications.map((cert, i) => (
                      <Badge key={i} className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        <Award className="h-3 w-3 mr-1" />
                        {cert}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-gray-500">Aucune certification</span>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button 
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => navigate(`/admin/carbon-auditors/${selectedAuditor.id}/missions`)}
                >
                  Voir les missions
                </Button>
                <Button 
                  variant="outline" 
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  onClick={() => setShowDetailsModal(false)}
                >
                  Fermer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CarbonAuditorsPage;

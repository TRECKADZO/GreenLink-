import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { 
  MapPin, CheckCircle, XCircle, AlertTriangle, Clock, 
  Search, Filter, Eye, ArrowLeft, Leaf, Users,
  ChevronRight, RefreshCw, TreePine, Sun
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const STATUS_CONFIG = {
  pending: { 
    label: 'En attente', 
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    icon: Clock 
  },
  verified: { 
    label: 'Vérifié', 
    color: 'bg-green-100 text-green-800 border-green-300',
    icon: CheckCircle 
  },
  rejected: { 
    label: 'Rejeté', 
    color: 'bg-red-100 text-red-800 border-red-300',
    icon: XCircle 
  },
  needs_correction: { 
    label: 'À corriger', 
    color: 'bg-orange-100 text-orange-800 border-orange-300',
    icon: AlertTriangle 
  }
};

export default function ParcelsVerificationPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusCounts, setStatusCounts] = useState({});
  const [selectedParcel, setSelectedParcel] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchParcels();
  }, [statusFilter]);

  const fetchParcels = async () => {
    try {
      setLoading(true);
      const params = statusFilter !== 'all' ? `?verification_status=${statusFilter}` : '';
      const response = await axios.get(`${API_URL}/api/cooperative/parcels/all${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setParcels(response.data.parcelles || []);
      setStatusCounts(response.data.compteurs_statut || {});
    } catch (error) {
      console.error('Error fetching parcels:', error);
      toast.error('Erreur lors du chargement des parcelles');
    } finally {
      setLoading(false);
    }
  };

  const filteredParcels = parcels.filter(p => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      p.nom_producteur?.toLowerCase().includes(search) ||
      p.village?.toLowerCase().includes(search) ||
      p.localisation?.toLowerCase().includes(search)
    );
  });

  const getStatusBadge = (status) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="pt-20 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/cooperative/dashboard')}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour au tableau de bord
            </Button>
            
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <MapPin className="h-8 w-8 text-green-600" />
                  Gestion des Parcelles
                </h1>
                <p className="text-gray-600 mt-1">
                  Suivez le statut de vérification des parcelles de vos membres
                </p>
              </div>
              
              <Button onClick={fetchParcels} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualiser
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card 
              className={`cursor-pointer transition-all ${statusFilter === 'all' ? 'ring-2 ring-green-500' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              <CardContent className="p-4 text-center">
                <Leaf className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <p className="text-2xl font-bold">{Object.values(statusCounts).reduce((a, b) => a + b, 0)}</p>
                <p className="text-sm text-gray-500">Total Parcelles</p>
              </CardContent>
            </Card>
            
            <Card 
              className={`cursor-pointer transition-all ${statusFilter === 'pending' ? 'ring-2 ring-yellow-500' : ''}`}
              onClick={() => setStatusFilter('pending')}
            >
              <CardContent className="p-4 text-center">
                <Clock className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
                <p className="text-2xl font-bold text-yellow-600">{statusCounts.pending || 0}</p>
                <p className="text-sm text-gray-500">En attente</p>
              </CardContent>
            </Card>
            
            <Card 
              className={`cursor-pointer transition-all ${statusFilter === 'verified' ? 'ring-2 ring-green-500' : ''}`}
              onClick={() => setStatusFilter('verified')}
            >
              <CardContent className="p-4 text-center">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <p className="text-2xl font-bold text-green-600">{statusCounts.verified || 0}</p>
                <p className="text-sm text-gray-500">Vérifiées</p>
              </CardContent>
            </Card>
            
            <Card 
              className={`cursor-pointer transition-all ${statusFilter === 'needs_correction' ? 'ring-2 ring-orange-500' : ''}`}
              onClick={() => setStatusFilter('needs_correction')}
            >
              <CardContent className="p-4 text-center">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                <p className="text-2xl font-bold text-orange-600">{(statusCounts.needs_correction || 0) + (statusCounts.rejected || 0)}</p>
                <p className="text-sm text-gray-500">À corriger</p>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher par nom, village..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Parcels List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Chargement des parcelles...</p>
            </div>
          ) : filteredParcels.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">Aucune parcelle trouvée</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredParcels.map((parcel) => (
                <Card key={parcel.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Users className="h-5 w-5 text-gray-400" />
                          <span className="font-semibold text-gray-900">{parcel.nom_producteur}</span>
                          {getStatusBadge(parcel.statut_verification)}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Village:</span>
                            <p className="font-medium">{parcel.village || '-'}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Superficie:</span>
                            <p className="font-medium">{parcel.superficie} ha</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Culture:</span>
                            <p className="font-medium capitalize">{parcel.type_culture}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Score Carbone:</span>
                            <p className="font-medium">{parcel.score_carbone}/10</p>
                          </div>
                        </div>

                        {/* Arbres ombragés par strate */}
                        {(parcel.nombre_arbres > 0 || parcel.arbres_strate1 > 0 || parcel.arbres_strate2 > 0 || parcel.arbres_strate3 > 0) && (
                          <div className="mt-3 grid grid-cols-4 gap-2 text-sm">
                            <div className="p-2 bg-green-50 rounded text-center">
                              <p className="text-xs text-green-600">Total arbres</p>
                              <p className="font-bold text-green-800">{parcel.nombre_arbres || ((parcel.arbres_strate1 || 0) + (parcel.arbres_strate2 || 0) + (parcel.arbres_strate3 || 0))}</p>
                            </div>
                            <div className="p-2 bg-emerald-50 rounded text-center">
                              <p className="text-xs text-emerald-600">Strate 3 (&gt;30m)</p>
                              <p className="font-bold text-emerald-800">{parcel.arbres_strate3 || 0}</p>
                            </div>
                            <div className="p-2 bg-emerald-50 rounded text-center">
                              <p className="text-xs text-emerald-600">Strate 2 (5-30m)</p>
                              <p className="font-bold text-emerald-700">{parcel.arbres_strate2 || 0}</p>
                            </div>
                            <div className="p-2 bg-emerald-50 rounded text-center">
                              <p className="text-xs text-emerald-600">Strate 1 (3-5m)</p>
                              <p className="font-bold text-emerald-600">{parcel.arbres_strate1 || 0}</p>
                            </div>
                          </div>
                        )}
                        {parcel.couverture_ombragee > 0 && (
                          <div className="mt-1 text-xs text-green-700">
                            Couverture ombragée: <span className="font-semibold">{parcel.couverture_ombragee}%</span>
                          </div>
                        )}
                        
                        {parcel.coordonnees_gps && (
                          <div className="mt-2 text-xs text-gray-500">
                            <MapPin className="h-3 w-3 inline mr-1" />
                            GPS: {parcel.coordonnees_gps.lat?.toFixed(5)}, {parcel.coordonnees_gps.lng?.toFixed(5)}
                          </div>
                        )}
                        
                        {parcel.verifie_le && (
                          <div className="mt-2 text-xs text-green-600">
                            <CheckCircle className="h-3 w-3 inline mr-1" />
                            Vérifié le {new Date(parcel.verifie_le).toLocaleDateString('fr-FR')}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => { setSelectedParcel(parcel); setShowDetailsModal(true); }}
                          data-testid={`parcel-details-btn-${parcel.id}`}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Détails
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Parcel Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-lg" data-testid="parcel-details-modal">
          <DialogHeader>
            <DialogTitle>Détails de la Parcelle</DialogTitle>
          </DialogHeader>
          {selectedParcel && (
            <div className="space-y-4">
              {/* Producteur + status */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <Users className="h-6 w-6 text-green-700" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{selectedParcel.nom_producteur}</h3>
                  <p className="text-sm text-gray-500">{selectedParcel.village || 'Village non renseigné'}</p>
                </div>
                {getStatusBadge(selectedParcel.statut_verification)}
              </div>

              {/* Info grille */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Superficie</p>
                  <p className="font-semibold text-gray-900">{selectedParcel.superficie} ha</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Culture</p>
                  <p className="font-semibold text-gray-900 capitalize">{selectedParcel.type_culture}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Score Carbone</p>
                  <p className="font-semibold text-gray-900">{selectedParcel.score_carbone}/10</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Localisation</p>
                  <p className="font-semibold text-gray-900">{selectedParcel.localisation || selectedParcel.village || '-'}</p>
                </div>
              </div>

              {/* Arbres ombragés */}
              {(selectedParcel.nombre_arbres > 0 || selectedParcel.arbres_strate1 > 0 || selectedParcel.arbres_strate2 > 0 || selectedParcel.arbres_strate3 > 0) && (
                <div className="border rounded-lg p-4 bg-green-50/50">
                  <h4 className="text-sm font-semibold text-green-800 flex items-center gap-2 mb-3">
                    <TreePine className="h-4 w-4" /> Arbres d'ombrage
                  </h4>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="p-2 bg-white rounded text-center">
                      <p className="text-xs text-green-600">Total</p>
                      <p className="font-bold text-green-800">{selectedParcel.nombre_arbres || ((selectedParcel.arbres_strate1 || 0) + (selectedParcel.arbres_strate2 || 0) + (selectedParcel.arbres_strate3 || 0))}</p>
                    </div>
                    <div className="p-2 bg-white rounded text-center">
                      <p className="text-xs text-emerald-600">Strate 3</p>
                      <p className="font-bold text-emerald-800">{selectedParcel.arbres_strate3 || 0}</p>
                    </div>
                    <div className="p-2 bg-white rounded text-center">
                      <p className="text-xs text-emerald-600">Strate 2</p>
                      <p className="font-bold text-emerald-700">{selectedParcel.arbres_strate2 || 0}</p>
                    </div>
                    <div className="p-2 bg-white rounded text-center">
                      <p className="text-xs text-emerald-600">Strate 1</p>
                      <p className="font-bold text-emerald-600">{selectedParcel.arbres_strate1 || 0}</p>
                    </div>
                  </div>
                  {selectedParcel.couverture_ombragee > 0 && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-green-700">
                      <Sun className="h-4 w-4" />
                      Couverture ombragée: <span className="font-bold">{selectedParcel.couverture_ombragee}%</span>
                    </div>
                  )}
                </div>
              )}

              {/* GPS */}
              {selectedParcel.coordonnees_gps && (
                <div className="p-3 bg-gray-50 rounded-lg text-sm">
                  <p className="text-xs text-gray-500 mb-1">Coordonnées GPS</p>
                  <p className="font-medium text-gray-900 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-gray-400" />
                    {selectedParcel.coordonnees_gps.lat?.toFixed(5)}, {selectedParcel.coordonnees_gps.lng?.toFixed(5)}
                  </p>
                </div>
              )}

              {/* Date vérification */}
              {selectedParcel.verifie_le && (
                <div className="p-3 bg-green-50 rounded-lg text-sm flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-green-700">Vérifié le {new Date(selectedParcel.verifie_le).toLocaleDateString('fr-FR')}</span>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

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
  MapPin, CheckCircle, XCircle, AlertTriangle, Clock, 
  Search, Filter, Eye, ArrowLeft, Leaf, Users,
  ChevronRight, RefreshCw
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
      setParcels(response.data.parcels || []);
      setStatusCounts(response.data.status_counts || {});
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
      p.farmer_name?.toLowerCase().includes(search) ||
      p.village?.toLowerCase().includes(search) ||
      p.location?.toLowerCase().includes(search)
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
                          <span className="font-semibold text-gray-900">{parcel.farmer_name}</span>
                          {getStatusBadge(parcel.verification_status)}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Village:</span>
                            <p className="font-medium">{parcel.village || '-'}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Superficie:</span>
                            <p className="font-medium">{parcel.area_hectares} ha</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Culture:</span>
                            <p className="font-medium capitalize">{parcel.crop_type}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Score Carbone:</span>
                            <p className="font-medium">{parcel.carbon_score}/10</p>
                          </div>
                        </div>
                        
                        {parcel.gps_coordinates && (
                          <div className="mt-2 text-xs text-gray-500">
                            <MapPin className="h-3 w-3 inline mr-1" />
                            GPS: {parcel.gps_coordinates.lat?.toFixed(5)}, {parcel.gps_coordinates.lng?.toFixed(5)}
                          </div>
                        )}
                        
                        {parcel.verified_at && (
                          <div className="mt-2 text-xs text-green-600">
                            <CheckCircle className="h-3 w-3 inline mr-1" />
                            Vérifié le {new Date(parcel.verified_at).toLocaleDateString('fr-FR')}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate(`/cooperative/parcels/${parcel.id}`)}
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
    </div>
  );
}

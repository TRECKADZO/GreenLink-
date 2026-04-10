import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  MapPin, CheckCircle, Clock, XCircle, ChevronLeft,
  Camera, Navigation, Leaf, TreeDeciduous, Droplets,
  AlertTriangle, FileCheck, Eye
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AuditorMissionPage = () => {
  const { missionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mission, setMission] = useState(null);
  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const fetchMissionParcels = async () => {
      try {
        const response = await fetch(`${API_URL}/api/carbon-auditor/mission/${missionId}/parcels`);
        const data = await response.json();
        setMission(data);
        setParcels(data.parcels || []);
      } catch (error) {
        /* error logged */
        toast.error('Erreur lors du chargement de la mission');
      } finally {
        setLoading(false);
      }
    };

    if (missionId) {
      fetchMissionParcels();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missionId]);

  const getStatusBadge = (parcel) => {
    if (parcel.audit_status === 'completed') {
      if (parcel.audit_result === 'approved') {
        return <Badge className="bg-green-500/20 text-green-400"><CheckCircle className="h-3 w-3 mr-1" />Approuvé</Badge>;
      } else if (parcel.audit_result === 'rejected') {
        return <Badge className="bg-red-500/20 text-red-400"><XCircle className="h-3 w-3 mr-1" />Rejeté</Badge>;
      }
      return <Badge className="bg-amber-500/20 text-amber-400"><Clock className="h-3 w-3 mr-1" />À revoir</Badge>;
    }
    return <Badge className="bg-blue-500/20 text-blue-400"><Clock className="h-3 w-3 mr-1" />En attente</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  const completedCount = parcels.filter(p => p.audit_status === 'completed').length;
  const progressPercent = parcels.length > 0 ? (completedCount / parcels.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-900" data-testid="auditor-mission-page">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/auditor/dashboard')}
              className="text-white hover:bg-white/10"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Retour
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold">Mission d'Audit</h1>
              <p className="text-emerald-100">{mission?.cooperative_name}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">{completedCount}/{parcels.length}</p>
              <p className="text-sm text-emerald-100">parcelles auditées</p>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <Progress value={progressPercent} className="h-2 bg-white/20" />
            <p className="text-xs text-emerald-100 mt-1">{Math.round(progressPercent)}% complété</p>
          </div>
        </div>
      </div>

      {/* Parcels List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid gap-4">
          {parcels.map((parcel) => (
            <Card 
              key={parcel.id} 
              className={`bg-gray-800 border-gray-700 hover:border-emerald-500/50 transition-colors cursor-pointer ${
                parcel.audit_status === 'completed' ? 'opacity-75' : ''
              }`}
              onClick={() => navigate(`/auditor/audit/${missionId}/${parcel.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      parcel.audit_status === 'completed' 
                        ? parcel.audit_result === 'approved' ? 'bg-green-500/20' : 'bg-red-500/20'
                        : 'bg-emerald-500/20'
                    }`}>
                      {parcel.audit_status === 'completed' ? (
                        parcel.audit_result === 'approved' 
                          ? <CheckCircle className="h-6 w-6 text-green-400" />
                          : <XCircle className="h-6 w-6 text-red-400" />
                      ) : (
                        <Leaf className="h-6 w-6 text-emerald-400" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{parcel.location}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span className="flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          {parcel.village}
                        </span>
                        <span>{parcel.area_hectares} ha</span>
                        <span className="capitalize">{parcel.crop_type}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Producteur: {parcel.farmer_name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {parcel.carbon_score && (
                      <div className="text-right hidden md:block">
                        <p className="text-sm text-gray-400">Score déclaré</p>
                        <p className="text-lg font-bold text-emerald-400">{parcel.carbon_score}/10</p>
                      </div>
                    )}
                    {getStatusBadge(parcel)}
                    <Button variant="ghost" size="sm" className="text-gray-400">
                      {parcel.audit_status === 'completed' ? <Eye className="h-4 w-4" /> : <FileCheck className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                {parcel.gps_lat && parcel.gps_lng && (
                  <div className="mt-2 pt-2 border-t border-gray-700 flex items-center text-xs text-gray-500">
                    <Navigation className="h-3 w-3 mr-1" />
                    GPS: {parcel.gps_lat}, {parcel.gps_lng}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {parcels.length === 0 && (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="py-12 text-center">
              <Leaf className="h-12 w-12 mx-auto mb-4 text-gray-600" />
              <h3 className="text-lg font-medium text-white mb-1">Aucune parcelle dans cette mission</h3>
              <p className="text-gray-400">Les parcelles à auditer apparaîtront ici</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AuditorMissionPage;

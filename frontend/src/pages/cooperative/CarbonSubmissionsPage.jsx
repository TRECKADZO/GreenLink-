import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ArrowLeft, Leaf, Clock, Check, X, Plus,
  Eye, RefreshCw, TrendingUp, Send
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const STATUS_CONFIG = {
  pending_approval: { label: 'En attente', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: Clock },
  approved: { label: 'Approuve', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: Check },
  rejected: { label: 'Rejete', color: 'bg-red-100 text-red-800 border-red-200', icon: X },
};

const CarbonSubmissionsPage = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchMyListings();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchMyListings, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchMyListings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/carbon-listings/my`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setListings(data);
      }
    } catch (error) {
      toast.error('Erreur lors du chargement des soumissions');
    } finally {
      setLoading(false);
    }
  };

  const pendingCount = listings.filter(l => l.status === 'pending_approval').length;
  const approvedCount = listings.filter(l => l.status === 'approved').length;
  const rejectedCount = listings.filter(l => l.status === 'rejected').length;
  const totalTonnes = listings.reduce((sum, l) => sum + (l.quantity_tonnes_co2 || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50" data-testid="carbon-submissions-page">
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => navigate('/cooperative/dashboard')} data-testid="back-to-dashboard">
                <ArrowLeft className="h-4 w-4 mr-1" /> Retour
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Mes Soumissions Carbone</h1>
                <p className="text-sm text-gray-500">Suivez vos declarations de tonnage carbone</p>
              </div>
            </div>
            <Button
              onClick={() => navigate('/cooperative/carbon-submit')}
              className="bg-emerald-600 hover:bg-emerald-700"
              data-testid="new-carbon-submission-btn"
            >
              <Plus className="h-4 w-4 mr-2" /> Nouvelle Soumission
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Send className="h-5 w-5 mx-auto mb-1 text-blue-600" />
              <p className="text-2xl font-bold">{listings.length}</p>
              <p className="text-xs text-gray-500">Total soumissions</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="h-5 w-5 mx-auto mb-1 text-amber-600" />
              <p className="text-2xl font-bold">{pendingCount}</p>
              <p className="text-xs text-gray-500">En attente</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Check className="h-5 w-5 mx-auto mb-1 text-emerald-600" />
              <p className="text-2xl font-bold">{approvedCount}</p>
              <p className="text-xs text-gray-500">Approuvees</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-5 w-5 mx-auto mb-1 text-teal-600" />
              <p className="text-2xl font-bold">{totalTonnes.toFixed(0)}</p>
              <p className="text-xs text-gray-500">Tonnes CO2 total</p>
            </CardContent>
          </Card>
        </div>

        {/* Listings */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Chargement...</div>
        ) : listings.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Leaf className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune soumission</h3>
              <p className="text-gray-500 mb-4">Commencez par declarer votre tonnage carbone</p>
              <Button onClick={() => navigate('/cooperative/carbon-submit')} className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4 mr-2" /> Soumettre des credits carbone
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {listings.map((listing) => {
              const statusCfg = STATUS_CONFIG[listing.status] || STATUS_CONFIG.pending_approval;
              const StatusIcon = statusCfg.icon;
              return (
                <Card key={listing.listing_id} data-testid={`listing-${listing.listing_id}`}>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">{listing.project_name}</h3>
                          <Badge variant="outline" className={statusCfg.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusCfg.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500 mb-2">{listing.project_description}</p>
                        <div className="flex flex-wrap gap-3 text-sm">
                          <span className="text-gray-600">
                            <Leaf className="h-3 w-3 inline mr-1" />
                            {listing.quantity_tonnes_co2} t CO2
                          </span>
                          <span className="text-gray-600">{listing.credit_type}</span>
                          <span className="text-gray-600">{listing.verification_standard}</span>
                          {listing.department && <span className="text-gray-600">{listing.department}</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        {listing.status === 'approved' ? (
                          <div>
                            <p className="text-lg font-bold text-emerald-700">Approuve</p>
                            <p className="text-xs text-gray-500">Credit publie sur le marche</p>
                            {listing.price_per_tonne > 0 && (
                              <p className="text-xs text-emerald-600 mt-1">
                                Prix: {listing.price_per_tonne?.toLocaleString()} XOF/t
                              </p>
                            )}
                            {listing.quantity_sold > 0 && (
                              <p className="text-xs text-blue-600 mt-1">
                                Vendu: {listing.quantity_sold}/{listing.quantity_tonnes_co2} t
                              </p>
                            )}
                            {listing.revenue_generated > 0 && (
                              <p className="text-xs font-bold text-green-700 mt-1">
                                Revenus: {listing.revenue_generated?.toLocaleString()} XOF
                              </p>
                            )}
                            {listing.approved_at && (
                              <p className="text-xs text-gray-400 mt-1">
                                Approuve le {new Date(listing.approved_at).toLocaleDateString('fr-FR')}
                              </p>
                            )}
                          </div>
                        ) : listing.status === 'pending_approval' ? (
                          <p className="text-sm text-amber-600">En cours de verification</p>
                        ) : (
                          <div>
                            <p className="text-sm text-red-600">Soumission rejetee</p>
                            {listing.admin_note && (
                              <p className="text-xs text-red-500 mt-1">Motif: {listing.admin_note}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Info box */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <h4 className="font-medium text-blue-900 mb-2">Comment fonctionne le processus ?</h4>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Vous soumettez votre tonnage carbone avec les details du projet</li>
              <li>Le Super Admin verifie les informations</li>
              <li>Une fois approuve, le credit est publie sur le Marche Carbone</li>
              <li>Les entreprises RSE achetent les credits</li>
              <li>Votre prime est calculee et distribuee</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CarbonSubmissionsPage;

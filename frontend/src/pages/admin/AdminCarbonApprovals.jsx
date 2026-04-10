import { tokenService } from "../../services/tokenService";
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft, Leaf, Check, X, Clock, Shield,
  TreePine, MapPin, Users, Award, FileText,
  RefreshCw, ChevronDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Textarea } from '../../components/ui/textarea';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '../../components/ui/dialog';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const STATUS_CONFIG = {
  pending_approval: { label: 'En attente', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: Clock },
  approved: { label: 'Approuvé', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: Check },
  rejected: { label: 'Rejeté', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: X },
};

const AdminCarbonApprovals = () => {
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending_approval');
  const [selectedListing, setSelectedListing] = useState(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewAction, setReviewAction] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [pricePerTonne, setPricePerTonne] = useState('');
  const [processing, setProcessing] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchListings();
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const fetchListings = async () => {
    try {
      setLoading(true);
      const token = tokenService.getToken();
      const endpoint = filter === 'pending_approval'
        ? `${API_URL}/api/carbon-listings/pending`
        : `${API_URL}/api/carbon-listings/all?status=${filter}`;
      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setListings(response.data);
    } catch (error) {
      /* error logged */
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = tokenService.getToken();
      const response = await axios.get(`${API_URL}/api/carbon-listings/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      /* error logged */
    }
  };

  const handleReview = async () => {
    if (!selectedListing || !reviewAction) return;
    if (reviewAction === 'approve' && (!pricePerTonne || parseFloat(pricePerTonne) <= 0)) {
      toast.error('Veuillez fixer le prix par tonne pour approuver');
      return;
    }
    setProcessing(true);
    try {
      const token = tokenService.getToken();
      const body = { action: reviewAction, admin_note: adminNote };
      if (reviewAction === 'approve') {
        body.price_per_tonne = parseFloat(pricePerTonne);
      }
      await axios.put(
        `${API_URL}/api/carbon-listings/${selectedListing.listing_id}/review`,
        body,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(reviewAction === 'approve' ? 'Crédits approuvés et publiés' : 'Soumission rejetée');
      setShowReviewDialog(false);
      setAdminNote('');
      setPricePerTonne('');
      setSelectedListing(null);
      fetchListings();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    } finally {
      setProcessing(false);
    }
  };

  const openReview = (listing, action) => {
    setSelectedListing(listing);
    setReviewAction(action);
    setAdminNote('');
    setPricePerTonne(listing.suggested_price_per_tonne?.toString() || listing.price_per_tonne?.toString() || '15000');
    setShowReviewDialog(true);
  };

  const formatNumber = (n) => new Intl.NumberFormat('fr-FR').format(n || 0);

  return (
    <div className="min-h-screen bg-slate-900" data-testid="admin-carbon-approvals">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-900/40 via-slate-900 to-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/admin/analytics')}
            className="text-slate-400 hover:text-white mb-4"
            data-testid="back-to-admin"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour Dashboard Admin
          </Button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Shield className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                Approbation Crédits Carbone
              </h1>
              <p className="text-slate-400">
                Examinez et validez les soumissions des coopératives
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="bg-amber-900/20 border-amber-700/30 p-4">
              <div className="flex items-center gap-3">
                <Clock className="h-6 w-6 text-amber-400" />
                <div>
                  <p className="text-2xl font-bold text-amber-400">{stats.pending}</p>
                  <p className="text-xs text-slate-400">En attente</p>
                </div>
              </div>
            </Card>
            <Card className="bg-emerald-900/20 border-emerald-700/30 p-4">
              <div className="flex items-center gap-3">
                <Check className="h-6 w-6 text-emerald-400" />
                <div>
                  <p className="text-2xl font-bold text-emerald-400">{stats.approved}</p>
                  <p className="text-xs text-slate-400">Approuvés</p>
                </div>
              </div>
            </Card>
            <Card className="bg-red-900/20 border-red-700/30 p-4">
              <div className="flex items-center gap-3">
                <X className="h-6 w-6 text-red-400" />
                <div>
                  <p className="text-2xl font-bold text-red-400">{stats.rejected}</p>
                  <p className="text-xs text-slate-400">Rejetés</p>
                </div>
              </div>
            </Card>
            <Card className="bg-teal-900/20 border-teal-700/30 p-4">
              <div className="flex items-center gap-3">
                <Leaf className="h-6 w-6 text-teal-400" />
                <div>
                  <p className="text-2xl font-bold text-teal-400">{formatNumber(stats.total_tonnes_approved)}</p>
                  <p className="text-xs text-slate-400">Tonnes CO2</p>
                </div>
              </div>
            </Card>
            <Card className="bg-blue-900/20 border-blue-700/30 p-4">
              <div className="flex items-center gap-3">
                <Award className="h-6 w-6 text-blue-400" />
                <div>
                  <p className="text-2xl font-bold text-blue-400">{formatNumber(stats.total_value_approved)}</p>
                  <p className="text-xs text-slate-400">XOF Total</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex gap-2">
          {[
            { value: 'pending_approval', label: 'En attente', icon: Clock },
            { value: 'approved', label: 'Approuvés', icon: Check },
            { value: 'rejected', label: 'Rejetés', icon: X },
          ].map((f) => (
            <Button
              key={f.value}
              variant={filter === f.value ? 'default' : 'outline'}
              onClick={() => setFilter(f.value)}
              className={filter === f.value
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'border-slate-700 text-slate-300'}
              data-testid={`filter-${f.value}`}
            >
              <f.icon className="h-4 w-4 mr-2" />
              {f.label}
            </Button>
          ))}
          <Button variant="outline" onClick={fetchListings} className="border-slate-700 ml-auto">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Listings */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500 mx-auto" />
            <p className="mt-4 text-slate-400">Chargement...</p>
          </div>
        ) : listings.length === 0 ? (
          <Card className="bg-slate-800 border-slate-700 p-12 text-center">
            <Leaf className="h-16 w-16 text-slate-600 mx-auto mb-4" />
            <p className="text-xl text-slate-400">Aucune soumission {filter === 'pending_approval' ? 'en attente' : ''}</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {listings.map((listing) => {
              const statusConf = STATUS_CONFIG[listing.status] || STATUS_CONFIG.pending_approval;
              return (
                <Card key={listing.listing_id} className="bg-slate-800 border-slate-700" data-testid={`listing-${listing.listing_id}`}>
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge className={statusConf.color}>{statusConf.label}</Badge>
                          <Badge className="bg-slate-700 text-slate-300">{listing.verification_standard}</Badge>
                          <Badge className="bg-slate-700 text-slate-300">{listing.credit_type}</Badge>
                        </div>
                        <h3 className="text-lg font-bold text-white mb-1">{listing.project_name}</h3>
                        <p className="text-sm text-slate-400 line-clamp-2 mb-3">{listing.project_description}</p>
                        <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {listing.submitter_name}
                          </span>
                          {listing.region && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {listing.department || listing.region}
                            </span>
                          )}
                          {listing.farmers_involved && (
                            <span className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {listing.farmers_involved} producteurs
                            </span>
                          )}
                          {listing.area_hectares && (
                            <span className="flex items-center gap-1">
                              <TreePine className="h-4 w-4" />
                              {listing.area_hectares} ha
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-3xl font-bold text-emerald-400">
                          {formatNumber(listing.quantity_tonnes_co2)} t
                        </p>
                        <p className="text-sm text-slate-400">CO2</p>
                        {listing.price_per_tonne ? (
                          <>
                            <p className="text-lg font-semibold text-white mt-1">
                              {formatNumber(listing.price_per_tonne)} XOF/t
                            </p>
                            <p className="text-xs text-slate-500">
                              Total: {formatNumber(listing.quantity_tonnes_co2 * listing.price_per_tonne)} XOF
                            </p>
                            {listing.premium_distribution && (
                              <div className="mt-2 text-xs space-y-0.5">
                                <p className="text-emerald-400">Agriculteurs: {formatNumber(listing.premium_distribution.farmer_premium)} XOF</p>
                                <p className="text-blue-400">GreenLink: {formatNumber(listing.premium_distribution.greenlink_revenue)} XOF</p>
                                <p className="text-amber-400">Coopérative: {formatNumber(listing.premium_distribution.coop_commission)} XOF</p>
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="text-sm text-amber-400 mt-1 font-medium">Prix à fixer</p>
                        )}
                        {listing.status === 'pending_approval' && (
                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700"
                              onClick={() => openReview(listing, 'approve')}
                              data-testid={`approve-${listing.listing_id}`}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Approuver
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-600 text-red-400 hover:bg-red-600/20"
                              onClick={() => openReview(listing, 'reject')}
                              data-testid={`reject-${listing.listing_id}`}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Rejeter
                            </Button>
                          </div>
                        )}
                        {listing.admin_note && (
                          <p className="text-xs text-slate-500 mt-2 italic">Note: {listing.admin_note}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {reviewAction === 'approve' ? (
                <><Check className="h-5 w-5 text-emerald-500" /> Approuver les crédits</>
              ) : (
                <><X className="h-5 w-5 text-red-500" /> Rejeter la soumission</>
              )}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {selectedListing?.project_name} — {formatNumber(selectedListing?.quantity_tonnes_co2)} t CO2
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {reviewAction === 'approve' && (
              <div>
                <Label className="text-slate-300 font-medium">Prix par tonne (XOF) *</Label>
                <Input
                  type="number"
                  value={pricePerTonne}
                  onChange={(e) => setPricePerTonne(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white mt-2 text-lg"
                  placeholder="15000"
                  data-testid="price-per-tonne-input"
                />
                {pricePerTonne && parseFloat(pricePerTonne) > 0 && selectedListing && (
                  <div className="mt-3 p-3 rounded-lg bg-slate-700/50 border border-slate-600 space-y-2">
                    <p className="text-sm text-slate-300 font-medium">Répartition des revenus :</p>
                    {(() => {
                      const total = parseFloat(pricePerTonne) * selectedListing.quantity_tonnes_co2;
                      const fees = total * 0.30;
                      const net = total - fees;
                      return (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Total vente</span>
                            <span className="text-white font-bold">{formatNumber(total)} XOF</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-red-400">Frais 30%</span>
                            <span className="text-red-400">-{formatNumber(fees)} XOF</span>
                          </div>
                          <hr className="border-slate-600" />
                          <div className="flex justify-between text-sm">
                            <span className="text-emerald-400">Agriculteurs (70%)</span>
                            <span className="text-emerald-400 font-bold">{formatNumber(net * 0.70)} XOF</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-blue-400">GreenLink (25%)</span>
                            <span className="text-blue-400">{formatNumber(net * 0.25)} XOF</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-amber-400">Coopérative (5%)</span>
                            <span className="text-amber-400">{formatNumber(net * 0.05)} XOF</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
            <div>
              <Label className="text-slate-300">Note pour le soumetteur (optionnel)</Label>
              <Textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white mt-2"
                placeholder={reviewAction === 'approve'
                  ? 'Bravo, projet conforme aux standards...'
                  : 'Raison du rejet, documents manquants...'}
                rows={3}
                data-testid="admin-note-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewDialog(false)} className="border-slate-600">
              Annuler
            </Button>
            <Button
              onClick={handleReview}
              disabled={processing}
              data-testid="confirm-review-btn"
              className={reviewAction === 'approve'
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-red-600 hover:bg-red-700'}
            >
              {processing ? 'Traitement...' : (reviewAction === 'approve' ? 'Confirmer Approbation' : 'Confirmer Rejet')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCarbonApprovals;

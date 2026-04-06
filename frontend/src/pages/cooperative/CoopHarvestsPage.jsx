import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, Clock, CheckCircle2, XCircle, Loader2, User, Calendar, Scale, AlertTriangle, Check, X } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import Navbar from '../../components/Navbar';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : {};
};

const STATUS_CONFIG = {
  en_attente: { label: 'En attente', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock, dot: 'bg-amber-500' },
  validee: { label: 'Validee', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2, dot: 'bg-emerald-500' },
  rejetee: { label: 'Rejetee', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle, dot: 'bg-red-500' },
};

const CoopHarvestsPage = () => {
  const navigate = useNavigate();
  const [harvests, setHarvests] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchHarvests = async () => {
    try {
      const params = filter !== 'all' ? `?statut=${filter}` : '';
      const res = await fetch(`${API_URL}/api/cooperative/harvests${params}`, { headers: getAuthHeader() });
      if (res.ok) {
        const data = await res.json();
        setHarvests(data.harvests || []);
        setStats(data.stats || {});
      }
    } catch { toast.error('Erreur de chargement'); }
    finally { setLoading(false); }
  };

  useEffect(() => { setLoading(true); fetchHarvests(); }, [filter]);

  const handleValidate = async (harvestId) => {
    setActionLoading(harvestId);
    try {
      const res = await fetch(`${API_URL}/api/cooperative/harvests/${harvestId}/validate`, {
        method: 'PUT', headers: getAuthHeader()
      });
      if (res.ok) {
        toast.success('Recolte validee avec succes');
        fetchHarvests();
      } else {
        const err = await res.json();
        toast.error(err.detail || 'Erreur de validation');
      }
    } catch { toast.error('Erreur de connexion'); }
    finally { setActionLoading(null); }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setActionLoading(rejectModal);
    try {
      const res = await fetch(`${API_URL}/api/cooperative/harvests/${rejectModal}/reject`, {
        method: 'PUT', headers: getAuthHeader(),
        body: JSON.stringify({ reason: rejectReason })
      });
      if (res.ok) {
        toast.success('Recolte rejetee');
        setRejectModal(null);
        setRejectReason('');
        fetchHarvests();
      } else {
        const err = await res.json();
        toast.error(err.detail || 'Erreur');
      }
    } catch { toast.error('Erreur de connexion'); }
    finally { setActionLoading(null); }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/cooperative/dashboard')} data-testid="back-btn">
            <ArrowLeft className="h-4 w-4 mr-1" />Retour
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900" data-testid="page-title">Gestion des Recoltes</h1>
            <p className="text-sm text-gray-500">Validez ou rejetez les declarations des planteurs</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-700">{stats.total || 0}</p>
            <p className="text-xs text-gray-500">Total</p>
          </CardContent></Card>
          <Card className="border-amber-200"><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{stats.en_attente || 0}</p>
            <p className="text-xs text-gray-500">En attente</p>
          </CardContent></Card>
          <Card className="border-emerald-200"><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{stats.validees || 0}</p>
            <p className="text-xs text-gray-500">Validees ({((stats.total_kg_valide || 0) / 1000).toFixed(1)}t)</p>
          </CardContent></Card>
          <Card className="border-red-200"><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.rejetees || 0}</p>
            <p className="text-xs text-gray-500">Rejetees</p>
          </CardContent></Card>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {[
            { value: 'all', label: 'Toutes' },
            { value: 'en_attente', label: `En attente (${stats.en_attente || 0})` },
            { value: 'validee', label: 'Validees' },
            { value: 'rejetee', label: 'Rejetees' },
          ].map(f => (
            <Button key={f.value} variant={filter === f.value ? 'default' : 'outline'} size="sm"
              onClick={() => setFilter(f.value)} data-testid={`filter-${f.value}`}>
              {f.label}
            </Button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          </div>
        ) : harvests.length === 0 ? (
          <Card><CardContent className="py-12 text-center">
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Aucune recolte {filter !== 'all' ? 'dans ce filtre' : ''}</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-3">
            {harvests.map((h) => {
              const status = STATUS_CONFIG[h.statut] || STATUS_CONFIG.en_attente;
              const StatusIcon = status.icon;
              const isPending = h.statut === 'en_attente';

              return (
                <Card key={h.id} className={isPending ? 'border-l-4 border-l-amber-400' : ''} data-testid={`harvest-${h.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-gray-900">{h.quantity_display || `${h.quantity_kg} kg`}</span>
                          <Badge className={`${status.color} text-xs border`} data-testid={`status-${h.id}`}>
                            <StatusIcon className="h-3 w-3 mr-1" />{status.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1"><User className="h-3 w-3" />{h.farmer_name || 'Inconnu'}</span>
                          <span className="flex items-center gap-1"><Scale className="h-3 w-3" />Qualite: {h.quality_grade || '-'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(h.created_at)}</span>
                          {h.notes && <span className="truncate max-w-[200px]">Note: {h.notes}</span>}
                        </div>
                        {h.rejection_reason && (
                          <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />Motif: {h.rejection_reason}
                          </p>
                        )}
                      </div>
                      {h.total_amount > 0 && (
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-emerald-700">{h.total_amount.toLocaleString()} XOF</p>
                        </div>
                      )}
                    </div>

                    {/* Action buttons for pending harvests */}
                    {isPending && (
                      <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                        <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-9"
                          onClick={() => handleValidate(h.id)}
                          disabled={actionLoading === h.id}
                          data-testid={`validate-${h.id}`}>
                          {actionLoading === h.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                          Valider
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 h-9 text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => setRejectModal(h.id)}
                          disabled={actionLoading === h.id}
                          data-testid={`reject-btn-${h.id}`}>
                          <X className="h-3.5 w-3.5 mr-1" />Rejeter
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" data-testid="reject-modal">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Rejeter la recolte</h3>
            <p className="text-sm text-gray-500 mb-4">Indiquez le motif du rejet (optionnel)</p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Ex: Quantite insuffisante, qualite non conforme..."
              className="w-full border border-gray-200 rounded-xl p-3 text-sm h-24 resize-none focus:border-red-400 focus:ring-1 focus:ring-red-400 outline-none"
              data-testid="reject-reason-input"
            />
            <div className="flex gap-3 mt-4">
              <Button variant="outline" className="flex-1" onClick={() => { setRejectModal(null); setRejectReason(''); }} data-testid="cancel-reject">
                Annuler
              </Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={handleReject}
                disabled={actionLoading === rejectModal} data-testid="confirm-reject">
                {actionLoading === rejectModal ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <XCircle className="h-4 w-4 mr-1" />}
                Confirmer le rejet
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoopHarvestsPage;

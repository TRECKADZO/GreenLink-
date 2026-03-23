import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, Filter, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import Navbar from '../../components/Navbar';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const STATUS_MAP = {
  en_attente: { label: 'En attente', color: 'bg-amber-100 text-amber-700', icon: Clock },
  validee: { label: 'Validee', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  rejetee: { label: 'Rejetee', color: 'bg-red-100 text-red-700', icon: XCircle },
};

const MyHarvestsPage = () => {
  const navigate = useNavigate();
  const [harvests, setHarvests] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchHarvests();
  }, [filter]);

  const fetchHarvests = async () => {
    try {
      const params = filter !== 'all' ? `?statut=${filter}` : '';
      const res = await fetch(`${API_URL}/api/greenlink/harvests/my-harvests${params}`, {
        headers: getAuthHeader(),
      });
      const data = await res.json();
      setHarvests(data.harvests || []);
      setStats(data.stats || {});
    } catch (err) {
      toast.error('Erreur lors du chargement des recoltes');
    } finally {
      setLoading(false);
    }
  };

  const filteredHarvests = harvests;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/farmer/dashboard')} data-testid="back-btn">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Retour
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Mes Recoltes</h1>
            <p className="text-sm text-gray-500">{harvests.length} declaration(s)</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-amber-600">{stats.en_attente || 0}</p>
              <p className="text-xs text-gray-500">En attente</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.validees || 0}</p>
              <p className="text-xs text-gray-500">Validees</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{stats.rejetees || 0}</p>
              <p className="text-xs text-gray-500">Rejetees</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {[
            { value: 'all', label: 'Toutes' },
            { value: 'en_attente', label: 'En attente' },
            { value: 'validee', label: 'Validees' },
            { value: 'rejetee', label: 'Rejetees' },
          ].map(f => (
            <Button
              key={f.value}
              variant={filter === f.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setFilter(f.value); setLoading(true); }}
              data-testid={`filter-${f.value}`}
            >
              {f.label}
            </Button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          </div>
        ) : filteredHarvests.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Aucune recolte trouvee</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredHarvests.map((h, idx) => {
              const status = STATUS_MAP[h.statut] || STATUS_MAP.en_attente;
              const StatusIcon = status.icon;
              return (
                <Card key={h.id || idx} data-testid={`harvest-${idx}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-900">
                            {h.quantity_display || `${h.quantity_kg} kg`}
                          </span>
                          <Badge className={`${status.color} text-xs`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {status.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          Qualite: {h.quality_grade || 'Non renseigne'} | Parcelle: {h.parcel_name || h.parcel_id || '-'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {h.created_at ? new Date(h.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                        </p>
                      </div>
                      {h.price_per_kg > 0 && (
                        <div className="text-right">
                          <p className="text-sm font-bold text-green-700">{(h.price_per_kg * h.quantity_kg).toLocaleString()} XOF</p>
                          <p className="text-xs text-gray-400">{h.price_per_kg} XOF/kg</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyHarvestsPage;

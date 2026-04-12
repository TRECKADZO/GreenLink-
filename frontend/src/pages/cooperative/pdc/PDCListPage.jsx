import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { tokenService } from '../../../services/tokenService';
import { useAuth } from '../../../context/AuthContext';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { toast } from 'sonner';
import {
  FileText, Plus, Search, ArrowLeft, Loader2,
  CheckCircle2, Clock, PenLine, Eye, Trash2, ChevronRight, Users
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const getToken = () => tokenService.getToken();
const authHeaders = () => ({ 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' });

const STATUS_MAP = {
  brouillon: { label: 'Brouillon', color: 'bg-gray-100 text-gray-700' },
  etape1_en_cours: { label: 'Etape 1 en cours', color: 'bg-blue-50 text-blue-700' },
  etape1_complete: { label: 'Etape 1 terminee', color: 'bg-blue-100 text-blue-800' },
  etape2_en_cours: { label: 'Etape 2 en cours', color: 'bg-amber-50 text-amber-700' },
  etape2_complete: { label: 'Etape 2 terminee', color: 'bg-amber-100 text-amber-800' },
  etape3_en_cours: { label: 'Etape 3 en cours', color: 'bg-purple-50 text-purple-700' },
  valide: { label: 'Valide', color: 'bg-[#E8F0EA] text-[#1A3622]' },
};

const PDCListPage = ({ onBack }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [pdcs, setPdcs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState('');
  const [creating, setCreating] = useState(false);

  const userType = user?.user_type || '';
  const isReadOnly = ['farmer', 'planteur', 'producteur'].includes(userType);

  // Support farmer_id from URL (agent terrain flow)
  const urlFarmerId = searchParams.get('farmer_id');

  const loadPdcs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: '1', limit: '50' });
      if (search) params.set('search', search);
      const res = await fetch(`${API_URL}/api/pdc-v2/list?${params}`, { headers: authHeaders() });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPdcs(data.pdcs || []);
    } catch {
      toast.error('Erreur lors du chargement des PDC');
    } finally {
      setLoading(false);
    }
  }, [search]);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/pdc-v2/stats/overview`, { headers: authHeaders() });
      if (res.ok) setStats(await res.json());
    } catch { /* ignore */ }
  }, []);

  const loadMembers = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/pdc-v2/members/available`, { headers: authHeaders() });
      if (res.ok) setMembers(await res.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadPdcs(); loadStats(); }, [loadPdcs, loadStats]);

  // Auto-open create panel and pre-select farmer when farmer_id is in URL
  useEffect(() => {
    if (urlFarmerId && !isReadOnly) {
      loadMembers().then(() => {
        setSelectedMember(urlFarmerId);
        setShowCreate(true);
      });
    }
  }, [urlFarmerId, isReadOnly, loadMembers]);

  const handleCreate = async () => {
    if (!selectedMember) { toast.error('Selectionnez un planteur'); return; }
    setCreating(true);
    try {
      const res = await fetch(`${API_URL}/api/pdc-v2`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ farmer_id: selectedMember }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Erreur lors de la creation');
      }
      toast.success('PDC cree avec succes');
      navigate(`/cooperative/pdc-v2/${data.id}`);
    } catch (e) {
      toast.error(e.message || 'Erreur lors de la creation');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (pdcId) => {
    if (!window.confirm('Supprimer ce PDC ?')) return;
    try {
      const res = await fetch(`${API_URL}/api/pdc-v2/${pdcId}`, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Erreur');
      }
      toast.success('PDC supprime');
      loadPdcs();
      loadStats();
    } catch (e) {
      toast.error(e.message || 'Erreur');
    }
  };

  const getStatusInfo = (statut) => STATUS_MAP[statut] || { label: statut, color: 'bg-gray-100 text-gray-700' };

  return (
    <div className="space-y-5" data-testid="pdc-v2-list">
      {onBack && (
        <Button variant="ghost" size="sm" onClick={onBack} className="text-[#6B7280] hover:text-[#1A3622]" data-testid="pdc-back-btn">
          <ArrowLeft className="w-4 h-4 mr-1" /> Retour ARS 1000
        </Button>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[#1A3622]" data-testid="pdc-title">Plans de Developpement (PDC v2)</h2>
        {!isReadOnly && (
          <Button
            size="sm"
            className="bg-[#1A3622] hover:bg-[#112417] text-white"
            onClick={() => { setShowCreate(!showCreate); if (!showCreate) loadMembers(); }}
            data-testid="pdc-create-btn"
          >
            <Plus className="w-4 h-4 mr-1" /> Nouveau PDC
          </Button>
        )}
      </div>

      {/* Stats */}
      {stats && !isReadOnly && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3" data-testid="pdc-stats">
          {[
            { label: 'Total', value: stats.total, color: 'text-[#1A3622]' },
            { label: 'Brouillons', value: stats.brouillons, color: 'text-gray-600' },
            { label: 'Etape 1', value: stats.etape1_complete, color: 'text-blue-600' },
            { label: 'Etape 2', value: stats.etape2_en_cours, color: 'text-amber-600' },
            { label: 'Etape 3', value: stats.etape3_en_cours, color: 'text-purple-600' },
            { label: 'Valides', value: stats.valides, color: 'text-green-700' },
          ].map((s, i) => (
            <div key={`stat-${i}`} className="bg-white border border-[#E5E5E0] rounded-md p-3">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-[#6B7280]">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="bg-white border border-[#E5E5E0] rounded-md p-5 space-y-3" data-testid="pdc-create-form">
          <h3 className="text-sm font-semibold text-[#1A3622] flex items-center gap-2">
            <Users className="w-4 h-4" /> Selectionner un planteur
          </h3>
          {members.length === 0 ? (
            <p className="text-xs text-[#6B7280]">Aucun planteur disponible (tous ont deja un PDC actif)</p>
          ) : (
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <select
                  value={selectedMember}
                  onChange={e => setSelectedMember(e.target.value)}
                  className="w-full border border-[#E5E5E0] rounded-md px-3 py-2 text-sm bg-white focus:ring-1 focus:ring-[#1A3622] outline-none"
                  data-testid="pdc-select-member"
                >
                  <option value="">-- Choisir un planteur --</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.full_name} {m.village ? `(${m.village})` : ''}</option>
                  ))}
                </select>
              </div>
              <Button size="sm" className="bg-[#1A3622] hover:bg-[#112417] text-white" onClick={handleCreate} disabled={creating} data-testid="pdc-confirm-create">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Creer le PDC'}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
        <Input
          placeholder="Rechercher par nom..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 border-[#E5E5E0] h-9"
          data-testid="pdc-search"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin w-8 h-8 text-[#1A3622]" /></div>
      ) : pdcs.length === 0 ? (
        <div className="bg-white border border-[#E5E5E0] rounded-md p-12 text-center">
          <FileText className="w-10 h-10 text-[#E5E5E0] mx-auto mb-3" />
          <p className="text-sm text-[#6B7280]">Aucun PDC trouve</p>
        </div>
      ) : (
        <div className="space-y-2">
          {pdcs.map(pdc => {
            const st = getStatusInfo(pdc.statut);
            return (
              <div
                key={pdc.id}
                className="bg-white border border-[#E5E5E0] rounded-md p-4 flex items-center justify-between hover:bg-[#FAF9F6] cursor-pointer transition-colors"
                onClick={() => navigate(`/cooperative/pdc-v2/${pdc.id}`)}
                data-testid={`pdc-item-${pdc.id}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm text-[#111827] truncate">{pdc.farmer_name || 'Planteur'}</p>
                    <Badge className={`text-xs ${st.color}`}>{st.label}</Badge>
                  </div>
                  <p className="text-xs text-[#6B7280]">
                    Etape {pdc.current_step}/3
                    {pdc.statut === 'valide' && pdc.validated_by_name && ` - Valide par ${pdc.validated_by_name}`}
                    {' - '}Mis a jour: {new Date(pdc.updated_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  {pdc.statut === 'valide' ? (
                    <CheckCircle2 className="w-5 h-5 text-[#1A3622]" />
                  ) : (
                    <Clock className="w-5 h-5 text-[#6B7280]" />
                  )}
                  {!isReadOnly && pdc.statut !== 'valide' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-400 hover:text-red-600"
                      onClick={e => { e.stopPropagation(); handleDelete(pdc.id); }}
                      data-testid={`pdc-delete-${pdc.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                  <ChevronRight className="w-4 h-4 text-[#6B7280]" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PDCListPage;

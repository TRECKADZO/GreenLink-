import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tokenService } from '../../../services/tokenService';
import { toast } from 'sonner';
import {
  Package, Plus, Search, Filter, ChevronRight, Home,
  Loader2, CheckCircle2, XCircle, Clock, ArrowRight,
  Eye, QrCode
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const ETAPE_LABELS = {
  recolte: 'Recolte',
  fermentation: 'Fermentation',
  sechage: 'Sechage',
  stockage_coop: 'Stockage Coop',
  conditionnement: 'Conditionnement',
  transport: 'Transport',
  export: 'Export',
};

const ETAPE_COLORS = {
  recolte: 'bg-emerald-100 text-emerald-800',
  fermentation: 'bg-amber-100 text-amber-800',
  sechage: 'bg-orange-100 text-orange-800',
  stockage_coop: 'bg-blue-100 text-blue-800',
  conditionnement: 'bg-purple-100 text-purple-800',
  transport: 'bg-indigo-100 text-indigo-800',
  export: 'bg-[#E8F0EA] text-[#1A3622]',
};

const CacaoFlowPage = () => {
  const navigate = useNavigate();
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [filterEtape, setFilterEtape] = useState('');
  const [filterCertifie, setFilterCertifie] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedLot, setSelectedLot] = useState(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [showTimeline, setShowTimeline] = useState(null);

  useEffect(() => { loadLots(); }, [search, filterEtape, filterCertifie]);

  const loadLots = async () => {
    try {
      const token = tokenService.getToken();
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filterEtape) params.append('etape', filterEtape);
      if (filterCertifie) params.append('certifie', filterCertifie);
      const res = await fetch(`${API}/api/traceability/lots?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erreur');
      const json = await res.json();
      setLots(json.lots || []);
      setTotal(json.total || 0);
    } catch {
      toast.error('Erreur chargement des lots');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLot = async (formData) => {
    try {
      const token = tokenService.getToken();
      const res = await fetch(`${API}/api/traceability/lots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Erreur');
      toast.success('Lot cree avec succes');
      setShowCreateForm(false);
      loadLots();
    } catch {
      toast.error('Erreur creation du lot');
    }
  };

  const handleAddEvent = async (lotCode, eventData) => {
    try {
      const token = tokenService.getToken();
      const res = await fetch(`${API}/api/traceability/lots/${lotCode}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(eventData),
      });
      if (!res.ok) throw new Error('Erreur');
      toast.success('Evenement ajoute');
      setShowEventForm(false);
      setSelectedLot(null);
      loadLots();
    } catch {
      toast.error('Erreur ajout evenement');
    }
  };

  const loadTimeline = async (lotCode) => {
    try {
      const token = tokenService.getToken();
      const res = await fetch(`${API}/api/traceability/lots/${lotCode}/timeline`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erreur');
      const json = await res.json();
      setShowTimeline(json);
    } catch {
      toast.error('Erreur chargement timeline');
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6]" data-testid="cacao-flow-page">
      {/* Header */}
      <div className="bg-[#1A3622] relative overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-6 relative">
          <div className="flex items-center gap-2 text-white/50 text-xs mb-3">
            <button onClick={() => navigate('/cooperative/dashboard')} className="hover:text-white"><Home className="h-3.5 w-3.5" /></button>
            <ChevronRight className="h-3 w-3" />
            <button onClick={() => navigate('/cooperative/traceability')} className="hover:text-white">Tracabilite</button>
            <ChevronRight className="h-3 w-3" />
            <span className="text-white/80">Flux du Cacao</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Flux du Cacao</h1>
              <p className="text-sm text-white/60 mt-1">Suivi etape par etape de chaque lot</p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white text-[#1A3622] rounded-md text-sm font-medium hover:bg-white/90 transition-colors"
              data-testid="btn-create-lot"
            >
              <Plus className="h-4 w-4" strokeWidth={2} />
              Nouveau Lot
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-8">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6" data-testid="filters-bar">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher lot, producteur..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-[#E5E5E0] rounded-md bg-white focus:outline-none focus:border-[#1A3622]"
              data-testid="search-input"
            />
          </div>
          <select
            value={filterEtape}
            onChange={(e) => setFilterEtape(e.target.value)}
            className="px-3 py-2 text-sm border border-[#E5E5E0] rounded-md bg-white"
            data-testid="filter-etape"
          >
            <option value="">Toutes les etapes</option>
            {Object.entries(ETAPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select
            value={filterCertifie}
            onChange={(e) => setFilterCertifie(e.target.value)}
            className="px-3 py-2 text-sm border border-[#E5E5E0] rounded-md bg-white"
            data-testid="filter-certifie"
          >
            <option value="">Tous</option>
            <option value="true">Certifie ARS</option>
            <option value="false">Non certifie</option>
          </select>
          <span className="text-xs text-[#6B7280]">{total} lot(s)</span>
        </div>

        {/* Lots Table */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-[#1A3622]" /></div>
        ) : lots.length === 0 ? (
          <div className="bg-white border border-[#E5E5E0] rounded-md p-12 text-center" data-testid="empty-state">
            <Package className="h-12 w-12 text-[#D4AF37] mx-auto mb-4" strokeWidth={1} />
            <h3 className="text-lg font-semibold text-[#1A3622] mb-2">Aucun lot enregistre</h3>
            <p className="text-sm text-[#6B7280] mb-4">Commencez par creer un lot a la source pour demarrer la tracabilite.</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#1A3622] text-white rounded-md text-sm font-medium hover:bg-[#112417]"
            >
              <Plus className="h-4 w-4" /> Creer mon premier lot
            </button>
          </div>
        ) : (
          <div className="bg-white border border-[#E5E5E0] rounded-md overflow-hidden" data-testid="lots-table">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E5E5E0] bg-[#F9FAFB]">
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Code Lot</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Producteur</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Quantite</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Etape</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Certifie</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Statut</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E0]">
                  {lots.map(lot => (
                    <tr key={lot.lot_code} className="hover:bg-[#F9FAFB] transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono font-medium text-[#1A3622]">{lot.lot_code}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-xs font-medium text-[#111827]">{lot.farmer_name || '-'}</p>
                          <p className="text-[10px] text-[#6B7280]">{lot.parcelle_name || ''}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#374151]">{(lot.quantite_actuelle_kg || 0).toLocaleString('fr-FR')} kg</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded ${ETAPE_COLORS[lot.etape_courante] || 'bg-gray-100 text-gray-800'}`}>
                          {ETAPE_LABELS[lot.etape_courante] || lot.etape_courante}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {lot.certifie_ars1000 ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-[#9CA3AF]" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={lot.statut_ars} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => loadTimeline(lot.lot_code)}
                            className="p-1.5 rounded hover:bg-[#E8F0EA] transition-colors"
                            title="Voir timeline"
                            data-testid={`btn-timeline-${lot.lot_code}`}
                          >
                            <Eye className="h-3.5 w-3.5 text-[#1A3622]" />
                          </button>
                          <button
                            onClick={() => { setSelectedLot(lot); setShowEventForm(true); }}
                            className="p-1.5 rounded hover:bg-[#E8F0EA] transition-colors"
                            title="Ajouter etape"
                            data-testid={`btn-add-event-${lot.lot_code}`}
                          >
                            <Plus className="h-3.5 w-3.5 text-[#1A3622]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create Lot Modal */}
      {showCreateForm && <CreateLotModal onSubmit={handleCreateLot} onClose={() => setShowCreateForm(false)} />}

      {/* Add Event Modal */}
      {showEventForm && selectedLot && (
        <AddEventModal lot={selectedLot} onSubmit={handleAddEvent} onClose={() => { setShowEventForm(false); setSelectedLot(null); }} />
      )}

      {/* Timeline Modal */}
      {showTimeline && <TimelineModal data={showTimeline} onClose={() => setShowTimeline(null)} />}
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const styles = {
    conforme: 'bg-[#E8F0EA] text-[#1A3622]',
    non_conforme: 'bg-red-50 text-red-800',
    en_cours: 'bg-amber-50 text-amber-800',
    en_attente: 'bg-gray-100 text-gray-600',
  };
  const labels = { conforme: 'Conforme', non_conforme: 'Non conforme', en_cours: 'En cours', en_attente: 'En attente' };
  return (
    <span className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded ${styles[status] || styles.en_attente}`}>
      {labels[status] || status}
    </span>
  );
};

const CreateLotModal = ({ onSubmit, onClose }) => {
  const [form, setForm] = useState({
    farmer_id: '', farmer_name: '', parcelle_id: '', parcelle_name: '',
    quantite_kg: '', date_recolte: new Date().toISOString().slice(0, 10),
    campagne: '2025-2026', certifie_ars1000: false, notes: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.farmer_name || !form.quantite_kg) {
      toast.error('Nom du producteur et quantite requis');
      return;
    }
    onSubmit({ ...form, farmer_id: form.farmer_id || form.farmer_name, quantite_kg: parseFloat(form.quantite_kg) });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-testid="create-lot-modal">
      <div className="bg-white rounded-md w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-[#E5E5E0] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#1A3622]">Nouveau lot a la source</h3>
          <button onClick={onClose} className="text-[#6B7280] hover:text-[#111827]">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <FormField label="Nom du producteur *" value={form.farmer_name} onChange={(v) => setForm({...form, farmer_name: v})} testid="input-farmer-name" />
          <FormField label="Parcelle" value={form.parcelle_name} onChange={(v) => setForm({...form, parcelle_name: v})} testid="input-parcelle" />
          <FormField label="Quantite (kg) *" value={form.quantite_kg} onChange={(v) => setForm({...form, quantite_kg: v})} type="number" testid="input-quantite" />
          <FormField label="Date de recolte" value={form.date_recolte} onChange={(v) => setForm({...form, date_recolte: v})} type="date" testid="input-date" />
          <FormField label="Campagne" value={form.campagne} onChange={(v) => setForm({...form, campagne: v})} testid="input-campagne" />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.certifie_ars1000}
              onChange={(e) => setForm({...form, certifie_ars1000: e.target.checked})}
              id="certif"
              className="rounded border-[#E5E5E0]"
              data-testid="checkbox-certifie"
            />
            <label htmlFor="certif" className="text-xs text-[#374151]">Certifie ARS 1000</label>
          </div>
          <FormField label="Notes" value={form.notes} onChange={(v) => setForm({...form, notes: v})} testid="input-notes" />
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm border border-[#E5E5E0] rounded-md hover:bg-[#F3F4F6]">
              Annuler
            </button>
            <button type="submit" className="flex-1 px-4 py-2 text-sm bg-[#1A3622] text-white rounded-md hover:bg-[#112417]" data-testid="btn-submit-lot">
              Creer le lot
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AddEventModal = ({ lot, onSubmit, onClose }) => {
  const [form, setForm] = useState({
    etape: '', date_evenement: new Date().toISOString().slice(0, 10),
    quantite_kg: lot.quantite_actuelle_kg || '', lieu: '', responsable: '',
    temperature: '', humidite: '', duree_heures: '',
    observations: '', conforme: true,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.etape) { toast.error('Etape requise'); return; }
    onSubmit(lot.lot_code, {
      ...form,
      quantite_kg: parseFloat(form.quantite_kg) || 0,
      temperature: form.temperature ? parseFloat(form.temperature) : null,
      humidite: form.humidite ? parseFloat(form.humidite) : null,
      duree_heures: form.duree_heures ? parseFloat(form.duree_heures) : null,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-testid="add-event-modal">
      <div className="bg-white rounded-md w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-[#E5E5E0] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#1A3622]">Ajouter une etape</h3>
            <p className="text-[10px] text-[#6B7280] mt-0.5">Lot: {lot.lot_code} - {lot.farmer_name}</p>
          </div>
          <button onClick={onClose} className="text-[#6B7280] hover:text-[#111827]">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1">Etape *</label>
            <select
              value={form.etape}
              onChange={(e) => setForm({...form, etape: e.target.value})}
              className="w-full px-3 py-2 text-sm border border-[#E5E5E0] rounded-md"
              data-testid="select-etape"
            >
              <option value="">-- Choisir --</option>
              {Object.entries(ETAPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <FormField label="Date" value={form.date_evenement} onChange={(v) => setForm({...form, date_evenement: v})} type="date" testid="input-event-date" />
          <FormField label="Quantite (kg)" value={form.quantite_kg} onChange={(v) => setForm({...form, quantite_kg: v})} type="number" testid="input-event-qty" />
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Lieu" value={form.lieu} onChange={(v) => setForm({...form, lieu: v})} testid="input-lieu" />
            <FormField label="Responsable" value={form.responsable} onChange={(v) => setForm({...form, responsable: v})} testid="input-responsable" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Temp. (C)" value={form.temperature} onChange={(v) => setForm({...form, temperature: v})} type="number" testid="input-temp" />
            <FormField label="Humidite (%)" value={form.humidite} onChange={(v) => setForm({...form, humidite: v})} type="number" testid="input-humid" />
            <FormField label="Duree (h)" value={form.duree_heures} onChange={(v) => setForm({...form, duree_heures: v})} type="number" testid="input-duree" />
          </div>
          <FormField label="Observations" value={form.observations} onChange={(v) => setForm({...form, observations: v})} testid="input-obs" />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.conforme}
              onChange={(e) => setForm({...form, conforme: e.target.checked})}
              id="conforme"
              className="rounded border-[#E5E5E0]"
              data-testid="checkbox-conforme"
            />
            <label htmlFor="conforme" className="text-xs text-[#374151]">Controle conforme</label>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm border border-[#E5E5E0] rounded-md hover:bg-[#F3F4F6]">
              Annuler
            </button>
            <button type="submit" className="flex-1 px-4 py-2 text-sm bg-[#1A3622] text-white rounded-md hover:bg-[#112417]" data-testid="btn-submit-event">
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const TimelineModal = ({ data, onClose }) => {
  const ETAPE_ORDER = ['recolte', 'fermentation', 'sechage', 'stockage_coop', 'conditionnement', 'transport', 'export'];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-testid="timeline-modal">
      <div className="bg-white rounded-md w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-[#E5E5E0] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#1A3622]">Timeline du lot {data.lot_code}</h3>
            <p className="text-[10px] text-[#6B7280] mt-0.5">
              {data.farmer_name} - {data.parcelle_name} | {data.quantite_initiale_kg} kg initial
              {data.certifie_ars1000 && <span className="ml-2 text-emerald-600 font-semibold">Certifie ARS 1000</span>}
            </p>
          </div>
          <button onClick={onClose} className="text-[#6B7280] hover:text-[#111827] text-xl">&times;</button>
        </div>
        <div className="p-5">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-[#E5E5E0]" />

            {data.timeline?.map((step, i) => (
              <div key={step.etape} className="relative pl-12 pb-6 last:pb-0">
                {/* Dot */}
                <div className={`absolute left-2.5 top-1 w-3 h-3 rounded-full border-2 ${
                  step.completed ? 'bg-[#1A3622] border-[#1A3622]' :
                  step.current ? 'bg-[#D4AF37] border-[#D4AF37]' :
                  'bg-white border-[#D1D5DB]'
                }`} />

                <div className={`${step.completed || step.current ? '' : 'opacity-40'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-xs font-semibold text-[#1A3622]">{step.label}</h4>
                    {step.current && <span className="text-[9px] bg-[#D4AF37]/20 text-[#92400E] px-1.5 py-0.5 rounded font-bold">EN COURS</span>}
                    {step.completed && <CheckCircle2 className="h-3 w-3 text-emerald-600" />}
                  </div>

                  {step.events?.length > 0 && step.events.map((evt, j) => (
                    <div key={j} className="ml-2 mt-1 p-2 bg-[#F9FAFB] rounded border border-[#E5E5E0]">
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-[#6B7280]">
                        {evt.date_evenement && <span>Date: {new Date(evt.date_evenement).toLocaleDateString('fr-FR')}</span>}
                        {evt.quantite_kg > 0 && <span>Qte: {evt.quantite_kg} kg</span>}
                        {evt.lieu && <span>Lieu: {evt.lieu}</span>}
                        {evt.responsable && <span>Resp: {evt.responsable}</span>}
                        {evt.temperature && <span>Temp: {evt.temperature}C</span>}
                        {evt.humidite && <span>Hum: {evt.humidite}%</span>}
                        {evt.duree_heures && <span>Duree: {evt.duree_heures}h</span>}
                      </div>
                      {evt.observations && <p className="text-[10px] text-[#374151] mt-1">{evt.observations}</p>}
                      <div className="mt-1">
                        {evt.conforme ? (
                          <span className="text-[9px] text-emerald-600 font-bold">CONFORME</span>
                        ) : (
                          <span className="text-[9px] text-red-600 font-bold">NON CONFORME</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const FormField = ({ label, value, onChange, type = 'text', testid }) => (
  <div>
    <label className="block text-xs font-medium text-[#374151] mb-1">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 text-sm border border-[#E5E5E0] rounded-md bg-white focus:outline-none focus:border-[#1A3622]"
      data-testid={testid}
    />
  </div>
);

export default CacaoFlowPage;

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { tokenService } from '../../../services/tokenService';
import { toast } from 'sonner';
import {
  ClipboardCheck, Filter, Loader2, Home, ChevronRight,
  CheckCircle2, XCircle, Minus, Save, AlertTriangle
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const CONFORMITE_OPTIONS = ['', 'C', 'NC', 'NA'];
const CONFORMITE_STYLES = {
  C: 'bg-emerald-50 border-emerald-300 text-emerald-800',
  NC: 'bg-red-50 border-red-300 text-red-800',
  NA: 'bg-amber-50 border-amber-300 text-amber-800',
  '': 'bg-white border-[#E5E5E0] text-[#6B7280]',
};
const CONFORMITE_LABELS = { C: 'Conforme', NC: 'Non conforme', NA: 'Non applicable', '': 'Non evalue' };

const ChecklistPage = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState('');
  const [norme, setNorme] = useState('ARS 1000-1');
  const [filterNiveau, setFilterNiveau] = useState('');
  const [filterCible, setFilterCible] = useState('');
  const [filterEtape, setFilterEtape] = useState('');
  const [filterConformite, setFilterConformite] = useState('');
  const [expandedItem, setExpandedItem] = useState(null);
  const [saving, setSaving] = useState('');

  useEffect(() => {
    loadSession();
  }, []);

  useEffect(() => {
    if (sessionId) loadChecklist();
  }, [sessionId, norme, filterNiveau, filterCible, filterEtape, filterConformite]);

  const loadSession = async () => {
    try {
      const token = tokenService.getToken();
      const res = await fetch(`${API}/api/audit/sessions`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.sessions?.length > 0) {
        setSessionId(data.sessions[0].session_id);
      }
    } catch {
      toast.error('Erreur chargement session');
      setLoading(false);
    }
  };

  const loadChecklist = async () => {
    setLoading(true);
    try {
      const token = tokenService.getToken();
      const params = new URLSearchParams({ norme });
      if (filterNiveau) params.append('niveau', filterNiveau);
      if (filterCible) params.append('cible', filterCible);
      if (filterEtape) params.append('etape', filterEtape);
      if (filterConformite) params.append('conformite', filterConformite);
      const res = await fetch(`${API}/api/audit/sessions/${sessionId}/checklist?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setItems(data.items || []);
      setStats(data.stats || {});
    } catch {
      toast.error('Erreur chargement checklist');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (itemId, field, value) => {
    setSaving(itemId);
    try {
      const token = tokenService.getToken();
      const res = await fetch(`${API}/api/audit/checklist/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) throw new Error('Erreur');
      const updated = await res.json();
      setItems(prev => prev.map(i => i.item_id === itemId ? updated.item : i));
      // Refresh stats
      loadChecklist();
    } catch {
      toast.error('Erreur sauvegarde');
    } finally {
      setSaving('');
    }
  };

  const handleCreateNC = (item) => {
    const params = new URLSearchParams({
      session_id: sessionId,
      item_id: item.item_id,
      clause: item.clause,
      norme: item.norme,
      constatation: item.constatation || '',
    });
    navigate(`/cooperative/audit/non-conformites?create=1&${params}`);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6]" data-testid="checklist-page">
      <div className="bg-[#1A3622] relative overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-6 relative">
          <div className="flex items-center gap-2 text-white/50 text-xs mb-3">
            <button onClick={() => navigate('/cooperative/dashboard')} className="hover:text-white"><Home className="h-3.5 w-3.5" /></button>
            <ChevronRight className="h-3 w-3" />
            <button onClick={() => navigate('/cooperative/audit')} className="hover:text-white">Audit</button>
            <ChevronRight className="h-3 w-3" />
            <span className="text-white/80">Checklist</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Checklist d'Audit Interne</h1>
          <p className="text-sm text-white/60 mt-1">Evaluez chaque exigence ARS 1000</p>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-6">
        {/* Stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6" data-testid="checklist-stats">
          <MiniStat label="Total" value={stats.total || 0} />
          <MiniStat label="Conformes" value={stats.conformes || 0} color="text-emerald-600" bg="bg-emerald-50" />
          <MiniStat label="Non-conformes" value={stats.non_conformes || 0} color="text-red-600" bg="bg-red-50" />
          <MiniStat label="NA" value={stats.na || 0} color="text-amber-600" bg="bg-amber-50" />
          <MiniStat label="Non evalues" value={stats.non_evalues || 0} color="text-[#6B7280]" bg="bg-gray-50" />
          <MiniStat label="Taux" value={`${stats.taux_conformite || 0}%`} color={stats.taux_conformite >= 80 ? "text-emerald-600" : "text-amber-600"} bg="bg-white" />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6 bg-white border border-[#E5E5E0] rounded-md p-4" data-testid="filters">
          <Filter className="h-4 w-4 text-[#6B7280]" />
          <select value={norme} onChange={(e) => setNorme(e.target.value)} className="px-3 py-1.5 text-xs border border-[#E5E5E0] rounded-md" data-testid="filter-norme">
            <option value="ARS 1000-1">ARS 1000-1</option>
            <option value="ARS 1000-2">ARS 1000-2</option>
          </select>
          <select value={filterNiveau} onChange={(e) => setFilterNiveau(e.target.value)} className="px-3 py-1.5 text-xs border border-[#E5E5E0] rounded-md" data-testid="filter-niveau">
            <option value="">Tous niveaux</option>
            <option value="Bronze">Bronze</option>
            <option value="Argent">Argent</option>
            <option value="Or">Or</option>
          </select>
          <select value={filterConformite} onChange={(e) => setFilterConformite(e.target.value)} className="px-3 py-1.5 text-xs border border-[#E5E5E0] rounded-md" data-testid="filter-conformite">
            <option value="">Toutes conformites</option>
            <option value="C">Conforme (C)</option>
            <option value="NC">Non conforme (NC)</option>
            <option value="NA">Non applicable (NA)</option>
          </select>
          <input type="text" placeholder="Filtrer par cible..." value={filterCible} onChange={(e) => setFilterCible(e.target.value)}
            className="px-3 py-1.5 text-xs border border-[#E5E5E0] rounded-md w-36" data-testid="filter-cible" />
          <input type="text" placeholder="Filtrer par etape..." value={filterEtape} onChange={(e) => setFilterEtape(e.target.value)}
            className="px-3 py-1.5 text-xs border border-[#E5E5E0] rounded-md w-28" data-testid="filter-etape" />
        </div>

        {/* Checklist Table */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-[#1A3622]" /></div>
        ) : (
          <div className="space-y-2" data-testid="checklist-items">
            {items.map((item) => (
              <ChecklistRow
                key={item.item_id}
                item={item}
                expanded={expandedItem === item.item_id}
                onToggle={() => setExpandedItem(expandedItem === item.item_id ? null : item.item_id)}
                onSave={handleSave}
                onCreateNC={handleCreateNC}
                saving={saving === item.item_id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const ChecklistRow = ({ item, expanded, onToggle, onSave, onCreateNC, saving }) => {
  const [localConf, setLocalConf] = useState(item.conformite || '');
  const [localPreuves, setLocalPreuves] = useState(item.preuves_audit || '');
  const [localConstatation, setLocalConstatation] = useState(item.constatation || '');

  const confStyle = CONFORMITE_STYLES[item.conformite] || CONFORMITE_STYLES[''];

  return (
    <div className={`border rounded-md overflow-hidden transition-all ${confStyle}`} data-testid={`item-${item.clause}`}>
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={onToggle}>
        <div className="flex-shrink-0 w-16">
          <span className="text-xs font-mono font-bold text-[#1A3622]">{item.clause}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-[#111827] truncate">{item.titre}</p>
          <p className="text-[10px] text-[#6B7280] truncate">{item.section}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {item.niveau && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/50 text-[#6B7280] border border-[#E5E5E0]">{item.niveau}</span>
          )}
          {item.type_exigence && (
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${item.type_exigence === 'Majeure' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
              {item.type_exigence}
            </span>
          )}
          <ConformiteBadge value={item.conformite} />
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-[#E5E5E0]/50 bg-white/60">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            {/* Left: Requirement details */}
            <div className="space-y-3">
              {item.contenu_detaille && (
                <DetailBlock label="Contenu detaille" text={item.contenu_detaille} />
              )}
              {item.resume && <DetailBlock label="Resume" text={item.resume} />}
              <div className="grid grid-cols-2 gap-2">
                {item.moyens && <DetailBlock label="Moyens" text={item.moyens} />}
                {item.cible && <DetailBlock label="Cible" text={item.cible} />}
              </div>
              {item.matieres && <DetailBlock label="Matieres" text={item.matieres} />}
              {item.precision && <DetailBlock label="Precision de conformite" text={item.precision} />}
            </div>

            {/* Right: Audit fields */}
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-[#6B7280] mb-1">Conformite</label>
                <select
                  value={localConf}
                  onChange={(e) => { setLocalConf(e.target.value); onSave(item.item_id, 'conformite', e.target.value); }}
                  className="w-full px-3 py-2 text-sm border border-[#E5E5E0] rounded-md bg-white"
                  data-testid={`select-conf-${item.clause}`}
                >
                  {CONFORMITE_OPTIONS.map(o => (
                    <option key={o} value={o}>{o ? `${o} - ${CONFORMITE_LABELS[o]}` : '-- Choisir --'}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-[#6B7280] mb-1">Preuves d'audit</label>
                <textarea
                  value={localPreuves}
                  onChange={(e) => setLocalPreuves(e.target.value)}
                  onBlur={() => { if (localPreuves !== item.preuves_audit) onSave(item.item_id, 'preuves_audit', localPreuves); }}
                  rows={2}
                  className="w-full px-3 py-2 text-xs border border-[#E5E5E0] rounded-md resize-none"
                  data-testid={`input-preuves-${item.clause}`}
                  placeholder="Documents verifies, references..."
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-[#6B7280] mb-1">Constatation d'audit</label>
                <textarea
                  value={localConstatation}
                  onChange={(e) => setLocalConstatation(e.target.value)}
                  onBlur={() => { if (localConstatation !== item.constatation) onSave(item.item_id, 'constatation', localConstatation); }}
                  rows={2}
                  className="w-full px-3 py-2 text-xs border border-[#E5E5E0] rounded-md resize-none"
                  data-testid={`input-constatation-${item.clause}`}
                  placeholder="Observations de l'auditeur..."
                />
              </div>
              {item.conformite === 'NC' && (
                <button
                  onClick={() => onCreateNC(item)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white rounded-md text-xs font-medium hover:bg-red-700"
                  data-testid={`btn-create-nc-${item.clause}`}
                >
                  <AlertTriangle className="h-3.5 w-3.5" /> Creer une NC
                </button>
              )}
              {saving && (
                <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                  <Loader2 className="h-3 w-3 animate-spin" /> Sauvegarde...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ConformiteBadge = ({ value }) => {
  if (!value) return <Minus className="h-4 w-4 text-[#D1D5DB]" />;
  const icons = {
    C: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
    NC: <XCircle className="h-4 w-4 text-red-600" />,
    NA: <Minus className="h-4 w-4 text-amber-600" />,
  };
  return icons[value] || null;
};

const DetailBlock = ({ label, text }) => (
  <div>
    <p className="text-[10px] font-bold uppercase text-[#9CA3AF] mb-0.5">{label}</p>
    <p className="text-[11px] text-[#374151] whitespace-pre-line leading-relaxed">{text}</p>
  </div>
);

const MiniStat = ({ label, value, color = "text-[#111827]", bg = "bg-white" }) => (
  <div className={`${bg} border border-[#E5E5E0] rounded-md px-3 py-2`}>
    <p className="text-[9px] uppercase font-bold text-[#9CA3AF]">{label}</p>
    <p className={`text-sm font-bold ${color}`}>{value}</p>
  </div>
);

export default ChecklistPage;

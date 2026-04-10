import { tokenService } from "../../services/tokenService";
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import {
  TreePine, Search, Leaf, AlertTriangle, CheckCircle2,
  ChevronRight, ArrowLeft, Filter, Clock, Sprout,
  Droplets, Shield, XCircle, Info, ChevronDown,
  Sun, CloudRain, Layers, BookOpen, Loader2
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// ============= GUIDE INTERACTIF DES ESPÈCES =============
export const GuideEspeces = () => {
  const [especes, setEspeces] = useState([]);
  const [interdites, setInterdites] = useState([]);
  const [search, setSearch] = useState('');
  const [strateFilter, setStrateFilter] = useState('');
  const [usageFilter, setUsageFilter] = useState('');
  const [showInterdites, setShowInterdites] = useState(false);
  const [selectedEspece, setSelectedEspece] = useState(null);
  const [loading, setLoading] = useState(true);
  const [strates, setStrates] = useState({});

  const loadEspeces = useCallback(async () => {
    try {
      const params = new URLSearchParams({ include_interdites: 'true' });
      if (strateFilter) params.set('strate', strateFilter);
      if (usageFilter) params.set('usage', usageFilter);
      if (search) params.set('search', search);
      const res = await fetch(`${API_URL}/api/ars1000/agroforesterie/especes?${params}`);
      const data = await res.json();
      setEspeces(data.especes_compatibles || []);
      setInterdites(data.especes_interdites || []);
      setStrates(data.strates || {});
    } catch (e) { /* error */ }
    finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, strateFilter, usageFilter]);

  useEffect(() => { loadEspeces(); }, [loadEspeces]);

  const strateLabels = { '3': 'Strate 3 (> 30m)', '2': 'Strate 2 (5-30m)', '1': 'Strate 1 (3-5m)', 'bordure': 'Bordure', 'jachère': 'Jachère' };
  const strateColors = { '3': 'bg-emerald-700', '2': 'bg-emerald-500', '1': 'bg-green-400', 'bordure': 'bg-amber-500', 'jachère': 'bg-blue-500' };

  return (
    <div className="space-y-4" data-testid="guide-especes">
      {/* Search & Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher..." className="pl-10 h-9" data-testid="especes-search" />
        </div>
        <select className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm h-9" value={strateFilter} onChange={(e) => setStrateFilter(e.target.value)} data-testid="especes-strate-filter">
          <option value="">Toutes strates</option>
          <option value="3">Strate 3 (&gt;30m)</option>
          <option value="2">Strate 2 (5-30m)</option>
          <option value="1">Strate 1 (3-5m)</option>
          <option value="bordure">Bordure</option>
          <option value="jachère">Jachère</option>
        </select>
        <select className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm h-9" value={usageFilter} onChange={(e) => setUsageFilter(e.target.value)}>
          <option value="">Tous usages</option>
          <option value="Alimentation">Alimentation</option>
          <option value="Bois">Bois d'oeuvre</option>
          <option value="Pharmacopée">Pharmacopée</option>
          <option value="Revenu">Revenu</option>
        </select>
      </div>

      {/* Stats */}
      <div className="flex gap-2 flex-wrap">
        {Object.entries(strates).map(([key, val]) => (
          <button key={key} onClick={() => setStrateFilter(strateFilter === key.replace('strate_', '') ? '' : key.replace('strate_', ''))}
            className={`text-[10px] px-2 py-1 rounded-full font-medium ${strateFilter === key.replace('strate_', '') ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
            {val.label}: {val.count}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin w-6 h-6 text-green-600" /></div>
      ) : (
        <>
          {/* Compatible species list */}
          <div className="space-y-1.5">
            {especes.map(esp => (
              <button key={esp.id} onClick={() => setSelectedEspece(selectedEspece?.id === esp.id ? null : esp)}
                className={`w-full text-left rounded-xl border p-3 transition-all ${selectedEspece?.id === esp.id ? 'bg-green-50 border-green-300 shadow-sm' : 'bg-white border-gray-100 hover:border-green-200'}`}
                data-testid={`espece-${esp.id}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg ${strateColors[esp.strate] || 'bg-gray-400'} flex items-center justify-center`}>
                    <TreePine className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900 truncate">{esp.nom_local}</p>
                      <Badge className="bg-gray-100 text-gray-500 text-[9px]">S{esp.strate}</Badge>
                    </div>
                    <p className="text-[10px] text-gray-400 italic truncate">{esp.nom_scientifique}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-bold text-gray-700">{esp.hauteur_max_m}m</p>
                    <p className="text-[9px] text-gray-400">{esp.duree_pepiniere_mois} mois</p>
                  </div>
                </div>

                {/* Detail panel */}
                {selectedEspece?.id === esp.id && (
                  <div className="mt-3 pt-3 border-t border-green-200 space-y-2" data-testid={`espece-detail-${esp.id}`}>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white rounded-lg p-2 border border-gray-50">
                        <p className="text-[9px] text-gray-400">Reproduction</p>
                        <p className="text-xs font-medium">{esp.reproduction}</p>
                      </div>
                      <div className="bg-white rounded-lg p-2 border border-gray-50">
                        <p className="text-[9px] text-gray-400">Pépinière</p>
                        <p className="text-xs font-medium">{esp.duree_pepiniere_mois} mois</p>
                      </div>
                      <div className="bg-white rounded-lg p-2 border border-gray-50">
                        <p className="text-[9px] text-gray-400">Fructification</p>
                        <p className="text-xs font-medium">{esp.fructification}</p>
                      </div>
                      <div className="bg-white rounded-lg p-2 border border-gray-50">
                        <p className="text-[9px] text-gray-400">Strate</p>
                        <p className="text-xs font-medium">{strateLabels[esp.strate] || esp.strate}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(esp.usages || []).map((u, i) => (
                        <Badge key={`usage-${u}-${i}`} className="bg-green-100 text-green-700 text-[9px]">{u}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Espèces interdites */}
          <div className="mt-4">
            <button onClick={() => setShowInterdites(!showInterdites)} className="flex items-center gap-2 text-sm font-semibold text-red-600 mb-2" data-testid="toggle-interdites">
              <AlertTriangle className="w-4 h-4" /> Espèces interdites ({interdites.length})
              <ChevronDown className={`w-4 h-4 transition-transform ${showInterdites ? 'rotate-180' : ''}`} />
            </button>
            {showInterdites && (
              <div className="space-y-1.5">
                {interdites.map(esp => (
                  <div key={esp.id} className="bg-red-50 rounded-lg border border-red-100 p-3" data-testid={`interdit-${esp.id}`}>
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-red-800">{esp.nom_local} <span className="text-[10px] italic text-red-500">({esp.nom_scientifique})</span></p>
                        <p className="text-[10px] text-red-600">{esp.raison}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};


// ============= CALENDRIER PÉPINIÈRE =============
export const CalendrierPepiniere = () => {
  const [calendrier, setCalendrier] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/ars1000/agroforesterie/pepiniere/calendrier`);
        const data = await res.json();
        setCalendrier(data.calendrier || []);
        setStats(data.stats || null);
      } catch (e) { /* error */ }
      finally { setLoading(false); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="animate-spin w-6 h-6 text-green-600" /></div>;

  const grouped = {};
  calendrier.forEach(e => {
    const key = e.duree_pepiniere_mois;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(e);
  });

  return (
    <div className="space-y-4" data-testid="calendrier-pepiniere">
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
            <p className="text-xl font-bold text-green-700">{stats.duree_min_mois}</p>
            <p className="text-[10px] text-gray-500">Mois min.</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
            <p className="text-xl font-bold text-amber-600">{stats.duree_max_mois}</p>
            <p className="text-[10px] text-gray-500">Mois max.</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
            <p className="text-xl font-bold text-gray-700">{calendrier.length}</p>
            <p className="text-[10px] text-gray-500">Espèces</p>
          </div>
        </div>
      )}

      {/* Techniques */}
      {stats?.par_technique && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(stats.par_technique).map(([tech, count]) => (
            <Badge key={tech} className="bg-green-100 text-green-700">
              <Sprout className="w-3 h-3 mr-1" /> {tech}: {count}
            </Badge>
          ))}
        </div>
      )}

      {/* Timeline grouped by duration */}
      {Object.entries(grouped).sort((a, b) => Number(a[0]) - Number(b[0])).map(([duree, especes]) => (
        <div key={duree} className="relative">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold">{duree}</div>
            <p className="text-sm font-semibold text-gray-800">{duree} mois de pépinière</p>
            <Badge className="bg-gray-100 text-gray-500 text-[9px]">{especes.length} espèce(s)</Badge>
          </div>
          <div className="ml-4 pl-4 border-l-2 border-green-200 space-y-1">
            {especes.map(e => (
              <div key={e.id} className="bg-white rounded-lg border border-gray-50 p-2 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium">{e.nom_local}</p>
                  <p className="text-[9px] text-gray-400">{e.reproduction} | {e.fructification}</p>
                </div>
                <Badge className="bg-gray-100 text-gray-500 text-[9px]">S{e.strate}</Badge>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};


// ============= DIAGNOSTIC PARCELLE =============
export const DiagnosticParcelle = ({ farmerId, isCooperative = false }) => {
  const [diagnostic, setDiagnostic] = useState(null);
  const [coopDiag, setCoopDiag] = useState(null);
  const [loading, setLoading] = useState(true);

  const token = tokenService.getToken();
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    (async () => {
      try {
        if (isCooperative) {
          const res = await fetch(`${API_URL}/api/ars1000/agroforesterie/diagnostic/cooperative`, { headers });
          if (res.ok) setCoopDiag(await res.json());
        } else if (farmerId) {
          const res = await fetch(`${API_URL}/api/ars1000/agroforesterie/diagnostic/farmer/${farmerId}`, { headers });
          if (res.ok) setDiagnostic(await res.json());
        }
      } catch (e) { /* error */ }
      finally { setLoading(false); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmerId, isCooperative]);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="animate-spin w-6 h-6 text-green-600" /></div>;

  // Cooperative view
  if (isCooperative && coopDiag) {
    return (
      <div className="space-y-4" data-testid="diagnostic-cooperative">
        <div className={`rounded-2xl p-5 border-2 ${coopDiag.score_moyen >= 80 ? 'bg-green-50 border-green-300' : 'bg-amber-50 border-amber-300'}`}>
          <p className="text-3xl font-bold text-center">{coopDiag.score_moyen}%</p>
          <p className="text-sm text-center text-gray-600">Score Agroforesterie Moyen</p>
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="text-center"><p className="text-lg font-bold text-gray-800">{coopDiag.total_pdcs}</p><p className="text-[10px] text-gray-500">PDC analysés</p></div>
            <div className="text-center"><p className="text-lg font-bold text-green-700">{coopDiag.conformes}</p><p className="text-[10px] text-gray-500">Conformes</p></div>
            <div className="text-center"><p className="text-lg font-bold text-red-600">{coopDiag.non_conformes}</p><p className="text-[10px] text-gray-500">Non conformes</p></div>
          </div>
        </div>

        {/* Top issues */}
        {coopDiag.problemes_frequents?.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-sm font-bold text-gray-900 mb-3">Problèmes les plus fréquents</p>
            {coopDiag.problemes_frequents.map((p, i) => (
              <div key={`item-${i}`} className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <p className="text-xs text-gray-700 flex-1">{p.probleme}...</p>
                <Badge className="bg-amber-100 text-amber-700 text-[9px]">{p.count}x</Badge>
              </div>
            ))}
          </div>
        )}

        {/* Individual diagnostics */}
        {coopDiag.diagnostics?.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-bold text-gray-900">Détail par planteur</p>
            {coopDiag.diagnostics.map((d, i) => (
              <div key={`tree-${i}`} className="bg-white rounded-lg border border-gray-100 p-3 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white ${d.score >= 80 ? 'bg-green-500' : d.score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}>
                  {Math.round(d.score)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{d.farmer_name}</p>
                  <p className="text-[10px] text-gray-500">{d.total_arbres} arbres | {d.densite_calculee}/ha | {d.recommandations?.length || 0} action(s)</p>
                </div>
                {d.conforme ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <AlertTriangle className="w-5 h-5 text-amber-500" />}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Single farmer diagnostic
  if (!diagnostic) {
    return (
      <div className="text-center py-8">
        <TreePine className="w-10 h-10 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-400">Aucun PDC trouvé pour ce planteur</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="diagnostic-farmer">
      {/* Score */}
      <div className={`rounded-2xl p-5 border-2 ${diagnostic.score >= 80 ? 'bg-green-50 border-green-300' : diagnostic.score >= 50 ? 'bg-amber-50 border-amber-300' : 'bg-red-50 border-red-300'}`}>
        <p className="text-4xl font-bold text-center">{diagnostic.score}%</p>
        <p className="text-sm text-center text-gray-600 mb-3">Conformité Agroforestière</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div><p className="text-sm font-bold">{diagnostic.total_arbres}</p><p className="text-[9px] text-gray-500">Arbres</p></div>
          <div><p className="text-sm font-bold">{diagnostic.densite_calculee}/ha</p><p className="text-[9px] text-gray-500">Densité</p></div>
          <div><p className="text-sm font-bold">{diagnostic.superficie_ha} ha</p><p className="text-[9px] text-gray-500">Surface</p></div>
        </div>
      </div>

      {/* Critères */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-2">
        <p className="text-sm font-bold text-gray-900">Critères de conformité</p>
        {Object.values(diagnostic.criteres || {}).map((c, i) => (
          <div key={`rec-${i}`} className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0">
            {c.conforme ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" /> : <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-800">{c.label}</p>
              <p className="text-[10px] text-gray-400">Actuel: {c.valeur} | Requis: {c.requis}</p>
            </div>
            <span className="text-[10px] font-bold text-gray-400">{c.poids} pts</span>
          </div>
        ))}
      </div>

      {/* Recommandations */}
      {diagnostic.recommandations?.length > 0 && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 space-y-2">
          <p className="text-sm font-bold text-amber-800 flex items-center gap-2">
            <Info className="w-4 h-4" /> Plan d'action recommandé
          </p>
          {diagnostic.recommandations.map((rec, i) => (
            <div key={`alert-${i}`} className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-800 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
              <p className="text-xs text-amber-900">{rec}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


// ============= PROTECTION ENVIRONNEMENTALE =============
export const ProtectionEnvironnementale = () => {
  const [mesures, setMesures] = useState([]);
  const [stats, setStats] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ type_protection: 'cours_eau', description: '', distance_cours_eau_m: '', mesures_prises: '', especes_plantees: '', superficie_reboisee_ha: '' });
  const [submitting, setSubmitting] = useState(false);

  const token = tokenService.getToken();
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/ars1000/agroforesterie/protection-env`, { headers });
      if (res.ok) { const d = await res.json(); setMesures(d.mesures || []); setStats(d.par_type || null); }
    } catch (e) { /* error */ }
    finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body = {
        type_protection: form.type_protection,
        description: form.description,
        distance_cours_eau_m: form.distance_cours_eau_m ? parseFloat(form.distance_cours_eau_m) : null,
        mesures_prises: form.mesures_prises ? form.mesures_prises.split(',').map(s => s.trim()) : [],
        especes_plantees: form.especes_plantees ? form.especes_plantees.split(',').map(s => s.trim()) : [],
        superficie_reboisee_ha: form.superficie_reboisee_ha ? parseFloat(form.superficie_reboisee_ha) : null,
      };
      const res = await fetch(`${API_URL}/api/ars1000/agroforesterie/protection-env`, { method: 'POST', headers, body: JSON.stringify(body) });
      if (!res.ok) throw new Error('Erreur');
      toast.success('Mesure enregistrée');
      setShowForm(false);
      load();
    } catch (e) { toast.error('Erreur'); }
    finally { setSubmitting(false); }
  };

  const typeIcons = { cours_eau: Droplets, anti_erosion: Layers, reforestation: Sprout, zone_risque: AlertTriangle };
  const typeLabels = { cours_eau: 'Cours d\'eau', anti_erosion: 'Anti-érosion', reforestation: 'Reforestation', zone_risque: 'Zone à risque' };
  const typeColors = { cours_eau: 'text-blue-500', anti_erosion: 'text-amber-500', reforestation: 'text-green-500', zone_risque: 'text-red-500' };

  return (
    <div className="space-y-4" data-testid="protection-env">
      {/* Score conformite environnementale */}
      {mesures.length > 0 && (
        <div className="rounded-2xl p-5 bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200" data-testid="protection-score">
          {(() => {
            const coursEau = mesures.filter(m => m.type_protection === 'cours_eau');
            const coursEauConforme = coursEau.filter(m => m.conforme_distance_eau);
            const hasReforestation = mesures.some(m => m.type_protection === 'reforestation');
            const hasAntiErosion = mesures.some(m => m.type_protection === 'anti_erosion');
            const checks = [
              { label: 'Distance cours d\'eau >= 10m', ok: coursEau.length === 0 || coursEauConforme.length === coursEau.length, requis: 'ARS 1000 Art. 4.3' },
              { label: 'Mesures anti-erosion en place', ok: hasAntiErosion, requis: 'ARS 1000 Art. 4.4' },
              { label: 'Reboisement compensatoire', ok: hasReforestation, requis: 'ARS 1000 Art. 4.5' },
              { label: 'Pas de cultures en zone tampon', ok: !mesures.some(m => m.type_protection === 'zone_risque'), requis: 'ARS 1000 Art. 4.6' },
            ];
            const scoreEnv = Math.round((checks.filter(c => c.ok).length / checks.length) * 100);
            return (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${scoreEnv >= 75 ? 'bg-green-500' : scoreEnv >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}>
                      <span className="text-xl font-bold text-white">{scoreEnv}%</span>
                    </div>
                    <div>
                      <p className="font-bold text-lg text-gray-900">Conformite Environnementale</p>
                      <p className="text-sm text-gray-600">{mesures.length} mesure(s) enregistree(s)</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {checks.map((c, i) => (
                    <div key={`check-${i}`} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${c.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                      {c.ok ? <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" /> : <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                      <span className="text-xs flex-1">{c.label}</span>
                      <span className="text-[9px] text-gray-400">{c.requis}</span>
                    </div>
                  ))}
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-2">
          {Object.entries(typeLabels).map(([key, label]) => {
            const Icon = typeIcons[key];
            return (
              <div key={key} className="bg-white rounded-xl border border-gray-100 p-3 text-center">
                <Icon className={`w-5 h-5 mx-auto mb-1 ${typeColors[key]}`} />
                <p className="text-lg font-bold text-gray-800">{stats[key] || 0}</p>
                <p className="text-[9px] text-gray-500">{label}</p>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex justify-between items-center">
        <p className="text-sm font-semibold text-gray-900">Mesures de protection</p>
        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => setShowForm(!showForm)} data-testid="add-protection-btn">
          + Ajouter
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-green-50 rounded-xl border border-green-200 p-4 space-y-3" data-testid="protection-form">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-600 block mb-1">Type</label>
              <select className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm w-full" value={form.type_protection} onChange={(e) => setForm({ ...form, type_protection: e.target.value })}>
                <option value="cours_eau">Protection cours d'eau</option>
                <option value="anti_erosion">Anti-érosion</option>
                <option value="reforestation">Reforestation compensatoire</option>
                <option value="zone_risque">Zone à risque</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-600 block mb-1">Description</label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="h-8 text-sm" />
            </div>
            {form.type_protection === 'cours_eau' && (
              <div>
                <label className="text-[10px] text-gray-600 block mb-1">Distance cours d'eau (m)</label>
                <Input type="number" value={form.distance_cours_eau_m} onChange={(e) => setForm({ ...form, distance_cours_eau_m: e.target.value })} className="h-8 text-sm" placeholder="min 10m" />
              </div>
            )}
            {form.type_protection === 'reforestation' && (
              <>
                <div>
                  <label className="text-[10px] text-gray-600 block mb-1">Superficie reboisée (ha)</label>
                  <Input type="number" value={form.superficie_reboisee_ha} onChange={(e) => setForm({ ...form, superficie_reboisee_ha: e.target.value })} className="h-8 text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] text-gray-600 block mb-1">Espèces plantées</label>
                  <Input value={form.especes_plantees} onChange={(e) => setForm({ ...form, especes_plantees: e.target.value })} placeholder="Séparées par virgules" className="h-8 text-sm" />
                </div>
              </>
            )}
            <div className="col-span-2">
              <label className="text-[10px] text-gray-600 block mb-1">Mesures prises</label>
              <Input value={form.mesures_prises} onChange={(e) => setForm({ ...form, mesures_prises: e.target.value })} placeholder="Séparées par virgules" className="h-8 text-sm" />
            </div>
          </div>
          <Button type="submit" size="sm" disabled={submitting} className="bg-green-600 hover:bg-green-700 text-white" data-testid="submit-protection-btn">
            {submitting ? <Loader2 className="animate-spin w-4 h-4" /> : 'Enregistrer'}
          </Button>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin w-6 h-6 text-green-600" /></div>
      ) : mesures.length === 0 ? (
        <div className="text-center py-8">
          <Shield className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">Aucune mesure enregistrée</p>
        </div>
      ) : (
        <div className="space-y-2">
          {mesures.map((m, i) => {
            const Icon = typeIcons[m.type_protection] || Shield;
            return (
              <div key={`espece-${i}`} className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3">
                <Icon className={`w-5 h-5 ${typeColors[m.type_protection] || 'text-gray-400'} flex-shrink-0`} />
                <div className="flex-1">
                  <p className="text-xs font-medium">{m.description || typeLabels[m.type_protection]}</p>
                  <p className="text-[10px] text-gray-400">
                    {m.type_protection === 'cours_eau' && m.distance_cours_eau_m != null && `Distance: ${m.distance_cours_eau_m}m `}
                    {m.type_protection === 'reforestation' && m.superficie_reboisee_ha && `${m.superficie_reboisee_ha} ha `}
                    {(m.mesures_prises || []).join(', ')}
                  </p>
                </div>
                {m.type_protection === 'cours_eau' && (
                  m.conforme_distance_eau ? <Badge className="bg-green-100 text-green-700 text-[9px]">Conforme</Badge> : <Badge className="bg-red-100 text-red-700 text-[9px]">Non conforme</Badge>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

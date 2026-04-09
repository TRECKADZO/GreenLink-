import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import {
  User, Home, MapPin, TreePine, Wrench, Target,
  FileText, Camera, PenLine, CheckCircle2, ChevronRight,
  ChevronLeft, Loader2, Save, Send, ArrowLeft, Leaf,
  Navigation, Plus, Trash2, X, Check, Eye, Download,
  Lightbulb, AlertTriangle
} from 'lucide-react';

import { GeoSelectCI } from '../../components/GeoSelectCI';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const getToken = () => localStorage.getItem('token');
const authHeaders = () => ({ 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' });

const STEPS = [
  { id: 'identification', label: 'Identification', icon: User },
  { id: 'menage', label: 'Ménage', icon: Home },
  { id: 'parcelles', label: 'Parcelles & GPS', icon: MapPin },
  { id: 'arbres', label: 'Inventaire Arbres', icon: TreePine },
  { id: 'materiel', label: 'Matériel', icon: Wrench },
  { id: 'strategie', label: 'Stratégie', icon: Target },
  { id: 'photos', label: 'Photos', icon: Camera },
  { id: 'signature', label: 'Signatures', icon: PenLine },
  { id: 'resume', label: 'Résumé', icon: FileText },
];

// ======== SIGNATURE CANVAS ========
const SignatureCanvas = ({ onSave, label, savedData }) => {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(!!savedData);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (savedData) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.offsetWidth, canvas.offsetHeight);
      img.src = savedData;
    }
  }, [savedData]);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  };

  const startDraw = (e) => {
    e.preventDefault();
    setDrawing(true);
    const ctx = canvasRef.current.getContext('2d');
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e) => {
    if (!drawing) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const endDraw = () => {
    if (!drawing) return;
    setDrawing(false);
    setHasSignature(true);
    const data = canvasRef.current.toDataURL('image/png');
    onSave(data);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onSave(null);
  };

  return (
    <div data-testid={`signature-${label}`}>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-semibold text-gray-600">{label}</label>
        {hasSignature && (
          <button onClick={clear} className="text-xs text-red-500 flex items-center gap-1">
            <Trash2 className="w-3 h-3" /> Effacer
          </button>
        )}
      </div>
      <div className="border-2 border-dashed border-gray-300 rounded-xl bg-white overflow-hidden relative" style={{ touchAction: 'none' }}>
        <canvas
          ref={canvasRef}
          className="w-full cursor-crosshair"
          style={{ height: '140px' }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-gray-300 text-sm">Signez ici</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ======== GPS CAPTURE ========
const useGPS = () => {
  const [gps, setGps] = useState(null);
  const [loading, setLoading] = useState(false);

  const capture = useCallback(() => {
    if (!navigator.geolocation) { toast.error('GPS non disponible'); return; }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude, acc: Math.round(pos.coords.accuracy) });
        setLoading(false);
        toast.success('Position GPS capturée');
      },
      () => { setLoading(false); toast.error('Impossible de capturer le GPS'); },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, []);

  return { gps, loading, capture };
};

// ======== STEP: IDENTIFICATION ========
const IdentificationStep = ({ data, onChange, farmer }) => {
  const update = (field, value) => onChange({ ...data, [field]: value });

  useEffect(() => {
    if (farmer && !data.nom) {
      const parts = (farmer.full_name || '').split(' ');
      onChange({
        ...data,
        nom: parts[0] || '',
        prenoms: parts.slice(1).join(' ') || '',
        telephone: farmer.phone_number || '',
        village: farmer.village || '',
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmer]);

  return (
    <div className="space-y-3" data-testid="visit-step-identification">
      <h3 className="font-bold text-gray-900 text-sm">Identification du Producteur</h3>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Nom *', field: 'nom' },
          { label: 'Prénoms *', field: 'prenoms' },
          { label: 'Date de naissance', field: 'date_naissance', type: 'date' },
          { label: 'Téléphone *', field: 'telephone', type: 'tel' },
          { label: "N° d'identification", field: 'numero_identification' },
          { label: 'Localité', field: 'localite' },
          { label: 'Village', field: 'village' },
        ].map(({ label, field, type }) => (
          <div key={field}>
            <label className="text-[10px] text-gray-500 font-medium block mb-1">{label}</label>
            <Input type={type || 'text'} value={data[field] || ''} onChange={(e) => update(field, e.target.value)} className="h-9 text-sm" data-testid={`visit-id-${field}`} />
          </div>
        ))}
        <div>
          <label className="text-[10px] text-gray-500 font-medium block mb-1">Genre</label>
          <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full h-9" value={data.genre || ''} onChange={(e) => update('genre', e.target.value)}>
            <option value="">--</option>
            <option value="homme">Homme</option>
            <option value="femme">Femme</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] text-gray-500 font-medium block mb-1">Statut foncier</label>
          <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full h-9" value={data.statut_foncier || ''} onChange={(e) => update('statut_foncier', e.target.value)}>
            <option value="">--</option>
            <option value="proprietaire">Propriétaire</option>
            <option value="metayer">Métayer</option>
            <option value="locataire">Locataire</option>
          </select>
        </div>
      </div>
      {/* Sélection géographique en cascade */}
      <div className="mt-2 pt-2 border-t border-gray-100">
        <label className="text-[10px] text-gray-500 font-medium block mb-2">Localisation administrative</label>
        <GeoSelectCI
          region={data.region || ''}
          departement={data.department || ''}
          sousPrefecture={data.sous_prefecture || ''}
          onChange={(field, value) => update(field, value)}
        />
      </div>
    </div>
  );
};

// ======== STEP: MENAGE ========
const MenageStep = ({ data, onChange }) => {
  const update = (field, value) => onChange({ ...data, [field]: value });
  return (
    <div className="space-y-3" data-testid="visit-step-menage">
      <h3 className="font-bold text-gray-900 text-sm">Composition du Ménage</h3>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Taille du ménage', field: 'taille_menage' },
          { label: 'Nombre de femmes', field: 'nombre_femmes' },
          { label: "Nombre d'enfants", field: 'nombre_enfants' },
          { label: 'Enfants scolarisés', field: 'enfants_scolarises' },
          { label: 'Travailleurs permanents', field: 'travailleurs_permanents' },
          { label: 'Travailleurs temporaires', field: 'travailleurs_temporaires' },
          { label: 'Dépenses mensuelles (FCFA)', field: 'depenses_mensuelles' },
        ].map(({ label, field }) => (
          <div key={field}>
            <label className="text-[10px] text-gray-500 font-medium block mb-1">{label}</label>
            <Input type="number" value={data[field] || ''} onChange={(e) => update(field, Number(e.target.value))} className="h-9 text-sm" data-testid={`visit-men-${field}`} />
          </div>
        ))}
      </div>
      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={data.acces_banque || false} onChange={(e) => update('acces_banque', e.target.checked)} /> Banque
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={data.mobile_money || false} onChange={(e) => update('mobile_money', e.target.checked)} /> Mobile Money
        </label>
      </div>
    </div>
  );
};

// ======== STEP: PARCELLES (avec GPS) ========
const ParcellesStep = ({ data, onChange }) => {
  const addParcelle = () => onChange([...data, { nom_parcelle: '', superficie_ha: 0, latitude: null, longitude: null, annee_creation: null, age_arbres_ans: null, densite_arbres_ha: null, variete_cacao: '', rendement_estime_kg_ha: 0, etat_sanitaire: '', cultures_associees: [] }]);
  const updateParcelle = (i, field, value) => { const arr = [...data]; arr[i] = { ...arr[i], [field]: value }; onChange(arr); };
  const removeParcelle = (i) => onChange(data.filter((_, idx) => idx !== i));

  const captureParcelGPS = (i) => {
    if (!navigator.geolocation) { toast.error('GPS non disponible'); return; }
    toast.info('Capture GPS en cours...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        updateParcelle(i, 'latitude', pos.coords.latitude);
        updateParcelle(i, 'longitude', pos.coords.longitude);
        toast.success(`GPS parcelle ${i + 1} capturé`);
      },
      () => toast.error('GPS non disponible'),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  return (
    <div className="space-y-4" data-testid="visit-step-parcelles">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-900 text-sm">Parcelles Cacaoyères</h3>
        <Button size="sm" variant="outline" onClick={addParcelle} data-testid="visit-add-parcelle">
          <Plus className="w-3.5 h-3.5 mr-1" /> Parcelle
        </Button>
      </div>
      {data.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Aucune parcelle. Ajoutez-en une.</p>}
      {data.map((p, i) => (
        <div key={i} className="bg-gray-50 rounded-xl p-3 border border-gray-100 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-700">Parcelle {i + 1}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => captureParcelGPS(i)} className="flex items-center gap-1 text-[10px] text-blue-600 font-medium" data-testid={`visit-gps-parcelle-${i}`}>
                <Navigation className="w-3 h-3" /> GPS
              </button>
              <button className="text-red-400 text-[10px]" onClick={() => removeParcelle(i)}>Suppr.</button>
            </div>
          </div>
          {p.latitude && p.longitude && (
            <div className="bg-blue-50 text-blue-700 text-[10px] rounded-lg px-2 py-1 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {p.latitude?.toFixed(6)}, {p.longitude?.toFixed(6)}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-gray-500 block mb-0.5">Nom</label>
              <Input value={p.nom_parcelle || ''} onChange={(e) => updateParcelle(i, 'nom_parcelle', e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 block mb-0.5">Superficie (ha)</label>
              <Input type="number" value={p.superficie_ha || ''} onChange={(e) => updateParcelle(i, 'superficie_ha', Number(e.target.value))} className="h-8 text-sm" />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 block mb-0.5">Variété cacao</label>
              <Input value={p.variete_cacao || ''} onChange={(e) => updateParcelle(i, 'variete_cacao', e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 block mb-0.5">Rendement (kg/ha)</label>
              <Input type="number" value={p.rendement_estime_kg_ha || ''} onChange={(e) => updateParcelle(i, 'rendement_estime_kg_ha', Number(e.target.value))} className="h-8 text-sm" />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 block mb-0.5">Âge arbres (ans)</label>
              <Input type="number" value={p.age_arbres_ans || ''} onChange={(e) => updateParcelle(i, 'age_arbres_ans', Number(e.target.value))} className="h-8 text-sm" />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 block mb-0.5">État sanitaire</label>
              <select className="border border-gray-200 rounded-lg px-2 py-1 text-sm w-full h-8" value={p.etat_sanitaire || ''} onChange={(e) => updateParcelle(i, 'etat_sanitaire', e.target.value)}>
                <option value="">--</option>
                <option value="bon">Bon</option>
                <option value="moyen">Moyen</option>
                <option value="mauvais">Mauvais</option>
              </select>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ======== STEP: INVENTAIRE ARBRES ========
const InventaireArbresStep = ({ arbresOmbrage, onArbresChange, inventaire, onInventaireChange }) => {
  const updateArbres = (field, value) => onArbresChange({ ...arbresOmbrage, [field]: value });
  const especesStr = (arbresOmbrage.especes || []).join(', ');

  const addArbre = () => {
    onInventaireChange([...inventaire, { espece: '', circonference_cm: '', strate: 'haute', decision: 'conserver', latitude: null, longitude: null }]);
  };
  const updateArbre = (i, field, value) => {
    const arr = [...inventaire];
    arr[i] = { ...arr[i], [field]: value };
    onInventaireChange(arr);
  };
  const removeArbre = (i) => onInventaireChange(inventaire.filter((_, idx) => idx !== i));

  const captureArbreGPS = (i) => {
    if (!navigator.geolocation) { toast.error('GPS non disponible'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        updateArbre(i, 'latitude', pos.coords.latitude);
        updateArbre(i, 'longitude', pos.coords.longitude);
        toast.success(`GPS arbre ${i + 1} capturé`);
      },
      () => toast.error('GPS non disponible'),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  // Auto-calculate
  const nbEspeces = (arbresOmbrage.especes || []).length;
  const densite = arbresOmbrage.densite_par_ha || 0;
  const densiteOk = densite >= 25 && densite <= 40;
  const especesOk = nbEspeces >= 3;

  return (
    <div className="space-y-4" data-testid="visit-step-arbres">
      <h3 className="font-bold text-gray-900 text-sm">Inventaire Arbres d'Ombrage</h3>

      {/* Summary */}
      <div className={`rounded-xl p-3 ${densiteOk && especesOk ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
        <div className="flex gap-4 text-xs">
          <span className={densiteOk ? 'text-green-700' : 'text-red-600'}>Densité: {densite}/ha (25-40)</span>
          <span className={especesOk ? 'text-green-700' : 'text-red-600'}>Espèces: {nbEspeces} (min 3)</span>
        </div>
      </div>

      {/* Global stats */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[10px] text-gray-500 block mb-0.5">Total arbres</label>
          <Input type="number" value={arbresOmbrage.nombre_total || ''} onChange={(e) => updateArbres('nombre_total', Number(e.target.value))} className="h-8 text-sm" />
        </div>
        <div>
          <label className="text-[10px] text-gray-500 block mb-0.5">Densité/ha</label>
          <Input type="number" value={arbresOmbrage.densite_par_ha || ''} onChange={(e) => updateArbres('densite_par_ha', Number(e.target.value))} className="h-8 text-sm" />
        </div>
        <div>
          <label className="text-[10px] text-gray-500 block mb-0.5">Strate haute</label>
          <Input type="number" value={arbresOmbrage.strate_haute || ''} onChange={(e) => updateArbres('strate_haute', Number(e.target.value))} className="h-8 text-sm" />
        </div>
        <div>
          <label className="text-[10px] text-gray-500 block mb-0.5">Strate moyenne</label>
          <Input type="number" value={arbresOmbrage.strate_moyenne || ''} onChange={(e) => updateArbres('strate_moyenne', Number(e.target.value))} className="h-8 text-sm" />
        </div>
        <div>
          <label className="text-[10px] text-gray-500 block mb-0.5">Strate basse</label>
          <Input type="number" value={arbresOmbrage.strate_basse || ''} onChange={(e) => updateArbres('strate_basse', Number(e.target.value))} className="h-8 text-sm" />
        </div>
        <div>
          <label className="text-[10px] text-gray-500 block mb-0.5">Espèces (virgules)</label>
          <Input value={especesStr} onChange={(e) => updateArbres('especes', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} className="h-8 text-sm" placeholder="Fraké, Iroko..." />
        </div>
      </div>

      {/* Individual trees */}
      <div className="flex items-center justify-between mt-2">
        <p className="text-xs font-semibold text-gray-600">Arbres individuels ({inventaire.length})</p>
        <Button size="sm" variant="outline" onClick={addArbre} data-testid="visit-add-arbre">
          <Plus className="w-3.5 h-3.5 mr-1" /> Arbre
        </Button>
      </div>

      {inventaire.map((arbre, i) => (
        <div key={i} className="bg-white rounded-lg p-3 border border-gray-100 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-700">Arbre {i + 1}</span>
            <div className="flex gap-2">
              <button onClick={() => captureArbreGPS(i)} className="text-[10px] text-blue-600 flex items-center gap-0.5" data-testid={`visit-gps-arbre-${i}`}>
                <Navigation className="w-3 h-3" /> GPS
              </button>
              <button onClick={() => removeArbre(i)} className="text-[10px] text-red-400">Suppr.</button>
            </div>
          </div>
          {arbre.latitude && (
            <div className="bg-blue-50 text-blue-700 text-[10px] rounded px-2 py-0.5">
              <MapPin className="w-2.5 h-2.5 inline mr-0.5" /> {arbre.latitude?.toFixed(5)}, {arbre.longitude?.toFixed(5)}
            </div>
          )}
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="text-[10px] text-gray-400 block">Espèce</label>
              <Input value={arbre.espece || ''} onChange={(e) => updateArbre(i, 'espece', e.target.value)} className="h-7 text-xs" placeholder="Fraké" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block">Circ. (cm)</label>
              <Input type="number" value={arbre.circonference_cm || ''} onChange={(e) => updateArbre(i, 'circonference_cm', e.target.value)} className="h-7 text-xs" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block">Strate</label>
              <select className="border rounded px-1 py-0.5 text-xs w-full h-7" value={arbre.strate || 'haute'} onChange={(e) => updateArbre(i, 'strate', e.target.value)}>
                <option value="haute">Haute</option>
                <option value="moyenne">Moyenne</option>
                <option value="basse">Basse</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block">Décision</label>
              <select className="border rounded px-1 py-0.5 text-xs w-full h-7" value={arbre.decision || 'conserver'} onChange={(e) => updateArbre(i, 'decision', e.target.value)}>
                <option value="conserver">Conserver</option>
                <option value="planter">Planter</option>
                <option value="abattre">Abattre</option>
              </select>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ======== SMART RECOMMENDATIONS PANEL ========
const RecommandationsPanel = ({ farmerId }) => {
  const [recs, setRecs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const loadRecs = async () => {
    if (recs) { setExpanded(!expanded); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/ars1000/agroforesterie/recommandations/farmer/${farmerId}`, { headers: authHeaders() });
      if (res.ok) {
        setRecs(await res.json());
        setExpanded(true);
      } else {
        toast.error('Impossible de charger les recommandations');
      }
    } catch (e) { toast.error('Erreur réseau'); }
    finally { setLoading(false); }
  };

  const prioriteColors = { critique: 'bg-red-100 text-red-700 border-red-200', haute: 'bg-amber-100 text-amber-700 border-amber-200', moyenne: 'bg-blue-100 text-blue-700 border-blue-200', basse: 'bg-gray-100 text-gray-600 border-gray-200' };
  const prioriteLabels = { critique: 'Critique', haute: 'Haute', moyenne: 'Moyenne', basse: 'Basse' };

  return (
    <div className="mt-4" data-testid="recommandations-panel">
      <Button
        variant="outline"
        className="w-full border-green-200 text-green-700 hover:bg-green-50"
        onClick={loadRecs}
        disabled={loading}
        data-testid="load-recommandations-btn"
      >
        {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Lightbulb className="w-4 h-4 mr-2" />}
        {expanded ? 'Masquer les recommandations' : 'Recommandations intelligentes'}
      </Button>

      {expanded && recs && (
        <div className="mt-3 space-y-3">
          {/* Score projection */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-3 border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-green-800">Projection après plan</span>
              <Badge className="bg-green-600 text-white">{recs.projection?.score_projete}% projete</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div><span className="text-gray-500">Densité actuelle:</span> <b>{recs.projection?.densite_actuelle}/ha</b></div>
              <div><span className="text-gray-500">Densité projetée:</span> <b className="text-green-700">{recs.projection?.densite_projetee}/ha</b></div>
              <div><span className="text-gray-500">Espèces actuelles:</span> <b>{recs.projection?.especes_actuelles}</b></div>
              <div><span className="text-gray-500">Espèces projetées:</span> <b className="text-green-700">{recs.projection?.especes_projetees}</b></div>
            </div>
            {recs.total_arbres_a_planter > 0 && (
              <p className="text-xs text-green-700 mt-2 font-medium">
                Total a planter : {recs.total_arbres_a_planter} arbres
              </p>
            )}
          </div>

          {/* Recommendations */}
          {recs.recommendations?.map((rec, i) => (
            <div key={i} className={`rounded-xl p-3 border ${prioriteColors[rec.priorite] || prioriteColors.basse}`}>
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <Badge className={prioriteColors[rec.priorite]}>{prioriteLabels[rec.priorite]}</Badge>
                <span className="text-[10px] text-gray-500">{rec.critere}</span>
              </div>
              <p className="text-xs font-medium">{rec.message}</p>
              {rec.especes_suggerees && (
                <div className="mt-2 space-y-1">
                  <p className="text-[10px] font-semibold text-gray-600">Espèces suggérées :</p>
                  {rec.especes_suggerees.map((sp, j) => (
                    <div key={j} className="bg-white/70 rounded-lg px-2 py-1 text-[10px]">
                      <b>{sp.nom_local || sp.nom}</b> <i className="text-gray-400">({sp.nom_scientifique})</i>
                      {sp.usages && <span className="ml-1 text-gray-500">| {sp.usages.join(', ')}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Plantation plan */}
          {recs.plan_plantation?.length > 0 && (
            <div className="bg-white rounded-xl border border-green-100 p-3">
              <p className="text-xs font-bold text-green-800 mb-2">Plan de plantation recommande</p>
              <div className="space-y-1">
                {recs.plan_plantation.map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-[10px] bg-green-50 rounded-lg px-2 py-1">
                    <div>
                      <b>{p.espece}</b> <span className="text-gray-400">({p.nom_scientifique})</span>
                      <span className="ml-1 text-gray-500">Strate {p.strate}</span>
                    </div>
                    <div className="text-right">
                      <b className="text-green-700">{p.quantite} arbres</b>
                      <span className="ml-1 text-gray-400">{p.pepiniere_mois} mois pépinière</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};


// ======== STEP: MATERIEL ========
const MaterielStep = ({ data, onChange }) => {
  const toStr = (arr) => (arr || []).join(', ');
  const toArr = (val) => val.split(',').map(s => s.trim()).filter(Boolean);

  return (
    <div className="space-y-3" data-testid="visit-step-materiel">
      <h3 className="font-bold text-gray-900 text-sm">Matériel Agricole</h3>
      {[
        { label: 'Outils (machette, sécateur...)', field: 'outils' },
        { label: 'Équipements de protection', field: 'equipements_protection' },
        { label: 'Produits phytosanitaires', field: 'produits_phytosanitaires' },
        { label: 'Engrais', field: 'engrais' },
      ].map(({ label, field }) => (
        <div key={field}>
          <label className="text-[10px] text-gray-500 font-medium block mb-1">{label}</label>
          <Input value={toStr(data[field])} onChange={(e) => onChange({ ...data, [field]: toArr(e.target.value) })} placeholder="Séparés par virgules" className="h-9 text-sm" />
        </div>
      ))}
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={data.acces_intrants || false} onChange={(e) => onChange({ ...data, acces_intrants: e.target.checked })} />
        Accès facilité aux intrants
      </label>
    </div>
  );
};

// ======== STEP: STRATEGIE ========
const StrategieStep = ({ data, onChange }) => {
  const update = (field, value) => onChange({ ...data, [field]: value });
  return (
    <div className="space-y-3" data-testid="visit-step-strategie">
      <h3 className="font-bold text-gray-900 text-sm">Matrice Stratégique</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] text-gray-500 block mb-1">Objectif rendement (kg/ha)</label>
          <Input type="number" value={data.objectif_rendement_kg_ha || ''} onChange={(e) => update('objectif_rendement_kg_ha', Number(e.target.value))} className="h-9 text-sm" />
        </div>
        <div>
          <label className="text-[10px] text-gray-500 block mb-1">Horizon (années)</label>
          <Input type="number" value={data.horizon_annees || 5} onChange={(e) => update('horizon_annees', Number(e.target.value))} className="h-9 text-sm" />
        </div>
        <div>
          <label className="text-[10px] text-gray-500 block mb-1">Coût estimé (FCFA)</label>
          <Input type="number" value={data.cout_total_estime || ''} onChange={(e) => update('cout_total_estime', Number(e.target.value))} className="h-9 text-sm" />
        </div>
      </div>
      <div>
        <label className="text-[10px] text-gray-500 block mb-1">Risques identifiés</label>
        <Input value={(data.risques_identifies || []).join(', ')} onChange={(e) => update('risques_identifies', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} className="h-9 text-sm" />
      </div>
      <div>
        <label className="text-[10px] text-gray-500 block mb-1">Actions prioritaires</label>
        <Input value={(data.actions_prioritaires || []).join(', ')} onChange={(e) => update('actions_prioritaires', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} className="h-9 text-sm" />
      </div>
    </div>
  );
};

// ======== STEP: PHOTOS ========
const PhotosStep = ({ photos, onPhotosChange }) => {
  const fileRef = useRef(null);
  const [gps, setGps] = useState(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
        { enableHighAccuracy: true, timeout: 15000 }
      );
    }
  }, []);

  const handleCapture = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        onPhotosChange([...photos, {
          data: reader.result,
          name: file.name,
          gps: gps,
          timestamp: new Date().toISOString(),
        }]);
        toast.success('Photo ajoutée');
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (i) => onPhotosChange(photos.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3" data-testid="visit-step-photos">
      <h3 className="font-bold text-gray-900 text-sm">Photos de la Parcelle</h3>
      {gps && (
        <div className="bg-blue-50 text-blue-700 text-[10px] rounded-lg px-2 py-1 flex items-center gap-1">
          <MapPin className="w-3 h-3" /> GPS: {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple onChange={handleCapture} className="hidden" />
      <Button onClick={() => fileRef.current?.click()} className="w-full h-12 bg-pink-500 hover:bg-pink-600 text-white rounded-xl" data-testid="visit-capture-photo">
        <Camera className="w-5 h-5 mr-2" /> Prendre une photo
      </Button>
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((p, i) => (
            <div key={i} className="relative rounded-xl overflow-hidden border border-gray-200 aspect-square">
              <img src={p.data} alt="" className="w-full h-full object-cover" />
              <button onClick={() => removePhoto(i)} className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                <X className="w-3 h-3 text-white" />
              </button>
              {p.gps && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-[8px] text-white px-1 py-0.5">
                  {p.gps.lat.toFixed(4)}, {p.gps.lng.toFixed(4)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <p className="text-[10px] text-gray-400">{photos.length} photo(s) capturée(s)</p>
    </div>
  );
};

// ======== STEP: SIGNATURES ========
const SignaturesStep = ({ sigPlanteur, onSigPlanteur, sigAgent, onSigAgent, farmerName, agentName }) => {
  return (
    <div className="space-y-4" data-testid="visit-step-signatures">
      <h3 className="font-bold text-gray-900 text-sm">Signatures Électroniques</h3>
      <p className="text-xs text-gray-500">Le planteur et l'agent doivent signer pour valider la visite terrain.</p>

      <div className="bg-white rounded-xl border border-gray-100 p-3 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <User className="w-4 h-4 text-green-600" />
          <span className="text-sm font-semibold">Signature du Planteur</span>
          {sigPlanteur?.data && <Badge className="bg-green-100 text-green-700 text-[10px]">Signé</Badge>}
        </div>
        <div>
          <label className="text-[10px] text-gray-500 block mb-1">Nom du planteur</label>
          <Input value={sigPlanteur?.nom || farmerName || ''} onChange={(e) => onSigPlanteur({ ...sigPlanteur, nom: e.target.value })} className="h-8 text-sm" data-testid="visit-sig-planteur-nom" />
        </div>
        <SignatureCanvas
          label="Dessiner la signature"
          savedData={sigPlanteur?.data}
          onSave={(data) => onSigPlanteur({ ...sigPlanteur, data, date: new Date().toISOString() })}
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-3 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <PenLine className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-semibold">Signature de l'Agent</span>
          {sigAgent?.data && <Badge className="bg-blue-100 text-blue-700 text-[10px]">Signé</Badge>}
        </div>
        <div>
          <label className="text-[10px] text-gray-500 block mb-1">Nom de l'agent</label>
          <Input value={sigAgent?.nom || agentName || ''} onChange={(e) => onSigAgent({ ...sigAgent, nom: e.target.value })} className="h-8 text-sm" data-testid="visit-sig-agent-nom" />
        </div>
        <SignatureCanvas
          label="Dessiner la signature"
          savedData={sigAgent?.data}
          onSave={(data) => onSigAgent({ ...sigAgent, data, date: new Date().toISOString() })}
        />
      </div>
    </div>
  );
};

// ======== STEP: RESUME ========
const ResumeStep = ({ formData, inventaire, photos, sigPlanteur, sigAgent, conformite, pdcId }) => {
  const { identification: id, menage, parcelles, arbres_ombrage, matrice_strategique: strat } = formData;

  const handleDownloadPDF = async () => {
    if (!pdcId) { toast.error('Sauvegardez d\'abord le PDC'); return; }
    try {
      toast.info('Génération du PDF en cours...');
      const res = await fetch(`${API_URL}/api/ars1000/pdf/pdc/${pdcId}`, { headers: { 'Authorization': `Bearer ${getToken()}` } });
      if (!res.ok) throw new Error('Erreur lors de la génération');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PDC_${id.nom}_${id.prenoms}_${new Date().toISOString().slice(0,10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('PDF téléchargé');
    } catch (e) {
      toast.error(e.message || 'Erreur téléchargement PDF');
    }
  };

  return (
    <div className="space-y-3" data-testid="visit-step-resume">
      <h3 className="font-bold text-gray-900 text-sm">Résumé de la Visite</h3>
      <div className={`rounded-xl p-4 border-2 ${conformite >= 80 ? 'bg-green-50 border-green-300' : conformite >= 50 ? 'bg-amber-50 border-amber-300' : 'bg-red-50 border-red-300'}`}>
        <p className="text-3xl font-bold text-center">{conformite}%</p>
        <p className="text-xs text-center text-gray-600">Conformité ARS 1000-1</p>
      </div>

      {/* PDF Download Button */}
      {pdcId && (
        <Button
          variant="outline"
          className="w-full border-green-300 text-green-700 hover:bg-green-50"
          onClick={handleDownloadPDF}
          data-testid="visit-download-pdf"
        >
          <Download className="w-4 h-4 mr-2" /> Télécharger le PDC officiel (PDF)
        </Button>
      )}

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="bg-white rounded-lg border p-2"><p className="text-[10px] text-gray-400">Producteur</p><p className="font-semibold">{id.nom} {id.prenoms}</p><p className="text-[10px] text-gray-400">{id.village}</p></div>
        <div className="bg-white rounded-lg border p-2"><p className="text-[10px] text-gray-400">Ménage</p><p className="font-semibold">{menage.taille_menage} pers.</p><p className="text-[10px] text-gray-400">{menage.nombre_enfants} enfants</p></div>
        <div className="bg-white rounded-lg border p-2"><p className="text-[10px] text-gray-400">Parcelles</p><p className="font-semibold">{parcelles.length}</p><p className="text-[10px] text-gray-400">{parcelles.reduce((s, p) => s + (p.superficie_ha || 0), 0).toFixed(2)} ha</p></div>
        <div className="bg-white rounded-lg border p-2"><p className="text-[10px] text-gray-400">Arbres ombrage</p><p className="font-semibold">{arbres_ombrage.nombre_total}</p><p className="text-[10px] text-gray-400">{(arbres_ombrage.especes || []).length} espèces</p></div>
        <div className="bg-white rounded-lg border p-2"><p className="text-[10px] text-gray-400">Inventaire arbres</p><p className="font-semibold">{inventaire.length} relevés</p></div>
        <div className="bg-white rounded-lg border p-2"><p className="text-[10px] text-gray-400">Photos</p><p className="font-semibold">{photos.length}</p></div>
        <div className="bg-white rounded-lg border p-2"><p className="text-[10px] text-gray-400">Objectif rendement</p><p className="font-semibold">{strat.objectif_rendement_kg_ha} kg/ha</p></div>
        <div className="bg-white rounded-lg border p-2">
          <p className="text-[10px] text-gray-400">Signatures</p>
          <div className="flex gap-1 mt-0.5">
            {sigPlanteur?.data ? <Badge className="bg-green-100 text-green-700 text-[8px]">Planteur</Badge> : <Badge className="bg-gray-100 text-gray-400 text-[8px]">Planteur</Badge>}
            {sigAgent?.data ? <Badge className="bg-blue-100 text-blue-700 text-[8px]">Agent</Badge> : <Badge className="bg-gray-100 text-gray-400 text-[8px]">Agent</Badge>}
          </div>
        </div>
      </div>
    </div>
  );
};


// ======== MAIN PAGE ========
export default function AgentVisitePDC() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const farmerId = searchParams.get('farmer_id') || '';
  const farmerName = decodeURIComponent(searchParams.get('farmer_name') || '');

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [existingPDC, setExistingPDC] = useState(null);

  const [farmer, setFarmer] = useState(null);
  const [formData, setFormData] = useState({
    identification: { nom: '', prenoms: '', date_naissance: '', genre: '', numero_identification: '', telephone: '', localite: '', village: '', sous_prefecture: '', department: '', region: '', membre_groupe: false, statut_foncier: '' },
    menage: { taille_menage: 0, nombre_femmes: 0, nombre_enfants: 0, enfants_scolarises: 0, travailleurs_permanents: 0, travailleurs_temporaires: 0, depenses_mensuelles: 0, acces_banque: false, mobile_money: false },
    parcelles: [],
    arbres_ombrage: { nombre_total: 0, densite_par_ha: 0, especes: [], nombre_especes: 0, strate_haute: 0, strate_moyenne: 0, strate_basse: 0, conforme_agroforesterie: false },
    materiel_agricole: { outils: [], equipements_protection: [], produits_phytosanitaires: [], engrais: [], acces_intrants: false },
    matrice_strategique: { objectif_rendement_kg_ha: 0, horizon_annees: 5, risques_identifies: [], actions_prioritaires: [], cout_total_estime: 0 },
    notes: '',
  });
  const [inventaire, setInventaire] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [sigPlanteur, setSigPlanteur] = useState({ nom: farmerName, data: null, date: null });
  const [sigAgent, setSigAgent] = useState({ nom: user?.full_name || '', data: null, date: null });
  const [conformite, setConformite] = useState(0);

  // Load farmer and existing PDC
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load farmer info
        const fRes = await fetch(`${API_URL}/api/field-agent/my-farmers`, { headers: authHeaders() });
        if (fRes.ok) {
          const fData = await fRes.json();
          const f = (fData.farmers || []).find(f => f.id === farmerId);
          if (f) {
            setFarmer(f);
            setSigPlanteur(prev => ({ ...prev, nom: f.full_name || farmerName }));
          }
        }
        // Load existing PDC
        const pRes = await fetch(`${API_URL}/api/ars1000/pdc/farmer/${farmerId}`, { headers: authHeaders() });
        if (pRes.ok) {
          const pdc = await pRes.json();
          if (pdc && pdc.id) {
            setExistingPDC(pdc);
            setFormData({
              identification: pdc.identification || formData.identification,
              menage: pdc.menage || formData.menage,
              parcelles: pdc.parcelles || [],
              arbres_ombrage: pdc.arbres_ombrage || formData.arbres_ombrage,
              materiel_agricole: pdc.materiel_agricole || formData.materiel_agricole,
              matrice_strategique: pdc.matrice_strategique || formData.matrice_strategique,
              notes: pdc.notes || '',
            });
            setConformite(pdc.pourcentage_conformite || 0);
            if (pdc.inventaire_arbres) setInventaire(pdc.inventaire_arbres);
          }
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmerId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const body = {
        farmer_id: farmerId,
        ...formData,
        inventaire_arbres: inventaire,
        photos_parcelle: photos.map(p => p.data?.substring(0, 100) || ''), // Store reference not full data
        signature_planteur: sigPlanteur?.data ? sigPlanteur : null,
        signature_agent: sigAgent?.data ? sigAgent : null,
      };

      // Auto-calc agroforestry conformity
      body.arbres_ombrage.nombre_especes = (body.arbres_ombrage.especes || []).length;
      const d = body.arbres_ombrage.densite_par_ha || 0;
      const e = body.arbres_ombrage.nombre_especes || 0;
      body.arbres_ombrage.conforme_agroforesterie = (d >= 25 && d <= 40 && e >= 3 &&
        (body.arbres_ombrage.strate_haute || 0) > 0 &&
        (body.arbres_ombrage.strate_moyenne || 0) > 0 &&
        (body.arbres_ombrage.strate_basse || 0) > 0);

      const res = await fetch(`${API_URL}/api/ars1000/pdc/agent-visit`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Erreur');
      }

      const result = await res.json();
      setExistingPDC(result);
      setConformite(result.pourcentage_conformite || 0);
      toast.success('PDC sauvegardé');
    } catch (e) {
      toast.error(e.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteVisit = async () => {
    if (!sigPlanteur?.data) {
      toast.error('Signature du planteur requise');
      return;
    }
    // Save first
    await handleSave();

    if (!existingPDC?.id) {
      toast.error('Sauvegardez d\'abord le PDC');
      return;
    }

    setCompleting(true);
    try {
      const res = await fetch(`${API_URL}/api/ars1000/pdc/${existingPDC.id}/complete-visit`, {
        method: 'POST',
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error((await res.json()).detail);
      const result = await res.json();
      toast.success('Visite terrain terminée ! Notification envoyée à la coopérative.');
      navigate(-1);
    } catch (e) {
      toast.error(e.message || 'Erreur');
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="animate-spin w-8 h-8 text-green-600" />
      </div>
    );
  }

  const isCompleted = existingPDC?.statut === 'complete_agent' || existingPDC?.statut === 'valide';

  return (
    <div className="min-h-screen bg-gray-50" data-testid="agent-visite-pdc">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg" data-testid="visit-back-btn">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-bold text-gray-900 truncate">Visite Terrain — PDC</h1>
              <p className="text-[10px] text-gray-500 truncate">{farmerName || 'Planteur'} | ARS 1000-1</p>
            </div>
            {existingPDC && (
              <Badge className={
                existingPDC.statut === 'valide' ? 'bg-green-100 text-green-700' :
                existingPDC.statut === 'complete_agent' ? 'bg-blue-100 text-blue-700' :
                'bg-amber-100 text-amber-700'
              }>
                {existingPDC.statut === 'complete_agent' ? 'Complété' : existingPDC.statut}
              </Badge>
            )}
          </div>

          {/* Conformité */}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] text-gray-400">Conformité:</span>
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${conformite >= 80 ? 'bg-green-500' : conformite >= 50 ? 'bg-amber-500' : 'bg-red-400'}`} style={{ width: `${conformite}%` }} />
            </div>
            <span className="text-xs font-bold text-gray-700">{conformite}%</span>
          </div>

          {/* Steps */}
          <div className="flex gap-0.5 mt-2 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4">
            {STEPS.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setStep(i)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium whitespace-nowrap transition-colors ${
                  step === i ? 'bg-green-600 text-white' : i < step ? 'bg-green-100 text-green-700' : 'text-gray-400 hover:bg-gray-100'
                }`}
                data-testid={`visit-step-btn-${s.id}`}
              >
                <s.icon className="w-3 h-3" />
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          {step === 0 && <IdentificationStep data={formData.identification} onChange={(d) => setFormData({ ...formData, identification: d })} farmer={farmer} />}
          {step === 1 && <MenageStep data={formData.menage} onChange={(d) => setFormData({ ...formData, menage: d })} />}
          {step === 2 && <ParcellesStep data={formData.parcelles} onChange={(d) => setFormData({ ...formData, parcelles: d })} />}
          {step === 3 && <>
            <InventaireArbresStep arbresOmbrage={formData.arbres_ombrage} onArbresChange={(d) => setFormData({ ...formData, arbres_ombrage: d })} inventaire={inventaire} onInventaireChange={setInventaire} />
            {farmerId && <RecommandationsPanel farmerId={farmerId} />}
          </>}
          {step === 4 && <MaterielStep data={formData.materiel_agricole} onChange={(d) => setFormData({ ...formData, materiel_agricole: d })} />}
          {step === 5 && <StrategieStep data={formData.matrice_strategique} onChange={(d) => setFormData({ ...formData, matrice_strategique: d })} />}
          {step === 6 && <PhotosStep photos={photos} onPhotosChange={setPhotos} />}
          {step === 7 && <SignaturesStep sigPlanteur={sigPlanteur} onSigPlanteur={setSigPlanteur} sigAgent={sigAgent} onSigAgent={setSigAgent} farmerName={farmerName} agentName={user?.full_name || ''} />}
          {step === 8 && <ResumeStep formData={formData} inventaire={inventaire} photos={photos} sigPlanteur={sigPlanteur} sigAgent={sigAgent} conformite={conformite} pdcId={existingPDC?.id} />}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-4 pb-8">
          <Button variant="outline" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} data-testid="visit-prev">
            <ChevronLeft className="w-4 h-4 mr-1" /> Précédent
          </Button>

          <div className="flex gap-2">
            {!isCompleted && (
              <Button variant="outline" onClick={handleSave} disabled={saving} data-testid="visit-save">
                {saving ? <Loader2 className="animate-spin w-4 h-4 mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                Sauvegarder
              </Button>
            )}

            {step === STEPS.length - 1 ? (
              !isCompleted && (
                <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleCompleteVisit} disabled={completing} data-testid="visit-complete">
                  {completing ? <Loader2 className="animate-spin w-4 h-4 mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                  Terminer la visite
                </Button>
              )
            ) : (
              <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => setStep(Math.min(STEPS.length - 1, step + 1))} data-testid="visit-next">
                Suivant <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

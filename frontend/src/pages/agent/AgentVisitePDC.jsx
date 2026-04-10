import { tokenService } from "../../services/tokenService";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import {
  User, Home, MapPin, TreePine, Wrench, Target,
  FileText, Camera, PenLine, CheckCircle2, ChevronRight,
  ChevronLeft, Loader2, Save, Send, ArrowLeft, Leaf,
  Navigation, Plus, Trash2, X, Check, Eye, Download,
  Lightbulb, AlertTriangle
} from 'lucide-react';
import { GeoSelectCI } from '../../components/GeoSelectCI';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const getToken = () => tokenService.getToken();
const authHeaders = () => ({ 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' });

const STEPS = [
  { id: 'fiche1', label: 'Identification', icon: User },
  { id: 'fiche2', label: 'Menage', icon: Home },
  { id: 'fiche3', label: 'Exploitation', icon: MapPin },
  { id: 'fiche4', label: 'Inventaire', icon: TreePine },
  { id: 'fiche5', label: 'Ombrage', icon: Leaf },
  { id: 'fiche6', label: 'Materiel', icon: Wrench },
  { id: 'fiche7', label: 'Planification', icon: Target },
  { id: 'photos', label: 'Photos', icon: Camera },
  { id: 'signature', label: 'Signatures', icon: PenLine },
  { id: 'resume', label: 'Resume', icon: FileText },
];

const SOURCE_MATERIEL_OPTIONS = ['SATMACI/ANADER/CNRA', 'Tout venant', 'Pepinieriste prive'];

const INITIAL_FORM = {
  identification: {
    nom: '', prenoms: '', contact_tel: '', code_national: '', code_groupe: '',
    nom_entite: '', code_entite: '', delegation_regionale: '',
    region: '', department: '', sous_prefecture: '', village: '', campement: '',
    genre: '', date_naissance: '', statut_foncier: '',
  },
  epargne: {
    mobile_money: { compte: false, argent_compte: false, financement: false, montant: '' },
    microfinance: { compte: false, argent_compte: false, financement: false, montant: '' },
    banque: { compte: false, argent_compte: false, financement: false, montant: '' },
    autres: { compte: false, argent_compte: false, financement: false, montant: '', precision: '' },
  },
  menage: [
    { type: "Proprietaire de l'exploitation", nombre: '', a_ecole: '', aucun: '', primaire: '', secondaire: '', universitaire: '', plein_temps: '', occasionnel: '' },
    { type: 'Gerant ou representant', nombre: '', a_ecole: '', aucun: '', primaire: '', secondaire: '', universitaire: '', plein_temps: '', occasionnel: '' },
    { type: 'Conjoints', nombre: '', a_ecole: '', aucun: '', primaire: '', secondaire: '', universitaire: '', plein_temps: '', occasionnel: '' },
    { type: 'Enfants 0-6 ans', nombre: '', a_ecole: '', aucun: '', primaire: '', secondaire: '', universitaire: '', plein_temps: '', occasionnel: '' },
    { type: 'Enfants 6-18 ans', nombre: '', a_ecole: '', aucun: '', primaire: '', secondaire: '', universitaire: '', plein_temps: '', occasionnel: '' },
    { type: 'Enfants +18 ans', nombre: '', a_ecole: '', aucun: '', primaire: '', secondaire: '', universitaire: '', plein_temps: '', occasionnel: '' },
    { type: 'Manoeuvres', nombre: '', a_ecole: '', aucun: '', primaire: '', secondaire: '', universitaire: '', plein_temps: '', occasionnel: '' },
    { type: 'Autres', nombre: '', a_ecole: '', aucun: '', primaire: '', secondaire: '', universitaire: '', plein_temps: '', occasionnel: '' },
  ],
  exploitation: {
    superficie_totale_ha: '', superficie_cultivee_ha: '', superficie_foret_ha: '',
    superficie_jachere_ha: '', source_eau: '', type_source_eau: '',
  },
  cultures: [
    { nom: 'Cacao - Parcelle 1', superficie: '', annee_creation: '', source_materiel: '', production_kg: '', revenu_fcfa: '' },
  ],
  inventaire_arbres: [],
  arbres_ombrage: { strate1: '', strate2: '', strate3: '', total: '' },
  materiel: [
    { type: 'Materiel de traitement', designation: 'Pulverisateur', quantite: '', annee: '', cout: '', bon: '', acceptable: '', mauvais: '' },
    { type: 'Materiel de traitement', designation: 'Atomiseur', quantite: '', annee: '', cout: '', bon: '', acceptable: '', mauvais: '' },
    { type: 'Materiel de traitement', designation: 'EPI', quantite: '', annee: '', cout: '', bon: '', acceptable: '', mauvais: '' },
    { type: 'Materiel de transport', designation: 'Tricycle', quantite: '', annee: '', cout: '', bon: '', acceptable: '', mauvais: '' },
    { type: 'Materiel de transport', designation: 'Brouette', quantite: '', annee: '', cout: '', bon: '', acceptable: '', mauvais: '' },
    { type: 'Materiel de transport', designation: 'Camion/camionnette', quantite: '', annee: '', cout: '', bon: '', acceptable: '', mauvais: '' },
    { type: 'Moyen de deplacement', designation: 'Velo', quantite: '', annee: '', cout: '', bon: '', acceptable: '', mauvais: '' },
    { type: 'Moyen de deplacement', designation: 'Moto', quantite: '', annee: '', cout: '', bon: '', acceptable: '', mauvais: '' },
    { type: 'Moyen de deplacement', designation: 'Voiture', quantite: '', annee: '', cout: '', bon: '', acceptable: '', mauvais: '' },
    { type: 'Materiel de sechage', designation: 'Claie/Seco', quantite: '', annee: '', cout: '', bon: '', acceptable: '', mauvais: '' },
    { type: 'Materiel de sechage', designation: 'Aire cimentee', quantite: '', annee: '', cout: '', bon: '', acceptable: '', mauvais: '' },
    { type: 'Materiel de sechage', designation: 'Sechoir solaire', quantite: '', annee: '', cout: '', bon: '', acceptable: '', mauvais: '' },
    { type: 'Materiel de fermentation', designation: 'Bac de fermentation', quantite: '', annee: '', cout: '', bon: '', acceptable: '', mauvais: '' },
    { type: 'Petit outillage', designation: 'Machette/emondoir', quantite: '', annee: '', cout: '', bon: '', acceptable: '', mauvais: '' },
    { type: 'Petit outillage', designation: 'Materiel de recolte', quantite: '', annee: '', cout: '', bon: '', acceptable: '', mauvais: '' },
    { type: 'Petit outillage', designation: 'Tronconneuse', quantite: '', annee: '', cout: '', bon: '', acceptable: '', mauvais: '' },
  ],
  matrice_strategique: [
    { axe: 'Axe 1: Rehabilitation du verger', objectifs: '', activites: '', cout: '', a1: false, a2: false, a3: false, a4: false, a5: false, responsable: '', partenaires: '' },
    { axe: 'Axe 2: Gestion du swollen shoot', objectifs: '', activites: '', cout: '', a1: false, a2: false, a3: false, a4: false, a5: false, responsable: '', partenaires: '' },
    { axe: 'Axe 3: Diversification espaces vides', objectifs: '', activites: '', cout: '', a1: false, a2: false, a3: false, a4: false, a5: false, responsable: '', partenaires: '' },
    { axe: 'Axe 4: Gestion arbres compagnons', objectifs: '', activites: '', cout: '', a1: false, a2: false, a3: false, a4: false, a5: false, responsable: '', partenaires: '' },
    { axe: 'Axe 5: Gestion technique exploitation', objectifs: '', activites: '', cout: '', a1: false, a2: false, a3: false, a4: false, a5: false, responsable: '', partenaires: '' },
    { axe: 'Axe 6: Gestion financiere exploitation', objectifs: '', activites: '', cout: '', a1: false, a2: false, a3: false, a4: false, a5: false, responsable: '', partenaires: '' },
  ],
  programme_annuel: [
    { axe: '', activite: '', sous_activite: '', indicateur: '', t1: false, t2: false, t3: false, t4: false, execution: '', appui: '', cout: '' },
  ],
  notes: '',
};

// ======== SIGNATURE CANVAS ========
const SignatureCanvas = ({ onSave, label, savedData }) => {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(!!savedData);

  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedData]);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  };
  const startDraw = (e) => { e.preventDefault(); setDrawing(true); const ctx = canvasRef.current.getContext('2d'); const pos = getPos(e); ctx.beginPath(); ctx.moveTo(pos.x, pos.y); };
  const draw = (e) => { if (!drawing) return; e.preventDefault(); const ctx = canvasRef.current.getContext('2d'); const pos = getPos(e); ctx.lineTo(pos.x, pos.y); ctx.stroke(); };
  const endDraw = () => { if (!drawing) return; setDrawing(false); setHasSignature(true); onSave(canvasRef.current.toDataURL('image/png')); };
  const clear = () => { const canvas = canvasRef.current; canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height); setHasSignature(false); onSave(null); };

  return (
    <div data-testid={`signature-${label}`}>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-semibold text-gray-600">{label}</label>
        {hasSignature && <button onClick={clear} className="text-xs text-red-500 flex items-center gap-1"><Trash2 className="w-3 h-3" /> Effacer</button>}
      </div>
      <div className="border-2 border-dashed border-gray-300 rounded-xl bg-white overflow-hidden relative" style={{ touchAction: 'none' }}>
        <canvas ref={canvasRef} className="w-full cursor-crosshair" style={{ height: '140px' }}
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
        {!hasSignature && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><p className="text-gray-300 text-sm">Signez ici</p></div>}
      </div>
    </div>
  );
};

// ======== FICHE 1: IDENTIFICATION ========
const Fiche1Agent = ({ data, epargne, onChange, onEpargneChange, farmer }) => {
  const update = (f, v) => onChange({ ...data, [f]: v });
  const updateEp = (cat, f, v) => onEpargneChange({ ...epargne, [cat]: { ...epargne[cat], [f]: v } });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (farmer && !data.nom) {
      const parts = (farmer.full_name || '').split(' ');
      onChange({ ...data, nom: parts[0] || '', prenoms: parts.slice(1).join(' ') || '', contact_tel: farmer.phone_number || '', village: farmer.village || '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmer]);

  return (
    <div className="space-y-4" data-testid="visit-fiche1">
      <h3 className="font-bold text-gray-900 text-sm border-b pb-2">FICHE 1 : IDENTIFICATION DU PRODUCTEUR</h3>
      <div className="grid grid-cols-2 gap-3">
        {[
          { l: 'Nom *', f: 'nom' }, { l: 'Prenoms *', f: 'prenoms' },
          { l: 'Contact (Tel) *', f: 'contact_tel', type: 'tel' },
          { l: 'Code National', f: 'code_national' }, { l: 'Code Groupe', f: 'code_groupe' },
          { l: 'Nom Entite reconnue', f: 'nom_entite' }, { l: 'Code Entite', f: 'code_entite' },
          { l: 'Date de naissance', f: 'date_naissance', type: 'date' },
          { l: 'Village', f: 'village' }, { l: 'Campement', f: 'campement' },
        ].map(({ l, f, type }) => (
          <div key={f}>
            <label className="text-[10px] text-gray-500 font-medium block mb-1">{l}</label>
            <Input type={type || 'text'} value={data[f] || ''} onChange={(e) => update(f, e.target.value)} className="h-8 text-xs" data-testid={`visit-f1-${f}`} />
          </div>
        ))}
        <div>
          <label className="text-[10px] text-gray-500 font-medium block mb-1">Genre</label>
          <select className="border rounded-lg px-2 py-1.5 text-xs w-full" value={data.genre || ''} onChange={(e) => update('genre', e.target.value)} data-testid="visit-f1-genre">
            <option value="">--</option><option value="homme">Homme</option><option value="femme">Femme</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] text-gray-500 font-medium block mb-1">Statut foncier</label>
          <select className="border rounded-lg px-2 py-1.5 text-xs w-full" value={data.statut_foncier || ''} onChange={(e) => update('statut_foncier', e.target.value)} data-testid="visit-f1-statut">
            <option value="">--</option><option value="proprietaire">Proprietaire</option><option value="metayer">Metayer</option><option value="locataire">Locataire</option>
          </select>
        </div>
      </div>
      <div className="mt-2 pt-2 border-t">
        <label className="text-[10px] text-gray-500 font-medium block mb-2">Localisation administrative</label>
        <GeoSelectCI region={data.region || ''} departement={data.department || ''} sousPrefecture={data.sous_prefecture || ''} onChange={(f, v) => update(f, v)} />
      </div>
      <div className="mt-3 pt-3 border-t">
        <h4 className="font-semibold text-xs text-gray-800 mb-2">Situation de l'epargne</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] border-collapse">
            <thead><tr className="bg-gray-50">
              <th className="border p-1.5 text-left">Epargne</th>
              <th className="border p-1.5 text-center">Compte</th>
              <th className="border p-1.5 text-center">Argent</th>
              <th className="border p-1.5 text-center">Financement</th>
              <th className="border p-1.5 text-center">Montant</th>
            </tr></thead>
            <tbody>
              {['mobile_money', 'microfinance', 'banque', 'autres'].map(cat => (
                <tr key={cat}>
                  <td className="border p-1.5 font-medium capitalize">{cat.replace('_', ' ')}</td>
                  <td className="border p-1 text-center"><input type="checkbox" checked={epargne[cat]?.compte || false} onChange={(e) => updateEp(cat, 'compte', e.target.checked)} /></td>
                  <td className="border p-1 text-center"><input type="checkbox" checked={epargne[cat]?.argent_compte || false} onChange={(e) => updateEp(cat, 'argent_compte', e.target.checked)} /></td>
                  <td className="border p-1 text-center"><input type="checkbox" checked={epargne[cat]?.financement || false} onChange={(e) => updateEp(cat, 'financement', e.target.checked)} /></td>
                  <td className="border p-1"><Input type="number" value={epargne[cat]?.montant || ''} onChange={(e) => updateEp(cat, 'montant', e.target.value)} className="h-6 text-[10px]" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ======== FICHE 2: MENAGE ========
const Fiche2Agent = ({ data, onChange }) => {
  const updateRow = (i, f, v) => { const n = [...data]; n[i] = { ...n[i], [f]: v }; onChange(n); };
  return (
    <div className="space-y-3" data-testid="visit-fiche2">
      <h3 className="font-bold text-gray-900 text-sm border-b pb-2">FICHE 2 : SITUATION DU MENAGE</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-[10px] border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-gray-50">
              <th className="border p-1.5 text-left" rowSpan={2}>Membre</th>
              <th className="border p-1.5 text-center" rowSpan={2}>Nb</th>
              <th className="border p-1.5 text-center" rowSpan={2}>Ecole</th>
              <th className="border p-1.5 text-center" colSpan={4}>Niveau instruction</th>
              <th className="border p-1.5 text-center" colSpan={2}>Travail plantation</th>
            </tr>
            <tr className="bg-gray-50">
              <th className="border p-1 text-center">Aucun</th><th className="border p-1 text-center">Prim.</th>
              <th className="border p-1 text-center">Sec.</th><th className="border p-1 text-center">Univ.</th>
              <th className="border p-1 text-center">Plein</th><th className="border p-1 text-center">Occ.</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={`el-${i}`}>
                <td className="border p-1.5 font-medium text-[9px]">{row.type}</td>
                {['nombre', 'a_ecole', 'aucun', 'primaire', 'secondaire', 'universitaire', 'plein_temps', 'occasionnel'].map(f => (
                  <td key={f} className="border p-0.5"><Input type="number" min={0} value={row[f] || ''} onChange={(e) => updateRow(i, f, e.target.value)} className="h-6 text-[10px] text-center w-full border-0" /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ======== FICHE 3: EXPLOITATION (with GPS) ========
const Fiche3Agent = ({ exploitation, cultures, onExploitationChange, onCulturesChange }) => {
  const updateExp = (f, v) => onExploitationChange({ ...exploitation, [f]: v });
  const updateCulture = (i, f, v) => { const n = [...cultures]; n[i] = { ...n[i], [f]: v }; onCulturesChange(n); };
  const addCulture = () => onCulturesChange([...cultures, { nom: '', superficie: '', annee_creation: '', source_materiel: '', production_kg: '', revenu_fcfa: '' }]);
  const removeCulture = (i) => onCulturesChange(cultures.filter((_, idx) => idx !== i));

  const captureGPS = (i) => {
    if (!navigator.geolocation) { toast.error('GPS non disponible'); return; }
    toast.info('Capture GPS...');
    navigator.geolocation.getCurrentPosition(
      (pos) => { updateCulture(i, 'latitude', pos.coords.latitude); updateCulture(i, 'longitude', pos.coords.longitude); toast.success(`GPS parcelle ${i + 1} capture`); },
      () => toast.error('GPS non disponible'), { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  return (
    <div className="space-y-4" data-testid="visit-fiche3">
      <h3 className="font-bold text-gray-900 text-sm border-b pb-2">FICHE 3 : DESCRIPTION DE L'EXPLOITATION</h3>
      <div className="grid grid-cols-2 gap-3">
        {[
          { l: 'Superficie totale (ha)', f: 'superficie_totale_ha' },
          { l: 'Superficie cultivee (ha)', f: 'superficie_cultivee_ha' },
          { l: 'Superficie foret (ha)', f: 'superficie_foret_ha' },
          { l: 'Superficie jachere (ha)', f: 'superficie_jachere_ha' },
        ].map(({ l, f }) => (
          <div key={f}>
            <label className="text-[10px] text-gray-500 font-medium block mb-1">{l}</label>
            <Input type="number" step="0.01" value={exploitation[f] || ''} onChange={(e) => updateExp(f, e.target.value)} className="h-8 text-xs" data-testid={`visit-f3-${f}`} />
          </div>
        ))}
        <div>
          <label className="text-[10px] text-gray-500 font-medium block mb-1">Source d'eau</label>
          <select className="border rounded-lg px-2 py-1.5 text-xs w-full" value={exploitation.source_eau || ''} onChange={(e) => updateExp('source_eau', e.target.value)}>
            <option value="">--</option><option value="oui">Oui</option><option value="non">Non</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] text-gray-500 font-medium block mb-1">Type de source</label>
          <select className="border rounded-lg px-2 py-1.5 text-xs w-full" value={exploitation.type_source_eau || ''} onChange={(e) => updateExp('type_source_eau', e.target.value)}>
            <option value="">--</option><option value="riviere">Riviere</option><option value="marigot">Marigot</option><option value="puits">Puits</option><option value="forage">Forage</option><option value="source">Source naturelle</option>
          </select>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-xs text-gray-800">Cultures</h4>
          <Button size="sm" variant="outline" onClick={addCulture} data-testid="visit-add-culture"><Plus className="w-3 h-3 mr-1" /> Ajouter</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] border-collapse min-w-[650px]">
            <thead><tr className="bg-gray-50">
              <th className="border p-1.5 text-left">Culture</th>
              <th className="border p-1.5 text-center">Sup. (ha)</th>
              <th className="border p-1.5 text-center">Annee</th>
              <th className="border p-1.5 text-center">Source</th>
              <th className="border p-1.5 text-center">Prod. (kg)</th>
              <th className="border p-1.5 text-center">Revenu</th>
              <th className="border p-1 w-12">GPS</th>
              <th className="border p-1 w-6"></th>
            </tr></thead>
            <tbody>
              {cultures.map((c, i) => (
                <tr key={`el-${i}`}>
                  <td className="border p-0.5"><Input value={c.nom || ''} onChange={(e) => updateCulture(i, 'nom', e.target.value)} className="h-6 text-[10px] border-0" placeholder="Cacao P1" /></td>
                  <td className="border p-0.5"><Input type="number" step="0.01" value={c.superficie || ''} onChange={(e) => updateCulture(i, 'superficie', e.target.value)} className="h-6 text-[10px] border-0 text-center" /></td>
                  <td className="border p-0.5"><Input type="number" value={c.annee_creation || ''} onChange={(e) => updateCulture(i, 'annee_creation', e.target.value)} className="h-6 text-[10px] border-0 text-center" placeholder="2010" /></td>
                  <td className="border p-0.5">
                    <select className="text-[10px] w-full h-6 border-0" value={c.source_materiel || ''} onChange={(e) => updateCulture(i, 'source_materiel', e.target.value)}>
                      <option value="">--</option>{SOURCE_MATERIEL_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </td>
                  <td className="border p-0.5"><Input type="number" value={c.production_kg || ''} onChange={(e) => updateCulture(i, 'production_kg', e.target.value)} className="h-6 text-[10px] border-0 text-center" /></td>
                  <td className="border p-0.5"><Input type="number" value={c.revenu_fcfa || ''} onChange={(e) => updateCulture(i, 'revenu_fcfa', e.target.value)} className="h-6 text-[10px] border-0 text-center" /></td>
                  <td className="border p-0.5 text-center">
                    <button onClick={() => captureGPS(i)} className="text-blue-600 text-[9px] flex items-center gap-0.5 mx-auto" data-testid={`visit-gps-culture-${i}`}>
                      <Navigation className="w-3 h-3" />{c.latitude ? 'OK' : 'GPS'}
                    </button>
                  </td>
                  <td className="border p-0.5 text-center"><button onClick={() => removeCulture(i)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ======== FICHE 4: INVENTAIRE ARBRES (with GPS) ========
const Fiche4Agent = ({ data, onChange, farmerId }) => {
  const addArbre = () => onChange([...data, { nom_botanique: '', nom_local: '', circonference: '', longitude: '', latitude: '', origine: 'preserve', decision: 'maintenir' }]);
  const updateArbre = (i, f, v) => { const n = [...data]; n[i] = { ...n[i], [f]: v }; onChange(n); };
  const removeArbre = (i) => onChange(data.filter((_, idx) => idx !== i));

  const captureArbreGPS = (i) => {
    if (!navigator.geolocation) { toast.error('GPS non disponible'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { updateArbre(i, 'longitude', pos.coords.longitude.toString()); updateArbre(i, 'latitude', pos.coords.latitude.toString()); toast.success(`GPS arbre ${i + 1} capture`); },
      () => toast.error('GPS non disponible'), { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  return (
    <div className="space-y-3" data-testid="visit-fiche4">
      <h3 className="font-bold text-gray-900 text-sm border-b pb-2">FICHE 4 : INVENTAIRE DES ARBRES</h3>
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={addArbre} data-testid="visit-add-arbre"><Plus className="w-3 h-3 mr-1" /> Ajouter arbre</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[10px] border-collapse min-w-[700px]">
          <thead><tr className="bg-gray-50">
            <th className="border p-1.5 text-center w-8">N</th>
            <th className="border p-1.5 text-center">Nom botanique</th>
            <th className="border p-1.5 text-center">Nom local</th>
            <th className="border p-1.5 text-center">Circ. (cm)</th>
            <th className="border p-1.5 text-center">Origine</th>
            <th className="border p-1.5 text-center">Decision</th>
            <th className="border p-1 w-10">GPS</th>
            <th className="border p-1 w-6"></th>
          </tr></thead>
          <tbody>
            {data.length === 0 ? (
              <tr><td colSpan={8} className="border p-3 text-center text-gray-400">Cliquez "Ajouter arbre"</td></tr>
            ) : data.map((a, i) => (
              <tr key={`el-${i}`}>
                <td className="border p-1 text-center font-medium">{i + 1}</td>
                <td className="border p-0.5"><Input value={a.nom_botanique || ''} onChange={(e) => updateArbre(i, 'nom_botanique', e.target.value)} className="h-6 text-[10px] border-0" placeholder="Terminalia..." /></td>
                <td className="border p-0.5"><Input value={a.nom_local || ''} onChange={(e) => updateArbre(i, 'nom_local', e.target.value)} className="h-6 text-[10px] border-0" placeholder="Frake" /></td>
                <td className="border p-0.5"><Input type="number" value={a.circonference || ''} onChange={(e) => updateArbre(i, 'circonference', e.target.value)} className="h-6 text-[10px] border-0 text-center" /></td>
                <td className="border p-0.5">
                  <select className="text-[10px] w-full h-6 border-0" value={a.origine || 'preserve'} onChange={(e) => updateArbre(i, 'origine', e.target.value)}>
                    <option value="preserve">Preserve</option><option value="plante">Plante</option>
                  </select>
                </td>
                <td className="border p-0.5">
                  <select className="text-[10px] w-full h-6 border-0" value={a.decision || 'maintenir'} onChange={(e) => updateArbre(i, 'decision', e.target.value)}>
                    <option value="maintenir">Maintenir</option><option value="eliminer">Eliminer</option>
                  </select>
                </td>
                <td className="border p-0.5 text-center">
                  <button onClick={() => captureArbreGPS(i)} className="text-blue-600 text-[9px]" data-testid={`visit-gps-arbre-${i}`}>
                    <Navigation className="w-3 h-3 mx-auto" />{a.latitude ? 'OK' : ''}
                  </button>
                </td>
                <td className="border p-0.5 text-center"><button onClick={() => removeArbre(i)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {farmerId && <RecommandationsPanel farmerId={farmerId} />}
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
      if (res.ok) { setRecs(await res.json()); setExpanded(true); }
      else toast.error('Impossible de charger les recommandations');
    } catch { toast.error('Erreur reseau'); }
    finally { setLoading(false); }
  };

  const pColors = { critique: 'bg-red-100 text-red-700 border-red-200', haute: 'bg-amber-100 text-amber-700 border-amber-200', moyenne: 'bg-blue-100 text-blue-700 border-blue-200', basse: 'bg-gray-100 text-gray-600 border-gray-200' };

  return (
    <div className="mt-4" data-testid="recommandations-panel">
      <Button variant="outline" className="w-full border-green-200 text-green-700 hover:bg-green-50" onClick={loadRecs} disabled={loading} data-testid="load-recommandations-btn">
        {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Lightbulb className="w-4 h-4 mr-2" />}
        {expanded ? 'Masquer les recommandations' : 'Recommandations intelligentes'}
      </Button>
      {expanded && recs && (
        <div className="mt-3 space-y-3">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-3 border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-green-800">Projection apres plan</span>
              <Badge className="bg-green-600 text-white">{recs.projection?.score_projete}%</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div><span className="text-gray-500">Densite actuelle:</span> <b>{recs.projection?.densite_actuelle}/ha</b></div>
              <div><span className="text-gray-500">Densite projetee:</span> <b className="text-green-700">{recs.projection?.densite_projetee}/ha</b></div>
            </div>
          </div>
          {recs.recommendations?.map((rec, i) => (
            <div key={`el-${i}`} className={`rounded-xl p-3 border ${pColors[rec.priorite] || pColors.basse}`}>
              <div className="flex items-center gap-2 mb-1"><AlertTriangle className="w-3.5 h-3.5" /><Badge className={pColors[rec.priorite]}>{rec.priorite}</Badge></div>
              <p className="text-xs font-medium">{rec.message}</p>
              {rec.especes_suggerees?.map((sp, j) => (
                <div key={j} className="bg-white/70 rounded-lg px-2 py-1 text-[10px] mt-1"><b>{sp.nom_local || sp.nom}</b> <i className="text-gray-400">({sp.nom_scientifique})</i></div>
              ))}
            </div>
          ))}
          {recs.plan_plantation?.length > 0 && (
            <div className="bg-white rounded-xl border border-green-100 p-3">
              <p className="text-xs font-bold text-green-800 mb-2">Plan de plantation</p>
              {recs.plan_plantation.map((p, i) => (
                <div key={`el-${i}`} className="flex items-center justify-between text-[10px] bg-green-50 rounded-lg px-2 py-1 mb-1">
                  <span><b>{p.espece}</b> ({p.strate})</span><b className="text-green-700">{p.quantite} arbres</b>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ======== FICHE 5: ARBRES D'OMBRAGE ========
const Fiche5Agent = ({ data, onChange }) => {
  const update = (f, v) => {
    const n = { ...data, [f]: v };
    n.total = (parseInt(n.strate1) || 0) + (parseInt(n.strate2) || 0) + (parseInt(n.strate3) || 0);
    onChange(n);
  };
  return (
    <div className="space-y-3" data-testid="visit-fiche5">
      <h3 className="font-bold text-gray-900 text-sm border-b pb-2">FICHE 5 : ARBRES D'OMBRAGE (Resume)</h3>
      <table className="w-full text-xs border-collapse max-w-md">
        <tbody>
          <tr><td className="border p-2 font-medium bg-gray-50">Strate 1 (basse, 3-5m)</td><td className="border p-1 w-24"><Input type="number" value={data.strate1 || ''} onChange={(e) => update('strate1', e.target.value)} className="h-7 text-xs text-center border-0" data-testid="visit-f5-strate1" /></td></tr>
          <tr><td className="border p-2 font-medium bg-gray-50">Strate 2 (moyenne, 10-20m)</td><td className="border p-1 w-24"><Input type="number" value={data.strate2 || ''} onChange={(e) => update('strate2', e.target.value)} className="h-7 text-xs text-center border-0" data-testid="visit-f5-strate2" /></td></tr>
          <tr><td className="border p-2 font-medium bg-gray-50">Strate 3 (haute, &gt;30m)</td><td className="border p-1 w-24"><Input type="number" value={data.strate3 || ''} onChange={(e) => update('strate3', e.target.value)} className="h-7 text-xs text-center border-0" data-testid="visit-f5-strate3" /></td></tr>
          <tr className="bg-green-50"><td className="border p-2 font-bold">Total arbres d'ombrage</td><td className="border p-2 text-center font-bold text-green-700">{data.total || 0}</td></tr>
        </tbody>
      </table>
    </div>
  );
};

// ======== FICHE 6: MATERIEL ========
const Fiche6Agent = ({ data, onChange }) => {
  const updateRow = (i, f, v) => { const n = [...data]; n[i] = { ...n[i], [f]: v }; onChange(n); };
  let lastType = '';
  return (
    <div className="space-y-3" data-testid="visit-fiche6">
      <h3 className="font-bold text-gray-900 text-sm border-b pb-2">FICHE 6 : MATERIEL AGRICOLE</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-[10px] border-collapse min-w-[700px]">
          <thead><tr className="bg-gray-50">
            <th className="border p-1.5 text-left">Type</th>
            <th className="border p-1.5 text-left">Designation</th>
            <th className="border p-1.5 text-center">Qte</th>
            <th className="border p-1.5 text-center">Annee</th>
            <th className="border p-1.5 text-center">Cout</th>
            <th className="border p-1.5 text-center">Bon</th>
            <th className="border p-1.5 text-center">Acc.</th>
            <th className="border p-1.5 text-center">Mauv.</th>
          </tr></thead>
          <tbody>
            {data.map((row, i) => {
              const showType = row.type !== lastType;
              lastType = row.type;
              return (
                <tr key={`el-${i}`}>
                  <td className="border p-1.5 font-medium">{showType ? row.type : ''}</td>
                  <td className="border p-1.5">{row.designation}</td>
                  <td className="border p-0.5"><Input type="number" min={0} value={row.quantite || ''} onChange={(e) => updateRow(i, 'quantite', e.target.value)} className="h-6 text-[10px] border-0 text-center" /></td>
                  <td className="border p-0.5"><Input type="number" value={row.annee || ''} onChange={(e) => updateRow(i, 'annee', e.target.value)} className="h-6 text-[10px] border-0 text-center" placeholder="2024" /></td>
                  <td className="border p-0.5"><Input type="number" value={row.cout || ''} onChange={(e) => updateRow(i, 'cout', e.target.value)} className="h-6 text-[10px] border-0 text-center" /></td>
                  <td className="border p-0.5"><Input type="number" min={0} value={row.bon || ''} onChange={(e) => updateRow(i, 'bon', e.target.value)} className="h-6 text-[10px] border-0 text-center" /></td>
                  <td className="border p-0.5"><Input type="number" min={0} value={row.acceptable || ''} onChange={(e) => updateRow(i, 'acceptable', e.target.value)} className="h-6 text-[10px] border-0 text-center" /></td>
                  <td className="border p-0.5"><Input type="number" min={0} value={row.mauvais || ''} onChange={(e) => updateRow(i, 'mauvais', e.target.value)} className="h-6 text-[10px] border-0 text-center" /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ======== FICHE 7: PLANIFICATION ========
const Fiche7Agent = ({ matrice, programme, onMatriceChange, onProgrammeChange }) => {
  const updateM = (i, f, v) => { const n = [...matrice]; n[i] = { ...n[i], [f]: v }; onMatriceChange(n); };
  const updateP = (i, f, v) => { const n = [...programme]; n[i] = { ...n[i], [f]: v }; onProgrammeChange(n); };
  const addProgramme = () => onProgrammeChange([...programme, { axe: '', activite: '', sous_activite: '', indicateur: '', t1: false, t2: false, t3: false, t4: false, execution: '', appui: '', cout: '' }]);

  return (
    <div className="space-y-6" data-testid="visit-fiche7">
      <div>
        <h3 className="font-bold text-gray-900 text-sm border-b pb-2">FICHE 7a : MATRICE STRATEGIQUE</h3>
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-[10px] border-collapse min-w-[800px]">
            <thead><tr className="bg-gray-50">
              <th className="border p-1.5 text-left">Axes</th>
              <th className="border p-1.5 text-center">Objectifs</th>
              <th className="border p-1.5 text-center">Activites</th>
              <th className="border p-1.5 text-center">Cout</th>
              <th className="border p-1 text-center w-7">A1</th><th className="border p-1 text-center w-7">A2</th>
              <th className="border p-1 text-center w-7">A3</th><th className="border p-1 text-center w-7">A4</th><th className="border p-1 text-center w-7">A5</th>
              <th className="border p-1.5 text-center">Resp.</th>
              <th className="border p-1.5 text-center">Partenaires</th>
            </tr></thead>
            <tbody>
              {matrice.map((row, i) => (
                <tr key={`el-${i}`}>
                  <td className="border p-1.5 font-medium text-[9px]">{row.axe}</td>
                  <td className="border p-0.5"><Input value={row.objectifs || ''} onChange={(e) => updateM(i, 'objectifs', e.target.value)} className="h-6 text-[10px] border-0" /></td>
                  <td className="border p-0.5"><Input value={row.activites || ''} onChange={(e) => updateM(i, 'activites', e.target.value)} className="h-6 text-[10px] border-0" /></td>
                  <td className="border p-0.5"><Input type="number" value={row.cout || ''} onChange={(e) => updateM(i, 'cout', e.target.value)} className="h-6 text-[10px] border-0 text-center" /></td>
                  {['a1','a2','a3','a4','a5'].map(a => (
                    <td key={a} className="border p-0.5 text-center"><input type="checkbox" checked={row[a] || false} onChange={(e) => updateM(i, a, e.target.checked)} /></td>
                  ))}
                  <td className="border p-0.5"><Input value={row.responsable || ''} onChange={(e) => updateM(i, 'responsable', e.target.value)} className="h-6 text-[10px] border-0" /></td>
                  <td className="border p-0.5"><Input value={row.partenaires || ''} onChange={(e) => updateM(i, 'partenaires', e.target.value)} className="h-6 text-[10px] border-0" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="font-bold text-gray-900 text-sm">FICHE 7b : PROGRAMME ANNUEL</h3>
          <Button size="sm" variant="outline" onClick={addProgramme}><Plus className="w-3 h-3 mr-1" /> Ajouter</Button>
        </div>
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-[10px] border-collapse min-w-[800px]">
            <thead><tr className="bg-gray-50">
              <th className="border p-1.5 text-left">Axe</th>
              <th className="border p-1.5 text-center">Activite</th>
              <th className="border p-1.5 text-center">Sous-activite</th>
              <th className="border p-1.5 text-center">Indicateurs</th>
              <th className="border p-1 text-center w-7">T1</th><th className="border p-1 text-center w-7">T2</th>
              <th className="border p-1 text-center w-7">T3</th><th className="border p-1 text-center w-7">T4</th>
              <th className="border p-1.5 text-center">Execution</th>
              <th className="border p-1.5 text-center">Appui</th>
              <th className="border p-1.5 text-center">Cout</th>
            </tr></thead>
            <tbody>
              {programme.map((row, i) => (
                <tr key={`el-${i}`}>
                  <td className="border p-0.5">
                    <select className="text-[10px] w-full h-6 border-0" value={row.axe || ''} onChange={(e) => updateP(i, 'axe', e.target.value)}>
                      <option value="">--</option>{matrice.map((m, j) => <option key={`axe-${j}`} value={`Axe ${j+1}`}>{`Axe ${j+1}`}</option>)}
                    </select>
                  </td>
                  <td className="border p-0.5"><Input value={row.activite || ''} onChange={(e) => updateP(i, 'activite', e.target.value)} className="h-6 text-[10px] border-0" /></td>
                  <td className="border p-0.5"><Input value={row.sous_activite || ''} onChange={(e) => updateP(i, 'sous_activite', e.target.value)} className="h-6 text-[10px] border-0" /></td>
                  <td className="border p-0.5"><Input value={row.indicateur || ''} onChange={(e) => updateP(i, 'indicateur', e.target.value)} className="h-6 text-[10px] border-0" /></td>
                  {['t1','t2','t3','t4'].map(t => (
                    <td key={t} className="border p-0.5 text-center"><input type="checkbox" checked={row[t] || false} onChange={(e) => updateP(i, t, e.target.checked)} /></td>
                  ))}
                  <td className="border p-0.5"><Input value={row.execution || ''} onChange={(e) => updateP(i, 'execution', e.target.value)} className="h-6 text-[10px] border-0" /></td>
                  <td className="border p-0.5"><Input value={row.appui || ''} onChange={(e) => updateP(i, 'appui', e.target.value)} className="h-6 text-[10px] border-0" /></td>
                  <td className="border p-0.5"><Input type="number" value={row.cout || ''} onChange={(e) => updateP(i, 'cout', e.target.value)} className="h-6 text-[10px] border-0 text-center" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ======== PHOTOS (Agent-specific) ========
const PhotosStep = ({ photos, onPhotosChange }) => {
  const fileRef = useRef(null);
  const [gps, setGps] = useState(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }), () => {}, { enableHighAccuracy: true, timeout: 15000 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCapture = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        onPhotosChange([...photos, { data: reader.result, name: file.name, gps, timestamp: new Date().toISOString() }]);
        toast.success('Photo ajoutee');
      };
      reader.readAsDataURL(file);
    });
  };

  return (
    <div className="space-y-3" data-testid="visit-step-photos">
      <h3 className="font-bold text-gray-900 text-sm border-b pb-2">Photos de la Parcelle</h3>
      {gps && <div className="bg-blue-50 text-blue-700 text-[10px] rounded-lg px-2 py-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> GPS: {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}</div>}
      <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple onChange={handleCapture} className="hidden" />
      <Button onClick={() => fileRef.current?.click()} className="w-full h-12 bg-pink-500 hover:bg-pink-600 text-white rounded-xl" data-testid="visit-capture-photo">
        <Camera className="w-5 h-5 mr-2" /> Prendre une photo
      </Button>
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((p, i) => (
            <div key={`el-${i}`} className="relative rounded-xl overflow-hidden border border-gray-200 aspect-square">
              <img src={p.data} alt="" className="w-full h-full object-cover" />
              <button onClick={() => onPhotosChange(photos.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}
      <p className="text-[10px] text-gray-400">{photos.length} photo(s)</p>
    </div>
  );
};

// ======== SIGNATURES (Agent-specific) ========
const SignaturesStep = ({ sigPlanteur, onSigPlanteur, sigAgent, onSigAgent, farmerName, agentName }) => (
  <div className="space-y-4" data-testid="visit-step-signatures">
    <h3 className="font-bold text-gray-900 text-sm border-b pb-2">Signatures Electroniques</h3>
    <div className="bg-white rounded-xl border border-gray-100 p-3 space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <User className="w-4 h-4 text-green-600" /><span className="text-sm font-semibold">Signature du Planteur</span>
        {sigPlanteur?.data && <Badge className="bg-green-100 text-green-700 text-[10px]">Signe</Badge>}
      </div>
      <div><label className="text-[10px] text-gray-500 block mb-1">Nom du planteur</label>
        <Input value={sigPlanteur?.nom || farmerName || ''} onChange={(e) => onSigPlanteur({ ...sigPlanteur, nom: e.target.value })} className="h-8 text-sm" data-testid="visit-sig-planteur-nom" />
      </div>
      <SignatureCanvas label="planteur" savedData={sigPlanteur?.data} onSave={(data) => onSigPlanteur({ ...sigPlanteur, data, date: new Date().toISOString() })} />
    </div>
    <div className="bg-white rounded-xl border border-gray-100 p-3 space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <PenLine className="w-4 h-4 text-blue-600" /><span className="text-sm font-semibold">Signature de l'Agent</span>
        {sigAgent?.data && <Badge className="bg-blue-100 text-blue-700 text-[10px]">Signe</Badge>}
      </div>
      <div><label className="text-[10px] text-gray-500 block mb-1">Nom de l'agent</label>
        <Input value={sigAgent?.nom || agentName || ''} onChange={(e) => onSigAgent({ ...sigAgent, nom: e.target.value })} className="h-8 text-sm" data-testid="visit-sig-agent-nom" />
      </div>
      <SignatureCanvas label="agent" savedData={sigAgent?.data} onSave={(data) => onSigAgent({ ...sigAgent, data, date: new Date().toISOString() })} />
    </div>
  </div>
);

// ======== RESUME ========
const ResumeStep = ({ formData, photos, sigPlanteur, sigAgent, conformite, pdcId }) => {
  const { identification: id, arbres_ombrage: ao } = formData;
  const totalMenage = (formData.menage || []).reduce((s, r) => s + (parseInt(r.nombre) || 0), 0);
  const totalCultures = (formData.cultures || []).length;
  const totalArbres = (formData.inventaire_arbres || []).length;

  const handleDownloadPDF = async () => {
    if (!pdcId) { toast.error("Sauvegardez d'abord"); return; }
    try {
      toast.info('Generation PDF...');
      const res = await fetch(`${API_URL}/api/ars1000/pdf/pdc/${pdcId}`, { headers: { 'Authorization': `Bearer ${getToken()}` } });
      if (!res.ok) throw new Error('Erreur PDF');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `PDC_${id?.nom}_${id?.prenoms}.pdf`;
      document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
      toast.success('PDF telecharge');
    } catch (e) { toast.error(e.message); }
  };

  return (
    <div className="space-y-3" data-testid="visit-step-resume">
      <h3 className="font-bold text-gray-900 text-sm border-b pb-2">Resume de la Visite</h3>
      <div className={`rounded-xl p-4 border-2 ${conformite >= 80 ? 'bg-green-50 border-green-300' : conformite >= 50 ? 'bg-amber-50 border-amber-300' : 'bg-red-50 border-red-300'}`}>
        <p className="text-3xl font-bold text-center">{conformite}%</p>
        <p className="text-xs text-center text-gray-600">Conformite ARS 1000-1</p>
      </div>
      {pdcId && (
        <Button variant="outline" className="w-full border-green-300 text-green-700 hover:bg-green-50" onClick={handleDownloadPDF} data-testid="visit-download-pdf">
          <Download className="w-4 h-4 mr-2" /> Telecharger PDF
        </Button>
      )}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="bg-white rounded-lg border p-2"><p className="text-[10px] text-gray-400">Producteur</p><p className="font-semibold">{id?.nom} {id?.prenoms}</p><p className="text-[10px] text-gray-400">{id?.village}</p></div>
        <div className="bg-white rounded-lg border p-2"><p className="text-[10px] text-gray-400">Menage</p><p className="font-semibold">{totalMenage} membres</p></div>
        <div className="bg-white rounded-lg border p-2"><p className="text-[10px] text-gray-400">Cultures</p><p className="font-semibold">{totalCultures} lignes</p><p className="text-[10px] text-gray-400">{formData.exploitation?.superficie_totale_ha || 0} ha</p></div>
        <div className="bg-white rounded-lg border p-2"><p className="text-[10px] text-gray-400">Inventaire</p><p className="font-semibold">{totalArbres} arbres</p></div>
        <div className="bg-white rounded-lg border p-2"><p className="text-[10px] text-gray-400">Ombrage</p><p className="font-semibold">{ao?.total || 0} total</p></div>
        <div className="bg-white rounded-lg border p-2"><p className="text-[10px] text-gray-400">Photos</p><p className="font-semibold">{photos.length}</p></div>
        <div className="bg-white rounded-lg border p-2 col-span-2">
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
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [photos, setPhotos] = useState([]);
  const [sigPlanteur, setSigPlanteur] = useState({ nom: farmerName, data: null, date: null });
  const [sigAgent, setSigAgent] = useState({ nom: user?.full_name || '', data: null, date: null });
  const [conformite, setConformite] = useState(0);

  // Load farmer and existing PDC
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const loadData = async () => {
      try {
        const fRes = await fetch(`${API_URL}/api/field-agent/my-farmers`, { headers: authHeaders() });
        if (fRes.ok) {
          const fData = await fRes.json();
          const f = (fData.farmers || []).find(f => f.id === farmerId);
          if (f) { setFarmer(f); setSigPlanteur(prev => ({ ...prev, nom: f.full_name || farmerName })); }
        }
        const pRes = await fetch(`${API_URL}/api/ars1000/pdc/farmer/${farmerId}`, { headers: authHeaders() });
        if (pRes.ok) {
          const pdc = await pRes.json();
          if (pdc && pdc.id) {
            setExistingPDC(pdc);
            setFormData(prev => ({
              ...prev,
              identification: pdc.identification || prev.identification,
              epargne: pdc.epargne || prev.epargne,
              menage: Array.isArray(pdc.menage_detail) ? pdc.menage_detail : (Array.isArray(pdc.menage) ? pdc.menage : prev.menage),
              exploitation: pdc.exploitation || prev.exploitation,
              cultures: Array.isArray(pdc.cultures) && pdc.cultures.length ? pdc.cultures : prev.cultures,
              inventaire_arbres: Array.isArray(pdc.inventaire_arbres) ? pdc.inventaire_arbres : [],
              arbres_ombrage: pdc.arbres_ombrage_resume || prev.arbres_ombrage,
              materiel: Array.isArray(pdc.materiel_detail) ? pdc.materiel_detail : prev.materiel,
              matrice_strategique: Array.isArray(pdc.matrice_strategique_detail) ? pdc.matrice_strategique_detail : prev.matrice_strategique,
              programme_annuel: Array.isArray(pdc.programme_annuel) && pdc.programme_annuel.length ? pdc.programme_annuel : prev.programme_annuel,
              notes: pdc.notes || '',
            }));
            setConformite(pdc.pourcentage_conformite || 0);
          }
        }
      } catch (e) { /* error */ }
      finally { setLoading(false); }
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmerId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        farmer_id: farmerId,
        identification: formData.identification,
        epargne: formData.epargne,
        menage_detail: formData.menage,
        menage: {
          taille_menage: formData.menage.reduce((s, r) => s + (parseInt(r.nombre) || 0), 0),
          nombre_enfants: ['Enfants 0-6 ans', 'Enfants 6-18 ans', 'Enfants +18 ans'].reduce((s, t) => s + (parseInt(formData.menage.find(m => m.type === t)?.nombre) || 0), 0),
        },
        exploitation: formData.exploitation,
        cultures: formData.cultures,
        parcelles: formData.cultures.filter(c => c.nom?.toLowerCase().includes('cacao')).map(c => ({
          nom_parcelle: c.nom, superficie_ha: parseFloat(c.superficie) || 0,
          variete_cacao: c.source_materiel, rendement_estime_kg_ha: parseFloat(c.production_kg) || 0,
          latitude: c.latitude || null, longitude: c.longitude || null,
        })),
        inventaire_arbres: formData.inventaire_arbres,
        arbres_ombrage_resume: formData.arbres_ombrage,
        arbres_ombrage: {
          nombre_total: parseInt(formData.arbres_ombrage.total) || 0,
          strate_haute: parseInt(formData.arbres_ombrage.strate3) || 0,
          strate_moyenne: parseInt(formData.arbres_ombrage.strate2) || 0,
          strate_basse: parseInt(formData.arbres_ombrage.strate1) || 0,
          nombre_especes: new Set(formData.inventaire_arbres.map(a => a.nom_local || a.nom_botanique).filter(Boolean)).size,
          especes: [...new Set(formData.inventaire_arbres.map(a => a.nom_local || a.nom_botanique).filter(Boolean))],
        },
        materiel_detail: formData.materiel,
        materiel_agricole: {
          outils: formData.materiel.filter(m => parseInt(m.quantite) > 0).map(m => m.designation),
        },
        matrice_strategique_detail: formData.matrice_strategique,
        matrice_strategique: {
          objectif_rendement_kg_ha: 0,
          horizon_annees: 5,
          actions_prioritaires: formData.matrice_strategique.filter(a => a.activites).map(a => a.activites),
        },
        programme_annuel: formData.programme_annuel,
        photos_parcelle: photos.map(p => p.data?.substring(0, 100) || ''),
        signature_planteur: sigPlanteur?.data ? sigPlanteur : null,
        signature_agent: sigAgent?.data ? sigAgent : null,
        notes: formData.notes,
      };

      const res = await fetch(`${API_URL}/api/ars1000/pdc/agent-visit`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify(payload),
      });

      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || 'Erreur'); }
      const result = await res.json();
      setExistingPDC(result);
      setConformite(result.pourcentage_conformite || 0);
      toast.success('PDC sauvegarde');
    } catch (e) { toast.error(e.message || 'Erreur sauvegarde'); }
    finally { setSaving(false); }
  };

  const handleCompleteVisit = async () => {
    if (!sigPlanteur?.data) { toast.error('Signature du planteur requise'); return; }
    await handleSave();
    if (!existingPDC?.id) { toast.error("Sauvegardez d'abord"); return; }
    setCompleting(true);
    try {
      const res = await fetch(`${API_URL}/api/ars1000/pdc/${existingPDC.id}/complete-visit`, { method: 'POST', headers: authHeaders() });
      if (!res.ok) throw new Error((await res.json()).detail);
      toast.success('Visite terminee ! Notification envoyee.');
      navigate(-1);
    } catch (e) { toast.error(e.message || 'Erreur'); }
    finally { setCompleting(false); }
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-green-600" /></div>;

  const isCompleted = existingPDC?.statut === 'complete_agent' || existingPDC?.statut === 'valide';

  return (
    <div className="min-h-screen bg-gray-50" data-testid="agent-visite-pdc">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg" data-testid="visit-back-btn">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-bold text-gray-900 truncate">Visite Terrain - PDC (7 Fiches)</h1>
              <p className="text-[10px] text-gray-500 truncate">{farmerName || 'Planteur'} | ARS 1000-1</p>
            </div>
            {existingPDC && (
              <Badge className={existingPDC.statut === 'valide' ? 'bg-green-100 text-green-700' : existingPDC.statut === 'complete_agent' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}>
                {existingPDC.statut === 'complete_agent' ? 'Complete' : existingPDC.statut}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] text-gray-400">Conformite:</span>
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${conformite >= 80 ? 'bg-green-500' : conformite >= 50 ? 'bg-amber-500' : 'bg-red-400'}`} style={{ width: `${conformite}%` }} />
            </div>
            <span className="text-xs font-bold text-gray-700">{conformite}%</span>
          </div>
          <div className="flex gap-0.5 mt-2 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4">
            {STEPS.map((s, i) => (
              <button key={s.id} onClick={() => setStep(i)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium whitespace-nowrap transition-colors ${step === i ? 'bg-green-600 text-white' : i < step ? 'bg-green-100 text-green-700' : 'text-gray-400 hover:bg-gray-100'}`}
                data-testid={`visit-step-btn-${s.id}`}>
                <s.icon className="w-3 h-3" />{s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          {step === 0 && <Fiche1Agent data={formData.identification} epargne={formData.epargne} onChange={d => setFormData(f => ({ ...f, identification: d }))} onEpargneChange={d => setFormData(f => ({ ...f, epargne: d }))} farmer={farmer} />}
          {step === 1 && <Fiche2Agent data={formData.menage} onChange={d => setFormData(f => ({ ...f, menage: d }))} />}
          {step === 2 && <Fiche3Agent exploitation={formData.exploitation} cultures={formData.cultures} onExploitationChange={d => setFormData(f => ({ ...f, exploitation: d }))} onCulturesChange={d => setFormData(f => ({ ...f, cultures: d }))} />}
          {step === 3 && <Fiche4Agent data={formData.inventaire_arbres} onChange={d => setFormData(f => ({ ...f, inventaire_arbres: d }))} farmerId={farmerId} />}
          {step === 4 && <Fiche5Agent data={formData.arbres_ombrage} onChange={d => setFormData(f => ({ ...f, arbres_ombrage: d }))} />}
          {step === 5 && <Fiche6Agent data={formData.materiel} onChange={d => setFormData(f => ({ ...f, materiel: d }))} />}
          {step === 6 && <Fiche7Agent matrice={formData.matrice_strategique} programme={formData.programme_annuel} onMatriceChange={d => setFormData(f => ({ ...f, matrice_strategique: d }))} onProgrammeChange={d => setFormData(f => ({ ...f, programme_annuel: d }))} />}
          {step === 7 && <PhotosStep photos={photos} onPhotosChange={setPhotos} />}
          {step === 8 && <SignaturesStep sigPlanteur={sigPlanteur} onSigPlanteur={setSigPlanteur} sigAgent={sigAgent} onSigAgent={setSigAgent} farmerName={farmerName} agentName={user?.full_name || ''} />}
          {step === 9 && <ResumeStep formData={formData} photos={photos} sigPlanteur={sigPlanteur} sigAgent={sigAgent} conformite={conformite} pdcId={existingPDC?.id} />}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-4 pb-8">
          <Button variant="outline" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} data-testid="visit-prev">
            <ChevronLeft className="w-4 h-4 mr-1" /> Precedent
          </Button>
          <div className="flex gap-2">
            {!isCompleted && (
              <Button variant="outline" onClick={handleSave} disabled={saving} data-testid="visit-save">
                {saving ? <Loader2 className="animate-spin w-4 h-4 mr-1" /> : <Save className="w-4 h-4 mr-1" />} Sauvegarder
              </Button>
            )}
            {step === STEPS.length - 1 ? (
              !isCompleted && (
                <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleCompleteVisit} disabled={completing} data-testid="visit-complete">
                  {completing ? <Loader2 className="animate-spin w-4 h-4 mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />} Terminer visite
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

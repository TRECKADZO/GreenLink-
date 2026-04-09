import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { MobileAppShell } from '../../components/MobileAppShell';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import {
  FileText, User, Home, MapPin, TreePine, Wrench,
  Target, Calendar, PenLine, CheckCircle2, ChevronRight,
  ChevronLeft, Loader2, Save, Send, ArrowLeft, Leaf
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const getToken = () => localStorage.getItem('token');
const authHeaders = () => ({ 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' });

const STEPS = [
  { id: 'identification', label: 'Identification', icon: User },
  { id: 'menage', label: 'Ménage', icon: Home },
  { id: 'parcelles', label: 'Parcelles', icon: MapPin },
  { id: 'arbres', label: 'Arbres Ombrage', icon: TreePine },
  { id: 'materiel', label: 'Matériel', icon: Wrench },
  { id: 'strategie', label: 'Stratégie', icon: Target },
  { id: 'resume', label: 'Résumé', icon: FileText },
];

// ============= STEP COMPONENTS =============

const IdentificationStep = ({ data, onChange }) => {
  const update = (field, value) => onChange({ ...data, [field]: value });
  return (
    <div className="space-y-3" data-testid="step-identification">
      <h3 className="font-bold text-gray-900">Identification du Producteur</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[
          { label: 'Nom', field: 'nom', required: true },
          { label: 'Prénoms', field: 'prenoms', required: true },
          { label: 'Date de naissance', field: 'date_naissance', type: 'date' },
          { label: 'Genre', field: 'genre', type: 'select', options: ['Homme', 'Femme'] },
          { label: "N° d'identification", field: 'numero_identification' },
          { label: 'Téléphone', field: 'telephone', type: 'tel' },
          { label: 'Localité', field: 'localite' },
          { label: 'Village', field: 'village' },
          { label: 'Sous-préfecture', field: 'sous_prefecture' },
          { label: 'Département', field: 'department' },
          { label: 'Région', field: 'region' },
          { label: 'Statut foncier', field: 'statut_foncier', type: 'select', options: ['Propriétaire', 'Métayer', 'Locataire'] },
        ].map(({ label, field, type, options, required }) => (
          <div key={field}>
            <label className="text-xs text-gray-600 font-medium block mb-1">{label} {required && <span className="text-red-500">*</span>}</label>
            {type === 'select' ? (
              <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full" value={data[field] || ''} onChange={(e) => update(field, e.target.value)} data-testid={`id-${field}`}>
                <option value="">Sélectionner</option>
                {options.map(o => <option key={o} value={o.toLowerCase()}>{o}</option>)}
              </select>
            ) : (
              <Input type={type || 'text'} value={data[field] || ''} onChange={(e) => update(field, e.target.value)} data-testid={`id-${field}`} />
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-2">
        <input type="checkbox" checked={data.membre_groupe || false} onChange={(e) => update('membre_groupe', e.target.checked)} />
        <label className="text-sm text-gray-700">Membre d'un groupe de producteurs</label>
      </div>
    </div>
  );
};

const MenageStep = ({ data, onChange }) => {
  const update = (field, value) => onChange({ ...data, [field]: value });
  return (
    <div className="space-y-3" data-testid="step-menage">
      <h3 className="font-bold text-gray-900">Composition du Ménage</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: 'Taille du ménage', field: 'taille_menage', type: 'number' },
          { label: 'Nombre de femmes', field: 'nombre_femmes', type: 'number' },
          { label: "Nombre d'enfants (<18)", field: 'nombre_enfants', type: 'number' },
          { label: 'Enfants scolarisés', field: 'enfants_scolarises', type: 'number' },
          { label: 'Travailleurs permanents', field: 'travailleurs_permanents', type: 'number' },
          { label: 'Travailleurs temporaires', field: 'travailleurs_temporaires', type: 'number' },
          { label: 'Dépenses mensuelles (FCFA)', field: 'depenses_mensuelles', type: 'number' },
        ].map(({ label, field, type }) => (
          <div key={field}>
            <label className="text-xs text-gray-600 font-medium block mb-1">{label}</label>
            <Input type={type} value={data[field] || ''} onChange={(e) => update(field, type === 'number' ? Number(e.target.value) : e.target.value)} data-testid={`men-${field}`} />
          </div>
        ))}
      </div>
      <div className="flex gap-4 mt-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={data.acces_banque || false} onChange={(e) => update('acces_banque', e.target.checked)} />
          Accès compte bancaire
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={data.mobile_money || false} onChange={(e) => update('mobile_money', e.target.checked)} />
          Mobile Money
        </label>
      </div>
    </div>
  );
};

const ParcellesStep = ({ data, onChange }) => {
  const addParcelle = () => onChange([...data, { nom_parcelle: '', superficie_ha: 0, latitude: null, longitude: null, annee_creation: null, age_arbres_ans: null, densite_arbres_ha: null, variete_cacao: '', rendement_estime_kg_ha: 0, etat_sanitaire: '', cultures_associees: [] }]);
  const updateParcelle = (i, field, value) => { const arr = [...data]; arr[i] = { ...arr[i], [field]: value }; onChange(arr); };
  const removeParcelle = (i) => onChange(data.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-4" data-testid="step-parcelles">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-900">Parcelles Cacaoyères</h3>
        <Button size="sm" variant="outline" onClick={addParcelle} data-testid="add-parcelle-btn">+ Ajouter</Button>
      </div>
      {data.length === 0 && <p className="text-sm text-gray-400 text-center py-6">Ajoutez au moins une parcelle</p>}
      {data.map((p, i) => (
        <div key={i} className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">Parcelle {i + 1}</p>
            <button className="text-red-500 text-xs" onClick={() => removeParcelle(i)}>Supprimer</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: 'Nom de la parcelle', field: 'nom_parcelle' },
              { label: 'Superficie (ha)', field: 'superficie_ha', type: 'number' },
              { label: 'Latitude', field: 'latitude', type: 'number' },
              { label: 'Longitude', field: 'longitude', type: 'number' },
              { label: 'Année de création', field: 'annee_creation', type: 'number' },
              { label: 'Âge des arbres (ans)', field: 'age_arbres_ans', type: 'number' },
              { label: 'Densité (arbres/ha)', field: 'densite_arbres_ha', type: 'number' },
              { label: 'Variété cacao', field: 'variete_cacao' },
              { label: 'Rendement estimé (kg/ha)', field: 'rendement_estime_kg_ha', type: 'number' },
            ].map(({ label, field, type }) => (
              <div key={field}>
                <label className="text-xs text-gray-600 block mb-1">{label}</label>
                <Input type={type || 'text'} value={p[field] ?? ''} onChange={(e) => updateParcelle(i, field, type === 'number' ? Number(e.target.value) : e.target.value)} data-testid={`parc-${i}-${field}`} />
              </div>
            ))}
            <div>
              <label className="text-xs text-gray-600 block mb-1">État sanitaire</label>
              <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full" value={p.etat_sanitaire || ''} onChange={(e) => updateParcelle(i, 'etat_sanitaire', e.target.value)}>
                <option value="">Sélectionner</option>
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

const ArbresStep = ({ data, onChange }) => {
  const update = (field, value) => onChange({ ...data, [field]: value });
  const especesStr = (data.especes || []).join(', ');
  const handleEspeces = (val) => update('especes', val.split(',').map(s => s.trim()).filter(Boolean));

  // Auto-calculate conformity
  const densite = data.densite_par_ha || 0;
  const nbEspeces = (data.especes || []).length;
  const densiteOk = densite >= 25 && densite <= 40;
  const especesOk = nbEspeces >= 3;
  const stratesOk = (data.strate_haute || 0) > 0 && (data.strate_moyenne || 0) > 0 && (data.strate_basse || 0) > 0;
  const conforme = densiteOk && especesOk && stratesOk;

  return (
    <div className="space-y-3" data-testid="step-arbres">
      <h3 className="font-bold text-gray-900">Arbres d'Ombrage - Agroforesterie</h3>
      
      <div className={`rounded-xl p-3 ${conforme ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
        <p className="text-sm font-semibold">{conforme ? '✓ Conforme ARS 1000' : '! Non conforme - Ajustez les paramètres'}</p>
        <div className="flex gap-3 mt-2 text-xs">
          <span className={densiteOk ? 'text-green-700' : 'text-red-600'}>Densité: {densite}/ha (25-40)</span>
          <span className={especesOk ? 'text-green-700' : 'text-red-600'}>Espèces: {nbEspeces} (min 3)</span>
          <span className={stratesOk ? 'text-green-700' : 'text-red-600'}>3 strates</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: 'Nombre total d\'arbres', field: 'nombre_total', type: 'number' },
          { label: 'Densité par hectare', field: 'densite_par_ha', type: 'number' },
          { label: 'Strate haute (nb)', field: 'strate_haute', type: 'number' },
          { label: 'Strate moyenne (nb)', field: 'strate_moyenne', type: 'number' },
          { label: 'Strate basse (nb)', field: 'strate_basse', type: 'number' },
        ].map(({ label, field, type }) => (
          <div key={field}>
            <label className="text-xs text-gray-600 font-medium block mb-1">{label}</label>
            <Input type={type} value={data[field] || ''} onChange={(e) => update(field, Number(e.target.value))} data-testid={`arb-${field}`} />
          </div>
        ))}
        <div className="md:col-span-2">
          <label className="text-xs text-gray-600 font-medium block mb-1">Espèces (séparées par des virgules)</label>
          <Input value={especesStr} onChange={(e) => handleEspeces(e.target.value)} placeholder="Fraké, Fromager, Iroko..." data-testid="arb-especes" />
        </div>
      </div>
    </div>
  );
};

const MaterielStep = ({ data, onChange }) => {
  const outilsStr = (data.outils || []).join(', ');
  const protStr = (data.equipements_protection || []).join(', ');
  const phytoStr = (data.produits_phytosanitaires || []).join(', ');
  const engraisStr = (data.engrais || []).join(', ');

  const handleArray = (field, val) => onChange({ ...data, [field]: val.split(',').map(s => s.trim()).filter(Boolean) });

  return (
    <div className="space-y-3" data-testid="step-materiel">
      <h3 className="font-bold text-gray-900">Matériel Agricole</h3>
      <div className="space-y-3">
        {[
          { label: 'Outils (machette, sécateur, etc.)', field: 'outils', value: outilsStr },
          { label: 'Équipements de protection (bottes, gants, etc.)', field: 'equipements_protection', value: protStr },
          { label: 'Produits phytosanitaires', field: 'produits_phytosanitaires', value: phytoStr },
          { label: 'Engrais utilisés', field: 'engrais', value: engraisStr },
        ].map(({ label, field, value }) => (
          <div key={field}>
            <label className="text-xs text-gray-600 font-medium block mb-1">{label}</label>
            <Input value={value} onChange={(e) => handleArray(field, e.target.value)} placeholder="Séparés par des virgules" data-testid={`mat-${field}`} />
          </div>
        ))}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={data.acces_intrants || false} onChange={(e) => onChange({ ...data, acces_intrants: e.target.checked })} />
          Accès facilité aux intrants
        </label>
      </div>
    </div>
  );
};

const StrategieStep = ({ data, onChange }) => {
  const update = (field, value) => onChange({ ...data, [field]: value });
  const risquesStr = (data.risques_identifies || []).join(', ');
  const actionsStr = (data.actions_prioritaires || []).join(', ');

  return (
    <div className="space-y-3" data-testid="step-strategie">
      <h3 className="font-bold text-gray-900">Matrice Stratégique - Plan de Développement</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-600 font-medium block mb-1">Objectif rendement (kg/ha)</label>
          <Input type="number" value={data.objectif_rendement_kg_ha || ''} onChange={(e) => update('objectif_rendement_kg_ha', Number(e.target.value))} data-testid="strat-objectif" />
        </div>
        <div>
          <label className="text-xs text-gray-600 font-medium block mb-1">Horizon (années)</label>
          <Input type="number" value={data.horizon_annees || 5} onChange={(e) => update('horizon_annees', Number(e.target.value))} data-testid="strat-horizon" />
        </div>
        <div>
          <label className="text-xs text-gray-600 font-medium block mb-1">Coût total estimé (FCFA)</label>
          <Input type="number" value={data.cout_total_estime || ''} onChange={(e) => update('cout_total_estime', Number(e.target.value))} data-testid="strat-cout" />
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-600 font-medium block mb-1">Risques identifiés (séparés par des virgules)</label>
        <Input value={risquesStr} onChange={(e) => update('risques_identifies', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} placeholder="Maladies, sécheresse..." data-testid="strat-risques" />
      </div>
      <div>
        <label className="text-xs text-gray-600 font-medium block mb-1">Actions prioritaires</label>
        <Input value={actionsStr} onChange={(e) => update('actions_prioritaires', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} placeholder="Renouvellement, taille, fertilisation..." data-testid="strat-actions" />
      </div>
    </div>
  );
};

const ResumeStep = ({ formData, conformite }) => {
  const { identification, menage, parcelles, arbres_ombrage, matrice_strategique } = formData;
  return (
    <div className="space-y-4" data-testid="step-resume">
      <h3 className="font-bold text-gray-900">Résumé du PDC</h3>
      
      {/* Conformité */}
      <div className={`rounded-xl p-4 border-2 ${conformite >= 80 ? 'bg-green-50 border-green-300' : conformite >= 50 ? 'bg-amber-50 border-amber-300' : 'bg-red-50 border-red-300'}`}>
        <div className="flex items-center gap-3">
          <div className={`text-3xl font-bold ${conformite >= 80 ? 'text-green-700' : conformite >= 50 ? 'text-amber-700' : 'text-red-700'}`}>
            {conformite}%
          </div>
          <div>
            <p className="font-semibold text-gray-800">Conformité PDC</p>
            <p className="text-xs text-gray-500">Selon les exigences ARS 1000-1</p>
          </div>
        </div>
        <div className="h-3 bg-white/60 rounded-full mt-3 overflow-hidden">
          <div className={`h-full rounded-full ${conformite >= 80 ? 'bg-green-500' : conformite >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${conformite}%` }} />
        </div>
      </div>

      {/* Résumé sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 p-3">
          <p className="text-xs text-gray-500 mb-1">Producteur</p>
          <p className="font-semibold text-sm">{identification.nom} {identification.prenoms}</p>
          <p className="text-xs text-gray-500">{identification.village} - {identification.region}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-3">
          <p className="text-xs text-gray-500 mb-1">Ménage</p>
          <p className="font-semibold text-sm">{menage.taille_menage} personnes</p>
          <p className="text-xs text-gray-500">{menage.nombre_enfants} enfants, {menage.enfants_scolarises} scolarisés</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-3">
          <p className="text-xs text-gray-500 mb-1">Parcelles</p>
          <p className="font-semibold text-sm">{parcelles.length} parcelle(s)</p>
          <p className="text-xs text-gray-500">{parcelles.reduce((s, p) => s + (p.superficie_ha || 0), 0).toFixed(2)} ha total</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-3">
          <p className="text-xs text-gray-500 mb-1">Arbres d'ombrage</p>
          <p className="font-semibold text-sm">{arbres_ombrage.nombre_total} arbres</p>
          <p className="text-xs text-gray-500">{(arbres_ombrage.especes || []).length} espèces, {arbres_ombrage.densite_par_ha}/ha</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-3 md:col-span-2">
          <p className="text-xs text-gray-500 mb-1">Objectif Stratégique</p>
          <p className="font-semibold text-sm">{matrice_strategique.objectif_rendement_kg_ha} kg/ha en {matrice_strategique.horizon_annees} ans</p>
          <p className="text-xs text-gray-500">Coût estimé: {(matrice_strategique.cout_total_estime || 0).toLocaleString()} FCFA</p>
        </div>
      </div>
    </div>
  );
};


// ============= MAIN PDC FORM =============
export default function FarmerPDCPage() {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [existingPDC, setExistingPDC] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    identification: { nom: '', prenoms: '', date_naissance: '', genre: '', numero_identification: '', telephone: '', localite: '', village: '', sous_prefecture: '', department: '', region: '', membre_groupe: false, statut_foncier: '' },
    menage: { taille_menage: 0, nombre_femmes: 0, nombre_enfants: 0, enfants_scolarises: 0, travailleurs_permanents: 0, travailleurs_temporaires: 0, sources_revenus_autres: [], depenses_mensuelles: 0, acces_banque: false, mobile_money: false },
    parcelles: [],
    arbres_ombrage: { nombre_total: 0, densite_par_ha: 0, especes: [], nombre_especes: 0, strate_haute: 0, strate_moyenne: 0, strate_basse: 0, conforme_agroforesterie: false },
    materiel_agricole: { outils: [], equipements_protection: [], produits_phytosanitaires: [], engrais: [], acces_intrants: false },
    matrice_strategique: { objectif_rendement_kg_ha: 0, horizon_annees: 5, investissements_prevus: [], risques_identifies: [], actions_prioritaires: [], cout_total_estime: 0 },
    notes: '',
  });

  const [conformite, setConformite] = useState(0);

  // Load existing PDC
  const loadPDC = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/ars1000/pdc/my-pdc`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setExistingPDC(data);
          setFormData({
            identification: data.identification || formData.identification,
            menage: data.menage || formData.menage,
            parcelles: data.parcelles || [],
            arbres_ombrage: data.arbres_ombrage || formData.arbres_ombrage,
            materiel_agricole: data.materiel_agricole || formData.materiel_agricole,
            matrice_strategique: data.matrice_strategique || formData.matrice_strategique,
            notes: data.notes || '',
          });
          setConformite(data.pourcentage_conformite || 0);
        }
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadPDC(); }, [loadPDC]);

  // Pre-fill from user data
  useEffect(() => {
    if (!existingPDC && user && !loading) {
      setFormData(prev => ({
        ...prev,
        identification: {
          ...prev.identification,
          nom: user.full_name?.split(' ')[0] || '',
          prenoms: user.full_name?.split(' ').slice(1).join(' ') || '',
          telephone: user.phone_number || '',
        }
      }));
    }
  }, [user, existingPDC, loading]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const body = { ...formData };
      body.arbres_ombrage.nombre_especes = (body.arbres_ombrage.especes || []).length;
      const densiteOk = body.arbres_ombrage.densite_par_ha >= 25 && body.arbres_ombrage.densite_par_ha <= 40;
      const especesOk = body.arbres_ombrage.nombre_especes >= 3;
      const stratesOk = body.arbres_ombrage.strate_haute > 0 && body.arbres_ombrage.strate_moyenne > 0 && body.arbres_ombrage.strate_basse > 0;
      body.arbres_ombrage.conforme_agroforesterie = densiteOk && especesOk && stratesOk;

      let res;
      if (existingPDC) {
        res = await fetch(`${API_URL}/api/ars1000/pdc/${existingPDC.id}`, {
          method: 'PUT', headers: authHeaders(), body: JSON.stringify(body),
        });
      } else {
        res = await fetch(`${API_URL}/api/ars1000/pdc`, {
          method: 'POST', headers: authHeaders(), body: JSON.stringify(body),
        });
      }

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

  const handleSubmit = async () => {
    if (!existingPDC) {
      toast.error('Sauvegardez d\'abord votre PDC');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/ars1000/pdc/${existingPDC.id}/submit`, {
        method: 'POST', headers: authHeaders(),
      });
      if (!res.ok) throw new Error((await res.json()).detail);
      toast.success('PDC soumis pour validation');
      loadPDC();
    } catch (e) {
      toast.error(e.message || 'Erreur');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="animate-spin w-8 h-8 text-green-600" />
      </div>
    );
  }

  const isValidated = existingPDC?.statut === 'valide';
  const isSubmitted = existingPDC?.statut === 'soumis';

  return (
    <div className="min-h-screen bg-gray-50" data-testid="farmer-pdc-page">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => window.history.back()} className="p-2 hover:bg-gray-100 rounded-lg">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-base font-bold text-gray-900">Mon PDC - Plan de Développement</h1>
                <p className="text-xs text-gray-500">ARS 1000-1 | Cacao Durable</p>
              </div>
            </div>
            {existingPDC && (
              <Badge className={existingPDC.statut === 'valide' ? 'bg-green-100 text-green-700' : existingPDC.statut === 'soumis' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}>
                {existingPDC.statut}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Conformité bar */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-2">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">Conformité:</span>
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${conformite >= 80 ? 'bg-green-500' : conformite >= 50 ? 'bg-amber-500' : 'bg-red-400'}`} style={{ width: `${conformite}%` }} />
            </div>
            <span className="text-sm font-bold text-gray-700">{conformite}%</span>
          </div>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-2 flex gap-1 overflow-x-auto scrollbar-hide">
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setStep(i)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                step === i ? 'bg-green-600 text-white' : i < step ? 'bg-green-100 text-green-700' : 'text-gray-400 hover:bg-gray-100'
              }`}
              data-testid={`step-btn-${s.id}`}
            >
              <s.icon className="w-3.5 h-3.5" />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          {step === 0 && <IdentificationStep data={formData.identification} onChange={(d) => setFormData({ ...formData, identification: d })} />}
          {step === 1 && <MenageStep data={formData.menage} onChange={(d) => setFormData({ ...formData, menage: d })} />}
          {step === 2 && <ParcellesStep data={formData.parcelles} onChange={(d) => setFormData({ ...formData, parcelles: d })} />}
          {step === 3 && <ArbresStep data={formData.arbres_ombrage} onChange={(d) => setFormData({ ...formData, arbres_ombrage: d })} />}
          {step === 4 && <MaterielStep data={formData.materiel_agricole} onChange={(d) => setFormData({ ...formData, materiel_agricole: d })} />}
          {step === 5 && <StrategieStep data={formData.matrice_strategique} onChange={(d) => setFormData({ ...formData, matrice_strategique: d })} />}
          {step === 6 && <ResumeStep formData={formData} conformite={conformite} />}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-4">
          <Button
            variant="outline"
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            data-testid="prev-step-btn"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Précédent
          </Button>

          <div className="flex gap-2">
            {!isValidated && (
              <Button variant="outline" onClick={handleSave} disabled={saving} data-testid="save-pdc-btn">
                {saving ? <Loader2 className="animate-spin w-4 h-4 mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                Sauvegarder
              </Button>
            )}

            {step === STEPS.length - 1 ? (
              !isValidated && !isSubmitted && existingPDC && (
                <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleSubmit} data-testid="submit-pdc-btn">
                  <Send className="w-4 h-4 mr-1" /> Soumettre pour validation
                </Button>
              )
            ) : (
              <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => setStep(Math.min(STEPS.length - 1, step + 1))} data-testid="next-step-btn">
                Suivant <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

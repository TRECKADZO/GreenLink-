import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { tokenService } from '../../../services/tokenService';
import { toast } from 'sonner';
import { StableInput, StableSelect, StableTextarea } from '../../../components/StableInput';
import { LocationSelector } from '../../../components/LocationSelector';
import {
  UserPlus, Loader2, Home, ChevronRight, CheckCircle2, ArrowRight,
  User, MapPin, TreePine, BarChart3, Users, GraduationCap, FileText,
  Plus, Trash2, Navigation, Camera, MapPinned
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const ETAPES = [
  { n: 1, titre: 'Identification', icon: User, desc: 'Informations personnelles du producteur' },
  { n: 2, titre: 'Cacaoyere & Production', icon: TreePine, desc: 'Parcelles, production et certification' },
  { n: 3, titre: 'Travailleurs & Menage', icon: Users, desc: 'Travailleurs permanents et composition du menage' },
  { n: 4, titre: 'Validation', icon: FileText, desc: 'Signature du bulletin et validation' },
];

const AdhesionPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    // Identification
    section: '', nom: '', prenom: '', cni_number: '', date_naissance: '', sexe: '', contact: '', localite: '', campement: '',
    loc_region: '', loc_departement: '', loc_sous_prefecture: '',
    // Cacaoyere
    nombre_champs: 0, code_cacaoyere: '', date_creation_cacaoyere: '', date_enregistrement: new Date().toISOString().slice(0, 10),
    superficie_ha: 0, culture: 'Cacao', densite_pieds: 0, polygone_disponible: 'non',
    gps_latitude: '', gps_longitude: '', autres_cultures: '', date_audit_interne: '',
    // Production
    recolte_precedente_kg: 0, volume_vendu_precedent_kg: 0, estimation_rendement_kg_ha: 0, volume_certifier_kg: 0,
    // Travailleurs
    nb_travailleurs: 0, travailleurs_liste: [],
    // Menage
    membres_menage: [],
    // Bulletin
    signature_producteur: false, temoin_1_nom: '', temoin_1_signature: false, temoin_2_nom: '', temoin_2_signature: false,
    notes: '',
  });
  const [result, setResult] = useState(null);

  const up = useCallback((k, v) => setForm(prev => ({ ...prev, [k]: v })), []);

  const addTravailleur = () => up('travailleurs_liste', [...form.travailleurs_liste, { nom: '', prenom: '', sexe: '', date_naissance: '' }]);
  const removeTravailleur = (i) => up('travailleurs_liste', form.travailleurs_liste.filter((_, idx) => idx !== i));
  const updateTravailleur = (i, k, v) => {
    const list = [...form.travailleurs_liste];
    list[i] = { ...list[i], [k]: v };
    up('travailleurs_liste', list);
  };

  const addMenage = () => up('membres_menage', [...form.membres_menage, { nom: '', prenom: '', sexe: '', date_naissance: '', qualite_filiation: '', frequentation_ecole: '', raison_non_scolarisation: '', nom_ecole: '', classe: '' }]);
  const removeMenage = (i) => up('membres_menage', form.membres_menage.filter((_, idx) => idx !== i));
  const updateMenage = (i, k, v) => {
    const list = [...form.membres_menage];
    list[i] = { ...list[i], [k]: v };
    up('membres_menage', list);
  };

  const handleSubmit = async () => {
    if (!form.nom || !form.contact) { toast.error('Nom et contact obligatoires'); return; }
    setSubmitting(true);
    try {
      const token = tokenService.getToken();
      const payload = { ...form, nb_travailleurs: form.travailleurs_liste.length || form.nb_travailleurs };
      const res = await fetch(`${API}/api/membres/adhesion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Erreur');
      const data = await res.json();
      setResult(data);
      toast.success('Adhesion creee avec succes');
    } catch (e) { console.error('Adhesion error:', e); toast.error('Erreur creation'); }
    finally { setSubmitting(false); }
  };

  if (result) {
    return (
      <div className="min-h-screen bg-[#FAF9F6]" data-testid="adhesion-success">
        <Header navigate={navigate} />
        <div className="max-w-[600px] mx-auto px-6 py-16 text-center">
          <CheckCircle2 className="h-16 w-16 text-emerald-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#1A3622] mb-2">Adhesion enregistree</h2>
          <p className="text-sm text-[#6B7280] mb-1">Code membre: <span className="font-mono font-bold">{result.code_membre}</span></p>
          <p className="text-xs text-[#6B7280] mb-6">{form.nom} {form.prenom} | {form.localite}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => { setResult(null); setStep(1); setForm(prev => ({ ...prev, nom: '', prenom: '', contact: '', cni_number: '' })); }} className="px-4 py-2 text-sm border border-[#E5E5E0] rounded-md hover:bg-[#F3F4F6]" data-testid="btn-new">Nouvelle adhesion</button>
            <button onClick={() => navigate('/cooperative/membres')} className="px-4 py-2 text-sm bg-[#1A3622] text-white rounded-md hover:bg-[#112417]" data-testid="btn-back-dashboard">Dashboard</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6]" data-testid="adhesion-page">
      <Header navigate={navigate} />
      <div className="max-w-[900px] mx-auto px-6 md:px-8 py-8">
        {/* Stepper */}
        <div className="flex items-center justify-between mb-8" data-testid="stepper">
          {ETAPES.map((e, i) => (
            <div key={e.n} className="flex items-center flex-1">
              <button onClick={() => setStep(e.n)} className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step >= e.n ? 'bg-[#1A3622] text-white shadow-md' : 'bg-[#E5E5E0] text-[#6B7280]'}`} data-testid={`step-${e.n}`}>
                {step > e.n ? <CheckCircle2 className="h-4 w-4" /> : e.n}
              </button>
              <div className="ml-2 hidden md:block">
                <p className={`text-[10px] font-bold ${step >= e.n ? 'text-[#1A3622]' : 'text-[#9CA3AF]'}`}>{e.titre}</p>
              </div>
              {i < ETAPES.length - 1 && <div className={`flex-1 h-0.5 mx-3 transition-colors ${step > e.n ? 'bg-[#1A3622]' : 'bg-[#E5E5E0]'}`} />}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="bg-white border border-[#E5E5E0] rounded-md overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E5E5E0] bg-[#F9FAFB]">
            <h2 className="text-sm font-bold text-[#1A3622]">{ETAPES[step - 1].titre}</h2>
            <p className="text-[10px] text-[#6B7280] mt-0.5">{ETAPES[step - 1].desc}</p>
          </div>
          <div className="p-6">
            {step === 1 && <Step1Identification form={form} up={up} />}
            {step === 2 && <Step2CacaoyereProduction form={form} up={up} />}
            {step === 3 && <Step3TravailleursMenage form={form} addTravailleur={addTravailleur} removeTravailleur={removeTravailleur} updateTravailleur={updateTravailleur} addMenage={addMenage} removeMenage={removeMenage} updateMenage={updateMenage} />}
            {step === 4 && <Step4Validation form={form} up={up} />}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <button onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1} className="px-4 py-2 text-sm border border-[#E5E5E0] rounded-md hover:bg-[#F3F4F6] disabled:opacity-40" data-testid="btn-prev">Precedent</button>
          {step < 4 ? (
            <button onClick={() => setStep(step + 1)} className="flex items-center gap-2 px-5 py-2 text-sm bg-[#1A3622] text-white rounded-md hover:bg-[#112417]" data-testid="btn-next">Suivant <ArrowRight className="h-3.5 w-3.5" /></button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting} className="px-6 py-2 text-sm bg-[#1A3622] text-white rounded-md hover:bg-[#112417] disabled:opacity-50" data-testid="btn-submit">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer l'adhesion"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};


// ============= GEO CAPTURE =============
const GeoCapture = ({ latitude, longitude, onCapture }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [photoPreview, setPhotoPreview] = useState(null);
  const fileRef = React.useRef(null);

  const capturePosition = () => {
    if (!navigator.geolocation) { setError('Geolocalisation non supportee'); return; }
    setLoading(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onCapture(String(pos.coords.latitude.toFixed(6)), String(pos.coords.longitude.toFixed(6)));
        setLoading(false);
      },
      (err) => {
        setError(err.code === 1 ? 'Acces GPS refuse. Autorisez la localisation.' : 'Impossible d\'obtenir la position.');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoPreview(URL.createObjectURL(file));
    // Try to extract EXIF GPS from photo, otherwise use device GPS
    capturePosition();
  };

  const hasCoords = latitude && longitude;

  return (
    <div className="border border-emerald-200 rounded-md bg-emerald-50/50 p-3" data-testid="geo-capture">
      <div className="flex items-center gap-2 mb-2">
        <MapPinned className="h-4 w-4 text-emerald-700" />
        <p className="text-[10px] font-bold text-emerald-800 uppercase">Geolocalisation de la parcelle</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={capturePosition} disabled={loading} className="flex items-center gap-2 px-3 py-2 bg-[#1A3622] text-white rounded-md text-xs font-medium hover:bg-[#112417] disabled:opacity-50" data-testid="btn-capture-gps">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Navigation className="h-3.5 w-3.5" />}
          {loading ? 'Acquisition GPS...' : 'Capturer ma position'}
        </button>
        <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-2 px-3 py-2 bg-white border border-emerald-300 text-emerald-800 rounded-md text-xs font-medium hover:bg-emerald-50" data-testid="btn-photo-geo">
          <Camera className="h-3.5 w-3.5" /> Photo geolocalisee
        </button>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} data-testid="input-photo-geo" />
      </div>
      {error && <p className="text-[10px] text-red-600 mt-2">{error}</p>}
      {hasCoords && (
        <div className="flex items-center gap-3 mt-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <p className="text-xs text-emerald-800 font-mono">Lat: {latitude} | Lng: {longitude}</p>
        </div>
      )}
      {photoPreview && (
        <div className="mt-2">
          <img src={photoPreview} alt="Photo parcelle" className="h-16 w-16 object-cover rounded border border-emerald-200" />
        </div>
      )}
    </div>
  );
};

// ============= STEP 1: IDENTIFICATION =============
const Step1Identification = ({ form, up }) => (
  <div className="space-y-4" data-testid="step1-form">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Fld label="Nom *" value={form.nom} onChange={v => up('nom', v)} testid="input-nom" placeholder="Nom de famille" />
      <Fld label="Prenom *" value={form.prenom} onChange={v => up('prenom', v)} testid="input-prenom" placeholder="Prenom(s)" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Fld label="N CNI" value={form.cni_number} onChange={v => up('cni_number', v)} testid="input-cni" placeholder="Numero carte identite" />
      <Fld label="Date de naissance" value={form.date_naissance} type="date" onChange={v => up('date_naissance', v)} testid="input-naissance" />
      <Sel label="Sexe *" value={form.sexe} onChange={v => up('sexe', v)} testid="input-sexe" options={[{ v: '', l: 'Choisir' }, { v: 'M', l: 'Masculin' }, { v: 'F', l: 'Feminin' }]} />
    </div>
    <Fld label="Contact (telephone) *" value={form.contact} onChange={v => up('contact', v)} testid="input-contact" placeholder="+225 07..." />
    {/* Selecteur en cascade Region → Departement → Sous-prefecture → Village */}
    <div className="border border-[#D4AF37] rounded-md overflow-hidden">
      <div className="px-3 py-2 bg-[#FFF9E6] border-b border-[#D4AF37]">
        <p className="text-[10px] font-bold text-[#92400E]">LOCALISATION (Region → Departement → Sous-prefecture → Village)</p>
      </div>
      <div className="p-3">
        <LocationSelector
          region={form.loc_region}
          departement={form.loc_departement}
          sousPrefecture={form.loc_sous_prefecture}
          village={form.localite}
          onChange={({ region, departement, sous_prefecture, village }) => {
            up('loc_region', region);
            up('loc_departement', departement);
            up('loc_sous_prefecture', sous_prefecture);
            up('localite', village);
            if (!form.section && sous_prefecture) up('section', sous_prefecture);
          }}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <Fld label="Campement" value={form.campement} onChange={v => up('campement', v)} testid="input-campement" placeholder="Nom du campement" />
          <Fld label="Section" value={form.section} onChange={v => up('section', v)} testid="input-section" placeholder="Auto-rempli ou saisir manuellement" />
        </div>
      </div>
    </div>
  </div>
);

// ============= STEP 2: CACAOYERE & PRODUCTION =============
const Step2CacaoyereProduction = ({ form, up }) => (
  <div className="space-y-6" data-testid="step2-form">
    <div>
      <SectionTitle icon={MapPin} title="Informations sur la Cacaoyere" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
        <Fld label="Nombre de champs" value={form.nombre_champs} type="number" onChange={v => up('nombre_champs', parseInt(v) || 0)} testid="input-nb-champs" />
        <Fld label="Code cacaoyere" value={form.code_cacaoyere} onChange={v => up('code_cacaoyere', v)} testid="input-code-cacao" placeholder="Ex: CAC-001" />
        <Fld label="Date de creation" value={form.date_creation_cacaoyere} type="date" onChange={v => up('date_creation_cacaoyere', v)} testid="input-date-creation" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
        <Fld label="Date enregistrement" value={form.date_enregistrement} type="date" onChange={v => up('date_enregistrement', v)} testid="input-date-enreg" />
        <Fld label="Superficie (ha)" value={form.superficie_ha} type="number" onChange={v => up('superficie_ha', parseFloat(v) || 0)} testid="input-superficie" />
        <Fld label="Culture" value={form.culture} onChange={v => up('culture', v)} testid="input-culture" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
        <Fld label="Densite (pieds)" value={form.densite_pieds} type="number" onChange={v => up('densite_pieds', parseInt(v) || 0)} testid="input-densite" />
        <Sel label="Polygone disponible" value={form.polygone_disponible} onChange={v => up('polygone_disponible', v)} testid="input-polygone" options={[{ v: 'non', l: 'Non' }, { v: 'oui', l: 'Oui' }]} />
        <Fld label="Autres cultures" value={form.autres_cultures} onChange={v => up('autres_cultures', v)} testid="input-autres-cultures" placeholder="Cafe, Hevea..." />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
        <div className="md:col-span-3">
          <GeoCapture
            latitude={form.gps_latitude}
            longitude={form.gps_longitude}
            onCapture={(lat, lng) => { up('gps_latitude', lat); up('gps_longitude', lng); }}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
        <Fld label="GPS Latitude" value={form.gps_latitude} onChange={v => up('gps_latitude', v)} testid="input-lat" placeholder="-5.2345" />
        <Fld label="GPS Longitude" value={form.gps_longitude} onChange={v => up('gps_longitude', v)} testid="input-lng" placeholder="4.0123" />
        <Fld label="Date audit interne" value={form.date_audit_interne} type="date" onChange={v => up('date_audit_interne', v)} testid="input-date-audit" />
      </div>
    </div>
    <div>
      <SectionTitle icon={BarChart3} title="Informations de Production" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
        <Fld label="Recolte annee precedente (Kg)" value={form.recolte_precedente_kg} type="number" onChange={v => up('recolte_precedente_kg', parseFloat(v) || 0)} testid="input-recolte-prec" />
        <Fld label="Volume vendu campagne precedente (Kg)" value={form.volume_vendu_precedent_kg} type="number" onChange={v => up('volume_vendu_precedent_kg', parseFloat(v) || 0)} testid="input-vol-vendu" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
        <Fld label="Estimation rendement (Kg/ha)" value={form.estimation_rendement_kg_ha} type="number" onChange={v => up('estimation_rendement_kg_ha', parseFloat(v) || 0)} testid="input-rendement" />
        <Fld label="Volume a certifier (Kg)" value={form.volume_certifier_kg} type="number" onChange={v => up('volume_certifier_kg', parseFloat(v) || 0)} testid="input-vol-certif" />
      </div>
    </div>
  </div>
);

// ============= STEP 3: TRAVAILLEURS & MENAGE =============
const Step3TravailleursMenage = ({ form, addTravailleur, removeTravailleur, updateTravailleur, addMenage, removeMenage, updateMenage }) => (
  <div className="space-y-6" data-testid="step3-form">
    <div>
      <div className="flex items-center justify-between">
        <SectionTitle icon={Users} title={`Travailleurs Agricoles Permanents (${form.travailleurs_liste.length})`} />
        <button onClick={addTravailleur} className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-medium bg-[#1A3622] text-white rounded-md hover:bg-[#112417]" data-testid="btn-add-trav"><Plus className="h-3 w-3" /> Ajouter</button>
      </div>
      {form.travailleurs_liste.length === 0 ? (
        <p className="text-xs text-[#9CA3AF] mt-2 italic">Aucun travailleur ajoute</p>
      ) : (
        <div className="space-y-2 mt-3">
          {form.travailleurs_liste.map((t, i) => (
            <div key={`trav-${i}`} className="grid grid-cols-5 gap-2 items-end bg-[#F9FAFB] p-3 rounded-md border border-[#E5E5E0]">
              <Fld label="Nom" value={t.nom} onChange={v => updateTravailleur(i, 'nom', v)} testid={`trav-nom-${i}`} />
              <Fld label="Prenom" value={t.prenom} onChange={v => updateTravailleur(i, 'prenom', v)} testid={`trav-prenom-${i}`} />
              <Sel label="Sexe" value={t.sexe} onChange={v => updateTravailleur(i, 'sexe', v)} testid={`trav-sexe-${i}`} options={[{ v: '', l: '-' }, { v: 'M', l: 'M' }, { v: 'F', l: 'F' }]} />
              <Fld label="Naissance" value={t.date_naissance} type="date" onChange={v => updateTravailleur(i, 'date_naissance', v)} testid={`trav-naiss-${i}`} />
              <button onClick={() => removeTravailleur(i)} className="self-end mb-1 p-1.5 text-red-500 hover:bg-red-50 rounded" data-testid={`trav-del-${i}`}><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
      )}
    </div>

    <div className="border-t border-[#E5E5E0] pt-5">
      <div className="flex items-center justify-between">
        <SectionTitle icon={GraduationCap} title={`Composition du Menage (${form.membres_menage.length})`} />
        <button onClick={addMenage} className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-medium bg-[#1A3622] text-white rounded-md hover:bg-[#112417]" data-testid="btn-add-menage"><Plus className="h-3 w-3" /> Ajouter</button>
      </div>
      {form.membres_menage.length === 0 ? (
        <p className="text-xs text-[#9CA3AF] mt-2 italic">Aucun membre du menage ajoute</p>
      ) : (
        <div className="space-y-3 mt-3">
          {form.membres_menage.map((m, i) => (
            <div key={`menage-${i}`} className="bg-[#F9FAFB] p-3 rounded-md border border-[#E5E5E0] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#1A3622]">Membre #{i + 1}</span>
                <button onClick={() => removeMenage(i)} className="p-1 text-red-500 hover:bg-red-50 rounded" data-testid={`menage-del-${i}`}><Trash2 className="h-3 w-3" /></button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Fld label="Nom" value={m.nom} onChange={v => updateMenage(i, 'nom', v)} testid={`menage-nom-${i}`} />
                <Fld label="Prenom" value={m.prenom} onChange={v => updateMenage(i, 'prenom', v)} testid={`menage-prenom-${i}`} />
                <Sel label="Sexe" value={m.sexe} onChange={v => updateMenage(i, 'sexe', v)} testid={`menage-sexe-${i}`} options={[{ v: '', l: '-' }, { v: 'M', l: 'M' }, { v: 'F', l: 'F' }]} />
                <Fld label="Naissance" value={m.date_naissance} type="date" onChange={v => updateMenage(i, 'date_naissance', v)} testid={`menage-naiss-${i}`} />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <Sel label="Qualite (filiation)" value={m.qualite_filiation} onChange={v => updateMenage(i, 'qualite_filiation', v)} testid={`menage-filiation-${i}`} options={[{ v: '', l: 'Choisir...' }, { v: 'Conjoint(e)', l: 'Conjoint(e)' }, { v: 'Enfant', l: 'Enfant' }, { v: 'Neveu/Niece', l: 'Neveu/Niece' }, { v: 'Frere/Soeur', l: 'Frere/Soeur' }, { v: 'Parent', l: 'Parent' }, { v: 'Autre', l: 'Autre' }]} />
                <Sel label="Frequentation ecole" value={m.frequentation_ecole} onChange={v => updateMenage(i, 'frequentation_ecole', v)} testid={`menage-ecole-${i}`} options={[{ v: '', l: '-' }, { v: 'oui', l: 'Oui' }, { v: 'non', l: 'Non' }]} />
                {m.frequentation_ecole === 'non' && <Fld label="Raison non-scolarisation" value={m.raison_non_scolarisation} onChange={v => updateMenage(i, 'raison_non_scolarisation', v)} testid={`menage-raison-${i}`} />}
              </div>
              {m.frequentation_ecole === 'oui' && (
                <div className="grid grid-cols-2 gap-2">
                  <Fld label="Nom de l'ecole" value={m.nom_ecole} onChange={v => updateMenage(i, 'nom_ecole', v)} testid={`menage-ecole-nom-${i}`} />
                  <Fld label="Classe" value={m.classe} onChange={v => updateMenage(i, 'classe', v)} testid={`menage-classe-${i}`} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);

// ============= STEP 4: VALIDATION =============
const Step4Validation = ({ form, up }) => (
  <div className="space-y-5" data-testid="step4-form">
    <div className="bg-[#F0FDF4] border border-emerald-200 rounded-md p-4">
      <p className="text-xs font-semibold text-emerald-800 mb-2">Recapitulatif</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-[10px] text-[#374151]">
        <div><strong>Nom:</strong> {form.nom} {form.prenom}</div>
        <div><strong>Contact:</strong> {form.contact}</div>
        <div><strong>Localite:</strong> {form.localite}</div>
        <div><strong>Campement:</strong> {form.campement}</div>
        <div><strong>Superficie:</strong> {form.superficie_ha} ha</div>
        <div><strong>Volume certifier:</strong> {form.volume_certifier_kg} Kg</div>
        <div><strong>Travailleurs:</strong> {form.travailleurs_liste.length}</div>
        <div><strong>Menage:</strong> {form.membres_menage.length} personnes</div>
      </div>
    </div>
    <div className="space-y-3">
      <Chk label="Signature du producteur" checked={form.signature_producteur} onChange={v => up('signature_producteur', v)} testid="chk-signature" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Fld label="Temoin 1 (nom)" value={form.temoin_1_nom} onChange={v => up('temoin_1_nom', v)} testid="input-temoin1" />
        <Fld label="Temoin 2 (nom)" value={form.temoin_2_nom} onChange={v => up('temoin_2_nom', v)} testid="input-temoin2" />
      </div>
      <Chk label="Signature temoin 1" checked={form.temoin_1_signature} onChange={v => up('temoin_1_signature', v)} testid="chk-temoin1" />
      <Chk label="Signature temoin 2" checked={form.temoin_2_signature} onChange={v => up('temoin_2_signature', v)} testid="chk-temoin2" />
      <TArea label="Notes / Observations" value={form.notes} onChange={v => up('notes', v)} testid="input-notes" placeholder="Notes supplementaires..." />
    </div>
  </div>
);

// ============= HEADER =============
const Header = ({ navigate }) => (
  <div className="bg-[#1A3622]">
    <div className="max-w-[900px] mx-auto px-6 md:px-8 py-6">
      <div className="flex items-center gap-2 text-white/50 text-xs mb-3">
        <button onClick={() => navigate('/cooperative/dashboard')} className="hover:text-white"><Home className="h-3.5 w-3.5" /></button>
        <ChevronRight className="h-3 w-3" />
        <button onClick={() => navigate('/cooperative/membres')} className="hover:text-white">Membres</button>
        <ChevronRight className="h-3 w-3" />
        <span className="text-white/80">Nouvelle adhesion</span>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/cooperative/membres')} className="w-8 h-8 rounded-md bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors" data-testid="btn-retour"><ChevronRight className="h-4 w-4 text-white rotate-180" /></button>
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Nouvelle Adhesion - Registre ARS 1000</h1>
          <p className="text-sm text-white/60 mt-1">Clauses 4.2.2 & 4.2.3 - Formulaire conforme au registre officiel</p>
        </div>
      </div>
    </div>
  </div>
);

// ============= UI COMPONENTS =============
const SectionTitle = ({ icon: Icon, title }) => (
  <div className="flex items-center gap-2 mb-1">
    <Icon className="h-4 w-4 text-[#D4AF37]" />
    <p className="text-xs font-bold text-[#1A3622] uppercase tracking-wide">{title}</p>
  </div>
);

const Fld = StableInput;
const Sel = StableSelect;
const TArea = StableTextarea;

const Chk = ({ label, checked, onChange, testid }) => (
  <label className="flex items-center gap-2 cursor-pointer" data-testid={testid}>
    <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="rounded border-[#E5E5E0] text-[#1A3622] focus:ring-[#1A3622]" />
    <span className="text-xs text-[#374151]">{label}</span>
  </label>
);

export default AdhesionPage;

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { tokenService } from '../../../services/tokenService';
import { useAuth } from '../../../context/AuthContext';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { toast } from 'sonner';
import DynamicTable from './DynamicTable';
import {
  ArrowLeft, ArrowRight, Save, CheckCircle2, Loader2,
  ClipboardList, Search as SearchIcon, Calendar, Lock,
  FileText, ChevronDown, ChevronUp
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const getToken = () => tokenService.getToken();
const authHeaders = () => ({ 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' });

const STEPS = [
  { num: 1, title: 'Collecte de donnees', subtitle: 'Annexe 1 - Agent Terrain', fiches: ['Fiche 1', 'Fiche 2', 'Fiche 3', 'Fiche 4'] },
  { num: 2, title: 'Analyse des donnees', subtitle: 'Annexe 2 - Agronome', fiches: ['Fiche 5'] },
  { num: 3, title: 'Planification', subtitle: 'Annexe 3 - Agronome', fiches: ['Fiche 6', 'Fiche 7', 'Fiche 8'] },
];

const PDCStepperPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pdc, setPdc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [activeFiche, setActiveFiche] = useState(0);
  const [expandedSections, setExpandedSections] = useState({});

  const userType = user?.user_type || '';
  const isCoopOrAdmin = ['cooperative', 'admin', 'super_admin'].includes(userType);
  const isAgent = ['field_agent', 'agent_terrain'].includes(userType);
  const isFarmer = ['farmer', 'planteur', 'producteur'].includes(userType);
  const readOnly = pdc?.statut === 'valide' || isFarmer;

  const canEditStep1 = !readOnly && (isAgent || isCoopOrAdmin);
  const canEditStep2 = !readOnly && isCoopOrAdmin;
  const canEditStep3 = !readOnly && isCoopOrAdmin;
  const canValidate = isCoopOrAdmin && pdc?.statut !== 'valide';

  const loadPdc = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/pdc-v2/${id}`, { headers: authHeaders() });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Erreur');
      }
      const data = await res.json();
      setPdc(data);
      setActiveStep(data.current_step || 1);
    } catch (e) {
      toast.error(e.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadPdc(); }, [loadPdc]);

  const saveStep = async (stepNum) => {
    setSaving(true);
    try {
      const body = {};
      if (stepNum === 1) {
        body.fiche1 = pdc.step1?.fiche1;
        body.fiche2 = pdc.step1?.fiche2;
        body.fiche3 = pdc.step1?.fiche3;
        body.fiche4 = pdc.step1?.fiche4;
      } else if (stepNum === 2) {
        body.fiche5 = pdc.step2?.fiche5;
      } else {
        body.fiche6 = pdc.step3?.fiche6;
        body.fiche7 = pdc.step3?.fiche7;
        body.fiche8 = pdc.step3?.fiche8;
      }
      const res = await fetch(`${API_URL}/api/pdc-v2/${id}/step${stepNum}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Erreur');
      }
      const updated = await res.json();
      setPdc(updated);
      toast.success('Sauvegarde reussie');
    } catch (e) {
      toast.error(e.message || 'Erreur de sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const submitStep = async (stepNum) => {
    setSaving(true);
    try {
      // Save first
      await saveStep(stepNum);
      const res = await fetch(`${API_URL}/api/pdc-v2/${id}/submit-step${stepNum}`, {
        method: 'POST',
        headers: authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Erreur');
      }
      const updated = await res.json();
      setPdc(updated);
      setActiveStep(stepNum + 1);
      setActiveFiche(0);
      toast.success(`Etape ${stepNum} soumise`);
    } catch (e) {
      toast.error(e.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const validatePdc = async () => {
    if (!window.confirm('Valider definitivement ce PDC ? Le planteur sera notifie.')) return;
    setSaving(true);
    try {
      await saveStep(3);
      const res = await fetch(`${API_URL}/api/pdc-v2/${id}/validate`, {
        method: 'POST',
        headers: authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Erreur');
      }
      const updated = await res.json();
      setPdc(updated);
      toast.success('PDC valide avec succes ! Le planteur a ete notifie.');
    } catch (e) {
      toast.error(e.message || 'Erreur de validation');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (stepKey, ficheKey, path, value) => {
    setPdc(prev => {
      const step = { ...prev[stepKey] };
      const fiche = { ...step[ficheKey] };
      const keys = path.split('.');
      let obj = fiche;
      for (let i = 0; i < keys.length - 1; i++) {
        obj[keys[i]] = { ...obj[keys[i]] };
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;
      step[ficheKey] = fiche;
      return { ...prev, [stepKey]: step };
    });
  };

  const updateArray = (stepKey, ficheKey, arrayKey, value) => {
    setPdc(prev => {
      const step = { ...prev[stepKey] };
      const fiche = { ...step[ficheKey] };
      fiche[arrayKey] = value;
      step[ficheKey] = fiche;
      return { ...prev, [stepKey]: step };
    });
  };

  const toggleSection = (key) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isExpanded = (key) => expandedSections[key] !== false;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#1A3622]" />
      </div>
    );
  }

  if (!pdc) {
    return (
      <div className="p-6 text-center">
        <p className="text-[#6B7280]">PDC introuvable ou acces refuse</p>
        <Button variant="outline" onClick={() => navigate(-1)} className="mt-4">Retour</Button>
      </div>
    );
  }

  const currentCanEdit = activeStep === 1 ? canEditStep1 : activeStep === 2 ? canEditStep2 : canEditStep3;
  const ficheNames = STEPS[activeStep - 1].fiches;

  // ---- Section: Collapsible Card ----
  const SectionCard = ({ title, sectionKey, children }) => (
    <div className="border border-[#E5E5E0] rounded-md overflow-hidden">
      <button onClick={() => toggleSection(sectionKey)} className="w-full flex items-center justify-between px-4 py-3 bg-[#FAF9F6] hover:bg-[#E8F0EA] transition-colors text-left">
        <span className="text-sm font-semibold text-[#1A3622]">{title}</span>
        {isExpanded(sectionKey) ? <ChevronUp className="w-4 h-4 text-[#6B7280]" /> : <ChevronDown className="w-4 h-4 text-[#6B7280]" />}
      </button>
      {isExpanded(sectionKey) && <div className="p-4 space-y-3">{children}</div>}
    </div>
  );

  // ---- Form Field Helper ----
  const FormField = ({ label, value, onChange, type = 'text', placeholder = '', disabled = false }) => (
    <div>
      <label className="text-xs font-medium text-[#6B7280] mb-1 block">{label}</label>
      <Input
        type={type}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled || readOnly}
        className="h-8 text-sm border-[#E5E5E0]"
      />
    </div>
  );

  const SelectField = ({ label, value, onChange, options, disabled = false }) => (
    <div>
      <label className="text-xs font-medium text-[#6B7280] mb-1 block">{label}</label>
      <select
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        disabled={disabled || readOnly}
        className="w-full border border-[#E5E5E0] rounded-md px-3 py-1.5 text-sm bg-white focus:ring-1 focus:ring-[#1A3622] outline-none disabled:bg-gray-50"
      >
        <option value="">--</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );

  // ============= FICHE RENDERERS =============

  const renderFiche1 = () => {
    const f = pdc.step1?.fiche1 || {};
    const enq = f.enqueteur || {};
    const prod = f.producteur || {};
    const disabled = !canEditStep1;

    return (
      <div className="space-y-4" data-testid="fiche-1">
        <SectionCard title="Informations de l'enqueteur" sectionKey="f1-enq">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <FormField label="Date" type="date" value={enq.date} onChange={v => updateField('step1', 'fiche1', 'enqueteur.date', v)} disabled={disabled} />
            <FormField label="Nom de l'enqueteur" value={enq.nom} onChange={v => updateField('step1', 'fiche1', 'enqueteur.nom', v)} disabled={disabled} />
            <FormField label="Qualification" value={enq.qualification} onChange={v => updateField('step1', 'fiche1', 'enqueteur.qualification', v)} disabled={disabled} />
            <FormField label="Contact (Tel)" value={enq.contact_tel} onChange={v => updateField('step1', 'fiche1', 'enqueteur.contact_tel', v)} disabled={disabled} />
          </div>
        </SectionCard>

        <SectionCard title="Identification du producteur" sectionKey="f1-prod">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <FormField label="Nom et prenoms" value={prod.nom} onChange={v => updateField('step1', 'fiche1', 'producteur.nom', v)} disabled={disabled} />
            <FormField label="Code National (Conseil Cafe-Cacao)" value={prod.code_national} onChange={v => updateField('step1', 'fiche1', 'producteur.code_national', v)} disabled={disabled} />
            <FormField label="Nom Entite Reconnue" value={prod.entite_reconnue} onChange={v => updateField('step1', 'fiche1', 'producteur.entite_reconnue', v)} disabled={disabled} />
            <FormField label="Code groupe" value={prod.code_groupe} onChange={v => updateField('step1', 'fiche1', 'producteur.code_groupe', v)} disabled={disabled} />
            <FormField label="Delegation Regionale" value={prod.delegation_regionale} onChange={v => updateField('step1', 'fiche1', 'producteur.delegation_regionale', v)} disabled={disabled} />
            <FormField label="Code cooperative" value={prod.code_cooperative} onChange={v => updateField('step1', 'fiche1', 'producteur.code_cooperative', v)} disabled={disabled} />
            <FormField label="Departement" value={prod.departement} onChange={v => updateField('step1', 'fiche1', 'producteur.departement', v)} disabled={disabled} />
            <FormField label="Sous-Prefecture" value={prod.sous_prefecture} onChange={v => updateField('step1', 'fiche1', 'producteur.sous_prefecture', v)} disabled={disabled} />
            <FormField label="Village" value={prod.village} onChange={v => updateField('step1', 'fiche1', 'producteur.village', v)} disabled={disabled} />
            <FormField label="Campement" value={prod.campement} onChange={v => updateField('step1', 'fiche1', 'producteur.campement', v)} disabled={disabled} />
          </div>
        </SectionCard>

        <SectionCard title="Membres du menage" sectionKey="f1-menage">
          <DynamicTable
            readOnly={disabled || readOnly}
            columns={[
              { key: 'nom_prenoms', label: 'Nom et prenoms', width: '180px' },
              { key: 'statut_famille', label: 'Statut Famille', type: 'select', width: '130px', options: [
                { value: 'chef_menage', label: 'Chef de menage' },
                { value: 'conjoint', label: 'Conjoint' },
                { value: 'enfant', label: 'Enfant' },
                { value: 'autre', label: 'Autre' },
              ]},
              { key: 'statut_plantation', label: 'Statut Plantation', type: 'select', width: '130px', options: [
                { value: 'aucun', label: 'Aucun' },
                { value: 'proprietaire', label: 'Proprietaire' },
                { value: 'gerant', label: 'Gerant' },
                { value: 'mo_permanent', label: 'MO permanent' },
                { value: 'mo_temporaire', label: 'MO temporaire' },
              ]},
              { key: 'statut_scolaire', label: 'Statut Scolaire', type: 'select', width: '120px', options: [
                { value: 'scolarise', label: 'Scolarise' },
                { value: 'descolarise', label: 'Descolarise' },
              ]},
              { key: 'contact', label: 'Contact', width: '120px' },
              { key: 'annee_naissance', label: 'Annee naissance', type: 'number', width: '100px' },
              { key: 'sexe', label: 'Sexe', type: 'select', width: '80px', options: [
                { value: 'M', label: 'M' }, { value: 'F', label: 'F' },
              ]},
              { key: 'niveau_instruction', label: 'Niveau instruction', type: 'select', width: '130px', options: [
                { value: 'aucun', label: 'Aucun' },
                { value: 'prescolaire', label: 'Prescolaire' },
                { value: 'primaire', label: 'Primaire' },
                { value: 'secondaire', label: 'Secondaire' },
                { value: 'superieur', label: 'Superieur' },
              ]},
              { key: 'categorie_ethnique', label: 'Categorie', type: 'select', width: '110px', options: [
                { value: 'autochtone', label: 'Autochtone' },
                { value: 'allogene', label: 'Allogene' },
                { value: 'allochtone', label: 'Allochtone' },
              ]},
            ]}
            rows={f.membres_menage || []}
            onChange={v => updateArray('step1', 'fiche1', 'membres_menage', v)}
            addLabel="Ajouter un membre"
          />
        </SectionCard>
      </div>
    );
  };

  const renderFiche2 = () => {
    const f = pdc.step1?.fiche2 || {};
    const gps = f.coordonnees_gps || {};
    const disabled = !canEditStep1;

    return (
      <div className="space-y-4" data-testid="fiche-2">
        <SectionCard title="Coordonnees Geographiques de la cacaoyere" sectionKey="f2-gps">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <FormField label="Waypoint O" value={gps.waypoint_o} onChange={v => updateField('step1', 'fiche2', 'coordonnees_gps.waypoint_o', v)} disabled={disabled} />
            <FormField label="N" value={gps.n} onChange={v => updateField('step1', 'fiche2', 'coordonnees_gps.n', v)} disabled={disabled} />
            <FormField label="Sous-prefecture" value={gps.sous_prefecture} onChange={v => updateField('step1', 'fiche2', 'coordonnees_gps.sous_prefecture', v)} disabled={disabled} />
            <FormField label="Village" value={gps.village} onChange={v => updateField('step1', 'fiche2', 'coordonnees_gps.village', v)} disabled={disabled} />
            <FormField label="Campement" value={gps.campement} onChange={v => updateField('step1', 'fiche2', 'coordonnees_gps.campement', v)} disabled={disabled} />
          </div>
        </SectionCard>

        <SectionCard title="Donnees sur les cultures" sectionKey="f2-cultures">
          <DynamicTable
            readOnly={disabled || readOnly}
            columns={[
              { key: 'libelle', label: 'Libelle', width: '120px' },
              { key: 'annee_creation', label: 'Annee creation', type: 'number', width: '110px' },
              { key: 'precedent_cultural', label: 'Precedent cultural', width: '130px' },
              { key: 'superficie_ha', label: 'Sup. (ha)', type: 'number', width: '90px' },
              { key: 'origine_materiel', label: 'Origine materiel vegetal', width: '150px' },
              { key: 'en_production', label: 'En production', type: 'select', width: '100px', options: [
                { value: 'oui', label: 'Oui' }, { value: 'non', label: 'Non' },
              ]},
            ]}
            rows={f.cultures || []}
            onChange={v => updateArray('step1', 'fiche2', 'cultures', v)}
            addLabel="Ajouter une culture"
          />
        </SectionCard>

        <SectionCard title="Materiels agricoles / Equipements de travail" sectionKey="f2-materiels">
          <DynamicTable
            readOnly={disabled || readOnly}
            columns={[
              { key: 'type', label: 'Type', type: 'select', width: '140px', options: [
                { value: 'traitement', label: 'Materiel de traitement' },
                { value: 'transport', label: 'Materiel de transport' },
                { value: 'deplacement', label: 'Moyen de deplacement' },
                { value: 'sechage', label: 'Materiel de sechage' },
                { value: 'fermentation', label: 'Materiel de fermentation' },
                { value: 'outillage', label: 'Petit outillage' },
                { value: 'autre', label: 'Autres' },
              ]},
              { key: 'designation', label: 'Designation', width: '140px' },
              { key: 'quantite', label: 'Quantite', type: 'number', width: '80px' },
              { key: 'annee_acquisition', label: 'Annee acq.', type: 'number', width: '90px' },
              { key: 'cout', label: 'Cout (FCFA)', type: 'number', width: '100px' },
              { key: 'etat_bon', label: 'Bon', type: 'number', width: '60px' },
              { key: 'etat_acceptable', label: 'Accept.', type: 'number', width: '60px' },
              { key: 'etat_mauvais', label: 'Mauvais', type: 'number', width: '70px' },
            ]}
            rows={f.materiels || []}
            onChange={v => updateArray('step1', 'fiche2', 'materiels', v)}
            addLabel="Ajouter un materiel"
          />
        </SectionCard>

        <SectionCard title="Diagnostic des arbres (autres que cacaoyer)" sectionKey="f2-arbres">
          <DynamicTable
            readOnly={disabled || readOnly}
            columns={[
              { key: 'numero', label: 'N', type: 'number', width: '50px' },
              { key: 'nom_botanique', label: 'Nom botanique', width: '130px' },
              { key: 'nom_local', label: 'Nom local', width: '120px' },
              { key: 'circonference', label: 'Circonf. (cm)', type: 'number', width: '90px' },
              { key: 'longitude', label: 'Longitude', width: '100px' },
              { key: 'latitude', label: 'Latitude', width: '100px' },
              { key: 'origine', label: 'Origine', type: 'select', width: '100px', options: [
                { value: 'preserve', label: 'Preserve' }, { value: 'plante', label: 'Plante' },
              ]},
              { key: 'organe_utilise', label: 'Organe utilise', width: '110px' },
              { key: 'utilite', label: 'Utilite', width: '110px' },
              { key: 'decision', label: 'Decision', type: 'select', width: '100px', options: [
                { value: 'eliminer', label: 'A eliminer' }, { value: 'maintenir', label: 'A maintenir' },
              ]},
              { key: 'raisons', label: 'Raisons', width: '120px' },
            ]}
            rows={f.arbres || []}
            onChange={v => updateArray('step1', 'fiche2', 'arbres', v)}
            addLabel="Ajouter un arbre"
          />
        </SectionCard>
      </div>
    );
  };

  const renderFiche3 = () => {
    const f = pdc.step1?.fiche3 || {};
    const etat = f.etat_cacaoyere || {};
    const sol = f.etat_sol || {};
    const rpr = f.recolte_post_recolte || {};
    const disabled = !canEditStep1;

    return (
      <div className="space-y-4" data-testid="fiche-3">
        <SectionCard title="Etat de la cacaoyere" sectionKey="f3-etat">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <SelectField label="Dispositif de plantation" value={etat.dispositif_plantation} onChange={v => updateField('step1', 'fiche3', 'etat_cacaoyere.dispositif_plantation', v)} disabled={disabled}
              options={[{ value: 'en_lignes', label: 'En lignes' }, { value: 'en_desordre', label: 'En desordre' }]} />
            <FormField label="Densite des arbres" value={etat.densite_arbres} onChange={v => updateField('step1', 'fiche3', 'etat_cacaoyere.densite_arbres', v)} type="number" disabled={disabled} />
            <FormField label="Nombre moyen de tiges/cacaoyer" value={etat.nb_tiges} onChange={v => updateField('step1', 'fiche3', 'etat_cacaoyere.nb_tiges', v)} type="number" disabled={disabled} />
            <SelectField label="Plages vides" value={etat.plages_vides} onChange={v => updateField('step1', 'fiche3', 'etat_cacaoyere.plages_vides', v)} disabled={disabled}
              options={[{ value: 'peu', label: 'Peu (<=5)' }, { value: 'beaucoup', label: 'Beaucoup (>5)' }]} />
            <FormField label="Etendue plages vides (GPS)" value={etat.etendue_plages_vides} onChange={v => updateField('step1', 'fiche3', 'etat_cacaoyere.etendue_plages_vides', v)} disabled={disabled} />
            <SelectField label="Ombrage arbres" value={etat.ombrage} onChange={v => updateField('step1', 'fiche3', 'etat_cacaoyere.ombrage', v)} disabled={disabled}
              options={[{ value: 'inexistant', label: 'Inexistant' }, { value: 'moyen', label: 'Moyen' }, { value: 'dense', label: 'Dense' }]} />
            <SelectField label="Canopee/couronne" value={etat.canopee} onChange={v => updateField('step1', 'fiche3', 'etat_cacaoyere.canopee', v)} disabled={disabled}
              options={[{ value: 'normal', label: 'Normal' }, { value: 'peu_degrade', label: 'Peu degrade' }, { value: 'degrade', label: 'Degrade' }]} />
          </div>
        </SectionCard>

        <SectionCard title="Maladies et ravageurs" sectionKey="f3-maladies">
          <DynamicTable
            readOnly={disabled || readOnly}
            columns={[
              { key: 'type', label: 'Maladie/Ravageur', width: '180px' },
              { key: 'severite', label: 'Severite', type: 'select', width: '100px', options: [
                { value: '1', label: 'Aucun' }, { value: '2', label: 'Faible' }, { value: '3', label: 'Moyen' }, { value: '4', label: 'Fort' },
              ]},
              { key: 'observations', label: 'Observations', width: '200px' },
            ]}
            rows={f.maladies || []}
            onChange={v => updateArray('step1', 'fiche3', 'maladies', v)}
            addLabel="Ajouter maladie/ravageur"
          />
        </SectionCard>

        <SectionCard title="Etat du sol" sectionKey="f3-sol">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <SelectField label="Position parcelle" value={sol.position} onChange={v => updateField('step1', 'fiche3', 'etat_sol.position', v)} disabled={disabled}
              options={[{ value: 'haut_pente', label: 'Haut de pente' }, { value: 'mi_versant', label: 'Mi versant' }, { value: 'bas_pente', label: 'Bas de pente' }]} />
            <SelectField label="Couvert vegetal" value={sol.couvert_vegetal} onChange={v => updateField('step1', 'fiche3', 'etat_sol.couvert_vegetal', v)} disabled={disabled}
              options={[{ value: 'faible', label: 'Faible' }, { value: 'moyen', label: 'Moyen' }, { value: 'beaucoup', label: 'Beaucoup' }]} />
            <SelectField label="Matiere organique" value={sol.matiere_organique} onChange={v => updateField('step1', 'fiche3', 'etat_sol.matiere_organique', v)} disabled={disabled}
              options={[{ value: 'faible', label: 'Faible' }, { value: 'moyen', label: 'Moyen' }, { value: 'beaucoup', label: 'Beaucoup' }]} />
            <SelectField label="Zones erodees" value={sol.zones_erodees} onChange={v => updateField('step1', 'fiche3', 'etat_sol.zones_erodees', v)} disabled={disabled}
              options={[{ value: 'oui', label: 'Oui' }, { value: 'non', label: 'Non' }]} />
            <SelectField label="Zones a risque d'erosion" value={sol.zones_risque_erosion} onChange={v => updateField('step1', 'fiche3', 'etat_sol.zones_risque_erosion', v)} disabled={disabled}
              options={[{ value: 'oui', label: 'Oui' }, { value: 'non', label: 'Non' }]} />
            <FormField label="Observations sol" value={sol.observations} onChange={v => updateField('step1', 'fiche3', 'etat_sol.observations', v)} disabled={disabled} />
          </div>
        </SectionCard>

        <SectionCard title="Pratiques de recolte et post-recolte" sectionKey="f3-recolte">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField label="Frequence recoltes (jours)" value={rpr.frequence_recolte_jours} onChange={v => updateField('step1', 'fiche3', 'recolte_post_recolte.frequence_recolte_jours', v)} type="number" disabled={disabled} />
            <FormField label="Temps recolte-ecabossage (jours)" value={rpr.temps_ecabossage_jours} onChange={v => updateField('step1', 'fiche3', 'recolte_post_recolte.temps_ecabossage_jours', v)} type="number" disabled={disabled} />
            <FormField label="Duree fermentation (jours)" value={rpr.duree_fermentation_jours} onChange={v => updateField('step1', 'fiche3', 'recolte_post_recolte.duree_fermentation_jours', v)} type="number" disabled={disabled} />
            <SelectField label="Mode fermentation" value={rpr.mode_fermentation} onChange={v => updateField('step1', 'fiche3', 'recolte_post_recolte.mode_fermentation', v)} disabled={disabled}
              options={[
                { value: 'bache_plastique', label: 'Bache en plastique' },
                { value: 'feuilles_bananier', label: 'Feuilles de bananier' },
                { value: 'bac_fermentation', label: 'Bac de fermentation' },
                { value: 'autre', label: 'Autre' },
              ]} />
            <SelectField label="Methode de sechage" value={rpr.methode_sechage} onChange={v => updateField('step1', 'fiche3', 'recolte_post_recolte.methode_sechage', v)} disabled={disabled}
              options={[
                { value: 'goudron', label: 'Sur goudron' },
                { value: 'aire_cimentee', label: 'Sur aire cimentee' },
                { value: 'bache_plastique', label: 'Sur bache a terre' },
                { value: 'claie', label: 'Sur claie' },
                { value: 'autre', label: 'Autre' },
              ]} />
          </div>
        </SectionCard>

        <SectionCard title="Application des engrais" sectionKey="f3-engrais">
          <DynamicTable
            readOnly={disabled || readOnly}
            columns={[
              { key: 'type_engrais', label: 'Type engrais', width: '130px' },
              { key: 'nom_commercial', label: 'Nom commercial/formule', width: '150px' },
              { key: 'quantite_an', label: 'Quantite/an', width: '90px' },
              { key: 'periode_apport', label: 'Periode apport', width: '120px' },
              { key: 'mode_apport', label: 'Mode apport', type: 'select', width: '110px', options: [
                { value: 'foliaire', label: 'Foliaire' }, { value: 'au_sol', label: 'Au sol' },
              ]},
              { key: 'applicateur', label: 'Applicateur', type: 'select', width: '110px', options: [
                { value: 'producteur', label: 'Producteur' }, { value: 'applicateur', label: 'Applicateur' },
              ]},
            ]}
            rows={f.engrais || []}
            onChange={v => updateArray('step1', 'fiche3', 'engrais', v)}
            addLabel="Ajouter un engrais"
          />
        </SectionCard>

        <SectionCard title="Application de produits phytosanitaires" sectionKey="f3-phyto">
          <DynamicTable
            readOnly={disabled || readOnly}
            columns={[
              { key: 'type_produit', label: 'Type produit', width: '130px' },
              { key: 'nom_commercial', label: 'Nom commercial', width: '150px' },
              { key: 'quantite_traitement', label: 'Qte/traitement', width: '100px' },
              { key: 'periode_traitement', label: 'Periode', width: '120px' },
              { key: 'mode_apport', label: 'Mode apport', type: 'select', width: '120px', options: [
                { value: 'atomiseur', label: 'Atomiseur' }, { value: 'pulverisateur', label: 'Pulverisateur' },
              ]},
              { key: 'applicateur', label: 'Applicateur', type: 'select', width: '110px', options: [
                { value: 'producteur', label: 'Producteur' }, { value: 'applicateur', label: 'Applicateur' },
              ]},
            ]}
            rows={f.phytosanitaires || []}
            onChange={v => updateArray('step1', 'fiche3', 'phytosanitaires', v)}
            addLabel="Ajouter un produit"
          />
        </SectionCard>

        <SectionCard title="Gestion des emballages" sectionKey="f3-emballages">
          <div>
            <label className="text-xs font-medium text-[#6B7280] mb-1 block">Que faites-vous des emballages apres traitement/application ?</label>
            <textarea
              value={f.gestion_emballages || ''}
              onChange={e => updateField('step1', 'fiche3', 'gestion_emballages', e.target.value)}
              disabled={disabled || readOnly}
              className="w-full border border-[#E5E5E0] rounded-md px-3 py-2 text-sm min-h-[60px] focus:ring-1 focus:ring-[#1A3622] outline-none disabled:bg-gray-50"
            />
          </div>
        </SectionCard>
      </div>
    );
  };

  const renderFiche4 = () => {
    const f = pdc.step1?.fiche4 || {};
    const disabled = !canEditStep1;

    return (
      <div className="space-y-4" data-testid="fiche-4">
        <SectionCard title="Compte d'epargne et Financement" sectionKey="f4-epargne">
          <DynamicTable
            readOnly={disabled || readOnly}
            columns={[
              { key: 'type', label: 'Type', type: 'select', width: '120px', options: [
                { value: 'mobile_money', label: 'Mobile Money' },
                { value: 'microfinance', label: 'Microfinance' },
                { value: 'banque', label: 'Banque' },
                { value: 'autre', label: 'Autre' },
              ]},
              { key: 'a_compte', label: 'Compte ?', type: 'select', width: '80px', options: [
                { value: 'oui', label: 'Oui' }, { value: 'non', label: 'Non' },
              ]},
              { key: 'argent_compte', label: 'Argent ?', type: 'select', width: '80px', options: [
                { value: 'oui', label: 'Oui' }, { value: 'non', label: 'Non' },
              ]},
              { key: 'financement', label: 'Financement ?', type: 'select', width: '100px', options: [
                { value: 'oui', label: 'Oui' }, { value: 'non', label: 'Non' },
              ]},
              { key: 'montant_financement', label: 'Montant (FCFA)', type: 'number', width: '110px' },
            ]}
            rows={f.epargne || []}
            onChange={v => updateArray('step1', 'fiche4', 'epargne', v)}
            addLabel="Ajouter une ligne"
          />
        </SectionCard>

        <SectionCard title="Production de cacao des 3 dernieres annees" sectionKey="f4-production">
          <DynamicTable
            readOnly={disabled || readOnly}
            columns={[
              { key: 'annee', label: 'Annee', width: '100px' },
              { key: 'production_kg', label: 'Production (kg)', type: 'number', width: '120px' },
              { key: 'revenu_brut', label: 'Revenu brut (FCFA)', type: 'number', width: '130px' },
            ]}
            rows={f.production_cacao || []}
            onChange={v => updateArray('step1', 'fiche4', 'production_cacao', v)}
            addLabel="Ajouter une annee"
          />
        </SectionCard>

        <SectionCard title="Sources de revenus autres que le cacao" sectionKey="f4-revenus">
          <DynamicTable
            readOnly={disabled || readOnly}
            columns={[
              { key: 'activite', label: 'Activite', width: '150px' },
              { key: 'production_moyenne', label: 'Production moyenne/an', width: '140px' },
              { key: 'revenu_brut_moyen', label: 'Revenu brut moyen/an (FCFA)', type: 'number', width: '160px' },
            ]}
            rows={f.autres_revenus || []}
            onChange={v => updateArray('step1', 'fiche4', 'autres_revenus', v)}
            addLabel="Ajouter une activite"
          />
        </SectionCard>

        <SectionCard title="Depenses courantes du foyer" sectionKey="f4-depenses">
          <DynamicTable
            readOnly={disabled || readOnly}
            columns={[
              { key: 'depense', label: 'Depense', width: '150px' },
              { key: 'periodicite', label: 'Periodicite', type: 'select', width: '100px', options: [
                { value: 'mois', label: 'Mois' }, { value: 'annee', label: 'Annee' }, { value: 'trimestre', label: 'Trimestre' },
              ]},
              { key: 'montant_moyen_an', label: 'Montant moyen/an (FCFA)', type: 'number', width: '160px' },
            ]}
            rows={f.depenses || []}
            onChange={v => updateArray('step1', 'fiche4', 'depenses', v)}
            addLabel="Ajouter une depense"
          />
        </SectionCard>

        <SectionCard title="Cout de la main d'oeuvre" sectionKey="f4-mo">
          <DynamicTable
            readOnly={disabled || readOnly}
            columns={[
              { key: 'travailleur', label: 'Travailleur', width: '130px' },
              { key: 'statut_mo', label: 'Statut MO', type: 'select', width: '130px', options: [
                { value: 'permanente', label: 'MO permanente' },
                { value: 'occasionnelle', label: 'MO occasionnelle' },
                { value: 'familiale', label: 'Non remuneree (familiale)' },
              ]},
              { key: 'sexe', label: 'Sexe', type: 'select', width: '70px', options: [
                { value: 'M', label: 'M' }, { value: 'F', label: 'F' },
              ]},
              { key: 'cout_annuel', label: 'Cout annuel (FCFA)', type: 'number', width: '130px' },
              { key: 'temps_travail_jours', label: 'Temps travail (jours)', type: 'number', width: '130px' },
            ]}
            rows={f.main_oeuvre || []}
            onChange={v => updateArray('step1', 'fiche4', 'main_oeuvre', v)}
            addLabel="Ajouter un travailleur"
          />
        </SectionCard>
      </div>
    );
  };

  const renderFiche5 = () => {
    const f = pdc.step2?.fiche5 || {};
    const disabled = !canEditStep2;

    const defaultThemes = [
      'Peuplement du verger (densite, materiel vegetal, tiges/pieds, plages vides)',
      'Entretien du verger (gourmands, cabosses momifiees, enherbement)',
      'Etat sanitaire (pourriture brune, mirides, foreurs, loranthus, canopee)',
      'Arbres d\'ombrage (nombre, especes, strates)',
      'Etat du sol (erosion, matiere organique)',
      'Cours/sources d\'eau (presence, distance, etat)',
      'Terre/Jacheres disponibles',
      'Materiel et equipement (disponibilite, qualite)',
      'Gestion de l\'exploitation (technicite, comptabilite)',
      'Autres cultures/activites',
    ];

    const analyses = f.analyses && f.analyses.length > 0 ? f.analyses : defaultThemes.map(t => ({ theme: t, problemes: '', causes: '', consequences: '', solutions: '' }));

    return (
      <div className="space-y-4" data-testid="fiche-5">
        <SectionCard title="Analyse des problemes" sectionKey="f5-analyse">
          <p className="text-xs text-[#6B7280] mb-3">Pour chaque theme, identifiez les problemes, causes, consequences et solutions proposees.</p>
          <DynamicTable
            readOnly={disabled || readOnly}
            columns={[
              { key: 'theme', label: 'Theme d\'analyse', width: '220px' },
              { key: 'problemes', label: 'Problemes/Contraintes', width: '180px' },
              { key: 'causes', label: 'Causes', width: '180px' },
              { key: 'consequences', label: 'Consequences', width: '180px' },
              { key: 'solutions', label: 'Solutions', width: '180px' },
            ]}
            rows={analyses}
            onChange={v => updateArray('step2', 'fiche5', 'analyses', v)}
            addLabel="Ajouter un theme"
          />
        </SectionCard>
      </div>
    );
  };

  const renderFiche6 = () => {
    const f = pdc.step3?.fiche6 || {};
    const disabled = !canEditStep3;

    return (
      <div className="space-y-4" data-testid="fiche-6">
        <SectionCard title="Matrice de planification strategique" sectionKey="f6-matrice">
          <p className="text-xs text-[#6B7280] mb-3">Definissez les axes strategiques, objectifs et activites du PDC sur 5 ans.</p>
          <DynamicTable
            readOnly={disabled || readOnly}
            columns={[
              { key: 'axe', label: 'Axe strategique', width: '160px' },
              { key: 'objectifs', label: 'Objectifs', width: '160px' },
              { key: 'activites', label: 'Activites', width: '160px' },
              { key: 'cout', label: 'Cout (FCFA)', type: 'number', width: '100px' },
              { key: 'a1', label: 'A1', type: 'select', width: '60px', options: [{ value: 'x', label: 'X' }] },
              { key: 'a2', label: 'A2', type: 'select', width: '60px', options: [{ value: 'x', label: 'X' }] },
              { key: 'a3', label: 'A3', type: 'select', width: '60px', options: [{ value: 'x', label: 'X' }] },
              { key: 'a4', label: 'A4', type: 'select', width: '60px', options: [{ value: 'x', label: 'X' }] },
              { key: 'a5', label: 'A5', type: 'select', width: '60px', options: [{ value: 'x', label: 'X' }] },
              { key: 'responsable', label: 'Responsable', width: '120px' },
              { key: 'partenaires', label: 'Partenaires', width: '120px' },
            ]}
            rows={f.axes || []}
            onChange={v => updateArray('step3', 'fiche6', 'axes', v)}
            addLabel="Ajouter un axe/activite"
          />
        </SectionCard>
      </div>
    );
  };

  const renderFiche7 = () => {
    const f = pdc.step3?.fiche7 || {};
    const disabled = !canEditStep3;

    return (
      <div className="space-y-4" data-testid="fiche-7">
        <SectionCard title="Matrice du programme annuel d'action" sectionKey="f7-programme">
          <p className="text-xs text-[#6B7280] mb-3">Programme annuel detaille avec activites, indicateurs et chronogramme trimestriel.</p>
          <DynamicTable
            readOnly={disabled || readOnly}
            columns={[
              { key: 'axe', label: 'Axe strategique', width: '150px' },
              { key: 'activites', label: 'Activites/Sous-activites', width: '180px' },
              { key: 'indicateurs', label: 'Indicateurs', width: '150px' },
              { key: 't1', label: 'T1', type: 'select', width: '55px', options: [{ value: 'x', label: 'X' }] },
              { key: 't2', label: 'T2', type: 'select', width: '55px', options: [{ value: 'x', label: 'X' }] },
              { key: 't3', label: 'T3', type: 'select', width: '55px', options: [{ value: 'x', label: 'X' }] },
              { key: 't4', label: 'T4', type: 'select', width: '55px', options: [{ value: 'x', label: 'X' }] },
              { key: 'responsable', label: 'Responsable', width: '120px' },
              { key: 'cout', label: 'Cout (FCFA)', type: 'number', width: '100px' },
            ]}
            rows={f.actions || []}
            onChange={v => updateArray('step3', 'fiche7', 'actions', v)}
            addLabel="Ajouter une action"
          />
        </SectionCard>
      </div>
    );
  };

  const renderFiche8 = () => {
    const f = pdc.step3?.fiche8 || {};
    const disabled = !canEditStep3;

    return (
      <div className="space-y-4" data-testid="fiche-8">
        <SectionCard title="Tableau de determination des moyens et des couts" sectionKey="f8-moyens">
          <p className="text-xs text-[#6B7280] mb-3">Estimez les moyens (investissement, intrants, main d'oeuvre) et couts sur 5 ans.</p>
          <DynamicTable
            readOnly={disabled || readOnly}
            columns={[
              { key: 'moyen', label: 'Moyens specifiques', width: '150px' },
              { key: 'unite', label: 'Unites', width: '80px' },
              { key: 'a1_qte', label: 'An1 Qte', type: 'number', width: '70px' },
              { key: 'a1_cout', label: 'An1 Cout', type: 'number', width: '80px' },
              { key: 'a2_qte', label: 'An2 Qte', type: 'number', width: '70px' },
              { key: 'a2_cout', label: 'An2 Cout', type: 'number', width: '80px' },
              { key: 'a3_qte', label: 'An3 Qte', type: 'number', width: '70px' },
              { key: 'a3_cout', label: 'An3 Cout', type: 'number', width: '80px' },
              { key: 'a4_qte', label: 'An4 Qte', type: 'number', width: '70px' },
              { key: 'a4_cout', label: 'An4 Cout', type: 'number', width: '80px' },
              { key: 'a5_qte', label: 'An5 Qte', type: 'number', width: '70px' },
              { key: 'a5_cout', label: 'An5 Cout', type: 'number', width: '80px' },
            ]}
            rows={f.moyens || []}
            onChange={v => updateArray('step3', 'fiche8', 'moyens', v)}
            addLabel="Ajouter un moyen"
          />
        </SectionCard>
      </div>
    );
  };

  const ficheRenderers = {
    1: [renderFiche1, renderFiche2, renderFiche3, renderFiche4],
    2: [renderFiche5],
    3: [renderFiche6, renderFiche7, renderFiche8],
  };

  const currentFicheRenderer = ficheRenderers[activeStep]?.[activeFiche];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-5" data-testid="pdc-stepper-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/cooperative/pdc-v2')} className="text-[#6B7280] hover:text-[#1A3622]" data-testid="pdc-stepper-back">
            <ArrowLeft className="w-4 h-4 mr-1" /> Retour
          </Button>
          <div>
            <h1 className="text-lg font-bold text-[#1A3622]">PDC - {pdc.farmer_name || 'Planteur'}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge className={
                pdc.statut === 'valide' ? 'bg-[#E8F0EA] text-[#1A3622]' :
                pdc.statut.includes('etape3') ? 'bg-purple-50 text-purple-700' :
                pdc.statut.includes('etape2') ? 'bg-amber-50 text-amber-700' :
                'bg-blue-50 text-blue-700'
              }>
                {pdc.statut === 'valide' ? 'Valide' : `Etape ${pdc.current_step}`}
              </Badge>
              {pdc.statut === 'valide' && <CheckCircle2 className="w-4 h-4 text-[#1A3622]" />}
            </div>
          </div>
        </div>
      </div>

      {/* Stepper */}
      <div className="bg-white border border-[#E5E5E0] rounded-md p-4" data-testid="pdc-stepper">
        <div className="flex items-center justify-between">
          {STEPS.map((step, idx) => {
            const isActive = activeStep === step.num;
            const isComplete = pdc.current_step > step.num || pdc.statut === 'valide';
            const isLocked = step.num > pdc.current_step && pdc.statut !== 'valide';
            return (
              <React.Fragment key={step.num}>
                {idx > 0 && (
                  <div className={`flex-1 h-0.5 mx-2 ${isComplete ? 'bg-[#1A3622]' : 'bg-[#E5E5E0]'}`} />
                )}
                <button
                  onClick={() => { if (!isLocked) { setActiveStep(step.num); setActiveFiche(0); } }}
                  disabled={isLocked}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-left ${
                    isActive ? 'bg-[#1A3622] text-white' :
                    isComplete ? 'bg-[#E8F0EA] text-[#1A3622]' :
                    isLocked ? 'bg-gray-50 text-[#6B7280] cursor-not-allowed' :
                    'bg-white text-[#374151] hover:bg-[#FAF9F6]'
                  }`}
                  data-testid={`step-btn-${step.num}`}
                >
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    isActive ? 'bg-white text-[#1A3622]' :
                    isComplete ? 'bg-[#1A3622] text-white' :
                    'bg-[#E5E5E0] text-[#6B7280]'
                  }`}>
                    {isComplete && !isActive ? <CheckCircle2 className="w-4 h-4" /> : step.num}
                  </span>
                  <div className="hidden md:block min-w-0">
                    <p className="text-xs font-semibold truncate">{step.title}</p>
                    <p className={`text-[10px] truncate ${isActive ? 'text-white/70' : 'text-[#6B7280]'}`}>{step.subtitle}</p>
                  </div>
                  {isLocked && <Lock className="w-3.5 h-3.5 ml-1 flex-shrink-0" />}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Fiche Tabs */}
      <div className="flex items-center gap-1 border-b border-[#E5E5E0] pb-0" data-testid="fiche-tabs">
        {ficheNames.map((name, idx) => (
          <button
            key={name}
            onClick={() => setActiveFiche(idx)}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeFiche === idx
                ? 'border-[#1A3622] text-[#1A3622]'
                : 'border-transparent text-[#6B7280] hover:text-[#374151]'
            }`}
            data-testid={`fiche-tab-${idx}`}
          >
            {name}
          </button>
        ))}
      </div>

      {/* Fiche Content */}
      <div className="min-h-[300px]" data-testid="fiche-content">
        {currentFicheRenderer ? currentFicheRenderer() : <p className="text-[#6B7280] text-sm">Fiche non disponible</p>}
      </div>

      {/* Actions */}
      {!readOnly && (
        <div className="flex items-center justify-between bg-white border border-[#E5E5E0] rounded-md px-4 py-3" data-testid="pdc-actions">
          <div className="flex gap-2">
            {currentCanEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => saveStep(activeStep)}
                disabled={saving}
                className="border-[#1A3622] text-[#1A3622] hover:bg-[#E8F0EA]"
                data-testid="pdc-save-btn"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                Sauvegarder
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {activeStep < 3 && currentCanEdit && (
              <Button
                size="sm"
                onClick={() => submitStep(activeStep)}
                disabled={saving}
                className="bg-[#1A3622] hover:bg-[#112417] text-white"
                data-testid="pdc-submit-step-btn"
              >
                Soumettre Etape {activeStep} <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            )}
            {activeStep === 3 && canValidate && (
              <Button
                size="sm"
                onClick={validatePdc}
                disabled={saving}
                className="bg-[#1A3622] hover:bg-[#112417] text-white"
                data-testid="pdc-validate-btn"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                Valider le PDC
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Validation banner */}
      {pdc.statut === 'valide' && (
        <div className="bg-[#E8F0EA] border border-[#1A3622]/20 rounded-md p-4 flex items-center gap-3" data-testid="pdc-validated-banner">
          <CheckCircle2 className="w-5 h-5 text-[#1A3622] flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-[#1A3622]">PDC Valide</p>
            <p className="text-xs text-[#374151]">
              Valide par {pdc.validated_by_name || 'l\'agronome'} le {pdc.validated_at ? new Date(pdc.validated_at).toLocaleDateString('fr-FR') : '-'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PDCStepperPage;

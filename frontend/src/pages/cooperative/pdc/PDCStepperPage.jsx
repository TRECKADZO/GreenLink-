import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { tokenService } from '../../../services/tokenService';
import { useAuth } from '../../../context/AuthContext';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { toast } from 'sonner';
import DynamicTable from './DynamicTable';
import ParcelMapGarmin from './ParcelMapGarmin';
import { getRegions, getDepartements, getSousPrefectures, findRegionByDepartement } from '../../../data/coteIvoireGeo';
import {
  ArrowLeft, ArrowRight, Save, CheckCircle2, Loader2,
  ClipboardList, Search as SearchIcon, Calendar, Lock,
  FileText, ChevronDown, ChevronUp, Download, Eye, Info, Leaf
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

  // Step 1 is read-only for cooperative once agent has submitted (current_step >= 2)
  const step1SubmittedByAgent = (pdc?.current_step || 1) >= 2;
  const canEditStep1 = !readOnly && (isAgent || (isCoopOrAdmin && !step1SubmittedByAgent));
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

  const downloadPdf = async () => {
    try {
      toast.info('Generation du PDF en cours...');
      const res = await fetch(`${API_URL}/api/pdc-v2/pdf/${id}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Erreur lors de la generation du PDF');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PDC_${pdc?.farmer_name || 'planteur'}_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('PDF telecharge');
    } catch (e) {
      toast.error(e.message || 'Erreur telechargement');
    }
  };

  // Champs auto-propages de Fiche 1 producteur -> Fiche 2 coordonnees_gps
  const PROPAGATION_MAP = {
    'producteur.sous_prefecture': 'coordonnees_gps.sous_prefecture',
    'producteur.village': 'coordonnees_gps.village',
    'producteur.campement': 'coordonnees_gps.campement',
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

      // Auto-propagation: Fiche 1 -> Fiche 2
      if (ficheKey === 'fiche1' && PROPAGATION_MAP[path]) {
        const targetPath = PROPAGATION_MAP[path];
        const fiche2 = { ...step.fiche2 };
        const targetKeys = targetPath.split('.');
        let tObj = fiche2;
        for (let i = 0; i < targetKeys.length - 1; i++) {
          tObj[targetKeys[i]] = { ...tObj[targetKeys[i]] };
          tObj = tObj[targetKeys[i]];
        }
        tObj[targetKeys[targetKeys.length - 1]] = value;
        step.fiche2 = fiche2;
      }

      // Cascade geo: si region change -> reset departement + sous-prefecture
      if (ficheKey === 'fiche1' && path === 'producteur.delegation_regionale') {
        const prod = { ...step.fiche1.producteur };
        prod.departement = '';
        prod.sous_prefecture = '';
        step.fiche1 = { ...step.fiche1, producteur: prod };
        // Reset aussi Fiche 2
        const f2 = { ...step.fiche2 };
        const gps = { ...f2.coordonnees_gps };
        gps.sous_prefecture = '';
        f2.coordonnees_gps = gps;
        step.fiche2 = f2;
      }
      if (ficheKey === 'fiche1' && path === 'producteur.departement') {
        const prod = { ...step.fiche1.producteur };
        prod.sous_prefecture = '';
        step.fiche1 = { ...step.fiche1, producteur: prod };
        // Reset aussi Fiche 2
        const f2 = { ...step.fiche2 };
        const gps = { ...f2.coordonnees_gps };
        gps.sous_prefecture = '';
        f2.coordonnees_gps = gps;
        step.fiche2 = f2;
      }

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

  const SelectField = ({ label, value, onChange, options, disabled = false, placeholder = '--' }) => (
    <div>
      <label className="text-xs font-medium text-[#6B7280] mb-1 block">{label}</label>
      <select
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        disabled={disabled || readOnly}
        className="w-full border border-[#E5E5E0] rounded-md px-3 py-1.5 text-sm bg-white focus:ring-1 focus:ring-[#1A3622] outline-none disabled:bg-gray-50"
      >
        <option value="">{placeholder}</option>
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
            <SelectField label="Region / Delegation Regionale" value={prod.delegation_regionale} onChange={v => updateField('step1', 'fiche1', 'producteur.delegation_regionale', v)} disabled={disabled}
              options={getRegions().map(r => ({ value: r, label: r }))} placeholder="-- Selectionnez la region --" />
            <FormField label="Code cooperative" value={prod.code_cooperative} onChange={v => updateField('step1', 'fiche1', 'producteur.code_cooperative', v)} disabled={disabled} />
            <SelectField label="Departement" value={prod.departement} onChange={v => updateField('step1', 'fiche1', 'producteur.departement', v)} disabled={disabled || !prod.delegation_regionale}
              options={getDepartements(prod.delegation_regionale).map(d => ({ value: d, label: d }))} placeholder={prod.delegation_regionale ? '-- Selectionnez --' : '-- Region d\'abord --'} />
            <SelectField label="Sous-Prefecture" value={prod.sous_prefecture} onChange={v => updateField('step1', 'fiche1', 'producteur.sous_prefecture', v)} disabled={disabled || !prod.departement}
              options={getSousPrefectures(prod.delegation_regionale, prod.departement).map(s => ({ value: s, label: s }))} placeholder={prod.departement ? '-- Selectionnez --' : '-- Departement d\'abord --'} />
            <FormField label="Village" value={prod.village} onChange={v => updateField('step1', 'fiche1', 'producteur.village', v)} disabled={disabled} />
            <FormField label="Campement" value={prod.campement} onChange={v => updateField('step1', 'fiche1', 'producteur.campement', v)} disabled={disabled} />
          </div>
          {prod.delegation_regionale && prod.departement && prod.sous_prefecture && (
            <div className="mt-2 bg-[#E8F0EA] border border-[#1A3622]/20 rounded-md px-3 py-2 text-xs text-[#1A3622]" data-testid="geo-auto-propagate-info">
              <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
              Sous-prefecture, village et campement seront auto-remplis dans la Fiche 2
            </div>
          )}
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
            <SelectField label="Sous-prefecture" value={gps.sous_prefecture} onChange={v => updateField('step1', 'fiche2', 'coordonnees_gps.sous_prefecture', v)} disabled={disabled}
              options={getSousPrefectures(
                pdc.step1?.fiche1?.producteur?.delegation_regionale,
                pdc.step1?.fiche1?.producteur?.departement
              ).map(s => ({ value: s, label: s }))}
              placeholder={gps.sous_prefecture || '-- Selectionnez --'} />
            <FormField label="Village" value={gps.village} onChange={v => updateField('step1', 'fiche2', 'coordonnees_gps.village', v)} disabled={disabled} />
            <FormField label="Campement" value={gps.campement} onChange={v => updateField('step1', 'fiche2', 'coordonnees_gps.campement', v)} disabled={disabled} />
          </div>
          {(gps.sous_prefecture || gps.village) && (
            <div className="mt-2 text-[10px] text-[#6B7280]" data-testid="fiche2-geo-info">
              Auto-rempli depuis Fiche 1 — modifiable si necessaire
            </div>
          )}
        </SectionCard>

        <SectionCard title="Croquis / Polygone de la parcelle + Arbres d'ombrage" sectionKey="f2-carte">
          <ParcelMapGarmin
            data={f.carte_parcelle || {}}
            onChange={v => updateField('step1', 'fiche2', 'carte_parcelle', v)}
            readOnly={disabled || readOnly}
            producerInfo={{
              nom: pdc.step1?.fiche1?.producteur?.nom || pdc.farmer_name || '',
              village: gps.village || pdc.step1?.fiche1?.producteur?.village || '',
            }}
          />
        </SectionCard>

        <SectionCard title="Donnees sur les cultures" sectionKey="f2-cultures">
          <p className="text-xs text-[#6B7280] mb-2">Les libelles en gras sont pre-remplis selon le document officiel.</p>
          {(() => {
            const defaultCultures = [
              { libelle: '** CACAO **', annee_creation: '', precedent_cultural: '', superficie_ha: '', origine_materiel: '', en_production: '' },
              { libelle: 'Champs 1', annee_creation: '', precedent_cultural: '', superficie_ha: '', origine_materiel: '', en_production: '' },
              { libelle: 'Champs 2', annee_creation: '', precedent_cultural: '', superficie_ha: '', origine_materiel: '', en_production: '' },
              { libelle: '** AUTRES CULTURES **', annee_creation: '', precedent_cultural: '', superficie_ha: '', origine_materiel: '', en_production: '' },
              { libelle: '', annee_creation: '', precedent_cultural: '', superficie_ha: '', origine_materiel: '', en_production: '' },
              { libelle: '** TERRES NON EXPLOITEES **', annee_creation: '', precedent_cultural: '', superficie_ha: '', origine_materiel: '', en_production: '' },
              { libelle: 'Jacheres', annee_creation: '', precedent_cultural: '', superficie_ha: '', origine_materiel: '', en_production: '' },
              { libelle: 'Forets', annee_creation: '', precedent_cultural: '', superficie_ha: '', origine_materiel: '', en_production: '' },
            ];
            const cultures = f.cultures && f.cultures.length > 0 ? f.cultures : defaultCultures;
            return (
              <DynamicTable
                readOnly={disabled || readOnly}
                columns={[
                  { key: 'libelle', label: 'Libelle', width: '170px' },
                  { key: 'annee_creation', label: 'Annee de creation', type: 'number', width: '110px' },
                  { key: 'precedent_cultural', label: 'Precedent cultural', width: '130px' },
                  { key: 'superficie_ha', label: 'Sup. (ha)', type: 'number', width: '85px' },
                  { key: 'origine_materiel', label: 'Origine materiel vegetal', width: '150px' },
                  { key: 'en_production', label: 'En production (Oui/Non)', type: 'select', width: '120px', options: [
                    { value: 'oui', label: 'Oui' }, { value: 'non', label: 'Non' },
                  ]},
                ]}
                rows={cultures}
                onChange={v => updateArray('step1', 'fiche2', 'cultures', v)}
                addLabel="Ajouter une ligne"
              />
            );
          })()}
        </SectionCard>

        <SectionCard title="Materiels agricoles / Equipements de travail" sectionKey="f2-materiels">
          <p className="text-xs text-[#6B7280] mb-2">Inventaire conforme au document officiel. Ajoutez des lignes si necessaire.</p>
          {(() => {
            const defaultMateriels = [
              { type: 'traitement', designation: 'Pulverisateur', quantite: '', annee_acquisition: '', cout: '', etat_bon: '', etat_acceptable: '', etat_mauvais: '' },
              { type: 'traitement', designation: 'Atomiseur', quantite: '', annee_acquisition: '', cout: '', etat_bon: '', etat_acceptable: '', etat_mauvais: '' },
              { type: 'traitement', designation: 'EPI', quantite: '', annee_acquisition: '', cout: '', etat_bon: '', etat_acceptable: '', etat_mauvais: '' },
              { type: 'transport', designation: 'Tricycle', quantite: '', annee_acquisition: '', cout: '', etat_bon: '', etat_acceptable: '', etat_mauvais: '' },
              { type: 'transport', designation: 'Brouette', quantite: '', annee_acquisition: '', cout: '', etat_bon: '', etat_acceptable: '', etat_mauvais: '' },
              { type: 'transport', designation: 'Camion/camionnette', quantite: '', annee_acquisition: '', cout: '', etat_bon: '', etat_acceptable: '', etat_mauvais: '' },
              { type: 'deplacement', designation: 'Velo', quantite: '', annee_acquisition: '', cout: '', etat_bon: '', etat_acceptable: '', etat_mauvais: '' },
              { type: 'deplacement', designation: 'Moto', quantite: '', annee_acquisition: '', cout: '', etat_bon: '', etat_acceptable: '', etat_mauvais: '' },
              { type: 'deplacement', designation: 'Voiture', quantite: '', annee_acquisition: '', cout: '', etat_bon: '', etat_acceptable: '', etat_mauvais: '' },
              { type: 'sechage', designation: 'Claie/seco', quantite: '', annee_acquisition: '', cout: '', etat_bon: '', etat_acceptable: '', etat_mauvais: '' },
              { type: 'sechage', designation: 'Aire cimentee', quantite: '', annee_acquisition: '', cout: '', etat_bon: '', etat_acceptable: '', etat_mauvais: '' },
              { type: 'sechage', designation: 'Sechoir solaire', quantite: '', annee_acquisition: '', cout: '', etat_bon: '', etat_acceptable: '', etat_mauvais: '' },
              { type: 'fermentation', designation: 'Bac de fermentation', quantite: '', annee_acquisition: '', cout: '', etat_bon: '', etat_acceptable: '', etat_mauvais: '' },
              { type: 'outillage', designation: 'Machette, emondoir', quantite: '', annee_acquisition: '', cout: '', etat_bon: '', etat_acceptable: '', etat_mauvais: '' },
              { type: 'outillage', designation: 'Materiel de recolte', quantite: '', annee_acquisition: '', cout: '', etat_bon: '', etat_acceptable: '', etat_mauvais: '' },
              { type: 'outillage', designation: 'Tronconneuse', quantite: '', annee_acquisition: '', cout: '', etat_bon: '', etat_acceptable: '', etat_mauvais: '' },
            ];
            const materiels = f.materiels && f.materiels.length > 0 ? f.materiels : defaultMateriels;
            return (
              <DynamicTable
                readOnly={disabled || readOnly}
                columns={[
                  { key: 'type', label: 'Type', type: 'select', width: '140px', options: [
                    { value: 'traitement', label: 'Mat. traitement' },
                    { value: 'transport', label: 'Mat. transport' },
                    { value: 'deplacement', label: 'Moy. deplacement' },
                    { value: 'sechage', label: 'Mat. sechage' },
                    { value: 'fermentation', label: 'Mat. fermentation' },
                    { value: 'outillage', label: 'Petit outillage' },
                    { value: 'autre', label: 'Autres' },
                  ]},
                  { key: 'designation', label: 'Designation', width: '150px' },
                  { key: 'quantite', label: 'Qte', type: 'number', width: '60px' },
                  { key: 'annee_acquisition', label: 'Annee acq.', type: 'number', width: '85px' },
                  { key: 'cout', label: 'Cout (FCFA)', type: 'number', width: '100px' },
                  { key: 'etat_bon', label: 'Bon', type: 'number', width: '55px' },
                  { key: 'etat_acceptable', label: 'Accept.', type: 'number', width: '60px' },
                  { key: 'etat_mauvais', label: 'Mauvais', type: 'number', width: '65px' },
                ]}
                rows={materiels}
                onChange={v => updateArray('step1', 'fiche2', 'materiels', v)}
                addLabel="Ajouter un materiel"
              />
            );
          })()}
        </SectionCard>

        <SectionCard title="Diagnostic des arbres forestiers et fruitiers autres que le cacaoyer sur l'exploitation" sectionKey="f2-arbres">
          <DynamicTable
            readOnly={disabled || readOnly}
            columns={[
              { key: 'numero', label: 'N° arbre', type: 'number', width: '60px' },
              { key: 'nom_botanique', label: 'Nom botanique', width: '130px' },
              { key: 'nom_local', label: 'Nom local', width: '110px' },
              { key: 'circonference', label: 'Circonference (a hauteur de poitrine)', type: 'number', width: '120px' },
              { key: 'latitude', label: 'GPS Latitude', width: '95px' },
              { key: 'longitude', label: 'GPS Longitude', width: '95px' },
              { key: 'origine', label: 'Origine', type: 'select', width: '90px', options: [
                { value: 'preserve', label: 'Preserve' }, { value: 'plante', label: 'Plante' },
              ]},
              { key: 'organe_utilise', label: 'Organe utilise', width: '100px' },
              { key: 'utilite', label: 'Utilite', width: '90px' },
              { key: 'decision', label: 'Decision', type: 'select', width: '100px', options: [
                { value: 'eliminer', label: 'A eliminer' }, { value: 'maintenir', label: 'A maintenir' },
              ]},
              { key: 'raisons', label: 'Raisons / Observations', width: '130px' },
            ]}
            rows={f.arbres || []}
            onChange={v => updateArray('step1', 'fiche2', 'arbres', v)}
            addLabel="Ajouter un arbre"
          />
        </SectionCard>
      </div>
    );
  };

  // Compute shade score client-side (for offline + real-time)
  const computeShadeScore = () => {
    if (!pdc) return null;
    const f2 = pdc.step1?.fiche2 || {};
    const f3 = pdc.step1?.fiche3 || {};
    const arbres = f2.arbres || [];
    const arbresCarte = (f2.carte_parcelle || {}).arbres_ombrage || [];
    const cultures = f2.cultures || [];
    const etatCac = f3.etat_cacaoyere || {};

    const totalArbres = arbres.length + arbresCarte.length;
    let superficie = 0;
    cultures.forEach(c => { superficie += parseFloat(c.superficie_ha || 0) || 0; });
    if (superficie <= 0) superficie = 1;

    // Count species
    const especes = new Set();
    arbres.forEach(a => {
      const nom = (a.nom_botanique || a.nom_local || '').trim().toLowerCase();
      if (nom && nom !== '-') especes.add(nom);
    });
    arbresCarte.forEach(a => {
      const nom = (a.nom || a.espece || '').trim().toLowerCase();
      if (nom && nom !== '-' && nom !== 'arbre') especes.add(nom);
    });

    // Strate breakdown
    let s1 = 0, s2 = 0, s3 = 0;
    arbres.forEach(a => {
      const circ = parseFloat(a.circonference || 0) || 0;
      if (circ >= 200) s3++;
      else if (circ >= 50) s2++;
      else s1++;
    });
    arbresCarte.forEach(() => s1++); // GPS trees default strate 1

    const densite = totalArbres / superficie;
    const nbEspeces = especes.size;
    const hasS3 = s3 > 0;
    const evalAgent = (etatCac.ombrage || '').toLowerCase();

    // Score density (40 pts)
    let densScore = 0;
    if (densite >= 25 && densite <= 40) densScore = 40;
    else if (densite > 40) densScore = Math.max(25, 40 - (densite - 40) * 0.5);
    else if (densite >= 18) densScore = 30;
    else if (densite >= 12) densScore = 20;
    else if (densite >= 5) densScore = 10;
    else if (densite > 0) densScore = 5;

    // Score diversity (30 pts)
    let divScore = 0;
    if (nbEspeces >= 5) divScore = 30;
    else if (nbEspeces >= 3) divScore = 25;
    else if (nbEspeces === 2) divScore = 15;
    else if (nbEspeces === 1) divScore = 5;

    // Score strates (30 pts)
    let strScore = 0;
    if (hasS3) strScore += 15;
    if (evalAgent === 'dense') strScore += 15;
    else if (evalAgent === 'moyen') strScore += 10;
    else if (!evalAgent) strScore += 5;

    const total = Math.min(100, Math.max(0, Math.round(densScore + divScore + strScore)));
    const conforme = densite >= 25 && densite <= 40 && nbEspeces >= 3 && hasS3;

    return {
      score: total, conforme, densite: Math.round(densite * 10) / 10,
      nbEspeces, hasS3, evalAgent,
      densScore: Math.round(densScore), divScore: Math.round(divScore), strScore: Math.round(strScore),
      totalArbres, superficie,
      bonusPrime: Math.round(Math.min(total / 100, 1) * 5000 * superficie),
    };
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
              options={[{ value: 'en_lignes', label: '1. En lignes' }, { value: 'en_desordre', label: '2. En desordre' }]} />
            <SelectField label="Plages vides dans le champ" value={etat.plages_vides} onChange={v => updateField('step1', 'fiche3', 'etat_cacaoyere.plages_vides', v)} disabled={disabled}
              options={[{ value: 'peu', label: '1. Peu (<=5)' }, { value: 'beaucoup', label: '2. Beaucoup (>5)' }]} />
            <SelectField label="Etendue plages vides (GPS)" value={etat.etendue_plages_vides} onChange={v => updateField('step1', 'fiche3', 'etat_cacaoyere.etendue_plages_vides', v)} disabled={disabled}
              options={[{ value: 'grande', label: '1. Grande' }, { value: 'petite', label: '2. Petite' }]} />
            <SelectField label="Ombrage des arbres (autre que cacaoyer)" value={etat.ombrage} onChange={v => updateField('step1', 'fiche3', 'etat_cacaoyere.ombrage', v)} disabled={disabled}
              options={[{ value: 'faible', label: '1. Faible' }, { value: 'moyen', label: '2. Moyen' }, { value: 'dense', label: '3. Dense' }]} />
            <SelectField label="Presentation canopee/couronne" value={etat.canopee} onChange={v => updateField('step1', 'fiche3', 'etat_cacaoyere.canopee', v)} disabled={disabled}
              options={[{ value: 'normal', label: '1. Normal' }, { value: 'dense', label: '2. Dense' }, { value: 'peu_degrade', label: '3. Peu degrade' }, { value: 'degrade', label: '4. Degrade' }]} />
          </div>
        </SectionCard>

        {/* Grille de comptage - Carres 10m x 10m - CONFORME DOCUMENT OFFICIEL */}
        <SectionCard title="Comptage des cacaoyers - Densite" sectionKey="f3-carres">
          <p className="text-xs text-[#6B7280] mb-2">Comptez le nombre de tiges pour chaque cacaoyer dans 4 carres de 10m x 10m.</p>
          {(() => {
            const carres = f.carres_comptage || Array.from({ length: 16 }, (_, i) => ({ numero: i + 1, carre1: '', carre2: '', carre3: '', carre4: '' }));
            return (
              <DynamicTable
                readOnly={disabled || readOnly}
                columns={[
                  { key: 'numero', label: 'N° cacaoyer', type: 'number', width: '90px' },
                  { key: 'carre1', label: 'Carre 1 (10m x 10m) - Nombre de tiges', type: 'number', width: '150px' },
                  { key: 'carre2', label: 'Carre 2 (10m x 10m) - Nombre de tiges', type: 'number', width: '150px' },
                  { key: 'carre3', label: 'Carre 3 (10m x 10m) - Nombre de tiges', type: 'number', width: '150px' },
                  { key: 'carre4', label: 'Carre 4 (10m x 10m) - Nombre de tiges', type: 'number', width: '150px' },
                ]}
                rows={carres}
                onChange={v => updateArray('step1', 'fiche3', 'carres_comptage', v)}
                addLabel="Ajouter une ligne"
              />
            );
          })()}
        </SectionCard>

        {/* Score Ombrage ARS 1000 — temps reel */}
        {(() => {
          const shade = computeShadeScore();
          if (!shade || shade.totalArbres === 0) return null;
          const scoreColor = shade.score >= 70 ? 'text-emerald-700' : shade.score >= 40 ? 'text-amber-700' : 'text-red-700';
          const scoreBg = shade.score >= 70 ? 'bg-emerald-50 border-emerald-200' : shade.score >= 40 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200';
          return (
            <div className={`border rounded-lg p-4 space-y-3 ${scoreBg}`} data-testid="shade-score-panel">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm text-gray-800 flex items-center gap-2">
                  <Leaf className="h-4 w-4 text-emerald-600" />
                  Score Ombrage ARS 1000
                </h4>
                <span className={`text-2xl font-bold ${scoreColor}`}>{shade.score}/100</span>
              </div>

              <div className="flex items-center gap-2">
                {shade.conforme ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium" data-testid="shade-conforme-badge">
                    <CheckCircle2 className="w-3 h-3" /> Conforme ARS 1000
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium" data-testid="shade-non-conforme-badge">
                    <Info className="w-3 h-3" /> Non conforme ARS 1000
                  </span>
                )}
              </div>

              {/* Progress bars for each criterion */}
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-xs text-gray-600 mb-0.5">
                    <span>Densite ({shade.densite} arbres/ha)</span>
                    <span className="font-medium">{shade.densScore}/40</span>
                  </div>
                  <div className="h-2 bg-white/60 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${shade.densScore >= 30 ? 'bg-emerald-500' : shade.densScore >= 15 ? 'bg-amber-500' : 'bg-red-400'}`} style={{ width: `${(shade.densScore / 40) * 100}%` }} />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">Optimal : 25-40 arbres/ha</p>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-gray-600 mb-0.5">
                    <span>Diversite ({shade.nbEspeces} espece{shade.nbEspeces > 1 ? 's' : ''})</span>
                    <span className="font-medium">{shade.divScore}/30</span>
                  </div>
                  <div className="h-2 bg-white/60 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${shade.divScore >= 20 ? 'bg-emerald-500' : shade.divScore >= 10 ? 'bg-amber-500' : 'bg-red-400'}`} style={{ width: `${(shade.divScore / 30) * 100}%` }} />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">Minimum 3 especes differentes</p>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-gray-600 mb-0.5">
                    <span>Strates {shade.hasS3 ? '(Strate 3 presente)' : '(Pas de strate 3)'}</span>
                    <span className="font-medium">{shade.strScore}/30</span>
                  </div>
                  <div className="h-2 bg-white/60 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${shade.strScore >= 20 ? 'bg-emerald-500' : shade.strScore >= 10 ? 'bg-amber-500' : 'bg-red-400'}`} style={{ width: `${(shade.strScore / 30) * 100}%` }} />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">Min 1 arbre strate 3 (&gt;30m) + evaluation agent</p>
                </div>
              </div>

              {shade.bonusPrime > 0 && (
                <div className="bg-white/70 rounded-md p-2 border border-emerald-200 mt-2" data-testid="shade-prime-impact">
                  <p className="text-xs font-medium text-emerald-800">
                    + {shade.bonusPrime.toLocaleString('fr-FR')} FCFA de prime carbone estimee grace a l'ombrage
                  </p>
                  <p className="text-[10px] text-emerald-600 mt-0.5">
                    Densite {shade.densite} arbres/ha, {shade.nbEspeces} espece{shade.nbEspeces > 1 ? 's' : ''}{shade.hasS3 ? ', strate 3 presente' : ''}
                  </p>
                </div>
              )}
            </div>
          );
        })()}

        <SectionCard title="Maladies / Ravageurs et Parametres phytosanitaires" sectionKey="f3-maladies">
          <p className="text-xs text-[#6B7280] mb-2">Tableau conforme au document officiel. Evaluez la severite de chaque maladie et parametre.</p>
          {(() => {
            const severiteOpts = [
              { value: '1', label: '1. Aucun' }, { value: '2', label: '2. Faible' },
              { value: '3', label: '3. Moyen' }, { value: '4', label: '4. Fort' },
            ];
            const defaultMaladies = [
              { maladie: 'Attaques de mirides', severite: '', obs_maladie: '', parametre: 'Presence de gourmands', valeur: '', obs_parametre: '' },
              { maladie: 'Attaques de Pourriture Brune', severite: '', obs_maladie: '', parametre: 'Presence de cabosses momifiees', valeur: '', obs_parametre: '' },
              { maladie: 'Attaques de punaises', severite: '', obs_maladie: '', parametre: 'Presence de plantes epiphytes', valeur: '', obs_parametre: '' },
              { maladie: 'Attaque CSSVD', severite: '', obs_maladie: '', parametre: 'Enherbement', valeur: '', obs_parametre: '' },
              { maladie: 'Attaque Foreurs', severite: '', obs_maladie: '', parametre: 'Presence de loranthus', valeur: '', obs_parametre: '' },
              { maladie: 'Autres (precisez)', severite: '', obs_maladie: '', parametre: 'Autres (precisez)', valeur: '', obs_parametre: '' },
            ];
            const maladies = f.maladies && f.maladies.length > 0 && f.maladies[0]?.maladie ? f.maladies : defaultMaladies;
            return (
              <DynamicTable
                readOnly={disabled || readOnly}
                columns={[
                  { key: 'maladie', label: 'Maladies/Ravageurs', width: '170px' },
                  { key: 'severite', label: 'Severite', type: 'select', width: '95px', options: severiteOpts },
                  { key: 'obs_maladie', label: 'Observations', width: '140px' },
                  { key: 'parametre', label: 'Parametres', width: '170px' },
                  { key: 'valeur', label: 'Valeur', type: 'select', width: '95px', options: severiteOpts },
                  { key: 'obs_parametre', label: 'Observations', width: '140px' },
                ]}
                rows={maladies}
                onChange={v => updateArray('step1', 'fiche3', 'maladies', v)}
                addLabel="Ajouter une ligne"
              />
            );
          })()}
        </SectionCard>

        <SectionCard title="Etat du sol" sectionKey="f3-sol">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <SelectField label="Positionnement de la parcelle" value={sol.position} onChange={v => updateField('step1', 'fiche3', 'etat_sol.position', v)} disabled={disabled}
              options={[
                { value: 'plateau', label: '1. Plateau' },
                { value: 'haut_pente', label: '2. Haut de pente' },
                { value: 'mi_versant', label: '3. Mi versant' },
                { value: 'bas_pente', label: '4. Bas de pente' },
              ]} />
          </div>
          {(() => {
            const ouiNonOpts = [{ value: 'oui', label: 'Oui' }, { value: 'non', label: 'Non' }];
            const defaultSolElements = [
              { element: 'Existence de zones erodees', valeur: '', observations: '' },
              { element: 'Existence de zones a risque d\'erosion', valeur: '', observations: '' },
              { element: 'Hydromorphie', valeur: '', observations: '' },
            ];
            const solElements = f.sol_elements && f.sol_elements.length > 0 ? f.sol_elements : defaultSolElements;
            return (
              <DynamicTable
                readOnly={disabled || readOnly}
                columns={[
                  { key: 'element', label: 'Elements d\'observation', width: '220px' },
                  { key: 'valeur', label: 'Valeur', type: 'select', width: '90px', options: ouiNonOpts },
                  { key: 'observations', label: 'Observations', width: '250px' },
                ]}
                rows={solElements}
                onChange={v => updateArray('step1', 'fiche3', 'sol_elements', v)}
                addLabel="Ajouter un element"
              />
            );
          })()}
        </SectionCard>

        <SectionCard title="Pratiques de recolte et post-recolte" sectionKey="f3-recolte">
          <p className="text-xs text-[#6B7280] mb-2">Conforme au document officiel : Elements d'observation et Reponses.</p>
          {(() => {
            const modesFermentation = [
              { value: 'bache_plastique', label: '1. Bache en plastique' },
              { value: 'feuilles_bananier', label: '2. Feuilles de bananier' },
              { value: 'bac_fermentation', label: '3. Bac de fermentation' },
              { value: 'autre', label: '4. Autre (a preciser)' },
            ];
            const methodesSechage = [
              { value: 'goudron', label: '1. Sur goudron' },
              { value: 'aire_cimentee', label: '2. Sur aire cimentee' },
              { value: 'bache_plastique', label: '3. Sur bache en plastique a terre' },
              { value: 'claie', label: '4. Sur claie' },
              { value: 'autre', label: '5. Autre (a preciser)' },
            ];
            return (
              <div className="space-y-3">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse border border-[#E5E5E0]">
                    <thead>
                      <tr className="bg-[#1A3622] text-white">
                        <th className="p-2 text-left border border-[#E5E5E0] font-medium w-1/2">Elements d'observation</th>
                        <th className="p-2 text-left border border-[#E5E5E0] font-medium w-1/2">Reponses</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-[#E5E5E0]">
                        <td className="p-2 border border-[#E5E5E0] text-[#374151]">Frequence des recoltes (Espacement entre 2 recoltes en nbre de jours)</td>
                        <td className="p-2 border border-[#E5E5E0]">
                          <input type="number" className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-[#1A3622] outline-none disabled:bg-gray-50" disabled={disabled || readOnly}
                            value={rpr.frequence_recolte_jours || ''} onChange={e => updateField('step1', 'fiche3', 'recolte_post_recolte.frequence_recolte_jours', e.target.value)} placeholder="Nombre de jours" />
                        </td>
                      </tr>
                      <tr className="border-b border-[#E5E5E0]">
                        <td className="p-2 border border-[#E5E5E0] text-[#374151]">Temps entre la recolte et l'ecabossage (nombre de jours)</td>
                        <td className="p-2 border border-[#E5E5E0]">
                          <input type="number" className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-[#1A3622] outline-none disabled:bg-gray-50" disabled={disabled || readOnly}
                            value={rpr.temps_ecabossage_jours || ''} onChange={e => updateField('step1', 'fiche3', 'recolte_post_recolte.temps_ecabossage_jours', e.target.value)} placeholder="Nombre de jours" />
                        </td>
                      </tr>
                      <tr className="border-b border-[#E5E5E0]">
                        <td className="p-2 border border-[#E5E5E0] text-[#374151]">Duree de la fermentation (nombre de jours)</td>
                        <td className="p-2 border border-[#E5E5E0]">
                          <input type="number" className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-[#1A3622] outline-none disabled:bg-gray-50" disabled={disabled || readOnly}
                            value={rpr.duree_fermentation_jours || ''} onChange={e => updateField('step1', 'fiche3', 'recolte_post_recolte.duree_fermentation_jours', e.target.value)} placeholder="Nombre de jours" />
                        </td>
                      </tr>
                      <tr className="border-b border-[#E5E5E0]">
                        <td className="p-2 border border-[#E5E5E0] text-[#374151]">Mode de fermentation</td>
                        <td className="p-2 border border-[#E5E5E0]">
                          <select className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-[#1A3622] outline-none disabled:bg-gray-50" disabled={disabled || readOnly}
                            value={rpr.mode_fermentation || ''} onChange={e => updateField('step1', 'fiche3', 'recolte_post_recolte.mode_fermentation', e.target.value)}>
                            <option value="">-- Selectionnez --</option>
                            {modesFermentation.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </td>
                      </tr>
                      <tr className="border-b border-[#E5E5E0]">
                        <td className="p-2 border border-[#E5E5E0] text-[#374151]">Methodes de sechage</td>
                        <td className="p-2 border border-[#E5E5E0]">
                          <select className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-[#1A3622] outline-none disabled:bg-gray-50" disabled={disabled || readOnly}
                            value={rpr.methode_sechage || ''} onChange={e => updateField('step1', 'fiche3', 'recolte_post_recolte.methode_sechage', e.target.value)}>
                            <option value="">-- Selectionnez --</option>
                            {methodesSechage.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
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
          {(() => {
            const defaultEpargne = [
              { type: 'mobile_money', a_compte: '', argent_compte: '', financement: '', montant_financement: '' },
              { type: 'microfinance', a_compte: '', argent_compte: '', financement: '', montant_financement: '' },
              { type: 'banque', a_compte: '', argent_compte: '', financement: '', montant_financement: '' },
              { type: 'autre', a_compte: '', argent_compte: '', financement: '', montant_financement: '' },
            ];
            const epargne = f.epargne && f.epargne.length > 0 ? f.epargne : defaultEpargne;
            return (
              <DynamicTable
                readOnly={disabled || readOnly}
                columns={[
                  { key: 'type', label: 'Epargne', type: 'select', width: '130px', options: [
                    { value: 'mobile_money', label: 'Mobile Money' },
                    { value: 'microfinance', label: 'Microfinance' },
                    { value: 'banque', label: 'Banque' },
                    { value: 'autre', label: 'Autres (precisez)' },
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
                  { key: 'montant_financement', label: 'Montant (FCFA)', type: 'number', width: '120px' },
                ]}
                rows={epargne}
                onChange={v => updateArray('step1', 'fiche4', 'epargne', v)}
                addLabel="Ajouter une ligne"
              />
            );
          })()}
        </SectionCard>

        <SectionCard title="Production de cacao des 3 dernieres annees" sectionKey="f4-production">
          {(() => {
            const yr = new Date().getFullYear();
            const defaultProd = [
              { annee: `${yr - 1}`, production_kg: '', revenu_brut: '' },
              { annee: `${yr - 2}`, production_kg: '', revenu_brut: '' },
              { annee: `${yr - 3}`, production_kg: '', revenu_brut: '' },
            ];
            const prod = f.production_cacao && f.production_cacao.length > 0 ? f.production_cacao : defaultProd;
            return (
              <DynamicTable
                readOnly={disabled || readOnly}
                columns={[
                  { key: 'annee', label: 'Annee', width: '100px' },
                  { key: 'production_kg', label: 'Production (kg)', type: 'number', width: '130px' },
                  { key: 'revenu_brut', label: 'Revenu brut (FCFA)', type: 'number', width: '140px' },
                ]}
                rows={prod}
                onChange={v => updateArray('step1', 'fiche4', 'production_cacao', v)}
                addLabel="Ajouter une annee"
              />
            );
          })()}
        </SectionCard>

        <SectionCard title="Sources de revenus autres que le cacao" sectionKey="f4-revenus">
          <DynamicTable
            readOnly={disabled || readOnly}
            columns={[
              { key: 'activite', label: 'Activite', width: '160px' },
              { key: 'production_moyenne', label: 'Production moyenne/an', width: '150px' },
              { key: 'revenu_brut_moyen', label: 'Revenu brut moyen/an (FCFA)', type: 'number', width: '170px' },
            ]}
            rows={f.autres_revenus || []}
            onChange={v => updateArray('step1', 'fiche4', 'autres_revenus', v)}
            addLabel="Ajouter une activite"
          />
        </SectionCard>

        <SectionCard title="Depenses courantes du foyer" sectionKey="f4-depenses">
          {(() => {
            const defaultDepenses = [
              { depense: 'Scolarite', periodicite: 'annee', montant_moyen_an: '' },
              { depense: 'Nourriture', periodicite: 'mois', montant_moyen_an: '' },
              { depense: 'Sante', periodicite: 'annee', montant_moyen_an: '' },
              { depense: 'Electricite', periodicite: 'trimestre', montant_moyen_an: '' },
              { depense: 'Eau courante', periodicite: 'mois', montant_moyen_an: '' },
              { depense: 'Funerailles', periodicite: 'annee', montant_moyen_an: '' },
              { depense: 'Mariage, bapteme', periodicite: 'annee', montant_moyen_an: '' },
            ];
            const depenses = f.depenses && f.depenses.length > 0 ? f.depenses : defaultDepenses;
            return (
              <DynamicTable
                readOnly={disabled || readOnly}
                columns={[
                  { key: 'depense', label: 'Depenses', width: '160px' },
                  { key: 'periodicite', label: 'Periodicite', type: 'select', width: '110px', options: [
                    { value: 'mois', label: 'Mois' }, { value: 'trimestre', label: 'Trimestre' },
                    { value: 'annee', label: 'Annee' },
                  ]},
                  { key: 'montant_moyen_an', label: 'Montant moyen (FCFA)', type: 'number', width: '160px' },
                ]}
                rows={depenses}
                onChange={v => updateArray('step1', 'fiche4', 'depenses', v)}
                addLabel="Ajouter une depense"
              />
            );
          })()}
        </SectionCard>

        <SectionCard title="Cout de la main d'oeuvre" sectionKey="f4-mo">
          <DynamicTable
            readOnly={disabled || readOnly}
            columns={[
              { key: 'travailleur', label: 'Travailleur', width: '140px' },
              { key: 'statut_mo', label: 'Statut MO', type: 'select', width: '140px', options: [
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
      'Peuplement du verger (densite, materiel vegetal, nombre de tiges/pieds, plages vides ...)',
      'Entretien du verger (presence de gourmands, cabosses momifiees, enherbement...)',
      'Etat sanitaire du verger (attaques de pourriture brune, mirides, foreurs, loranthus, etat de la canopee...)',
      'Arbres d\'ombrage (nombre, especes, strates)',
      'Etat du sol (Zones erodees ou a risque d\'erosion, presence de matieres organiques...)',
      'Cours/sources d\'eau (Presence de cours d\'eau ou de foret, distance avec les cultures, leur etat)',
      'Terre/Jacheres disponibles',
      'Materiel et equipement (disponibilite, qualite)',
      'Gestion de l\'exploitation (Technicite du producteur, de la main d\'oeuvre, existence de comptabilite...)',
      'Autres cultures/activites',
    ];

    const analyses = f.analyses && f.analyses.length > 0 ? f.analyses : defaultThemes.map(t => ({ theme: t, problemes: '', causes: '', consequences: '', solutions: '' }));

    return (
      <div className="space-y-4" data-testid="fiche-5">
        <SectionCard title="FICHE 5 : ANALYSE DES PROBLEMES" sectionKey="f5-analyse">
          <p className="text-xs text-[#6B7280] mb-3">Annexe 2 : Outils d'analyse des donnees. Pour chaque theme, identifiez les problemes ou contraintes, leurs causes, consequences et solutions proposees.</p>
          <DynamicTable
            readOnly={disabled || readOnly}
            columns={[
              { key: 'theme', label: 'THEMES D\'ANALYSE', width: '250px' },
              { key: 'problemes', label: 'PROBLEMES OU CONTRAINTES', width: '170px' },
              { key: 'causes', label: 'CAUSES', width: '150px' },
              { key: 'consequences', label: 'CONSEQUENCES', width: '150px' },
              { key: 'solutions', label: 'SOLUTIONS', width: '150px' },
            ]}
            rows={analyses}
            onChange={v => updateArray('step2', 'fiche5', 'analyses', v)}
            addLabel="Ajouter un theme d'analyse"
          />
        </SectionCard>
      </div>
    );
  };

  // Predefined axes for Fiche 6 & 7 (from official document)
  const AXES_STRATEGIQUES = [
    'Axe 1 : Rehabilitation du verger',
    'Axe 2 : Gestion du swollen shoot sur la parcelle',
    'Axe 3 : Diversification par valorisation des espaces vides',
    'Axe 4 : Gestion des arbres compagnons du cacaoyer',
    'Axe 5 : Gestion technique de l\'exploitation',
    'Axe 6 : Gestion financiere de l\'exploitation',
  ];

  // Auto-fill Step 3 summary from Step 1 data
  const getStep3Summary = () => {
    const s1 = pdc.step1 || {};
    const f1 = s1.fiche1 || {};
    const f2 = s1.fiche2 || {};
    const f4 = s1.fiche4 || {};
    const prod = f1.producteur || {};
    const membres = f1.membres_menage || [];
    const cultures = f2.cultures || [];
    const arbres = f2.arbres || [];
    const epargne = f4.epargne || [];
    const prodCacao = f4.production_cacao || [];

    // Menage summary by category
    const chef = membres.filter(m => m.statut_famille === 'chef_menage');
    const conjoints = membres.filter(m => m.statut_famille === 'conjoint');
    const enfants = membres.filter(m => m.statut_famille === 'enfant');
    const autres = membres.filter(m => !['chef_menage', 'conjoint', 'enfant'].includes(m.statut_famille));

    // Superficies from cultures
    let supCacao = 0, supAutres = 0;
    cultures.forEach(c => {
      const s = parseFloat(c.superficie_ha || 0) || 0;
      if ((c.libelle || '').toLowerCase().includes('cacao')) supCacao += s;
      else supAutres += s;
    });

    return {
      producteur: prod,
      menage: { chef, conjoints, enfants, autres, total: membres.length },
      cultures,
      arbres,
      epargne,
      prodCacao,
      supCacao: Math.round(supCacao * 100) / 100,
      supAutres: Math.round(supAutres * 100) / 100,
      supTotale: Math.round((supCacao + supAutres) * 100) / 100,
    };
  };

  const renderStep3Summary = () => {
    const s = getStep3Summary();
    if (!s.producteur.nom && s.menage.total === 0) return null;

    return (
      <div className="space-y-4 mb-4" data-testid="step3-summary">
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-2 text-xs text-emerald-700">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>Donnees auto-remplies depuis l'Etape 1 (Fiche de collecte agent terrain). Ces informations sont en lecture seule.</span>
        </div>

        {/* Identification */}
        <SectionCard title="Identification du Producteur" sectionKey="s3-identification" defaultOpen={false}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            {[
              ['Nom et prenoms', s.producteur.nom],
              ['Code National (CCC)', s.producteur.code_national],
              ['Delegation Regionale', s.producteur.delegation_regionale],
              ['Departement', s.producteur.departement],
              ['Sous-Prefecture', s.producteur.sous_prefecture],
              ['Village', s.producteur.village],
              ['Campement', s.producteur.campement],
            ].map(([label, val]) => (
              <div key={label} className="bg-gray-50 rounded-lg p-2">
                <p className="text-[10px] text-gray-500">{label}</p>
                <p className="font-medium text-gray-800">{val || '-'}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Situation du menage */}
        <SectionCard title={`Situation du menage (${s.menage.total} membres)`} sectionKey="s3-menage" defaultOpen={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-[#1A3622] text-white">
                  <th className="p-2 text-left">Membre du menage</th>
                  <th className="p-2 text-center">Nombre</th>
                  <th className="p-2 text-center">Scolarises</th>
                  <th className="p-2 text-center">Travail plantation</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Proprietaire/Chef de menage', s.menage.chef],
                  ['Conjoints', s.menage.conjoints],
                  ['Enfants', s.menage.enfants],
                  ['Autres', s.menage.autres],
                ].map(([label, arr]) => (
                  <tr key={label} className="border-b border-gray-100">
                    <td className="p-2 font-medium">{label}</td>
                    <td className="p-2 text-center">{arr.length}</td>
                    <td className="p-2 text-center">{arr.filter(m => m.statut_scolaire === 'scolarise').length}</td>
                    <td className="p-2 text-center">{arr.filter(m => m.statut_plantation && m.statut_plantation !== 'aucun').length}</td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-bold border-t-2 border-gray-300">
                  <td className="p-2">TOTAL</td>
                  <td className="p-2 text-center">{s.menage.total}</td>
                  <td className="p-2 text-center">{s.menage.chef.concat(s.menage.conjoints, s.menage.enfants, s.menage.autres).filter(m => m.statut_scolaire === 'scolarise').length}</td>
                  <td className="p-2 text-center">{s.menage.chef.concat(s.menage.conjoints, s.menage.enfants, s.menage.autres).filter(m => m.statut_plantation && m.statut_plantation !== 'aucun').length}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </SectionCard>

        {/* Description exploitation + Cultures */}
        <SectionCard title={`Description de l'exploitation (${s.supTotale} ha)`} sectionKey="s3-exploitation" defaultOpen={false}>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-amber-800">{s.supCacao} ha</p>
              <p className="text-[10px] text-amber-600">Cacao</p>
            </div>
            <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-green-800">{s.supAutres} ha</p>
              <p className="text-[10px] text-green-600">Autres cultures</p>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-blue-800">{s.arbres.length}</p>
              <p className="text-[10px] text-blue-600">Arbres inventories</p>
            </div>
          </div>
          {s.cultures.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-[#1A3622] text-white">
                    <th className="p-2 text-left">Culture</th>
                    <th className="p-2 text-center">Superficie (ha)</th>
                    <th className="p-2 text-center">Annee creation</th>
                    <th className="p-2 text-center">En production</th>
                  </tr>
                </thead>
                <tbody>
                  {s.cultures.map((c, i) => (
                    <tr key={`c-${i}`} className="border-b border-gray-100">
                      <td className="p-2 font-medium">{c.libelle || '-'}</td>
                      <td className="p-2 text-center">{c.superficie_ha || '-'}</td>
                      <td className="p-2 text-center">{c.annee_creation || '-'}</td>
                      <td className="p-2 text-center">{c.en_production || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        {/* Production cacao (from Fiche 4) */}
        {s.prodCacao.length > 0 && (
          <SectionCard title="Production cacao (3 dernieres annees)" sectionKey="s3-production" defaultOpen={false}>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-[#1A3622] text-white">
                    <th className="p-2 text-left">Annee</th>
                    <th className="p-2 text-center">Production (kg)</th>
                    <th className="p-2 text-center">Revenu brut (FCFA)</th>
                  </tr>
                </thead>
                <tbody>
                  {s.prodCacao.map((p, i) => (
                    <tr key={`pr-${i}`} className="border-b border-gray-100">
                      <td className="p-2">{p.annee || `N-${i + 1}`}</td>
                      <td className="p-2 text-center">{p.production_kg ? Number(p.production_kg).toLocaleString('fr-FR') : '-'}</td>
                      <td className="p-2 text-center">{p.revenu_brut ? Number(p.revenu_brut).toLocaleString('fr-FR') : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        )}
      </div>
    );
  };

  const renderFiche6 = () => {
    const f = pdc.step3?.fiche6 || {};
    const disabled = !canEditStep3;

    const defaultAxes = AXES_STRATEGIQUES.map(a => ({
      axe: a, objectifs: '', activites: '', cout: '', a1: '', a2: '', a3: '', a4: '', a5: '', responsable: '', partenaires: ''
    }));
    const axes = f.axes && f.axes.length > 0 ? f.axes : defaultAxes;

    return (
      <div className="space-y-4" data-testid="fiche-6">
        {activeStep === 3 && activeFiche === 0 && renderStep3Summary()}
        <SectionCard title="FICHE 6 : MATRICE DE PLANIFICATION STRATEGIQUE" sectionKey="f6-matrice">
          <p className="text-xs text-[#6B7280] mb-3">Annexe 3 : Outils de planification. Definissez les axes strategiques, objectifs et activites du PDC. Periode sur 5 ans (A1 a A5).</p>
          <DynamicTable
            readOnly={disabled || readOnly}
            columns={[
              { key: 'axe', label: 'Axes strategiques', width: '200px' },
              { key: 'objectifs', label: 'Objectifs', width: '150px' },
              { key: 'activites', label: 'Activites', width: '150px' },
              { key: 'cout', label: 'Cout', type: 'number', width: '90px' },
              { key: 'a1', label: 'A1', type: 'select', width: '50px', options: [{ value: 'x', label: 'X' }] },
              { key: 'a2', label: 'A2', type: 'select', width: '50px', options: [{ value: 'x', label: 'X' }] },
              { key: 'a3', label: 'A3', type: 'select', width: '50px', options: [{ value: 'x', label: 'X' }] },
              { key: 'a4', label: 'A4', type: 'select', width: '50px', options: [{ value: 'x', label: 'X' }] },
              { key: 'a5', label: 'A5', type: 'select', width: '50px', options: [{ value: 'x', label: 'X' }] },
              { key: 'responsable', label: 'Responsable', width: '110px' },
              { key: 'partenaires', label: 'Partenaires', width: '110px' },
            ]}
            rows={axes}
            onChange={v => updateArray('step3', 'fiche6', 'axes', v)}
            addLabel="Ajouter un axe/activite"
          />
          <p className="text-[10px] text-[#6B7280] mt-2 italic">Periode : A1 = Annee 1, A2 = Annee 2, ..., A5 = Annee 5</p>
        </SectionCard>
      </div>
    );
  };

  const renderFiche7 = () => {
    const f = pdc.step3?.fiche7 || {};
    const disabled = !canEditStep3;

    const defaultActions = AXES_STRATEGIQUES.map(a => ({
      axe: a, activites: '', sous_activites: '', indicateurs: '', t1: '', t2: '', t3: '', t4: '', execution: '', appui: '', cout: ''
    }));
    const actions = f.actions && f.actions.length > 0 ? f.actions : defaultActions;

    return (
      <div className="space-y-4" data-testid="fiche-7">
        <SectionCard title="FICHE 7 : MATRICE DU PROGRAMME ANNUEL D'ACTION" sectionKey="f7-programme">
          <p className="text-xs text-[#6B7280] mb-3">Annexe 3 : Outils de planification. Programme annuel avec activites, sous-activites, indicateurs, chronogramme (T1-T4), execution, appui et cout.</p>
          <DynamicTable
            readOnly={disabled || readOnly}
            columns={[
              { key: 'axe', label: 'Axes strategiques', width: '160px' },
              { key: 'activites', label: 'ACTIVITES', width: '140px' },
              { key: 'sous_activites', label: 'SOUS-ACTIVITES', width: '140px' },
              { key: 'indicateurs', label: 'INDICATEURS', width: '120px' },
              { key: 't1', label: 'T1', type: 'select', width: '45px', options: [{ value: 'x', label: 'X' }] },
              { key: 't2', label: 'T2', type: 'select', width: '45px', options: [{ value: 'x', label: 'X' }] },
              { key: 't3', label: 'T3', type: 'select', width: '45px', options: [{ value: 'x', label: 'X' }] },
              { key: 't4', label: 'T4', type: 'select', width: '45px', options: [{ value: 'x', label: 'X' }] },
              { key: 'execution', label: 'Execution', width: '95px' },
              { key: 'appui', label: 'Appui', width: '95px' },
              { key: 'cout', label: 'COUT', type: 'number', width: '90px' },
            ]}
            rows={actions}
            onChange={v => updateArray('step3', 'fiche7', 'actions', v)}
            addLabel="Ajouter une action"
          />
          <p className="text-[10px] text-[#6B7280] mt-2 italic">CHRONOGRAMME : T1 = Trimestre 1, T2 = Trimestre 2, T3 = Trimestre 3, T4 = Trimestre 4</p>
        </SectionCard>
      </div>
    );
  };

  const renderFiche8 = () => {
    const f = pdc.step3?.fiche8 || {};
    const disabled = !canEditStep3;

    const defaultMoyens = [
      { moyen: '--- INVESTISSEMENT ---', unite: '', a1_qte: '', a1_cout: '', a2_qte: '', a2_cout: '', a3_qte: '', a3_cout: '', a4_qte: '', a4_cout: '', a5_qte: '', a5_cout: '' },
      { moyen: 'Atomiseur', unite: 'unite', a1_qte: '', a1_cout: '', a2_qte: '', a2_cout: '', a3_qte: '', a3_cout: '', a4_qte: '', a4_cout: '', a5_qte: '', a5_cout: '' },
      { moyen: 'Pulverisateur', unite: 'unite', a1_qte: '', a1_cout: '', a2_qte: '', a2_cout: '', a3_qte: '', a3_cout: '', a4_qte: '', a4_cout: '', a5_qte: '', a5_cout: '' },
      { moyen: 'EPI', unite: 'kit', a1_qte: '', a1_cout: '', a2_qte: '', a2_cout: '', a3_qte: '', a3_cout: '', a4_qte: '', a4_cout: '', a5_qte: '', a5_cout: '' },
      { moyen: '--- INTRANTS ---', unite: '', a1_qte: '', a1_cout: '', a2_qte: '', a2_cout: '', a3_qte: '', a3_cout: '', a4_qte: '', a4_cout: '', a5_qte: '', a5_cout: '' },
      { moyen: 'Engrais', unite: 'kg', a1_qte: '', a1_cout: '', a2_qte: '', a2_cout: '', a3_qte: '', a3_cout: '', a4_qte: '', a4_cout: '', a5_qte: '', a5_cout: '' },
      { moyen: 'Insecticide', unite: 'litre', a1_qte: '', a1_cout: '', a2_qte: '', a2_cout: '', a3_qte: '', a3_cout: '', a4_qte: '', a4_cout: '', a5_qte: '', a5_cout: '' },
      { moyen: 'Fongicide', unite: 'litre', a1_qte: '', a1_cout: '', a2_qte: '', a2_cout: '', a3_qte: '', a3_cout: '', a4_qte: '', a4_cout: '', a5_qte: '', a5_cout: '' },
      { moyen: 'Plants de cacao', unite: 'plants', a1_qte: '', a1_cout: '', a2_qte: '', a2_cout: '', a3_qte: '', a3_cout: '', a4_qte: '', a4_cout: '', a5_qte: '', a5_cout: '' },
      { moyen: '--- MAIN D\'OEUVRE ---', unite: '', a1_qte: '', a1_cout: '', a2_qte: '', a2_cout: '', a3_qte: '', a3_cout: '', a4_qte: '', a4_cout: '', a5_qte: '', a5_cout: '' },
      { moyen: 'M.O. permanente', unite: 'pers', a1_qte: '', a1_cout: '', a2_qte: '', a2_cout: '', a3_qte: '', a3_cout: '', a4_qte: '', a4_cout: '', a5_qte: '', a5_cout: '' },
      { moyen: 'M.O. occasionnelle', unite: 'pers', a1_qte: '', a1_cout: '', a2_qte: '', a2_cout: '', a3_qte: '', a3_cout: '', a4_qte: '', a4_cout: '', a5_qte: '', a5_cout: '' },
    ];
    const moyens = f.moyens && f.moyens.length > 0 ? f.moyens : defaultMoyens;

    return (
      <div className="space-y-4" data-testid="fiche-8">
        <SectionCard title="FICHE 8 : TABLEAU DE DETERMINATION DES MOYENS ET DES COUTS" sectionKey="f8-moyens">
          <p className="text-xs text-[#6B7280] mb-3">Annexe 3 : Outils de planification. Estimez les moyens specifiques (investissement, intrants, main d'oeuvre) et couts sur 5 ans.</p>
          <DynamicTable
            readOnly={disabled || readOnly}
            columns={[
              { key: 'moyen', label: 'Moyens specifiques', width: '160px' },
              { key: 'unite', label: 'Unites', width: '70px' },
              { key: 'a1_qte', label: 'Annee 1 Qte', type: 'number', width: '70px' },
              { key: 'a1_cout', label: 'Annee 1 Cout', type: 'number', width: '80px' },
              { key: 'a2_qte', label: 'Annee 2 Qte', type: 'number', width: '70px' },
              { key: 'a2_cout', label: 'Annee 2 Cout', type: 'number', width: '80px' },
              { key: 'a3_qte', label: 'Annee 3 Qte', type: 'number', width: '70px' },
              { key: 'a3_cout', label: 'Annee 3 Cout', type: 'number', width: '80px' },
              { key: 'a4_qte', label: 'Annee 4 Qte', type: 'number', width: '70px' },
              { key: 'a4_cout', label: 'Annee 4 Cout', type: 'number', width: '80px' },
              { key: 'a5_qte', label: 'Annee 5 Qte', type: 'number', width: '70px' },
              { key: 'a5_cout', label: 'Annee 5 Cout', type: 'number', width: '80px' },
            ]}
            rows={moyens}
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
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-[#6B7280] hover:text-[#1A3622]" data-testid="pdc-stepper-back">
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
        <Button
          variant="outline"
          size="sm"
          onClick={downloadPdf}
          className="border-[#1A3622] text-[#1A3622] hover:bg-[#E8F0EA]"
          data-testid="pdc-download-pdf"
        >
          <Download className="w-4 h-4 mr-1" /> Telecharger PDF
        </Button>
      </div>

      {/* Workflow status banners */}
      {isCoopOrAdmin && step1SubmittedByAgent && activeStep === 1 && pdc.statut !== 'valide' && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 flex items-start gap-3" data-testid="step1-readonly-banner">
          <Eye className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-800">Mode lecture — Donnees collectees par l'agent terrain</p>
            <p className="text-xs text-blue-600 mt-0.5">L'etape 1 a ete soumise. Consultez les donnees puis passez a l'etape 2 (Analyse) pour completer votre evaluation.</p>
          </div>
        </div>
      )}
      {isCoopOrAdmin && step1SubmittedByAgent && activeStep === 2 && pdc.statut !== 'valide' && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-3 flex items-start gap-3" data-testid="step2-active-banner">
          <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Analyse des problemes — Annexe 2</p>
            <p className="text-xs text-amber-600 mt-0.5">Analysez les donnees collectees par l'agent terrain (Etape 1) et renseignez vos conclusions.</p>
          </div>
        </div>
      )}
      {isCoopOrAdmin && activeStep === 3 && pdc.statut !== 'valide' && (
        <div className="bg-purple-50 border border-purple-200 rounded-md p-3 flex items-start gap-3" data-testid="step3-active-banner">
          <Info className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-purple-800">Planification — Annexe 3</p>
            <p className="text-xs text-purple-600 mt-0.5">Definissez les axes strategiques, le programme d'actions et les moyens/couts. Validez pour rendre le PDC accessible au planteur.</p>
          </div>
        </div>
      )}
      {isFarmer && pdc.statut === 'valide' && (
        <div className="bg-[#E8F0EA] border border-[#1A3622]/20 rounded-md p-3 flex items-start gap-3" data-testid="farmer-validated-banner">
          <CheckCircle2 className="w-5 h-5 text-[#1A3622] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-[#1A3622]">Votre Plan de Developpement Cacaoyer</p>
            <p className="text-xs text-[#374151] mt-0.5">Ce plan a ete valide par l'agronome. Il contient la collecte terrain, l'analyse et la planification pour votre exploitation.</p>
          </div>
        </div>
      )}
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

      {/* Navigation entre fiches + Actions */}
      <div className="flex items-center justify-between bg-white border border-[#E5E5E0] rounded-md px-4 py-3" data-testid="pdc-actions">
        <div className="flex gap-2">
          {/* Bouton fiche precedente */}
          {activeFiche > 0 ? (
            <Button variant="outline" size="sm" onClick={() => setActiveFiche(activeFiche - 1)} className="text-[#6B7280] hover:text-[#1A3622]" data-testid="pdc-prev-fiche">
              <ArrowLeft className="w-4 h-4 mr-1" /> {ficheNames[activeFiche - 1]}
            </Button>
          ) : activeStep > 1 ? (
            <Button variant="outline" size="sm" onClick={() => { setActiveStep(activeStep - 1); setActiveFiche(STEPS[activeStep - 2].fiches.length - 1); }} className="text-[#6B7280] hover:text-[#1A3622]" data-testid="pdc-prev-step">
              <ArrowLeft className="w-4 h-4 mr-1" /> Etape {activeStep - 1}
            </Button>
          ) : null}

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
          {/* Bouton fiche suivante */}
          {activeFiche < ficheNames.length - 1 ? (
            <Button variant="outline" size="sm" onClick={() => setActiveFiche(activeFiche + 1)} className="text-[#374151] hover:text-[#1A3622]" data-testid="pdc-next-fiche">
              {ficheNames[activeFiche + 1]} <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : activeStep < 3 && currentCanEdit ? (
            <Button
              size="sm"
              onClick={() => submitStep(activeStep)}
              disabled={saving}
              className="bg-[#1A3622] hover:bg-[#112417] text-white"
              data-testid="pdc-submit-step-btn"
            >
              Soumettre Etape {activeStep} <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : activeStep < 3 && pdc.current_step > activeStep ? (
            <Button variant="outline" size="sm" onClick={() => { setActiveStep(activeStep + 1); setActiveFiche(0); }} className="text-[#374151] hover:text-[#1A3622]" data-testid="pdc-next-step">
              Etape {activeStep + 1} <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : null}

          {activeStep === 3 && activeFiche === ficheNames.length - 1 && canValidate && (
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

      {/* Validation banner */}
      {pdc.statut === 'valide' && (
        <div className="bg-[#E8F0EA] border border-[#1A3622]/20 rounded-md p-4 flex items-center justify-between" data-testid="pdc-validated-banner">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#1A3622] flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-[#1A3622]">PDC Valide</p>
              <p className="text-xs text-[#374151]">
                Valide par {pdc.validated_by_name || 'l\'agronome'} le {pdc.validated_at ? new Date(pdc.validated_at).toLocaleDateString('fr-FR') : '-'}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={downloadPdf}
            className="bg-[#1A3622] hover:bg-[#112417] text-white"
            data-testid="pdc-download-pdf-validated"
          >
            <Download className="w-4 h-4 mr-1" /> Telecharger le PDF officiel
          </Button>
        </div>
      )}
    </div>
  );
};

export default PDCStepperPage;

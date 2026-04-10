import { tokenService } from "../../services/tokenService";
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import {
  FileText, User, Home, MapPin, TreePine, Wrench,
  Target, CheckCircle2, ChevronRight, ChevronLeft,
  Loader2, Save, Send, ArrowLeft, Plus, Trash2, Calendar
} from 'lucide-react';
import { GeoSelectCI } from '../../components/GeoSelectCI';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const getToken = () => tokenService.getToken();
const authHeaders = () => ({ 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' });

const STEPS = [
  { id: 'fiche1', label: 'Fiche 1: Identification', icon: User },
  { id: 'fiche2', label: 'Fiche 2: Ménage', icon: Home },
  { id: 'fiche3', label: 'Fiche 3: Exploitation', icon: MapPin },
  { id: 'fiche4', label: 'Fiche 4: Inventaire Arbres', icon: TreePine },
  { id: 'fiche5', label: 'Fiche 5: Arbres Ombrage', icon: TreePine },
  { id: 'fiche6', label: 'Fiche 6: Matériel', icon: Wrench },
  { id: 'fiche7', label: 'Fiche 7: Planification', icon: Target },
  { id: 'resume', label: 'Résumé', icon: FileText },
];

const INITIAL_FORM = {
  // Fiche 1
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
  // Fiche 2
  menage: [
    { type: 'Propriétaire de l\'exploitation', nombre: '', a_ecole: '', aucun: '', primaire: '', secondaire: '', universitaire: '', plein_temps: '', occasionnel: '' },
    { type: 'Gérant ou représentant', nombre: '', a_ecole: '', aucun: '', primaire: '', secondaire: '', universitaire: '', plein_temps: '', occasionnel: '' },
    { type: 'Conjoints', nombre: '', a_ecole: '', aucun: '', primaire: '', secondaire: '', universitaire: '', plein_temps: '', occasionnel: '' },
    { type: 'Enfants 0-6 ans', nombre: '', a_ecole: '', aucun: '', primaire: '', secondaire: '', universitaire: '', plein_temps: '', occasionnel: '' },
    { type: 'Enfants 6-18 ans', nombre: '', a_ecole: '', aucun: '', primaire: '', secondaire: '', universitaire: '', plein_temps: '', occasionnel: '' },
    { type: 'Enfants +18 ans', nombre: '', a_ecole: '', aucun: '', primaire: '', secondaire: '', universitaire: '', plein_temps: '', occasionnel: '' },
    { type: 'Manoeuvres', nombre: '', a_ecole: '', aucun: '', primaire: '', secondaire: '', universitaire: '', plein_temps: '', occasionnel: '' },
    { type: 'Autres', nombre: '', a_ecole: '', aucun: '', primaire: '', secondaire: '', universitaire: '', plein_temps: '', occasionnel: '' },
  ],
  // Fiche 3
  exploitation: {
    superficie_totale_ha: '', superficie_cultivee_ha: '', superficie_foret_ha: '',
    superficie_jachere_ha: '', source_eau: '', type_source_eau: '',
  },
  cultures: [
    { nom: 'Cacao - Parcelle 1', superficie: '', annee_creation: '', source_materiel: '', production_kg: '', revenu_fcfa: '' },
  ],
  // Fiche 4
  inventaire_arbres: [],
  // Fiche 5
  arbres_ombrage: { strate1: '', strate2: '', strate3: '', total: '' },
  // Fiche 6
  materiel: [
    { type: 'Matériel de traitement', designation: 'Pulvérisateur', quantite: '', annee: '', cout: '', bon: '', acceptable: '', mauvais: '' },
    { type: 'Matériel de traitement', designation: 'Atomiseur', quantite: '', annee: '', cout: '', bon: '', acceptable: '', mauvais: '' },
    { type: 'Matériel de traitement', designation: 'EPI', quantite: '', annee: '', cout: '', bon: '', acceptable: '', mauvais: '' },
    { type: 'Matériel de transport', designation: 'Tricycle', quantite: '', annee: '', cout: '', bon: '', acceptable: '', mauvais: '' },
    { type: 'Matériel de transport', designation: 'Brouette', quantite: '', annee: '', cout: '', bon: '', acceptable: '', mauvais: '' },
    { type: 'Matériel de transport', designation: 'Camion/camionnette', quantite: '', annee: '', cout: '', bon: '', acceptable: '', mauvais: '' },
    { type: 'Moyen de déplacement', designation: 'Vélo', quantite: '', annee: '', cout: '', bon: '', acceptable: '', mauvais: '' },
    { type: 'Moyen de déplacement', designation: 'Moto', quantite: '', annee: '', cout: '', bon: '', acceptable: '', mauvais: '' },
    { type: 'Moyen de déplacement', designation: 'Voiture', quantite: '', annee: '', cout: '', bon: '', acceptable: '', mauvais: '' },
    { type: 'Matériel de séchage', designation: 'Claie/Séco', quantite: '', annee: '', cout: '', bon: '', acceptable: '', mauvais: '' },
    { type: 'Matériel de séchage', designation: 'Aire cimentée', quantite: '', annee: '', cout: '', bon: '', acceptable: '', mauvais: '' },
    { type: 'Matériel de séchage', designation: 'Séchoir solaire', quantite: '', annee: '', cout: '', bon: '', acceptable: '', mauvais: '' },
    { type: 'Matériel de fermentation', designation: 'Bac de fermentation', quantite: '', annee: '', cout: '', bon: '', acceptable: '', mauvais: '' },
    { type: 'Petit outillage', designation: 'Machette/émondoir', quantite: '', annee: '', cout: '', bon: '', acceptable: '', mauvais: '' },
    { type: 'Petit outillage', designation: 'Matériel de récolte', quantite: '', annee: '', cout: '', bon: '', acceptable: '', mauvais: '' },
    { type: 'Petit outillage', designation: 'Tronçonneuse', quantite: '', annee: '', cout: '', bon: '', acceptable: '', mauvais: '' },
  ],
  // Fiche 7
  matrice_strategique: [
    { axe: 'Axe 1: Réhabilitation du verger', objectifs: '', activites: '', cout: '', a1: false, a2: false, a3: false, a4: false, a5: false, responsable: '', partenaires: '' },
    { axe: 'Axe 2: Gestion du swollen shoot', objectifs: '', activites: '', cout: '', a1: false, a2: false, a3: false, a4: false, a5: false, responsable: '', partenaires: '' },
    { axe: 'Axe 3: Diversification espaces vides', objectifs: '', activites: '', cout: '', a1: false, a2: false, a3: false, a4: false, a5: false, responsable: '', partenaires: '' },
    { axe: 'Axe 4: Gestion arbres compagnons', objectifs: '', activites: '', cout: '', a1: false, a2: false, a3: false, a4: false, a5: false, responsable: '', partenaires: '' },
    { axe: 'Axe 5: Gestion technique exploitation', objectifs: '', activites: '', cout: '', a1: false, a2: false, a3: false, a4: false, a5: false, responsable: '', partenaires: '' },
    { axe: 'Axe 6: Gestion financière exploitation', objectifs: '', activites: '', cout: '', a1: false, a2: false, a3: false, a4: false, a5: false, responsable: '', partenaires: '' },
  ],
  programme_annuel: [
    { axe: 'Axe 1', activite: '', sous_activite: '', indicateur: '', t1: false, t2: false, t3: false, t4: false, execution: '', appui: '', cout: '' },
  ],
};

const SOURCE_MATERIEL_OPTIONS = ['SATMACI/ANADER/CNRA', 'Tout venant', 'Pépiniériste privé'];

// ============= FICHE 1: IDENTIFICATION =============
const Fiche1 = ({ data, epargne, onChange, onEpargneChange }) => {
  const update = (f, v) => onChange({ ...data, [f]: v });
  const updateEp = (cat, f, v) => onEpargneChange({ ...epargne, [cat]: { ...epargne[cat], [f]: v } });

  return (
    <div className="space-y-4" data-testid="fiche1">
      <h3 className="font-bold text-gray-900 text-sm border-b pb-2">FICHE 1 : IDENTIFICATION DU PRODUCTEUR</h3>
      <div className="grid grid-cols-2 gap-3">
        {[
          { l: 'Nom', f: 'nom', req: true }, { l: 'Prénoms', f: 'prenoms', req: true },
          { l: 'Contact (Tél)', f: 'contact_tel', type: 'tel' },
          { l: 'Code National du producteur', f: 'code_national' },
          { l: 'Code Groupe', f: 'code_groupe' },
          { l: 'Nom Entité reconnue', f: 'nom_entite' },
          { l: 'Code Entité reconnue', f: 'code_entite' },
          { l: 'Date de naissance', f: 'date_naissance', type: 'date' },
          { l: 'Village', f: 'village' }, { l: 'Campement', f: 'campement' },
        ].map(({ l, f, type, req }) => (
          <div key={f}>
            <label className="text-[10px] text-gray-500 font-medium block mb-1">{l} {req && <span className="text-red-500">*</span>}</label>
            <Input type={type || 'text'} value={data[f] || ''} onChange={(e) => update(f, e.target.value)} className="h-8 text-xs" data-testid={`f1-${f}`} />
          </div>
        ))}
        <div>
          <label className="text-[10px] text-gray-500 font-medium block mb-1">Genre</label>
          <select className="border rounded-lg px-2 py-1.5 text-xs w-full" value={data.genre || ''} onChange={(e) => update('genre', e.target.value)} data-testid="f1-genre">
            <option value="">--</option><option value="homme">Homme</option><option value="femme">Femme</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] text-gray-500 font-medium block mb-1">Statut foncier</label>
          <select className="border rounded-lg px-2 py-1.5 text-xs w-full" value={data.statut_foncier || ''} onChange={(e) => update('statut_foncier', e.target.value)} data-testid="f1-statut-foncier">
            <option value="">--</option><option value="proprietaire">Propriétaire</option><option value="metayer">Métayer</option><option value="locataire">Locataire</option>
          </select>
        </div>
      </div>
      <div className="mt-2 pt-2 border-t">
        <label className="text-[10px] text-gray-500 font-medium block mb-2">Délégation Régionale du Conseil Café-Cacao</label>
        <GeoSelectCI region={data.region || ''} departement={data.department || ''} sousPrefecture={data.sous_prefecture || ''} onChange={(f, v) => update(f, v)} />
      </div>

      {/* Épargne */}
      <div className="mt-3 pt-3 border-t">
        <h4 className="font-semibold text-xs text-gray-800 mb-2">Situation de l'épargne</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="border p-1.5 text-left">Épargne</th>
                <th className="border p-1.5 text-center">Compte</th>
                <th className="border p-1.5 text-center">Argent sur compte</th>
                <th className="border p-1.5 text-center">Financement</th>
                <th className="border p-1.5 text-center">Montant (FCFA)</th>
              </tr>
            </thead>
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

// ============= FICHE 2: MENAGE =============
const Fiche2 = ({ data, onChange }) => {
  const updateRow = (i, f, v) => { const n = [...data]; n[i] = { ...n[i], [f]: v }; onChange(n); };
  return (
    <div className="space-y-3" data-testid="fiche2">
      <h3 className="font-bold text-gray-900 text-sm border-b pb-2">FICHE 2 : SITUATION DU MÉNAGE</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-[10px] border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-gray-50">
              <th className="border p-1.5 text-left" rowSpan={2}>Membre du ménage</th>
              <th className="border p-1.5 text-center" rowSpan={2}>Nombre</th>
              <th className="border p-1.5 text-center" rowSpan={2}>A l'école</th>
              <th className="border p-1.5 text-center" colSpan={4}>Niveau d'instruction</th>
              <th className="border p-1.5 text-center" colSpan={2}>Temps travail plantation</th>
            </tr>
            <tr className="bg-gray-50">
              <th className="border p-1 text-center">Aucun</th><th className="border p-1 text-center">Primaire</th>
              <th className="border p-1 text-center">Second.</th><th className="border p-1 text-center">Univ.</th>
              <th className="border p-1 text-center">Plein tps</th><th className="border p-1 text-center">Occas.</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={`el-${i}`}>
                <td className="border p-1.5 font-medium">{row.type}</td>
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

// ============= FICHE 3: EXPLOITATION =============
const Fiche3 = ({ exploitation, cultures, onExploitationChange, onCulturesChange }) => {
  const updateExp = (f, v) => onExploitationChange({ ...exploitation, [f]: v });
  const updateCulture = (i, f, v) => { const n = [...cultures]; n[i] = { ...n[i], [f]: v }; onCulturesChange(n); };
  const addCulture = () => onCulturesChange([...cultures, { nom: '', superficie: '', annee_creation: '', source_materiel: '', production_kg: '', revenu_fcfa: '' }]);
  const removeCulture = (i) => onCulturesChange(cultures.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-4" data-testid="fiche3">
      <h3 className="font-bold text-gray-900 text-sm border-b pb-2">FICHE 3 : DESCRIPTION DE L'EXPLOITATION</h3>
      <div className="grid grid-cols-2 gap-3">
        {[
          { l: 'Superficie totale (ha)', f: 'superficie_totale_ha' },
          { l: 'Superficie cultivée (ha)', f: 'superficie_cultivee_ha' },
          { l: 'Superficie forêt (ha)', f: 'superficie_foret_ha' },
          { l: 'Superficie jachère (ha)', f: 'superficie_jachere_ha' },
        ].map(({ l, f }) => (
          <div key={f}>
            <label className="text-[10px] text-gray-500 font-medium block mb-1">{l}</label>
            <Input type="number" step="0.01" value={exploitation[f] || ''} onChange={(e) => updateExp(f, e.target.value)} className="h-8 text-xs" data-testid={`f3-${f}`} />
          </div>
        ))}
        <div>
          <label className="text-[10px] text-gray-500 font-medium block mb-1">Source d'eau</label>
          <select className="border rounded-lg px-2 py-1.5 text-xs w-full" value={exploitation.source_eau || ''} onChange={(e) => updateExp('source_eau', e.target.value)} data-testid="f3-source-eau">
            <option value="">--</option><option value="oui">Oui</option><option value="non">Non</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] text-gray-500 font-medium block mb-1">Type de source</label>
          <select className="border rounded-lg px-2 py-1.5 text-xs w-full" value={exploitation.type_source_eau || ''} onChange={(e) => updateExp('type_source_eau', e.target.value)} data-testid="f3-type-eau">
            <option value="">--</option><option value="riviere">Rivière</option><option value="marigot">Marigot</option><option value="puits">Puits</option><option value="forage">Forage</option><option value="source">Source naturelle</option>
          </select>
        </div>
      </div>

      {/* Cultures table */}
      <div className="mt-3 pt-3 border-t">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-xs text-gray-800">Cultures</h4>
          <Button size="sm" variant="outline" onClick={addCulture} data-testid="add-culture-btn"><Plus className="w-3 h-3 mr-1" /> Ajouter</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-gray-50">
                <th className="border p-1.5 text-left">Culture</th>
                <th className="border p-1.5 text-center">Superficie (ha)</th>
                <th className="border p-1.5 text-center">Année création</th>
                <th className="border p-1.5 text-center">Source matériel végétal</th>
                <th className="border p-1.5 text-center">Production (kg)</th>
                <th className="border p-1.5 text-center">Revenu (FCFA)</th>
                <th className="border p-1 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {cultures.map((c, i) => (
                <tr key={`el-${i}`}>
                  <td className="border p-0.5"><Input value={c.nom || ''} onChange={(e) => updateCulture(i, 'nom', e.target.value)} className="h-6 text-[10px] border-0" placeholder="Cacao P1" /></td>
                  <td className="border p-0.5"><Input type="number" step="0.01" value={c.superficie || ''} onChange={(e) => updateCulture(i, 'superficie', e.target.value)} className="h-6 text-[10px] border-0 text-center" /></td>
                  <td className="border p-0.5"><Input type="number" value={c.annee_creation || ''} onChange={(e) => updateCulture(i, 'annee_creation', e.target.value)} className="h-6 text-[10px] border-0 text-center" placeholder="2010" /></td>
                  <td className="border p-0.5">
                    <select className="text-[10px] w-full h-6 border-0" value={c.source_materiel || ''} onChange={(e) => updateCulture(i, 'source_materiel', e.target.value)}>
                      <option value="">--</option>
                      {SOURCE_MATERIEL_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </td>
                  <td className="border p-0.5"><Input type="number" value={c.production_kg || ''} onChange={(e) => updateCulture(i, 'production_kg', e.target.value)} className="h-6 text-[10px] border-0 text-center" /></td>
                  <td className="border p-0.5"><Input type="number" value={c.revenu_fcfa || ''} onChange={(e) => updateCulture(i, 'revenu_fcfa', e.target.value)} className="h-6 text-[10px] border-0 text-center" /></td>
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

// ============= FICHE 4: INVENTAIRE ARBRES =============
const Fiche4 = ({ data, onChange }) => {
  const addArbre = () => onChange([...data, { nom_botanique: '', nom_local: '', circonference: '', longitude: '', latitude: '', origine: 'preserve', decision: 'maintenir' }]);
  const updateArbre = (i, f, v) => { const n = [...data]; n[i] = { ...n[i], [f]: v }; onChange(n); };
  const removeArbre = (i) => onChange(data.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3" data-testid="fiche4">
      <h3 className="font-bold text-gray-900 text-sm border-b pb-2">FICHE 4 : SITUATION DES ARBRES AUTRES QUE LE CACAOYER</h3>
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={addArbre} data-testid="add-arbre-btn"><Plus className="w-3 h-3 mr-1" /> Ajouter arbre</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[10px] border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-gray-50">
              <th className="border p-1.5 text-center w-8">N°</th>
              <th className="border p-1.5 text-center">Nom botanique</th>
              <th className="border p-1.5 text-center">Nom local</th>
              <th className="border p-1.5 text-center">Circonf. (cm)</th>
              <th className="border p-1.5 text-center">Longitude</th>
              <th className="border p-1.5 text-center">Latitude</th>
              <th className="border p-1.5 text-center">Origine</th>
              <th className="border p-1.5 text-center">Décision</th>
              <th className="border p-1 w-6"></th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr><td colSpan={9} className="border p-3 text-center text-gray-400">Cliquez "Ajouter arbre" pour commencer l'inventaire</td></tr>
            ) : data.map((a, i) => (
              <tr key={`el-${i}`}>
                <td className="border p-1 text-center font-medium">{i + 1}</td>
                <td className="border p-0.5"><Input value={a.nom_botanique || ''} onChange={(e) => updateArbre(i, 'nom_botanique', e.target.value)} className="h-6 text-[10px] border-0" placeholder="Terminalia..." /></td>
                <td className="border p-0.5"><Input value={a.nom_local || ''} onChange={(e) => updateArbre(i, 'nom_local', e.target.value)} className="h-6 text-[10px] border-0" placeholder="Fraké" /></td>
                <td className="border p-0.5"><Input type="number" value={a.circonference || ''} onChange={(e) => updateArbre(i, 'circonference', e.target.value)} className="h-6 text-[10px] border-0 text-center" /></td>
                <td className="border p-0.5"><Input type="number" step="0.00001" value={a.longitude || ''} onChange={(e) => updateArbre(i, 'longitude', e.target.value)} className="h-6 text-[10px] border-0 text-center" /></td>
                <td className="border p-0.5"><Input type="number" step="0.00001" value={a.latitude || ''} onChange={(e) => updateArbre(i, 'latitude', e.target.value)} className="h-6 text-[10px] border-0 text-center" /></td>
                <td className="border p-0.5">
                  <select className="text-[10px] w-full h-6 border-0" value={a.origine || 'preserve'} onChange={(e) => updateArbre(i, 'origine', e.target.value)}>
                    <option value="preserve">Préservé</option><option value="plante">Planté</option>
                  </select>
                </td>
                <td className="border p-0.5">
                  <select className="text-[10px] w-full h-6 border-0" value={a.decision || 'maintenir'} onChange={(e) => updateArbre(i, 'decision', e.target.value)}>
                    <option value="maintenir">A maintenir</option><option value="eliminer">A éliminer</option>
                  </select>
                </td>
                <td className="border p-0.5 text-center"><button onClick={() => removeArbre(i)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-gray-500 italic">Tirer les conclusions sur la conformité ou non de la parcelle vis-à-vis des recommandations sur l'agroforesterie.</p>
    </div>
  );
};

// ============= FICHE 5: ARBRES D'OMBRAGE =============
const Fiche5 = ({ data, onChange }) => {
  const update = (f, v) => {
    const n = { ...data, [f]: v };
    n.total = (parseInt(n.strate1) || 0) + (parseInt(n.strate2) || 0) + (parseInt(n.strate3) || 0);
    onChange(n);
  };
  return (
    <div className="space-y-3" data-testid="fiche5">
      <h3 className="font-bold text-gray-900 text-sm border-b pb-2">FICHE 5 : ARBRES D'OMBRAGE (Résumé)</h3>
      <table className="w-full text-xs border-collapse max-w-md">
        <tbody>
          <tr><td className="border p-2 font-medium bg-gray-50">Nombre d'arbres strate 1 (basse, 3-5m)</td><td className="border p-1 w-24"><Input type="number" value={data.strate1 || ''} onChange={(e) => update('strate1', e.target.value)} className="h-7 text-xs text-center border-0" data-testid="f5-strate1" /></td></tr>
          <tr><td className="border p-2 font-medium bg-gray-50">Nombre d'arbres strate 2 (moyenne, 10-20m)</td><td className="border p-1 w-24"><Input type="number" value={data.strate2 || ''} onChange={(e) => update('strate2', e.target.value)} className="h-7 text-xs text-center border-0" data-testid="f5-strate2" /></td></tr>
          <tr><td className="border p-2 font-medium bg-gray-50">Nombre d'arbres strate 3 (haute, &gt;30m)</td><td className="border p-1 w-24"><Input type="number" value={data.strate3 || ''} onChange={(e) => update('strate3', e.target.value)} className="h-7 text-xs text-center border-0" data-testid="f5-strate3" /></td></tr>
          <tr className="bg-green-50"><td className="border p-2 font-bold">Total arbres d'ombrage</td><td className="border p-2 text-center font-bold text-green-700">{data.total || 0}</td></tr>
        </tbody>
      </table>
    </div>
  );
};

// ============= FICHE 6: MATERIEL =============
const Fiche6 = ({ data, onChange }) => {
  const updateRow = (i, f, v) => { const n = [...data]; n[i] = { ...n[i], [f]: v }; onChange(n); };
  let lastType = '';
  return (
    <div className="space-y-3" data-testid="fiche6">
      <h3 className="font-bold text-gray-900 text-sm border-b pb-2">FICHE 6 : MATÉRIEL AGRICOLE ET ÉQUIPEMENTS</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-[10px] border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-gray-50">
              <th className="border p-1.5 text-left">Type</th>
              <th className="border p-1.5 text-left">Désignation</th>
              <th className="border p-1.5 text-center">Qté</th>
              <th className="border p-1.5 text-center">Année</th>
              <th className="border p-1.5 text-center">Coût (FCFA)</th>
              <th className="border p-1.5 text-center">Bon</th>
              <th className="border p-1.5 text-center">Accept.</th>
              <th className="border p-1.5 text-center">Mauvais</th>
            </tr>
          </thead>
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

// ============= FICHE 7: PLANIFICATION =============
const Fiche7 = ({ matrice, programme, onMatriceChange, onProgrammeChange }) => {
  const updateM = (i, f, v) => { const n = [...matrice]; n[i] = { ...n[i], [f]: v }; onMatriceChange(n); };
  const updateP = (i, f, v) => { const n = [...programme]; n[i] = { ...n[i], [f]: v }; onProgrammeChange(n); };
  const addProgramme = () => onProgrammeChange([...programme, { axe: '', activite: '', sous_activite: '', indicateur: '', t1: false, t2: false, t3: false, t4: false, execution: '', appui: '', cout: '' }]);

  return (
    <div className="space-y-6" data-testid="fiche7">
      {/* Matrice stratégique */}
      <div>
        <h3 className="font-bold text-gray-900 text-sm border-b pb-2">FICHE 7a : MATRICE DE PLANIFICATION STRATÉGIQUE</h3>
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-[10px] border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-gray-50">
                <th className="border p-1.5 text-left">Axes stratégiques</th>
                <th className="border p-1.5 text-center">Objectifs</th>
                <th className="border p-1.5 text-center">Activités</th>
                <th className="border p-1.5 text-center">Coût</th>
                <th className="border p-1 text-center w-7">A1</th><th className="border p-1 text-center w-7">A2</th>
                <th className="border p-1 text-center w-7">A3</th><th className="border p-1 text-center w-7">A4</th><th className="border p-1 text-center w-7">A5</th>
                <th className="border p-1.5 text-center">Responsable</th>
                <th className="border p-1.5 text-center">Partenaires</th>
              </tr>
            </thead>
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

      {/* Programme annuel */}
      <div>
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="font-bold text-gray-900 text-sm">FICHE 7b : PROGRAMME ANNUEL D'ACTION</h3>
          <Button size="sm" variant="outline" onClick={addProgramme}><Plus className="w-3 h-3 mr-1" /> Ajouter</Button>
        </div>
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-[10px] border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-gray-50">
                <th className="border p-1.5 text-left">Axe</th>
                <th className="border p-1.5 text-center">Activité</th>
                <th className="border p-1.5 text-center">Sous-activité</th>
                <th className="border p-1.5 text-center">Indicateurs</th>
                <th className="border p-1 text-center w-7">T1</th><th className="border p-1 text-center w-7">T2</th>
                <th className="border p-1 text-center w-7">T3</th><th className="border p-1 text-center w-7">T4</th>
                <th className="border p-1.5 text-center">Exécution</th>
                <th className="border p-1.5 text-center">Appui</th>
                <th className="border p-1.5 text-center">Coût</th>
              </tr>
            </thead>
            <tbody>
              {programme.map((row, i) => (
                <tr key={`el-${i}`}>
                  <td className="border p-0.5">
                    <select className="text-[10px] w-full h-6 border-0" value={row.axe || ''} onChange={(e) => updateP(i, 'axe', e.target.value)}>
                      <option value="">--</option>
                      {matrice.map((m, j) => <option key={`axe-${j}`} value={`Axe ${j+1}`}>{`Axe ${j+1}`}</option>)}
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

// ============= RESUME =============
const Resume = ({ formData }) => {
  const { identification: id, arbres_ombrage: ao } = formData;
  const totalMenage = (formData.menage || []).reduce((s, r) => s + (parseInt(r.nombre) || 0), 0);
  const totalCultures = (formData.cultures || []).length;
  const totalArbres = (formData.inventaire_arbres || []).length;
  const totalMateriel = (formData.materiel || []).filter(m => parseInt(m.quantite) > 0).length;

  return (
    <div className="space-y-3" data-testid="resume">
      <h3 className="font-bold text-gray-900 text-sm border-b pb-2">RÉSUMÉ DU PDC</h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-lg border p-3"><p className="text-[10px] text-gray-400">Producteur</p><p className="text-sm font-semibold">{id?.nom} {id?.prenoms}</p><p className="text-[10px] text-gray-400">{id?.village}, {id?.sous_prefecture}</p></div>
        <div className="bg-white rounded-lg border p-3"><p className="text-[10px] text-gray-400">Ménage</p><p className="text-sm font-semibold">{totalMenage} membres</p></div>
        <div className="bg-white rounded-lg border p-3"><p className="text-[10px] text-gray-400">Cultures</p><p className="text-sm font-semibold">{totalCultures} lignes</p><p className="text-[10px] text-gray-400">{formData.exploitation?.superficie_totale_ha || 0} ha total</p></div>
        <div className="bg-white rounded-lg border p-3"><p className="text-[10px] text-gray-400">Inventaire arbres</p><p className="text-sm font-semibold">{totalArbres} arbres</p></div>
        <div className="bg-white rounded-lg border p-3"><p className="text-[10px] text-gray-400">Arbres ombrage</p><p className="text-sm font-semibold">{ao?.total || 0} total</p><p className="text-[10px] text-gray-400">S1:{ao?.strate1||0} S2:{ao?.strate2||0} S3:{ao?.strate3||0}</p></div>
        <div className="bg-white rounded-lg border p-3"><p className="text-[10px] text-gray-400">Matériel</p><p className="text-sm font-semibold">{totalMateriel} équipements</p></div>
        <div className="bg-white rounded-lg border p-3 col-span-2"><p className="text-[10px] text-gray-400">Axes stratégiques renseignés</p><p className="text-sm font-semibold">{(formData.matrice_strategique || []).filter(a => a.objectifs).length} / 6</p></div>
      </div>
    </div>
  );
};

// ============= MAIN PAGE =============
export default function FarmerPDCPage() {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [existingPDC, setExistingPDC] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadPDC = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/ars1000/pdc/my-pdc`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setExistingPDC(data);
          setFormData(prev => ({
            ...prev,
            identification: { ...prev.identification, ...(data.identification || {}) },
            epargne: data.epargne || prev.epargne,
            menage: Array.isArray(data.menage_detail) ? data.menage_detail : (Array.isArray(data.menage) ? data.menage : prev.menage),
            exploitation: data.exploitation || prev.exploitation,
            cultures: Array.isArray(data.cultures) && data.cultures.length ? data.cultures : prev.cultures,
            inventaire_arbres: Array.isArray(data.inventaire_arbres) ? data.inventaire_arbres : [],
            arbres_ombrage: data.arbres_ombrage_resume || prev.arbres_ombrage,
            materiel: Array.isArray(data.materiel_detail) ? data.materiel_detail : prev.materiel,
            matrice_strategique: Array.isArray(data.matrice_strategique_detail) ? data.matrice_strategique_detail : prev.matrice_strategique,
            programme_annuel: Array.isArray(data.programme_annuel) && data.programme_annuel.length ? data.programme_annuel : prev.programme_annuel,
          }));
        }
      }
    } catch (e) { /* error */ }
    finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadPDC(); }, [loadPDC]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
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
      };

      let res;
      if (existingPDC) {
        res = await fetch(`${API_URL}/api/ars1000/pdc/${existingPDC.id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(payload) });
      } else {
        res = await fetch(`${API_URL}/api/ars1000/pdc`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(payload) });
      }

      if (res.ok) {
        const data = await res.json();
        toast.success(existingPDC ? 'PDC mis à jour' : 'PDC créé');
        if (!existingPDC && data.id) setExistingPDC(data);
      } else {
        const err = await res.json();
        toast.error(err.detail || 'Erreur');
      }
    } catch (e) { toast.error('Erreur réseau'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-green-600" /></div>;

  const isValidated = existingPDC?.statut === 'valide';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Plan de Développement de la Cacaoyère</h1>
            <p className="text-xs text-gray-500">Certification ARS 1000 - Cacao Durable</p>
          </div>
          <div className="flex items-center gap-2">
            {existingPDC && <Badge className={isValidated ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>{existingPDC.statut}</Badge>}
            {!isValidated && (
              <Button size="sm" onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white" data-testid="save-pdc-btn">
                {saving ? <Loader2 className="animate-spin w-4 h-4 mr-1" /> : <Save className="w-4 h-4 mr-1" />} Sauvegarder
              </Button>
            )}
          </div>
        </div>

        {/* Steps nav */}
        <div className="flex gap-1 mb-4 overflow-x-auto pb-2">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <button key={s.id} onClick={() => setStep(i)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${step === i ? 'bg-green-600 text-white' : 'bg-white text-gray-600 hover:bg-green-50 border'}`}
                data-testid={`step-${s.id}`}>
                <Icon className="w-3.5 h-3.5" />{s.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl border shadow-sm p-5 mb-4">
          {step === 0 && <Fiche1 data={formData.identification} epargne={formData.epargne} onChange={id => setFormData(f => ({ ...f, identification: id }))} onEpargneChange={ep => setFormData(f => ({ ...f, epargne: ep }))} />}
          {step === 1 && <Fiche2 data={formData.menage} onChange={m => setFormData(f => ({ ...f, menage: m }))} />}
          {step === 2 && <Fiche3 exploitation={formData.exploitation} cultures={formData.cultures} onExploitationChange={e => setFormData(f => ({ ...f, exploitation: e }))} onCulturesChange={c => setFormData(f => ({ ...f, cultures: c }))} />}
          {step === 3 && <Fiche4 data={formData.inventaire_arbres} onChange={d => setFormData(f => ({ ...f, inventaire_arbres: d }))} />}
          {step === 4 && <Fiche5 data={formData.arbres_ombrage} onChange={d => setFormData(f => ({ ...f, arbres_ombrage: d }))} />}
          {step === 5 && <Fiche6 data={formData.materiel} onChange={d => setFormData(f => ({ ...f, materiel: d }))} />}
          {step === 6 && <Fiche7 matrice={formData.matrice_strategique} programme={formData.programme_annuel} onMatriceChange={d => setFormData(f => ({ ...f, matrice_strategique: d }))} onProgrammeChange={d => setFormData(f => ({ ...f, programme_annuel: d }))} />}
          {step === 7 && <Resume formData={formData} />}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} data-testid="prev-step-btn">
            <ChevronLeft className="w-4 h-4 mr-1" /> Précédent
          </Button>
          <Button onClick={() => setStep(Math.min(STEPS.length - 1, step + 1))} disabled={step === STEPS.length - 1} className="bg-green-600 hover:bg-green-700 text-white" data-testid="next-step-btn">
            Suivant <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}

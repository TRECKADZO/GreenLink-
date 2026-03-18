import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft, Leaf, MapPin, Award, TreePine, Shield, FileText,
  Check, Users, Globe, Send, Calendar, Scale, CheckCircle2, Sprout
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../../components/ui/select';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const STANDARDS = [
  { id: 'Verra VCS', name: 'Verra VCS', desc: 'Verified Carbon Standard - Le plus utilise mondialement' },
  { id: 'Gold Standard', name: 'Gold Standard', desc: 'Standard premium avec co-benefices sociaux' },
  { id: 'Plan Vivo', name: 'Plan Vivo', desc: 'Adapte aux communautes rurales et petits producteurs' },
];

const CREDIT_TYPES = [
  { id: 'Agroforesterie', name: 'Agroforesterie', desc: 'Integration arbres + cultures' },
  { id: 'Reforestation', name: 'Reforestation', desc: 'Plantation de nouvelles forets' },
  { id: 'Agriculture Regenerative', name: 'Agriculture Regenerative', desc: 'Pratiques de regeneration des sols' },
  { id: 'Conservation', name: 'Conservation', desc: 'Protection de forets existantes (REDD+)' },
];

const DEPARTMENTS = [
  'Abidjan', 'Abengourou', 'Aboisso', 'Adzope', 'Agboville',
  'Bouafle', 'Bouake', 'Daloa', 'Dimbokro', 'Divo', 'Duekoue',
  'Gagnoa', 'Grand-Bassam', 'Guiglo', 'Issia', 'Lakota', 'Man',
  'Meagui', 'Oume', 'San-Pedro', 'Sassandra', 'Soubre', 'Tabou',
  'Tiassale', 'Vavoua', 'Yamoussoukro'
];

const CO_BENEFITS = [
  { id: 'biodiversite', label: 'Biodiversite' },
  { id: 'ressources_eau', label: 'Protection des ressources en eau' },
  { id: 'qualite_sol', label: 'Amelioration qualite du sol' },
  { id: 'revenus_communaute', label: 'Revenus communautaires' },
  { id: 'education', label: 'Acces a l\'education' },
  { id: 'sante', label: 'Amelioration de la sante' },
  { id: 'egalite_genre', label: 'Egalite des genres' },
  { id: 'securite_alimentaire', label: 'Securite alimentaire' },
];

const SDG_OPTIONS = [
  { id: 1, label: 'Pas de pauvrete' },
  { id: 2, label: 'Faim zero' },
  { id: 4, label: 'Education de qualite' },
  { id: 5, label: 'Egalite des sexes' },
  { id: 6, label: 'Eau propre' },
  { id: 8, label: 'Travail decent' },
  { id: 12, label: 'Consommation responsable' },
  { id: 13, label: 'Action climatique' },
  { id: 15, label: 'Vie terrestre' },
];

const CERT_BODIES = [
  'SCS Global Services', 'Control Union', 'Bureau Veritas',
  'SGS', 'TUV SUD', 'DNV', 'AENOR', 'Autre'
];

const CreateCarbonListing = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    credit_type: '',
    project_name: '',
    project_description: '',
    verification_standard: '',
    quantity_tonnes_co2: '',
    vintage_year: new Date().getFullYear().toString(),
    region: '',
    department: '',
    methodology: '',
    area_hectares: '',
    trees_planted: '',
    farmers_involved: '',
    biodiversity_impact: '',
    social_impact: '',
    monitoring_plan: '',
    // New fields
    project_start_date: '',
    project_end_date: '',
    baseline_scenario: '',
    additionality_justification: '',
    permanence_plan: '',
    leakage_assessment: '',
    co_benefits: [],
    sdg_alignment: [],
    community_consent: false,
    certification_body: '',
  });

  const toggleCoBenefit = (id) => {
    setForm(prev => ({
      ...prev,
      co_benefits: prev.co_benefits.includes(id)
        ? prev.co_benefits.filter(b => b !== id)
        : [...prev.co_benefits, id]
    }));
  };

  const toggleSDG = (id) => {
    setForm(prev => ({
      ...prev,
      sdg_alignment: prev.sdg_alignment.includes(id)
        ? prev.sdg_alignment.filter(s => s !== id)
        : [...prev.sdg_alignment, id]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.credit_type || !form.project_name || !form.verification_standard || !form.quantity_tonnes_co2) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...form,
        quantity_tonnes_co2: parseFloat(form.quantity_tonnes_co2),
        vintage_year: parseInt(form.vintage_year),
        area_hectares: form.area_hectares ? parseFloat(form.area_hectares) : null,
        trees_planted: form.trees_planted ? parseInt(form.trees_planted) : null,
        farmers_involved: form.farmers_involved ? parseInt(form.farmers_involved) : null,
        documentation_urls: [],
      };
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/carbon-listings/submit`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Credits carbone soumis. Le Super Admin fixera le prix de vente.');
      navigate('/cooperative/carbon-submissions');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la soumission');
    } finally {
      setLoading(false);
    }
  };

  const totalSteps = 4;
  const canProceed = () => {
    if (step === 1) return form.credit_type && form.project_name && form.project_description;
    if (step === 2) return form.verification_standard && form.quantity_tonnes_co2;
    if (step === 3) return true;
    return true;
  };

  return (
    <div className="min-h-screen bg-slate-900" data-testid="create-carbon-listing">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-900/40 via-slate-900 to-teal-900/40 border-b border-slate-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Button
            variant="ghost" onClick={() => navigate(-1)}
            className="text-slate-400 hover:text-white mb-4" data-testid="back-button"
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Retour
          </Button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Leaf className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Soumettre des Credits Carbone</h1>
              <p className="text-slate-400">Formulaire complet conforme aux standards internationaux</p>
            </div>
          </div>
          {/* Step indicator */}
          <div className="flex items-center gap-2 mt-6">
            {[1,2,3,4].map(s => (
              <div key={s} className="flex-1 flex items-center gap-2">
                <div className={`h-2 flex-1 rounded-full transition-all ${
                  s <= step ? 'bg-emerald-500' : 'bg-slate-700'
                }`} />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-slate-500">
            <span>Projet</span><span>Standard & Quantite</span><span>Localisation & Impact</span><span>ESG & Conformite</span>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="p-4 rounded-xl bg-amber-900/20 border border-amber-700/30 flex items-start gap-3">
          <Shield className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-amber-300 font-medium text-sm">Processus de validation</p>
            <p className="text-slate-400 text-sm mt-1">
              Soumettez vos credits carbone. Le Super Admin verifiera votre projet, fixera le prix
              et approuvera la publication. Plus le formulaire est complet, plus votre projet sera attractif pour les acheteurs RSE.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* STEP 1: Project Type & Info */}
        {step === 1 && (
          <>
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Leaf className="h-5 w-5 text-emerald-500" /> Type de Projet *
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {CREDIT_TYPES.map((type) => (
                    <div
                      key={type.id}
                      onClick={() => setForm({ ...form, credit_type: type.id })}
                      data-testid={`credit-type-${type.id}`}
                      className={`p-4 rounded-xl cursor-pointer border-2 transition-all text-center ${
                        form.credit_type === type.id
                          ? 'border-emerald-500 bg-emerald-500/10'
                          : 'border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <TreePine className={`h-8 w-8 mx-auto mb-2 ${
                        form.credit_type === type.id ? 'text-emerald-400' : 'text-slate-500'
                      }`} />
                      <p className="text-white font-medium text-sm">{type.name}</p>
                      <p className="text-xs text-slate-400 mt-1">{type.desc}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-500" /> Informations du Projet *
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-slate-300">Nom du projet *</Label>
                  <Input
                    value={form.project_name}
                    onChange={(e) => setForm({ ...form, project_name: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white mt-2"
                    placeholder="Ex: Agroforesterie Cacao Durable - Zone Soubre"
                    data-testid="project-name-input" required
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Description du projet *</Label>
                  <Textarea
                    value={form.project_description}
                    onChange={(e) => setForm({ ...form, project_description: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white mt-2 min-h-[100px]"
                    placeholder="Decrivez le projet, les activites de sequestration, l'impact environnemental..."
                    data-testid="project-description-input" required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-300">Date de debut du projet</Label>
                    <Input
                      type="date" value={form.project_start_date}
                      onChange={(e) => setForm({ ...form, project_start_date: e.target.value })}
                      className="bg-slate-700 border-slate-600 text-white mt-2"
                      data-testid="project-start-date"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Date de fin prevue</Label>
                    <Input
                      type="date" value={form.project_end_date}
                      onChange={(e) => setForm({ ...form, project_end_date: e.target.value })}
                      className="bg-slate-700 border-slate-600 text-white mt-2"
                      data-testid="project-end-date"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* STEP 2: Standard & Quantities */}
        {step === 2 && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-500" /> Standard & Quantite *
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-slate-300">Standard de certification *</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                  {STANDARDS.map((std) => (
                    <div
                      key={std.id}
                      onClick={() => setForm({ ...form, verification_standard: std.id })}
                      data-testid={`standard-${std.id}`}
                      className={`p-4 rounded-xl cursor-pointer border-2 transition-all ${
                        form.verification_standard === std.id
                          ? 'border-amber-500 bg-amber-500/10' : 'border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <p className="text-white font-medium">{std.name}</p>
                      <p className="text-xs text-slate-400 mt-1">{std.desc}</p>
                      {form.verification_standard === std.id && <Check className="h-4 w-4 text-amber-400 mt-2" />}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-slate-300">Organisme certificateur</Label>
                <Select value={form.certification_body} onValueChange={(v) => setForm({ ...form, certification_body: v })}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-2" data-testid="certification-body-select">
                    <SelectValue placeholder="Selectionner l'organisme..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CERT_BODIES.map((cb) => (
                      <SelectItem key={cb} value={cb}>{cb}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-slate-300">Quantite (tonnes CO2) *</Label>
                  <Input
                    type="number" value={form.quantity_tonnes_co2}
                    onChange={(e) => setForm({ ...form, quantity_tonnes_co2: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white mt-2"
                    placeholder="500" data-testid="quantity-input" required
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Annee vintage</Label>
                  <Input
                    type="number" value={form.vintage_year}
                    onChange={(e) => setForm({ ...form, vintage_year: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white mt-2"
                    min="2020" max="2030"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Methodologie MRV</Label>
                  <Input
                    value={form.methodology}
                    onChange={(e) => setForm({ ...form, methodology: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white mt-2"
                    placeholder="Ex: VM0015, AR-ACM0003"
                  />
                </div>
              </div>
              {form.quantity_tonnes_co2 && (
                <div className="p-4 rounded-lg bg-slate-700/50 border border-slate-600">
                  <p className="text-slate-300 text-sm">
                    Le prix de vente sera fixe par le Super Admin lors de l'approbation.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* STEP 3: Location & Impact */}
        {step === 3 && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Globe className="h-5 w-5 text-purple-500" /> Localisation & Impact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Departement</Label>
                  <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v })}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-2">
                      <SelectValue placeholder="Selectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map((dept) => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-slate-300">Region</Label>
                  <Input
                    value={form.region}
                    onChange={(e) => setForm({ ...form, region: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white mt-2"
                    placeholder="Ex: Sud-Ouest"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Surface couverte (ha)</Label>
                  <Input
                    type="number" value={form.area_hectares}
                    onChange={(e) => setForm({ ...form, area_hectares: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white mt-2" placeholder="150"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Arbres plantes</Label>
                  <Input
                    type="number" value={form.trees_planted}
                    onChange={(e) => setForm({ ...form, trees_planted: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white mt-2" placeholder="5000"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Producteurs impliques</Label>
                  <Input
                    type="number" value={form.farmers_involved}
                    onChange={(e) => setForm({ ...form, farmers_involved: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white mt-2" placeholder="50"
                  />
                </div>
              </div>
              <div>
                <Label className="text-slate-300">Impact social</Label>
                <Textarea
                  value={form.social_impact}
                  onChange={(e) => setForm({ ...form, social_impact: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white mt-2"
                  placeholder="Decrivez l'impact social du projet (emplois, revenus, formation...)"
                  rows={3}
                />
              </div>
              <div>
                <Label className="text-slate-300">Plan de monitoring (MRV)</Label>
                <Textarea
                  value={form.monitoring_plan}
                  onChange={(e) => setForm({ ...form, monitoring_plan: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white mt-2"
                  placeholder="Decrivez le plan de mesure, reporting et verification..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 4: ESG & Compliance */}
        {step === 4 && (
          <>
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Scale className="h-5 w-5 text-blue-500" /> Additionnalite & Permanence
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-slate-300">Scenario de reference (baseline)</Label>
                  <Textarea
                    value={form.baseline_scenario}
                    onChange={(e) => setForm({ ...form, baseline_scenario: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white mt-2"
                    placeholder="Que se passerait-il sans le projet ? Decrivez le scenario de reference..."
                    rows={3} data-testid="baseline-scenario"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Justification de l'additionnalite</Label>
                  <Textarea
                    value={form.additionality_justification}
                    onChange={(e) => setForm({ ...form, additionality_justification: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white mt-2"
                    placeholder="Pourquoi ce projet n'aurait pas lieu sans les revenus carbone ?"
                    rows={3} data-testid="additionality-input"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Plan de permanence</Label>
                  <Textarea
                    value={form.permanence_plan}
                    onChange={(e) => setForm({ ...form, permanence_plan: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white mt-2"
                    placeholder="Comment la sequestration carbone sera maintenue a long terme ?"
                    rows={3} data-testid="permanence-plan"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Evaluation des fuites (leakage)</Label>
                  <Textarea
                    value={form.leakage_assessment}
                    onChange={(e) => setForm({ ...form, leakage_assessment: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white mt-2"
                    placeholder="Quels sont les risques de deplacement des emissions ?"
                    rows={2} data-testid="leakage-assessment"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Sprout className="h-5 w-5 text-emerald-500" /> Co-benefices & ODD
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-slate-300 mb-3 block">Co-benefices du projet</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {CO_BENEFITS.map((cb) => (
                      <div
                        key={cb.id}
                        onClick={() => toggleCoBenefit(cb.id)}
                        data-testid={`co-benefit-${cb.id}`}
                        className={`p-3 rounded-lg cursor-pointer border text-center text-xs transition-all ${
                          form.co_benefits.includes(cb.id)
                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                            : 'border-slate-700 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        {form.co_benefits.includes(cb.id) && <CheckCircle2 className="h-3 w-3 mx-auto mb-1 text-emerald-400" />}
                        {cb.label}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-slate-300 mb-3 block">Objectifs de Developpement Durable (ODD) alignes</Label>
                  <div className="flex flex-wrap gap-2">
                    {SDG_OPTIONS.map((sdg) => (
                      <div
                        key={sdg.id}
                        onClick={() => toggleSDG(sdg.id)}
                        data-testid={`sdg-${sdg.id}`}
                        className={`px-3 py-2 rounded-lg cursor-pointer border text-xs transition-all ${
                          form.sdg_alignment.includes(sdg.id)
                            ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                            : 'border-slate-700 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        ODD {sdg.id}: {sdg.label}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-slate-700/50 border border-slate-600">
                  <label className="flex items-center gap-3 cursor-pointer" data-testid="community-consent-checkbox">
                    <input
                      type="checkbox"
                      checked={form.community_consent}
                      onChange={(e) => setForm({ ...form, community_consent: e.target.checked })}
                      className="w-5 h-5 rounded border-slate-600 text-emerald-500 focus:ring-emerald-500 bg-slate-700"
                    />
                    <div>
                      <p className="text-white text-sm font-medium">Consentement communautaire (CLIP/FPIC)</p>
                      <p className="text-xs text-slate-400">
                        Je confirme que les communautes locales ont ete consultees et ont donne leur consentement libre, prealable et eclaire.
                      </p>
                    </div>
                  </label>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Navigation */}
        <div className="flex gap-4">
          {step > 1 && (
            <Button
              type="button" variant="outline"
              onClick={() => setStep(s => s - 1)}
              className="border-slate-600 text-slate-300"
            >
              Precedent
            </Button>
          )}
          {step === 1 && (
            <Button
              type="button" variant="outline"
              onClick={() => navigate(-1)}
              className="border-slate-600 text-slate-300"
            >
              Annuler
            </Button>
          )}
          {step < totalSteps ? (
            <Button
              type="button"
              onClick={() => setStep(s => s + 1)}
              disabled={!canProceed()}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
              data-testid="next-step-btn"
            >
              Suivant ({step}/{totalSteps})
            </Button>
          ) : (
            <Button
              type="submit" disabled={loading}
              data-testid="submit-carbon-listing-btn"
              className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-lg py-6"
            >
              {loading ? 'Soumission en cours...' : (
                <><Send className="h-5 w-5 mr-2" /> Soumettre pour Approbation</>
              )}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
};

export default CreateCarbonListing;

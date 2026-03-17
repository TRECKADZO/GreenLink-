import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft, Leaf, MapPin, Award, TreePine,
  Shield, FileText, Check, Users, Globe, Send
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
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
  { id: 'Verra VCS', name: 'Verra VCS', desc: 'Verified Carbon Standard - Le plus utilisé mondialement' },
  { id: 'Gold Standard', name: 'Gold Standard', desc: 'Standard premium avec co-bénéfices sociaux' },
  { id: 'Plan Vivo', name: 'Plan Vivo', desc: 'Adapté aux communautés rurales et petits producteurs' },
];

const CREDIT_TYPES = [
  { id: 'Agroforesterie', name: 'Agroforesterie', desc: 'Intégration arbres + cultures' },
  { id: 'Reforestation', name: 'Reforestation', desc: 'Plantation de nouvelles forêts' },
  { id: 'Agriculture Régénérative', name: 'Agriculture Régénérative', desc: 'Pratiques de régénération des sols' },
  { id: 'Conservation', name: 'Conservation', desc: 'Protection de forêts existantes (REDD+)' },
];

const DEPARTMENTS = [
  'Abidjan', 'Abengourou', 'Aboisso', 'Adzopé', 'Agboville',
  'Bouaflé', 'Bouaké', 'Daloa', 'Dimbokro', 'Divo', 'Duékoué',
  'Gagnoa', 'Grand-Bassam', 'Guiglo', 'Issia', 'Lakota', 'Man',
  'Méagui', 'Oumé', 'San-Pédro', 'Sassandra', 'Soubré', 'Tabou',
  'Tiassalé', 'Vavoua', 'Yamoussoukro'
];

const CreateCarbonListing = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
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
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.credit_type || !form.project_name || !form.verification_standard ||
        !form.quantity_tonnes_co2) {
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
      toast.success('Crédits carbone soumis. Le Super Admin fixera le prix de vente.');
      navigate('/cooperative/carbon-submissions');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la soumission');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900" data-testid="create-carbon-listing">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-900/40 via-slate-900 to-teal-900/40 border-b border-slate-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="text-slate-400 hover:text-white mb-4"
            data-testid="back-button"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Leaf className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                Soumettre des Crédits Carbone
              </h1>
              <p className="text-slate-400">
                Soumettez vos tonnes CO2. Le Super Admin fixera le prix de vente.
              </p>
            </div>
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
              Soumettez la quantité de crédits carbone. Le Super Admin vérifiera votre projet, fixera le prix de vente
              et approuvera la publication. La prime sera répartie : <span className="text-emerald-400 font-medium">70% agriculteurs</span>,
              25% GreenLink, 5% coopérative (après 30% de frais de service).
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Type & Standard */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Leaf className="h-5 w-5 text-emerald-500" />
              Type de Projet *
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

        {/* Project Info */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              Informations du Projet *
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-slate-300">Nom du projet *</Label>
              <Input
                value={form.project_name}
                onChange={(e) => setForm({ ...form, project_name: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white mt-2"
                placeholder="Ex: Agroforesterie Cacao Durable - Zone Soubré"
                data-testid="project-name-input"
                required
              />
            </div>
            <div>
              <Label className="text-slate-300">Description du projet *</Label>
              <Textarea
                value={form.project_description}
                onChange={(e) => setForm({ ...form, project_description: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white mt-2 min-h-[100px]"
                placeholder="Décrivez le projet, les activités de séquestration, l'impact environnemental..."
                data-testid="project-description-input"
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Standard & Quantities */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-500" />
              Standard & Quantité *
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
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <p className="text-white font-medium">{std.name}</p>
                    <p className="text-xs text-slate-400 mt-1">{std.desc}</p>
                    {form.verification_standard === std.id && (
                      <Check className="h-4 w-4 text-amber-400 mt-2" />
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Quantité (tonnes CO2) *</Label>
                <Input
                  type="number"
                  value={form.quantity_tonnes_co2}
                  onChange={(e) => setForm({ ...form, quantity_tonnes_co2: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white mt-2"
                  placeholder="500"
                  data-testid="quantity-input"
                  required
                />
              </div>
              <div>
                <Label className="text-slate-300">Année vintage</Label>
                <Input
                  type="number"
                  value={form.vintage_year}
                  onChange={(e) => setForm({ ...form, vintage_year: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white mt-2"
                  min="2020"
                  max="2030"
                />
              </div>
            </div>
            {form.quantity_tonnes_co2 && (
              <div className="p-4 rounded-lg bg-slate-700/50 border border-slate-600">
                <p className="text-slate-300 text-sm">
                  Le prix de vente sera fixé par le Super Admin lors de l'approbation.
                  La prime sera automatiquement répartie selon le modèle GreenLink.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Location & Impact */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Globe className="h-5 w-5 text-purple-500" />
              Localisation & Impact
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Département</Label>
                <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v })}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-2">
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((dept) => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-300">Région</Label>
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
                  type="number"
                  value={form.area_hectares}
                  onChange={(e) => setForm({ ...form, area_hectares: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white mt-2"
                  placeholder="150"
                />
              </div>
              <div>
                <Label className="text-slate-300">Arbres plantés</Label>
                <Input
                  type="number"
                  value={form.trees_planted}
                  onChange={(e) => setForm({ ...form, trees_planted: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white mt-2"
                  placeholder="5000"
                />
              </div>
              <div>
                <Label className="text-slate-300">Producteurs impliqués</Label>
                <Input
                  type="number"
                  value={form.farmers_involved}
                  onChange={(e) => setForm({ ...form, farmers_involved: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white mt-2"
                  placeholder="50"
                />
              </div>
              <div>
                <Label className="text-slate-300">Méthodologie MRV</Label>
                <Input
                  value={form.methodology}
                  onChange={(e) => setForm({ ...form, methodology: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white mt-2"
                  placeholder="Ex: VM0015, AR-ACM0003"
                />
              </div>
            </div>
            <div className="mt-4">
              <Label className="text-slate-300">Impact social</Label>
              <Textarea
                value={form.social_impact}
                onChange={(e) => setForm({ ...form, social_impact: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white mt-2"
                placeholder="Décrivez l'impact social du projet (emplois, revenus, formation...)"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(-1)}
            className="border-slate-600 text-slate-300"
          >
            Annuler
          </Button>
          <Button
            type="submit"
            disabled={loading}
            data-testid="submit-carbon-listing-btn"
            className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-lg py-6"
          >
            {loading ? 'Soumission en cours...' : (
              <>
                <Send className="h-5 w-5 mr-2" />
                Soumettre pour Approbation
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateCarbonListing;

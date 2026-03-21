import React, { useState, useEffect } from 'react';
import {
  ClipboardCheck, Save, Loader2, AlertTriangle, ShieldCheck, Heart,
  Home, Users, Plus, Trash2
} from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Label } from '../../components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';
import { Textarea } from '../../components/ui/textarea';
import { Checkbox } from '../../components/ui/checkbox';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const DANGEROUS_TASKS = [
  { code: 'TD1', name: 'Port de charges lourdes (>20kg)', severity: 'elevee' },
  { code: 'TD2', name: 'Utilisation outils tranchants', severity: 'elevee' },
  { code: 'TD3', name: 'Manipulation pesticides', severity: 'critique' },
  { code: 'TD4', name: 'Longues heures de travail (>6h)', severity: 'elevee' },
  { code: 'TD5', name: 'Travail de nuit', severity: 'modere' },
  { code: 'TD6', name: 'Brulage des champs', severity: 'elevee' },
  { code: 'TD7', name: 'Grimpee arbres sans protection', severity: 'elevee' },
  { code: 'TD8', name: 'Transport charges avec animaux', severity: 'modere' },
];

const SUPPORT_TYPES = [
  'Kit scolaire distribue',
  'Certificat de naissance aide',
  'Inscription ecole facilitee',
  'Formation professionnelle',
  'Sensibilisation famille',
  'Suivi psychosocial',
  'Aide alimentaire',
  'Referencement services sociaux',
];

const RISK_LEVELS = [
  { value: 'faible', label: 'Faible', color: 'bg-green-100 text-green-700' },
  { value: 'modere', label: 'Modere', color: 'bg-amber-100 text-amber-700' },
  { value: 'eleve', label: 'Eleve', color: 'bg-orange-100 text-orange-700' },
  { value: 'critique', label: 'Critique', color: 'bg-red-100 text-red-700' },
];

const CONDITIONS_VIE = [
  { value: 'precaires', label: 'Precaires' },
  { value: 'moyennes', label: 'Moyennes' },
  { value: 'bonnes', label: 'Bonnes' },
  { value: 'tres_bonnes', label: 'Tres bonnes' },
];

const SSRTEVisitModal = ({ open, onOpenChange, farmer, onSaved }) => {
  const [saving, setSaving] = useState(false);
  // Menage
  const [tailleMenage, setTailleMenage] = useState(0);
  const [nombreEnfants, setNombreEnfants] = useState(0);
  const [listeEnfants, setListeEnfants] = useState([]);
  // Conditions de vie
  const [conditionsVie, setConditionsVie] = useState('moyennes');
  const [eauCourante, setEauCourante] = useState(false);
  const [electricite, setElectricite] = useState(false);
  const [distanceEcole, setDistanceEcole] = useState('');
  // Observation
  const [enfantsObserves, setEnfantsObserves] = useState(0);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [selectedSupport, setSelectedSupport] = useState([]);
  const [riskLevel, setRiskLevel] = useState('faible');
  const [recommendations, setRecommendations] = useState('');
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [observations, setObservations] = useState('');

  const addChild = () => {
    setListeEnfants([...listeEnfants, { prenom: '', sexe: 'Garcon', age: 0, scolarise: false, travaille_exploitation: false }]);
  };

  const updateChild = (index, field, value) => {
    const updated = [...listeEnfants];
    updated[index] = { ...updated[index], [field]: value };
    setListeEnfants(updated);
  };

  const removeChild = (index) => {
    setListeEnfants(listeEnfants.filter((_, i) => i !== index));
  };

  // Auto-sync enfantsObserves from liste_enfants children marked as working
  useEffect(() => {
    const workingFromList = listeEnfants.filter(e => e.travaille_exploitation).length;
    if (workingFromList > enfantsObserves) {
      setEnfantsObserves(workingFromList);
    }
  }, [listeEnfants]);

  const toggleTask = (code) => {
    setSelectedTasks(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);
  };
  const toggleSupport = (s) => {
    setSelectedSupport(prev => prev.includes(s) ? prev.filter(c => c !== s) : [...prev, s]);
  };

  const resetForm = () => {
    setTailleMenage(0); setNombreEnfants(0); setListeEnfants([]);
    setConditionsVie('moyennes'); setEauCourante(false); setElectricite(false); setDistanceEcole('');
    setEnfantsObserves(0); setSelectedTasks([]); setSelectedSupport([]);
    setRiskLevel('faible'); setRecommendations(''); setFollowUpRequired(false); setObservations('');
  };

  const handleSave = async () => {
    if (!farmer?.id) return;
    if (!tailleMenage) { toast.error('Veuillez renseigner la taille du menage'); return; }
    
    // Validation: warn if risk is high but no children observed working
    if ((riskLevel === 'eleve' || riskLevel === 'critique') && enfantsObserves === 0) {
      const proceed = window.confirm(
        `Le niveau de risque est "${riskLevel}" mais 0 enfant observe en situation de travail. Voulez-vous continuer ?`
      );
      if (!proceed) return;
    }
    
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const visitData = {
        farmer_id: farmer.id,
        date_visite: new Date().toISOString(),
        taille_menage: tailleMenage,
        nombre_enfants: nombreEnfants,
        liste_enfants: listeEnfants,
        conditions_vie: conditionsVie,
        eau_courante: eauCourante,
        electricite: electricite,
        distance_ecole_km: distanceEcole ? parseFloat(distanceEcole) : null,
        enfants_observes_travaillant: enfantsObserves,
        taches_dangereuses_observees: selectedTasks,
        support_fourni: selectedSupport,
        niveau_risque: riskLevel,
        recommandations: recommendations.split('\n').filter(r => r.trim()),
        visite_suivi_requise: followUpRequired,
        observations: observations || null,
      };

      const res = await fetch(`${API_URL}/api/ici-data/ssrte/visit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(visitData),
      });

      if (res.ok) {
        toast.success('Visite SSRTE enregistree');
        resetForm();
        onSaved?.();
        onOpenChange(false);
      } else {
        const data = await res.json();
        toast.error(data.detail || 'Erreur lors de la sauvegarde');
      }
    } catch {
      toast.error('Erreur reseau');
    } finally {
      setSaving(false);
    }
  };

  const severityColor = (sev) => {
    if (sev === 'critique') return 'border-red-300 bg-red-50';
    if (sev === 'elevee') return 'border-orange-300 bg-orange-50';
    return 'border-amber-300 bg-amber-50';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col" data-testid="ssrte-visit-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-cyan-600" />
            Visite SSRTE - {farmer?.full_name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2">

          {/* Section 1: Menage */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
                <Home className="h-4 w-4 text-blue-500" /> Informations du menage
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Taille du menage *</Label>
                  <Input type="number" min={1} value={tailleMenage || ''} placeholder="Ex: 6"
                    onChange={e => setTailleMenage(parseInt(e.target.value) || 0)}
                    data-testid="ssrte-taille-menage" />
                </div>
                <div>
                  <Label className="text-xs">Nombre d'enfants *</Label>
                  <Input type="number" min={0} value={nombreEnfants || ''} placeholder="Ex: 3"
                    onChange={e => setNombreEnfants(parseInt(e.target.value) || 0)}
                    data-testid="ssrte-nombre-enfants" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Details enfants */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
                  <Users className="h-4 w-4 text-violet-500" /> Details des enfants
                </h4>
                <Button variant="outline" size="sm" onClick={addChild} data-testid="add-child-btn">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Ajouter
                </Button>
              </div>
              {listeEnfants.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-2">Cliquez "Ajouter" pour enregistrer les enfants du menage</p>
              )}
              {listeEnfants.map((child, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end p-2 bg-gray-50 rounded-lg">
                  <div className="col-span-3">
                    <Label className="text-[10px]">Prenom</Label>
                    <Input value={child.prenom} placeholder="Prenom"
                      onChange={e => updateChild(i, 'prenom', e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-[10px]">Age</Label>
                    <Input type="number" min={0} max={17} value={child.age || ''}
                      onChange={e => updateChild(i, 'age', parseInt(e.target.value) || 0)} className="h-8 text-sm" />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-[10px]">Sexe</Label>
                    <Select value={child.sexe} onValueChange={v => updateChild(i, 'sexe', v)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Garcon">Garcon</SelectItem>
                        <SelectItem value="Fille">Fille</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 flex items-center gap-1 pt-4">
                    <Checkbox checked={child.scolarise} onCheckedChange={v => updateChild(i, 'scolarise', v)} />
                    <Label className="text-[10px]">Scolarise</Label>
                  </div>
                  <div className="col-span-2 flex items-center gap-1 pt-4">
                    <Checkbox checked={child.travaille_exploitation} onCheckedChange={v => updateChild(i, 'travaille_exploitation', v)} />
                    <Label className="text-[10px] text-red-600">Travaille</Label>
                  </div>
                  <div className="col-span-1">
                    <Button variant="ghost" size="sm" onClick={() => removeChild(i)} className="h-8 w-8 p-0 text-red-400">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Section 3: Conditions de vie */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
                <Home className="h-4 w-4 text-teal-500" /> Conditions de vie
              </h4>
              <Select value={conditionsVie} onValueChange={setConditionsVie}>
                <SelectTrigger data-testid="ssrte-conditions-vie"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONDITIONS_VIE.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox checked={eauCourante} onCheckedChange={setEauCourante} data-testid="ssrte-eau" />
                  <Label className="text-sm">Eau courante</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={electricite} onCheckedChange={setElectricite} data-testid="ssrte-elec" />
                  <Label className="text-sm">Electricite</Label>
                </div>
              </div>
              <div>
                <Label className="text-xs">Distance a l'ecole (km)</Label>
                <Input type="number" step="0.1" min={0} value={distanceEcole} placeholder="Ex: 2.5"
                  onChange={e => setDistanceEcole(e.target.value)}
                  data-testid="ssrte-distance-ecole" className="max-w-[200px]" />
              </div>
            </CardContent>
          </Card>

          {/* Section 4: Observation terrain */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" /> Observation terrain
              </h4>
              <div>
                <Label className="text-xs">Nombre d'enfants observes travaillant</Label>
                <Input type="number" min={0} value={enfantsObserves}
                  onChange={e => setEnfantsObserves(parseInt(e.target.value) || 0)}
                  data-testid="ssrte-enfants-count" className="max-w-[200px]" />
              </div>
            </CardContent>
          </Card>

          {/* Section 5: Taches dangereuses */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h4 className="font-semibold text-sm text-gray-700">Taches dangereuses observees</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" data-testid="ssrte-tasks-list">
                {DANGEROUS_TASKS.map(task => (
                  <button key={task.code} onClick={() => toggleTask(task.code)}
                    className={`text-left px-3 py-2 rounded-lg border text-sm transition-all ${
                      selectedTasks.includes(task.code)
                        ? severityColor(task.severity) + ' ring-1 ring-offset-1 font-medium'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`} data-testid={`task-${task.code}`}>
                    <span className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        task.severity === 'critique' ? 'bg-red-500' : task.severity === 'elevee' ? 'bg-orange-500' : 'bg-amber-500'
                      }`} />
                      {task.name}
                    </span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Section 6: Niveau de risque */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h4 className="font-semibold text-sm text-gray-700">Niveau de risque</h4>
              <div className="flex gap-2 flex-wrap" data-testid="ssrte-risk-levels">
                {RISK_LEVELS.map(level => (
                  <button key={level.value} onClick={() => setRiskLevel(level.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                      riskLevel === level.value ? level.color + ' ring-2 ring-offset-1'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`} data-testid={`risk-${level.value}`}>
                    {level.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Section 7: Support fourni */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
                <Heart className="h-4 w-4 text-pink-500" /> Support fourni
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" data-testid="ssrte-support-list">
                {SUPPORT_TYPES.map(s => (
                  <button key={s} onClick={() => toggleSupport(s)}
                    className={`text-left px-3 py-2 rounded-lg border text-sm transition-all ${
                      selectedSupport.includes(s)
                        ? 'border-emerald-300 bg-emerald-50 ring-1 ring-offset-1 ring-emerald-300 font-medium'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}>
                    <span className="flex items-center gap-2">
                      <ShieldCheck className={`h-3.5 w-3.5 ${selectedSupport.includes(s) ? 'text-emerald-600' : 'text-gray-300'}`} />
                      {s}
                    </span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Section 8: Observations & Recommandations */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h4 className="font-semibold text-sm text-gray-700">Observations & Recommandations</h4>
              <div>
                <Label className="text-xs">Observations</Label>
                <Textarea value={observations} onChange={e => setObservations(e.target.value)}
                  placeholder="Notes et observations..." rows={3} data-testid="ssrte-observations" />
              </div>
              <div>
                <Label className="text-xs">Recommandations (une par ligne)</Label>
                <Textarea value={recommendations} onChange={e => setRecommendations(e.target.value)}
                  placeholder="Ex: Inscrire les enfants a l'ecole..." rows={3} data-testid="ssrte-recommendations" />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Switch checked={followUpRequired} onCheckedChange={setFollowUpRequired} />
                <Label className="text-xs">Visite de suivi requise</Label>
                {followUpRequired && <Badge className="bg-amber-100 text-amber-700 text-[10px]">Suivi necessaire</Badge>}
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-cyan-600 hover:bg-cyan-700" data-testid="save-ssrte-btn">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            {saving ? 'Enregistrement...' : 'Enregistrer la visite'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SSRTEVisitModal;

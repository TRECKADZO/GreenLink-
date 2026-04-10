import { tokenService } from "../../services/tokenService";
import React, { useState, useEffect } from 'react';
import { offlineCooperativeApi as cooperativeApi } from '../../services/offlineCooperativeApi';
import {
  Users, Plus, X, Save, FileText, Baby, GraduationCap, AlertTriangle, Loader2
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
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const EMPTY_CHILD = { prenom: '', sexe: 'Garcon', age: 0, scolarise: false, travaille_exploitation: false };

const ICIProfileModal = ({ open, onOpenChange, farmer, onSaved }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    taille_menage: '',
    date_naissance: '',
    genre: '',
    niveau_education: '',
    peut_lire_ecrire: true,
    utilise_pesticides: false,
    formation_securite_recue: false,
    membre_groupe_epargne: false,
    household_children: {
      total_enfants: 0,
      enfants_5_11_ans: 0,
      enfants_12_14_ans: 0,
      enfants_15_17_ans: 0,
      enfants_scolarises: 0,
      enfants_travaillant_exploitation: 0,
      taches_effectuees: [],
      liste_enfants: [],
    },
    labor_force: {
      travailleurs_permanents: 0,
      travailleurs_saisonniers: 0,
      travailleurs_avec_contrat: 0,
      salaire_journalier_moyen_xof: 0,
      utilise_main_oeuvre_familiale: true,
    },
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (open && farmer) fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, farmer]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const data = await cooperativeApi.getICIProfile(farmer.id);
      if (data && !data.message) {
        setProfile(data);
        setForm(prev => ({
          ...prev,
          taille_menage: data.taille_menage || prev.taille_menage,
          date_naissance: data.date_naissance || '',
          genre: data.genre || '',
          niveau_education: data.niveau_education || '',
          peut_lire_ecrire: data.peut_lire_ecrire ?? true,
          utilise_pesticides: data.utilise_pesticides ?? false,
          formation_securite_recue: data.formation_securite_recue ?? false,
          membre_groupe_epargne: data.membre_groupe_epargne ?? false,
          household_children: {
            ...prev.household_children,
            ...(data.household_children || {}),
          },
          labor_force: {
            ...prev.labor_force,
            ...(data.labor_force || {}),
          },
        }));
      } else {
        // No ICI profile yet — try to load family data from SSRTE
        try {
          const token = tokenService.getToken();
          const familyRes = await fetch(`${API_URL}/api/ici-data/farmers/${farmer.id}/family-data`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (familyRes.ok) {
            const familyData = await familyRes.json();
            if (familyData.source) {
              setForm(prev => ({
                ...prev,
                taille_menage: familyData.taille_menage || prev.taille_menage,
                household_children: {
                  ...prev.household_children,
                  nombre_enfants: familyData.nombre_enfants || 0,
                  liste_enfants: familyData.liste_enfants || [],
                  total_enfants: familyData.nombre_enfants || 0,
                },
              }));
              toast.info('Donnees familiales pre-remplies depuis les fiches precedentes');
            }
          }
        } catch {
          // Ignore — no pre-fill available
        }
      }
    } catch {
      // Profile doesn't exist yet, use defaults
    } finally {
      setLoading(false);
    }
  };

  const updateChild = (idx, field, value) => {
    const children = [...form.household_children.liste_enfants];
    children[idx] = { ...children[idx], [field]: value };
    // Auto-compute totals
    const total = children.length;
    const scolarises = children.filter(c => c.scolarise).length;
    const travaillant = children.filter(c => c.travaille_exploitation).length;
    const e5_11 = children.filter(c => c.age >= 5 && c.age <= 11).length;
    const e12_14 = children.filter(c => c.age >= 12 && c.age <= 14).length;
    const e15_17 = children.filter(c => c.age >= 15 && c.age <= 17).length;
    setForm(prev => ({
      ...prev,
      household_children: {
        ...prev.household_children,
        liste_enfants: children,
        total_enfants: total,
        enfants_scolarises: scolarises,
        enfants_travaillant_exploitation: travaillant,
        enfants_5_11_ans: e5_11,
        enfants_12_14_ans: e12_14,
        enfants_15_17_ans: e15_17,
      },
    }));
  };

  const addChild = () => {
    const children = [...form.household_children.liste_enfants, { ...EMPTY_CHILD }];
    setForm(prev => ({
      ...prev,
      household_children: { ...prev.household_children, liste_enfants: children, total_enfants: children.length },
    }));
  };

  const removeChild = (idx) => {
    const children = form.household_children.liste_enfants.filter((_, i) => i !== idx);
    setForm(prev => ({
      ...prev,
      household_children: { ...prev.household_children, liste_enfants: children, total_enfants: children.length },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const cleanForm = { ...form, taille_menage: parseInt(form.taille_menage) || 1 };
      const res = await cooperativeApi.updateICIProfile(farmer.id, cleanForm);
      toast.success('Fiche ICI sauvegardee');
      onSaved?.(res);
      onOpenChange(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const riskColor = (level) => {
    if (!level) return 'bg-gray-100 text-gray-700';
    const l = level.toLowerCase();
    if (l.includes('elev') || l.includes('élev')) return 'bg-red-100 text-red-800';
    if (l.includes('moder') || l.includes('modér')) return 'bg-amber-100 text-amber-800';
    return 'bg-green-100 text-green-800';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col" data-testid="ici-profile-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-cyan-600" />
            Fiche ICI - {farmer?.full_name}
          </DialogTitle>
          {profile?.niveau_risque && (
            <Badge className={riskColor(profile.niveau_risque)}>
              Risque: {profile.niveau_risque} (Score: {profile.risk_score || 0})
            </Badge>
          )}
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-cyan-600" /></div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-6 pr-2">
            {/* Section Producteur */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-2"><Users className="h-4 w-4" />Informations du Producteur</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Genre</Label>
                    <Select value={form.genre} onValueChange={v => setForm(p => ({ ...p, genre: v }))}>
                      <SelectTrigger data-testid="ici-genre"><SelectValue placeholder="Choisir" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="homme">Homme</SelectItem>
                        <SelectItem value="femme">Femme</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Education</Label>
                    <Select value={form.niveau_education} onValueChange={v => setForm(p => ({ ...p, niveau_education: v }))}>
                      <SelectTrigger data-testid="ici-education"><SelectValue placeholder="Niveau" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aucun">Aucun</SelectItem>
                        <SelectItem value="primaire">Primaire</SelectItem>
                        <SelectItem value="secondaire">Secondaire</SelectItem>
                        <SelectItem value="superieur">Superieur</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Taille du menage</Label>
                    <Input type="number" min={1} value={form.taille_menage} onChange={e => setForm(p => ({ ...p, taille_menage: e.target.value === '' ? '' : parseInt(e.target.value) || '' }))} data-testid="ici-taille-menage" />
                  </div>
                  <div className="flex items-center gap-2 pt-5">
                    <Switch checked={form.peut_lire_ecrire} onCheckedChange={v => setForm(p => ({ ...p, peut_lire_ecrire: v }))} />
                    <Label className="text-xs">Sait lire/ecrire</Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section Enfants */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
                    <Baby className="h-4 w-4" />Enfants du menage ({form.household_children.liste_enfants.length})
                  </h4>
                  <Button size="sm" variant="outline" onClick={addChild} data-testid="add-child-btn">
                    <Plus className="h-3 w-3 mr-1" />Ajouter
                  </Button>
                </div>

                {form.household_children.liste_enfants.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">Aucun enfant enregistre. Cliquez "Ajouter" pour commencer.</p>
                ) : (
                  <div className="space-y-3" data-testid="children-list">
                    {form.household_children.liste_enfants.map((child, idx) => (
                      <div key={`el-${idx}`} className="border rounded-lg p-3 bg-gray-50 relative">
                        <Button size="sm" variant="ghost" className="absolute top-1 right-1 h-6 w-6 p-0 text-red-400 hover:text-red-600" onClick={() => removeChild(idx)}>
                          <X className="h-3 w-3" />
                        </Button>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                          <div className="col-span-2 sm:col-span-1">
                            <Label className="text-xs">Prenom</Label>
                            <Input value={child.prenom} onChange={e => updateChild(idx, 'prenom', e.target.value)} placeholder="Prenom" data-testid={`child-name-${idx}`} className="h-8 text-sm" />
                          </div>
                          <div>
                            <Label className="text-xs">Sexe</Label>
                            <Select value={child.sexe} onValueChange={v => updateChild(idx, 'sexe', v)}>
                              <SelectTrigger className="h-8" data-testid={`child-sex-${idx}`}><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Fille">Fille</SelectItem>
                                <SelectItem value="Garcon">Garcon</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">Age</Label>
                            <Input type="number" min={0} max={17} value={child.age} onChange={e => updateChild(idx, 'age', parseInt(e.target.value) || 0)} className="h-8 text-sm" data-testid={`child-age-${idx}`} />
                          </div>
                          <div className="flex items-end gap-3">
                            <div className="flex items-center gap-1">
                              <Switch checked={child.scolarise} onCheckedChange={v => updateChild(idx, 'scolarise', v)} />
                              <GraduationCap className={`h-4 w-4 ${child.scolarise ? 'text-green-600' : 'text-gray-300'}`} />
                            </div>
                            <div className="flex items-center gap-1">
                              <Switch checked={child.travaille_exploitation} onCheckedChange={v => updateChild(idx, 'travaille_exploitation', v)} />
                              <AlertTriangle className={`h-4 w-4 ${child.travaille_exploitation ? 'text-red-600' : 'text-gray-300'}`} />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Computed summary */}
                {form.household_children.liste_enfants.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                    <div className="text-center p-2 bg-blue-50 rounded">
                      <p className="text-lg font-bold text-blue-700">{form.household_children.enfants_scolarises}</p>
                      <p className="text-xs text-blue-600">Scolarises</p>
                    </div>
                    <div className="text-center p-2 bg-amber-50 rounded">
                      <p className="text-lg font-bold text-amber-700">{form.household_children.enfants_travaillant_exploitation}</p>
                      <p className="text-xs text-amber-600">Travaillant</p>
                    </div>
                    <div className="text-center p-2 bg-cyan-50 rounded">
                      <p className="text-lg font-bold text-cyan-700">{form.household_children.total_enfants}</p>
                      <p className="text-xs text-cyan-600">Total</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pratiques & Securite */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <h4 className="font-semibold text-sm text-gray-700">Pratiques & Securite</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Switch checked={form.utilise_pesticides} onCheckedChange={v => setForm(p => ({ ...p, utilise_pesticides: v }))} />
                    <Label className="text-xs">Utilise pesticides</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={form.formation_securite_recue} onCheckedChange={v => setForm(p => ({ ...p, formation_securite_recue: v }))} />
                    <Label className="text-xs">Formation securite recue</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={form.membre_groupe_epargne} onCheckedChange={v => setForm(p => ({ ...p, membre_groupe_epargne: v }))} />
                    <Label className="text-xs">Membre groupe d'epargne</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={form.labor_force.utilise_main_oeuvre_familiale} onCheckedChange={v => setForm(p => ({ ...p, labor_force: { ...p.labor_force, utilise_main_oeuvre_familiale: v } }))} />
                    <Label className="text-xs">Main-d'oeuvre familiale</Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
          <Button onClick={handleSave} disabled={saving || loading} className="bg-cyan-600 hover:bg-cyan-700" data-testid="save-ici-btn">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ICIProfileModal;

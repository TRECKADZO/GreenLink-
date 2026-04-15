import { tokenService } from "../../services/tokenService";
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Wheat, Loader2, CheckCircle2, Clock,
  XCircle, Plus, Droplets, Thermometer, Eye, Send
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const getToken = () => tokenService.getToken();
const authHeaders = () => ({ 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' });

const GRADE_COLORS = { A: 'bg-green-100 text-green-700 border-green-300', B: 'bg-blue-100 text-blue-700 border-blue-300', C: 'bg-amber-100 text-amber-700 border-amber-300', D: 'bg-red-100 text-red-700 border-red-300' };
const STATUT_MAP = {
  en_attente: { label: 'En attente', color: 'bg-amber-100 text-amber-700', icon: Clock },
  validee: { label: 'Validée', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  rejetee: { label: 'Rejetée', color: 'bg-red-100 text-red-700', icon: XCircle },
};

export default function DeclarationRecoltePage() {
  const navigate = useNavigate();
  const [declarations, setDeclarations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    parcelle_nom: '',
    campagne: '2025-2026',
    quantite_kg: '',
    unite: 'kg',
    type_cacao: 'feves_sechees',
    methode_sechage: 'soleil',
    duree_fermentation_jours: 6,
    date_recolte: new Date().toISOString().slice(0, 10),
    controle_qualite: {
      humidite_estimee: 'normale',
      fermentation: 'bonne',
      corps_etrangers: false,
      feves_moisies: false,
      feves_germees: false,
      aspect_visuel: 'bon',
      odeur: 'normale',
      observations: '',
    },
    notes: '',
  });

  useEffect(() => { loadDeclarations(); }, []);

  const loadDeclarations = async () => {
    try {
      const res = await fetch(`${API_URL}/api/ars1000/recoltes/declarations`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setDeclarations(data.declarations || []);
      }
    } catch (e) { console.error('Erreur chargement declarations:', e); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.quantite_kg || parseFloat(form.quantite_kg) <= 0) { toast.error('Quantité requise'); return; }
    if (!form.parcelle_nom) { toast.error('Nom de parcelle requis'); return; }
    setSubmitting(true);
    try {
      const payload = { ...form, quantite_kg: parseFloat(form.quantite_kg), quantite_originale: parseFloat(form.quantite_kg) };
      const res = await fetch(`${API_URL}/api/ars1000/recoltes/declaration`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(payload) });
      if (res.ok) {
        toast.success('Déclaration envoyée à la coopérative');
        setShowForm(false);
        setForm(f => ({ ...f, parcelle_nom: '', quantite_kg: '', notes: '' }));
        loadDeclarations();
      } else {
        const d = await res.json();
        toast.error(d.detail || 'Erreur');
      }
    } catch (e) { toast.error('Erreur réseau'); }
    finally { setSubmitting(false); }
  };

  const updateCQ = (field, value) => setForm(f => ({ ...f, controle_qualite: { ...f.controle_qualite, [field]: value } }));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/farmer/dashboard')} data-testid="back-btn">
              <ArrowLeft className="h-4 w-4 mr-1" /> Retour
            </Button>
            <div>
              <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Wheat className="w-5 h-5 text-amber-600" /> Déclarations de Récolte</h1>
              <p className="text-xs text-gray-500">ARS 1000-2 - Contrôles qualité à la ferme</p>
            </div>
          </div>
          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => setShowForm(!showForm)} data-testid="new-declaration-btn">
            <Plus className="w-4 h-4 mr-1" /> Déclarer
          </Button>
        </div>

        {/* Formulaire */}
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border shadow-sm p-5 mb-6 space-y-4" data-testid="declaration-form">
            <h3 className="font-bold text-gray-900">Nouvelle Déclaration</h3>

            {/* Infos base */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-600 font-medium block mb-1">Parcelle *</label>
                <Input value={form.parcelle_nom} onChange={(e) => setForm({ ...form, parcelle_nom: e.target.value })} placeholder="Nom de la parcelle" data-testid="decl-parcelle" />
              </div>
              <div>
                <label className="text-xs text-gray-600 font-medium block mb-1">Date récolte</label>
                <Input type="date" value={form.date_recolte} onChange={(e) => setForm({ ...form, date_recolte: e.target.value })} data-testid="decl-date" />
              </div>
              <div>
                <label className="text-xs text-gray-600 font-medium block mb-1">Quantité *</label>
                <div className="flex gap-2">
                  <Input type="number" step="0.1" value={form.quantite_kg} onChange={(e) => setForm({ ...form, quantite_kg: e.target.value })} placeholder="0" className="flex-1" data-testid="decl-quantite" />
                  <select className="border rounded-lg px-2 text-sm w-20" value={form.unite} onChange={(e) => setForm({ ...form, unite: e.target.value })} data-testid="decl-unite">
                    <option value="kg">kg</option>
                    <option value="sacs">sacs</option>
                    <option value="tonnes">tonnes</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-600 font-medium block mb-1">Type cacao</label>
                <select className="border rounded-lg px-3 py-2 text-sm w-full" value={form.type_cacao} onChange={(e) => setForm({ ...form, type_cacao: e.target.value })} data-testid="decl-type">
                  <option value="feves_sechees">Fèves séchées</option>
                  <option value="feves_fraiches">Fèves fraîches</option>
                  <option value="cabosses">Cabosses</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600 font-medium block mb-1">Méthode séchage</label>
                <select className="border rounded-lg px-3 py-2 text-sm w-full" value={form.methode_sechage} onChange={(e) => setForm({ ...form, methode_sechage: e.target.value })} data-testid="decl-sechage">
                  <option value="soleil">Soleil</option>
                  <option value="four">Four</option>
                  <option value="artificiel">Artificiel</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600 font-medium block mb-1">Fermentation (jours)</label>
                <Input type="number" min={0} max={14} value={form.duree_fermentation_jours} onChange={(e) => setForm({ ...form, duree_fermentation_jours: parseInt(e.target.value) || 0 })} data-testid="decl-fermentation" />
              </div>
            </div>

            {/* Contrôle qualité */}
            <div className="bg-amber-50/50 rounded-xl p-4 border border-amber-100">
              <h4 className="font-semibold text-sm text-amber-800 mb-3 flex items-center gap-2"><Eye className="w-4 h-4" /> Contrôle Qualité à la Ferme</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-600 block mb-1">Humidité estimée</label>
                  <select className="border rounded-lg px-3 py-2 text-sm w-full" value={form.controle_qualite.humidite_estimee} onChange={(e) => updateCQ('humidite_estimee', e.target.value)} data-testid="cq-humidite">
                    <option value="seche">Sèche</option>
                    <option value="normale">Normale</option>
                    <option value="humide">Humide</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-600 block mb-1">Qualité fermentation</label>
                  <select className="border rounded-lg px-3 py-2 text-sm w-full" value={form.controle_qualite.fermentation} onChange={(e) => updateCQ('fermentation', e.target.value)} data-testid="cq-fermentation">
                    <option value="bonne">Bonne</option>
                    <option value="moyenne">Moyenne</option>
                    <option value="mauvaise">Mauvaise</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-600 block mb-1">Aspect visuel</label>
                  <select className="border rounded-lg px-3 py-2 text-sm w-full" value={form.controle_qualite.aspect_visuel} onChange={(e) => updateCQ('aspect_visuel', e.target.value)} data-testid="cq-aspect">
                    <option value="bon">Bon</option>
                    <option value="acceptable">Acceptable</option>
                    <option value="mauvais">Mauvais</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-600 block mb-1">Odeur</label>
                  <select className="border rounded-lg px-3 py-2 text-sm w-full" value={form.controle_qualite.odeur} onChange={(e) => updateCQ('odeur', e.target.value)} data-testid="cq-odeur">
                    <option value="normale">Normale</option>
                    <option value="acidulee">Acidulée</option>
                    <option value="moisie">Moisie</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 mt-3">
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={form.controle_qualite.corps_etrangers} onChange={(e) => updateCQ('corps_etrangers', e.target.checked)} data-testid="cq-corps" /> Corps étrangers</label>
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={form.controle_qualite.feves_moisies} onChange={(e) => updateCQ('feves_moisies', e.target.checked)} data-testid="cq-moisies" /> Fèves moisies</label>
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={form.controle_qualite.feves_germees} onChange={(e) => updateCQ('feves_germees', e.target.checked)} data-testid="cq-germees" /> Fèves germées</label>
              </div>
              <div className="mt-3">
                <label className="text-xs text-gray-600 block mb-1">Observations</label>
                <Input value={form.controle_qualite.observations} onChange={(e) => updateCQ('observations', e.target.value)} placeholder="Notes sur la qualité..." data-testid="cq-observations" />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-600 block mb-1">Notes supplémentaires</label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Commentaires..." data-testid="decl-notes" />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
              <Button type="submit" disabled={submitting} className="bg-green-600 hover:bg-green-700 text-white" data-testid="submit-declaration-btn">
                {submitting ? <Loader2 className="animate-spin w-4 h-4 mr-1" /> : <Send className="w-4 h-4 mr-1" />}
                Envoyer
              </Button>
            </div>
          </form>
        )}

        {/* Liste des déclarations */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin w-8 h-8 text-green-600" /></div>
        ) : declarations.length === 0 ? (
          <div className="text-center py-12">
            <Wheat className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Aucune déclaration de récolte</p>
            <p className="text-xs text-gray-400 mt-1">Cliquez sur "Déclarer" pour enregistrer votre première récolte</p>
          </div>
        ) : (
          <div className="space-y-3">
            {declarations.map(d => {
              const st = STATUT_MAP[d.statut] || STATUT_MAP.en_attente;
              const StIcon = st.icon;
              return (
                <div key={d.id} className="bg-white rounded-xl border shadow-sm p-4" data-testid={`farmer-decl-${d.id}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-sm">{d.parcelle_nom}</p>
                      <p className="text-xs text-gray-500">{d.campagne} | {d.date_recolte}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {d.grade_ferme?.grade && <Badge className={`${GRADE_COLORS[d.grade_ferme.grade]} border`}>Grade {d.grade_ferme.grade}</Badge>}
                      <Badge className={st.color}><StIcon className="w-3 h-3 mr-1" />{st.label}</Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div><span className="text-gray-400">Quantité:</span> <b>{Math.round(d.quantite_kg)} kg</b></div>
                    <div><span className="text-gray-400">Type:</span> <b>{d.type_cacao === 'feves_sechees' ? 'Fèves séchées' : d.type_cacao === 'feves_fraiches' ? 'Fèves fraîches' : 'Cabosses'}</b></div>
                    <div><span className="text-gray-400">Qualité:</span> <b>{d.grade_ferme?.pourcentage}% ({d.grade_ferme?.label})</b></div>
                  </div>
                  {d.motif_rejet && <p className="text-xs text-red-600 mt-2 bg-red-50 rounded px-2 py-1">Motif de rejet: {d.motif_rejet}</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

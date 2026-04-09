import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Leaf, Loader2, Plus, Send, Droplets, Mountain, TreePine, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const getToken = () => localStorage.getItem('token');
const authHeaders = () => ({ 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' });

const TYPE_MAP = {
  cours_eau: { label: "Cours d'eau", icon: Droplets, color: 'bg-blue-100 text-blue-700' },
  anti_erosion: { label: 'Anti-érosion', icon: Mountain, color: 'bg-amber-100 text-amber-700' },
  reforestation: { label: 'Reforestation', icon: TreePine, color: 'bg-green-100 text-green-700' },
  zone_risque: { label: 'Zone à risque', icon: AlertTriangle, color: 'bg-red-100 text-red-700' },
};

export default function FarmerProtectionEnvPage() {
  const navigate = useNavigate();
  const [mesures, setMesures] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    type_protection: 'cours_eau',
    description: '',
    parcelle_nom: '',
    mesures_prises: '',
    distance_cours_eau_m: '',
    superficie_reboisee_ha: '',
    especes_plantees: '',
  });

  useEffect(() => { loadMesures(); }, []);

  const loadMesures = async () => {
    try {
      const res = await fetch(`${API_URL}/api/ars1000/agroforesterie/protection-env`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setMesures(data.mesures || []);
        setStats(data.par_type || {});
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.description) { toast.error('Description requise'); return; }
    setSubmitting(true);
    try {
      const payload = {
        type_protection: form.type_protection,
        description: form.description,
        parcelle_nom: form.parcelle_nom,
        mesures_prises: form.mesures_prises ? form.mesures_prises.split(',').map(s => s.trim()) : [],
        distance_cours_eau_m: form.distance_cours_eau_m ? parseFloat(form.distance_cours_eau_m) : null,
        superficie_reboisee_ha: form.superficie_reboisee_ha ? parseFloat(form.superficie_reboisee_ha) : null,
        especes_plantees: form.especes_plantees ? form.especes_plantees.split(',').map(s => s.trim()) : [],
      };
      const res = await fetch(`${API_URL}/api/ars1000/agroforesterie/protection-env`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        toast.success('Mesure enregistrée');
        if (data.conforme_distance_eau === false) {
          toast.warning('Distance cours d\'eau < 10m : non conforme ARS 1000');
        }
        setShowForm(false);
        setForm({ type_protection: 'cours_eau', description: '', parcelle_nom: '', mesures_prises: '', distance_cours_eau_m: '', superficie_reboisee_ha: '', especes_plantees: '' });
        loadMesures();
      } else {
        const d = await res.json();
        toast.error(d.detail || 'Erreur');
      }
    } catch (e) { toast.error('Erreur réseau'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/farmer/dashboard')} data-testid="back-btn">
              <ArrowLeft className="h-4 w-4 mr-1" /> Retour
            </Button>
            <div>
              <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Leaf className="w-5 h-5 text-teal-600" /> Protection Environnementale</h1>
              <p className="text-xs text-gray-500">Mesures de protection sur mes parcelles</p>
            </div>
          </div>
          <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white" onClick={() => setShowForm(!showForm)} data-testid="new-protection-btn">
            <Plus className="w-4 h-4 mr-1" /> Nouvelle
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {Object.entries(TYPE_MAP).map(([key, { label, icon: Icon, color }]) => (
            <div key={key} className="bg-white rounded-xl border p-3 text-center shadow-sm">
              <Icon className="w-4 h-4 mx-auto mb-1 text-gray-600" />
              <p className="text-lg font-bold">{stats[key] || 0}</p>
              <p className="text-[9px] text-gray-400">{label}</p>
            </div>
          ))}
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border shadow-sm p-5 mb-6 space-y-4" data-testid="protection-form">
            <h3 className="font-bold text-gray-900">Nouvelle Mesure</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-600 font-medium block mb-1">Type *</label>
                <select className="border rounded-lg px-3 py-2 text-sm w-full" value={form.type_protection} onChange={(e) => setForm({ ...form, type_protection: e.target.value })} data-testid="prot-type">
                  <option value="cours_eau">Cours d'eau</option>
                  <option value="anti_erosion">Anti-érosion</option>
                  <option value="reforestation">Reforestation</option>
                  <option value="zone_risque">Zone à risque</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600 font-medium block mb-1">Parcelle</label>
                <Input value={form.parcelle_nom} onChange={(e) => setForm({ ...form, parcelle_nom: e.target.value })} placeholder="Nom de la parcelle" data-testid="prot-parcelle" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-600 font-medium block mb-1">Description *</label>
              <textarea className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full h-20 resize-none" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Décrivez la mesure..." data-testid="prot-description" />
            </div>
            <div>
              <label className="text-xs text-gray-600 font-medium block mb-1">Mesures prises (séparées par virgule)</label>
              <Input value={form.mesures_prises} onChange={(e) => setForm({ ...form, mesures_prises: e.target.value })} placeholder="Haie vive, bande enherbée..." data-testid="prot-mesures" />
            </div>
            {form.type_protection === 'cours_eau' && (
              <div>
                <label className="text-xs text-gray-600 font-medium block mb-1">Distance cours d'eau (m) <span className="text-gray-400">min 10m requis</span></label>
                <Input type="number" step="0.1" value={form.distance_cours_eau_m} onChange={(e) => setForm({ ...form, distance_cours_eau_m: e.target.value })} placeholder="15" data-testid="prot-distance" />
              </div>
            )}
            {form.type_protection === 'reforestation' && (
              <>
                <div>
                  <label className="text-xs text-gray-600 font-medium block mb-1">Superficie reboisée (ha)</label>
                  <Input type="number" step="0.01" value={form.superficie_reboisee_ha} onChange={(e) => setForm({ ...form, superficie_reboisee_ha: e.target.value })} placeholder="0.5" data-testid="prot-superficie" />
                </div>
                <div>
                  <label className="text-xs text-gray-600 font-medium block mb-1">Espèces plantées (séparées par virgule)</label>
                  <Input value={form.especes_plantees} onChange={(e) => setForm({ ...form, especes_plantees: e.target.value })} placeholder="Fraké, Iroko, Teck..." data-testid="prot-especes" />
                </div>
              </>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
              <Button type="submit" disabled={submitting} className="bg-teal-600 hover:bg-teal-700 text-white" data-testid="submit-protection-btn">
                {submitting ? <Loader2 className="animate-spin w-4 h-4 mr-1" /> : <Send className="w-4 h-4 mr-1" />}
                Enregistrer
              </Button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin w-8 h-8 text-teal-600" /></div>
        ) : mesures.length === 0 ? (
          <div className="text-center py-12">
            <Leaf className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Aucune mesure de protection</p>
            <p className="text-xs text-gray-400 mt-1">Cliquez sur "Nouvelle" pour enregistrer une mesure</p>
          </div>
        ) : (
          <div className="space-y-3">
            {mesures.map((m, i) => {
              const t = TYPE_MAP[m.type_protection] || TYPE_MAP.cours_eau;
              const TIcon = t.icon;
              return (
                <div key={i} className="bg-white rounded-xl border shadow-sm p-4" data-testid={`farmer-prot-${i}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <TIcon className="w-4 h-4 text-gray-600" />
                      <Badge className={t.color}>{t.label}</Badge>
                      {m.parcelle_nom && <span className="text-xs text-gray-400">{m.parcelle_nom}</span>}
                    </div>
                    {m.conforme_distance_eau !== null && m.conforme_distance_eau !== undefined && (
                      <Badge className={m.conforme_distance_eau ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                        {m.conforme_distance_eau ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
                        {m.conforme_distance_eau ? 'Conforme' : 'Non conforme'}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-700">{m.description}</p>
                  {m.mesures_prises?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {m.mesures_prises.map((mp, j) => <Badge key={j} className="bg-gray-100 text-gray-600 text-[10px]">{mp}</Badge>)}
                    </div>
                  )}
                  {m.distance_cours_eau_m && <p className="text-[10px] text-gray-400 mt-1">Distance: {m.distance_cours_eau_m}m</p>}
                  {m.especes_plantees?.length > 0 && <p className="text-[10px] text-gray-400">Espèces: {m.especes_plantees.join(', ')}</p>}
                  <p className="text-[10px] text-gray-300 mt-1">{m.created_at?.slice(0, 10)}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

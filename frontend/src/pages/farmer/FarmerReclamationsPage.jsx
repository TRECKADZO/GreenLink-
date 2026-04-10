import { tokenService } from "../../services/tokenService";
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Loader2, Plus, Send, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const getToken = () => tokenService.getToken();
const authHeaders = () => ({ 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' });

const STATUT_MAP = {
  ouverte: { label: 'Ouverte', color: 'bg-red-100 text-red-700', icon: XCircle },
  en_cours: { label: 'En cours', color: 'bg-amber-100 text-amber-700', icon: Clock },
  resolue: { label: 'Résolue', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  fermee: { label: 'Fermée', color: 'bg-gray-100 text-gray-600', icon: CheckCircle2 },
};

export default function FarmerReclamationsPage() {
  const navigate = useNavigate();
  const [reclamations, setReclamations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ objet: '', description: '', priorite: 'moyenne' });

  useEffect(() => { loadReclamations(); }, []);

  const loadReclamations = async () => {
    try {
      const res = await fetch(`${API_URL}/api/ars1000/certification/reclamations/farmer`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setReclamations(data.reclamations || []);
      }
    } catch (e) { /* error */ }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.objet) { toast.error('Objet requis'); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/ars1000/certification/reclamation`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ ...form, plaignant: 'Producteur' })
      });
      if (res.ok) {
        toast.success('Réclamation envoyée à la coopérative');
        setShowForm(false);
        setForm({ objet: '', description: '', priorite: 'moyenne' });
        loadReclamations();
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
              <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2"><MessageSquare className="w-5 h-5 text-red-500" /> Mes Réclamations</h1>
              <p className="text-xs text-gray-500">Soumettre et suivre vos réclamations</p>
            </div>
          </div>
          <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => setShowForm(!showForm)} data-testid="new-reclamation-btn">
            <Plus className="w-4 h-4 mr-1" /> Nouvelle
          </Button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border shadow-sm p-5 mb-6 space-y-4" data-testid="reclamation-form">
            <h3 className="font-bold text-gray-900">Nouvelle Réclamation</h3>
            <div>
              <label className="text-xs text-gray-600 font-medium block mb-1">Objet *</label>
              <Input value={form.objet} onChange={(e) => setForm({ ...form, objet: e.target.value })} placeholder="Sujet de votre réclamation" data-testid="rec-objet-input" />
            </div>
            <div>
              <label className="text-xs text-gray-600 font-medium block mb-1">Description</label>
              <textarea className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full h-24 resize-none" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Détaillez votre réclamation..." data-testid="rec-description-input" />
            </div>
            <div>
              <label className="text-xs text-gray-600 font-medium block mb-1">Priorité</label>
              <select className="border rounded-lg px-3 py-2 text-sm w-full" value={form.priorite} onChange={(e) => setForm({ ...form, priorite: e.target.value })} data-testid="rec-priorite-select">
                <option value="basse">Basse</option>
                <option value="moyenne">Moyenne</option>
                <option value="haute">Haute</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
              <Button type="submit" disabled={submitting} className="bg-red-600 hover:bg-red-700 text-white" data-testid="submit-reclamation-btn">
                {submitting ? <Loader2 className="animate-spin w-4 h-4 mr-1" /> : <Send className="w-4 h-4 mr-1" />}
                Envoyer
              </Button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin w-8 h-8 text-red-600" /></div>
        ) : reclamations.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Aucune réclamation</p>
            <p className="text-xs text-gray-400 mt-1">Cliquez sur "Nouvelle" pour soumettre une réclamation</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reclamations.map((r, i) => {
              const st = STATUT_MAP[r.statut || 'ouverte'];
              const StIcon = st.icon;
              return (
                <div key={`el-${i}`} className="bg-white rounded-xl border shadow-sm p-4" data-testid={`farmer-rec-${r.id}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-sm">{r.objet}</p>
                      <p className="text-xs text-gray-500">{r.date_reclamation?.slice(0, 10)}</p>
                    </div>
                    <Badge className={st.color}><StIcon className="w-3 h-3 mr-1" />{st.label}</Badge>
                  </div>
                  <p className="text-xs text-gray-600">{r.description}</p>
                  {r.actions_prises && <p className="text-xs text-green-600 mt-2 bg-green-50 rounded px-2 py-1">Réponse: {r.actions_prises}</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

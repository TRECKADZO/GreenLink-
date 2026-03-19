import React, { useState, useEffect } from 'react';
import {
  History, ChevronDown, ChevronUp, TrendingDown, TrendingUp, Minus,
  AlertTriangle, ShieldCheck, Users, BookOpen, ClipboardCheck, FileText, Loader2
} from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const RISK_CONFIG = {
  faible: { label: 'Faible', color: 'bg-green-100 text-green-700 border-green-200', dot: 'bg-green-500' },
  modere: { label: 'Modere', color: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  eleve: { label: 'Eleve', color: 'bg-orange-100 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
  critique: { label: 'Critique', color: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-500' },
};

const TASK_NAMES = {
  TD1: 'Port charges lourdes', TD2: 'Outils tranchants', TD3: 'Pesticides',
  TD4: 'Longues heures', TD5: 'Travail de nuit', TD6: 'Brulage',
  TD7: 'Grimpee arbres', TD8: 'Transport animaux',
};

const formatDate = (d) => {
  if (!d) return '-';
  const date = new Date(d);
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const SSRTEVisitCard = ({ visit }) => {
  const [expanded, setExpanded] = useState(false);
  const risk = RISK_CONFIG[visit.niveau_risque] || RISK_CONFIG.faible;

  return (
    <div className="border rounded-lg overflow-hidden" data-testid={`ssrte-visit-${visit.id}`}>
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors text-left">
        <div className="flex items-center gap-3">
          <span className={`w-2.5 h-2.5 rounded-full ${risk.dot}`} />
          <div>
            <p className="text-sm font-medium text-gray-800">{formatDate(visit.date_visite)}</p>
            <p className="text-xs text-gray-500">{visit.agent_name || 'Agent'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {visit.enfants_observes_travaillant > 0 && (
            <Badge variant="outline" className="text-[10px] border-red-200 text-red-600">
              <Users className="h-3 w-3 mr-1" />{visit.enfants_observes_travaillant} enfant(s)
            </Badge>
          )}
          <Badge className={`text-[10px] ${risk.color}`}>{risk.label}</Badge>
          {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </div>
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t bg-gray-50/50">
          {visit.taches_dangereuses_observees?.length > 0 && (
            <div className="pt-2">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Taches dangereuses</p>
              <div className="flex flex-wrap gap-1">
                {visit.taches_dangereuses_observees.map(t => (
                  <Badge key={t} variant="outline" className="text-[10px] border-orange-200 text-orange-600">{TASK_NAMES[t] || t}</Badge>
                ))}
              </div>
            </div>
          )}
          {visit.support_fourni?.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Support fourni</p>
              <div className="flex flex-wrap gap-1">
                {visit.support_fourni.map(s => (
                  <Badge key={s} variant="outline" className="text-[10px] border-emerald-200 text-emerald-600">{s}</Badge>
                ))}
              </div>
            </div>
          )}
          {visit.recommandations?.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Recommandations</p>
              <ul className="text-xs text-gray-600 list-disc pl-4 space-y-0.5">
                {visit.recommandations.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}
          {visit.visite_suivi_requise && (
            <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
              <AlertTriangle className="h-3 w-3 mr-1" />Suivi requis
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};

const ICISummaryCard = ({ profile }) => {
  if (!profile) return <p className="text-sm text-gray-400 italic">Aucun profil ICI enregistre</p>;
  const children = profile.household_children || {};
  const labor = profile.labor_force || {};

  return (
    <div className="space-y-3" data-testid="ici-summary">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-violet-50 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-violet-700">{profile.taille_menage || '-'}</p>
          <p className="text-[10px] text-violet-500">Taille menage</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-blue-700">{children.total_enfants || 0}</p>
          <p className="text-[10px] text-blue-500">Enfants</p>
        </div>
        <div className="bg-green-50 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-green-700">{children.enfants_scolarises || 0}</p>
          <p className="text-[10px] text-green-500">Scolarises</p>
        </div>
        <div className={`rounded-lg p-3 text-center ${(children.enfants_travaillant_exploitation || 0) > 0 ? 'bg-red-50' : 'bg-emerald-50'}`}>
          <p className={`text-xl font-bold ${(children.enfants_travaillant_exploitation || 0) > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
            {children.enfants_travaillant_exploitation || 0}
          </p>
          <p className={`text-[10px] ${(children.enfants_travaillant_exploitation || 0) > 0 ? 'text-red-500' : 'text-emerald-500'}`}>Travaillant</p>
        </div>
      </div>
      {children.liste_enfants?.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Enfants enregistres</p>
          <div className="space-y-1">
            {children.liste_enfants.map((e, i) => (
              <div key={i} className="flex items-center gap-2 text-xs bg-white rounded p-2 border">
                <span className="font-medium">{e.prenom}</span>
                <Badge variant="outline" className="text-[9px]">{e.sexe}</Badge>
                <span className="text-gray-500">{e.age} ans</span>
                {e.scolarise && <Badge className="bg-green-50 text-green-600 text-[9px]">Scolarise</Badge>}
                {e.travaille_exploitation && <Badge className="bg-red-50 text-red-600 text-[9px]">Travaille</Badge>}
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="flex items-center gap-2">
          <ShieldCheck className={`h-3.5 w-3.5 ${profile.formation_securite_recue ? 'text-green-500' : 'text-gray-300'}`} />
          <span>Formation securite: {profile.formation_securite_recue ? 'Oui' : 'Non'}</span>
        </div>
        <div className="flex items-center gap-2">
          <BookOpen className={`h-3.5 w-3.5 ${profile.peut_lire_ecrire ? 'text-green-500' : 'text-gray-300'}`} />
          <span>Alphabetise: {profile.peut_lire_ecrire ? 'Oui' : 'Non'}</span>
        </div>
      </div>
      {profile.total_visites_ssrte > 0 && (
        <p className="text-[10px] text-gray-400">Derniere visite SSRTE: {formatDate(profile.date_derniere_visite_ssrte)} | Risque: {profile.dernier_niveau_risque_ssrte}</p>
      )}
    </div>
  );
};

const FarmerHistorySection = ({ farmer }) => {
  const [tab, setTab] = useState('ssrte');
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (farmer?.id) loadHistory();
  }, [farmer?.id]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/ici-data/farmers/${farmer.id}/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setHistory(await res.json());
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  };

  if (!farmer?.id) return null;

  const EvolutionIcon = history?.risk_evolution === 'amelioration' ? TrendingDown
    : history?.risk_evolution === 'degradation' ? TrendingUp : Minus;
  const evolutionColor = history?.risk_evolution === 'amelioration' ? 'text-green-600'
    : history?.risk_evolution === 'degradation' ? 'text-red-600' : 'text-gray-400';
  const evolutionLabel = history?.risk_evolution === 'amelioration' ? 'En amelioration'
    : history?.risk_evolution === 'degradation' ? 'En degradation' : 'Stable';

  return (
    <Card className="mt-4" data-testid="farmer-history-section">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <History className="h-4 w-4 text-gray-500" />Historique
          </h3>
          {history?.ssrte_total > 0 && (
            <div className="flex items-center gap-1.5 text-xs">
              <EvolutionIcon className={`h-3.5 w-3.5 ${evolutionColor}`} />
              <span className={evolutionColor}>{evolutionLabel}</span>
              <Badge variant="outline" className="text-[10px]">{history.ssrte_total} visite(s)</Badge>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setTab('ssrte')}
            className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
              tab === 'ssrte' ? 'bg-white shadow-sm text-cyan-700' : 'text-gray-500 hover:text-gray-700'
            }`}
            data-testid="history-tab-ssrte"
          >
            <ClipboardCheck className="h-3.5 w-3.5" />Visites SSRTE
          </button>
          <button
            onClick={() => setTab('ici')}
            className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
              tab === 'ici' ? 'bg-white shadow-sm text-violet-700' : 'text-gray-500 hover:text-gray-700'
            }`}
            data-testid="history-tab-ici"
          >
            <FileText className="h-3.5 w-3.5" />Profil ICI
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
        ) : (
          <>
            {tab === 'ssrte' && (
              <div className="space-y-2" data-testid="history-ssrte-list">
                {history?.ssrte_visits?.length > 0 ? (
                  history.ssrte_visits.map(v => <SSRTEVisitCard key={v.id} visit={v} />)
                ) : (
                  <p className="text-sm text-gray-400 italic text-center py-4">Aucune visite SSRTE enregistree</p>
                )}
              </div>
            )}
            {tab === 'ici' && (
              <ICISummaryCard profile={history?.ici_profile} />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default FarmerHistorySection;

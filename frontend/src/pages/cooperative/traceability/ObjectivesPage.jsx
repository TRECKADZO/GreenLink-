import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tokenService } from '../../../services/tokenService';
import { toast } from 'sonner';
import {
  Target, Loader2, Home, ChevronRight,
  CheckCircle2, Clock, AlertTriangle
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const ObjectivesPage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadObjectives(); }, []);

  const loadObjectives = async () => {
    try {
      const token = tokenService.getToken();
      const res = await fetch(`${API}/api/traceability/objectives`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erreur');
      setData(await res.json());
    } catch {
      toast.error('Erreur chargement des objectifs');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#1A3622]" />
      </div>
    );
  }

  const objectives = data?.objectives || [];
  const scoreGlobal = data?.score_global || 0;

  return (
    <div className="min-h-screen bg-[#FAF9F6]" data-testid="objectives-page">
      {/* Header */}
      <div className="bg-[#1A3622] relative overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-6 relative">
          <div className="flex items-center gap-2 text-white/50 text-xs mb-3">
            <button onClick={() => navigate('/cooperative/dashboard')} className="hover:text-white"><Home className="h-3.5 w-3.5" /></button>
            <ChevronRight className="h-3 w-3" />
            <button onClick={() => navigate('/cooperative/traceability')} className="hover:text-white">Tracabilite</button>
            <ChevronRight className="h-3 w-3" />
            <span className="text-white/80">Objectifs ARS 1000</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Objectifs ARS 1000-2</h1>
              <p className="text-sm text-white/60 mt-1">Clauses 11 a 16 - Indicateurs de conformite</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-white/50 font-bold">Score Global</p>
                <p className="text-2xl font-bold text-[#D4AF37]" data-testid="score-global">{scoreGlobal}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-8">
        {/* Score bar */}
        <div className="bg-white border border-[#E5E5E0] rounded-md p-5 mb-8" data-testid="score-bar">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#1A3622]">Progression globale</span>
            <span className="text-sm font-bold text-[#1A3622]">{scoreGlobal}%</span>
          </div>
          <div className="w-full bg-[#F3F4F6] rounded-full h-3 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${scoreGlobal}%`,
                backgroundColor: scoreGlobal >= 80 ? '#065F46' : scoreGlobal >= 50 ? '#D4AF37' : '#C25E30',
              }}
            />
          </div>
        </div>

        {/* Objectives grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="objectives-grid">
          {objectives.map((obj, i) => (
            <ObjectiveCard key={obj.clause} objective={obj} index={i} />
          ))}
        </div>

        {/* Legend */}
        <div className="mt-8 bg-white border border-[#E5E5E0] rounded-md p-5" data-testid="legend">
          <p className="text-[10px] tracking-[0.05em] uppercase font-bold text-[#6B7280] mb-3">Legende des statuts</p>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span className="text-xs text-[#374151]">Conforme</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              <span className="text-xs text-[#374151]">En cours</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[#6B7280]" />
              <span className="text-xs text-[#374151]">En attente</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ObjectiveCard = ({ objective, index }) => {
  const statusIcon = {
    conforme: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
    en_cours: <Clock className="h-4 w-4 text-amber-600" />,
    en_attente: <AlertTriangle className="h-4 w-4 text-[#9CA3AF]" />,
  };

  const statusBg = {
    conforme: 'bg-emerald-50 border-emerald-200',
    en_cours: 'bg-amber-50 border-amber-200',
    en_attente: 'bg-gray-50 border-gray-200',
  };

  const progressColor = objective.progression >= 80 ? '#065F46' : objective.progression >= 50 ? '#D4AF37' : '#C25E30';

  return (
    <div
      className={`bg-white border border-[#E5E5E0] rounded-md overflow-hidden`}
      data-testid={`objective-clause-${objective.clause}`}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="px-5 py-4 border-b border-[#E5E5E0] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-[#6B7280] bg-[#F3F4F6] px-2 py-0.5 rounded">Clause {objective.clause}</span>
          <h3 className="text-sm font-semibold text-[#1A3622]">{objective.titre}</h3>
        </div>
        {statusIcon[objective.statut] || statusIcon.en_attente}
      </div>
      <div className="p-5">
        <p className="text-xs text-[#6B7280] mb-4">{objective.description}</p>

        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-[#374151]">{objective.valeur} / {objective.cible} {objective.unite}</span>
          <span className="text-xs font-bold" style={{ color: progressColor }}>{objective.progression}%</span>
        </div>
        <div className="w-full bg-[#F3F4F6] rounded-full h-2 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${objective.progression}%`, backgroundColor: progressColor }}
          />
        </div>

        <div className={`mt-3 px-3 py-2 rounded text-[10px] font-semibold ${statusBg[objective.statut] || statusBg.en_attente}`}>
          {objective.statut === 'conforme' && 'Objectif atteint'}
          {objective.statut === 'en_cours' && 'En progression'}
          {objective.statut === 'en_attente' && 'A demarrer'}
        </div>
      </div>
    </div>
  );
};

export default ObjectivesPage;

import { tokenService } from "../../../services/tokenService";
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Award, FileText, ChevronRight, Loader2, CheckCircle2, Wheat } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const ARS1000Widget = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const token = tokenService.getToken();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/api/ars1000/certification/dashboard`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) setData(await res.json());
      } catch (e) { console.error('ARS1000 widget load error:', e); }
      finally { setLoading(false); }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (loading) return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex items-center justify-center h-48">
      <Loader2 className="animate-spin w-6 h-6 text-green-600" />
    </div>
  );

  const cert = data?.certification || {};
  const niveau = cert.niveau || 'bronze';
  const niveauColors = { bronze: 'from-amber-600 to-amber-700', argent: 'from-gray-400 to-gray-500', or: 'from-yellow-500 to-yellow-600' };
  const conformite = cert.pourcentage_conformite_global || 0;
  const pdcCount = data?.total_pdc || 0;
  const pdcValides = data?.pdc_valides || 0;

  return (
    <div
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate('/cooperative/ars1000')}
      data-testid="ars1000-widget"
    >
      {/* Header gradient */}
      <div className={`bg-gradient-to-r ${niveauColors[niveau]} px-5 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-white" />
          <span className="text-white font-bold text-sm">Certification ARS 1000</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Award className="w-4 h-4 text-white/80" />
          <span className="text-white text-xs font-semibold uppercase">{niveau}</span>
        </div>
      </div>

      <div className="p-5">
        {/* Conformité */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Conformité globale</p>
            <p className="text-3xl font-bold text-gray-900">{conformite}%</p>
          </div>
          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${conformite >= 80 ? 'bg-green-100' : conformite >= 50 ? 'bg-amber-100' : 'bg-red-100'}`}>
            <CheckCircle2 className={`w-8 h-8 ${conformite >= 80 ? 'text-green-600' : conformite >= 50 ? 'text-amber-600' : 'text-red-600'}`} />
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
          <div
            className={`h-2 rounded-full transition-all ${conformite >= 80 ? 'bg-green-500' : conformite >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
            style={{ width: `${Math.min(conformite, 100)}%` }}
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <FileText className="w-4 h-4 text-green-600 mx-auto mb-1" />
            <p className="text-lg font-bold text-gray-900">{pdcCount}</p>
            <p className="text-[9px] text-gray-400">PDC Total</p>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-green-600 mx-auto mb-1" />
            <p className="text-lg font-bold text-gray-900">{pdcValides}</p>
            <p className="text-[9px] text-gray-400">PDC Validés</p>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <Wheat className="w-4 h-4 text-amber-600 mx-auto mb-1" />
            <p className="text-lg font-bold text-gray-900">{Math.round(data?.total_kg_recoltes || 0)}</p>
            <p className="text-[9px] text-gray-400">kg Récoltes</p>
          </div>
        </div>

        {/* CTA */}
        <button className="w-full mt-4 flex items-center justify-center gap-2 text-xs text-green-700 font-semibold bg-green-50 hover:bg-green-100 rounded-lg py-2 transition-colors" data-testid="ars1000-widget-cta">
          Voir le tableau de bord ARS 1000 <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

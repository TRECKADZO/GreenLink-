import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tokenService } from '../../../services/tokenService';
import { toast } from 'sonner';
import {
  Shield, AlertTriangle, Lock, Unlock, Package,
  Loader2, Home, ChevronRight, CheckCircle2, XCircle
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const SegregationPage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkResult, setCheckResult] = useState(null);
  const [checkLots, setCheckLots] = useState('');

  useEffect(() => { loadSegregation(); }, []);

  const loadSegregation = async () => {
    try {
      const token = tokenService.getToken();
      const res = await fetch(`${API}/api/traceability/segregation`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erreur');
      setData(await res.json());
    } catch {
      toast.error('Erreur chargement segregation');
    } finally {
      setLoading(false);
    }
  };

  const handleCheck = async () => {
    const lotIds = checkLots.split(',').map(l => l.trim()).filter(Boolean);
    if (lotIds.length < 2) {
      toast.error('Entrez au moins 2 codes lot separes par des virgules');
      return;
    }
    try {
      const token = tokenService.getToken();
      const res = await fetch(`${API}/api/traceability/segregation/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ lot_ids: lotIds }),
      });
      if (!res.ok) throw new Error('Erreur');
      setCheckResult(await res.json());
    } catch {
      toast.error('Erreur verification');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#1A3622]" />
      </div>
    );
  }

  const certifie = data?.certifie || { total_lots: 0, total_kg: 0, items: [] };
  const nonCertifie = data?.non_certifie || { total_lots: 0, total_kg: 0, items: [] };

  return (
    <div className="min-h-screen bg-[#FAF9F6]" data-testid="segregation-page">
      {/* Header */}
      <div className="bg-[#1A3622] relative overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-6 relative">
          <div className="flex items-center gap-2 text-white/50 text-xs mb-3">
            <button onClick={() => navigate('/cooperative/dashboard')} className="hover:text-white"><Home className="h-3.5 w-3.5" /></button>
            <ChevronRight className="h-3 w-3" />
            <button onClick={() => navigate('/cooperative/traceability')} className="hover:text-white">Tracabilite</button>
            <ChevronRight className="h-3 w-3" />
            <span className="text-white/80">Segregation</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Segregation Physique</h1>
          <p className="text-sm text-white/60 mt-1">Magasins virtuels certifie / non-certifie - Blocage automatique des melanges</p>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-8">
        {/* Two warehouses */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <WarehouseCard
            title={certifie.label || "Magasin Certifie ARS 1000"}
            icon={Lock}
            iconColor="text-emerald-600"
            borderColor="border-emerald-200"
            bgColor="bg-emerald-50"
            totalLots={certifie.total_lots}
            totalKg={certifie.total_kg}
            items={certifie.items}
            testid="warehouse-certifie"
          />
          <WarehouseCard
            title={nonCertifie.label || "Magasin Non-Certifie"}
            icon={Unlock}
            iconColor="text-amber-600"
            borderColor="border-amber-200"
            bgColor="bg-amber-50"
            totalLots={nonCertifie.total_lots}
            totalKg={nonCertifie.total_kg}
            items={nonCertifie.items}
            testid="warehouse-non-certifie"
          />
        </div>

        {/* Segregation check tool */}
        <div className="bg-white border border-[#E5E5E0] rounded-md overflow-hidden" data-testid="segregation-checker">
          <div className="px-5 py-4 border-b border-[#E5E5E0]">
            <h3 className="text-sm font-semibold text-[#1A3622]">Verificateur de segregation</h3>
            <p className="text-[10px] text-[#6B7280] mt-1">Entrez les codes lots pour verifier s'ils peuvent etre melanges</p>
          </div>
          <div className="p-5">
            <div className="flex gap-3">
              <input
                type="text"
                value={checkLots}
                onChange={(e) => setCheckLots(e.target.value)}
                placeholder="LOT-XXXXX, LOT-YYYYY"
                className="flex-1 px-3 py-2 text-sm border border-[#E5E5E0] rounded-md focus:outline-none focus:border-[#1A3622]"
                data-testid="input-check-lots"
              />
              <button
                onClick={handleCheck}
                className="px-4 py-2 text-sm bg-[#1A3622] text-white rounded-md hover:bg-[#112417] font-medium"
                data-testid="btn-check-segregation"
              >
                Verifier
              </button>
            </div>

            {checkResult && (
              <div className={`mt-4 p-4 rounded-md border ${checkResult.allowed ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`} data-testid="check-result">
                <div className="flex items-start gap-3">
                  {checkResult.allowed ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    {checkResult.alerte && (
                      <p className="text-sm font-bold text-red-800 mb-1">{checkResult.alerte}</p>
                    )}
                    <p className={`text-sm ${checkResult.allowed ? 'text-emerald-800' : 'text-red-800'}`}>
                      {checkResult.message}
                    </p>
                    {checkResult.lots_certifies && (
                      <div className="mt-2 text-xs text-[#6B7280]">
                        <p>Lots certifies: {checkResult.lots_certifies.join(', ')}</p>
                        <p>Lots non-certifies: {checkResult.lots_non_certifies.join(', ')}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Warning banner */}
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md flex items-start gap-3" data-testid="segregation-warning">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">Regle de segregation ARS 1000-2</p>
            <p className="text-xs text-red-700 mt-1">
              Le melange de lots certifies et non-certifies est strictement interdit.
              Chaque type de lot doit etre stocke dans un espace physique distinct (magasin virtuel).
              Toute tentative de melange declenche une alerte rouge.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const WarehouseCard = ({ title, icon: Icon, iconColor, borderColor, bgColor, totalLots, totalKg, items, testid }) => (
  <div className={`bg-white border ${borderColor} rounded-md overflow-hidden`} data-testid={testid}>
    <div className={`px-5 py-4 ${bgColor} border-b ${borderColor} flex items-center gap-3`}>
      <Icon className={`h-5 w-5 ${iconColor}`} strokeWidth={1.5} />
      <div>
        <h3 className="text-sm font-semibold text-[#111827]">{title}</h3>
        <p className="text-[10px] text-[#6B7280]">
          {totalLots} lot(s) - {(totalKg || 0).toLocaleString('fr-FR')} kg
        </p>
      </div>
    </div>
    <div className="p-5">
      {items.length === 0 ? (
        <p className="text-xs text-[#6B7280] text-center py-4">Aucun lot dans ce magasin</p>
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex items-center justify-between px-3 py-2 bg-[#F9FAFB] rounded">
              <div className="flex items-center gap-2">
                <Package className="h-3.5 w-3.5 text-[#6B7280]" strokeWidth={1.5} />
                <span className="text-xs font-medium text-[#374151]">{item.label}</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-[#111827]">{item.lots} lots</span>
                <span className="text-[10px] text-[#6B7280] ml-2">{(item.quantite_kg || 0).toLocaleString('fr-FR')} kg</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);

export default SegregationPage;

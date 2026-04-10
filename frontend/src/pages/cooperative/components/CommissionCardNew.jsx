import { tokenService } from "../../../services/tokenService";
import React, { useState } from 'react';
import { Pencil, Save, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const CommissionCardNew = ({ coopInfo, onUpdated }) => {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ratePercent, setRatePercent] = useState(((coopInfo?.commission_rate || 0.10) * 100).toFixed(0));

  const handleSave = async () => {
    const val = parseFloat(ratePercent);
    if (isNaN(val) || val < 0 || val > 100) {
      toast.error('Le taux doit etre entre 0% et 100%');
      return;
    }
    setSaving(true);
    try {
      const token = tokenService.getToken();
      const res = await fetch(`${API_URL}/api/cooperative/settings/commission-rate`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ commission_rate: val / 100 }),
      });
      if (res.ok) {
        toast.success('Taux mis a jour');
        setEditing(false);
        onUpdated?.();
      } else {
        const d = await res.json();
        toast.error(d.detail || 'Erreur');
      }
    } catch {
      toast.error('Erreur reseau');
    } finally {
      setSaving(false);
    }
  };

  const currentRate = ((coopInfo?.commission_rate || 0.10) * 100).toFixed(0);

  return (
    <div className="bg-white border border-[#E5E5E0] rounded-md overflow-hidden gl-animate-in gl-stagger-6" data-testid="commission-card">
      <div className="px-5 py-4 border-b border-[#E5E5E0] flex items-center justify-between">
        <h3 className="gl-heading text-sm font-semibold text-[#1A3622] tracking-tight">Commission</h3>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-[#6B7280] hover:text-[#1A3622] transition-colors"
            data-testid="edit-commission-btn"
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        )}
      </div>
      <div className="p-5">
        {editing ? (
          <div className="space-y-3" data-testid="commission-edit-form">
            <div className="flex items-center justify-center gap-1">
              <input
                type="number" min="0" max="100" step="1" value={ratePercent}
                onChange={e => setRatePercent(e.target.value)}
                className="w-20 gl-heading text-3xl font-bold text-center border-b-2 border-[#1A3622] bg-transparent outline-none text-[#111827]"
                data-testid="commission-rate-input"
              />
              <span className="text-xl font-bold text-[#9CA3AF]">%</span>
            </div>
            <div className="flex justify-center gap-2 pt-1">
              <button
                onClick={() => { setEditing(false); setRatePercent(currentRate); }}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#6B7280] border border-[#E5E5E0] rounded-md hover:bg-[#F3F4F6] transition-colors"
              >
                <X className="h-3 w-3" />Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-[#1A3622] rounded-md hover:bg-[#112417] transition-colors disabled:opacity-50"
                data-testid="save-commission-btn"
              >
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                Enregistrer
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <p className="gl-heading text-4xl font-bold text-[#1A3622]" data-testid="commission-rate-display">
              {currentRate}%
            </p>
            <p className="text-[10px] tracking-[0.06em] uppercase font-bold text-[#9CA3AF] mt-1">Taux de commission</p>
          </div>
        )}
        <div className="mt-4 p-3 bg-[#FAF9F6] rounded-md border border-[#E5E5E0]">
          <p className="text-[11px] text-[#6B7280] leading-relaxed">
            Prelevee sur les primes carbone avant redistribution aux membres.
          </p>
        </div>
      </div>
    </div>
  );
};

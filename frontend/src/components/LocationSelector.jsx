import React, { useState, useEffect } from 'react';
import { getRegions, getDepartements, getSousPrefectures } from '../data/ci_admin';

/**
 * Selecteur en cascade: Region → Departement → Sous-prefecture → Village (libre)
 * Conforme a la structure administrative de Cote d'Ivoire (509 sous-prefectures)
 */
export const LocationSelector = ({ region, departement, sousPrefecture, village, onChange, compact = false }) => {
  const [regions] = useState(getRegions());
  const [departements, setDepartements] = useState([]);
  const [sousPrefectures, setSousPrefectures] = useState([]);

  useEffect(() => {
    setDepartements(region ? getDepartements(region) : []);
  }, [region]);

  useEffect(() => {
    setSousPrefectures(region && departement ? getSousPrefectures(region, departement) : []);
  }, [region, departement]);

  const handleRegionChange = (v) => {
    onChange({ region: v, departement: '', sous_prefecture: '', village: village || '' });
  };
  const handleDeptChange = (v) => {
    onChange({ region, departement: v, sous_prefecture: '', village: village || '' });
  };
  const handleSPChange = (v) => {
    onChange({ region, departement, sous_prefecture: v, village: village || '' });
  };
  const handleVillageChange = (v) => {
    onChange({ region, departement, sous_prefecture: sousPrefecture, village: v });
  };

  const cls = "w-full px-3 py-2 text-xs border border-[#E5E5E0] rounded-md focus:outline-none focus:border-[#1A3622] bg-white";
  const lbl = "block text-[10px] font-medium text-[#374151] mb-1";

  return (
    <div className={compact ? "grid grid-cols-2 gap-3" : "grid grid-cols-1 md:grid-cols-2 gap-3"} data-testid="location-selector">
      <div>
        <label className={lbl}>Region</label>
        <select value={region || ''} onChange={e => handleRegionChange(e.target.value)} className={cls} data-testid="select-region">
          <option value="">-- Region --</option>
          {regions.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <div>
        <label className={lbl}>Departement</label>
        <select value={departement || ''} onChange={e => handleDeptChange(e.target.value)} className={cls} data-testid="select-departement" disabled={!region}>
          <option value="">-- Departement --</option>
          {departements.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      <div>
        <label className={lbl}>Sous-prefecture</label>
        <select value={sousPrefecture || ''} onChange={e => handleSPChange(e.target.value)} className={cls} data-testid="select-sous-pref" disabled={!departement}>
          <option value="">-- Sous-prefecture --</option>
          {sousPrefectures.map(sp => <option key={sp} value={sp}>{sp}</option>)}
        </select>
      </div>
      <div>
        <label className={lbl}>Village / Section</label>
        <input type="text" value={village || ''} onChange={e => handleVillageChange(e.target.value)} placeholder="Nom du village" className={cls} data-testid="input-village" autoComplete="off" />
      </div>
    </div>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
import { REGIONS_CI, getDepartements, getSousPrefectures } from '../data/divisionsCI';

/**
 * Composant de sélection géographique en cascade
 * Région -> Département -> Sous-préfecture
 * 
 * Props:
 * - region, departement, sousPrefecture: valeurs actuelles
 * - onChange(field, value): callback pour mise à jour
 * - variant: 'light' (defaut) | 'dark' (pour RegisterFarmerPage)
 * - showLabels: boolean (defaut true)
 * - className: classe CSS du conteneur
 */
export const GeoSelectCI = ({
  region = '',
  departement = '',
  sousPrefecture = '',
  onChange,
  variant = 'light',
  showLabels = true,
  className = '',
}) => {
  const [searchRegion, setSearchRegion] = useState('');
  const [searchDep, setSearchDep] = useState('');
  const [searchSP, setSearchSP] = useState('');

  const filteredRegions = useMemo(() => {
    if (!searchRegion) return REGIONS_CI;
    const q = searchRegion.toLowerCase();
    return REGIONS_CI.filter(r => r.toLowerCase().includes(q));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchRegion]);

  const departements = useMemo(() => getDepartements(region), [region]);
  const filteredDep = useMemo(() => {
    if (!searchDep) return departements;
    const q = searchDep.toLowerCase();
    return departements.filter(d => d.toLowerCase().includes(q));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departements, searchDep]);

  const sousPrefectures = useMemo(() => getSousPrefectures(region, departement), [region, departement]);
  const filteredSP = useMemo(() => {
    if (!searchSP) return sousPrefectures;
    const q = searchSP.toLowerCase();
    return sousPrefectures.filter(s => s.toLowerCase().includes(q));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sousPrefectures, searchSP]);

  // Reset dependent fields when parent changes
  useEffect(() => {
    if (region && departement && !departements.includes(departement)) {
      onChange('department', '');
      onChange('sous_prefecture', '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region]);

  useEffect(() => {
    if (departement && sousPrefecture && !sousPrefectures.includes(sousPrefecture)) {
      onChange('sous_prefecture', '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departement]);

  const isDark = variant === 'dark';
  const selectClass = isDark
    ? 'bg-gray-800/50 border-gray-700 text-white'
    : 'border border-gray-200 rounded-lg px-3 py-2 text-sm w-full';
  const labelClass = isDark
    ? 'text-sm text-gray-300 block mb-1'
    : 'text-xs text-gray-600 font-medium block mb-1';

  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 gap-3 ${className}`}>
      {/* Région */}
      <div>
        {showLabels && <label className={labelClass}>Region</label>}
        <select
          className={selectClass}
          value={region}
          onChange={(e) => {
            onChange('region', e.target.value);
            setSearchRegion('');
          }}
          data-testid="geo-region-select"
        >
          <option value="">-- Region --</option>
          {REGIONS_CI.map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {/* Département */}
      <div>
        {showLabels && <label className={labelClass}>Departement</label>}
        <select
          className={selectClass}
          value={departement}
          onChange={(e) => {
            onChange('department', e.target.value);
            setSearchDep('');
          }}
          disabled={!region}
          data-testid="geo-departement-select"
        >
          <option value="">-- Departement --</option>
          {departements.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      {/* Sous-préfecture */}
      <div>
        {showLabels && <label className={labelClass}>Sous-prefecture</label>}
        <select
          className={selectClass}
          value={sousPrefecture}
          onChange={(e) => onChange('sous_prefecture', e.target.value)}
          disabled={!departement}
          data-testid="geo-sous-prefecture-select"
        >
          <option value="">-- Sous-prefecture --</option>
          {sousPrefectures.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

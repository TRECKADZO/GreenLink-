import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { MapPin } from 'lucide-react';

const RISK_COLORS = { critique: '#B91C1C', eleve: '#C25E30', modere: '#D4AF37', faible: '#1A3622' };

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="bg-white border border-[#E5E5E0] rounded-md p-3 shadow-lg text-xs">
      <p className="font-semibold text-[#111827] mb-1">{d.zone}</p>
      <div className="space-y-0.5">
        {d.critique > 0 && <p className="text-[#B91C1C]">Critique: {d.critique}</p>}
        {d.eleve > 0 && <p className="text-[#C25E30]">Eleve: {d.eleve}</p>}
        {d.modere > 0 && <p className="text-[#D4AF37]">Modere: {d.modere}</p>}
        {d.faible > 0 && <p className="text-[#1A3622]">Faible: {d.faible}</p>}
      </div>
    </div>
  );
};

const getBarColor = (entry) => {
  if (entry.critique > 0) return RISK_COLORS.critique;
  if (entry.eleve > 0) return RISK_COLORS.eleve;
  if (entry.modere > 0) return RISK_COLORS.modere;
  return RISK_COLORS.faible;
};

export const RiskByZoneChart = ({ data }) => {
  if (!data?.length) return null;

  return (
    <div className="bg-white border border-[#E5E5E0] rounded-md overflow-hidden gl-animate-in gl-stagger-5" data-testid="risk-zone-chart">
      <div className="px-5 py-4 border-b border-[#E5E5E0]">
        <h3 className="gl-heading text-sm font-semibold text-[#1A3622] tracking-tight flex items-center gap-2">
          <MapPin className="h-4 w-4" strokeWidth={1.5} />
          Risque par Zone
        </h3>
        <p className="text-[11px] text-[#6B7280] mt-0.5">Top zones par niveau de risque SSRTE</p>
      </div>
      <div className="p-5">
        <ResponsiveContainer width="100%" height={Math.max(data.length * 36, 120)}>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
            <YAxis dataKey="zone" type="category" tick={{ fontSize: 10, fill: '#374151', fontWeight: 500 }} tickLine={false} axisLine={false} width={80} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="total" name="Visites" radius={[0, 4, 4, 0]} barSize={18}>
              {data.map((entry, i) => (
                <Cell key={i} fill={getBarColor(entry)} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center justify-center gap-4 mt-3">
          {Object.entries(RISK_COLORS).map(([key, color]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
              <span className="text-[10px] text-[#6B7280] capitalize">{key}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart } from 'recharts';
import { Shield } from 'lucide-react';

const RISK_COLORS = {
  critique: '#B91C1C',
  eleve: '#C25E30',
  modere: '#D4AF37',
  faible: '#1A3622',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#E5E5E0] rounded-md p-3 shadow-lg text-xs">
      <p className="font-semibold text-[#111827] mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color || p.fill }} />
          <span className="text-[#6B7280]">{p.name}:</span>
          <span className="font-semibold text-[#111827]">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

export const SSRTETrendsChart = ({ data }) => {
  if (!data?.length) return null;

  return (
    <div className="bg-white border border-[#E5E5E0] rounded-md overflow-hidden gl-animate-in gl-stagger-4" data-testid="ssrte-trends-chart">
      <div className="px-5 py-4 border-b border-[#E5E5E0]">
        <h3 className="gl-heading text-sm font-semibold text-[#1A3622] tracking-tight flex items-center gap-2">
          <Shield className="h-4 w-4" strokeWidth={1.5} />
          Tendances SSRTE Mensuelles
        </h3>
        <p className="text-[11px] text-[#6B7280] mt-0.5">Repartition des risques par mois</p>
      </div>
      <div className="p-5">
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={{ stroke: '#E5E5E0' }} />
            <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="faible" name="Faible" stackId="risk" fill={RISK_COLORS.faible} radius={[0, 0, 0, 0]} />
            <Bar dataKey="modere" name="Modere" stackId="risk" fill={RISK_COLORS.modere} />
            <Bar dataKey="eleve" name="Eleve" stackId="risk" fill={RISK_COLORS.eleve} />
            <Bar dataKey="critique" name="Critique" stackId="risk" fill={RISK_COLORS.critique} radius={[3, 3, 0, 0]} />
            <Line type="monotone" dataKey="enfants" name="Enfants" stroke="#111827" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3, fill: '#111827' }} />
          </ComposedChart>
        </ResponsiveContainer>
        <div className="flex items-center justify-center gap-4 mt-3 flex-wrap">
          {Object.entries(RISK_COLORS).map(([key, color]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
              <span className="text-[10px] text-[#6B7280] capitalize">{key}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0 border-t-2 border-dashed border-[#111827]" />
            <span className="text-[10px] text-[#6B7280]">Enfants</span>
          </div>
        </div>
      </div>
    </div>
  );
};

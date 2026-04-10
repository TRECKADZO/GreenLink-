import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart } from 'recharts';
import { TrendingUp } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#E5E5E0] rounded-md p-3 shadow-lg text-xs">
      <p className="font-semibold text-[#111827] mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={`el-${i}`} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-[#6B7280]">{p.name}:</span>
          <span className="font-semibold text-[#111827]">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

export const REDDEvolutionChart = ({ data }) => {
  if (!data?.length) return null;

  return (
    <div className="bg-white border border-[#E5E5E0] rounded-md overflow-hidden gl-animate-in gl-stagger-3" data-testid="redd-evolution-chart">
      <div className="px-5 py-4 border-b border-[#E5E5E0]">
        <h3 className="gl-heading text-sm font-semibold text-[#1A3622] tracking-tight flex items-center gap-2">
          <TrendingUp className="h-4 w-4" strokeWidth={1.5} />
          Evolution CO₂ & Score Carbone
        </h3>
        <p className="text-[11px] text-[#6B7280] mt-0.5">6 derniers mois</p>
      </div>
      <div className="p-5">
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={{ stroke: '#E5E5E0' }} />
            <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} domain={[0, 10]} />
            <Tooltip content={<CustomTooltip />} />
            <Area yAxisId="left" type="monotone" dataKey="co2_tonnes" name="CO₂ (tonnes)" fill="#1A3622" fillOpacity={0.1} stroke="#1A3622" strokeWidth={2} dot={{ r: 3, fill: '#1A3622' }} />
            <Line yAxisId="right" type="monotone" dataKey="score_moyen" name="Score Carbone /10" stroke="#D4AF37" strokeWidth={2} dot={{ r: 4, fill: '#D4AF37', stroke: '#fff', strokeWidth: 2 }} />
          </ComposedChart>
        </ResponsiveContainer>
        <div className="flex items-center justify-center gap-6 mt-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1.5 rounded-full bg-[#1A3622]" />
            <span className="text-[10px] text-[#6B7280]">CO₂ (tonnes)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1.5 rounded-full bg-[#D4AF37]" />
            <span className="text-[10px] text-[#6B7280]">Score Carbone /10</span>
          </div>
        </div>
      </div>
    </div>
  );
};

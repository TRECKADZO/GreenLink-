import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Leaf } from 'lucide-react';

const COLORS = ['#1A3622', '#065F46', '#D4AF37', '#C25E30', '#2563EB', '#7C3AED', '#059669', '#B45309', '#DC2626'];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-white border border-[#E5E5E0] rounded-md p-3 shadow-lg text-xs">
      <p className="font-semibold text-[#111827]">{d.name}</p>
      <p className="text-[#6B7280]">{d.payload.count} producteurs ({d.value}%)</p>
    </div>
  );
};

export const PracticesDonutChart = ({ practices }) => {
  if (!practices || Object.keys(practices).length === 0) return null;

  const data = Object.entries(practices).map(([label, info]) => ({
    name: label,
    value: info.pct,
    count: info.count,
  }));

  const avgAdoption = Math.round(data.reduce((sum, d) => sum + d.value, 0) / data.length);

  return (
    <div className="bg-white border border-[#E5E5E0] rounded-md overflow-hidden gl-animate-in gl-stagger-6" data-testid="practices-donut-chart">
      <div className="px-5 py-4 border-b border-[#E5E5E0]">
        <h3 className="gl-heading text-sm font-semibold text-[#1A3622] tracking-tight flex items-center gap-2">
          <Leaf className="h-4 w-4" strokeWidth={1.5} />
          Adoption des Pratiques
        </h3>
        <p className="text-[11px] text-[#6B7280] mt-0.5">Taux d'adoption par pratique durable</p>
      </div>
      <div className="p-5 flex flex-col items-center">
        <div className="relative" style={{ width: 180, height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
              >
                {data.map((_, i) => (
                  <Cell key={`el-${i}`} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="gl-heading text-2xl font-bold text-[#1A3622]">{avgAdoption}%</span>
            <span className="text-[9px] uppercase tracking-[0.08em] font-bold text-[#9CA3AF]">Moyenne</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mt-4">
          {data.map((d, i) => (
            <div key={d.name} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              <span className="text-[10px] text-[#374151] font-medium">{d.name}</span>
              <span className="gl-mono text-[10px] text-[#6B7280] ml-auto">{d.value}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

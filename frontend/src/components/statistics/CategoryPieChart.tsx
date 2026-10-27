import React, { useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { type CategoryStat } from '../../api/analytics';

interface CategoryPieChartProps {
  categories: CategoryStat[];
  formatPrimary: (val: number | string) => string;
}

export const CategoryPieChart: React.FC<CategoryPieChartProps> = ({
  categories,
  formatPrimary,
}) => {
  const [activeType, setActiveType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');

  const filtered = categories.filter((c) => c.type === activeType);
  const data = filtered.map((c) => ({
    name: c.category_name,
    value: typeof c.total_amount_primary === 'string' ? parseFloat(c.total_amount_primary) : c.total_amount_primary,
    color: c.color || (activeType === 'EXPENSE' ? '#F43F5E' : '#10B981'),
    percentage: c.percentage,
  }));

  const total = data.reduce((acc, curr) => acc + curr.value, 0);

  if (data.length === 0) return null;

  return (
    <div className="p-5 rounded-2xl bg-[#11141D] border border-white/[0.07] space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">Category Distribution</h3>
        <div className="flex rounded-lg bg-[#161A26] p-0.5 border border-white/[0.08] text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveType('EXPENSE')}
            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
              activeType === 'EXPENSE'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Expenses
          </button>
          <button
            type="button"
            onClick={() => setActiveType('INCOME')}
            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
              activeType === 'INCOME'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Income
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        <div className="h-56 relative flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    return (
                      <div className="p-2.5 bg-[#171B26] border border-white/[0.1] rounded-xl shadow-xl text-xs space-y-0.5">
                        <div className="font-bold text-white">{item.name}</div>
                        <div className="text-indigo-400 font-semibold">{formatPrimary(item.value)}</div>
                        <div className="text-slate-400 text-[10px]">{item.percentage}%</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[10px] text-slate-400 font-medium">Total</span>
            <span className="text-xs font-bold text-white tnum">{formatPrimary(total)}</span>
          </div>
        </div>

        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
          {data.map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between p-1.5 rounded-lg bg-[#161A26]/50 border border-white/[0.04] text-xs"
            >
              <div className="flex items-center gap-2 truncate pr-2">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-slate-300 font-medium truncate">{item.name}</span>
              </div>
              <div className="text-right shrink-0">
                <span className="text-white font-semibold tnum mr-2">{formatPrimary(item.value)}</span>
                <span className="text-[10px] text-slate-400 tnum">({item.percentage}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

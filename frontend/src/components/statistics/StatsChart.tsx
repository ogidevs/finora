import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';

interface ChartDataItem {
  name: string;
  amount: number;
  color: string;
  percentage: number;
}

interface StatsChartProps {
  chartData: ChartDataItem[];
  formatPrimary: (val: number | string) => string;
}

export const StatsChart: React.FC<StatsChartProps> = ({
  chartData,
  formatPrimary,
}) => {
  if (chartData.length === 0) return null;

  return (
    <div className="p-5 rounded-2xl bg-[#11141D] border border-white/[0.07] space-y-4">
      <h3 className="text-sm font-bold text-white">Expense Distribution</h3>

      <div className="h-60 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
            <XAxis
              dataKey="name"
              stroke="#64748B"
              fontSize={11}
              tickLine={false}
              interval={0}
              angle={-15}
              textAnchor="end"
            />
            <YAxis
              stroke="#64748B"
              fontSize={11}
              tickLine={false}
              tickFormatter={(val) => `${val}`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload as ChartDataItem;
                  return (
                    <div className="p-2.5 bg-[#171B26] border border-white/[0.1] rounded-xl shadow-xl text-xs space-y-0.5">
                      <div className="font-bold text-white">{item.name}</div>
                      <div className="text-indigo-400 font-semibold">{formatPrimary(item.amount)}</div>
                      <div className="text-slate-400 text-[10px]">{item.percentage}% of expenses</div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

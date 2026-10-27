import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { type AnalyticsTrendsResponse } from '../../api/analytics';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MonthlyTrendsChartProps {
  trendsData: AnalyticsTrendsResponse | null;
  loading: boolean;
  formatPrimary: (val: number | string) => string;
}

export const MonthlyTrendsChart: React.FC<MonthlyTrendsChartProps> = ({
  trendsData,
  loading,
  formatPrimary,
}) => {
  if (loading) {
    return (
      <div className="p-8 rounded-2xl bg-[#11141D] border border-white/[0.07] text-center text-xs text-slate-400">
        Loading historical trends...
      </div>
    );
  }

  const hasData = Boolean(
    trendsData &&
      trendsData.trends.length > 0 &&
      trendsData.trends.some((t) => {
        const inc = typeof t.income_primary === 'string' ? parseFloat(t.income_primary) : Number(t.income_primary || 0);
        const exp = typeof t.expense_primary === 'string' ? parseFloat(t.expense_primary) : Number(t.expense_primary || 0);
        return inc > 0 || exp > 0;
      })
  );

  if (!hasData || !trendsData) {
    return (
      <div className="p-8 sm:p-12 rounded-2xl bg-[#11141D] border border-white/[0.07] text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
          <TrendingUp className="w-6 h-6" />
        </div>
        <div className="space-y-1.5 max-w-sm mx-auto">
          <h3 className="text-sm sm:text-base font-bold text-white">No Monthly Trend Data</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            There are no recorded transactions yet to display cashflow trends. Once you record transactions, your monthly income, expense, and net totals will appear here.
          </p>
        </div>
      </div>
    );
  }

  const chartData = trendsData.trends.map((t) => ({
    name: t.month_label,
    Income: typeof t.income_primary === 'string' ? parseFloat(t.income_primary) : t.income_primary,
    Expense: typeof t.expense_primary === 'string' ? parseFloat(t.expense_primary) : t.expense_primary,
    Difference: typeof (t.difference_primary ?? t.net_primary) === 'string'
      ? parseFloat(String(t.difference_primary ?? t.net_primary))
      : Number(t.difference_primary ?? t.net_primary ?? 0),
  }));

  return (
    <div className="p-5 rounded-2xl bg-[#11141D] border border-white/[0.07] space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-white">Monthly Cashflow Trends</h3>
          <p className="text-xs text-slate-400">Historical income vs expenses over time</p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="px-2.5 py-1 rounded-lg bg-[#161A26] border border-white/[0.06] flex items-center gap-1.5">
            <span className="text-slate-400">Avg Exp:</span>
            <span className="font-bold text-rose-400 tnum">{formatPrimary(trendsData.average_monthly_expense)}</span>
          </div>
          <div className="px-2.5 py-1 rounded-lg bg-[#161A26] border border-white/[0.06] flex items-center gap-1.5">
            <span className="text-slate-400">Avg Inc:</span>
            <span className="font-bold text-emerald-400 tnum">{formatPrimary(trendsData.average_monthly_income)}</span>
          </div>
        </div>
      </div>

      <div className="h-64 w-full pt-2">
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
                  const item = payload[0].payload;
                  const diffVal = Number(item.Difference || 0);
                  const isPos = diffVal >= 0;

                  return (
                    <div className="p-3 bg-[#171B26] border border-white/[0.1] rounded-xl shadow-xl text-xs space-y-1">
                      <div className="font-bold text-white mb-1">{item.name}</div>
                      <div className="text-emerald-400 flex justify-between gap-3">
                        <span>Income:</span>
                        <span className="font-semibold">+{formatPrimary(item.Income)}</span>
                      </div>
                      <div className="text-rose-400 flex justify-between gap-3">
                        <span>Expense:</span>
                        <span className="font-semibold">-{formatPrimary(item.Expense)}</span>
                      </div>
                      <div className="text-slate-300 pt-1 border-t border-white/[0.06] flex justify-between gap-3">
                        <span>Total:</span>
                        <span className={`font-semibold ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isPos ? '+' : ''}{formatPrimary(diffVal)}
                        </span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
              iconType="circle"
              iconSize={8}
            />
            <Bar dataKey="Income" fill="#10B981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Expense" fill="#F43F5E" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {trendsData.highest_expense_month && (
          <div className="p-2.5 rounded-xl bg-[#161A26] border border-white/[0.05] flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-rose-400" />
              Highest Spending Month
            </span>
            <span className="font-bold text-white">{trendsData.highest_expense_month}</span>
          </div>
        )}
        {trendsData.lowest_expense_month && (
          <div className="p-2.5 rounded-xl bg-[#161A26] border border-white/[0.05] flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
              Lowest Spending Month
            </span>
            <span className="font-bold text-white">{trendsData.lowest_expense_month}</span>
          </div>
        )}
      </div>
    </div>
  );
};

import React from 'react';
import { ArrowDownLeft, ArrowUpRight, ArrowUpDown } from 'lucide-react';

interface SummaryMetricsProps {
  income: number | string;
  expense: number | string;
  net: number | string;
  formatPrimary: (val: number | string) => string;
}

export const SummaryMetrics: React.FC<SummaryMetricsProps> = ({
  income,
  expense,
  net,
  formatPrimary,
}) => {
  const netNum = Number(net || 0);
  const isPositive = netNum >= 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="p-5 rounded-2xl bg-[#11141D] border border-white/[0.07] flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-2">
          <span>Income</span>
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-2xl font-bold text-emerald-400 tnum tracking-tight">
          +{formatPrimary(income || 0)}
        </div>
      </div>

      <div className="p-5 rounded-2xl bg-[#11141D] border border-white/[0.07] flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-2">
          <span>Expense</span>
          <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <ArrowDownLeft className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-2xl font-bold text-rose-400 tnum tracking-tight">
          -{formatPrimary(expense || 0)}
        </div>
      </div>

      <div className="p-5 rounded-2xl bg-[#11141D] border border-white/[0.07] flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-2">
          <span>Total</span>
          <div
            className={`p-1.5 rounded-lg border bg-purple-500/10 text-purple-400 border-purple-500/20`}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className={`text-2xl font-bold tnum tracking-tight ${isPositive ? 'text-white' : 'text-rose-400'}`}>
          {isPositive ? '+' : ''}{formatPrimary(netNum)}
        </div>
      </div>
    </div>
  );
};

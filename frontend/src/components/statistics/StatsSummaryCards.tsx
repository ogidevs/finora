import React from 'react';
import { ArrowDownLeft, ArrowUpRight, ArrowUpDown, PiggyBank } from 'lucide-react';
import { type CategoryAnalyticsResponse } from '../../api/analytics';

interface StatsSummaryCardsProps {
  data: CategoryAnalyticsResponse;
  formatPrimary: (val: number | string) => string;
}

export const StatsSummaryCards: React.FC<StatsSummaryCardsProps> = ({
  data,
  formatPrimary,
}) => {
  const diffVal = Number(data.net_difference_primary ?? data.net_savings_primary ?? 0);
  const isNetPositive = diffVal >= 0;
  const savingsVal = Number(data.total_savings_primary || 0);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
      <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-[#11141D] border border-white/[0.07] flex flex-col justify-between">
        <div className="flex items-center justify-between text-[11px] sm:text-xs font-semibold text-slate-400 mb-1 sm:mb-2">
          <span>Expenses</span>
          <div className="p-1 rounded-lg bg-rose-500/10 text-rose-400">
            <ArrowDownLeft className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-base sm:text-xl font-bold text-rose-400 tnum tracking-tight">
          -{formatPrimary(data.total_expense_primary)}
        </div>
      </div>

      <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-[#11141D] border border-white/[0.07] flex flex-col justify-between">
        <div className="flex items-center justify-between text-[11px] sm:text-xs font-semibold text-slate-400 mb-1 sm:mb-2">
          <span>Income</span>
          <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400">
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-base sm:text-xl font-bold text-emerald-400 tnum tracking-tight">
          +{formatPrimary(data.total_income_primary)}
        </div>
      </div>

      <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-[#11141D] border border-white/[0.07] flex flex-col justify-between">
        <div className="flex items-center justify-between text-[11px] sm:text-xs font-semibold text-slate-400 mb-1 sm:mb-2">
          <span>Total</span>
          <div className={`p-1 rounded-lg ${isNetPositive ? 'bg-indigo-500/10 text-indigo-400' : 'bg-rose-500/10 text-rose-400'}`}>
            <ArrowUpDown className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className={`text-base sm:text-xl font-bold tnum tracking-tight ${isNetPositive ? 'text-white' : 'text-rose-400'}`}>
          {isNetPositive ? '+' : ''}{formatPrimary(diffVal)}
        </div>
      </div>

      <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-[#11141D] border border-white/[0.07] flex flex-col justify-between">
        <div className="flex items-center justify-between text-[11px] sm:text-xs font-semibold text-slate-400 mb-1 sm:mb-2">
          <span>Savings (Accounts)</span>
          <div className="p-1 rounded-lg bg-purple-500/10 text-purple-400">
            <PiggyBank className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-base sm:text-xl font-bold text-white tnum tracking-tight">
          {formatPrimary(savingsVal)}
        </div>
        <span className="text-[9px] sm:text-[10px] text-slate-500 mt-1">Total in savings accounts</span>
      </div>
    </div>
  );
};

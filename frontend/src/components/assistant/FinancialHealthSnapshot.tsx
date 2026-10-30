import React from 'react';
import { ArrowDownLeft, ArrowUpRight, ArrowUpDown, PiggyBank, AlertTriangle, TrendingUp } from 'lucide-react';
import { type FinancialFacts } from '../../api/assistant';

interface FinancialHealthSnapshotProps {
  facts: FinancialFacts;
  formatPrimary: (val: number | string) => string;
}

export const FinancialHealthSnapshot: React.FC<FinancialHealthSnapshotProps> = ({
  facts,
  formatPrimary,
}) => {
  const isDiffPositive = facts.difference >= 0;
  const isExpChangePositive = facts.mom_expense_change_pct > 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5">
        <div className="p-3 rounded-xl bg-[#141824] border border-white/[0.06]">
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-400 mb-1">
            <span>Period Total</span>
            <div className={`p-1 rounded-md ${isDiffPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
              <ArrowUpDown className="w-3 h-3" />
            </div>
          </div>
          <div className={`text-base font-bold tnum ${isDiffPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isDiffPositive ? '+' : ''}{formatPrimary(facts.difference)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Income minus expenses
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#141824] border border-white/[0.06]">
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-400 mb-1">
            <span>MoM Expense Change</span>
            <div className={`p-1 rounded-md ${isExpChangePositive ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
              {isExpChangePositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
            </div>
          </div>
          <div className={`text-base font-bold tnum ${isExpChangePositive ? 'text-rose-400' : 'text-emerald-400'}`}>
            {isExpChangePositive ? '+' : ''}{facts.mom_expense_change_pct.toFixed(1)}%
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            vs. {facts.previous_period}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#141824] border border-white/[0.06]">
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-400 mb-1">
            <span>Savings (Accounts)</span>
            <div className="p-1 rounded-md bg-purple-500/10 text-purple-400">
              <PiggyBank className="w-3 h-3" />
            </div>
          </div>
          <div className="text-base font-bold text-white tnum">
            {formatPrimary(facts.savings_account_balance)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Dedicated savings accounts
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#141824] border border-white/[0.06]">
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-400 mb-1">
            <span>Savings Transfers</span>
            <div className="p-1 rounded-md bg-indigo-500/10 text-indigo-400">
              <TrendingUp className="w-3 h-3" />
            </div>
          </div>
          <div className="text-base font-bold text-white tnum">
            {formatPrimary(facts.savings_net_transfers)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Transferred this period
          </div>
        </div>
      </div>

      {facts.category_spikes.length > 0 && (
        <div className="p-3 rounded-xl bg-amber-500/[0.08] border border-amber-500/20 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Category Spending Spikes</span>
          </div>
          <div className="space-y-1">
            {facts.category_spikes.map((spike) => (
              <div key={spike.category_name} className="flex items-center justify-between text-xs text-slate-300">
                <span className="font-medium text-amber-200">{spike.category_name}</span>
                <span className="tnum font-bold text-amber-400">
                  +{spike.change_pct.toFixed(0)}% ({formatPrimary(spike.current_amount)})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {facts.top_categories.length > 0 && (
        <div className="p-3 rounded-xl bg-[#141824] border border-white/[0.06] space-y-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Top Expense Categories
          </div>
          <div className="space-y-1.5">
            {facts.top_categories.slice(0, 3).map((item) => (
              <div key={item.category_name} className="space-y-0.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium truncate">{item.category_name}</span>
                  <span className="text-slate-400 tnum font-semibold">
                    {formatPrimary(item.current_amount)} ({item.share_pct.toFixed(0)}%)
                  </span>
                </div>
                <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full"
                    style={{ width: `${Math.min(item.share_pct, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

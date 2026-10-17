import React from 'react';
import { X, Check, ArrowDownLeft, ArrowUpRight, Scale, SlidersHorizontal } from 'lucide-react';

interface SelectedTransactionsBarProps {
  selectedCount: number;
  totalExpense: number;
  totalIncome: number;
  difference: number;
  totalAbsolute: number;
  formatPrimary: (val: number | string) => string;
  onClearSelection: () => void;
  onOpenMassEdit?: () => void;
}

export const SelectedTransactionsBar: React.FC<SelectedTransactionsBarProps> = ({
  selectedCount,
  totalExpense,
  totalIncome,
  difference,
  totalAbsolute,
  formatPrimary,
  onClearSelection,
  onOpenMassEdit,
}) => {
  if (selectedCount === 0) return null;

  const hasExpenses = totalExpense > 0;
  const hasIncome = totalIncome > 0;
  const isMixed = hasExpenses && hasIncome;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-2xl transition-all duration-300">
      <div className="bg-[#121624]/95 backdrop-blur-md border border-indigo-500/30 shadow-2xl shadow-black/80 rounded-2xl p-3 px-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm shadow-indigo-600/40">
            <Check className="w-4 h-4" />
          </div>

          <div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>{selectedCount} Selected</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isMixed ? (
            <div className="flex items-center gap-2 text-xs font-semibold tnum">
              <span className="flex items-center gap-1 text-rose-400">
                <ArrowDownLeft className="w-3 h-3" />
                -{formatPrimary(totalExpense)}
              </span>
              <span className="text-slate-600">&bull;</span>
              <span className="flex items-center gap-1 text-emerald-400">
                <ArrowUpRight className="w-3 h-3" />
                +{formatPrimary(totalIncome)}
              </span>
              <span className="text-slate-600">&bull;</span>
              <span
                className={`flex items-center gap-1 ${difference >= 0 ? 'text-indigo-300' : 'text-amber-400'
                  }`}
                title="Total (Income - Expense)"
              >
                <Scale className="w-3 h-3" />
                {difference >= 0 ? '+' : ''}
                {formatPrimary(difference)}
              </span>
            </div>
          ) : hasExpenses ? (
            <div className="text-right">
              <div className="text-xs text-slate-400 font-medium">Total Expenses</div>
              <div className="text-sm font-bold text-rose-400 tnum flex items-center gap-1 justify-end">
                <ArrowDownLeft className="w-3.5 h-3.5" />
                -{formatPrimary(totalExpense)}
              </div>
            </div>
          ) : hasIncome ? (
            <div className="text-right">
              <div className="text-xs text-slate-400 font-medium">Total Income</div>
              <div className="text-sm font-bold text-emerald-400 tnum flex items-center gap-1 justify-end">
                <ArrowUpRight className="w-3.5 h-3.5" />
                +{formatPrimary(totalIncome)}
              </div>
            </div>
          ) : (
            <div className="text-right">
              <div className="text-xs text-slate-400 font-medium">Total Sum</div>
              <div className="text-sm font-bold text-indigo-400 tnum">
                {formatPrimary(totalAbsolute)}
              </div>
            </div>
          )}

          {onOpenMassEdit && (
            <button
              type="button"
              onClick={onOpenMassEdit}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm shadow-indigo-600/30 cursor-pointer shrink-0"
              title="Mass edit selected transactions"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Mass Edit</span>
            </button>
          )}

          <div className="h-6 w-[1px] bg-white/[0.1] hidden sm:block" />

          <button
            type="button"
            onClick={onClearSelection}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.08] rounded-lg transition-colors cursor-pointer"
            title="Clear selection"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

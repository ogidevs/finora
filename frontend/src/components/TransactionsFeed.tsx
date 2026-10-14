import React, { useMemo } from 'react';
import {
  CreditCard,
  Upload,
  Plus,
  CheckSquare,
  Square,
  X,
  SlidersHorizontal,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import {
  type MonthlyTransactionsResponse,
  type Transaction,
  type DailyTransactionsGroup,
} from '../api/transactions';
import { TransactionItem } from './TransactionItem';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

interface TransactionsFeedProps {
  loading: boolean;
  monthlyData: MonthlyTransactionsResponse | null;
  currentMonthName: string;
  currentYear: number;
  primaryCurrency: string;
  formatPrimary: (val: number | string) => string;
  period?: 'day' | 'month' | 'year';
  onPrevPeriod?: () => void;
  onNextPeriod?: () => void;
  onSelectMonth?: (year: number, month: number) => void;
  selectedTxIds?: Set<number>;
  onToggleSelect?: (id: number) => void;
  onSelectAll?: () => void;
  onClearSelection?: () => void;
  onSelectTag?: (tag: string) => void;
  selectedTag?: string | null;
  onOpenMassEdit?: () => void;
  onAddTransaction: () => void;
  onOpenImport?: () => void;
  /** Whether the user has any transactions at all (across every period). */
  hasAnyTransactions?: boolean;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: number) => void;
}

export const TransactionsFeed: React.FC<TransactionsFeedProps> = ({
  loading,
  monthlyData,
  currentMonthName,
  currentYear,
  primaryCurrency,
  formatPrimary,
  period = 'month',
  onPrevPeriod,
  onNextPeriod,
  onSelectMonth,
  selectedTxIds = new Set(),
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  onSelectTag,
  selectedTag,
  onOpenMassEdit,
  onAddTransaction,
  onOpenImport,
  hasAnyTransactions = true,
  onEditTransaction,
  onDeleteTransaction,
}) => {
  const monthGroups = useMemo(() => {
    if (!monthlyData) return [];
    const groups: {
      key: string;
      year: number;
      month: number;
      monthName: string;
      totalIncome: number;
      totalExpense: number;
      net: number;
      transactionCount: number;
      days: DailyTransactionsGroup[];
    }[] = [];

    const map = new Map<string, (typeof groups)[0]>();

    for (const day of monthlyData.days) {
      const [yStr, mStr] = day.date.split('-');
      const y = parseInt(yStr, 10);
      const m = parseInt(mStr, 10);
      const key = `${y}-${mStr}`;

      let group = map.get(key);
      if (!group) {
        group = {
          key,
          year: y,
          month: m,
          monthName: MONTH_NAMES[m - 1] || `Month ${m}`,
          totalIncome: 0,
          totalExpense: 0,
          net: 0,
          transactionCount: 0,
          days: [],
        };
        map.set(key, group);
        groups.push(group);
      }

      group.days.push(day);
      group.totalIncome += Number(day.total_income_primary || 0);
      group.totalExpense += Number(day.total_expense_primary || 0);
      group.net += Number(day.net_primary || 0);
      group.transactionCount += day.transactions.length;
    }

    return groups;
  }, [monthlyData]);

  if (loading) {
    return (
      <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
        <div className="w-5 h-5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        <span>Loading ledger...</span>
      </div>
    );
  }

  if (!monthlyData || monthlyData.days.length === 0) {
    if (selectedTag) {
      return (
        <div className="py-12 text-center rounded-2xl bg-[#11141D] border border-white/[0.07] p-6">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-2">
            <CreditCard className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">
            No Transactions With Tag #{selectedTag}
          </h3>
          <p className="text-xs text-slate-400 mb-4 max-w-sm mx-auto">
            {period === 'year'
              ? `There are no transactions tagged with #${selectedTag} in ${currentYear}.`
              : `There are no transactions tagged with #${selectedTag} in ${currentMonthName} ${currentYear}.`}
          </p>
          {onSelectTag && (
            <button
              type="button"
              onClick={() => onSelectTag('')}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              Clear Tag Filter
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="py-16 text-center rounded-2xl bg-[#11141D] border border-white/[0.07] p-6">
        <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-2">
          <CreditCard className="w-4 h-4" />
        </div>
        <h3 className="text-sm font-bold text-white mb-1">
          {period === 'year'
            ? `No Transactions In ${currentYear}`
            : period === 'day'
              ? 'No Transactions On This Day'
              : 'No Transactions This Month'}
        </h3>
        <p className="text-xs text-slate-400 mb-4 max-w-sm mx-auto">
          {period === 'year'
            ? `No transactions were logged for the year ${currentYear}.`
            : period === 'day'
              ? 'No transactions were logged for this day.'
              : `No transactions were logged for ${currentMonthName} ${currentYear}.`}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <button
            type="button"
            id="empty-add-transaction-btn"
            onClick={onAddTransaction}
            className="h-9 inline-flex items-center justify-center gap-1.5 px-3.5 rounded-xl border border-indigo-500/60 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Transaction</span>
          </button>
          {onOpenImport && !hasAnyTransactions && (
            <button
              type="button"
              id="empty-import-transactions-btn"
              onClick={onOpenImport}
              className="h-9 inline-flex items-center justify-center gap-1.5 px-3.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import CSV / JSON</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  const allVisibleTxIds = monthlyData.days.flatMap((d) => d.transactions.map((t) => t.id));
  const isAllVisibleSelected =
    allVisibleTxIds.length > 0 && allVisibleTxIds.every((id) => selectedTxIds.has(id));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 sm:px-2 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {onSelectAll && (
            <button
              type="button"
              onClick={onSelectAll}
              className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer text-xs font-medium"
            >
              {isAllVisibleSelected ? (
                <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
              ) : (
                <Square className="w-3.5 h-3.5" />
              )}
              <span>{isAllVisibleSelected ? 'Deselect all' : 'Select all'}</span>
              <span className="text-slate-500 text-[11px]">({allVisibleTxIds.length})</span>
            </button>
          )}

          {selectedTxIds.size > 0 && onClearSelection && (
            <button
              type="button"
              onClick={onClearSelection}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-400 transition-colors cursor-pointer ml-1"
            >
              <X className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}

          {selectedTxIds.size > 0 && onOpenMassEdit && (
            <button
              type="button"
              onClick={onOpenMassEdit}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-semibold transition-all cursor-pointer ml-1.5"
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>Mass Edit ({selectedTxIds.size})</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <div className="text-slate-400 text-xs">
            {monthlyData.transaction_count}{' '}
            {monthlyData.transaction_count === 1 ? 'transaction' : 'transactions'}
          </div>
        </div>
      </div>

      {period === 'year' ? (
        <div className="space-y-6">
          {monthGroups.map((mg) => (
            <section key={mg.key} className="space-y-3">
              <div className="sticky top-16 z-20 px-3.5 py-2.5 rounded-xl bg-[#141824]/95 backdrop-blur-md border border-white/[0.08] shadow-md flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-indigo-400">
                    <Calendar className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white tracking-tight">
                      {mg.monthName} {mg.year}
                    </h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-400 border border-white/[0.06]">
                      {mg.transactionCount} {mg.transactionCount === 1 ? 'tx' : 'txs'}
                    </span>
                  </div>
                  {onSelectMonth && (
                    <button
                      type="button"
                      onClick={() => onSelectMonth(mg.year, mg.month)}
                      className="text-[11px] font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition-all cursor-pointer ml-1"
                      title={`Open ${mg.monthName} ${mg.year}`}
                    >
                      <span>Open Month</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2.5 font-semibold tnum text-xs">
                  {mg.totalIncome > 0 && (
                    <span className="text-emerald-400">
                      +{formatPrimary(mg.totalIncome)}
                    </span>
                  )}
                  {mg.totalExpense > 0 && (
                    <span className="text-rose-400">
                      -{formatPrimary(mg.totalExpense)}
                    </span>
                  )}
                  <span
                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${mg.net >= 0
                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                      }`}
                  >
                    {mg.net >= 0 ? '+' : ''}{formatPrimary(mg.net)}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {mg.days.map((dayGroup) => (
                  <div key={dayGroup.date} className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-1 px-1 text-xs">
                      <span className="font-semibold text-slate-400">
                        {dayGroup.day_name}, {dayGroup.formatted_date}
                      </span>
                      <div className="flex items-center gap-2 font-semibold tnum text-[11px]">
                        {Number(dayGroup.total_income_primary) > 0 && (
                          <span className="text-emerald-400">
                            +{formatPrimary(dayGroup.total_income_primary)}
                          </span>
                        )}
                        {Number(dayGroup.total_expense_primary) > 0 && (
                          <span className="text-rose-400">
                            -{formatPrimary(dayGroup.total_expense_primary)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      {dayGroup.transactions.map((tx) => (
                        <TransactionItem
                          key={tx.id}
                          tx={tx}
                          primaryCurrency={primaryCurrency}
                          formatPrimary={formatPrimary}
                          isSelected={selectedTxIds.has(tx.id)}
                          onToggleSelect={onToggleSelect}
                          onSelectTag={onSelectTag}
                          onEdit={onEditTransaction}
                          onDelete={onDeleteTransaction}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}

          <div className="mt-8 p-4 rounded-2xl bg-[#121622] border border-white/[0.07] text-center space-y-2.5">
            <div className="text-xs text-slate-400">
              Beginning of <strong className="text-white">{currentYear}</strong> reached
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {onPrevPeriod && (
                <button
                  type="button"
                  onClick={onPrevPeriod}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Go to Previous Year ({currentYear - 1})</span>
                </button>
              )}
              {onNextPeriod && (
                <button
                  type="button"
                  onClick={onNextPeriod}
                  className="px-3.5 py-2 rounded-xl bg-[#171B26] hover:bg-[#1E2332] text-slate-300 hover:text-white border border-white/[0.08] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>Go to Next Year ({currentYear + 1})</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        monthlyData.days.map((dayGroup) => (
          <div key={dayGroup.date} className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-1 px-1 text-xs">
              <span className="font-semibold text-slate-400">
                {dayGroup.day_name}, {dayGroup.formatted_date}
              </span>
              <div className="flex items-center gap-2 font-semibold tnum text-[11px]">
                {Number(dayGroup.total_income_primary) > 0 && (
                  <span className="text-emerald-400">
                    +{formatPrimary(dayGroup.total_income_primary)}
                  </span>
                )}
                {Number(dayGroup.total_expense_primary) > 0 && (
                  <span className="text-rose-400">
                    -{formatPrimary(dayGroup.total_expense_primary)}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              {dayGroup.transactions.map((tx) => (
                <TransactionItem
                  key={tx.id}
                  tx={tx}
                  primaryCurrency={primaryCurrency}
                  formatPrimary={formatPrimary}
                  isSelected={selectedTxIds.has(tx.id)}
                  onToggleSelect={onToggleSelect}
                  onSelectTag={onSelectTag}
                  onEdit={onEditTransaction}
                  onDelete={onDeleteTransaction}
                />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

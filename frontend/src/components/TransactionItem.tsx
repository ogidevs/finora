import React, { useRef } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  PiggyBank,
  Tag as TagIcon,
  Pencil,
  Trash2,
  Check,
} from 'lucide-react';
import {
  isSavingsTransferTo as checkSavingsTransferTo,
  isSavingsTransferFrom as checkSavingsTransferFrom,
  isTransactionExpense,
  isTransactionIncome,
  getTransactionPrimaryAmount,
  type Transaction,
} from '../api/transactions';

interface TransactionItemProps {
  tx: Transaction;
  primaryCurrency: string;
  formatPrimary: (val: number | string) => string;
  isSelected?: boolean;
  onToggleSelect?: (id: number) => void;
  onSelectTag?: (tag: string) => void;
  onEdit: (tx: Transaction) => void;
  onDelete: (id: number) => void;
}

export const TransactionItem: React.FC<TransactionItemProps> = ({
  tx,
  primaryCurrency,
  formatPrimary,
  isSelected = false,
  onToggleSelect,
  onSelectTag,
  onEdit,
  onDelete,
}) => {
  const isSavingsTransferTo = checkSavingsTransferTo(tx);
  const isSavingsTransferFrom = checkSavingsTransferFrom(tx);
  const isExpense = isTransactionExpense(tx);
  const isIncome = isTransactionIncome(tx);
  const isInternalTransfer = tx.type === 'TRANSFER' && !tx.is_savings_transfer;

  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const lastTapRef = useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartPos.current) return;
    const touch = e.changedTouches[0];
    const deltaX = Math.abs(touch.clientX - touchStartPos.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartPos.current.y);
    touchStartPos.current = null;

    if (deltaX > 10 || deltaY > 10) {
      return;
    }

    const now = Date.now();
    if (now - lastTapRef.current < 350) {
      onToggleSelect?.(tx.id);
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  };

  return (
    <div
      onDoubleClick={() => onToggleSelect?.(tx.id)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={`p-2.5 sm:p-3.5 rounded-xl border transition-all flex items-center justify-between gap-2 sm:gap-3 group select-none touch-manipulation cursor-pointer ${
        isSelected
          ? 'bg-[#151929] border-indigo-500/50 shadow-sm shadow-indigo-500/10'
          : 'bg-[#11141D] border-white/[0.05] hover:border-white/[0.12] hover:bg-[#141824]'
      }`}
    >
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        {onToggleSelect && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect(tx.id);
            }}
            onDoubleClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-all cursor-pointer ${
              isSelected
                ? 'bg-indigo-600 border-indigo-500 text-white'
                : 'bg-white/[0.04] border-white/[0.15] text-transparent hover:border-white/40'
            }`}
            title={isSelected ? 'Deselect transaction' : 'Select transaction'}
          >
            <Check className="w-3 h-3 stroke-[3]" />
          </button>
        )}

        <div
          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 ${
            isSavingsTransferTo
              ? 'bg-rose-500/10 text-rose-400'
              : isSavingsTransferFrom
              ? 'bg-emerald-500/10 text-emerald-400'
              : isExpense
              ? 'bg-rose-500/10 text-rose-400'
              : isIncome
              ? 'bg-emerald-500/10 text-emerald-400'
              : 'bg-indigo-500/10 text-indigo-400'
          }`}
        >
          {isSavingsTransferTo && <ArrowDownLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          {isSavingsTransferFrom && <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          {!tx.is_savings_transfer && isExpense && <ArrowDownLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          {!tx.is_savings_transfer && isIncome && <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          {isInternalTransfer && <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
            {isSavingsTransferTo ? (
              <>
                <span className="text-xs font-bold text-white truncate max-w-[130px] sm:max-w-none">
                  {tx.account_name} &rarr; {tx.to_account_name || 'Savings'}
                </span>
                <span className="px-1.5 py-0.5 rounded-md bg-purple-500/15 text-purple-300 text-[10px] font-semibold border border-purple-500/25 flex items-center gap-1 shrink-0">
                  <PiggyBank className="w-2.5 h-2.5" />
                  To Savings
                </span>
              </>
            ) : isSavingsTransferFrom ? (
              <>
                <span className="text-xs font-bold text-white truncate max-w-[130px] sm:max-w-none">
                  {tx.account_name} &rarr; {tx.to_account_name || 'Account'}
                </span>
                <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 text-[10px] font-semibold border border-emerald-500/25 flex items-center gap-1 shrink-0">
                  <PiggyBank className="w-2.5 h-2.5" />
                  From Savings
                </span>
              </>
            ) : isInternalTransfer ? (
              <span className="text-xs font-bold text-white truncate max-w-[130px] sm:max-w-none">
                {tx.account_name} &rarr; {tx.to_account_name || 'Account'}
              </span>
            ) : (
              <span className="text-xs font-bold text-white truncate max-w-[110px] sm:max-w-none">
                {tx.category_name || 'General'}
              </span>
            )}

            {tx.parent_category_name && (
              <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
                &bull; {tx.parent_category_name}
              </span>
            )}

            {!tx.is_savings_transfer && (
              <span className="px-1.5 py-0.5 rounded-md bg-white/[0.04] text-[10px] text-slate-400 font-medium border border-white/[0.06] shrink-0">
                {tx.account_name}
              </span>
            )}

            {tx.tag && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectTag?.(tx.tag!);
                }}
                onDoubleClick={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                className="px-1.5 py-0.5 rounded-md bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-[10px] font-medium flex items-center gap-1 border border-indigo-500/20 hover:border-indigo-500/40 transition-colors cursor-pointer shrink-0"
                title={`Filter by tag #${tx.tag}`}
              >
                <TagIcon className="w-2.5 h-2.5" />
                <span>{tx.tag}</span>
              </button>
            )}
          </div>

          {tx.note && (
            <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[140px] sm:max-w-md">
              {tx.note}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        <div className="text-right">
          <div
            className={`text-xs sm:text-sm font-bold tnum ${
              isExpense
                ? 'text-rose-400'
                : isIncome
                ? 'text-emerald-400'
                : 'text-indigo-400'
            }`}
          >
            {isExpense ? '-' : isIncome ? '+' : ''}
            {formatPrimary(getTransactionPrimaryAmount(tx, primaryCurrency))}
          </div>

          {tx.currency !== primaryCurrency && (
            <div className="text-[9px] sm:text-[10px] text-slate-500 tnum">
              {Number(tx.amount).toFixed(2)} {tx.currency}
            </div>
          )}
        </div>

        <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => onEdit(tx)}
            onDoubleClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            className="p-1 sm:p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.08] rounded-lg transition-colors cursor-pointer"
            title="Edit"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(tx.id)}
            onDoubleClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            className="p-1 sm:p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

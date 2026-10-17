import React from 'react';
import { Settings2 } from 'lucide-react';
import { isSavingsAccountType, type Account } from '../../api/accounts';
import { formatCurrencyAmount } from '../../utils/currency';

interface AccountSelectorProps {
  type: 'EXPENSE' | 'INCOME' | 'TRANSFER';
  accounts: Account[];
  accountId: number;
  toAccountId: number;
  setAccountId: (id: number) => void;
  setToAccountId: (id: number) => void;
  primaryCurrency: string;
  onOpenSettings: (tab: 'accounts' | 'categories' | 'currency') => void;
}

export const AccountSelector: React.FC<AccountSelectorProps> = ({
  type,
  accounts,
  accountId,
  toAccountId,
  setAccountId,
  setToAccountId,
  primaryCurrency,
  onOpenSettings,
}) => {
  if (type === 'TRANSFER') {
    const src = accounts.find((a) => a.id === accountId);
    const dest = accounts.find((a) => a.id === toAccountId);

    return (
      <div className="space-y-2.5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300">From</label>
              <button
                type="button"
                onClick={() => onOpenSettings('accounts')}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 cursor-pointer"
              >
                <Settings2 className="w-2.5 h-2.5" />
                Manage
              </button>
            </div>
            <select
              value={accountId}
              onChange={(e) => setAccountId(Number(e.target.value))}
              className="w-full px-3 py-2 bg-[#171B26] border border-white/[0.08] rounded-xl text-xs font-medium text-white focus:outline-none focus:border-indigo-500"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} [{isSavingsAccountType(a.type) ? 'Saving' : 'Spending'}] ({formatCurrencyAmount(a.current_balance, primaryCurrency)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300">To</label>
            </div>
            <select
              value={toAccountId}
              onChange={(e) => setToAccountId(Number(e.target.value))}
              className="w-full px-3 py-2 bg-[#171B26] border border-white/[0.08] rounded-xl text-xs font-medium text-white focus:outline-none focus:border-indigo-500"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} [{isSavingsAccountType(a.type) ? 'Saving' : 'Spending'}] ({formatCurrencyAmount(a.current_balance, primaryCurrency)})
                </option>
              ))}
            </select>
          </div>
        </div>

        {!isSavingsAccountType(src?.type) && isSavingsAccountType(dest?.type) && (
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-300 flex items-center gap-2 animate-in fade-in">
            <span>💡</span>
            <span>
              <strong>Transfer to Savings:</strong> This transfer is counted as an <strong>expense</strong> for the currently selected period.
            </span>
          </div>
        )}

        {isSavingsAccountType(src?.type) && !isSavingsAccountType(dest?.type) && (
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300 flex items-center gap-2 animate-in fade-in">
            <span>💡</span>
            <span>
              <strong>Transfer from Savings:</strong> This transfer is counted as <strong>income</strong> for the currently selected period.
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-semibold text-slate-300">Account</label>
        <button
          type="button"
          onClick={() => onOpenSettings('accounts')}
          className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 cursor-pointer"
        >
          <Settings2 className="w-3 h-3" />
          Manage
        </button>
      </div>
      <select
        value={accountId}
        onChange={(e) => setAccountId(Number(e.target.value))}
        className="w-full px-3 py-2 bg-[#171B26] border border-white/[0.08] rounded-xl text-xs font-medium text-white focus:outline-none focus:border-indigo-500"
      >
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name} &bull; {formatCurrencyAmount(a.current_balance, primaryCurrency)}
          </option>
        ))}
      </select>
    </div>
  );
};

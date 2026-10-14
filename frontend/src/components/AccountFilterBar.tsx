import React from 'react';
import { CreditCard, PiggyBank } from 'lucide-react';
import { isSavingsAccountType, type Account } from '../api/accounts';

interface AccountFilterBarProps {
  accounts: Account[];
  selectedAccountId: number | '';
  onSelectAccount: (id: number | '') => void;
  formatPrimary: (val: number | string) => string;
}

export const AccountFilterBar: React.FC<AccountFilterBarProps> = ({
  accounts,
  selectedAccountId,
  onSelectAccount,
  formatPrimary,
}) => {
  if (accounts.length === 0) return null;

  return (
    <div className="w-full flex items-center justify-center">
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 w-full max-w-4xl">
        {accounts.map((acc) => {
          const isSelected = selectedAccountId === acc.id;
          return (
            <button
              key={acc.id}
              type="button"
              onClick={() => onSelectAccount(isSelected ? '' : acc.id)}
              className={`px-3.5 sm:px-4 py-2 rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center flex-1 min-w-[110px] sm:flex-initial sm:min-w-[130px] text-center ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 ring-1 ring-indigo-400/50'
                  : 'bg-[#11141D] hover:bg-[#181C28] text-slate-300 border border-white/[0.07] hover:border-white/[0.12]'
              }`}
              title={isSelected ? 'Click to show all accounts' : `Filter by ${acc.name}`}
            >
              <div className="flex items-center justify-center gap-1.5 text-xs font-medium opacity-90 mb-0.5">
                {isSavingsAccountType(acc.type) ? (
                  <PiggyBank className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                ) : (
                  <CreditCard className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                )}
                <span className="truncate max-w-[100px] sm:max-w-[120px]">{acc.name}</span>
              </div>
              <div className="text-xs sm:text-sm font-bold tnum tracking-tight text-center w-full">
                {formatPrimary(acc.current_balance)}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

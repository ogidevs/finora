import React, { useState } from 'react';
import {
  CreditCard,
  PiggyBank,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
} from 'lucide-react';
import {
  createAccountApi,
  deleteAccountApi,
  updateAccountApi,
  isSavingsAccountType,
  type Account,
  type AccountType,
} from '../../api/accounts';
import { formatCurrencyAmount } from '../../utils/currency';

const PRESET_COLORS = [
  '#3B82F6',
  '#10B981',
  '#8B5CF6',
  '#EC4899',
  '#F59E0B',
  '#06B6D4',
  '#EF4444',
  '#64748B',
];

interface AccountsTabProps {
  accounts: Account[];
  primaryCurrency: string;
  onAccountsChanged: () => void;
  onError: (msg: string) => void;
}

export const AccountsTab: React.FC<AccountsTabProps> = ({
  accounts,
  primaryCurrency,
  onAccountsChanged,
  onError,
}) => {
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [newAccName, setNewAccName] = useState('');
  const [newAccType, setNewAccType] = useState<AccountType>('SPENDING');
  const [newAccBalance, setNewAccBalance] = useState('0.00');
  const [newAccColor, setNewAccColor] = useState(PRESET_COLORS[0]);

  const [editingAccountId, setEditingAccountId] = useState<number | null>(null);
  const [editAccName, setEditAccName] = useState('');
  const [editAccType, setEditAccType] = useState<AccountType>('SPENDING');
  const [editAccBalance, setEditAccBalance] = useState('0.00');
  const [editOriginalBalance, setEditOriginalBalance] = useState<number>(0);
  const [editCreateCorrection, setEditCreateCorrection] = useState(false);
  const [editAccColor, setEditAccColor] = useState(PRESET_COLORS[0]);
  const [savingEdit, setSavingEdit] = useState(false);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName.trim()) return;

    const bal = parseFloat(newAccBalance) || 0;
    const defaultIcon = isSavingsAccountType(newAccType) ? 'PiggyBank' : 'CreditCard';

    try {
      await createAccountApi({
        name: newAccName.trim(),
        type: newAccType,
        initial_balance: bal,
        color: newAccColor,
        icon: defaultIcon,
      });
      setNewAccName('');
      setNewAccType('SPENDING');
      setNewAccBalance('0.00');
      setShowAddAccount(false);
      onAccountsChanged();
    } catch (err: any) {
      onError(err.message || 'Failed to create account.');
    }
  };

  const handleDeleteAccount = async (id: number) => {
    if (!confirm('Are you sure you want to delete this account? Associated transactions will be removed.')) return;
    try {
      await deleteAccountApi(id);
      onAccountsChanged();
    } catch (err: any) {
      onError(err.message || 'Failed to delete account.');
    }
  };

  const handleStartEdit = (acc: Account) => {
    setEditingAccountId(acc.id);
    setEditAccName(acc.name);
    const parsedType = isSavingsAccountType(acc.type) ? 'SAVINGS' : 'SPENDING';
    setEditAccType(parsedType);
    const balNum = typeof acc.current_balance === 'number' ? acc.current_balance : parseFloat(String(acc.current_balance)) || 0;
    setEditAccBalance(balNum.toFixed(2));
    setEditOriginalBalance(balNum);
    setEditCreateCorrection(false);
    setEditAccColor(acc.color || (parsedType === 'SAVINGS' ? '#8B5CF6' : '#3B82F6'));
  };

  const handleSaveEditAccount = async (id: number) => {
    if (!editAccName.trim()) return;
    setSavingEdit(true);
    try {
      const bal = parseFloat(editAccBalance) || 0;
      const parsedType = isSavingsAccountType(editAccType) ? 'SAVINGS' : 'SPENDING';
      const balanceDiff = bal - editOriginalBalance;
      const hasDiff = Math.abs(balanceDiff) > 0.001;

      await updateAccountApi(id, {
        name: editAccName.trim(),
        type: parsedType,
        current_balance: bal,
        create_correction_transaction: editCreateCorrection && hasDiff,
        color: editAccColor,
      });
      setEditingAccountId(null);
      onAccountsChanged();
    } catch (err: any) {
      onError(err.message || 'Failed to update account.');
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-semibold text-slate-300">Accounts</h3>
          <p className="text-[11px] text-slate-400">Manage accounts and balances</p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddAccount(!showAddAccount)}
          className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Account</span>
        </button>
      </div>

      {showAddAccount && (
        <form
          onSubmit={handleCreateAccount}
          className="p-4 rounded-xl bg-[#161A26] border border-white/[0.08] space-y-3.5 animate-in fade-in duration-100"
        >
          <div className="text-xs font-bold text-white">Create Account</div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1.5">
              Account Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setNewAccType('SPENDING');
                  setNewAccColor('#3B82F6');
                }}
                className={`p-2.5 rounded-xl border text-center flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  newAccType === 'SPENDING' || newAccType === 'CARD' || newAccType === 'CASH'
                    ? 'bg-blue-500/15 border-blue-500 text-white shadow-sm'
                    : 'bg-[#11141D] border-white/[0.07] text-slate-400 hover:text-slate-200'
                }`}
              >
                <CreditCard className="w-4 h-4 text-blue-400" />
                <span className="text-[11px] font-semibold">Spending</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setNewAccType('SAVINGS');
                  setNewAccColor('#8B5CF6');
                }}
                className={`p-2.5 rounded-xl border text-center flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  newAccType === 'SAVINGS' || newAccType === 'SAVING'
                    ? 'bg-purple-500/15 border-purple-500 text-white shadow-sm'
                    : 'bg-[#11141D] border-white/[0.07] text-slate-400 hover:text-slate-200'
                }`}
              >
                <PiggyBank className="w-4 h-4 text-purple-400" />
                <span className="text-[11px] font-semibold">Saving</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Name
              </label>
              <input
                type="text"
                required
                placeholder={
                  newAccType === 'SAVINGS' || newAccType === 'SAVING'
                    ? 'e.g. Vacation Savings, Emergency Fund'
                    : 'e.g. Main Account, Daily Spending'
                }
                value={newAccName}
                onChange={(e) => setNewAccName(e.target.value)}
                className="w-full px-3 py-2 bg-[#11141D] border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Starting Balance
              </label>
              <input
                type="number"
                step="0.01"
                value={newAccBalance}
                onChange={(e) => setNewAccBalance(e.target.value)}
                className="w-full px-3 py-2 bg-[#11141D] border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 tnum"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400 mr-1">Color:</span>
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewAccColor(c)}
                  className={`w-4 h-4 rounded-full transition-transform cursor-pointer ${
                    newAccColor === c ? 'scale-125 ring-2 ring-white' : ''
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAddAccount(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-sm cursor-pointer"
              >
                Save Account
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="space-y-1.5">
        {accounts.map((acc) => {
          const isSavings = isSavingsAccountType(acc.type);

          if (editingAccountId === acc.id) {
            const parsedEditBal = parseFloat(editAccBalance) || 0;
            const balanceDiff = parsedEditBal - editOriginalBalance;
            const hasDiff = Math.abs(balanceDiff) > 0.001;

            return (
              <form
                key={acc.id}
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSaveEditAccount(acc.id);
                }}
                className="p-4 rounded-xl bg-[#161A26] border border-indigo-500/40 shadow-lg space-y-3.5 animate-in fade-in duration-150"
              >
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                  <span className="text-xs font-bold text-white">Edit Account: {acc.name}</span>
                  <button
                    type="button"
                    onClick={() => setEditingAccountId(null)}
                    className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Account Name
                    </label>
                    <input
                      type="text"
                      required
                      value={editAccName}
                      onChange={(e) => setEditAccName(e.target.value)}
                      className="w-full px-3 py-2 bg-[#11141D] border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Account Type
                    </label>
                    <select
                      value={editAccType === 'SAVINGS' || editAccType === 'SAVING' ? 'SAVINGS' : 'SPENDING'}
                      onChange={(e) => setEditAccType(e.target.value as AccountType)}
                      className="w-full px-3 py-2 bg-[#11141D] border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="SPENDING">Spending</option>
                      <option value="SAVINGS">Saving</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-medium text-slate-400">
                      Balance ({primaryCurrency})
                    </label>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Current: {formatCurrencyAmount(editOriginalBalance, primaryCurrency)}
                    </span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editAccBalance}
                    onChange={(e) => setEditAccBalance(e.target.value)}
                    className="w-full px-3 py-2 bg-[#11141D] border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                {hasDiff && (
                  <div className="p-3 rounded-xl bg-[#11141D] border border-white/[0.08] space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Balance Change:</span>
                      <span className={`font-mono font-bold ${balanceDiff > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {balanceDiff > 0 ? '+' : ''}{balanceDiff.toFixed(2)} {primaryCurrency}
                      </span>
                    </div>

                    <label className="flex items-start gap-2.5 pt-1 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={editCreateCorrection}
                        onChange={(e) => setEditCreateCorrection(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded border-white/20 bg-slate-800 text-indigo-600 focus:ring-0 cursor-pointer"
                      />
                      <div className="text-[11px] leading-tight">
                        <span className="font-semibold text-slate-200">
                          Add correction transaction ({balanceDiff > 0 ? '+' : ''}{balanceDiff.toFixed(2)} {primaryCurrency})
                        </span>
                        <p className="text-slate-400 mt-1">
                          {editCreateCorrection
                            ? `Records an adjustment ${balanceDiff > 0 ? 'income (+)' : 'expense (-)'} transaction in your transactions history.`
                            : 'Adjusts account balance directly without creating a ledger transaction.'}
                        </p>
                      </div>
                    </label>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-400 mr-1">Color:</span>
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditAccColor(c)}
                        className={`w-4 h-4 rounded-full transition-transform cursor-pointer ${
                          editAccColor === c ? 'scale-125 ring-2 ring-white' : ''
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingAccountId(null)}
                      className="px-3 py-1.5 text-xs text-slate-400 hover:text-white cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingEdit}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{savingEdit ? 'Saving...' : 'Save Changes'}</span>
                    </button>
                  </div>
                </div>
              </form>
            );
          }

          return (
            <div
              key={acc.id}
              className="p-3 rounded-xl bg-[#161A26] border border-white/[0.06] hover:border-white/[0.1] flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                  style={{ backgroundColor: `${acc.color || '#6366F1'}20`, color: acc.color || '#6366F1' }}
                >
                  {isSavings ? (
                    <PiggyBank className="w-4 h-4" />
                  ) : (
                    <CreditCard className="w-4 h-4" />
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white">{acc.name}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                      isSavings
                        ? 'bg-purple-500/10 text-purple-300 border-purple-500/20'
                        : 'bg-blue-500/10 text-blue-300 border-blue-500/20'
                    }`}
                  >
                    {isSavings ? 'Saving' : 'Spending'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs font-bold text-white tnum">
                    {formatCurrencyAmount(acc.current_balance || 0, primaryCurrency)}
                  </div>
                </div>

                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(acc)}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors cursor-pointer"
                    title="Edit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  {accounts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteAccount(acc.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

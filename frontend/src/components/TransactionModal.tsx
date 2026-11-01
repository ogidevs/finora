import React, { useState, useEffect, useRef } from 'react';
import { type Account } from '../api/accounts';
import { type Category } from '../api/categories';
import {
  createTransactionApi,
  updateTransactionApi,
  type Transaction,
  type TransactionCreatePayload,
  type TransactionUpdatePayload,
} from '../api/transactions';
import { scanReceiptApi } from '../api/receipts';
import {
  X,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Calendar,
  Tag as TagIcon,
  FileText,
  AlertCircle,
  Coins,
} from 'lucide-react';
import { ReceiptScanner } from './transaction-modal/ReceiptScanner';
import { AccountSelector } from './transaction-modal/AccountSelector';
import { CategorySelector } from './transaction-modal/CategorySelector';
import {
  SUPPORTED_CURRENCIES,
  getDefaultRate,
  formatCurrencyAmount,
  convertToPrimary,
} from '../utils/currency';

interface TransactionModalProps {
  accounts: Account[];
  categories: Category[];
  primaryCurrency: string;
  defaultExchangeRate: number;
  transactionToEdit?: Transaction | null;
  autoTriggerScan?: boolean;
  onClose: () => void;
  onSuccess: (tx: Transaction) => void;
  onOpenSettings: (tab: 'accounts' | 'categories' | 'currency') => void;
}

function resolveCategorySelection(catId?: number | null, cats: Category[] = []) {
  if (!catId) return { parentId: '' as number | '', subId: '' as number | '' };
  const parent = cats.find((c) => c.id === catId);
  if (parent) {
    return { parentId: parent.id, subId: '' as number | '' };
  }
  const parentWithSub = cats.find((c) => c.subcategories?.some((s) => s.id === catId));
  if (parentWithSub) {
    return { parentId: parentWithSub.id, subId: catId };
  }
  return { parentId: catId, subId: '' as number | '' };
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  accounts,
  categories,
  primaryCurrency,
  defaultExchangeRate,
  transactionToEdit,
  autoTriggerScan,
  onClose,
  onSuccess,
  onOpenSettings,
}) => {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const initialCat = resolveCategorySelection(transactionToEdit?.category_id, categories);

  const [type, setType] = useState<'EXPENSE' | 'INCOME' | 'TRANSFER'>(() => transactionToEdit?.type || 'EXPENSE');
  const [date, setDate] = useState<string>(() => transactionToEdit?.date || todayStr);
  const [amount, setAmount] = useState<string>(() => (transactionToEdit ? String(transactionToEdit.amount) : ''));
  const [currency, setCurrency] = useState<string>(() => transactionToEdit?.currency || primaryCurrency);
  const [exchangeRate, setExchangeRate] = useState<string>(
    () => String(transactionToEdit?.exchange_rate || getDefaultRate(transactionToEdit?.currency || primaryCurrency))
  );
  const [showCustomRate, setShowCustomRate] = useState(
    () => Boolean(transactionToEdit && transactionToEdit.currency !== primaryCurrency)
  );

  const [accountId, setAccountId] = useState<number>(() => transactionToEdit?.account_id || accounts[0]?.id || 0);
  const [toAccountId, setToAccountId] = useState<number>(
    () => transactionToEdit?.to_account_id || accounts[1]?.id || accounts[0]?.id || 0
  );

  const filteredCategories = categories.filter((c) =>
    type === 'TRANSFER' ? false : c.type === type
  );

  const [categoryId, setCategoryId] = useState<number | ''>(() => {
    if (transactionToEdit) return initialCat.parentId;
    return filteredCategories[0]?.id || '';
  });
  const [subcategoryId, setSubcategoryId] = useState<number | ''>(() => {
    if (transactionToEdit) return initialCat.subId;
    return '';
  });

  const [note, setNote] = useState<string>(() => transactionToEdit?.note || '');
  const [tag, setTag] = useState<string>(() => transactionToEdit?.tag || '');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [scanSuccessMessage, setScanSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (autoTriggerScan && !transactionToEdit) {
      fileInputRef.current?.click();
    }
  }, [autoTriggerScan, transactionToEdit]);

  const handleScanFile = async (file: File) => {
    setError(null);
    setScanSuccessMessage(null);
    setScanning(true);

    try {
      const res = await scanReceiptApi(file);
      setType('EXPENSE');
      if (res.amount) setAmount(String(res.amount));
      if (res.date) setDate(res.date);
      if (res.currency) {
        setCurrency(res.currency);
        setExchangeRate(String(getDefaultRate(res.currency)));
      }
      if (res.items_note) setNote(res.items_note);
      if (!tag) setTag('receipt');
      setScanSuccessMessage('Receipt scanned! Extracted amount, date, and items have been populated below.');
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to scan receipt image.');
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    if (transactionToEdit) {
      setType(transactionToEdit.type);
      setDate(transactionToEdit.date || todayStr);
      setAmount(String(transactionToEdit.amount));
      setCurrency(transactionToEdit.currency);
      setExchangeRate(String(transactionToEdit.exchange_rate || getDefaultRate(transactionToEdit.currency)));
      setAccountId(transactionToEdit.account_id);
      if (transactionToEdit.to_account_id) {
        setToAccountId(transactionToEdit.to_account_id);
      }
      const catRes = resolveCategorySelection(transactionToEdit.category_id, categories);
      setCategoryId(catRes.parentId);
      setSubcategoryId(catRes.subId);
      setNote(transactionToEdit.note || '');
      setTag(transactionToEdit.tag || '');
      if (transactionToEdit.currency !== primaryCurrency) {
        setShowCustomRate(true);
      }
    }
  }, [transactionToEdit, categories, primaryCurrency, defaultExchangeRate, todayStr]);

  const numAmount = parseFloat(amount) || 0;
  const rateNum = parseFloat(exchangeRate) || undefined;
  const convertedCounterAmount = convertToPrimary(
    numAmount,
    currency,
    rateNum,
    primaryCurrency,
    defaultExchangeRate
  );

  const selectedCatObj = categories.find((c) => c.id === Number(categoryId));
  const availableSubcategories = selectedCatObj?.subcategories || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (numAmount <= 0) {
      setError('Please enter a valid amount greater than zero.');
      return;
    }

    if (!accountId) {
      setError('Please select an account.');
      return;
    }

    if (type === 'TRANSFER' && (!toAccountId || toAccountId === accountId)) {
      setError('Transfer requires distinct source and destination accounts.');
      return;
    }

    setLoading(true);
    try {
      const targetCategoryId = subcategoryId
        ? Number(subcategoryId)
        : categoryId
          ? Number(categoryId)
          : undefined;

      if (transactionToEdit) {
        const payload: TransactionUpdatePayload = {
          type,
          amount: numAmount,
          currency,
          exchange_rate: rateNum,
          account_id: accountId,
          to_account_id: type === 'TRANSFER' ? toAccountId : null,
          category_id: type !== 'TRANSFER' ? (targetCategoryId || null) : null,
          date,
          note: note.trim() || null,
          tag: tag.trim() || null,
        };

        const res = await updateTransactionApi(transactionToEdit.id, payload);
        onSuccess(res);
        onClose();
      } else {
        const payload: TransactionCreatePayload = {
          type,
          amount: numAmount,
          currency,
          exchange_rate: rateNum,
          account_id: accountId,
          to_account_id: type === 'TRANSFER' ? toAccountId : undefined,
          category_id: type !== 'TRANSFER' ? targetCategoryId : undefined,
          date,
          note: note.trim() || undefined,
          tag: tag.trim() || undefined,
        };

        const res = await createTransactionApi(payload);
        onSuccess(res);
        onClose();
      }
    } catch (err: any) {
      setError(
        err.message ||
        (transactionToEdit ? 'Failed to update transaction' : 'Failed to record transaction')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto"
    >
      <div className="w-full max-w-lg bg-[#11141D] border border-white/[0.08] rounded-2xl shadow-2xl p-4 sm:p-6 relative animate-in fade-in zoom-in-95 duration-150 my-4 sm:my-8">
        <button
          onClick={onClose}
          className="absolute right-3.5 sm:right-4 top-3.5 sm:top-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center justify-between mb-4 sm:mb-5 pr-7 sm:pr-8 gap-2 sm:gap-3">
          <h2 className="text-base font-bold text-white tracking-tight">
            {transactionToEdit ? 'Edit Transaction' : 'New Transaction'}
          </h2>

          {!transactionToEdit && (
            <ReceiptScanner
              scanning={scanning}
              scanSuccessMessage={scanSuccessMessage}
              onClearSuccessMessage={() => setScanSuccessMessage(null)}
              onScanFile={handleScanFile}
              fileInputRef={fileInputRef}
            />
          )}
        </div>

        <div className="flex rounded-xl bg-[#171B26] p-1 mb-4 border border-white/[0.06]">
          <button
            type="button"
            onClick={() => {
              setType('EXPENSE');
              setCategoryId(categories.find((c) => c.type === 'EXPENSE')?.id || '');
              setSubcategoryId('');
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${type === 'EXPENSE'
              ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
              : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Expense</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setType('INCOME');
              setCategoryId(categories.find((c) => c.type === 'INCOME')?.id || '');
              setSubcategoryId('');
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${type === 'INCOME'
              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
              : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Income</span>
          </button>

          <button
            type="button"
            onClick={() => setType('TRANSFER')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${type === 'TRANSFER'
              ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
              : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Transfer</span>
          </button>
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2 text-rose-400 text-xs">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-4 rounded-xl bg-[#141824] border border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">Amount</label>

              <select
                value={currency}
                onChange={(e) => {
                  const newCur = e.target.value;
                  setCurrency(newCur);
                  setExchangeRate(String(getDefaultRate(newCur)));
                }}
                className="px-2.5 py-1 bg-[#0E1119] border border-white/[0.08] rounded-lg text-xs font-semibold text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.symbol}) &bull; {c.name}
                  </option>
                ))}
              </select>
            </div>

            <input
              type="number"
              step="0.01"
              required
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#0E1119] border border-white/[0.08] rounded-xl text-xl font-bold text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors tnum"
            />

            {currency !== primaryCurrency && (
              <div className="pt-2 border-t border-white/[0.06] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    {numAmount > 0 ? (
                      <>
                        ≈ <strong className="text-slate-200">{formatCurrencyAmount(convertedCounterAmount, primaryCurrency)}</strong>
                      </>
                    ) : (
                      `Converts to ${primaryCurrency}`
                    )}
                  </span>

                  <button
                    type="button"
                    onClick={() => setShowCustomRate(!showCustomRate)}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Coins className="w-3 h-3" />
                    {showCustomRate ? 'Hide Rate' : 'Adjust Rate'}
                  </button>
                </div>

                {showCustomRate && (
                  <div className="p-2.5 rounded-xl bg-[#0E1119] border border-white/[0.08] flex items-center gap-2 text-xs">
                    <span className="text-slate-400 whitespace-nowrap font-medium">Rate ({currency}):</span>
                    <input
                      type="number"
                      step="0.0001"
                      min="0.0001"
                      value={exchangeRate}
                      onChange={(e) => setExchangeRate(e.target.value)}
                      className="w-full px-2.5 py-1 bg-[#141824] border border-white/[0.08] rounded-lg text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <AccountSelector
            type={type}
            accounts={accounts}
            accountId={accountId}
            toAccountId={toAccountId}
            setAccountId={setAccountId}
            setToAccountId={setToAccountId}
            primaryCurrency={primaryCurrency}
            onOpenSettings={onOpenSettings}
          />

          {type !== 'TRANSFER' && (
            <CategorySelector
              filteredCategories={filteredCategories}
              categoryId={categoryId}
              subcategoryId={subcategoryId}
              availableSubcategories={availableSubcategories}
              onCategoryChange={(val) => {
                setCategoryId(val);
                setSubcategoryId('');
              }}
              onSubcategoryChange={(val) => setSubcategoryId(val)}
              onOpenSettings={onOpenSettings}
            />
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Date</label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#171B26] border border-white/[0.08] rounded-xl text-xs font-medium text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300">Note</label>
              {note && (
                <button
                  type="button"
                  onClick={() => setNote('')}
                  className="text-[10px] text-slate-500 hover:text-slate-300 font-medium cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
              <textarea
                rows={3}
                placeholder="Optional notes or receipt items..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#171B26] border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-y leading-relaxed"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Tag</label>
            <div className="relative">
              <TagIcon className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="e.g. groceries, vacation, subscription"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#171B26] border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold text-white rounded-xl bg-indigo-600 hover:bg-indigo-500 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading
                ? (transactionToEdit ? 'Saving...' : 'Recording...')
                : (transactionToEdit ? 'Save Changes' : `Save ${type.charAt(0) + type.slice(1).toLowerCase()}`)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

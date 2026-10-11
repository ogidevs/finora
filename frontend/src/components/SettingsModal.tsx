import React, { useState, useEffect } from 'react';
import { X, Coins, CreditCard, FolderTree, AlertCircle, Check, Database } from 'lucide-react';
import {
  getSettingsApi,
  updateSettingsApi,
  type UserSettings,
} from '../api/settings';
import { listAccountsApi, type Account } from '../api/accounts';
import { listCategoriesApi, type Category } from '../api/categories';
import { CurrencyTab } from './settings/CurrencyTab';
import { AccountsTab } from './settings/AccountsTab';
import { CategoriesTab } from './settings/CategoriesTab';
import { DataTab } from './settings/DataTab';

interface SettingsModalProps {
  initialTab?: 'currency' | 'accounts' | 'categories' | 'data';
  initialPrimaryCurrency?: string;
  initialExchangeRate?: number;
  initialAccounts?: Account[];
  initialCategories?: Category[];
  onClose: () => void;
  onSettingsChanged: (newSettings: UserSettings) => void;
  onAccountsChanged: () => void;
  onCategoriesChanged: () => void;
  onDataCleared?: () => void;
  hasAnyTransactions?: boolean;
  onOpenImport?: () => void;
  onExport?: (format: 'csv' | 'json') => void | Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  initialTab = 'currency',
  initialPrimaryCurrency = 'EUR',
  initialExchangeRate = 117.2,
  initialAccounts = [],
  initialCategories = [],
  onClose,
  onSettingsChanged,
  onAccountsChanged,
  onCategoriesChanged,
  onDataCleared,
  hasAnyTransactions = false,
  onOpenImport,
  onExport,
}) => {
  const [activeTab, setActiveTab] = useState<'currency' | 'accounts' | 'categories' | 'data'>(initialTab);
  const [primaryCurrency, setPrimaryCurrency] = useState<string>(initialPrimaryCurrency);
  const [exchangeRate, setExchangeRate] = useState<string>(
    initialExchangeRate ? String(initialExchangeRate) : '117.2000'
  );
  const [savingCurrency, setSavingCurrency] = useState(false);
  const [currencySuccess, setCurrencySuccess] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    async function loadData() {
      try {
        const [sData, aData, cData] = await Promise.all([
          getSettingsApi(),
          listAccountsApi(),
          listCategoriesApi(),
        ]);
        if (sData) {
          if (sData.primary_currency) {
            setPrimaryCurrency(sData.primary_currency);
          }
          if (sData.exchange_rate) {
            setExchangeRate(String(sData.exchange_rate));
          }
        }
        setAccounts(aData);
        setCategories(cData);
      } catch (err: any) {
        setError(err.message || 'Failed to load settings data.');
      }
    }
    loadData();
  }, []);

  const refreshAccounts = async () => {
    try {
      const fresh = await listAccountsApi();
      setAccounts(fresh);
      onAccountsChanged();
    } catch (err: any) {
      setError(err.message || 'Failed to reload accounts.');
    }
  };

  const refreshCategories = async () => {
    try {
      const fresh = await listCategoriesApi();
      setCategories(fresh);
      onCategoriesChanged();
    } catch (err: any) {
      setError(err.message || 'Failed to reload categories.');
    }
  };

  const handleSaveCurrency = async (newCurrency: string, calculatedBaseRate: number) => {
    setError(null);
    setCurrencySuccess(false);

    if (isNaN(calculatedBaseRate) || calculatedBaseRate <= 0) {
      setError('Please enter a valid positive exchange rate.');
      return;
    }

    setSavingCurrency(true);
    try {
      const updated = await updateSettingsApi({
        primary_currency: newCurrency,
        exchange_rate: calculatedBaseRate,
      });
      setPrimaryCurrency(updated.primary_currency);
      setExchangeRate(String(updated.exchange_rate));
      setCurrencySuccess(true);
      onSettingsChanged(updated);
      await refreshAccounts();
      setTimeout(() => setCurrencySuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update currency settings.');
    } finally {
      setSavingCurrency(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md"
    >
      <div className="w-full max-w-2xl bg-[#11141D] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-white/[0.08] bg-[#11141D]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Settings</h2>
              <p className="text-xs text-slate-400">Currencies, accounts, and categories</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex px-3 sm:px-6 pt-2 border-b border-white/[0.06] bg-[#0E1119] gap-1 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('currency')}
            className={`flex items-center gap-1.5 sm:gap-2 pb-2.5 px-2.5 sm:px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'currency'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>Primary Currency</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('accounts')}
            className={`flex items-center gap-1.5 sm:gap-2 pb-2.5 px-2.5 sm:px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'accounts'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Accounts ({accounts.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('categories')}
            className={`flex items-center gap-1.5 sm:gap-2 pb-2.5 px-2.5 sm:px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'categories'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" />
            <span>Categories ({categories.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('data')}
            className={`flex items-center gap-1.5 sm:gap-2 pb-2.5 px-2.5 sm:px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'data'
                ? 'border-rose-500 text-rose-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Data Management</span>
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2 text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {currencySuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-emerald-400 text-xs animate-in fade-in">
              <Check className="w-4 h-4 shrink-0" />
              <span>Currency settings updated</span>
            </div>
          )}

          {activeTab === 'currency' && (
            <CurrencyTab
              primaryCurrency={primaryCurrency}
              currentExchangeRate={parseFloat(exchangeRate) || 1.0}
              saving={savingCurrency}
              onConfirmChange={handleSaveCurrency}
            />
          )}

          {activeTab === 'accounts' && (
            <AccountsTab
              accounts={accounts}
              primaryCurrency={primaryCurrency}
              onAccountsChanged={refreshAccounts}
              onError={(msg) => setError(msg)}
            />
          )}

          {activeTab === 'categories' && (
            <CategoriesTab
              categories={categories}
              onCategoriesChanged={refreshCategories}
              onError={(msg) => setError(msg)}
            />
          )}

          {activeTab === 'data' && (
            <DataTab
              onAccountsChanged={refreshAccounts}
              onDataCleared={onDataCleared}
              hasAnyTransactions={hasAnyTransactions}
              onOpenImport={onOpenImport}
              onExport={onExport}
              onError={(msg) => setError(msg)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

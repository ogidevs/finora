import { useEffect, useState, useMemo } from 'react';
import { getMeApi, logoutApi, loginApi, registerApi, type User } from './api/auth';
import { listAccountsApi, type Account } from './api/accounts';
import { listCategoriesApi, type Category } from './api/categories';
import {
  listMonthlyTransactionsApi,
  deleteTransactionApi,
  exportTransactionsApi,
  countTransactionsApi,
  isTransactionExpense,
  isTransactionIncome,
  getTransactionPrimaryAmount,
  type MonthlyTransactionsResponse,
  type Transaction,
} from './api/transactions';
import { AuthModal } from './components/AuthModal';
import { TransactionModal } from './components/TransactionModal';
import { SettingsModal } from './components/SettingsModal';
import { StatisticsView } from './components/StatisticsView';
import { Navbar } from './components/Navbar';
import { PeriodHeader } from './components/PeriodHeader';
import { SummaryMetrics } from './components/SummaryMetrics';
import { AccountFilterBar } from './components/AccountFilterBar';
import { TagFilterBar, type TagStat } from './components/TagFilterBar';
import { TransactionsFeed } from './components/TransactionsFeed';
import { SelectedTransactionsBar } from './components/SelectedTransactionsBar';
import { MassEditModal } from './components/MassEditModal';
import { ImportTransactionsModal } from './components/ImportTransactionsModal';
import { AiAssistantDrawer } from './components/assistant/AiAssistantDrawer';
import { LandingPage } from './components/LandingPage';
import { Footer } from './components/Footer';
import { formatCurrencyAmount } from './utils/currency';
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register' | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);

  const getPath = (): '/dashboard' | '/' => {
    const p = window.location.pathname;
    return p === '/dashboard' || p.startsWith('/dashboard/') ? '/dashboard' : '/';
  };

  const [currentPath, setCurrentPath] = useState<'/dashboard' | '/'>(getPath);

  const navigate = (path: '/dashboard' | '/') => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(getPath());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const [currentView, setCurrentView] = useState<'transactions' | 'statistics'>('transactions');

  const today = new Date();
  const [dashboardPeriod, setDashboardPeriod] = useState<'day' | 'month' | 'year'>('month');
  const [currentDate, setCurrentDate] = useState<Date>(today);

  const currentDay = currentDate.getDate();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  const [selectedAccountId, setSelectedAccountId] = useState<number | ''>('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [filterOnlyExpenses, setFilterOnlyExpenses] = useState<boolean>(false);
  const [selectedTxIds, setSelectedTxIds] = useState<Set<number>>(new Set());

  const [primaryCurrency, setPrimaryCurrency] = useState<string>('EUR');
  const [exchangeRate, setExchangeRate] = useState<number>(117.2);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyTransactionsResponse | null>(null);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [totalTxCount, setTotalTxCount] = useState<number | null>(null);
  const hasAnyTransactions = totalTxCount !== 0;

  const [showTxModal, setShowTxModal] = useState(false);
  const [autoScanOnTxOpen, setAutoScanOnTxOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [showMassEditModal, setShowMassEditModal] = useState(false);
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'currency' | 'accounts' | 'categories' | 'data'>('currency');
  const [returnToTxModal, setReturnToTxModal] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const currentUser = await getMeApi();
        setUser(currentUser);
        if (currentUser.primary_currency) {
          setPrimaryCurrency(currentUser.primary_currency);
        }
        if (currentUser.exchange_rate) {
          setExchangeRate(Number(currentUser.exchange_rate));
        }
      } catch {
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    }
    checkAuth();
  }, []);

  useEffect(() => {
    if (!authLoading && !user && currentPath === '/dashboard') {
      navigate('/');
      setAuthModalMode('login');
    }
  }, [authLoading, user, currentPath]);

  useEffect(() => {
    if (!user) return;
    loadMetadata();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    loadTransactions();
  }, [user, dashboardPeriod, currentDate, selectedAccountId, primaryCurrency, exchangeRate]);

  useEffect(() => {
    setSelectedTxIds(new Set());
    setSelectedTag(null);
  }, [dashboardPeriod, currentDate, selectedAccountId]);

  const loadMetadata = async () => {
    try {
      const [accs, cats] = await Promise.all([
        listAccountsApi(),
        listCategoriesApi(),
      ]);
      setAccounts(accs);
      setCategories(cats);
    } catch (err) {
      console.error('Failed to load accounts/categories:', err);
    }
  };

  const loadTransactions = async () => {
    setLoadingTransactions(true);
    try {
      const [res, count] = await Promise.all([
        listMonthlyTransactionsApi({
          period: dashboardPeriod,
          day: dashboardPeriod === 'day' ? currentDay : undefined,
          month: dashboardPeriod !== 'year' ? currentMonth : undefined,
          year: currentYear,
          account_id: selectedAccountId ? Number(selectedAccountId) : undefined,
        }),
        countTransactionsApi().catch(() => null),
      ]);
      setMonthlyData(res);
      if (count !== null) setTotalTxCount(count);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const availableTags = useMemo(() => {
    if (!monthlyData) return [];
    const tagMap = new Map<string, TagStat>();

    for (const day of monthlyData.days) {
      for (const tx of day.transactions) {
        if (tx.tag && tx.tag.trim()) {
          const t = tx.tag.trim();
          const key = t.toLowerCase();
          const prev = tagMap.get(key) || {
            tag: t,
            count: 0,
            expenseCount: 0,
            totalExpense: 0,
            totalIncome: 0,
          };
          const amount = getTransactionPrimaryAmount(tx, primaryCurrency);
          const isExpense = isTransactionExpense(tx);
          const isIncome = isTransactionIncome(tx);

          tagMap.set(key, {
            tag: prev.tag,
            count: prev.count + 1,
            expenseCount: prev.expenseCount + (isExpense ? 1 : 0),
            totalExpense: prev.totalExpense + (isExpense ? amount : 0),
            totalIncome: prev.totalIncome + (isIncome ? amount : 0),
          });
        }
      }
    }

    return Array.from(tagMap.values()).sort((a, b) => b.totalExpense - a.totalExpense);
  }, [monthlyData, primaryCurrency]);

  const filteredMonthlyData = useMemo(() => {
    if (!monthlyData) return null;
    if (!selectedTag && !filterOnlyExpenses) return monthlyData;

    let totalInc = 0;
    let totalExp = 0;
    let count = 0;

    const days = monthlyData.days
      .map((day) => {
        const transactions = day.transactions.filter((tx) => {
          if (filterOnlyExpenses && !isTransactionExpense(tx)) return false;
          if (selectedTag) {
            return tx.tag && tx.tag.trim().toLowerCase() === selectedTag.trim().toLowerCase();
          }
          return true;
        });

        let dayInc = 0;
        let dayExp = 0;
        for (const tx of transactions) {
          const amt = getTransactionPrimaryAmount(tx, primaryCurrency);
          if (isTransactionExpense(tx)) dayExp += amt;
          else if (isTransactionIncome(tx)) dayInc += amt;
        }

        totalInc += dayInc;
        totalExp += dayExp;
        count += transactions.length;

        return {
          ...day,
          total_income_primary: dayInc,
          total_expense_primary: dayExp,
          net_primary: dayInc - dayExp,
          transactions,
        };
      })
      .filter((day) => day.transactions.length > 0);

    return {
      ...monthlyData,
      days,
      total_income_primary: totalInc,
      total_expense_primary: totalExp,
      net_primary: totalInc - totalExp,
      transaction_count: count,
    };
  }, [monthlyData, selectedTag, filterOnlyExpenses, primaryCurrency]);

  const selectedTransactions = useMemo(() => {
    if (!monthlyData || selectedTxIds.size === 0) return [];
    const all = monthlyData.days.flatMap((d) => d.transactions);
    return all.filter((tx) => selectedTxIds.has(tx.id));
  }, [monthlyData, selectedTxIds]);

  const selectionSummary = useMemo(() => {
    let totalExpense = 0;
    let totalIncome = 0;
    let totalAbsolute = 0;

    for (const tx of selectedTransactions) {
      const amt = getTransactionPrimaryAmount(tx, primaryCurrency);
      totalAbsolute += amt;
      if (isTransactionExpense(tx)) totalExpense += amt;
      else if (isTransactionIncome(tx)) totalIncome += amt;
    }

    return {
      count: selectedTransactions.length,
      totalExpense,
      totalIncome,
      difference: totalIncome - totalExpense,
      totalAbsolute,
    };
  }, [selectedTransactions, primaryCurrency]);

  const allVisibleTxIds = useMemo(() => {
    return filteredMonthlyData?.days.flatMap((d) => d.transactions.map((t) => t.id)) || [];
  }, [filteredMonthlyData]);

  const allVisibleSelected =
    allVisibleTxIds.length > 0 && allVisibleTxIds.every((id) => selectedTxIds.has(id));

  const handleToggleSelect = (id: number) => {
    setSelectedTxIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedTxIds((prev) => {
        const next = new Set(prev);
        allVisibleTxIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedTxIds((prev) => {
        const next = new Set(prev);
        allVisibleTxIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const handleClearSelection = () => {
    setSelectedTxIds(new Set());
  };

  const handleQuickDemo = async () => {
    setDemoLoading(true);
    const demoUser = 'student_demo';
    const demoEmail = 'student@university.edu';
    const demoPass = 'Password123!';

    try {
      let res;
      try {
        res = await loginApi(demoUser, demoPass);
      } catch {
        res = await registerApi(demoUser, demoEmail, demoPass);
      }
      setUser(res.user);
      if (res.user.primary_currency) setPrimaryCurrency(res.user.primary_currency);
      if (res.user.exchange_rate) setExchangeRate(Number(res.user.exchange_rate));
      navigate('/dashboard');
    } catch (err: any) {
      alert(err?.message || 'Demo login failed');
    } finally {
      setDemoLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutApi();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setAccounts([]);
      setCategories([]);
      setMonthlyData(null);
      navigate('/');
    }
  };

  const handleDeleteTransaction = async (txId: number) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    try {
      await deleteTransactionApi(txId);
      await Promise.all([loadTransactions(), loadMetadata()]);
    } catch (err) {
      console.error('Delete transaction failed:', err);
    }
  };

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const blob = await exportTransactionsApi(format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions_${format === 'csv' ? 'export.csv' : 'export.json'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(err?.message || `Failed to export transactions as ${format.toUpperCase()}`);
    }
  };

  const handlePrevPeriod = () => {
    setCurrentDate((d) => {
      if (dashboardPeriod === 'day') {
        return new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
      }
      if (dashboardPeriod === 'year') {
        return new Date(d.getFullYear() - 1, d.getMonth(), 1);
      }
      return new Date(d.getFullYear(), d.getMonth() - 1, 1);
    });
  };

  const handleNextPeriod = () => {
    setCurrentDate((d) => {
      if (dashboardPeriod === 'day') {
        return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
      }
      if (dashboardPeriod === 'year') {
        return new Date(d.getFullYear() + 1, d.getMonth(), 1);
      }
      return new Date(d.getFullYear(), d.getMonth() + 1, 1);
    });
  };

  const handleResetToCurrent = () => {
    setCurrentDate(new Date());
  };

  const periodLabel = useMemo(() => {
    if (dashboardPeriod === 'day') {
      return currentDate.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
    if (dashboardPeriod === 'year') {
      return `${currentDate.getFullYear()}`;
    }
    return `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  }, [dashboardPeriod, currentDate]);

  const isCurrentPeriodActive = useMemo(() => {
    const now = new Date();
    if (dashboardPeriod === 'day') {
      return currentDate.toDateString() === now.toDateString();
    }
    if (dashboardPeriod === 'year') {
      return currentDate.getFullYear() === now.getFullYear();
    }
    return currentDate.getMonth() === now.getMonth() && currentDate.getFullYear() === now.getFullYear();
  }, [dashboardPeriod, currentDate]);

  const openSettingsOnTab = (tab: 'currency' | 'accounts' | 'categories' | 'data') => {
    setSettingsTab(tab);
    setShowSettingsModal(true);
  };

  const totalWealth = accounts.reduce((acc, a) => acc + Number(a.current_balance || 0), 0);

  const formatPrimary = (val: number | string) => formatCurrencyAmount(val, primaryCurrency);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#090A0F] flex flex-col items-center justify-center text-slate-400 gap-4">
        <img
          src="/logo_white.png"
          alt="Finora"
          className="h-8 w-auto object-contain animate-pulse"
        />
        <div className="w-6 h-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        <span className="text-xs font-medium text-slate-400">Loading your finances...</span>
      </div>
    );
  }

  if (currentPath === '/' || !user) {
    return (
      <>
        <LandingPage
          user={user}
          onGoToDashboard={() => navigate('/dashboard')}
          onLogin={() => setAuthModalMode('login')}
          onRegister={() => setAuthModalMode('register')}
          onDemo={handleQuickDemo}
          demoLoading={demoLoading}
        />
        {authModalMode && (
          <AuthModal
            initialMode={authModalMode}
            onClose={() => setAuthModalMode(null)}
            onSuccess={(u) => {
              setUser(u);
              setAuthModalMode(null);
              if (u.primary_currency) setPrimaryCurrency(u.primary_currency);
              if (u.exchange_rate) setExchangeRate(Number(u.exchange_rate));
              navigate('/dashboard');
            }}
          />
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#090A0F] text-slate-100 flex flex-col font-sans">
      <Navbar
        currentView={currentView}
        onViewChange={setCurrentView}
        onNewTransaction={() => {
          setEditingTx(null);
          setAutoScanOnTxOpen(false);
          setShowTxModal(true);
        }}
        onOpenAiAssistant={() => setShowAiAssistant(true)}
        onOpenSettings={() => {
          setReturnToTxModal(false);
          openSettingsOnTab('currency');
        }}
        onLogout={handleLogout}
        username={user.username}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {currentView === 'statistics' && (
          <StatisticsView
            primaryCurrency={primaryCurrency}
            exchangeRate={exchangeRate}
          />
        )}

        {currentView === 'transactions' && (
          <div className="space-y-4 sm:space-y-6 pb-20">
            <PeriodHeader
              period={dashboardPeriod}
              onPeriodChange={setDashboardPeriod}
              periodLabel={periodLabel}
              isCurrentPeriodActive={isCurrentPeriodActive}
              totalWealth={totalWealth}
              onPrev={handlePrevPeriod}
              onNext={handleNextPeriod}
              onResetPeriod={handleResetToCurrent}
              formatPrimary={formatPrimary}
            />

            <SummaryMetrics
              income={filteredMonthlyData?.total_income_primary || 0}
              expense={filteredMonthlyData?.total_expense_primary || 0}
              net={filteredMonthlyData?.net_primary || 0}
              formatPrimary={formatPrimary}
            />

            <AccountFilterBar
              accounts={accounts}
              selectedAccountId={selectedAccountId}
              onSelectAccount={setSelectedAccountId}
              formatPrimary={formatPrimary}
            />

            <TagFilterBar
              tags={availableTags}
              selectedTag={selectedTag}
              onSelectTag={setSelectedTag}
              filterOnlyExpenses={filterOnlyExpenses}
              onToggleFilterOnlyExpenses={setFilterOnlyExpenses}
              formatPrimary={formatPrimary}
            />

            <TransactionsFeed
              loading={loadingTransactions}
              monthlyData={filteredMonthlyData}
              currentMonthName={MONTH_NAMES[currentMonth - 1]}
              currentYear={currentYear}
              primaryCurrency={primaryCurrency}
              formatPrimary={formatPrimary}
              period={dashboardPeriod}
              onPrevPeriod={handlePrevPeriod}
              onNextPeriod={handleNextPeriod}
              onSelectMonth={(year, month) => {
                setCurrentDate(new Date(year, month - 1, 1));
                setDashboardPeriod('month');
              }}
              selectedTxIds={selectedTxIds}
              onToggleSelect={handleToggleSelect}
              onSelectAll={handleSelectAllVisible}
              onClearSelection={handleClearSelection}
              onSelectTag={(tag) => setSelectedTag(tag ? tag : null)}
              selectedTag={selectedTag}
              onOpenMassEdit={() => setShowMassEditModal(true)}
              onAddTransaction={() => {
                setEditingTx(null);
                setShowTxModal(true);
              }}
              onOpenImport={() => setShowImportModal(true)}
              hasAnyTransactions={hasAnyTransactions}
              onEditTransaction={(tx) => {
                setEditingTx(tx);
                setShowTxModal(true);
              }}
              onDeleteTransaction={handleDeleteTransaction}
            />

            <SelectedTransactionsBar
              selectedCount={selectionSummary.count}
              totalExpense={selectionSummary.totalExpense}
              totalIncome={selectionSummary.totalIncome}
              difference={selectionSummary.difference}
              totalAbsolute={selectionSummary.totalAbsolute}
              formatPrimary={formatPrimary}
              onClearSelection={handleClearSelection}
              onOpenMassEdit={() => setShowMassEditModal(true)}
            />
          </div>
        )}
      </main>

      <Footer
        isLoggedIn={true}
        onNavigate={setCurrentView}
      />

      {showMassEditModal && (
        <MassEditModal
          selectedCount={selectedTxIds.size}
          selectedTxIds={Array.from(selectedTxIds)}
          accounts={accounts}
          categories={categories}
          availableTags={availableTags.map((t) => t.tag)}
          onClose={() => setShowMassEditModal(false)}
          onSuccess={async () => {
            setSelectedTxIds(new Set());
            await Promise.all([loadTransactions(), loadMetadata()]);
          }}
        />
      )}

      {showTxModal && (
        <TransactionModal
          accounts={accounts}
          categories={categories}
          primaryCurrency={primaryCurrency}
          defaultExchangeRate={exchangeRate}
          transactionToEdit={editingTx}
          autoTriggerScan={autoScanOnTxOpen}
          onClose={() => {
            setShowTxModal(false);
            setEditingTx(null);
            setAutoScanOnTxOpen(false);
          }}
          onSuccess={async () => {
            await Promise.all([loadTransactions(), loadMetadata()]);
          }}
          onOpenSettings={(tab) => {
            setReturnToTxModal(true);
            setShowTxModal(false);
            openSettingsOnTab(tab);
          }}
        />
      )}

      {showSettingsModal && (
        <SettingsModal
          initialTab={settingsTab}
          initialPrimaryCurrency={primaryCurrency}
          initialExchangeRate={exchangeRate}
          initialAccounts={accounts}
          initialCategories={categories}
          onClose={() => {
            setShowSettingsModal(false);
            if (returnToTxModal) {
              setReturnToTxModal(false);
              setShowTxModal(true);
            }
          }}
          onSettingsChanged={(newSettings) => {
            setPrimaryCurrency(newSettings.primary_currency);
            setExchangeRate(Number(newSettings.exchange_rate));
          }}
          onAccountsChanged={async () => {
            await Promise.all([loadMetadata(), loadTransactions()]);
          }}
          onCategoriesChanged={async () => {
            await loadMetadata();
          }}
          onDataCleared={async () => {
            await Promise.all([loadMetadata(), loadTransactions()]);
          }}
          hasAnyTransactions={hasAnyTransactions}
          onOpenImport={() => {
            setShowSettingsModal(false);
            setReturnToTxModal(false);
            setShowImportModal(true);
          }}
          onExport={handleExport}
        />
      )}

      <AiAssistantDrawer
        isOpen={showAiAssistant}
        onClose={() => setShowAiAssistant(false)}
        currentMonth={currentMonth}
        currentYear={currentYear}
        formatPrimary={formatPrimary}
      />

      <ImportTransactionsModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={async () => {
          await Promise.all([loadTransactions(), loadMetadata()]);
        }}
        primaryCurrency={primaryCurrency}
      />
    </div>
  );
}

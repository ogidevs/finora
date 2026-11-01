import React, { useEffect, useState } from 'react';
import {
  Check,
  ArrowRightLeft,
  RefreshCw,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import {
  SUPPORTED_CURRENCIES,
  getCurrencyMeta,
  formatCurrencyAmount,
  type CurrencyMeta,
} from '../../utils/currency';
import { listCurrenciesApi } from '../../api/settings';

interface CurrencyTabProps {
  primaryCurrency: string;
  currentExchangeRate: number;
  saving: boolean;
  onConfirmChange: (newCurrency: string, calculatedBaseRate: number) => Promise<void> | void;
}

export const CurrencyTab: React.FC<CurrencyTabProps> = ({
  primaryCurrency,
  currentExchangeRate,
  saving,
  onConfirmChange,
}) => {
  const [currencyList, setCurrencyList] = useState<CurrencyMeta[]>(SUPPORTED_CURRENCIES);
  const [isChanging, setIsChanging] = useState(false);
  const [targetCurrency, setTargetCurrency] = useState('');
  const [rateInput, setRateInput] = useState('');
  const [quoteMode, setQuoteMode] = useState<'from_per_to' | 'to_per_from'>('from_per_to');

  useEffect(() => {
    async function fetchCurrencies() {
      try {
        const res = await listCurrenciesApi();
        if (Array.isArray(res) && res.length > 0) {
          setCurrencyList(
            res.map((c) => ({
              code: c.code,
              name: c.name,
              symbol: c.symbol,
              defaultRate: Number(c.default_rate) || 1.0,
              isPrefix: c.symbol_position ? c.symbol_position === 'prefix' : Boolean(c.is_prefix),
              decimals: c.decimals ?? 2,
            }))
          );
        }
      } catch {
        // Retain static currency definitions on network failure
      }
    }
    fetchCurrencies();
  }, []);

  const currentMeta = getCurrencyMeta(primaryCurrency);
  const targetMeta = targetCurrency ? getCurrencyMeta(targetCurrency) : null;

  const fromBaseRate = currentExchangeRate > 0 ? currentExchangeRate : currentMeta.defaultRate;
  const toDefaultBaseRate = targetMeta ? targetMeta.defaultRate : 1.0;

  const recommendedFromPerTo = fromBaseRate / toDefaultBaseRate;
  const recommendedToPerFrom = toDefaultBaseRate / fromBaseRate;

  const handleStartChange = (newCode?: string) => {
    const code = (newCode || (primaryCurrency === 'EUR' ? 'USD' : 'EUR')).toUpperCase();
    if (code === primaryCurrency.toUpperCase()) return;

    setTargetCurrency(code);
    const toMeta = getCurrencyMeta(code);
    const recRateFromPerTo = fromBaseRate / toMeta.defaultRate;

    if (recRateFromPerTo >= 1) {
      setQuoteMode('from_per_to');
      setRateInput(recRateFromPerTo.toFixed(4));
    } else {
      setQuoteMode('to_per_from');
      setRateInput((1 / recRateFromPerTo).toFixed(4));
    }

    setIsChanging(true);
  };

  const handleTargetCurrencyChange = (newCode: string) => {
    const code = newCode.toUpperCase();
    setTargetCurrency(code);
    if (code === primaryCurrency.toUpperCase()) return;

    const toMeta = getCurrencyMeta(code);
    const recRateFromPerTo = fromBaseRate / toMeta.defaultRate;

    if (recRateFromPerTo >= 1) {
      setQuoteMode('from_per_to');
      setRateInput(recRateFromPerTo.toFixed(4));
    } else {
      setQuoteMode('to_per_from');
      setRateInput((toMeta.defaultRate / fromBaseRate).toFixed(4));
    }
  };

  const handleToggleQuoteMode = () => {
    const parsed = parseFloat(rateInput);
    if (!parsed || parsed <= 0) return;
    const inverted = 1 / parsed;
    setQuoteMode((prev) => (prev === 'from_per_to' ? 'to_per_from' : 'from_per_to'));
    setRateInput(inverted.toFixed(4));
  };

  const handleResetToRecommended = () => {
    if (!targetMeta) return;
    if (quoteMode === 'from_per_to') {
      setRateInput(recommendedFromPerTo.toFixed(4));
    } else {
      setRateInput(recommendedToPerFrom.toFixed(4));
    }
  };

  const parsedRate = parseFloat(rateInput);
  const isValidRate = !isNaN(parsedRate) && parsedRate > 0;

  let calculatedBaseRate = 1.0;
  if (targetCurrency.toUpperCase() === 'EUR') {
    calculatedBaseRate = 1.0;
  } else if (isValidRate) {
    if (quoteMode === 'from_per_to') {
      calculatedBaseRate = fromBaseRate / parsedRate;
    } else {
      calculatedBaseRate = fromBaseRate * parsedRate;
    }
  }

  let sample100PrimaryInTarget = 0;
  let sample100TargetInPrimary = 0;
  if (isValidRate) {
    if (quoteMode === 'from_per_to') {
      sample100PrimaryInTarget = 100 / parsedRate;
      sample100TargetInPrimary = 100 * parsedRate;
    } else {
      sample100PrimaryInTarget = 100 * parsedRate;
      sample100TargetInPrimary = 100 / parsedRate;
    }
  }

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCurrency || targetCurrency === primaryCurrency || !isValidRate) return;
    const finalRate = targetCurrency.toUpperCase() === 'EUR' ? 1.0 : Number(calculatedBaseRate.toFixed(4));
    await onConfirmChange(targetCurrency, finalRate);
    setIsChanging(false);
  };

  const handleCancel = () => {
    setIsChanging(false);
    setTargetCurrency('');
    setRateInput('');
  };

  return (
    <div className="space-y-6">
      <div className="p-4 sm:p-5 rounded-2xl bg-[#141824] border border-white/[0.08] relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 font-bold text-xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/10">
              {currentMeta.symbol}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-white tracking-tight">
                  {currentMeta.code}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                {currentMeta.name}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                All ledger feeds, monthly charts, account totals, and financial advisor forecasts calculate in this currency.
              </p>
            </div>
          </div>

          {!isChanging && (
            <button
              type="button"
              onClick={() => handleStartChange()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer self-start sm:self-center shrink-0"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Change Primary Currency</span>
            </button>
          )}
        </div>
      </div>

      {isChanging && targetMeta && (
        <form
          onSubmit={handleConfirm}
          className="p-5 rounded-2xl bg-[#11141D] border border-indigo-500/30 shadow-xl space-y-5 animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold">
              <Sparkles className="w-4 h-4" />
              <span>Change Currency &amp; Set Exchange Rate</span>
            </div>
            <button
              type="button"
              onClick={handleCancel}
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-200">
              New Primary Currency
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div className="p-3 rounded-xl bg-[#161A26] border border-white/[0.06] flex items-center gap-2.5 text-xs text-slate-400">
                <span className="font-semibold text-slate-300">Current:</span>
                <span className="font-bold text-white">{currentMeta.code} - {currentMeta.name}</span>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={targetCurrency}
                  onChange={(e) => handleTargetCurrencyChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#161A26] border border-indigo-500/40 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {currencyList
                    .filter((c) => c.code !== primaryCurrency.toUpperCase())
                    .map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} - {c.name} ({c.symbol})
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#161A26] border border-white/[0.08] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>Exchange Rate</span>
                  <span className="text-slate-400 font-normal">
                    ({currentMeta.code} &harr; {targetMeta.code})
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Recommended based on market parity. You can adjust this rate to match your preferred conversion.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleQuoteMode}
                  title="Swap rate perspective"
                  className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[11px] text-slate-300 flex items-center gap-1 transition-colors cursor-pointer border border-white/[0.06]"
                >
                  <ArrowRightLeft className="w-3 h-3 text-indigo-400" />
                  <span>Invert view</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetToRecommended}
                  title="Reset to recommended market rate"
                  className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-[11px] text-indigo-300 flex items-center gap-1 transition-colors cursor-pointer border border-indigo-500/25"
                >
                  <RefreshCw className="w-3 h-3 text-indigo-400" />
                  <span>Market Rate</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <span className="text-xs font-semibold text-white whitespace-nowrap bg-[#11141D] px-3 py-2 rounded-xl border border-white/[0.08]">
                {quoteMode === 'from_per_to' ? `1 ${targetMeta.code} =` : `1 ${currentMeta.code} =`}
              </span>

              <input
                type="number"
                step="0.0001"
                min="0.0001"
                required
                value={rateInput}
                onChange={(e) => setRateInput(e.target.value)}
                placeholder="Enter custom rate..."
                className="flex-1 px-3.5 py-2 bg-[#11141D] border border-indigo-500/50 rounded-xl text-sm font-mono text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />

              <span className="text-xs font-semibold text-white whitespace-nowrap bg-[#11141D] px-3 py-2 rounded-xl border border-white/[0.08]">
                {quoteMode === 'from_per_to' ? currentMeta.code : targetMeta.code}
              </span>
            </div>

            {isValidRate && (
              <div className="pt-2 border-t border-white/[0.06] grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-[#11141D] border border-white/[0.06] flex items-center justify-between">
                  <span className="text-slate-400">100 {currentMeta.code}:</span>
                  <span className="font-semibold text-emerald-400">
                    ≈ {formatCurrencyAmount(sample100PrimaryInTarget, targetMeta.code)}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#11141D] border border-white/[0.06] flex items-center justify-between">
                  <span className="text-slate-400">100 {targetMeta.code}:</span>
                  <span className="font-semibold text-indigo-300">
                    ≈ {formatCurrencyAmount(sample100TargetInPrimary, currentMeta.code)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5 text-xs text-amber-200/90">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Updating your primary currency to <strong>{targetMeta.code}</strong> will recompute existing dashboard balances and analytics into <strong>{targetMeta.code}</strong> using this confirmed rate. Your raw transaction records keep their original currency codes intact.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !isValidRate}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{saving ? 'Updating...' : `Confirm Change to ${targetMeta.code}`}</span>
            </button>
          </div>
        </form>
      )}

      {!isChanging && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Supported Currencies
            </h4>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {currencyList.map((c) => {
              const isCurrent = c.code === primaryCurrency.toUpperCase();
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => !isCurrent && handleStartChange(c.code)}
                  disabled={isCurrent}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${isCurrent
                    ? 'bg-indigo-500/10 border-indigo-500/30 text-white cursor-default'
                    : 'bg-[#141824] hover:bg-[#1A2030] border-white/[0.06] hover:border-white/[0.15] text-slate-300 hover:text-white cursor-pointer'
                    }`}
                >
                  <div className="flex items-center justify-between w-full mb-1.5">
                    <span className="text-xs font-bold text-white tracking-wide">
                      {c.code}
                    </span>
                    <span className="w-6 h-6 rounded-lg bg-white/[0.06] text-slate-300 text-xs font-bold flex items-center justify-center">
                      {c.symbol}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 truncate">
                    {c.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

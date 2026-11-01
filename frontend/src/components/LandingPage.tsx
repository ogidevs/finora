import React, { useState } from 'react';
import {
  ArrowRight,
  Sparkles,
  Receipt,
  TrendingUp,
  Coins,
  CheckCircle2,
  Scan,
  Tag,
  ArrowUpRight,
  ArrowDownRight,
  Lock,
} from 'lucide-react';
import { Footer } from './Footer';
import type { User } from '../api/auth';

interface LandingPageProps {
  onLogin: () => void;
  onRegister: () => void;
  onDemo: () => void;
  demoLoading?: boolean;
  user?: User | null;
  onGoToDashboard?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onLogin,
  onRegister,
  onDemo,
  demoLoading = false,
  user,
  onGoToDashboard,
}) => {
  const [activeTab, setActiveTab] = useState<'ledger' | 'ocr' | 'forecast'>('ledger');

  return (
    <div className="min-h-screen bg-[#090A0F] text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      <header className="sticky top-0 z-40 bg-[#090A0F]/85 backdrop-blur-md border-b border-white/[0.07]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo_white.png"
              alt="Finora"
              className="h-7.5 w-auto object-contain shrink-0"
            />
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {user ? (
              <>
                <div className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>
                    Signed in as <strong className="text-white">{user.username}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onGoToDashboard}
                  className="px-3.5 sm:px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-sm shadow-indigo-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>Open Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onDemo}
                  disabled={demoLoading}
                  className="px-3 sm:px-3.5 py-1.5 rounded-xl bg-[#161A26] hover:bg-[#1E2333] border border-white/[0.1] hover:border-white/[0.2] text-xs font-semibold text-slate-200 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>{demoLoading ? 'Starting demo...' : 'Try Demo'}</span>
                </button>

                <button
                  type="button"
                  onClick={onLogin}
                  className="px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                >
                  Sign In
                </button>

                <button
                  type="button"
                  onClick={onRegister}
                  className="px-3.5 sm:px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-sm shadow-indigo-600/30 transition-all cursor-pointer"
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="pt-14 sm:pt-20 pb-12 sm:pb-16 px-4 sm:px-6 relative">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.15]">
            Clarity over your money,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-indigo-200">
              without the busywork.
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Finora pairs multi-currency transaction tracking with fast receipt OCR, cash flow trend analytics, and local forecasting models - completely private on your own device.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {user ? (
              <button
                type="button"
                onClick={onGoToDashboard}
                className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98]"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-4 h-4 ml-0.5" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onDemo}
                  disabled={demoLoading}
                  className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>{demoLoading ? 'Loading sandbox...' : 'Launch Interactive Demo'}</span>
                  <ArrowRight className="w-4 h-4 ml-0.5" />
                </button>

                <button
                  type="button"
                  onClick={onRegister}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-[#141824] hover:bg-[#1A2030] border border-white/[0.08] hover:border-white/[0.15] text-sm font-medium text-slate-200 hover:text-white transition-colors cursor-pointer"
                >
                  Create Account
                </button>
              </>
            )}
          </div>

          <div className="flex items-center justify-center gap-6 pt-3 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> One-click demo
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> No credit card
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 100% Data privacy
            </span>
          </div>
        </div>

        <div className="max-w-5xl mx-auto mt-12 sm:mt-16">
          <div className="rounded-2xl bg-[#11141D] border border-white/[0.1] shadow-2xl overflow-hidden">
            <div className="px-4 py-3 bg-[#0D0F17] border-b border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                <span className="ml-2 text-xs font-mono text-slate-400">finora://workspace/demo</span>
              </div>

              <div className="flex items-center bg-[#161A26] p-0.5 rounded-lg border border-white/[0.06] text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setActiveTab('ledger')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${activeTab === 'ledger'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                  Ledger View
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('ocr')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${activeTab === 'ocr'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                  Receipt OCR
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('forecast')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${activeTab === 'forecast'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                  Forecasting &amp; AI
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 bg-[#0E1119]">
              {activeTab === 'ledger' && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl bg-[#141824] border border-white/[0.06]">
                      <div className="text-[11px] font-medium text-slate-400 mb-1">Monthly Inflow</div>
                      <div className="text-lg font-bold text-emerald-400 tracking-tight flex items-center justify-between">
                        <span>+€2,450.00</span>
                        <ArrowUpRight className="w-4 h-4 text-emerald-400/70" />
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">2 income deposits</div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#141824] border border-white/[0.06]">
                      <div className="text-[11px] font-medium text-slate-400 mb-1">Monthly Expenses</div>
                      <div className="text-lg font-bold text-rose-400 tracking-tight flex items-center justify-between">
                        <span>-€1,180.50</span>
                        <ArrowDownRight className="w-4 h-4 text-rose-400/70" />
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">Across 18 transactions</div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#141824] border border-white/[0.06]">
                      <div className="text-[11px] font-medium text-slate-400 mb-1">Net Cash Flow</div>
                      <div className="text-lg font-bold text-indigo-300 tracking-tight flex items-center justify-between">
                        <span>+€1,269.50</span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                          +51.8%
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">Added to savings vault</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-slate-400 text-[11px] font-medium mr-1">Active Accounts:</span>
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-medium">
                      Intesa EUR (€1,420.50)
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.07] text-slate-300 font-medium">
                      Cash Wallet (12,850 RSD)
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.07] text-slate-300 font-medium">
                      Emergency Savings (€3,500.00)
                    </span>
                  </div>

                  <div className="space-y-2 border border-white/[0.06] rounded-xl overflow-hidden bg-[#11141D]">
                    <div className="px-3.5 py-2 bg-[#161A26] border-b border-white/[0.06] text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                      <span>RECENT ENTRIES</span>
                      <span>PRIMARY BASE: EUR (117.2 RSD)</span>
                    </div>

                    <div className="divide-y divide-white/[0.04]">
                      <div className="px-3.5 py-2.5 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                            <Receipt className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-white flex items-center gap-2">
                              <span>Maxi Supermarket</span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
                                OCR Attached
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                              <span>Cash RSD</span>
                              <span>&bull;</span>
                              <span className="text-slate-400">#groceries</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-bold text-rose-400">-3,450.00 RSD</div>
                          <div className="text-[10px] text-slate-400">&approx; -€29.44</div>
                        </div>
                      </div>

                      <div className="px-3.5 py-2.5 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                            <ArrowUpRight className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-white">Client Milestone Payout</div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                              <span>Intesa EUR</span>
                              <span>&bull;</span>
                              <span className="text-slate-400">#freelance</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-bold text-emerald-400">+€1,200.00</div>
                          <div className="text-[10px] text-emerald-400/80">Direct Deposit</div>
                        </div>
                      </div>

                      <div className="px-3.5 py-2.5 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                            <Tag className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-white">Cloud Server &amp; Domain</div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                              <span>Intesa EUR</span>
                              <span>&bull;</span>
                              <span className="text-slate-400">#software</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-bold text-rose-400">-€14.99</div>
                          <div className="text-[10px] text-slate-400">Recurring</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'ocr' && (
                <div className="p-4 sm:p-6 rounded-xl bg-[#141824] border border-white/[0.06] space-y-4 animate-in fade-in duration-200">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 flex items-center justify-center shrink-0">
                        <Scan className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">Automated OCR Parser</h4>
                        <p className="text-xs text-slate-400">
                          Extracts receipt line items, store name, date, and final balance instantly.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    <div className="p-3.5 rounded-xl bg-[#0E1119] border border-white/[0.06] space-y-2">
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Source Document
                      </div>
                      <div className="h-28 rounded-lg bg-[#141824] border border-dashed border-white/[0.12] flex flex-col items-center justify-center text-slate-400 text-xs p-3 text-center">
                        <Receipt className="w-6 h-6 text-indigo-400 mb-1" />
                        <span className="font-medium text-slate-300">receipt_grocery_may.jpg</span>
                        <span className="text-[10px] text-slate-400">Fiscal slip parsed via PaddleOCR engine</span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#0E1119] border border-white/[0.06] space-y-2 text-xs">
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Extracted Fields
                      </div>
                      <div className="space-y-1.5 text-slate-300">
                        <div className="flex justify-between py-1 border-b border-white/[0.04]">
                          <span className="text-slate-400">Merchant</span>
                          <span className="font-semibold text-white">DELHAIZE SERBIA / MAXI</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-white/[0.04]">
                          <span className="text-slate-400">Detected Total</span>
                          <span className="font-semibold text-emerald-400">3,450.00 RSD</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-white/[0.04]">
                          <span className="text-slate-400">Suggested Category</span>
                          <span className="font-semibold text-indigo-300">Groceries &amp; Household</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-slate-400">Confidence Score</span>
                          <span className="font-medium text-slate-300">97.4%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'forecast' && (
                <div className="p-4 sm:p-6 rounded-xl bg-[#141824] border border-white/[0.06] space-y-4 animate-in fade-in duration-200">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/25 text-purple-400 flex items-center justify-center shrink-0">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">Prophet &amp; ARIMA Time-Series</h4>
                        <p className="text-xs text-slate-400">
                          Forecasts next month expenses and runway using historical trends.
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-indigo-300 bg-indigo-500/10 border border-indigo-500/25 px-2.5 py-1 rounded-lg">
                      Local Llama 3 Advisor
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                    <div className="md:col-span-2 p-3.5 rounded-xl bg-[#0E1119] border border-white/[0.06] flex flex-col justify-between">
                      <div className="flex items-center justify-between text-xs mb-3">
                        <span className="font-semibold text-slate-300">Projected 30-Day Expense Trajectory</span>
                        <span className="text-indigo-400 text-[11px]">Confidence 80%</span>
                      </div>
                      <div className="h-24 flex items-end gap-1.5 px-2 pb-1 border-b border-white/[0.06]">
                        {[45, 60, 52, 70, 85, 65, 58, 72, 80, 68, 75, 82, 60, 55].map((val, idx) => (
                          <div
                            key={idx}
                            style={{ height: `${val}%` }}
                            className={`flex-1 rounded-t transition-all ${idx > 10 ? 'bg-indigo-500/40 border-t-2 border-indigo-400' : 'bg-indigo-500/80'
                              }`}
                            title={`Day ${idx + 1}`}
                          />
                        ))}
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400 pt-2">
                        <span>Past 10 Days</span>
                        <span className="text-indigo-300 font-medium">Model Forecast Window (Meta Prophet)</span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#0E1119] border border-white/[0.06] space-y-2 text-xs flex flex-col justify-between">
                      <div className="space-y-1.5">
                        <div className="text-[11px] font-semibold text-purple-300 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Advisor Observation</span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          &quot;Dining expenses are trending 14% below baseline. You are currently on track to save approximately €340 more than the prior month.&quot;
                        </p>
                      </div>
                      <div className="text-[10px] text-slate-400 border-t border-white/[0.06] pt-2">
                        Generated locally via Ollama LLM
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-20 px-4 sm:px-6 border-t border-white/[0.06] bg-[#07090F]">
        <div className="max-w-5xl mx-auto space-y-10">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h2 className="text-xl sm:text-3xl font-bold text-white tracking-tight">
              Engineered for real everyday finances
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              No bloated spreadsheets. No third-party data tracking. Just clean, fast tracking.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl bg-[#11141D] border border-white/[0.07] hover:border-white/[0.12] transition-colors space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 flex items-center justify-center">
                <Coins className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Multi-Currency Ledger
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Seamlessly mix bank accounts, cash wallets, and crypto in EUR, RSD, or USD. Instant conversion to your primary currency keeps your true net worth consistent.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#11141D] border border-white/[0.07] hover:border-white/[0.12] transition-colors space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center justify-center">
                <Receipt className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Camera to Feed with OCR
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Take a picture or drop store receipts. The built-in scanner extracts store names, dates, and amounts into ready-to-save records so you don&apos;t type them manually.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#11141D] border border-white/[0.07] hover:border-white/[0.12] transition-colors space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/25 text-purple-400 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Private Forecasting &amp; LLM
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Meta Prophet and ARIMA forecast upcoming spending trajectories. An optional Ollama Llama 3 advisor provides financial insights completely on-device.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 px-4 sm:px-6 border-t border-white/[0.06]">
        <div className="max-w-4xl mx-auto rounded-2xl bg-[#11141D] border border-white/[0.08] p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 text-indigo-400 text-xs font-semibold">
              <Lock className="w-3.5 h-3.5" />
              <span>DATA OWNERSHIP FIRST</span>
            </div>
            <h3 className="text-lg font-bold text-white">Your money data never leaves your environment</h3>
            <p className="text-xs text-slate-400 max-w-md">
              No telemetry, no bank credentials sold to third-party ad brokers. Export full CSV records at any time with zero vendor lock-in.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {user ? (
              <button
                type="button"
                onClick={onGoToDashboard}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onDemo}
                  disabled={demoLoading}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {demoLoading ? 'Starting demo...' : 'Try Demo Mode'}
                </button>
                <button
                  type="button"
                  onClick={onRegister}
                  className="px-4 py-2.5 rounded-xl bg-[#161A26] hover:bg-[#1E2333] border border-white/[0.08] text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Sign Up
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      <Footer
        onOpenAuth={(mode) => (mode === 'login' ? onLogin() : onRegister())}
        onOpenDemo={onDemo}
        isLoggedIn={Boolean(user)}
        onNavigate={() => onGoToDashboard?.()}
      />
    </div>
  );
};

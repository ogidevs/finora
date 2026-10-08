import React from 'react';
import {
  ArrowUp,
  Receipt,
  LineChart,
  Bot,
  Coins,
} from 'lucide-react';

interface FooterProps {
  onOpenAuth?: (mode: 'login' | 'register') => void;
  onOpenDemo?: () => void;
  isLoggedIn?: boolean;
  onNavigate?: (view: 'transactions' | 'statistics') => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenAuth,
  onOpenDemo,
  isLoggedIn = false,
  onNavigate,
}) => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="w-full bg-[#07080C] border-t border-white/[0.07] text-slate-400 font-sans mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="flex flex-col md:flex-row items-start justify-between gap-8 lg:gap-12">
          <div className="space-y-4 max-w-sm">
            <div className="flex items-center gap-2.5">
              <img
                src="/logo_white.png"
                alt="Finora"
                className="h-7 w-auto object-contain"
              />
            </div>

            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              A private ledger for your multi-currency cash flows, automated receipt scans, and local time-series spending forecasts.
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-start gap-10 sm:gap-16 lg:gap-24">
            <div className="space-y-3 min-w-[160px]">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                Capabilities
              </h4>
              <ul className="space-y-2 text-xs text-slate-400">
                <li className="flex items-center gap-2 hover:text-slate-200 transition-colors">
                  <Coins className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>Multi-currency Ledger</span>
                </li>
                <li className="flex items-center gap-2 hover:text-slate-200 transition-colors">
                  <Receipt className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>OCR Receipt Parsing</span>
                </li>
                <li className="flex items-center gap-2 hover:text-slate-200 transition-colors">
                  <LineChart className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>Prophet &amp; ARIMA Forecasts</span>
                </li>
                <li className="flex items-center gap-2 hover:text-slate-200 transition-colors">
                  <Bot className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>Private Ollama Assistant</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3 min-w-[120px]">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                Navigation
              </h4>
              <div className="space-y-2 text-xs">
                {isLoggedIn ? (
                  <>
                    <button
                      type="button"
                      onClick={() => onNavigate?.('transactions')}
                      className="block text-slate-400 hover:text-white transition-colors cursor-pointer text-left"
                    >
                      Transactions Ledger
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigate?.('statistics')}
                      className="block text-slate-400 hover:text-white transition-colors cursor-pointer text-left"
                    >
                      Analytics &amp; Trends
                    </button>
                  </>
                ) : (
                  <>
                    {onOpenDemo && (
                      <button
                        type="button"
                        onClick={onOpenDemo}
                        className="block text-indigo-400 hover:text-indigo-300 font-medium transition-colors cursor-pointer text-left"
                      >
                        Instant Demo Login
                      </button>
                    )}
                    {onOpenAuth && (
                      <>
                        <button
                          type="button"
                          onClick={() => onOpenAuth('login')}
                          className="block text-slate-400 hover:text-white transition-colors cursor-pointer text-left"
                        >
                          Sign In
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenAuth('register')}
                          className="block text-slate-400 hover:text-white transition-colors cursor-pointer text-left"
                        >
                          Create Account
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span>&copy; {new Date().getFullYear()} Finora</span>
          </div>

          <button
            type="button"
            onClick={scrollToTop}
            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-white/[0.04]"
          >
            <span>Back to top</span>
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </footer>
  );
};

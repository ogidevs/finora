import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard,
  PieChart,
  Plus,
  Settings as SettingsIcon,
  LogOut,
  Sparkles,
  ChevronDown,
} from 'lucide-react';

interface NavbarProps {
  currentView: 'transactions' | 'statistics';
  onViewChange: (view: 'transactions' | 'statistics') => void;
  onNewTransaction: () => void;
  onOpenAiAssistant: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  username: string;
}

function getUserInitials(name?: string) {
  if (!name) return 'U';
  const parts = name.trim().split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase();
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onViewChange,
  onNewTransaction,
  onOpenAiAssistant,
  onOpenSettings,
  onLogout,
  username,
}) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setUserMenuOpen(false);
      }
    };

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [userMenuOpen]);

  return (
    <header className="sticky top-0 z-40 bg-[#090A0F]/85 backdrop-blur-md border-b border-white/[0.07]">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3 md:gap-5 min-w-0">
          <button
            type="button"
            onClick={() => onViewChange('transactions')}
            className="flex items-center gap-2 shrink-0 text-left hover:opacity-90 transition-opacity cursor-pointer"
          >
            <img
              src="/logo_white.png"
              alt="Finora"
              className="h-7.5 w-auto object-contain shrink-0"
            />
          </button>

          <div className="hidden md:block h-4 w-px bg-white/[0.08] shrink-0" />

          <nav className="flex items-center rounded-xl bg-[#121622]/90 p-1 border border-white/[0.08] shadow-inner text-xs font-semibold shrink-0">
            <button
              type="button"
              onClick={() => onViewChange('transactions')}
              className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg transition-all cursor-pointer ${currentView === 'transactions'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              title="Transactions"
            >
              <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden md:inline">Transactions</span>
            </button>

            <button
              type="button"
              onClick={() => onViewChange('statistics')}
              className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg transition-all cursor-pointer ${currentView === 'statistics'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              title="Analytics"
            >
              <PieChart className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden md:inline">Analytics</span>
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onOpenAiAssistant}
            className="group px-2 sm:px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/10 hover:from-indigo-500/20 hover:via-purple-500/20 hover:to-indigo-500/20 border border-indigo-500/30 hover:border-indigo-400/50 text-indigo-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shadow-indigo-500/10 shrink-0"
            title="Open AI Financial Advisor"
          >
            <div className="w-4 h-4 rounded-md bg-indigo-500/20 flex items-center justify-center text-indigo-300 group-hover:scale-110 transition-transform shrink-0">
              <Sparkles className="w-3 h-3" />
            </div>
            <span className="hidden lg:inline">Advisor</span>
          </button>

          <button
            type="button"
            onClick={onNewTransaction}
            className="px-2.5 sm:px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-sm shadow-indigo-600/20 flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
            title="New Transaction"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">New</span>
          </button>

          <div className="h-4 w-px bg-white/[0.08] hidden sm:block shrink-0" />

          <div className="relative shrink-0" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setUserMenuOpen((prev) => !prev)}
              className={`flex items-center gap-1 sm:gap-2 p-1 sm:pl-1.5 sm:pr-2.5 bg-[#141824] hover:bg-[#1A2030] rounded-xl border transition-all cursor-pointer ${userMenuOpen ? 'border-indigo-500/50 ring-1 ring-indigo-500/20' : 'border-white/[0.08]'
                }`}
              title="Account Menu"
            >
              <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-300 font-bold text-[11px] flex items-center justify-center shrink-0">
                {getUserInitials(username)}
              </div>
              <span className="text-xs font-medium text-slate-300 hidden md:inline max-w-[100px] truncate">
                {username}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 max-w-[calc(100vw-24px)] rounded-2xl bg-[#141824] border border-white/[0.1] shadow-2xl shadow-black/60 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-2 border-b border-white/[0.06] mb-1">
                  <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Signed in as</div>
                  <div className="text-xs font-semibold text-white truncate">{username}</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    onOpenSettings();
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                >
                  <SettingsIcon className="w-4 h-4 text-slate-400" />
                  <span>Settings</span>
                </button>

                <div className="h-px bg-white/[0.06] my-1" />

                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

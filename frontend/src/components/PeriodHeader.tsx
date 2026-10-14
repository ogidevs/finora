import React from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface PeriodHeaderProps {
  period: 'day' | 'month' | 'year';
  onPeriodChange: (p: 'day' | 'month' | 'year') => void;
  periodLabel: string;
  isCurrentPeriodActive: boolean;
  totalWealth: number;
  onPrev: () => void;
  onNext: () => void;
  onResetPeriod: () => void;
  formatPrimary: (val: number | string) => string;
}

export const PeriodHeader: React.FC<PeriodHeaderProps> = ({
  period,
  onPeriodChange,
  periodLabel,
  isCurrentPeriodActive,
  totalWealth,
  onPrev,
  onNext,
  onResetPeriod,
  formatPrimary,
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-[#11141D] border border-white/[0.07]">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-xl bg-[#161A26] p-0.5 border border-white/[0.08] text-xs font-semibold">
          <button
            type="button"
            onClick={() => onPeriodChange('day')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              period === 'day'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Day
          </button>
          <button
            type="button"
            onClick={() => onPeriodChange('month')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              period === 'month'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Month
          </button>
          <button
            type="button"
            onClick={() => onPeriodChange('year')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              period === 'year'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Year
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl bg-[#161A26] border border-white/[0.08] p-0.5">
            <button
              type="button"
              onClick={onPrev}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
              title={period === 'year' ? 'Previous Year' : period === 'day' ? 'Previous Day' : 'Previous Month'}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onNext}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
              title={period === 'year' ? 'Next Year' : period === 'day' ? 'Next Day' : 'Next Month'}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-1.5">
              {period === 'year' && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Year
                </span>
              )}
              <span>{periodLabel}</span>
            </h2>
            {!isCurrentPeriodActive && (
              <button
                type="button"
                onClick={onResetPeriod}
                className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 ml-1 px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 cursor-pointer"
              >
                Today
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="text-left md:text-right pt-2 md:pt-0 border-t md:border-t-0 border-white/[0.06]">
        <div className="text-[10px] sm:text-[11px] font-medium text-slate-400">Total Net Worth</div>
        <div className="text-sm sm:text-base font-bold text-white tnum tracking-tight">
          {formatPrimary(totalWealth)}
        </div>
      </div>
    </div>
  );
};

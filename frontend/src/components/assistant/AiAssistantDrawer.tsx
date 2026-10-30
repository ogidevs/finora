import React, { useState, useEffect } from 'react';
import { X, Sparkles, RefreshCw, MessageSquare, Compass, CheckCircle2 } from 'lucide-react';
import { getAssistantInsightsApi, type AssistantInsightResponse } from '../../api/assistant';
import { FinancialHealthSnapshot } from './FinancialHealthSnapshot';
import { AiChatBox } from './AiChatBox';
import { MarkdownView } from './MarkdownView';

interface AiAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentMonth: number;
  currentYear: number;
  formatPrimary: (val: number | string) => string;
}

export const AiAssistantDrawer: React.FC<AiAssistantDrawerProps> = ({
  isOpen,
  onClose,
  currentMonth,
  currentYear,
  formatPrimary,
}) => {
  const [activeTab, setActiveTab] = useState<'insights' | 'chat'>('insights');
  const [insights, setInsights] = useState<AssistantInsightResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAssistantInsightsApi(currentMonth, currentYear);
      setInsights(data);
    } catch (err: any) {
      setError(err.message || 'Failed to generate financial insights.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchInsights();
    }
  }, [isOpen, currentMonth, currentYear]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg bg-[#090A0F] border-l border-white/[0.08] shadow-2xl h-full flex flex-col z-10">
        <div className="p-3.5 sm:p-4 border-b border-white/[0.07] bg-[#0E111A] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="text-xs sm:text-sm font-bold text-white tracking-tight">AI Advisor</span>
                {insights && (
                  <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 whitespace-nowrap">
                    {insights.provider === 'ollama' ? 'LLaMA 3' : 'Rule Engine'}
                  </span>
                )}
              </div>
              <span className="text-[10px] sm:text-[11px] text-slate-400 block truncate">
                Period: {insights?.facts.period || `${currentMonth}/${currentYear}`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              disabled={loading}
              onClick={fetchInsights}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
              title="Refresh Insights"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
              title="Close Advisor"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-3 sm:px-4 pt-2.5 pb-2 bg-[#0E111A] border-b border-white/[0.06] flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('insights')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'insights'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Overview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'chat'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {loading && !insights && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
              <div className="w-7 h-7 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
              <span className="text-xs">Analyzing financial telemetry...</span>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs space-y-2">
              <div>{error}</div>
              <button
                type="button"
                onClick={fetchInsights}
                className="text-xs font-semibold text-rose-400 underline hover:text-rose-300"
              >
                Try again
              </button>
            </div>
          )}

          {activeTab === 'insights' && insights && (
            <div className="space-y-4">
              <FinancialHealthSnapshot
                facts={insights.facts}
                formatPrimary={formatPrimary}
              />

              <div className="p-4 rounded-xl bg-[#141824] border border-white/[0.06] space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Executive Assessment</span>
                </div>
                <MarkdownView content={insights.summary} />
              </div>

              {insights.recommendations.length > 0 && (
                <div className="p-4 rounded-xl bg-[#141824] border border-white/[0.06] space-y-2.5">
                  <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Recommended Actions
                  </div>
                  <div className="space-y-2">
                    {insights.recommendations.map((rec, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-300 leading-relaxed">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'chat' && (
            <AiChatBox
              currentMonth={currentMonth}
              currentYear={currentYear}
            />
          )}
        </div>
      </div>
    </div>
  );
};

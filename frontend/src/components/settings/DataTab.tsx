import React, { useState } from 'react';
import {
  Trash2,
  AlertTriangle,
  Check,
  ShieldAlert,
  ArrowDownUp,
  Upload,
  Download,
  FileSpreadsheet,
  FileCode,
  Loader2,
} from 'lucide-react';
import { clearAllTransactionsApi } from '../../api/transactions';

interface DataTabProps {
  onDataCleared?: () => void;
  onAccountsChanged?: () => void;
  onError?: (msg: string) => void;
  hasAnyTransactions?: boolean;
  onOpenImport?: () => void;
  onExport?: (format: 'csv' | 'json') => void | Promise<void>;
}

export const DataTab: React.FC<DataTabProps> = ({
  onDataCleared,
  onAccountsChanged,
  onError,
  hasAnyTransactions = false,
  onOpenImport,
  onExport,
}) => {
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [exporting, setExporting] = useState<'csv' | 'json' | null>(null);

  const handleExport = async (format: 'csv' | 'json') => {
    if (!onExport || exporting) return;
    setExporting(format);
    try {
      await onExport(format);
    } finally {
      setExporting(null);
    }
  };

  const handleDeleteAll = async () => {
    setLoading(true);
    setSuccessMessage(null);
    try {
      const res = await clearAllTransactionsApi();
      setSuccessMessage(res.message || 'All transaction data has been permanently cleared and account balances reset to 0.00.');
      setConfirmOpen(false);
      onAccountsChanged?.();
      onDataCleared?.();
    } catch (err: any) {
      onError?.(err.message || 'Failed to delete data.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2.5 text-emerald-400 text-xs animate-in fade-in">
          <Check className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {hasAnyTransactions && (onOpenImport || onExport) && (
        <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-b from-indigo-500/[0.05] to-transparent border border-indigo-500/20 space-y-5">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
              <ArrowDownUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Import &amp; Export</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Bring in transactions from a CSV or JSON file, or download a full backup of all your transactions.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {onOpenImport && (
              <button
                type="button"
                id="settings-import-transactions-btn"
                onClick={onOpenImport}
                className="h-9 inline-flex items-center justify-center gap-1.5 px-3.5 rounded-xl border border-indigo-500/60 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm shadow-indigo-600/20 transition-all cursor-pointer sm:col-span-2"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import CSV / JSON</span>
              </button>
            )}
            {onExport && (
              <>
                <button
                  type="button"
                  id="settings-export-csv-btn"
                  disabled={exporting !== null}
                  onClick={() => handleExport('csv')}
                  className="h-9 inline-flex items-center justify-center gap-1.5 px-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 disabled:opacity-50 text-emerald-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
                >
                  {exporting === 'csv' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                  )}
                  <span>Export CSV</span>
                  <Download className="w-3 h-3 opacity-70" />
                </button>
                <button
                  type="button"
                  id="settings-export-json-btn"
                  disabled={exporting !== null}
                  onClick={() => handleExport('json')}
                  className="h-9 inline-flex items-center justify-center gap-1.5 px-3.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 disabled:opacity-50 text-indigo-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
                >
                  {exporting === 'json' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FileCode className="w-3.5 h-3.5" />
                  )}
                  <span>Export JSON</span>
                  <Download className="w-3 h-3 opacity-70" />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-b from-rose-500/[0.04] to-transparent border border-rose-500/20 space-y-5">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Danger Zone: Delete All Financial Data</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Permanently wipe all transaction records and reset your account balances to 0.00. Your accounts and category definitions will be kept.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#141824] border border-white/[0.06] space-y-2 text-xs text-slate-300">
          <div className="flex items-center gap-2 text-rose-300 font-semibold">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>This action is destructive and irreversible:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
            <li>All income, expense, and transfer transactions will be deleted.</li>
            <li>All account balances will be reset to 0.00.</li>
            <li>Analytics, trends, and forecasts will be cleared.</li>
          </ul>
        </div>

        {!confirmOpen ? (
          <div>
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/30 hover:border-rose-500 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete All Data</span>
            </button>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-3 animate-in fade-in">
            <div className="text-xs font-semibold text-rose-300">
              Are you absolutely sure you want to permanently delete all transactions?
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                disabled={loading}
                onClick={handleDeleteAll}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
              >
                {loading ? (
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Yes, Delete Everything</span>
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => setConfirmOpen(false)}
                className="px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 text-xs font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

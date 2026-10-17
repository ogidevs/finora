import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Download,
  Loader2,
} from 'lucide-react';
import { importTransactionsApi } from '../api/transactions';

interface ImportTransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  primaryCurrency: string;
}

export const ImportTransactionsModal: React.FC<ImportTransactionsModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  primaryCurrency,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    imported_count: number;
    skipped_count: number;
    errors: string[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClose = useCallback(() => {
    if (uploading) return;
    setSelectedFile(null);
    setResult(null);
    setIsDragging(false);
    onClose();
  }, [uploading, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelected = (file: File) => {
    const ext = file.name.toLowerCase();
    if (!ext.endsWith('.csv') && !ext.endsWith('.json')) {
      alert('Please upload a .csv or .json file.');
      return;
    }
    setSelectedFile(file);
    setResult(null);
  };

  const handleDownloadTemplate = (format: 'csv' | 'json') => {
    let content = '';
    let mime = '';
    let filename = '';

    if (format === 'csv') {
      content =
        'date,type,amount,currency,account,category,note,tag\n' +
        `2026-10-01,EXPENSE,24.50,${primaryCurrency},Card,Groceries,Weekly grocery store,food\n` +
        `2026-10-02,INCOME,2500.00,${primaryCurrency},Bank,Salary,Monthly paycheck,income\n` +
        `2026-10-03,TRANSFER,200.00,${primaryCurrency},Bank,Savings,Monthly savings,transfer\n`;
      mime = 'text/csv';
      filename = 'transactions_template.csv';
    } else {
      const templateData = [
        {
          date: '2026-10-01',
          type: 'EXPENSE',
          amount: 24.5,
          currency: primaryCurrency,
          account: 'Card',
          category: 'Groceries',
          note: 'Weekly grocery store',
          tag: 'food',
        },
        {
          date: '2026-10-02',
          type: 'INCOME',
          amount: 2500.0,
          currency: primaryCurrency,
          account: 'Bank',
          category: 'Salary',
          note: 'Monthly paycheck',
          tag: 'income',
        },
        {
          date: '2026-10-03',
          type: 'TRANSFER',
          amount: 200.0,
          currency: primaryCurrency,
          account: 'Bank',
          to_account: 'Savings',
          note: 'Monthly savings',
          tag: 'transfer',
        },
      ];
      content = JSON.stringify(templateData, null, 2);
      mime = 'application/json';
      filename = 'transactions_template.json';
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    setResult(null);

    try {
      const resp = await importTransactionsApi(selectedFile);
      setResult({
        success: true,
        message: resp.message,
        imported_count: resp.imported_count,
        skipped_count: resp.skipped_count,
        errors: resp.errors || [],
      });
      onSuccess();
    } catch (err: any) {
      setResult({
        success: false,
        message: err.response?.data?.detail || err.message || 'Import failed',
        imported_count: 0,
        skipped_count: 0,
        errors: [],
      });
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="w-full max-w-lg bg-[#11141D] border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 sm:p-5 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Import Transactions</h2>
              <p className="text-xs text-slate-400">Import your transactions from CSV or JSON</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-[#141824] border border-white/[0.06] text-xs">
            <span className="text-slate-400 font-medium">Download sample templates:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleDownloadTemplate('csv')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 font-semibold transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>CSV Template</span>
                <Download className="w-3 h-3 ml-0.5" />
              </button>
              <button
                type="button"
                onClick={() => handleDownloadTemplate('json')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 font-semibold transition-all cursor-pointer"
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>JSON Template</span>
                <Download className="w-3 h-3 ml-0.5" />
              </button>
            </div>
          </div>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-indigo-500 bg-indigo-500/10'
                : selectedFile
                ? 'border-indigo-500/50 bg-[#141824]'
                : 'border-white/[0.12] hover:border-white/[0.25] bg-[#141824]/60'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.json,text/csv,application/json"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileSelected(e.target.files[0]);
                }
              }}
            />

            {selectedFile ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
                  {selectedFile.name.endsWith('.json') ? (
                    <FileCode className="w-6 h-6" />
                  ) : (
                    <FileSpreadsheet className="w-6 h-6" />
                  )}
                </div>
                <div className="font-semibold text-white text-sm break-all">{selectedFile.name}</div>
                <div className="text-xs text-slate-400">
                  {(selectedFile.size / 1024).toFixed(1)} KB &bull;{' '}
                  {selectedFile.name.endsWith('.json') ? 'JSON file' : 'CSV file'}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReset();
                  }}
                  className="mt-2 text-xs text-rose-400 hover:text-rose-300 underline cursor-pointer"
                >
                  Choose a different file
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-slate-400 flex items-center justify-center">
                  <Upload className="w-5 h-5 text-indigo-400" />
                </div>
                <div className="font-semibold text-white text-sm">
                  Click to select file or drag & drop
                </div>
                <div className="text-xs text-slate-400 max-w-xs">
                  Supported formats: <strong className="text-slate-200">.csv</strong>,{' '}
                  <strong className="text-slate-200">.json</strong>
                </div>
              </div>
            )}
          </div>

          {result && (
            <div
              className={`p-4 rounded-xl border text-xs space-y-2 ${
                result.success
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
              }`}
            >
              <div className="flex items-center gap-2 font-bold">
                {result.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{result.message}</span>
              </div>

              {result.success && (
                <div className="text-slate-300 space-y-1 pl-6">
                  <div>
                    Imported transactions:{' '}
                    <strong className="text-white">{result.imported_count}</strong>
                  </div>
                  {result.skipped_count > 0 && (
                    <div className="text-amber-400">
                      Skipped entries: {result.skipped_count}
                    </div>
                  )}
                </div>
              )}

              {result.errors.length > 0 && (
                <div className="mt-2 pl-6 space-y-1">
                  <div className="font-semibold text-rose-400">Validation notes:</div>
                  <ul className="list-disc list-inside text-[11px] text-slate-300 space-y-0.5">
                    {result.errors.slice(0, 5).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 sm:p-5 border-t border-white/[0.08] flex items-center justify-end gap-2.5 bg-[#0D1018]">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] text-xs font-semibold transition-all cursor-pointer"
          >
            {result?.success ? 'Close' : 'Cancel'}
          </button>
          {!result?.success && (
            <button
              type="button"
              disabled={!selectedFile || uploading}
              onClick={handleSubmit}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            >
              {uploading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{uploading ? 'Importing...' : 'Upload & Import'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

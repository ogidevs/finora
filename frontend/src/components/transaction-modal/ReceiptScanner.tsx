import React from 'react';
import { Camera, Loader2, CheckCircle2 } from 'lucide-react';

interface ReceiptScannerProps {
  scanning: boolean;
  scanSuccessMessage: string | null;
  onClearSuccessMessage: () => void;
  onScanFile: (file: File) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export const ReceiptScanner: React.FC<ReceiptScannerProps> = ({
  scanning,
  scanSuccessMessage,
  onClearSuccessMessage,
  onScanFile,
  fileInputRef,
}) => {
  const handleReceiptFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onScanFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <>
      <div className="shrink-0">
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          onChange={handleReceiptFileChange}
          className="hidden"
        />
        <button
          type="button"
          disabled={scanning}
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
          title="Scan Receipt"
        >
          {scanning ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
              <span>Scanning...</span>
            </>
          ) : (
            <>
              <Camera className="w-3.5 h-3.5 text-indigo-400" />
              <span>Scan Receipt</span>
            </>
          )}
        </button>
      </div>

      {scanning && (
        <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-2.5 text-indigo-300 text-xs">
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 text-indigo-400" />
          <span>Scanning receipt and extracting data...</span>
        </div>
      )}

      {scanSuccessMessage && (
        <div className="mb-4 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-2 text-emerald-300 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
            <span>Receipt data loaded</span>
          </div>
          <button
            type="button"
            onClick={onClearSuccessMessage}
            className="text-emerald-400/60 hover:text-emerald-300 cursor-pointer px-1"
          >
            &times;
          </button>
        </div>
      )}
    </>
  );
};

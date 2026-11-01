import React, { useState, useEffect } from 'react';
import {
  X,
  SlidersHorizontal,
  CreditCard,
  FolderTree,
  Calendar,
  FileText,
  Tag as TagIcon,
  Check,
  AlertCircle,
} from 'lucide-react';
import { isSavingsAccountType, type Account } from '../api/accounts';
import { type Category } from '../api/categories';
import { batchUpdateTransactionsApi, type TransactionBatchUpdatePayload } from '../api/transactions';

interface CustomCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  size?: 'sm' | 'md';
  children?: React.ReactNode;
}

const CustomCheckbox: React.FC<CustomCheckboxProps> = ({
  checked,
  onChange,
  size = 'md',
  children,
}) => {
  const isSm = size === 'sm';
  return (
    <label className="flex items-center gap-2.5 cursor-pointer select-none group">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <div
        className={`${
          isSm ? 'w-3.5 h-3.5 rounded' : 'w-4 h-4 rounded-md'
        } flex items-center justify-center shrink-0 border transition-all ${
          checked
            ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm shadow-indigo-600/30'
            : 'bg-white/[0.04] border-white/[0.2] text-transparent group-hover:border-white/40'
        }`}
      >
        <Check className={isSm ? 'w-2.5 h-2.5 stroke-[3]' : 'w-3 h-3 stroke-[3]'} />
      </div>
      {children && <div className="text-white font-medium">{children}</div>}
    </label>
  );
};

interface MassEditModalProps {
  selectedCount: number;
  selectedTxIds: number[];
  accounts: Account[];
  categories: Category[];
  availableTags?: string[];
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
}

export const MassEditModal: React.FC<MassEditModalProps> = ({
  selectedCount,
  selectedTxIds,
  accounts,
  categories,
  availableTags = [],
  onClose,
  onSuccess,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const [updateAccount, setUpdateAccount] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<number>(accounts[0]?.id || 0);

  const [updateCategory, setUpdateCategory] = useState(false);
  const [clearCategory, setClearCategory] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | ''>('');
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<number | ''>('');

  const [updateDate, setUpdateDate] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });

  const [updateNote, setUpdateNote] = useState(false);
  const [clearNote, setClearNote] = useState(false);
  const [noteValue, setNoteValue] = useState<string>('');

  const [updateTag, setUpdateTag] = useState(false);
  const [clearTag, setClearTag] = useState(false);
  const [tagValue, setTagValue] = useState<string>('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedMainCategory = categories.find((c) => c.id === selectedCategoryId);
  const availableSubcategories = selectedMainCategory?.subcategories || [];

  const isAnyFieldEnabled =
    updateAccount || updateCategory || updateDate || updateNote || updateTag;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAnyFieldEnabled) {
      setErrorMsg('Please select at least one field to update.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const payload: TransactionBatchUpdatePayload = {
      transaction_ids: selectedTxIds,
    };

    if (updateAccount) {
      payload.account_id = selectedAccountId;
    }

    if (updateCategory) {
      if (clearCategory) {
        payload.clear_category = true;
      } else {
        const finalCatId = selectedSubcategoryId || selectedCategoryId;
        if (finalCatId) {
          payload.category_id = Number(finalCatId);
        } else {
          payload.clear_category = true;
        }
      }
    }

    if (updateDate) {
      payload.date = selectedDate;
    }

    if (updateNote) {
      if (clearNote) {
        payload.clear_note = true;
      } else {
        payload.note = noteValue.trim();
      }
    }

    if (updateTag) {
      if (clearTag) {
        payload.clear_tag = true;
      } else {
        payload.tag = tagValue.trim();
      }
    }

    try {
      await batchUpdateTransactionsApi(payload);
      await onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || err.message || 'Failed to update transactions.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in"
    >
      <div className="w-full max-w-lg bg-[#11141D] border border-white/[0.09] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 px-5 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Mass Edit Transactions</h2>
              <p className="text-xs text-slate-400">
                Updating <strong className="text-indigo-300">{selectedCount}</strong> selected transactions
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div
            className={`p-3.5 rounded-xl border transition-all ${
              updateAccount
                ? 'bg-[#151928] border-indigo-500/40 ring-1 ring-indigo-500/20'
                : 'bg-[#141722] border-white/[0.05]'
            }`}
          >
            <div className="mb-2">
              <CustomCheckbox checked={updateAccount} onChange={setUpdateAccount}>
                <div className="flex items-center gap-1.5 font-bold text-white">
                  <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                  <span>Account</span>
                </div>
              </CustomCheckbox>
            </div>

            {updateAccount && (
              <div className="pl-6 pt-1">
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#1A1F2C] border border-white/[0.09] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} [{isSavingsAccountType(a.type) ? 'Saving' : 'Spending'}]
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div
            className={`p-3.5 rounded-xl border transition-all ${
              updateCategory
                ? 'bg-[#151928] border-indigo-500/40 ring-1 ring-indigo-500/20'
                : 'bg-[#141722] border-white/[0.05]'
            }`}
          >
            <div className="mb-2">
              <CustomCheckbox checked={updateCategory} onChange={setUpdateCategory}>
                <div className="flex items-center gap-1.5 font-bold text-white">
                  <FolderTree className="w-3.5 h-3.5 text-amber-400" />
                  <span>Category / Subcategory</span>
                </div>
              </CustomCheckbox>
            </div>

            {updateCategory && (
              <div className="pl-6 space-y-2 pt-1">
                <CustomCheckbox
                  checked={clearCategory}
                  onChange={setClearCategory}
                  size="sm"
                >
                  <span className="text-xs text-slate-400 group-hover:text-slate-200">
                    Remove category (set to General)
                  </span>
                </CustomCheckbox>

                {!clearCategory && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <select
                      value={selectedCategoryId}
                      onChange={(e) => {
                        setSelectedCategoryId(e.target.value ? Number(e.target.value) : '');
                        setSelectedSubcategoryId('');
                      }}
                      className="w-full px-3 py-2 bg-[#1A1F2C] border border-white/[0.09] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">Select Main Category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>

                    <select
                      value={selectedSubcategoryId}
                      disabled={availableSubcategories.length === 0}
                      onChange={(e) =>
                        setSelectedSubcategoryId(e.target.value ? Number(e.target.value) : '')
                      }
                      className="w-full px-3 py-2 bg-[#1A1F2C] border border-white/[0.09] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 disabled:opacity-40"
                    >
                      <option value="">
                        {availableSubcategories.length > 0 ? 'No Subcategory' : 'No Subcategories'}
                      </option>
                      {availableSubcategories.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>

          <div
            className={`p-3.5 rounded-xl border transition-all ${
              updateDate
                ? 'bg-[#151928] border-indigo-500/40 ring-1 ring-indigo-500/20'
                : 'bg-[#141722] border-white/[0.05]'
            }`}
          >
            <div className="mb-2">
              <CustomCheckbox checked={updateDate} onChange={setUpdateDate}>
                <div className="flex items-center gap-1.5 font-bold text-white">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Date</span>
                </div>
              </CustomCheckbox>
            </div>

            {updateDate && (
              <div className="pl-6 pt-1">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#1A1F2C] border border-white/[0.09] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}
          </div>

          <div
            className={`p-3.5 rounded-xl border transition-all ${
              updateNote
                ? 'bg-[#151928] border-indigo-500/40 ring-1 ring-indigo-500/20'
                : 'bg-[#141722] border-white/[0.05]'
            }`}
          >
            <div className="mb-2">
              <CustomCheckbox checked={updateNote} onChange={setUpdateNote}>
                <div className="flex items-center gap-1.5 font-bold text-white">
                  <FileText className="w-3.5 h-3.5 text-purple-400" />
                  <span>Note</span>
                </div>
              </CustomCheckbox>
            </div>

            {updateNote && (
              <div className="pl-6 space-y-2 pt-1">
                <CustomCheckbox
                  checked={clearNote}
                  onChange={setClearNote}
                  size="sm"
                >
                  <span className="text-xs text-slate-400 group-hover:text-slate-200">
                    Clear note on all selected transactions
                  </span>
                </CustomCheckbox>

                {!clearNote && (
                  <input
                    type="text"
                    placeholder="Enter new note..."
                    value={noteValue}
                    onChange={(e) => setNoteValue(e.target.value)}
                    className="w-full px-3 py-2 bg-[#1A1F2C] border border-white/[0.09] rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                )}
              </div>
            )}
          </div>

          <div
            className={`p-3.5 rounded-xl border transition-all ${
              updateTag
                ? 'bg-[#151928] border-indigo-500/40 ring-1 ring-indigo-500/20'
                : 'bg-[#141722] border-white/[0.05]'
            }`}
          >
            <div className="mb-2">
              <CustomCheckbox checked={updateTag} onChange={setUpdateTag}>
                <div className="flex items-center gap-1.5 font-bold text-white">
                  <TagIcon className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Tag</span>
                </div>
              </CustomCheckbox>
            </div>

            {updateTag && (
              <div className="pl-6 space-y-2 pt-1">
                <CustomCheckbox
                  checked={clearTag}
                  onChange={setClearTag}
                  size="sm"
                >
                  <span className="text-xs text-slate-400 group-hover:text-slate-200">
                    Clear tag on all selected transactions
                  </span>
                </CustomCheckbox>

                {!clearTag && (
                  <>
                    <input
                      type="text"
                      placeholder="e.g. groceries, dining, vacation..."
                      value={tagValue}
                      onChange={(e) => setTagValue(e.target.value)}
                      className="w-full px-3 py-2 bg-[#1A1F2C] border border-white/[0.09] rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                    />

                    {availableTags.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] text-slate-500 font-medium">Suggestions:</span>
                        {availableTags.slice(0, 6).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setTagValue(t)}
                            className="px-2 py-0.5 rounded-md bg-white/[0.05] hover:bg-white/[0.1] text-indigo-300 text-[10px] font-medium transition-colors cursor-pointer border border-white/[0.05]"
                          >
                            #{t}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-transparent hover:bg-white/[0.06] text-slate-300 rounded-xl font-semibold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !isAnyFieldEnabled}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-md shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Applying...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Apply to {selectedCount} Transactions</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

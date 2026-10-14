import React, { useState } from 'react';
import { Tag as TagIcon, X, Search, Filter } from 'lucide-react';

export interface TagStat {
  tag: string;
  count: number;
  expenseCount: number;
  totalExpense: number;
  totalIncome: number;
}

interface TagFilterBarProps {
  tags: TagStat[];
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
  filterOnlyExpenses: boolean;
  onToggleFilterOnlyExpenses: (val: boolean) => void;
  formatPrimary: (val: number | string) => string;
}

export const TagFilterBar: React.FC<TagFilterBarProps> = ({
  tags,
  selectedTag,
  onSelectTag,
  filterOnlyExpenses,
  onToggleFilterOnlyExpenses,
  formatPrimary,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  if (tags.length === 0 && !selectedTag) {
    return null;
  }

  const filteredTags = tags.filter((t) =>
    t.tag.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const activeTagStat = tags.find((t) => t.tag.toLowerCase() === selectedTag?.toLowerCase());

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-[#11141D] border border-white/[0.07] rounded-2xl p-3 px-3.5 sm:px-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
            <TagIcon className="w-3.5 h-3.5" />
          </div>
          <span>Tags</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {tags.length > 5 && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Find tag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-2.5 py-1 text-xs bg-[#171B26] border border-white/[0.08] rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 w-24 sm:w-36 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => onToggleFilterOnlyExpenses(!filterOnlyExpenses)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5 ${filterOnlyExpenses
              ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
              : 'bg-[#171B26] border-white/[0.07] text-slate-400 hover:text-slate-200'
              }`}
          >
            <Filter className="w-3 h-3" />
            <span>Expenses Only</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1.5 no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0">
        <button
          type="button"
          onClick={() => onSelectTag(null)}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 border ${selectedTag === null
            ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm shadow-indigo-600/30'
            : 'bg-[#11141D] hover:bg-[#171B26] text-slate-400 hover:text-slate-200 border-white/[0.06]'
            }`}
        >
          All Tags
        </button>

        {filteredTags.map((item) => {
          const isSelected = selectedTag?.toLowerCase() === item.tag.toLowerCase();
          return (
            <button
              key={item.tag}
              type="button"
              onClick={() => onSelectTag(isSelected ? null : item.tag)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${isSelected
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm shadow-indigo-600/30'
                : 'bg-[#11141D] hover:bg-[#171B26] text-slate-300 hover:text-white border-white/[0.06]'
                }`}
            >
              <div>
                <span>#{item.tag}</span>
                {item.totalExpense > 0 && (
                  <span
                    className={`text-[10px] px-1.5 ml-2 rounded-md ${isSelected
                      ? 'bg-indigo-700/60 text-indigo-100'
                      : 'bg-white/[0.05] text-slate-400'
                      }`}
                  >
                    {formatPrimary(item.totalExpense)}
                  </span>
                )}
                {item.totalIncome > 0 && (
                  <span
                    className={`text-[10px] px-1.5 ml-2 rounded-md ${isSelected
                      ? 'bg-indigo-700/60 text-indigo-100'
                      : 'bg-white/[0.05] text-slate-400'
                      }`}
                  >
                    {formatPrimary(item.totalIncome)}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {selectedTag && (
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-indigo-300 font-medium">Filtering by tag:</span>
            <span className="font-bold text-white bg-indigo-500/25 px-2 py-0.5 rounded-md border border-indigo-500/30">
              #{selectedTag}
            </span>
            {activeTagStat && activeTagStat.expenseCount > 0 && (
              <span className="text-slate-400 hidden sm:inline">
                ({activeTagStat.expenseCount} expenses totaling{' '}
                <strong className="text-rose-400">{formatPrimary(activeTagStat.totalExpense)}</strong>)
              </span>
            )}
            {activeTagStat && activeTagStat.totalIncome > 0 && (
              <span className="text-slate-400 hidden sm:inline">
                (Income Total:{' '}
                <strong className="text-emerald-400">{formatPrimary(activeTagStat.totalIncome)}</strong>)
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => onSelectTag(null)}
            className="text-indigo-300 hover:text-white flex items-center gap-1 font-semibold cursor-pointer text-[11px]"
          >
            <span>Clear filter</span>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

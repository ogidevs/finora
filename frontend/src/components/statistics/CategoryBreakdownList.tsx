import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Layers } from 'lucide-react';
import { type CategoryStat, type SubcategoryStat } from '../../api/analytics';

interface CategoryBreakdownListProps {
  categories: CategoryStat[];
  formatPrimary: (val: number | string) => string;
}

export const CategoryBreakdownList: React.FC<CategoryBreakdownListProps> = ({
  categories,
  formatPrimary,
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Record<number, boolean>>({});

  const toggleExpand = (catId: number) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  return (
    <div className="p-5 rounded-2xl bg-[#11141D] border border-white/[0.07] space-y-3">
      <h3 className="text-sm font-bold text-white">Category Breakdown</h3>

      <div className="space-y-2">
        {categories.map((cat: CategoryStat) => {
          const isExpanded = !!expandedCategories[cat.category_id];
          const hasSubs = cat.subcategories.length > 0;
          const isExpense = cat.type === 'EXPENSE';

          return (
            <div
              key={cat.category_id}
              className="p-3 rounded-xl bg-[#161A26] border border-white/[0.05] hover:border-white/[0.1] transition-colors"
            >
              <div
                onClick={() => hasSubs && toggleExpand(cat.category_id)}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                  hasSubs ? 'cursor-pointer select-none' : ''
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {hasSubs ? (
                    <button type="button" className="text-slate-400 p-0.5 cursor-pointer">
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-indigo-400" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                    </button>
                  ) : (
                    <div className="w-3.5" />
                  )}

                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color || (isExpense ? '#F43F5E' : '#10B981') }}
                  />

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">
                        {cat.category_name}
                      </span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                          isExpense
                            ? 'text-rose-400 bg-rose-500/10'
                            : 'text-emerald-400 bg-emerald-500/10'
                        }`}
                      >
                        {cat.type}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {cat.transaction_count} tx &bull; {cat.percentage}% of {cat.type.toLowerCase()}
                    </span>
                  </div>
                </div>

                <div className="text-right sm:pl-4">
                  <div className={`text-xs font-bold tnum ${isExpense ? 'text-white' : 'text-emerald-400'}`}>
                    {formatPrimary(cat.total_amount_primary)}
                  </div>
                </div>
              </div>

              <div className="w-full h-1 bg-white/[0.05] rounded-full mt-2.5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, cat.percentage)}%`,
                    backgroundColor: cat.color || (isExpense ? '#F43F5E' : '#10B981'),
                  }}
                />
              </div>

              {isExpanded && hasSubs && (
                <div className="mt-2.5 pt-2 border-t border-white/[0.06] pl-6 space-y-1.5 animate-in fade-in duration-100">
                  {cat.subcategories.map((sub: SubcategoryStat) => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between text-xs py-1 text-slate-300"
                    >
                      <div className="flex items-center gap-2">
                        <Layers className="w-3 h-3 text-indigo-400" />
                        <span className="font-medium text-slate-200">{sub.name}</span>
                        <span className="text-[10px] text-slate-500">
                          ({sub.transaction_count} tx &bull; {sub.percentage}%)
                        </span>
                      </div>

                      <div className="text-right font-semibold text-slate-200 tnum">
                        {formatPrimary(sub.total_amount_primary)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

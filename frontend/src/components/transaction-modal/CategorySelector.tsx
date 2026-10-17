import React from 'react';
import { Settings2 } from 'lucide-react';
import { type Category, type Subcategory } from '../../api/categories';

interface CategorySelectorProps {
  filteredCategories: Category[];
  categoryId: number | '';
  subcategoryId: number | '';
  availableSubcategories: Subcategory[];
  onCategoryChange: (catId: number | '') => void;
  onSubcategoryChange: (subId: number | '') => void;
  onOpenSettings: (tab: 'accounts' | 'categories' | 'currency') => void;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  filteredCategories,
  categoryId,
  subcategoryId,
  availableSubcategories,
  onCategoryChange,
  onSubcategoryChange,
  onOpenSettings,
}) => {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-300">Category</label>
        <button
          type="button"
          onClick={() => onOpenSettings('categories')}
          className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 cursor-pointer"
        >
          <Settings2 className="w-3 h-3" />
          Manage
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div>
          <select
            value={categoryId}
            onChange={(e) => onCategoryChange(e.target.value ? Number(e.target.value) : '')}
            className="w-full px-3 py-2 bg-[#171B26] border border-white/[0.08] rounded-xl text-xs font-medium text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="">General</option>
            {filteredCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={subcategoryId}
            disabled={availableSubcategories.length === 0}
            onChange={(e) => onSubcategoryChange(e.target.value ? Number(e.target.value) : '')}
            className="w-full px-3 py-2 bg-[#171B26] border border-white/[0.08] rounded-xl text-xs font-medium text-white focus:outline-none focus:border-indigo-500 disabled:opacity-40"
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
      </div>
    </div>
  );
};

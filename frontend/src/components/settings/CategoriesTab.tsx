import React, { useState } from 'react';
import { Plus, Trash2, Layers } from 'lucide-react';
import {
  createCategoryApi,
  deleteCategoryApi,
  type Category,
} from '../../api/categories';

const PRESET_COLORS = [
  '#3B82F6',
  '#10B981',
  '#8B5CF6',
  '#EC4899',
  '#F59E0B',
  '#06B6D4',
  '#EF4444',
  '#64748B',
];

interface CategoriesTabProps {
  categories: Category[];
  onCategoriesChanged: () => void;
  onError: (msg: string) => void;
}

export const CategoriesTab: React.FC<CategoriesTabProps> = ({
  categories,
  onCategoriesChanged,
  onError,
}) => {
  const [catTypeFilter, setCatTypeFilter] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState(PRESET_COLORS[0]);
  const [activeAddSubCatId, setActiveAddSubCatId] = useState<number | null>(null);
  const [newSubCatName, setNewSubCatName] = useState('');

  const handleCreateTopCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    try {
      await createCategoryApi({
        name: newCatName.trim(),
        type: catTypeFilter,
        color: newCatColor,
      });
      setNewCatName('');
      setShowAddCategory(false);
      onCategoriesChanged();
    } catch (err: any) {
      onError(err.message || 'Failed to create category.');
    }
  };

  const handleCreateSubcategory = async (parentId: number) => {
    if (!newSubCatName.trim()) return;
    try {
      await createCategoryApi({
        name: newSubCatName.trim(),
        type: catTypeFilter,
        parent_id: parentId,
      });
      setNewSubCatName('');
      setActiveAddSubCatId(null);
      onCategoriesChanged();
    } catch (err: any) {
      onError(err.message || 'Failed to create subcategory.');
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('Delete this category? If it contains subcategories, they will also be removed.')) return;
    try {
      await deleteCategoryApi(id);
      onCategoriesChanged();
    } catch (err: any) {
      onError(err.message || 'Failed to delete category.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-xl bg-[#161A26] p-0.5 border border-white/[0.08] text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setCatTypeFilter('EXPENSE');
              setActiveAddSubCatId(null);
            }}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              catTypeFilter === 'EXPENSE'
                ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Expense
          </button>
          <button
            type="button"
            onClick={() => {
              setCatTypeFilter('INCOME');
              setActiveAddSubCatId(null);
            }}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              catTypeFilter === 'INCOME'
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Income
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowAddCategory(!showAddCategory)}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Category</span>
        </button>
      </div>

      {showAddCategory && (
        <form
          onSubmit={handleCreateTopCategory}
          className="p-4 rounded-xl bg-[#161A26] border border-white/[0.08] space-y-3 animate-in fade-in duration-100"
        >
          <div className="text-xs font-bold text-white flex items-center gap-2">
            New {catTypeFilter === 'EXPENSE' ? 'Expense' : 'Income'} Category
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Category Name
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="e.g. Groceries, Utilities, Rent"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="w-full px-3 py-2 bg-[#11141D] border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Color
              </label>
              <div className="flex items-center gap-1.5 pt-1">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewCatColor(c)}
                    className={`w-4 h-4 rounded-full transition-transform cursor-pointer ${
                      newCatColor === c ? 'scale-125 ring-2 ring-white' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddCategory(false)}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-sm cursor-pointer"
            >
              Save Category
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {categories
          .filter((c) => c.type === catTypeFilter)
          .map((cat) => (
            <div
              key={cat.id}
              className="p-3.5 rounded-xl bg-[#161A26] border border-white/[0.06] hover:border-white/[0.1] transition-all space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color || '#6366F1' }}
                  />
                  <div>
                    <span className="text-xs font-bold text-white">{cat.name}</span>
                    {cat.subcategories.length > 0 && (
                      <span className="ml-2 text-[10px] text-slate-400">
                        ({cat.subcategories.length})
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (activeAddSubCatId === cat.id) {
                        setActiveAddSubCatId(null);
                      } else {
                        setActiveAddSubCatId(cat.id);
                        setNewSubCatName('');
                      }
                    }}
                    className={`px-2 py-1 text-xs font-semibold rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                      activeAddSubCatId === cat.id
                        ? 'bg-indigo-600 text-white'
                        : 'text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10'
                    }`}
                  >
                    <Plus className="w-3 h-3" />
                    <span>Subcategory</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                    title="Delete category"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {activeAddSubCatId === cat.id && (
                <div className="p-2 rounded-xl bg-[#11141D] border border-indigo-500/30 flex items-center gap-2 animate-in fade-in duration-100">
                  <input
                    type="text"
                    autoFocus
                    placeholder={`Subcategory for ${cat.name}...`}
                    value={newSubCatName}
                    onChange={(e) => setNewSubCatName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateSubcategory(cat.id);
                      } else if (e.key === 'Escape') {
                        setActiveAddSubCatId(null);
                      }
                    }}
                    className="flex-1 px-2.5 py-1 bg-[#171B26] border border-white/[0.08] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleCreateSubcategory(cat.id)}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveAddSubCatId(null)}
                    className="px-2 py-1 text-xs text-slate-400 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {cat.subcategories.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pl-5 pt-1 border-t border-white/[0.04]">
                  {cat.subcategories.map((sub) => (
                    <span
                      key={sub.id}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[#11141D] border border-white/[0.06] text-[11px] text-slate-300"
                    >
                      <Layers className="w-2.5 h-2.5 text-slate-500" />
                      <span>{sub.name}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(sub.id)}
                        className="ml-0.5 text-slate-500 hover:text-rose-400 cursor-pointer"
                        title="Delete subcategory"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
};

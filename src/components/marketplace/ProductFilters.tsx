import React from 'react';
import { Filter, RotateCcw } from 'lucide-react';
import { CraftCategory } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';

interface ProductFiltersProps {
  selectedCategory: CraftCategory | 'All';
  onCategoryChange: (category: CraftCategory | 'All') => void;
  sortBy: 'popular' | 'price_asc' | 'price_desc' | 'newest';
  onSortChange: (sort: 'popular' | 'price_asc' | 'price_desc' | 'newest') => void;
  priceRange: [number, number];
  onPriceRangeChange: (range: [number, number]) => void;
  inStockOnly: boolean;
  onInStockChange: (inStock: boolean) => void;
  totalResults: number;
  onReset: () => void;
}

const CATEGORIES: { id: CraftCategory | 'All'; key: keyof typeof import('../../i18n/translations').translations['en-IN']['categories']; icon: string }[] = [
  { id: 'All', key: 'All', icon: '✦' },
  { id: 'Pottery', key: 'Pottery', icon: '🏺' },
  { id: 'Handloom', key: 'Handloom', icon: '🧵' },
  { id: 'Metalcraft', key: 'Metalcraft', icon: '✨' },
  { id: 'Woodcraft', key: 'Woodcraft', icon: '🪵' },
  { id: 'Jewellery', key: 'Jewellery', icon: '📿' },
  { id: 'Painting', key: 'Painting', icon: '🎨' },
];

export const ProductFilters: React.FC<ProductFiltersProps> = ({
  selectedCategory,
  onCategoryChange,
  sortBy,
  onSortChange,
  priceRange,
  onPriceRangeChange,
  inStockOnly,
  onInStockChange,
  totalResults,
  onReset,
}) => {
  const { t } = useLanguage();

  return (
    <div className="bg-white rounded-2xl border border-[#dce8e0] p-5 shadow-xs space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2 text-[#0c4b31]">
          <Filter className="w-4 h-4 text-[#e27d35]" />
          <h3 className="text-sm font-extrabold">{t.marketplace.filterAndRefine}</h3>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="text-[11px] text-gray-500 hover:text-[#0c4b31] flex items-center gap-1 font-semibold cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          <span>{t.marketplace.reset}</span>
        </button>
      </div>

      {/* Craft Category Filter */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-gray-800 block">{t.marketplace.craftCategory}</span>
        <div className="space-y-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              id={`filter-cat-${cat.id.toLowerCase()}`}
              onClick={() => onCategoryChange(cat.id)}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-[#edf8f1] text-[#0c4b31] font-extrabold border border-[#bce0cb]'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium'
              }`}
            >
              <span className="flex items-center gap-2">
                <span>{cat.icon}</span>
                <span>{t.categories[cat.key] || cat.id}</span>
              </span>
              {selectedCategory === cat.id && (
                <span className="w-2 h-2 rounded-full bg-[#0c4b31]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Sort By Filter */}
      <div className="space-y-2 pt-2 border-t border-gray-100">
        <span className="text-xs font-bold text-gray-800 block">{t.marketplace.sortBy}</span>
        <select
          id="filter-sort-select"
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as any)}
          className="w-full py-2 px-3 text-xs bg-[#fafcfa] border border-[#d2dfd6] rounded-xl focus:outline-none focus:border-[#0c4b31] text-gray-800 font-medium cursor-pointer"
        >
          <option value="popular">{t.marketplace.popular}</option>
          <option value="newest">{t.marketplace.newest}</option>
          <option value="price_asc">{t.marketplace.priceLowHigh}</option>
          <option value="price_desc">{t.marketplace.priceHighLow}</option>
        </select>
      </div>

      {/* Price Range Slider / Inputs */}
      <div className="space-y-2.5 pt-2 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-800">{t.marketplace.priceRange}:</span>
          <span className="text-xs font-extrabold text-[#0c4b31]">₹{priceRange[1]}</span>
        </div>
        <input
          id="filter-max-price-slider"
          type="range"
          min="200"
          max="10000"
          step="100"
          value={priceRange[1]}
          onChange={(e) => onPriceRangeChange([priceRange[0], Number(e.target.value)])}
          className="w-full accent-[#0c4b31] cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-gray-400 font-medium">
          <span>₹200</span>
          <span>₹5,000</span>
          <span>₹10,000+</span>
        </div>
      </div>

      {/* In Stock Only Toggle */}
      <div className="pt-2 border-t border-gray-100">
        <label className="flex items-center gap-2.5 text-xs font-bold text-gray-700 cursor-pointer">
          <input
            id="filter-in-stock-checkbox"
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => onInStockChange(e.target.checked)}
            className="w-4 h-4 rounded text-[#0c4b31] focus:ring-[#0c4b31] cursor-pointer"
          />
          <span>{t.marketplace.inStockOnly}</span>
        </label>
      </div>

      {/* Result Indicator */}
      <div className="pt-2 border-t border-gray-100 text-center">
        <span className="text-[11px] font-semibold text-gray-500">
          Showing <strong className="text-[#0c4b31]">{totalResults}</strong> {t.marketplace.resultsCount}
        </span>
      </div>
    </div>
  );
};

import React from 'react';
import { PackageSearch } from 'lucide-react';
import { ProductCard } from './ProductCard';
import { MarketplaceProduct } from '../../services/marketplaceApi';
import { useLanguage } from '../../i18n/LanguageContext';

interface ProductGridProps {
  products: MarketplaceProduct[];
  isLoading?: boolean;
  onAddToCart?: (product: MarketplaceProduct) => void;
  onResetFilters?: () => void;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  isLoading = false,
  onAddToCart,
  onResetFilters,
}) => {
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
        {[1, 2, 3, 4, 5, 6].map((idx) => (
          <div key={idx} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4">
            <div className="h-52 bg-gray-100 rounded-xl" />
            <div className="space-y-2">
              <div className="h-4 bg-gray-100 rounded w-1/3" />
              <div className="h-5 bg-gray-100 rounded w-3/4" />
              <div className="h-4 bg-gray-100 rounded w-full" />
            </div>
            <div className="h-10 bg-gray-100 rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="py-16 px-4 bg-white rounded-2xl border border-dashed border-[#cfded3] text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-[#edf8f1] text-[#0c4b31] mx-auto flex items-center justify-center">
          <PackageSearch className="w-8 h-8 text-[#0c4b31]" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base sm:text-lg font-extrabold text-gray-900">
            {t.marketplace.noProductsFound}
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto">
            {t.marketplace.noProductsHint}
          </p>
        </div>
        {onResetFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="px-4 py-2 rounded-xl bg-[#0c4b31] hover:bg-[#073623] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            {t.marketplace.clearFilters}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6" id="marketplace-product-grid">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} onAddToCart={onAddToCart} />
      ))}
    </div>
  );
};

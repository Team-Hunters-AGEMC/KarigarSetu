import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Eye, MapPin, Sparkles, CheckCircle2 } from 'lucide-react';
import { MarketplaceProduct } from '../../services/marketplaceApi';
import { useLanguage } from '../../i18n/LanguageContext';

interface ProductCardProps {
  product: MarketplaceProduct;
  onAddToCart?: (product: MarketplaceProduct) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
  const { t } = useLanguage();
  const isOutOfStock = (product.stock_quantity ?? 0) <= 0;

  return (
    <article
      id={`product-card-${product.id}`}
      className="group karigarsetu-product-card-interactive bg-[#EAF2E5] hover:bg-[#E3EEDF] rounded-xl sm:rounded-2xl border border-[#CBDCC6] hover:border-[#b8cdb2] shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden min-w-0 max-w-full w-full break-words"
    >
      {/* Product Image Area - Clean White/Neutral Canvas */}
      <Link
        to={`/marketplace/products/${product.id}`}
        className="relative block aspect-square sm:aspect-auto sm:h-56 bg-white overflow-hidden p-2 sm:p-3 border-b border-[#CBDCC6]"
      >
        <img
          src={product.image_url}
          alt={product.product_name}
          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Category Pill */}
        <div className="absolute top-1.5 sm:top-3 left-1.5 sm:left-3 bg-white/95 backdrop-blur-md px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[8px] sm:text-[10px] font-extrabold text-[#0c4b31] shadow-xs flex items-center gap-1 border border-[#cde0d4] max-w-[70%] sm:max-w-none">
          <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#e27d35] shrink-0" />
          <span className="truncate">{t.categories[product.category as keyof typeof t.categories] || product.category}</span>
        </div>

        {/* Stock Badge */}
        <div className="absolute bottom-1.5 sm:bottom-auto sm:top-3 right-1.5 sm:right-3">
          {isOutOfStock ? (
            <span className="px-1.5 sm:px-2 py-0.5 rounded-md text-[8px] sm:text-[10px] font-extrabold bg-red-100 text-red-700">
              {t.marketplace.outOfStock}
            </span>
          ) : (
            <span className="px-1.5 sm:px-2 py-0.5 rounded-md text-[8px] sm:text-[10px] font-extrabold bg-emerald-100 text-emerald-800 flex items-center gap-0.5 sm:gap-1">
              <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-600 shrink-0" />
              <span>{t.marketplace.inStock}</span>
              <span className="hidden sm:inline">({product.stock_quantity})</span>
            </span>
          )}
        </div>
      </Link>

      {/* Body Content */}
      <div className="p-2.5 sm:p-5 flex-1 flex flex-col justify-between space-y-2 sm:space-y-3 min-w-0">
        <div className="min-w-0">
          {/* Artisan Credit Link */}
          <Link
            to={`/marketplace/artisans/${product.artisan_id}`}
            className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-gray-500 hover:text-[#0c4b31] transition-colors max-w-full min-w-0"
          >
            <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#e27d35] shrink-0" />
            <span className="truncate">{product.artisan_name}</span>
            <span className="text-gray-300 hidden sm:inline">•</span>
            <span className="text-gray-400 font-normal truncate max-w-[120px] hidden sm:inline">{product.artisan_location}</span>
          </Link>

          {/* Product Title (User generated - keep raw) */}
          <Link to={`/marketplace/products/${product.id}`} className="block mt-0.5 sm:mt-1 group-hover:text-[#0c4b31] min-w-0">
            <h3 className="text-xs sm:text-base font-extrabold text-gray-900 leading-snug line-clamp-2 break-words">
              {product.product_name}
            </h3>
          </Link>

          {/* Short description (User generated - keep raw) */}
          <p className="hidden sm:block text-xs text-gray-500 line-clamp-2 mt-1 leading-relaxed">
            {product.description}
          </p>
        </div>

        {/* Price & Primary Action Buttons */}
        <div className="pt-1.5 sm:pt-2 border-t border-[#d4e3d0] space-y-2 sm:space-y-3 min-w-0">
          <div className="flex items-baseline justify-between min-w-0 gap-1">
            <div className="min-w-0">
              <span className="text-[10px] text-gray-500 font-medium hidden sm:block">Direct Price</span>
              <div className="flex items-baseline gap-1 flex-wrap">
                <span className="text-sm sm:text-xl font-extrabold text-[#0c4b31] shrink-0">
                  ₹{product.selling_price}
                </span>
                <span className="text-[8px] sm:text-[10px] text-emerald-800 font-bold bg-[#d6e8d2] px-1 sm:px-1.5 py-0.2 rounded border border-[#c1dbbc] shrink-0">
                  Fair Wage
                </span>
              </div>
            </div>

            <span className="text-[9px] sm:text-[11px] text-gray-500 shrink-0 hidden xs:inline sm:inline">
              Free Delivery
            </span>
          </div>

          <div className="flex flex-col sm:grid sm:grid-cols-2 gap-1.5 sm:gap-2">
            <Link
              to={`/marketplace/products/${product.id}`}
              id={`view-details-${product.id}`}
              className="py-1.5 sm:py-2.5 px-2 sm:px-3 rounded-lg sm:rounded-xl bg-white/85 hover:bg-white text-[#0c4b31] border border-[#CBDCC6] text-[11px] sm:text-xs font-bold text-center flex items-center justify-center gap-1 sm:gap-1.5 transition-colors shadow-2xs"
            >
              <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
              <span className="truncate">{t.marketplace.viewCraft}</span>
            </Link>

            <button
              type="button"
              id={`add-to-cart-${product.id}`}
              disabled={isOutOfStock}
              onClick={() => onAddToCart?.(product)}
              className="py-1.5 sm:py-2.5 px-2 sm:px-3 rounded-lg sm:rounded-xl bg-[#0c4b31] hover:bg-[#073623] text-white text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 sm:gap-1.5 shadow-2xs transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ShoppingBag className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#ffd186] shrink-0" />
              <span className="truncate">{t.marketplace.addToCart}</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};

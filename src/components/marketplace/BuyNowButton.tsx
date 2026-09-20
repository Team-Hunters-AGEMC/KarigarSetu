import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { getCurrentCustomer } from '../../services/customerAuth';
import { MarketplaceProduct } from '../../services/marketplaceApi';

export const BuyNowButton: React.FC<{
  product: MarketplaceProduct;
  quantity: number;
  className?: string;
}> = ({ product, quantity, className = '' }) => {
  const navigate = useNavigate();
  const stock = Math.max(0, Number(product.stock_quantity || 0));

  const buyNow = () => {
    if (!getCurrentCustomer()) {
      navigate('/customer/login', {
        state: { from: `/marketplace/products/${product.id}` },
      });
      return;
    }
    if (stock === 0 || quantity < 1 || quantity > stock) return;

    const checkout = { product, quantity };
    sessionStorage.setItem('karigarsetu_buy_now', JSON.stringify(checkout));
    navigate('/customer/checkout', { state: checkout });
  };

  return (
    <button
      type="button"
      onClick={buyNow}
      disabled={stock === 0 || quantity < 1 || quantity > stock}
      className={`flex w-full items-center justify-center gap-2 rounded-xl bg-[#0b5738] px-5 py-4 font-extrabold text-white shadow-lg hover:bg-[#08452d] disabled:cursor-not-allowed disabled:bg-gray-400 ${className}`}
    >
      <Zap className="h-5 w-5 text-[#ffd166]" />
      {stock === 0 ? 'Out of Stock' : 'Buy Now'}
    </button>
  );
};

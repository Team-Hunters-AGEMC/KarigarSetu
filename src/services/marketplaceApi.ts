import { ProductItem, CraftCategory } from '../types';
import { API_BASE } from './apiConfig';
import { getStoredProducts } from '../data/seedData';

export interface MarketplaceProduct {
  id: number;
  product_name: string;
  category: CraftCategory;
  description: string;
  selling_price: number;
  stock_quantity: number;
  image_url: string;
  detail_focus?: { x: number; y: number };
  artisan_id: number;
  artisan_name: string;
  artisan_location: string;
  artisan_avatar?: string;
  cultural_significance?: string;
  tags?: string[];
  created_at: string;
}

export interface ArtisanPublicData {
  id: number;
  name: string;
  craftType: CraftCategory;
  location: string;
  experience: number;
  story?: string;
  avatar?: string;
  joinedDate?: string;
  products: MarketplaceProduct[];
}

export function sanitizeForMarketplace(p: ProductItem): MarketplaceProduct {
  return {
    id: p.id,
    product_name: p.product_name,
    category: p.category,
    description: p.description,
    selling_price: p.selling_price ?? p.suggested_price,
    stock_quantity: p.stock_quantity ?? 0,
    image_url: p.image_url,
    detail_focus: (p as ProductItem & { detail_focus?: { x: number; y: number } }).detail_focus,
    artisan_id: p.artisan_id,
    artisan_name: p.artisan_name,
    artisan_location: p.artisan_location,
    artisan_avatar: p.artisan_avatar,
    cultural_significance: p.cultural_significance,
    tags: p.tags,
    created_at: p.created_at,
  };
}

export const marketplaceApi = {
  async getApprovedProducts(params?: { category?: string; search?: string; sort?: 'price_asc' | 'price_desc' | 'newest' | 'popular'; minPrice?: number; maxPrice?: number; inStockOnly?: boolean; }): Promise<MarketplaceProduct[]> {
    try {
      const url = new URL(`${API_BASE}/api/marketplace/products`);
      if (params?.category && params.category !== 'All') url.searchParams.append('category', params.category);
      if (params?.search) url.searchParams.append('search', params.search);
      if (params?.sort) url.searchParams.append('sort', params.sort);
      if (params?.minPrice !== undefined) url.searchParams.append('min_price', String(params.minPrice));
      if (params?.maxPrice !== undefined) url.searchParams.append('max_price', String(params.maxPrice));
      if (params?.inStockOnly) url.searchParams.append('in_stock', 'true');
      const response = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
      if (response.ok) {
        const result = await response.json();
        if (result.success && Array.isArray(result.data) && result.data.length > 0) return result.data;
      }
    } catch { /* Local fallback below. */ }

    let items = getStoredProducts().filter((p) => p.status === 'approved').map(sanitizeForMarketplace);
    if (params?.category && params.category !== 'All') items = items.filter((p) => p.category === params.category);
    if (params?.search) {
      const q = params.search.toLowerCase();
      items = items.filter((p) => p.product_name.toLowerCase().includes(q) || p.artisan_name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.artisan_location.toLowerCase().includes(q) || p.tags?.some((tag) => tag.toLowerCase().includes(q)));
    }
    if (params?.minPrice !== undefined) items = items.filter((p) => p.selling_price >= params.minPrice!);
    if (params?.maxPrice !== undefined) items = items.filter((p) => p.selling_price <= params.maxPrice!);
    if (params?.inStockOnly) items = items.filter((p) => p.stock_quantity > 0);
    if (params?.sort === 'price_asc') items.sort((a, b) => a.selling_price - b.selling_price);
    else if (params?.sort === 'price_desc') items.sort((a, b) => b.selling_price - a.selling_price);
    else if (params?.sort === 'newest') items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return items;
  },

  async getProductDetails(productId: number): Promise<MarketplaceProduct | null> {
    try {
      const response = await fetch(`${API_BASE}/api/marketplace/products/${productId}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) return result.data;
      }
    } catch { /* Local fallback below. */ }
    const example = getStoredProducts().find((p) => p.id === Number(productId) && p.status === 'approved');
    return example ? sanitizeForMarketplace(example) : null;
  },

  async getArtisanPublicProfile(artisanId: number): Promise<ArtisanPublicData | null> {
    try {
      const response = await fetch(`${API_BASE}/api/marketplace/artisans/${artisanId}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) return result.data;
      }
    } catch { /* No local artisan-profile fallback. */ }
    return null;
  },
};

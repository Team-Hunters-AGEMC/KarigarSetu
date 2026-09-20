export type CraftCategory =
  | 'Handloom'
  | 'Pottery'
  | 'Jewellery'
  | 'Painting'
  | 'Woodcraft'
  | 'Metalcraft'
  | 'Other';

export type ProductStatus =
  | 'approved'
  | 'pending_ai_check'
  | 'admin_review'
  | 'under_review'
  | 'rejected'
  | 'unpublished';

export type SupportedLanguage = 'bn-IN' | 'hi-IN' | 'en-IN' | 'or-IN';

export interface ArtisanProfile {
  id: number;
  name: string;
  phone: string;
  language: string;
  craftType: CraftCategory;
  location: string;
  experience: number;
  story?: string;
  avatar?: string;
  joinedDate?: string;
}

export interface AiCatalogDetails {
  professionalTitle: string;
  catalogDescription: string;
  suggestedPrice: number;
  category: CraftCategory;
  materialCost: number;
  labourCost: number;
  marketingCaption?: string;
  keywords: string[];
  careInstructions?: string;
  culturalHeritage?: string;
  handmadeProbability?: number;
  approvalCheck?: {
    isAuthenticHandmade: boolean;
    confidence: number;
    issues?: string[];
  };
}

export interface ProductItem {
  id: number;
  artisan_id: number;
  artisan_name: string;
  artisan_location: string;
  artisan_avatar?: string;
  product_name: string;
  category: CraftCategory;
  description: string;
  material_cost: number;
  labour_cost: number;
  suggested_price: number;
  selling_price: number;
  stock_quantity: number;
  status: ProductStatus;
  image_url: string;
  detail_focus?: { x: number; y: number };
  ai_confidence_score: number;
  ai_risk_score: number;
  ai_decision_reason?: string;
  ai_checks?: {
    handmadeProductProbability: number;
    issues?: string[];
  };
  reported_count: number;
  reviewed_by?: number | string | null;
  created_at: string;
  tags?: string[];
  cultural_significance?: string;
  voice_transcript?: string;
}

import { ArtisanProfile, ProductItem } from '../types';

// The application starts without demo accounts or products.
export const INITIAL_ARTISANS: ArtisanProfile[] = [];
export const INITIAL_PRODUCTS: ProductItem[] = [
  {
    id: 101,
    artisan_id: 1,
    artisan_name: 'Radhamohan Pal',
    artisan_location: 'Panchmura, Bankura, West Bengal',
    product_name: 'Heritage Bankura Terracotta Horse & Urn',
    category: 'Pottery',
    description: 'Iconic hollow terracotta horse sculpture handcrafted from high-silica Ganges clay and wood-fired in traditional brick kilns without synthetic glaze.',
    material_cost: 380,
    labour_cost: 650,
    suggested_price: 1450,
    selling_price: 1450,
    stock_quantity: 8,
    status: 'approved',
    image_url: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=800&auto=format&fit=crop&q=80',
    detail_focus: { x: 52, y: 38 },
    ai_confidence_score: 96,
    ai_risk_score: 4,
    ai_decision_reason: 'Genuine clay coil construction, distinct manual wood-fired gradient, authentic folk iconography.',
    ai_checks: {
      handmadeProductProbability: 98,
      issues: [],
    },
    reported_count: 0,
    reviewed_by: 'AI Auto-Approved',
    created_at: '2025-02-10',
    tags: ['Terracotta', 'Bankura', 'FolkArt', 'EcoFriendly', 'HomeDecor'],
    cultural_significance: 'GI-tagged handicraft representing the sacred equestrian guardian symbol of rural Rarh Bengal.',
    voice_transcript: 'বাঁকুড়ার পঞ্চমুড়ার মাটির ঘোড়া, সম্পূর্ণ হাতে গড়া ও কাঠের আগুনে পোড়ানো।'
  },
  {
    id: 102,
    artisan_id: 2,
    artisan_name: 'Sukumar Das',
    artisan_location: 'Phulia, Nadia, West Bengal',
    product_name: 'Pure Cotton Handwoven Phulia Jamdani Saree',
    category: 'Handloom',
    description: '100-count organic mulmul cotton saree with supplementary weft floral jaal motifs woven thread-by-thread on a traditional pit loom over 18 days.',
    material_cost: 1400,
    labour_cost: 2800,
    suggested_price: 5200,
    selling_price: 4950,
    stock_quantity: 4,
    status: 'approved',
    image_url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&auto=format&fit=crop&q=80',
    detail_focus: { x: 48, y: 55 },
    ai_confidence_score: 94,
    ai_risk_score: 6,
    ai_decision_reason: 'Manual shuttle variations detected in weft tension, natural selvedge irregularity confirming genuine handloom.',
    ai_checks: {
      handmadeProductProbability: 96,
      issues: [],
    },
    reported_count: 0,
    reviewed_by: 'AI Auto-Approved',
    created_at: '2025-02-14',
    tags: ['Handloom', 'Jamdani', 'OrganicCotton', 'ArtisanalTextile'],
    cultural_significance: 'Masterpiece of Bengal weaving heritage, carrying motifs that date back to ancient subcontinent trade guilds.',
    voice_transcript: 'ফুলিয়ার খাঁটি একশো কাউন্টের সুতি জামদানি শাড়ি, ১৮ দিন তাঁতে বোনা।'
  },
  {
    id: 103,
    artisan_id: 3,
    artisan_name: 'Anjali Murmu',
    artisan_location: 'Bikna, Bankura, West Bengal',
    product_name: 'Lost-Wax Dokra Brass Nandi Bull Figurine',
    category: 'Metalcraft',
    description: 'Ancient lost-wax cast molten brass sculpture shaped with beeswax threads and clay core, celebrating tribal wildlife animism.',
    material_cost: 550,
    labour_cost: 850,
    suggested_price: 1850,
    selling_price: 1850,
    stock_quantity: 6,
    status: 'approved',
    image_url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80',
    detail_focus: { x: 50, y: 45 },
    ai_confidence_score: 97,
    ai_risk_score: 3,
    ai_decision_reason: 'Wax-wire ribbing detail conforms to genuine non-ferrous Dokra hollow casting methodology.',
    ai_checks: {
      handmadeProductProbability: 99,
      issues: [],
    },
    reported_count: 0,
    reviewed_by: 'Admin Approved',
    created_at: '2025-02-18',
    tags: ['Dokra', 'LostWax', 'BrassArt', 'TribalHeritage'],
    cultural_significance: 'One of the oldest surviving non-ferrous metal casting traditions dating to the Mohenjo-daro Dancing Girl.',
    voice_transcript: 'ঢোকরা পিতলের হস্তশিল্প, মোম দিয়ে হাতে মডেল বানিয়ে গলানো পিতল ঢেলে তৈরি।'
  },
  {
    id: 104,
    artisan_id: 1,
    artisan_name: 'Radhamohan Pal',
    artisan_location: 'Panchmura, Bankura, West Bengal',
    product_name: 'Acoustic Terracotta Wind Chimes with Clay Bells',
    category: 'Pottery',
    description: 'Outdoor glazed and natural terracotta bells strung on jute ropes, producing melodious earthy chimes in breeze.',
    material_cost: 180,
    labour_cost: 320,
    suggested_price: 680,
    selling_price: 650,
    stock_quantity: 12,
    status: 'approved',
    image_url: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800&auto=format&fit=crop&q=80',
    detail_focus: { x: 50, y: 50 },
    ai_confidence_score: 92,
    ai_risk_score: 8,
    ai_decision_reason: 'Hand-thrown bell shapes with manual perforation and carved geometric borders.',
    ai_checks: {
      handmadeProductProbability: 94,
      issues: [],
    },
    reported_count: 0,
    reviewed_by: 'AI Auto-Approved',
    created_at: '2025-02-22',
    tags: ['Terracotta', 'WindChimes', 'HomeAcoustics', 'GardenDecor'],
    cultural_significance: 'Traditional village threshold bells believed to purify indoor air vibrations.'
  },
  {
    id: 105,
    artisan_id: 4,
    artisan_name: 'Gopal Soni',
    artisan_location: 'Johari Bazaar, Jaipur, Rajasthan',
    product_name: 'Hand-Carved Sheesham Wood Block Printing Stamps',
    category: 'Woodcraft',
    description: 'Set of 3 dense Indian Rosewood printing blocks carved with floral paisley buta motifs using hand chisels.',
    material_cost: 290,
    labour_cost: 540,
    suggested_price: 1100,
    selling_price: 990,
    stock_quantity: 15,
    status: 'approved',
    image_url: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800&auto=format&fit=crop&q=80',
    detail_focus: { x: 45, y: 40 },
    ai_confidence_score: 93,
    ai_risk_score: 7,
    ai_decision_reason: 'Micro chisel incisions match artisan relief technique; natural wood grain visible.',
    ai_checks: {
      handmadeProductProbability: 95,
      issues: [],
    },
    reported_count: 0,
    reviewed_by: 'Admin Approved',
    created_at: '2025-03-01',
    tags: ['Woodcraft', 'BlockPrint', 'TextileArt', 'Sanganer'],
    cultural_significance: 'Traditional block carving fundamental to Sanganeri and Bagru hand block textile printing.'
  },
  {
    id: 106,
    artisan_id: 1,
    artisan_name: 'Radhamohan Pal',
    artisan_location: 'Panchmura, Bankura, West Bengal',
    product_name: 'Decorative Folk Sun Wall Plaque',
    category: 'Pottery',
    description: 'Embossed sun deity clay plaque hand-etched with bamboo needles while clay was leather-hard, depicting life-giving solar energy.',
    material_cost: 210,
    labour_cost: 410,
    suggested_price: 850,
    selling_price: 820,
    stock_quantity: 5,
    status: 'pending_ai_check',
    image_url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&auto=format&fit=crop&q=80',
    detail_focus: { x: 50, y: 50 },
    ai_confidence_score: 84,
    ai_risk_score: 16,
    ai_decision_reason: 'Awaiting secondary AI edge inspection for hairline firing stress verification.',
    ai_checks: {
      handmadeProductProbability: 91,
      issues: ['Photo lighting slightly shadowy on bottom perimeter'],
    },
    reported_count: 0,
    reviewed_by: null,
    created_at: '2025-03-08',
    tags: ['ClayArt', 'SunPlaque', 'WallDecor']
  },
  {
    id: 107,
    artisan_id: 3,
    artisan_name: 'Anjali Murmu',
    artisan_location: 'Bikna, Bankura, West Bengal',
    product_name: 'Tribal Grain Measuring Bowl (Pai) with Brass Fish',
    category: 'Metalcraft',
    description: 'Traditional volumetric grain bowl lined with tribal fertility fish motifs and spiral coils.',
    material_cost: 420,
    labour_cost: 720,
    suggested_price: 1550,
    selling_price: 1550,
    stock_quantity: 3,
    status: 'admin_review',
    image_url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&auto=format&fit=crop&q=80',
    detail_focus: { x: 50, y: 48 },
    ai_confidence_score: 79,
    ai_risk_score: 21,
    ai_decision_reason: 'High artisan heritage score but unusual metallurgical composition flag requires expert admin signoff.',
    ai_checks: {
      handmadeProductProbability: 96,
      issues: ['Antique finish requires verification against export guidelines'],
    },
    reported_count: 1,
    reviewed_by: null,
    created_at: '2025-03-10',
    tags: ['Dokra', 'TribalHeritage', 'Collectible']
  }
];



const demoArtisans = new Map([
  ['9832104567', 'Radhamohan Pal'],
  ['9434056789', 'Sukumar Das'],
  ['9734123456', 'Anjali Murmu'],
  ['9829012345', 'Gopal Soni'],
]);
// Helper functions for data persistence
export function getStoredArtisans(): ArtisanProfile[] {
  try {
    const data = localStorage.getItem('karigarsetu_artisans');
    if (data) return (JSON.parse(data) as ArtisanProfile[]).filter(a => demoArtisans.get(a.phone) !== a.name);
  } catch (e) {
    console.warn('Storage read error', e);
  }
  localStorage.setItem('karigarsetu_artisans', JSON.stringify(INITIAL_ARTISANS));
  return INITIAL_ARTISANS;
}

export function getStoredProducts(): ProductItem[] {
  try {
    const data = localStorage.getItem('karigarsetu_products');
    if (data) {
      const stored = JSON.parse(data) as ProductItem[];
      return [...stored, ...INITIAL_PRODUCTS.filter(example => !stored.some(product => product.id === example.id))];
    }
  } catch (e) {
    console.warn('Storage read error', e);
  }
  localStorage.setItem('karigarsetu_products', JSON.stringify(INITIAL_PRODUCTS));
  return INITIAL_PRODUCTS;
}

export function saveStoredProducts(products: ProductItem[]) {
  try {
    localStorage.setItem('karigarsetu_products', JSON.stringify(products));
    window.dispatchEvent(new Event('karigarsetu_products_updated'));
  } catch (e) {
    console.error('Storage write error', e);
  }
}

export function getLoggedInArtisan(): ArtisanProfile | null {
  try {
    if (localStorage.getItem('karigarsetu_artisan_logged_out') === 'true') {
      return null;
    }
    const session = sessionStorage.getItem('artisanProfile');
    if (session) {
      const artisan = JSON.parse(session) as ArtisanProfile;
      if (demoArtisans.get(artisan.phone) !== artisan.name) return artisan;
    }
    const local = localStorage.getItem('artisanProfile');
    if (local) {
      const artisan = JSON.parse(local) as ArtisanProfile;
      if (demoArtisans.get(artisan.phone) !== artisan.name) return artisan;
    }
  } catch (e) {
    console.warn('Profile read error', e);
  }
  return null;
}

export function isArtisanLoggedIn(): boolean {
  return getLoggedInArtisan() !== null;
}

export function getCurrentArtisan(): ArtisanProfile {
  const loggedIn = getLoggedInArtisan();
  if (loggedIn) return loggedIn;
  throw new Error("Artisan authentication is required to open the studio");
}

export function logoutArtisan() {
  try {
    sessionStorage.removeItem('artisanProfile');
    localStorage.removeItem('artisanProfile');
    localStorage.setItem('karigarsetu_artisan_logged_out', 'true');
    window.dispatchEvent(new Event('karigarsetu_artisan_updated'));
  } catch (e) {
    console.error('Artisan logout error', e);
  }
}

export function setCurrentArtisan(artisan: ArtisanProfile | null) {
  if (artisan) {
    try {
      localStorage.removeItem('karigarsetu_artisan_logged_out');
      sessionStorage.setItem('artisanProfile', JSON.stringify(artisan));
      localStorage.setItem('artisanProfile', JSON.stringify(artisan));
    } catch (e) {
      console.warn('Profile save error', e);
    }
  } else {
    logoutArtisan();
    return;
  }
  window.dispatchEvent(new Event('karigarsetu_artisan_updated'));
}

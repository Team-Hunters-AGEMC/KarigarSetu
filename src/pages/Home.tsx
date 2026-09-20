import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Sparkles, 
  Mic, 
  Search, 
  SlidersHorizontal, 
  CheckCircle2, 
  ShieldCheck, 
  ChevronRight, 
  ArrowUpRight,
  TrendingUp,
  Heart,
  MapPin,
  HelpCircle,
  Eye,
  Camera,
  Layers,
  Award
} from 'lucide-react';
import { getStoredProducts } from '../data/seedData';
import { CraftCategory, ProductItem, SupportedLanguage } from '../types';
import { ProductDetailModal } from '../components/ProductDetailModal';

const CATEGORIES: { id: CraftCategory | 'All'; label: string; icon: string }[] = [
  { id: 'All', label: 'All Crafts', icon: '✦' },
  { id: 'Pottery', label: 'Terracotta & Clay', icon: '🏺' },
  { id: 'Handloom', label: 'Handloom Textiles', icon: '🧵' },
  { id: 'Metalcraft', label: 'Dokra & Brass', icon: '✨' },
  { id: 'Woodcraft', label: 'Hand-Carved Wood', icon: '🪵' },
  { id: 'Jewellery', label: 'Heritage Jewellery', icon: '💎' },
];

const HOME_TEXT = {
  'en-IN': {
    badge: 'AI-Powered Direct Artisan Marketplace', line1: 'Local Hands,', line2: 'Global Markets.',
    intro: "Empowering India's traditional master craftspeople to digitize handmade treasures using just a smartphone photo and voice in their native mother tongue. Zero middleman commissions, 100% fair living wages.",
    join: 'Join as an Artisan', explore: 'Explore Marketplace', voice: 'Voice listing in বাংলা, हिन्दी, English',
    wage: 'Transparent Cost & Living Wage', screening: 'AI Handmade Authenticity Screening',
    preview: 'Live AI Catalog Preview', title: 'Heritage Bankura Terracotta Horse',
  },
  'bn-IN': {
    badge: 'AI-চালিত সরাসরি কারিগর মার্কেটপ্লেস', line1: 'স্থানীয় হাতের কাজ,', line2: 'বিশ্বজুড়ে বাজার।',
    intro: 'স্মার্টফোনের ছবি ও নিজের মাতৃভাষার কণ্ঠস্বর ব্যবহার করে ভারতের ঐতিহ্যবাহী কারিগরদের হাতে তৈরি পণ্য ডিজিটালভাবে তুলে ধরতে সাহায্য করছি। কোনো মধ্যস্বত্বভোগীর কমিশন নেই, কারিগর পাবেন ন্যায্য মজুরি।',
    join: 'কারিগর হিসেবে যোগ দিন', explore: 'মার্কেটপ্লেস দেখুন', voice: 'বাংলা, हिन्दी ও English-এ ভয়েস লিস্টিং',
    wage: 'স্বচ্ছ খরচ ও ন্যায্য মজুরি', screening: 'AI দ্বারা হস্তশিল্পের সত্যতা যাচাই',
    preview: 'লাইভ AI ক্যাটালগ প্রিভিউ', title: 'ঐতিহ্যবাহী বাঁকুড়ার টেরাকোটা ঘোড়া',
  },
  'hi-IN': {
    badge: 'AI-संचालित सीधा कारीगर मार्केटप्लेस', line1: 'स्थानीय हाथों का हुनर,', line2: 'दुनिया भर के बाज़ार।',
    intro: 'स्मार्टफोन की तस्वीर और अपनी मातृभाषा की आवाज़ से भारत के पारंपरिक कारीगरों को हस्तनिर्मित उत्पाद डिजिटल रूप में बेचने में सहायता। कोई बिचौलिया कमीशन नहीं, कारीगर को उचित मेहनताना।',
    join: 'कारीगर के रूप में जुड़ें', explore: 'मार्केटप्लेस देखें', voice: 'বাংলা, हिन्दी और English में वॉइस लिस्टिंग',
    wage: 'पारदर्शी लागत और उचित मेहनताना', screening: 'AI हस्तशिल्प प्रामाणिकता जाँच',
    preview: 'लाइव AI कैटलॉग प्रीव्यू', title: 'पारंपरिक बांकुड़ा टेराकोटा घोड़ा',
  },
} as const;

export const Home: React.FC<{ currentLang?: SupportedLanguage }> = ({ currentLang = 'bn-IN' }) => {
  const t =
  currentLang === 'bn-IN'
    ? HOME_TEXT['bn-IN']
    : currentLang === 'hi-IN'
      ? HOME_TEXT['hi-IN']
      : HOME_TEXT['en-IN'];
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<CraftCategory | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModalProduct, setActiveModalProduct] = useState<ProductItem | null>(null);
  const [voiceTesting, setVoiceTesting] = useState(false);
  const [voiceTranscriptDemo, setVoiceTranscriptDemo] = useState('');

  const loadProducts = () => {
    setProducts(getStoredProducts());
  };

  useEffect(() => {
    loadProducts();
    window.addEventListener('karigarsetu_products_updated', loadProducts);
    return () => window.removeEventListener('karigarsetu_products_updated', loadProducts);
  }, []);

  // Filter approved products visible to buyers
  const visibleProducts = useMemo(() => {
    return products.filter((item) => {
      const isApproved = item.status === 'approved';
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const matchesSearch = 
        item.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.artisan_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.artisan_location.toLowerCase().includes(searchQuery.toLowerCase());
      return isApproved && matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  const handleSimulateVoiceInput = (sampleBengali: string) => {
    setVoiceTesting(true);
    setVoiceTranscriptDemo('Listening in বাংলা (Bengali)...');
    setTimeout(() => {
      setVoiceTranscriptDemo(sampleBengali);
      setVoiceTesting(false);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#fcfaf6] text-[#1a2d23]">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-8 pb-16 lg:pt-14 lg:pb-24 border-b border-[#e5ebe7] bg-radial-[at_85%_15%] from-[#fff1d6] via-[#fcfaf6] to-[#f4f8f4]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* Left Column: Vision & Utility */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#e3f4ea] border border-[#b4dfc5] text-[#0c4b31] text-xs font-extrabold tracking-wide shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-[#e87722]" />
                <span>{t.badge}</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#0c4b31] tracking-tight leading-[1.08]">
                {t.line1}
                <span className="block text-[#e27d35]">{t.line2}</span>
              </h1>

              <p className="text-base sm:text-lg text-[#55695e] max-w-2xl leading-relaxed">
                {t.intro}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                <Link
                  to="/artisan/register"
                  id="hero-join-artisan-btn"
                  className="px-6 py-3.5 rounded-xl bg-[#0c4b31] hover:bg-[#073623] text-white font-bold text-sm sm:text-base shadow-lg shadow-[#0c4b31]/20 hover:-translate-y-0.5 transition-all flex items-center gap-2"
                >
                  <span>{t.join}</span>
                  <ChevronRight className="w-4 h-4 text-[#ffd186]" />
                </Link>

                <Link
                  to="/marketplace"
                  id="hero-explore-marketplace-btn"
                  className="px-6 py-3.5 rounded-xl bg-white hover:bg-[#f2f8f4] text-[#0c4b31] border-2 border-[#bdd6c7] font-bold text-sm sm:text-base hover:-translate-y-0.5 transition-all shadow-xs"
                >
                  {t.explore}
                </Link>
              </div>

              {/* Capability Badges */}
              <div className="pt-3 flex flex-wrap items-center gap-4 text-xs font-semibold text-[#485e52]">
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#dff3e6] text-[#0c4b31] flex items-center justify-center font-bold">✓</span>
                  <span>{t.voice}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#dff3e6] text-[#0c4b31] flex items-center justify-center font-bold">✓</span>
                  <span>{t.wage}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#dff3e6] text-[#0c4b31] flex items-center justify-center font-bold">✓</span>
                  <span>{t.screening}</span>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Live Smart Catalog Preview Card */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-md bg-white rounded-2xl p-5 border border-[#d6e3da] shadow-2xl shadow-[#0c4b31]/10 transform lg:rotate-1 hover:rotate-0 transition-transform duration-300">
                
                {/* Header of Preview Card */}
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-xs font-bold text-[#0c4b31]">{t.preview}</span>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#fcead2] text-[#b85b14]">
                    GI Tagged • Bankura
                  </span>
                </div>

                {/* Hero Showcase Product */}
                <div className="relative mt-3 rounded-xl overflow-hidden bg-gradient-to-b from-[#fff7e6] to-[#f4ebe1] p-3 flex items-center justify-center group">
                  <img
                    src="https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=700&auto=format&fit=crop&q=80"
                    alt="Heritage Bankura Terracotta Horse"
                    className="w-full h-56 object-contain drop-shadow-md group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[10px] font-bold text-[#0c4b31] shadow-xs">
                    ✦ Auto Studio Isolation Active
                  </span>
                </div>

                {/* Information */}
                <div className="mt-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="font-bold text-[#e27d35] tracking-wide uppercase">Terracotta & Clay</span>
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> 98% Handmade Score
                    </span>
                  </div>

                  <h3 className="font-extrabold text-lg text-[#0c4b31] leading-snug">
                    {t.title}
                  </h3>
                  
                  <p className="text-xs text-gray-600 line-clamp-2">
                    Hand-thrown hollow terracotta from Ganges alluvial silt, wood-fired in traditional brick kilns by Radhamohan Pal.
                  </p>

                  {/* Pricing Breakdown preview */}
                  <div className="p-2.5 rounded-xl bg-[#f4f9f5] border border-[#d8e8dd] flex items-center justify-between text-xs">
                    <div>
                      <p className="text-[10px] text-gray-500 font-medium">Fair Living Price</p>
                      <strong className="text-base font-extrabold text-[#0c4b31]">₹1,450</strong>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-gray-500">Artisan Labour Wage</p>
                      <span className="font-bold text-emerald-800">₹650 (Direct to artisan)</span>
                    </div>
                  </div>

                  {/* Interactive Voice Demo in Hero */}
                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-[11px] font-bold text-gray-500 mb-1.5 flex items-center gap-1">
                      <Mic className="w-3.5 h-3.5 text-[#e27d35]" />
                      Voice Input Test (Click to simulate artisan speaking in Bangla):
                    </p>
                    <button
                      type="button"
                      id="simulate-bengali-voice-btn"
                      onClick={() => handleSimulateVoiceInput('বাঁকুড়ার পঞ্চমুড়ার মাটির ঘোড়া, সম্পূর্ণ হাতে গড়া ও কাঠের আগুনে পোড়ানো।')}
                      className="w-full text-left p-2 rounded-lg bg-[#fff8ed] hover:bg-[#ffefd8] border border-[#fbdcb2] text-[11px] font-medium text-[#7d410f] transition-colors flex items-center justify-between"
                    >
                      <span className="truncate italic">
                        {voiceTranscriptDemo || '🎙️ "বাঁকুড়ার মাটির ঘোড়া, ১৮ দিন সময় লেগেছে তৈরি করতে..."'}
                      </span>
                      <span className="text-[10px] font-bold shrink-0 text-[#e27d35] ml-2">
                        {voiceTesting ? 'Processing...' : '▶ Test Voice'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Impact & Welfare Stats Ribbon */}
      <section className="bg-[#0c4b31] text-white py-8 px-4 border-y border-[#185e40]">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="space-y-1">
            <strong className="text-2xl sm:text-3xl font-extrabold text-[#ffd186]">1,420+</strong>
            <p className="text-xs text-[#cfe4d7]">Artisans Digitized</p>
          </div>
          <div className="space-y-1">
            <strong className="text-2xl sm:text-3xl font-extrabold text-[#ffd186]">₹42,80,000</strong>
            <p className="text-xs text-[#cfe4d7]">Living Wages Delivered</p>
          </div>
          <div className="space-y-1">
            <strong className="text-2xl sm:text-3xl font-extrabold text-[#ffd186]">98.4%</strong>
            <p className="text-xs text-[#cfe4d7]">Authenticity Assurance</p>
          </div>
          <div className="space-y-1">
            <strong className="text-2xl sm:text-3xl font-extrabold text-[#ffd186]">0%</strong>
            <p className="text-xs text-[#cfe4d7]">Middleman Extraction</p>
          </div>
        </div>
      </section>

      {/* Four Steps: How KarigarSetu Bridges the Divide */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-[#e3f4ea] text-[#0c4b31] tracking-wide uppercase">
            Four Steps to Dignified Commerce
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0c4b31] tracking-tight mt-3">
            Designed for Craftspeople, not Tech Elites.
          </h2>
          <p className="text-sm sm:text-base text-gray-600 mt-2">
            Most artisans cannot type in English or navigate convoluted e-commerce backends. 
            KarigarSetu bridges this gap entirely through voice, image intelligence, and fair algorithms.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-2xl bg-white border border-[#e2eae4] shadow-xs hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-[#e3f4ea] text-[#0c4b31] flex items-center justify-center font-extrabold text-xl mb-4">
              <Camera className="w-6 h-6 text-[#0c4b31]" />
            </div>
            <span className="text-[11px] font-bold text-[#e27d35] uppercase tracking-wider">Step 1</span>
            <h3 className="text-lg font-bold text-[#0c4b31] mt-1 mb-2">Snap Any Photo</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Artisan captures their craft on any smartphone. Built-in image intelligence isolates the product and creates clean studio backdrop automatically.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-[#e2eae4] shadow-xs hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-[#fff2de] text-[#e87722] flex items-center justify-center font-extrabold text-xl mb-4">
              <Mic className="w-6 h-6 text-[#e87722]" />
            </div>
            <span className="text-[11px] font-bold text-[#e27d35] uppercase tracking-wider">Step 2</span>
            <h3 className="text-lg font-bold text-[#0c4b31] mt-1 mb-2">Speak Naturally</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Describe the clay, weave, or brass casting in Bengali, Hindi, or local dialect. The voice model extracts dimensions, craft style, and materials.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-[#e2eae4] shadow-xs hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-[#edf6f0] text-[#12774e] flex items-center justify-center font-extrabold text-xl mb-4">
              <TrendingUp className="w-6 h-6 text-[#12774e]" />
            </div>
            <span className="text-[11px] font-bold text-[#e27d35] uppercase tracking-wider">Step 3</span>
            <h3 className="text-lg font-bold text-[#0c4b31] mt-1 mb-2">Fair Living Wage AI</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Transparent algorithm computes Raw Material + Artisan Hours = Fair Living Wage. Protects artisans from distress selling and exploitation.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-[#e2eae4] shadow-xs hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-[#e8f0fe] text-[#1a56db] flex items-center justify-center font-extrabold text-xl mb-4">
              <ShieldCheck className="w-6 h-6 text-[#1a56db]" />
            </div>
            <span className="text-[11px] font-bold text-[#e27d35] uppercase tracking-wider">Step 4</span>
            <h3 className="text-lg font-bold text-[#0c4b31] mt-1 mb-2">Human-in-Loop Verification</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Admin quality officers review AI screening flags to guarantee buyers receive authentic indigenous handicrafts, free of synthetic fakes.
            </p>
          </div>
        </div>
      </section>

      {/* Main Buyer Marketplace Section */}
      <section id="marketplace" className="py-12 sm:py-16 px-4 sm:px-6 max-w-7xl mx-auto border-t border-[#e2eae4]">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#e27d35] uppercase tracking-wider mb-1">
              <span>Direct from Village Artisans</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0c4b31] tracking-tight">
              Verified Artisan Marketplace
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Each piece is certified handmade by KarigarSetu AI with zero middleman markup.
            </p>
          </div>

          {/* Search & Filter */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                id="search-crafts-input"
                type="text"
                placeholder="Search terracotta, saree, artisan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-[#ceddd2] rounded-xl focus:outline-none focus:border-[#0c4b31] focus:ring-2 focus:ring-[#0c4b31]/10 transition-all shadow-xs"
              />
            </div>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-[#0c4b31] text-white shadow-md shadow-[#0c4b31]/20'
                  : 'bg-white text-gray-700 hover:bg-[#eef6f1] border border-[#d3e2d7]'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Product Grid */}
        {visibleProducts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 p-8 max-w-xl mx-auto">
            <span className="text-4xl">🏺</span>
            <h3 className="text-xl font-bold text-[#0c4b31] mt-3">No crafts matched your query</h3>
            <p className="text-sm text-gray-500 mt-1 mb-4">
              Try searching for another craft category like &quot;Terracotta&quot;, &quot;Handloom&quot;, or &quot;Dokra&quot;.
            </p>
            <button
              type="button"
              onClick={() => { setSelectedCategory('All'); setSearchQuery(''); }}
              className="px-4 py-2 rounded-lg bg-[#0c4b31] text-white text-xs font-bold"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" id="products-catalog-grid">
            {visibleProducts.map((product) => (
              <article
                key={product.id}
                className="group bg-white rounded-2xl border border-[#dfe7e2] hover:border-[#0c4b31] overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
                id={`product-card-${product.id}`}
              >
                {/* Product Image Container */}
                <div className="relative aspect-4/3 bg-gradient-to-br from-[#f8faf8] to-[#eaf2ec] overflow-hidden">
                  <img
                    src={product.image_url}
                    alt={product.product_name}
                    className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  
                  {/* Category Pill */}
                  <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[10px] font-extrabold text-[#0c4b31] shadow-xs">
                    {product.category}
                  </span>

                  {/* AI Handmade Match Score */}
                  <span className="absolute top-3 right-3 bg-emerald-800 text-white px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-xs">
                    <ShieldCheck className="w-3 h-3" />
                    {product.ai_confidence_score}% Handmade
                  </span>
                </div>

                {/* Card Content */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="font-extrabold text-base text-[#0c4b31] line-clamp-1 group-hover:text-[#e27d35] transition-colors">
                      {product.product_name}
                    </h3>

                    {/* Artisan line */}
                    <div className="flex items-center gap-1.5 text-xs text-gray-600 mt-1">
                      <span className="font-semibold text-gray-800 truncate">By {product.artisan_name}</span>
                    </div>

                    <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-[#e27d35] shrink-0" />
                      <span className="truncate">{product.artisan_location}</span>
                    </p>

                    <p className="text-xs text-gray-600 line-clamp-2 mt-2 leading-normal">
                      {product.description}
                    </p>
                  </div>

                  {/* Pricing and Action */}
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-gray-500 font-medium">Direct Price</span>
                      <p className="text-lg font-extrabold text-[#0c4b31]">
                        ₹{product.selling_price.toLocaleString('en-IN')}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveModalProduct(product)}
                      className="px-3 py-1.5 rounded-xl bg-[#0c4b31] hover:bg-[#073623] text-white text-xs font-bold flex items-center gap-1.5 transition-all group-hover:shadow-md"
                      id={`inspect-craft-${product.id}`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect</span>
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Artisan Voices & Real Impact Stories */}
      <section className="py-16 bg-[#f4f9f5] border-t border-[#e2eae4] px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-extrabold text-[#0c4b31] uppercase tracking-wider">
              From Rural Workshops to Global Connoisseurs
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0c4b31] mt-1">
              Voices of our Karigars
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-white border border-[#d8e6dc] shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <img
                  src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100"
                  alt="Radhamohan Pal"
                  className="w-12 h-12 rounded-full object-cover border-2 border-emerald-300"
                />
                <div>
                  <h4 className="font-bold text-sm text-[#0c4b31]">Radhamohan Pal</h4>
                  <p className="text-xs text-gray-500">Terracotta Sculptor • Panchmura</p>
                </div>
              </div>
              <p className="text-xs text-gray-700 italic leading-relaxed">
                &quot;আগে বাঁকুড়া ছেড়ে কলকাতায় গিয়ে দালালদের কাছে অর্ধেক দামে ঘোড়া বেচতে হতো। এখন শুধু বাংলায় কথা বলি, AI সুন্দর ক্যাটালগ বানিয়ে সরাসরি বায়ারের কাছে পৌঁছে দেয়।&quot;
              </p>
              <div className="text-[11px] font-bold text-emerald-800 bg-[#e3f3e8] px-2.5 py-1 rounded-full w-fit">
                +140% Income Increase
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-[#d8e6dc] shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <img
                  src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100"
                  alt="Sukumar Das"
                  className="w-12 h-12 rounded-full object-cover border-2 border-emerald-300"
                />
                <div>
                  <h4 className="font-bold text-sm text-[#0c4b31]">Sukumar Das</h4>
                  <p className="text-xs text-gray-500">Master Jamdani Weaver • Phulia</p>
                </div>
              </div>
              <p className="text-xs text-gray-700 italic leading-relaxed">
                &quot;The transparent pricing tool calculates my real weaving hours. For the first time in 30 years, buyers see why a genuine Jamdani takes 18 days and pay with respect.&quot;
              </p>
              <div className="text-[11px] font-bold text-emerald-800 bg-[#e3f3e8] px-2.5 py-1 rounded-full w-fit">
                Living Wage Certified
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-[#d8e6dc] shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <img
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100"
                  alt="Anjali Murmu"
                  className="w-12 h-12 rounded-full object-cover border-2 border-emerald-300"
                />
                <div>
                  <h4 className="font-bold text-sm text-[#0c4b31]">Anjali Murmu</h4>
                  <p className="text-xs text-gray-500">Dokra Brass Artisan • Bikna</p>
                </div>
              </div>
              <p className="text-xs text-gray-700 italic leading-relaxed">
                &quot;Our tribal lost-wax craft is thousands of years old. The AI micro-zoom feature allows buyers in Mumbai and overseas to see the delicate beeswax threads before buying.&quot;
              </p>
              <div className="text-[11px] font-bold text-emerald-800 bg-[#e3f3e8] px-2.5 py-1 rounded-full w-fit">
                Direct Export Orders
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#073623] text-[#cadbd1] py-12 px-4 sm:px-6 border-t border-[#0b4830]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">✦</span>
              <span className="font-extrabold text-xl text-white">KarigarSetu AI</span>
            </div>
            <p className="text-xs text-[#9ebcb0] leading-relaxed">
              Bridging the digital divide for Indian rural artisans through voice-first cataloging, living wage transparency, and direct craft commerce.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-bold text-white mb-3">Artisan Workspace</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/artisan/dashboard" className="hover:text-white transition-colors">
                  Artisan Studio & Catalog
                </Link>
              </li>
              <li>
                <Link to="/artisan/add-product" className="hover:text-white transition-colors">
                  Voice-First Product Lister
                </Link>
              </li>
              <li>
                <Link to="/artisan/register" className="hover:text-white transition-colors">
                  Create Artisan Profile / Login
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold text-white mb-3">Governance & Quality</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <span className="text-[#88aa9a]">
                  Authenticity Verification Standards
                </span>
              </li>
              <li>
                <span className="text-[#88aa9a]">Fair Living Wage Index (FLWI)</span>
              </li>
              <li>
                <span className="text-[#88aa9a]">GI Craft Heritage Authentication</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold text-white mb-3">Regional Support</h4>
            <p className="text-xs text-[#9ebcb0] leading-relaxed mb-2">
              Craft verification desks active in West Bengal, Rajasthan, Odisha, and Karnataka.
            </p>
            <div className="text-[11px] font-semibold text-[#ffd186]">
              Toll-free voice support: 1800-KARIGAR
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-8 mt-8 border-t border-[#0f4d33] flex flex-col sm:flex-row items-center justify-between text-xs text-[#80a594]">
          <p>© 2026 KarigarSetu AI. Built for the artisans of India.</p>
          <div className="flex gap-4 mt-2 sm:mt-0">
            <span>Privacy</span>
            <span>Terms of Living Wage</span>
            <span>GI Verification</span>
          </div>
        </div>
      </footer>

      {/* Product Detail Modal */}
      {activeModalProduct && (
        <ProductDetailModal
          product={activeModalProduct}
          onClose={() => setActiveModalProduct(null)}
        />
      )}
    </div>
  );
};

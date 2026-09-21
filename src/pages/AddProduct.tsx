import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Sparkles, 
  ArrowLeft, 
  Camera, 
  Mic, 
  Square, 
  Volume2, 
  Image as ImageIcon, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle,
  Wand2,
  Tag
} from 'lucide-react';
import { getCurrentArtisan } from '../data/seedData';
import { CraftCategory } from '../types';
import { API_BASE } from '../services/apiConfig';

const SAMPLE_CRAFT_PHOTOS = [
  {
    name: 'Terracotta Vase',
    url: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=800&auto=format&fit=crop&q=80',
    category: 'Pottery' as CraftCategory,
    material: 250,
    labour: 450,
    sampleVoice: 'আমাদের বাঁকুড়ার খাঁটি লাল মাটির তৈরি ঐতিহ্যবাহী ফুলদানি, কাঠের আগুনে পোড়ানো।'
  },
  {
    name: 'Phulia Jamdani Weave',
    url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&auto=format&fit=crop&q=80',
    category: 'Handloom' as CraftCategory,
    material: 1200,
    labour: 2500,
    sampleVoice: 'ফুলিয়ার খাঁটি সুতি জামদানি শাড়ি, ঐতিহ্যবাহী তাঁতে ১৫ দিন ধরে বোনা।'
  },
  {
    name: 'Dokra Brass Figurine',
    url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80',
    category: 'Metalcraft' as CraftCategory,
    material: 480,
    labour: 750,
    sampleVoice: 'বাঁকুড়ার প্রাচীন মোম ছাঁচে ঢালা পিতলের আদিবাসী হস্তশিল্প নটরাজ।'
  }
];

export const AddProduct: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const artisan = getCurrentArtisan();

  // Mode check: if editing
  const isEditMode = location.search.includes('mode=edit') || (location.state as any)?.editMode;

  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState<CraftCategory | ''>('');
  const [description, setDescription] = useState('');
  const [materialCost, setMaterialCost] = useState<number | ''>('');
  const [labourCost, setLabourCost] = useState<number | ''>('');
  const [imagePreview, setImagePreview] = useState<string>('');
  const [voiceLanguage, setVoiceLanguage] = useState<string>('bn-IN');
  const [isListening, setIsListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('');
  const [isEnhancingImage, setIsEnhancingImage] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const recognitionRef = useRef<any>(null);
  const voiceCommittedRef = useRef(false);

  useEffect(() => {
    if (isEditMode) {
      // Only the preview's Edit Information link restores its draft.
      try {
        const saved = JSON.parse(sessionStorage.getItem('productData') || '{}');
        const savedImage = sessionStorage.getItem('productImage') || saved.imageUrl;
        if (saved.productName) setProductName(saved.productName);
        if (saved.category) setCategory(saved.category);
        if (saved.description) setDescription(saved.description);
        if (saved.materialCost !== undefined) setMaterialCost(saved.materialCost);
        if (saved.labourCost !== undefined) setLabourCost(saved.labourCost);
        if (savedImage) setImagePreview(savedImage);
      } catch (e) {
        console.warn('Draft read error', e);
      }
    } else {
      // A new listing must never inherit a previously selected product.
      sessionStorage.removeItem('productData');
      sessionStorage.removeItem('productImage');
      setProductName('');
      setCategory('');
      setDescription('');
      setMaterialCost('');
      setLabourCost('');
      setImagePreview('');
      setVoiceStatus('');
      setErrorMessage('');
    }

    return () => {
      recognitionRef.current?.abort?.();
    };
  }, [isEditMode]);

  // Voice detection helper for categories
  const detectCategoryFromVoice = (spokenText: string): CraftCategory | null => {
    const text = spokenText.toLowerCase();
    if (text.includes('মাটি') || text.includes('টেরাকোটা') || text.includes('pottery') || text.includes('clay') || text.includes('मिट्टी')) {
      return 'Pottery';
    }
    if (text.includes('তাঁত') || text.includes('শাড়ি') || text.includes('saree') || text.includes('handloom') || text.includes('বুনা') || text.includes('साड़ी')) {
      return 'Handloom';
    }
    if (text.includes('পিতল') || text.includes('ঢোকরা') || text.includes('brass') || text.includes('metal') || text.includes('dokra')) {
      return 'Metalcraft';
    }
    if (text.includes('কাঠ') || text.includes('wood') || text.includes('carving') || text.includes('लकड़ी')) {
      return 'Woodcraft';
    }
    if (text.includes('গয়না') || text.includes('jewelry') || text.includes('necklace') || text.includes('গহনা')) {
      return 'Jewellery';
    }
    if (text.includes('ছবি') || text.includes('painting') || text.includes('চিত্র') || text.includes('पेंटिंग')) {
      return 'Painting';
    }
    return null;
  };

  const handleVoiceToggle = () => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      setVoiceStatus('Voice processing complete.');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceStatus('Web Speech is not supported on this browser. Try simulating voice with the sample buttons below.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = voiceLanguage;
      recognition.continuous = false;
      recognition.interimResults = false;
      voiceCommittedRef.current = false;

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMessage('');
        setVoiceStatus('শুনছি... আপনার শিল্পকর্মের বর্ণনা বলুন (Listening in your language...)');
      };

      recognition.onresult = (event: any) => {
        if (voiceCommittedRef.current) return;

        const transcript = Array.from(event.results)
          .filter((res: any) => res.isFinal)
          .map((res: any) => res[0]?.transcript || '')
          .join(' ')
          .trim();

        if (!transcript) return;
        voiceCommittedRef.current = true;

        setVoiceStatus(`শুনেছি: "${transcript}"`);

        // Automatically update description and detect category
        setDescription((prev) => (prev ? `${prev} ${transcript}` : transcript));
        
        if (!productName) {
          const words = transcript.split(' ').slice(0, 6).join(' ');
          setProductName(words);
        }

        const detected = detectCategoryFromVoice(transcript);
        if (detected) {
          setCategory(detected);
        }
        recognition.stop();
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        setVoiceStatus(`Voice capture: ${event.error}. You can also type or use quick speech samples below.`);
      };

      recognition.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      setIsListening(false);
      setVoiceStatus('Microphone access unavailable. You can use speech samples below.');
    }
  };

  const handleApplySampleVoice = (sampleText: string, sampleCat: CraftCategory, sampleTitle: string, mat: number, lab: number) => {
    setDescription(sampleText);
    setCategory(sampleCat);
    setProductName(sampleTitle);
    setMaterialCost(mat);
    setLabourCost(lab);
    setVoiceStatus(`Applied sample voice description in বাংলা!`);
  };

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsEnhancingImage(true);
    setErrorMessage('');
    setImagePreview('');

    try {
      const form = new FormData();
      form.append('image', file);
      const response = await fetch(`${API_BASE}/api/uploads`, {
        method: 'POST',
        credentials: 'include',
        body: form,
      });
      const result = await response.json();
      if (!response.ok || !result.success || !result.imageUrl) {
        throw new Error(result.message || 'Could not process the uploaded photo.');
      }
      setImagePreview(result.imageUrl);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not process the uploaded photo.');
    } finally {
      setIsEnhancingImage(false);
      e.target.value = '';
    }
  };

  const handleSelectSamplePhoto = (sample: typeof SAMPLE_CRAFT_PHOTOS[0]) => {
    setIsEnhancingImage(true);
    setTimeout(() => {
      setImagePreview(sample.url);
      setCategory(sample.category);
      if (!productName) setProductName(sample.name);
      if (!materialCost) setMaterialCost(sample.material);
      if (!labourCost) setLabourCost(sample.labour);
      if (!description) setDescription(sample.sampleVoice);
      setIsEnhancingImage(false);
    }, 400);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!imagePreview) {
      setErrorMessage('Please upload a product photograph or select a sample photo above.');
      return;
    }

    if (!productName.trim()) {
      setErrorMessage('Please provide a product title / পণ্যের নাম দিন।');
      return;
    }

    if (!category) {
      setErrorMessage('Please select a craft category.');
      return;
    }

    if (description.trim().length < 20) {
      setErrorMessage('পণ্যের বিবরণ অন্তত ২০ অক্ষরে লিখুন।');
      return;
    }

    if (!imagePreview || imagePreview.includes('images.unsplash.com')) {
      setErrorMessage('AI catalog তৈরির জন্য নিজের পণ্যের ছবি upload করুন। Sample photo শুধু preview-এর জন্য।');
      return;
    }

    const mat = Number(materialCost) || 0;
    const lab = Number(labourCost) || 0;
    setIsGenerating(true);

    try {
      const response = await fetch(`${API_BASE}/api/generate-catalog`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          productName: productName.trim(),
          category,
          description: description.trim(),
          materialCost: mat,
          labourCost: lab,
          imageUrl: imagePreview,
          language: voiceLanguage,
          artisanName: artisan.name,
          artisanLocation: artisan.location,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success || !result.catalog) {
        throw new Error(result.message || 'AI catalog তৈরি হয়নি। Flask ও n8n workflow চালু আছে কি না দেখুন।');
      }

      const aiCatalog = result.catalog;
      if (typeof aiCatalog.professionalTitle !== 'string' ||
          typeof aiCatalog.catalogDescription !== 'string' ||
          aiCatalog.catalogDescription.trim().length < 40 ||
          /[\u0980-\u09ff]/.test(aiCatalog.catalogDescription)) {
        throw new Error('AI ইংরেজিতে সম্পূর্ণ catalog description তৈরি করেনি। আবার চেষ্টা করুন।');
      }
      const suggestedPrice = Number(aiCatalog.suggestedPrice) || Math.round((mat + lab) * 1.35);

      const productDataToSave = {
        id: Date.now(),
        artisanId: artisan.id,
        artisanName: artisan.name,
        artisanLocation: artisan.location,
        productName: aiCatalog.professionalTitle || productName.trim(),
        category,
        description: aiCatalog.catalogDescription || description.trim(),
        materialCost: mat,
        labourCost: lab,
        suggestedPrice,
        sellingPrice: suggestedPrice,
        stockQuantity: 5,
        imageUrl: imagePreview,
        aiCatalog,
        aiGenerated: true,
        detailFocus: { x: 50, y: 45 },
        status: 'pending_ai_check'
      };

      sessionStorage.setItem('productData', JSON.stringify(productDataToSave));
      sessionStorage.setItem('productImage', imagePreview);

      navigate('/artisan/product-preview');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'AI catalog generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfaf6] text-[#1a2d23] py-8 px-4 sm:px-6">
      <main className="max-w-5xl mx-auto">
        
        {/* Navigation Header */}
        <div className="flex items-center justify-between pb-6 border-b border-[#e1eae4] mb-8">
          <Link
            to="/artisan/dashboard"
            id="back-to-dashboard-link"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0c4b31] hover:text-[#e27d35] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Studio Dashboard</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-[#0c4b31] text-white flex items-center justify-center text-xs font-bold">✦</span>
            <span className="text-xs font-extrabold text-[#0c4b31]">KarigarSetu AI Studio</span>
          </div>
        </div>

        {/* Intro */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-[#e3f4ea] text-[#0c4b31] border border-[#bfe2ce] uppercase tracking-wider">
            Step 1 of 3: Craft Data & Voice Capture
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0c4b31] tracking-tight mt-3">
            Add a New Craft Product
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-2">
            Upload your craft photo and speak naturally in your mother tongue. 
            Our AI will formulate an export-ready catalog and living wage recommendation.
          </p>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start" id="add-product-form">
          
          {/* Left Column: Photo Upload with Studio Backing */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-[#dce8df] shadow-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-[#0c4b31]">1. Product Photograph</h2>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                Auto Isolation
              </span>
            </div>

            <p className="text-xs text-gray-500">
              Upload any phone picture with natural light. AI will isolate the craft and enhance clarity.
            </p>

            {/* Drop Zone Box */}
            <label className="relative border-2 border-dashed border-[#b7cebe] hover:border-[#0c4b31] rounded-2xl h-72 sm:h-80 flex flex-col items-center justify-center p-4 bg-gradient-to-b from-[#f8faf8] to-[#edf4f0] cursor-pointer overflow-hidden transition-all group">
              <input
                id="product-photo-upload"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleImageFile}
                className="sr-only"
              />

              {imagePreview ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <img
                    src={imagePreview}
                    alt="Craft preview"
                    className="max-h-full max-w-full object-contain drop-shadow-lg group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold rounded-xl backdrop-blur-xs">
                    Click to replace photo
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-2.5 p-4">
                  <div className="w-14 h-14 rounded-2xl bg-white shadow-xs mx-auto flex items-center justify-center text-[#0c4b31]">
                    <Camera className="w-7 h-7" />
                  </div>
                  <div>
                    <strong className="block text-sm font-bold text-[#0c4b31]">
                      Choose or Snap Photo
                    </strong>
                    <span className="text-[11px] text-gray-500">
                      PNG, JPG or WEBP from phone
                    </span>
                  </div>
                </div>
              )}

              {isEnhancingImage && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center text-xs font-bold text-[#0c4b31] gap-2">
                  <Sparkles className="w-5 h-5 animate-spin text-[#e27d35]" />
                  <span>Isolating craft backdrop...</span>
                </div>
              )}
            </label>

            {/* Quick Sample Photos for instant testing */}
            <div className="pt-2">
              <span className="block text-[11px] font-bold text-gray-500 mb-2">
                Or test immediately with a sample craft:
              </span>
              <div className="grid grid-cols-3 gap-2">
                {SAMPLE_CRAFT_PHOTOS.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSamplePhoto(sample)}
                    className="p-1.5 rounded-xl border border-gray-200 hover:border-[#0c4b31] bg-[#f9faf9] hover:bg-white text-left transition-all group"
                  >
                    <img
                      src={sample.url}
                      alt={sample.name}
                      className="w-full h-14 object-cover rounded-lg mb-1"
                    />
                    <span className="block text-[10px] font-bold text-gray-700 truncate group-hover:text-[#0c4b31]">
                      {sample.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Voice-First Description & Living Wage Form */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-[#dce8df] shadow-md p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-base font-extrabold text-[#0c4b31]">2. Describe Product by Voice</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Speak naturally in your mother tongue. The AI will populate name, category, and specifications.
              </p>
            </div>

            {/* Voice Control Bar */}
            <div className="p-3.5 rounded-xl bg-[#eef8f2] border border-[#b8dfc8] space-y-3">
              <div className="flex flex-col sm:flex-row gap-2.5">
                {/* Language Picker */}
                <select
                  id="voice-language-select"
                  aria-label="Select voice language"
                  value={voiceLanguage}
                  onChange={(e) => setVoiceLanguage(e.target.value)}
                  disabled={isListening}
                  className="px-3 py-2.5 text-xs font-bold bg-white border border-[#b1d8c0] rounded-xl text-[#0c4b31] focus:outline-none"
                >
                  <option value="bn-IN">বাংলা (Bengali)</option>
                  <option value="hi-IN">हिन्दी (Hindi)</option>
                  <option value="en-IN">English</option>
                  <option value="or-IN">ଓଡ଼ିଆ (Odia)</option>
                </select>

                {/* Microphone Record Button */}
                <button
                  type="button"
                  id="start-voice-record-btn"
                  onClick={handleVoiceToggle}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs ${
                    isListening
                      ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                      : 'bg-[#0c4b31] hover:bg-[#073623] text-white'
                  }`}
                >
                  {isListening ? (
                    <>
                      <Square className="w-4 h-4" />
                      <span>⏹ Stop Recording</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4 text-[#ffd186]" />
                      <span>🎙 Describe Product by Voice</span>
                    </>
                  )}
                </button>
              </div>

              {/* Live Voice Status Feedback */}
              {voiceStatus && (
                <div className="p-2.5 rounded-lg bg-white border border-[#c4e4d1] text-xs font-medium text-[#115e3c] flex items-start gap-2 animate-fadeIn">
                  <Volume2 className="w-4 h-4 text-[#e27d35] shrink-0 mt-0.5" />
                  <span className="leading-snug">{voiceStatus}</span>
                </div>
              )}

              {/* Sample Voice Prompts for quick 1-click test */}
              <div className="pt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-gray-600">
                <span className="font-bold text-gray-700">Quick Test Voice Prompt:</span>
                <button
                  type="button"
                  onClick={() => handleApplySampleVoice(
                    'আমাদের বাঁকুড়ার লাল মাটির ঐতিহ্যবাহী টেরাকোটা ঘোড়া, সম্পূর্ণ হাতে গড়া ও কাঠের আগুনে পোড়ানো।',
                    'Pottery',
                    'Traditional Terracotta Horse',
                    350,
                    600
                  )}
                  className="px-2 py-0.5 rounded-md bg-white border border-gray-200 hover:bg-[#d9ede1] text-[10px] font-semibold text-[#0c4b31]"
                >
                  বাংলা (Terracotta)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplySampleVoice(
                    'ফুলিয়ার তাঁতে বোনা সুতি জামদানি শাড়ি, অত্যন্ত সূক্ষ্ম কারুকার্য করা।',
                    'Handloom',
                    'Pure Cotton Phulia Jamdani',
                    1200,
                    2200
                  )}
                  className="px-2 py-0.5 rounded-md bg-white border border-gray-200 hover:bg-[#d9ede1] text-[10px] font-semibold text-[#0c4b31]"
                >
                  বাংলা (Jamdani Saree)
                </button>
              </div>
            </div>

            {/* Manual Edit Fields */}
            <div className="space-y-4">
              <div>
                <label htmlFor="product-name" className="block text-xs font-bold text-gray-700 mb-1">
                  Product Name / শিল্পকর্মের নাম *
                </label>
                <input
                  id="product-name"
                  type="text"
                  required
                  placeholder="e.g. Heritage Bankura Terracotta Vase"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#fafcfa] border border-[#cedbd2] rounded-xl focus:outline-none focus:border-[#0c4b31] focus:ring-2 focus:ring-[#0c4b31]/10"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="product-category" className="block text-xs font-bold text-gray-700 mb-1">
                    Craft Category / শিল্প বিভাগ *
                  </label>
                  <select
                    id="product-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as CraftCategory)}
                    className="w-full px-3.5 py-2.5 text-sm bg-[#fafcfa] border border-[#cedbd2] rounded-xl focus:outline-none focus:border-[#0c4b31] focus:ring-2 focus:ring-[#0c4b31]/10"
                  >
                    <option value="" disabled>Select a craft category</option>
                    <option value="Pottery">Pottery & Terracotta (মাটি ও টেরাকোটা)</option>
                    <option value="Handloom">Handloom Textiles (তাঁত ও টেক্সটাইল)</option>
                    <option value="Metalcraft">Metalcraft & Dokra (পিতল ও ঢোকরা)</option>
                    <option value="Woodcraft">Woodcraft & Carving (কাঠের কারুকাজ)</option>
                    <option value="Jewellery">Jewellery (ঐতিহ্যবাহী গহনা)</option>
                    <option value="Painting">Painting & Folk Art (লোকচিত্র)</option>
                    <option value="Other">Other Craft</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="product-raw-material-cost" className="block text-xs font-bold text-gray-700 mb-1">
                    Raw Material Cost / কাঁচামালের খরচ (₹)
                  </label>
                  <input
                    id="product-raw-material-cost"
                    type="number"
                    min="0"
                    placeholder="e.g. 250"
                    value={materialCost}
                    onChange={(e) => setMaterialCost(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3.5 py-2.5 text-sm bg-[#fafcfa] border border-[#cedbd2] rounded-xl focus:outline-none focus:border-[#0c4b31] focus:ring-2 focus:ring-[#0c4b31]/10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="product-labour-cost" className="block text-xs font-bold text-gray-700 mb-1">
                    Labour & Crafting Cost / শ্রম ও সময়ের মূল্য (₹)
                  </label>
                  <input
                    id="product-labour-cost"
                    type="number"
                    min="0"
                    placeholder="e.g. 500"
                    value={labourCost}
                    onChange={(e) => setLabourCost(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3.5 py-2.5 text-sm bg-[#fafcfa] border border-[#cedbd2] rounded-xl focus:outline-none focus:border-[#0c4b31] focus:ring-2 focus:ring-[#0c4b31]/10"
                  />
                </div>

                <div className="p-3 rounded-xl bg-[#f4f8f4] border border-[#d4e5d8] flex flex-col justify-center">
                  <span className="text-[10px] text-gray-500 font-bold uppercase">Estimated Fair Living Wage:</span>
                  <strong className="text-lg font-extrabold text-[#0c4b31]">
                    ₹{Math.round(((Number(materialCost) || 0) + (Number(labourCost) || 0)) * 1.35) || '—'}
                  </strong>
                </div>
              </div>

              <div>
                <label htmlFor="product-description" className="block text-xs font-bold text-gray-700 mb-1">
                  Craft Story & Making Process / তৈরির প্রক্রিয়া ও বিবরণ *
                </label>
                <textarea
                  id="product-description"
                  rows={3}
                  required
                  placeholder="Describe the making process, natural dyes, clay source, or loom technique..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#fafcfa] border border-[#cedbd2] rounded-xl focus:outline-none focus:border-[#0c4b31] focus:ring-2 focus:ring-[#0c4b31]/10 resize-none"
                />
              </div>
            </div>

            {/* Error banner */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isGenerating}
              id="generate-catalog-btn"
              className="w-full py-4 px-6 rounded-xl bg-[#0c4b31] hover:bg-[#073623] text-white text-sm font-extrabold shadow-lg shadow-[#0c4b31]/20 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Wand2 className="w-4 h-4 text-[#ffd186]" />
              <span>{isGenerating ? 'Synthesizing AI Catalog...' : 'Save & Generate AI Catalog →'}</span>
            </button>
          </div>

        </form>
      </main>
    </div>
  );
};

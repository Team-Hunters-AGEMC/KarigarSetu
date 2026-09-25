import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, CheckCircle2 } from 'lucide-react';
import { CraftCategory } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

const categories: { value: CraftCategory; label: string }[] = [
  { value: 'Pottery', label: 'Pottery & Terracotta' },
  { value: 'Handloom', label: 'Handloom Textiles' },
  { value: 'Metalcraft', label: 'Metalcraft & Dokra' },
  { value: 'Woodcraft', label: 'Woodcraft & Carving' },
  { value: 'Jewellery', label: 'Heritage Jewellery' },
  { value: 'Painting', label: 'Painting & Folk Art' },
  { value: 'Other', label: 'Other Craft' },
];

const fieldClass = 'w-full rounded-xl border border-[#cedbd2] bg-white px-4 py-3 text-[#163e2e] outline-none focus:border-[#0c4b31] focus:ring-2 focus:ring-[#0c4b31]/10';

export const ProfessionalStudio: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<CraftCategory | ''>('');
  const [description, setDescription] = useState('');
  const [materialCost, setMaterialCost] = useState('');
  const [labourCost, setLabourCost] = useState('');
  const [price, setPrice] = useState('');
  const [aiPrice, setAiPrice] = useState<number | null>(null);
  const [uploadedImage, setUploadedImage] = useState('');
  const [calculatingPrice, setCalculatingPrice] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<'approved' | 'admin_review'>('admin_review');
  const [confidenceScore, setConfidenceScore] = useState<number | null>(null);

  const selectPhoto = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setPhoto(file);
    setUploadedImage('');
    setAiPrice(null);
    setPrice('');
    setError('');
    setPhotoPreview((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return file ? URL.createObjectURL(file) : '';
    });
  };

  const uploadPhoto = async () => {
    if (uploadedImage) return uploadedImage;
    if (!photo) throw new Error('Choose a product photo first.');
    const imageForm = new FormData();
    imageForm.append('image', photo);
    imageForm.append('preserveOriginal', 'true');
    const uploadResponse = await fetch('/api/uploads', {
      method: 'POST', credentials: 'include', body: imageForm,
    });
    const upload = await uploadResponse.json().catch(() => ({}));
    if (!uploadResponse.ok || !upload.success) throw new Error(upload.message || 'Photo upload failed.');
    setUploadedImage(upload.imageUrl);
    return upload.imageUrl as string;
  };

  const calculatePrice = async () => {
    setError('');
    if (!photo || !category || name.trim().length < 3 || description.trim().length < 20 ||
        materialCost === '' || labourCost === '' ||
        !Number.isFinite(Number(materialCost)) || !Number.isFinite(Number(labourCost)) ||
        Number(materialCost) < 0 || Number(labourCost) < 0) {
      setError('Add a photo, title, category, description and valid costs before calculating the AI price.');
      return null;
    }
    setCalculatingPrice(true);
    try {
      const imageUrl = await uploadPhoto();
      const response = await fetch('/api/generate-catalog', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: name.trim(), category, description: description.trim(),
          materialCost: Number(materialCost), labourCost: Number(labourCost), imageUrl,
          listingMode: 'professional',
        }),
      });
      const result = await response.json().catch(() => ({}));
      const suggested = Number(result.catalog?.suggestedPrice);
      if (!response.ok || !result.success || !Number.isFinite(suggested) || suggested <= 0) {
        throw new Error(result.message || 'AI could not calculate a price. Try again.');
      }
      setAiPrice(suggested);
      setPrice(String(suggested));
      return suggested;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'AI price calculation failed.');
      return null;
    } finally {
      setCalculatingPrice(false);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending) return;
    setError('');
    if (!photo || !category) {
      setError('Choose a product photo and craft category.');
      return;
    }
    if (description.trim().length < 20 || name.trim().length < 3) {
      setError('Use at least 3 characters for the title and 20 for the description.');
      return;
    }
    if (aiPrice === null) {
      setError('Calculate the AI suggested price before submitting.');
      return;
    }
    if (!Number.isFinite(Number(price)) || Number(price) <= 0 ||
        materialCost === '' || labourCost === '' || Number(materialCost) < 0 || Number(labourCost) < 0) {
      setError('Enter a valid selling price and nonnegative material and labour costs.');
      return;
    }

    setPending(true);
    try {
      const imageUrl = await uploadPhoto();

      const response = await fetch('/api/products', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingMode: 'professional',
          productName: name.trim(),
          category,
          description: description.trim(),
          materialCost: Number(materialCost),
          labourCost: Number(labourCost),
          suggestedPrice: aiPrice,
          sellingPrice: Number(price),
          imageUrl,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (response.status === 401) {
        navigate('/artisan/register', { state: { from: '/artisan/professional-studio' } });
        return;
      }
      if (!response.ok || !result.success) throw new Error(result.message || 'Could not submit the product.');
      setApprovalStatus(result.status === 'approved' ? 'approved' : 'admin_review');
      setConfidenceScore(typeof result.aiConfidenceScore === 'number' ? result.aiConfidenceScore : null);
      setSubmitted(true);
      window.dispatchEvent(new Event('karigarsetu_products_updated'));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not submit the product.');
    } finally {
      setPending(false);
    }
  };

  if (submitted) return (
    <main className="min-h-[65vh] bg-[#fcfaf6] px-4 py-20">
      <div className="mx-auto max-w-xl rounded-3xl border border-[#dce8df] bg-white p-10 text-center shadow-lg">
        <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-[#0c4b31]" />
        <h1 className="text-3xl font-extrabold text-[#0c4b31]">{approvalStatus === 'approved' ? t.artisan.productApprovedTitle : t.artisan.productSentForReviewTitle}</h1>
        <p className="mt-3 text-gray-600">{confidenceScore !== null && `AI confidence: ${confidenceScore}%. `}{approvalStatus === 'approved' ? t.artisan.liveInMarketplaceDesc : t.artisan.flaggedForReviewDesc}</p>
        <Link to="/artisan/dashboard" className="mt-7 inline-block rounded-xl bg-[#0c4b31] px-6 py-3 font-bold text-white">{t.artisan.openArtisanStudioBtn}</Link>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#fcfaf6] px-4 py-10 text-[#163e2e]">
      <div className="mx-auto max-w-5xl">
        <Link to="/artisan/dashboard" className="inline-flex items-center gap-2 font-bold text-[#0c4b31]"><ArrowLeft className="h-4 w-4" /> {t.artisan.dashboardTitle}</Link>
        <div className="mb-8 mt-7">
          <span className="rounded-full bg-[#e3f4ea] px-3 py-1 text-xs font-bold uppercase tracking-wider">{t.artisan.manualListingBadge}</span>
          <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">{t.artisan.proStudioPageTitle}</h1>
          <p className="mt-2 text-gray-600">{t.artisan.proStudioPageSubtitle}</p>
        </div>
        <form onSubmit={submit} className="grid gap-7 lg:grid-cols-5">
          <section className="self-start rounded-2xl border border-[#dce8df] bg-white p-6 shadow-sm lg:col-span-2">
            <h2 className="text-lg font-extrabold">{t.artisan.productPhotograph}</h2>
            <p className="mb-5 mt-1 text-sm text-gray-600">{t.artisan.originalPhotoNoBg}</p>
            <label className="flex min-h-72 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-[#b7cebe] bg-[#f8faf8] text-center">
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={selectPhoto} className="sr-only" />
              {photoPreview ? <img src={photoPreview} alt="Selected product" className="max-h-80 w-full object-contain" /> : <><Camera className="mb-3 h-10 w-10" /><strong>{t.artisan.selectProductPhoto}</strong><span className="mt-1 text-xs text-gray-500">{t.artisan.photoSizeLimit}</span></>}
            </label>
            {photo && <p className="mt-3 break-all text-xs text-gray-600">{photo.name} · {t.artisan.clickPhotoToReplace}</p>}
          </section>
          <section className="space-y-5 rounded-2xl border border-[#dce8df] bg-white p-6 shadow-sm lg:col-span-3">
            <h2 className="text-lg font-extrabold">{t.artisan.productDetailsHeading}</h2>
            <label className="block text-sm font-bold">{t.artisan.productNameEnglishLabel}<input required minLength={3} maxLength={120} value={name} onChange={(e) => { setName(e.target.value); setAiPrice(null); }} className={`mt-2 ${fieldClass}`} placeholder={t.artisan.productNameEnglishPlaceholder} /></label>
            <label className="block text-sm font-bold">{t.artisan.craftCategoryManualLabel}<select required value={category} onChange={(e) => { setCategory(e.target.value as CraftCategory); setAiPrice(null); }} className={`mt-2 ${fieldClass}`}><option value="">{t.artisan.selectCategoryPlaceholder}</option>{categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <label className="block text-sm font-bold">{t.artisan.descriptionProcessEnglishLabel}<textarea required minLength={20} maxLength={2000} rows={6} value={description} onChange={(e) => { setDescription(e.target.value); setAiPrice(null); }} className={`mt-2 ${fieldClass}`} placeholder={t.artisan.descriptionProcessEnglishPlaceholder} /></label>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block text-sm font-bold">{t.artisan.rawMaterialCostLabel}<input required type="number" min="0" step="0.01" value={materialCost} onChange={(e) => { setMaterialCost(e.target.value); setAiPrice(null); }} className={`mt-2 ${fieldClass}`} /></label>
              <label className="block text-sm font-bold">{t.artisan.labourCostLabel}<input required type="number" min="0" step="0.01" value={labourCost} onChange={(e) => { setLabourCost(e.target.value); setAiPrice(null); }} className={`mt-2 ${fieldClass}`} /></label>
              <label className="block text-sm font-bold">{t.artisan.sellingPriceLabel}<input required type="number" min="0.01" step="0.01" value={price} disabled={aiPrice === null} onChange={(e) => setPrice(e.target.value)} className={`mt-2 ${fieldClass}`} /></label>
            </div>
            <button disabled={pending || calculatingPrice} type="button" onClick={calculatePrice} className="rounded-xl border border-[#0c4b31] px-5 py-3 font-bold text-[#0c4b31] disabled:opacity-60">{calculatingPrice ? t.artisan.calculatingAiPriceBtn : t.artisan.calculateAiPriceBtn}</button>
            {aiPrice !== null && <p className="rounded-xl bg-[#e3f4ea] p-3 font-bold">{t.artisan.aiSuggestedPriceBanner}{aiPrice} {t.artisan.aiSuggestedPriceEditable}</p>}
            {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
            <button disabled={pending || calculatingPrice || aiPrice === null} type="submit" className="w-full rounded-xl bg-[#0c4b31] px-6 py-3.5 font-extrabold text-white disabled:opacity-60">{pending ? t.artisan.checkingWithAiBtn : t.artisan.submitForAiVerificationBtn}</button>
          </section>
        </form>
      </div>
    </main>
  );
};

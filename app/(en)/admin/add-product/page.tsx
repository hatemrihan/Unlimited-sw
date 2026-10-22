"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowRight, Loader2, Check, ChevronLeft, Plus } from 'lucide-react';
import { Button } from "@/components/ui/button";

import ImageOrderManager from '@/components/ImageOrderManager';
import VariantImageManager from '@/components/VariantImageManager';
import FileUpload from '@/components/FileUpload';
import ProtectedAdminRoute from '@/components/auth/protected-admin-route';
import SidebarNav from '../sections/SideBarNav';
import { useAddProduct } from '@/product/ui/useAddProduct';
import { calculateFinalPrice } from '@/utils/pricing';
import { CATEGORIES, CATEGORY_KEYS, type CategoryKey } from '@/product/categories';
import { slugifyEn, slugifyAr } from '@/lib/slug';

const STEPS = [
  { id: 'general', num: '01', title: 'المعلومات الأساسية' },
  { id: 'pricing', num: '02', title: 'التسعير والحالة' },
  { id: 'media', num: '03', title: 'الوسائط والصور' },
  { id: 'variants', num: '04', title: 'المتغيرات' },
  { id: 'additional', num: '05', title: 'تفاصيل إضافية' },
  // Phase 2: the category and the Arabic copy that the /ar pages read.
  { id: 'seo', num: '06', title: 'التصنيف والمحتوى العربي' }
];

const InputLabel = ({ children }: { children: React.ReactNode }) => (
  <label className="block text-[13px] font-medium text-white/70 mb-2">{children}</label>
);

export default function AddProductPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [isNavigatingBack, setIsNavigatingBack] = useState(false);
  const [activeStepId, setActiveStepId] = useState(STEPS[0].id);

  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const { 
    product, savingProduct, addProduct: handleAddProduct,
    updateField, updateVariant, addVariant, removeVariant, updateFaq, addFaq, removeFaq 
  } = useAddProduct();

  const currentStepIndex = STEPS.findIndex(s => s.id === activeStepId);
  const isLastStep = currentStepIndex === STEPS.length - 1;

  const handleNext = async () => {
    setLoadingAction('next');
    // Simulate slight delay for smooth UX as requested
    await new Promise(r => setTimeout(r, 300));
    setLoadingAction(null);

    if (!isLastStep) {
      setActiveStepId(STEPS[currentStepIndex + 1].id);
    } else {
      handleAddProduct();
    }
  };

  const handlePrev = async () => {
    setLoadingAction('prev');
    await new Promise(r => setTimeout(r, 200));
    setLoadingAction(null);
    
    if (currentStepIndex > 0) {
      setActiveStepId(STEPS[currentStepIndex - 1].id);
    }
  };

  const handleAddVariantClick = async () => {
    setLoadingAction('addVariant');
    await new Promise(r => setTimeout(r, 200));
    addVariant();
    setLoadingAction(null);
  };

  const handleAddFaqClick = async () => {
    setLoadingAction('addFaq');
    await new Promise(r => setTimeout(r, 200));
    addFaq();
    setLoadingAction(null);
  };

  const inputClasses = "w-full p-3 bg-black/20 border border-white/[0.12] rounded-lg text-white focus:border-white/[0.3] focus:outline-none transition-colors text-sm";

  return (
    <ProtectedAdminRoute>
      <div className="flex min-h-screen flex-col relative bg-stone-900" dir="rtl">
        <SidebarNav
          activeSection="products"
          onSectionChange={() => router.push('/admin')}
          userName={session?.user?.name || "المدير"}
        />

        <div className="md:mr-[220px] flex-1 flex flex-col min-h-screen bg-stone-900 text-white">
          
          {/* Header Area */}
          <div className="border-b border-white/[0.06] bg-stone-900/80 backdrop-blur-md sticky top-0 z-30 pt-4">
            <div className="px-6 pb-4 max-w-[1400px] mx-auto flex flex-col gap-1.5">
              <button
                onClick={() => {
                  setIsNavigatingBack(true);
                  router.push('/admin#products');
                }}
                disabled={isNavigatingBack || savingProduct}
                className="text-white/50 hover:text-white transition-colors text-xs flex items-center gap-1.5 font-medium w-fit disabled:opacity-50"
              >
                {isNavigatingBack ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />} 
                العودة للمنتجات
              </button>

              <div className="flex items-center justify-between mt-1">
                <div>
                  <h1 className="text-lg font-bold text-white tracking-tight">إضافة منتج جديد</h1>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-medium tracking-wider text-white/50 uppercase">إدارة الكتالوج</span>
                  </div>
                </div>
                
                <Button
                  onClick={handleAddProduct}
                  disabled={savingProduct || isNavigatingBack}
                  className="bg-white text-black hover:bg-white/90 text-sm h-9 px-6 rounded-lg font-medium"
                >
                  {savingProduct ? (
                    <>
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      جاري الحفظ...
                    </>
                  ) : (
                    'نشر المنتج'
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="px-6 py-10 max-w-[1400px] mx-auto flex items-start w-full gap-12">
            
            {/* Vertical Stepper Sidebar */}
            <aside className="hidden lg:block w-64 shrink-0 sticky top-[100px]">
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
                <h3 className="text-sm font-semibold mb-6 tracking-wide text-white/90">خطوات الإضافة</h3>
                <div className="relative">
                  <div className="absolute right-[15px] top-4 bottom-4 w-px bg-white/[0.08]" />
                  <ul className="space-y-6 relative">
                    {STEPS.map((step, idx) => {
                      const isActive = activeStepId === step.id;
                      const isCompleted = STEPS.findIndex(s => s.id === activeStepId) > idx;

                      return (
                        <li key={step.id}>
                          <button
                            onClick={() => setActiveStepId(step.id)}
                            className="w-full flex items-center gap-4 text-right group"
                          >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-all duration-300 z-10 ${
                              isActive 
                                ? 'border-white bg-white text-black' 
                                : isCompleted 
                                  ? 'border-green-500 bg-stone-900 text-green-500' 
                                  : 'border-white/20 bg-stone-900 text-white/40 group-hover:border-white/40'
                            }`}>
                              {isCompleted ? <Check className="w-4 h-4" strokeWidth={3} /> : <span className="text-[11px] font-bold">{step.num}</span>}
                            </div>
                            <div>
                              <span className={`text-[13px] font-semibold transition-colors duration-300 ${
                                isActive ? 'text-white' : isCompleted ? 'text-white/80' : 'text-white/40 group-hover:text-white/70'
                              }`}>
                                {step.title}
                              </span>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </aside>

            {/* Main Content Area */}
            <main className="w-full max-w-3xl shrink min-w-0 z-10">
              <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-8 min-h-[500px] flex flex-col transition-all duration-300 ease-in-out">
                
                <h2 className="text-xl font-bold text-white mb-8 border-b border-white/[0.08] pb-4">
                  {STEPS[currentStepIndex].title}
                </h2>

                <div className="flex-1">
                  {/* Step 1: General Information */}
                  {activeStepId === 'general' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div>
                        <InputLabel>اسم المنتج *</InputLabel>
                        <input
                          type="text"
                          value={product.name}
                          onChange={(e) => updateField("name", e.target.value)}
                          className={inputClasses}
                          placeholder="أدخل اسم المنتج"
                        />
                      </div>

                      <div>
                        <InputLabel>وصف مختصر *</InputLabel>
                        <textarea
                          value={product.description}
                          onChange={(e) => updateField("description", e.target.value)}
                          className={inputClasses}
                          placeholder="اكتب وصفاً مختصراً للمنتج..."
                          rows={4}
                        />
                      </div>
                    </div>
                  )}

                  {/* Step 2: Pricing & Status */}
                  {activeStepId === 'pricing' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="flex items-center justify-between mb-8 bg-white/[0.03] p-5 rounded-xl border border-white/[0.05]">
                        <div>
                          <h4 className="text-sm font-medium text-white mb-1">حالة المنتج (نشط)</h4>
                          <p className="text-[13px] text-white/50">
                            {product.isActive ? 'سيظهر المنتج للعملاء في المتجر.' : 'المنتج مخفي حالياً عن المتجر.'}
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={product.isActive}
                            onChange={(e) => updateField("isActive", e.target.checked)}
                          />
                          <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                        </label>
                      </div>


                      <div className="grid grid-cols-2 gap-5">
                        <div>
                          <InputLabel>السعر الأصلي (ج.م)</InputLabel>
                          <input
                            type="number"
                            value={product.originalPrice || ''}
                            onChange={(e) => updateField("originalPrice", parseFloat(e.target.value) || 0)}
                            className={inputClasses}
                            placeholder="1000"
                          />
                        </div>
                        <div>
                          <InputLabel>الخصم (%)</InputLabel>
                          <input
                            type="number"
                            value={product.discount || ''}
                            onChange={(e) => updateField("discount", parseFloat(e.target.value) || 0)}
                            className={inputClasses}
                            placeholder="0"
                            min="0"
                            max="100"
                          />
                        </div>
                        <div className="col-span-2">
                          <InputLabel>رمز الخصم (Promo Code)</InputLabel>
                          <input
                            type="text"
                            value={product.promoCode || ''}
                            onChange={(e) => updateField("promoCode", e.target.value)}
                            className={inputClasses}
                            placeholder="مثال: SAVE10"
                          />
                        </div>
                      </div>

                      {product.originalPrice && product.discount ? (
                        <div className="mt-6 flex justify-between items-center py-5 px-6 bg-green-500/10 border border-green-500/20 rounded-xl">
                          <span className="text-sm text-green-400/80 font-medium">السعر النهائي بعد الخصم</span>
                          <span className="text-2xl font-bold text-green-400">
                            {calculateFinalPrice(product.originalPrice || 0, product.discount).toLocaleString()} ج.م
                          </span>
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* Step 3: Media */}
                  {activeStepId === 'media' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <ImageOrderManager
                        mainImage={product.mainImage}
                        images={product.images}
                        videos={product.videos}
                        onMainImageChange={(url) => updateField("mainImage", url)}
                        onImagesChange={(imgs) => updateField("images", imgs)}
                        onVideosChange={(vids) => updateField("videos", vids)}
                      />
                    </div>
                  )}

                  {/* Step 4: Variants */}
                  {activeStepId === 'variants' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="space-y-5">
                        {product.variants.map((variant, index) => (
                          <div key={variant.id} className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-6">
                            <div className="flex items-start gap-5 mb-5">
                              <div className="flex-1">
                                <InputLabel>اسم المتغير (مثال: أحمر - L)</InputLabel>
                                <input
                                  type="text"
                                  value={variant.name}
                                  onChange={(e) => updateVariant(index, { ...variant, name: e.target.value })}
                                  className={inputClasses}
                                />
                              </div>
                              <div className="w-28">
                                <InputLabel>المخزون</InputLabel>
                                <input
                                  type="number"
                                  value={variant.stock}
                                  onChange={(e) => updateVariant(index, { ...variant, stock: parseInt(e.target.value) || 0 })}
                                  className={inputClasses}
                                />
                              </div>
                            </div>

                            <div className="border-t border-white/[0.05] pt-5 flex items-center justify-between">
                              <div className="flex-1">
                                <VariantImageManager
                                  images={variant.images || []}
                                  onImagesChange={(newImages) => {
                                    const newVariants = [...product.variants];
                                    newVariants[index] = { ...variant, images: newImages };
                                    updateField("variants", newVariants);
                                  }}
                                />
                              </div>
                              
                              {product.variants.length > 1 && (
                                <button
                                  onClick={() => removeVariant(index)}
                                  className="text-red-400 hover:text-white text-[13px] font-medium px-4 py-2 bg-red-500/10 hover:bg-red-500 rounded-lg transition-colors"
                                >
                                  إزالة المتغير
                                </button>
                              )}
                            </div>
                          </div>
                        ))}

                        <Button
                          variant="outline"
                          onClick={handleAddVariantClick}
                          disabled={loadingAction === 'addVariant'}
                          className="w-full border-dashed border-white/[0.15] bg-transparent text-white/70 hover:text-white hover:bg-white/[0.05] h-14"
                        >
                          {loadingAction === 'addVariant' ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Plus className="w-4 h-4 mr-2" />
                          )}
                          إضافة متغير جديد
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Step 5: Additional Details */}
                  {activeStepId === 'additional' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      {/* Custom Badges */}
                      <div className="bg-white/[0.03] border border-white/[0.08] p-6 rounded-xl">
                        <InputLabel>الشارات الخاصة (عند نفاذ المخزون)</InputLabel>
                        <div className="flex gap-8 mb-5">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={product.showOutOfStockBadge || false}
                              onChange={(e) => updateField("showOutOfStockBadge", e.target.checked)}
                              className="h-4 w-4 rounded accent-stone-700"
                            />
                            <span className="text-[13px] text-white/90">نفذت الكمية</span>
                          </label>
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={product.showPreorderBadge || false}
                              onChange={(e) => updateField("showPreorderBadge", e.target.checked)}
                              className="h-4 w-4 rounded accent-stone-700"
                            />
                            <span className="text-[13px] text-white/90">طلب مسبق</span>
                          </label>
                        </div>
                        <input
                          type="text"
                          value={product.customOutOfStockMessage || ''}
                          onChange={(e) => updateField("customOutOfStockMessage", e.target.value)}
                          className={inputClasses}
                          placeholder="رسالة مخصصة (تتجاوز الشارات القياسية)"
                        />
                      </div>

                      <div>
                        <InputLabel>وصف تفصيلي كامل</InputLabel>
                        <textarea
                          value={product.detailedDescription || ''}
                          onChange={(e) => updateField("detailedDescription", e.target.value)}
                          className={inputClasses}
                          rows={4}
                          placeholder="اكتب وصفاً مفصلاً يظهر في أسفل صفحة المنتج..."
                        />
                      </div>

                      <div>
                        <InputLabel>المواصفات التقنية</InputLabel>
                        <textarea
                          value={product.specifications || ''}
                          onChange={(e) => updateField("specifications", e.target.value)}
                          className={inputClasses}
                          rows={3}
                          placeholder="المقاسات الدقيقة، الخامات، تعليمات العناية..."
                        />
                      </div>

                      <div>
                        <InputLabel>معلومات الشحن</InputLabel>
                        <textarea
                          value={product.shippingInfo || ''}
                          onChange={(e) => updateField("shippingInfo", e.target.value)}
                          className={inputClasses}
                          rows={2}
                          placeholder="معلومات عن التوصيل، المدة، والإرجاع..."
                        />
                      </div>

                      {/* FAQs */}
                      <div>
                        <InputLabel>الأسئلة الشائعة</InputLabel>
                        <div className="space-y-4 pt-2">
                          {product.faqs.map((faq, index) => (
                            <div key={faq.id} className="p-5 bg-white/[0.03] border border-white/[0.08] rounded-xl relative">
                              {product.faqs.length > 1 && (
                                <button onClick={() => removeFaq(index)} className="absolute top-4 left-4 text-white/40 hover:text-red-400 transition-colors">×</button>
                              )}
                              <input
                                type="text"
                                value={faq.question}
                                onChange={(e) => updateFaq(index, { ...faq, question: e.target.value })}
                                className="w-full mb-3 p-3 bg-black/30 border border-white/[0.08] rounded-lg text-white text-[13px] focus:border-white/30 focus:outline-none transition-colors"
                                placeholder="السؤال..."
                              />
                              <textarea
                                value={faq.answer}
                                onChange={(e) => updateFaq(index, { ...faq, answer: e.target.value })}
                                className="w-full p-3 bg-black/30 border border-white/[0.08] rounded-lg text-white text-[13px] focus:border-white/30 focus:outline-none transition-colors"
                                rows={2}
                                placeholder="الإجابة..."
                              />
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            onClick={handleAddFaqClick}
                            disabled={loadingAction === 'addFaq'}
                            className="w-full border-dashed border-white/[0.15] bg-transparent text-white/70 hover:text-white hover:bg-white/[0.05] h-12"
                          >
                            {loadingAction === 'addFaq' ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Plus className="w-4 h-4 mr-2" />
                            )}
                            إضافة سؤال جديد
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Phase 2: category, slugs, Arabic copy ───────────────── */}
                  {activeStepId === 'seo' && (
                    <div className="space-y-8">

                      <div>
                        <InputLabel>التصنيف (مطلوب)</InputLabel>
                        <select
                          value={product.category || ''}
                          // The blank option means "not chosen yet", which is
                          // `undefined` in the model — not an empty category.
                          onChange={(e) => updateField('category', (e.target.value || undefined) as CategoryKey | undefined)}
                          className={inputClasses}
                        >
                          <option value="">— اختر التصنيف —</option>
                          {CATEGORY_KEYS.map((key) => (
                            <option key={key} value={key}>
                              {CATEGORIES[key].ar} — {CATEGORIES[key].en}
                            </option>
                          ))}
                        </select>
                        <p className="mt-2 text-[12px] text-white/40">
                          يحدد صفحة التصنيف التي يظهر فيها المنتج.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <InputLabel>الرابط بالإنجليزية (slug)</InputLabel>
                          <input
                            type="text"
                            value={product.slug || ''}
                            onChange={(e) => updateField('slug', e.target.value)}
                            className={inputClasses}
                            dir="ltr"
                            placeholder={slugifyEn(product.name) || 'floor-parallettes'}
                          />
                          <p className="mt-2 text-[12px] text-white/40">
                            اتركه فارغاً ليُولَّد من الاسم.
                          </p>
                        </div>

                        <div>
                          <InputLabel>الرابط بالعربية</InputLabel>
                          <input
                            type="text"
                            value={product.slugAr || ''}
                            onChange={(e) => updateField('slugAr', e.target.value)}
                            className={inputClasses}
                            placeholder={slugifyAr(product.nameAr || '') || 'بارليتس-أرضي'}
                          />
                          <p className="mt-2 text-[12px] text-white/40">
                            اتركه فارغاً ليُولَّد من الاسم العربي.
                          </p>
                        </div>
                      </div>

                      <div>
                        <InputLabel>اسم المنتج بالعربية</InputLabel>
                        <input
                          type="text"
                          value={product.nameAr || ''}
                          onChange={(e) => updateField('nameAr', e.target.value)}
                          className={inputClasses}
                          placeholder="بارليتس أرضي"
                        />
                      </div>

                      <div>
                        <InputLabel>الوصف بالعربية</InputLabel>
                        <textarea
                          value={product.descriptionAr || ''}
                          onChange={(e) => updateField('descriptionAr', e.target.value)}
                          className={inputClasses}
                          rows={3}
                          placeholder="وصف قصير يظهر في صفحة المنتج العربية..."
                        />
                      </div>

                      <div>
                        <InputLabel>وصف تفصيلي بالعربية</InputLabel>
                        <textarea
                          value={product.detailedDescriptionAr || ''}
                          onChange={(e) => updateField('detailedDescriptionAr', e.target.value)}
                          className={inputClasses}
                          rows={4}
                        />
                      </div>

                      <div>
                        <InputLabel>المواصفات التقنية بالعربية</InputLabel>
                        <textarea
                          value={product.specificationsAr || ''}
                          onChange={(e) => updateField('specificationsAr', e.target.value)}
                          className={inputClasses}
                          rows={3}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <InputLabel>عنوان جوجل — إنجليزي (٧٠ حرف)</InputLabel>
                          <input
                            type="text"
                            value={product.seoTitle || ''}
                            onChange={(e) => updateField('seoTitle', e.target.value)}
                            className={inputClasses}
                            dir="ltr"
                            maxLength={70}
                          />
                        </div>
                        <div>
                          <InputLabel>عنوان جوجل — عربي (٧٠ حرف)</InputLabel>
                          <input
                            type="text"
                            value={product.seoTitleAr || ''}
                            onChange={(e) => updateField('seoTitleAr', e.target.value)}
                            className={inputClasses}
                            maxLength={70}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <InputLabel>وصف جوجل — إنجليزي (١٦٠ حرف)</InputLabel>
                          <textarea
                            value={product.seoDescription || ''}
                            onChange={(e) => updateField('seoDescription', e.target.value)}
                            className={inputClasses}
                            dir="ltr"
                            rows={2}
                            maxLength={160}
                          />
                        </div>
                        <div>
                          <InputLabel>وصف جوجل — عربي (١٦٠ حرف)</InputLabel>
                          <textarea
                            value={product.seoDescriptionAr || ''}
                            onChange={(e) => updateField('seoDescriptionAr', e.target.value)}
                            className={inputClasses}
                            rows={2}
                            maxLength={160}
                          />
                        </div>
                      </div>

                      <p className="text-[12px] text-white/40">
                        اتركه فارغاً ليستخدم الموقع النص المُولَّد تلقائياً.
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer Navigation within Wizard */}
                <div className="mt-12 pt-6 border-t border-white/[0.08] flex items-center justify-between">
                  <Button
                    onClick={handlePrev}
                    disabled={currentStepIndex === 0 || loadingAction === 'prev'}
                    className={`bg-white/[0.05] text-white hover:bg-white/[0.1] px-6 h-11 rounded-lg ${currentStepIndex === 0 ? 'opacity-0 pointer-events-none' : ''}`}
                  >
                    {loadingAction === 'prev' ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <ArrowRight className="w-4 h-4 ml-2" />}
                    السابق
                  </Button>
                  
                  <Button
                    onClick={handleNext}
                    disabled={savingProduct || loadingAction === 'next'}
                    className="bg-white text-black hover:bg-white/90 px-8 h-11 rounded-lg font-bold"
                  >
                    {savingProduct || loadingAction === 'next' ? (
                      <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    ) : isLastStep ? (
                      <Check className="w-4 h-4 ml-2" />
                    ) : (
                      <ChevronLeft className="w-4 h-4 ml-2" />
                    )}
                    {isLastStep ? 'تأكيد ونشر' : 'التالي'}
                  </Button>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </ProtectedAdminRoute>
  );
}
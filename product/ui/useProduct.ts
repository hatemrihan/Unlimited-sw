import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { calculateFinalPrice } from '@/utils/pricing';
import { toast } from 'sonner';
import type { CategoryKey } from '@/product/categories';

export interface Product {
  _id?: string;
  name: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  mainImage: string;
  images: string[];
  videos?: string[];
  description: string;
  promoCode?: string;
  variants: Array<{
    id?: string;
    name: string;
    stock: number;
    price?: number;
    images?: string[];
    videos?: string[];
  }>;
  stock: number;
  isActive: boolean;
  order: number;
  detailedDescription?: string;
  specifications?: string;
  shippingInfo?: string;
  faqs: Array<{
    id?: string;
    question: string;
    answer: string;
  }>;
  showOutOfStockBadge?: boolean;
  showPreorderBadge?: boolean;
  customOutOfStockMessage?: string;

  // ─── Phase 2: bilingual content, slugs, category ───────────────────────────
  // Slugs are generated from the names when left blank, but stay editable: once
  // a URL is public, only a person can decide whether changing it is worth the
  // redirect.
  slug?: string;
  slugAr?: string;
  nameAr?: string;
  descriptionAr?: string;
  detailedDescriptionAr?: string;
  specificationsAr?: string;
  faqsAr?: Array<{
    id?: string;
    question: string;
    answer: string;
  }>;
  category?: CategoryKey;
  seoTitle?: string;
  seoTitleAr?: string;
  seoDescription?: string;
  seoDescriptionAr?: string;
}

export type ProductVariant = Product['variants'][number];
export type ProductFaq = Product['faqs'][number];

export const useProduct = (productId: string) => {
  const router = useRouter();
  
  const [product, setProduct] = useState<Product>({
    name: '',
    price: 0,
    originalPrice: 0,
    discount: 0,
    mainImage: '',
    images: [],
    videos: [],
    description: '',
    promoCode: '',
    variants: [],
    stock: 0,
    isActive: true,
    order: 0,
    detailedDescription: '',
    specifications: '',
    shippingInfo: '',
    faqs: [],
    showOutOfStockBadge: false,
    showPreorderBadge: false,
    customOutOfStockMessage: ''
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [savingProduct, setSavingProduct] = useState<boolean>(false);

  // Stock as it was when this page loaded, per variant name. Used as the
  // optimistic-lock precondition so saving the form cannot silently erase an
  // order that decremented stock while the admin was editing.
  const loadedStockRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const controller = new AbortController();

    const fetchProduct = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/admin/products/${productId}`, {
          signal: controller.signal
        });

        if (response.ok) {
          const data = await response.json();
          const fetchedProduct = data.product;
          
          fetchedProduct.variants = fetchedProduct.variants?.map((v: ProductVariant & { _id?: string }) => ({
             ...v, id: v._id || v.id || crypto.randomUUID() 
          })) || [];
          
          fetchedProduct.faqs = fetchedProduct.faqs?.map((f: ProductFaq & { _id?: string }) => ({
             ...f, id: f._id || f.id || crypto.randomUUID() 
          })) || [];
          
          loadedStockRef.current = new Map(
            fetchedProduct.variants.map((v: ProductVariant) => [v.name, Number(v.stock) || 0])
          );

          setProduct(fetchedProduct);
        } else {
          toast.error('فشل تحميل بيانات المنتج');
          router.push('/admin#products');
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
        toast.error('خطأ في تحميل بيانات المنتج');
        router.push('/admin#products');
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchProduct();
    }

    return () => controller.abort();
  }, [productId]);

  /**
   * Applies stock edits one variant at a time through the optimistically-locked
   * stock endpoint, using the values this page loaded as the precondition.
   * Returns an error message if any change was rejected, null on success.
   */
  const saveStockChanges = async (): Promise<string | null> => {
    const changed = product.variants.filter(v => {
      const loaded = loadedStockRef.current.get(v.name);
      const next = Number(v.stock) || 0;
      // A variant the page never loaded is new: the PUT just created it at 0,
      // so any stock the admin typed still has to be applied.
      return loaded === undefined ? next !== 0 : loaded !== next;
    });

    for (const variant of changed) {
      const loaded = loadedStockRef.current.get(variant.name);
      const next = Number(variant.stock) || 0;

      const response = await fetch(`/api/admin/products/${productId}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          loaded === undefined
            ? { variantName: variant.name, delta: next }
            : { variantName: variant.name, expected: loaded, next }
        ),
      });

      if (response.status === 409) {
        return `المخزون الخاص بـ "${variant.name}" اتغير أثناء التعديل (طلب جديد على الأرجح). حدّث الصفحة وحاول تاني.`;
      }

      if (!response.ok) {
        return `فشل تحديث مخزون "${variant.name}".`;
      }

      // Keep the baseline current so a retry does not re-send a stale precondition.
      loadedStockRef.current.set(variant.name, Number(variant.stock) || 0);
    }

    return null;
  };

  const updateProduct = async () => {
    if (!product.name || !product.mainImage || !product.description) {
      toast.error('يرجى ملء جميع الحقول المطلوبة (الاسم، الصورة الرئيسية، الوصف)');
      return;
    }

    if (!product.variants || product.variants.length === 0) {
      toast.error('يرجى إضافة متغير واحد على الأقل');
      return;
    }

    if ((product.discount || 0) > 100 || (product.discount || 0) < 0) {
      toast.error('الخصم يجب أن يكون بين 0 و 100');
      return;
    }

    if ((product.originalPrice || 0) <= 0) {
      toast.error('يرجى إدخال سعر أصلي صحيح');
      return;
    }

    // Duplicate names corrupt inventory: `variants.$` always targets the first
    // match, so one of the two never moves.
    const variantNames = product.variants.map(v => v.name.trim().toLowerCase());
    if (new Set(variantNames).size !== variantNames.length) {
      toast.error('أسماء المتغيرات لازم تكون مختلفة عن بعضها');
      return;
    }

    const hasEmptyVariantName = product.variants.some(v => !v.name.trim());
    if (hasEmptyVariantName) {
      toast.error('جميع المتغيرات يجب أن تحتوي على اسم');
      return;
    }

    setSavingProduct(true);
    const savingToastId = toast.loading('جاري حفظ التعديلات...');
    try {

      const finalPrice = calculateFinalPrice(product.originalPrice || 0, product.discount);
      // Stock is deliberately NOT part of this payload — the server ignores it
      // and it goes through the optimistically-locked stock endpoint below.
      const payload = { ...product, price: finalPrice };

      const response = await fetch(`/api/admin/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const stockError = await saveStockChanges();
        if (stockError) {
          toast.error(stockError, { id: savingToastId, duration: 8000 });
          return;
        }
        toast.success('تم تحديث المنتج بنجاح!', { id: savingToastId });
        router.push('/admin#products');
      } else {
        const errorData = await response.json();
        toast.error('فشل تحديث المنتج: ' + (errorData.error || 'خطأ غير معروف'), { id: savingToastId });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'خطأ غير معروف';
      toast.error('خطأ في تحديث المنتج: ' + message, { id: savingToastId });
    } finally {
      setSavingProduct(false);
    }
  };

  const updateField = <K extends keyof Product>(key: K, value: Product[K]) => {
    setProduct(prev => ({ ...prev, [key]: value }));
  };

  const updateVariant = (index: number, variant: ProductVariant) => {
    setProduct(prev => {
      const newVariants = [...prev.variants];
      newVariants[index] = variant;
      return { ...prev, variants: newVariants };
    });
  };

  // Dedicated updater for variant images that avoids stale closure issues.
  // Unlike updateVariant which receives a pre-built variant object (potentially stale),
  // this reads prev.variants[index] inside the functional updater.
  const updateVariantImages = (index: number, images: string[]) => {
    setProduct(prev => {
      const newVariants = [...prev.variants];
      newVariants[index] = { ...prev.variants[index], images };
      return { ...prev, variants: newVariants };
    });
  };

  const addVariant = () => {
    setProduct(prev => ({
      ...prev,
      variants: [...prev.variants, { id: crypto.randomUUID(), name: '', stock: 0, price: 0, images: [], videos: [] }]
    }));
  };

  const removeVariant = (index: number) => {
    setProduct(prev => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index)
    }));
  };

  const updateFaq = (index: number, faq: ProductFaq) => {
    setProduct(prev => {
      const newFaqs = [...prev.faqs];
      newFaqs[index] = faq;
      return { ...prev, faqs: newFaqs };
    });
  };

  const addFaq = () => {
    setProduct(prev => ({
      ...prev,
      faqs: [...prev.faqs, { id: crypto.randomUUID(), question: '', answer: '' }]
    }));
  };

  const removeFaq = (index: number) => {
    setProduct(prev => ({
      ...prev,
      faqs: prev.faqs.filter((_, i) => i !== index)
    }));
  };

  // ─── Image ordering helpers ───────────────────────────────────────────

  const moveImage = (fromIndex: number, toIndex: number) => {
    setProduct(prev => {
      const newImages = [...prev.images];
      const [moved] = newImages.splice(fromIndex, 1);
      newImages.splice(toIndex, 0, moved);
      return { ...prev, images: newImages };
    });
  };

  const replaceImage = (index: number, newUrl: string) => {
    setProduct(prev => {
      const newImages = [...prev.images];
      newImages[index] = newUrl;
      return { ...prev, images: newImages };
    });
  };

  const swapMainImage = (imageIndex: number) => {
    setProduct(prev => {
      const oldMain = prev.mainImage;
      const newMain = prev.images[imageIndex];
      const newImages = [...prev.images];
      if (oldMain) {
        newImages[imageIndex] = oldMain;
      } else {
        newImages.splice(imageIndex, 1);
      }
      return { ...prev, mainImage: newMain, images: newImages };
    });
  };

  return { 
    product, 
    loading, 
    savingProduct, 
    updateProduct,
    updateField,
    updateVariant,
    updateVariantImages,
    addVariant,
    removeVariant,
    updateFaq,
    addFaq,
    removeFaq,
    moveImage,
    replaceImage,
    swapMainImage
  };
};

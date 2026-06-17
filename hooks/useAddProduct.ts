import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { calculateFinalPrice } from '@/utils/pricing';
import { toast } from 'sonner';
import { Product } from '@/hooks/useProduct';

export type ProductVariant = Product['variants'][number];
export type ProductFaq = Product['faqs'][number];

export const useAddProduct = () => {
  const router = useRouter();
  const [savingProduct, setSavingProduct] = useState(false);
  
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
    variants: [{ id: crypto.randomUUID(), name: '', stock: 0, price: 0, images: [], videos: [] }],
    stock: 0,
    isActive: true,
    order: 0,
    detailedDescription: '',
    specifications: '',
    shippingInfo: '',
    faqs: [{ id: crypto.randomUUID(), question: '', answer: '' }],
    showOutOfStockBadge: false,
    showPreorderBadge: false,
    customOutOfStockMessage: ''
  });

  const addProduct = async () => {
    if (!product.name || !product.mainImage || !product.description) {
      toast.error('Please fill in all required fields (Name, Main Image, Description)');
      return;
    }
    if (!product.variants || product.variants.length === 0) {
      toast.error('Please add at least one equipment variant');
      return;
    }
    if ((product.originalPrice || 0) <= 0) {
      toast.error('Please enter a valid original price');
      return;
    }
    if ((product.discount || 0) > 100 || (product.discount || 0) < 0) {
      toast.error('Discount must be between 0 and 100');
      return;
    }
    const hasEmptyVariantName = product.variants.some(v => !v.name.trim());
    if (hasEmptyVariantName) {
      toast.error('All variants must have a name');
      return;
    }

    setSavingProduct(true);
    try {
      const finalPrice = calculateFinalPrice(product.originalPrice || 0, product.discount);
      const totalStock = product.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
      const payload = { ...product, price: finalPrice, stock: totalStock };

      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success('Product added successfully!');
        router.push('/admin#products');
      } else {
        const error = await response.json();
        toast.error('Failed to add product: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Failed to add product: ' + message);
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
    savingProduct,
    addProduct,
    updateField,
    updateVariant,
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

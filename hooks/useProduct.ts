import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { calculateFinalPrice } from '@/utils/pricing';
import { toast } from 'sonner';

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
          
          setProduct(fetchedProduct);
        } else {
          toast.error('Failed to load product data');
          router.push('/admin#products');
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
        toast.error('Error loading product data');
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

  const updateProduct = async () => {
    if (!product.name || !product.mainImage || !product.description) {
      toast.error('Please fill in all required fields (Name, Main Image, Description)');
      return;
    }

    if (!product.variants || product.variants.length === 0) {
      toast.error('Please add at least one equipment variant');
      return;
    }

    if ((product.discount || 0) > 100 || (product.discount || 0) < 0) {
      toast.error('Discount must be between 0 and 100');
      return;
    }

    if ((product.originalPrice || 0) <= 0) {
      toast.error('Please enter a valid original price');
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

      const response = await fetch(`/api/admin/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success('Product updated successfully!');
        router.push('/admin#products');
      } else {
        const errorData = await response.json();
        toast.error('Failed to update product: ' + (errorData.error || 'Unknown error'));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Error updating product: ' + message);
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
    loading, 
    savingProduct, 
    updateProduct,
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

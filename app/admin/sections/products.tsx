"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Product } from '@/product/model';
import { toast } from 'sonner';
import { fetchWithRetry } from '@/utils/fetchWithRetry';
import { z } from 'zod';
import { Loader2, RefreshCw, Plus, Edit2, Trash2, Truck, ArrowRight, Save, ShieldCheck, AlertCircle } from 'lucide-react';

const ProductsResponseSchema = z.object({
  products: z.array(z.record(z.string(), z.unknown())).default([]),
  pagination: z.object({
    page: z.number().default(1),
    pages: z.number().default(1),
    total: z.number().default(0),
  }).optional()
}).passthrough();

export interface CityPricing {
  governorate: string;
  isActive: boolean;
  shippingCost: number;
  codFee: number;
}

export interface ProductCityPricingData {
  productName: string;
  basePrice: number;
  cityPricing: CityPricing[];
}

type ActionState = 'idle' | 'edit' | 'delete' | 'city';

// --- Stock calculation ---
const getStockDisplay = (product: Product) => {
  const variantStock =
    product.variants.length > 0
      ? product.variants.reduce((sum, v) => sum + (v.stock ?? 0), 0)
      : product.stock ?? 0;

  if (variantStock > 0) {
    return (
      <span className="bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded text-[10px] font-medium">
        متوفر
      </span>
    );
  }
  if (product.showPreorderBadge) {
    return (
      <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded text-[10px] font-medium">
        طلب مسبق
      </span>
    );
  }
  if (product.showOutOfStockBadge) {
    return (
      <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded text-[10px] font-medium">
        نفذت الكمية
      </span>
    );
  }
  return (
    <span className="bg-white/[0.06] text-white/40 border border-white/[0.04] px-2 py-0.5 rounded text-[10px] font-medium">
      غير متوفر
    </span>
  );
};

// --- ProductCard ---
const ProductCard = React.memo(({
  product,
  loading,
  onEdit,
  onDelete,
  onCityPrices
}: {
  product: Product;
  loading: ActionState;
  onEdit: (p: Product) => void;
  onDelete: (p: Product) => void;
  onCityPrices: (p: Product) => void;
}) => {
  return (
    <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-2.5 transition-all hover:bg-white/[0.04]">
      <div className="flex flex-col gap-2">
        {/* Product Image */}
        <div className="w-full flex-shrink-0 relative rounded-md overflow-hidden bg-white/[0.02]" style={{ aspectRatio: '1080 / 1350' }}>
          <img
            src={product.mainImage}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={(e) => { e.currentTarget.src = '/images/placeholder.png'; }}
          />
          {product.discount && product.discount > 0 ? (
            <div className="absolute top-2 right-2 bg-red-500 text-white px-1.5 py-0.5 rounded text-[10px] font-bold shadow-md">
              خصم {product.discount}%
            </div>
          ) : null}
        </div>

        {/* Product Details */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div className="space-y-1 mb-2">
            <h3 className="text-[12px] font-medium text-white line-clamp-2 leading-tight" title={product.name}>
              {product.name}
            </h3>
            
            <div className="flex items-center justify-between pt-1">
              <span className="text-white font-semibold text-[13px]">
                {product.price.toLocaleString()} ج.م
              </span>
              {getStockDisplay(product)}
            </div>

            {/* Variant stock details */}
            {product.variants.length > 0 && (
              <div className="space-y-0.5 pt-1">
                {product.variants.map((variant) => (
                  <div key={variant.name} className="flex justify-between text-[10px] text-white/40">
                    <span>{variant.name}</span>
                    <span>{variant.stock ?? 0}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-1.5 mt-auto">
            <div className="flex gap-1.5">
              <button
                onClick={() => onEdit(product)}
                disabled={loading !== 'idle'}
                className="flex-1 flex items-center justify-center gap-1 h-7 bg-white/[0.04] hover:bg-blue-500/10 text-blue-400 border border-white/[0.04] hover:border-blue-500/20 rounded text-[11px] font-medium transition-colors disabled:opacity-50"
              >
                {loading === 'edit' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Edit2 className="w-3 h-3" />}
                تعديل
              </button>
              <button
                onClick={() => onDelete(product)}
                disabled={loading !== 'idle'}
                className="flex-1 flex items-center justify-center gap-1 h-7 bg-white/[0.04] hover:bg-red-500/10 text-red-400 border border-white/[0.04] hover:border-red-500/20 rounded text-[11px] font-medium transition-colors disabled:opacity-50"
              >
                {loading === 'delete' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                حذف
              </button>
            </div>
            <button
              onClick={() => onCityPrices(product)}
              disabled={loading !== 'idle'}
              className="w-full flex items-center justify-center gap-1 h-7 bg-white/[0.04] hover:bg-green-500/10 text-green-400 border border-white/[0.04] hover:border-green-500/20 rounded text-[11px] font-medium transition-colors disabled:opacity-50"
            >
              {loading === 'city' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Truck className="w-3 h-3" />}
              إعدادات الشحن
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.product._id === nextProps.product._id && 
         prevProps.product.price === nextProps.product.price &&
         prevProps.product.stock === nextProps.product.stock &&
         prevProps.product.name === nextProps.product.name &&
         prevProps.product.discount === nextProps.product.discount &&
         prevProps.loading === nextProps.loading;
});

ProductCard.displayName = "ProductCard";

// --- City Pricing Panel ---
const CityPricingPanel = ({ productId, onBack }: { productId: string, onBack: () => void }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<ProductCityPricingData | null>(null);
  const [cityPricing, setCityPricing] = useState<CityPricing[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    try {
      setError(null);
      const response = await fetchWithRetry(
        `/api/admin/products/${productId}/city-pricing`,
        { signal }
      );
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      const result = await response.json();
      
      if (result.success) {
        setData(result);
        setCityPricing(result.cityPricing);
      } else {
        setError('خطأ: ' + result.error);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      console.error('Error fetching city pricing:', err);
      setError('فشل في جلب بيانات أسعار الشحن');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    if (!productId) return;
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [productId, fetchData]);

  const handleSave = async () => {
    setSaving(true);
    
    try {
      const response = await fetchWithRetry(`/api/admin/products/${productId}/city-pricing`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cityPricing }),
      });
      
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        toast.success('تم تحديث أسعار الشحن بنجاح!');
        await fetchData();
      } else {
        toast.error(result.error || 'فشل في حفظ أسعار الشحن');
      }
    } catch (err) {
      console.error('Error saving city pricing:', err);
      toast.error('فشل في حفظ أسعار الشحن');
    } finally {
      setSaving(false);
    }
  };

  const updateGov = useCallback((governorate: string, field: keyof CityPricing, value: number | boolean) => {
    setCityPricing(prev =>
      prev.map(x => x.governorate === governorate ? { ...x, [field]: value } : x)
    );
  }, []);

  const govs = [...cityPricing].sort((a, b) => a.governorate.localeCompare(b.governorate));

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] border border-white/[0.04] rounded-lg bg-white/[0.01]">
         <Loader2 className="w-6 h-6 animate-spin text-white/20 mb-3" />
         <span className="text-[12px] text-white/40">جاري تحميل إعدادات الشحن...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] border border-white/[0.04] rounded-lg bg-white/[0.01] p-12 text-center">
         <p className="text-[13px] text-white/40 mb-4">لم يتم العثور على بيانات المنتج.</p>
         <button onClick={onBack} className="text-[12px] font-medium text-blue-400 hover:text-blue-300 transition-colors">
            العودة للمنتجات
         </button>
      </div>
    );
  }

  return (
    <div className="bg-white/[0.02] rounded-xl border border-white/[0.04] overflow-hidden flex flex-col w-full" dir="rtl">
        {/* Header */}
        <div className="p-5 md:p-6 border-b border-white/[0.04] bg-[#1c1917]">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-6 flex justify-between items-center text-[12px] font-medium">
                <span>{error}</span>
                <button onClick={() => setError(null)} className="hover:text-red-300 transition-colors">✕</button>
              </div>
            )}
            
            <div className="flex items-center gap-3 mb-5">
                 <button onClick={onBack} className="text-white/40 hover:text-white transition-colors flex items-center gap-1.5 text-[11px] font-medium">
                    <ArrowRight className="w-3.5 h-3.5" />
                    العودة للمنتجات
                 </button>
            </div>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-500/10 text-amber-400">
                            <Truck className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400">
                            إعدادات الشحن والتوصيل
                        </span>
                    </div>
                    <h1 className="text-xl font-semibold mb-1.5 text-white">{data.productName}</h1>
                    <div className="flex items-center gap-3 text-[11px] font-mono text-white/40">
                         <span>سعر المنتج: <span className="text-green-400">{data.basePrice} ج.م</span></span>
                         <span className="w-1 h-1 rounded-full bg-white/20"></span>
                         <span>إجمالي المحافظات: <span className="text-white">{govs.length}</span></span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={() => { setLoading(true); fetchData(); }} disabled={loading} className="h-8 px-3 rounded bg-white/[0.06] text-[11px] font-medium text-white border border-white/[0.08] hover:bg-white/[0.1] transition-colors flex items-center gap-1.5">
                        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                        تحديث
                    </button>
                    <button onClick={handleSave} disabled={saving} className="h-8 px-4 rounded text-[11px] font-medium bg-white text-black hover:bg-white/90 transition-colors flex items-center gap-1.5">
                        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                        حفظ التغييرات
                    </button>
                </div>
            </div>
        </div>

        {/* Content */}
        <div className="p-5 md:p-6 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 bg-[#1c1917]/50">
            <main>
                <div className="mb-4">
                     <h2 className="text-[13px] font-semibold text-white mb-1.5">مصفوفة الشحن للمحافظات</h2>
                     <p className="text-[11px] text-white/40 leading-relaxed max-w-2xl">
                         قم بضبط تكلفة الشحن ورسوم الدفع عند الاستلام (COD) لكل محافظة. يتم تعيين سعر المنتج الأساسي في شاشة تعديل المنتج. إذا تم ضبط حالة المحافظة على <span className="text-white">غير نشط</span>، لن يتمكن العملاء من اختيارها.
                     </p>
                </div>

                <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg overflow-hidden">
                    {/* Table Header */}
                    <div className="hidden md:grid gap-2.5 py-2.5 border-b border-white/[0.04] px-4 bg-white/[0.02]" style={{ gridTemplateColumns: 'minmax(140px, 1.5fr) 1fr 1fr 1fr 100px' }}>
                        {['المحافظة', 'الشحن', 'رسوم الاستلام (COD)', 'الإجمالي', 'الحالة'].map(h => (
                            <span key={h} className="text-[10px] text-white/40 font-medium">{h}</span>
                        ))}
                    </div>
                    
                    {/* Table Body */}
                    <div className="flex flex-col divide-y divide-white/[0.04]">
                        {govs.map(gov => (
                            <div key={gov.governorate} className="grid grid-cols-2 md:grid-cols-none gap-y-3 gap-x-2 md:gap-x-2.5 py-3 px-4 items-center hover:bg-white/[0.04] transition-colors" style={{ gridTemplateColumns: 'minmax(140px, 1.5fr) 1fr 1fr 1fr 100px' }}>
                                <div className="col-span-2 md:col-span-1 flex items-center">
                                    <span className="text-[12px] font-medium text-white">{gov.governorate}</span>
                                </div>
                                
                                <div className="flex flex-col gap-1">
                                    <span className="md:hidden text-[10px] text-white/40 font-medium">الشحن</span>
                                    <input 
                                      type="number" 
                                      value={gov.shippingCost} 
                                      min="0" 
                                      onChange={(e) => updateGov(gov.governorate, 'shippingCost', Number(e.target.value) || 0)} 
                                      className="w-full bg-white/[0.02] border border-white/[0.08] text-white text-[12px] h-8 px-2 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all" 
                                    />
                                </div>
                                
                                <div className="flex flex-col gap-1">
                                    <span className="md:hidden text-[10px] text-white/40 font-medium">رسوم COD</span>
                                    <input 
                                      type="number" 
                                      value={gov.codFee} 
                                      min="0" 
                                      onChange={(e) => updateGov(gov.governorate, 'codFee', Number(e.target.value) || 0)} 
                                      className="w-full bg-white/[0.02] border border-white/[0.08] text-white text-[12px] h-8 px-2 rounded focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 focus:outline-none transition-all" 
                                    />
                                </div>
                                
                                <div className="flex flex-col gap-1 md:items-start">
                                    <span className="md:hidden text-[10px] text-white/40 font-medium">الإجمالي</span>
                                    <span className="text-[12px] font-semibold text-purple-400 font-mono">
                                        {(gov.shippingCost + gov.codFee).toLocaleString()} ج.م
                                    </span>
                                </div>
                                
                                <div className="col-span-2 md:col-span-1 flex justify-end md:justify-start mt-1 md:mt-0">
                                    <button 
                                        onClick={() => updateGov(gov.governorate, 'isActive', !gov.isActive)}
                                        className={`w-full md:w-auto h-7 px-2 rounded flex items-center justify-center text-[10px] font-medium transition-all border ${
                                            gov.isActive 
                                              ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20' 
                                              : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                                        }`}
                                    >
                                        {gov.isActive ? 'نشط' : 'غير نشط'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            <aside className="space-y-4">
                 <div>
                     <h3 className="text-[11px] font-medium text-white/40 mb-2">ملخص المؤشرات</h3>
                     <div className="flex flex-col gap-2">
                        <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-lg">
                            <div className="text-[10px] text-white/40 font-medium mb-1">المناطق النشطة</div>
                            <div className="text-xl font-semibold text-green-400">
                                {cityPricing.filter(g => g.isActive).length} <span className="text-[12px] font-normal text-white/20">/ {govs.length}</span>
                            </div>
                        </div>

                        <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-lg">
                            <div className="text-[10px] text-white/40 font-medium mb-1">متوسط الشحن</div>
                            <div className="text-xl font-semibold text-blue-400 font-mono">
                                {cityPricing.length > 0 ? Math.round(cityPricing.reduce((sum, g) => sum + g.shippingCost, 0) / cityPricing.length).toLocaleString() : 0}
                                <span className="text-[10px] font-normal text-white/40 ml-1">ج.م</span>
                            </div>
                        </div>

                        <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-lg">
                            <div className="text-[10px] text-white/40 font-medium mb-2">متوسط الرسوم</div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <div className="text-[9px] text-white/30 mb-0.5">الشحن</div>
                                    <div className="text-[12px] font-medium text-white font-mono">
                                        {cityPricing.length > 0 ? Math.round(cityPricing.reduce((sum, g) => sum + g.shippingCost, 0) / cityPricing.length).toLocaleString() : 0}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[9px] text-white/30 mb-0.5">COD</div>
                                    <div className="text-[12px] font-medium text-amber-400 font-mono">
                                        {cityPricing.length > 0 ? Math.round(cityPricing.reduce((sum, g) => sum + g.codFee, 0) / cityPricing.length).toLocaleString() : 0}
                                    </div>
                                </div>
                            </div>
                        </div>
                     </div>
                 </div>

                 <div>
                     <h3 className="text-[11px] font-medium text-white/40 mb-2">قواعد الدفع</h3>
                     <div className="p-3 rounded-lg mb-2 bg-blue-500/5 border border-blue-500/10">
                        <div className="flex gap-2 items-center mb-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                            <span className="text-[11px] font-medium text-white">الدفع الإلكتروني</span>
                        </div>
                        <p className="text-[10px] text-white/60 m-0 mb-1 leading-relaxed">
                            تُسقط بوابة الدفع رسوم الـ COD تلقائياً.
                        </p>
                        <p className="text-[10px] font-mono text-blue-400 m-0">الإجمالي = السعر + الشحن</p>
                     </div>

                     <div className="p-3 rounded-lg mb-2 bg-amber-500/5 border border-amber-500/10">
                        <div className="flex gap-2 items-center mb-1.5">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                            <span className="text-[11px] font-medium text-white">الدفع عند الاستلام</span>
                        </div>
                        <p className="text-[10px] text-white/60 m-0 mb-1 leading-relaxed">
                            يضاف رسوم المخاطرة والتحصيل (COD).
                        </p>
                        <p className="text-[10px] font-mono text-amber-400 m-0">الإجمالي = السعر + الشحن + COD</p>
                     </div>
                 </div>
            </aside>
        </div>
    </div>
  );
};

// --- Main Products View ---
const Products = () => {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingMap, setLoadingMap] = useState<Record<string, ActionState>>({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedCityPricingProduct, setSelectedCityPricingProduct] = useState<string | null>(null);

  const setProductLoading = (id: string, action: ActionState) =>
    setLoadingMap(prev => ({ ...prev, [id]: action }));

  const fetchProducts = useCallback(async (signal?: AbortSignal, pageNum = 1) => {
    setIsRefreshing(true);
    try {
      const response = await fetchWithRetry(`/api/admin/products?page=${pageNum}&limit=20`, { signal });
      if (!response.ok) {
        throw new Error('Failed to load products');
      }
      const rawData = await response.json();
      const data = ProductsResponseSchema.parse(rawData);
      
      setProducts(data.products as unknown as Product[]);
      setTotalPages(data.pagination?.pages || 1);
      setPage(data.pagination?.page || 1);
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        toast.error('فشل في جلب المنتجات');
      }
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchProducts(controller.signal, page);
    return () => controller.abort();
  }, [fetchProducts, page]);

  const handleEdit = (product: Product) => {
    if (!product._id) return;
    setProductLoading(product._id, 'edit');
    router.push(`/admin/edit-product/${product._id}`);
  };

  const handleDelete = (product: Product) => {
    if (!product._id) return;
    setProductLoading(product._id, 'delete');
    router.push(`/admin/delete-product/${product._id}`);
  };

  const handleCityPrices = (product: Product) => {
    if (!product._id) return;
    setProductLoading(product._id, 'city');
    setSelectedCityPricingProduct(product._id);
    setProductLoading(product._id, 'idle');
  };

  if (selectedCityPricingProduct) {
    return (
      <div className="w-full max-w-[1100px]">
        <CityPricingPanel 
          productId={selectedCityPricingProduct} 
          onBack={() => setSelectedCityPricingProduct(null)} 
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1100px] w-full" dir="rtl">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-semibold text-white leading-none">إدارة المنتجات</h2>
          <p className="text-[11px] text-white/25 mt-1.5">إضافة وتعديل المنتجات وأسعار الشحن الخاصة بها</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const controller = new AbortController();
              fetchProducts(controller.signal, page);
            }}
            disabled={isRefreshing}
            className="flex items-center justify-center p-1.5 h-8 w-8 bg-white/[0.06] border border-white/[0.08] rounded text-white/40 hover:text-white hover:bg-white/[0.1] transition-colors disabled:opacity-50"
          >
            {isRefreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          </button>

          <button
            onClick={() => router.push('/admin/add-product')}
            className="flex items-center justify-center h-8 px-4 bg-white text-black hover:bg-white/90 rounded text-[11px] font-medium transition-colors gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            إضافة منتج جديد
          </button>
        </div>
      </div>

      {/* Products Grid */}
      {products.length > 0 ? (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {products.map((product) => {
              const loading = loadingMap[product._id!] ?? 'idle';
              return (
                <ProductCard
                  key={product._id}
                  product={product}
                  loading={loading}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onCityPrices={handleCityPrices}
                />
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-2 text-[12px] pt-2 border-t border-white/[0.04]">
              <div className="text-white/40 font-medium">
                صفحة {page} من {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  disabled={page >= totalPages || isRefreshing}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className="px-3 h-8 rounded bg-white/[0.06] border border-white/[0.08] text-white hover:bg-white/[0.1] disabled:opacity-30 transition-colors"
                >
                  التالي
                </button>
                <button
                  disabled={page <= 1 || isRefreshing}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="px-3 h-8 rounded bg-white/[0.06] border border-white/[0.08] text-white hover:bg-white/[0.1] disabled:opacity-30 transition-colors"
                >
                  السابق
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[40vh] border border-white/[0.04] rounded-lg bg-white/[0.01]">
          {isRefreshing ? (
             <>
               <Loader2 className="w-6 h-6 animate-spin text-white/20 mb-3" />
               <span className="text-[12px] text-white/40">جاري تحميل المنتجات...</span>
             </>
          ) : (
            <>
              <p className="text-[12px] text-white/40 mb-4">لا توجد منتجات متاحة حتى الآن.</p>
              <button
                onClick={() => router.push('/admin/add-product')}
                className="h-8 px-4 bg-white text-black hover:bg-white/90 rounded text-[11px] font-medium transition-colors"
              >
                إضافة أول منتج
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Products;
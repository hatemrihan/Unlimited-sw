'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Product } from '../../../models/product';
import { toast } from 'sonner';
import { fetchWithRetry } from '@/utils/fetchWithRetry';
import { z } from 'zod';

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
  price: number;
  isActive: boolean;
  shippingCost: number;
  codFee: number;
}

export interface ProductCityPricingData {
  productName: string;
  basePrice: number;
  cityPricing: CityPricing[];
}

// ─── Loading Spinner ───────────────────────────────────────────────────────────
const Spinner = ({ size = 'sm' }: { size?: 'sm' | 'xs' }) => (
  <svg
    className={`animate-spin ${size === 'xs' ? 'w-3 h-3' : 'w-4 h-4'}`}
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
);

// ─── Per-product action loading states ────────────────────────────────────────
type ActionState = 'idle' | 'edit' | 'delete' | 'city';

// --- Stock calculation — fully typed, no `as any` ---
const getStockDisplay = (product: Product) => {
  const variantStock =
    product.variants.length > 0
      ? product.variants.reduce((sum, v) => sum + (v.stock ?? 0), 0)
      : product.stock ?? 0;

  if (variantStock > 0) {
    return (
      <div className="bg-green-900 text-green-200 px-2 py-1 rounded-full text-xs font-medium">
        In Stock
      </div>
    );
  }
  if (product.showPreorderBadge) {
    return (
      <div className="bg-blue-900 text-blue-200 px-2 py-1 rounded-full text-xs font-medium">
        Preorder
      </div>
    );
  }
  if (product.showOutOfStockBadge) {
    return (
      <div className="bg-red-900 text-red-200 px-2 py-1 rounded-full text-xs font-medium">
        Out of Stock
      </div>
    );
  }
  return (
    <div className="bg-gray-900 text-gray-300 px-2 py-1 rounded-full text-xs font-medium">
      No Stock
    </div>
  );
};

// --- ProductCard Memoization ---
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
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
      <div className="flex flex-col gap-2">
        {/* Product Image */}
        <div className="w-full flex-shrink-0" style={{ aspectRatio: '1080 / 1350' }}>
          <div className="relative w-full h-full rounded-lg overflow-hidden">
            <img
              src={product.mainImage}
              alt={product.name}
              className="w-full h-full object-cover"
              style={{ aspectRatio: '1080 / 1350' }}
              onError={(e) => { e.currentTarget.src = '/images/placeholder.png'; }}
            />
            {product.discount && product.discount > 0 ? (
              <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">
                {product.discount}% OFF
              </div>
            ) : null}
          </div>
        </div>

        {/* Product Details */}
        <div className="flex-1 min-w-0">
          <div className="space-y-1">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-2">
                {product.name}
              </h3>
              <p className="text-gray-500 text-xs mb-1 line-clamp-2">
                {product.description || 'No description available'}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-900 font-bold text-sm">
                {product.price.toLocaleString()} L.E
              </span>
              <div className="text-xs space-y-1">
                {getStockDisplay(product)}
                {/* Variant stock details */}
                {product.variants.length > 0 && (
                  <div className="space-y-1">
                    {product.variants.map((variant) => (
                      <div key={variant.name} className="text-gray-400 text-xs">
                        {variant.name}: {variant.stock ?? 0}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-1 pt-1">
              <div className="flex gap-1">
                <button
                  onClick={() => onEdit(product)}
                  disabled={loading !== 'idle'}
                  aria-label={`Edit ${product.name}`}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-blue-400 hover:text-blue-300 disabled:opacity-60 text-xs font-medium transition-colors border border-blue-400/20 rounded hover:border-blue-400/40"
                >
                  {loading === 'edit' ? (
                    <Spinner size="xs" />
                  ) : (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M15.655 4.344a2.695 2.695 0 0 0-3.81 0l-.599.599-.009-.009-1.06 1.06.008.01-5.88 5.88a2.75 2.75 0 0 0-.805 1.944v1.922a.75.75 0 0 0 .75.75h1.922a2.75 2.75 0 0 0 1.944-.806l7.54-7.539a2.695 2.695 0 0 0 0-3.81Zm-4.409 2.72-5.88 5.88a1.25 1.25 0 0 0-.366.884v1.172h1.172c.331 0 .65-.132.883-.366l5.88-5.88-1.689-1.69Zm2.75.629.599-.599a1.195 1.195 0 1 0-1.69-1.689l-.598.599 1.69 1.689Z" clipRule="evenodd" />
                    </svg>
                  )}
                  Edit
                </button>
                <button
                  onClick={() => onDelete(product)}
                  disabled={loading !== 'idle'}
                  aria-label={`Delete ${product.name}`}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-red-400 hover:text-red-300 disabled:opacity-60 text-xs font-medium transition-colors border border-red-400/20 rounded hover:border-red-400/40"
                >
                  {loading === 'delete' ? (
                    <Spinner size="xs" />
                  ) : (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M11.5 8.25a.75.75 0 0 1 .75.75v4.25a.75.75 0 0 1-1.5 0v-4.25a.75.75 0 0 1 .75-.75Z" />
                      <path d="M9.25 9a.75.75 0 0 0-1.5 0v4.25a.75.75 0 0 0 1.5 0v-4.25Z" />
                      <path fillRule="evenodd" d="M7.25 5.25a2.75 2.75 0 0 1 5.5 0h3a.75.75 0 0 1 0 1.5h-.75v5.45c0 1.68 0 2.52-.327 3.162a3 3 0 0 1-1.311 1.311c-.642.327-1.482.327-3.162.327h-.4c-1.68 0-2.52 0-3.162-.327a3 3 0 0 1-1.311-1.311c-.327-.642-.327-1.482-.327-3.162v-5.45h-.75a.75.75 0 0 1 0-1.5h3Zm1.5 0a1.25 1.25 0 1 1 2.5 0h-2.5Zm-2.25 1.5h7v5.45c0 .865-.001 1.423-.036 1.848-.033.408-.09.559-.128.633a1.5 1.5 0 0 1-.655.655c-.074.038-.225.095-.633.128-.425.035-.983.036-1.848.036h-.4c-.865 0-1.423-.001-1.848-.036-.408-.033-.559-.09-.633-.128a1.5 1.5 0 0 1-.656-.655c-.037-.074-.094-.225-.127-.633-.035-.425-.036-.983-.036-1.848v-5.45Z" clipRule="evenodd" />
                    </svg>
                  )}
                  Delete
                </button>
              </div>
              <button
                onClick={() => onCityPrices(product)}
                disabled={loading !== 'idle'}
                aria-label={`City prices for ${product.name}`}
                className="w-full flex items-center justify-center gap-1 px-2 py-1 text-green-400 hover:text-green-300 disabled:opacity-60 text-xs font-medium transition-colors border border-green-400/20 rounded hover:border-green-400/40"
              >
                {loading === 'city' ? (
                  <Spinner size="xs" />
                ) : (
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                  </svg>
                )}
                💰 City Prices
              </button>
            </div>
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
        setError('Error: ' + result.error);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      console.error('Error fetching city pricing:', err);
      setError('Failed to fetch city pricing data');
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
        toast.success('City pricing updated successfully!');
        await fetchData();
      } else {
        toast.error(result.error || 'Failed to save city pricing');
      }
    } catch (err) {
      console.error('Error saving city pricing:', err);
      toast.error('Failed to save city pricing');
    } finally {
      setSaving(false);
    }
  };

  const applyBasePriceToAll = () => {
    if (!data) return;
    setCityPricing(prev => prev.map(city => ({
      ...city,
      price: data.basePrice
    })));
  };

  const updateGov = useCallback((governorate: string, field: keyof CityPricing, value: number | boolean) => {
    setCityPricing(prev =>
      prev.map(x => x.governorate === governorate ? { ...x, [field]: value } : x)
    );
  }, []);

  const govs = [...cityPricing].sort((a, b) => a.governorate.localeCompare(b.governorate));

  if (loading) {
    return (
      <div className="bg-white rounded-2xl min-h-[500px] flex items-center justify-center border border-gray-200">
         <Spinner size="sm" />
         <span className="ml-3 text-gray-500 text-sm font-medium tracking-wide">Loading city pricing...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-gray-200">
         <p className="text-gray-500 mb-4 text-sm tracking-wide">Product data not found.</p>
         <button onClick={onBack} className="text-sm font-medium text-blue-600 hover:text-blue-500">Go back</button>
      </div>
    );
  }

  return (
    <div className="bg-white text-gray-900 rounded-2xl shadow-xl border border-gray-200 overflow-hidden flex flex-col">
        <div className="p-6 md:p-8 border-b border-gray-200 bg-gray-50">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6 flex justify-between items-center text-sm font-medium">
                <span>{error}</span>
                <button onClick={() => setError(null)} className="hover:text-red-800 transition-colors">✕</button>
              </div>
            )}
            
            <div className="flex items-center gap-3 mb-6">
                 <button onClick={onBack} className="text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Back to Products
                 </button>
            </div>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-100 text-amber-600">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider text-amber-700 bg-amber-100 border border-amber-200">
                            Pricing Configuration
                        </span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2 text-gray-900">{data.productName}</h1>
                    <div className="flex items-center gap-4 text-xs font-mono text-gray-500">
                         <span>BASE_PRICE: <span className="text-green-600">{data.basePrice} LE</span></span>
                         <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                         <span>TOTAL_GOVS: <span className="text-gray-900">{govs.length}</span></span>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button onClick={applyBasePriceToAll} className="px-4 py-2 rounded-lg text-xs font-medium bg-white text-gray-700 border border-gray-300 hover:text-gray-900 hover:border-gray-400 transition-colors">
                        Apply Base to All
                    </button>
                    <button onClick={() => { setLoading(true); fetchData(); }} disabled={loading} className="px-4 py-2 rounded-lg text-xs font-medium bg-white text-gray-700 border border-gray-300 hover:text-gray-900 hover:border-gray-400 transition-colors flex items-center gap-2">
                        {loading ? <Spinner size="xs" /> : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}
                        Refresh
                    </button>
                    <button onClick={handleSave} disabled={saving} className="px-5 py-2 rounded-lg text-xs font-bold bg-gray-900 text-white hover:bg-gray-800 transition-colors flex items-center gap-2">
                        {saving ? <Spinner size="xs" /> : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                        Save Changes
                    </button>
                </div>
            </div>
        </div>

        <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
            <main>
                <div className="mb-6">
                     <h2 className="text-sm font-bold text-blue-600 mb-2 uppercase tracking-wide">Governorate Pricing Matrix</h2>
                     <p className="text-xs text-gray-500 leading-relaxed m-0 text-justify">
                         Configure individual pricing overrides, shipping costs, and Cash-on-Delivery (COD) fees per region. 
                         Toggling a governorate to <strong className="text-gray-900">Inactive</strong> disables shipping to that region for this product.
                     </p>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <div className="hidden md:grid gap-2.5 py-3 border-b border-gray-200 px-5 bg-gray-50" style={{ gridTemplateColumns: 'minmax(140px, 1.5fr) 1fr 1fr 1fr 1fr 100px' }}>
                        {['GOVERNORATE', 'PRICE (LE)', 'SHIPPING', 'COD FEE', 'TOTAL (COD)', 'STATUS'].map(h => (
                            <span key={h} className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{h}</span>
                        ))}
                    </div>
                    
                    <div className="flex flex-col divide-y divide-gray-100">
                        {govs.map(gov => (
                            <div key={gov.governorate} className="grid grid-cols-2 md:grid-cols-none gap-y-4 gap-x-2 md:gap-x-2.5 py-4 px-5 items-center hover:bg-gray-50 transition-colors" style={{ gridTemplateColumns: 'minmax(140px, 1.5fr) 1fr 1fr 1fr 1fr 100px' }}>
                                <div className="col-span-2 md:col-span-1 flex items-center">
                                    <span className="text-[13px] font-semibold text-gray-900 tracking-wide">{gov.governorate}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="md:hidden text-[10px] text-gray-500 font-bold uppercase">Price</span>
                                    <input type="number" value={gov.price} min="0" onChange={(e) => updateGov(gov.governorate, 'price', Number(e.target.value) || 0)} className="w-full bg-white border border-gray-300 text-green-600 text-sm font-bold px-2.5 py-1.5 rounded-md focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 focus:outline-none transition-all placeholder-gray-400" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="md:hidden text-[10px] text-gray-500 font-bold uppercase">Shipping</span>
                                    <input type="number" value={gov.shippingCost} min="0" onChange={(e) => updateGov(gov.governorate, 'shippingCost', Number(e.target.value) || 0)} className="w-full bg-white border border-gray-300 text-gray-900 text-sm font-medium px-2.5 py-1.5 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="md:hidden text-[10px] text-gray-500 font-bold uppercase">COD Fee</span>
                                    <input type="number" value={gov.codFee} min="0" onChange={(e) => updateGov(gov.governorate, 'codFee', Number(e.target.value) || 0)} className="w-full bg-white border border-gray-300 text-gray-900 text-sm font-medium px-2.5 py-1.5 rounded-md focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 focus:outline-none transition-all" />
                                </div>
                                <div className="flex flex-col gap-1 md:items-start pl-1">
                                    <span className="md:hidden text-[10px] text-gray-500 font-bold uppercase">Total</span>
                                    <span className="text-[13px] font-bold text-purple-600 font-mono">
                                        {(gov.price + gov.shippingCost + gov.codFee).toLocaleString()}
                                    </span>
                                </div>
                                <div className="col-span-2 md:col-span-1 flex justify-end md:justify-start mt-2 md:mt-0">
                                    <button 
                                        onClick={() => updateGov(gov.governorate, 'isActive', !gov.isActive)}
                                        className={`w-full md:w-auto px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all border ${
                                            gov.isActive 
                                              ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' 
                                              : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                                        }`}
                                    >
                                        {gov.isActive ? 'Active' : 'Inactive'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            <aside className="space-y-6">
                 <div>
                     <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Metrics Overview</h3>
                     <div className="flex flex-col gap-2">
                        <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-lg relative overflow-hidden">
                            <div className="text-[10px] text-gray-500 font-semibold mb-1 uppercase tracking-wide">Active Regions</div>
                            <div className="text-2xl font-bold text-green-600">{cityPricing.filter(g => g.isActive).length} <span className="text-sm font-normal text-gray-400">/ {govs.length}</span></div>
                        </div>

                        <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-lg">
                            <div className="text-[10px] text-gray-500 font-semibold mb-1 uppercase tracking-wide">Average Base Price</div>
                            <div className="text-2xl font-bold text-blue-600 font-mono">
                                {cityPricing.length > 0 ? Math.round(cityPricing.reduce((sum, g) => sum + g.price, 0) / cityPricing.length).toLocaleString() : 0}
                                <span className="text-xs font-normal text-gray-400 ml-1">LE</span>
                            </div>
                        </div>

                        <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-lg">
                            <div className="text-[10px] text-gray-500 font-semibold mb-1 uppercase tracking-wide">Avg Shipping / COD</div>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                <div>
                                    <div className="text-[9px] text-gray-400 uppercase mb-0.5">Shipping</div>
                                    <div className="text-[13px] font-bold text-gray-900 font-mono">
                                        {cityPricing.length > 0 ? Math.round(cityPricing.reduce((sum, g) => sum + g.shippingCost, 0) / cityPricing.length).toLocaleString() : 0}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[9px] text-gray-400 uppercase mb-0.5">COD Fee</div>
                                    <div className="text-[13px] font-bold text-amber-600 font-mono">
                                        {cityPricing.length > 0 ? Math.round(cityPricing.reduce((sum, g) => sum + g.codFee, 0) / cityPricing.length).toLocaleString() : 0}
                                    </div>
                                </div>
                            </div>
                        </div>
                     </div>
                 </div>

                 <div>
                     <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Logic Matrix</h3>
                     <div className="px-3.5 py-3 rounded-lg mb-2" style={{ backgroundColor: 'rgba(59,130,246,0.04)', border: '1px solid rgba(59,130,246,0.25)' }}>
                        <div className="flex gap-2.5 items-center mb-1.5">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ color: '#2563eb', backgroundColor: 'rgba(59,130,246,0.15)' }}>ONLINE</span>
                            <span className="text-sm font-semibold text-gray-900">Prepaid Card</span>
                        </div>
                        <p className="text-[11px] text-gray-600 m-0 mb-1 leading-relaxed">
                            Payment gateway explicitly drops COD fees.
                        </p>
                        <p className="text-[11px] font-mono text-blue-600 m-0">Total = Price + Shipping</p>
                     </div>

                     <div className="px-3.5 py-3 rounded-lg mb-2" style={{ backgroundColor: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.25)' }}>
                        <div className="flex gap-2.5 items-center mb-1.5">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ color: '#d97706', backgroundColor: 'rgba(245,158,11,0.15)' }}>COD</span>
                            <span className="text-sm font-semibold text-gray-900">Cash on Delivery</span>
                        </div>
                        <p className="text-[11px] text-gray-600 m-0 mb-1 leading-relaxed">
                            Courier collection adds risk & handling markup.
                        </p>
                        <p className="text-[11px] font-mono text-amber-600 m-0">Total = Price + Ship + COD</p>
                     </div>
                 </div>
            </aside>
        </div>
    </div>
  );
};

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

  // ─── Fetch products ──────────────────────────────────────────────────────────
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
        toast.error('Failed to load products');
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

  // ─── Actions ─────────────────────────────────────────────────────────────────
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

  // ─── Render Pipeline ─────────────────────────────────────────────────────────

  if (selectedCityPricingProduct) {
    return (
      <div className="w-full">
        <CityPricingPanel 
          productId={selectedCityPricingProduct} 
          onBack={() => setSelectedCityPricingProduct(null)} 
        />
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl md:text-3xl tracking-tight font-bold text-gray-900 mb-1">
          Products
        </h1>
        <div className="h-1 w-24 sm:w-32 md:w-40 bg-gray-900" />
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => {
            const controller = new AbortController();
            fetchProducts(controller.signal, page);
          }}
          disabled={isRefreshing}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg border border-blue-500/20 hover:border-blue-400/40 transition-all duration-300 font-medium flex items-center gap-2"
        >
          {isRefreshing ? (
            <Spinner />
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
          Refresh
        </button>

        <button
          onClick={() => router.push('/admin/add-product')}
          className="bg-gray-900 text-white px-5 py-2 rounded-lg border border-gray-300 hover:bg-gray-800 transition-all duration-300 font-medium flex items-center gap-2 text-sm"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Add New Product
        </button>
      </div>

      {/* Products List */}
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

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 py-4 mt-2">
              <button
                disabled={page <= 1 || isRefreshing}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                Previous
              </button>
              <span className="text-sm font-semibold text-gray-900 bg-gray-100 px-4 py-2 rounded-lg">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages || isRefreshing}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                Next
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500 mb-4">
            {isRefreshing ? 'Loading products…' : 'No products found'}
          </p>
          {!isRefreshing && (
            <button
              onClick={() => router.push('/admin/add-product')}
              className="bg-gray-900 text-white px-5 py-2 rounded-lg border border-gray-300 hover:bg-gray-800 transition-all duration-300 font-medium text-sm"
            >
              Add Your First Product
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Products;
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import { fetchWithRetry } from '@/utils/fetchWithRetry';

interface CityPricing {
  governorate: string;
  price: number;
  isActive: boolean;
  shippingCost: number;
  codFee: number;
}

interface ProductCityPricingData {
  productName: string;
  basePrice: number;
  cityPricing: CityPricing[];
}

const Spinner = ({ size = 'sm' }: { size?: 'sm' | 'xs' }) => (
  <svg
    className={`animate-spin ${size === 'xs' ? 'w-3 h-3' : 'w-6 h-6'}`}
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

const ProductCityPricingPage = () => {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  
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
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="sm" />
          <p className="text-gray-400">Loading city pricing...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-medium mb-4">Product not found</h2>
          <button
            onClick={() => router.push('/admin')}
            className="bg-white text-black px-6 py-3 font-medium hover:bg-gray-200 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-7xl mx-auto">
        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded mb-6 flex justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-200 hover:text-white">✕</button>
          </div>
        )}

        <div className="mb-8">
          <button
            onClick={() => router.push('/admin')}
            className="flex items-center gap-2 text-gray-300 hover:text-white mb-4 transition-colors"
          >
            <span>←</span>
            <span>Back to Products</span>
          </button>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">City Pricing Management</h1>
              <p className="text-xl text-gray-300 mb-1">Product: <span className="text-white font-medium">{data.productName}</span></p>
              <p className="text-gray-400">Base Price: <span className="text-white font-medium">{data.basePrice} LE</span></p>
            </div>
            
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => {
                  setLoading(true);
                  fetchData();
                }}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading && <Spinner size="xs" />}
                {loading ? 'Refreshing...' : 'Refresh Data'}
              </button>
              <button
                onClick={applyBasePriceToAll}
                className="bg-gray-600 text-white px-4 py-2 font-medium hover:bg-gray-700 transition-colors"
              >
                Apply Base Price to All
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-white text-black px-6 py-3 font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 min-w-[160px] flex items-center justify-center gap-2"
              >
                {saving && <Spinner size="xs" />}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-black border border-white/10 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white text-black">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Governorate</th>
                  <th className="px-4 py-3 text-left font-medium">Price (LE)</th>
                  <th className="px-4 py-3 text-left font-medium">Shipping Cost</th>
                  <th className="px-4 py-3 text-left font-medium">COD Fee</th>
                  <th className="px-4 py-3 text-left font-medium">Total (COD)</th>
                  <th className="px-4 py-3 text-left font-medium">Active</th>
                </tr>
              </thead>
              <tbody>
                {govs.map(gov => (
                  <tr key={gov.governorate} className="border-b border-white/10">
                    <td className="px-4 py-3 font-medium text-gray-300">{gov.governorate}</td>
                    <td className="px-4 py-3">
                      <input type="number" value={gov.price} min="0"
                        onChange={(e) => {
                          const val = e.target.value;
                          const num = val === '' ? 0 : Number(val);
                          if (!Number.isNaN(num)) updateGov(gov.governorate, 'price', num);
                        }}
                        className="w-20 p-2 bg-transparent border border-white/20 text-white text-center focus:outline-none focus:border-white transition-colors" />
                    </td>
                    <td className="px-4 py-3">
                      <input type="number" value={gov.shippingCost} min="0"
                        onChange={(e) => {
                          const val = e.target.value;
                          const num = val === '' ? 0 : Number(val);
                          if (!Number.isNaN(num)) updateGov(gov.governorate, 'shippingCost', num);
                        }}
                        className="w-24 p-2 bg-transparent border border-white/20 text-white text-center focus:outline-none focus:border-white transition-colors" />
                    </td>
                    <td className="px-4 py-3">
                      <input type="number" value={gov.codFee} min="0"
                        onChange={(e) => {
                          const val = e.target.value;
                          const num = val === '' ? 0 : Number(val);
                          if (!Number.isNaN(num)) updateGov(gov.governorate, 'codFee', num);
                        }}
                        className="w-24 p-2 bg-transparent border border-white/20 text-white text-center focus:outline-none focus:border-white transition-colors" />
                    </td>
                    <td className="px-4 py-3 font-medium text-green-400">{gov.price + gov.shippingCost + gov.codFee} LE</td>
                    <td className="px-4 py-3">
                      <button onClick={()=> updateGov(gov.governorate, 'isActive', !gov.isActive)}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${gov.isActive ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-600 text-gray-300 hover:bg-gray-700'}`}>
                        {gov.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-black border border-white/10 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-2 text-gray-400">Active Governorates</h3>
            <p className="text-3xl font-bold text-green-400">
              {cityPricing.filter(g => g.isActive).length}
            </p>
          </div>
          
          <div className="bg-black border border-white/10 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-2 text-gray-400">Average Price</h3>
            <p className="text-3xl font-bold text-blue-400">
              {cityPricing.length > 0 
                ? Math.round(cityPricing.reduce((sum, g) => sum + g.price, 0) / cityPricing.length) 
                : 0} LE
            </p>
          </div>
          
          <div className="bg-black border border-white/10 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-2 text-gray-400">Price Range</h3>
            <p className="text-3xl font-bold text-purple-400">
              {cityPricing.length > 0 
                ? `${Math.min(...cityPricing.map(g => g.price))} - ${Math.max(...cityPricing.map(g => g.price))}` 
                : '0'} LE
            </p>
          </div>
        </div>

        <div className="mt-8 bg-black/60 border border-white/10 p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
            <span className="text-xl">💡</span> How City Pricing Works
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-300 bg-white/5 p-4 rounded-lg border border-white/5">
            <div>
              <h4 className="font-medium text-white mb-2 pb-2 border-b border-white/10">For Online Payment</h4>
              <p>Customer pays: <span className="block mt-2 text-base text-gray-100">Product Price + Shipping Cost</span></p>
            </div>
            <div>
              <h4 className="font-medium text-white mb-2 pb-2 border-b border-white/10">For Cash on Delivery (COD)</h4>
              <p>Customer pays: <span className="block mt-2 text-base text-green-400 font-medium">Product Price + Shipping Cost + COD Fee</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCityPricingPage;

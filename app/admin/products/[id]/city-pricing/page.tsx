"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

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

const ProductCityPricingPage = () => {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<ProductCityPricingData | null>(null);
  const [cityPricing, setCityPricing] = useState<CityPricing[]>([]);

  // Fetch product city pricing data
  const fetchData = async () => {
    try {
      const response = await fetch(`/api/admin/products/${productId}/city-pricing`);
      const result = await response.json();
      
      if (result.success) {
        setData(result);
        setCityPricing(result.cityPricing);
      } else {
        alert('Error: ' + result.error);
      }
    } catch (error) {
      console.error('Error fetching city pricing:', error);
      alert('Failed to fetch city pricing data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (productId) {
      fetchData();
    }
  }, [productId]);

  // Governorate-level editing is handled inline via input handlers below.

  // Save changes
  const handleSave = async () => {
    setSaving(true);
    
    try {
      const response = await fetch(`/api/admin/products/${productId}/city-pricing`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cityPricing }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert('City pricing updated successfully!');
      } else {
        alert('Error: ' + result.error);
      }
    } catch (error) {
      console.error('Error saving city pricing:', error);
      alert('Failed to save city pricing');
    } finally {
      setSaving(false);
    }
  };

  // Apply base price to all cities
  const applyBasePriceToAll = () => {
    if (!data) return;
    
    if (confirm(`Apply base price (${data.basePrice} LE) to all cities?`)) {
      setCityPricing(prev => prev.map(city => ({
        ...city,
        price: data.basePrice
      })));
    }
  };

  const govs = [...cityPricing].sort((a, b) => a.governorate.localeCompare(b.governorate));

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-medium mb-4">Product not found</h2>
          <button
            onClick={() => router.back()}
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
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-300 hover:text-white mb-4 transition-colors"
          >
            <span>←</span>
            <span>Back to Products</span>
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">City Pricing Management</h1>
              <p className="text-xl text-gray-300 mb-1">Product: <span className="text-white font-medium">{data.productName}</span></p>
              <p className="text-gray-400">Base Price: <span className="text-white font-medium">{data.basePrice} LE</span></p>
            </div>
            
            <div className="flex gap-4">
              <button
                onClick={applyBasePriceToAll}
                className="bg-gray-600 text-white px-4 py-2 font-medium hover:bg-gray-700 transition-colors"
              >
                Apply Base Price to All
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-white text-black px-6 py-3 font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>

        {/* Governorate Pricing Table */}
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
                        onChange={(e)=> setCityPricing(prev=>prev.map(x=>x.governorate===gov.governorate?{...x, price:Number(e.target.value)}:x))}
                        className="w-20 p-2 bg-transparent border border-white/20 text-white text-center focus:outline-none focus:border-white"/>
                    </td>
                    <td className="px-4 py-3">
                      <input type="number" value={gov.shippingCost} min="0"
                        onChange={(e)=> setCityPricing(prev=>prev.map(x=>x.governorate===gov.governorate?{...x, shippingCost:Number(e.target.value)}:x))}
                        className="w-24 p-2 bg-transparent border border-white/20 text-white text-center focus:outline-none focus:border-white"/>
                    </td>
                    <td className="px-4 py-3">
                      <input type="number" value={gov.codFee} min="0"
                        onChange={(e)=> setCityPricing(prev=>prev.map(x=>x.governorate===gov.governorate?{...x, codFee:Number(e.target.value)}:x))}
                        className="w-24 p-2 bg-transparent border border-white/20 text-white text-center focus:outline-none focus:border-white"/>
                    </td>
                    <td className="px-4 py-3 font-medium text-green-400">{gov.price + gov.shippingCost + gov.codFee} LE</td>
                    <td className="px-4 py-3">
                      <button onClick={()=> setCityPricing(prev=>prev.map(x=>x.governorate===gov.governorate?{...x, isActive:!x.isActive}:x))}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${gov.isActive?'bg-green-600 text-white hover:bg-green-700':'bg-gray-600 text-gray-300 hover:bg-gray-700'}`}>
                        {gov.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-black border border-white/10 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-2">Active Governorates</h3>
            <p className="text-2xl font-bold text-green-400">
              {cityPricing.filter(g => g.isActive).length}
            </p>
          </div>
          
          <div className="bg-black border border-white/10 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-2">Average Price</h3>
            <p className="text-2xl font-bold text-blue-400">
              {Math.round(cityPricing.reduce((sum, g) => sum + g.price, 0) / cityPricing.length || 0)} LE
            </p>
          </div>
          
          <div className="bg-black border border-white/10 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-2">Price Range</h3>
            <p className="text-2xl font-bold text-purple-400">
              {Math.min(...cityPricing.map(g => g.price))} - {Math.max(...cityPricing.map(g => g.price))} LE
            </p>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-gray-900 border border-white/10 p-6 rounded-lg">
          <h3 className="text-lg font-medium mb-4">💡 How City Pricing Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
            <div>
              <h4 className="font-medium text-white mb-2">For Online Payment:</h4>
              <p>Customer pays: <strong>Product Price + Shipping Cost</strong></p>
            </div>
            <div>
              <h4 className="font-medium text-white mb-2">For Cash on Delivery (COD):</h4>
              <p>Customer pays: <strong>Product Price + Shipping Cost + COD Fee</strong></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCityPricingPage;

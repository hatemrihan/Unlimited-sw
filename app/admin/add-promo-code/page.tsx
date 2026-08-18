"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DatePicker } from '../../../components/ui/date-picker';
import { toLocalDateString, fromLocalDateString, todayLocal, daysFromTodayLocal } from '@/utils/localDate';
import { ICityPricing as City } from '../../../models/cityPricing';

interface PromoCode {
  code: string;
  discount: number;
  type: 'percentage' | 'fixed';
  minAmount?: number;
  maxUses?: number;
  isActive: boolean;
  validFrom: string;
  validUntil: string;
  description?: string;
  waiveShipping?: boolean;
}

const AddPromoCodePage = () => {
  const router = useRouter();
  const [saving, setSaving] = useState<boolean>(false);
  const [cities, setCities] = useState<City[]>([]);
  const [loadingCities, setLoadingCities] = useState<boolean>(true);
  const [newPromoCode, setNewPromoCode] = useState<PromoCode>({
    code: '',
    discount: 0,
    type: 'percentage',
    minAmount: 0,
    maxUses: 100,
    isActive: true,
    validFrom: todayLocal(),
    validUntil: daysFromTodayLocal(30),
    description: '',
    waiveShipping: false
  });

  // Fetch cities data when component mounts
  useEffect(() => {
    fetchCities();
  }, []);

  const fetchCities = async () => {
    try {
      setLoadingCities(true);
      const response = await fetch('/api/checkout/cities');
      if (response.ok) {
        const data = await response.json();
        setCities(data.cities || []);
      } else {
        console.error('Failed to fetch cities');
      }
    } catch (error) {
      console.error('Error fetching cities:', error);
    } finally {
      setLoadingCities(false);
    }
  };

  // Calculate total COD and delivery fees from cities data
  const calculateTotalFees = () => {
    if (!cities || cities.length === 0) return { codTotal: 0, deliveryTotal: 0, combined: 0 };
    
    const codTotal = cities.reduce((acc, city) => acc + (city.codFee || 0), 0);
    const deliveryTotal = cities.reduce((acc, city) => acc + (city.shippingCost || 0), 0);
    const combined = codTotal + deliveryTotal;
    
    return { codTotal, deliveryTotal, combined };
  };

  // Create a promo code that cancels COD and delivery fees
  const createFreeShippingPromo = () => {
    const fees = calculateTotalFees();
    
    // Get the average fees (since promo will apply to single orders)
    const avgCodFee = cities.length > 0 ? fees.codTotal / cities.length : 0;
    const avgDeliveryFee = cities.length > 0 ? fees.deliveryTotal / cities.length : 0;
    const avgTotalFee = avgCodFee + avgDeliveryFee;
    
    setNewPromoCode({
      ...newPromoCode,
      code: 'FREESHIP',
      discount: 0, // Set to 0 since we're waiving fees directly
      type: 'fixed',
      description: 'Free shipping - Waives delivery fee only (COD fee still applies)',
      minAmount: 100, // Set a minimum order amount if needed
      waiveShipping: true,
    });
  };

  const handleAddPromoCode = async () => {
    try {
      setSaving(true);

      if (!newPromoCode.code || (!newPromoCode.discount && !newPromoCode.waiveShipping)) {
        alert('Please fill in all required fields');
        return;
      }

      const response = await fetch('/api/promo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newPromoCode),
      });

      if (response.ok) {
        alert('Promo code added successfully!');
        router.back();
      } else {
        alert('Failed to add promo code');
      }
    } catch (error) {
      console.error('Error adding promo code:', error);
      alert('Error adding promo code');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="w-full p-2 md:p-4">
        <div className="w-full">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-black hover:text-gray-600 transition-colors duration-300"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Back to Promo Codes
            </button>
          </div>

          <div className="bg-white border border-gray-200 p-3 md:p-4">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-black mb-2">Add New Promo Code</h1>
              <p className="text-gray-600">Create a new promotional code for your customers</p>
            </div>

            {/* Quick Actions */}
            <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded">
              <h3 className="text-sm font-semibold text-black mb-3">Quick Actions</h3>
              <button 
                className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 transition-all duration-300 disabled:bg-gray-400"
                onClick={createFreeShippingPromo}
                disabled={loadingCities || cities.length === 0}
              >
                {loadingCities ? 'Loading cities...' : 'Create Free Shipping Promo'}
              </button>
              {!loadingCities && cities.length > 0 && (
                <p className="text-xs text-gray-600 mt-2">
                  Average fees: COD: L.E {Math.round(calculateTotalFees().codTotal / cities.length)}, 
                  Delivery: L.E {Math.round(calculateTotalFees().deliveryTotal / cities.length)}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                {/* Promo Code */}
                <div>
                  <label className="block text-sm font-medium text-black mb-2">Promo Code *</label>
                  <input
                    type="text"
                    value={newPromoCode.code}
                    onChange={(e) => setNewPromoCode({...newPromoCode, code: e.target.value.toUpperCase()})}
                    className="w-full p-3 bg-white border border-gray-300 text-black focus:border-black focus:outline-none"
                    placeholder="SAVE20"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-black mb-2">Description</label>
                  <textarea
                    value={newPromoCode.description || ''}
                    onChange={(e) => setNewPromoCode({...newPromoCode, description: e.target.value})}
                    className="w-full p-3 bg-white border border-gray-300 text-black focus:border-black focus:outline-none"
                    placeholder="20% off on all products"
                    rows={3}
                  />
                </div>

                {/* Discount Type and Amount */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-black mb-2">Discount Type</label>
                    <select
                      value={newPromoCode.type}
                      onChange={(e) => setNewPromoCode({...newPromoCode, type: e.target.value as 'percentage' | 'fixed'})}
                      className="w-full p-3 bg-white border border-gray-300 text-black focus:border-black focus:outline-none"
                    >
                      <option value="percentage" className="text-black">Percentage (%)</option>
                      <option value="fixed" className='text-black'>Fixed Amount (L.E)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-2">Discount Value *</label>
                    <input
                      type="number"
                      value={newPromoCode.discount}
                      onChange={(e) => setNewPromoCode({...newPromoCode, discount: parseFloat(e.target.value) || 0})}
                      className="w-full p-3 bg-white border border-gray-300 text-black focus:border-black focus:outline-none"
                      placeholder={newPromoCode.type === 'percentage' ? '20' : '50'}
                      min="0"
                      max={newPromoCode.type === 'percentage' ? '100' : undefined}
                    />
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                {/* Minimum Amount */}
                <div>
                  <label className="block text-sm font-medium text-black mb-2">Minimum Order Amount (L.E)</label>
                  <input
                    type="number"
                    value={newPromoCode.minAmount || ''}
                    onChange={(e) => setNewPromoCode({...newPromoCode, minAmount: parseFloat(e.target.value) || 0})}
                    className="w-full p-3 bg-white border border-gray-300 text-black focus:border-black focus:outline-none"
                    placeholder="100"
                    min="0"
                  />
                </div>

                {/* Maximum Uses */}
                <div>
                  <label className="block text-sm font-medium text-black mb-2">Maximum Uses</label>
                  <input
                    type="number"
                    value={newPromoCode.maxUses || ''}
                    onChange={(e) => setNewPromoCode({...newPromoCode, maxUses: parseInt(e.target.value) || 0})}
                    className="w-full p-3 bg-white border border-gray-300 text-black focus:border-black focus:outline-none"
                    placeholder="100"
                    min="1"
                  />
                </div>

                {/* Validity Period */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-black mb-2">Valid From</label>
                    <DatePicker
                      date={newPromoCode.validFrom ? fromLocalDateString(newPromoCode.validFrom) : undefined}
                      onDateChange={(date) => setNewPromoCode({...newPromoCode, validFrom: date ? toLocalDateString(date) : ''})}
                      placeholder="Select start date"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-2">Valid Until</label>
                    <DatePicker
                      date={newPromoCode.validUntil ? fromLocalDateString(newPromoCode.validUntil) : undefined}
                      onDateChange={(date) => setNewPromoCode({...newPromoCode, validUntil: date ? toLocalDateString(date) : ''})}
                      placeholder="Select end date"
                    />
                  </div>
                </div>

                {/* Active Status */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={newPromoCode.isActive}
                    onChange={(e) => setNewPromoCode({...newPromoCode, isActive: e.target.checked})}
                    className="w-4 h-4 text-black focus:ring-black border-gray-300 rounded"
                  />
                  <label htmlFor="isActive" className="text-sm text-black">
                    Active
                  </label>
                </div>

                {/* Waive Shipping Only */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="waiveShipping"
                    checked={newPromoCode.waiveShipping || false}
                    onChange={(e) => setNewPromoCode({...newPromoCode, waiveShipping: e.target.checked})}
                    className="w-4 h-4 text-black focus:ring-black border-gray-300 rounded"
                  />
                  <label htmlFor="waiveShipping" className="text-sm text-black">
                    هتخلي التوصيل ببلاش بس (الدفع عند الاستلام لازم يتدفع)
                  </label>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4 pt-4 lg:pt-6">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 bg-white text-black border border-gray-300 font-medium hover:bg-gray-100 transition-all duration-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddPromoCode}
                disabled={saving}
                className="px-4 py-2 bg-black text-white font-medium hover:bg-gray-800 transition-all duration-300 disabled:bg-gray-400"
              >
                {saving ? 'Adding...' : 'Add Promo Code'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddPromoCodePage;
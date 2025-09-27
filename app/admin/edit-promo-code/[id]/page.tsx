"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { DatePicker } from '../../../../components/ui/date-picker';

interface PromoCode {
  _id: string;
  code: string;
  discount: number;
  type: 'percentage' | 'fixed';
  minAmount?: number;
  maxUses?: number;
  isActive: boolean;
  validFrom: string;
  validUntil: string;
  description?: string;
  waiveShippingAndCOD?: boolean;
}

const EditPromoCodePage = () => {
  const router = useRouter();
  const params = useParams();
  const [promoCode, setPromoCode] = useState<PromoCode | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    const fetchPromoCode = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/promo/${params.id}`);
        
        if (response.ok) {
          const data = await response.json();
          setPromoCode(data.promoCode);
        } else {
          console.error('Failed to fetch promo code');
          router.back();
        }
      } catch (error) {
        console.error('Error fetching promo code:', error);
        router.back();
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchPromoCode();
    }
  }, [params.id, router]);

  const handleUpdatePromoCode = async () => {
    if (!promoCode) return;

    try {
      setSaving(true);

      if (!promoCode.code || (!promoCode.discount && !promoCode.waiveShippingAndCOD)) {
        alert('Please fill in all required fields or enable fee waiver');
        return;
      }

      const response = await fetch(`/api/promo/${promoCode._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(promoCode),
      });

      if (response.ok) {
        alert('Promo code updated successfully!');
        router.back();
      } else {
        alert('Failed to update promo code');
      }
    } catch (error) {
      console.error('Error updating promo code:', error);
      alert('Error updating promo code');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!promoCode) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-medium mb-4">Promo code not found</h2>
          <button
            onClick={() => router.back()}
            className="bg-white text-black px-6 py-3 font-medium hover:bg-gray-100 transition-colors duration-300"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="w-full p-2 md:p-4">
        <div className="w-full">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-white hover:text-gray-300 transition-colors duration-300"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Back to Promo Codes
            </button>
          </div>

          <div className="bg-black border border-white/10 rounded-lg p-3 md:p-4">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-white mb-2 text-center">Edit Promo Code</h1>
              <p className="text-gray-300 text-center">Update the promotional code details</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                {/* Promo Code */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Promo Code *</label>
                  <input
                    type="text"
                    value={promoCode.code}
                    onChange={(e) => setPromoCode({...promoCode, code: e.target.value.toUpperCase()})}
                    className="w-full p-3 bg-transparent border border-white/20 rounded-lg text-white focus:border-white focus:outline-none"
                    placeholder="SAVE20"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Description</label>
                  <textarea
                    value={promoCode.description || ''}
                    onChange={(e) => setPromoCode({...promoCode, description: e.target.value})}
                    className="w-full p-3 bg-transparent border border-white/20 rounded-lg text-white focus:border-white focus:outline-none"
                    placeholder="20% off on all products"
                    rows={3}
                  />
                </div>

                {/* Discount Type and Amount */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Discount Type</label>
                    <select
                      value={promoCode.type}
                      onChange={(e) => setPromoCode({...promoCode, type: e.target.value as 'percentage' | 'fixed'})}
                      className="w-full p-3 bg-transparent border border-white/20 rounded-lg text-white focus:border-white focus:outline-none"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount (L.E)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Discount Value *</label>
                    <input
                      type="number"
                      value={promoCode.discount}
                      onChange={(e) => setPromoCode({...promoCode, discount: parseFloat(e.target.value) || 0})}
                      className="w-full p-3 bg-transparent border border-white/20 rounded-lg text-white focus:border-white focus:outline-none"
                      placeholder={promoCode.type === 'percentage' ? '20' : '50'}
                      min="0"
                      max={promoCode.type === 'percentage' ? '100' : undefined}
                    />
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                {/* Minimum Amount */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Minimum Order Amount (L.E)</label>
                  <input
                    type="number"
                    value={promoCode.minAmount || ''}
                    onChange={(e) => setPromoCode({...promoCode, minAmount: parseFloat(e.target.value) || 0})}
                    className="w-full p-3 bg-transparent border border-white/20 rounded-lg text-white focus:border-white focus:outline-none"
                    placeholder="100"
                    min="0"
                  />
                </div>

                {/* Maximum Uses */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Maximum Uses</label>
                  <input
                    type="number"
                    value={promoCode.maxUses || ''}
                    onChange={(e) => setPromoCode({...promoCode, maxUses: parseInt(e.target.value) || 0})}
                    className="w-full p-3 bg-transparent border border-white/20 rounded-lg text-white focus:border-white focus:outline-none"
                    placeholder="100"
                    min="1"
                  />
                </div>

                {/* Validity Period */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Valid From</label>
                    <DatePicker
                      date={promoCode.validFrom ? new Date(promoCode.validFrom) : undefined}
                      onDateChange={(date) => setPromoCode({...promoCode, validFrom: date ? date.toISOString().split('T')[0] : ''})}
                      placeholder="Select start date"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Valid Until</label>
                    <DatePicker
                      date={promoCode.validUntil ? new Date(promoCode.validUntil) : undefined}
                      onDateChange={(date) => setPromoCode({...promoCode, validUntil: date ? date.toISOString().split('T')[0] : ''})}
                      placeholder="Select end date"
                    />
                  </div>
                </div>

                {/* Active Status */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={promoCode.isActive}
                    onChange={(e) => setPromoCode({...promoCode, isActive: e.target.checked})}
                    className="w-4 h-4 text-white focus:ring-white border-white rounded"
                  />
                  <label htmlFor="isActive" className="text-sm text-white">
                    Active
                  </label>
                </div>

                {/* Waive Shipping and COD */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="waiveShippingAndCOD"
                    checked={promoCode.waiveShippingAndCOD || false}
                    onChange={(e) => setPromoCode({...promoCode, waiveShippingAndCOD: e.target.checked})}
                    className="w-4 h-4 text-white focus:ring-white border-white rounded"
                  />
                  <label htmlFor="waiveShippingAndCOD" className="text-sm text-white">
                    هتخلي انت لتوصيل والدفع عند الاستلام ببلاش (بحبك يا كبتني لما تشوفها قولي عشان امسح الرساله دي)
                  </label>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4 lg:pt-6">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 bg-white text-black px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition-all duration-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdatePromoCode}
                disabled={saving}
                className="flex-1 bg-white text-black px-6 py-3 rounded-lg font-medium hover:bg-gray-200 disabled:bg-gray-400 disabled:text-gray-600 transition-all duration-300"
              >
                {saving ? 'Updating...' : 'Update Promo Code'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditPromoCodePage;

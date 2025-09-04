"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DatePicker } from '../../../components/ui/date-picker';

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
}

const AddPromoCodePage = () => {
  const router = useRouter();
  const [saving, setSaving] = useState<boolean>(false);
  const [newPromoCode, setNewPromoCode] = useState<PromoCode>({
    code: '',
    discount: 0,
    type: 'percentage',
    minAmount: 0,
    maxUses: 100,
    isActive: true,
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    description: ''
  });

  const handleAddPromoCode = async () => {
    try {
      setSaving(true);

      if (!newPromoCode.code || !newPromoCode.discount) {
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
              <h1 className="text-2xl font-bold text-white mb-2">Add New Promo Code</h1>
              <p className="text-gray-300">Create a new promotional code for your customers</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                {/* Promo Code */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Promo Code *</label>
                  <input
                    type="text"
                    value={newPromoCode.code}
                    onChange={(e) => setNewPromoCode({...newPromoCode, code: e.target.value.toUpperCase()})}
                    className="w-full p-3 bg-transparent border border-white/20 rounded-lg text-white focus:border-white focus:outline-none"
                    placeholder="SAVE20"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Description</label>
                  <textarea
                    value={newPromoCode.description || ''}
                    onChange={(e) => setNewPromoCode({...newPromoCode, description: e.target.value})}
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
                      value={newPromoCode.type}
                      onChange={(e) => setNewPromoCode({...newPromoCode, type: e.target.value as 'percentage' | 'fixed'})}
                      className="w-full p-3 bg-transparent border border-white/20 rounded-lg text-white focus:border-white focus:outline-none"
                    >
                      <option value="percentage" className="text-black">Percentage (%)</option>
                      <option value="fixed"className='text-black'>Fixed Amount (L.E)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Discount Value *</label>
                    <input
                      type="number"
                      value={newPromoCode.discount}
                      onChange={(e) => setNewPromoCode({...newPromoCode, discount: parseFloat(e.target.value) || 0})}
                      className="w-full p-3 bg-transparent border border-white/20 rounded-lg text-white focus:border-white focus:outline-none"
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
                  <label className="block text-sm font-medium text-white mb-2">Minimum Order Amount (L.E)</label>
                  <input
                    type="number"
                    value={newPromoCode.minAmount || ''}
                    onChange={(e) => setNewPromoCode({...newPromoCode, minAmount: parseFloat(e.target.value) || 0})}
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
                    value={newPromoCode.maxUses || ''}
                    onChange={(e) => setNewPromoCode({...newPromoCode, maxUses: parseInt(e.target.value) || 0})}
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
                      date={newPromoCode.validFrom ? new Date(newPromoCode.validFrom) : undefined}
                      onDateChange={(date) => setNewPromoCode({...newPromoCode, validFrom: date ? date.toISOString().split('T')[0] : ''})}
                      placeholder="Select start date"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Valid Until</label>
                    <DatePicker
                      date={newPromoCode.validUntil ? new Date(newPromoCode.validUntil) : undefined}
                      onDateChange={(date) => setNewPromoCode({...newPromoCode, validUntil: date ? date.toISOString().split('T')[0] : ''})}
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
                    className="w-4 h-4 text-white focus:ring-white border-white rounded"
                  />
                  <label htmlFor="isActive" className="text-sm text-white">
                    Active
                  </label>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4 pt-4 lg:pt-6">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-gray-200 transition-all duration-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddPromoCode}
                disabled={saving}
                className="px-4 py-2 bg-white text-black rounded-lg border border-white/50 font-medium hover:bg-gray-200 transition-all duration-300"
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

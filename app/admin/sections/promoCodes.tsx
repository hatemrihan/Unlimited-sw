import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface PromoCode {
  _id: string;
  code: string;
  discount: number;
  type: 'percentage' | 'fixed';
  minAmount?: number;
  maxUses?: number;
  currentUses: number;
  isActive: boolean;
  validFrom: string;
  validUntil: string;
  description?: string;
}

const PromoCodes = () => {
  const router = useRouter();
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Function to fetch all promo codes
  const fetchPromoCodes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/promo');

      if (response.ok) {
        const data = await response.json();
        setPromoCodes(data.promoCodes || []);
      } else {
        console.error('Failed to fetch promo codes');
      }
    } catch (error) {
      console.error('Error fetching promo codes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Function to handle edit promo code
  const handleEditPromoCode = (promoCode: PromoCode) => {
    router.push(`/admin/edit-promo-code/${promoCode._id}`);
  };

  // Function to toggle promo code status
  const togglePromoCodeStatus = async (promoCode: PromoCode) => {
    try {
      const response = await fetch(`/api/promo/${promoCode._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isActive: !promoCode.isActive
        }),
      });

      if (response.ok) {
        setPromoCodes(promoCodes.map(pc =>
          pc._id === promoCode._id
            ? { ...pc, isActive: !pc.isActive }
            : pc
        ));
        alert(`Promo code ${!promoCode.isActive ? 'activated' : 'deactivated'} successfully!`);
      } else {
        alert('Failed to update promo code status');
      }
    } catch (error) {
      console.error('Error updating promo code status:', error);
      alert('Error updating promo code status');
    }
  };

  // Function to handle delete promo code
  const handleDeletePromoCode = (promoCodeId: string) => {
    router.push(`/admin/delete-promo-code/${promoCodeId}`);
  };



  useEffect(() => {
    fetchPromoCodes();
  }, []);

  return (
    <div className="w-full">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl md:text-3xl tracking-tight font-bold text-gray-900 mb-1">
          Promo Codes
        </h1>
        <div className="h-1 w-24 sm:w-32 md:w-40 bg-gray-900"></div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
              <input
                type="text"
                placeholder="Search promo codes..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 text-gray-900 rounded-lg focus:border-gray-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="sm:w-48">
            <select className="w-full px-4 py-2 bg-white border border-gray-200 text-gray-900 rounded-lg focus:border-gray-400 focus:outline-none">
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Add New Button */}
          <button
            onClick={() => router.push('/admin/add-promo-code')}
            className="bg-gray-900 text-white px-5 py-2 rounded-lg font-medium hover:bg-gray-800 transition-all duration-300 text-sm"
          >
            + Add New Promo Code
          </button>
        </div>
      </div>

      {/* Promo Codes List */}
      {loading ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
            <span className="ml-3 text-gray-600">Loading promo codes...</span>
          </div>
        </div>
      ) : promoCodes.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {promoCodes.map((promoCode) => (
            <div key={promoCode._id} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
              <div className="flex flex-col gap-2">
                {/* Promo Code Header */}
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-gray-900">
                    {promoCode.code}
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${promoCode.isActive
                      ? 'bg-green-900 text-green-200'
                      : 'bg-red-900 text-red-200'
                    }`}>
                    {promoCode.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Discount Info */}
                <div className="space-y-1">
                  <div className="text-xs text-gray-600">
                    {promoCode.type === 'percentage' ? `${promoCode.discount}% OFF` : `${promoCode.discount} L.E OFF`}
                  </div>
                  {promoCode.description && (
                    <div className="text-xs text-gray-400 line-clamp-2">
                      {promoCode.description}
                    </div>
                  )}
                </div>

                {/* Usage Info */}
                <div className="flex items-center justify-between">
                  <span className="text-gray-900 font-bold text-sm">
                    {promoCode.currentUses}/{promoCode.maxUses || '∞'}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(promoCode.validUntil).toLocaleDateString()}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-1 pt-1">
                  <button
                    onClick={() => handleEditPromoCode(promoCode)}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-blue-400 hover:text-blue-300 text-xs font-medium transition-colors border border-blue-400/20 rounded hover:border-blue-400/40"
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M15.655 4.344a2.695 2.695 0 0 0-3.81 0l-.599.599-.009-.009-1.06 1.06.008.01-5.88 5.88a2.75 2.75 0 0 0-.805 1.944v1.922a.75.75 0 0 0 .75.75h1.922a2.75 2.75 0 0 0 1.944-.806l7.54-7.539a2.695 2.695 0 0 0 0-3.81Zm-4.409 2.72-5.88 5.88a1.25 1.25 0 0 0-.366.884v1.172h1.172c.331 0 .65-.132.883-.366l5.88-5.88-1.689-1.69Zm2.75.629.599-.599a1.195 1.195 0 1 0-1.69-1.689l-.598.599 1.69 1.689Z" clipRule="evenodd" />
                    </svg>
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeletePromoCode(promoCode._id)}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-red-400 hover:text-red-300 text-xs font-medium transition-colors border border-red-400/20 rounded hover:border-red-400/40"
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M11.5 8.25a.75.75 0 0 1 .75.75v4.25a.75.75 0 0 1-1.5 0v-4.25a.75.75 0 0 1 .75-.75Z" />
                      <path d="M9.25 9a.75.75 0 0 0-1.5 0v4.25a.75.75 0 0 0 1.5 0v-4.25Z" />
                      <path fillRule="evenodd" d="M7.25 5.25a2.75 2.75 0 0 1 5.5 0h3a.75.75 0 0 1 0 1.5h-.75v5.45c0 1.68 0 2.52-.327 3.162a3 3 0 0 1-1.311 1.311c-.642.327-1.482.327-3.162.327h-.4c-1.68 0-2.52 0-3.162-.327a3 3 0 0 1-1.311-1.311c-.327-.642-.327-1.482-.327-3.162v-5.45h-.75a.75.75 0 0 1 0-1.5h3Zm1.5 0a1.25 1.25 0 1 1 2.5 0h-2.5Zm-2.25 1.5h7v5.45c0 .865-.001 1.423-.036 1.848-.033.408-.09.559-.128.633a1.5 1.5 0 0 1-.655.655c-.074.038-.225.095-.633.128-.425.035-.983.036-1.848.036h-.4c-.865 0-1.423-.001-1.848-.036-.408-.033-.559-.09-.633-.128a1.5 1.5 0 0 1-.656-.655c-.037-.074-.094-.225-.127-.633-.035-.425-.036-.983-.036-1.848v-5.45Z" clipRule="evenodd" />
                    </svg>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <div className="text-gray-400 text-6xl mb-4">🏷️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Promo Codes Yet</h3>
          <p className="text-gray-500 mb-4">Create your first promotional code to start offering discounts to customers.</p>
          <button
            onClick={() => router.push('/admin/add-promo-code')}
            className="bg-gray-900 text-white px-5 py-2 rounded-lg font-medium hover:bg-gray-800 transition-all duration-300 text-sm"
          >
            Create Your First Promo Code
          </button>
        </div>
      )}
    </div>
  );
};

export default PromoCodes;
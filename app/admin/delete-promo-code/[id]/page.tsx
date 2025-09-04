"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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

const DeletePromoCodePage = () => {
  const router = useRouter();
  const params = useParams();
  const [promoCode, setPromoCode] = useState<PromoCode | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [confirmationText, setConfirmationText] = useState<string>('');

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

  const handleDeletePromoCode = async () => {
    if (!promoCode) return;

    if (confirmationText !== 'DELETE') {
      alert('Please type "DELETE" to confirm');
      return;
    }

    try {
      setDeleting(true);
      const response = await fetch(`/api/promo/${promoCode._id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('Promo code deleted successfully!');
        router.back();
      } else {
        alert('Failed to delete promo code');
      }
    } catch (error) {
      console.error('Error deleting promo code:', error);
      alert('Error deleting promo code');
    } finally {
      setDeleting(false);
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
              <h1 className="text-2xl font-bold text-white mb-2">Delete Promo Code</h1>
              <p className="text-gray-300">This action cannot be undone. Please confirm to delete this promo code.</p>
            </div>

            {/* Promo Code Details */}
            <div className="bg-gray-900/50 border border-white/10 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-white mb-4">Promo Code Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Code</label>
                  <p className="text-white font-mono text-lg">{promoCode.code}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Discount</label>
                  <p className="text-white">
                    {promoCode.type === 'percentage' ? `${promoCode.discount}%` : `${promoCode.discount} L.E`}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Type</label>
                  <p className="text-white capitalize">{promoCode.type}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Usage</label>
                  <p className="text-white">
                    {promoCode.currentUses} / {promoCode.maxUses || '∞'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    promoCode.isActive ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'
                  }`}>
                    {promoCode.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Valid Until</label>
                  <p className="text-white">{new Date(promoCode.validUntil).toLocaleDateString()}</p>
                </div>
                {promoCode.description && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                    <p className="text-white">{promoCode.description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Confirmation Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-white mb-2">
                Type <span className="text-red-400 font-bold">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                className="w-full p-3 bg-transparent border border-white/20 rounded-lg text-white focus:border-white focus:outline-none"
                placeholder="Type DELETE to confirm"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-gray-200 transition-all duration-300"
              >
                Cancel
              </button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    type="button"
                    disabled={deleting || confirmationText !== 'DELETE'}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:bg-gray-600 disabled:text-gray-400 transition-all duration-300"
                  >
                    {deleting ? 'Deleting...' : 'Delete Promo Code Permanently'}
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the promo code "{promoCode.code}" 
                      and remove it from your system.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeletePromoCode}>
                      Delete Promo Code
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeletePromoCodePage;

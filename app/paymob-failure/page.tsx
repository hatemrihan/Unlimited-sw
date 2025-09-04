"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Nav from '../sections/Nav';

function PaymobFailureContent() {
  const searchParams = useSearchParams();
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const orderId = searchParams.get('order_id');
    
    if (orderId) {
      // Fetch order details
      fetchOrderDetails(orderId);
    } else {
      setLoading(false);
    }
  }, [searchParams]);

  const fetchOrderDetails = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`);
      const data = await response.json();
      
      if (data.success) {
        setOrderDetails(data.order);
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Nav />
        <div className="min-h-screen bg-black pt-20 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white">Loading...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Nav />
      <div className="min-h-screen bg-black pt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-white">
          <div className="text-center mb-12">
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-4xl md:text-5xl font-light mb-4">Payment Failed</h1>
            <p className="text-xl text-gray-300 mb-8">
              We're sorry, but your payment could not be processed. Please try again.
            </p>
          </div>

          {orderDetails && (
            <div className="bg-gray-900 border border-white p-6 rounded-lg mb-8">
              <h2 className="text-2xl font-medium mb-4">Order Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-300">Order ID:</p>
                  <p className="text-white font-medium">{orderDetails.orderId}</p>
                </div>
                <div>
                  <p className="text-gray-300">Total Amount:</p>
                  <p className="text-white font-medium">L.E {orderDetails.totalAmount?.toFixed(0)}</p>
                </div>
                <div>
                  <p className="text-gray-300">Payment Method:</p>
                  <p className="text-white font-medium">Paymob</p>
                </div>
                <div>
                  <p className="text-gray-300">Status:</p>
                  <p className="text-red-400 font-medium">Failed</p>
                </div>
              </div>
            </div>
          )}

          <div className="text-center">
            <Link
              href="/checkout"
              className="inline-block px-8 py-4 bg-white text-black font-bold uppercase tracking-wider hover:bg-gray-200 transition-colors duration-300 mr-4"
            >
              Try Again
            </Link>
            <Link
              href="/cart"
              className="inline-block px-8 py-4 bg-gray-800 text-white border border-white hover:bg-gray-700 transition-colors duration-300"
            >
              Back to Cart
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

export default function PaymobFailurePage() {
  return (
    <Suspense fallback={
      <>
        <Nav />
        <div className="min-h-screen bg-black pt-20 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white">Loading...</p>
          </div>
        </div>
      </>
    }>
      <PaymobFailureContent />
    </Suspense>
  );
}

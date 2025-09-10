'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Nav from '../sections/Nav'

function ThankYouContent() {
  const router = useRouter()
  const [orderId, setOrderId] = useState<string | null>(null)
  const [orderDetails, setOrderDetails] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  useEffect(() => {
    // Get order ID from URL parameters using window.location
    const urlParams = new URLSearchParams(window.location.search)
    const orderIdParam = urlParams.get('orderId')

    if (orderIdParam) {
      console.log('🎉 Order completed successfully:', orderIdParam)
      setOrderId(orderIdParam)

      // Try to fetch order details from sessionStorage
      try {
        const orderData = sessionStorage.getItem('lastOrder')
        if (orderData) {
          const parsedOrder = JSON.parse(orderData)
          setOrderDetails(parsedOrder)
        }
      } catch (error) {
        console.error('Error parsing order details:', error)
      }
    } else {
      console.log('Thank-you page accessed without order ID')
      // Redirect to home if no order ID
      window.location.href = '/'
      return
    }

    setIsLoading(false)

    // Cleanup
    return () => {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('lastOrder')
      }
    }
  }, [])
  

  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#b3b3b3]"></div>
      </div>
    )
  }

  if (!orderId) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-medium mb-4 text-[#b3b3b3]">No order found</h2>
          <Link href="/" className="text-[#b3b3b3] hover:text-white transition-colors duration-300">
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <Nav />
      <main className="min-h-screen bg-black pt-20">
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl md:text-5xl font-light mb-8 text-[#b3b3b3]">THANK YOU FOR YOUR ORDER!</h1>

          <div className="max-w-2xl mx-auto space-y-6">
            <p className="text-[#b3b3b3]/70">
              Your order has been successfully placed. We will contact you shortly to confirm your order and delivery details.
            </p>

            {orderId && (
              <div className="bg-black  p-6 rounded-md border border-gray-700">
                <p className="font-medium text-[#b3b3b3] mb-2">Order ID:</p>
                <p className="text-2xl font-bold text-white select-all bg-black p-3 rounded border">
                  {orderId}
                </p>
                <p className="text-sm text-[#b3b3b3]/50 mt-2">Please save this ID for reference.</p>
              </div>
            )}

            {orderDetails && (
              <div className="bg-black p-6 rounded-md border border-gray-700">
                <h3 className="text-lg font-medium text-[#b3b3b3] mb-4">Order Summary</h3>
                <div className="text-left space-y-2">
                  <p className="text-[#b3b3b3]/70">
                    <span className="font-medium">Payment Method:</span> {orderDetails.paymentMethod === 'cashOnDelivery' ? 'Cash on Delivery' : 'InstaPay'}
                  </p>
                  <p className="text-[#b3b3b3]/70">
                    <span className="font-medium">Total Amount:</span> L.E {orderDetails.totalAmount?.toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <p className="text-[#b3b3b3]/70">
                You will pay on delivery. Please have the exact amount ready.
              </p>
              <p className="text-sm text-[#b3b3b3]/50">
                If you have any questions, feel free to contact us.
              </p>
            </div>
          </div>

          <div className="mt-12 space-x-4">
            <Link
              href="/"
              className="inline-block px-8 py-4 bg-[#b3b3b3] text-black font-bold uppercase tracking-wider hover:bg-[#b3b3b3]/80 transition-colors duration-300"
            >
              Continue Shopping
            </Link>
            <Link
              href="/shop"
              className="inline-block px-8 py-4 border border-[#b3b3b3] text-[#b3b3b3] font-bold uppercase tracking-wider hover:bg-[#b3b3b3] hover:text-black transition-all duration-300"
            >
              View Products
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}

export default function ThankYouPage() {
  return <ThankYouContent />
} 
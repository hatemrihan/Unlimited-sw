"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Nav from '../sections/Nav';
import { useCart } from '../../contexts/CartContext';
import { useCheckoutPricing } from './hooks/useCheckoutPricing';
import { useCheckoutForm } from './hooks/useCheckoutForm';

export default function CheckoutPage() {
  const [paymentSettings, setPaymentSettings] = useState({ codEnabled: true, instaPayEnabled: true });
  const [orderError, setOrderError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cartContext = useCart();
  const { state, clearCart } = cartContext || {};

  const {
    formData,
    setFormData,
    errors,
    handleInputChange,
    handleFileChange,
    validateForm,
    screenShotPreview,
    isUploading
  } = useCheckoutForm();

  const {
    cities,
    loadingCities,
    selectedGovernorate,
    shippingConfigError,
    refreshedPrices,
    refreshedSubtotal,
    shippingCost,
    codFee,
    discountAmount,
    totalWithShipping,
    appliedPromo,
    promoError,
    shouldWaiveShipping,
    applyPromoCode,
  } = useCheckoutPricing({
    cartItems: state?.items || [],
    paymentMethod: formData.paymentMethod,
    cityName: formData.city,
  });

  useEffect(() => {
    const fetchPaymentSettings = async () => {
      try {
        const response = await fetch('/api/admin/payment-settings');
        const data = await response.json();
        if (data.success) {
          setPaymentSettings(data.settings);
          if (!data.settings.codEnabled && formData.paymentMethod === 'cashOnDelivery') {
            setFormData(prev => ({ ...prev, paymentMethod: 'instaPay' }));
          }
        }
      } catch (error) {
        console.error('Error fetching payment settings:', error);
      }
    };
    fetchPaymentSettings();
  }, [formData.paymentMethod, setFormData]);

  // Prevent rendering if cart is missing
  if (!cartContext) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse h-10 w-48 bg-gray-700 rounded mx-auto mb-4" />
          <p>Please wait while we load your cart.</p>
        </div>
      </div>
    );
  }

  if (state!.items.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-medium mb-4 text-[#b3b3b3]">Your cart is empty</h2>
          <p className="text-[#b3b3b3]/70 mb-6">Add some products to your cart before checking out</p>
          <Link href="/shop" className="inline-block bg-[#b3b3b3] text-black px-6 py-2 rounded hover:bg-white transition-colors duration-300">
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm(state!.items.length, shippingConfigError)) return;

    setIsSubmitting(true);
    setOrderError(null);

    try {
      const orderData = {
        customer: {
          name: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          address: formData.address.trim(),
          apartment: formData.apartment.trim(),
          city: formData.city,
          governorate: selectedGovernorate?.governorate || ''
        },
        products: state!.items.map((item: any) => {
          const variantKey = item.variant?.name || 'default';
          const priceKey = `${item.id}_${variantKey}`;
          const correctPrice = refreshedPrices[priceKey] || item.price;

          return {
            productId: item.id,
            name: item.name,
            price: correctPrice,
            quantity: item.quantity,
            size: item.variant?.name || undefined,
            color: item.variant?.color || undefined,
            image: item.image
          };
        }),
        paymentMethod: formData.paymentMethod,
        transactionScreenshot: formData.transactionScreenshot,
        totalAmount: totalWithShipping,
        subtotal: refreshedSubtotal,
        shippingCost: shippingCost,
        codFee: codFee,
        promoCode: appliedPromo ? appliedPromo.code : '',
        discountAmount: discountAmount,
        notes: formData.notes.trim(),
        status: 'pending',
        orderDate: new Date().toISOString()
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        sessionStorage.setItem('lastOrder', JSON.stringify({
          orderId: data.order.orderId,
          paymentMethod: formData.paymentMethod,
          totalAmount: totalWithShipping,
          customer: data.order.customer
        }));

        clearCart!();
        window.location.href = `/thankyou?orderId=${data.order.orderId}`;
      } else {
        setOrderError(data.error || 'Something went wrong with your order');
      }
    } catch (error) {
      console.error('Order submission error:', error);
      setOrderError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Nav />
      <div className="min-h-screen bg-stone-900 pt-20 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-white">
          <Link href="/cart" className="inline-flex items-center gap-2 text-white hover:text-gray-300 mb-8 transition-colors duration-300">
            <span>←</span>
            <span>Back to cart</span>
          </Link>

          <h1 className="text-4xl md:text-5xl font-light mb-12">CHECKOUT</h1>

          {orderError && (
            <div className="mb-8 p-4 bg-red-900 border border-red-600 text-red-300 rounded">
              <h3 className="font-medium mb-2 text-white">Order Submission Failed</h3>
              <p className="text-red-300">{orderError}</p>
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-12">
            {/* Checkout Form */}
            <div className="flex-1">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-sm font-medium mb-1 ">
                      First Name *
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className={`w-full p-3 bg-transparent border border-white text-white focus:outline-none focus:border-gray-400 transition-colors duration-300 ${errors.firstName ? 'border-red-500' : ''}`}
                    />
                    {errors.firstName && (
                      <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className={`w-full p-3 bg-transparent border border-white text-white focus:outline-none focus:border-gray-400 transition-colors duration-300 ${errors.lastName ? 'border-red-500' : ''}`}
                    />
                    {errors.lastName && (
                      <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Phone Number (Egypt) *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="01xxxxxxxxx"
                    className={`w-full p-3 bg-transparent border border-white text-white focus:outline-none focus:border-gray-400 transition-colors duration-300 ${errors.phone ? 'border-red-500' : ''}`}
                  />
                  {errors.phone && (
                    <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full p-3 bg-transparent border border-white text-white focus:outline-none focus:border-gray-400 transition-colors duration-300 ${errors.email ? 'border-red-500' : ''}`}
                  />
                  {errors.email && (
                    <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                  )}
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Payment Method *
                  </label>
                  <div className="space-y-3">
                    {paymentSettings.codEnabled && (
                      <div className="flex items-center">
                        <div className="relative">
                          <input
                            type="radio"
                            id="cashOnDelivery"
                            name="paymentMethod"
                            value="cashOnDelivery"
                            checked={formData.paymentMethod === 'cashOnDelivery'}
                            onChange={handleInputChange}
                            className="sr-only"
                          />
                          <div className={`w-4 h-4 rounded-full border-2 border-white mr-2 flex items-center justify-center cursor-pointer ${formData.paymentMethod === 'cashOnDelivery' ? 'bg-white' : 'bg-transparent'
                            }`} onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'cashOnDelivery' }))}>
                            {formData.paymentMethod === 'cashOnDelivery' && (
                              <div className="w-2 h-2 rounded-full bg-black"></div>
                            )}
                          </div>
                        </div>
                        <label htmlFor="cashOnDelivery" className="text-sm cursor-pointer" onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'cashOnDelivery' }))}>Cash on Delivery</label>
                      </div>
                    )}

                    <div className="flex items-center">
                      <div className="relative">
                        <input
                          type="radio"
                          id="instaPay"
                          name="paymentMethod"
                          value="instaPay"
                          checked={formData.paymentMethod === 'instaPay'}
                          onChange={handleInputChange}
                          className="sr-only"
                        />
                        <div className={`w-4 h-4 rounded-full border-2 border-white mr-2 flex items-center justify-center cursor-pointer ${formData.paymentMethod === 'instaPay' ? 'bg-white' : 'bg-transparent'
                          }`} onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'instaPay' }))}>
                          {formData.paymentMethod === 'instaPay' && (
                            <div className="w-2 h-2 rounded-full bg-black"></div>
                          )}
                        </div>
                      </div>
                      <label htmlFor="instaPay" className="text-sm cursor-pointer" onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'instaPay' }))}>Pay with InstaPay</label>
                    </div>
                  </div>
                </div>

                {/* InstaPay Upload */}
                {formData.paymentMethod === 'instaPay' && (
                  <div className="p-4 border border-gray-600 rounded-md bg-white/5">
                    <div className="mb-4">
                      <h3 className="font-medium mb-2 text-white">InstaPay Payment Instructions</h3>
                      <p className="text-sm mb-2 text-gray-300">Click the link to send money to:</p>
                      <p className="font-medium mb-2 text-white">muhamed.alkady@instapay</p>
                      <p className="text-sm mb-2 text-gray-300">Powered by InstaPay:</p>
                      <a
                        href="https://ipn.eg/S/muhamed.alkady/instapay/8kB0I3"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white underline text-sm hover:text-gray-300"
                      >
                        https://ipn.eg/S/muhamed.alkady/instapay/8kB0I3
                      </a>
                    </div>

                    <div className="mb-2">
                      <label className="block text-sm font-medium mb-1 text-white">
                        Upload Transaction Screenshot *
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        disabled={isUploading}
                        className="block w-full text-sm text-white file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-white file:text-black hover:file:bg-gray-200"
                      />
                      {isUploading && <p className="text-sm text-yellow-400 mt-2">Uploading image...</p>}
                      {errors.transactionScreenshot && (
                        <p className="text-red-500 text-sm mt-1">{errors.transactionScreenshot}</p>
                      )}
                    </div>

                    {screenShotPreview && (
                      <div className="mt-3">
                        <p className="text-sm font-medium mb-1 text-white">Preview (Uploaded!):</p>
                        <div className="relative w-40 h-40 border border-gray-500 rounded bg-black">
                          <Image
                            src={screenShotPreview}
                            alt="Transaction screenshot"
                            fill
                            className="object-contain"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Address *
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className={`w-full p-3 bg-transparent border border-white text-white focus:outline-none focus:border-gray-400 transition-colors duration-300 ${errors.address ? 'border-red-500' : ''}`}
                  />
                  {errors.address && (
                    <p className="text-red-500 text-sm mt-1">{errors.address}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Apartment
                  </label>
                  <input
                    type="text"
                    name="apartment"
                    value={formData.apartment}
                    onChange={handleInputChange}
                    className={`w-full p-3 bg-transparent border border-white text-white focus:outline-none focus:border-gray-400 transition-colors duration-300 ${errors.apartment ? 'border-red-500' : ''}`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Governorate *
                  </label>
                  <div className="relative">
                    {loadingCities ? (
                      <div className="w-full p-3 bg-white/10 border border-white/50 text-white rounded flex animate-pulse items-center">
                        <div className="h-4 w-32 bg-gray-500 rounded"></div>
                      </div>
                    ) : (
                      <select
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        className={`w-full p-3 bg-transparent border border-white text-white focus:outline-none focus:border-gray-400 transition-colors duration-300 appearance-none ${errors.city ? 'border-red-500' : ''}`}
                      >
                        <option value="" className="bg-stone-900 text-white">Select a governorate</option>
                        {cities.filter((city: any) => city.isActive).map((city: any) => (
                          <option key={city._id} value={city.cityName} className="bg-stone-900 text-white">
                            {city.governorate} (L.E {city.shippingCost})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  {errors.city ? (
                    <p className="text-red-500 text-sm mt-1">{errors.city}</p>
                  ) : shippingConfigError ? (
                    <p className="text-red-500 text-sm mt-1">{shippingConfigError}</p>
                  ) : null}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Promo Code (Optional)
                  </label>
                  <input
                    type="text"
                    name="promoCode"
                    value={formData.promoCode}
                    onChange={handleInputChange}
                    placeholder="Enter promo code"
                    className={`w-full p-3 bg-transparent border border-white text-white focus:outline-none focus:border-gray-400 transition-colors duration-300 ${errors.promoCode ? 'border-red-500' : ''}`}
                  />
                  {errors.promoCode && (
                    <p className="text-red-500 text-sm mt-1">{errors.promoCode}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => applyPromoCode(formData.promoCode)}
                    disabled={!formData.promoCode.trim()}
                    className="mt-2 px-4 py-2 bg-black text-white border border-white hover:bg-white hover:text-black disabled:cursor-not-allowed transition-colors duration-300 text-sm"
                  >
                    Apply Code
                  </button>
                  {promoError && (
                    <p className="text-red-400 text-sm mt-1">{promoError}</p>
                  )}
                  {appliedPromo && (
                    <p className="text-green-400 text-sm mt-1">
                      ✅ Applied: {appliedPromo.discountType === 'percentage'
                        ? `${appliedPromo.discountValue}% off`
                        : `L.E ${appliedPromo.discountValue} off`}
                      {appliedPromo.description && ` - ${appliedPromo.description}`}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    className={`w-full p-3 bg-transparent border border-white text-white focus:outline-none focus:border-gray-400 transition-colors duration-300 ${errors.notes ? 'border-red-500' : ''}`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || isUploading}
                  className="w-full p-3 bg-white text-black rounded-md hover:bg-gray-200 focus:outline-none transition-colors duration-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Processing...' : isUploading ? 'Uploading Image...' : 'Place Order'}
                </button>
              </form>
            </div>

            {/* Order Summary */}
            <div className="w-full lg:w-1/3 bg-black border border-white p-6 rounded-lg h-fit">
              <h2 className="text-xl font-medium mb-4 text-white">Order Summary</h2>

              <div className="space-y-4 mb-6">
                {state!.items.map((item: any) => (
                  <div key={`${item.id}-${item.variant?.size}-${item.variant?.color}`} className="flex items-center gap-4">
                    <div className="w-16 h-16 relative bg-gray-800 overflow-hidden">
                      {item.image && (
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          sizes="64px"
                          style={{ objectFit: 'cover' }}
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-white">{item.name}</h3>
                      <p className="text-sm text-gray-300">
                        {item.variant?.size}{item.variant?.color ? `, ${item.variant?.color}` : ''} × {item.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-white">L.E {((refreshedPrices[`${item.id}_${item.variant?.name || 'default'}`] || item.price) * item.quantity).toFixed(0)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-600 pt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-white">Subtotal</span>
                  <span className="text-white">L.E {refreshedSubtotal.toFixed(0)}</span>
                </div>
                {appliedPromo && (
                  <div className="flex justify-between text-green-400">
                    <span>Discount ({appliedPromo.code})</span>
                    <span>- L.E {discountAmount.toFixed(0)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-white">Shipping</span>
                  <span className={shouldWaiveShipping ? "text-green-400" : "text-white"}>
                    {!selectedGovernorate
                      ? 'Select a governorate'
                      : shouldWaiveShipping
                        ? 'Free'
                        : `L.E ${shippingCost}`
                    }
                  </span>
                </div>
                {formData.paymentMethod === 'cashOnDelivery' && codFee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-white">Cash on Delivery Fee</span>
                    <span className="text-white">L.E {codFee}</span>
                  </div>
                )}
                <div className="flex justify-between font-medium text-lg pt-2 border-t border-gray-600">
                  <span className="text-white">Total</span>
                  <span className="text-white">L.E {totalWithShipping.toFixed(0)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

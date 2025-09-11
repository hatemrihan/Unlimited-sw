"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Nav from '../sections/Nav';
import { useCart } from '../../contexts/CartContext';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  size?: string;
  color?: string;
  image: string;
  discount?: number;
}

interface FormData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  apartment: string;
  city: string;
  notes: string;
  promoCode: string;
  paymentMethod: 'cashOnDelivery' | 'instaPay' | 'paymob';
  transactionScreenshot: any;
}

interface City {
  _id: string;
  cityName: string;
  governorate: string;
  shippingCost: number;
  codFee: number;
  isActive: boolean;
}

export default function CheckoutPage() {
  const router = useRouter();
  
  // All hooks must be called at the top level - BEFORE any conditional logic
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    address: '',
    apartment: '',
    city: '',
    notes: '',
    promoCode: '',
    paymentMethod: 'cashOnDelivery',
    transactionScreenshot: null
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [screenShotPreview, setScreenShotPreview] = useState<string | null>(null);
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [cities, setCities] = useState<City[]>([]);
  const [loadingCities, setLoadingCities] = useState(true);
  
  // Safe cart access with error handling
  const cartContext = useCart();

  // Fetch cities with product-specific pricing on component mount
  useEffect(() => {
    if (!cartContext?.state?.items?.length) {
      setLoadingCities(false);
      return; // Early return if no cart context or items
    }
    
    const fetchCities = async () => {
      try {
        // Get product IDs from cart
        const productIds = cartContext.state.items.map(item => item.id).join(',');
        
        // Fetch cities with product-specific pricing
        const response = await fetch(`/api/checkout/cities${productIds ? `?productIds=${productIds}` : ''}`);
        if (response.ok) {
          const data = await response.json();
          setCities(data.cities || []);
          console.log('✅ Loaded cities with product-specific pricing');
        } else {
          console.error('Failed to fetch cities');
        }
      } catch (error) {
        console.error('Error fetching cities:', error);
      } finally {
        setLoadingCities(false);
      }
    };

    fetchCities();
  }, [cartContext?.state?.items]); // Re-fetch when cart items change

  // Handle loading state and missing cart context
  if (!cartContext) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-medium mb-4">Loading...</h2>
          <p>Please wait while we load your cart.</p>
        </div>
      </div>
    );
  }

  const { state, clearCart } = cartContext;

  // Handle empty cart
  if (state.items.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center" suppressHydrationWarning>
        <div className="text-center">
          <h2 className="text-2xl font-medium mb-4 text-[#b3b3b3]">Your cart is empty</h2>
          <p className="text-[#b3b3b3]/70 mb-6">Add some products to your cart before checking out</p>
          <Link
            href="/shop"
            className="inline-block bg-[#b3b3b3] text-black px-6 py-2 rounded hover:bg-white transition-colors duration-300"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  // Calculate shipping cost based on selected governorate
  const selectedGovernorate = cities.find(city => city.cityName === formData.city);
  
  // Calculate shipping cost: ONLY product-specific rates (NO GLOBAL DEFAULTS)
  let shippingCost = 0;
  let codFee = 0;
  
  if (selectedGovernorate) {
    // Check if products have specific shipping rates
    let hasProductSpecificRates = false;
    let maxProductShippingCost = 0;
    let maxProductCodFee = 0;
    
    for (const item of state.items) {
      const productSpecificPricing = (selectedGovernorate as any).productPricing?.[item.id];
      if (productSpecificPricing && productSpecificPricing.isActive !== false) {
        hasProductSpecificRates = true;
        // Use product-specific shipping cost and COD fee
        maxProductShippingCost = Math.max(maxProductShippingCost, productSpecificPricing.shippingCost || 0);
        maxProductCodFee = Math.max(maxProductCodFee, productSpecificPricing.codFee || 0);
      }
    }
    
    if (hasProductSpecificRates) {
      // Use the highest product-specific shipping cost and COD fee
      shippingCost = maxProductShippingCost;
      codFee = maxProductCodFee;
      console.log(`✅ Using product-specific rates: shipping=${shippingCost}, cod=${codFee}`);
    } else {
      // NO GLOBAL DEFAULTS - Show error if no product-specific rates
      console.error('❌ No product-specific shipping rates found');
      setOrderError('Shipping costs not configured for selected products. Please contact support.');
      return;
    }
  }
  
  // Apply COD fee only for cash on delivery payment method
  const finalCodFee = formData.paymentMethod === 'cashOnDelivery' ? codFee : 0;
  const discountAmount = appliedPromo ? appliedPromo.discount : 0;
  const subtotalAfterDiscount = Math.max(0, state.total - discountAmount);
  const totalWithShipping = subtotalAfterDiscount + shippingCost + finalCodFee;

  // Apply promo code
  const applyPromoCode = async () => {
    if (!formData.promoCode.trim()) {
      setPromoError('Please enter a promo code');
      return;
    }

    try {
      const response = await fetch('/api/promo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: formData.promoCode,
          orderTotal: state.total
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setAppliedPromo(data.promo);
        setPromoError(null);
        console.log('✅ Promo code applied:', data.promo);
      } else {
        setPromoError(data.error || 'Invalid promo code');
        setAppliedPromo(null);
      }
    } catch (error) {
      console.error('❌ Promo code validation error:', error);
      setPromoError('Failed to validate promo code');
      setAppliedPromo(null);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Validate customer information
    if (!formData.firstName?.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName?.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email?.trim()) newErrors.email = 'Email is required';
    if (!formData.phone?.trim()) newErrors.phone = 'Phone number is required';
    if (!formData.address?.trim()) newErrors.address = 'Address is required';
    if (!formData.city) newErrors.city = 'Please select a governorate';

    // Validate payment method
    if (!formData.paymentMethod) {
      newErrors.paymentMethod = 'Please select a payment method';
    } else if (formData.paymentMethod === 'instaPay' && !formData.transactionScreenshot) {
      newErrors.transactionScreenshot = 'Transaction screenshot is required for InstaPay';
    }

    // Validate cart has items
    if (!state.items || state.items.length === 0) {
      setOrderError('Your cart is empty');
      return false;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // Handle Paymob payment
      if (formData.paymentMethod === 'paymob') {
        // Prepare order data for Paymob
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
          products: state.items.map((item: any) => ({
            productId: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            variant: item.variant ? {
              name: item.variant.name
            } : undefined,
            image: item.image
          })),
          paymentMethod: formData.paymentMethod,
          totalAmount: totalWithShipping,
          subtotal: state.total,
          shippingCost: shippingCost,
          promoCode: appliedPromo ? appliedPromo.code : '',
          discountAmount: discountAmount,
          status: 'pending',
          notes: formData.notes || '',
          orderDate: new Date().toISOString()
        };

        // Create order first
        const orderResponse = await fetch('/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(orderData),
        });

        const orderData_result = await orderResponse.json();

        if (orderResponse.ok && orderData_result.success) {
          // Get Paymob payment URL
          const paymobResponse = await fetch('/api/paymob/create-payment', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              orderId: orderData_result.order.orderId,
              amount: totalWithShipping,
              customer: orderData.customer,
              products: orderData.products
            }),
          });

          const paymobData = await paymobResponse.json();

          if (paymobResponse.ok && paymobData.success) {
            // Redirect to Paymob payment page
            window.location.href = paymobData.payment_url;
            return;
          } else {
            setOrderError(paymobData.error || 'Failed to create Paymob payment');
            setIsSubmitting(false);
            return;
          }
        } else {
          setOrderError(orderData_result.error || 'Failed to create order');
          setIsSubmitting(false);
          return;
        }
      }

      // Handle screenshot upload if InstaPay is selected
      let screenshotUrl = null;
      if (formData.paymentMethod === 'instaPay' && formData.transactionScreenshot) {
        try {
          const formDataForImage = new FormData();
          formDataForImage.append('file', formData.transactionScreenshot);
          formDataForImage.append('upload_preset', 'kleankuts_upload');
          formDataForImage.append('folder', 'transaction_screenshots');

          const response = await fetch('https://api.cloudinary.com/v1_1/dvcs7czio/image/upload', {
            method: 'POST',
            body: formDataForImage
          });

          if (response.ok) {
            const data = await response.json();
            screenshotUrl = data.secure_url;
          }
        } catch (uploadError) {
          console.error('Error uploading screenshot:', uploadError);
          setOrderError('Failed to upload transaction screenshot');
          setIsSubmitting(false);
          return;
        }
      }

      // Prepare order data for other payment methods
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
        products: state.items.map((item: any) => ({
          productId: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          variant: item.variant ? {
            name: item.variant.name
          } : undefined,
          image: item.image
        })),
        paymentMethod: formData.paymentMethod,
        transactionScreenshot: screenshotUrl,
        totalAmount: totalWithShipping,
        subtotal: state.total,
        shippingCost: shippingCost,
        promoCode: appliedPromo ? appliedPromo.code : '',
        discountAmount: discountAmount,
        notes: formData.notes.trim(),
        status: 'pending',
        orderDate: new Date().toISOString()
      };

      // Submit order to your API
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Store order details for thank you page
        sessionStorage.setItem('lastOrder', JSON.stringify({
          orderId: data.order.orderId,
          paymentMethod: formData.paymentMethod,
          totalAmount: totalWithShipping,
          customer: data.order.customer
        }));

        clearCart();
        // Use window.location for reliable redirect
        window.location.href = `/thankyou?orderId=${data.order.orderId}`;
      } else {
        setOrderError(data.error || 'Something went wrong with your order');
      }
    } catch (error: any) {
      console.error('Order submission error:', error);
      setOrderError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (errors[name as keyof FormData]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name as keyof FormData];
        return newErrors;
      });
    }

    if (orderError) {
      setOrderError(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];

      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        setErrors(prev => ({
          ...prev,
          transactionScreenshot: 'File size must be less than 5MB'
        }));
        return;
      }

      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({
          ...prev,
          transactionScreenshot: 'Only image files are allowed'
        }));
        return;
      }

      setFormData(prev => ({ ...prev, transactionScreenshot: file }));

      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenShotPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.transactionScreenshot;
        return newErrors;
      });
    }
  };

  return (
    <>
      <Nav />
      <div className="min-h-screen bg-black pt-20">
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
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
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

                {/* Payment Method Selection */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Payment Method *
                  </label>
                  <div className="space-y-3">
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
                        <div className={`w-4 h-4 rounded-full border-2 border-white mr-2 flex items-center justify-center cursor-pointer ${
                          formData.paymentMethod === 'cashOnDelivery' ? 'bg-black' : 'bg-transparent'
                        }`} onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'cashOnDelivery' }))}>
                          {formData.paymentMethod === 'cashOnDelivery' && (
                            <div className="w-2 h-2 rounded-full bg-white"></div>
                          )}
                        </div>
                      </div>
                      <label htmlFor="cashOnDelivery" className="text-sm cursor-pointer" onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'cashOnDelivery' }))}>Cash on Delivery</label>
                    </div>

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
                        <div className={`w-4 h-4 rounded-full border-2 border-white mr-2 flex items-center justify-center cursor-pointer ${
                          formData.paymentMethod === 'instaPay' ? 'bg-black' : 'bg-transparent'
                        }`} onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'instaPay' }))}>
                          {formData.paymentMethod === 'instaPay' && (
                            <div className="w-2 h-2 rounded-full bg-white"></div>
                          )}
                        </div>
                      </div>
                      <label htmlFor="instaPay" className="text-sm cursor-pointer" onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'instaPay' }))}>Pay with InstaPay</label>
                    </div>

                    <div className="flex items-center">
                      <div className="relative">
                        <input
                          type="radio"
                          id="paymob"
                          name="paymentMethod"
                          value="paymob"
                          checked={formData.paymentMethod === 'paymob'}
                          onChange={handleInputChange}
                          className="sr-only"
                        />
                        <div className={`w-4 h-4 rounded-full border-2 border-white mr-2 flex items-center justify-center cursor-pointer ${
                          formData.paymentMethod === 'paymob' ? 'bg-black' : 'bg-transparent'
                        }`} onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'paymob' }))}>
                          {formData.paymentMethod === 'paymob' && (
                            <div className="w-2 h-2 rounded-full bg-white"></div>
                          )}
                        </div>
                      </div>
                      <label htmlFor="paymob" className="text-sm cursor-pointer" onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'paymob' }))}>PAY WITH PAYMOB</label>
                    </div>
                  </div>
                </div>

                {/* Paymob Coming Soon Message */}
                {formData.paymentMethod === 'paymob' && (
                  <div className="p-4 border border-gray-300 dark:border-gray-600 rounded-md">
                    <div className="flex items-center justify-center">
                      <div className="text-center">
                        <h3 className="font-medium mb-2 text-white">💳 Visa Payment</h3>
                        <p className="text-sm text-gray-300">Visa payment is coming soon</p>
                        <p className="text-xs text-gray-400 mt-1">Please select another payment method for now</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* InstaPay Instructions and Screenshot Upload */}
                {formData.paymentMethod === 'instaPay' && (
                  <div className="p-4 border border-gray-300 dark:border-gray-600 rounded-md">
                    <div className="mb-4">
                      <h3 className="font-medium mb-2">InstaPay Payment Instructions</h3>
                      <p className="text-sm mb-2">Click the link to send money to:</p>
                      <p className="font-medium mb-2">muhamed.alkady@instapay</p>
                      <p className="text-sm mb-2">Powered by InstaPay:</p>
                      <a
                        href="https://ipn.eg/S/muhamed.alkady/instapay/8kB0I3"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 underline text-sm"
                      >
                        https://ipn.eg/S/muhamed.alkady/instapay/8kB0I3
                      </a>
                    </div>

                    <div className="mb-2">
                      <label className="block text-sm font-medium mb-1">
                        Upload Transaction Screenshot *
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="block w-full text-sm text-white file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-white file:text-black hover:file:bg-gray-200"
                      />
                      {errors.transactionScreenshot && (
                        <p className="text-red-500 text-sm mt-1">{errors.transactionScreenshot}</p>
                      )}
                    </div>

                    {/* Preview of the screenshot */}
                    {screenShotPreview && (
                      <div className="mt-3">
                        <p className="text-sm font-medium mb-1">Preview:</p>
                        <div className="relative w-40 h-40 border border-gray-300">
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

                {/* Paymob Payment Instructions */}
                {formData.paymentMethod === 'paymob' && (
                  <div className="p-4 border border-gray-300 dark:border-gray-600 rounded-md">
                    <div className="mb-4">
                      <h3 className="font-medium mb-2">Paymob Payment Instructions</h3>
                      <p className="text-sm mb-2">You will be redirected to Paymob's secure payment gateway to complete your payment.</p>
                      <p className="text-sm mb-2">Supported payment methods:</p>
                      <ul className="text-sm list-disc list-inside space-y-1 text-gray-300">
                        <li>Credit/Debit Cards (Visa, Mastercard)</li>
                        <li>Mobile Wallets (Fawry, Valu)</li>
                        <li>Bank Transfer</li>
                        <li>Cash on Delivery (COD)</li>
                      </ul>
                    </div>
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
                  <select
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    className={`w-full p-3 bg-transparent border border-white text-white focus:outline-none focus:border-gray-400 transition-colors duration-300 ${errors.city ? 'border-red-500' : ''}`}
                  >
                    <option value="" className="bg-black text-white">
                      {loadingCities ? 'Loading governorates...' : 'Select a governorate'}
                    </option>
                    {cities
                      .filter(city => city.isActive)
                      .map((city) => (
                        <option key={city._id} value={city.cityName} className="bg-black text-white">
                          {city.governorate} (L.E {city.shippingCost})
                        </option>
                      ))}
                  </select>
                  {errors.city && (
                    <p className="text-red-500 text-sm mt-1">{errors.city}</p>
                  )}
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
                    onClick={applyPromoCode}
                    disabled={!formData.promoCode.trim()}
                    className="mt-2 px-4 py-2 bg-black white border border-white hover:bg-white hover:text-black not-allowed transition-colors duration-300 text-sm"
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
                  disabled={isSubmitting}
                  className="w-full p-3 bg-white text-black rounded-md hover:bg-gray-200 focus:outline-none transition-colors duration-300 font-medium"
                >
                  {isSubmitting ? 'Processing...' : 'Place Order'}
                </button>
              </form>
            </div>

            {/* Order Summary */}
            <div className="w-full lg:w-1/3 bg-black border bowhite p-6 rounded-lg h-fit">
              <h2 className="text-xl font-medium mb-4 text-white">Order Summary</h2>

              <div className="space-y-4 mb-6">
                {state.items.map((item: any) => (
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
                      <p className="text-white">L.E {(item.price * item.quantity).toFixed(0)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-600 pt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-white">Subtotal</span>
                  <span className="text-white">L.E {state.total.toFixed(0)}</span>
                </div>
                {appliedPromo && (
                  <div className="flex justify-between text-green-400">
                    <span>Discount ({appliedPromo.code})</span>
                    <span>- L.E {discountAmount.toFixed(0)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-white">Shipping</span>
                  <span className="text-white">
                    {selectedGovernorate ? `L.E ${shippingCost}` : 'Select a governorate'}
                  </span>
                </div>
                {formData.paymentMethod === 'cashOnDelivery' && finalCodFee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-white">COD Fee</span>
                    <span className="text-white">L.E {finalCodFee}</span>
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

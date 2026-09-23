"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Nav from '../sections/Nav';
import { useCart, CartItem } from '../../contexts/CartContext';
import { useCheckoutPricing } from './hooks/useCheckoutPricing';
import { useCheckoutForm } from './hooks/useCheckoutForm';
import { City } from './types';
import { newClientOrderId } from '../../lib/clientOrderId';
import { track, getSessionId, isEnabled } from '../../analytics/client/track';
import { META_PURCHASE_STORAGE_KEY } from '../../analytics/client/metaPixel';

/**
 * One way of writing an amount, across the whole checkout.
 *
 * The cart showed "L.E 1,500" and this page showed "L.E 1500" for the same
 * order, because one used `toLocaleString()` and the other `toFixed(0)`. Small,
 * but it is the screen where a customer is deciding whether to hand over money,
 * and two spellings of their total invites a second look at the wrong moment.
 *
 * Rounded, matching what the server stores.
 */
const egp = (amount: number) => Math.round(amount).toLocaleString();

export default function CheckoutPage() {
  const router = useRouter();
  const [paymentSettings, setPaymentSettings] = useState({ codEnabled: true, instaPayEnabled: true });
  const [orderError, setOrderError] = useState<string | null>(null);
  const [stockWarning, setStockWarning] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * This checkout attempt's id, held across re-renders and across retries.
   *
   * `isSubmitting` already stops a double-click, but it cannot help with the
   * failure that actually costs money: the request commits and the response is
   * lost, the button comes back, and the customer presses it again. Both
   * requests carry this same value, so the second is recognised as the retry it
   * is. Re-minted on success, so someone who really does order twice is not
   * handed their previous order.
   */
  const clientOrderIdRef = useRef<string>('');
  if (!clientOrderIdRef.current) clientOrderIdRef.current = newClientOrderId();

  const { state, clearCart, refreshPrices } = useCart();
  /** Set when the server refused because its prices disagree with ours. */
  const [priceMismatch, setPriceMismatch] = useState(false);
  const [isRefreshingPrices, setIsRefreshingPrices] = useState(false);
  const cartItems = useMemo(() => state.items, [state.items]);

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
    freeShippingActive,
    applyPromoCode,
  } = useCheckoutPricing({
    cartItems,
    paymentMethod: formData.paymentMethod,
    cityName: formData.city,
  });

  useEffect(() => {
    // Reads the admin's payment-method switches. This used to be hardcoded to
    // `true` for both, which made the admin toggle decorative — turning Cash on
    // Delivery off changed nothing here.
    //
    // On failure both methods stay enabled (the state's initial value): a
    // database hiccup must never stop customers being able to pay.
    let cancelled = false;

    fetch('/api/payment-methods')
      .then(response => (response.ok ? response.json() : null))
      .then(data => {
        if (cancelled || !data?.methods) return;

        setPaymentSettings(data.methods);

        // If the currently selected method has just been switched off, move the
        // customer to one that still works rather than leaving a dead selection.
        setFormData(previous => {
          if (previous.paymentMethod === 'cashOnDelivery' && !data.methods.codEnabled) {
            return { ...previous, paymentMethod: 'instaPay' };
          }
          if (previous.paymentMethod === 'instaPay' && !data.methods.instaPayEnabled) {
            return { ...previous, paymentMethod: 'cashOnDelivery' };
          }
          return previous;
        });
      })
      .catch(() => {
        /* keep both enabled */
      });

    return () => {
      cancelled = true;
    };
  }, [setFormData]);

  /**
   * InitiateCheckout — someone reached the form with something in their cart.
   *
   * Fired once, on the first render that has items, and guarded by a ref rather
   * than by an empty dependency array: the cart arrives asynchronously from
   * localStorage, so an effect that runs on mount alone would fire before there
   * is anything to report and record a checkout of zero items. Without the ref,
   * depending on the cart would fire again on every quantity change.
   */
  const checkoutTracked = useRef(false);
  useEffect(() => {
    if (checkoutTracked.current || cartItems.length === 0) return;

    checkoutTracked.current = true;
    track('InitiateCheckout', {
      itemCount: cartItems.reduce((sum, item) => sum + item.quantity, 0),
      value: cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
      currency: 'EGP',
      source: 'client',
    });
  }, [cartItems]);

  // Check availability on mount so a customer learns an item is gone before
  // filling in the whole form, not after submitting it. Advisory only — the
  // order transaction is still the authority.
  useEffect(() => {
    if (cartItems.length === 0) return;

    let cancelled = false;

    (async () => {
      try {
        const response = await fetch('/api/cart/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: cartItems.map(item => ({
              productId: item.id,
              variantName: item.variant?.name,
              quantity: item.quantity,
            })),
          }),
        });

        if (!response.ok || cancelled) return;

        const data = await response.json();
        if (cancelled || data.allAvailable) return;

        const unavailable = (data.lines || []).filter((line: any) => !line.ok);
        const names = unavailable
          .map((line: any) => {
            const item = cartItems.find(i => i.id === line.productId);
            return `${item?.name || 'an item'}${line.variantName ? ` (${line.variantName})` : ''}`;
          })
          .join('، ');

        setStockWarning(`Availability changed for: ${names}. Please review your cart before continuing.`);
      } catch {
        // Advisory check — a failure here must not block the form.
      }
    })();

    return () => { cancelled = true; };
  }, [cartItems]);

  if (!state) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (cartItems.length === 0) {
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

    if (!validateForm(cartItems.length, shippingConfigError)) return;

    setIsSubmitting(true);
    setOrderError(null);

    try {
      // The last-resort client migration for pre-MongoDB product ids used to
      // sit here, fetching the entire catalogue on the submit path to rename an
      // id by matching product names. It was the fourth copy of one idea — the
      // cart context, the cart page, here, and `resolveLegacyProductIds` on the
      // server. Only the server's copy runs where a customer cannot skip it,
      // and it already logs when it fires, so the three client copies are gone.
      const resolvedItems = cartItems;

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
        products: resolvedItems.map((item: CartItem) => {
          const variantKey = item.variant?.name || 'default';
          const priceKey = `${item.id}_${variantKey}`;
          const correctPrice = refreshedPrices[priceKey] || item.price;

          return {
            productId: item.id,
            name: item.name,
            price: correctPrice,
            quantity: item.quantity,
            // Explicit variant identity for the stock engine. `size`/`color` stay
            // for display and for the server's legacy fallback.
            variant: item.variant?.name ? { name: item.variant.name, color: item.variant.color } : undefined,
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
        // No `orderDate`. The browser used to send one and the server ignored
        // it, setting its own — two clocks for one fact, where the customer's
        // is the one that can be wrong or lied about. Removed so nobody later
        // "fixes" the server by trusting it.
        clientOrderId: clientOrderIdRef.current,
        // Lets the funnel join this purchase back to the browsing that led to
        // it. Omitted when tracking is off or storage is blocked — the server
        // records the purchase either way, and only the join is lost.
        sessionId: isEnabled() ? getSessionId() : undefined
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
        try {
          sessionStorage.setItem('lastOrder', JSON.stringify({
            orderId: data.order.orderId,
            paymentMethod: formData.paymentMethod,
            totalAmount: totalWithShipping,
            customer: data.order.customer
          }));

          // Separate hand-off for the Meta Pixel Purchase event.
          // Deliberately excludes customer name, email, phone, and address —
          // the adapter's parser drops unknown keys as a second safety net.
          sessionStorage.setItem(META_PURCHASE_STORAGE_KEY, JSON.stringify({
            orderId: data.order.orderId,
            value: totalWithShipping,
            items: cartItems.map(item => ({
              id: item.id,
              quantity: item.quantity,
              itemPrice: item.price,
            })),
          }));
        } catch (e) {
          // Safely catch scenarios where storage is disabled / full
        }

        // This attempt is spent. A customer who comes back and orders again is
        // making a new purchase, not retrying this one.
        clientOrderIdRef.current = newClientOrderId();

        clearCart();
        router.push(`/thankyou?orderId=${data.order.orderId}`);
      } else {
        setOrderError(data.error || 'Something went wrong with your order');
        // A pricing mismatch is the one failure the customer can fix in place,
        // so the error box offers the fix rather than telling them to reload a
        // form they have just spent two minutes filling in.
        setPriceMismatch(data.code === 'PRICING_MISMATCH' || data.code === 'PROMO_REJECTED');
      }
    } catch (error) {
      setOrderError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Pulls current prices and clears the mismatch, keeping the filled-in form.
   *
   * The server was already right to refuse — the customer must never be charged
   * a number they did not see. What was missing was any way to act on it.
   */
  const handleRefreshPrices = async () => {
    setIsRefreshingPrices(true);
    try {
      const refreshed = await refreshPrices();
      if (refreshed) {
        setOrderError(null);
        setPriceMismatch(false);
        setStockWarning(null);
      } else {
        setOrderError('We could not reach the server to check prices. Please check your connection and try again.');
      }
    } finally {
      setIsRefreshingPrices(false);
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
              <h3 className="font-medium mb-2 text-white">
                {priceMismatch ? 'Prices Changed' : 'Order Submission Failed'}
              </h3>
              <p className="text-red-300">{orderError}</p>

              {priceMismatch && (
                <button
                  type="button"
                  onClick={handleRefreshPrices}
                  disabled={isRefreshingPrices}
                  className="mt-3 px-4 py-2 bg-white text-black text-sm font-medium rounded hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  {isRefreshingPrices ? 'Updating prices…' : 'Update prices and review'}
                </button>
              )}
            </div>
          )}

          {stockWarning && (
            <div className="mb-8 p-4 bg-amber-900/60 border border-amber-600 rounded">
              <p className="text-amber-200">{stockWarning}</p>
              <Link href="/cart" className="mt-2 inline-block underline text-amber-100">
                Back to cart
              </Link>
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
                        <label className="flex items-center cursor-pointer w-full group">
                          <input
                            type="radio"
                            id="cashOnDelivery"
                            name="paymentMethod"
                            value="cashOnDelivery"
                            checked={formData.paymentMethod === 'cashOnDelivery'}
                            onChange={handleInputChange}
                            className="sr-only"
                          />
                          <div className={`w-4 h-4 rounded-full border-2 border-white mr-2 flex items-center justify-center ${formData.paymentMethod === 'cashOnDelivery' ? 'bg-white' : 'bg-transparent'
                            }`}>
                            {formData.paymentMethod === 'cashOnDelivery' && (
                              <div className="w-2 h-2 rounded-full bg-black"></div>
                            )}
                          </div>
                          <span className="text-sm select-none">Cash on Delivery</span>
                        </label>
                      </div>
                    )}

                    <div className="flex items-center">
                      <label className="flex items-center cursor-pointer w-full group">
                        <input
                          type="radio"
                          id="instaPay"
                          name="paymentMethod"
                          value="instaPay"
                          checked={formData.paymentMethod === 'instaPay'}
                          onChange={handleInputChange}
                          className="sr-only"
                        />
                        <div className={`w-4 h-4 rounded-full border-2 border-white mr-2 flex items-center justify-center ${formData.paymentMethod === 'instaPay' ? 'bg-white' : 'bg-transparent'
                          }`}>
                          {formData.paymentMethod === 'instaPay' && (
                            <div className="w-2 h-2 rounded-full bg-black"></div>
                          )}
                        </div>
                        <span className="text-sm select-none">Pay with InstaPay</span>
                      </label>
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
                        {cities.filter((city: City) => city.isActive)
                          .map((city: City) => (
                            <option key={city._id} value={city.governorate} className="bg-stone-900 text-white">
                              {city.governorate}
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
                {cartItems.map((item: CartItem) => (
                  <div key={`${item.id}-${item.variant?.name}-${item.variant?.color}`} className="flex items-center gap-4">
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
                        {item.variant?.name}{item.variant?.color ? `, ${item.variant?.color}` : ''} × {item.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-white">L.E {egp((refreshedPrices[`${item.id}_${item.variant?.name || 'default'}`] || item.price) * item.quantity)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-600 pt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-white">Subtotal</span>
                  <span className="text-white">L.E {egp(refreshedSubtotal)}</span>
                </div>
                {appliedPromo && (
                  <div className="flex justify-between text-green-400">
                    <span>Discount ({appliedPromo.code})</span>
                    <span>- L.E {egp(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-white">Shipping</span>
                    {freeShippingActive && shouldWaiveShipping && (
                      <span className="text-[10px] font-bold tracking-wide uppercase bg-green-500/20 text-green-400 border border-green-500/30 px-1.5 py-0.5 rounded">
                        Free Promo
                      </span>
                    )}
                  </div>
                  <span className={shouldWaiveShipping ? "text-green-400 font-medium" : "text-white"}>
                    {!selectedGovernorate
                      ? 'Select a governorate'
                      : shouldWaiveShipping
                        ? 'Free'
                        : `L.E ${egp(shippingCost)}`
                    }
                  </span>
                </div>
                {formData.paymentMethod === 'cashOnDelivery' && codFee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-white">Cash on Delivery Fee</span>
                    <span className="text-white">L.E {egp(codFee)}</span>
                  </div>
                )}
                <div className="flex justify-between font-medium text-lg pt-2 border-t border-gray-600">
                  <span className="text-white">Total</span>
                  <span className="text-white">L.E {egp(totalWithShipping)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}